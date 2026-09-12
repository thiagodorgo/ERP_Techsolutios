# INSPETOR DE TERRENO — PR #386 (SAN3 plano) — parecer incremental (P2)

**Modelo:** inspetor-de-terreno-da-junta · Fable 5.1 (claude-fable-5-1) · modelo contratual (D-INSPETOR-TERRENO-JUNTA); sem fallback.

## 1. Árvore sem mutação viva
- `git -C san3 rev-parse HEAD` = fce82fef730c70d60c1e38a8dfa23c5355f639b1 (bate com o declarado)
- `git -C san3 status --porcelain` = VAZIO (ec=0)
- `origin/docs/san3-plano-saneamento` = fce82fef (idêntico ao head local) ; `origin/main` = 15ef3fbe (base declarada) — VERDE
- `git worktree list`: principal demo/investidor@d1fab3bc; gov-descuido@497d360d; gov-elenco@15ef3fbe [main]; san3@fce82fef
- `git diff --stat a143d2c3 fce82fef -- . ':!agent-orchestration/omega/juntas'` = VAZIO; o fce82fef só soma BRIEFING-SAN3-plano.md (+111) — VERDE
- `git diff --stat 15ef3fbe a143d2c3 -- src tests prisma frontend mobile .github scripts` = VAZIO (também em fce82fef) — VERDE
- 49 arquivos no PR: 24 corpos removidos em .claude/agents/especialistas + .agents/agents/especialistas (jurado-06-*, jurado-06d-*); Kpis/*; docs/revisoes/SAN3/**; controle/*; omega/juntas/*; docs/omega-pd.md; O6R registro/jsonl

## 3. Papéis
- 3.1-bis OBITUÁRIO (ref): 29 SEPULTADAS (17 originais + 6 jurado-06-* + 6 jurado-06d-*), 0 RESERVADAS. Nenhuma das 6 identidades propostas consta (são papéis permanentes, §4) — ausência NÃO absolve → grep obrigatório.
- 3.1 grep -w dos 6 nomes em J-B-O6R-06.md, J-B-O6R-06-delta.md, BRIEFING-B-O6R-06*.md, votos/B-O6R-06/, votos/B-O6R-06-delta/, votos/SAN3-plano/, reprovacoes/, docs/revisoes/SAN3/:
  - estrategista: só no BRIEFING-SAN3-plano (composição). 0 no caso.
  - agente-dba-guardiao: briefing SAN3 + reprovacoes Ω5P (outros casos) + PLANO_SAN3 l.215/239 (nomeado como cadeira FUTURA de blocos B-SAN3-05 etc. — não atuou) + inventario-B2 (cita voto antigo #353). 0 nas atas/votos do B-O6R-06/delta/SAN3.
  - coordenador-de-acessos: briefing SAN3 + reprovacoes Ω3F/Ω4C/Ω5P (outros casos). 0 no caso.
  - guardiao-fail-closed: briefing SAN3 + R-B-GOV-ELENCO-ciclo1 (C2) + R-B-O6R-01-ciclo1 + inventario-A2 (citado como exemplo de papel com Bash). 0 no caso.
  - validador-mestre: briefing SAN3 + votos/B-O6R-06/00-inspetor-terreno.md:135 (é a LISTA DE INELEGÍVEIS que os corpos jurado-06-* nomeavam — não atuou) + R-B-GOV-ELENCO-ciclo1 (C1) + reprovacoes antigas. 0 como votante/achador/planejador/dev no caso.
  - agente-ci-doutor: briefing SAN3 + R-B-GOV-ELENCO-ciclo1 (C3) + inventario-A2. 0 no caso.
  → 0 colisões no caso SAN3 e no B-O6R-06 (mérito e delta). VERDE.
- 3.3 corpo carregado × julgado (EOL-neutro, tr -d '\r' | md5sum): os 6 corpos ref = disco sessão (demo/investidor) = disco san3 (5775da08 / de789c12 / a4141c31 / 5b0f7f5d / 804d89f0 / 55979e2c). `model:` ausente nos 6 (rodam no modelo da sessão); `tools: Read, Grep, Glob, Bash` nos 6. PR não altera os 6 (diff 15ef3fbe..fce82fef vazio).
  - DIVERGEM sessão × ref: inspetor-de-terreno-da-junta (36 linhas só na ref: bloco D-FALLBACK, 3.1-bis, 3.3), planejador-mestre (7: bloco D-FALLBACK), porteiro-pos-merge (7: idem). Os dois últimos são inelegíveis (não votam). O inspetor (eu) foi carregado com o corpo da sessão e APLICOU o da ref (lido por git show). → ressalva nomeada.
  - Sessão tem 33 corpos extras em .claude/agents/especialistas/ ausentes da ref (identidades sepultadas do obituário, inclusive as 12 jurado-06*/06d* que o PR remove). Nenhuma é votante. Resíduo inerte → nota.
