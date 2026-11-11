# B-O6R-12 — diário do dev

- **Executor:** `dev-o6r12-cdx` — Codex 2, GPT-5.6 Sol (nível menor declarado)
- **Verificador previsto:** Claude Opus, identidade nova
- **Ramo:** `fix/jurisdiction-profile-versioning`
- **Base:** `6f727afc0ed9eb40449d34cafb5ebf00a47c52f5`
- **Worktree:** `C:/Users/thiag/w-o6r12`
- **Banco:** `o6r12-pg`, PostgreSQL 16, `127.0.0.1:55492`

## F0 — 2026-11-11T01:45:47-0300

- `git diff --name-status d5ec1696..6f727afc -- <escopo>`: nenhum arquivo de produto,
  schema, migração, teste ou CI do bloco mudou; somente registros operacionais avançaram.
- `npm ci`: 326 pacotes instalados no worktree próprio; sem junction. Aviso preexistente de
  engine para `@prisma/streams-local`; auditoria npm reportou 44 vulnerabilidades da árvore
  bloqueada, sem alteração de lockfile.
- Primeira invocação de `npx prisma generate` sem `DATABASE_URL`: reportou
  `PrismaConfigEnvError`; repetida com a URL explícita e concluída em 2,77 s.
- `npx prisma migrate deploy` no `o6r12-pg`: 129 migrações aplicadas com sucesso.
- A crítica v2 foi lida integralmente. Seus 4 achados médios e 6 baixos viraram a Emenda E1 no
  comando do bloco antes do código.
- Decisões ratificadas: Q1 inclui prazos/leilão/liberação; Q3 = abertura; Q4 = valor atual no
  backfill; QA(a) = portal mostra o regime da abertura; QB(a) = duas linhas no `SUITES=`.
- **Executor da fatia:** `dev-o6r12-cdx`.
- **Próximo comando:** escrever F1 (testes novos), rodar vermelho-controle em `6f727afc` e
  registrar o TAP antes do código de produção.

## F1 — 2026-11-11T01:49:43-0300 — vermelho-controle

Os cinco arquivos novos foram executados isoladamente antes de qualquer código de produção:

| Suíte | Resultado no controle | `not ok` nominal |
|---|---:|---|
| `b-o6r-12-profile-audit` | 0/1, ec 1 | `ERR_MODULE_NOT_FOUND` para `jurisdiction.audit.js` |
| `b-o6r-12-memory-parity` | 0/1, ec 1 | segunda leitura devolveu `UNLIMITED/CALENDAR/PRIVATE_CONTRACT`, não o primeiro retrato |
| `b-o6r-12-regime-census` | 0/2, ec 1 | `jp.scope` vivo e pendência de fuso ausente |
| `b-o6r-12-regime-migration-drill-db` | 0/1, ec 1 | `ENOENT` para a migração nova |
| `b-o6r-12-regime-snapshot-db` | 0/1, ec 1 | catálogo trouxe 0, não 9 colunas `regime_*` |

- Comando: `node --test --import tsx <arquivo>`; suíte DB com `DATABASE_URL` do `o6r12-pg` e
  `CORE_SAAS_PERSISTENCE=prisma`; demais com persistência `memory`.
- Nenhum arquivo de produto foi alterado nesta fatia.
- **Executor da fatia:** `dev-o6r12-cdx`.
- **Próximo comando:** F2 — schema, migração, geração Prisma, carimbo/imutabilidade e mapeador;
  depois rodar drill, snapshot DB, guard de migração, K12 e check.

## F2 — 2026-11-11T01:58:10-0300

- Schema: 9 campos `regime_*`, relação tenant-first para `ServiceCatalog` e inversa.
- Migração `20260901000000_impound_process_regime_snapshot`: `BEGIN`/`COMMIT`, backfill por
  organização com GUC, 8 campos `NOT NULL`, FK curta (≤63 bytes), carimbo `BEFORE INSERT` e
  trava de imutabilidade. As duas funções usam `public.` e
  `SET search_path = pg_catalog, public` contra sombra `pg_temp`.
- Os dois caminhos de abertura fazem `requireProfileRegime` antes de gravar; perfil ausente
  continua 400. O trigger segue autoridade final. JSON de requisitos é validado como array e
  clonado antes de entrar no input Prisma.
