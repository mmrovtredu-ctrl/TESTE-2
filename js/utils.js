/*
  utils.js
  --------
  Funções auxiliares usadas em vários módulos do dashboard.
*/

/**
 * Formata um número como moeda em reais (R$).
 * @param {number} value
 * @returns {string}
 */
function formatCurrency(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Formata um número com separador de milhar (pt-BR).
 * @param {number} value
 * @returns {string}
 */
function formatNumber(value) {
  return value.toLocaleString("pt-BR");
}

/**
 * Formata uma variação percentual com sinal (+ ou -).
 * @param {number} value
 * @returns {string}
 */
function formatTrend(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Retorna a classe CSS adequada (positivo/negativo) para uma tendência.
 * @param {number} value
 * @returns {string}
 */
function trendClass(value) {
  if (value > 0) return "is-positive";
  if (value < 0) return "is-negative";
  return "";
}

/**
 * Lê o id da conta atualmente selecionada no seletor do topo.
 * @returns {string}
 */
function getCurrentAccountId() {
  const select = document.getElementById("accountSelect");
  return select ? select.value : MOCK_ACCOUNTS[0].id;
}
