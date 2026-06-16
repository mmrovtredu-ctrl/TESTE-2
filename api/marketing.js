// api/marketing.js
// ─────────────────────────────────────────────────────────────
// Gera um PACOTE DE MARKETING para um produto do Mercado Livre,
// usando o Claude com busca na web (concorrência, faixa de preço,
// sazonalidade e termos buscados).
//
// O frontend (js/marketing.js) faz POST aqui e espera de volta
// EXATAMENTE os campos do JSON abaixo (renderMarketingFromAPI).
// ─────────────────────────────────────────────────────────────

import { callClaudeJSON } from './_claude.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  // O corpo pode chegar como objeto (já parseado) ou string.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // Aceita vários nomes de campo para não quebrar com o que o front mandar.
  const input = (
    body.link || body.query || body.term || body.produto || body.q || body.text || ''
  ).toString().trim();

  if (!input) {
    return res.status(400).json({ error: 'Informe um produto, nome ou link.' });
  }

  const prompt =
`Você é um especialista em e-commerce e anúncios no Mercado Livre Brasil.
Pesquise na web informações ATUAIS sobre o produto a seguir e monte um pacote de marketing completo.

PRODUTO/TERMO: "${input}"

Na pesquisa, busque especificamente:
- concorrência no Mercado Livre Brasil para este produto;
- faixa de preço praticada hoje, em reais;
- sazonalidade / melhor época de venda;
- termos e palavras-chave mais buscados pelos compradores.

Responda EXCLUSIVAMENTE com um objeto JSON válido — sem markdown, sem comentários,
sem nenhum texto antes ou depois — exatamente neste formato e com estas chaves:
{
  "market_analysis": "análise de mercado em 2 a 4 frases",
  "optimized_title": "título otimizado para o anúncio, no máximo 60 caracteres",
  "price_strategy": "estratégia de precificação em 1 a 2 frases",
  "sales_estimate": { "min": 0, "max": 0, "revenue_min": 0, "revenue_max": 0 },
  "best_season": "melhor época / sazonalidade de venda",
  "buyer_anxieties": ["dúvida ou objeção comum do comprador", "..."],
  "key_benefits": ["benefício principal do produto", "..."],
  "keywords": ["palavra-chave de busca", "..."],
  "ad_copy": "texto persuasivo de anúncio, 1 parágrafo",
  "faq": [ { "question": "pergunta frequente", "answer": "resposta objetiva" } ]
}

Regras dos números:
- Valores monetários em reais, como NÚMEROS puros (sem "R$", sem ponto de milhar).
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
