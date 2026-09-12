# Plano de correção do ciclo 2 — PR #386 (plano SAN3 v4 → v5)

> **Quem planeja:** o orquestrador (autor do plano). **Quem aplica:** um agente distinto, que não achou nem planejou
> (§C7.4-bis). **Fonte:** os votos do ciclo 1 (`agent-orchestration/omega/juntas/votos/SAN3-plano/C1-*`, `C2-*`, `C3-*`)
> e a conferência do orquestrador no código de `a143d2c3`. **Regra para quem aplica:** aplicar exatamente o que está
> aqui; o que não couber, parar e devolver com o motivo — nunca decidir o mérito.

## A. Itens novos no §4.1 (de 49 para 54 — os quatro abaixo e o 54 do §G.3)

| # | Item | Crit. | Prova | Bloco |
|--:|---|:-:|---|---|
| 50 | `P-WEB-FATURAR-OS-SEM-TELA` — a web não fatura OS; a `InvoicesPage` afirma que fatura | 7, 4 | `work-order-financial.routes.ts:78`; 0 chamada em `frontend/src`; `FinancialTab.tsx`; `InvoicesPage.tsx:53` (C1-02) | `B-SAN3-25` (novo) |
| 51 | `P-SAN3-CHECKLIST-RUN-SEM-ESCOPO-POR-OBJETO` — técnico responde, conclui e dá ciência em vistoria de OS alheia | 3 | `checklist.routes.ts:164-202` só por permissão (C2-09, pre-existente) | `B-O6R-07c` (ampliado) |
| 52 | `P-FIELD-LOCATION-SEM-CONSENTIMENTO-NO-BACKEND` — o backend grava posição sem conferir consentimento | 3 | `field-location.service.ts:21-38` (C2-12) | `B-SAN3-17` (ampliado ao backend) |
| 53 | `P-MOBILE-CHECKIN-CONFERE-CODIGO-DA-OS` — o check-in pede a placa e confere o fim do código da OS; o backend não confere | 13, 3 | `work_order_detail_screen.dart:918-931` (C2-01) | `B-SAN3-26` (novo) |

Todos com `reclass.` marcado quando a fatia os dava como não bloqueantes (51, 52, 53), e citados no §8.7.

## B. Correções em itens existentes do §4.1

- **Item 16:** "27 itens" → **38**: os 27 do método MVP menos registro **mais** as 11 entradas registradas sem
  `requiredModules` (`/patios/*` ×6, `/telemetria/*` ×5), liberadas por `hasModule` (`navigation.service.ts:114-115`);
  sem chave de módulo para Pátios, Telemetria e Frota em `src/modules/platform/platform-modules.service.ts` (C2-02).
- **Item 17:** critério **13** (a tela declara controle inexistente), não 3 (C2-11).
- **Item 18:** critério **7 e 3** — o 3 agora pelo backend (item 52), o 7 pela porta (C2-11).
- **Item 32:** acrescentar que o backend **não impõe** escopo de leitura por papel (`work-order.service.ts:402-418`) e
  que o §10 pergunta ao dono, com default estrito "o técnico lista só as atribuídas, imposto no backend" (C2-10).

## C. Blocos

- **Novo `B-SAN3-25` · `feat/web-faturar-os`** (frente 3, M) — fecha 50. Fronteira:
  `frontend/src/modules/work-orders/components/tabs/FinancialTab.tsx`, o serviço de OS em
  `frontend/src/modules/work-orders/**` (chamada a `POST /work-orders/:id/invoice`), `frontend/src/modules/finance/pages/InvoicesPage.tsx`.
  Teste: OS com itens → faturar → título criado e itens carimbados; refaturar → recusado; o delta do item 21 (título
  complementar) faturável pela mesma ação depois do `SAN3-02`. Junta: unanimidade (dinheiro) + `cognicao-visual`.
  Dep.: `SAN3-01` (mesmo módulo), `SAN3-02` (o delta).
