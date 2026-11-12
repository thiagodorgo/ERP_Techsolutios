# B-SAN3-18 — o gate de módulo no backend, com núcleo fechado (item 16 do portão)

## Papel desta execução

DEV `dev-18-cl`, Claude Opus 5.5, subagente da sessão, nível menor, identidade de dev declarada. **Exceção declarada**
(§C7 itens 6 e 11(6)): as duas contas Codex estão sem cota semanal até 16/11, a API está reservada para verificação e o
Antigravity está no limite de 5 h. A pré-revisão e a conferência são de outro modelo, pela API. O dev não escreveu nem
criticou o plano.

## Fonte única

O plano v2 (`replano-B-SAN3-18-api`, Claude Opus 5.5 pela API, degrau do Fable) com a Emenda 1 (os requisitos R2-01 a
R2-10 da crítica r2 `crit-18-r2-cl`, APROVADO COM AJUSTES), fora do repositório:
`erp-pausa-2026-10-03/planos/plano-B-SAN3-18-v2.md`. As três perguntas do §9 foram respondidas pela recomendação
(`D-B-SAN3-18-RESPOSTAS-DO-DONO`, em `controle/decisoes.md`).

## Propriedade

- **Servidor (P1):** toda requisição sob `/api/v1` com JWT só é atendida se a rota for NÚCLEO, PLATAFORMA ou de um
  conjunto de módulos do qual a organização DO ATOR tenha pelo menos um. Recusa: `module_not_enabled`,
  `route_module_unclassified`, `platform_actor_on_tenant_route`, `tenant_not_found` (403) e `tenant_modules_unavailable`
  (503, nunca passagem). A classe é calculada em minúscula, sem barra final e com HEAD = GET.
- **Classificação (P2):** as 444 rotas montadas têm exatamente uma classe (`tests/fixtures/san3-18-route-modules.json`),
  com um oráculo por permissão, independente do classificador, para as rotas de dinheiro (R2-01).
- **Menu (P3):** a entrada aparece se for de plataforma, do núcleo (`NUCLEO_MENU_PATHS`) ou se a organização tiver
  TODOS os seus módulos; lista não resolvida conta como vazia; os 49 caminhos de `MVP_NAV_PATHS` estão no registro.
- **Vocabulário (P4), coerência menu × rota (P5), provisionamento sem perda (P6) e capacidade do bootstrap (P7).**

## Escopo desta execução

O PERMITIDO do §4 do plano v2. Fora dele, nada foi tocado; o que faltou está em "Desvios".

## Bateria

`npm run check` · `npm run lint` · `npm test` · `npm run build` · `node --test --import tsx tests/san3-18-*.test.ts` ·
as regressões do §6 · `tests/o6r07c-census-guard.test.ts` (instantâneo regerado, diff de 2 chaves) · a suíte `-db`
contra Postgres 16 descartável, sob papel efêmero `NOSUPERUSER NOBYPASSRLS` · `npm --prefix frontend run check` ·
`build` · `test:smoke` · `node scripts/migration-transaction-guard.mjs` · `git diff --check` · as mutações do §3 e da
Emenda 1, com as âncoras conferidas (`git grep -c -F` = 1) antes de aplicar.

## Roteiro de operação (deploy)

1. **Antes do deploy do gate:** `npx tsx scripts/san3-18-provisionar-modulos.ts` (simulação) contra a base real, e
   ler as contagens e `assinaturas_com_versao_sem_chaves`; depois `--aplicar`. O script só acrescenta, numa transação
   única, e sai com código 1 (sem gravar nada) se sobrar organização incompleta.
2. **Depois do deploy:** módulos só mudam pela assinatura (versão do plano + adicionais) ou por este script. A tela de
   módulos da organização no console da plataforma não grava (409; `P-SAN3-18-TELA-MODULOS-DA-ORG-ENGANA`).
3. **Antes de qualquer sincronização de plano:** revisar as versões de plano listadas pelo script — atribuir ou
   sincronizar um plano SUBSTITUI a lista da organização (`P-SAN3-18-PLANOS-SEM-CHAVES-NOVAS`).

## Desvios e perguntas ao orquestrador

Ver o corpo do PR e o diário do dev (`erp-pausa-2026-10-03/revisoes/dev-18-cl-progresso.md`).
