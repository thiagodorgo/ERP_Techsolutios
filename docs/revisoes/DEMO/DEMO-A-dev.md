# DEMO-A: relatório do dev (scripts da demonstração ao sócio)

- Identidade: `dev-demo-a-opus` · executor: subagente genérico Claude, modelo Claude Opus 5.5, nível menor declarado. Cobre o Codex (sem limite até 19:20Z), por decisão do dono: "Codex primeiro, Claude cobre".
- Mandato: `C:/Users/AMP/erp-pausa-2026-10-03/prompts/demo-a-scripts.md`. Plano: `DEMO-SOCIO-plano.md` (AC-03, AC-04, AC-05, AC-10).
- Ramo `feat/demo-socio-scripts` a partir da `origin/main` @ `c9a2d036`. Worktree `C:/Users/AMP/w-demo-a`, `npm ci` próprio, sem junction.

## Etapas (P1, gravadas uma a uma)

### E0 — terreno (2026-10-26 20:40Z)
- `git worktree add -b feat/demo-socio-scripts C:/Users/AMP/w-demo-a origin/main` → HEAD `c9a2d036`.
- `df -h /c` → 11 GB livres (acima do piso de 7 GB do mandato; o script da pilha exige 10 GB).
- `docker ps --format '{{.Names}}' | grep -v -E '^erp-'` → vazio (0 outros trabalhos).

### E1 — `npm ci` e subida da pilha (2026-10-26 ~20:50Z)
- `npm ci --no-audit --no-fund` no worktree → `added 326 packages in 7m`, exit 0.
- Senhas sorteadas (`TRC_DEMO_PASSWORD` e `DEMO_{MANAGER,ADMIN,TECH,DISPATCHER}_PASSWORD`) num arquivo do scratchpad com `umask 077`; nunca impressas.
- `TRC_DEMO_PROJECT=demo-socio node scripts/traccar-dev-demo.mjs --keep --with-web` lançado em background (saída no scratchpad).
- Pilha: `exit=0`, 24 passos OK, `[traccar-demo] VERDE` (o passo 24, web, levou 314 s). Contêineres (`docker ps --filter label=com.docker.compose.project=demo-socio`): web, api (criada 17:57:29 -03), traccar (17:49:20 -03), postgres, redis.

### E2 — `scripts/demo-socio-seed.mjs` (AC-03): seed rodado DUAS vezes (2026-10-26 ~21:10Z)
- Comando: `DEMO_*_PASSWORD=… node scripts/demo-socio-seed.mjs` (senhas do arquivo do scratchpad, por `source`).
- 1ª rodada: 19 passos OK + VERDE. Criados: organização 1 (6 módulos), usuários 4, credenciais 4, serviço 1, tabela de valores 1 (publicada), tarifa 1, clientes 3, viaturas 3, manutenções 2, multas 2, seguros 2, pátio 1, perfil normativo 1, processos 2, modelo de checklist 1 (publicado), regra 1 (SQL), vínculo `guincho01` 1 (SQL), OS reserva 1, OS de fundo 12 e 42 transições de status.
- 2ª rodada: 19 passos OK + VERDE, tudo "criados 0, já existiam N", "transições aplicadas 0", regra e vínculo "já existia". Idempotente.
- Contagem no banco depois das duas rodadas (`docker exec -i demo-socio-postgres-1 psql …`):
  `tenants=1 users=4 creds=4 service_catalog=1 vehicles=3 customers=3 work_orders=13 field_dispatches=0 bindings_guincho01=1 rules=1 modules=dashboard,work_orders,field_operations,tenant_checklist,finance,notifications`
  Status das OS: accepted 1 · assigned 1 · cancelled 1 · completed 4 · in_progress 1 · on_route 1 · open 3 (2 de fundo + a reserva) · paused 1.
- Senhas nos logs: `grep -cF "<senha>"` nos logs da pilha e das duas rodadas → 0 em todos (5 senhas × 3 arquivos).
- Caminho SQL declarado no código: módulos faltantes (só se faltarem; 0 nesta rodada), regra de aplicabilidade e vínculo do rastreador (não há rota). Organização e usuários pelo agregado core-saas dentro da `api` (o caminho do `traccar-dev-demo.mjs`; senha não tem rota). O resto, por REST.

### E3 — `--posicao`, trajeto (AC-04) e as provas do mandato (2026-10-26 ~21:15Z)
**`--posicao`** (`DEMO_TECH_PASSWORD=… node scripts/demo-socio-seed.mjs --posicao`, só a senha do guincheiro no ambiente):
```
[demo-seed] OK   1. trava: projeto demo-socio, API 127.0.0.1:3102, nada de base viva nem erp-* — terreno é o demo-socio (1004 ms)
[demo-seed] OK   2. API pronta — GET /health/ready (232 ms)
[demo-seed] OK   3. organização da demo (leitura por SQL) — encontrada (1367 ms)
[demo-seed] OK   4. posição inicial do guincheiro pelo caminho real do app — POST /mobile/field-locations — status 201; vale por 15 min no mapa (204 ms)
[demo-seed] VERDE — posição inicial enviada
```

