# B-TRC-02 — respostas do dono às perguntas do plano (2026-10-19)

Palavras do dono, literais: *"Q1 sim, Q2 sim e Q3 sim"* (perguntas do `B-TRC-02-plano.md` ~l.847-860).

- **Q1 = SIM (contra a recomendação do planejador, que era NÃO neste bloco):** quando a posição vai à quarentena porque ninguém tinha a viatura em despacho (ou o histórico é ambíguo), o ERP **conserva mesmo assim** os atributos veiculares (ignição, odômetro) **para a viatura**, sem pessoa. O próprio plano declara a consequência: o desenho muda (recibo próprio para a amostra, 2º índice global). → **emenda do plano antes do código** (`D-EMENDA-ANTES-DO-CODIGO`).
- **Q2 = SIM:** o roteiro da demonstração (ou `traccar-dev-demo.mjs --with-web`) executa, como `postgres`, `GRANT EXECUTE ON FUNCTION public.auth_login_candidates(text) TO erp_runtime`, só na demo, como passo nomeado. Produção não muda (o passo 5 do runbook segue ato do dono). Dono da pendência: `P-TRC-DEMO-LOGIN-SEM-ORG-INERTE` / `P-DEMO-LOGIN-SEM-ORG-INERTE`.
- **Q3 = SIM:** o ERP conserva todos os 38 códigos de alarme da tag; a escolha do que **notifica** fica para o `B-TRC-05`.
