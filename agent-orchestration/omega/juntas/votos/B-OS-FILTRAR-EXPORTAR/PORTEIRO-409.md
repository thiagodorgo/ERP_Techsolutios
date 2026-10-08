Papel: porteiro-pos-merge · Modelo que rodou: Claude Opus (claude-opus-5-5) · Por que o Fable faltou: substituição DECLARADA (§C7.6-bis) — decisão do dono de 2026-10-08: Fable só em bloco que toca dinheiro; este (B-OS-FILTRAR-EXPORTAR) não toca.

# Parecer do porteiro pós-merge — PR #409 (B-OS-FILTRAR-EXPORTAR)

- Squash na main: `fea93281ec9b5729b5379d4a423c42a06a439137`
- Corpo carregado: `origin/main:.claude/agents/porteiro-pos-merge.md` — md5 EOL-neutro `374b1b0d091a85cddf1733d3e51456ae` (confere com o esperado), 78 linhas.
- Regra vigente: CLAUDE.md §C7 item 8 (D-GOV-PROPORCIONAL) — regra (1): um revisor + CI verde; KPI CONGELADO (item 8(5)) → os itens 4 e 5 do corpo não se cobram.
- Terreno: worktree próprio detached `C:/Users/AMP/w-port409`, `npm ci` próprio, sem .env, sem banco.

## Itens (esqueleto inicial; cada item foi gravado ao ser medido — P1/P2)

