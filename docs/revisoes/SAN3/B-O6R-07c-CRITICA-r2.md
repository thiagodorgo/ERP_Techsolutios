# B-O6R-07c — Crítica adversarial r2 do plano v2 (07c-a e 07c-b)

> **Papel:** `critico-adversarial` · **identidade:** `critico-b-o6r-07c-r2` (nova; não escreveu o plano nem a r1).
> **Modelo que rodou:** **Opus 5.5 — substituição DECLARADA** (§C7.6-bis): o bloco é de permissão, não de dinheiro;
> o Fable está reservado a bloco de dinheiro (decisão do dono de 08/10). O frontmatter segue `fable`.
> **Objeto:** `docs/revisoes/SAN3/B-O6R-07c-plano.md` v2 de `planejador-b-o6r-07c`, ramo `fix/o6r07c-subresource-scope`,
> head `f7334f34116d3f29cf951edb92014625067740c3` (medido). **Código medido:** `origin/main` = `c1cfdabe12c74b58f8393dbee4f333224c56b303`
> (medido; o ramo não toca `src/`). Rodada **2 de 2 (última)**. Quem critica não conserta (§C7.4-bis).
> **Estado:** COMPLETO (gravado item a item; evidência E1–E9 com comando e saída; sondas verbatim no Apêndice).

## Veredito

