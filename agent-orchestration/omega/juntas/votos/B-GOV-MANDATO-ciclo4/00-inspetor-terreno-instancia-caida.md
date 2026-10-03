inspetor-de-terreno-da-junta | Fable (claude-fable-5-1, por contrato, sem fallback) | mandato_md5 69beed567692ea3c583a1c5ec3225ffd | corpo_md5 de80b2a9d4fc7edd7b9a26e2d601f97d

# Parecer do inspetor de terreno — junta 4 do B-GOV-MANDATO (PR 393)

Instância NOVA (a da junta 3 é inelegível). Parecer incremental (P1/P2): cada item é gravado assim que medido;
`EM APURAÇÃO` = ainda não medido. Hora UTC em cada seção. Eu não escrevo no repositório e não commito.

## 0. Identidade e insumos — 2026-10-03T05:32Z

- Corpo carregado: `scratchpad/corpos/inspetor-de-terreno-da-junta.md`.
  `MSYS_NO_PATHCONV=1 git show 'origin/main:.claude/agents/inspetor-de-terreno-da-junta.md' | tr -d '\r' | md5sum`
  → `de80b2a9d4fc7edd7b9a26e2d601f97d`; `tr -d '\r' < <corpo carregado> | md5sum` → `de80b2a9d4fc7edd7b9a26e2d601f97d`.
  **IGUAL** (EOL-neutro). origin/main = `b404815c` após `git fetch` (ec=0).
- Mandato: `C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/inspetor.md`.
  md5 EOL-neutro do arquivo em disco = `69beed567692ea3c583a1c5ec3225ffd`; md5 EOL-neutro do blob
  `47d113fb:<mesmo caminho>` = `69beed567692ea3c583a1c5ec3225ffd`. **IGUAL.**
  Nota de terreno: o worktree `w-mandato` está em `chore/mandato-refs-e-preflight` @ `d042a78d` (o ramo andou
  além de `47d113fb`); o blob do mandato em `47d113fb` é idêntico ao arquivo em disco, então a cerca não mudou.
- Armadilha medida logo na 1ª medição: sem `MSYS_NO_PATHCONV=1` o Git Bash converteu `origin/main:.claude/...`
  em `origin\main;.claude\...` e o `git show` falhou (md5 de vazio `d41d8cd9…`). Toda `git show <ref>:<path>`
  deste parecer roda com a variável **por comando**, nunca exportada.

## 1. Isolamento — 2026-10-03T05:34Z
### 1.1 Head a julgar — VERDE (medido 05:34Z)
- Resolvido por git/gh, nunca digitado:
  `gh pr view 393 --json headRefOid,headRefName,state,isDraft,mergeable` →
  `headRefOid=d042a78d1c614294de701c1b06387d2afb62aaf8 · chore/mandato-refs-e-preflight · OPEN · isDraft=true · MERGEABLE`;
  `git ls-remote origin refs/heads/chore/mandato-refs-e-preflight` → `d042a78d1c61…`;
  `git rev-parse origin/chore/mandato-refs-e-preflight` → `d042a78d1c61…`; `git -C w-mandato rev-parse HEAD` → o mesmo.
  **Quatro fontes concordam: OBJETO = `d042a78d1c614294de701c1b06387d2afb62aaf8`.**
- Fato de terreno a consignar: o mandato do inspetor (47d113fb) colou `head do PR: d031518d…` às 04:44Z; o head
  **andou** desde então (d031518d → … → 47d113fb → d042a78d). O commit do head é
  `docs(auditoria): §9 do parecer da auditoria da maquina — atestacao CONSERTO VERIFICADO`. O mandato mediu `§9 = 0`
  no instante dele; essa contagem é **a re-verificar no objeto** (feita no item 2.2), não herdada.
- Worktree próprio: `git worktree add --detach C:/Users/AMP/w-insp4 d042a78d…` → ec=0;
  `git -C C:/Users/AMP/w-insp4 rev-parse HEAD` → `d042a78d1c614294de701c1b06387d2afb62aaf8`;
  `git -C C:/Users/AMP/w-insp4 status --porcelain | wc -l` → **0** (árvore limpa);
  `ls -d w-insp4/node_modules` → ausente (sem junction; `npm ci` próprio lançado em 05:34Z, log em `scratchpad/insp4-npm-ci.log`).
- Worktree do dev (`C:/Users/AMP/w-mandato`, ramo `chore/mandato-refs-e-preflight`): HEAD = `d042a78d` = objeto.
  Mutação viva nele é medida em 1.3 (status --porcelain).
- Veredito parcial 1.1: **VERDE** — head existe, é o do PR por 4 fontes, árvore do worktree de inspeção limpa.
### 1.2 Plano de isolamento no briefing — EM APURAÇÃO
### 1.3 Resíduo de jurado anterior — EM APURAÇÃO

## 2. Insumos do briefing — EM APURAÇÃO
### 2.1 Ata anterior "A RE-VERIFICAR" — EM APURAÇÃO
### 2.2 Auditoria da máquina (ciclo ≥ 4) + conserto — EM APURAÇÃO
### 2.3 Plano do ciclo (head, §5, bateria com forma) — EM APURAÇÃO