**Trajeto** (`node scripts/demo-socio-trajeto.mjs`, padrão: 12 pontos, Av. Paulista, cadência pedida 5 s):
```
[demo-trajeto] OK   trava: projeto demo-socio, rede interna demo-socio_traccar_devices, traccar de pé
[demo-trajeto] enviando 12 pontos do guincho01, cadência pedida 5 s
[demo-trajeto] ponto 1/12 osmand_status=200 (envio 1941 ms)
[demo-trajeto] ponto 2/12 osmand_status=200 (envio 2789 ms)
[demo-trajeto] ponto 3/12 osmand_status=200 (envio 5132 ms)
[demo-trajeto] ponto 4/12 osmand_status=200 (envio 2788 ms)
[demo-trajeto] ponto 5/12 osmand_status=200 (envio 2683 ms)
[demo-trajeto] ponto 6/12 osmand_status=200 (envio 3966 ms)
[demo-trajeto] ponto 7/12 osmand_status=200 (envio 2998 ms)
[demo-trajeto] ponto 8/12 osmand_status=200 (envio 2979 ms)
[demo-trajeto] ponto 9/12 osmand_status=200 (envio 2289 ms)
[demo-trajeto] ponto 10/12 osmand_status=200 (envio 2908 ms)
[demo-trajeto] ponto 11/12 osmand_status=200 (envio 5075 ms)
[demo-trajeto] ponto 12/12 osmand_status=200 (envio 4184 ms)
[demo-trajeto] cadência medida: média 5.0 s (mín 5.0 s, máx 5.1 s) em 11 intervalos; pedida 5 s
[demo-trajeto] VERDE: 12/12 pontos com osmand_status=200
```

**Prova 1 e 2 — menu do gestor e o guincheiro no mapa** (login do gestor por `POST /auth/login`; `/operations/map` é rota da WEB: o mapa lê `GET /api/v1/field-locations/latest`, `frontend/src/modules/operations/map/operations-map.service.ts:41`):
```
login gestor (sem tenantId) -> 200
GET /navigation/menu -> 200 itens: Dashboard | Checklists | Notificações | Central de Notificações | Quilometragem | Acessos | Recusas | Dispositivos | Rastreamento | Checklists Operacionais | Ordens de Serviço | Mapa Operacional | Operadores em Campo | Orçamentos | Despachos | Pátios | Processos | Liberações | Leilões | Perfis Normativos | Tabela de Valores | Mapa Logístico | Financeiro | Cobranças | Faturas | Pagamentos
  contem "Painel" = false
  contem "Ordens de Serviço" = true
  contem "Modelos de Checklist" = false
  contem "Financeiro" = true
GET /field-locations/latest (fonte do /operations/map) -> 200 [{"operador":"Carlos Guincheiro","source":"mobile","idade_s":154}]
web GET http://127.0.0.1:18080/operations/map -> 200
  Painel (rótulo web: Dashboard)   path /dashboard                  -> PRESENTE (label da API: Dashboard)
  Ordens de Serviço                path /work-orders                -> PRESENTE (label da API: Ordens de Serviço)
  Modelos de Checklist             path /administrator/checklists   -> PRESENTE (label da API: Checklists)
  Financeiro                       path /finance                    -> PRESENTE (label da API: Financeiro)
  Pátios                           path /patios/patios              -> PRESENTE (label da API: Pátios)
  Mapa Operacional                 path /operations/map             -> PRESENTE (label da API: Mapa Operacional)
  total de itens no menu do gestor: 26
```
- O menu traz os quatro: Painel (`/dashboard`; a API e a barra lateral rotulam "Dashboard"), Ordens de Serviço, Modelos de Checklist (`/administrator/checklists`; a API rotula "Checklists", a barra lateral `appSidebarNav.ts:68` rotula "Modelos de Checklist") e Financeiro. Também Pátios e Mapa Operacional.
- O guincheiro aparece no `latest` (fonte `mobile`, a posição do `--posicao`), e a rota web `/operations/map` responde 200.

**Prova 3 — os pontos do `guincho01`** (SQL como `postgres` no contêiner da demo):
```
-- quarentena do guincho01 por motivo
no_operator_at_fix_time|1
-- colunas de contagem do episódio
first_seen_at
last_seen_at
delivery_count
-- recibos de posição do guincho01 / localizações por fonte na organização
recibos_posicao=0
mobile|1
-- despachos aceitos do Guincho 01
0
no_operator_at_fix_time|12|00:00:57.184883
```
- **Declaração: os 12 pontos foram para a QUARENTENA por "sem despacho aceito"** (`no_operator_at_fix_time`, 1 episódio com `delivery_count=12`), 0 recibo de posição e 0 localização `traccar` na organização. É o esperado sem o AC-01: nenhum despacho do "Guincho 01" tem `accepted_at` (contagem 0). Com o AC-01 (aceite no app gravando `accepted_at`), os pontos posteriores ao aceite entram como localização `traccar`.

