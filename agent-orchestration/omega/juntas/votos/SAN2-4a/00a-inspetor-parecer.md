# SAN2-4a — Parecer do inspetor de terreno (P2: escrito ANTES da mensagem final)

> `inspetor-de-terreno-da-junta`, instância nova, Fable por contrato. PR **#365**, branch
> `chore/san2-4a-medir-arnes`, **head julgável `83d0366`**. Evidência executada, item a item, em
> `00a-inspetor-evidencia.md` (mesma pasta). Data: 2026-08-31. Este parecer julga o TABULEIRO,
> não o mérito da entrega.

## O que foi PROVADO limpo (comando + resultado na evidência)

1. **Head e árvore:** head local = head do PR (`gh pr view 365` → headRefOid `83d0366…`); porcelain
   com **zero rastreado modificado** (1 untracked: o diário do backfill — ressalva R2);
   `node_modules` NÃO é junction (fsutil).
2. **Base viva intacta:** `docker ps -a` → só `erp-postgres` e `erp-redis`, ambos **Up 2 days
   (healthy)** — o uptime atravessa o trabalho do bloco (31/08) sem restart, como os diários alegam.
   **Zero containers `san2-4a-*`** (nem parados): teardown §3.4 provado.
3. **Fatia S0:** `sync-agent-agents.mjs --check` → ec=0, "23 agentes, espelho consistente".
4. **Baseline do que a junta audita:** diff `main...HEAD` = **exatamente 8 arquivos**; diff de
   CÓDIGO (src/tests/scripts/prisma/frontend/mobile/portals/.github/package*/.claude/agents/.agents)
   **VAZIO nas duas pontas** — o 4a não consertou nada, provado; `main` = `c9fd3a1` e é ancestral
   do head. `npm run check` no head → **ec=0**.
5. **KPI por parser:** backfill SAN2-3 = `364/c9fd3a1/23d9227` aplicado; `blocks_completed` **154**
   (history e latest); `kpi-freeze --check` ec=0; `node --check Kpis/app.js` ec=0; guard
   `kpi-dashboard-charts` **16/16** reexecutado por este inspetor.
6. **Insumos:** plano + 3 diários de medição (todos CONCLUÍDOS, com a divergência de caminho
   DECLARADA §A2 no diário 2) + diário do backfill: presentes. Ciclo 1 → crítico/PD N/A (§C7.4).
7. **Inelegibilidade:** obituário lido (15 SEPULTADAS + 2 RESERVADAS, todas nomeadas na evidência);
   `especialistas/` não existe nesta branch (nenhuma identidade proposta no head); `dev-san2-4a`
   ausente de todas as atas/briefings/reprovações (grep vazio) — é identidade nova E NÃO VOTA
   (dev + achador, §C7.4-bis); o planejador não vota (§8).
8. **Perda de jurado:** `PROTOCOLO-JUNTA-RESILIENTE.md` presente com P5 (máx. 2 disparos paralelos,
   pausa de janela instável) e P6 (`00-quedas.md`); obrigatório por §C7.7.
9. **CI do PR #365:** 7/7 SUCCESS (backend · backend-postgres · frontend · owner-portal ·
   authority-portal · flutter · docker), estado OPEN.

## VEREDITO: **LIBERADO COM RESSALVA**

### Ressalvas (entram no briefing em destaque)

- **R1 (vinculante — condição para o primeiro voto):** o BRIEFING-SAN2-4a ainda não existe. Ele deve:
  (a) nomear **3 identidades NOVAS** para as cadeiras do §8 do plano, com **0 colisões** contra a
  lista proibida: as 15 sepultadas + as 2 reservadas do obituário (`jurado-c5-arnes-catalogo-postgres`,
  `critico-c5-adversarial` — usá-las queimaria a composição do ciclo 5), `dev-san2-4a` (dev/achador)
  e a instância planejadora; ausência do nome no obituário NÃO absolve — nomes novos por definição
  não podem constar de ata alguma (J-*/R-*/BRIEFING-*), e qualquer reaproveitamento exige o grep nas
  atas ANTES do voto; (b) declarar o protocolo resiliente P1–P6 (evidência incremental, voto em
  arquivo antes da mensagem, sucessor re-executa roteiro, mandato ≤3 itens, máx. 2 paralelos,
  `00-quedas.md`); (c) repassar afirmações dos diários e de atas anteriores como **"A RE-VERIFICAR
  por execução"**, nunca como fato — em particular os números que os diários declaram CARREGADOS
  (ex.: o 68 das `rls_test_`) permanecem carregados, não re-verificados.
- **R2:** `kpi-backfill-log.md` está **untracked** — persistir (commit) junto do registro da junta,
  como no R1 do inspetor do SAN2-3; insumo de junta que vive só no disco de um worktree não sobrevive.
- **R3 (resíduo inerte, nomeado):** worktree `agent-af6ea607f3ddf8efd` (`feat/o6r-b02-financial-uow`,
  12c3825) permanece de outro caso (ciclo 5 financeiro pausado). Não contamina esta junta (nenhum
  jurado a usa; sem junction). Orquestrador decide o destino — não remover sem confirmar que o
  ciclo 5 o reusa; remoção só via `git worktree remove`.
- **R4 (fatos de terreno para a cadeira 3 — mérito é da junta):** (i) o plano §1.6/§6.4 pede entrada
  history + release latest **SAN2-4a com 3 nulls** — não existem; o backfill e o 154 vivem NA entrada
  SAN2-3 (escolha explicada no `kpi-backfill-log.md`); (ii) caminhos do §5.1 ausentes do diff:
  `omega/medicoes/SAN2-4a-medicao.md`, apensos em `controle/pendencias.md`, errata em
  `status-geral.md`, `pendencias-indice.md`, apenso ao `SAN2-2-plano.md` — divergência declarada
  no diário 2 (§A2), a junta julga se a entrega satisfaz o plano ou se falta consolidação.

### Limpeza do inspetor (1 linha)

Criei 3 logs temporários em /tmp (removidos) e nada mais — zero containers, zero worktrees, zero
mutação em rastreado; ficam só os dois deliverables do papel nesta pasta, não commitados.

**LIBERADO COM RESSALVA**
