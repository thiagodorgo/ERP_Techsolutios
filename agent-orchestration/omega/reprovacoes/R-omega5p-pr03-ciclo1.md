# R-omega5p-pr03-ciclo1 — REPROVAÇÃO PR-03 (ESTENDER tariffs), ciclo 1

> **Data:** 2026-07-26 · **Fatia:** Ω5P PR-03 (escopo público/privado + categoria de veículo via PriceTable, Rota P) · **Reprovador:** `critico-adversarial` (ataque à lógica de resolução/cobrança) · **Ciclo:** 1 (conserto cirúrgico; NÃO reabre a premissa — a Rota P permanece).

## Contexto
Junta ≥3: `omega5p-avaliador` → APROVADO_CONDICIONADO (só KPI); `agente-dba-guardiao` → APROVADO (migração aditiva reversível provada, 10 linhas legadas intactas, RLS forced, drift-zero); **`critico-adversarial` → REPROVADO** (2 CRÍTICOS de implementação que cobram dinheiro errado, mais F3/F4 ALTO e F8 desvio-de-plano). A migração e a arquitetura estão OK; a reprovação é de IMPLEMENTAÇÃO da resolução de tarifa (o que o motor de diárias do PR-07 vai consumir).

## Achados a sanar (bloqueantes = F1, F2; ALTO = F3, F4; plano = F8)

- **F1 [CRÍTICO] — data partida na resolução.** `tariff-resolution.ts:49-51` passa `input.date` só ao `scopedResolver` (janela da PriceTable); `tariffRepo.findApplicable(...)` NÃO recebe a data e `tariff.repository.ts:76` usa `new Date()` (now) para avaliar `tariff.validFrom/validTo` (`:142-143`). Tariff com janela própria (campo suportado, settável em `tariff.service.ts:89-90`) é avaliada no relógio de parede → não-determinístico + cobra fora de vigência. Fatal p/ I4/D-Ω5P-TAR-03 ("regra vigente na DATA DE ENTRADA"). **Conserto:** `findApplicable(..., asOf?: Date)` opcional (default `now`, preserva o freeze Ω3-a) e `resolveTariff` passa `input.date`. **+teste** que semeia Tariff COM janela própria e prova resolução por data (inclusive re-run determinístico).
- **F2 [CRÍTICO] — RN-TAR-01 burlável em tabela publicada.** `price-table.service.ts:107` só roda o overlap-check na transição `draft→published`. Tabela publicada segue editável (D-OMEGA2A) e `update()` aceita scope/vehicle_category/valid_from/valid_to → editar o bucket/janela de uma publicada cria sobreposição sem checagem. **Conserto:** rodar o overlap-check sempre que o status RESULTANTE for `published` E (transição de publicação OU algum campo de bucket mudou: scope/vehicle_category/valid_from/valid_to). **+teste**: PATCH de janela de tabela publicada p/ sobrepor → 409.
- **F3 [ALTO] — service-quote cego a escopo.** `service-quote.service.ts:357-360` (`resolvePublishedPriceTableIds`) devolve TODAS as publicadas sem filtrar scope/categoria → tabelas escopadas Ω5P entram no conjunto do ORÇAMENTO e podem mudar preço vivo. **Conserto (não-regressivo):** o caminho legado do service-quote resolve só o bucket legado (`scope IS NULL AND vehicle_category IS NULL`) — como tabelas escopadas não existiam antes, filtrá-las = comportamento byte-idêntico ao anterior. **+teste** provando que criar tabela escopada NÃO altera a resolução do orçamento legado.
- **F4 [ALTO] — `limit:100` capa o invariante.** `price-table-resolution.ts:26/113/174` buscam publicadas com `limit:100` → >100 tabelas/tenant: falso-negativo no overlap e miss no resolve. **Conserto:** filtrar por bucket/data NO SERVIDOR (query dedicada) em vez de página fixa; nunca depender do teto de página para invariante de cobrança. (Se a query dedicada for grande, no mínimo paginar todas as publicadas do bucket.)
- **F8 [MÉDIO/plano] — customer-bucket omitido no overlap.** `serviceKeysOf` (`price-table-resolution.ts:142`) chaveia só por `service_catalog_id`, ignorando `customer_id`; o plano §7(c) define o bucket como `(tenant, scope, vehicle_category, service_catalog_id, customer-bucket)`. Falso-positivo (recusa tabelas que diferem só pelo cliente). **Conserto:** incluir `customer_id` no bucket-key do overlap (alinha código × plano). Decidir/registrar se a janela-da-Tariff entra no overlap (F8 parte-1) — mínimo: documentar que o overlap usa a janela da PriceTable (conservador, fail-safe).

