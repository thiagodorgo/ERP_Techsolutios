Papel `inspetor-de-terreno-da-junta` · instância `inspetor-trc01c2-cdx` · executor Codex · modelo GPT-5.6 Sol · esforço médio · troca de EXECUTOR no mesmo nível menor do `model: opus`, por ordem do dono de usar IAs externas primeiro · `mandato_md5=96916a924e0b2286f326e27389d36ba4` · `corpo_md5_eol_neutro=89b4563001df748a4016ae57b05fbd20`.

# Parecer de terreno — B-TRC-01 ciclo 2

- Objeto julgado: `2043c5840c8f60fe91538840aaefb3420a11cfe3`
- PR: `#426`
- Papel: não julga mérito; somente a limpeza e a justiça do tabuleiro.

## 1. Isolamento

**VERDE.** `git rev-parse`, `git status --porcelain` e `git diff --ignore-cr-at-eol --name-only` provaram o objeto `2043c5840c8f60fe91538840aaefb3420a11cfe3`: o worktree detached do inspetor estava limpo; em `w-trc01`, as 52 marcações rastreadas são apenas EOL e os não rastreados são o log já declarado e os insumos/saídas desta junta. Não há processo persistente escrevendo na árvore.

`git worktree list`, `docker ps -a` e busca recursiva por probes: nenhum worktree ou container residual `jur-*`/`crit-*`/`jtrc01c2-*`, nenhum `jur-probe*`/`*-probe.ts`, nenhuma junction de `node_modules`. A base viva `erp-postgres`/`erp-redis` existe, mas está expressamente fora do alvo.

Plano declarado para as cadeiras:

- (a′) `jurado-trc01c2-a-rls-banco-e-ci` — Codex GPT-5.6 Sol médio; `C:/Users/AMP/w-jc2-a`; `jtrc01c2-a-`; portas 47661/47671.
- (b′) `jurado-trc01c2-b-escopo-superficie-e-trava` — Gemini 3.1 Pro API, teto operacional da cadeira **US$ 3**; `C:/Users/AMP/w-jc2-b`; `jtrc01c2-b-`; portas 47662/47672.
- (c′) `jurado-trc01c2-c-viatura-no-tempo`, instância `jurado-trc01c2-c-opus` — Claude Code, Claude Opus 5.5; `C:/Users/AMP/w-jc2-c` e comparação `w-jc2-c-h1`; `jtrc01c2-c-`; portas 47663/47673.

Cada cadeira tem `npm ci` próprio, Postgres 16 + Redis 7 descartáveis em `127.0.0.1`; base viva, portas 5432/6379/3000/5173/5050/8899 e servidores públicos Traccar são proibidos. Aplica-se o limite mais restritivo de 2 trabalhos Docker simultâneos.

## 2. Insumos do briefing

**VERMELHO no item 2.1.** `git cat-file -e` confirma ata/reprovação do ciclo 1, relatório do dev do ciclo 2 e plano Traccar no objeto. Porém a busca nos quatro mandatos devolveu **zero** ocorrência de `A RE-VERIFICAR`, `re-verificar` ou `reverificar`; o plano externo ainda diz “não reabrir sem razão nova o que a ata lista como aprovado por execução”. Isso contraria diretamente o item 2.1 do corpo: conclusão do ciclo anterior não pode ser herdada como fato.

Item 2.2 não se aplica (ciclo 2). O plano do ciclo 2 existe fora do repositório, tem 612 linhas, escopo e bateria com forma/N, e fica fixado para as três cadeiras por:

`C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-01-ciclo2-auditoria-e-plano.md` — **MD5 EOL-neutro `dd6e9074fbc56395e877a396dec16d2a`**.

O parecer `dba-guardiao-c2-parecer.md` está no disco, não rastreado, sobre o mesmo objeto, e declara `APROVA`. A autorização nominal `D-TRC01-VEHICLE-ASSIGNED-AT` opção (i) e a migration 76 existem no objeto.

## 3. Papéis e corpos

**VERDE.** A inelegibilidade foi conferida por nome: o `OBITUARIO-IDENTIDADES.md` foi lido antes das buscas. `git grep` no obituário, atas e reprovações deu zero colisão para as três identidades novas e para `jurado-trc01c2-c-opus`. Elas não são votantes do ciclo 1, achadores, planejador nem desenvolvedores do ciclo 2. A composição cobre RLS/banco/CI, escopo/superfície/segredo e contrato/atribuição no tempo.