- **Novo `B-SAN3-26` · `fix/mobile-checkin-confere-placa`** (frente 4, M) — fecha 53. Fronteira:
  `mobile/flutter_app/lib/features/work_orders/ui/work_order_detail_screen.dart` e a conferência no backend (a placa ou o
  número de série vêm da OS/veículo do lado do servidor; o planejador do bloco nomeia o arquivo do backend no plano
  dele, dentro de `src/modules/work-orders/**` ou `src/modules/mobile/**`). Teste: dígitos da placa certos → check-in
  aceito; dígitos do código da OS → recusado; o backend recusa check-in sem conferência. Junta: unanimidade (segurança).
  Dep.: `SAN3-13` (mesmos arquivos de OS no app).
- **`B-SAN3-04` vira dois:** `B-SAN3-04a` · `fix/rbac-catalogo-banco-matriz` (M; itens 13, 14, 15, 38) e
  `B-SAN3-04b` · `fix/painel-com-recorte-por-papel` (M; item 12). Mudanças:
  - `04a` fronteira + `frontend/src/modules/auth/types.ts` (a união `UserRole`, para o rótulo de estoque — C2-06);
    teste do item 15 cobre as **quatro** divergências (manager `update`/`acknowledge`; finance e inventory sem
    permissão de checklist; `field_technician` sem `tenant_checklists:read` — C2-04); o vermelho-controle do P-033
    roda numa base preparada como a CI (`db:seed` só, `ci.yml:169`) e o verde depois do `db:provision-rbac` (C2-07).
  - `04b` fronteira: `src/modules/dashboard/**` + o grant `dashboard:read` no catálogo; teste: Financeiro e Estoque
    recebem 200 **com o recorte da matriz (l.34, `scoped`)**, não o painel inteiro (C2-05). Dep.: `04a` (catálogo).
- **`B-SAN3-05`:** a lista medida de leituras de plataforma passa a ter também `replaceTenantCharges`/`listTenantCharges`
  (`src/modules/cloud-charges/cloud-charge-prisma.repository.ts:24-25,166-212,238-240`) — fronteira e teste (C2-03);
  trava de mesmo arquivo com o `SAN3-03` (que toca `cloud-charges/**`).
- **`B-O6R-07c`:** fronteira + `src/modules/checklists/checklist.routes.ts` e o serviço de vistoria (item 51),
  `src/modules/mobile/mobile-evidence-sync.ts` e `src/modules/mobile/mobile-checklist-sync.ts` (vias que o censo vai achar
  — C2-08); regra de saída: via achada fora da fronteira no censo vira pendência nomeada com dono, e o `Ω6R-SEC-002` só
  fecha quando **todas** as vias do censo tiverem dono. Trava de mesmo arquivo com `SAN3-22` e `SAN3-03` em
  `src/modules/checklists/**`.
- **`B-SAN3-18`:** o teste de encerramento vira **fail-closed**: toda entrada do registro tem `requiredModules` **ou**
  está numa lista fechada de núcleo, e o guard falha para entrada sem módulo fora da lista; fronteira +
  `src/modules/platform/platform-modules.service.ts` (chaves de Pátios, Telemetria e Frota) e
  `src/modules/navigation/navigation.service.ts` (o `hasModule` sem módulo deixa de liberar); o provisionamento das
  chaves novas para as organizações existentes é script aditivo do bloco, com contagem antes e depois (C2-02).
- **`B-SAN3-17`:** fronteira + `src/modules/field-location/field-location.service.ts` (recusa sem consentimento, como a
  telemetria já faz); teste do backend (item 52).
- **`B-SAN3-13`:** fronteira + `src/modules/work-orders/work-order.service.ts` (listagem) para impor o escopo do técnico
  se o dono mantiver o default do §10 (C2-10); a trava de mesmo arquivo com `07c` e `SAN3-23` já existe — conferir.

## D. Agenda (§6) e viabilidade (§9)

- **Trava nova (C1-01):** `prisma/schema.prisma` e `prisma/migrations/**` — em série: `04a` → `03a` → `SAN3-02` →
  `SAN3-20` → `B-O6R-12` → `B-O6R-09`. Declarar no §6 junto das outras travas.
- **`SAN3-04a` passa a ser o primeiro bloco da frente 2** (C1-06: o `SAN3-12` e o `SAN3-24` precisam das permissões do
  Financeiro corrigidas para provar "ação só com a permissão"). A trava do arquivo de menu fica `SAN3-04a` → `SAN3-12` →
  `SAN3-24` → `SAN3-06a` → `SAN3-18`.
