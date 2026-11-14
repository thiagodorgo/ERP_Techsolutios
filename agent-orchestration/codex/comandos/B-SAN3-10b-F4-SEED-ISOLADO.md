# B-SAN3-10b-F4-SEED-ISOLADO — demonstração reproduzível numa pilha isolada (item 44, F4 do 10b)

- **Tipo:** feature (scripts e testes novos; nenhum código de produto)
- **Fase:** Execution / Validation
- **Trilha:** backend/raiz (`scripts/demo-isolado/` e `tests/demo-isolado-*`), mais o ensaio fora do repositório
- **Data:** 2026-11-14
- **Branch:** `feat/demo-seed-isolado` (criado pelo Dev A na F1a, `6b3c31c3`)
- **Autor deste comando:** `reg-10bseed-cl`, redator de registro da F0b, Claude Opus 5.5, nível menor declarado. Escrito do
  zero: o plano do bloco (v2) e as Emendas 1, 1.1 e 1.2 ficam fora do repositório, porque citam a pasta privada e o
  roteiro privado. Em divergência entre este comando e o plano, vale o plano, na ordem v2 → Emenda 1 → 1.1 → 1.2 (a mais
  nova vence).
- **Bloco pai:** `B-SAN3-10b` (roteiro técnico de operação, item 44). Fecha a parte F4 que ficou ADIADA no PR #500
  (`P-SAN3-10B-F4-SEED-ISOLADO`).

## Por que só o Claude trabalha neste bloco

- **Ordem do dono de 13/11 (~23:12 SP), literal:** *"claude, agora eh so vc. faca um plano para vc atacar tudo sozinho,
  deixe as ias dormindo, vc vai pegar tudo, nas juntas cadeiras em paralelo, quero dar o maior gas agora, minhas decisoes
  vao todas nas recomendacoes. esta liberado usar fable se assim o julgar necessario. pode empurar agentes ate o
  sistema/pc aguentar. faca o plano e me retorne com a previsao para eu atorizar o inicio"*. Início autorizado às ~23:20
  SP (*"pode comecar"*). Transcrição do registro do orquestrador, fora do repositório (`REGISTRO-PENDENTE.md`, 13/11 23:19 e
  23:23). O ID da ordem (`D-CLAUDE-SOLO-1311`, nome proposto pelo inspetor da J-555) entra no PR de registro do dia.
- **Consequência, pelo §C7 item 11(2):** sem crédito para cruzar de casa, *"usar um modelo so, sem preferencia e com
  metas a seguir, rigoroso e eficaz"*. Todo verificador é uma **identidade Claude nova**, que não fez o que confere. As
  regras (3) a (7) do item 11 valem iguais: aceite na forma real, crítica que executa, pré-revisão com roteiro fixo,
  orquestrador fora do objeto julgado e executor por fatia no diário.
- **Todo artefato declara:** `autor`, `verificador`, o modelo e a frase "sem cruzamento: IAs externas paradas por ordem
  do dono".
- **Modelo:** Claude Opus 5.5, nível menor declarado, em todos os papéis. O topo (as Emendas 1 e 1.1) rodou em Fable;
  o v2 rodou em Opus por fallback declarado. Se o limite do Claude acabar, vale a parada do §C7.6-bis: não se desce de
  modelo.

## Objetivo

Subir do zero, numa pilha Docker isolada, uma organização de exemplo com nomes genéricos e todo o estado que os quatro
fluxos do roteiro de 02/11 pedem, sem tocar a base viva, e então executar a F4 de verdade (os quatro fluxos, com
`bloqueados=0`). A organização e o primeiro administrador nascem por uma **fundação** que usa o serviço do produto (sem
SQL, sem schema novo); todo o resto passa pela API real, por um **motor** só HTTP, e um **verificador** só leitura confere
o resultado. O que reproduz o roteiro privado (overlay, matriz e errata) fica fora do repositório.

**Fora deste bloco:** consertar os defeitos de produto achados na medição (viram pendência, abaixo); o console da
plataforma criar organização de verdade (`B-SAN3-18b`); o ensaio do emulador (44-B3), que corre à parte e tem de fechar
antes da F9.

