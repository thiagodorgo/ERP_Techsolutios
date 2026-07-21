# D-records da Fase 0 — Rodada Ω4C (recon)

> Decisões emitidas na Fase 0 (PR-00) a partir do `docs/rodadas/omega4c/FASE0_RECON.md`. Ratificadas pela junta J-Ω4C.
> Os D-records "de padrão" do PLANO §2 (D-Ω4C-ANEXOS, -FIN-ORIGEM, -EXTRATO, -NOTIF, -MODAL-PESQUISA, -TELEMETRIA)
> permanecem válidos e foram **confirmados** pelos achados.

## Achado central (muda o PLANO §1)
O repo está **muito mais adiantado** que o gap estimado. **5 módulos que o PLANO marcou "Criar" JÁ EXISTEM** — `fuel-logs`,
`maintenance-orders`, `fines`, `insurance-policies`, `damages` (+ `vehicles`, `customers`, `suppliers`, motor de `notifications`).
Veredicto real: **CRIAR só em 2** (Extrato do Profissional #3; Telemetria #12); **6 rebaixados CRIAR→ESTENDER** (#4/#5/#6/#7/#8/#9);
Remunerações (#11) é misto (motor `commissions` existe; falta rota `settle`+compute+link+colunas). O PLANO é re-dimensionado no §6 do FASE0_RECON.

---

## D-Ω4C-RECON-01 — Filtro de Remunerações (PR-15)
`tariffs`/price-tables é preço de **VENDA** (serviceCatalogId/customerId), **não** pagamento ao profissional — NÃO acoplar direto.
Rótulos/opções do filtro (período/profissional/KM/empresa/doc/filial) decididos na junta do PR-15, espelhando o padrão de filtros
do ERP (não copiar a fricção do "modal abre ao entrar" — só em Remunerações, D-Ω4C-MODAL-PESQUISA). **Validar no PR-15.**

## D-Ω4C-RECON-02 — Campo "empilhadas" do painel de conferência (PR-14)
Provável adicionais/etapas/estadias/horas paradas do serviço. Mapear ao conceito de adicionais/etapas do domínio de OS já existente;
nome final na junta do PR-14. Baixa confiança → não inventar campo novo antes de confirmar. **Validar no PR-14.**

## D-Ω4C-RECON-03 — `Tipo de Saída` do sub-modal Saída do Estoque (PR-10)
Tipos de movimento hoje = `['entrada','saida','consumo','ajuste']` (`inventory.types.ts:4`). Estender com **LINK/UNLINK** (custódia)
e os tipos de saída (ex.: venda direta) como **enum-em-app, sem CHECK**. Lista final ratificada na junta do PR-10.

## D-Ω4C-RECON-04 — Origem `MULTA` em Danos: classificação, não FK automática
Tratar a origem `MULTA` como **classificação** (string), **sem** FK automática Dano→Multa na v1 (evita acoplamento + migration
extra). Vínculo explícito fica como evolução futura. **Junta do PR-12/PR-13.**

## D-Ω4C-RECON-05 — Notificação de "próxima manutenção" disparada por ITEM
Áudio sugere por item (ANALISE:302). Disparo **por item** com **dedupe idempotente** por `sourceId` da manutenção (não gerar N
notificações redundantes). **Junta do PR-07/PR-08.**

## D-Ω4C-RECON-06 — Janela do Rastreamento: período livre com default 24h
Período livre com **default de 24h** (00:00–23:59 do dia) + teto configurável — mais flexível que a janela fixa, sem custo extra.
Confirmar contra o volume de telemetria (índice `(tenant_id, professional_id, captured_at)`). **Validar no PR-18.**

## D-Ω4C-RECON-07 — Teste 3-tenant via tenants efêmeros (NÃO via seed)
`prisma/seed.ts` cria **só 1 tenant** (`slug='demo'`); `seed-fleet.ts`/`seed-users.ts` fazem `findFirst({slug:'demo'})`. O mandato
"testar com 3 tenants" é cumprido **estendendo `tests/rls-tenant-isolation.test.ts`** (tenants A/B/C efêmeros criados/deletados no
teste), **nunca** alterando o seed — `prisma/**` é escopo proibido sem autorização explícita (§C4). Padrão já existente, preferível.

## D-Ω4C-RECON-08 — Ledger de estoque é IMUTÁVEL
O "✕ excluir movimento" do AutEM (ANALISE:163) é implementado como **movimento compensatório**, nunca DELETE físico
(`inventory.routes.ts:84-88`; saldo derivado `inventory.calculations.ts:48-51`). **Junta do PR-10.**

---

## Fronteiras irredutíveis confirmadas (levar a cada PR)
- **`prisma/**`/`migrations/**` = escopo proibido sem autorização explícita do dono por PR (§C4)** — toda extensão que exige
  coluna nova (`supplier_id`, `professional_id` em stock_movements, `source_type/source_id`, `notify_at/remind_before/visibility`,
  `Attachment{entity_type,entity_id}`) precisa de OK do dono no comando do PR. **Nenhuma migration destrutiva** (parada irredutível §C7.5).
- **`node-cron` / lib nova / S3 real / `exceljs` = dependência nova → junta-5 unânime + PD (§C7).** Reusar o scheduler in-process
  `job.worker.ts:86`; manter **CSV-BOM** (promover `AuditTenantPage.exportAuditCsv` a util) no lugar de `.xlsx`; S3 fica **INERTE**
  atrás de env (fronteira de ativação cloud).
- **LGPD/§2.8:** telemetria (GPS/IP/dispositivo) e anexos sensíveis — nunca vazar `tenant_id` externo, coordenada crua, `storage_key`,
  `refresh_token_hash` em resposta/auditoria; validar posse do `entityId` pelo tenant antes de anexar.
