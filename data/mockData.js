/*
  mockData.js
  -----------
  Dados de exemplo (mock) que simulam o retorno das APIs reais.

  IMPORTANTE PARA O DEV:
  Cada bloco abaixo indica de qual endpoint da API do Mercado Livre
  esses dados viriam na versão final. Quando integrar a API real,
  basta substituir essas constantes por chamadas fetch() que retornem
  no MESMO FORMATO — assim nenhum outro arquivo JS precisa mudar.
*/

// ============================================================
// CONTAS — viria de uma tabela própria no seu banco (Supabase),
// não da API do ML diretamente. Cada conta guarda os tokens OAuth2.
// ============================================================
const MOCK_ACCOUNTS = [
  { id: "acc_1", nickname: "Loja Principal", mlUserId: "111111111", connected: true },
  { id: "acc_2", nickname: "Loja Eletrônicos", mlUserId: "222222222", connected: true },
  { id: "acc_3", nickname: "Loja Casa & Decor", mlUserId: "333333333", connected: true },
  { id: "acc_4", nickname: "Loja Pet", mlUserId: "444444444", connected: false }, // exemplo: token expirado
];

// ============================================================
// VISÃO GERAL — endpoint: /orders/search + /items + métricas agregadas
// ============================================================
const MOCK_OVERVIEW = {
  acc_1: {
    kpis: {
      sales: 184,
      salesTrend: +12.5,
      revenue: 28430.5,
      revenueTrend: +8.2,
      visits: 9650,
      visitsTrend: -3.1,
      conversion: 1.9,
      conversionTrend: +0.4,
    },
    // Vendas dos últimos 14 dias — endpoint /orders/search agrupado por data
    salesByDay: [12, 15, 9, 18, 22, 14, 19, 16, 21, 25, 17, 20, 23, 26],
    // Produtos com performance em alta/baixa — calculado a partir do histórico
    productsUp: [
      { name: "Suporte de celular veicular", sales: 42, trend: "+38%" },
      { name: "Carregador USB-C 30W", sales: 35, trend: "+27%" },
      { name: "Capinha à prova d'água", sales: 29, trend: "+19%" },
    ],
    productsDown: [
      { name: "Cabo HDMI 2m", sales: 3, trend: "-45%" },
      { name: "Adaptador USB para P2", sales: 5, trend: "-31%" },
      { name: "Suporte para notebook", sales: 6, trend: "-22%" },
    ],
  },
  acc_2: {
    kpis: {
      sales: 96,
      salesTrend: -4.0,
      revenue: 41210.0,
      revenueTrend: +2.1,
      visits: 7200,
      visitsTrend: +1.5,
      conversion: 1.3,
      conversionTrend: -0.1,
    },
    salesByDay: [8, 6, 7, 9, 5, 8, 10, 9, 7, 6, 8, 9, 11, 10],
    productsUp: [
      { name: "Fone Bluetooth TWS", sales: 18, trend: "+22%" },
      { name: "Caixa de som portátil", sales: 14, trend: "+15%" },
    ],
    productsDown: [
      { name: "Smartwatch modelo X", sales: 2, trend: "-50%" },
      { name: "Mouse sem fio", sales: 4, trend: "-18%" },
    ],
  },
  acc_3: {
    kpis: {
      sales: 53,
      salesTrend: +5.5,
      revenue: 9870.0,
      revenueTrend: +6.0,
      visits: 3100,
      visitsTrend: +0.8,
      conversion: 1.7,
      conversionTrend: +0.2,
    },
    salesByDay: [3, 4, 2, 5, 4, 6, 3, 5, 4, 7, 6, 5, 8, 6],
    productsUp: [{ name: "Organizador de gavetas", sales: 11, trend: "+30%" }],
    productsDown: [{ name: "Luminária de mesa", sales: 1, trend: "-60%" }],
  },
  acc_4: {
    kpis: { sales: 0, salesTrend: 0, revenue: 0, revenueTrend: 0, visits: 0, visitsTrend: 0, conversion: 0, conversionTrend: 0 },
    salesByDay: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    productsUp: [],
    productsDown: [],
  },
};