- Norma citada existe na ref (CLAUDE.md fce82fef): §A7 l.103 (D-MEDIR-NA-REF-ALVO), D-FALLBACK l.463, D-JUNTA-RESILIENTE P1–P6 l.518-545, §C7.1-ter, §C7.4-bis, D-TETO-DOIS-CICLOS, D-INSPETOR-TERRENO-JUNTA. D-APOSENTADORIA-ELENCO-EFEMERO e P-GOV-CAMINHO-REPO-SESSAO não estão no CLAUDE.md (procurados em decisoes/pendencias — ver abaixo).

## 1.2 / 1.3 Isolamento e resíduos
- Briefing §0 declara por escrito: worktree próprio detached em a143d2c3 por cadeira; npm ci próprio; junction/symlink proibidos; remoção só por `git worktree remove --force`; gerador do índice em CÓPIA FORA DO REPO; base viva erp-postgres/erp-redis não é alvo; nada de stash/checkout/reset/clean em worktree alheio; P2 (voto incremental) e P5 (≤2 em paralelo). Nenhuma cadeira precisa de banco (PR sem código). → VERDE.
- `docker ps -a`: daemon PARADO ("failed to connect to the docker API at npipe://…dockerDesktopLinuxEngine"). Não mensurável por execução; com daemon parado nenhum container executa (resíduo, se existir, é inerte por construção). → não-medido, registrado como ressalva.
- `find` por jur-probe*/*-probe.ts/*-probe.mjs/crit-probe* em main tree + 3 worktrees (sem node_modules): 0 arquivos. VERDE.
- `git worktree list`: 4 entradas (principal, gov-descuido, gov-elenco@main, san3) — nenhuma de jurado órfão; gov-elenco e gov-descuido com porcelain VAZIO. VERDE.
- Árvore da SESSÃO (demo/investidor, read-only): 6 ` M` + 41 `??`. Dos 6: planejador-mestre.md e scripts/sync-agent-agents.mjs são fantasmas (EOL-neutro IGUAL ao HEAD); os 4 restantes são edições VIVAS reais (+364/-8) em critico-c5-adversarial.md e jurado-c5-arnes-catalogo-postgres.md, nos dois espelhos — identidades SEPULTADAS (obituário §3.3 emenda), nenhuma é cadeira desta junta. Resíduo inerte para esta junta → nota.

## 2. Insumos (presentes na ref fce82fef)
- votos/SAN3-plano/00-critico-adversarial-r1.md (19.273 B, ref julgada 31e04f6c) e -r2.md (9.386 B, ref 544ab67f) — presentes; briefing §4 os nomeia como insumo.
- PLANO_SAN3.md: §5 (l.210), §6 (l.300), §9 (l.416), §12 (l.483, resposta r1), §13 (l.505, resposta r2) — presentes; cabeçalho nomeia base 15ef3fbe e quórum unanimidade de 3.
- decisoes.md: REGISTRO-SAN3-CONFLITOS l.2314; D-TRACCAR-HTTP-PRIVADO-AWS l.2208; D-APOSENTADORIA-ELENCO-EFEMERO l.1916; D-MEDIR-NA-REF-ALVO l.2168; D-FALLBACK l.2049. P-GOV-CAMINHO-REPO-SESSAO em pendencias.md l.8036 (FECHADA). Todas as citações existem.
- Inventário: 8 fatias em docs/revisoes/SAN3/inventario/ (A1, A2, AUSENTES, B1, B2, C1, C2, O6R).
- Ciclo: 1ª junta do PR (as 2 rodadas do crítico são ataque ao plano, não ciclos de reprovação) → item 2.2 (PD ≥5 fontes) não se aplica; PD-O6R-B07B-CLAMD-INSTREAM existe (54 URLs) e o briefing a declara fora da matéria.
- §3 do briefing lista 6 afirmações "a re-verificar" (gerador/1ª linha, ✓ do §4.1, prova do orquestrador, resíduos P-Ω3F6, 85–95 h, mvp_*). C3.1/C3.2 mandam re-executar guards e gerador. → VERDE. NOTA: o r2 do crítico traz "Medições de base … registradas para nao serem remedidas" (l.6) — o briefing sobrepõe isso corretamente (mandato C3 re-mede); os jurados não devem ler a frase do crítico como licença.

## 5. Quórum e perda
- Unanimidade de 3, motivo escrito (briefing §0 + PLANO cabeçalho: fecha por presença pendências de segurança/permissão/dinheiro; §C7.1-ter(b); CR2-07). VERDE.
- Perda de jurado (briefing §5): suplente nomeado por cadeira, re-executa o mandato inteiro; voto perdido nunca vale aprovação; <3 votos de mérito não fecha; queda por limite vira nota. Compatível com P3. NOTA: P6 (CLAUDE.md ref l.545) exige `votos/<JUNTA>/00-quedas.md` com colunas fixas — o briefing não o nomeia.

## 4. S0 e baseline (medido AGORA, em worktree detached PRÓPRIO em fce82fef: C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/wt-insp-san3 — criado com `-c core.longpaths=true` após falha "Filename too long" no caminho do scratchpad; porcelain 0)
- 4.1 `node scripts/sync-agent-agents.mjs --check` → ec=0 "[agents-sync] OK — 23 agentes, espelho consistente." Recursivo: .claude/agents 23 .md; .agents/agents 24 (23 + README.md); `especialistas/` = 0 arquivos nos dois lados da ref (as 24 remoções do PR são simétricas 12+12). VERDE.
- `node scripts/kpi-freeze.mjs --check` → ec=0 "em dia (snapshot 2026-09-11)". VERDE.
- `node --check Kpis/app.js` → ec=0. VERDE.
- Guards de KPI (`node --test --import <tsx 4.22.3 standalone em scratchpad/tsx-rt, versão do lockfile da ref> tests/kpi-achados-paridade.test.ts tests/kpi-dashboard-charts.test.ts tests/kpi-dashboard-contraste.test.ts`) → ec=0; # tests 28 · pass 28 · fail 0. VERDE (bate com os "28 casos").
- CI (`gh pr checks 386`, re-medida): 7/7 pass em fce82fef — authority-portal, backend (6m22s; roda npm ci → sync --check → db:generate → migrate deploy → npm run check → npm test → npm run build), backend-postgres, docker, flutter, frontend, owner-portal. Run 34710928201 conclusion=success; run anterior em a143d2c3 também success. VERDE.
- PR #386: OPEN, isDraft=true, mergeable=MERGEABLE, mergeStateStatus=BLOCKED (draft) — informação, não bloqueio de terreno.
- 4.2 `npm run check` no meu worktree (fce82fef): 1ª passada ec=2 com 251 erros — TODOS `TS2305 @prisma/client has no exported member` (172) + `TS7006` derivados (74): client Prisma não gerado porque `prisma.config.ts` da ref lê `env("DATABASE_URL")` na carga e meu worktree não tem `.env`. Refeito com `DATABASE_URL` fictício (sem conexão): `npm run db:generate` ec=0 ("Generated Prisma Client v7.8.0"), `npm run check` ec=0, 0 `error TS`. VERDE.
- Gerador do índice: `agent-orchestration/controle/gerar-indice-pendencias.py` (Python 3.13.14) rodado em CÓPIA FORA DO REPO (scratchpad/gen-copy, insumos extraídos por `git show fce82fef:`; cwd = raiz da cópia, o script usa caminho relativo à raiz) → ec=0; "363 cabecalhos / 352 IDs | FECHADA 105, ABERTA 258 | diferidas-materiais 14"; `cmp` com o índice commitado = BYTE-IDÊNTICO (raw) e EOL-neutro igual (md5 eaf6a1b85715, 57.604 B). VERDE.

## 3.2 Composição × competência
- 23 papéis permanentes na ref; C1 estrategista/agente-dba-guardiao (ordem/dado), C2 coordenador-de-acessos/guardiao-fail-closed (RBAC/segurança/fail-closed), C3 validador-mestre/agente-ci-doutor (diff/KPI/registro). NÃO há cadeira com competência de INVARIANTE FINANCEIRO, e o quórum é motivado por fechamentos de DINHEIRO por presença (P-Ω4-7-*, P-Ω4-4-REVERSE-IDEM, P-018). Na ref não existe papel permanente de invariante financeiro (agente-finops é custo de nuvem; critico-adversarial é inelegível). → ressalva nomeada (o dono decide se basta).

## Veredito
LIBERADO COM RESSALVA — ver lista R1–R7 no parecer final.

## Limpeza
worktree próprio wt-insp-san3 removido por `git worktree remove --force`; scratchpad/tsx-rt, gen-copy e logs removidos; nenhum container criado (daemon parado); san3 e árvore principal não tocados (status re-medido).
