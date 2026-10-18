# B-TRC-01 — Auditoria da reprovação do ciclo 2 e plano do ciclo 3

> **Papel:** `planejador-mestre` (identidade nova: `planejador-trc01-ciclo3`)
> **Modelo:** **Fable** (claude-fable-5-1) — modelo de topo, `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO` (dono, 2026-10-10)
> e `D-PLANEJADOR-MODELO-FABLE` (dono, 2026-08-11). Sem fallback acionado.
> **Data:** 2026-10-18
> **Objeto:** PR #426 (`feat/traccar-b-trc-01`), head julgado no ciclo 2 `2043c5840c8f60fe91538840aaefb3420a11cfe3`.
> **Ata reprovada:** `agent-orchestration/omega/juntas/J-B-TRC-01-ciclo2.md` — REPROVADO 2×1, um bloqueio: (c′)-P1.
> **Separação de papéis (§C7.4-bis):** não achei o defeito (a cadeira (c′) achou), não desenvolvo, não voto.
> **Regime:** ciclo 3 — só defeito de produto GRAVE reprova (§C7 item 8(2), `D-GOV-PROPORCIONAL`): perde dado, vaza dado
> entre organizações, quebra permissão ou erra dinheiro. Bloco de ingestão do Traccar = junta completa (inspetor + 3
> cadeiras, unanimidade), §C7 item 8(4).
> **Ordem do dono (2026-10-18, via orquestrador):** *"ataque só a c"* — o ciclo 3 CONSERTA o (c′)-P1 e só ele; ajustes
> e notas da (a′) e da (b′) vão para a lista de pendências a registrar (§4).

> Arquivo gravado seção a seção conforme medido (P1/P2). **Estado: COMPLETO** (nenhuma seção `EM APURAÇÃO`). **Veredito da auditoria: (c′)-P1 é DEFEITO REAL do produto, classe
> NÃO GRAVE (confirmada), com DADO PODRE no plano do ciclo 2 (janela enunciada só pelo lado de quem ganha a viatura).**
> **Recomendação: (ii) — conserto mínimo restrito ao P1, SEM migração, medido por protótipo (§3.9).**

---

## 0. Insumos lidos (com ref)

Tudo medido em `C:/Users/AMP/w-trc01` (só leitura; o ramo está em `e6b4a33a` = objeto `2043c584` + ata/votos) e por
`git show origin/main:<caminho>` onde indicado. Nada editado no repositório. O protótipo do conserto (§3.9) foi medido num worktree
MEU, detached no objeto (`C:/Users/AMP/w-plan-trc3`), removido no fim.

| Insumo | Ref/caminho | O que tirei |
|---|---|---|
| Ata | `agent-orchestration/omega/juntas/J-B-TRC-01-ciclo2.md` | REPROVADO 2×1; 1 bloqueio (c′)-P1, classe não grave; ajustes (a′)/(b′) viram pendência; as 3 perguntas do §C7.4-bis, com a (c) ("dado podre") deixada para esta auditoria |
| Voto (c′) | `votos/B-TRC-01-ciclo2/cadeira-c-voto.json` | P1 `bloqueia · dentro-do-bloco · não grave`; blame `d5a4f25b3`/`c32bd2cd6`; `findOperatorsForVehicleAt` 0 na merge-base |
| Evidência (c′) | `cadeira-c-evidencia.md` l.42–58 (esperado), l.60–100 (objeto, 31/33), l.102–137 (h1, 27/29), l.153–158 (achado), l.267–429 (sonda verbatim, md5 `2c30ca24…`; P1 em l.391–399) | a construção exata do P1 e os números |
| Votos (a′), (b′) | `cadeira-a-voto.json`, `cadeira-b-voto.json` | 1 ajuste (a′) e 5 notas (b′) — a lista do §4 |
| Código | `src/modules/field-dispatch/field-dispatch-prisma.repository.ts:26-50` · `field-dispatch.repository.ts:17-39` · `field-dispatch.types.ts:129-148` · `src/integrations/traccar/traccar-ingestion.service.ts:98-102,183-246` | a regra, o classificador, o mapa de motivos (`none→no_operator_at_fix_time`, `ambiguous→ambiguous_operator_at_fix_time`, `history_ambiguous→operator_history_ambiguous`), o chamador |
| Migração | `prisma/migrations/20260876000000_work_orders_vehicle_assigned_at/migration.sql` | o gatilho: troca → `now()`; `→ NULL` → `NULL`; legada → `now()` no 1º UPDATE |
| Testes | `tests/traccar-position-ingestion-db.test.ts` (helpers l.146–250; casos l.333–528, T-C1 l.421–448, T-C2 l.450–476, T-C3 l.478–528) · `tests/traccar-operator-at-fix-time.test.ts` (T-C4, 4 casos) | o molde dos casos novos e as asserções de motivo que mudam |
| Mutações | `docs/revisoes/TRACCAR/B-TRC-01-evidencias/mutations.mjs` l.84–96 (MUT-43, M-C1..M-C4, M-B*) | o formato do catálogo e o texto `find` de M-C1 que o conserto invalida |
| Plano do ciclo 2 | `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-01-ciclo2-auditoria-e-plano.md` §1.3, §2.4.1–2.4.5, §2.5 | a janela enunciada só pelo lado de quem GANHA a viatura; a tabela de cenários com UMA OS; a ordem com o 07c-b1 |
| Decisões do dono | `origin/main:agent-orchestration/controle/decisoes.md` l.2289–2296 (2026-09-08: "janela de tempo… nunca mapa estático, ou o trajeto de um técnico é atribuído a outro — erro de dado E exposição de dado pessoal"), l.3682 (`D-TRC01-VEHICLE-ASSIGNED-AT`, opção (i), períodos → B-TRC-03), l.2208–2285 (`D-TRACCAR-HTTP-PRIVADO-AWS`, "vínculo ambíguo falha fechado") | a norma que o P1 viola e o que já foi autorizado |
| Contrato | `API_CONTRACTS.md:96` | a frase de `operator_history_ambiguous` que ganha um "ou" |
| Pendências | `origin/main:agent-orchestration/controle/pendencias.md` (grep `P-TRC-`) | `P-TRC-VIATURA-PERIODOS` e `P-CI-LISTA-CURADA-6-PRE-EXISTENTES` **não existem** (confirma a nota 1 da (b′)) |
| Terreno | `git worktree list` · `docker ps` | w-jc2-b/w-jc2-b3 (resíduo da (b′), só reportado); Docker só com `erp-postgres`/`erp-redis` (base viva) → 0 trabalhos de outros |

## 1. Auditoria do bloqueio (c′)-P1

### 1.1 O que a cadeira mediu

Sonda `zz-jtrc01c2c-db.mts` (md5 `2c30ca24…`, l.391–399 do apêndice), **duas formas** (P = `RlsPrismaWorkOrderRepository.assign` do
produto; S = `UPDATE work_orders SET vehicle_id` sob `withTenantRls` pelo papel `NOSUPERUSER NOBYPASSRLS`), no objeto `2043c584` e
no h1 `5abdf83b`, cluster próprio:

1. Uma organização; V1 vinculada ao dispositivo d1; V2 sem vínculo. **OS1** com V1, despacho de **A** aceito; **OS2** com V1, despacho de
   **B** aceito (duas OS com a mesma viatura é estado que o produto permite — o caso "dois operadores com despacho aceito no fix" é teste
   do próprio bloco, l.361).
2. `Ta`, `Tb` tirados **antes** da troca. `fix(d1, Ta)` entregue antes da troca → `202/ambiguous_operator_at_fix_time`, 0 localização
   (**controle**: no instante, as duas OS tinham V1).
3. OS1 troca V1→V2 (P ou S).
4. `fix(d1, Tb)` — do **mesmo período** de `Ta` — entregue **depois** da troca → **`204`, `field_operator_locations` de B 0→1, A 0**.
   Igual nas formas P e S, no objeto e no h1 (`P1-atrasado … | NAO`, l.85, 91, 123, 129).
5. `fix(d1, Tc)` com `Tc` depois da troca → `204 → B` (correto: só OS2 tem V1).

Organização B semeada e nunca ingerida ficou `0/0` nas 33 linhas (nenhum vazamento entre organizações).

### 1.2 O que confirmei no código (só leitura, no objeto)

- `field-dispatch-prisma.repository.ts:34-47`: `WHERE … AND wo.vehicle_id = ${input.vehicleId}::uuid AND (wo.vehicle_assigned_at IS NULL OR
  wo.vehicle_assigned_at <= ${input.at}) …`. A viatura comparada é a **atual** da OS. Depois da troca, OS1 tem `vehicle_id = V2` e **sai do
  conjunto** para o fix de V1; OS2 (V1 desde o INSERT, `vehicle_assigned_at ≤ Tb`) entra; o classificador (`field-dispatch.repository.ts:24-39`)
  vê **um** operador → `single` → `locations.record` para B (`traccar-ingestion.service.ts:243-277`). O resultado é **determinístico pelo SQL**;
  a sonda só o tornou visível.
