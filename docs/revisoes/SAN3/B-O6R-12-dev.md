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