## Deferidos a D-record/risco-residual (NÃO bloqueiam; documentar)
- **F5 [MÉDIO]** RN-TAR-01 é read-then-write app-level sem lock/tx/constraint → fail-open sob 2 publish concorrentes. Único invariante da rodada sem backstop de banco. **D-Ω5P-TAR-04** (DB-EXCLUDE com btree_gist deferido) + registrar risco residual que o PR-07 herda.
- **F6 [MÉDIO]** prioridade escopo>categoria (`[SC,S∅,∅C,∅∅]`) é decisão de produto não-exposta; property-test é auto-confirmante. **Documentar** em D-Ω5P-TAR-03 + lint na UI PR-04 (avisar coexistência de parciais cross-bucket).
- **F7 [MÉDIO]** consulta sem categoria (veículo sem ID, D-Ω5P-09) + só tabelas categoria-específicas → `undefined` → subcobrança se o charging não falhar fechado. **Contrato:** PR-07 fail-closed em `undefined` + PR-04 avisar ausência de tabela geral. Registrar.

## Encaminhamento (protocolo §C7.4, ciclo 1)
Devolver ao `omega5p-dev-backend` (continua a mesma sessão via SendMessage). Corrigir **F1+F2 (bloqueantes, com teste)** + **F3+F4 (ALTO)** + **F8 (alinhar ao plano)**; documentar F5/F6/F7 como D-records/risco-residual. Re-verificar com `critico-adversarial` (mesmos vetores) + reconfirmar `omega5p-avaliador`. Só então fechar o KPI e mergear.

---

## Ciclo-2 (2026-07-26) — F2 residual CRÍTICO (reativação burla RN-TAR-01)

Re-verificação do `critico-adversarial` pós ciclo-1: **F1/F3/F4/F8 FECHADOS** (verificados no diff InMemory+Prisma; testes 24/24) e **F5/F6/F7 documentados**. MAS **F2 tem resíduo CRÍTICO empiricamente provado**: o gatilho `touchesBucketOrWindow` (`price-table.service.ts:111-118`) cobre scope/vehicle_category/valid_from/valid_to mas **NÃO inclui `is_active`**. Como `findPublishedInBucket` exige `is_active=true`, a **reativação** (is_active false→true) de uma tabela publicada recria a sobreposição sem checagem:
1. A publica [Jan-Dez] PUBLIC/CAR serviço S (preço 100). 2. PATCH A {is_active:false} (ok, desativar é seguro). 3. B publica mesmo bucket/janela/serviço → A inativa não é peer → B passa (preço 200). 4. PATCH A {is_active:true} → resultingStatus=published, isBecomingPublished=false, touchesBucketOrWindow=false → **guarda PULADA** → 2 tabelas ativas no mesmo bucket (RN-TAR-01 violada; resolveTariff cobra 200 em vez de 100).
Medido: `reativacao lancou 409? false | peers ativas no bucket: 2 | resolveu unit_price=200`.

**Conserto (1 linha + 1 teste):** incluir `is_active` no gatilho de RN-TAR-01 — rodar o overlap-check quando o resultado for `published` E `is_active` resultante = true E (transição de publicação OU **reativação [is_active false→true]** OU mudança de scope/vehicle_category/valid_from/valid_to). Desativar segue livre. `is_active` é o ÚNICO campo de aplicabilidade restante fora do gatilho. TESTE: reativação que recria sobreposição → 409.

**Encaminhamento:** dev-backend (ciclo-2, correção mínima) → re-verificar com o critico (fecha F2) → fechar KPI e mergear.