### E4 — status/down (AC-05), folha de cola (AC-10), testes e baterias (2026-10-26 ~21:35Z)
- `bash scripts/demo-socio-status.sh` com a pilha de pé → `VERDE: api postgres redis traccar web de pé; API e web respondem 200` (lista os 6 contêineres, inclusive o `migrate` saído com 0, 3 redes e o volume `demo-socio_erp_prod_pg`).
- `bash scripts/demo-socio-down.sh` sem `--confirmo` → SIMULAÇÃO: lista 6 contêineres, 1 volume e 3 redes, nada removido.
- Recusas ao vivo:
  - `TRC_DEMO_PROJECT=erp-trc01-demo … demo-socio-seed.mjs --posicao` → `RECUSADO: projeto "erp-trc01-demo" não é "demo-socio"; projeto erp-* é proibido`, exit 1;
  - `TRC_DEMO_PROJECT=outro … demo-socio-trajeto.mjs` → `RECUSADO`, exit 1;
  - seed sem as senhas → `RECUSADO: defina DEMO_MANAGER_PASSWORD, …`, exit 1;
  - `TRC_DEMO_PROJECT=erp-x … demo-socio-down.sh --confirmo` → `RECUSADO`, exit 2.
- O trajeto com o `--name demo-socio-trajeto-guincho01-<ts>` (para o down alcançar um contêiner de trajeto órfão): `--pontos=4 --cadencia=3` → 4/4 `osmand_status=200`, cadência medida 3,0 s. Quarentena `no_operator_at_fix_time` foi a `delivery_count=15` (16 pontos enviados no total; 1 a menos contado no episódio — não investigado, fica como observação; nenhum entrou como localização).
- `tests/demo-socio-scripts.test.ts`: `node --test --import tsx` → 19/19; `npm test -- tests/demo-socio-scripts.test.ts` → `[run-backend-tests] 1 arquivo(s) · 19 teste(s) · pass 19 · fail 0 · skipped 0`.
- Vermelho-controle (mutação temporária no `demo-socio-lib.mjs`, restaurada; `git diff` limpo depois): sem a recusa de projeto → `not ok 2` (18/19); com `planEnsure` sempre criando → `not ok 7` e `not ok 8` (17/19).
- `npm run check` exit 0 e `npm run lint` exit 0 (depois de `prisma generate` com `DATABASE_URL` fictícia no worktree, como a CI); `git diff --check` exit 0; `bash -n` dos dois `.sh` OK.
- `.gitattributes`: `eol=lf` para os dois `.sh` (o checkout com `core.autocrlf=true` traria CRLF, e o bash quebra com `\r`). Única linha fora da lista de entregas; mesma convenção já usada para `scripts/db-runtime-role.sh`.

### E5 — pilha derrubada pelo `demo-socio-down.sh` (2026-10-26 ~21:40Z)
- `bash scripts/demo-socio-down.sh --confirmo --com-imagens` → removidos 6 contêineres, 1 volume, 3 redes e as 2 imagens `demo-socio-web:latest` e `demo-socio-migrate:latest`; `depois: contêineres 0, volumes 0, redes 0`; `VERDE`, exit 0.
- `bash scripts/demo-socio-status.sh` depois → "fora do ar" (API 000, web 000), exit 1, com o roteiro de "PC reiniciou".
- `docker ps` depois: só `erp-postgres` e `erp-redis` (intocados). A imagem compartilhada `erp-trc01-demo-api:local` ficou (o down nunca a remove).
- Disco: 8,9 GB livres no fim (11 GB no início; o `docker_data.vhdx` não encolhe sozinho, e o worktree tem `node_modules` próprio). Acima do piso de 7 GB do mandato; abaixo dos 10 GB que o script da pilha exige para a próxima subida (AC-08 do plano: liberar antes do ensaio).

## Observações para o revisor e o ensaio
1. **Quarentena por "sem despacho aceito" é o esperado hoje.** Depende do AC-01. O seed não cria despacho de propósito (a OS reserva nasce sem despacho, plano §1.2).
2. **Rótulos do menu.** A API rotula `/dashboard` "Dashboard" e `/administrator/checklists` "Checklists"; a barra lateral da web rotula o segundo "Modelos de Checklist" (`appSidebarNav.ts:68`) e o primeiro "Dashboard". O plano chama a aba de "Painel". A prova foi por caminho.
3. **Checklist "Vistoria de guincho":** só "Estado geral do veículo" é obrigatório. Foto e avarias são opcionais, porque o servidor da demo recusa arquivo (sem antivírus), e foto obrigatória travaria o "Concluir OS". A decisão da vistoria continua sendo do ensaio (plano §1.7).
4. **Tarifa:** a OS com cliente E serviço exige tarifa vigente (`work-order.service.ts:826-845`, 422 `tariff_not_found_for_service`). O plano não listava isso; o seed cria a tabela de valores publicada e a tarifa, senão a cena 3 falharia ao vivo.
5. **Senhas:** o seed regrava a credencial a cada rodada com o valor das variáveis (não duplica; permite trocar a senha).
6. **`/operations/map`** é rota da web, não da API; a prova usou a fonte de dados do mapa (`GET /field-locations/latest`) e o 200 da rota web.