## Contexto / fontes de verdade

- Ler antes: `agent-orchestration/docs/status-geral.md`, `agent-orchestration/controle/`,
  `agent-orchestration/codex/log-execucao.md`, `PROJECT_MEMORY.md` e o `CLAUDE.md` da `origin/main` (§A7).
- Fontes (§A1): `RBAC_MATRIX.md`, `docs/deployment.md` (o runbook de ativação do login sem organização, l.741-784),
  `docs/ROTEIRO-DEMO-E-OPERACAO.md`, `docs/revisoes/SAN3/PLANO_SAN3.md` (item 44).
- Plano do bloco, fora do repositório: v2, Emenda 1 (o §E14 é a ordem das fatias), Emenda 1.1 e Emenda 1.2. Os anexos
  `…-ref-*.txt` deles são protótipo, não entregável.
- Comando pai: `agent-orchestration/codex/comandos/B-SAN3-10b-roteiro-de-operacao.md`.

## Decisões do dono que valem

- **`D-SEED-10B-RESPOSTAS-1311`** (13/11, pela recomendação): P1 versionar a demonstração genérica; P2 o roteiro de 02/11
  roda como está, com errata de ambiente escrita antes; P3 nenhuma data do sistema recua; P4 a organização nasce pelo
  script da fundação, só na pilha isolada; P5 a OS em dobro do app ao reiniciar vira pendência MÉDIA com dono, sem
  segurar este bloco.
- **`D-SEED-10B-Q-E11-1-RUNBOOK-INTEIRO`** (14/11, pela recomendação): em toda pilha descartável nova, o ensaio executa o
  runbook inteiro de ativação do login sem organização (`docs/deployment.md:741-784`, passos 0 a 7). É a **única exceção**
  à proibição de conceder `EXECUTE` neste bloco (ver PROIBIDO).
- As duas estão em `agent-orchestration/controle/decisoes.md`.

## Contratos / Endpoints

- **Nenhuma rota nova, nenhum contrato novo.** O motor usa só rotas que já existem em `/api/v1`, cada uma com o papel que
  tem a permissão dela (o motor nunca pede com papel sem a permissão da rota).
- **Todo login manda `tenantId`:** o da plataforma vem do arquivo `plataforma.tenant-id`, gravado pela fundação; os da
  organização vêm do `overview` da plataforma. Há um ponto de login em cada arquivo (motor e verificador).
- A troca da senha provisória é pela rota do produto (`POST /api/v1/auth/password`); a fundação não escreve credencial.
- Idempotência: rodar o motor duas vezes, inclusive com a API reiniciada no meio (V3), não duplica nada. O motor desvia do
  recibo em memória do sync de OS (`P-SYNC-OS-RECIBO-EM-MEMORIA`).

## Regras (segurança · dado · permissão)

- **Travas fail-closed, antes de qualquer conexão:** alvo de API só em `127.0.0.1` na faixa do ensaio; alvo de banco sem
  `?` nem `#` no texto bruto, com porta explícita, conferido pelo parser do próprio driver, sem as 2 variáveis do dotenv, e
  reconferido depois do import; Redis sem valor padrão; sonda de escrita; trava de execução única com `wx`; lista fechada
  de argumentos antes de qualquer import.
- **Censo na fonte real:** a fundação recusa base com outra organização além da `platform`, base com administrador de
  plataforma de e-mail fora de `.invalid` e `platform` sem usuário. O censo de idempotência exclui só as ações `auth.%`.
- **Sem escrita direta:** nenhum `create`/`update`/`delete` de modelo, nenhum SQL cru, nenhum `$executeRaw`/`$queryRaw` em
  `scripts/demo-isolado/`; banco só na `fundacao.ts`; dinheiro nunca por `number`.
- **Segredo fora de log e de saída:** a provisória vai para arquivo com `wx` e é apagada quando a troca dá 200; segredo
  nunca em argumento, log, evidência, commit ou corpo do PR.
- **Nada privado nem real no repositório:** fixture com nomes genéricos e e-mails só em `@exemplo.invalid`; nenhum
  conteúdo do roteiro privado, da pasta privada ou do plano no repositório, no commit ou no corpo do PR.
