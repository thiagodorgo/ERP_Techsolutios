identidade efetiva: jurado-dash3-c2b-opus · executor: Claude Opus (Claude Opus 5.5) pelo Antigravity · modelo Claude Opus, nível menor declarado (§C7.6) · troca de executor: o plano previa Antigravity (então sem crédito), o mandato pôs Gemini 4 Argon pela Gemini CLI, que bateu o teto mensal de gasto (429, 02:39Z de 20/10; registrado em 00-quedas.md e na R1 do inspetor) → sucessora jurado-dash3-c2b-opus · objeto 33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d · mandato_md5 ab74b68ba960309c352e4dd78126eba7 (cru = EOL-neutro) · corpo nos dois espelhos: IDENTICO (EOL-neutro; o par .claude×.agents difere só no `tools:` do frontmatter e no preâmbulo "Papel para o Codex", diferenças específicas de ferramenta; blob de cada espelho idêntico nos objetos dos ciclos 1, 2 e 3)

# C2 — evidência — B-DASH-PERFIL ciclo 3 (PR 446)

Logs brutos: `C:/Users/AMP/erp-pausa-2026-10-03/jdash3-c2b/`. Não li votos de outras cadeiras. Insumos (plano R-B-DASH-PERFIL-2.md, atas dos ciclos 1 e 2, relatório do dev do ciclo 3) tratados como A RE-VERIFICAR.

## S0 — legalidade (antes do mérito)

Comando (timeout 10 s, Git Bash): `bash C:/Users/AMP/erp-pausa-2026-10-03/jdash3-c2b/s0-legalidade.sh` (log `s0.log`). Conteúdo: md5 do mandato cru e `tr -d '\r'`; `git show $O:<corpo> | tr -d '\r' | md5sum` nos dois espelhos + `git rev-parse` do blob nos objetos 849bf840/faad24ce/33345c6e; `diff` EOL-neutro dos espelhos; `git ls-remote origin refs/heads/fix/dash-perfil`; `gh pr view 446 --json headRefOid,state,isDraft,mergeable`; `git fetch origin main`; `git merge-base origin/main $O`; `gh api .../commits/$O/check-runs --jq ...`; `git diff --name-only <ciclo1|ciclo2> $O -- frontend/src src | wc -l`; `docker ps -a`; `git worktree list`.

Saída resumida:
- mandato md5 cru `ab74b68ba960309c352e4dd78126eba7` = EOL-neutro (bate com o citado pelo inspetor na R1).
- corpo `.claude` EOL-neutro `afee3f7f…`, blob `bcf618d4…` igual em c1/c2/c3; corpo `.agents` EOL-neutro `5198368e…`, blob `f06623cc…` igual em c1/c2/c3; diff = só `tools:` e preâmbulo Codex.
- objeto: ls-remote `33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d refs/heads/fix/dash-perfil`; gh `OPEN, isDraft=false, MERGEABLE, headRefOid=33345c6e…`.
- origin/main (início) = `2ecfb333aed0a0efcc1f171148473aad2921be66` = B (merge-base). Delta: objeto contém a main inteira.
- check-runs: `14` total, `0` fora de completed/success.
- `frontend/src` + `src`: 0 arquivos diferentes ciclo1→3 e ciclo2→3 (ciclos 2 e 3 não tocaram produto).
- Docker: só `erp-postgres` (5432) e `erp-redis` (6379), base viva, proibida, não tocada. Este jurado não sobe contêiner (ciclo sem banco); cluster `jdash3-c2-*` não criado.
- Parecer do inspetor `insp-dash3-parecer.md` (`inspetor-dash3-opus`): **LIBERADO COM RESSALVA** (R1–R5), nomeando C2 = `jurado-dash3-c2b-opus`, worktree `C:/Users/AMP/w-jdash3-c2b-opus`, sem cluster (Docker se preciso `jdash3-c2-*`), cadeira que muta só no próprio worktree.
- Nota de terreno: o prompt de disparo sugeria `C:/Users/AMP/w-jdash3-c2b`; uso `C:/Users/AMP/w-jdash3-c2b-opus`, que é o nome do parecer do inspetor e casa o prefixo `w-jdash3-c2` do mandato. Divergência de forma, declarada.
- Inelegibilidade: `jurado-dash3-c2b-opus` não consta da lista de inelegíveis do mandato nem das 31 identidades geradas pelo inspetor; nunca atuei neste bloco.

