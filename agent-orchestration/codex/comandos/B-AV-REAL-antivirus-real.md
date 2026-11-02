# B-AV-REAL — antivírus real ClamAV para evidências

- **Tipo:** feature de segurança
- **Fase:** Execution/Validation
- **Trilha:** backend/raiz + compose/config de ClamAV; sem banco, frontend ou mobile entregue
- **Data:** 2026-10-30
- **Branch:** `feat/evidence-clamav-scanner`
- **Autor:** `dev-avreal-sol` (Codex GPT-5.6 Sol, nível menor declarado; não planejou nem revisou)
- **Plano:** `docs/revisoes/SAN3/B-AV-REAL-plano.md` (v2)
- **Parecer prevalente:** `C:/Users/AMP/erp-pausa-2026-10-03/revisoes/rev-plano-avreal-v2-parecer.md`

## Objetivo

Implementar o adaptador `node:net` para o protocolo INSTREAM do clamd, mantendo as cinco vias de evidência fail-closed, sem dependência npm nova, sem porta pública e sem expor segredo ou identidade.

## Escopo permitido e proibido

Vale exatamente o §2 do plano v2. `Kpis/**`, lockfiles, dependência npm nova, banco/base viva, Docker nesta etapa, portas vivas e caminhos fora da allowlist permanecem proibidos.

## Sequência autorizada nesta execução

Executar F1 → F2 → F3 → F4 → F5 → F6 → F7, uma por vez, com vermelho-controle, mutações executáveis e restauração comprovada por hash, commit, push e `## RETOMADA n`. F8, F9, F10 e F12 aguardam Docker. Pelo ajuste 3 do parecer v2, F11 também aguarda F8/F9, pois seu critério consolida mutações dessas fatias.

## Validação e rastreabilidade

Executar a bateria e as mutações da fatia correspondente no §3/§4 do plano. Relatório incremental em `docs/revisoes/SAN3/B-AV-REAL-dev.md`. Nenhum PR deve ser aberto nesta execução.