- **Medição sob o papel de runtime:** toda medição de API do bloco roda a API com papel `NOSUPERUSER NOBYPASSRLS`
  (linha `PAPEL_DA_API f|f` no artefato); a fundação e o teste `-db` rodam como o papel que migra.

## Escopo PERMITIDO

No repositório, só arquivos novos, salvo o registro:

- `scripts/demo-isolado/alvo.mjs`, `fundacao.ts`, `semear.mjs`, `verificar.mjs`, `censo.sql`, `fixture-exemplo.json`,
  `matriz-exemplo.tsv` e `README.md` (só as extensões `.mjs`, `.ts`, `.sql`, `.json`, `.tsv` e `.md`; C10d).
- `tests/demo-isolado-alvo.test.ts`, `tests/demo-isolado-fundacao-db.test.ts`, `tests/demo-isolado-motor.test.ts` e
  `tests/demo-isolado-fixture.test.ts` (entram pelo `scripts/run-backend-tests.mjs`, sem tocar `package.json` nem
  `.github/**`).
- `agent-orchestration/codex/comandos/B-SAN3-10b-F4-SEED-ISOLADO.md` (este comando).
- `agent-orchestration/controle/pendencias.md` e `decisoes.md`: só acréscimo. `pendencias-indice.md`: só a saída do
  gerador. `agent-orchestration/codex/log-execucao.md`: só acréscimo.
- **Só no PR de registro (F10):** `docs/ROTEIRO-DEMO-E-OPERACAO.md` (com o passo de ativação da Q-E11-1), a ata
  `agent-orchestration/omega/juntas/J-<n>-b-san3-10b-seed.md`, a pasta `agent-orchestration/omega/juntas/votos/<JUNTA>/`,
  o parecer do porteiro e o `agent-orchestration/docs/status-geral.md`.

**Regra de arquivos entre os 2 devs:** só o Dev A toca `alvo.mjs`, `fundacao.ts` e os 2 testes deles (a exceção é o stub
da fixture, só na F1a); só o Dev B toca o resto de `scripts/demo-isolado/` e os outros 2 testes. Cada um faz
`git pull --rebase` antes de cada push, e nenhum empurra com teste do bloco vermelho.

Fora do repositório: o diretório de ensaio da 10b (overlay, matriz, errata, log, censos, script da F4 e o diretório de
segredos, apagado no fim); no ambiente de ensaio da 10b, só a tabela de portas por projeto, as listas de projeto e de
worktree, o inventário, a linha do manifesto do app antigo e a porta de permissão do APK; pilhas `b10b-seed`,
`b10b-seed-ctl`, `b10b-seed-pr`, `b10b-seed-pr-ctl`, `b10b-seed-c1`, `b10b-seed-c2`, `b10b-seed-c2-ctl` e `b10b-seed-conf`
nas portas 3111 a 3118 (e `+40` para a 2ª API do V0), sem o serviço `web`; a `b10b-f3` (3101) só no 44-B3; a `b10b-f4`
(3101, a única com o `web` na 8080) só na F9.

## Escopo PROIBIDO

- `prisma/**` inteiro (inclusive `seed*.ts` e `seed-guard.ts`), `src/**`, `frontend/**`, `mobile/**`, `.github/**`,
  `Kpis/**`, `infra/**`, `docker-compose*.yml`, `Dockerfile`, `package.json` e os lockfiles.
- `.env*`, `CLAUDE.md`, `AGENTS.md`, `.claude/**`, `.agents/**`, `docs/demo-credentials.md`,
  `docs/revisoes/SAN3/PLANO_SAN3.md` e `docs/revisoes/DEMO-UX/**`.
- Na fundação: escrita direta de modelo, SQL cru, `$executeRaw`/`$queryRaw`, `advisory lock`, escrita de credencial e
  `REDIS_URL` ou `DATABASE_URL` com valor padrão no código. Import estático de `src/`, `@prisma` ou `dotenv` (só
  `await import()` respeita a ordem das travas).