- A coluna `vehicle_assigned_at` (migração `20260876`) é "desde quando a OS tem a viatura **atual**". Não existe, em tabela nenhuma, "até quando
  a OS teve a anterior" nem "qual era a anterior" (o plano do ciclo 2, §2.4.2, já tinha medido: `work_order_assignments` é de operador;
  `work_order_events` é JSON fora da transação; sem histórico por período). Logo o eixo OS→viatura tem **uma ponta só**, como a (c′) nomeou.
- O gatilho (`migration.sql` l.17–27): troca → `now()`; `vehicle_id → NULL` → `vehicle_assigned_at := NULL`; linha legada → `now()` no 1º UPDATE.
  Consequência para o conserto (§3.3): uma OS que **perdeu** a viatura para outra tem `vehicle_assigned_at > T` para todo `T` anterior à
  troca — **esse é o sinal de "viatura desconhecida em T" que já existe no banco**, sem coluna nova. Uma OS que perdeu a viatura para
  **NULL** não deixa sinal (§3.8, resíduo declarado).
- Caminhos do produto que trocam a viatura: só `assign` (`work-order.service.ts:1682-1729` → `work-order-prisma.repository.ts:523-559`), a
  partir de `open` e de `assigned`; `update` não aceita viatura; `assign` **não zera** (`parseOptionalUuid` → `undefined`). A forma S
  (UPDATE direto) é o repositório chamado por fora do serviço (sonda; 07c-b1) — plausível, não hipotético.
- Origem: `git blame -L 39,43` (medido pela (c′)) → `d5a4f25b3` (2026-10-11, B-TRC-01) e `c32bd2cd6` (2026-10-17, ciclo 2);
  `findOperatorsForVehicleAt` 0 na merge-base `c260d362`. **Dentro-do-bloco**, sem discussão.

### 1.3 Real ou artefato? Classe?

