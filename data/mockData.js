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

// ============================================================
// MARKETING — pacote completo gerado pelo agente de IA a partir
// de um link de produto.
//
// Na versão real, isso vem de uma chamada à API da Anthropic com:
// 1. Scraping do produto (título, preço, descrição, imagens, categoria)
// 2. Busca no Mercado Livre dos concorrentes da mesma categoria
// 3. Busca no Google Trends / Google Search para palavras-chave e sazonalidade
// 4. Prompt estruturado pedindo cada um dos blocos abaixo em JSON
// ============================================================
const MOCK_MARKETING_RESULT = {
  // Nome do produto identificado a partir do link (usado no cabeçalho do resultado)
  productName: "Suporte Veicular para Celular",

  // ---------- Análise de mercado ----------
  marketAnalysis: {
    summary:
      "A categoria de suportes veiculares para celular tem alta procura no Mercado Livre, com " +
      "mais de 200 anúncios concorrentes ativos. A maioria dos anúncios de melhor desempenho " +
      "investe em título com termos de busca específicos (ex: '360°', 'saída de ar', 'painel') " +
      "e galeria com 6 a 8 imagens mostrando o produto instalado no carro.",
    competitionLevel: "Alta",
    averagePrice: 42.9,
    topSellerPrice: 35.9,
    demandTrend: "Estável, com pico em períodos de viagem (feriados e fim de ano)",
  },

  // ---------- Título otimizado ----------
  optimizedTitle: {
    title: "Suporte Veicular para Celular 360° - Encaixe Universal Painel e Saída de Ar",
    reasoning:
      "Combina os termos mais buscados pelos compradores (suporte veicular, 360°, encaixe universal) " +
      "com os locais de instalação (painel e saída de ar), que aparecem com frequência nas buscas " +
      "relacionadas ao produto.",
    alternatives: [
      "Suporte Celular Carro 360° Ajustável - Painel e Ar Condicionado",
      "Suporte Veicular Universal para Smartphone com Rotação 360°",
    ],
  },

  // ---------- Estratégia de preço ----------
  pricingStrategy: {
    suggestedPrice: 37.9,
    minPrice: 34.9,
    maxPrice: 44.9,
    reasoning:
      "O preço sugerido posiciona o produto ligeiramente abaixo da média da categoria (R$ 42,90), " +
      "mas acima do concorrente mais barato (R$ 35,90), mantendo margem competitiva sem entrar em " +
      "guerra de preço direta. Recomenda-se testar promoções pontuais reduzindo para R$ 34,90 em " +
      "datas de alta demanda.",
  },

  // ---------- Estimativa de vendas ----------
  salesEstimate: {
    monthlyUnits: 35,
    monthlyRevenue: 1326.5,
    reasoning:
      "Com base em produtos similares na mesma faixa de preço e categoria, a estimativa considera " +
      "uma taxa de conversão média de 1,8% sobre as visitas esperadas para um anúncio bem otimizado " +
      "nesta categoria.",
  },

  // ---------- Melhor época para vender ----------
  bestSeason: {
    peakMonths: ["Dezembro", "Janeiro", "Julho"],
    reasoning:
      "Períodos de férias e viagens de fim de ano aumentam a procura por acessórios veiculares, " +
      "especialmente suportes para GPS e navegação. Recomenda-se reforçar estoque e investir em " +
      "campanhas pagas nesses meses.",
  },

  // ---------- Ansiedades do comprador ----------
  buyerAnxieties: [
    "Medo de o suporte não encaixar no modelo do carro ou do celular",
    "Receio de que a fixação solte durante o trajeto e o celular caia",
    "Dúvida se o produto resiste ao calor do painel no verão",
    "Insegurança sobre a facilidade de instalação sem ferramentas",
  ],

  // ---------- Benefícios do produto ----------
  productBenefits: [
    "Encaixe universal compatível com a maioria dos smartphones do mercado",
    "Rotação 360° para ajustar o ângulo ideal de visualização do GPS",
    "Instalação rápida, sem parafusos ou ferramentas",
    "Material reforçado, resistente ao calor e uso diário",
    "Libera as mãos para dirigir com segurança usando navegação por voz",
  ],

  // ---------- Palavras-chave e tags ----------
  keywords: {
    primary: ["suporte celular carro", "suporte veicular 360", "suporte gps carro"],
    secondary: ["suporte saída de ar", "suporte painel carro", "porta celular veicular", "suporte smartphone carro"],
    tags: ["acessórios automotivos", "suporte universal", "suporte 360 graus", "suporte gps", "acessório carro celular"],
  },

  // ---------- Anúncio completo (pronto para copiar) ----------
  fullAd: {
    title: "Suporte Veicular para Celular 360° - Encaixe Universal Painel e Saída de Ar",
    description:
      "Suporte veicular ajustável em 360°, com encaixe universal compatível com a maioria dos " +
      "smartphones do mercado. Fixação firme e segura no painel ou na saída de ar do carro, ideal " +
      "para uso com GPS, aplicativos de navegação e chamadas durante a viagem.\n\n" +
      "BENEFÍCIOS:\n" +
      "- Instalação rápida, sem parafusos ou ferramentas\n" +
      "- Rotação 360° para o melhor ângulo de visualização\n" +
      "- Material reforçado, resistente ao uso diário e ao calor\n" +
      "- Compatível com smartphones de diversos tamanhos\n\n" +
      "ITENS INCLUSOS:\n" +
      "- 1 suporte veicular para celular\n" +
      "- Manual de instalação\n\n" +
      "Garanta mais segurança e praticidade nas suas viagens. Peça já o seu!",
    bullets: [
      "Encaixe universal para a maioria dos celulares",
      "Rotação 360° em todas as direções",
      "Fixação firme no painel ou saída de ar",
      "Instalação sem ferramentas em segundos",
      "Material resistente ao calor e ao uso diário",
    ],
  },

  // ---------- Perguntas frequentes ----------
  faq: [
    {
      question: "Esse suporte serve para qualquer celular?",
      answer: "Sim, o encaixe é ajustável e compatível com a grande maioria dos smartphones do mercado, incluindo modelos com capinha.",
    },
    {
      question: "Precisa de ferramentas para instalar?",
      answer: "Não. A instalação é simples e rápida, encaixando direto na saída de ar ou no painel do carro, sem parafusos.",
    },
    {
      question: "O suporte aguenta o calor do painel no verão?",
      answer: "Sim, o material é resistente a altas temperaturas e foi desenvolvido para uso contínuo dentro do veículo.",
    },
    {
      question: "Existe risco de o celular cair durante o trajeto?",
      answer: "Não, o sistema de encaixe foi projetado para manter o celular firme mesmo em frenagens e percursos com solavancos.",
    },
  ],
};


