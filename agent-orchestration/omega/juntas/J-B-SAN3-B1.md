# J-B-SAN3-B1 — junta do bloco `B-SAN3-B1` (PR #391)

- **Objeto julgado:** `3a0ea095`, ramo `chore/ci-ve-o-sha-julgado`, base `origin/main@aadaa6d5`.
- **Data:** 2026-09-21. **Quórum: unanimidade de 3** (§C7.1-ter(b) — o bloco toca **segurança** e o pipeline).
- **Resultado: APROVADO 3 × 0.**

| Cadeira | Identidade | Voto | Achados |
|---|---|---|---|
| C1 — portão do GHCR e fronteira de artefato | `agente-secops` | **APROVADO** | 0 bloqueia · 0 ajuste · 6 nota |
| C2 — pipeline | `agente-devops-provisionador` | **APROVADO** | 0 bloqueia · 2 ajuste · 3 nota |
| C3 — diff × plano, escopo, KPI, registro | `validador-mestre` | **APROVADO** | 0 bloqueia · 2 ajuste · 5 nota |

**Inspetor de terreno:** `LIBERADO COM RESSALVA`, 6 ressalvas. Duas eram falhas do briefing (regra de perda de
jurado ausente; P5 sem somar a junta irmã viva) e foram corrigidas **antes** do voto. A mais fina, e que vira
lição: **o corpo de agente que a sessão carrega pode divergir do corpo no head julgado** — e este bloco altera
justamente o corpo do inspetor. Ele releu o próprio mandato a partir da ref e reexecutou; as três cadeiras
declararam qual corpo aplicaram.

**Papéis (§C7.4-bis):** quem planejou (orquestrador) ≠ quem desenvolveu (`general-purpose`, 2 instâncias, a 1ª
perdida para o cão-de-guarda sem produzir) ≠ quem julgou. Nenhuma cadeira propôs correção.

## O que o bloco entrega, medido por mais de uma cadeira
O CI passa a existir **no SHA que a junta julga**: **14/14 check-runs `success`** no head julgado, contra
**0** nos PRs #388 e #389 — que foram julgados às cegas. E o portão do GHCR passa a testar o **ramo** em vez do
**tipo de evento**: `Log in to GHCR` = **`skipped`** nos dois eventos, com `Build backend image` e o smoke de
contêiner `success`, zero `Login Succeeded` e `push: false` nos três `build-push-action`.

**Por que as duas mudanças são inseparáveis:** o passo se chama *"push to GHCR only on main"* e a condição não
olhava o ramo. Com o gatilho novo e sem a correção, todo push de ramo publicaria `erp-backend:<sha>` e
sobrescreveria `:latest` com código que junta nenhuma julgou.

**Alcance, corrigido pelo próprio desenvolvedor e confirmado pela C1 lendo o `deploy-production.yml`:** o
defeito **não alcança produção direto**. As travas (a) ata-na-`main` e (b) staging verde no mesmo SHA são
independentes do GHCR — e (b) só pode ser satisfeita por um SHA que passou pela `main`. O que o defeito faz é
**esvaziar em silêncio a trava (c)**, que testa **existência da imagem** e trata isso como prova de merge (a
premissa está escrita na própria mensagem de erro). Nas palavras da C1: *uma trava que passa a aprovar sem
discriminar é pior que uma que falha, porque não avisa.*

## Os 2 ajustes, aplicados antes do merge
Ver **emenda 1** do comando: (a) o quórum declarado no comando dizia "maioria de 3" enquanto a junta convocada
foi unanimidade de 3 — sem dano, mas o registro é o que fica; (b) a declaração de que `npm test` não rodou
localmente não existia em arquivo rastreado (§A5), e agora existe, com a evidência do run do CI.

## Para o porteiro pós-merge
1. **Primeiro run da `main`:** provar que o lado que **abre** o portão funciona (publica `erp-backend:<sha>`) —
   só é provável pós-merge, e a falha seria fechada.
2. **`concurrency` na `main`:** dois merges dentro de ~9 min cancelam o run do primeiro e, com ele, o `docker`;
   o SHA fica sem imagem e a trava (c) o recusa. Fail-closed, com `workflow_dispatch` como remédio.
3. **`blocks_completed`:** se o #392 mergear antes, a recontagem é do pré-merge.
