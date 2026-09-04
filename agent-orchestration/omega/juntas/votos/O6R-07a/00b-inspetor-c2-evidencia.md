# Evidencia do inspetor de terreno — B-O6R-07a CICLO 2 (2a instancia)

- **Papel:** inspetor-de-terreno-da-junta (Fable, D-INSPETOR-TERRENO-JUNTA)
- **Data:** 2026-09-04
- **Head sob inspecao:** 9989c62 (confirmado por git rev-parse no worktree b07)
- **Instancia:** 2a (a 1a caiu na mensagem 1 — queda #4 do bloco; nada herdado)
- **Peso:** ciclo 2 = ULTIMA tentativa (D-TETO-DOIS-CICLOS)

## Fato novo de terreno (registrado, nao julgado)

Sessao vizinha erp-techsolutios-dd (orquestradora da junta do ciclo 5, outro bloco) fez
reposicao verbatim dos corpos de jurado do c5 em .claude/agents/especialistas/ da ARVORE
PRINCIPAL (2 ' M' + 6 '??'), declarada e aceita pelo inspetor dela — mutacao viva COM DONO,
fica INTOCADA. Os 3 ' M' antigos (planejador-mestre, porteiro-pos-merge, sync-agent-agents.mjs)
sao stat-cache byte-identico (classe distinta). Containers/portas do c5 (claude-o6r-c5-*,
efemeras 32770+) estao ATIVOS e nao sao residuo.

## Arquivos criados por este inspetor (declarados; nao contam como sujeira)

- agent-orchestration/omega/juntas/votos/O6R-07a/00b-inspetor-c2-evidencia.md (este)
- agent-orchestration/omega/juntas/votos/O6R-07a/00b-inspetor-c2-parecer.md (ao final)

---

## T1 — Arvore, vizinhos e residuos

**STATUS: EM APURACAO**

## T2 — Insumos e inelegibilidade da junta do ciclo 2

**STATUS: EM APURACAO**

## T3 — Baseline honesto e plano de perda

**STATUS: EM APURACAO**

### T1 — apurado (2026-09-04)

**1. Arvore do b07 / head / origin**
- `git rev-parse --short HEAD` -> `9989c62` (branch `fix/o6r07a-authorization`) — e o head nomeado do ciclo 2. OK.
- `git fetch origin fix/o6r07a-authorization` ec=0; `git rev-parse origin/fix/o6r07a-authorization` == `9989c62a3b81...` == HEAD. **local == origin. OK.**
- `git status --porcelain`: **1 ` M`** (`votos/O6R-07a/00-quedas.md`) + 1 `??` (esta evidencia, minha, declarada).
  - O ` M` e **append puro** (`git diff`: @@ -191,3 +191,17 — zero remocao): a linha da **queda #4**
    (minha antecessora, rate_limit 429 na mensagem 1) + o registro da proveniencia dos corpos c5.
    **Dono declarado** (orquestrador do bloco, entre a queda e o meu redisparo). Nao e mutacao sem dono;
    vira **ressalva** (nao esta como blob no head — o head antecede a queda; impossivel estar).

**2. `git worktree list`**
- `dev-c2b-red`: **AUSENTE** (removido). OK.
- Nenhum outro worktree do b07. Presentes: arvore principal (`demo/investidor`), `agent-af6ea607...`
  (`feat/o6r-b02-financial-uow` — bloco do c5), `gov-descuido` (outro bloco), `jur-c5-banco-fk`
  (jurado do c5, detached). **Nenhum residuo do b07. OK.**

**3. `docker ps -a`**
- `dev-c2-pg`: **AUSENTE**. `dev-c2c-redis`: **AUSENTE**. (Derrubados — o residuo da queda #2 foi varrido.)
- Restam: `erp-postgres` (5432, Up 6 days) e `erp-redis` (6379, Up 6 days) = **base viva, intocada**;
  `jur-c5-bfk-pg` (15501) e `jur-c5-bfk-redis` (15502) = **jurado do c5** (casa com o worktree
  `jur-c5-banco-fk`), ativos ha ~1 min — **nao sao residuo, nao tocar**. **OK.**

**4. Alcance do diff (origin/main...HEAD, 55 arquivos)**
- `git diff --name-only origin/main...HEAD`: **zero** ocorrencia de `financial` (nem `src/modules/financial-*`
  nem `tests/*financial*`). Escopo: auth, work-orders, core-saas/permissions, 1 migration de grant,
  testes `o6r07a-*` + docs/KPIs/atas. **Nao alcanca os 8 testes do c5 nem financial-*. OK.**

**5. Junction/symlink de node_modules**
- `cmd /c dir` no root das 5 arvores: todos os `node_modules` presentes sao `<DIR>` real
  (main, b07, agent-af6ea607, jur-c5-banco-fk; gov-descuido nem tem). **Zero JUNCTION/SYMLINKD. OK.**
- (frontend/node_modules conferido em main e b07 — resultado no fechamento do T1.)

**Veredito parcial T1: LIMPO, com 1 ressalva** — a queda #4 vive so na arvore (append com dono),
nao como blob no head `9989c62`.

### T2 — apurado (2026-09-04)

**Adendo T1.5:** frontend/node_modules de main e b07 tambem sao `<DIR>` real. Zero junction/symlink confirmado.

**1. Insumos como blob no head `9989c62`** (`git cat-file -e` em cada um):
- plano `B-O6R-07-plano.md` com apenso `## CICLO 2` (l.703–1050, C2·0–C2·8 presentes, "— fim do CICLO 2 —") — **OK-blob**
- ata `J-O6R-07a-ciclo1.md` (REPROVADO 2x1: C1 veto, C2 veto, C3 aprovou) — **OK-blob**
- 3 votos do ciclo 1 (01/02/03 `-voto.json` + `-evidencia.md`, 6 arquivos) — **OK-blob**
- `dev-ciclo2.md` (sucessao A/B/C declarada; diario [C] fechado) — **OK-blob**
- `00-quedas.md` — **OK-blob com 3 quedas**; a **queda #4 vive so na arvore** (append do orquestrador,
  +14/-0, dono declarado) — **RESSALVA R1** (impossivel estar no head: a queda e posterior a ele).

**2. Inelegibilidade POR NOME (dupla):**
- Participantes do bloco, extraidos dos proprios registros (grep `dev-o6r07a-*` em todos os diarios + ata):
  ciclo 1 = `auth-residuais · auth-provas · autorizacao · provisionamento · kpi-registros · arranjo-sticky`
  (**6 devs** — `auth-provas` e o sucessor na sucessao do `dev-a1-a3-auth.md`); ciclo 2 = `ciclo2 ·
  ciclo2-b · ciclo2-c` (**3 devs**); planejador = `planejador-mestre` (Fable, corpo + apenso C2).
- Jurados do ciclo 1 (ata): `jurado-b07a-autorizacao-e-alcada` (VETO) · `jurado-b07a-auth-e-kdf` (VETO) ·
  `jurado-b07a-migracao-escopo-registro` (aprovou).
- Nomes novos `jurado-b07a-c2-autorizacao` e `jurado-b07a-c2-auth-multiorg`:
  `grep -rn` no worktree inteiro (md+json, sem node_modules) = **ZERO ocorrencia** — nao aparecem em ata
  nenhuma, nem no obituario, nem colidem com dev/planejador. **Identidades NOVAS confirmadas. OK.**
- C3 mantida (`jurado-b07a-migracao-escopo-registro`): permitido pelo C2·8 (aprovou sem veto; quem
  conserta e o dev novo); nome nao colide com nenhum dev/planejador. **OK.**

**3. Leitura cruzada C2·6 (aceites) × diario [C]** (leitura; a RE-EXECUCAO e das cadeiras):
- item 1 (M1–M5+-db+mono-org) -> D1.a–D1.h: vermelhos M1/M2/M3 em `9d44989`≡`cec0e07`, M4 em `f895dd2`
  (worktree descartavel), verde N=3 denominador identico, -db 7/7 x3 em cluster :15432. **Declarado.**
- item 2 (SEC-002 `parcialmente_superado`, 9 componentes) -> D2.a–D2.d ([C] re-verificou e gravou). **Declarado.**
- item 3 (dual-match +3) -> D3.a vermelho-controle + D3.b verde (wo-object-scope 5->8). **Declarado.**
- item 4 (reparo A3 + §4/E-b) -> D3.d append em pendencias + errata no apenso. **Declarado.**
- item 5 (migracao cabecalho `--`) -> D3.c (24/0 so `--`, idempotencia re-provada). **Declarado.**
- item 6 (KPI/registros) -> D3.e + guards (16/16 · 6/6 · freeze --check 0). **Declarado.**
- Fechamento declara: suite plena rodada 4 `ec=0` **256 arq · 2656 testes · 2654 pass · 0 fail · 2 skip**
  (rodadas 1–3 vermelhas com causa nomeada: FROZEN da queda #3; contenda com o critico do c5), portas
  15432/15433 medidas antes, base viva nao lida, 32769/32770 do c5 intocadas.

**Veredito parcial T2: LIMPO** (a ressalva da queda #4 ja esta em R1/T1).

### T3 — apurado (2026-09-04)

**1. CI no head (`gh pr checks 369`, re-conferido por mim):** **7/7 pass** ec=0
(authority-portal · backend 5m36s · backend-postgres 2m11s · docker · flutter · frontend · owner-portal),
run 33751841078; `headRefOid` do PR = `9989c62a3b81...` = head local = origin. PR OPEN. **OK.**

**2. Baseline MEU, em cluster descartável próprio:**
- Portas medidas ANTES (`docker ps` + `netsh excludedportrange`): em uso 5432/6379 (base viva) ·
  15501/15502 · 32779–32782 (jurados do c5, INTOCÁVEIS — nota: o c5 usa portas ALÉM das 32769/32770 que o
  C2·6 fotografou); faixas netsh 2869·5357·49698–49997·50000–50059·50160–50559·53295–53494·54183–54382·
  54517–54616·54893–55092·60413–61012. Escolhi **15731/15732** (fora de tudo; nunca 55432).
- Cluster: `insp-c2-pg` (postgres:16, :15731) + `insp-c2-red` (redis:7, :15732); `pg_isready` accepting ·
  `redis-cli ping` PONG · `prisma migrate deploy` **ec=0**.
- `npm run check` -> **ec=0**.
- Suíte plena canônica (`DATABASE_URL=...:15731 REDIS_URL=...:15732 npm test`) -> **ec=1**:
  **`256 arquivo(s) · 2656 teste(s) · pass 2648 · fail 6 · skipped 2`** — **DIVIRJO do placar do diário
  (2654/0/2); denominador IDÊNTICO (256/2656/skip 2).** Os 6 `not ok`, nomeados, com o erro literal:
  560 core-saas-prisma (rollback cross-tenant) · 1207/1209 impound-trigger-durability (Ω-VID) ·
  1686 patios-dashboard · 2296 freeze-links-db · 2323 sticky-db — **6/6 timeout de transação Prisma**
  ("Unable to start a transaction in the given time" ×5; "expired transaction... 5000 ms, 5369 ms" ×1).
- **Discriminadores executados (não presumo):**
  (a) **nenhum** dos 5 arquivos-vítima está no diff do bloco (as vítimas são `core-saas-prisma` e
  `...-sticky-db`; o diff tem `core-saas` e `...-sticky`, arquivos DISTINTOS);
  (b) `docker ps` durante a rodada: **jurados do c5 rodando bateria em paralelo** (pares `jur-c5-arnes-*`,
  `jur-c5-c3-*`, `jur-c5-bfk-*` ativos/alternando) — é a MESMA assinatura das rodadas 2/3 do diário
  (fail 6/fail 5, timeouts, vítimas diferentes a cada rodada, interseção vazia);
  (c) os 5 arquivos-vítima re-executados FOCADOS no MESMO cluster, máquina ainda sob carga do c5:
  **5/5 ec=0, 51/51 pass** (6+28+3+6+8).
  Somado ao CI verde 7/7 neste head exato (backend + backend-postgres = suíte em máquina limpa) e à
  rodada 4 do diário: a divergência é **contenda de ambiente**, classe já documentada, não regressão.
- `git diff --check` -> **ec=0**.

**3. Plano de perda por cadeira:** **DECLARADO** — corpo §8 (vinculante no ciclo 2 pela cláusula C2·0):
mandato ≤3 itens (P4) · evidência incremental (P1) · voto-esqueleto antes da final (P2) · **suplente
re-executa comandos registrados (P3)** · disparo ≤2 (P5) · quedas em `00-quedas.md` (P6); quórum
**UNANIMIDADE DE 3** (C2·8). **OK.**

**Veredito parcial T3: LIMPO com ressalva** — a suíte plena local diverge sob contenda medida do c5;
CI verde no head + focadas verdes + causa nomeada por execução.

---

## Limpeza do inspetor

Criei e derrubei: `insp-c2-pg` e `insp-c2-red` (`docker rm -f` -> 0 restantes; conferido por
`docker ps -a`). Logs temporários no scratchpad da sessão (fora do repo). No repo criei SÓ os dois
arquivos declarados (esta evidência + o parecer). Nada mais foi tocado; base viva não lida.
