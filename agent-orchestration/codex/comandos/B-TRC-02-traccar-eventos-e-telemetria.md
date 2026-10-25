# B-TRC-02 — Traccar: eventos e telemetria veicular (ignição, alarmes, online/offline por viatura)

- **Tipo:** feature
- **Fase:** Execution (A5)
- **Trilha:** backend/raiz (+ overlay Docker de dev); sem frontend, sem mobile
- **Data:** 2026-10-19
- **Branch:** `feat/traccar-b-trc-02`
- **Autor:** `dev-trc02-opus` (Claude Opus 5.5, nível menor declarado, cobrindo o Codex)
- **Plano (norma única):** `docs/revisoes/TRACCAR/B-TRC-02-plano.md` (v2) + `docs/revisoes/TRACCAR/B-TRC-02-emenda-v2.1.md` +
  `docs/revisoes/TRACCAR/B-TRC-02-emenda-v2.2-escopo.md` + `docs/revisoes/TRACCAR/B-TRC-02-emenda-v2.3.md` +
  `docs/revisoes/TRACCAR/B-TRC-02-emenda-v2.4-acessos.md` (onde uma emenda muda a v2, vale a emenda). A v1 (`B-TRC-02-plano-v1.md`) fica como registro de medição.
- **Decisões do dono:** `D-TRC02-RESPOSTAS` (Q2 = Q3 = SIM) e a reversão "TRC-02 Q1 = Não" de 19/10, antes do merge (variante
  Q1 = NÃO, §Q1.7; o registro em `agent-orchestration/controle/decisoes.md` é do orquestrador).
- **Emenda do orquestrador (gate 3):** carimbos renumerados para `20260879000000_vehicle_telemetry_events` (A) e
  `20260880000000_validate_receipt_message_kind_check` (B), porque `20260878000000` é do B-SAN3-02.

## Objetivo

Receber o `event.forward` do Traccar 6.16.0 no mesmo listener privado do B-TRC-01 (`POST /ingest/traccar/v1/events`) e
conservar, por viatura e por organização, os eventos técnicos e os atributos veiculares allowlisted das posições numa
tabela nova `vehicle_telemetry_events` (ENABLE + FORCE RLS). Sem rota de leitura, sem tela, sem notificação, sem
WebSocket, sem escrita em `WorkOrder.mileage_*`.

## Regras do dono para o Traccar (inegociáveis)

Nunca `tenant_id` do payload como contexto; dispositivo não mapeado em quarentena; vínculo ambíguo falha fechado; token
nunca em código, log, query string, frontend ou payload público, comparado em tempo constante; nenhuma porta pública
nova; nunca os servidores públicos de demonstração.

## Escopo PERMITIDO / PROIBIDO

O do plano: v2 §7.1 ∪ §7.3, mais `tests/db-catalog-write-guard.test.ts` (uma entrada na allowlist, emenda R3-4) e os dois
caminhos da emenda v2.2 de escopo (`tests/helpers/o6r07c-census.ts`: 1 entrada em `CURINGAS_ACEITOS`;
`tests/san3-05-runtime-role-guard-db.test.ts:1016`: `118` → `119`), a tabela §6 da emenda v2.3 (migração A transacional, drill
`tests/traccar-event-migration-drill-db.test.ts`, G sem o G9, `ci.yml`, `mutations.mjs`, `docs/deployment.md`) e o §2.1 da emenda
v2.4 (`tests/san3-05-acessos-de-plataforma-guard.test.ts`: só o mapa `NOVAS` e o literal L0 `111` → `112`; edição R em
`src/integrations/traccar/traccar-ingestion.service.ts`; 1 caso -db em `tests/traccar-event-ingestion-db.test.ts`). O
PROIBIDO é o da v2 §7.4. `Kpis/**` congelado (`D-GOV-PROPORCIONAL`).

## Bateria de validação

A da v2 §9.7, com as réguas da emenda (R3-1 para os 5 arnês; contagens de §5.4 da emenda). O que é `-db` roda em
container Linux próprio (prefixo `dtrc02-`), nunca na base viva nem nas portas 5432/6379/3000/5173/5050/8899.

## Rastreabilidade

Relatório incremental: `docs/revisoes/TRACCAR/B-TRC-02-dev.md`. Mutações: `docs/revisoes/TRACCAR/B-TRC-02-evidencias/`.
Junta de segurança (v2 §10): inspetor + 3 cadeiras, unanimidade com veto, parecer do `agente-dba-guardiao`.