- Mapeador expõe `ProcessRegime`; rollback não destrutivo e roteiro de correção excepcional ficam
  no rodapé da migração.
- Migração aplicada no `o6r12-pg`: 130/130. Guard: `migrações: 130 · violações: 0`.
- Testes F2: snapshot/drill **3/3**, 0 fail, 0 skip; K12 **1/1** selecionado, diff 72 = fixture
  72; `npm run check` e `prisma validate` verdes.
- Mutações com `not ok`, uma a uma e revertidas: C4, C5, C6, C7, C7b, C14, C16, C17
  (`42501 permission denied` ao revogar SELECT), C18 (K12 73 ≠ 72), C23, R2-1 (nome longo da
  FK) e R2-2 (`search_path` removido). A primeira forma do teste R2-2 olhava qualquer função e
  escapou; o teste foi corrigido para prender separadamente `$b12stamp$` e `$b12immut$`, e então
  ficou vermelho.
- `prisma format` gerou ruído em 1.936 linhas; somente o schema foi restaurado no worktree e os
  11 acréscimos autorizados foram reaplicados por patch. `git diff --check` limpo.
- **Executor da fatia:** `dev-o6r12-cdx`.
- **Próximo comando:** F3 — trocar a leitura de cobrança Prisma e congelar o contexto em memória;
  executar C1–C3 e C11–C13 com mutações.

## F3 — 2026-11-11T02:01:56-0300

- `loadAccrualContext` lê escopo/modelo/teto de `impound_processes.regime_*`; o JOIN do perfil
  ficou apenas para o catch-up do ponteiro nulo. Cópia não nula vence.
- O repositório em memória guarda o primeiro regime por processo e limpa o mapa no reset; o
  ponteiro nulo continua caindo no perfil atual.
- Comentário do motor corrigido para nomear o regime gravado na abertura.
- Testes: snapshot DB **3/3**, memória C11 **1/1** selecionado, `npm run check` verde.
- Mutações isoladas e revertidas, todas com `not ok`: C1 (teto vivo), C2 (modelo vivo), C3
  (escopo vivo), C11 (ignorar o retrato em memória), C12 (retirar catch-up) e C13 (perfil vivo
  vencer a cópia).
- **Executor da fatia:** `dev-o6r12-cdx`.
- **Próximo comando:** F4 — auditoria campo a campo, leitura bloqueada do perfil e fiação do
  controller; rodar C8/C9 e mutações.

## F4 — 2026-11-11T02:04:33-0300

- `computeProfileChanges` lista 11 campos. Valores `{from,to}` são preservados para enums,
  números, `active`, `name` e `release_requirements`; `notes` entra só em `changed_fields`.
- O Prisma adquire `FOR NO KEY UPDATE`, lê o antes e grava na mesma transação RLS. A escolha evita
  bloquear a FK da abertura; se abertura e PATCH concorrerem, o trigger carimba o perfil confirmado
  no instante do INSERT. A memória devolve a mesma forma de resultado.
- O controller grava `changed_fields` e `changes` na auditoria do PATCH; criação permanece com
  `{scope,active}`.
- Testes: C8/C9 + jurisdição **20/20**, `npm run check` verde.
- Mutações C8 (retirar metadata detalhada) e C9 (incluir `notes` nos valores) produziram `not ok`
  e foram revertidas. Durante a mutação C8, a primeira âncora textual acertou por engano o create;
  a inspeção revelou o erro, o create foi restaurado e o PATCH recebeu a fiação correta antes da
  validação final.
- **Executor da fatia:** `dev-o6r12-cdx`.
- **Próximo comando:** F5 — catraca de leitores vivos e pendência do fuso.

## F5 — 2026-11-11T02:05:08-0300

- Catraca declara `INSUMOS_VIVOS_DIARIA = [jp.daily_service_catalog_id, y.timezone]` e a
  allowlist dos leitores vivos remanescentes.
- Nasceu `P-O6R-B12-FUSO-DO-PATIO-VIVO`, MÉDIA, preexistente, dona da trilha `yard`.
- C22 verde (1/1 selecionado); mutação que remove `y.timezone` produziu `not ok` e foi revertida.
- C10 permanece deliberadamente vermelho nesta fatia porque notificações/leilão/liberação/painel
  só trocam a fonte na F6 seguinte; nenhum desvio foi escondido.