- **Conceder `EXECUTE` em `auth_login_candidates` neste bloco** (Emenda 1.1, §2, §9.6 e a PARADA do §13), **com uma
  exceção só** (`D-SEED-10B-Q-E11-1-RUNBOOK-INTEIRO`): o runbook de ativação de `docs/deployment.md:741-784`, passos 0 a
  7, executado na pilha DESCARTÁVEL do ensaio. Continua proibido, sem exceção, o `GRANT <role_dona> TO <role_da_app>`
  (`docs/deployment.md:782-784`). **Leitura do redator, declarada (§A6):** a exceção não vale no repositório (nenhum
  `GRANT` em migração, script do papel, teste, fundação ou motor) nem em pilha que não seja descartável.
- Login do motor sem `tenantId`; medir a API do bloco como superusuário; passar o `DATABASE_URL` da pilha pelo argv do
  host; push com teste do bloco vermelho; filtrar do censo qualquer ação além de `auth.%`; o motor pedir com papel sem a
  permissão da rota; pathspec sem aspas nos comandos do C10a e do C10b.
- Na máquina: os contêineres, as portas (3000, 5173, 5432, 6379), o worktree e o emulador da demonstração ao vivo;
  `docker system prune`; subir o `web` (8080) fora da `b10b-f4`; usar a 3101 e a 3102 em pilha do seed; mudar arquivo Dart
  no worktree do app antigo; 2 emuladores ao mesmo tempo; vermelho-controle apontado para a demonstração ao vivo ou para
  conta real; segredo em argumento, log ou evidência.

## Fatias, na ordem

| Ordem | Fatia | Quem | Depende de |
|---|---|---|---|
| 0 | 44-B2b, conferência da Emenda 1.1 (APROVADO COM AJUSTES → Emenda 1.2) | `rev-seed-e11-cl` | — (feita) |
| 1 | F0b, este registro e este comando | `reg-10bseed-cl` | 44-B2b |
| 1 | F5, matriz e errata do roteiro (fora do repositório) | `matriz-10bseed-cl` | 44-B2b |
| 1 | F1 (começa pela F1a, já empurrada), travas puras e `tests/demo-isolado-alvo.test.ts` | Dev A | 44-B2b |
| 2 | F3, motor ET1 a ET3, fixture, verificador, C6 e C7 | Dev B | F1a |
| 2 | F2, fundação e o teste `-db` (C4-db) | Dev A | F1 |
| 3 | F4, motor ET4 a ET8, C6b, C6-e1, C6-e11 e `censo.sql` | Dev B | F3 |
| 3 | F0c, ambiente de ensaio (fora do repositório) | Dev A | F2 |
| 4 | F0d, conferência do ambiente | `conf-amb-10bseed-cl` | F0c |
| 5 | F4s, ensaio na pilha (V0 a V11, com o V3 reiniciando a API) | Dev B | F2, F4, F0d |
| 6 | F6, pré-revisão do código, roteiro fixo (M3) | `prerev-10bseed-cl` | F4s, F5 |
| 7 | F7, PR, CI, inspetor, junta uma vez, triagem, um conserto, conferência (§C7 item 10(3)) | orquestrador e junta | F6 |
| 8 | F8, merge, porteiro e limpeza pós-merge | orquestrador e `port-10bseed-cl` | F7 |
| 9 | F9, a F4 de verdade, na pilha `b10b-f4` com a `main` pós-merge | `demo-exec-10b-v2-cl` | F8, 44-B3 e o passo da Q-E11-1 com o par medido |
| 10 | F10, PR de registro | `reg-10bseed-cl` | F9 |
| à parte | 44-B3, ensaio do emulador | `ens-44b3-cl` (conferência `conf-44b3-cl`) | 44-B2b, F0c e o passo da Q-E11-1 |

**Os 4 ajustes da Emenda 1.2, cada um antes da fatia que afeta:**
- **A1, antes da F9 e do 44-B3:** em toda pilha nova (o `down -v` desfaz a ativação), (1) `dc exec -T postgres psql` com
  os passos 2 a 5 do runbook; (2) `dc restart api`; (3) os passos 6 e 7. A prova é o par **inactive/401 → active/200** no
  `ensaio.log` (`/health/ready` com `login_without_org`, mais o login sem `tenantId`).
