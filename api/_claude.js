// api/_claude.js
// ─────────────────────────────────────────────────────────────
// Helper central para chamar a API da Anthropic (Claude) COM
// busca na web (web_search) e devolver JSON já validado.
//
// Por que existe: marketing.js e analyze.js usam exatamente a
// mesma mecânica (chamar Claude + buscar na web + ler JSON).
// Centralizar evita duplicar bug e facilita manutenção.
// ─────────────────────────────────────────────────────────────

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

// Modelo configurável por variável de ambiente (CLAUDE_MODEL).
// Se não houver, usa o Sonnet 4.6 (bom equilíbrio custo/qualidade).
const MODEL = (process.env.CLAUDE_MODEL || 'claude-sonnet-4-6').trim();

// ─── Extrai um objeto JSON de um texto, mesmo se vier "sujo" ───
// (com ```json ... ```, ou com frases antes/depois do objeto).
function extractJson(text) {
  if (!text) return null;

  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();

  // 1) tenta parsear direto
  try {
    return JSON.parse(cleaned);
  } catch (_) { /* segue para o plano B */ }

  // 2) plano B: pega do primeiro "{" até o último "}"
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    const slice = cleaned.slice(first, last + 1);
    try {
      return JSON.parse(slice);
    } catch (_) { /* desiste */ }
  }

  return null;
}

// ─── Chama o Claude com web_search e devolve JSON validado ───
// Retorna sempre um objeto { ok, status, data?, error?, detail?, raw? }
// para o endpoint decidir o que mandar ao front.
export async function callClaudeJSON(prompt, opts = {}) {
  const maxTokens   = opts.maxTokens   || 4096;
  const maxSearches = opts.maxSearches || 5;

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      error: 'ANTHROPIC_API_KEY não está configurada na Vercel.',
    };
  }

  let resp;
  try {
    resp = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
        // Ferramenta nativa de busca na web. Se algum dia a Anthropic
        // mudar a versão desta tool, a API devolve erro claro aqui e
        // basta atualizar a data abaixo.
        tools: [
          { type: 'web_search_20250305', name: 'web_search', max_uses: maxSearches },
        ],
      }),
    });
  } catch (e) {
    return {
      ok: false,
      status: 502,
      error: 'Falha de rede ao chamar a Anthropic.',
      detail: String(e),
    };
  }

  const data = await resp.json().catch(() => null);

  if (!resp.ok) {
    return {
      ok: false,
      status: resp.status,
      error: 'A API da Anthropic retornou erro.',
      detail: data,
    };
  }

  // IMPORTANTE: com web_search a resposta tem VÁRIOS blocos
  // (server_tool_use, web_search_tool_result e text).
  // Precisamos juntar SÓ os blocos de texto — nunca content[0].
  const text = (data?.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  const json = extractJson(text);
  if (!json) {
    return {
      ok: false,
      status: 502,
      error: 'A IA não devolveu um JSON válido.',
      raw: text,
    };
  }

  return { ok: true, status: 200, data: json };
}
