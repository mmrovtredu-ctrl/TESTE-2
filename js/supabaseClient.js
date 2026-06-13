/*
  supabaseClient.js
  -----------------
  Configuração da conexão com o Supabase.

  IMPORTANTE: Substitua os valores abaixo pelas suas credenciais,
  encontradas em: Supabase → Settings → API

  - SUPABASE_URL: "Project URL"
  - SUPABASE_ANON_KEY: "anon public" key

  A "anon key" é segura para ficar no front-end — ela só permite
  as ações que você liberar nas regras de segurança (RLS) do Supabase.
  NUNCA coloque aqui a "service_role" key.
*/

const SUPABASE_URL = "https://ddvschhwyasrevvxuiav.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_lKSpcGU20TXgK0JWsTE30w_usErK9Hz";

// Cria o cliente Supabase (usa a biblioteca carregada via CDN no HTML)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
