// api/analyze.js
// ─────────────────────────────────────────────────────────────
// ANALISADOR de viabilidade de um produto no Mercado Livre.
// Usa o Claude com busca na web e devolve um veredito + números.
//
// Correção importante em relação à versão antiga:
//   a versão anterior lia data.content[0].text, o que QUEBRA com
//   web_search (a resposta passa a ter vários blocos). Agora a
//   extração junta todos os blocos de texto (dentro de _claude.js).
//
// O frontend (renderAnalyzerFromAPI) espera EXATAMENTE este JSON.
// ─────────────────────────────────────────────────────────────

import { callClaudeJSON } from './_claude.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const input = (
    body.link || body.query || body.term || body.produto || body.q || body.text || ''
  ).toString().trim();

  if (!input) {
    return res.status(400).json({ error: 'Informe um produto, nome ou link.' });
  }

  const prompt =
`Você é um analista de produtos para vendedores do Mercado Livre Brasil.
Pesquise na web e avalie a VIABILIDADE de vender o produto a seguir.

PRODUTO/TERMO: "${input}"

Na pesquisa, considere: concorrência atual no Mercado Livre, faixa de preço praticada,
demanda/sazonalidade e margem típica.

Responda EXCLUSIVAMENTE com um objeto JSON válido — sem markdown, sem comentários,
sem nenhum texto antes ou depois — exatamente neste formato e com estas chaves:
{
  "verdict": "OPORTUNIDADE" ou "COMPETITIVO" ou "SATURADO",
  "verdict_explanation": "explicação do veredito em 2 a 3 frases",
  "market_potential": { "label": "Alto" ou "Médio" ou "Baixo" },
  "competitiveness": { "label": "Alta" ou "Média" ou "Baixa" },
  "pricing_tiers": {
    "min":         { "price": 0, "explanation": "explicação do preço de entrada" },
    "recommended": { "price": 0, "explanation": "explicação do preço recomendado" },
    "premium":     { "price": 0, "explanation": "explicação do preço premium" }
  },
  "sales_estimate": { "min": 0, "max": 0, "revenue_min": 0, "revenue_max": 0 },
  "buyer_anxieties": ["dúvida ou objeção comum do comprador", "..."],
  "insights": ["insight acionável para o vendedor", "..."]
}

Regras dos números:
- Preços e faturamento em reais, como NÚMEROS puros (sem "R$", sem ponto de milhar).
- pricing_tiers.*.price = preço de venda sugerido em reais.
- sales_estimate.min e .max = unidades vendidas por mês (estimativa conservadora).
- sales_estimate.revenue_min e .revenue_max = faturamento mensal estimado em reais.
- Liste de 3 a 6 itens em cada array.
- Baseie TODOS os números na sua pesquisa real, de forma realista e conservadora.`;

  const result = await callClaudeJSON(prompt, { maxTokens: 4096, maxSearches: 5 });

  if (!result.ok) {
    return res.status(result.status).json({
      error: result.error,
      detail: result.detail,
      raw: result.raw,
    });
  }

  return res.status(200).json(result.data);
}