- **Agenda proposta (melhor caso; G 13 h, M 5 h, P 1,5 h)** — quem aplica **recalcula por script** e publica o que der,
  com as travas e dependências do §5 e do §6; se o script der outro número, vale o script:
  - F1: `04a` 0–13 · `03a` 13–26 · `SAN3-02` 26–39 · `SAN3-20` 39–44 · `SAN3-03` 44–57.
  - F2: `SAN3-04a` 0–5 · `SAN3-05` 5–18 · `07c` 18–31 · `SAN3-04b` 31–36 · `SAN3-09` 36–37,5 · `SAN3-22` 37,5–42,5 ·
    `SAN3-18` 42,5–55,5 · `B-O6R-12` 55,5–60,5 (depois do `SAN3-20`, pela trava de schema).
  - F3: `SAN3-01` 0–5 · `SAN3-12` 5–10 · `SAN3-24` 10–23 · `AV-REAL` 23–28 · `SAN3-11` 28–29,5 · `SAN3-06a` 29,5–34,5 ·
    `SAN3-07` 34,5–36 · `SAN3-08` 36–41 · `SAN3-25` 41–46 · `SAN3-06b` 46–59 · `SAN3-21` 59–60,5.
  - F4: `11` 0–5 · `SAN3-13` 5–10 · `SAN3-14` 10–15 · `SAN3-15` 15–28 · `SAN3-17` 28–33 · `SAN3-16` 33–38 · `SAN3-26`
    38–43 · `04b` 43–48 · `03b` 48–53 · `SAN3-19` 53–54,5 · `SAN3-23` 54,5–59,5 · `B-O6R-09` 60,5–65,5 (depois do `B-O6R-12`).
  - fecho: `SAN3-10` depois do último bloco.
- **Viabilidade:** recalcular melhor caso e realista com os 37 blocos (G = 11, M = 21, P = 5 — conferir por contagem),
  mantendo o método do §9; declarar (C1-05) que o realista pressupõe 4 frentes simultâneas e dar o número com 2 frentes
  (a soma do trabalho dividida por 2, mais o fecho); trocar "este PR, ≈ 3 h" pelo que foi medido (C1-03: o PR está aberto
  desde 2026-09-11 14:54Z); usar o mesmo G no texto e na agenda (C1-04).

## E. Demais seções

- **§0:** números novos (53 bloqueantes, 37 blocos, faixas recalculadas).
- **§8.7:** acrescentar as reclassificações 51–53 e a correção de critério dos itens 17 e 18.
- **§10:** nova pergunta (C2-10): o técnico lê todas as OS da organização ou só as atribuídas? Default: só as atribuídas,
  imposto no backend.
- **§14 novo — "Resposta à junta do ciclo 1":** uma linha por achado das três cadeiras (C1-01..06, C2-01..12, C3-*), com
  a resposta.
- **Fora do plano, mesmos números:** `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md`
  e as notas dos `mvp_*` e a linha de `limitations` em `Kpis/kpis-latest.json` (depois, `node scripts/kpi-freeze.mjs`).

## G. Correções da cadeira C3 (registro, decisões, painel e números)

1. **C3-01 — a decisão errada.** O índice único parcial `financial_titles_wo_direction_active_key`
   (`(tenant_id, work_order_id, direction)`, sem competência na chave) é a **`D-Ω4-C2`** (idempotência do faturamento,
   `decisoes.md:607`), não a `D-Ω4-C1` (carimbo dos itens, `decisoes.md:608`). Corrigir:
   - `agent-orchestration/controle/decisoes.md`, `REGISTRO-SAN3-CONFLITOS`, item 1: o conflito é
     `P-Ω4-3-REFATURAR-DELTA` × **`D-Ω4-C2`**; acrescentar que o carimbo (`D-Ω4-C1`) não impede faturar os itens ainda
     não carimbados — quem impede é o índice da `D-Ω4-C2`; e a nota "corrigido em 2026-09-12 pela junta do PR #386
     (C3-01): a versão anterior atribuía o conflito à `D-Ω4-C1`". Em "Quem resolve", a junta do `B-SAN3-02` revê a
     `D-Ω4-C2`.
   - `docs/revisoes/SAN3/PLANO_SAN3.md`: trocar `D-Ω4-C1` por `D-Ω4-C2` onde a referência é o índice (item 21, fronteira
     do `B-SAN3-02`, §8.7, §10.5); na linha CR2-01 do §13 acrescentar "(corrigido no ciclo 2: é a `D-Ω4-C2` — C3-01)".
     Conferir com `grep -n "D-Ω4-C1"` que nenhuma ocorrência restante se refere ao índice.