Veredito parcial S0: **LEGAL — pode começar o mérito.**

## Terreno

- Memória de commit livre antes do `npm ci`: `pwsh/powershell (Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory/1MB` → **5,77 GB** (≥ 3 GB); disco C: 13,1 GB livres.
- `git -C C:/Users/AMP/w-dash worktree add C:/Users/AMP/w-jdash3-c2b-opus 33345c6e --detach` (timeout 10 s) → `HEAD is now at 33345c6e`; `git rev-parse HEAD` = `33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d`. Worktree exclusivo `w-jdash3-c2-…` (prefixo do mandato: `C:/Users/AMP/w-jdash3-c2b-opus`).
- `npm ci --no-audit --no-fund` em `frontend/` do worktree (timeout de espera 10 min; log `npm-ci.log`) → `ec=0`, `added 103 packages in 2m` (106,9 s). `(Get-Item frontend/node_modules).LinkType` → vazio: diretório comum, **zero junction**. Raiz do worktree sem `node_modules` (os itens só usam `frontend/`).
- Sem banco, sem `DATABASE_URL`, sem Docker: nenhum contêiner/rede `jdash3-c2-*` criado. Nenhuma das portas 5432/6379/3000/5173/5050/8899 usada. Base viva (`erp-postgres`/`erp-redis`) intocada.
- Árvore principal `C:/Users/AMP/w-dash` não editada (só estes dois arquivos de output, como manda o mandato).

## Item 1 de 3 — execução do arquivo novo e dos vizinhos

Comando (cwd `C:/Users/AMP/w-jdash3-c2b-opus/frontend`, timeout de espera 10 s, log `item1.log`):
`node --test --import tsx tests/context-selection-page-live.test.tsx tests/dashboard-profile-provider.test.tsx tests/dashboard-profile-behavior.test.tsx`

Saída resumida (ec=0, 2,25 s):
```
ok 1 - [K1] troca por clique para organização com perfil Financeiro navega para /finance e grava permissões sem dashboard:read
ok 2 - [K2] troca por clique para organização com perfil Estoque navega para /inventory
ok 3 - [K3] troca por clique para organização cujo perfil só tem os.read permanece em /select-context e exibe erro de perfil sem telas
ok 4 - [K4] ativar a própria organização da sessão navega para a primeira rota permitida sem chamar POST /auth/active-tenant
ok 5..12 - (dashboard-profile-behavior + dashboard-profile-provider: Nova OS só com work_orders:create; KPI clicável; troca decide e persiste pela sessão efetiva; aliases não promovem OS; contexto mais largo que a sessão não libera nada; Financeiro com dashboard:view só no contexto não entra; controle positivo dashboard:read; a troca substitui as permissões, não une)
# tests 12 · pass 12 · fail 0 · cancelled 0 · skipped 0 · todo 0
```
- Zero `console.error`: o arquivo novo assere `consoleErrors` vazio por caso e no `after()` (passou); o log inteiro (70 linhas) não tem nenhuma linha com `error`/`Warning`/`console` (os dois vizinhos não têm espião próprio, mas nada foi escrito em stderr).
- Leitura do teste (não herdada): K1 assere `POST /auth/active-tenant`, path `/finance`, sessão nova sem `dashboard:read` e com `financial_entries:read`, `activeContext.tenantId = org-dois` e `activeContext.permissions` = permissões da sessão nova; K2 path `/inventory` e mesma igualdade; K3 path `/select-context`, mensagem `Seu perfil não possui telas associadas.` e `activeContext === null`; K4 `calls = ["GET /me/tenants"]`, path `/work-orders`, `activeContext.permissions = ["work_orders:read"]`. O clique é o `onClick` real do `<button>` (via `__reactProps$`) na `ContextSelectionPage` real sob `AuthProvider > TenantProvider > PermissionProvider > MemoryRouter`.

