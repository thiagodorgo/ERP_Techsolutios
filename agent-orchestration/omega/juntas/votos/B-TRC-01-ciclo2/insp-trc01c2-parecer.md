Papel `inspetor-de-terreno-da-junta` · instância `inspetor-trc01c2-cdx` · executor Codex · modelo GPT-5.6 Sol, esforço médio · troca de EXECUTOR no mesmo nível menor do `model: opus` declarada pelo mandato · `mandato_md5=96916a924e0b2286f326e27389d36ba4` · `corpo_md5_eol_neutro=89b4563001df748a4016ae57b05fbd20`.

# Parecer de terreno — re-inspeção B-TRC-01 ciclo 2

- Objeto julgado: `2043c5840c8f60fe91538840aaefb3420a11cfe3`
- PR: `#426`, aberto, não draft, mergeable
- Papel: não julga mérito; somente a limpeza e a justiça do tabuleiro

## 1. Isolamento

**VERDE.** O worktree detached do inspetor foi criado no objeto e permaneceu sem mutação rastreada. `w-trc01` continua no mesmo objeto; suas 52 marcações são exclusivamente EOL (`git diff --ignore-cr-at-eol --name-only` vazio), e os não rastreados são os insumos/artefatos nomeados da junta e o log declarado. Nenhum processo persistente escrevendo na árvore foi detectado.

Não há worktree, probe, container ou junction residual de jurado. Só `erp-postgres`/`erp-redis` estão vivos e permanecem expressamente fora do alvo.

Plano declarado para as cadeiras:

- (a′) `jurado-trc01c2-a-rls-banco-e-ci` — Codex GPT-5.6 Sol médio; `C:/Users/AMP/w-jc2-a`; prefixo `jtrc01c2-a-`; portas 47661/47671.
- (b′) `jurado-trc01c2-b-escopo-superficie-e-trava` — Gemini 3.1 Pro API, teto operacional **US$ 3**; `C:/Users/AMP/w-jc2-b`; prefixo `jtrc01c2-b-`; portas 47662/47672.
- (c′) `jurado-trc01c2-c-viatura-no-tempo`, instância `jurado-trc01c2-c-opus` — Claude Code, Claude Opus 5.5; `C:/Users/AMP/w-jc2-c` e comparação `w-jc2-c-h1`; prefixo `jtrc01c2-c-`; portas 47663/47673.

Cada cadeira usa `npm ci`, Postgres 16 e Redis 7 próprios, somente em loopback. Base viva, portas 5432/6379/3000/5173/5050/8899 e servidores públicos do Traccar são proibidos. Vale o limite mais restritivo de dois trabalhos Docker simultâneos.

## 2. Insumos do briefing

**VERDE no item 2.1, sanado na re-inspeção.** Os novos mandatos têm MD5 EOL-neutro A `91dc62018ce3b621e233061f46c37795`, B `71ee13440a9d7af9ad92e1e8cbd2271c`, C `41ad811105b46808fe2eea92353f5b57`. Eles contêm seções nominais `A RE-VERIFICAR`, declaram que nenhuma conclusão da ata anterior é fato herdado e mandam cada cadeira reexecutar no objeto o que seu item tocar. A frase “não reabrir sem razão nova” do plano externo é citada e subordinada à reexecução, não herdada como verdade. O único bloqueante da primeira passada deixou de existir.

Pela regra do corpo, para os mandatos locais ainda não commitados basta o MD5 EOL-neutro publicado e reexecutado nesta fronteira: os quatro hashes conferiram, inclusive inspetor `96916a924e0b2286f326e27389d36ba4`.

Item 2.2 não se aplica (ciclo 2). O plano do ciclo 2 existe fora do repositório, com 612 linhas, escopo e bateria com forma/N:

`C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-01-ciclo2-auditoria-e-plano.md` — **MD5 EOL-neutro `dd6e9074fbc56395e877a396dec16d2a`**.

O parecer `dba-guardiao-c2-parecer.md` está no disco, não rastreado, fixa o mesmo objeto e declara `APROVA`. A autorização nominal `D-TRC01-VEHICLE-ASSIGNED-AT` opção (i) e a migration `20260876000000_work_orders_vehicle_assigned_at` existem no objeto.

## 3. Papéis e corpos

**VERDE.** O obituário foi lido antes da busca. Não há colisão nominal das três identidades novas nem da instância C com identidade sepultada/reservada, votante do ciclo 1, achador, planejador ou desenvolvedor. A composição cobre RLS/banco/CI, escopo/superfície/segredo e contrato/atribuição da viatura no tempo.

Corpo carregado × julgado, MD5 EOL-neutro, objeto = disco = disparo:

- A: `.claude` `1d4ef521aeab60d8a9af040225ae81f3`; `.agents` `0631089c1856f76d0ad95bb7906dd2b2`.
- B: `.claude` `2c5f801a86a14ef4f0e5521f0fc7c4a8`; `.agents` `a1a2c76480c748631f233c722bc7fba5`.
- C: `.claude` `2e42d71774a6c10a80371bb1b1d5117f`; `.agents` `9f863a44faf13ffa56b77eed3921bb68`.

As normas citadas (§C7.1-bis/ter, §C7.4-bis, §C7.6/6-bis e P1–P7) existem no `CLAUDE.md` do objeto.

## 4. S0, baseline e CI

**VERDE.** `node scripts/sync-agent-agents.mjs --check` → `OK — 61 agentes`, exit 0. Em worktree próprio, `npm ci` instalou 326 pacotes; o check inicial reproduziu a falta esperada do client Prisma. Após a precondição da bateria `npm run db:generate` com URL fictícia local, sem conexão, `npm run check` saiu 0.

`git ls-remote` e `gh pr view` continuam resolvendo o objeto. Há **14/14 check-runs**, todos `completed/success`. Os dois jobs `backend-postgres` enumeram as seis suítes DB do Traccar e terminam `tests 389`, `pass 389`, `fail 0`, **`skipped 0`**.

## 5. Quórum e perda de jurado

**VERDE.** `00-quedas.md` existe e está vazio de quedas. Voto perdido não conta; sucessor recebe identidade nova e reexecuta P1; a junta não fecha com menos de três votos; falta de cota/teto/modelo para e registra sem degradação. A cadeira A tem reserva de executor Claude Opus com identidade nova se o Codex não iniciar.

## Ressalvas obrigatórias no briefing

1. **Insumos locais não versionados:** as três cadeiras devem receber exatamente o plano fixado pelo MD5 acima e o parecer R-DBA local.
2. **Quatro decisões do dono ainda sem persistência no objeto nem na `origin/main@c260d362`:** teto total de US$ 5 para Traccar ciclo 2 (US$ 1,65 já gastos + até US$ 3 para B = US$ 4,65); máximo de dois trabalhos Docker; IAs externas primeiro; emenda do plano antes do código. São fatos explícitos do dono, registrados aqui sem consolidação pelo inspetor; o PR de registro informado pelo orquestrador continua necessário.

## Veredito

## LIBERADO COM RESSALVA

A junta pode começar no objeto `2043c5840c8f60fe91538840aaefb3420a11cfe3`, desde que as duas ressalvas acima sejam destacadas no briefing. Nenhum achado deste parecer julga o mérito da entrega.

## Limpeza

Worktree próprio `C:/Users/AMP/w-jc2-insp` e seu `node_modules` removidos pelo nome, exit 0; caminho ausente, worktree não listado e zero container `jtrc01c2-*`/`jur-*`/`crit-*`. Nenhum container, base, porta, worktree ou arquivo alheio foi alterado.
