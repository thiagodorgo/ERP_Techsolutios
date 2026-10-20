# J-B-DASH-PERFIL — junta do ciclo 2 (2026-10-19) · PR #446, o painel e as permissões seguem o perfil da sessão

- **Objeto:** `faad24ce7c00ab4d7610d0784c0beab8a479ddb0` (CI 14/14 concluída e verde).
- **Régua:** bloco de PERMISSÃO — junta completa, unanimidade de 3 com veto. Ciclo 2 é o último em que todo `bloqueia` dentro do bloco reprova (§C7 item 8(2)).
- **Plano do ciclo 2:** `agent-orchestration/omega/reprovacoes/R-B-DASH-PERFIL-1.md`, escrito por `planejador-dash-ciclo2-fable` (Fable).
- **Dev do ciclo 2:** `dev-dash-ciclo2-opus` (Claude Opus); relatório em `docs/revisoes/TELAS/B-DASH-PERFIL-ciclo2-dev.md`.
- **Mandatos:** forma A, pré-voo OK nos 4, escritos por `redator-dash2-opus` (Claude Opus). Ficam em `votos/B-DASH-PERFIL-ciclo2/00-mandatos/`.
- **Inspetor de terreno:** `inspetor-dash2b-opus` (Claude Opus), sucessor P3 de `inspetor-dash2-opus`, que caiu por erro de rede ainda no esqueleto. Parecer: **LIBERADO COM RESSALVA** (R1–R5), em `votos/B-DASH-PERFIL-ciclo2/insp-dash2-parecer.md`.

## VEREDITO: REPROVADO (1 × 1; a C3 não votou)

| cadeira | identidade | executor e modelo | voto | bloqueia |
|---|---|---|---|---|
| C1 cadeia de acesso | `jurado-dash2-c1-opus` | Claude Code, Claude Opus | **APROVADO** | — |
| C2 troca de organização | `jurado-dash2-c2-opus` | Claude Code, Claude Opus | **REPROVADO** | 1 (não grave) |
| C3 regressão e escopo | `jurado-dash2-c3-cdx` | Codex GPT-5.6 Sol | **não votou** | — |

A C3 não votou porque o Codex bateu o limite semanal às 22:42Z e só volta em 24/10 às 20:38 (P6). A C2 já tinha reprovado, então a unanimidade estava impossível e o veredito não depende do voto que faltou.

**O bloqueio:**
- **C2-dash2-01 — a navegação depois de escolher a organização não é presa por teste executado.**
  - A mudança é deste bloco: `ContextSelectionPage.tsx:55`, commit `a6b91ce9`.
  - A mutação M3b (`navigate("/dashboard")`) passa em `test:smoke` 1335/1335 e nos 4/4 testes da raiz.
  - O adiamento registrado em `P-DASH-PERFIL-TROCA-CLIQUE-SEM-TESTE` se apoiava na "falta de arnês de interação". A C2 mostrou por execução que isso é falso: `frontend/tests/work-orders-page-live.test.tsx` tem esse arnês desde `3e40a256` (02/10, #402), sem dependência nova, e com ele a M3b fica vermelha.
  - Escopo `dentro-do-bloco`. Não é grave: a guarda de `/dashboard` continua negando.

**O que as cadeiras confirmaram por execução:**
- **C1:** a reclassificação do C1-01 como `pre-existente` se mantém (origem `011632f1`). Os testes T5a–c, a mutação M3/M2/M6 e o T6 ficam vermelhos quando deviam.
- **C2:**
  - os testes T1–T4 e as mutações M1, M1b, M7 e M1a ficam vermelhos quando deviam, e cada troca de organização instala exatamente as permissões daquela organização;
  - o produto é idêntico ao do ciclo 1 (patch-id igual, 0 arquivos de produto alterados).

## Separação de papéis (§C7.4-bis) e as três perguntas da reprovação
- **Papéis:**
  - achou: `jurado-dash2-c2-opus`;
  - planejou o ciclo 2: `planejador-dash-ciclo2-fable`;
  - desenvolveu o ciclo 2: `dev-dash-ciclo2-opus`;
  - audita e planeja o ciclo 3: `planejador-dash-ciclo3-fable` (Fable), em `agent-orchestration/omega/reprovacoes/R-B-DASH-PERFIL-2.md`.
- **(a) A composição cobriu a competência?** Sim. A falta da C3 está registrada em P6.
- **(b) Quem achou conserta?** Não. O dev do ciclo 3 tem identidade nova.
- **(c) Havia dado podre?** Sim. A premissa "não há arnês de interação" nunca foi medida e era falsa.
  - Ela estava no registro do dev e foi herdada pelo mandato da C2.
  - A cadeira a mediu em vez de herdar, e foi assim que ela caiu.
- **Sinal de não-convergência:** não há. É a mesma classe do C3-01 do ciclo 1 (um arnês que não prende), mas desta vez com informação nova: o arnês existia.

**Próximo:** ciclo 3, com plano em `R-B-DASH-PERFIL-2`, ZERO produto e um teste de clique novo. A partir do ciclo 3, só defeito de produto grave reprova; o resto vira pendência e o bloco mergeia.
