/*
  pricing.js
  ----------
  Preenche a view "Precificação rápida":
  - Lê os campos de custo, frete, taxa, imposto e margem
  - Calcula o preço de venda sugerido e o lucro líquido
  - Estima vendas/mês com base em uma fórmula simples
    (substitua pela lógica real quando tiver histórico de categoria)

  FÓRMULA DE PREÇO:
  custoTotal = custoProduto + frete
  Para garantir a margem desejada sobre o preço de venda, considerando
  que taxa e imposto também incidem sobre o preço de venda:

  preco = custoTotal / (1 - (taxa% + imposto% + margem%) / 100)

  Isso garante que, depois de pagar taxa do ML, imposto e ainda
  sobrar a margem desejada, o restante cobre o custo do produto.
*/

/**
 * Lê os valores do formulário de precificação.
 * @returns {{cost:number, shipping:number, fee:number, tax:number, margin:number}}
 */
function readPricingInputs() {
  return {
    cost: parseFloat(document.getElementById("pCost").value) || 0,
    shipping: parseFloat(document.getElementById("pShipping").value) || 0,
    fee: parseFloat(document.getElementById("pFee").value) || 0,
    tax: parseFloat(document.getElementById("pTax").value) || 0,
    margin: parseFloat(document.getElementById("pMargin").value) || 0,
  };
}

/**
 * Calcula o preço sugerido e demais valores derivados.
 * @param {{cost:number, shipping:number, fee:number, tax:number, margin:number}} inputs
 * @returns {{price:number, feesTotal:number, profit:number}}
 */
function calculatePricing(inputs) {
  const { cost, shipping, fee, tax, margin } = inputs;
  const totalCost = cost + shipping;
  const percentSum = fee + tax + margin;

  // Proteção: se a soma dos percentuais for >= 100%, o cálculo não é viável
  if (percentSum >= 100) {
    return { price: 0, feesTotal: 0, profit: 0, invalid: true };
  }

  const price = totalCost / (1 - percentSum / 100);
  const feesTotal = price * ((fee + tax) / 100);
  const profit = price - totalCost - feesTotal;

  return { price, feesTotal, profit, invalid: false };
}

/**
 * Estima vendas mensais com base no preço calculado.
 * Esta é uma fórmula simplificada para fins de demonstração:
 * quanto mais competitivo o preço (mais baixo), maior a estimativa.
 * Em produção, use o histórico real de vendas da categoria.
 * @param {number} price
 * @returns {number}
 */
function estimateMonthlySales(price) {
  if (price <= 0) return 0;
  // Curva simples: produtos até R$50 vendem mais, acima de R$300 vendem menos.
  if (price < 50) return 60;
  if (price < 100) return 40;
  if (price < 200) return 22;
  if (price < 300) return 12;
  return 6;
}

/**
 * Atualiza a interface com os resultados do cálculo.
 */
function updatePricingResult() {
  const inputs = readPricingInputs();
  const result = calculatePricing(inputs);

  if (result.invalid) {
    document.getElementById("pSuggestedPrice").textContent = "Valores inválidos";
    document.getElementById("pFeesTotal").textContent = "—";
    document.getElementById("pProfit").textContent = "—";
    document.getElementById("pEstSales").textContent = "—";
    document.getElementById("pEstRevenue").textContent = "—";
    return;
  }

  const estSales = estimateMonthlySales(result.price);
  const estRevenue = estSales * result.price;

  document.getElementById("pSuggestedPrice").textContent = formatCurrency(result.price);
  document.getElementById("pFeesTotal").textContent = formatCurrency(result.feesTotal);
  document.getElementById("pProfit").textContent = formatCurrency(result.profit);
  document.getElementById("pEstSales").textContent = `${estSales} unidades`;
  document.getElementById("pEstRevenue").textContent = formatCurrency(estRevenue);
}

/**
 * Inicializa a view de precificação: recalcula a cada alteração nos campos.
 */
function initPricing() {
  const form = document.getElementById("pricingForm");

  form.addEventListener("input", updatePricingResult);

  // Calcula uma vez com os valores padrão ao carregar
  updatePricingResult();
}