/*
  mockData_v2.js
  --------------
  EXTENSÃO de mockData.js — novos blocos de dados para:
  - Catálogo completo de produtos cadastrados (MOCK_CATALOG)
  - Top 5 concorrentes detalhados por produto (MOCK_COMPETITORS_DETAIL)
  - Análise completa do produto (MOCK_PRODUCT_ANALYSIS)
  - Campanhas detalhadas (MOCK_CAMPAIGNS_DETAIL)
  - Alertas de monitoramento 2h (MOCK_MONITOR_ALERTS)

  INSTRUÇÕES: adicione este conteúdo ao FINAL do arquivo
  data/mockData.js (não substitui, complementa).

  IMPORTANTE PARA O BACKEND:
  Cada bloco indica o endpoint real que vai alimentar esses dados.
  O formato aqui é o CONTRATO entre front e backend — ao integrar
  a API real, o backend deve devolver objetos neste mesmo formato.
*/

// ============================================================
// CATÁLOGO COMPLETO — endpoint: /users/{user_id}/items/search
// + /items/{id} para detalhes de cada produto
//
// Esta é a lista COMPLETA de produtos cadastrados na conta ML,
// usada na nova tela "Catálogo".
// ============================================================
const MOCK_CATALOG = {
  acc_1: [
    {
      id: "MLB001",
      name: "Suporte de celular veicular",
      thumbnail: null, // URL da imagem do anúncio
      price: 39.9,
      stock: 124,
      sales30d: 42,
      visits30d: 1850,
      status: "ativo", // ativo | pausado | sem_estoque
      health: 92, // "saúde do anúncio" do ML, 0-100
      category: "Acessórios para Veículos",
    },
    {
      id: "MLB002",
      name: "Carregador USB-C 30W",
      thumbnail: null,
      price: 54.9,
      stock: 8,
      sales30d: 35,
      visits30d: 1420,
      status: "ativo",
      health: 88,
      category: "Carregadores",
    },
    {
      id: "MLB003",
      name: "Capinha à prova d'água",
      thumbnail: null,
      price: 24.9,
      stock: 200,
      sales30d: 29,
      visits30d: 980,
      status: "ativo",
      health: 75,
      category: "Capas e Películas",
    },
    {
      id: "MLB004",
      name: "Cabo HDMI 2m",
      thumbnail: null,
      price: 32.9,
      stock: 45,
      sales30d: 3,
      visits30d: 210,
      status: "ativo",
      health: 60,
      category: "Cabos",
    },
    {
      id: "MLB005",
      name: "Adaptador USB para P2",
      thumbnail: null,
      price: 19.9,
      stock: 0,
      sales30d: 5,
      visits30d: 340,
      status: "sem_estoque",
      health: 55,
      category: "Adaptadores",
    },
    {
      id: "MLB006",
      name: "Suporte para notebook",
      thumbnail: null,
      price: 89.9,
      stock: 30,
      sales30d: 6,
      visits30d: 510,
      status: "ativo",
      health: 70,
      category: "Acessórios para Notebook",
    },
  ],
};

