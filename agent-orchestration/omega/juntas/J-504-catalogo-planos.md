# J-504 — junta do PR #504 (B-ASS-02, catálogo de planos e assinatura por organização), 2026-11-05

- **Objeto julgado:** `f0bf2ee72cb01ff120e3982c26623ac50f575e69` (head real do PR #504; o head de código é `ac4b0ebeb66813c6bd867d182d7900b2505192f2` — `f0bf2ee` só acrescenta relatório, medido pelo inspetor).
- **Régua:** bloco que mexe em preço (dinheiro), permissão (`platform:billing:read/manage`), migração e RLS — junta completa, unanimidade de 3 com veto (§C7 item 10(1)). Cada cadeira entrega a lista completa de achados, cada um com o comando que o reproduz (§C7 item 10(3)).
- **Briefing:** `revisoes/j504/BRIEFING.md` (fora do repositório), 05/11.
- **Dev:** `dev-ass02` (DeepSeek), com retomadas e conserto da pré-revisão. Diário em `docs/revisoes/ASSINATURA/B-ASS-02-dev.md`.
- **Pré-revisão:** `prerev-ass02`, APROVADO COM AJUSTES (M-01, M-02, M-03, B-01, B-02 e B-03), triada na Emenda 4 ao §4.2.
- **Inspetor de terreno:** `insp-504` (nível menor declarado, GPT-5.6 Sol). **LIBERADO COM RESSALVA** — R1 (o briefing nomeava `a46b8217`, 1 commit de relatório atrás do head real `f0bf2ee`; código idêntico, as cadeiras miram `f0bf2ee`) e R2 (o PR estava 1 commit atrás da `main` `b3f35afb`, docs, sem conflito). Não são achado do bloco.

## VEREDITO: APROVADO 3/3, nenhum achado

| cadeira | identidade | executor e modelo | voto | achados |
|---|---|---|---|---|
| C1 planos, vigência e dinheiro | `jurado-j504-c1` | DeepSeek Pro (`deepseek-v4-pro`, conta DP) — declarou "Codex" por engano | **APROVADO** | nenhum |
| C2 banco, RLS, migrações e sync | `jurado-j504-c2` | DeepSeek Pro (`deepseek-v4-pro`, conta DP) — declarou "Codex (GPT-5.6 Sol)" por engano | **APROVADO** | nenhum |
| C3 rotas, guards e regressão | `jurado-j504-c3` | DeepSeek Pro (`deepseek-v4-pro`, conta DP) | **APROVADO** | nenhum |

**Declaração de modelo, registrada pelo orquestrador (§A6):** as três cadeiras rodaram no DeepSeek Pro (conta DP). C1 e C2 se declararam "Codex" por engano nos próprios votos; a identidade real é DeepSeek Pro. **Não houve cruzamento de modelo** nesta junta — o dev também é DeepSeek — e isso fica declarado. Nenhuma identidade de jurado colidiu com os inelegíveis (`dev-ass02`, `prerev-ass02`, `fix-503`, `rev-503`, `reg0511`).

## O que a junta achou

- C1, C2 e C3 votaram APROVADO com `achados: []` — nenhum achado, nem grave nem não grave.
- As ressalvas R1/R2 do inspetor (objeto e ramo 1 commit atrás) foram absorvidas pelo merge/update-branch.

## Triagem da pré-revisão (Emenda 4 ao §4.2, 05/11 ~11:20 SP)

- M-01 e M-02 ratificados no PERMITIDO; M-03, B-01 e B-03 consertados pelo dev; B-02 virou a pendência `P-ASS02-WRITER-MODULES-FORA-DO-REPOSITORIO` (dono `B-ASS-03`). A Emenda 2 criou `P-SAN3-05-ETIQUETA-UNICA-POR-ROTA` (dona `B-SAN3-05`). As duas entram neste PR de registro.

## Porteiro (`porteiro-504`, 05/11 ~14:35 SP): LIBERADO COM RESSALVA para o B-ASS-03

- Merge: `43716227a769e2f2661ca828ec68903e4b49167e` (squash do head `97016ff8`), `origin/main`.
- CI do merge `43716227`: backend 4499 testes / 4497 pass / 0 fail / 2 skipped; backend-postgres 503 / 503 / 0 / 0; demais jobs success.
- Ressalva única: a ata `J-504` e as duas pendências (`P-ASS02-WRITER-MODULES-FORA-DO-REPOSITORIO`, `P-SAN3-05-ETIQUETA-UNICA-POR-ROTA`) ainda não estavam na `main`; entram neste PR de registro.
- O item 57 do portão fecha. O KPI segue congelado (§C7 item 8(5)).
