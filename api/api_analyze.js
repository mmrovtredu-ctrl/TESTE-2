// api/analyze.js
// Recebe um link de produto do ML, busca os dados via API e analisa com Claude (Anthropic)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  const { link } = req.body;

  if (!link) {
    return res.status(400).json({ error: 'Link do produto não informado.' });
  }

  try {
    // 1. Extrair o ID do produto do link
    const itemId = extractMLItemId(link);
    if (!itemId) {
      return res.status(400).json({ error: 'Link inválido. Cole um link de produto do Mercado Livre.' });
    }

    // 2. Buscar dados do produto na API do ML
    const [itemData, categoryData, competitorsData] = await Promise.all([
      fetchMLItem(itemId),
      null, // preenchido abaixo após ter o category_id
      null,
    ]);

    const categoryId = itemData.category_id;

    const [category, competitors] = await Promise.all([
      fetchMLCategory(categoryId),
      fetchMLCompetitors(categoryId, itemData.price),
    ]);

    // 3. Montar prompt para o Claude
    const prompt = buildAnalysisPrompt(itemData, category, competitors);

    // 4. Chamar API da Anthropic
    const analysisResult = await callClaude(prompt);

    // 5. Retornar no mesmo formato do MOCK_ANALYZER_RESULT
    return res.status(200).json(analysisResult);

  } catch (error) {
    console.error('Erro em /api/analyze:', error);
    return res.status(500).json({ error: 'Erro ao analisar produto. Tente novamente.' });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractMLItemId(link) {
  // Suporta formatos:
  // https://www.mercadolivre.com.br/produto-nome/p/MLB123456789
  // https://produto.mercadolivre.com.br/MLB-123456789-...
  // https://www.mercadolivre.com.br/MLB123456789
  const patterns = [
    /MLB[-]?(\d+)/i,
    /\/p\/(MLB\d+)/i,
  ];
  for (const pattern of patterns) {
    const match = link.match(pattern);
    if (match) return match[1] ? `MLB${match[1]}` : match[0];
  }
  return null;
}

async function fetchMLItem(itemId) {
  const response = await fetch(`https://api.mercadolibre.com/items/${itemId}`);
  if (!response.ok) throw new Error(`Produto não encontrado: ${itemId}`);
  return response.json();
}

async function fetchMLCategory(categoryId) {
  const response = await fetch(`https://api.mercadolibre.com/categories/${categoryId}`);
  if (!response.ok) return null;
  return response.json();
}

async function fetchMLCompetitors(categoryId, targetPrice) {
  // Busca os top 5 produtos da mesma categoria ordenados por relevância
  const response = await fetch(
    `https://api.mercadolibre.com/sites/MLB/search?category=${categoryId}&sort=relevance&limit=10`
  );
  if (!response.ok) return [];
  const data = await response.json();
  return (data.results || []).slice(0, 5).map(item => ({
    id: item.id,
    title: item.title,
    price: item.price,
    sold_quantity: item.sold_quantity,
    condition: item.condition,
    seller: item.seller?.nickname || 'Desconhecido',
  }));
}

function buildAnalysisPrompt(item, category, competitors) {
  const competitorsSummary = competitors.map((c, i) =>
    `${i + 1}. ${c.title} — R$ ${c.price} — ${c.sold_quantity || '?'} vendidos — Vendedor: ${c.seller}`
  ).join('\n');

  return `Você é um especialista em e-commerce no Mercado Livre Brasil. Analise o produto abaixo e responda SOMENTE com um JSON válido, sem texto antes ou depois, sem markdown.

PRODUTO:
- Título: ${item.title}
- Preço: R$ ${item.price}
- Categoria: ${category?.name || item.category_id}
- Condição: ${item.condition === 'new' ? 'Novo' : 'Usado'}
- Vendidos: ${item.sold_quantity || 0}
- Descrição: ${item.description || 'Não disponível'}

TOP 5 CONCORRENTES NA CATEGORIA:
${competitorsSummary || 'Nenhum concorrente encontrado.'}

Responda com este JSON exato (preencha todos os campos com base na análise real):
{
  "verdict": "OPORTUNIDADE" | "COMPETITIVO" | "SATURADO",
  "verdict_explanation": "explicação em 1 frase",
  "market_potential": {
    "score": número de 0 a 100,
    "label": "Alto" | "Médio" | "Baixo",
    "explanation": "explicação em 2 frases"
  },
  "competitiveness": {
    "score": número de 0 a 100,
    "label": "Alta" | "Média" | "Baixa",
    "explanation": "explicação em 2 frases"
  },
  "pricing_tiers": {
    "min": { "price": número, "label": "Entrada", "explanation": "1 frase" },
    "recommended": { "price": número, "label": "Recomendado", "explanation": "1 frase" },
    "premium": { "price": número, "label": "Premium", "explanation": "1 frase" }
  },
  "sales_estimate": {
    "min": número,
    "max": número,
    "revenue_min": número,
    "revenue_max": número
  },
  "buyer_anxieties": ["ansiedade 1", "ansiedade 2", "ansiedade 3"],
  "insights": ["insight 1", "insight 2", "insight 3"]
}`;
}

async function callClaude(prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Erro na API Anthropic: ${JSON.stringify(err)}`);
  }

  const data = await response.json();
  const text = data.content[0]?.text || '';

  // Parse do JSON retornado pelo Claude
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}
