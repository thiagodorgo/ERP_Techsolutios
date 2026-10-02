# Relatorio — papel: dev-b-san3-01b (desenvolvedor de identidade nova, §C7.4-bis) · identidade: dev-b-san3-01b (tarefa de NUVEM) · modelo: Fable 5.1 (`claude-fable-5-1` — modelo configurado e servido da sessao, lido por `get_session`: `session_context.model` = `last_served_model` = `claude-fable-5-1`) · mandato_md5: 1c8e3b9d650880a0f8ff5bd3fb1fb44b (EOL-neutro: `tr -d '\r' < agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/dev.md | md5sum` → `1c8e3b9d650880a0f8ff5bd3fb1fb44b` — IGUAL ao medido pelo orquestrador)

> Relatorio incremental (P1/P2): cada secao e gravada ao medir, com hora UTC, e commitada/empurrada a cada entrega.
> MEDIDO = comando + saida desta sessao. HIPOTESE = nao medido aqui, com o comando que derruba.
> Fonte do trabalho: `docs/revisoes/SAN3/B-SAN3-01b-plano.md` (2070 linhas). Nada aqui reinterpreta o plano; toda divergencia
> medida entre plano e terreno vira falsificacao escrita (secao §F), nunca desvio silencioso.

## §0 — Terreno (MEDIDO, 2026-10-02T05:32Z–05:37Z)

```
$ uname -a
Linux vm 6.18.44-fc-v51 #1 SMP PREEMPT_DYNAMIC @0 x86_64 x86_64 x86_64 GNU/Linux
$ node -v ; /opt/node20/bin/node -v ; npm -v
v22.22.0
v20.20.0          ← a CI roda node-version: 20 (ci.yml l.281-305, job frontend); a bateria roda nas DUAS
10.9.4
$ git rev-parse HEAD
4075462ad38576c741937b5441d5ddb045247b9a
$ git rev-parse origin/main
4ab9d232d2c6705ad39cf6bd4313ca5c91b222a9
$ git merge-base origin/main HEAD
4ab9d232d2c6705ad39cf6bd4313ca5c91b222a9     ← IGUAL a origin/main: o ramo contem a main inteira
$ git diff --name-only origin/main HEAD
agent-orchestration/codex/comandos/B-SAN3-01b-web-guarda-por-alcance-e-estado-da-pagina.md
agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/dev.md
agent-orchestration/omega/juntas/votos/B-SAN3-01b/DEV-relatorio.md
docs/revisoes/SAN3/B-SAN3-01b-plano.md
$ git config user.name ; git config user.email
thiagodorgo
42915563+thiagodorgo@users.noreply.github.com
$ npm ci --no-audit --no-fund ; npm --prefix frontend ci --no-audit --no-fund     (npm ci PROPRIO na raiz e no frontend)
root ec=0 · frontend ec=0 (added 103 packages)
$ node -p "react, react-dom, react-router-dom, typescript, tsx (frontend/node_modules)"
19.2.6 19.2.6 7.15.1 5.9.3 4.22.4
$ ls frontend/node_modules | grep -i -E 'jsdom|happy-dom|linkedom|testing-library'
(vazio) ec=1          ← nenhuma biblioteca de DOM: o DOM minimo do E1 e escrito no proprio teste (§4.1 do plano)
```

**Observacao de terreno (falsificacao parcial do §0.1 do plano, registrada, sem desvio):** o plano foi medido em
`origin/main@3b1fe0f9`; a `origin/main` de agora e `4ab9d232` (depois dos PRs #396 e #397, `B-GOV-PAUSA`). O ramo ja
integra essa main (`2e6df3d chore(merge)`). Consequencias medidas abaixo: a linha de base de testes **reproduz** (67 · 1202);
o KPI publicado na main e `blocks_completed 169` (nao 168) — o §9 manda contar "+1 a partir do valor publicado na
`origin/main` no momento do PR", logo **169 → 170** (secao §E6).

**Banco:** nao subi cluster — o bloco e so frontend (plano §0.2/§4). Docker: nao medido (nenhuma premissa depende dele).

### 0.1 Linha de base no head do ramo (4075462 — codigo identico ao da main 4ab9d232 nos arquivos da fronteira) — MEDIDO

```
$ (cd frontend && VITE_USE_MOCKS=false node --test --import tsx tests/work-orders-honest-errors.test.tsx)   # Node 22.22.0
# tests 67 # pass 67 # fail 0            ec=0   (05:34:29Z–05:34:31Z)
$ (cd frontend && VITE_USE_MOCKS=false PATH=/opt/node20/bin:$PATH node --test --import tsx tests/work-orders-honest-errors.test.tsx)   # Node 20.20.0
# tests 67 # pass 67 # fail 0            ec=0
$ npm --prefix frontend run test:smoke   # Node 22
# tests 1202 # pass 1202 # fail 0 # skipped 0    ec=0   (36 s; 142 arquivos na lista)
$ (cd frontend && PATH=/opt/node20/bin:$PATH npm run test:smoke)   # Node 20
# tests 1202 # pass 1202 # fail 0 # skipped 0    ec=0   (43 s)
$ npm --prefix frontend run check
> tsc -b --noEmit                        ec=0   (19 s; deixa frontend/tsconfig.tsbuildinfo — removido, §C5)
```

P-a, P-b do plano **reproduzem** (67/67 · 1202/1202 · tsc 0) na main de agora. Baseline N = 5 (§8 do plano) confirmado por
leitura do arquivo: `[G1]` l.1068, `[G2]` l.1109, `[G3]` l.1117, `[W1]` l.1147, `[W2]` l.1154.

**Licao de terreno desta sessao (registrada para quem vier depois):** chamadas de shell em PARALELO com `cd` diferentes
compartilham o diretorio corrente da sessao — um `npm run test:smoke` disparou na raiz (`Missing script`) e um `npm run check`
rodou o `tsc` do backend. Toda medicao cwd-sensivel abaixo roda SEQUENCIAL, com caminho absoluto ou `npm --prefix frontend`.