// ============================================================
// MONITOR DE CONCORRENTES — endpoint /sites/MLB/search + scraping
// ============================================================
const MOCK_COMPETITOR_DATA = {
  acc_1: {
    products: [
      {
        id: "MLB001",
        name: "Suporte de celular veicular",
        yourPrice: 39.9,
        // histórico de 14 dias: seu preço fixo + menor concorrente variando
        history: {
          labels: ["01/06","02/06","03/06","04/06","05/06","06/06","07/06","08/06","09/06","10/06","11/06","12/06","13/06","14/06"],
          yourPrice:  [39.9,39.9,39.9,39.9,39.9,39.9,39.9,39.9,39.9,39.9,39.9,39.9,39.9,39.9],
          competitor: [42.0,41.5,40.0,39.5,38.9,38.9,37.5,37.5,36.9,38.0,38.5,37.0,36.5,35.9],
        },
        competitors: [
          { seller: "Loja TechMix", price: 35.9, stock: 12 },
          { seller: "ImportShop BR", price: 37.5, stock: 0 },
          { seller: "AutoAcessórios", price: 41.0, stock: 30 },
        ],
      },
      {
        id: "MLB002",
        name: "Carregador USB-C 30W",
        yourPrice: 54.9,
        history: {
          labels: ["01/06","02/06","03/06","04/06","05/06","06/06","07/06","08/06","09/06","10/06","11/06","12/06","13/06","14/06"],
          yourPrice:  [54.9,54.9,54.9,54.9,54.9,54.9,54.9,54.9,54.9,54.9,54.9,54.9,54.9,54.9],
          competitor: [58.0,57.0,56.0,55.5,55.0,54.5,54.0,53.5,53.0,53.0,52.5,52.0,51.5,51.0],
        },
        competitors: [
          { seller: "ChargeNow", price: 51.0, stock: 8 },
          { seller: "Eletro Center", price: 56.9, stock: 15 },
        ],
      },
      {
        id: "MLB003",
        name: "Capinha à prova d'água",
        yourPrice: 24.9,
        history: {
          labels: ["01/06","02/06","03/06","04/06","05/06","06/06","07/06","08/06","09/06","10/06","11/06","12/06","13/06","14/06"],
          yourPrice:  [24.9,24.9,24.9,24.9,24.9,24.9,24.9,24.9,24.9,24.9,24.9,24.9,24.9,24.9],
          competitor: [26.0,25.5,25.0,24.5,24.0,24.0,23.5,23.5,23.0,23.0,22.5,22.5,22.0,21.9],
        },
        competitors: [
          { seller: "CasePro", price: 21.9, stock: 50 },
          { seller: "AcessóriosJá", price: 23.5, stock: 0 },
        ],
      },
    ],
  },
};

// ============================================================
// CAMPANHAS — endpoint /advertising/product_ads/campaigns
// ============================================================
const MOCK_CAMPAIGNS = {
  acc_1: {
    kpis: { spend: 1240.5, acos: 14.2, clicks: 2380, ctr: 3.1 },
    campaigns: [
      { name: "Acessórios Celular - Geral", spend: 520.0, clicks: 980, conversions: 64, acos: 11.5, status: "ativa" },
      { name: "Carregadores - Black Week", spend: 410.0, clicks: 760, conversions: 38, acos: 18.9, status: "ativa" },
      { name: "Capinhas - Liquidação", spend: 310.5, clicks: 640, conversions: 22, acos: 26.4, status: "pausada" },
    ],
    recommendations: [
      "A campanha 'Capinhas - Liquidação' está com ACOS de 26,4%, acima da meta de 20%. Considere reduzir o lance ou pausar os anúncios com menor conversão.",
      "'Acessórios Celular - Geral' tem o melhor ACOS (11,5%). Aumentar o orçamento diário pode trazer mais vendas sem perder eficiência.",
      "3 produtos do catálogo não têm campanha ativa e estão entre os mais vendidos do mês — criar campanha para eles pode acelerar ainda mais o crescimento.",
    ],
  },
};

// ============================================================
// ALERTAS — gerados pelo Sistema 1 (monitor de concorrentes)
// ============================================================
const MOCK_ALERTS = {
  acc_1: [
    {
      id: "al_1",
      type: "price",
      title: "Concorrente baixou o preço — Suporte de celular veicular",
      meta: "Loja TechMix agora vende por R$ 35,90 (seu preço: R$ 39,90)",
      time: "Hoje, 09:42",
      unread: true,
    },
    {
      id: "al_2",
      type: "stock",
      title: "Concorrente sem estoque — Capinha à prova d'água",
      meta: "AcessóriosJá ficou sem estoque — oportunidade de ganhar posição",
      time: "Hoje, 08:15",
      unread: true,
    },
    {
      id: "al_3",
      type: "price",
      title: "Concorrente baixou o preço — Carregador USB-C 30W",
      meta: "ChargeNow agora vende por R$ 51,00 (seu preço: R$ 54,90)",
      time: "Ontem, 19:30",
      unread: false,
    },
  ],
  acc_2: [],
  acc_3: [],
  acc_4: [],
};

// ============================================================
// ANALISADOR DE PRODUTO — resposta simulada do agente de IA
// (na versão real, isso vem de uma chamada à API da Anthropic
// com o resultado do scraping + busca no Google)
// ============================================================
const MOCK_ANALYZER_RESULT = {
  original: {
    title: "Suporte Celular Carro",
    description: "Suporte para celular para carro bom e resistente.",
    tags: ["suporte celular", "acessório carro"],
    images: 2,
  },
  suggestion: {
    title: "Suporte Veicular para Celular 360° - Encaixe Universal para Painel e Saída de Ar",
    description:
      "Suporte veicular ajustável em 360°, com encaixe universal compatível com a maioria dos smartphones. " +
      "Fixação firme no painel ou na saída de ar do carro, ideal para uso com GPS, aplicativos de navegação " +
      "e chamadas em viagem. Material reforçado e instalação sem ferramentas.",
    tags: ["suporte celular carro", "suporte veicular 360", "suporte gps carro", "acessórios automotivos", "porta celular carro"],
    images: 6,
    improvementPoints: [
      "Título atual é genérico e não usa termos que as pessoas buscam no Google (ex: 'suporte veicular 360°', 'suporte GPS carro')",
      "Descrição muito curta — anúncios com descrição detalhada convertem mais",
      "Apenas 2 imagens — recomendado ter no mínimo 6, incluindo imagem em uso",
      "Faltam tags relacionadas a busca por compatibilidade e instalação",
    ],
  },
};