// ============================================================
// CONCORRENTES DETALHADOS (TOP 5) — endpoint: /sites/MLB/search
// + scraping complementar (vendas estimadas, reputação)
//
// Para cada produto do seu catálogo, lista os 5 concorrentes
// mais relevantes (mesmo produto/categoria) com dados completos.
// ============================================================
const MOCK_COMPETITORS_DETAIL = {
  MLB001: {
    productName: "Suporte de celular veicular",
    yourPrice: 39.9,
    yourStock: 124,
    competitors: [
      {
        seller: "Loja TechMix",
        price: 35.9,
        stock: 12,
        sales30d: 310,
        reputation: "Mercado Líder",
        shipping: "Frete grátis (Full)",
        rating: 4.8,
        reviewsCount: 1240,
        link: "#",
      },
      {
        seller: "ImportShop BR",
        price: 37.5,
        stock: 0,
        sales30d: 180,
        reputation: "Vendedor confiável",
        shipping: "Frete grátis",
        rating: 4.6,
        reviewsCount: 530,
        link: "#",
      },
      {
        seller: "AutoAcessórios",
        price: 41.0,
        stock: 30,
        sales30d: 95,
        reputation: "Mercado Líder",
        shipping: "Frete pago",
        rating: 4.7,
        reviewsCount: 410,
        link: "#",
      },
      {
        seller: "CarShop Express",
        price: 43.9,
        stock: 60,
        sales30d: 60,
        reputation: "Vendedor confiável",
        shipping: "Frete grátis (Full)",
        rating: 4.5,
        reviewsCount: 220,
        link: "#",
      },
      {
        seller: "Acessórios Premium",
        price: 45.5,
        stock: 15,
        sales30d: 40,
        reputation: "Novo vendedor",
        shipping: "Frete pago",
        rating: 4.2,
        reviewsCount: 58,
        link: "#",
      },
    ],
  },
};

