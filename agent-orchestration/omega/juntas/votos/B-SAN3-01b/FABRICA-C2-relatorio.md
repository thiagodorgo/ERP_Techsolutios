papel: agente-fabrica (instância nova, junta 1 do B-SAN3-01b, PR 402, cadeira C2) | modelo: Opus 5.5 (claude-opus-5-5, herdado da sessão; a fábrica não é gate fixado em Fable, sem substituição a declarar) | mandato_md5: 638b0a8c3eda1ab5ceff65f14b9d85a4 (EOL-neutro, declarado no disparo; NÃO medido por mim, porque não tenho Bash) | corpo da fábrica: b5a365a12203ad3f2fcb549e6006f5a1 (EOL-neutro, origin/main, declarado no disparo)

# Relatório da agente-fabrica: corpo novo da cadeira C2 do B-SAN3-01b (PR 402)

## Resultado

Escrevi um corpo novo de jurado para a cadeira C2:
`C:/Users/AMP/w-nuv01b/.claude/agents/especialistas/jurado-san3-01b-c2-cadeia-de-acesso.md`.

Ele substitui o `coordenador-de-acessos`, que o inspetor de terreno declarou inelegível (item 3.1: foi ele quem achou o
C2-05, o mesmo botão que o bloco conserta). O corpo mantém a competência dele, a cadeia de acesso de ponta a ponta. A
tarefa são os três itens da linha C2 do §10 do plano, sem diluir. Não commitei, não votei e não toquei nenhum outro
arquivo.

**O orquestrador gera o espelho `.agents` por `scripts/sync-agent-agents.mjs` e versiona os dois** (`git add -f` em
`.claude/agents/especialistas/` e em `.agents/agents/especialistas/`) no ramo do PR 402. Eu não tenho Bash.

## O que li

Tudo no worktree `C:/Users/AMP/w-nuv01b`, que o disparo diz estar no head do PR:

- o mandato `agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/fabrica-c2.md`, inteiro;
- o parecer do inspetor `agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-inspetor-terreno.md`, inteiro. O item 3.1
  dá BLOQUEADO só pela C2, e a seção "O que precisa acontecer" diz o remédio;
- o plano `docs/revisoes/SAN3/B-SAN3-01b-plano.md`:
  - §0 a §8 e §9, §10, §13 e §14, inteiros. A linha C2 do §10 (l.530) é a base do mandato do corpo;
  - os Apêndices E e F (L3 papel × gate, catálogo executado, `bypass.mts`);
- o corpo de competência `.claude/agents/coordenador-de-acessos.md`, inteiro;
- o modelo de rigor `.claude/agents/especialistas/jurado-pausa-c3-escopo-registro-kpi.md`, inteiro;
- o frontmatter dos 6 jurados de identidade nova que existem no worktree. Os 6 têm `tools: Read, Grep, Glob, Bash` e
  `model: opus`;
- o contrato `CLAUDE.md`, §C7 inteiro, que está no meu contexto a partir de `origin/main`. O inspetor confirmou no head
  (item 3.3) as âncoras que o corpo cita;
- o mandato atual da C2, `00-mandatos/C2.md`, para alinhar o corpo ao que a cadeira recebe;
- o `DEV-relatorio.md`, nas l.80-99 (vermelho-controle do head-base) e no que ele diz sobre `[GB*]`;
- o `OBITUARIO-IDENTIDADES.md`, l.1-60 e 240-301 (§1, placar, §3.7);
- o `pendencias.md`, nas l.9487-9498 (`P-SAN3-01-NOVA-OS-SEM-GATE-NO-BOTAO`) e 9930-9937
  (`P-SAN3-01B-GUARD-DE-ROTA-COM-ATALHO-DE-PLATAFORMA`), e o cabeçalho da l.9657 (`P-SAN3-04A-SEED-PAPEIS-LEGADOS`);
- o código que a C2 vai medir. Li só o necessário para dar arquivo:linha, e o corpo marca tudo como [A RE-VERIFICAR]:
  - backend:
    - `src/modules/work-orders/work-order.routes.ts`
    - `src/modules/core-saas/middleware/rbac.middleware.ts`
    - `src/modules/core-saas/middleware/persistent-rbac-context.middleware.ts`
    - `src/modules/core-saas/services/persistent-authorization.service.ts`
    - `src/modules/core-saas/permissions/catalog.ts` (`ROLE_PERMISSIONS`, `STANDARD_ROLES`/`LEGACY_ROLES`)
    - `prisma/seed.ts` l.245-280
    - `src/modules/auth/routes/auth.routes.ts` (`resolveLoginPermissions`)
    - `src/modules/field-dispatch/field-dispatch.routes.ts` l.38-51
  - frontend:
    - `frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx` l.220-264 e as linhas do gate
    - `frontend/tests/work-orders-page-live.test.tsx` l.740-825 e as linhas de `mount`
    - `frontend/src/App.tsx` l.764-791
    - `frontend/src/guards/PermissionGuard.tsx`
    - `frontend/src/providers/PermissionProvider.tsx`
    - `frontend/src/navigation/types.ts`
    - `frontend/src/navigation/tenantNavigation.ts`
  - `RBAC_MATRIX.md` l.29 e l.45.

