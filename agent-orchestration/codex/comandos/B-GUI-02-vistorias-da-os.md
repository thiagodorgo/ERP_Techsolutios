# B-GUI-02 — O operador escolhe, na web, as vistorias da OS

- **Tipo:** feature
- **Fase:** Execution (A5)
- **Trilha:** servidor (a primária pela etapa) + web (o painel nas 3 aparências)
- **Data:** 2026-11-17
- **Branch:** `feat/web-gui02-vistorias-da-os`
- **Autor:** `dev-gui02-cl` (Claude Opus 5.5, dev, nível menor declarado)
- **Plano (norma):** `~/erp-pausa-2026-10-03/planos/plano-APP-GUINCHO.md` §4.2, com as emendas
  `plano-B-GUI-02-emenda1.md`, `-emenda1.1.md`, `-emenda2.md` (a Emenda 2 prevalece onde divergir), `-emenda2.1.md`
  (os 4 ajustes da pré-revisão) e `-emenda2.2.md` (a guarda `collection_after_dispatch` para TODA OS já enviada;
  prevalece onde fala).
- **Maquete aprovada pelo dono (17/11, `D-DONO-1711-RETOMADA-APROVA-TUDO` item 3):**
  `docs/claude-code-handoff/screen-refs/os-vistorias-3opcoes.reference.html` (cópia byte a byte).
- **Nível:** JUNTA COMPLETA (Emenda 2 §4: a prova operacional da coleta é dado; o bloco toca o despacho e o
  congelamento). Fluxo rápido: pré-revisão, junta, triagem, um conserto, conferência.

## Objetivo

1. **Servidor (Emenda 2 §1):** a primária da OS é a vistoria de COLETA viva de menor posição; sem coleta, a de menor
   posição, como antes. A mesma regra nos três lugares que decidem a primária: o comparador `sortChecklistLinks`, o
   espelho da criação `mirrorColumnsFromInputs` e o `sort` do despacho `loadDispatchChecklistLines`. A coleta não entra
   depois do envio: 409 `collection_after_dispatch`, com ou sem vistoria congelada (Emenda 2.2: a referência
   `hasDispatchForWorkOrder`, despacho não cancelado da OS, OU o conjunto congelado). Sem migração.
2. **Tela (Emendas 1, 1.1 e 2 §2):** o painel "Vistorias desta OS", com as 3 aparências aprovadas — A "Na ficha da OS"
   (em Informações gerais), B "Duas vagas" e C "Como o app vai ver" (as duas na aba nova "Vistorias"). Uma linha por
   chamada ao `PATCH /work-orders/:id/checklists`; "Trocar" retira a antiga e, só depois do 200, inclui a nova. Edita só
   quem tem `field_dispatch:create` e `tenant_checklists:read`, com a OS fora dos estados terminais.

## Escopo PERMITIDO / PROIBIDO

PERMITIDO: os 16 caminhos da Emenda 1 §7.1 e os 9 da Emenda 2 §4 — `src/modules/work-orders/work-order-checklists.types.ts`,
`work-order.repository.ts` (a linha do espelho e o import), `work-order.service.ts` (a guarda e o import),
`src/modules/field-dispatch/field-dispatch.service.ts` (a linha do `sort` e o import), `tests/bgui02-ordem-por-etapa.test.ts`,
`tests/bgui02-ordem-por-etapa-db.test.ts`, `tests/field-dispatch-multi-checklist.test.ts` (o dublê), uma linha
`SUITES=` em `.github/workflows/ci.yml`, `API_CONTRACTS.md` (l.625 e l.658); o docblock de `sortChecklistLinks`
(Emenda 2.1 item 4); na Emenda 2.2 §5, a referência `hasDispatchForWorkOrder` (declaração e composição) em
`work-order.service.ts` e os registros nomeados em `agent-orchestration/controle/` (`pendencias.md`,
`pendencias-indice.md`, `decisoes.md`); e, no front, o modelo, o painel, a aba
Informações gerais, a página, as abas, o serviço, o mock, os tipos, o registro de aparência, o guard, o hub, o smoke
novo, o teste de fluxo da raiz, a referência e o README dos `screen-refs`. E este comando.

PROIBIDO: `prisma/**`, `migrations/**`, `work-order-prisma.repository.ts`, `src/modules/checklists/**`,
`frontend/src/modules/checklists/**`, `WorkOrderDetailWindow.tsx`, `frontend/src/modules/appearance/` fora do registro,
`mobile/**`, `Kpis/**` (congelado, `D-GOV-PROPORCIONAL`), `RBAC_MATRIX.md`, `APPROVAL_LIMITS.md`, o resto de
`agent-orchestration/**` (fora os registros nomeados pela Emenda 2.2 §4), `src/modules/field-dispatch/**` fora da
linha do `sort` e, no conserto da J-596, `WorkOrderChecklistsPanel.tsx`.

## Bateria de validação

```
npm run check && npm run lint && npm test && npm run build
npm --prefix frontend run check && npm --prefix frontend run test:smoke && npm --prefix frontend run build
CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/bgui02-ordem-por-etapa.test.ts tests/bgui02-vistorias-da-os-fluxo.test.ts
CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/work-order-checklists-sticky.test.ts tests/field-dispatch-multi-checklist.test.ts tests/checklist-snapshot-dispatch.test.ts
DATABASE_URL=<cluster descartável, migrado e semeado> node --test --import tsx tests/bgui02-ordem-por-etapa-db.test.ts
git diff --check
```

Aceite: T1–T7 e T4b (memória) e T1, T3, T4, T7 (`-db`) verdes, vermelhos com o `src/` da base; W1–W5c verdes; as 18
mutações da Emenda 2 §3 (MS1–MS5 e as 13 de tela), uma a uma, deixam o teste nomeado vermelho e são desfeitas.
Emenda 2.1: T8 (`-db`, a metade do espelho da guarda) e T9 (memória, caracterização) verdes, com MP1 → T8; W-A2
(a coleta da OS enviada sem Trocar/Retirar) verde, com MW-A2 → W-A2. Emenda 2.2: T10 (memória, com o controle) e
T10-db verdes, vermelhos com o `src/` de 578b7463 (200 em vez de 409); T11 (memória, a metade `links.some`) verde;
MX-G1 → {T10, T10-db}; MP2 → {T11}; W2 e W-A2 montados nas 3 aparências.

## Rastreabilidade

Diário do dev (comando · saída · veredito de cada passo, as 18 mutações com as duas saídas):
`~/erp-pausa-2026-10-03/revisoes/app-guincho/dev-gui02-cl.md`. Capturas das 3 aparências (antes do envio, já enviada,
encerrada, linha aberta e o despachante só leitura), para a conferência visual do orquestrador:
`~/erp-pausa-2026-10-03/revisoes/app-guincho/gui02-capturas/`. Registro a cargo do orquestrador (Emenda 2 §5):
`P-GUI02-ORDEM-POR-ETAPA-NO-SERVIDOR` absorvida; `P-GUI02-ESPELHO-OS-EM-VOO` nova; `§A2 D-GUI02-PRIMARIA-POR-ETAPA`.

Conserto da J-596 (17/11): `fix-596-cl` (Claude Opus 5.5), pela Emenda 2.2 — C1-01 (a guarda para toda OS enviada,
T10/T10-db, MX-G1), C1-02 (T11, MP2), C2-N1 (W2 e W-A2 nas 3 aparências), C3-01 (os registros nomeados neste PR),
C3-02 (este comando) e o contrato (l.658). Diário: `~/erp-pausa-2026-10-03/revisoes/j596/fix-596-cl.md`.
