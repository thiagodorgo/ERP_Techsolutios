# J-OMEGA-VID — Identidade unificada de veículo de terceiro (dossiê guincho→custódia→desfecho)

> Ledger de execução da rodada **Ω-VID**. Espelha o formato de `docs/juntas/J-OMEGA5P.md`.
> Decisão de arquitetura registrada em `agent-orchestration/controle/decisoes.md` — **D-Ω-VID-01**
> (estende, não revoga, `D-Ω5P-09`/`D-Ω5P-RECON-A`).

## 1. Objetivo

Hoje o checklist de coleta do guincho (mobile, módulo `checklists`) e o dossiê de custódia
do pátio (módulo `impound`/Ω5P) são sistemas paralelos e desconectados. O dono do produto
pediu um **dossiê por veículo** que agregue os dois ao longo do tempo (um veículo pode ter
múltiplas remoções), navegável por um **modal grande com abas** aberto ao clicar no veículo
numa vaga ocupada, com ação de imprimir/salvar.

## 2. Decisão de arquitetura (Opção 2 — "Veículo como entidade de 1ª classe", feita corretamente)

Nova entidade **`ThirdPartyVehicleIdentity`**, DISTINTA da `Vehicle` da frota própria do
tenant (que continua com `plate NOT NULL @unique`, sem relação com pátios — D-Ω5P-09
preservado). Ponto de agregação: 1 identidade → N `ImpoundProcess` ao longo do tempo → N
`ChecklistRun` vinculados. Reconciliação sempre manual e auditada (nunca merge automático).

Plano completo, com evidência arquivo:linha do estado real do código, revisado
adversarialmente por 3 agentes (`critico-adversarial`, `agente-dba-guardiao`,
`coordenador-de-acessos`) em 2026-07-30 — achados incorporados ao plano final, ver §3.

## 3. Achados da junta de arquitetura (2026-07-30) — todos incorporados ao plano

- **critico-adversarial (BLOQUEADO → incorporado):** FK dura obrigatória em
  `ImpoundProcessChecklistLink.checklist_run_id` (o plano original a omitia "para
  preservar polimorfismo", mas o vínculo não é polimórfico — quebrava o próprio padrão do
  repo); identidade deve ser resolvida **na criação do processo**, não só por
  backfill+sweep assíncrono (corrida real de janela órfã); banner de duplicata na UI
  vira requisito do PR-04, não pergunta em aberto; rota `unmerge-admin` auditada em vez
  de "correção via SQL de suporte" (inaceitável num domínio com hash-chain de custódia);
  deep-link via query string `?dossie=` obrigatório no PR do modal.
- **agente-dba-guardiao (ajuste, não veto):** CHECK de enum para `confidence`
  (3 valores fechados) e `link_source` (2 valores) — o padrão real da casa usa CHECK para
  domínios pequenos/estáveis, sem CHECK só para FSMs grandes/evolutivas; nome de função
  de trigger por tabela; comentário explícito justificando o índice parcial não-único;
  backfill em UPDATE único por lote com `WHERE identity_id IS NULL`, sequencial por
  tenant; 11 cenários de prova viva (Postgres real, tx-ROLLBACK) exigidos antes de
  qualquer PR de schema ser aprovado.
- **coordenador-de-acessos (ajuste, não veto):** `vehicle_identity:merge` dedicada,
  distribuída só a `tenant_admin`/`manager`/`super_admin`/`platform_admin` (mesmo padrão
  de `release:approve`/`auction:appraise`) — **aprovado como estava**. Achado real: a aba
  "Checklist do Guincho" vazaria dado hoje escondido de `field_technician` (tem
  `impound:read` mas não `checklist_runs:read`) se usasse só `impound:read` como guarda —
  corrigido para exigir as DUAS permissões. Link→Modal só aprovado condicionado à
  sincronização de `?dossie=` (o app já usa `useSearchParams` em outros lugares — não é
  padrão novo).

## 4. Decisão de produto (dono, 2026-07-30)

- E-mail/WhatsApp de compartilhamento: **fora de escopo por enquanto**. Imprimir/Salvar:
  **dentro do escopo** (sem serviço externo pago — `window.print()` + CSS de impressão).
- Web configura o checklist e **só visualiza** o preenchido — nunca preenche (isso é
  exclusivo do guincheiro, no mobile).
- Backfill: quando achar dois processos "não identificados" com forte indício de serem o
  mesmo veículo (mesmo pátio, datas próximas, marca/modelo/cor batendo), **oferece** a
  sugestão no relatório de revisão humana — nunca decide/mescla sozinho.

## 5. Fila de PRs

| PR | Escopo | Junta obrigatória? |
|---|---|---|
| PR-00 | Recon — confirma achados do plano no código real na hora de codar | Não (bloqueia PR-01 se achar divergência) |
| PR-01 | Fix do elo quebrado Checklist↔WorkOrder (`workOrderId` descartado pelo Zod) | **Sim** |
| PR-02 | Schema `ThirdPartyVehicleIdentity` + `MergeEvent` + `ImpoundProcess.identity_id` (migração aditiva, com os ajustes do dba-guardião) | **Sim** |
| PR-03 | Script de backfill + relatório de ambíguos/sugestões | **Sim** |
| PR-04 | Merge manual + `unmerge-admin` + `ImpoundProcessChecklistLink` (com FK dura) + banner de duplicata | **Sim** |
| PR-05 | Resolução de identidade na criação do processo (sweep) + vínculo automático de checklist | **Sim** |
| PR-06 | `Modal` ganha variante `size="lg"` no design system | Não obrigatória |
| PR-07 | `VehicleDossieModal` (abas reaproveitando componentes existentes) + clique-na-vaga + `?dossie=` | Não obrigatória |
| PR-08 | Aba "Checklist do Guincho" (guarda dupla `impound:read`+`checklist_runs:read`) | Não obrigatória |
| PR-09 | Aba "Histórico de Custódias" | Não obrigatória |
| PR-10 | Imprimir/Salvar via `window.print()` + CSS de impressão | Não obrigatória |
| PR-11 (opcional) | PDF real (`@react-pdf/renderer`) — dependência nova | **Sim, junta unânime de 5 (§C7 CLAUDE.md)** |

## 6. Registro de execução

(preenchido PR a PR conforme a fila avança)
