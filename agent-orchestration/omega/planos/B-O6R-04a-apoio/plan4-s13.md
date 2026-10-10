## 13. Pendências que NASCEM neste bloco (com dono) — e as que NÃO nascem

1. **`P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD` — dono: ato do dono (emenda 2-g).** Rodar `scripts/inventory-duplicates-census.sql` em staging (`STAGING_DATABASE_URL`) e produção
   (`PROD_DATABASE_URL`) **antes do próximo deploy** de cada uma; N = 0 → deploy livre; N > 0 → decisão humana por grupo (o outro estornado por compensação, nunca apagado) e só então o deploy.
   **Se a migração abortar, `prisma migrate resolve --rolled-back 20260873000000_add_stock_movements_unique_backstops` depois de sanear** (M-02, `[08]`). **Aviso:** `deploy-staging.yml` dispara
   em `push: main` quando `STAGING_DEPLOY_ENABLED=true` — o merge vira deploy nesse dia. **Anexo (R19):** a consulta de sessões `aberta` sobrepostas no mesmo item (mesma forma do `OVERLAP` do §3.5,
   sem `ANY`) para o dono rodar junto e decidir qual fecha primeiro. Entra na recontagem do `B-SAN3-10`. Registro em `agent-orchestration/controle/pendencias.md`.
2. **`P-O6R-B04-CONSUMIDORES-503` — dono: `B-O6R-04b`/frontend de estoque (a designar pelo orquestrador).** 503 `stock_busy`/`cycle_count_busy` é novo; o frontend e o app tratam 503
   genericamente hoje (hipótese, não medida); registrar em `API_CONTRACTS.md` (fora deste escopo).
3. **`P-O6R-B04-UI-STATUS-FECHANDO` — dono: bloco de frontend de estoque (a designar; sugestão: o próximo `B-SAN3-*` que tocar `frontend/src/modules/inventory/**`).** `CycleCountStatus`
   do frontend não conhece `fechando`; o adapter mapeia para "Aberta" e trata 422 com "Recarregue a lista"; **e os três códigos novos** — 422 `entry_already_adjusted`, 422 `close_in_progress`
   (a tela deve levar o usuário a recontar as pendentes), 409 `items_in_open_session` no `open` — precisam de texto próprio; levar tudo a `API_CONTRACTS.md` no mesmo bloco.
4. **Nota para `B-O6R-12` (papel de menor privilégio):** `FOR UPDATE`/`FOR SHARE`/`FOR NO KEY UPDATE` exigem `UPDATE`/`SELECT` em `inventory_items`, `cycle_counts`, `cycle_count_entries`
   **e `tenants`** para o papel da aplicação.
5. **Nota para o orquestrador (classe, fora deste bloco — inalterada do v2):** `sendRouteError` (`http.ts:51-59`) responde 400 com `error.message` cru a qualquer `Error` sem `statusCode`
   (v2 `[10-TOK]`); este bloco fecha a instância no módulo (503 de domínio); a classe é candidata a pendência transversal — decisão do orquestrador.
6. **Nota para a ata (classe P4, T-04):** o drill de DDL em base própria fecha a **instância** deste bloco; a classe "DDL de esquema compartilhado" (`pendencias.md:3868,6122`, dono "a atribuir")
   segue aberta e este bloco **não a reabre nem a fecha** — só declara que nenhuma suíte sua faz DDL na base compartilhada (D9).

**Não nascem:** `P-O6R-B04-ABANDONO-DE-FECHAMENTO` (a saída do `fechando` está DENTRO do bloco — S-01/emenda 3-n: `abortClose`, recontagem em `fechando`, `cancel` sem carimbos);
`P-O6R-B04-SUITES-LIST-CI` (emenda 1-c); journal em memória da porta (emenda 1-e); `P-O6R-B04-AJUSTE-SEM-BACKSTOP-DE-BANCO`; pendência de sessões sobrepostas (N-OVL fechado como propriedade
no bloco — emenda 3-p; o legado vai no anexo da 1). **Fecham na autoria:** `Ω6R-DAT-002`, `Ω6R-DAT-003` (emenda 1-b, com a nota de critério — 3-q); `P-020` (absorvida por `P-O6R-B04`) e
`P-021` ganham a linha "fechada na autoria pelo B-O6R-04a; backfill pós-merge". `P-O6R-B04` fica **parcial** (QUA-002 é do 04b).