Veredito parcial Item 1: **VERDE** (12/12 pass, 0 fail, 0 `console.error`).

## Item 2 de 3 — as 4 mutações M3b, M3c, M3e, M1a

Comando (timeout de espera 10 s + espera ativa de 9 s; log `item2.log` e `item2-<id>.log`):
`powershell -NoProfile -File C:/Users/AMP/erp-pausa-2026-10-03/jdash3-c2b/item2.ps1` — para cada mutação, uma por vez: `git hash-object` antes; `node mut.cjs <id> apply` (cópia byte a byte para `.orig-c2b`, âncora única n=1, CRLF preservado); `git diff --stat`; `node --test --import tsx tests/context-selection-page-live.test.tsx`; `node mut.cjs <id> restore` (cópia byte a byte de volta); `git hash-object` × `git rev-parse 33345c6e:frontend/<arquivo>`. No fim: `git status --short -- src` e `git diff --stat HEAD -- src`.
- M1a ancorada no `permissions,` de `nextSession.user` (logo após `roles: resolveFrontendRoles(backendRoles),`), não no `permissions,` de `membershipToContext` — a âncora casou n=1.

Saída resumida:

| mutação | arquivo | hash mutado | ec do teste | not ok | esperado pelo mandato | restauro (`git hash-object` = blob do objeto) |
|---|---|---|---|---|---|---|
| M3b `navigate(landing);` → `navigate("/dashboard");` | `ContextSelectionPage.tsx` | `9a417311…` | 1 | K1, K2, K4 (pass 1, fail 3) | K1/K2/K4 | `e34d4cbdcb9be31fc9a4100106201d07f344e1bc` = blob ✔ |
| M3c `setActiveContext({ ...context, permissions });` → `setActiveContext({ ...context });` | `ContextSelectionPage.tsx` | `dab9cddb…` | 1 | K1, K2, K4 (pass 1, fail 3) | K1/K2/K4 | `e34d4cbd…` = blob ✔ |
| M3e remoção do `if (!landing) { throw new Error("Seu perfil não possui telas associadas."); }` | `ContextSelectionPage.tsx` | `1f18b94f…` (3 deleções) | 1 | K3 (pass 3, fail 1) | K3 | `e34d4cbd…` = blob ✔ |
| M1a `permissions,` → `permissions: [...currentSession.user.permissions, ...permissions],` | `repository.ts` | `97d6a5ce…` | 1 | K1, K2, K3 (pass 1, fail 3) | K1/K2/K3 | `68a4804f15f922a7b302a5a2c101d9f809462b65` = blob ✔ |

- Após as 4: `git status --short -- src` vazio; `git diff --stat HEAD -- src` vazio. Nenhum `.orig-c2b` restante (o `restore` apaga a cópia).
- Cada mutação deixou vermelho exatamente o conjunto que o mandato exige, nem mais nem menos. Vermelho-controle do corpo canônico coberto: herança de permissões (`...oldPermissions` ≡ M1a) derruba; landing incondicional `/dashboard` (≡ M3b) derruba; contexto ativo gravado sem as permissões da sessão (M3c, o caminho do "mapa estático" `resolveFrontendPermissions(roles)` de `membershipToContext`) derruba.

Veredito parcial Item 2: **VERDE** (4/4 mutações vermelhas no conjunto exato; 4/4 restauros provados por `git hash-object`).

## Item 3 de 3 — fechamento da pendência e regeneração do índice

Comandos (timeout de espera 10 s cada; log `item3-pend.txt`):
1. `git show 33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d:agent-orchestration/controle/pendencias.md | Select-String 'P-DASH-PERFIL-TROCA-CLIQUE-SEM-TESTE' -Context 0,8` (equivalente PowerShell do `grep -i -n -A3`).
2. No worktree: `python agent-orchestration/controle/gerar-indice-pendencias.py`; `git diff --quiet -- agent-orchestration/controle/pendencias-indice.md`; `git hash-object` × `git rev-parse 33345c6e:agent-orchestration/controle/pendencias-indice.md`; `git checkout -- agent-orchestration/controle/pendencias-indice.md` (restauro).

