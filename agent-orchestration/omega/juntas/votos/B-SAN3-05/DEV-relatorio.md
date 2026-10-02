# Papel: dev · Identidade: dev-b-san3-05 · Modelo: claude-opus-5-5 (Opus 5.5, o modelo desta sessao de nuvem) · mandato_md5: 62f6873ca8f43cafb2ab91fb579c9235

> Relatorio incremental do desenvolvedor do B-SAN3-05 (identidade nova: nao planejou v1/v2/v3, nao criticou r1/r2, nao vota).
> Cada secao e gravada ao medir, com hora UTC, separada em MEDIDO (comando + saida) e HIPOTESE (o comando que derruba).
> Fonte do trabalho: o plano v3 `docs/revisoes/SAN3/B-SAN3-05-plano.md`; o mandato e `00-mandatos/dev.md`.

## §0 — Terreno — 2026-10-02T03:28:48Z

### MEDIDO

`tr -d '\r' < agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/dev.md | md5sum`
```
62f6873ca8f43cafb2ab91fb579c9235  -
```
(igual ao publicado pelo orquestrador no prompt; 74 linhas)

`uname -a; node -v; npm -v; git rev-parse HEAD; git rev-parse origin/main; git merge-base origin/main HEAD`
```
Linux vm 6.18.44-fc-v51 #1 SMP PREEMPT_DYNAMIC @0 x86_64 x86_64 x86_64 GNU/Linux
v22.22.2
10.9.7
cb94b78b476dd01345b5982c4c3b1f8e43abfe9a
4ab9d232d2c6705ad39cf6bd4313ca5c91b222a9
4ab9d232d2c6705ad39cf6bd4313ca5c91b222a9
```
O ramo contem a `origin/main` inteira (merge-base = `origin/main` = `4ab9d232`), como o mandato mediu.

`git diff --name-only origin/main HEAD | paste -sd" "` (antes de qualquer trabalho do dev)
```
agent-orchestration/codex/comandos/B-SAN3-05-runtime-role-sem-bypass.md agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/planejador-v3.md agent-orchestration/omega/juntas/votos/B-SAN3-05/DEV-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-05/PLANEJADOR-v3-relatorio.md docs/revisoes/SAN3/B-SAN3-05-critica-r1.md docs/revisoes/SAN3/B-SAN3-05-critica-r2.md docs/revisoes/SAN3/B-SAN3-05-plano.md
```

`which psql pg_ctl initdb; ls /usr/lib/postgresql/`
```
/usr/bin/psql
16
```
`pg_ctl`/`initdb` nao estao no PATH; os binarios do servidor estao em `/usr/lib/postgresql/16/bin` (uso pelo caminho absoluto).

Verbatim dos apendices, extraido do plano no head e conferido contra o md5 que o plano publica:
```
sed -n '409,761p'  plano | md5sum  → 81d9259571391eded68255391a99fb61  (Apendice A, gerador, 353 linhas)   = publicado
sed -n '842,956p'  plano | md5sum  → 810c1c4a2552665d4947bf0ef4e93670  (Apendice C, script, 115 linhas)   = publicado
sed -n '1095,1120p' plano | md5sum → 36650de53be8504c76deef74ecc78811  (Apendice E, trava SQL)           = publicado
grep -o session_user <Apendice E> | wc -l → 8                                                             = publicado
```

### FALSIFICACAO DE TERRENO (plano × terreno, escrita — nunca desvio silencioso)

- **Node.** O plano manda a bateria em Node 20 (`node -v` colado; o CI usa `node-version: 20`). A imagem desta nuvem traz
  **v22.22.2** no PATH. Antes da bateria eu procuro um Node 20 na imagem (o planejador usou `/opt/node20`); se nao houver, a
  bateria roda em v22 e isso fica declarado aqui com o numero publicado como "medido em v22".

### HIPOTESE

- Os comandos do plano que dependem de Docker (H1, H4 — compose local-prod) nao rodam nesta nuvem (sem Docker); quem derruba
  e o job `docker` da CI no SHA da entrega.

## §1 — Ambiente (npm ci, prisma, cluster Postgres descartavel) — EM APURACAO
## §2 — E1 trava de boot + E2 gate G-DB-ROLE — EM APURACAO
## §3 — E3 laco por organizacao (rls.ts + repositorios de nuvem) — EM APURACAO
## §4 — E4 script do papel + .gitattributes + compose — EM APURACAO
## §5 — E5 documentacao — EM APURACAO
## §6 — E6 ratchet semantico (gerador + T13 + fixtures) — EM APURACAO
## §7 — E7 testes T1–T15 e criterios A1–A24 com mutacao — EM APURACAO
## §8 — Bateria do §8 — EM APURACAO
## §9 — E8 KPI e registro — EM APURACAO
## §10 — Fechamento — EM APURACAO