- **Executor da fatia:** `dev-o6r12-cdx`.
- **Próximo comando:** F6 — substituir os quatro leitores Prisma e três leitores de memória;
  fazer C10/C20/C20b-d/C21 verdes e executar as mutações.

## F6 — 2026-11-11T02:09:25-0300

- Notificações ao proprietário, elegibilidade de leilão, liberação e painel de pátios passaram a
  ler exclusivamente `impound_processes.regime_*`; nenhum deles mantém JOIN ou referência ao
  perfil normativo vivo.
- Os repositórios em memória de notificação, leilão e liberação guardam o primeiro retrato por
  processo e o reutilizam mesmo se o perfil for alterado depois.
- Testes da fatia: **45/45**, 0 fail, 0 skip; `npm run check` e `git diff --check` verdes.
- Mutações isoladas e revertidas, todas com `not ok`: C10 (JOIN vivo alternativo), C20
  (liberação viva), C20b (notificação viva), C20c (dia de leilão fixado em 90), C20d (painel
  fixado em 999) e C21a/C21b/C21c (desligar o retorno do retrato capturado em cada memória).
- **Executor da fatia:** `dev-o6r12-cdx`.
- **Próximo comando:** F6b — projetar no portal do proprietário apenas o regime da abertura,
  preservar o fallback histórico e executar C19 com mutação.

## F6b — 2026-11-11T02:11:14-0300

- Vermelho-controle: C19 falhou com `SyntaxError` porque `portalPlanFromRegime` ainda não existia.
- `portalPlanFromRegime` reduz o retrato a quatro chaves públicas: três prazos e requisitos
  `{label, required}`; não expõe escopo, tarifa, código interno nem campos de cobrança.
- O dossiê usa essa projeção quando `process.regime` existe. Somente o processo legado sem retrato
  consulta `getPortalProfile`, preservando o fallback registrado na catraca.
- Testes da fatia: C8/C9/C19 + portais **3 pass, 2 skip de banco sem URL nessa invocação**;
  `npm run check` e `git diff --check` verdes. As suítes RLS serão repetidas com banco na bateria.
- Mutação C19 que voltou incondicionalmente ao perfil vivo produziu `not ok` e foi revertida.
- **Executor da fatia:** `dev-o6r12-cdx`.
- **Próximo comando:** F7 — incluir exatamente as duas suítes no CI, fechar registros e executar
  a bateria final completa.

## SUCESSÃO P3 — 2026-11-11T06:23:04-0300 — `dev-o6r12-cl` assume

- **Executor a partir daqui:** `dev-o6r12-cl`, Claude Opus 5.5 (subagente da sessão), dev SUCESSOR
  do `dev-o6r12-cdx`, que caiu às 02:20 por limite de uso de 5 h, no meio da bateria final. Exceção
  declarada: o Claude cobre na hora (§C7 item 6, "As IAs externas vêm primeiro"). Como o dev passa a
  ser Claude, o verificador desta parte deve ser de outra casa (§C7 item 11(1)).