- **A2, antes da F6:** o aplicador de mutações dá PARADA se a base tiver `fail ≠ 0` ou se o teste que fica vermelho não
  for o citado na tabela.
- **A3, antes da F4:** o caso do verificador que mata a M23b vira caso de teste escrito, com a âncora literal.
- **A4, antes da F2:** `grep -cE '^import .*(src/|@prisma|dotenv)' scripts/demo-isolado/fundacao.ts` = 0.

**O que é PARADA (o dev para e avisa; vira emenda, nunca troca de comando):** a invocação da fundação não sair 0 na
pilha, ou o corte do `?schema=public` não acontecer no `sh` da imagem; uma mutação do plano não deixar vermelho o teste
citado; o `LOGIN_SEM_ORG` da pilha vir `active` ANTES do passo da Q-E11-1; o login com `tenantId` não responder 200 na
pilha com a API como papel de runtime; qualquer necessidade de tocar `prisma/**` ou `src/**`, ou de conceder `EXECUTE`
fora da exceção da Q-E11-1; qualquer comando do plano que não rode como escrito.

## Bateria de validação

```bash
# os 4 testes do bloco (o C4-db contra um cluster descartável próprio, porta 555xx, UTC gravado antes do start)
node --test --import tsx tests/demo-isolado-alvo.test.ts tests/demo-isolado-motor.test.ts tests/demo-isolado-fixture.test.ts
node --test --import tsx tests/demo-isolado-fundacao-db.test.ts
npm run check
npm run lint
npm test
npm run build

# C10a (0): sem escrita direta nem SQL cru; pathspec ENTRE ASPAS SIMPLES
git grep -nE '\.(tenant|user|localAuthCredential|userRoleAssignment|workOrder|customer|financialTitle|financialEntry)\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\(|\$executeRaw|\$queryRaw|INSERT INTO|UPDATE [a-z_]+ SET|DELETE FROM' HEAD -- 'scripts/demo-isolado/*.mjs' 'scripts/demo-isolado/*.ts' 'scripts/demo-isolado/*.sql' | wc -l
# C10b (lista exatamente scripts/demo-isolado/fundacao.ts)
git grep -lE 'from "pg"|@prisma/client|PrismaClient|database/prisma' HEAD -- 'scripts/demo-isolado/*.mjs' 'scripts/demo-isolado/*.ts' 'scripts/demo-isolado/*.sql'
# C10d (0): lista fechada de extensões
git ls-tree -r --name-only HEAD -- scripts/demo-isolado/ | grep -vcE '[.](mjs|ts|sql|json|tsv|md)$'
# censo sem filtro a mais (1)
grep -c "not like" scripts/demo-isolado/censo.sql
# import antes do dotenv (0) — Emenda 1.2, A4
grep -cE '^import .*(src/|@prisma|dotenv)' scripts/demo-isolado/fundacao.ts
# todo login com tenantId (1 em cada) e um ponto de login por arquivo (1 em cada)
grep -cF "const corpo = { email, password: senha, tenantId };" scripts/demo-isolado/semear.mjs scripts/demo-isolado/verificar.mjs
grep -c "/auth/login" scripts/demo-isolado/semear.mjs scripts/demo-isolado/verificar.mjs
# C14 (0): KPI congelado
git diff --name-only origin/main...HEAD -- Kpis/ | wc -l
git diff --check
```

- **C11 e C12 (nada privado nem real; nenhum valor de segredo):** rodam com a lista do plano, fora do repositório, sobre
  as linhas acrescentadas, as mensagens de commit e o corpo do PR, cada um com o seu vermelho-controle. A lista literal
  não entra neste comando: escrita aqui, ela casaria consigo mesma nas linhas acrescentadas.
- **C13 (CI na forma real):** `gh api repos/<owner>/<repo>/commits/<head>/check-runs` com todos `completed` e nenhum
  `failure`; e `gh run view <run> --job <id do job backend> --log | grep -E '# (tests|fail|skipped) [0-9]+'` com
  `# fail 0`, `# skipped 2` e os `demo-isolado-*` no TAP. O C4-db não pode pular com banco presente.