## O que escrevi

1. `C:/Users/AMP/w-nuv01b/.claude/agents/especialistas/jurado-san3-01b-c2-cadeia-de-acesso.md`, o corpo novo, criado do
   zero. Depois de criá-lo, fiz duas edições no mesmo arquivo:
   - tirei `": "` da `description`, que é um escalar YAML sem aspas e quebraria o parse;
   - acrescentei uma nota de que `\|\|` na tabela de mutações se lê `||`.
2. Este relatório.

Nada mais. Não criei arquivo temporário.

## Cada hipótese do mandato, atendida e onde

**H1. Papel, modelo e mandato_md5 na 1ª linha deste relatório.** Atendida na linha 1. O md5 é o declarado no disparo,
porque não tenho como medi-lo. O teste que a derruba é
`head -1 …/FABRICA-402.md | grep -ic 'mandato_md5'` → 1.

**H2. Corpo novo com identidade `jurado-san3-01b-c2-cadeia-de-acesso`, sem colisão e com frontmatter `name`,
`description` e `tools` (Read, Grep, Glob, Bash).** Atendida.

- **Frontmatter** (l.1-6 do corpo): `name: jurado-san3-01b-c2-cadeia-de-acesso`, `description` em uma linha e
  `tools: Read, Grep, Glob, Bash`. **Acrescentei `model: opus`**, que o mandato não pediu. O motivo é o precedente medido:
  os 6 jurados de identidade nova que existem no worktree (`jurado-semteto-*`, `jurado-pausa-*`) têm `model: opus`. Se o
  orquestrador discordar, basta tirar a linha antes do sync. O corpo manda o jurado declarar o modelo em que rodou e parar
  se o Opus faltar.
- **Colisão, conferida por Grep** antes de escrever:
  - `cadeia-de-acesso` em `w-nuv01b/agent-orchestration`: 1 arquivo, que é o próprio mandato `00-mandatos/fabrica-c2.md`;
  - em `w-nuv01b/.claude` e em `w-nuv01b/.agents`: 0;
  - `cadeia-de-acesso|san3-01b` em `.claude/agents` da árvore principal: 0;
  - no `OBITUARIO-IDENTIDADES.md`, `cadeia|san3-01b|coordenador-de-acessos` dá 1 linha (l.281), que fala das
    `P-SAN3-01B-*` e não é o nome;
  - os Greps que tentei no repositório inteiro esgotaram o tempo, e por isso restringi às pastas acima.
- **O que esperar do teste que a derruba:** antes de versionar, o
  `git -C C:/Users/AMP/w-nuv01b grep -il 'jurado-san3-01b-c2-cadeia-de-acesso' HEAD -- agent-orchestration .claude .agents | wc -l`
  deve dar 1 (só o mandato da fábrica). Depois de versionar, deve dar o mandato mais os dois espelhos do corpo, e mais o
  `00-mandatos/C2.md` regenerado, se ele citar o nome.

**H3. Competência do coordenador-de-acessos, e o mandato do corpo são os três itens da linha C2, sem diluir.** Atendida.

- A competência está na seção "Quem escreveu este corpo, e por que você existe": a cadeia papel → permissões →
  provisionamento → menu → rota → backend.
- Item 1 do corpo: CE-G2. É o `ROLE_PERMISSIONS` executado contra `RBAC_MATRIX.md`, contra `work-order.routes.ts` (e
  `field-dispatch.routes.ts` para o `[GB3]`) e contra `[GB1]`–`[GB3]`. Inclui a matriz efetiva papel × passo gerada, e o
  menu entra só como informativo.
- Item 2: a régua do gate é a do backend e a mesma do CTA. Usa as mutações M2a, M2b e M2c-i/ii/iii, esta última para
  separar `includes` de atalho de plataforma. Inclui a N5 conferida contra a pendência dona e o conjunto sessão ∪
  contexto.
- Item 3: o vermelho-controle no head-base de `[GB1]`/`[GB2]`. Compara o conjunto de papéis acusado com o conjunto gerado
  do catálogo, e não com a contagem 7. A equivalência da base é provada e o restauro também.
