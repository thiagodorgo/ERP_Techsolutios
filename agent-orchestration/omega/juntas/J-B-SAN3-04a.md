# J-B-SAN3-04a — ata da junta (catálogo, banco e menu convergem à matriz de papéis)

## Ciclo 1 — 2026-09-18 — APROVADO 3 × 0

- **Objeto:** `fbda96b0` (PR #390); head na junta = o objeto. Base `origin/main@02bd7dab`, **sem rebase** (o #387 estava OPEN; o rebase
  e a recontagem de KPI acontecem depois do merge do #387, conferidos no pré-merge — R1 do inspetor).
- **Quórum: unanimidade de 3** (`D-JUNTA-ESCOPO-E-CALIBRACAO` §C7.1-ter(b): o bloco toca **permissão**). Sem `critico-adversarial`
  (o (b) o reserva aos blocos de invariante).
- **Inspetor de terreno:** `LIBERADO COM RESSALVA` — `votos/B-SAN3-04a/00b-inspetor-terreno.md` (`inspetor-de-terreno-da-junta`,
  Fable 5.1, 15:40–15:58). Isolamento, insumos, papéis, fatia S0 (`sync-agent-agents --check` verde) e baseline VERDES.
  Ressalvas: **R1** (obrigatória, corrigida antes do disparo) — o briefing §0 afirmava um rebase que não tinha acontecido;
  **R2** participação prévia a declarar no voto (`coordenador-de-acessos`, `validador-mestre`, `agente-ci-doutor` vinham das juntas
  do plano SAN3); **R3** resíduo inerte alheio (`erp-postgres-alt` na 55432, diretório vazio `san2-r`) — não usar o nome nem a porta,
  ninguém varre; **R4** outras juntas no mesmo terreno (`bsan301-*` vivos), remoção só pelo PRÓPRIO nome; **R5** armadilha medida —
  com `MSYS_NO_PATHCONV=1`, `git worktree add /c/Users/...` cria em `C:/c/Users/...`; **R6** `frontend/node_modules` presente no
  `bsan304a`, ao contrário do que o plano dizia.
- **Votos:**

| Cadeira | Identidade | Instância | Voto | bloqueia (dentro) | ajuste | nota |
|---|---|---|---|---|---|---|
| C1 banco e RBAC persistente | `agente-dba-guardiao` | 1ª | APROVADO | 0 | 1 (C1-A1) | 2 |
| C2 cadeia papel → menu → rota → backend (veto) | `coordenador-de-acessos` | 2ª (a 1ª caiu por 429) | APROVADO | 0 (2 `bloqueia` pré-existentes: C2-01, C2-03) | 1 dentro (C2-02) + 3 pré | 5 |
| C3 diff × escopo, KPI e registro | `agente-ci-doutor` | 2ª (a 1ª caiu por 429) | APROVADO | 0 | 0 | 3 |

- **A regra do escopo (§C7.1-ter(a)) funcionou como desenhada.** A C2 tem **veto** e trouxe **dois** achados `bloqueia` — e
  **nenhum** reprovou, porque os dois são `pre-existente` com evidência de data e de origem: C2-01 (`docs/navigation-matrix.md`
  sem commit desde `aff48fbb`, 2026-08-08; 33 das 40 células já divergiam no head-base; `docs/**` fora do escopo permitido) e
  C2-03 (o gate de módulo é o item 16 do `PLANO_SAN3.md`, dono `B-SAN3-18`, e o comando do bloco diz literalmente "fica de fora").
  O veto continuou inteiro para o que o bloco mexeu: `bloqueia_dentro_do_bloco` = **0** nas três cadeiras.
- **Voto nominal da revogação (emenda (b) do comando):** a C2 **APROVA** as 2 revogações nomeadas do `manager`
  (`checklist_runs:update`, `checklist_runs:acknowledge`) — `RBAC_MATRIX.md:44` diz "read/complete-by-scope" e não as nomeia;
  drill no `i2_base` com o script do objeto: `--dry-run` só relata (banco intacto), aplicar remove 2 e só elas, 2ª execução remove 0,
  CONVERGIDO; o gate responde 403 ao `manager` e 400 ao `tenant_admin`; nenhum fluxo web do gestor as consome.
- **Quedas (P6):** `votos/B-SAN3-04a/00-quedas.md` — a janela das 16h (HTTP 429, reset 19:20) derrubou 16 de 17 agentes das três
  juntas em curso, entre eles C2 e C3 e os suplentes que o workflow acionou automaticamente. **Erro de desenho do orquestrador,
  registrado:** queda por limite de sessão não é razão de suplente; os suplentes caíram sem medir e por isso **não** ficam
  inelegíveis. Titulares relançados às 19h36, com teto de 3 agentes simultâneos.
- **Anomalias de terreno, conferidas pelo orquestrador:** (1) os contêineres da C3 ocuparam 56445/56446 entre ~19:48 e 19:50:30, onde
  escutavam as APIs ESQUECIDAS da 1ª instância da C2 (PIDs 22856/24488 e 10812/896); a 2ª instância da C2 mediu nas portas 56447/56448
  (`urls_usadas` do voto) — **sem efeito no voto**. (2) Os diretórios `j-bsan304a-c2`, `-c2-base` e `-c3` ficaram presos por esses
  processos e por um `cmd.exe`; o orquestrador conferiu pela linha de comando que eram servidores dos worktrees da junta, encerrou-os
  pelo PID e removeu os diretórios.
- **Papéis (§C7.4-bis):** planejador `planejador-mestre` (Fable); desenvolvedor `general-purpose` (3 instâncias — a 2ª caiu com o
  trabalho vivo e não commitado, a 3ª mediu esse WIP contra o plano em vez de herdá-lo); o orquestrador decidiu as emendas 1 e 2;
  **nenhum deles votou**. Quem achou (as juntas do #386 e o inventário SAN3) não planejou nem desenvolveu.

### Destino dos achados (emenda 3 do comando)

- **Ajustes dentro do bloco, resolvidos antes do merge:** C1-A1 (o runbook `docs/deployment.md` e o texto do passo do CD em
  `.github/workflows/deploy-production.yml` diziam que o provisionamento nunca apaga concessão; agora ele revoga 2) e C2-02 (as 7
  divergências que o bloco criou com `docs/navigation-matrix.md` registradas em `controle/decisoes.md`, §A2).
- **Pré-existentes → pendência com dono:** C2-01 (`docs/navigation-matrix.md` × matriz efetiva, 40 células →
  `P-SAN3-04A-NAVIGATION-MATRIX-DEFASADA`, dono `B-SAN3-06a`), C2-03 (itens visíveis com módulo não provisionado → emenda em
  `P-WEB-GATE-MODULO-INCOMPLETO`, N=8, dono `B-SAN3-18`), C2-04 (emenda na `P-SAN3-04A-PERMISSOES-ORFAS`, efeito do apelido
  `os.read`, N=4, dono `B-SAN3-04b`), C2-05 (o botão "Nova OS" sem gate → **emenda na `P-SAN3-01-NOVA-OS-SEM-GATE-NO-BOTAO`**, que
  já existia e a C2 não podia ver: nasceu no #387, OPEN quando a junta votou — ver a divergência no pré-merge), C2-06
  (`P-AUTH-CLAIMS-SEM-TENANT-ROLE`, fila pós-gate, primeiro bloco que tocar `src/modules/auth/**`).
- **Notas para a ata:** C1-N1 e C1-N2 (alcance e rollback da revogação: base preparada só com seed mantém as 2 concessões do
  `manager` indefinidamente, e `git revert` numa base já provisionada devolve as 2 revogações mas deixa as 9 concessões novas),
  C2-07 (finance e inventory viram destinatários de `checklist_run.completed`), C2-08 (duas citações de linha imprecisas no §7 do
  plano), C2-09, C2-10, C2-11, C3-N1 a C3-N3.

## Pré-merge — 2026-09-20 (depois do merge do #387)

Executado por um desenvolvedor que **não** julgou o bloco (§C7.4-bis), sobre o objeto aprovado. O que mudou e o que não mudou:

- **Rebase em `origin/main@83a3c68c`.** Conflitos resolvidos por **união** (`frontend/package.json` `test:smoke` = 142 arquivos,
  os testes dos dois PRs; KPI; `decisoes.md`; `pendencias.md`; `log-execucao.md`; `status-geral.md`) e o
  `pendencias-indice.md` **regerado pelo gerador**, nunca editado à mão.
- **O código julgado não mudou, provado nas duas direções:** `git diff 02bd7dab fbda96b0` × `git diff 83a3c68c HEAD` sobre
  `src frontend/src prisma scripts tests RBAC_MATRIX.md frontend/tests` = **2002 linhas cada, `cmp` idêntico**; e
  `git diff fbda96b0 HEAD` × `git diff 02bd7dab 83a3c68c` nos mesmos caminhos = **3633 linhas cada, `cmp` idêntico** — o que entrou
  a mais é exatamente o #387.
- **KPI REEXECUTADO** (§C3.3) no head rebaseado, com Postgres e Redis descartáveis próprios — ver a entrada do
  `Kpis/kpis-history.*`. `blocks_completed` recontado a partir do valor da `main`.
- **Dívidas do #387 pagas aqui** (parecer do porteiro pós-merge, `LIBERADO COM RESSALVA`): A4 (backfill §C3.5 do #387),
  A1 (as duas identidades da cadeira C4 do ciclo 2 da web versionadas nos dois espelhos e sepultadas no `OBITUARIO-IDENTIDADES.md`
  §3.7; a aposentadoria fica como dívida do PR seguinte), A7 (registro P6 do ciclo 2 do `B-SAN3-01`) e A2 (donos sem o arquivo no §5).