1. Merge existe e íntegro — concluído (ver "Itens (estado final)")
2. Promessa × entregue (diff do squash) — concluído (ver "Itens (estado final)")
3. Números reais (testes do bloco re-executados) — concluído (ver "Itens (estado final)")
3b. Mutação de produto — concluído (ver "Itens (estado final)")
4. KPI — NÃO SE COBRA (congelado, §C7 item 8(5)); só se confere que Kpis/* não foi tocado — concluído (ver "Itens (estado final)")
5. Registro (regra (1): revisor + CI, sem ata) — concluído (ver "Itens (estado final)")
6. Pendências (as 4 do §9.3 do plano + índice gerado) — concluído (ver "Itens (estado final)")
7. Limpeza §C5 — concluído (ver "Itens (estado final)")
8. O próximo pode começar? (#405, depois Traccar) — concluído (ver "Itens (estado final)")

## Evidência (incremental)

### Item 1 — merge existe e íntegro (21:38Z)
- `git log origin/main -3` → topo `fea93281ec9b…` "feat(web): Filtrar e Exportar funcionando na lista de OS (B-OS-FILTRAR-EXPORTAR) (#409)"; pai `026ff7b8` (#400).
- `gh pr view 409` → state MERGED, mergedAt 2026-10-08T21:35:59Z, mergeCommit `fea93281ec9b5729b5379d4a423c42a06a439137` (bate), headRefOid `f704e856d236…`.
- `git rev-parse f704e856^{tree} fea93281^{tree}` → ambos `4d55e6775ff5…` → o squash é EXATAMENTE a árvore do head aprovado (nada perdido, nada a mais).
- check-runs no head `f704e856`: 14/14 completed success (docker, backend-postgres, authority-portal, flutter, owner-portal, frontend, backend — 2 rodadas cada).
- check-runs no squash `fea93281` (CI de push na main): 7 runs; deploy skipped, owner-portal/authority-portal success, backend/backend-postgres/flutter/frontend **in_progress** no momento da medição → reconferir antes de fechar.
- `git ls-remote origin refs/heads/feat/web-os-filtrar-exportar` → vazio → branch remota apagada.
- Veredito parcial: OK (CI da main a reconferir).

### Item 2 — promessa × entregue
- `gh pr view 409 --json body` lido; `git diff --name-status 026ff7b8 fea93281` → 16 arquivos (2154+/48−).
- Escopo por laço: lista A1..A13 EXTRAÍDA da tabela §2.1 do plano no blob do squash (13 caminhos) + plano + `controle/pendencias.md` + `controle/pendencias-indice.md` (registro do orquestrador, D-GOV-PROPORCIONAL (3)) = 16 permitidos. `comm` tocados × permitidos → **0 fora do permitido, 0 permitido não tocado**. Grep de proibidos (src/, prisma, tests/ raiz, scripts/, infra/, .github/, Kpis/, lockfiles, lib/csv, components/patterns, useAutoRefresh, App.tsx, modules/audit, CLAUDE/AGENTS/RBAC, .claude/.agents, screen-refs) → **vazio**.
- Hunks com restrição nominal, conferidos por execução:
  - A12 `frontend/package.json`: `node -e` → `test:smoke` novo === antigo + " tests/work-orders-list-tools.test.ts" (**true**); resto do JSON idêntico (**true**) → nenhuma dependência.
  - A3 adapter: 1 hunk, só `scheduledFor ?? createdAt` → `createdAt` (3 linhas renomeadas `createdTime`). OK.
  - A2 `useWorkOrders.ts`: só `useRef` + `requestSeq` + `if (seq !== requestSeq.current) return;` (guarda de ordem). Assinatura/retorno inalterados. OK.
  - A4 row.logic: só acréscimos (`WORK_ORDER_PRIORITY_LABEL` com o MESMO texto do `PRIORITY_LABEL` antigo da página l.51-56; `workOrderServiceLine` com a MESMA composição da página antiga l.345-347). OK.
  - A8 `app.css`: 1 hunk @@ -3095 +3095,28, 0 linhas removidas → só acréscimo. OK.
  - A10 page-live: 13 casos antigos → 23; `node` comparando cada corpo antigo (até o `});` de fecho) contra o arquivo novo → **13/13 verbatim** (a 1ª tentativa acusou o PV7 só porque o bloco novo FE foi inserido entre PV7 e GB1 — fatiamento meu, não mudança).
- Promessas do corpo × código (leitura do blob do squash):
  - Filtrar com Prioridade + Data de abertura + contador: `countActiveFilters`, `pat-btn--engaged`, `pat-btn__count` + `sr-only` — presentes.
  - Semântica de data do backend (início/fim do dia local): `toApiFilters` → `from` 00:00:00.000 local, `to` 23:59:59.999 local em ISO — presente; adapter local passa a filtrar por `createdAt` (abertura) — presente.
  - Respostas fora de ordem descartadas: `requestSeq` em `useWorkOrders.ts` — presente.
  - "Nenhuma OS para os filtros atuais": `filtered={items.length > 0 || activeFilterCount > 0}` e CTA "Nova OS" suprimido com filtro ativo — presente (a cópia em si vem do `WorkOrdersLoadState` existente; conferida no teste FE6 ao re-executar).
  - Exportar: 8 colunas (`WORK_ORDERS_CSV_HEADER` = Código, Prioridade, Cliente, Serviço, Técnico, Agenda, Atrasada, Situação); técnico sai como "Atribuído"/"Sem técnico" (sem id); sem id interno nem tenant; `neutralizeCsvFormula` = `/^[=+\-@\t\r]/` → prefixo `'`; desabilitado com dica em carregando/falha/vazio; parcial (`serverTotal > loaded`) habilitado com aviso na dica — tudo presente. Exporta `filtered` (aba+busca aplicadas, todas as páginas carregadas).
  - Rótulos centralizados em `work-orders-row.logic.ts` — presente.
  - Premissa `work_orders:read`: os botões aparecem sempre que `status !== "forbidden"`; sem permissão nova — coerente com o declarado como PREMISSA (não é defeito do bloco).
- Escopo que cresceu em silêncio: nenhum. Comentário afirmando comportamento ausente: o comentário novo da página (l.42-43) diz "filtrados no servidor" e "CSV local das linhas visíveis" — coerente com o código (filtros vão em `apiFilters` ao hook; exporta `filtered`).
- Veredito parcial: OK.

### Item 3 — números reais, re-executados na main (worktree `C:/Users/AMP/w-port409` detached em `fea93281`)
- Terreno: `git worktree add --detach C:/Users/AMP/w-port409 fea93281…` → HEAD `fea93281…`, `status --porcelain` vazio, só `.env.example` (sem `.env`); `env | grep DATABASE_URL|REDIS_URL|CORE_SAAS|VITE_` → vazio. `npm ci` próprio: frontend ec 0 (103 pacotes), raiz ec 0 (326 pacotes; aviso EBADENGINE node 20 vs >=22, sem efeito). Sem junction (`dir /AL` sem JUNCTION). Disco: 12 GB livres.
- (1) `npm --prefix frontend run check` → ec 0.
- (2) bloco: `node --test --import tsx tests/work-orders-list-tools.test.ts tests/work-orders.adapter.test.ts tests/work-orders-page-live.test.tsx` → ec 0, **# tests 47 · pass 47 · fail 0 · skipped 0** (declarado 47/47 — reproduz).
- Por arquivo: list-tools **15/15**, adapter **9/9**, page-live **23/23** (= 15+9+23 do §8.1 #2).
- (3) regressões do §8.1 #3 (honest-errors, row-actions, smoke-flow, kpi-cards-clickable, audit-events, auditoria-sessoes, remuneracoes-liquidar, telemetria-web, pattern-css-guard) → ec 0, **# tests 191 · pass 191 · fail 0** (declarado 191/191 — reproduz).
- (4) `npm --prefix frontend run test:smoke` → ec 0, **# tests 1268 · pass 1268 · fail 0 · cancelled 0 · skipped 0** (declarado 1268/1268 — reproduz).
- (5) `npm --prefix frontend run build` → ec 0 (aviso de chunk grande, pré-existente).
- (6) contratos raiz que leem o front (approval-frontend-contract, checklist-editor-blockers-parity, san3-04a-menu-front-x-catalogo) → ec 0, **16/16** (declarado 16/16 — reproduz).
- NÃO executado por mim: `npm test` da raiz (backend) — o diff não toca `src/`/`tests/` da raiz (item 2) e a CI `backend`/`backend-postgres` do head f704e856 está success; sem banco neste terreno por mandato.
- Veredito parcial: todos os números declarados reproduzem.

### Item 3b — mutações de produto (novas, fora da lista §7.3 do plano)
Protocolo: `git hash-object` H0 → script Node que exige âncora casando EXATAMENTE 1 vez nos bytes (CRLF; os dois arquivos estão em `\r\n` no worktree, conferido por Node) → `git diff --stat` não vazio → testes → edição inversa → H1 = H0.
- **M-P1** `work-orders-list-filters.ts` l.91 `countActiveFilters`: `parseLocalDate(state.from) || parseLocalDate(state.to) ? 1 : 0` → `parseLocalDate(state.from) ? 1 : 0` (período só com "até" deixaria de contar como filtro ativo — selo/sr-only/vazio filtrado mentiriam). H0 `32388c03…`; diff 1+/1−; bloco 47 → **pass 46 · fail 1 · `not ok [LT4]`**; restaurado, H1 `32388c03…` = H0. **Pega.**
- **M-P2** `WorkOrdersPage.tsx` l.291: `exportWorkOrdersCsv(filtered, source, …)` → `exportWorkOrdersCsv(filtered, "mock", …)` (exportação real sairia com nome "demonstrativo"). H0 `1a6cb6a1…`; diff 1+/1−; page-live 23 → **pass 22 · fail 1 · `not ok [FE3]`**; restaurado, H1 `1a6cb6a1…` = H0. **Pega.**
- Incidente de terreno (sem efeito): a 1ª tentativa do M-P2 usou âncora LF e o script ABORTOU com "casou 0 vezes" (trava funcionou; nada aplicado; `status --porcelain` vazio). O `grep -c $'\r$'` do Git Bash não enxerga o CR — a contagem de EOL vale por Node.
- `git -C C:/Users/AMP/w-port409 status --porcelain` após as duas → vazio.
- Veredito parcial: os testes do bloco pegam mutações de produto que ninguém listou.

### Item 4 — KPI
- Regra medida na ref: `grep -n` em `CLAUDE.md` do worktree (= `fea93281`) → l.268 "CONGELADO (2026-10-04, `D-GOV-PROPORCIONAL`, §C7 item 8(5)): até segunda ordem do dono, PR nenhum atualiza `Kpis/*`" e l.644 "(5) KPI congelado".
- `git show fea93281 --stat -- Kpis` → vazio. O bloco NÃO tocou `Kpis/*`, como a regra manda. Nada a cobrar (`pr`/`merge_commit`/`approved_head` não se aplicam enquanto o congelamento vigorar).
- Veredito parcial: OK.

### Item 5 — registro da aprovação (regra (1): revisor + CI, sem junta)
- Sem junta por classificação do plano §10 (sem dinheiro, sem permissão nova sob a premissa §0.6, sem segurança, sem perda de dado). Logo não se cobra ata em `omega/juntas/`.
- Parecer do revisor lido (`scratchpad/rev409/REVISAO-PR-409.md`, 210 linhas): **APROVADO**, identidade ≠ planejador (Claude Opus) e ≠ dev (Codex gpt-5.6-sol); reviu o head `585d178a`, bateria §8.1 re-executada, 4 mutações do plano + 3 novas, QA visual 1440×900, CSV real baixado. Achados: A-1 (conflito do índice gerado), A-2 (EX4 só assere a coluna Cliente — M-NOVA-1 sobreviveu), A-3 (texto do corpo do PR), N-1…N-6. Nenhum `bloqueia`.
- A-1 conferido: `git rev-parse 585d178a:frontend f704e856:frontend fea93281:frontend` → os três `5babaa47766f…` → o frontend que mergeou é byte a byte o revisado. `git log f704e856` → merge de `origin/main` (026ff7b8) no ramo; o squash contra `026ff7b8` contém só os 16 arquivos do bloco (item 2), então a integração não arrastou nada.
- A-3 conferido no corpo atual do PR: diz "desabilitado… quando a lista está vazia. Quando ela é parcial… fica habilitado e avisa na dica" e declara o `npm test` local vermelho por ambiente e o QA visual feito pelo revisor → **corrigido**.
- CI no head mergeado `f704e856`: 14/14 completed success (item 1) — inclui `backend`, `backend-postgres`, `frontend`, como o §10.2 do plano exige.
- Veredito parcial: OK.

### Item 6 — pendências
- `git diff 026ff7b8 fea93281 -- agent-orchestration/controle/pendencias.md` → +43 linhas, só acréscimo: as **4 do §9.3 do plano**, todas `status: ABERTA`, com escopo `pre-existente` + origem, prova N·forma·causa, dono, `bloqueia: não` e teste de encerramento:
  - `P-WO-LISTA-SO-20-MAIS-RECENTES` (MÉDIA) — dono "bloco a nomear (lista de OS, paginação no servidor)".
  - `P-CSV-FORMULA-GLOBAL` (BAIXA) — dono "bloco a nomear (acabamento web / segurança de formato)".
  - `P-WO-PRIORIDADE-MEDIA-SEM-ACENTO` (BAIXA) — dono "trilha de acabamento web".
  - `P-WO-FILTROS-LEGADO-MORTO` (BAIXA) — dono "bloco de faxina web".
- Índice gerado em dia: `python gerar-indice-pendencias.py` no worktree → "443 cabecalhos / 432 IDs | ABERTA 326 · FECHADA 117"; `git hash-object` antes = depois = blob `a507d85b…`; `git diff --exit-code` → 0; comparação EOL-neutra com o blob → **igual** (67661 = 67661 chars). O ` M` no status é fantasma de stat sob autocrlf (conteúdo idêntico). As 4 novas + `P-OS-FILTRAR-EXPORTAR` aparecem no índice (l.212-214, 334-335).
- **Achado de registro R-1 (dívida, não bloqueia):** `P-OS-FILTRAR-EXPORTAR` (pendencias.md l.10110) continua **`status: ABERTA`** na main depois do merge que a entrega. O plano §9.3/§10.4 manda fechá-la "no próprio PR do bloco ou no PR semanal" — a regra (3) admite o PR semanal, então é dívida que viaja, não defeito. Texto de fechamento já previsto no plano: "Filtrar (Prioridade, Data de abertura) e Exportar funcionando, com testes [FE1]–[FE10]; Técnico segue com P-WO-LIST-TECH-NAME". Conferido no código por amostragem que a entrega é verdadeira (itens 2, 3, 3b).
- **Achado de registro R-2 (dívida, não bloqueia):** os ajustes do revisor que o corpo do PR manda "para bloco futuro" (A-2 EX4 só Cliente; N-1 ausência de `aria-controls` com cartão fechado sem teste; N-3 gerador do índice lê "MEDIA" do ID → `P-WO-PRIORIDADE-MEDIA-SEM-ACENTO` aparece como **MÉDIA** no índice l.214 embora a entrada diga BAIXA) **não estão em `pendencias.md`** (`grep -n 'EX4\|aria-controls\|REVISAO-PR-409'` → só hits antigos não relacionados, l.1869/1872). Pelo §A5 o registro não fica só no corpo do PR. N-3 é reproduzido aqui: o índice gerado classifica a pendência BAIXA como MÉDIA (balde A, material).
- Veredito parcial: as 4 do §9.3 OK e índice em dia; R-1 e R-2 viajam para o PR de registro.

### Item 7 — limpeza §C5
- Branch remota: `git ls-remote origin refs/heads/feat/web-os-filtrar-exportar` → vazio (apagada). Remote-tracking `origin/feat/web-os-filtrar-exportar` → ausente.
- Branch local: `git branch --list 'feat/web-os-filtrar-exportar' '*osfe*' '*rev409*'` → vazio.
- Worktrees: `git worktree list` sem `w-osfe` nem `w-rev409`; `ls -d C:/Users/AMP/w-osfe C:/Users/AMP/w-rev409` → ambos ausentes; `git worktree prune --dry-run -v` → nada pendente.
- Processos: `Win32_Process` com `w-osfe|w-rev409` na linha de comando → **0 vivos**.
- Árvore principal: `git status --porcelain | grep '^( D|D )'` → vazio (nenhum rastreado apagado); nenhum rastreado modificado; `frontend/dist`, `dist`, `coverage` ausentes.
- Banco: o bloco não toca banco (nenhuma escrita; item 2) → sem resíduo possível na base viva; não toquei na base viva nem em volumes Docker.
- Disco C: **10,9 GB livres** (medido com o meu worktree e seus `node_modules` ainda presentes; df antes do `npm ci` dava 12 GB). Está no limiar de ~10 GB do corpo → recomendação: rodar `DEEP_CLEAN=1 bash scripts/post-merge-cleanup.sh` (ver `docs/limpeza-de-disco.md`) antes da próxima rodada pesada.
- Veredito parcial: limpeza do bloco OK; disco no limiar (ressalva operacional).

> Correção de registro: os cabeçalhos dos itens 2–7 traziam horários estimados por mim (21:45Z…22:14Z) que **não** foram medidos; removidos. Horários medidos por `date -u`: início 21:37:54Z; reconferência da CI da main 21:49:44Z.

### Item 1 (reconferência) — CI de push no squash `fea93281` (21:49:44Z)
- `gh api …/commits/fea93281…/check-runs` → 8 runs: docker, backend-postgres, flutter, owner-portal, backend, authority-portal, frontend **completed success**; deploy **skipped** (esperado: deploy não roda sem gatilho de produção). **Main verde.**

### Item 8 — o próximo pode começar?
- Comando: varredura por Node de `pendencias.md` (seções com `- **bloqueia:**` ≠ "não" e status não FECHADA/RESOLVIDA/SUPERADA) → 16 abertas que bloqueiam algo: 13 bloqueiam o **gate da versão vendável** (P-WEB-FATURAR-OS-SEM-TELA, P-SAN3-…, P-WEB-FONTE-INTER-NAO-CARREGADA etc.), 2 dizem "não bloqueia", 1 (`P-GOV-CORPOS-EM-VOO-COM-TETO-REVOGADO`) bloqueia a **junta** do #389 e do #388. `grep -i bloqueia | grep -i '405|SAN3-05|traccar|runtime'` → nenhuma pendência bloqueia o #405 nem a abertura do Traccar. Nenhuma das 4 abertas pelo #409 bloqueia nada (`bloqueia: não`).
- Estado dos PRs em voo (`gh pr view`): #405 (B-SAN3-05) OPEN · #389 OPEN · #388 OPEN · #393 OPEN (congelado pela regra (3)) · #400 MERGED · #401 MERGED.
- **#405:** nada do #409 o bloqueia (o #409 é só frontend da lista de OS + registro; o #405 é papel de runtime do banco). **LIBERADO.**
- **Trilha do Traccar:** pela regra 8(4) (CLAUDE.md da main) ela abre quando os PRs em voo de 2026-10-04 estiverem resolvidos — #405, #389 e #388 continuam OPEN e o #393 precisa de decisão registrada pela regra (3) — com o registro em dia e o disco limpo; e a ingestão em produção exige o B-SAN3-05 mergeado. Essas condições **não são criadas pelo #409** e continuam valendo; o #409 não acrescenta nenhuma. O registro, porém, tem as dívidas R-1/R-2 deste bloco, e o disco está no limiar (10,9 GB) — as duas entram nas condições "registro em dia" e "disco limpo" da regra 8(4).

### Conferências finais
- `git grep -nE "\[(LT|EX|FE|AD|RL)[0-9]+\]" -- frontend/tests | wc -l` → **26** (piso ≥ 26 do §8.1 #13). Relatório do dev: tabela com **16** mutações; o H0 que ele registrou para `work-orders-list-filters.ts` (`32388c03…`) é o mesmo que eu medi.
- `git diff --check 026ff7b8 fea93281` → ec 0, sem saída.

### Limpeza do porteiro (1 linha)
Worktree `C:/Users/AMP/w-port409` removido por `git worktree remove --force` (ec 0; 0 processo vivo com o caminho antes; conteúdo sem diff; diretório ausente; fora do `git worktree list`), 16 temporários `p409-*` (499 KB) apagados do scratchpad; `w-o05`, árvore principal, base viva e volumes Docker não tocados. Disco C depois: 12 GB livres.

## Itens (estado final)
1. Merge existe e íntegro — **OK** (árvore do squash = árvore do head aprovado; CI 14/14 no head, 7 success + deploy skipped na main).
2. Promessa × entregue — **OK** (16 arquivos = A1..A13 + plano + registro; restrições nominais conferidas por execução; corpo bate com o código).
3. Números — **OK** (47/47 · 191/191 · 1268/1268 · 16/16 · check e build ec 0 — todos reproduzem).
3b. Mutação de produto — **OK** (M-P1 → LT4 vermelho; M-P2 → FE3 vermelho; hashes restaurados).
4. KPI — **não se cobra** (congelado, 8(5)); `Kpis/*` intocado.
5. Registro da aprovação — **OK** (revisor independente APROVADO + CI verde; frontend mergeado = revisado `5babaa47`).
6. Pendências — **OK com dívida**: as 4 do §9.3 abertas e bem formadas; índice em dia. R-1: `P-OS-FILTRAR-EXPORTAR` segue ABERTA. R-2: A-2/N-1/N-3 do revisor só no corpo do PR, não em `pendencias.md` (N-3 reproduzido: o índice mostra `P-WO-PRIORIDADE-MEDIA-SEM-ACENTO` como MÉDIA).
7. Limpeza §C5 — **OK** (branch remota e local, worktrees `w-osfe`/`w-rev409`, processos: tudo limpo). Disco no limiar (10,9–12 GB).
8. Próximo — **#405 liberado**; Traccar segue sob as condições da regra 8(4), que o #409 não muda.

## Ressalvas que viajam (não impedem o start)
- **R-1** fechar `P-OS-FILTRAR-EXPORTAR` (pendencias.md l.10110) com o texto previsto no plano §9.3, no PR de registro.
- **R-2** registrar em `pendencias.md`, com dono: A-2 (EX4 assere só a coluna Cliente), N-1 (falta teste da ausência de `aria-controls` com o cartão fechado) e N-3 (o gerador do índice lê "MEDIA" de dentro do ID e classifica BAIXA como MÉDIA — escopo `pre-existente`, #362).
- **R-3** (operacional) disco em 10,9–12 GB livres, no limiar do corpo: rodar `DEEP_CLEAN=1 bash scripts/post-merge-cleanup.sh` antes da próxima rodada pesada.
- Premissa de permissão (`work_orders:read` para exportar) segue **a confirmar pelo dono**; não é defeito do bloco.

LIBERADO COM RESSALVA: #405 (B-SAN3-05), e depois a trilha do Traccar nas condições da regra 8(4) | no próximo PR de registro: fechar P-OS-FILTRAR-EXPORTAR (R-1) e registrar com dono A-2, N-1 e N-3 do revisor (R-2); rodar DEEP_CLEAN (R-3)