// ============================================================
// ANÁLISE COMPLETA DO PRODUTO — endpoint composto:
// scraping concorrência + Google Trends + agente de IA (Anthropic)
//
// Esta é a análise que aparece na tela "Analisar produto" após
// colar o link. Combina dados de mercado, 3 níveis de preço,
// estimativa de vendas/faturamento baseada nos concorrentes,
// e os blocos qualitativos (ansiedades, pontos importantes).
// ============================================================
const MOCK_PRODUCT_ANALYSIS = {
  productName: "Suporte Veicular para Celular 360°",

  // ---------- Visão geral / veredito ----------
  overview: {
    verdict: "Vale a pena vender", // "Vale a pena vender" | "Risco moderado" | "Não recomendado"
    verdictReasoning:
      "Categoria com demanda estável, concorrência alta mas com espaço de preço entre " +
      "R$ 35,90 e R$ 45,50. Seu produto pode entrar com preço competitivo e boa margem.",
    marketPotential: "Alto", // Alto | Médio | Baixo
    competitiveness: "Média-Alta", // Baixa | Média | Média-Alta | Alta
    conversionPotential: "Médio", // Baixo | Médio | Alto
  },

  // ---------- Preço dos concorrentes (resumo) ----------
  competitorPricing: {
    lowest: 35.9,
    average: 40.76,
    highest: 45.5,
    yourPrice: 39.9,
    positionVsAverage: "Levemente abaixo da média", // texto descritivo
  },

  // ---------- Estratégia de preço (3 níveis) ----------
  pricingStrategy: {
    minPrice: {
      value: 34.9,
      label: "Preço mínimo",
      description: "Abaixo do concorrente mais barato. Use só em liquidação ou para ganhar posição rapidamente — margem muito apertada.",
    },
    recommendedPrice: {
      value: 38.9,
      label: "Preço recomendado",
      description: "Posiciona seu anúncio entre os 2 concorrentes mais baratos, com margem saudável e boa chance de conversão.",
    },
    premiumPrice: {
      value: 44.9,
      label: "Preço premium",
      description: "Próximo do topo da faixa. Viável se o anúncio tiver diferenciais claros (mais imagens, melhor avaliação, frete grátis).",
    },
  },

  // ---------- Estimativa de vendas e faturamento (baseado nos concorrentes) ----------
  salesEstimate: {
    // Cálculo: média de vendas/30d dos concorrentes, ajustada pela posição de preço
    competitorAvgSales30d: 137, // média de sales30d dos 5 concorrentes
    estimatedMonthlySales: 55, // sua estimativa, considerando preço recomendado
    estimatedMonthlyRevenue: 2139.5, // estimatedMonthlySales * recommendedPrice
    reasoning:
      "Os 5 concorrentes somam em média 137 vendas/mês cada. Considerando que seu anúncio " +
      "entraria com preço competitivo mas reputação/histórico ainda novos, estimamos capturar " +
      "uma fração inicial de ~40% da média dos concorrentes estabelecidos.",
  },

  // ---------- Ansiedades do comprador ----------
  buyerAnxieties: [
    "Medo de o suporte não encaixar no modelo do carro ou do celular",
    "Receio de que a fixação solte durante o trajeto e o celular caia",
    "Dúvida se o produto resiste ao calor do painel no verão",
    "Insegurança sobre a facilidade de instalação sem ferramentas",
  ],

  // ---------- Outros pontos importantes ----------
  additionalInsights: [
    {
      title: "Sazonalidade",
      detail: "Pico de demanda em dezembro/janeiro (viagens de férias) e julho (férias escolares).",
    },
    {
      title: "Diferencial necessário",
      detail: "Concorrentes líderes têm 4.6+ de avaliação e frete grátis via Full — considere Full para competir.",
    },
    {
      title: "Risco de devolução",
      detail: "Categoria com risco médio de devolução por incompatibilidade — descrição clara sobre encaixe universal é essencial.",
    },
    {
      title: "Oportunidade",
      detail: "Concorrente 'ImportShop BR' está sem estoque (preço R$ 37,50) — janela de oportunidade para ganhar posição com preço próximo.",
    },
  ],
};

// ============================================================
// CAMPANHAS DETALHADAS — endpoint: /advertising/product_ads/campaigns
// + /advertising/product_ads/campaigns/{id}/items
//
// Expande MOCK_CAMPAIGNS com detalhamento por produto dentro
// de cada campanha, e totais consolidados.
// ============================================================
const MOCK_CAMPAIGNS_DETAIL = {
  acc_1: {
    totals: {
      totalSpend30d: 1240.5,
      totalRevenue30d: 8732.0,
      totalAcos: 14.2,
      totalClicks: 2380,
      totalImpressions: 76800,
      totalCtr: 3.1,
      activeCampaigns: 2,
      pausedCampaigns: 1,
    },

    // Produto que está "queimando" mais dinheiro sem retorno proporcional
    worstPerformer: {
      productId: "MLB003",
      productName: "Capinha à prova d'água",
      spend30d: 310.5,
      revenue30d: 658.0,
      acos: 26.4,
      clicks: 640,
      conversions: 22,
      issue: "ACOS acima da meta (20%) — anúncio pode precisar de revisão de título/imagem antes de continuar investindo.",
    },

    // Produto com melhor retorno sobre o investimento em Ads
    bestPerformer: {
      productId: "MLB001",
      productName: "Suporte de celular veicular",
      spend30d: 520.0,
      revenue30d: 4520.0,
      acos: 11.5,
      clicks: 980,
      conversions: 64,
      opportunity: "Melhor ACOS da conta — aumentar orçamento diário pode trazer mais vendas mantendo eficiência.",
    },

    campaigns: [
      {
        id: "camp_1",
        name: "Acessórios Celular - Geral",
        status: "ativa",
        spend30d: 520.0,
        revenue30d: 4520.0,
        clicks: 980,
        impressions: 32000,
        ctr: 3.06,
        conversions: 64,
        acos: 11.5,
        items: [
          { productId: "MLB001", productName: "Suporte de celular veicular", spend: 380.0, conversions: 48, acos: 10.2 },
          { productId: "MLB002", productName: "Carregador USB-C 30W", spend: 140.0, conversions: 16, acos: 14.8 },
        ],
      },
      {
        id: "camp_2",
        name: "Carregadores - Black Week",
        status: "ativa",
        spend30d: 410.0,
        revenue30d: 2170.0,
        clicks: 760,
        impressions: 28400,
        ctr: 2.68,
        conversions: 38,
        acos: 18.9,
        items: [
          { productId: "MLB002", productName: "Carregador USB-C 30W", spend: 410.0, conversions: 38, acos: 18.9 },
        ],
      },
      {
        id: "camp_3",
        name: "Capinhas - Liquidação",
        status: "pausada",
        spend30d: 310.5,
        revenue30d: 658.0,
        clicks: 640,
        impressions: 16400,
        ctr: 3.90,
        conversions: 22,
        acos: 26.4,
        items: [
          { productId: "MLB003", productName: "Capinha à prova d'água", spend: 310.5, conversions: 22, acos: 26.4 },
        ],
      },
    ],
  },
};

