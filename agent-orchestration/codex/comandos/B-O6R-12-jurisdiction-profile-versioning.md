# B-O6R-12 — regime normativo congelado na abertura do processo

- **Bloco:** B-O6R-12, item 24 do portão (`Ω6R-DAT-004`)
- **Ramo:** `fix/jurisdiction-profile-versioning`
- **Base medida:** `origin/main` `6f727afc0ed9eb40449d34cafb5ebf00a47c52f5`
- **Dev:** `dev-o6r12-cdx`, Codex 2, GPT-5.6 Sol (nível menor declarado)
- **Plano:** `C:/Users/thiag/erp-pausa-2026-10-03/planos/plano-B-O6R-12-v2.md`
- **Crítica:** `C:/Users/thiag/erp-pausa-2026-10-03/revisoes/crit-12-r2-plano.json` — APROVADO COM AJUSTES
- **Decisões do dono:** `D-PORTAO-9-RECOMENDACOES-1011` e `D-PORTAO-5-RECOMENDACOES-1111`

## Objetivo ratificado antes do código

O regime normativo do pátio é gravado no processo na abertura. Cobrança, prazos legais,
leilão, liberação, painel e portal do proprietário leem esse retrato. O backfill de processos
anteriores usa o valor atual do perfil. O ponteiro nulo do serviço de diária continua com
catch-up no ponteiro vivo; uma cópia não nula vence. O aceite provisório do item 24 fica
ratificado por estas decisões e pela crítica v2 executada.

## Emenda E1 — ajustes obrigatórios da crítica da rodada 2

Esta emenda antecede o código e integra os 4 achados médios e os 6 baixos ao plano:

1. A FK do serviço diário usa nome com até 63 bytes, igual ao esperado pelo Prisma:
   `impound_processes_tenant_id_regime_daily_service_catalog_i_fkey`.
2. As funções de gatilho qualificam tabelas com `public.` e declaram
   `SET search_path = pg_catalog, public`, impedindo sombra por `pg_temp`.
3. A auditoria inclui `{from,to}` para `name` e `release_requirements`, pois esses dados são
   permitidos e já públicos ao proprietário; `notes` continua somente em `changed_fields`.
4. Correção de retrato não nulo incorreto é operação excepcional por migração aditiva revisada,
   com trigger temporariamente desabilitado dentro de transação, censo e trilha; não nasce rota
   nem bypass de runtime neste bloco.
5. O drill C7b concede ao papel efêmero `CREATE` no schema `public` apenas durante a prova e o
   revoga no teardown; o papel permanece `NOSUPERUSER NOBYPASSRLS`.
6. A catraca R1–R4 filtra os falsos positivos medidos em `patios-dashboard`,
   `subscription-billing` e na porta do `owner-portal`, com motivo explícito na allowlist.
7. A mutação C23 troca somente a chamada da C7b por uma âncora única; a definição e a
   autoverificação permanecem intactas.
8. A janela do `FOR UPDATE` é aceita e testada: abertura concorrente pode esperar o PATCH e o
   gatilho grava o perfil confirmado após a espera. O diário registra o efeito.
9. O gatilho `BEFORE INSERT` pode devolver 23503 antes do `WITH CHECK` da RLS; a recusa
   cross-tenant permanece fail-closed e o teste registra essa mudança observável.
10. `regime_release_requirements` converte `JsonValue` para input JSON por clone/validação
    explícita, sem cast cego.

Qualquer necessidade fora desta emenda ou do §4 do plano volta para emenda revisada antes do
código (`D-EMENDA-ANTES-DO-CODIGO`).

## Escopo e execução

Valem integralmente o §4 (PERMITIDO/PROIBIDO), as fatias F1–F7, os critérios C1–C23 e a bateria
do plano v2, acrescidos da E1. `Kpis/**`, `frontend/**`, `mobile/**`, lockfiles e fixtures de
drift permanecem proibidos. `.github/workflows/ci.yml` muda somente nas duas linhas do `SUITES=`.

Cada fatia produz um commit `fix(jurisdiction): ...` com coautoria do Claude e atualiza
`docs/revisoes/SAN3/B-O6R-12-dev.md`. Todo teste novo tem vermelho-controle quando aplicável;
cada mutação literal roda isolada, produz `not ok` e é revertida.

## Estado da execução

- F0–F6b concluídas por `dev-o6r12-cdx`; F7 em validação final.
- O fechamento do item 24 é proposto na autoria e depende de PR, junta completa e merge.
- Pendências não bloqueantes preservadas: fuso vivo do pátio e fallback do portal para processo
  legado sem retrato; a ordem do vínculo de checklist foi devolvida à trilha CHECKLIST P1.