2. **C3-03 — fechamento pela metade.** Em `agent-orchestration/controle/pendencias.md`, a primeira linha de status de
   `P-KPI-ROADMAP-CONGELADO` e de `P-KPI-RECENT-CONGELADO` volta a `ABERTA (PARCIAL — fechado: os dados do painel foram
   corrigidos no PR #386 …; aberto: o critério de fechamento desta entrada — guard que falha quando o painel defasa do
   último merge, provado por mutação — dono B-SAN3-10, plano SAN3 v5, item 54)`, preservando o valor anterior
   (inclusive a linha FECHADA de hoje) no fim da mesma linha. **Esta é a única edição permitida em `pendencias.md`**,
   junto do item 5 abaixo.
3. **C3-03, no plano:** novo item **54** no §4.1 — `P-KPI-ROADMAP-CONGELADO` + `P-KPI-RECENT-CONGELADO` (resíduo:
   nenhum guard impede o painel de defasar do último merge; critério 8) → `B-SAN3-10` ganha o teste (g): guard de frescor
   do painel (`roadmap` e `recent` com o último merge do history), com mutação que o deixa vermelho. O parágrafo
   "Fechados por este PR" do §4.1 vira "dados corrigidos por este PR; as duas entradas seguem ABERTAS (PARCIAL) — item 54".
4. **C3-06 — painel (pre-existente, corrigido aqui porque o PR já mexe no roadmap):** em `Kpis/kpis-latest.json`,
   `roadmap.as_of` → `2026-09-11`; `B-O6R-06` com o PR #385 (`15ef3fbe`, 2026-09-11) no mesmo formato que `B-O6R-01`/
   `B-O6R-05` usam para o PR; `B-O6R-02` com o PR #371; retirar `B-O6R-06` de `trilha_bloqueada.bloqueada_por` com nota
   (a pendência-mãe `P-O6R-B06` está FECHADA). Depois `node scripts/kpi-freeze.mjs` e os 3 guards de KPI.
5. **C3-04 — prova que não se reproduz:** no plano (item 28) e numa emenda de 1 linha em
   `P-WEB-FIN-BAIXA-E-CONTA-SEM-TELA` (pendencias.md), a prova passa a ser "nenhuma chamada a `/financial-titles/:id/pay`
   em `frontend/src`" — o `grep /pay` cru acha 34 linhas de `/payable`, `/payable-source`, `/payments`, `/payee`,
   `/payload`.
6. **C3-05 e C3-07 — contas do §1 e do §4.4:** o placar das AUSENTES soma **58 linhas AUSENTE (= 50 IDs)** — 37 + 8 +
   58 + 24 + 13 = 140; e "as 8 parciais entraram como **9 emendas** (a mesma parcial vale para duas entradas da
   plataforma)".
7. **C3-02 — números no `status-geral.md`:** depois de TODAS as mudanças, rodar o gerador e escrever na frase do
   índice exatamente o que ele imprimir (cabeçalhos, FECHADAS, ABERTAS). O mesmo número vai para o `log-execucao.md`,
   o §0 do plano e a descrição do PR.
8. **C3-08** (diretório de worktree órfão `.claude/worktrees/san2-r`): **não é para mexer** — resíduo alheio, só
   reportado na ata.

A tabela do §14 do plano ganha uma linha por achado da C3 (C3-01..08).

## F. O que quem aplica NÃO faz

Não muda a classificação de nenhum item além do que está aqui; não cria bloco além dos listados; em `pendencias.md` só
faz as duas edições do §G (itens 2 e 5); não commita. Ao terminar: `git diff --check` limpo, guards de KPI verdes,
índice regenerado pelo gerador, e a lista do que não coube.