- O teste que a derruba (`grep -ic 'GB1'` no corpo) dá vários casamentos.

**H4. O rigor dos jurados de identidade nova.** Atendida, e cada exigência está numa seção do corpo:

| Exigência | Onde está no corpo |
|---|---|
| unanimidade de 3 com veto | "Quórum, queda e PAUSA" |
| todo achado com gravidade e escopo; `pre-existente` só com evidência de data ou origem | "Como você vota" e o JSON |
| "não consigo medir" é REPROVADO | fim de "Terreno" e as linhas finais de VOTO |
| não propõe correção | "Como você vota" |
| P1, P2 e P7 | o bloco de mandato verbatim do §C7.7, mais o bullet de PAUSA e o voto-esqueleto |
| `mandato_md5` e md5 EOL-neutro do corpo na 1ª linha da evidência | "Terreno", 1º bullet |
| só norma que existe em `origin/main` | seção "Norma citada tem de existir na ref julgada (§A7)" |

A seção da norma cita só âncoras que o inspetor confirmou no head e manda re-medir com `grep -c`. Ela exclui
expressamente a errata 15.15, `D-MANDATO-FORMA`, `B-GOV-MANDATO` e os `scripts/mandato-*.sh`, que estão só no PR #393,
aberto. O teste que a derruba (`grep -ic 'unanimidade'`) dá pelo menos 3 casamentos.

**H5. A fábrica não versiona, não commita, não vota e não escreve outro arquivo, e o orquestrador gera o espelho por
`scripts/sync-agent-agents.mjs`.** Atendida, como dito no topo. O orquestrador gera o espelho em `.agents` por
`scripts/sync-agent-agents.mjs` e versiona os dois espelhos com `git add -f` no ramo do PR 402.

## O que o orquestrador e o inspetor precisam saber

São pontos de desenho e de terreno. Não são achados, porque a fábrica não julga.

1. **Divergência de método em relação ao corpo do coordenador**, que deve ser registrada pelo §A2 e não ficar em
   silêncio:
   - o `coordenador-de-acessos` valida "COM LOGIN REAL", subindo API e web. O corpo novo troca isso pelo catálogo
     executado e pela rota e o middleware lidos no blob do head, com arquivo:linha. Quando a importação não abrir
     conexão, o middleware também pode ser executado isolado. É a forma P-h do plano;
   - o motivo é o terreno: o bloco não tem premissa de banco (plano §0.2 e §10), o inspetor liberou o terreno sem cluster
     (item 1.2) e a base viva nunca é alvo;
   - o corpo diz expressamente que cobrar login real ou API viva é reprovação por construção. Assim não se cria um
     critério impossível de passar.
2. **O `md5` EOL-neutro do corpo novo não foi medido**, porque não tenho Bash. O orquestrador mede com
   `tr -d '\r' < <corpo> | md5sum` e o compara com o blob no head depois de versionar (é o item 3.3 da segunda passada do
   inspetor).
3. **O mandato `00-mandatos/C2.md` tem de ser regenerado** para a identidade nova. Hoje ele nomeia o
   `coordenador-de-acessos` na l.33, e o inspetor pediu isso no remédio, item 2. Isso não é trabalho meu. Para o caso de o
   mandato não nomear, o corpo assume como padrão o worktree `C:/Users/AMP/w-j01bc2` e o diretório
   `votos/B-SAN3-01b/` (`C2-evidencia.md`, `C2-voto.json`).
4. **P4.** O corpo tem 3 itens, mas o item 2 tem 5 sub-medições, de (a) a (e). Se a série de quedas (P6) recomendar,
   ele pode ser dividido em medir e julgar, no padrão 4a/4b. Essa decisão é do orquestrador.
5. **Pontos de medição que li no código e entreguei ao jurado como hipótese.** São o motivo de o corpo exigir conjunto e
   execução:
   - `super_admin` e `platform_admin` são `PERMISSION_CATALOG`, e `tenant_admin` é um `filter` dele. Por isso um grep de
     `work_orders:create` em `ROLE_PERMISSIONS` vê 3 dos 6 papéis que têm a permissão;
   - no modo prisma, o backend lê as permissões das linhas `role_permissions` persistidas. O seed cobre só
     `STANDARD_ROLES` mais `auditor`; o resto é a `P-SAN3-04A-SEED-PAPEIS-LEGADOS`, dono `B-SAN3-07`;
   - os `[GB*]` dublam 200 também para `inventory` e `support`, que não têm `read` e, na cadeia real, param no guard de
     `/work-orders`;
   - o `PermissionProvider` une as permissões da sessão com as do contexto ativo, e o teste zera a sessão.
6. **Limpeza (§C5):** não criei nenhum temporário além dos dois arquivos pedidos.