- **Na pilha isolada (fora da CI, aceite por execução real):** V0 a V11, com o log bruto no diretório de ensaio; o V3
  reinicia a API e o replay dá diff vazio; as linhas `PAPEL_DA_API f|f` e `LOGIN_SEM_ORG <valor>`; o id da `platform`
  fora do log.
- **Mutações:** as do plano (M1 a M24, com as variantes), aplicadas uma a uma pelo aplicador que sai 1 em PARADA, cada
  uma deixando vermelho o teste que a tabela cita. Trocar uma mutação exige emenda.
- **Meta de testes:** pelo menos 37 casos novos (Emenda 1.1, §10). **Leitura do redator, declarada (§A6):** a suíte
  backend sobe pelo menos o mesmo tanto sobre o N da `main` do dia, com `# fail 0` e `# skipped 2`.
- **Limpeza (§C5):** pilhas com `down -v` e remoção das imagens com o prefixo; inventário zerado; clusters e worktrees de
  medição removidos (`git worktree remove --force`, sem `prune`); diretório de segredos apagado.

## Estados obrigatórios (§7)

Não se aplica: o bloco não cria nem altera tela.

## KPIs

Congelados (§C7 item 8(5)): nenhum arquivo de `Kpis/` no PR (C14).

## Junta (§C7 item 10)

- **Nível:** junta completa (inspetor de terreno + 3 cadeiras, unanimidade), pela trava do item 10(2): escrita no banco
  por script, autenticação (provisória, troca de senha, arquivo de segredo), permissão (atribuição de papéis, dependência
  do `super_admin`), escrita financeira (baixa e conciliação) e isolamento entre organizações (o censo é a trava). O PR
  de registro (F10) vai por revisão simples, e a trava roda nele também.
- **Fluxo:** pré-revisão (F6) → junta uma vez, cada cadeira com a lista completa de achados e o comando que reproduz
  cada um → triagem → um conserto, por dev que não achou, com teste vermelho sem o conserto → conferência por quem não
  consertou → merge → porteiro.
- **Cadeiras (até 3 itens cada, P4) e o que cada uma re-executa:**
  - **C-SEG** (`cseg-10bseed-cl`): travas do motor e da fundação, nada sai antes da trava, segredo fora de log e saída;
    re-executa M1 a M3, M5 a M7, M10 (trocada), M11 a M13, M15, M18, M23, M23b e M24, o V6 com os casos novos e a linha
    `PAPEL_DA_API f|f`.
  - **C-DADO** (`cdado-10bseed-cl`): censo na fonte real, rodar 2× não duplica (com reinício), sem escrita direta;
    re-executa M4, M4b, M4c, M8, M9, M14, M16a a M16c, M17, M19 a M22, o C4-db (7) pelo gancho, o controle do V3, C10a,
    C10b e C10d.
  - **C-ROT** (`crot-10bseed-cl`): o dado bate com o roteiro (V8, V9, matriz de 1.1 a 4.7), nada privado nem real (C7,
    C11), o papel de cada login; re-executa o V8 invertido e o controle do C11.
- **Inspetor de terreno:** `insp-10bseed-cl` (frontmatter `opus`).
- **Registro:** `agent-orchestration/omega/juntas/J-<n>-b-san3-10b-seed.md`, no PR de registro (F10).

## Papéis e inelegíveis

| Papel | Identidade |
|---|---|
| Planejadores | `plano-10b-seed-cl` (v1), `plano-10b-seed-v2-cl` (v2), `plano-10b-seed-e1-fable` (Emenda 1), `plano-10b-seed-e11-fable` (Emenda 1.1); a Emenda 1.2 é transcrição do orquestrador |
| Críticas e conferências do plano | `crit-10bseed-dp` (r1), `crit-10bseed-v2-cl` (r2), `prerev-seed-e1-cl` (44-B2), `rev-seed-e11-cl` (44-B2b) |
| Redator de registro (F0b e F10) | `reg-10bseed-cl` |
| Dev A (F1a, F1, F2, F0c) | `dev-seed-a-cl` (no plano, `dev-10bseed-a-cl`) |
| Dev B (F3, F4, F4s) | `dev-seed-b-cl` (no plano, `dev-10bseed-b-cl`) |
| Conferência do ambiente (F0d) | `conf-amb-10bseed-cl` (não pode ser o Dev A) |
| Autor da matriz (F5) | `matriz-10bseed-cl` |
| Pré-revisor (F6) | `prerev-10bseed-cl` |
| Inspetor, C-SEG, C-DADO, C-ROT | `insp-10bseed-cl`, `cseg-10bseed-cl`, `cdado-10bseed-cl`, `crot-10bseed-cl` |
| Dev do conserto e conferência (F7) | `fix-10bseed-cl`; `conf-10bseed-cl` |
| Porteiro (F8) | `port-10bseed-cl` (frontmatter `opus`) |
| Ensaio do emulador e conferência | `ens-44b3-cl`; `conf-44b3-cl` |
| Executor da F4 (F9) | `demo-exec-10b-v2-cl` |

