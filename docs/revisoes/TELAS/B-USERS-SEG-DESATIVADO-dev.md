# B-USERS-SEG-DESATIVADO — diário do dev

> **Identidade:** `dev-users-desat-cl`, identidade de dev DECLARADA: Claude Opus 5.5 (subagente da sessão), nível menor.
> Exceção declarada (§C7 itens 6 e 11(6)): o Codex 1 está sem cota semanal até 16/11, o Codex 2 ocupa uma cadeira de
> junta e a API está no limite do dia até 21:00. A pré-revisão e a conferência ficam com outro modelo. Não escrevi o
> plano nem o critiquei.
> **Plano:** `erp-pausa-2026-10-03/planos/B-USERS-SEG-DESATIVADO-plano.md`, com a Emenda 1 (A1 a A13), que prevalece.
> **Respostas do dono seguidas (ainda abertas):** P1 = (a), P2 = (a). O PR nasce em rascunho.
> **Terreno:** worktree `C:/Users/thiag/w-desat`, ramo `fix/users-seg-desativado`, base `origin/main` =
> `a0979f513b1554f776b1eab1cbeae43ecffd9dd2` (#530). `npm ci` próprio (sem junction) e `prisma generate`.
> Postgres 16 `devdesat-pg` em 127.0.0.1:55497 (bancos `devdesat`, migrado sem seed, para E-mem; `devdesat_seed`,
> migrado com seed, para E-pg). Redis 7 `devdesat-redis` em 127.0.0.1:56497. Portas conferidas livres antes de subir.
> Toda hora vem de `date` (relógio local, SP).

---

## F0 — testes primeiro (iniciada 07:16 SP)

### Censo da base de novo (E1.1-1, HIPÓTESE 444/74)

- Comando: `./node_modules/.bin/tsx <censo>/censo-desativado.mts base-sonda1.tsv` e `censo-desativado-fake.mts
  base-sonda2.tsv`, cwd `w-desat` em `a0979f51`, 07:23–07:25 SP. md5 `4fe27440dd6c9fca622fbf99cbbbfdbf` (sonda 1) e
  `e46d0ed3cf05796a97c06bf1d93ec08f` (sonda 2), no scratchpad (`devdesat/censo/`).
- **FATO:** universo = **444 rotas e 73 camadas** com caminho, 0 sem caminho. A HIPÓTESE da emenda (444/74) acertou as
  rotas e errou as camadas: a rota nova do #530 (`POST /api/v1/webhooks/billing/:provider`) não trouxe camada nova.
  Piso do T9-db: 444 rotas e 73 camadas.
- Sonda 1: 372 rotas e 72 camadas passam pelo RBAC persistente (a rota do webhook dá `500 AUTHORIZATION_CONTEXT_ERROR`,
  porque com o canal desligado ela segue para as montagens seguintes). Sonda 2: 364 rotas e 7 camadas dão
  `403 role_required`; o webhook dá `404 route_not_found` (passou por 56 resoluções do RBAC).
- **As 4 rotas de `/attachments` (HIPÓTESE da 1.2):** com o corpo da sonda, `GET` 422 `entity_type_required`, `POST`
  400 `multipart_required`, `GET …/download` e `DELETE` 404 `attachment_not_found`. **LEITURA:** a permissão é
  conferida no serviço depois de resolver a entidade (`attachment.service.ts:36`, `:56`, `:162`, `:175-177`), então
  com corpo e entidade válidos o conjunto vazio de permissões do desativado dá `403 ATTACHMENT_FORBIDDEN`. Não medi com
  entidade real (exigiria anexo no banco); com o portão, as 4 caem no 401 antes (o T9-db cobre).

### Testes escritos (sem `src/`) e o vermelho-controle NA BASE (`a0979f51`, estágio declarado: base)

Comando por arquivo: `node --test --test-reporter=tap --import tsx <arquivo>`; os `-db` com
`DATABASE_URL=postgresql://postgres:dev@127.0.0.1:55497/devdesat` (migrado, sem seed), os de memória com
`CORE_SAAS_PERSISTENCE=memory` e sem `DATABASE_URL`. TAPs em `scratchpad/devdesat/f0/`. 07:30–07:58 SP.

| Teste | Arquivo | Na base | Forma do vermelho |
|---|---|---|---|
| PT·0 | `users-seg-desativado-portao-db` | ok | (atributos do papel; não é teste do portão) |
| T1 | idem | not ok | `200 !== 401`; **1 OS no banco** criada pelo desativado (FATO: o C2CL-02 reproduzido, `accepted` pela API) |
| T1b | idem | not ok | `/me/tenants` `200 !== 401` |
| T2 | idem | not ok | `super_admin: 200 !== 401` (o 1º papel do catálogo; o laço para nele) |
| T3 | idem | not ok | token de B em `/me/tenants` `200 !== 401` (HIPÓTESE da 1.2 confirmada: o par de B segue com acesso) |
| T4 | idem | not ok | `/mobile/bootstrap` `200 !== 401` depois do reset |
| T5, T5b, T6, T6b, T7, T8, T11, T12 | idem | not ok | `200 !== 401` (a sessão encerrada segue aceita) |
| T19 (a) | idem | not ok | `200 !== 401` |
| T19 (b) | idem | **ok** | controle: verde nas duas pontas (o esperado da E1.7) |
| T9-db | `users-seg-desativado-varredura-db` | not ok | `rotas=444 mwComCaminho=73 fora=511` (todas as 438 rotas que leem o token e as 73 camadas aceitam o desativado de algum jeito; 4 min, porque cada uma atravessa até 56 resoluções do RBAC) |
| T9-mem | `users-seg-desativado-varredura` | not ok | `ERR_MODULE_NOT_FOUND` (`session-liveness.service.js` não existe) |
| T10a, c, d | `users-seg-desativado-emissao-db` | not ok | `sid` ausente ≠ `session_id` |
| T10b | idem | not ok | idem, depois do ajuste de fixture abaixo (antes dele: `login 401`, a forma ERRADA) |
| T13, T14, T15b | `users-seg-desativado-portao` | not ok | `ERR_MODULE_NOT_FOUND` |
| T15 | idem | not ok | `sid 123: 200 !== 401` |
| T13b | `users-seg-desativado-orcamento-db` | not ok | `200` em 271 ms (`503` esperado) |
| T16 | `users-seg-desativado-sse-db` | not ok | o stream segue aberto 32,0 s depois da desativação, só com `event: ready` |
| T16b-1 a 6 | `users-seg-desativado-sse` | not ok | `ERR_MODULE_NOT_FOUND` |
| T17 | `users-acesso-seg-portao-estatico` | not ok | `(d')` a lista fechada de imports do portão (a 1ª asserção; o G2 antigo segue `ok`) |
| S4·c | `users-acesso-seg-desativacao-db` | not ok | `expected 401, actual 403` (o inverso do que a crítica mediu, como a E1.6 prevê); S4·0, S4·a, S4·b e A3 `ok` com o modo forçado |

**Desvios e achados de fixture desta fatia (declarados):**
1. **T10b — o login sem organização não roda sob o papel efêmero.** A função elevada `auth_login_candidates` sai da
   migração sem nenhum privilégio de execução (`20260868000000_add_auth_identities/migration.sql:257`); a ativação é ato
   humano do runbook. Sob o papel efêmero o login anônimo responde `401` (medido). Conceder o privilégio no teste
   escreveria catálogo (o `db-catalog-write-guard` é lexical e vetaria o arquivo novo). Ajuste: o arnês ganhou a opção
   `candidatosPeloAdministrador`, que SÓ a `-emissao-db` usa: a listagem de candidatos atravessa a função pela conexão
   do administrador; a verificação da credencial, a criação da sessão e a assinatura seguem no papel efêmero. O que o
   T10b prova (a assinatura do caminho sem organização leva o `sid`) não depende do privilégio da função.
2. **Helper novo** `tests/helpers/users-seg-desativado-sessao.ts` (PERMITIDO: "um helper novo em `tests/helpers/` para
   sessão real"): monta o app real com o Prisma global no papel efêmero, cria organização, usuário, administrador e
   papéis globais que faltarem (sem seed), e desmonta escopado aos ids da fixture.
3. **S4·c: os asserts do modo e do A9 ficam ANTES do `app.listen`**, não depois. Medido: com eles entre o `listen` e o
   `getBaseUrl`, o evento `listening` já tinha passado e o teste travava até o `timeout` (ec 124). Continuam antes da
   primeira requisição, como a E1.6 item 3 pede.
4. **`users-seg-desativado-portao.test.ts`:** o `import()` da conferência vem ANTES de montar o servidor. Na base, com
   o módulo ausente, o servidor montado antes ficava aberto e o processo não saía (ec 124, medido).
5. **Orquestrador, 07:45 SP:** a `P-ORG-SUSPENSA-NAO-CORTA-ACESSO` (A8) já nasce no PR de registro #538. Na F4 eu só a
   referencio (e apenso nota, se couber), sem criar outra com o mesmo ID, e atualizo o ramo com a `main` antes do PR.

**Contagem:** 12 arquivos de teste tocados (9 novos, contando o helper; 3 estendidos). Testes novos da P-SESSAO-VIVA:
16 (`portao-db`, PT·0 incluso) + 1 (`varredura-db`) + 1 (`varredura`) + 4 (`emissao-db`) + 4 (`portao`) + 1
(`orcamento-db`) + 1 (`sse-db`) + 6 (`sse`) + 1 (T17) = **35**, mais o S4·c reescrito. Meta do plano: ≥ 10.
