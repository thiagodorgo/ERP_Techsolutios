# Porteiro pós-merge — PR #612 (B-ASS-10c-OPERACAO)

> Cópia, no registro de 21/11 (`reg-2111-cl`), do parecer fora do repositório (`~/erp-pausa-2026-10-03/revisoes/cob-op/junta-612/porteiro-612-parecer.md`). Só os caminhos de home mudaram (para `~/`). A ata versionada é `J-612-b-ass-10c-operacao.md`; as ressalvas (a) e (d) estão neste registro.

- Papel: porteiro-pos-merge · modelo: Opus (claude-opus-5-5), identidade nova, declarado
- Ref medida: origin/main, merge squash 36b5586dc1b983558f615b65366a3fd0f60530e6; head aprovado 80b883cd2f7cb689a8df0c142f9cd61f0ea9fb67
- Início: 2026-11-21 12:24 SP

## 0. Merge na main
- `git fetch origin; git log origin/main --oneline -4` → topo `36b5586d feat(platform): tela de operação da cobrança... (#612)`, pai `38442d94` (#613).
- `git merge-base --is-ancestor 36b5586d origin/main` → OK. `gh pr view 612` → MERGED 2026-11-21T15:21:52Z, mergeCommit 36b5586d, headRefOid 80b883cd.
- `git diff --quiet 80b883cd 36b5586d` → árvore do merge = árvore do head aprovado (TREE_EQ_HEAD).
- Veredito parcial: OK.
## 1. Promessa × diff
- `git diff --stat 36b5586d^ 36b5586d` → 50 arquivos, +8043/−11. `grep -vE '^(frontend/|docs/claude-code-handoff/screen-refs/)'` → vazio (só frontend/** e screen-refs/**). Nada em src/, prisma/, .github/, Kpis/.
- Promessas do corpo conferidas no diff: rota `/platform/billing` com `PermissionGuard platform:billing:read` (frontend/src/App.tsx); 3 aparências A/B/C registradas (appearance.registry.ts, key `platform-billing`) e views BillingOpsViewA/B/C; atalho "Ver demonstrativo de <mês>" no Cloud Billing (cloudBilling.shared.tsx, navega a `/platform/billing?org=&mes=`); guarda não-calcula (ass-10c-nao-calcula.guard.test.ts, ass-10b-nao-calcula.guard.ts); referência `platform-cobranca-3opcoes.reference.html` + linha no README.
- Achado MENOR (comentário cita arquivo inexistente na ref): `frontend/src/modules/appearance/appearance.registry.ts:122`, `frontend/src/modules/platform/billing-operations/pages/PlatformBillingOpsPage.tsx:22` e `.../views/billingOps.shared.tsx:60` citam a maquete `cob-op-3opcoes.reference.html`; `git ls-tree -r 36b5586d docs/claude-code-handoff/screen-refs` só tem `platform-cobranca-3opcoes.reference.html`. Não é comportamento; é dívida de texto para o próximo PR que tocar o módulo.
- Corpo diz "3 commits do bloco"; merge é squash (normal). Veredito parcial: OK com 1 achado menor.
## 2. Contagens reexecutadas + CI da main
- Worktree destacado próprio `~/w-porteiro-612` em 36b5586d. `npm ci` (raiz) → rc=0; `npm --prefix frontend ci` → rc=0.
- `npm --prefix frontend run check` (tsc -b --noEmit) → rc=0.
- `node --test --import tsx tests/ass-10c-*.test.ts tests/ass-10c-*.test.tsx tests/ass-10b-nao-calcula.guard.test.ts` (cwd frontend) → rc=0, `# tests 107 # pass 107 # fail 0`. Bate com o declarado (107/107).
- `npm --prefix frontend run test:smoke` → rc=0, `# tests 2097 # pass 2097 # fail 0`, zero `not ok`. Bate com o declarado (2097).
- Não executado por mim: `npm --prefix frontend run build` (o corpo cita; o mandato não pediu) — coberto pelo job `frontend` do CI.
- CI da main no merge (`gh api .../commits/36b5586d.../check-runs`, 12:28 SP): 9 runs — antivirus, e2e, authority-portal, owner-portal, frontend, flutter = success; deploy = skipped; **backend e backend-postgres = in_progress** no momento da medição (o PR não toca src/; o head 80b883cd já passou pela junta com CI). Veredito parcial: contagens reproduzem; CI do merge parcialmente em curso.
## 3. KPI congelado
- `git diff --name-only 36b5586d^ 36b5586d | grep -c '^Kpis/'` → 0. O PR não tocou Kpis/** (§C7 item 8(5)). Veredito parcial: OK.
## 4. Ata e pendências da triagem
- Ata `ata-J-612.md` (fora do repo, nesta pasta): objeto da junta d948055c; votos C1 REPROVADO (C1-02 grave), C2 APROVADO, C3 APROVADO (`grep '"voto"' votos/C*-voto.json` confere: REPROVADO/APROVADO/APROVADO, objeto d948055c); conserto único 80b883cd por `fix-j612-cl`; conferência `conf-j612-azc` NÃO CONFERIDO (artefato de medição, explicado na ata) e reconferência `reconf-j612-azc` CONFERIDO (fim do arquivo: `## Veredito CONFERIDO`). Ata bate com o ocorrido.
- CI do head aprovado (`gh api .../commits/80b883cd.../check-runs`) → 18 runs, success=18. Bate com a ata.
- Amostragem do grave fechado (C1-02): `CredentialDialog.tsx:49-83` — `clearSecret()` no `finally` do envio (sucesso, recusa, erro de rede) e no fechar; testes T-SEG-6/7/8 em `frontend/tests/ass-10c-segredo.smoke.test.tsx:123,143,159` estão entre os 107 que reexecutei verdes. "RESOLVIDO" é verdade.
- **Fora do repo:** `git ls-tree -r origin/main agent-orchestration/omega/juntas | grep 612` → vazio (a ata J-612 não está na main). `git grep` em origin/main:pendencias.md → `P-612-ACEITE-FORMA-REAL` e `P-GINVOICE-COMENTARIO-POR-REGEX` AUSENTES; `P-567-TRAVA-DINHEIRO-TEMPLATE` existe (l.16303, precisa ficar ABERTA com a regra 2, C3-02); `P-567-VER-DEMONSTRATIVO` existe (l.16024, fechamento pendente, C3-01); reatribuição da `P-08C3` ao `B-ASS-10d` não registrada (C3-01). C3-03 (divergência maquete × Q1(b) em controle/), C3-05 (desvio da Emenda 2 declarado) e C3-06 (contagens corretas 72/72, 39, 2005) idem.
- **Ressalva:** ata J-612, triagem, votos, `P-612-ACEITE-FORMA-REAL` (ALTA) e C3-01/02/03/05/06 TÊM de entrar no próximo PR de registro (§C7.1: junta sem registro no repo é dívida do tamanho do merge).
## 5. Limpeza §C5
- `git worktree list | grep -iE 'w-10c|w-cobop|w-fix612|w-conf-j612|w-reconf612|w-j612'` → vazio; `ls -d` dos diretórios → todos inexistentes. Removidos.
- `git branch --list feat/ass-10c-operacao` → vazio; `git ls-remote --heads origin feat/ass-10c-operacao` → vazio. Apagada local e remota.
- `feat/cobranca-operacao`: existe local e remota (`3fcd973f`, último commit 2026-11-20 16:55 -0300, 29 commits fora da origin/main). MANTIDA de propósito (ramo original pré-squash do #608, com 20 arquivos não provados absorvidos). **Ressalva:** verificar depois (comparar árvores com a main, `rev^{tree}`) e decidir apagar ou levar por PR; não deixar como resíduo sem dono.
- Observação pré-existente, não deste bloco: o checkout principal está em `fix/seed-org-demo-pt-br` (3ff93b64) com ` D agent-orchestration/omega/juntas/J-515-b-ass-06.md` e ` D docs/revisoes/REGISTRO/reg-noite-0911-dev.md` (já no snapshot de início da sessão; o #612 não toca esses caminhos). Fica para quem é dono daquela árvore conferir.
- Disco: `df -h /c` → 143 GB livres (acima de 10 GB; DEEP_CLEAN não necessário).
- Worktree do porteiro `w-porteiro-612` removido ao final (ver fim).
## 6. Bloqueios para os próximos alvos
- `git show origin/main:agent-orchestration/controle/pendencias.md`, busca por `B-APP-ORG`, item 69/70 e `**bloqueia:**`: as pendências dos itens 69 (l.16890) e 70 (l.16898) estão ABERTAS, ALTA, com `bloqueia: a versão vendável, pelo item 69/70` — travam o portão vendável, não o start; o dono delas é justamente o trabalho dos itens 69/70 (B-APP-ORG-2/2S/2S-c). As demais do B-APP-ORG (l.16906, 16913, 16920, 16927, 16934, 16941, 17490, 17497) dizem `bloqueia: não`.
- O #612 não abriu pendência com `bloqueia` (a `P-612-ACEITE-FORMA-REAL` é ALTA, sem bloqueio declarado, e ainda nem está no repo).
- Nenhuma pendência aberta com "bloqueia" trava o start do B-APP-ORG-2/2S/2S-c (que segue na crítica de plano, fora do escopo deste porteiro). Veredito parcial: start não negado.
## Veredito
LIBERADO COM RESSALVA: B-APP-ORG-2/2S/2S-c (itens 69 e 70) | (a) próximo PR de registro leva a ata J-612, triagem, votos, a `P-612-ACEITE-FORMA-REAL` (ALTA) e C3-01/02/03/05/06 (P-GINVOICE-COMENTARIO-POR-REGEX, P-08C3 → B-ASS-10d, fechamento da P-567-VER-DEMONSTRATIVO, P-567-TRAVA-DINHEIRO-TEMPLATE aberta com a regra 2, divergência maquete × Q1(b) em controle/, desvio da Emenda 2, contagens 72/72·39·2005); (b) CI da main em 36b5586d com backend e backend-postgres ainda in_progress às 12:29 SP — conferir conclusão verde; (c) `feat/cobranca-operacao` (3fcd973f) mantida: comparar árvores e decidir; (d) comentário cita maquete inexistente `cob-op-3opcoes.reference.html` em appearance.registry.ts:122, PlatformBillingOpsPage.tsx:22, billingOps.shared.tsx:60 — corrigir para `platform-cobranca-3opcoes.reference.html` no próximo PR que tocar o módulo.
- Fim: `git -c core.longpaths=true worktree remove --force ~/w-porteiro-612` → rc=0; diretório inexistente depois; temporários do scratchpad apagados. 12:31 SP.
