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

## Emenda E1′ — correções do dev sucessor, antes do código (2026-11-11 06:34 SP)

Escrita por `dev-o6r12-cl` (Claude Opus, sucessor P3 do `dev-o6r12-cdx`), antes de mexer no código
correspondente (`D-EMENDA-ANTES-DO-CODIGO`). Leitura do dev, declarada (§A6); a junta pode desfazer.

- **E1.2′ (corrige a E1.2).** `SET search_path = pg_catalog, public` NÃO impede a sombra por
  `pg_temp`: para tabelas, o Postgres procura o esquema temporário PRIMEIRO sempre que ele não está
  escrito na lista. Sonda no `o6r12-pg`: a mesma função lê `sombra` com `pg_catalog, public` e `real`
  com `pg_catalog, public, pg_temp`. O que protege o carimbo hoje é a qualificação `public."..."`.
  Correção: as 2 funções passam a declarar `SET search_path = pg_catalog, public, pg_temp` (a forma
  da documentação do Postgres), e a qualificação fica. São 2 camadas, e cada uma sozinha basta; por
  isso a mutação que mata o teste tira as duas. O teste-dono é de comportamento, no drill: sob um
  papel com `TEMP`, uma tabela temporária `jurisdiction_profiles` forjada não muda o regime gravado.
- **E1.8′ (corrige a E1.8).** O código usa `FOR NO KEY UPDATE`, não `FOR UPDATE`. É a saída que a
  própria crítica mediu no R2-8: a trava não conflita com o `FOR KEY SHARE` da FK do processo, então a
  abertura NÃO espera o PATCH, e o gatilho grava o perfil confirmado no instante do INSERT (o PATCH
  ainda não confirmado não vale). Dois PATCHes do mesmo perfil continuam em fila. O teste-dono, no
  `-db`: com o PATCH aberto numa transação, uma abertura com `lock_timeout` de 2 s passa e grava o
  valor anterior; trocar `FOR NO KEY UPDATE` por `FOR UPDATE` deixa o teste vermelho.
- **E1.9′ (completa a E1.9).** O teste que registra o 23503 no lugar do 42501 (escrita cruzada e
  escrita sem contexto de organização, sob o papel de runtime) fica no `-db`, junto da C17.
- **E1.10′ (lugar dos testes, sem mudar critério).** Onde o v2 manda um critério para o drill (C4,
  C5, C6, C7, C7b, C14, C16, C23), o drill RELÊ e EXECUTA a migração numa base própria; o teste
  estático que só espelhava as âncoras das mutações sai (§3.0 item 1). A C19 mora em
  `tests/owner-portal-dossier-rls.test.ts` (com banco), não no snapshot-db: o molde do plano é esse
  arquivo, e o teste existente passa a afirmar a propriedade (R3).

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
