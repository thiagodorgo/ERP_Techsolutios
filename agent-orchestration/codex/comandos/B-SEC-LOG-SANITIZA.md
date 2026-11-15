# B-SEC-LOG-SANITIZA — fábrica única de log; sendRouteError e o ramo genérico dos syncs sem texto de driver

- **Tipo:** feature (correção de segurança)
- **Fase:** Execution
- **Trilha:** backend/raiz
- **Data:** 2026-11-14
- **Branch:** `fix/sec-log-sanitiza`, a partir da `origin/main` `d2737339`
- **Pendência que o bloco fecha:** `P-LOGIN-READINESS-VAZA-HOST-NO-ERRO` (ALTA, achado C2-A2 da J-554)

## Papel desta execução

DEV `dev-seclog-cl`, Claude Opus 5.5, nível menor declarado, identidade nova, das fatias F0 e F1. Não planejou, não
criticou e não vota. Não é o orquestrador (§C7 11(6)). **Sem cruzamento: ordem do dono de 13/11 ("só Claude")**,
§C7 11(2). Depois do commit da F1, a F2 e a F3 vão para dois devs (§E13.3 da emenda).

## Fontes, nesta ordem

1. Decisões do dono que valem: banco ou infra caída → 500 com mensagem fixa; defeito do servidor que não é queda
   continua 400, com mensagem fixa; o 503 no sync vai para outro bloco.
2. A Emenda 1 do plano (`plano-B-SEC-LOG-SANITIZA-v2-emenda1.md`, evidência X0 a X10), que prevalece sobre o v2.
3. O plano v2 (`plano-B-SEC-LOG-SANITIZA-v2.md`, evidência V0 a V12).

## Objetivo

Um logger único que limpa todo erro e todo texto de conexão antes de escrever, uma trava que reprova quem criar logger
ou escrever na saída padrão por fora dele, e erro de infraestrutura e de driver saindo do corpo HTTP com mensagem fixa
(500 para queda, 400 para o resto), inclusive no texto já gravado pelo custo de nuvem. Fica de fora: o 503 do sync
(`B-SYNC-INFRA-503`), o status de defeito do servidor que não é queda e as pendências do v2 §10 e da emenda §E10.

## Escopo

O PERMITIDO do v2 §6.1, por âncora de conteúdo, com o que a emenda §E9 acrescenta. O PROIBIDO do v2 §6.2: nada em
`prisma/**`, `migrations/**`, `.github/**`, `Kpis/**`, `infra/**`, `scripts/**`, `package.json`, lockfiles, `.env*`,
`src/config/env.ts`, `src/database/**`, `src/integrations/traccar/**` (salvo as duas linhas de
`traccar-ingest.app.ts`), `src/infra/redis/**`, `src/infra/jobs/job-worker.bootstrap.ts`, `frontend/**`, `mobile/**`.
Nenhuma dependência nem variável de ambiente nova.

## Vermelho-controle da F0 (H0 = `origin/main` `d2737339`, 14/11, 02:16 a 02:31 SP)

Medido em worktree próprio (`npm ci` próprio) e cluster descartável próprio (PostgreSQL 16, UTC, só em
`127.0.0.1:55598`). O detalhe, com cada comando e a saída, está no diário do dev, fora do repositório.

| Item | Comando | H0 medido | Esperado no head |
|---|---|---|---|
| Contagem do aceite de boot | `bash aceite-boot.sh <wt> <saida> 55598 autoteste` | `porta-que-contem=0`, `vazamento=5` | o mesmo |
| Aceite de boot | `bash aceite-boot.sh <wt> <saida> 55598` | VA 3/1, VB 3/1, VC 4/1, VD 4/1, RA 11/1, RB 23/1; `ACEITE=VERMELHO` | 0 sentinela e positivo ≥ 1 nas 6; `ACEITE=VERDE` |
| Aceite HTTP da queda (§E6) | `sonda-queda.mts fast` e `immediate` | 10 × `HTTP 400 … fixa=0` em cada modo | 10 × `HTTP 500 sent=0 prisma=0 rawquery=0 fixa=1` em cada modo |
| Aceite HTTP do v2 §5.2 | `sonda-matriz.mts db-conn` (4 URLs), `db-ok`, `fora` | infra e driver: 400 com o texto cru (`prisma.`, caminho, host); domínio: 400 com a mensagem | infra 500 fixo; driver 400 `"Invalid request."`; domínio igual |
| Leitura do texto gravado | `sonda-leitura.mts` | rateio e AWS CUR `true/true/true`; cobrança `true/true/true` no router exportado e 404 no produto | a mensagem fixa nas 3 |
| Travas | `guard-proto.cjs <wt> src`; `guard-simbolo.cjs <wt> src` | G1a 18, G1b 18, G1c 0, G2a 2, G2b 2, G3 4, G3s 4, G3e 0 | 0 em todas |
| H4a a H4d | sonda do dev, pela função pública de cada sync com serviço que lança P1001 | H4a, H4b, H4c: `rejected` com o texto do P1001 (8 sentinelas). **H4d: não alcança o ramo genérico** (ver abaixo) | `rejected`, `"Unexpected error."`, 0 sentinela |
| N_backend | `gh run view 43549057754 --job 132307035555 --log` | `# tests 5554`, `# pass 5552`, `# fail 0`, `# skipped 2` | `# tests ≥ 5619`, `# fail 0`, `# skipped 2` |
| Âncoras do §6.1 | `grep -cF <âncora> <arquivo>` | 1 em cada | 1 em cada |

**Premissa falsa, registrada (pede emenda antes da F3):** o H4d do v2 §5.3 ("o sync de estoque, pela função pública, com
serviço falso que lança P1001: `rejected`, `Unexpected error.`") não é alcançável. No caminho de material, o erro que não
é recusa vira `unexpectedMaterialFailure`, e o lote responde 500 `"Unexpected error."`, que já é mensagem fixa. Os 3 tipos
não-material rodam em memória e não chamam serviço. O ramo genérico do estoque existe, mas nenhum serviço falso chega a
ele. H4a, H4b e H4c ficaram vermelhos como o plano prevê.

**Nota de terreno para a F4:** numa das duas execuções do aceite de boot, o VC saiu com o log vazio dentro do
`timeout 20` do script. Repetido à mão com `timeout 30`, o primeiro log apareceu cerca de 9 s depois do início. Num head
verde, o mesmo engasgo daria `ACEITE=VERMELHO` por falta de positivo.

## Fatias

As do v2 §7.3 com a emenda §E11.1: F0 (este comando e os vermelhos), F1 (`src/infra/logging/`, o helper de
sentinelas, L e K), F2 e F3 em paralelo, depois a integração e a F4. Um commit por fatia.

## Bateria

A do v2 §7.4 com a emenda §E11.2: `npm run check`, `npm run lint`, os 6 arquivos de teste do bloco, as regressões
listadas em F2 e F3, `CORE_SAAS_PERSISTENCE=memory npm test`, `npm run build`, o aceite de boot, o aceite HTTP da queda
nos 2 modos, o aceite HTTP do §5.2 e `git diff --check`. Cada mutação literal é aplicada uma por vez, fica vermelha e é
revertida (33 no total; as da F1 são M1, M7 a M11, M16 a M19, M21, M22, M22b, M22c, M23, M24 e M24b).

## Nível de revisão

Junta completa (v2 §7.1): autenticação, escrita financeira e resposta de erro de toda rota. Unanimidade de 3.
