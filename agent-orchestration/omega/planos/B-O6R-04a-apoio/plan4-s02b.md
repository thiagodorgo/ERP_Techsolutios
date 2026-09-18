
### 2.2 Tabela por via — LÊ · DECIDE · ESCREVE · lock hoje · vermelho medido (head-base) · verde medido (desenho v3 emulado)

| via | LÊ / DECIDE / ESCREVE (arquivo:linha, hoje) | lock hoje | vermelho medido (head-base) | verde medido (v3) |
|---|---|---|---|---|
| **V1** `createMovement:206` | `findItemById:207` · `saldoOfCustody:214` · `wouldOverdraw:216` · [`saldoOf:221` · `updateMany:224`] · `insertMovement:236` | nenhum | v2 `[10-P1]` 20/20 ok, saldo −10; `[10-P11]` B commita saldo −1 | v2 `[10-V1]` 10 ok / 10 × 409, saldo 0; `[10-P11-new]` B bloqueia no `FOR UPDATE` → 409 (desenho **inalterado** na v3) |
| **V2** `createTransfer:239` | `findItemById:240` · `saldoOfCustody:247` · `wouldOverdraw:248` · `insertMovement:253,:263` | nenhum | mesma classe de P1 | mesma mudança de V1 |
| **V3** `reverseMovement:277` | `findMovementById:278` (identificação) · `movementsInGroup:282` · `hasReversalOf:286` · `saldoOfCustody:303` · `insertMovement:309` | nenhum; sem unicidade | v2 `[10-P3]` 2 compensações; `[07]` C7_headbase 2 com escritor cru | v2 `[10-V3]` 1; `[07]` C7_v3: P2002 → 409 fora da tx, 1 compensação |
| **V4** `createExitForSource:364` | `findItemById:365` · `findExitBySource:370` · `isExitReversed:372` · `saldoOfCustody:380` · `insertMovement:386` · `catch` P2002 **dentro** da tx `:398-404` | nenhum | v2 `[10-P9]` `25P02` 10/10 | v2 `[10-V4]` mesmo `id`, 0 × `25P02` |
| **V5** `removeExitForSource:410` | `findExitBySource:411` (identificação) · `isExitReversed:413` · `insertMovement:416` | nenhum | v2 `[10-P5]` 2; `[07]` C8_headbase 2 | v2 `[10-V5]` 1; `[07]` C8_v3 `undefined` via P2002 fora da tx, 1 |
| **V6** `close:137` | `findSessionWithEntries:138` · `status:146` · `listMovements:157` · N × `createMovement:182` · `findItemById:203` (avg) · `applyClose:207` | nenhum; N+3 tx | v2 `[10-P6]` 2 vencedores; `[04]` TVV head-base −30 (certo); STUCK head-base `aberta` (limpo) | `[04]` TVV v3 −30 / −60 em 5/5; STUCK v3 `reverted`; `[10]` SIZE |
| **V7** `recordEntry:99` | `findSession:105` · `status:110` · `recordEntryCount:86` (sem condição) | nenhum | `[04]` B3_headbase grava por cima do carimbo | `[04]` B3_v3 422; `[07]` E34: carimbada `entry_adjusted`, não carimbada `ok` coerente |
| **V8** `cancel:222` | `findSession:223` · `status:228` · `cancelSession:123` (sem condição) | nenhum | v2 `[10-E4-hb]` `cancelada` com ajuste no ledger | `[07]` E34_cancel `close_in_progress`; `[04]` STUCK v3 cancel ok em `aberta` |
| **V9 `open:52`** (novo no mapa — N-OVL) | `listItems:56` (tx própria) · `createSession:24` (`cycleCount.create:25` + `createMany:37`, tx própria) — **não decide** hoje | KEY SHARE em N itens (FK) | `[07]` OVL_headbase: 2 sessões sobre o item, saldo 98 (físico 99) | `[07]` OVL_v3: lock do tenant + sobreposição → 409; 1 sessão em 5/5 corridas; saldo 99 |
| **abortClose** (novo — S-01) | sessão `FOR UPDATE` · `count(carimbos)` · CAS `fechando→aberta` se 0 | — | v2 emulado: presa em `fechando` `[04]` STUCK_v2 | `[04]` STUCK_v3 `reverted`; STUCK_partial `kept` |
| `recalculateAbc` (`applyAbcClasses:561`) | não lê saldo; NO KEY UPDATE em N itens | — | v2 `[10-LO-old]` `40P01` com desenho v1 | `[07]` LO_abc_v3 0 × `40P01` |

**Propriedade a fechar (não a instância):** (i) toda via que chega a `insertMovement`/`avg_cost` toma o lock do item **antes** da primeira leitura que decide (as leituras SEM lock
que decidem deixam de existir — §3.1); (ii) toda transição de `cycle_counts.status` é **CAS** e toda escrita em `cycle_count_entries` roda sob lock da sessão (`FOR UPDATE` na unidade,
`FOR SHARE` na recontagem) com predicado de carimbo na própria linha; (iii) I7; (iv) `createSession` toma a linha do tenant e recusa sobreposição (I9); (v) toda falha de unidade
passa por `abortClose` (I11); (vi) o total do 200 sai do banco sob o lock (I10). O T-D (§6) enumera (i)–(vi) **pelo fonte** e reprova via nova sem classificação.