// ============================================================
// ALERTAS DE MONITORAMENTO (2 EM 2 HORAS)
// — gerado por job/cron no backend, que a cada 2h:
//   1. Lê os produtos do catálogo (MOCK_CATALOG)
//   2. Busca os mesmos produtos nos concorrentes
//   3. Compara preço e estoque com a última verificação
//   4. Se preço caiu ou estoque zerou, gera um alerta aqui
//
// Cada alerta tem um "checkedAt" (quando o monitor rodou) para
// o usuário saber a recência da informação.
// ============================================================
const MOCK_MONITOR_ALERTS_V2 = {
  acc_1: [
    {
      id: "mon_1",
      type: "price_drop", // price_drop | out_of_stock | back_in_stock | new_competitor
      severity: "alta", // alta | media | baixa
      productId: "MLB001",
      productName: "Suporte de celular veicular",
      competitor: "Loja TechMix",
      message: "Concorrente baixou o preço de R$ 38,90 para R$ 35,90",
      previousValue: 38.9,
      currentValue: 35.9,
      yourPrice: 39.9,
      checkedAt: "2026-06-13T14:00:00",
      unread: true,
    },
    {
      id: "mon_2",
      type: "out_of_stock",
      severity: "media",
      productId: "MLB003",
      productName: "Capinha à prova d'água",
      competitor: "AcessóriosJá",
      message: "Concorrente ficou sem estoque — oportunidade de ganhar posição",
      previousValue: 50,
      currentValue: 0,
      yourPrice: 24.9,
      checkedAt: "2026-06-13T12:00:00",
      unread: true,
    },
    {
      id: "mon_3",
      type: "price_drop",
      severity: "alta",
      productId: "MLB002",
      productName: "Carregador USB-C 30W",
      competitor: "ChargeNow",
      message: "Concorrente baixou o preço de R$ 54,00 para R$ 51,00",
      previousValue: 54.0,
      currentValue: 51.0,
      yourPrice: 54.9,
      checkedAt: "2026-06-13T10:00:00",
      unread: false,
    },
    {
      id: "mon_4",
      type: "back_in_stock",
      severity: "baixa",
      productId: "MLB001",
      productName: "Suporte de celular veicular",
      competitor: "ImportShop BR",
      message: "Concorrente que estava sem estoque voltou a vender (preço R$ 37,50)",
      previousValue: 0,
      currentValue: 12,
      yourPrice: 39.9,
      checkedAt: "2026-06-13T08:00:00",
      unread: false,
    },
  ],
  acc_2: [],
  acc_3: [],
  acc_4: [],
};

// ============================================================
// CONFIGURAÇÃO DO MONITOR — informações sobre a rotina de 2h
// ============================================================
const MOCK_MONITOR_STATUS = {
  acc_1: {
    intervalHours: 2,
    lastCheckAt: "2026-06-13T14:00:00",
    nextCheckAt: "2026-06-13T16:00:00",
    productsMonitored: 6,
    competitorsTracked: 23,
    alertsLast24h: 4,
  },
};
