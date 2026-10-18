# J-B-TRC-01 — junta do ciclo 2 (2026-10-18) · PR #426, Traccar em dev com ingestão privada e quarentena

- **Objeto:** `2043c5840c8f60fe91538840aaefb3420a11cfe3`. É o head com os consertos A, B e C do ciclo 2, com a `main` integrada; a CI deu 14/14 verde, e o `backend-postgres` executa as 6 suítes `-db` do Traccar (389/389, skipped 0).
- **Régua:** bloco de SEGURANÇA, junta completa, unanimidade de 3 com veto, **ciclo 2 — o último em que `bloqueia` não grave reprova** (§C7 item 8(2)).
- **Guardião de banco:** `dba-trc01-c2-cdx` (Codex GPT-5.6 Sol), **APROVA** (`votos/B-TRC-01-ciclo2/dba-guardiao-c2-parecer.md`). A migração `20260876000000_work_orders_vehicle_assigned_at` é aditiva, idempotente, tem rollback provado por `pg_dump` e usa `SECURITY INVOKER`.
- **Inspetor de terreno:** `inspetor-trc01c2-cdx` (Codex GPT-5.6 Sol, troca de executor no nível menor declarada).
  - 1ª passada: **BLOQUEADO**, porque os mandatos não marcavam A RE-VERIFICAR (§C7.1-bis).
  - Os mandatos foram emendados.
  - 2ª passada: **LIBERADO COM RESSALVA**, com o plano local fixado por md5 `dd6e9074…` e as 4 decisões do dono, que depois foram registradas no #444 (`a26f8afe`).
- **Pré-checagem:** `precheck-trc01-c2-codex` (Codex) mostrou que o "3427 executados e passados" do relatório do dev era impreciso (`pass 3414 · fail 11`: 9 de topologia por ambiente e 2 do T15 pré-#442). O orquestrador conferiu por execução: 129 casos, 0 falha de produto.

## VEREDITO: REPROVADO (2 × 1)

| cadeira | identidade que votou | executor e modelo | voto | bloqueia |
|---|---|---|---|---|
| (a′) RLS, banco e CI | `jurado-trc01c2-a-cdx` | Codex, GPT-5.6 Sol médio | **APROVADO** | — |
| (b′) escopo, superfície e trava | `jurado-trc01c2-b-opus` (4º ocupante, sucessor P3) | Claude Code, Claude Opus 5.5 | **APROVADO** | — |
| (c′) viatura no tempo | `jurado-trc01c2-c-opus` | Claude Code, Claude Opus 5.5 (cadeira dada ao Claude pelo dono) | **REPROVADO** | 1 |

**O bloqueio (dentro do bloco, classe não grave):**
- **(c′)-P1 — a OS que tinha a viatura no instante do fix e depois a perdeu sai da janela.**
  - Montagem: duas OS (A e B), ambas com despachos aceitos, têm a viatura V1.
  - Esperado: um fix de V1 tirado nesse período é ambíguo e deve ir à quarentena (`ambiguous_operator_at_fix_time`).
  - Observado: se o fix só for entregue depois de a OS de A trocar de V1 para V2, ele grava 204 no trajeto de B.
  - Causa: `findOperatorsForVehicleAt` (`field-dispatch-prisma.repository.ts:42`) ainda lê a viatura ATUAL da OS. A coluna nova marca desde quando a OS tem a viatura, não até quando teve a anterior.
  - Reproduzido nas formas P (o `assign` do repositório) e S (SQL sob o papel sem bypass).
  - Regra violada: "vínculo ambíguo falha fechado" e a janela de tempo do dono (2026-09-08).
  - É a mesma classe do (c)-1 do ciclo 1, com informação nova: o conserto C cobriu a OS que GANHA a viatura, não a que a PERDE.

**Ajustes e notas (não reprovam; viram pendência com dono):**
- (a′): o comentário de `.github/workflows/ci.yml:282` diz 363/363, e o job executa 389/389.
- (b′):
  - as pendências `P-TRC-VIATURA-PERIODOS` e `P-CI-LISTA-CURADA-6-PRE-EXISTENTES`, que o plano manda registrar, não existem;
  - três notas da (c) do ciclo 1 estão sem pendência com dono;
  - o relatório não declara "nada reescrito" para as posições já gravadas;
  - a autorização da migração foi aprovada em bloco ("todas as decisões nas suas recomendações");
  - há um helper novo, `assignVehicle`, no arnês.
- (c′): N-MB1. Sob M-B1, o T-B1 cai no controle `terminated` antes da asserção prevista; a propriedade segue vigiada pelos testes irmãos.

**O que as cadeiras confirmaram por execução** (A RE-VERIFICAR no ciclo 3 apenas se o ciclo 3 tocar a propriedade):
- 129/129 nas 15 suítes do Traccar;
- os 9 cenários da viatura no tempo (C1–C9) fora o P1;
- a OS legada na opção (i);
- a forja de `vehicle_assigned_at` é ignorada;
- as mutações M-C1..M-C4, M-B2a/b e MUT-10c ficam vermelhas;
- `field-dispatch*` e `work-order*` sem regressão (366);
- superfície, segredo e a trava `Ω6R-SEC-002` intocados (b′);
- a lista curada da CI com as 6 suítes e o guard de zero pulos (a′).

## Terreno, quedas e substituições (P6, `votos/B-TRC-01-ciclo2/00-quedas.md`)
- O PC reiniciou (~03:22Z). A (c′) foi retomada pela mesma identidade, com o contexto preservado.
- A (b′) teve 4 ocupantes:
  - Gemini, que caiu no reinício;
  - Gemini, que caiu no teto MENSAL da API da conta;
  - Codex (`jurado-trc01c2-b-cdx`), que caiu no limite de uso com 2,8 KB de evidência;
  - o sucessor Opus, que re-executou o roteiro do Codex e votou.
- A (a′) esperou o limite do Codex e uma vaga de jurado (P5).
- O orquestrador ficou ~5 h sem acordar depois do voto da (a′) (05:18Z → 10:56Z). O vigia em segundo plano não reacordou a sessão.

## Separação de papéis (§C7.4-bis) e as três perguntas da reprovação
- **Quem achou:** a (c′).
- **Quem planejou o ciclo 2:** `planejador-trc01-ciclo2` (Fable).
- **Quem desenvolveu:** `dev-trc01-c2-codex`, depois `dev-trc01-c2-argon`, depois `dev-trc01-c2-gemini`.
- **(a) A composição cobriu a competência:** sim — banco e CI na (a′), escopo e superfície na (b′), viatura no tempo na (c′).
- **(b) Quem achou NÃO conserta:** o ciclo 3 nasce de auditoria e plano no modelo de TOPO e de um dev que não é a (c′).
- **(c) Dado podre:** o plano do ciclo 2 enunciou a janela pelo lado de quem RECEBE a viatura ("desde quando a OS tem a viatura") e não pelo de quem a PERDE. Fica para a auditoria de topo responder.

**Próximo (`D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`):** o Fable audita a reprovação e escreve o plano do ciclo 3. **No ciclo 3, só defeito de produto GRAVE reprova** (perde dado, vaza dado entre organizações, quebra permissão ou erra dinheiro, §C7 item 8(2)). O (c′)-P1 foi classificado como não grave pela própria cadeira; a auditoria confirma ou corrige essa classe. Se ficar não grave, vira pendência com dono e o bloco mergeia no ciclo 3.