Saída resumida:
- `pendencias.md` (objeto), entrada `## P-DASH-PERFIL-TROCA-CLIQUE-SEM-TESTE (2026-10-19) … — BAIXA`: `- **status:** RESOLVIDA em B-DASH-PERFIL ciclo 3 (2026-10-19) · \`frontend/tests/context-selection-page-live.test.tsx\` (casos K1–K4 com DOM mínimo do repositório; vermelho sob M3b, M3c, M3e e M1a) · **escopo:** \`pre-existente\` na falta de arnês de interação (…) · **dono:** \`B-DASH-PERFIL\``; `teste de encerramento:` aponta `frontend/tests/context-selection-page-live.test.tsx` e M3b/M3c/M3e/M1a. → **fechada/resolvida com evidência no arquivo novo e nas 4 mutações** (e as 4 mutações foram re-medidas por mim no Item 2).
- Gerador: `indice: 583 cabecalhos / 572 IDs | {'FECHADA': 146, 'ABERTA': 434, 'SEM-STATUS': 3}`, ec=0; `git diff --quiet` ec=0; `hash-object regenerado = 47721eac0b32aa154f24411f132a11c80c21c0ab = blob do objeto`. A linha `| \`P-DASH-PERFIL-TROCA-CLIQUE-SEM-TESTE\` | 11386 | BAIXA | sim | …` está na seção `## FECHADAS - 146` (l.522+, a linha é a 671). Restauro: `git checkout`, hash pós-restauro `47721eac…`, `git status` limpo.
- Observação de forma (NÃO grave pela régua do ciclo 3; vira pendência de registro, não bloqueia): o texto da linha de status diverge do literal do plano §2.5 — usa `RESOLVIDA` em vez de `FECHADA em <data>`, mantém **escopo `pre-existente`** com a justificativa "na falta de arnês de interação" (que o próprio plano §2.5 declara FALSA no objeto e mandava corrigir para `dentro-do-bloco` com a nota `<sub>`), mantém `dono: B-DASH-PERFIL` em vez de `encerrado` e não traz a nota `<sub>` de correção do escopo. gravidade: não grave (registro) · classe: registro/forma · escopo: `dentro-do-bloco` · N=1 entrada · forma: texto literal da linha de status. O efeito material (pendência fechada no índice gerado) está correto.

Veredito parcial Item 3: **VERDE** (fechada com evidência; índice regenerado = blob do objeto), com 1 observação de forma não grave que vira pendência.

## Teardown

Comando (timeout de espera 10 s): `git status --short` no worktree (0 entradas); `Get-ChildItem -Recurse -Filter *.orig-c2b frontend/src` (0); `git ls-remote origin refs/heads/fix/dash-perfil` (`33345c6e…`, o head não andou); `git fetch origin main` (origin/main fim `2ecfb333…` = início: cerca intacta, delta zero); `git worktree remove --force C:/Users/AMP/w-jdash3-c2b-opus` → ec=0, `Test-Path` False, ausente do `git worktree list`; `docker ps -a` → só `erp-postgres`/`erp-redis` (nenhum contêiner meu). Processos alheios intocados. Restam só os logs em `C:/Users/AMP/erp-pausa-2026-10-03/jdash3-c2b/` e estes dois outputs. Nada commitado.

## Veredito

Itens 1, 2 e 3 VERDES por execução própria. Nenhum defeito de produto grave (perda de dado, vazamento entre organizações, quebra de permissão na autoridade, erro de dinheiro) achado. 1 observação de forma no registro (Item 3), não grave pela régua do ciclo 3 → pendência com dono.

VOTO: APROVADO — a troca por clique na ContextSelectionPage real navega pela landing das permissões da sessão nova, grava activeContext com essas permissões, bloqueia perfil sem telas e não herda permissões; as 4 mutações (M3b, M3c, M3e, M1a) ficam vermelhas no conjunto exato e os restauros batem com o blob do objeto; pendência fechada e índice regenerado igual ao objeto.