**07c-a: VOLTA AO PLANO, só no guard.** Dois achados `bloqueia`, B1 e B2, os dois `dentro-do-plano`. O guard (07c-a.3) e as
mutações dele (07c-a.4) são entregáveis do 07c-a e são a peça que o CE-2 exige ("um guard fica vermelho quando surge rota
mutante alcançável pelo técnico"). Seis formas novas de via, em quatro classes, escapam do gerador v2 **em silêncio**. Todas foram medidas
por execução no app real (E3–E5):
- handler montado como middleware;
- sub-app Express;
- tipo novo num lote existente com o ponto dentro de uma constante, por concatenação ou sem ponto;
- tipo cuja recusa de validação contém a substring `role_required`.

Em todas o técnico escreve e o guard fica inteiro verde.

O que **sobrevive à rodada 2** e passa a ser requisito explícito do plano (a r2 é a última; máximo de 2 rodadas):
- o desenho de produção das 10 vias (07c-a.1/07c-a.2): a porta `getForMutation`, o escopo antes do multipart e do parse, a
  conversão 404 → recurso preservada, `update`/`changeStatus` intocados, sem migração;
- **nenhum fluxo de despacho legítimo perde acesso às 10 vias** (E6). O A1 da r1 não se reproduz do lado do 07c-a:
  - o despacho só lê a OS;
  - o app não chama nenhuma das 10 e nunca produz `work_order.mileage`;
  - os papéis de despacho são `tenant_wide`;
  - a única perda é o comentário ou anexo **pelo web** do técnico despachado sem atribuição, conforme a linha 45 da `RBAC_MATRIX.md`;
- a premissa corrigida do A4 (E7). Os recibos ficam em `Map` por processo, com chave `tenant:user:client_action_id` e só para `accepted`, e o S-KM-RESTART é exequível;
- os testes semânticos S-* e o laço G-NEG/G-POS/G-WIDE das 13 entradas. O `managerA` alcança as 13, então o G-WIDE não fica vazio;
- as 6 formas da r1 (F1–F6) ficam vermelhas no v2 (E2), e os números 409/146/42/104 · 4/439/147/23 · 169 reproduzem (E1);
- a divisão **não piora nada** em relação a hoje (E8).

O que volta ao plano é a **propriedade do guard**, enunciada como propriedade:
- **toda** camada do app que o técnico alcança e que termina a requisição entra no censo, ou faz o guard falhar;
- **todo** tipo que um lote aceita do técnico entra no censo, ou faz o guard falhar, qualquer que seja a forma do literal na
  fonte e o texto do motivo de recusa de validação;
- uma via "na propriedade" não pode ficar verde só por ter **alguma** classe (B3).

Sem proposta de conserto: é do planejador (§C7.4-bis).

**07c-b: pronto para planejar depois de D1 e D2, mas o texto que vai ao dono precisa de três ajustes antes de sair (B5, B6).**
- As opções e os efeitos estão claros, e o dono do A2 (`B-SAN3-16`) está certo.
- **Ajuste 1, a porta certa.** A "porta única" está nomeada errada: é `assertMutationObjectScope`, não `getForMutation`. Com o erro, uma D1 (b) aplicada onde o plano manda **não** chega ao status nem ao PATCH da OS.
- **Ajuste 2, o alcance da D1.** O texto que vai ao dono não mostra que a D1 decide também comentário, anexo, geocode e a **edição da OS** pelo técnico despachado.
- **Ajuste 3, o alcance da D2.** A D2 não diz se vale para status e km. Com (d), as duas continuariam `rejected` e presas no aparelho, a não ser que o 07c-b ganhe `mobile-work-order-sync.ts`, que hoje não está no escopo dele e está na trava `07c → SAN3-16`.

Depois das respostas, o 07c-b herda o mesmo guard. Por isso B1 e B2 também o alcançam: o T6 só prova o fechamento se o censo
enxergar todas as vias.

## Achados

| id | gravidade | escopo (com evidência) | parte | achado | motivo |
|---|---|---|---|---|---|
| **B1** | **bloqueia** | **dentro-do-plano.** O censo e o guard são entregáveis do 07c-a (07c-a.3, `tests/helpers/o6r07c-census.ts` porta o `census-v2.mts` "sem mudança de algoritmo"), sob o CE-2 e o CE-G1 (`PLANO_SAN3.md:322,325`) | 07c-a | O `walk` do `census-v2.mts` só desce em `l.route` e `l.handle?.stack`. Camada terminal sem nenhum dos dois é **pulada sem contagem**. Duas formas novas medidas (E3): **N1**, handler montado como middleware (`r.use("/work-orders/:workOrderId/via-use", fn)`), e **N2**, sub-app `express()` montado em `/api/v1`. As duas respondem `200 {"escreveu":true}` ao `field_technician` e ao `technician`; o gerador devolve **409 rotas / 146 alcançadas**, idêntico à linha de base, e o classify devolve `NAO-CLASSIFICADA: 0`. T1–T6 verdes. No app de hoje o `walk` pula 183 camadas (14 distintas), todas middleware, e o guard não afirma nada sobre esse conjunto. O "camada sem caminho de texto falha o guard" (C.2 item 1) só cobre a camada **visitada**; o controle com caminho em array (N9) cai no T3, mas N1 e N2 nem chegam lá | Forma que escapa em silêncio. O CE-2 exige guard vermelho para rota mutante nova alcançável pelo técnico, e o default "negar" da v2 vale só para o que o `walk` visita, como era o A3 da r1 para o que o v1 reconhecia |
| **B2** | **bloqueia** | **dentro-do-plano.** `census-sync-v2.mts` e `tipos.mts` são entregáveis do 07c-a (07c-a.3; T4, T5, T8). O CE-2 nomeia "e do sync mobile" | 07c-a | Tipo novo num lote **existente** escapa em silêncio de quatro formas, todas aceitas e gravando para os dois papéis de campo, com guard verde (E4, E5). **N3a**, template com o ponto dentro da constante: `const WO_PREFIX = "work_order."` mais o template `${WO_PREFIX}odometro`. É o caso que a v2 diz cobrir; o extrator testa a forma (`"Xodometro"`, sem ponto) **antes** de resolver e descarta **sem** pôr em `naoResolvidos`, então o T5 não vê. **N3b**, concatenação (`WO_FAM + ".reboque"`). **N3c**, tipo sem ponto (`"km_rapida"`). **N10**, tipo com literal achável (`tipos: 440`) cujo payload do censo é recusado com `checklist_role_required`, motivo de **validação** que a casa já tem (`work-order.validators.ts:371-377`); o `naoAlcanca` do censo de sync é regex **sem âncora** (casa a substring `role_required`) e descarta o par (`pares: 23`). O T4 não ajuda: os handlers despacham por `===` (`mobile-work-order-sync.ts:213,227,245,260`). O controle `"work_order.controle_r2"`, na mesma fonte e no mesmo handler, **é** pego (`pares: 24`, `NAO-CLASSIFICADA: 1`) | No sync, a v2 ainda reconhece **forma**: o formato do literal e o texto do motivo de recusa. Não reconhece a propriedade, que é o alcance pelo RBAC. É o A3 da r1 deslocado do roteamento para o lote |
| B3 | ajuste | dentro-do-plano (07c-a.3: T1–T8; `classify-v2.cjs:13-15,38-39`) | 07c-a | O guard exige **presença** no instantâneo, não **classe**. Com F1, F3 e F4 inscritas como `LEITURA`/`N`, o classify cai de 9 para 6 `NAO-CLASSIFICADA`, sem falha nenhuma, e as três saem do laço G, que só lê `OS·*`. A coluna `prop` é impressa e nunca afirmada. O plano também não diz o que o laço G faz com uma entrada `OS·*` nova sem roteiro de requisição: falha ou pula (E7) | O "default negar" vira "default: escrever qualquer classe". A propriedade fica a cargo da revisão humana do diff do instantâneo. Não é silencioso, porque a mudança aparece no diff, e por isso não é `bloqueia` |
| B4 | ajuste | dentro-do-plano (07c-a.4, tabela de mutações; CE-G1(c)) | 07c-a | Sem mutação que os derrube: **S-XT** (404 cross-tenant), a 1ª asserção do **S-KM-RESTART** (recibo antes do escopo), **T2** (envelhecida; o MG9 derruba o T1) e **T3** (camada sem caminho). A tabela também não credita ao M8 o S-ROLES (E7) | O CE-G1(c) pede, para cada membro do guard, a mutação que o deixa vermelho. Critério sem mutação é critério que pode passar vazio |
| B5 | ajuste | dentro-do-plano (C.1 `:57-59` × 07c-a.2 `:171-175`; R.2) | 07c-b / texto ao dono | (i) A "porta única" está nomeada errada. `update` e `changeStatus` chamam `assertMutationObjectScope` direto (`work-order.service.ts:852,1319`), não `getForMutation`. Uma D1 (b) aplicada em `getForMutation` não alcança o status nem o PATCH, o contrário do "inclusive o status do 07a" da C.1. (ii) O texto da D1 ao dono lista "vistoria, evidência, km e status" e omite que a mesma resposta vale para comentário, anexo, geocode e para o `PATCH /work-orders/:id`: com (b), o despachado **edita a OS** (E9) | O dono decide sem ver todo o alcance da resposta, e o plano diz onde aplicá-la num lugar que não alcança o que promete |
| B6 | ajuste | dentro-do-plano (07c-b.3/07c-b.4; R.4; `PLANO_SAN3.md:356-357`) | 07c-b / registro | A D2 não diz se vale para as vias do sync de OS, o status (07a) e a km (07c-a). Com (d), as duas continuam `rejected` e presas no aparelho, a não ser que o 07c-b mexa em `mobile-work-order-sync.ts` (`isConflictError`, `:306`), que não está no escopo dele e está na trava `07c → SAN3-16`. A v2 não diz qual metade satisfaz essa trava: com D2 (a), o 07c-b espera o SAN3-16, que espera o "07c". A reordenação `07c-a → SAN3-13` da trava de `work-order.service.ts` não tem linha no R.4 (E8, E9) | Uma decisão do dono que muda a política para metade das vias e deixa a outra metade com a política antiga, e uma cadeia de travas que pode se fechar em si mesma |
| B7 | nota | dentro-do-plano (R-a4; 07c-a.2 "(ii)") | 07c-a | O app **nunca produz** `work_order.mileage`: não há produtor em `mobile/flutter_app/lib` na `origin/main` nem no head do #388, e o `git log --all -S` volta vazio. A via 10 só é alcançada por requisição forjada. O R-a4 ("o despachado perde a km pelo sync") e o "(ii) … o app marca a ação failed" descrevem um fluxo que não existe. Com várias instâncias de API, o caso (ii) acontece também sem reinício (E6, E7) | O risco está superestimado, não subestimado. Não muda o desenho, mas a junta vota sobre o texto |
| B8 | nota | dentro-do-plano, como declaração de risco residual (C.2, "o que o gerador v2 ainda não pega"). **Dedução sobre o código, não executada** | 07c-a | A v2 trata o discriminador do **lote** (o tipo), mas não o discriminador de rota REST polimórfica. O `POST /attachments` resolve `entity_type` por um registro (`attachment-entity-resolver.ts:80-135`: damage, fine, insurance_policy, maintenance_order) e o censo o sonda com `{}` (`400:multipart_required`, Apêndice B da v2), chaveando por método e caminho. Registrar ali uma entidade que é subrecurso da OS seria via de escrita nova com o guard idêntico. A rota está fora dos routers da fronteira do CE-2 | Risco residual da mesma classe do B2, não declarado. Fica como nota porque o CE-2 nomeia os routers da fronteira e o `/attachments` não é um deles |
| B9 | nota | dentro-do-plano (07c-b.2/07c-b.3) | 07c-b | Notas de desenho para o plano do 07c-b. (i) A D1 (b) exige que `WorkOrderService` consulte despacho ativo, mas `field-dispatch.service.ts:4,9` importa `work-orders`; importar de volta cria ciclo, e o predicado teria de vir por referência injetada, como o `resolveActorOperatorProfileId`. (ii) A D2 (b) pressupõe um histórico de atribuição ("era o técnico em T") que a v2 não mostra existir | Não bloqueia a decisão do dono. Muda o tamanho do 07c-b conforme a resposta |

**Sem achado** (perguntas do mandato com resposta positiva, medida):
- **Pergunta 2:** o técnico atribuído passa e o não atribuído recebe 403, pelo predicado do 07a sem mudança. Gestor e operador passam (`tenant_wide`, catálogo conferido). Nenhum fluxo de despacho legítimo perde acesso (E6).
- **Pergunta 3, A4:** a premissa nova está certa (E7).
- **Pergunta 4:** a divisão não piora nada em relação a hoje (E8).
- **Pergunta 5:** o dono do A2 está certo (E9).

## Evidência (comando → saída resumida → veredito parcial)

### E1 — reexecução do gerador v2 (Apêndice A da v2, extraído do próprio plano por `awk`, sem edição) — P3

- `git -C C:/Users/AMP/w-07c rev-parse HEAD origin/main` → `f7334f34…` · `c1cfdabe…`; o ramo só acrescenta `docs/revisoes/SAN3/B-O6R-07c-*` (`git diff --stat c1cfdabe..HEAD` → 2 arquivos, 1524 linhas).
- cwd `C:/Users/AMP/w-07c`, Node v20.19.5, `env -u DATABASE_URL -u REDIS_URL`:
  - `node --import tsx census-v2.mts c2.json` → `rotas registradas: 409 | camadas sem caminho de texto: 0 | alcançadas pelo campo: 146 (GET/HEAD 104 · mutantes 42)` (ec=0).
  - `node --import tsx census-sync-v2.mts c2.json s2.json` → `POST alcançáveis: 31 | lotes: 4 | arquivos: 758 | tipos: 439 | famílias: 147 | pares alcançados: 23 | curinga: 0 | template não resolvido: 4` (os 4 nomeados no plano).
  - `node classify-v2.cjs c2.json s2.json --gravar-snapshot snapshot-base.json` → `DESPACHO·07c-b=1 · EVIDENCIA-OS·07c-b=4 · LEITURA=104 · LOTE=4 · N=15 · OS·07a=3 · OS·07c-a=10 · R=10 · VISTORIA·07c-b=18 · total=169 · NA PROPRIEDADE: 48`.
- **Veredito parcial:** os números da v2 **reproduzem** exatamente. O ataque passa a ser sobre o que o v2 não vê.

### E2 — as 6 formas da r1 contra o gerador v2 + o instantâneo de `c1cfdabe` (o `inject.mts` da r1 e o `inject-prefixo.mts` da v2, sem edição)

- F1–F5: `census-v2.mts c2-f15.json inject.mts` → `rotas registradas: 418 | camadas sem caminho de texto: 0 | alcançadas: 155`; `census-sync-v2.mts` → `lotes: 4 | pares: 23 | curinga: 0`; `classify-v2.cjs … snapshot-base.json` → `NAO-CLASSIFICADA=9 · total=178`, as 9 linhas: GET `aceitar-por-link`; `via-all` × GET/POST/PUT/PATCH/DELETE; POST `…/:workOrderId/notas`; POST `…/:id/fechar` (todas "na propriedade") e POST `/mobile/sync/novidade-actions`.
- F6: `inject-prefixo.mts` → `CURINGA: …/prefixo-actions · checklist.__tipo_inexistente_07c__ · field_technician → accepted` (e `technician`); classify → `NAO-CLASSIFICADA=11 · CURINGA: 2`.
- **Veredito parcial:** a tabela "gerador v1 × v2" da v2 **reproduz**. As 6 formas da r1 caem em `NAO-CLASSIFICADA`/`CURINGA` (fail-closed). Sem achado aqui.

### E3 — 3 formas NOVAS, injetadas no app real (`inject-novas.mts`, `inject-n1n2.mts`, `probe-novas.mts` — Apêndice)

- Alcance real por HTTP (`probe-novas.mts`, OS aleatória): **N1** handler montado como middleware com caminho, `r.use("/work-orders/:workOrderId/via-use", fn)` → `field_technician 200 {"escreveu":true}`, `technician 200`, `viewer 403`; **N2** sub-app `express()` montado em `/api/v1` com `POST /work-orders/:workOrderId/via-subapp` → `200/200`, `viewer 403`; **N9** (controle) rota com caminho em array → `200/200`.
- Gerador v2 com N1 + N2 (sem o controle): `census-v2` → `rotas registradas: 409 | camadas sem caminho de texto: 0 | alcançadas: 146 (104 · 42)` — **idêntico à linha de base**; `census-sync-v2` → `lotes: 4 | pares: 23 | curinga: 0 | não resolvido: 4`; `classify-v2 … snapshot-base.json` → `total=169 · NAO-CLASSIFICADA: 0 · ENVELHECIDAS: 0 · CURINGA: 0`. **T1, T2, T3, T4, T5 e T6 ficam verdes** com duas vias de escrita na OS que o técnico alcança.
- Com o controle N9: `camadas sem caminho de texto: 1` (`["/work-orders/:workOrderId/via-array"]`) → T3 vermelho. Caminho em array é fail-closed; N1 e N2 não.
- Causa, no próprio código do gerador (Apêndice A da v2, `census-v2.mts`): o `walk` só desce em `l.route` e em `l.handle?.stack`. Uma camada cujo `handle` é uma função terminal (N1) ou o `mounted_app` que o Express 5 cria para um sub-app (N2) não tem nenhum dos dois e é **pulada sem contagem**. No app real de hoje o `walk` pula **183 camadas (14 distintas)**, medido por `layers-cegas.mts`: helmet, cors, json, logger, os middlewares de autenticação, de contexto e de RBAC, e o 404. Hoje nenhuma é handler de escrita, mas o guard não afirma nada sobre esse conjunto.
- **Veredito parcial:** duas formas novas escapam **em silêncio**. O "camada sem caminho de texto … falha o guard" (C.2 item 1) só cobre a camada que o `walk` **visita**. → achado **B1**.

### E4 — tipo NOVO num lote EXISTENTE: o extrator v2 testa a forma ANTES de resolver a constante (`prova-tipos-r2.mts`, `inject-tipo.mts`, `inject-tipo-ctl.mts`, `probe-tipo.mts`)

- Extrator v2 (`tipos.mts` do Apêndice A, função pura, mesmo método da `prova-tipos.mts` da v2):
  - **N3a**, template com o ponto dentro da constante, `const WO_PREFIX = "work_order."` + `` `${WO_PREFIX}odometro` `` → `tipos: [] · naoResolvidos: []`;
  - **N3b**, concatenação, `WO_FAM + ".reboque"` → `[] · []`;
  - **N3c**, tipo sem ponto, `"km_rapida"` → `[] · []`;
  - controle, `` `${D}.via_template` `` com `const D = "work_order"` → `["work_order.via_template"]`.
  - O N3a é o caso que a própria v2 diz cobrir ("template com `${CONSTANTE}` resolvida"). O código faz `forma = v.replace(${…} → "X")` e `if (!FORMA_TIPO.test(forma)) continue` **antes** de resolver: `"Xodometro"` não tem ponto e é **descartado sem ir para `naoResolvidos`**. O T5 nunca o vê.
- Ponta a ponta no lote real `/mobile/sync/work-order-actions`. A injeção apensa as linhas à fonte que o extrator lê (`fs.readFileSync`) e faz o handler da rota aceitar os tipos, com a mesma permissão por ação do handler real (`work_orders:status`, `mobile-work-order-sync.ts:277-283`):
  - `probe-tipo.mts` → `field_technician`: `work_order.odometro=accepted · work_order.reboque=accepted · km_rapida=accepted · __inexistente__=rejected:unsupported_action_type`; `technician` igual; `viewer` → `rejected:permission_required`. **6 escritas** pelos papéis de campo.
  - `census-sync-v2` → `tipos: 439 | pares: 23 | curinga: 0 | não resolvido: 4`; `classify-v2 … snapshot-base.json` → `total=169 · NAO-CLASSIFICADA: 0`. **Guard verde.**
  - Controle (`inject-tipo-ctl.mts`: as mesmas linhas mais `"work_order.controle_r2"`, também aceito) → `tipos: 440 | pares: 24` e `NAO-CLASSIFICADA (na propriedade): SYNC …work-order-actions · work_order.controle_r2`. A emulação da fonte funciona, e a forma que o extrator acha é pega. As três formas N3a–c, **no mesmo arquivo e no mesmo handler**, não são pegas.
- O curinga (T4) não ajuda: ele só sonda `<família>.<inexistente>` e o tipo inexistente nu. Um handler com despacho **exato** (`===`) recusa os dois, que é a forma de todos os handlers de hoje (`mobile-work-order-sync.ts:213,227,245,260`).
- **Veredito parcial:** tipo novo num lote existente escapa **em silêncio** em três formas comuns. Uma delas é a que a v2 afirma cobrir. → achado **B2**.

### E5 — o censo de sync decide "não alcança" por SUBSTRING do motivo (`inject-motivo.mts`, `probe-motivo.mts`)

- O `census-sync-v2.mts` usa `naoAlcanca = /permission_required|role_required|tenant_required|unsupported_action/`, **sem âncora**. O `census-v2.mts` (HTTP), ao contrário, ancora em `^403:(…)$`.
- A casa já tem motivos de **validação de payload** que contêm essas substrings: `git grep -o '"[a-z_]*role_required[a-z_]*"' origin/main -- src` → `checklist_role_required` (400, `work-order.validators.ts:371-377`) e `user_role_required` (×4, `core-saas.service.ts`).
- N10: tipo novo `work_order.vistoria_set`, com literal que o extrator acha, num lote existente. O handler valida o payload com a regra que a casa já tem (sem `role` → `checklist_role_required`) e escreve quando o payload é válido. Mesma permissão por ação do handler real.
  - `probe-motivo.mts` → `field_technician`: payload do censo `rejected:checklist_role_required` · payload válido `accepted`; `technician` igual; **2 escritas**.
  - `census-sync-v2` → `tipos: 440` (o tipo **foi extraído**) `| pares: 23` (o par **foi descartado** como "não alcança").
  - `classify-v2` → `total=169 · NAO-CLASSIFICADA: 0`. **Guard verde.**
- **Veredito parcial:** uma recusa de **validação** é lida como recusa de **RBAC**. Um tipo que o técnico alcança e com o qual escreve sai do censo sem rastro. → entra no achado **B2**, pela mesma classe: no censo de sync, a pertença é decidida pelo que o censo **consegue ver**, não pelo RBAC.

### E6 — o 07c-a quebra fluxo legítimo? (pergunta 2; o A1 da r1 do lado do 07c-a)

- **Reexecução P3** do `probe-dispatch.mts` da r1 em `c1cfdabe`: a saída é a mesma. OS depois do despacho `{"status":"open"}`; o despachado responde e conclui a vistoria (200/200); muda o status do próprio despacho (200 `accepted`); recebe 403 `not_assigned_to_actor` no status da OS.
- **O despacho pelo mapa não usa nenhuma das 10 vias.**
  - `git grep -n "workOrderService\." origin/main -- src/modules/field-dispatch/*.ts`: o serviço de despacho só chama `workOrderService.get`, `freezeChecklistSnapshot` e o porto das vistorias (`:261,618,806,1023-1028`). Nenhuma chamada a `setMileage`, `geocode*`, anexo ou comentário.
  - Os chamadores dos métodos que o 07c-a muda (`git grep "\.setMileage(\|\.geocodeById(\|…\|\.detachTag("`) são só os controllers das 10 vias e o sync de OS (`mobile-work-order-sync.ts:247`).
  - O botão de geocode do mapa (`OperationsIncomingCallsList.tsx:142-152`) é usado pelos papéis de despacho. `field_dispatcher`, `operator` e `manager` são `tenant_wide` (`work-order.types.ts:90-104`) e não caem no guard. O `field_dispatcher` nem tem `work_orders:update`, que a rota de geocode exige: recebe 403 `permission_required` hoje e continua recebendo, sem mudança.
- **O app de campo não chama nenhuma das 10.**
  - `git grep -nE "/comments|/attachments|geocode" origin/main -- mobile/flutter_app/lib`, sem checklist → **0 linhas** (a v2 diz o mesmo).
  - O app **nunca produz** `work_order.mileage`. `WorkOrderSyncActionTypes` (`api_contracts.dart:48-60`) tem `status_update`, `create`, `approval_request`, `evidence_attach`, `unable_to_start` e `assign`. `git grep -i mileage` em `mobile/flutter_app/lib`, na `origin/main` e no head do #388 (`a24f58b5`), só acha o rótulo de timeline `work_order_mileage_updated`. `git log --all -S'"work_order.mileage"' -- mobile` → vazio.
  - A via 10 só é alcançada por requisição forjada. Fechá-la não tira nada do técnico despachado, e o R-a4 da v2 ("perde a km pelo sync") **superestima** o efeito.
- **Matriz:** `RBAC_MATRIX.md:45` dá ao `field_technician` "execute/update-**assigned**" em OS. O `manager` tem `work_orders:read/comment/create/status/update` no catálogo e o `operator` tem as mesmas. Os dois passam (`tenant_wide`), e o G-WIDE com `managerA` não fica vazio em nenhuma das 13 entradas.
- **O único efeito sobre o despachado sem atribuição** é no **console web**. O `field_technician` recebe o menu "dispatcher" (`appSidebarNav.ts:178-187`), com OS e detalhe, e tem `work_orders:comment`/`:update`. Hoje ele comenta e anexa em OS alheia pelo web; depois do 07c-a, só na atribuída. Isso está **conforme** a linha 45 da matriz e é o que a "porta única" da D1 reabre se a resposta for (b).
- **Veredito parcial:** nenhum fluxo de despacho legítimo perde acesso às 10 vias. O A1 da r1 **não se reproduz** do lado do 07c-a. Sobra uma nota: a v2 afirma o risco da km sem medir que o app não a produz.

### E7 — testes e mutações do 07c-a; o guard faz a via nova nascer negada?; a premissa nova do A4

- **A4 (km e recibos): a premissa da v2 está CERTA.** Medido em `origin/main:src/modules/mobile/mobile-work-order-sync.ts`:
  - recibos num `Map` de módulo (`:65`), com chave `${tenantId}:${userId}:${clientActionId}` (`:431-433`). O recibo é consultado **antes** de `processAction` (`:81-95`) e só guarda resultado `accepted` (`:99-105`): recusa e conflito não ficam no recibo. `resetMobileWorkOrderSyncRuntimeForTests` só faz `syncReceipts.clear()` (`:140-142`);
  - `setMileage` faz `this.get` (`:1253`) **antes** de ler a km (`:1255-1262`). A troca por `getForMutation` põe o escopo antes do 400 `mileage_required`;
  - `actionErrorResult` só leva 409 a `conflict` (`:302-314`, `isConflictError`), então o 403 sai `rejected`, como a r1 mediu no status (E5 da r1).
  - O S-KM-RESTART (1º reenvio `already_applied`, 2º `rejected not_assigned_to_actor` depois do reset) é **exequível** como está escrito.
  - Duas ressalvas de premissa, **nota**: (i) "o app marca a ação `failed` (até 5 tentativas)" é hipotético, porque o app não produz `work_order.mileage` (E6); (ii) "no mesmo processo" ≠ "sem reinício": com mais de uma instância de API, o reenvio que cai em outra instância já é o caso (ii) da v2, sem reinício nenhum.
- **Critérios × mutação** (a tabela do 07c-a.4, conferida item a item contra o desenho):
  - S-ANX, S-KM, S-COM, S-GEO, S-ORDEM, S-MOD, S-DUAL, G-NEG, G-POS e G-WIDE têm mutação que os derruba, e o desenho a sustenta. M4 derruba G-NEG da via 1 porque o corpo do G-NEG é `{}` e daria `400 multipart_required`. M8 também derruba o S-ROLES, embora a tabela não o diga.
  - **S-XT** não tem mutação: nenhuma das M1–M9 faz o cross-tenant deixar de ser 404.
  - **S-KM-RESTART** (1ª asserção) não tem mutação: nada põe o escopo antes do recibo.
  - Do guard, **T2** (envelhecida) e **T3** (camada sem caminho) não têm MG que os deixe vermelhos. O MG9 derruba o T1, não o T2. O CE-G1(c) pede a mutação que deixa o guard vermelho.
- **"Default negar" é presença, não classe** (`snapshot-malclass.json`):
  - com a injeção F1–F5 e o instantâneo acrescido de 3 linhas (`GET …/aceitar-por-link: LEITURA`, `POST …/:id/fechar: N`, `POST …/notas: N`), o `classify-v2` cai de 9 para **6** `NAO-CLASSIFICADA`, sem nenhuma outra falha. As 3 vias de escrita "na propriedade" ficam fora do laço G, que só lê `OS·07a`/`OS·07c-a`;
  - a coluna `prop` do `classify-v2.cjs` (`:13-15,38-39`) é **impressa e nunca afirmada**. Nenhum de T1–T8 exige que uma via com `prop=true` tenha classe `OS·*`/`·07c-b`. A v2 (C.2 item 6) chama isso de "regra só para marcar pertença". O guard deixa a via nova vermelha até alguém escrever **qualquer** classe, e a propriedade fica por conta da revisão humana do diff do instantâneo;
  - o laço G "lê do instantâneo" as entradas `OS·*`, mas o plano não diz o que acontece com uma entrada `OS·*` nova sem roteiro de requisição no teste: falhar ou pular.
- **Veredito parcial:** o desenho dos testes de encerramento das 10 vias está sólido e a premissa nova do A4 está certa. As lacunas são de guard: mutações faltando (S-XT, S-KM-RESTART, T2, T3) e a classe livre. São `ajuste`. As formas que escapam do gerador estão em E3–E5.

### E8 — a divisão: o 07c-a sozinho deixa caminho meio aberto, pior do que hoje? (pergunta 4)

- **Irmãs de dado, medidas:**
  - o anexo da OS (REST, guardado no 07c-a) e a evidência de OS (sync e upload, abertos até o 07c-b) são **armazenamentos distintos**: `git grep "WorkOrderAttachment|createUploadedAttachment" origin/main -- src/modules/mobile src/modules/evidence` → só uma referência de **download** (`storage-key-scope.ts:24`). Não existe anexo que um caminho grava e o outro apaga;
  - a km tem dois caminhos: o sync `work_order.mileage` (guardado no 07c-a) e o `PATCH /work-orders/:id/mileage`, que é só do escritório (`work_orders:mileage_correct`, `work-order.routes.ts:143-154`);
  - o despacho (aberto até o 07c-b) não chama nenhum método que o 07c-a guarda (E6). Aceitar ou concluir despacho alheio não esbarra no guard novo e não deixa estado pela metade.
- **Hoje × depois do 07c-a**, para o técnico não atribuído:
  - comentário, anexo, geocode e km passam de **aberto** a **403**;
  - vistoria, evidência e despacho seguem **abertos**, como hoje;
  - nenhuma via passa de fechada a aberta, e nenhuma escrita fica meio aplicada. Os 403 vêm antes de qualquer parse ou escrita (07c-a.2; S-ORDEM).
- **Travas de arquivo do `PLANO_SAN3.md:356-357`:**
  - `work-order.service.ts` é `SAN3-13 → 07c → SAN3-23`. A v2 reordena para `07c-a → SAN3-13`, mas o R.4 não traz a linha de registro dessa reordenação;
  - `mobile-work-order-sync.ts` é `07c → SAN3-16`, e a v2 não diz qual metade satisfaz a trava. O 07c-a não toca o arquivo, e o escopo do 07c-b também não o lista (E9).
- **Veredito parcial:** a divisão **não piora** nada em relação a hoje. As vias do 07c-a fecham inteiras, e as do 07c-b ficam como estão. O que sobra é registro: a reordenação das travas.

### E9 — o 07c-b e as decisões do dono (pergunta 5)

- **D1 e D2 estão claras quanto às opções e ao efeito de cada uma.** Cada opção vem com o efeito em português de negócio. A D1 traz a pergunta da equipe e a proposta de "ativo"; a D2 traz a opção (d) como saída que não exige mudança no app.
- **"Uma porta só" nomeia a porta errada** (plano, `:57-59` × `:171-175`):
  - a v2 diz que a D1 "muda o predicado em **um** lugar (`WorkOrderService.getForMutation`) … inclusive o status do 07a";
  - pelo desenho da própria v2, `update` e `changeStatus` **não** passam por `getForMutation`: chamam `assertMutationObjectScope` direto (`work-order.service.ts:852` e `:1319`, conferido em `origin/main`);
  - se a D1 for (b) e a mudança for feita onde o plano manda, o despachado ganha comentário, anexo, geocode e km, mas **continua** sem status e sem PATCH da OS. A porta que alcança as 13 vias é `assertMutationObjectScope`.
- **O texto que vai ao dono (R.2) mostra menos do que a D1 alcança.** Ele lista "vistoria, evidência, km e status". Pela porta única, a mesma resposta vale também para comentário, anexo, geocode e para o `PATCH /work-orders/:id`, que edita os campos da OS. Com (b), o técnico despachado passa a **editar a OS**. O dono decide sem ver isso.
- **A D2 não diz se cobre as vias do sync de OS**, o status (07a) e a km (07c-a):
  - as duas já recusam com `rejected` e caem no teto de 5 tentativas (o status, desde o 07a);
  - com (d), recusar como conflito, vistoria e evidência viram `conflicts[]`, e status e km continuam `rejected`, presos no aparelho;
  - para que km e status sigam a (d), o 07c-b teria de mexer em `mobile-work-order-sync.ts` (`isConflictError`, `:306`). Esse arquivo não está no escopo do 07c-b listado em 07c-b.4 e está na trava `07c → SAN3-16`.
- **O dono do A2 (teto de 5 tentativas) está certo.**
  - O `B-SAN3-16` (`PLANO_SAN3.md:287`) já toca `sync_replay_service.dart` e a fila do app.
  - A pendência nova `P-O6R-07C-APP-RECUSA-PERMANENTE-SEM-SAIDA` está classificada `pre-existente`, com severidade condicionada à D2 e teste de encerramento.
  - Não é o #388 nem o 07c-b, que é bloco de backend com `mobile/**` proibido.
  - A cadeia com D2 = (a) só fecha se a trava `07c → SAN3-16` for satisfeita pelo **07c-a**. Senão, o 07c-b espera o `SAN3-16`, que espera o 07c. A v2 não diz qual das duas metades satisfaz a trava.
- **Notas de desenho para o plano do 07c-b** (não bloqueiam a D1 nem a D2):
  - (b) exige que `WorkOrderService` consulte despacho ativo, mas `field-dispatch.service.ts:4,9` importa `work-orders`. O predicado teria de vir por referência injetada, como o `resolveActorOperatorProfileId`, e não por importação, senão vira ciclo;
  - (b) da D2 pressupõe um histórico de atribuição (quem era o técnico **em** T), que a v2 não mostra existir.
- **Veredito parcial:** depois que o dono responder, o 07c-b fica pronto para ser planejado. Antes de o texto ir ao dono, ele tem três ajustes de clareza: a porta certa, o alcance completo da D1 e o alcance da D2 sobre status e km.


## Apêndice — sondas da r2, verbatim (P3: roteiro de reexecução)

Rodadas com cwd = `C:/Users/AMP/w-07c` (head `f7334f34`, `src/` = `c1cfdabe`), `env -u DATABASE_URL -u REDIS_URL node --import tsx <arquivo>`, Node v20.19.5. Os geradores (`census-v2.mts`, `census-sync-v2.mts`, `tipos.mts`, `classify-v2.cjs`, `inject-prefixo.mts`, `prova-tipos.mts`) foram **extraídos do Apêndice A da v2 por `awk`, sem edição**; o `inject.mts` e o `probe-dispatch.mts` são os do apêndice da r1, sem edição. Ordem: `census-v2.mts <c2> [injeção]` → `census-sync-v2.mts <c2> <s2> [injeção]` → `classify-v2.cjs <c2> <s2> snapshot-base.json` (o instantâneo nasce de `classify-v2.cjs c2.json s2.json --gravar-snapshot snapshot-base.json` na linha de base). `inject-n1n2.mts` = `inject-novas.mts` com a linha do N9 (`r.post(["/work-orders/:workOrderId/via-array"], perm, ok);`) trocada por comentário. `inject-tipo-ctl.mts` = `inject-tipo.mts` com `"work_order.controle_r2"` acrescido ao `NOVOS` e a linha `if (action.type === "work_order.controle_r2") { … }` acrescida a `LINHAS`. `snapshot-malclass.json` = `snapshot-base.json` + 3 linhas (`GET …/aceitar-por-link: LEITURA`, `POST …/:id/fechar: N`, `POST …/:workOrderId/notas: N`).

### inject-novas.mts

```ts
// Crítica r2 do 07c — 3 FORMAS NOVAS de via mutante sobre a OS, no app REAL, antes do 404 de /api/v1.
// Todas passam o RBAC com work_orders:status (o técnico tem) e respondem 200 ("escreveu").
//   N1 — handler montado como MIDDLEWARE com caminho: r.use("/work-orders/:workOrderId/via-use", fn)
//   N2 — sub-APP Express (express()) montado no /api/v1 com uma rota POST de OS
//   N9 — controle: caminho em ARRAY (deve cair em "camada sem caminho de texto", T3)
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
export async function inject(app: any) {
  const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
  const imp = (p: string) => import(new URL(p, root).href);
  const req = createRequire(process.cwd() + "/package.json");
  const express = req("express"); const { Router } = express;
  const { attachAuthenticatedActor } = await imp("modules/auth/index.ts");
  const { tenantContextMiddleware } = await imp("modules/core-saas/middleware/tenant-context.middleware.ts");
  const { createPersistentRbacContextMiddleware } = await imp("modules/core-saas/middleware/persistent-rbac-context.middleware.ts");
  const { requirePermission } = await imp("modules/core-saas/middleware/rbac.middleware.ts");
  const perm = requirePermission("work_orders:status");
  const ok = (_q: any, s: any) => s.status(200).json({ data: { escreveu: true } });
  const r = Router();
  r.use(tenantContextMiddleware); r.use(createPersistentRbacContextMiddleware());
  // N1 — handler como middleware com caminho (sem Route): o método é testado dentro dele
  r.use("/work-orders/:workOrderId/via-use", (q: any, s: any, n: any) => (q.method === "POST" ? perm(q, s, () => ok(q, s)) : n()));
  // N9 — controle: caminho em array
  r.post(["/work-orders/:workOrderId/via-array"], perm, ok);
  const sub = express();
  sub.use(tenantContextMiddleware); sub.use(createPersistentRbacContextMiddleware());
  // N2 — sub-app Express
  sub.post("/work-orders/:workOrderId/via-subapp", perm, ok);
  const st = app.router.stack; const before = st.length;
  app.use("/api/v1", attachAuthenticatedActor(), r);
  app.use("/api/v1", attachAuthenticatedActor(), sub);
  const added = st.splice(before, st.length - before);
  st.splice(before - 1, 0, ...added);
  console.log("[inject-novas] camadas adicionadas antes do 404:", added.length);
}
```

### probe-novas.mts

```ts
// Alcance real, por HTTP, das formas novas (field_technician e technician, OS aleatória).
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
process.env.LOG_LEVEL = "silent"; process.env.CORE_SAAS_PERSISTENCE = "memory";
delete process.env.DATABASE_URL; delete process.env.REDIS_URL;
const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
const imp = (p: string) => import(new URL(p, root).href);
const { createApp } = await imp("app.ts");
const { CoreSaasRegistry } = await imp("modules/core-saas/services/core-saas.service.ts");
const { MemoryCoreSaasAdapter } = await imp("modules/core-saas/services/memory-core-saas.adapter.ts");
const { InMemoryCoreSaasStore } = await imp("modules/core-saas/store/core-saas.store.ts");
const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
const t = core.createTenant({ name: "n", modules: ["work_orders"] });
const app = createApp(new MemoryCoreSaasAdapter(core)); await (await import(pathToFileURL(process.argv[2]).href)).inject(app);
const server = app.listen(0, "127.0.0.1"); await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${(server.address() as any).port}`;
const id = randomUUID();
for (const role of ["field_technician", "technician", "viewer"]) {
  const h = { "content-type": "application/json", "x-tenant-id": t.id, "x-user-id": randomUUID(), "x-role": role };
  const out: string[] = [];
  for (const p of ["via-use", "via-array", "via-subapp"]) {
    const r = await fetch(`${base}/api/v1/work-orders/${id}/${p}`, { method: "POST", headers: h, body: "{}" });
    out.push(`${p}=${r.status} ${(await r.text()).slice(0, 34)}`);
  }
  console.log(role.padEnd(17), out.join(" | "));
}
server.close(); process.exit(0);
```

### layers-cegas.mts

```ts
// Quantas camadas do app REAL o walk do census-v2 PULA (sem .route e sem .handle.stack), e com que caminho de montagem.
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
process.env.LOG_LEVEL = "silent"; process.env.CORE_SAAS_PERSISTENCE = "memory";
delete process.env.DATABASE_URL; delete process.env.REDIS_URL;
const req0 = createRequire(process.cwd() + "/package.json");
const RouterPkg = createRequire(req0.resolve("express"))("router");
const origUse = RouterPkg.prototype.use;
RouterPkg.prototype.use = function (...args: any[]) {
  const before = this.stack.length; let path: any = "/";
  if (typeof args[0] !== "function") { let a = args[0]; while (Array.isArray(a) && a.length) a = a[0]; if (typeof a !== "function") path = args[0]; }
  const out = origUse.apply(this, args); for (const l of this.stack.slice(before)) l.__mount = path; return out;
};
const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
const imp = (p: string) => import(new URL(p, root).href);
const { createApp } = await imp("app.ts");
const { CoreSaasRegistry } = await imp("modules/core-saas/services/core-saas.service.ts");
const { MemoryCoreSaasAdapter } = await imp("modules/core-saas/services/memory-core-saas.adapter.ts");
const { InMemoryCoreSaasStore } = await imp("modules/core-saas/store/core-saas.store.ts");
const app = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
const cegas = new Map<string, number>();
(function walk(stack: any[], prefix: string) {
  for (const l of stack) {
    if (l.route) continue;
    if (l.handle?.stack) { walk(l.handle.stack, prefix + (l.__mount === "/" ? "" : l.__mount)); continue; }
    const k = `${prefix}${l.__mount === "/" ? "" : l.__mount} · ${l.handle?.name || "(anônima)"}`;
    cegas.set(k, (cegas.get(k) ?? 0) + 1);
  }
})((app as any).router.stack, "");
let n = 0; for (const [k, v] of cegas) { n += v; }
console.log("camadas puladas pelo walk:", n, "| distintas:", cegas.size);
for (const [k, v] of cegas) console.log(" ", v, k);
process.exit(0);
```

### prova-tipos-r2.mts

```ts
// Crítica r2: formas de tipo de ação que um dev escreveria no handler de um lote EXISTENTE.
import { extrairTipos } from "./tipos.mts";
const NL = String.fromCharCode(10);
const casos: Array<[string, string, string]> = [
  ["N3a template com o ponto DENTRO da constante", ["const WO = \"work_order.\";", "if (action.type === `${WO}odometro`) {}"].join(NL), "work_order.odometro"],
  ["N3b concatenação com +", ["const WO = \"work_order\";", "if (action.type === WO + \".reboque\") {}"].join(NL), "work_order.reboque"],
  ["N3c tipo sem ponto", "if (action.type === \"km_rapida\") {}", "km_rapida"],
  ["N3d constante de outro arquivo (import)", ["import { WO_MILEAGE_V2 } from \"./tipos.js\";", "if (action.type === WO_MILEAGE_V2) {}"].join(NL), "(definida em outro arquivo)"],
  ["controle: template com constante local resolvível", ["const D = \"work_order\";", "if (action.type === `${D}.via_template`) {}"].join(NL), "work_order.via_template"],
];
for (const [nome, fonte, esperado] of casos) {
  const r = extrairTipos(fonte);
  console.log(nome.padEnd(48), "| tipos:", JSON.stringify([...r.tipos]), "| naoResolvidos:", JSON.stringify(r.naoResolvidos), "| esperado:", esperado);
}
```

### inject-tipo.mts

```ts
// Crítica r2 — N3: tipo NOVO num lote EXISTENTE (/mobile/sync/work-order-actions), escrito de 3 jeitos que um dev
// escreveria no handler. (1) Emula a FONTE: quem lê mobile-work-order-sync.ts por fs.readFileSync (o extrator do
// census-sync-v2) vê as 3 linhas abaixo apensadas. (2) Emula o COMPORTAMENTO: o handler REAL da rota (depois do RBAC
// dela) passa a aceitar os 3 tipos e "escrever"; qualquer outro tipo segue para o handler original.
import fs from "node:fs";
const NOVOS = new Set(["work_order.odometro", "work_order.reboque", "km_rapida"]);
const LINHAS = [
  "const WO_PREFIX = \"work_order.\";",
  "if (action.type === `${WO_PREFIX}odometro`) { /* N3a */ }",
  "const WO_FAM = \"work_order\";",
  "if (action.type === WO_FAM + \".reboque\") { /* N3b */ }",
  "if (action.type === \"km_rapida\") { /* N3c */ }",
].join(String.fromCharCode(10));
export async function inject(app: any) {
  const orig = fs.readFileSync;
  (fs as any).readFileSync = function (p: any, ...rest: any[]) {
    const out = (orig as any).call(fs, p, ...rest);
    return typeof p === "string" && p.split(String.fromCharCode(92)).join("/").endsWith("src/modules/mobile/mobile-work-order-sync.ts") && typeof out === "string" ? out + String.fromCharCode(10) + LINHAS : out;
  };
  let alvo: any;
  (function walk(stack: any[]) { for (const l of stack) { if (l.route?.path === "/mobile/sync/work-order-actions") alvo = l; else if (l.handle?.stack) walk(l.handle.stack); } })(app.router.stack);
  const ultima = alvo.route.stack[alvo.route.stack.length - 1]; const h0 = ultima.handle;
  ultima.handle = (q: any, s: any, n: any) => {
    const acts: any[] = q.body?.actions ?? [];
    if (!acts.some((a) => NOVOS.has(a?.type))) return h0(q, s, n);
    // espelha requireActionPermission do handler real (work_orders:status, permissão por AÇÃO)
    if (!q.tenantContext?.permissions?.includes("work_orders:status")) return s.status(200).json({ data: { accepted: [], rejected: acts.map((x) => ({ client_action_id: x.client_action_id, status: "rejected", error: { reason: "permission_required" } })), conflicts: [] } });
    (globalThis as any).__escritas = ((globalThis as any).__escritas ?? 0) + 1;
    return s.status(200).json({ data: { accepted: acts.map((a) => ({ client_action_id: a.client_action_id, status: "accepted" })), rejected: [], conflicts: [] } });
  };
  console.log("[inject-tipo] handler do lote envolvido; rota:", alvo.route.path, "| camadas da rota:", alvo.route.stack.length);
}
```

### probe-tipo.mts

```ts
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
process.env.LOG_LEVEL = "silent"; process.env.CORE_SAAS_PERSISTENCE = "memory";
delete process.env.DATABASE_URL; delete process.env.REDIS_URL;
const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
const imp = (p: string) => import(new URL(p, root).href);
const { createApp } = await imp("app.ts");
const { CoreSaasRegistry } = await imp("modules/core-saas/services/core-saas.service.ts");
const { MemoryCoreSaasAdapter } = await imp("modules/core-saas/services/memory-core-saas.adapter.ts");
const { InMemoryCoreSaasStore } = await imp("modules/core-saas/store/core-saas.store.ts");
const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
const t = core.createTenant({ name: "tp", modules: ["work_orders"] });
const app = createApp(new MemoryCoreSaasAdapter(core)); await (await import(pathToFileURL(process.argv[2]).href)).inject(app);
const server = app.listen(0, "127.0.0.1"); await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${(server.address() as any).port}`;
for (const role of ["field_technician", "technician", "viewer"]) {
  const out: string[] = [];
  for (const type of ["work_order.odometro", "work_order.reboque", "km_rapida", "__inexistente__"]) {
    const id = randomUUID();
    const r = await fetch(base + "/api/v1/mobile/sync/work-order-actions", { method: "POST", headers: { "content-type": "application/json", "x-tenant-id": t.id, "x-user-id": randomUUID(), "x-role": role }, body: JSON.stringify({ client_batch_id: randomUUID(), actions: [{ client_action_id: id, type, payload: { work_order_id: randomUUID() } }] }) });
    const j: any = await r.json().catch(() => ({}));
    const a = [...(j?.data?.accepted ?? []), ...(j?.data?.rejected ?? [])][0];
    out.push(`${type}=${r.status}:${a?.status ?? j?.error?.reason ?? ""}${a?.error?.reason ? ":" + a.error.reason : ""}`);
  }
  console.log(role.padEnd(17), out.join(" | "));
}
console.log("escritas pelo handler novo:", (globalThis as any).__escritas ?? 0);
server.close(); process.exit(0);
```

### inject-motivo.mts

```ts
// Crítica r2 — N10: tipo NOVO, com literal ACHÁVEL ("work_order.vistoria_set"), num lote existente. O handler valida o
// payload com a regra que a casa já tem (work-order.validators.ts:371-377: sem `role` → 400 checklist_role_required)
// e, com payload válido, escreve. O census-sync-v2 julga "não alcança" por SUBSTRING (/role_required/ etc.).
import fs from "node:fs";
const TIPO = "work_order.vistoria_set";
export async function inject(app: any) {
  const orig = fs.readFileSync;
  (fs as any).readFileSync = function (p: any, ...rest: any[]) {
    const out = (orig as any).call(fs, p, ...rest);
    return typeof p === "string" && p.split(String.fromCharCode(92)).join("/").endsWith("src/modules/mobile/mobile-work-order-sync.ts") && typeof out === "string" ? out + String.fromCharCode(10) + "if (action.type === " + JSON.stringify(TIPO) + ") { /* N10 */ }" : out;
  };
  let alvo: any;
  (function walk(stack: any[]) { for (const l of stack) { if (l.route?.path === "/mobile/sync/work-order-actions") alvo = l; else if (l.handle?.stack) walk(l.handle.stack); } })(app.router.stack);
  const ultima = alvo.route.stack[alvo.route.stack.length - 1]; const h0 = ultima.handle;
  ultima.handle = (q: any, s: any, n: any) => {
    const acts: any[] = q.body?.actions ?? [];
    if (!acts.some((a) => a?.type === TIPO)) return h0(q, s, n);
    if (!q.tenantContext?.permissions?.includes("work_orders:status")) return s.status(200).json({ data: { accepted: [], rejected: acts.map((x) => ({ client_action_id: x.client_action_id, status: "rejected", error: { reason: "permission_required" } })), conflicts: [] } });
    const accepted: any[] = []; const rejected: any[] = [];
    for (const a of acts) {
      const role = a?.payload?.checklists?.[0]?.role;
      if (!role) rejected.push({ client_action_id: a.client_action_id, status: "rejected", error: { reason: "checklist_role_required" } });
      else { (globalThis as any).__escritas = ((globalThis as any).__escritas ?? 0) + 1; accepted.push({ client_action_id: a.client_action_id, status: "accepted" }); }
    }
    return s.status(200).json({ data: { accepted, rejected, conflicts: [] } });
  };
}
```

### probe-motivo.mts

```ts
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
process.env.LOG_LEVEL = "silent"; process.env.CORE_SAAS_PERSISTENCE = "memory";
delete process.env.DATABASE_URL; delete process.env.REDIS_URL;
const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
const imp = (p: string) => import(new URL(p, root).href);
const { createApp } = await imp("app.ts");
const { CoreSaasRegistry } = await imp("modules/core-saas/services/core-saas.service.ts");
const { MemoryCoreSaasAdapter } = await imp("modules/core-saas/services/memory-core-saas.adapter.ts");
const { InMemoryCoreSaasStore } = await imp("modules/core-saas/store/core-saas.store.ts");
const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
const t = core.createTenant({ name: "mt", modules: ["work_orders"] });
const app = createApp(new MemoryCoreSaasAdapter(core)); await (await import(pathToFileURL(process.argv[2]).href)).inject(app);
const server = app.listen(0, "127.0.0.1"); await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${(server.address() as any).port}`;
for (const role of ["field_technician", "technician"]) {
  const out: string[] = [];
  for (const [nome, payload] of [["payload do censo", { work_order_id: randomUUID() }], ["payload válido", { work_order_id: randomUUID(), checklists: [{ checklist_id: randomUUID(), role: "pickup" }] }]] as const) {
    const r = await fetch(base + "/api/v1/mobile/sync/work-order-actions", { method: "POST", headers: { "content-type": "application/json", "x-tenant-id": t.id, "x-user-id": randomUUID(), "x-role": role }, body: JSON.stringify({ client_batch_id: randomUUID(), actions: [{ client_action_id: randomUUID(), type: "work_order.vistoria_set", payload }] }) });
    const j: any = await r.json(); const a = [...(j?.data?.accepted ?? []), ...(j?.data?.rejected ?? [])][0];
    out.push(`${nome}=${a?.status}${a?.error?.reason ? ":" + a.error.reason : ""}`);
  }
  console.log(role.padEnd(17), out.join(" | "));
}
console.log("escritas:", (globalThis as any).__escritas ?? 0);
server.close(); process.exit(0);
```