**Inelegíveis para cadeira, inspetor e conferência, por nome** (lista da Emenda 1.1 §8.2, mais a Emenda 1.2):
`plano-10b-seed-cl`, `plano-10b-seed-v2-cl`, `plano-10b-seed-e1-fable`, `plano-10b-seed-e11-fable`, `crit-10bseed-dp`,
`crit-10bseed-v2-cl`, `prerev-seed-e1-cl`, `rev-10bseed-e1-cl` (nome antigo, por cautela), `prerev-seed-e11-cl` (o nome
que a Emenda 1.1 propôs, por cautela), **`rev-seed-e11-cl`** (quem de fato conferiu a Emenda 1.1; Emenda 1.2), os 2 devs
(`dev-seed-a-cl`, `dev-seed-b-cl`, e os nomes do plano `dev-10bseed-a-cl`, `dev-10bseed-b-cl`), `fix-10bseed-cl`,
`reg-10bseed-cl`, `matriz-10bseed-cl` e `prerev-10bseed-cl`.

- **Leitura do redator, declarada (§A6):** os nomes de disparo dos devs entram ao lado dos nomes do plano; nos diários
  deles, o nome do disparo prevalece.
- **O que nunca cede:** o autor da matriz não executa a F4 nem julga a C-ROT; o executor da F9 não escreveu o roteiro, a
  matriz, a fundação nem o motor; o dev não confere o próprio conserto; o inspetor não votou, planejou nem desenvolveu.

## Definition of Done (§10)

- [ ] Escopo respeitado (nada fora do PERMITIDO; nada do PROIBIDO tocado; `prisma/**` e `src/**` intactos).
- [ ] Bateria verde, com as mutações aplicadas como escritas e cada uma vermelha no teste citado.
- [ ] CI do head concluída e verde, lida na forma real (C13); `Kpis/**` intocado (C14).
- [ ] V0 a V11 na pilha isolada, com o log bruto; o V3 com reinício e diff vazio.
- [ ] Sem segredo, dado pessoal, caminho de máquina ou nome real nas linhas acrescentadas, nos commits e no corpo do PR
      (C11, C12).
- [ ] Junta completa registrada; conserto conferido; merge; parecer do porteiro; limpeza pós-merge.
- [ ] F9: os quatro fluxos executados (passou ou falhou de verdade), `bloqueados=0`, com os hashes; F10 registrada.

## Rastreabilidade (§C6)

- **ID:** B-SAN3-10b-F4-SEED-ISOLADO (item 44, F4 do `B-SAN3-10b`)
- **PR #:** a preencher após `gh pr create`
- **Merge commit / approved head:** a preencher pós-merge
- **Junta:** `agent-orchestration/omega/juntas/J-<n>-b-san3-10b-seed.md` (F10)
- **Pendências do bloco:** `P-SAN3-10B-F4-SEED-ISOLADO` (apenso de 14/11), `P-SYNC-OS-RECIBO-EM-MEMORIA`,
  `P-OS-MESMA-SITUACAO-GRAVA-EVENTO`, `P-MOBILE-RELEASE-ANTIGO-SEM-INTERNET`, `P-AUTH-LOGIN-SEM-TENANT-SOB-PAPEL-RUNTIME`,
  `P-SEED-BASE-TRAVA-SO-NODE-ENV` e `P-SEED-BASE-NOMES-REAIS`
- **Status:** em execução