## 3. Papéis — EM APURAÇÃO
### 3.1 / 3.1-bis Inelegibilidade por nome (OBITUÁRIO primeiro, grep depois) — EM APURAÇÃO
### 3.2 Composição × competência — EM APURAÇÃO
### 3.3 Corpo carregado × corpo julgado (EOL-neutro) + norma citada existe — EM APURAÇÃO

## 4. Fatias de orquestração — 2026-10-03T05:41Z
Ambiente de quem mede (publicado antes de medir, como manda o briefing): `env | grep -c '^MSYS_NO_PATHCONV='` = **0** ·
`git version 2.53.0.windows.2` · `node v20.19.5` · `MINGW64_NT-10.0-22631 3.6.6-1cdd4371.x86_64 x86_64`. `npm ci` próprio em
`w-insp4`: ec=0, 326 pacotes em 17 s; `node_modules` é diretório real (`fsutil reparsepoint query` → "não é um ponto de nova análise" = 0 junction).

### 4.1 Fatia S0 — VERDE (medido 05:40Z)
- `cd C:/Users/AMP/w-insp4 && timeout 300 node scripts/sync-agent-agents.mjs --check` → ec=**0**, `[agents-sync] OK — 42 agentes, espelho consistente.`
  (log `scratchpad/insp4/s0.log`). Conferência recursiva de `especialistas/` nos dois espelhos: ver item 3.3 (md5 por corpo).

### 4.2 Baseline honesto no head — VERDE no `check`; guards EM APURAÇÃO (lançados 05:39Z)
- `DATABASE_URL='postgresql://insp:insp@127.0.0.1:1/insp_ficticio' timeout 600 npx prisma generate` (URL fictícia **só no ambiente do
  comando**; porta 1, nunca 5432) → ec=**0**.
- `timeout 1500 npm run check` (= `tsc -p tsconfig.json --noEmit`) → ec=**0**, 05:39:51Z→05:40:49Z, saída sem erro (log `scratchpad/insp4/npm-check.log`). ec lido por variável, não por cano.
- Guards de mandato (TAP em arquivo, `TMPDIR` próprio, `timeout -k 30 1200/2700`): `tests/mandato-refs.test.ts` e `tests/mandato-preflight.test.ts` em
  `scratchpad/insp4/guards/{refs,preflight}.tap` — resultado apensado abaixo quando concluir (esperado pelo registro, a re-verificar: refs 44/0 fail; pré-voo 356/0 fail).

### 4.3 Check-runs CONCLUÍDOS no head — VERDE (medido 05:37Z)
- `gh api repos/thiagodorgo/ERP_Techsolutios/commits/d042a78d1c614294de701c1b06387d2afb62aaf8/check-runs --jq '.total_count, …'` →
  **total=14**, todos `completed | success` (docker ×2, owner-portal ×2, authority-portal ×2, backend ×2, backend-postgres ×2, flutter ×2,
  frontend ×2; `completed_at` entre 05:21Z e 05:31Z de 2026-10-03). Zero `queued`/`in_progress`/`cancelled`. O vermelho intermitente de
  `backend-postgres` que o briefing nomeia (pré-existente, T4c-4) **não** reproduziu neste head.

### 4.4 Condição 6 da §8.6 (D-M4 registrado) — VERDE (medido 05:37Z)
- `grep -n 'Limpeza §C5 do ciclo 3' agent-orchestration/codex/log-execucao.md` @head → **1 ocorrência, l.5059** ("**Limpeza §C5 do ciclo 3
  (registrada em 30/09 pelo orquestrador, condição 6 da §8.6 …)**"). Nota: o plano §15.7/§15.9 cita "log l.4982"; no head é a l.5059 (o
  arquivo cresceu com as integrações da `main`) — o conteúdo é o mesmo, o número de linha do plano está defasado. Informação, não divergência.

### 4.5 Blobs das triplas publicadas × objeto — VERDE com nota (medido 05:37Z)
- `git rev-parse HEAD:<f> | cut -c1-8` no head: refs.sh **e1ed8f0d** · preflight.sh **093499a8** · mutantes.sh **373e5728** · refs.test **a8bd601b** ·
  equivalentes **123e6afd** — iguais ao cabeçalho da matriz (`…-ciclo4-mutantes.md` l.30-35). preflight.test no head = **47cfaeba** (T4c-5),
  ≠ `2275bea0` (K4, matriz completa) e ≠ `9483be74` (T4c-4, delta): é o guard com o caso `[V263]`, declarado pela errata §15.17 e pela
  reconferência como "só adições" — **re-medido por mim no item 6** (numstat). O blob da matriz no head é `c34e052a` (a conferência cita
  `557dbfd7` @a0845328: a matriz recebeu depois o K4b-3 §4.3 e o K4b-4, como o briefing declara).

## 5. Quórum — EM APURAÇÃO
### 5.1 Plano de perda de jurado — EM APURAÇÃO

## Veredito — EM APURAÇÃO

## Limpeza — EM APURAÇÃO