Corpo carregado × julgado, MD5 EOL-neutro, objeto = disco = disparo:

- A: `.claude` `1d4ef521aeab60d8a9af040225ae81f3`; `.agents` `0631089c1856f76d0ad95bb7906dd2b2`.
- B: `.claude` `2c5f801a86a14ef4f0e5521f0fc7c4a8`; `.agents` `a1a2c76480c748631f233c722bc7fba5`.
- C: `.claude` `2e42d71774a6c10a80371bb1b1d5117f`; `.agents` `9f863a44faf13ffa56b77eed3921bb68`.

Os mandatos locais não precisam estar commitados nesta fronteira: pela regra do corpo, basta o MD5 EOL-neutro publicado e reexecutado para fixar o texto entregue. Os quatro hashes conferiram. As normas citadas (§C7.1-bis/ter, §C7.4-bis, §C7.6/6-bis e P1–P7) existem no `CLAUDE.md` do objeto.

## 4. S0, baseline e CI

**VERDE.** `node scripts/sync-agent-agents.mjs --check` → `OK — 61 agentes, espelho consistente`, exit 0. Após `npm ci` próprio e a precondição prescrita `npm run db:generate` (URL fictícia local, sem conexão), `npm run check` saiu 0. A primeira tentativa sem client Prisma gerado saiu 1 e está preservada na evidência; não foi ocultada.

`git ls-remote` e `gh pr view 426` resolvem o mesmo SHA. `gh api .../check-runs` retornou **14**, todos `completed/success`. Os dois logs `backend-postgres` enumeram as seis suítes DB do Traccar e fecham `tests 389`, `pass 389`, `fail 0`, **`skipped 0`**.

## 5. Quórum e perda de jurado

**VERDE.** O plano de perda de jurado está declarado: queda entra em `00-quedas.md`; voto perdido não conta; sucessor tem identidade nova e reexecuta P1 conforme P3; a junta não fecha com menos de 3 votos; executor sem cota/teto para e registra, sem degradação. A reserva da cadeira A, se Codex nem iniciar, é Claude Opus com identidade nova e sufixo.

## Fatos do orquestrador ainda não escritos

**RESSALVA FORTE DE PERSISTÊNCIA; não resolvida por este inspetor.** No objeto, o teto Gemini escrito cobre outras tarefas e o limite Docker escrito é 3. Não constam as quatro decisões novas, informadas nesta convocação como palavras do dono:

1. teto total de US$ 5 para Traccar ciclo 2; dev gastou US$ 1,65 e a cadeira B recebe até US$ 3 → máximo US$ 4,65, dentro do teto;
2. máximo de 2 trabalhos Docker;
3. IAs externas primeiro enquanto houver limites;
4. emenda do plano antes do código.

Como decisões explícitas do dono, são fonte §A1.1 e bastam para a autorização operacional desta convocação; o PR de registro informado pelo orquestrador continua necessário para persistência. O inspetor não o abriu, editou nem validou.

## Veredito

## BLOQUEADO

A junta **não pode começar**. Único bloqueante confirmado: os briefings das cadeiras não marcam as afirmações da ata anterior como **A RE-VERIFICAR** e ainda preservam linguagem de “não reabrir” conclusões anteriores. Para limpar o terreno, o orquestrador deve emendar os mandatos/briefing, marcar nominalmente cada conclusão herdada como `A RE-VERIFICAR` e mandar a cadeira competente reexecutá-la; depois deve convocar nova inspeção. Este inspetor não faz a emenda (§C7.4-bis).

Ressalvas não bloqueantes: plano do ciclo 2 e R-DBA são insumos locais não versionados, fixados por hash/conteúdo; as quatro decisões do dono aguardam o PR de registro informado.

## Limpeza

Worktree próprio `C:/Users/AMP/w-jc2-insp` e seu `node_modules` removidos pelo nome (exit 0; caminho ausente e não listado depois); zero container `jtrc01c2-*`/`jur-*`/`crit-*`. Nenhum container, base, porta, worktree ou arquivo alheio foi alterado.
