# FASE0_RECON — Ω-VID (PR-00, recon)

> **Natureza:** reconhecimento técnico do PR-00 da rodada Ω-VID (Identidade unificada de
> veículo de terceiro — dossiê guincho→custódia→desfecho). Confirma/corrige, item a item, se
> o plano aprovado em `docs/juntas/J-OMEGA-VID.md` + `D-Ω-VID-01`
> (`agent-orchestration/controle/decisoes.md:831-871`) ainda bate com o estado real do
> código. **NÃO altera** `src/`, `frontend/src/` nem `prisma/schema.prisma` — só leitura +
> este arquivo.
> **Método:** leitura direta dos arquivos citados no prompt; achado ancorado em
> `arquivo:linha` confirmado por leitura nesta sessão. Data: 2026-07-31.
> **Convenção:** segue o formato de `docs/rodadas/omega5p/FASE0_RECON.md`.

---

## 1. Elo Checklist↔WorkOrder (alvo do PR-01)

### 1.1 `src/modules/checklists/checklist.validator.ts`

- **CONFIRMADO — `workOrderId` é descartado silenciosamente.** `parseCreateChecklistRunDto`
  (`src/modules/checklists/checklist.validator.ts:149-175`) valida o body com um
  `z.object({ checklistId, templateId, relatedEntityType, relatedEntityId, answers })`
  (`:150-155`) e retorna só esses campos no `transform` (`:168-173`). `workOrderId` **não
  aparece** no schema Zod — por padrão o Zod (sem `.passthrough()`) **descarta chaves
  desconhecidas** sem erro. O plano está correto: nenhuma validação, nenhum erro, o dado
  simplesmente some.
- **CONFIRMADO — `relatedEntityType`/`relatedEntityId` opcionais, sem enum/allowlist.**
  `relatedEntityType: z.string().trim().min(1).optional()` (`:153`) e
  `relatedEntityId: z.string().trim().min(1).optional()` (`:154`) — qualquer string não-vazia
  passa; não há `z.enum([...])` nem lista de tipos de entidade permitidos.

### 1.2 `mobile/flutter_app/lib/features/checklists/data/checklist_remote_api.dart`

- **CONFIRMADO — o Flutter ainda envia `workOrderId` no create de run.** `createRun()`
  (`mobile/flutter_app/lib/features/checklists/data/checklist_remote_api.dart:163-184`) monta
  o payload POST com `'workOrderId': workOrderId` na linha **174** (parâmetro obrigatório
  `required String workOrderId` na assinatura, linha **165**). Numeração de linha do prompt
  ("~170-177") bate com a leitura atual (payload em 172-177, `workOrderId` especificamente em
  174) — sem divergência material, só um deslocamento de ±2-3 linhas dentro da mesma faixa.

**Veredito item 1:** plano confirmado sem divergência. O elo está de fato quebrado: o app
manda `workOrderId`, o backend descarta, e não há guarda de tipo/allowlist em
`relatedEntityType`/`relatedEntityId` que pudesse compensar.

---

## 2. `prisma/schema.prisma` — âncoras de linha

| Model | Linha esperada (plano) | Linha confirmada (leitura atual) | Divergência |
|---|---|---|---|
| `ChecklistRun` | ~701+ | **701** (`model ChecklistRun {`) | Nenhuma |
| `Vehicle` | ~862+ | **862** (`model Vehicle {`) | Nenhuma |
| `ImpoundProcess` | ~2798+ | **2798** (`model ImpoundProcess {`) | Nenhuma |

Todas as três âncoras batem **exatamente** com o número de linha citado no plano, apesar da
ressalva do prompt de que migrações Ω5P PR-20/PR-21 poderiam ter deslocado o arquivo. Não
houve deslocamento: as PRs Ω5P mais recentes (outbox `impound.trigger_evaluated`/eventos,
`ImpoundProcessOutboxEvent` — migração `20260853000000_add_impound_outbox_events`, ver §5)
aparentemente adicionaram modelos **depois** de `ImpoundProcess` no arquivo, ou em posição que
não afeta as três âncoras checadas.

---

## 3. `src/modules/impound/impound.reconcile.service.ts` — sweep

- **CONFIRMADO — sem mudança.** `IMPOUND_RECONCILE_SCAN_INTERVAL_MS = 60_000`
  (`src/modules/impound/impound.reconcile.service.ts:10`) — sweep ainda a cada 60s, mesma
  constante, mesmo nome.