**DEFEITO REAL DO PRODUTO.** Reproduzido pelo caminho do produto (`assign`) e pelo SQL sob o papel do runtime, nas duas formas, com controle
(o mesmo período entregue antes da troca dá `ambiguous`). Contraria a letra da regra do dono (3) de `D-TRACCAR-HTTP-PRIVADO-AWS` ("vínculo
ambíguo falha fechado") e a de 2026-09-08 ("janela de tempo… ou o trajeto de um técnico é atribuído a outro"). Nenhum teste nem mutação do
catálogo o pegava (T-C1 tem UMA OS; o cenário com competidor não existia).

**Classe pela régua do ciclo 3 (§C7 item 8(2)) — medida item a item:**

| Critério de "grave" | Medido | Resultado |
|---|---|---|
| vaza dado **entre organizações** | organização B semeada: `B(loc=0,rec=0)` nas 33 linhas do objeto e 29 do h1; o predicado tem `d.tenant_id = $t` e o `tx` está sob o GUC da organização confirmada | **não** — A e B são técnicos da **mesma** organização |
| quebra permissão | nenhuma rota, papel, permissão ou política tocada; o técnico B não ganha acesso a nada — ganha um **ponto** no trajeto | **não** |
| erra dinheiro | nada de dinheiro no caminho | **não** |
| perde dado | o fix **não é apagado**: fica no Traccar (fonte), o recibo é gravado (`rec=1`) e aponta para a linha de `field_operator_locations` com `recorded_at = Tb`, viatura conhecida pelo vínculo. O que está errado é o **dono** da linha (B, quando o fato é "A ou B"). Sob o comportamento correto (quarentena) o ponto também **não** estaria no trajeto de A — ficaria em `traccar_quarantine_items` esperando o B-TRC-03. A diferença entre observado e correto é: um ponto **possivelmente** de A **no trajeto de B** (erro de dado e exposição de localização **dentro da organização**), **recuperável** por operação (recibo ↔ localização ↔ viatura ↔ instante), e não um dado destruído | **não** — é **misatribuição recuperável**, não perda |

**Classe: NÃO GRAVE — confirmo a classificação da cadeira.** Duas ressalvas escritas, para que a classe não pareça leniência:
(1) a decisão do dono de 2026-09-08 nomeia exatamente esta classe como "erro de dado **e** exposição de dado pessoal" — é dado pessoal do
técnico A aparecendo como de B, **dentro** da organização; a régua do 8(2) fala em vazamento **entre organizações**, e é a régua que vale no
ciclo 3; (2) a misatribuição **não se autocorrige**: o recibo torna reenvios do mesmo evento `duplicate` (204), então a linha errada só sai
por operação (B-TRC-05) ou reconciliação (B-TRC-03). Exposição: exige (a) duas OS com despacho aceito **e a mesma viatura** (estado permitido,
mas de exceção), (b) troca de viatura numa delas, (c) fix tirado antes de (b) e entregue depois — raro em tempo real (janela de segundos),
plausível com rastreador que bufferiza fora de cobertura (GT06).

### 1.4 As três perguntas da reprovação (§C7.4-bis) e o dado podre do ciclo 2

- **(a) A composição cobriu a competência?** Sim. A (c′) achou o P1 com uma **forma própria** (o mandato pedia "uma forma que ninguém listou"),
  derivou o esperado do código **antes** de medir e publicou o controle. A máquina funcionou — "se está encontrando erro está tudo certo".
- **(b) Quem achou NÃO conserta.** O dev do ciclo 3 não pode ser a `jurado-trc01c2-c-opus` nem os devs do ciclo 2 (`dev-trc01-c2-codex`,
  `-argon`, `-gemini`), nem este planejador. As três cadeiras do ciclo 3 têm identidade nova (nenhuma das 6 instâncias do ciclo 2).
- **(c) Dado podre — SIM, e ele está no PLANO do ciclo 2, não no dev nem na cadeira.** O plano do ciclo 2 (§2.4.1) enunciou a propriedade como
  "a viatura da OS **no instante do fix** exige saber **desde quando** a OS tem a viatura atual" — a janela pelo lado de quem **recebe**. A tabela
  de cenários (§2.4.4) tem **uma OS só**: a linha 4 ("fix de V1 em T < t_s, entregue depois da troca → quarentena, perda aceita") era verdadeira
  **naquele mundo** porque, sem competidor, "a OS que perdeu V1 sai do conjunto" dá **zero** candidatos → `none`. Com um competidor que ainda
  tem V1, o mesmo "sai do conjunto" dá **um** candidato → `single` → grava. O plano deferiu o histórico por períodos ao B-TRC-03 (correto)
  mas tirou a consequência errada: assumiu que a ausência de histórico só custava **perda aceita**, nunca **atribuição ao outro**. O dev
  implementou o plano fielmente (T-C1 tem uma OS, como a tabela). Este é o "plano fraco que reintroduz o defeito que a junta acabou de pegar"
  de que o contrato fala — a classe do (c)-1 voltou pelo lado não analisado.
- **Sinal de não-convergência (§C7.4):** a classe se repetiu **com informação nova** (o lado que perde a viatura; o competidor). Não é
  repetição sem informação. O conserto do §3 fecha a classe pelos **dois lados** sem histórico: toda OS cuja viatura em T é desconhecida
  entra como ambígua, independentemente de ter ganho ou perdido.

## 2. Recomendação: (ii) — conserto mínimo, restrito ao P1, SEM migração

**Pela régua sozinha, (i) seria admissível:** o P1 é não grave (§1.3), e o 8(2) manda o bloco mergear com pendência nomeada. **Recomendo (ii)
mesmo assim, e a ordem do dono (*"ataque só a c"*) a torna obrigatória.** Os motivos, além da ordem:

1. **O conserto é pequeno e não toca o banco.** Três arquivos de `src/` (±15 linhas úteis), nenhuma migração, nenhuma coluna, nenhum motivo
   novo de quarentena, nenhuma rota. O sinal de "viatura desconhecida no instante" já existe (`vehicle_assigned_at > T`, §1.2); falta só
   lê-lo. Medido por protótipo neste plano (§3.9).
2. **Deixar como pendência custa mais depois.** Cada ocorrência grava uma linha **errada** em `field_operator_locations` com recibo que
   bloqueia reenvio; o B-TRC-03 teria de **limpar dado**, não só reconciliar quarentena. Quarentenar agora é reversível; gravar no outro não.
3. **Fecha a classe, não só o caso.** O (c)-1 (ciclo 1) e o P1 (ciclo 2) são a mesma classe — "o estado de AGORA decidindo o fato de ANTES" —
   pelos dois lados da troca. O conserto do §3 trata **toda** OS cuja viatura em T é desconhecida como ambígua; não há terceiro lado.
4. **O que fica de fora fica nomeado** (§3.8, §4): histórico por períodos (B-TRC-03), o caminho `vehicle_id → NULL` por SQL, o custo
   conservador (quarentena a mais em janelas de troca), o refinamento por operador. Nenhum deles é grave; todos têm dono.

**Pedido de autorização de migração: NÃO HÁ.** O ciclo 3 não toca `prisma/**` nem `migrations/**`. Se o dev concluir que precisa de migração,
**para e devolve ao orquestrador** — não existe autorização para isso neste ciclo. O texto de gatilho que fecharia o resíduo `→ NULL` está em
§3.8 como insumo do B-TRC-03, com a marca "não pedir agora".

**O que o ciclo 3 entrega:** o conserto (§3.3), 2 casos `-db` novos + 1 unitário novo + T-C1 com o motivo honesto (§3.5), 3 mutações (§3.6),
a tabela de cenários revista no plano do Traccar e 1 frase no contrato (§3.2), o relatório do dev com contagens de execução, e a junta de
ciclo 3 (§3.10). **Não entrega** os ajustes da (a′)/(b′) — vão para o §4, que o orquestrador grava.

## 3. Plano do ciclo 3 — desfecho (ii), conserto mínimo restrito ao P1

### 3.1 Objetivo · ator · fluxo · contrato · modelagem

- **Objetivo.** Para um fix `(V, T)`, **toda OS com despacho aceito ativo em T cuja viatura foi (re)atribuída DEPOIS de T** (`vehicle_assigned_at
  > T`) tem viatura **desconhecida** em T — pode ter sido V — e torna o histórico ambíguo (`operator_history_ambiguous`), tenha ela hoje V ou
  outra. `no_operator_at_fix_time` passa a significar "**sabe-se** que ninguém tinha V em T". O P1 vai à quarentena em vez de ao outro técnico.
- **Ator.** Dev de identidade nova, nível menor declarado (Opus / GPT-5.6 Sol / Argon, um só, uma tarefa paga por vez — `D-API-CLAUDE-SUSPENSA`),
  que não é a (c′), nenhum dev do ciclo 2 nem este planejador. Não julga achados, não vota.
- **Fluxo origem→destino.** Traccar → listener privado → fase 2 (`withTenantRlsBudget`, GUC da organização confirmada) → `findOperatorsForVehicleAt`
  (SQL com o novo predicado e a flag `vehicleAssignedAfterFix`) → `classifyOperatorsAtFixTime` → `single` grava em `field_operator_locations`;
  `none`/`ambiguous`/`history_ambiguous` gravam em `traccar_quarantine_items` com o motivo mapeado (`traccar-ingestion.service.ts:98-102`).
- **Contrato HTTP.** **Inalterado**: 204 / 202 / 409 / 422 / 503; lista fechada de motivos intacta (o CHECK não muda). `API_CONTRACTS.md:96` ganha
  um "ou": `operator_history_ambiguous` cobre também "OS com despacho ativo cuja viatura foi (re)atribuída depois do instante do fix".
- **Modelagem.** **Nenhuma.** Sem migração, sem coluna, sem backfill; `prisma/**` intocado. Delete lógico/Decimal/timestamptz: n/a (nada novo).
  Posições já gravadas sob a regra antiga: **nada é reescrito nem apagado** (plano §10.3); o relatório do dev declara isso em 1 linha (fecha a
  nota 3 da (b′) para este ciclo).

### 3.2 Escopo (permitido / proibido)

**Permitido (caminhos exatos):**

| Arquivo | Trabalho |
|---|---|
| `src/modules/field-dispatch/field-dispatch-prisma.repository.ts` | só `findOperatorsForVehicleAt` (l.26–50): comentário, SELECT ganha a flag, WHERE troca o par de predicados da viatura por `(wo.vehicle_id = $v OR wo.vehicle_assigned_at > $at)` — §3.3 |
| `src/modules/field-dispatch/field-dispatch.repository.ts` | só `classifyOperatorsAtFixTime` (l.17–39): `candidate.vehicleAssignedAfterFix === true ||` + comentário — §3.3 |
| `src/modules/field-dispatch/field-dispatch.types.ts` | só `OperatorAtFixTimeCandidate` (l.136–142): `+ readonly vehicleAssignedAfterFix: boolean \| null` + doc — §3.3 |
| `tests/traccar-position-ingestion-db.test.ts` | T-C1 (título + 2 motivos), **T-P1**, **T-P2** novos (§3.5); helpers do arnês existentes (`assignVehicle`, `newWorkOrder`, …) podem ser usados; nenhum caso do ciclo 1 muda |
| `tests/traccar-operator-at-fix-time.test.ts` | `candidate()` ganha `vehicleAssignedAfterFix: false`; caso novo (e) — §3.5 |
| `docs/revisoes/TRACCAR/B-TRC-01-evidencias/mutations.mjs` | M-C1 **re-derivada** (o `find` antigo deixa de existir) + M-P1a, M-P1b — §3.6 |
| `docs/revisoes/TRACCAR/PLANO_TRACCAR.md` | §4.2 (parágrafo "Operador no instante": a OS entra se tem a viatura agora OU se `vehicle_assigned_at > fixTime`, e este caso é `operator_history_ambiguous`; o último parágrafo, "um fix atrasado de V1 também falha fechado", ganha "— e, se outra OS ainda tiver V1, o fix NÃO vai para ela"); §8.6 (3 casos); §8.9 (M-C1 re-derivada, M-P1a, M-P1b); §3.1 item 6 (1 frase: a coluna também serve de sinal de desconhecimento) |
| `API_CONTRACTS.md:96` | a frase do contrato (§3.1) |
| `docs/revisoes/TRACCAR/B-TRC-01-ciclo3-dev.md` (novo) + `B-TRC-01-dev.md` (seção `## Ciclo 3 — <data>`, 5 linhas, como a do ciclo 2) | relatório incremental: bateria, contagens de execução real, mutações, vermelho-controle, "nada reescrito", limpeza |
| `agent-orchestration/codex/comandos/B-TRC-01-traccar-posicao-no-mapa.md` | seção `## Ciclo 3 — só o (c′)-P1` com escopo e bateria (molde: a do ciclo 2, l.160–170) |
| `.claude/agents/especialistas/jurado-trc01-{a,b,c}3-*.md` + espelho `.agents/agents/especialistas/` | 3 corpos novos (fábrica, nível menor), `sync-agent-agents.mjs` |
| `agent-orchestration/omega/juntas/**` | mandatos, votos, evidências, ata do ciclo 3, `R-B-TRC-01-ciclo2.md` |
| `agent-orchestration/controle/pendencias.md`, `decisoes.md` | as pendências do §4 — **pelo orquestrador**, no PR do bloco ou no PR semanal de registro (8(3)) |

**Proibido:** `prisma/**` e `migrations/**` (sem autorização neste ciclo — §2); `.github/workflows/ci.yml` **inteiro** (o comentário 363→389 é
pendência, ordem do dono); `src/integrations/traccar/**`; `src/database/rls.ts`; `src/modules/work-orders/**`; `src/modules/field-dispatch/field-dispatch.service.ts`;
qualquer outro `src/`; qualquer outro teste (em particular `tests/field-dispatch*`, `tests/work-order*`, os 5 casos `-db` do ciclo 1 e T-C2/T-C3);
o CHECK de `reason`; `Kpis/**`; `package.json`/lockfiles; o worktree `C:/Users/AMP/w-07cb1`; qualquer "melhoria" fora do P1 (ex.: refinar por
operador — §3.8).

### 3.3 O conserto — literal (diff do protótipo deste planejador sobre o objeto `2043c584`; o dev reproduz, não copia cegamente)

```diff
diff --git a/src/modules/field-dispatch/field-dispatch-prisma.repository.ts b/src/modules/field-dispatch/field-dispatch-prisma.repository.ts
index d76251ff..3d1b3cb8 100644
--- a/src/modules/field-dispatch/field-dispatch-prisma.repository.ts
+++ b/src/modules/field-dispatch/field-dispatch-prisma.repository.ts
@@ -28,4 +28,8 @@ type PrismaExecutor = PrismaClient | Prisma.TransactionClient;
 // despachos cuja janela contém o instante: `accepted_at ≤ at` e `at` antes do primeiro entre `completed_at`,
 // `cancelled_at` e `failed_at` que não for nulo. A regra de elegibilidade é `classifyOperatorsAtFixTime`.
+// Ciclo 3 (J-B-TRC-01-ciclo2, (c′)-P1) — a OS entra como candidata se tem a viatura AGORA ou se a viatura dela foi
+// (re)atribuída DEPOIS do instante (`vehicle_assigned_at > at`): o que ela tinha no instante é desconhecido — pode ter
+// sido esta — e o classificador a trata como histórico ambíguo. `vehicleAssignedAfterFix` nasce no SQL, da MESMA
+// expressão que a inclui, para a borda de microssegundos não divergir entre o banco e o Node.
 export async function findOperatorsForVehicleAt(
   tx: Prisma.TransactionClient,
@@ -36,10 +40,10 @@ export async function findOperatorsForVehicleAt(
            d.operator_assigned_at AS "operatorAssignedAt",
            d.accepted_at AS "acceptedAt",
-           wo.vehicle_assigned_at AS "vehicleAssignedAt"
+           wo.vehicle_assigned_at AS "vehicleAssignedAt",
+           (wo.vehicle_assigned_at > ${input.at}) AS "vehicleAssignedAfterFix"
       FROM field_dispatches d
       JOIN work_orders wo ON wo.tenant_id = d.tenant_id AND wo.id = d.work_order_id
      WHERE d.tenant_id = ${input.tenantId}::uuid
-       AND wo.vehicle_id = ${input.vehicleId}::uuid
-       AND (wo.vehicle_assigned_at IS NULL OR wo.vehicle_assigned_at <= ${input.at})
+       AND (wo.vehicle_id = ${input.vehicleId}::uuid OR wo.vehicle_assigned_at > ${input.at})
        AND d.accepted_at IS NOT NULL
        AND d.accepted_at <= ${input.at}
diff --git a/src/modules/field-dispatch/field-dispatch.repository.ts b/src/modules/field-dispatch/field-dispatch.repository.ts
index 9b902773..0f500b87 100644
--- a/src/modules/field-dispatch/field-dispatch.repository.ts
+++ b/src/modules/field-dispatch/field-dispatch.repository.ts
@@ -20,5 +20,6 @@ import type {
 // despacho na janela com `operator_assigned_at` ou `vehicle_assigned_at` nulo (linha anterior à migração), ou com a
 // atribuição do operador posterior ao aceite (reatribuído sem novo aceite), torna o histórico ambíguo e manda a posição
-// à quarentena, mesmo que haja outro elegível. Zero
+// à quarentena, mesmo que haja outro elegível. Idem a OS cuja viatura foi (re)atribuída DEPOIS do instante
+// (`vehicleAssignedAfterFix`, ciclo 3): o que ela tinha no instante é desconhecido. Zero
 // operador elegível → nenhum; mais de um operador distinto → ambíguo; exatamente um → ele.
 export function classifyOperatorsAtFixTime(candidates: readonly OperatorAtFixTimeCandidate[]): OperatorAtFixTime {
@@ -26,4 +27,5 @@ export function classifyOperatorsAtFixTime(candidates: readonly OperatorAtFixTim
     candidates.some(
       (candidate) =>
+        candidate.vehicleAssignedAfterFix === true ||
         candidate.vehicleAssignedAt === null ||
         candidate.operatorAssignedAt === null ||
diff --git a/src/modules/field-dispatch/field-dispatch.types.ts b/src/modules/field-dispatch/field-dispatch.types.ts
index 1028de64..e87add19 100644
--- a/src/modules/field-dispatch/field-dispatch.types.ts
+++ b/src/modules/field-dispatch/field-dispatch.types.ts
@@ -134,5 +134,9 @@ export type FindOperatorsForVehicleAtInput = {
 };

-/** Um despacho da viatura cuja janela contém o instante: aceito até o instante e não encerrado nele. */
+/**
+ * Um despacho cuja janela contém o instante (aceito até ele e não encerrado nele) de uma OS que tem a viatura AGORA ou
+ * cuja viatura foi (re)atribuída DEPOIS do instante. `vehicleAssignedAfterFix` é calculado no SQL (`vehicle_assigned_at
+ * > at`; `null` quando a OS não tem data): `true` = o que a OS tinha no instante é desconhecido → histórico ambíguo.
+ */
 export type OperatorAtFixTimeCandidate = {
   readonly operatorUserId: string;
@@ -140,4 +144,5 @@ export type OperatorAtFixTimeCandidate = {
   readonly acceptedAt: Date;
   readonly vehicleAssignedAt: Date | null;
+  readonly vehicleAssignedAfterFix: boolean | null;
 };

```

**Por que assim, e não de outro jeito:**

| Alternativa | Por que não (no ciclo 3) |
|---|---|
| Tabela de períodos `work_order_vehicle_periods` (a forma completa) | tabela nova + FORCE RLS + política + gatilho + backfill + L0 111→112 + parecer de guardião + autorização do dono. É o conserto **certo** e já tem dono (B-TRC-03, `P-TRC-VIATURA-PERIODOS`); não é o **mínimo** que a ordem "ataque só a c" pede |
| Colunas `previous_vehicle_id/from/until` em `work_orders` | migração (autorização + guardião) para cobrir **uma** troca e falhar fechado na segunda — meia-tabela de períodos com o custo inteiro de processo |
| Mudar o gatilho para carimbar `now()` no `→ NULL` | migração (`CREATE OR REPLACE FUNCTION`); fecha só o resíduo §3.8-(a), que o produto não alcança (`assign` não zera). Fica como insumo do B-TRC-03 |
| Decidir a flag no Node (`vehicleAssignedAt > at`) em vez de no SQL | o Node vê `Date` em **ms**, o banco guarda **µs** (P3 da (c′): resto de 910 µs). Uma linha que o SQL incluiu por `vaa > at` poderia ser lida pelo Node como `vaa <= at` e virar **dona** de uma viatura que não tem — o P1 pela borda. A flag nasce da **mesma expressão** que inclui a linha |
| Refinar: OS desconhecida do **mesmo** operador que o único dono não gera ambiguidade | correto em tese, reduz quarentena a mais; mas é regra nova, muda o classificador em mais um eixo, e não é o P1. Pendência (§3.8-(c)) |
| Manter o predicado antigo `(vaa IS NULL OR vaa <= at)` na perna do dono | redundante: a linha com `vehicle_id = V` e `vaa > at` já entra pela outra perna e sai `history_ambiguous` pela flag; manter o predicado só esconderia que **M-C1 deixou de morder** (§3.6) |

**Semântica resultante (a régua da cadeira (c″)) — fix `(V, T)`, OS com despacho aceito ativo em T:**

| Estado da OS em relação a T | Entra? | Classe do candidato |
|---|---|---|
| `vehicle_id = V` e `vaa ≤ T` | sim | **dona** de V em T |
| `vehicle_id = V` e `vaa IS NULL` (legada) | sim | `history_ambiguous` (regra do ciclo 2, mantida) |
| `vehicle_id = V` e `vaa > T` (ganhou V depois) | sim | `history_ambiguous` (**mudou**: era "não entra" → `none`) |
| `vehicle_id ≠ V` (não nulo) e `vaa > T` (perdeu algo depois — talvez V) | **sim** (**novo**) | `history_ambiguous` — **é o P1** |
| `vehicle_id ≠ V` e `vaa ≤ T` | não | sabe-se que não tinha V em T |
| `vehicle_id IS NULL` e `vaa IS NULL` | não | sem sinal — resíduo §3.8-(a) |

Qualquer `history_ambiguous` no conjunto → `operator_history_ambiguous`; senão, 0 donos → `no_operator_at_fix_time`, 2+ operadores distintos
→ `ambiguous_operator_at_fix_time`, 1 → grava.

### 3.4 Tabela de cenários revista — o que MUDA de motivo e o que não muda

Base: os cenários C1–C9 e P1–P3 da (c′) (evidência l.44–58), mais três novos. "Ciclo 2" = medido pela (c′) no objeto; "ciclo 3" = esperado
sob o conserto (§3.9 traz o medido no protótipo). **Toda mudança é de motivo dentro da quarentena; nenhuma linha passa de quarentena para
204, e exatamente uma (P1) passa de 204 para quarentena.**

| # | Cenário (OS de A com V1, despacho aceito; `t_s` = troca) | Ciclo 2 | **Ciclo 3** | Por quê |
|---|---|---|---|---|
| C1 | V1→V2 em `t_s`; fix V2 em `T<t_s`, entregue depois | `no_operator` | **`operator_history_ambiguous`** | A ganhou V2 depois de T: o que tinha em T é desconhecido, não "ninguém" |
| C2 | fix V2 em `T>t_s` | 204 → A | 204 → A | — |
| C3 | fix V1 em `T>t_s` | `no_operator` | `no_operator` | A é V2 desde `t_s ≤ T`: sabe-se que não tinha V1 |
| C4 | fix V1 em `T<t_s`, entregue depois (o ponto real de A) | `no_operator` ("perda aceita") | **`operator_history_ambiguous`** | mesmo sinal de C1; continua perda aceita, com o motivo honesto; B-TRC-03 recupera |
| C5 | V1→V2→V1; fix V1 em `T∈(t_s,t_volta)` / depois | `no_operator` / 204 | **`operator_history_ambiguous`** / 204 | `vaa = t_volta > T` |
| C6 | legada (`vaa` nulo) / após 1º UPDATE: posterior / anterior | `history_ambiguous` / 204 / `no_operator` | `history_ambiguous` / 204 / **`operator_history_ambiguous`** | `vaa = t_upd > T` |
| C7 | forja de `vaa` pelo papel; fix V2 antes da troca; INSERT forjado | ignorada / `no_operator` / `now()` | ignorada / **`operator_history_ambiguous`** / `now()` | gatilho intacto; motivo como C1 |
| C8 | mesma viatura (assign / UPDATE igual) | `vaa` inalterada; 204 | idem | `IS DISTINCT FROM` |
| C9 | `vehicle_id = NULL` (só S): fix V1 / volta: anterior / posterior | `no_operator` / `no_operator` / 204 | `no_operator` / **`operator_history_ambiguous`** / 204 | `→ NULL` não deixa sinal (§3.8-(a)); a volta deixa |
| **P1** | OS1 (A) e OS2 (B) com V1; fix `Tb` antes da troca; OS1 → V2; entrega depois | **204 → B** (o achado) | **`operator_history_ambiguous`, locA 0, locB 0** | OS1 tem `vaa = t_s > Tb`: desconhecida em `Tb` → ambíguo. Antes da troca: `ambiguous` (igual); depois: 204 → B (igual) |
| P2 | V1 passa de OS1 (A, V1→V2 em `t_s`) para OS2 (B, V3→V1 em `t_s2`): `T1<t_s` / `T∈(t_s,t_s2)` / `T>t_s2` | `no_operator` / `no_operator` / 204 → B | **`history_ambiguous`** / **`history_ambiguous`** / 204 → B | em `T1` as duas são desconhecidas; em `T2` OS2 é desconhecida (`vaa = t_s2 > T`) |
| P3 | borda: `T = vaa` truncado a ms (resto 910 µs) / `T = vaa + 1 ms` | `no_operator` / 204 | **`operator_history_ambiguous`** / 204 | `vaa > T` no SQL é verdadeiro no truncado; a flag é do SQL, por isso coerente |
| **N1** (novo, T-P2) | OS2 de B com **V3**, troca V3→V2 **depois** de T; fix V1 em T / em `T2 >` troca | 204 → A / 204 → A | **`operator_history_ambiguous`** / 204 → A | o custo conservador, declarado: sem períodos, OS2 em T é desconhecida |
| **N2** (novo) | OS2 do **mesmo** A com V3→V2 depois de T; fix V1 em T | 204 → A | **`operator_history_ambiguous`** | não refinado por operador neste ciclo (§3.8-(c)) |
| **N3** (novo, **resíduo**) | OS1 (A) e OS2 (B) com V1; OS1 `→ NULL` por SQL depois de T; fix V1 em T | 204 → B | **204 → B (NÃO consertado)** | sem sinal no banco; não alcançável pelo `assign`; §3.8-(a), pendência |

### 3.5 Testes (baseline N → meta M) e vermelho-controle

**Baseline N = 129** casos nas 15 suítes do Traccar (medido pela (c′) no objeto, skipped 0; 13 `-db`/sem banco do ciclo 1 + 2 unitárias do
ciclo 2). **Meta do ciclo 3: M ≥ 132** (+2 `-db`, +1 unitário), fail 0, skipped 0, com **4 vermelhos-controle** medidos contra o src do objeto
(`git show 2043c584:<caminho>` copiado por cima, depois restaurado). A razão M ≥ 2N do papel vale para o bloco (de 0 para ≥132); num ciclo de
conserto o que conta é: **todo caso novo ou alterado fica vermelho sem o conserto**.

| Teste | Onde | O que prova | Vermelho-controle (src do objeto) |
|---|---|---|---|
| **T-P1** *"a OS que tinha a viatura no instante do fix e a perdeu depois continua na janela — o fix ambíguo vai à quarentena, não ao outro técnico"* | `tests/traccar-position-ingestion-db.test.ts`, depois de T-C3 | o cenário **exato** da sonda da (c′): `world` (OS1, A, V1) + OS2 com a **mesma** V1 e despacho de B aceito; `whileBothHadV1`, `stillBothHadV1`; `ingest(device, whileBothHadV1)` → `ambiguous_operator_at_fix_time` (controle interno); `assignVehicle(OS1 → V2)`; `ingest(device, stillBothHadV1)` → **`operator_history_ambiguous`**, `locationsOf(B) = 0`, `locationsOf(A) = 0`; `ingest(device, afterSwap)` → `stored`, `locationsOf(B) = 1` | a 2ª asserção recebe `{kind: "stored"}` e `locationsOf(B) = 1` (o P1) |
| **T-P2** *"OS de OUTRA viatura que trocou de viatura depois do fix torna o instante desconhecido — quarentena, nunca atribuição pelo estado de agora"* | idem | N1: OS2 (B, V3) troca V3→V2 **depois** de `beforeSwap`; `ingest(V1, beforeSwap)` → `operator_history_ambiguous`, 0 localização; `ingest(V1, afterSwap)` → `stored` → A | a 1ª asserção recebe `stored` → A |
| **T-C1** (alterado) *"… fix atrasado da viatura nova vai à quarentena (histórico ambíguo)"* | idem, l.421–448 | só os **motivos** das asserções 1 e 4 mudam: `no_operator_at_fix_time` → `operator_history_ambiguous` (C1 e C4); a 3ª (`w.device, afterSwap`) continua `no_operator_at_fix_time` (C3); contagens iguais | as asserções 1 e 4 recebem `no_operator_at_fix_time` |
| **T-C4(e)** (unitário) *"viatura (re)atribuída depois do fix torna o histórico ambíguo, mesmo ao lado de um candidato datado"* | `tests/traccar-operator-at-fix-time.test.ts` | `[datado, {vehicleAssignedAfterFix: true}]` → `history_ambiguous`; `[{true}]` → `history_ambiguous`; `[{vaa: null, flag: null}]` → `history_ambiguous`; `candidate()` passa a ter `vehicleAssignedAfterFix: false` e os 4 casos antigos continuam iguais | recebe `ambiguous` / `single` / `history_ambiguous` (só o 3º passa) |

Sem mudança: T-C2 (legada), T-C3 (gatilho), T-B1, T-B2, os 17 casos do ciclo 1 (nenhum envolve troca de viatura), `tests/field-dispatch*`,
`tests/work-order*` (366). O dev confirma por `git diff --stat` que **só** os 2 arquivos de teste nomeados mudam.

### 3.6 Mutações (cada uma sozinha; âncora única; `tsc` ec; TAP do caso; restauro por `git checkout`, hash = blob)

| Mutação | Edição (forma que compila) | Fica vermelho |
|---|---|---|
| **M-P1a** | `field-dispatch-prisma.repository.ts`: `(wo.vehicle_id = ${input.vehicleId}::uuid OR wo.vehicle_assigned_at > ${input.at})` → `wo.vehicle_id = ${input.vehicleId}::uuid` (a OS que perdeu a viatura sai do conjunto) | **T-P1** (204 → B), **T-P2** (204 → A) e **T-C1** pela 4ª asserção (C4: a OS que perdeu V1 sai do conjunto → `no_operator`); as asserções 1–3 do T-C1 continuam verdes (a OS que ganhou V2 entra por `vehicle_id = V2` e a flag a torna ambígua). Medido: §3.9 |
| **M-P1b** | `field-dispatch.repository.ts`: remover a linha `candidate.vehicleAssignedAfterFix === true \|\|` | **T-C1** (1ª asserção: `stored` → A), **T-P1** (motivo vira `ambiguous_operator_at_fix_time` — ainda quarentena, mas o motivo acusa), **T-P2** (`stored`), **T-C4(e)** |
| **M-C1′** (M-C1 re-derivada) | `field-dispatch-prisma.repository.ts`: `(wo.vehicle_assigned_at > ${input.at}) AS "vehicleAssignedAfterFix"` → `(wo.vehicle_assigned_at > now()) AS "vehicleAssignedAfterFix"` (flag sempre falsa: prova que a flag nasce no SQL e é consumida) | os mesmos de M-P1b |
| M-C2, M-C3, M-C4, MUT-43 (catálogo) | **inalteradas**; o dev re-executa as 4 para mostrar que continuam mordendo (`find` de M-C2 e MUT-43 ainda existem; M-C3/M-C4 são da migração) | como no ciclo 2 |

No catálogo (`mutations.mjs`), a entrada **M-C1** troca o `find`/`replace` pela forma M-C1′ (o texto antigo `AND (wo.vehicle_assigned_at IS
NULL OR wo.vehicle_assigned_at <= ${input.at})` deixa de existir — uma mutação cujo `find` não casa "não mede", lição MUT-10/23/13); M-P1a e
M-P1b entram como entradas novas com `tests: T.ing` (+ o unitário em M-P1b).

### 3.7 Bateria de validação (ordem do dev; testes primeiro)

Worktree novo com `npm ci` próprio (sem junction, §C7.1-ter(c)); o que é `-db` roda em container Linux próprio
(`bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh <worktree> "<comando>"`: Postgres 16 + Redis 7 descartáveis, `npm ci` e
`migrate deploy` dentro do container, tudo removido pelo nome), **nunca** a base viva nem as portas 5432/6379/3000/5173/5050/8899.

1. `npm run check` · `npm run lint` (o tipo novo é obrigatório no candidato: um `candidate()` de teste sem a flag **não compila** — é o guard de que
   ninguém esquece a flag).
2. Unitários: `node --test --import tsx tests/traccar-operator-at-fix-time.test.ts tests/traccar-rls-budget-order.test.ts` → 5 + 4 (T-C4 passa de 4 para 5 casos).
3. Linux: as 15 suítes do Traccar (`tests/traccar-*.test.ts`), `--test-reporter=tap` → **≥ 132 tests, fail 0, skipped 0** (publicar os 3
   números). `traccar-dev-topology` sem Docker dentro do container é limite conhecido do ciclo 2 (9 casos) — reexecutar isolado onde há Docker, como antes.
4. **Vermelho-controle** (§3.5): copiar por cima os 3 arquivos de `src/modules/field-dispatch/` do objeto (`git show 2043c584:<caminho>`), rodar
   `tests/traccar-position-ingestion-db.test.ts` + o unitário → T-P1, T-P2, T-C1 e T-C4(e) vermelhos **nas asserções nomeadas** (publicar as linhas
   `not ok` + `expected/actual`); restaurar (`git checkout -- src`), rodar de novo → verde.
5. Mutações (§3.6): M-P1a, M-P1b, M-C1′, M-C2, M-C3, M-C4, MUT-43 — cada uma: âncora única (`grep -c`), `tsc` ec, TAP do caso vermelho, restauro
   (`git hash-object` = blob do HEAD).
6. Forma do job `backend-postgres` (a lista `SUITES=` do `ci.yml` **sem editá-lo**), 1× no container: `skipped 0`, denominador medido (esperado 389 + 2
   = **391**; o comentário da l.282 continua dizendo 363 — é a pendência `P-TRC-CI-COMENTARIO-DENOMINADOR` do §4, **não** se conserta aqui).
7. `npm test` (forma do job `backend`, Linux, `DATABASE_URL` presente): `fail 0`, `skipped 2` (os dois nomeados pelo runner).
8. `tests/field-dispatch*` + `tests/work-order*`: 366/366, `git diff --stat` dos dois globs vazio.
9. `npm run build` · `node scripts/sync-agent-agents.mjs --check` · `git diff --check` · `node --check Kpis/app.js` (sem editar `Kpis/`).
10. Smoke vertical `scripts/traccar-dev-demo.mjs` (compose por digest, loopback, `down -v`): 1 recibo, 1 localização, reenvio = duplicata, pin no
    mapa — sem mudança esperada (a OS do demo nasce por INSERT com viatura → `vaa ≤ fix` → dona).
11. Limpeza (§C5) em 1 linha: containers do dev = 0, worktree removido por `git worktree remove --force`, scratch da subpasta.
12. PR #426 atualizado (push no mesmo ramo; `git pull --rebase origin main` antes), **sem `Kpis/*`**; corpo: objetivo do ciclo 3 ("só o (c′)-P1"),
    bateria com contagens reais, vermelho-controle, mutações, "nada reescrito", ponteiro para este plano e para a ata do ciclo 2.

### 3.8 Resíduos declarados (não entram no ciclo 3; têm dono no §4)

- **(a) `vehicle_id → NULL` por SQL não deixa sinal** (N3): o gatilho zera `vehicle_assigned_at`. Uma OS que **perdeu** V1 para NULL depois de T não
  entra, e um competidor com V1 vira dono. Não alcançável pelo `assign` (`parseOptionalUuid`); só por UPDATE direto. Fecha com a tabela de períodos
  (B-TRC-03) — ou, se o B-TRC-03 preferir o remendo, com `CREATE OR REPLACE FUNCTION` do gatilho carimbando `now()` também no `→ NULL` (a coluna
  passaria a significar "desde quando a OS está neste estado de viatura"). **Texto pronto, NÃO pedir agora** (é decisão do planejamento do B-TRC-03):
  *"Autorizo, no B-TRC-03, a migração aditiva que substitui a função `work_order_vehicle_assigned_at()` para gravar `now()` também quando
  `vehicle_id` passa a NULL (sem coluna nova, sem backfill, `SECURITY INVOKER`, rollback = repor a função do `20260876`)."*
- **(b) Custo conservador** (N1): toda OS com despacho ativo que troca de viatura depois de T torna **todo** fix em T da organização
  `operator_history_ambiguous` até que haja histórico por período. Em tempo real a janela é de segundos; com rastreador bufferizado, pode
  quarentenar fixes que o B-TRC-03 depois atribui. É falha fechada por desenho, não defeito; o B-TRC-05 (operação da quarentena) vai **ver** esses
  episódios.
- **(c) Refinamento por operador** (N2): OS desconhecida do **mesmo** operador que o único dono não precisaria gerar ambiguidade. Regra nova; fora
  do P1; dono B-TRC-03.
- **(d) C4 continua perda aceita** (agora com motivo honesto): o ponto real de A, tirado antes da troca e entregue depois, vai à quarentena. Só o
  histórico por período atribui corretamente.

### 3.9 Protótipo medido por este planejador (worktree detached `C:/Users/AMP/w-plan-trc3` em `2043c584`, container Linux descartável)

O conserto do §3.3 e os testes do §3.5 foram **aplicados num worktree meu** (nunca em `w-trc01` nem na árvore principal) e executados por
`teste-linux.sh` (Postgres 16 + Redis 7 próprios, `npm ci` e `migrate deploy` dentro do container, removidos pelo nome). Duas rodadas:
11:16:56Z→11:22:39Z e 11:24:55Z→11:26:23Z (2026-10-18). Diff aplicado: **5 arquivos, +89/−8** (3 de `src/`, 2 de `tests/`). Logs:
`<scratchpad>/plan-trc3/proto-run.log` e `proto-run2.log`. **Nada disto é insumo de voto** — a (c″) re-executa (P3); é prova de que o plano não
é hipótese.

| Medição | Comando (no container, `/w`) | Resultado |
|---|---|---|
| Tipos | `npx tsc -p tsconfig.json --noEmit` | **ec 0** |
| Verde (2×) | `node --test --import tsx --test-reporter=tap tests/traccar-position-ingestion-db.test.ts tests/traccar-operator-at-fix-time.test.ts` | **27/27, fail 0, skipped 0** nas duas (22 `-db` + 5 unitários) |
| **Vermelho-controle** (src dos 3 arquivos = `git show 2043c584:…`) | idem | **23/27, fail 4**: T-C4(e) `expected history_ambiguous / actual ambiguous` · T-C1 `expected operator_history_ambiguous / actual no_operator_at_fix_time` · **T-P1 `expected quarantined operator_history_ambiguous / actual stored`** (o P1 da (c′), reproduzido pelo teste) · T-P2 `expected quarantined / actual stored` |
| M-P1a (sem a perna `OR vaa > at`) | `sed` + idem | **24/27, fail 3**: T-C1 (`actual no_operator_at_fix_time` — pela construção, a 4ª asserção/C4; as 3 primeiras passam), T-P1 (`actual stored`), T-P2 (`actual stored`) |
| M-P1b (classificador sem a flag) | idem | **23/27, fail 4**: T-C4(e), T-C1, T-P1, T-P2 |
| M-C1′ (flag `> now()` no SQL) | idem | **24/27, fail 3**: T-C1, T-P1, T-P2 (o unitário não vê SQL — esperado) |
| Regressão Traccar | `node --test … $(ls tests/traccar-*.test.ts)` (15 suítes) | **132 tests** (129 + 3), 123 pass, **9 fail — todos de `traccar-dev-topology`** (compose/Docker ausentes dentro do container; limite conhecido do ciclo 2, "9 de topologia por ambiente"), skipped 0 |
| Regressão despacho/OS | `node --test … tests/field-dispatch*.test.ts tests/work-order*.test.ts` | **366/366**, fail 0, skipped 0 |

**Leitura:** o conserto compila, fecha o P1 pelo teste que reproduz a sonda da (c′), não regride nada fora da mudança de motivo prevista em §3.4, e
cada mutação cai pelo caso previsto. Nota ao dev: dar **mensagem própria** (3º argumento) às 4 asserções `deepEqual` de T-C1, para o TAP nomear qual
caiu — o `location` do `node:test` sob `tsx` aponta para o teste, não para a asserção (medido: as 4 vermelhas de T-C1 saem com a mesma posição `5:8360`).

### 3.10 Junta do ciclo 3 — régua, composição e mandatos (≤3 itens; P1–P7 verbatim no disparo)

**Régua:** bloco de ingestão do Traccar = junta completa (§C7 item 8(4)): `inspetor-de-terreno-da-junta` antes, **3 cadeiras com identidade
NOVA** (nenhuma das 6 instâncias do ciclo 2 nem as do ciclo 1 — obituário por nome), nível menor declarado, unanimidade de 3; mandato forma A
com pré-voo só para inspetor e cadeiras (8(3)). **No ciclo 3 só reprova defeito de produto GRAVE** (perde dado, vaza entre organizações, quebra
permissão, erra dinheiro — 8(2)); tudo o mais vira pendência com dono e o bloco mergeia. **Não há guardião de banco** neste ciclo (sem migração)
— o inspetor confere que o diff não toca `prisma/**`. Objeto = head novo do PR #426 com check-runs **concluídos**. **Não reabrir sem razão
nova** o que a ata do ciclo 2 lista como confirmado por execução (l.40–48) — A RE-VERIFICAR só o que o ciclo 3 toca: a atribuição no tempo.

**Cadeira (a″) — RLS e regressão de banco** (competência: PostgreSQL 16, RLS/FORCE, arnês `-db`, CI):
1. O predicado novo **não cruza organização**: organização B semeada (OS com V1 e despacho aceito, `vaa` anterior e posterior) e nunca ingerida →
   `B(loc=0,rec=0)` em todas as linhas da (c″); sob o papel sem bypass, `EXPLAIN (VERBOSE)` da consulta mostra o filtro de RLS de `work_orders` e
   `field_dispatches` **além** do `d.tenant_id = $t` (a perna `OR vaa > at` não abre nada fora do GUC).
2. A forma do job `backend-postgres` no container, **3×**: `fail 0`, `skipped 0`, denominador constante (publicar; esperado 391); `npm test` na
   forma do job `backend`: `fail 0`, `skipped 2` nomeados.
3. `tests/field-dispatch*` e `tests/work-order*` 366/366 sem diff; as 21 transições do despacho com md5 igual fora de `*_assigned_at` (roteiro da
   (c′), `zz-jtrc01c2c-trans.sql`); L0 = 111 e `tabelas_com_dml` = 118 inalterados (nada de banco mudou — confirmar, não assumir).

**Cadeira (b″) — escopo, superfície e registro** (competência: pathspec, superfície/segredo, registro):
1. `git diff --name-only 2043c584..<head>` ⊆ PERMITIDO de §3.2; **`prisma/**`, `.github/workflows/ci.yml`, `src/integrations/traccar/**`,
   `src/database/rls.ts`, `src/modules/work-orders/**`, `field-dispatch.service.ts`, `Kpis/` sem diff**; nos 2 arquivos de `src/` o diff está
   **dentro** de `findOperatorsForVehicleAt` e `classifyOperatorsAtFixTime`; `git diff --check`; `sync-agent-agents.mjs --check` verde.
2. Superfície não regrediu: 5 suítes sem banco do Traccar + 2 unitárias verdes; trava `Ω6R-SEC-002` fora (395 rotas, md5); nenhuma rota, permissão,
   motivo de quarentena ou tela nova; `API_CONTRACTS.md` mudou **só** a frase de `operator_history_ambiguous`.
3. Registro: relatório do ciclo 3 com contagens de **execução** (não copiadas), vermelho-controle publicado, "nada reescrito" declarado; o §4
   deste plano gravado em `pendencias.md` com ID e dono (ou PR de registro aberto e apontado); `R-B-TRC-01-ciclo2.md` nomeia quem achou /
   planejou / desenvolveu. **Só nota** (8(2)), salvo registro que declare fechado o que não fecha.

**Cadeira (c″) — atribuição no tempo** (competência: a regra do operador no instante, Prisma + SQL sob papel sem bypass, mutação própria):
1. **A tabela §3.4 inteira por execução**, nas formas P e S, com **vermelho-controle no objeto do ciclo 2 `2043c584`** (P1-atrasado dá 204 → B lá;
   C1 dá `no_operator` lá); inclusive P3 (borda µs) e N1–N3 (N3 **esperado 204 → B** — é resíduo declarado, não achado); e **uma forma própria**.
2. T-P1, T-P2, T-C1, T-C4(e) verdes 3× e vermelhos no src do objeto **pelas asserções nomeadas** em §3.5; M-P1a, M-P1b, M-C1′ vermelhas pelo caso
   indicado em §3.6 e M-C2/M-C3/M-C4/MUT-43 ainda mordendo (âncora, `tsc`, TAP, restauro hash = blob).
3. Regressão: 15 suítes do Traccar ≥ 132/132, skipped 0; títulos do objeto do ciclo 2 ⊆ head (só T-C1 muda de título — conferir que é o único);
   os 17 casos do ciclo 1 com motivo igual; corpos dos casos do ciclo 1 intactos byte a byte.

**Inspetor:** além do protocolo e do `LIBERADO` sobre SHA com check-runs concluídos: (i) diff sem `prisma/**` (sem autorização = sem migração);
(ii) os worktrees `C:/Users/AMP/w-jc2-b` e `w-jc2-b3` (resíduo da (b′)) removidos ou declarados; (iii) mandatos marcam A RE-VERIFICAR (lição da
1ª passada do ciclo 2).

**Papéis do ciclo 3 para a ata (§C7.4-bis):** quem achou = `jurado-trc01c2-c-opus` (c′); quem planejou = `planejador-trc01-ciclo3` (Fable, este);
quem desenvolve = identidade nova a nomear no disparo; nenhum dos três ocupa outro papel.

### 3.11 Ordem com o `B-O6R-07c-b1` (inalterada do ciclo 2, §2.5)

`w-07cb1` está em `b14478ab` (ramo `fix/o6r07cb1-despacho-atribui`). Os hunks do ciclo 3 ficam **dentro** de `findOperatorsForVehicleAt` e
`classifyOperatorsAtFixTime`; o 07c-b1 toca métodos das classes, abaixo — **disjuntos**, como no ciclo 2. O TRC-01 mergeia primeiro; quem entrar
depois rebaseia e reroda a bateria. Nota semântica ao 07c-b1 (acrescenta à do ciclo 2): se o despacho passar a trocar viatura, cada troca
torna o instante anterior **desconhecido** para a ingestão (quarentena `operator_history_ambiguous` de fixes atrasados) — comportamento esperado,
não defeito.

## 4. Pendências a registrar, com dono (fora do ciclo 3 — o orquestrador grava em `agent-orchestration/controle/pendencias.md`)

Formato sugerido por entrada: `## <ID> (<data>) — <título> — <prioridade>` · origem · escopo · dono · teste de encerramento. Nenhuma delas reprova
no ciclo 3 (8(2)); nenhuma entra no diff de código do ciclo 3 (ordem do dono).

| ID | Origem | O que é | Dono | Teste de encerramento |
|---|---|---|---|---|
| `P-TRC-CI-COMENTARIO-DENOMINADOR` | (a′) ajuste | `.github/workflows/ci.yml:282` diz 363/363; o job executa 389 (391 após o ciclo 3) | próximo bloco de governança/CI que tocar a lista curada | o número do comentário = `# tests` da execução do job, medido no PR que corrigir |
| `P-TRC-VIATURA-PERIODOS` | plano ciclo 2 §2.4.2 / (b′) nota 1 (não existia) | histórico OS↔viatura por períodos (`work_order_vehicle_periods`, FORCE RLS, gatilho, backfill, L0 111→112); fecha C4 (atribui o ponto real de A), N1 (fim da quarentena conservadora), N3 (`→ NULL`) | **B-TRC-03** | C4 → 204 → A; N1 → 204 → A; N3 → `ambiguous`; P1 → `ambiguous_operator_at_fix_time` (motivo exato, não mais `history_ambiguous`) |
| `P-TRC-VIATURA-NULL-SEM-SINAL` | esta auditoria §3.8-(a) | OS que perde a viatura para NULL por SQL não deixa sinal; competidor vira dono (N3) | B-TRC-03 (absorvido pelos períodos; alternativa: gatilho carimba `now()` no `→ NULL`, texto em §3.8-(a), **não pedir agora**) | N3 → quarentena |
| `P-TRC-QUARENTENA-CONSERVADORA` | esta auditoria §3.8-(b) | troca de viatura de qualquer OS ativa depois de T quarentena todo fix em T (`operator_history_ambiguous`) até haver períodos | B-TRC-03 (resolve) · B-TRC-05 (opera: os episódios aparecem na tela da quarentena) | com períodos, N1 → 204 → A |
| `P-TRC-AMBIGUIDADE-MESMO-OPERADOR` | esta auditoria §3.8-(c) | OS desconhecida do mesmo operador que o único dono não precisaria gerar ambiguidade (N2) | B-TRC-03 | N2 → 204 → A, com teste unitário no classificador |
| `P-CI-LISTA-CURADA-6-PRE-EXISTENTES` | plano ciclo 2 §2.2 / (b′) nota 1 (não existia) | 6 suítes `-db` pré-existentes fora da lista curada do `backend-postgres` (`o6r07a-anon-lockout-db`, `o6r07c-subresource-scope-db`, `san3-04a-menu-com-permissoes-do-banco-db`, `san3-05-leituras-de-plataforma-db`, `san3-05-runtime-role-guard-db`, `san3-09-bootstrap-platform-admin-db`; nascidas em `dc8168b9`/`86ea8a81`/`aadaa6d5`/`a9fbe283`/`026ff7b8`) | governança/CI | as 6 na lista, 3× `skipped 0`; guard "toda `-db` está na lista" verde na `main` |
| `P-TRC-OWN-ONCE-SEM-VIGIA` | (c) ciclo 1 nota / (b′) nota 2 | a propriedade OWN-ONCE (evento sai uma vez) sem teste-vigia próprio | B-TRC-03 | teste nomeado no catálogo, mutação que o derruba |
| `P-TRC-RELOGIOS-NODE-POSTGRES` | (c) ciclo 1 nota / (b′) nota 2 | hipótese: `fixTime` (Node, ms) × `vehicle_assigned_at`/`accepted_at` (Postgres, µs, `now()` da transação) em hosts distintos; P3 da (c′) mediu só a borda no mesmo host | B-TRC-03 (hipótese; medir com relógio deslocado) | caso medido com `clock_timestamp` deslocado ou declarado não reproduzível |
| `P-TRC-TETO-REDUNDANTE` | (c) ciclo 1 nota / (b′) nota 2 | redundância do teto de organizações na descoberta (nota de forma) | B-TRC-03 | 1 linha de decisão: mantém ou remove |
| `P-TRC-M-B1-CONTROLE-TERMINATED` | (c′) nota N-MB1 | sob M-B1 o T-B1 cai no controle interno `terminated === 1` (l.316) antes da asserção `receipts: 1` prevista; a propriedade é vigiada pelos irmãos #7/#8 | B-TRC-03 (forma de teste) | T-B1 cai pela asserção prevista ou o plano §2.3.2 do ciclo 2 é emendado |
| `P-TRC-AUTORIZACAO-EM-BLOCO` | (b′) nota 4 | `D-TRC01-VEHICLE-ASSIGNED-AT` foi aprovada pela frase "todas as decisões nas suas recomendações", não por frase própria do dono | orquestrador (registro de forma, sem ação de código) | 1 linha em `decisoes.md` declarando a forma válida, ou o dono reafirma |
| (fechadas por este plano, registrar como tal) | (b′) notas 3 e 5 | "nada reescrito" não declarado → o relatório do ciclo 3 declara (§3.1); helper `assignVehicle` fora do PERMITIDO literal → o §3.2 deste plano permite os helpers do arnês | ciclo 3 | a linha no relatório; o `git diff --stat` do ciclo 3 |
| resíduo de terreno | (b′) teardown | worktrees `C:/Users/AMP/w-jc2-b` e `w-jc2-b3` (ocupantes caídos) em `2043c584` | orquestrador, antes do inspetor do ciclo 3 | `git worktree list` sem os dois (conferir processo vivo antes; `git worktree remove --force`) |

## 5. Riscos e rollback

| Risco | Prob./impacto | Mitigação |
|---|---|---|
| A (c″) ler a mudança de motivo em C1/C4/C5/C6/C7/C9/P2/P3 (`no_operator` → `history_ambiguous`) como regressão | média/baixo (não é grave; vira pendência no pior caso) | §3.4 lista **cada** linha que muda e por quê; nenhuma passa de quarentena para 204; o mandato da (c″) traz a tabela como régua |
| Quarentena a mais em janelas de troca de viatura (N1) | certa/baixo em dev; baixa/médio em produção com rastreador bufferizado | declarada (§3.8-(b)); `P-TRC-QUARENTENA-CONSERVADORA`; B-TRC-03 resolve; B-TRC-05 mostra |
| Borda de µs entre SQL e Node | baixa/médio (seria o P1 pela borda) | a flag nasce no SQL da mesma expressão que inclui a linha (§3.3); P3 na tabela da (c″) |
| O dev "melhorar" além do P1 (refinar por operador, consertar o `→ NULL`, mexer no `ci.yml`) | média/médio (reabre escopo e junta) | PROIBIDO explícito em §3.2; (b″) item 1 mede por pathspec e por função |
| Prisma inferir mal o tipo do parâmetro `${input.at}` na expressão booleana | baixa/alto (consulta quebra → 503 em tudo) | o protótipo rodou a suíte inteira (§3.9); `${input.at}` já era comparado com `timestamptz` no objeto; se aparecer `42P18`, usar `${input.at}::timestamptz` nas duas ocorrências |
| Rebase cruzado com o 07c-b1 | baixa/baixo | hunks disjuntos (§3.11) |
| Cota dos modelos (Codex/Argon uma tarefa paga por vez; API Claude suspensa) | alta/médio | dev único em Opus da sessão se os externos estiverem ocupados; ≤2 jurados em paralelo (P5); P1/P2 desde o esqueleto |

**Rollback do ciclo 3:** `git revert` do commit do ciclo 3 no ramo — restaura o objeto do ciclo 2 **sem tocar o banco** (não há migração). Nada
em produção (não existe). Posições gravadas durante o ciclo 3 em dev não são tocadas pelo revert.

## 6. Limpeza desta auditoria

- Worktree `C:/Users/AMP/w-plan-trc3` removido por `git worktree remove --force` + `git worktree prune` (`git worktree list` sem ele; o diretório não
  existe). Nenhuma junction/symlink de `node_modules` foi criada (o `npm ci` rodou só dentro do container).
- Containers: os `tl<id>-{pg,redis,run}` e as redes `tl<id>-net` das duas rodadas foram removidos pelo próprio `teste-linux.sh`; `docker ps -a`
  mostra só `erp-postgres`/`erp-redis` (base viva, nunca tocada); redes `tl*` = 0.
- Repositório: **nada editado** em `w-trc01` nem na árvore principal (`git status` da raiz igual ao do início: `pendencias-indice.md` modificado e os
  3 untracked pré-existentes são de outros trabalhos, só reportados).
- Scratchpad: só a subpasta `plan-trc3/` da sessão (scripts do protótipo, seções deste arquivo, logs das duas rodadas) — fica como evidência até a
  sessão acabar; apagável sem perda (este arquivo é a entrega).
- Resíduo alheio encontrado e **não** removido: worktrees `C:/Users/AMP/w-jc2-b` e `w-jc2-b3` (ocupantes caídos da (b′) do ciclo 2) — §4.

## 7. Registro de execução (comandos deste planejador)

| # | Comando (resumo) | Saída resumida | Para quê |
|---|---|---|---|
| 1 | Read ata ciclo 2, 3 votos (`cadeira-{a,b,c}-voto.json`), evidência (c′) l.40–160 e apêndice l.267–429, `00-quedas.md`, mandatos | o P1, as notas da (a′)/(b′), a sonda | §1, §4 |
| 2 | Read `field-dispatch-prisma.repository.ts`, `field-dispatch.repository.ts`, `field-dispatch.types.ts:120-150`, `traccar-ingestion.service.ts:90-280`; grep dos motivos em `src/` | a regra e o mapa de motivos | §1.2, §3.3 |
| 3 | `cat prisma/migrations/20260876…/migration.sql`; `ls prisma/migrations \| tail` | o gatilho (`→ NULL` zera) | §1.2, §3.8 |
| 4 | Read `tests/traccar-position-ingestion-db.test.ts` (1–250, 333–530), `tests/traccar-operator-at-fix-time.test.ts`; grep `assignVehicle`, `externalEventKey` | molde dos testes; só T-C1/T-C2 trocam viatura; chave do evento inclui `fixTime`+lat/lon | §3.5 |
| 5 | grep `mutations.mjs` (M-C1..M-C4, MUT-43); `API_CONTRACTS.md:90-100`; `PLANO_TRACCAR.md` §3.1 item 6, §4.2 (l.585–625), §8.6, §8.9 | formato do catálogo; a frase do contrato; onde a regra está escrita | §3.2, §3.6 |
| 6 | `git show origin/main:agent-orchestration/controle/decisoes.md` (l.2287–2300, 3670–3700); idem `pendencias.md` grep `P-TRC-` | a norma de 2026-09-08; `D-TRC01-VEHICLE-ASSIGNED-AT`; as 2 pendências não existem | §0, §1.3, §4 |
| 7 | Read plano do ciclo 2 (inteiro, 613 l.) | a janela só pelo lado de quem ganha; tabela com uma OS; §2.5 | §1.4, §3.11 |
| 8 | `git worktree list`; `docker ps`; `git worktree add --detach C:/Users/AMP/w-plan-trc3 2043c584…` | terreno: 0 trabalhos de outros; worktree meu | §3.9 |
| 9 | `proto.py` (edições por âncora única, CRLF preservado) sobre o worktree meu; `git diff --stat` → 5 arquivos +89/−8 | o conserto e os testes | §3.3, §3.5 |
| 10 | `teste-linux.sh C:/Users/AMP/w-plan-trc3 "bash proto-run.sh"` (rodada 1) e `"bash proto-run2.sh"` (rodada 2) | §3.9 inteiro | §3.9 |
| 11 | `git worktree remove --force` + `prune`; `docker ps -a`; `docker network ls`; `git status` | limpeza conferida | §6 |

**Veredito da auditoria: (c′)-P1 é defeito real do produto, classe NÃO GRAVE confirmada, originado em dado podre do PLANO do ciclo 2 (janela
enunciada só pelo lado de quem recebe a viatura). Recomendação (ii): conserto mínimo restrito ao P1, sem migração, medido por protótipo —
o ciclo 3 segue a ordem do dono ("ataque só a c") e o resto vai ao §4 com dono.**
