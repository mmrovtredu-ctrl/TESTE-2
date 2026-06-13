// api/marketing.js
// Recebe link do produto, busca dados no ML e gera pacote completo de marketing com Claude

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  const { link } = req.body;

  if (!link) {
    return res.status(400).json({ error: 'Link do produto não informado.' });
  }

  try {
    // 1. Extrair ID do produto
    const itemId = extractMLItemId(link);
    if (!itemId) {
      return res.status(400).json({ error: 'Link inválido. Cole um link de produto do Mercado Livre.' });
    }

    // 2. Buscar dados do produto
    const itemData = await fetchMLItem(itemId);
    const categoryId = itemData.category_id;

    const [category, competitors] = await Promise.all([
      fetchMLCategory(categoryId),
      fetchMLCompetitors(categoryId),
    ]);

    // 3. Montar prompt para o Claude
    const prompt = buildMarketingPrompt(itemData, category, competitors);

    // 4. Chamar Claude
    const marketingResult = await callClaude(prompt);

    // 5. Retornar no formato do MOCK_MARKETING_RESULT
    return res.status(200).json(marketingResult);

  } catch (error) {
    console.error('Erro em /api/marketing:', error);
    return res.status(500).json({ error: 'Erro ao gerar pacote de marketing. Tente novamente.' });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractMLItemId(link) {
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

async function fetchMLCompetitors(categoryId) {
  const response = await fetch(
    `https://api.mercadolibre.com/sites/MLB/search?category=${categoryId}&sort=relevance&limit=5`
  );
  if (!response.ok) return [];
  const data = await response.json();
  return (data.results || []).slice(0, 5).map(item => ({
    title: item.title,
    price: item.price,
    sold_quantity: item.sold_quantity,
  }));
}

function buildMarketingPrompt(item, category, competitors) {
  const competitorsSummary = competitors.map((c, i) =>
    `${i + 1}. ${c.title} — R$ ${c.price} — ${c.sold_quantity || '?'} vendidos`
  ).join('\n');

  return `Você é um especialista em marketing e copywriting para e-commerce no Mercado Livre Brasil. 
Crie um pacote completo de marketing para o produto abaixo.
Responda SOMENTE com um JSON válido, sem texto antes ou depois, sem markdown.

PRODUTO:
- Título atual: ${item.title}
- Preço: R$ ${item.price}
- Categoria: ${category?.name || item.category_id}
- Condição: ${item.condition === 'new' ? 'Novo' : 'Usado'}
- Vendidos: ${item.sold_quantity || 0}

TOP CONCORRENTES:
${competitorsSummary || 'Nenhum concorrente encontrado.'}

Responda com este JSON exato (preencha todos os campos com base na análise real do produto):
{
  "market_analysis": "análise de 2-3 frases sobre o mercado deste produto",
  "optimized_title": "título otimizado para SEO do ML, máx 60 caracteres",
  "price_strategy": "estratégia de preço em 2 frases",
  "sales_estimate": {
    "min": número,
    "max": número,
    "revenue_min": número,
    "revenue_max": número
  },
  "best_season": "melhor época para vender este produto e por quê (2 frases)",
  "buyer_anxieties": ["ansiedade 1", "ansiedade 2", "ansiedade 3"],
  "key_benefits": ["benefício 1", "benefício 2", "benefício 3", "benefício 4"],
  "keywords": ["palavra-chave 1", "palavra-chave 2", "palavra-chave 3", "palavra-chave 4", "palavra-chave 5"],
  "ad_copy": "anúncio completo copiável para o ML: descrição com até 5 parágrafos curtos, destacando benefícios, diferenciais e CTA",
  "faq": [
    { "question": "pergunta frequente 1?", "answer": "resposta objetiva 1" },
    { "question": "pergunta frequente 2?", "answer": "resposta objetiva 2" },
    { "question": "pergunta frequente 3?", "answer": "resposta objetiva 3" }
  ]
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
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Erro na API Anthropic: ${JSON.stringify(err)}`);
  }

  const data = await response.json();
  const text = data.content[0]?.text || '';

  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}