---

## 4. Última migração aplicada

`npx prisma migrate status` (rodado nesta sessão): **"Database schema is up to date!"**, 89
migrações encontradas em `prisma/migrations`. As 5 mais recentes por ordem alfabética/tempo:

```
20260849000000_add_authority_credential
20260850000000_add_authority_removal_request
20260851000000_add_release_authority_decision
20260852000000_add_portal_photo_viewed_action
20260853000000_add_impound_outbox_events
```

**Última migração: `20260853000000_add_impound_outbox_events`.** A próxima migração aditiva do
PR-02 Ω-VID (`ThirdPartyVehicleIdentity` + `MergeEvent` + `ImpoundProcess.identity_id`) deve
usar um timestamp **estritamente maior**, ex.: `20260854000000_add_vehicle_identity` (o plano
citava genericamente `202608NNNNNN_add_vehicle_identity` — o próximo prefixo válido é
`20260854000000` ou posterior, nunca `20260853xxxxxx` ou anterior).

---

## 5. `frontend/src/components/ui/index.tsx` — `Modal`/`Tabs`

- **CONFIRMADO — `Modal` ainda sem prop `size`.** `export function Modal({ title, open,
  onClose, children }: { title: string; open: boolean; onClose: () => void; children:
  ReactNode })` (`frontend/src/components/ui/index.tsx:121`) — assinatura sem `size`, exatamente
  como o plano descreve (PR-06 precisa adicionar a variante).
- **CONFIRMADO — `Tabs` existe no mesmo lugar.** `export function Tabs({` em
  `frontend/src/components/ui/index.tsx:195`.

---

## 6. `frontend/src/modules/patios/processes/components/OccupancyMap.tsx` — link da vaga ocupada

- **CONFIRMADO, com pequeno deslocamento de linha.** O `<Link to={...}>` está em
  `frontend/src/modules/patios/processes/components/OccupancyMap.tsx:66`:

  ```tsx
  <Link to={`/patios/processos/${spot.currentProcessId}`} style={linkStyle} aria-label="Abrir o dossiê do processo desta vaga">
  ```

  Rota e padrão (`/patios/processos/:id`) batem com o plano. Linha exata **66** — o prompt já
  sinalizava que a linha "pode ter mudado levemente"; registrando o valor atual para o PR-07
  usar como âncora ao trocar navegação de página cheia por abertura de modal (`?dossie=`).

---

## 7. Veredito consolidado

**Recon íntegro, plano segue válido.** Nenhum item divergiu do que está escrito em
`docs/juntas/J-OMEGA-VID.md` / `D-Ω-VID-01`. Lista de arquivo:linha reconfirmados nesta sessão:

- `src/modules/checklists/checklist.validator.ts:149-175` (schema do create-run, `workOrderId`
  ausente/descartado; `relatedEntityType`/`relatedEntityId` em `:153-154`, sem enum).
- `mobile/flutter_app/lib/features/checklists/data/checklist_remote_api.dart:163-184`
  (`createRun`, payload com `workOrderId` em `:174`).
- `prisma/schema.prisma:701` (`ChecklistRun`), `:862` (`Vehicle`), `:2798` (`ImpoundProcess`) —
  três âncoras confirmadas sem deslocamento.
- `src/modules/impound/impound.reconcile.service.ts:10`
  (`IMPOUND_RECONCILE_SCAN_INTERVAL_MS = 60_000`, sweep a cada 60s, sem mudança).
- Última migração real: `20260853000000_add_impound_outbox_events` (89 migrações, schema
  up to date) — PR-02 deve numerar sua migração `>= 20260854000000`.
- `frontend/src/components/ui/index.tsx:121` (`Modal` sem `size`), `:195` (`Tabs` existe).
- `frontend/src/modules/patios/processes/components/OccupancyMap.tsx:66` (`<Link
  to={`/patios/processos/${spot.currentProcessId}`}>` na vaga ocupada).

**Sem código de produção alterado nesta sessão** — só leitura + este documento (regra do
PR-00, §5 de `docs/juntas/J-OMEGA-VID.md`). PR-01 (fix do elo Checklist↔WorkOrder) pode
prosseguir com as âncoras acima.
