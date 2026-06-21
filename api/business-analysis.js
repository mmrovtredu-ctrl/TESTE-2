// api/business-analysis.js
// ─────────────────────────────────────────────────────────────
// Análise geral do negócio para a Visão Geral.
// Recebe os dados já carregados da conta (KPIs, produtos,
// última venda) e pede ao Claude um diagnóstico executivo.
//
// POST { account_id, kpis, productsUp, productsDown, lastSale }
// Response: { summary, strengths[], warnings[], actions[] }
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

  const { kpis, productsUp = [], productsDown = [], lastSale } = body;

  if (!kpis) {
    return res.status(400).json({ error: 'Dados da conta não informados.' });
  }

  // Monta contexto legível para o Claude
  const topProducts  = productsUp.map(p => `"${p.name}" (${p.sales} vendas)`).join(', ') || 'nenhum';
  const lowProducts  = productsDown.map(p => `"${p.name}" (${p.sales} vendas)`).join(', ') || 'nenhum';
  const lastSaleText = lastSale
    ? `Última venda: R$ ${lastSale.amount?.toFixed(2)} em ${new Date(lastSale.at).toLocaleString('pt-BR')}${lastSale.product ? ` — "${lastSale.product}"` : ''}.`
    : 'Nenhuma venda recente registrada.';

  const trendLabel = v => v > 0 ? `+${v}%` : v < 0 ? `${v}%` : 'estável';

  const prompt =
`Você é um consultor de e-commerce especialista em Mercado Livre Brasil.
Analise os dados abaixo de uma conta de vendedor e gere um diagnóstico executivo PRÁTICO.

DADOS DA CONTA (últimos 30 dias):
- Vendas: ${kpis.sales} pedidos (tendência: ${trendLabel(kpis.salesTrend)})
- Faturamento: R$ ${Number(kpis.revenue).toFixed(2)} (tendência: ${trendLabel(kpis.revenueTrend)})
- Visitas: ${kpis.visits}
- Conversão: ${kpis.conversion}%
- Produtos em alta: ${topProducts}
- Produtos com poucas vendas: ${lowProducts}
- ${lastSaleText}

Com base nesses números reais, gere um diagnóstico OBJETIVO e ACIONÁVEL.
Responda EXCLUSIVAMENTE com JSON válido — sem markdown, sem comentários:
{
  "summary": "parágrafo curto (2-3 frases) com o estado geral do negócio",
  "health_score": número de 0 a 100 indicando saúde geral da conta,
  "health_label": "Ótimo" ou "Bom" ou "Regular" ou "Crítico",
  "strengths": [
    "ponto forte acionável baseado nos dados", ...
  ],
  "warnings": [
    "alerta ou risco identificado nos dados", ...
  ],
  "actions": [
    { "priority": "alta" ou "media" ou "baixa", "action": "ação concreta e específica que o vendedor deve fazer agora" },
    ...
  ]
}

Regras:
- strengths: 2 a 4 itens, baseados nos dados reais acima
- warnings: 1 a 3 itens, só aponte alertas REAIS que os números justifiquem
- actions: 3 a 5 ações ordenadas por prioridade, práticas e específicas para Mercado Livre
- Se a conversão for < 1%, marque como alerta crítico
- Se o trend for negativo (queda), mencione e sugira ação
- Se não há vendas recentes, sinalize urgência`;

  const result = await callClaudeJSON(prompt, { maxTokens: 2048, maxSearches: 0 });

  if (!result.ok) {
    return res.status(result.status).json({
      error: result.error,
      detail: result.detail,
      raw: result.raw,
    });
  }

  return res.status(200).json(result.data);
}