- **Medido antes de tocar em nada (o parcial é roteiro, não conclusão):**
  - `git log --oneline origin/main..HEAD`: 8 commits do Codex (`fb681899` F0, `aee21526` F1,
    `a19bae62` F2, `0b12eb67` F3, `73bb5f1b` F4, `98f444ec` F5, `c7bfd3a6` F6, `bf27332f` F6b);
    base `6f727afc`. A `origin/main` andou para `b6caf568` (#527, #532, #533), com 1 migração nova
    anterior à do bloco (`20260899200000_users_must_change_password`) e mudança no `schema.prisma`.
  - `git status --short`: 9 rastreados alterados sem commit (`ci.yml` com as 2 linhas do `SUITES=`;
    comando, log, `pendencias.md`, `pendencias-indice.md` regenerado, `PLANO_SAN3.md`; drill com o
    C7/C7b real; snapshot-db com o C15; `owner-portal-dossier-rls` com a asserção do regime) e 2 TAP
    soltos (`.b-o6r12-db.tap`, `.b-o6r12-unit.tap`).
  - TAP deixado pelo Codex: unidade 46/46; `-db` 33/38 — o drill C7/C7b novo falhava com `25P02`, e
    3 casos do `san3-05-runtime-role-guard-db` (T14a/b, T14c, T14d) falham por ambiente:
    `setsid: ausente`, que o Git Bash do Windows não tem.
  - `o6r12-pg` de pé (5 h), 130 migrações aplicadas, só o banco `postgres`, nenhum papel efêmero
    sobrando.
- **Conferência linha a linha contra o plano v2 + E1 (o que os commits cobrem):**
  - **Código de produto: conforme**, com 4 pontos a acertar:
    1. memória de cobrança e de notificações sem a linha literal `    if (captured) return captured;`
       que as mutações C11 e C21a do §3.2 apagam (leilão e liberação têm);
    2. o serviço anexava `auditChanges` ao objeto do perfil (`Object.assign`, que no repositório em
       memória muta o objeto guardado) e o controller lia por cast; a linha do controller não é a
       âncora literal da C8;
    3. a E1.8 diz `FOR UPDATE`, e o código usa `FOR NO KEY UPDATE`. O código está certo: é a saída
       que a própria crítica R2-8 mediu sem bloquear a abertura. A E1.8 vai ser corrigida por
       escrito (E1.8′), com teste;
    4. a constante `CHANGE_VALUE_FIELDS` em várias linhas não tem a âncora literal da C9.
  - **Testes: abaixo do plano.** Faltam os testes de propriedade de C1, C2, C3 e C12 (acúmulo e
    extrato pelo serviço, com o perfil editado por `JurisdictionService.update`, §3.1), a C8 por HTTP
    no `-db` (A7), a catraca por superfície R1–R4 contra `LEITORES_VIVOS` e a igualdade de conjunto
    da C22 (A13), C20/C20b/C20c/C20d como teste de banco (hoje só a regex da catraca as pega), o drill
    que relê e EXECUTA a migração numa base própria (C4–C7b, C14, C16, C23: hoje um teste estático de
    regex espelha as âncoras das mutações, que é a forma que o §3.0 item 1 e o A6 recusam), e os
    testes da E1.8, E1.9 e R2-2.
- **Decisão:** COMMITAR o parcial, não refazer. O produto está conforme e as 6 fatias de código
  batem com o §6; refazer custaria horas sem informação nova. O que fica abaixo do plano é TESTE, e
  se completa por cima, na mesma fatia de cada critério. O parcial sem commit entra assim: as 2
  linhas do `SUITES=` ficam; a C15 fica; o drill C7/C7b é reescrito: o vermelho `25P02` não se reproduziu
  rodando o arquivo sozinho (06:25, 2/2 verdes), mas o arnês tem defeito medido — o `ROLLBACK` desfaz
  também o `SET ROLE` emitido na mesma consulta, e o corpo seguia como superusuário (sonda: `SET ROLE x;
  BEGIN; SELECT 1/0; COMMIT;` → `ROLLBACK` → `current_user` = `postgres`), logo a C7b não era provada; a asserção do regime
  em `owner-portal-dossier-rls` fica, declarada pelo R3 (reforça um teste existente; o stub passa a
  devolver o perfil editado); os 2 TAP soltos são apagados; o índice de pendências é regenerado
  depois do merge da `main`.
- **Próximo comando:** acertar os 4 pontos do produto, completar os testes por critério com
  vermelho-controle e mutação literal, e só então a bateria final.

## RECARIMBO DA MIGRAÇÃO — 2026-11-11T07:00:38-0300 — `dev-o6r12-cl`

- O #530 entrou na `main` (`a0979f51`) com `20260901000000_ass08b_provider_one_enabled_per_kind`,
  o mesmo carimbo da migração do bloco. Primeiro ela foi para `20260902000000` (commit `e43ace59`,
  pelo §2.2.4 do plano: "renumerar se já estiver tomado").
- Às 06:56 o orquestrador mandou recarimbar para DEPOIS de `20260901090000`, por causa da trava de
  `prisma/**` (`D-B-O6R-09-TRAVA-PRISMA-OPCAO-A`): a primeira migração com PR verde pega a trava, e
  o #537 (`B-O6R-09`, `20260901090000_field_dispatch_idempotency_key`) está à frente. A migração do
  bloco passa a `20260901100000_impound_process_regime_snapshot`; o texto não muda, só o nome do
  diretório e as 2 referências literais (o `resolve --rolled-back` do cabeçalho e o
  `MIGRATION_NAME` do drill). A menção a `20260901000000` na F2, acima, é histórica.
- **A ordem vale nos dois casos.** Se o #537 mergear antes, a deste bloco aplica depois da dele.
  Se este mergear antes, a do #537 tem carimbo anterior, e o `migrate deploy` aplica toda migração
  pendente, então ela entra depois sem conflito: as duas não tocam as mesmas tabelas
  (`field_dispatches` × `impound_processes`).
- Medido depois do recarimbo, em bases novas do zero (132 migrações): `migration-transaction-guard`
  0 violações; drill 11/11, snapshot-db 12/12 e a catraca de catálogo verdes, `# skipped 0`; K12
  verde sem tocar a fixture.

## F7 + testes de propriedade — `dev-o6r12-cl`

### Vermelho-controle (os testes novos rodados com o código de LEITURA da `main` `a0979f51`)

Comando: os 14 arquivos de leitura (`charge-prisma`, `impound.notifications-prisma`,
`auction-prisma`, `release-prisma`, `patios-dashboard-prisma`, `owner-portal.service`, os 4 de
`jurisdiction/` e os 4 repositórios em memória) trocados por `git show origin/main:<arquivo>`, com o
schema, a migração e o `create` do bloco no lugar; depois `git checkout HEAD -- <arquivo>`, status
limpo conferido. TAP em `vermelho-controle.tap` (scratchpad do dev).

| Critério | Resultado no controle | Motivo medido |
|---|---|---|
| C1 (+C3, C13 no mesmo teste) | `not ok` | 30 diárias, não 40 (teto vivo `THIRTY_DAYS_LEGACY`) |
| C2 | `not ok` | `nDueNow` 2 (CALENDAR vivo), não 0 |
| C8 | `not ok` | metadata sem `changes` |
| C10, C10 positivo, C22 | `not ok` | 6 JOINs vivos fora da allowlist; `jp.daily_cap` e outros como insumo |
| C11, C21a, C21b, C21c | `not ok` | a 2ª leitura em memória devolve o perfil editado |
| C19 (`owner-portal-dossier-rls`) | `not ok` | prazo em 99 dias do perfil vivo, não nos 10 da abertura |
| C20 | `not ok` | o requisito `laudo`, acrescentado depois, entra na liberação |
| C20b | `not ok` | o processo sai do rito ao trocar o escopo |
| C20c | `not ok` | `auctionEligibleDay` 90, não 60 |
| C20d | `not ok` | o alerta `OWNER_INITIAL` cai em entrada + 15 dias, não + 5 |
| C12, C15, C17, C4/C5/C6/C16 (base da CI) | `ok` | controle positivo: são do gatilho e do `create`, que ficaram |
| E1.8′ | `not ok` | a API da `main` não devolve `{profile, changes}` (critério novo, sem controle aplicável) |
| C9, C19 (allowlist §2.8) | o arquivo não carrega | `jurisdiction.audit.ts` e `portalPlanFromRegime` não existem na `main` (função nova) |

### Mutações literais — uma por vez, só o teste-dono, arquivo restaurado e conferido por sha256

Ferramenta: `mutar.cjs` (scratchpad do dev): confere `grep -c` = 1 da âncora, aplica, roda o
teste-dono por `--test-name-pattern`, restaura e compara o hash. TAP de cada uma em `mut-<id>.tap`.

| ID | Arquivo: troca | Teste-dono | Resultado |
|---|---|---|---|
| C1 | `charge-prisma`: `ip.regime_daily_cap AS daily_cap` → `jp.daily_cap AS daily_cap` | C1 + C3 + C13 | `not ok` (30 ≠ 40) |
| C2 | `charge-prisma`: `ip.regime_daily_model AS daily_model` → `jp.daily_model …` | C2 | `not ok` (2 ≠ 0) |
| C3 | `charge-prisma`: `ip.regime_scope AS scope` → `jp.scope AS scope` | C1 + C3 + C13 | `not ok` (escopos `[PUBLIC, PRIVATE]`) |
| C12 | `charge-prisma`: o `COALESCE(...)` → `ip.regime_daily_service_catalog_id AS …` | C12 | `not ok` (0 ≠ 5) |
| C13 | `charge-prisma`: o `COALESCE` invertido | C1 + C3 + C13 | `not ok` (S1 e S2) |
| C8 | `jurisdiction.controller`: a linha `metadata` → `{ scope, active }` | C8 | `not ok` |
| C9′ | `jurisdiction.audit`: `CHANGE_VALUE_FIELDS = ["name", "scope",` → `["notes", "name", "scope",` | C9 | `not ok` (a âncora do plano mudou com a E1.3) |
| C10 | `release-prisma`: JOIN com alias `p` depois de `FROM impound_processes ip` | C10 | `not ok` |
| C10b (nova) | `yard.service`: uma linha `SELECT 1 FROM jurisdiction_profiles x` noutro módulo | C10 | `not ok` |
| C11 | `charge.repository`: apaga `    if (captured) return captured;` | C11 | `not ok` |
| C15 | `impound-prisma`: `throw invalidProfileReference()` → `throw new Error("perfil ausente")` | C15 | `not ok` |
| C18 | `schema.prisma`: `regime_daily_cap … String` → `String?` | K12 | `not ok` (fixture sem edição) |
| C19 | `owner-portal.service`: `portalPlanFromRegime(process.regime)` → `await …getPortalProfile(…)` | `owner-portal-dossier-rls` | `not ok` |
| C20 | `release-prisma`: SELECT de `jp.release_requirements` + JOIN | C20 | `not ok` |
| C20b | `notifications-prisma`: o filtro de escopo volta a ler o perfil | C20b | `not ok` |
| C20c | `auction-prisma`: `… AS auction_eligible_day` → `90 AS …` | C20c | `not ok` |
| C20d | `patios-dashboard-prisma`: `… AS owner_notif_days` → `999 AS …` | C20d | `not ok` |
| C21a/b/c | as 3 memórias: apaga `    if (captured) return captured;` | C21a/b/c | `not ok` ×3 |
| C22 | census: tira `"y.timezone"` de `INSUMOS_VIVOS_DIARIA` | C22 | `not ok` |
| E1.8′ | `jurisdiction-prisma`: `FOR NO KEY UPDATE` → `FOR UPDATE` | E1.8′ | `not ok` (`55P03` lock timeout) |
| C4 | migração: `NEW."regime_daily_cap" := p."daily_cap";` → `:= 'SIX_MONTHS';` | drill C4/C5/C16 | `not ok` |
| C5 | migração: a mesma linha → `COALESCE(NEW."regime_daily_cap", p."daily_cap")` | drill C4/C5/C16 | `not ok` |
| C6 | migração: apaga o `CREATE TRIGGER "impound_processes_regime_immutable" …` (com `public.`, E1.2) | drill C6 | `not ok` |
| C7 | migração: `AND ip."tenant_id" = v_tenant;` → `AND false;` | drill C7 | `not ok` (deploy aborta) |
| C7b | migração: `PERFORM set_config(…)` → `PERFORM 1;` | drill C7b | `not ok` (23502 no SET NOT NULL) |
| C14 | migração: apaga a 1ª linha do rodapé (`DROP NOT NULL`) | drill C14 | `not ok` (23502) |
| C16 | migração: apaga o `RAISE … foreign_key_violation …` | drill C4/C5/C16 | `not ok` (23502 ≠ 23503) |
| C23 | drill: `splitRespectingDollarQuotes(corpoC7b)` → `splitNaive(corpoC7b)` | drill C7b | `not ok` (42601) |
| R2-2 | migração: sem `public.` no SELECT do carimbo E sem `pg_temp` no `search_path` | drill R2-2 | `not ok` |
| R2-2 só `public.` / só `pg_temp` | uma camada de cada vez | drill R2-2 | `ok` ×2 — esperado: cada camada sozinha basta (E1.2′) |

Depois da mudança do arnês de papéis (E1.11′), C7b, C23, R2-2 e C14 foram repetidas: `not ok` ×4.

### Bateria final (head `9f04b611` mais este registro; base `origin/main` `a0979f51` contida)

| Passo | Resultado |
|---|---|
| `npm run check` · `npm run lint` · `npm run build` | ec 0 · ec 0 · ec 0 |
| `node scripts/migration-transaction-guard.mjs` | `migrações: 132 · anteriores: 112 · novas: 20 · violações: 0` |
| `git diff --check origin/main...HEAD` | limpo |
| testes do bloco SEM banco (census, profile-audit, memory-parity, charging-daily-engine, jurisdiction, db-catalog-write-guard) | `# tests 51 · pass 51 · fail 0 · skipped 0` |
| testes do bloco COM banco (`CORE_SAAS_PERSISTENCE=prisma`: snapshot-db, drill, cheque-title-link (K12), charging-job-idempotency, impound-notifications-chain, impound-concurrency, owner-portal-dossier-rls, rls-tenant-isolation, san3-05-runtime-role-guard-db) | `# tests 55 · pass 50 · fail 5 · skipped 0`; os 5 são do `san3-05`, de ambiente (abaixo) |
| `npm test` na forma do job `backend` (`CORE_SAAS_PERSISTENCE=memory`, Postgres 16 e Redis 7 próprios, base nova com as 132 migrações), 07:00:57 → 07:16:30 | `491 arquivos · 5061 testes · pass 5047 · fail 11 · cancelled 1 · skipped 2` (orçamento de pulos: 2) |

**Os vermelhos do `npm test`, um a um, todos de ambiente (Windows e máquina a 80–100% de CPU por
outras frentes); nenhum toca `impound_processes`, `jurisdiction_profiles` ou o código do bloco:**

1. `ass-08-channel-db` T-OBX-db-5 — `o claim não esperou a trava (1035 ms < 1 000)`: tempo sob carga.
   Sozinho: 21/21.
2. `traccar-ingest-listener` "o app público não serve a rota…" — `test timed out after 30000ms`.
   Sozinho: 18/18.
3. e 4. `traccar-position-ingestion-db`, os 2 casos "tempo esgotado → 503" — orçamento de tempo sob
   carga. Sozinho: 22/22.
5. `traccar-event-migration-drill-db` (o 1 `cancelled` e o piso de denominador do runner) —
   `EBUSY: resource busy or locked, rmdir …\Temp\trc02-mdrill-…`: o schema-engine do Prisma segura a
   pasta temporária no Windows. Sozinho: 6 ok e o mesmo `EBUSY` no hook (a mesma classe que este
   bloco contornou no próprio drill com `maxRetries`).
6. e 7. `san3-09-bootstrap-platform-admin-db` T2/T2.1 — o teste chama `node node_modules/.bin/prisma`,
   que no Windows é um script de shell (`SyntaxError: missing ) after argument list` na linha
   `basedir=$(dirname …)`). No Linux é o link para o JS. Sozinho: o mesmo.
8. a 10. `san3-05-runtime-role-guard-db` T14a/b, T14c, T14d — `setsid: ausente — necessário para
   impedir que psql \password leia a senha do terminal`. O Git Bash não tem `setsid`. Os casos param
   antes de exercitar o procedimento, então não provam nada sobre o bloco aqui; quem decide é a CI
   Linux.
11. `san3-05` T15 — `condição de boot não apareceu em 15000ms`, com stdout e stderr vazios. Medido:
    só a carga dos módulos do app (`import('./src/app.ts')` por `tsx`) leva 11 984 ms com a CPU a 80%.
    No TAP do Codex às 02:18, com o código do bloco, o T15 passou (18 s). O bloco não muda nada no
    boot.

**Residual declarado:** os casos 8 a 11 não exercitam o procedimento do papel de runtime nesta
máquina. A prova fica para os jobs `backend` e `backend-postgres` da CI, no Linux, sobre o head do PR.

### Escopo conferido por laço (`git diff --name-only origin/main...HEAD`, 35 arquivos)

- Todos dentro do PERMITIDO do §4 com a E1/E1′, com 3 notas: `owner-portal.service.ts` muda a l.339 e
  ganha o `import` de `portalPlanFromRegime`, que a troca exige; `owner-portal-dossier-rls.test.ts`
  entra pelo R3; `db-catalog-write-guard.test.ts` entra pela E1.11′.
- `charge.accrual.ts`: o Codex tinha mudado também o comentário da l.5, e o §4 só permite o da l.14.
  Revertido; fica só a l.14.
- PROIBIDO intocado: `Kpis/**`, `frontend/**`, `mobile/**`, lockfiles, `package.json`, a fixture
  `prisma-migrate-diff-baseline.sql`, `src/modules/yard/**`, o resto de `owner-portal/**`,
  `impound.checklist-link-prisma.repository.ts`, `san3-05-runtime-role-guard-db.test.ts` e
  `scripts/db-runtime-role.sh`. O `.github` muda só nas 2 linhas do `SUITES=`.

## Conserto pós-pré-revisão (`prerev-539-cl`, APROVADO com 4 não graves) — `dev-o6r12-cl`

O fluxo do §C7 10(3)1 manda o dev consertar. O orquestrador atribuiu a este dev a P539-02 e a
P539-03. A P539-01 e a P539-04 não são deste dev: o orquestrador escreve a emenda de ratificação, e a
junta ataca a E1′.

- **P539-02 (dinheiro, lacuna de teste).** A trava `impound_process_regime_immutable` guarda 10
  colunas, e os testes afirmavam só 2.
  - Novo no drill: "C6 (por coluna)". Sob o papel de runtime `NOSUPERUSER NOBYPASSRLS`, com o GUC da
    organização, há uma tabela de 10 casos, um subteste por coluna. O valor novo de cada caso é
    válido para o tipo e para as FKs, de modo que sem a trava o UPDATE passaria. Cada caso afirma a
    recusa `23514`.
  - Dois subtestes de controle: a tabela de casos é igual a `profile_id` mais toda coluna `regime_*`
    do `information_schema`, e o papel atualiza o `status` (`rowCount` 1).
  - Complemento: o C4/C5/C16 do drill passa a afirmar o carimbo do ponteiro do serviço-diária
    (antes, só a C13 do `-db` o via).
- **Mutações literais da P539-02**, cada uma sozinha, com o arquivo restaurado por sha256.
  - Para cada uma das 10 colunas, tirar a cláusula `NEW."<coluna>" IS DISTINCT FROM OLD."<coluna>"`
    da trava deixa vermelho SÓ o caso daquela coluna (`# fail 2` = o subteste mais o pai).
  - O ponteiro: `not ok 12 - recusa mudar regime_daily_service_catalog_id`. Antes, essa mutação
    sobrevivia à suíte inteira.
  - As outras 9, todas executadas: `profile_id`, `regime_scope`, `regime_owner_notif_days`,
    `regime_notice_edict_day`, `regime_auction_eligible_day`, `regime_auction_edict_business_days`,
    `regime_daily_model`, `regime_daily_cap` e `regime_release_requirements`.
  - O MEU2 da pré-revisão (o carimbo grava o ponteiro NULL) agora fica vermelho no drill:
    `not ok 7 - … C4/C5/C16`.
- **P539-03 (arnês).** Cada cenário do drill derruba o PRÓPRIO clone num `finally`, e o papel que
  criou só depois (`derrubarBase`, depois `derrubarPapeis`). O papel dono de tabela só cai depois que
  a base cai.
  - O `after` repete os dois, com `IF EXISTS`, como rede de segurança.
  - O único `DROP ROLE` literal passou para o helper, e a catraca de catálogo segue em 11 (1 CREATE
    ROLE, 1 DROP ROLE, 6 GRANT, 2 OWNER TO, 1 REVOKE).
  - Medido: depois do drill, 0 bases `%b12%` e 0 papéis `b12%`.
  - O corpo do PR foi corrigido: se o processo for morto, sobram as bases E os papéis. O prefixo `b12_`
    fora das famílias varridas do arnês vira pendência do orquestrador (o `SWEPT_ROLE_FAMILIES` está
    fora do PERMITIDO e não foi tocado).
- `main` trazida de novo (#538, `2f8a9a5e`). Conflito só em registro: as duas entradas ficam, e o
  índice foi regenerado.
- **Bateria do bloco depois do conserto (08:28 → 08:37):**
  - com banco: `# tests 68 · pass 63 · fail 5 · skipped 0`. As 5 falhas são os mesmos casos de ambiente
    do `san3-05` (T14a/b, T14c e T14d pelo `setsid`, e o T15), que a pré-revisão viu verdes na CI Linux.
  - sem banco: `51/51`, `# skipped 0`.
  - `migration-transaction-guard`: 132 migrações e 0 violações; `check` e `lint` com ec 0;
    `git diff --check` limpo.
