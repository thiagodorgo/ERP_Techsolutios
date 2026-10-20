Cadeira C1 — Cadeia de acesso, do backend para a sessão | executor: Codex | modelo: GPT-5.6 Sol, esforço médio, nível menor | identidade: jurado-dash-c1-cdx | objeto: 849bf840f2bdecae87b82a17b26adf505d8a2a8e | mandato_md5 EOL-neutro: d93c0139a8f63a8b85e70347bf67d608 | corpo canônico blob: e1460c5647f38ab93b82d41085b32e294eba86b4, md5 EOL-neutro: 1af93b3df464a6442c8dc97cf31bb22e | corpo espelho blob: 81c11c21d67c927fbef266e9614ed784d638d0f0, md5 EOL-neutro: 10f73b163cba5f61f5866bcaf3d7764d

# Evidência incremental — B-DASH-PERFIL — ciclo 1 — C1

## Legalidade pré-mérito

- Comando: validação EOL-neutra dos corpos e mandato; `git ls-remote`; `gh pr view 446`; `gh api .../check-runs`; leitura do parecer do inspetor.
- Saída resumida: hashes conferem; remoto e PR apontam para `849bf840f2bdecae87b82a17b26adf505d8a2a8e`; 14/14 check-runs `completed/success`; inspetor `LIBERADO`, nomeando esta identidade e worktree exclusivo `C:/Users/AMP/w-jdash-c1-cdx`; plano, crítica, emenda e relatórios permanecem A RE-VERIFICAR.
- Veredito parcial: legalidade satisfeita; mérito autorizado. Régua: PERMISSÃO, unanimidade de 3 com veto.

## Item 1 — Permissões do active-tenant e login

- Comando: `node --test --import tsx tests/auth-active-tenant-permissions.test.ts` no objeto limpo; saída resumida: 3/3 passaram, `ec=0`; `auth.routes.ts` tinha hash `0da96d08548e5c422073a3465bc18aa46f8ce847`, igual ao blob do objeto.
- Comando vermelho-controle: remoção temporária, por patch, de `permissions: resolveLoginPermissions(match.user.roles)` do payload de `active-tenant`, seguida do mesmo teste; saída resumida: 2 passaram, 1 falhou exatamente no contrato canônico, `ec=1`; mutante `4e1a70096f541c29dbdfb27b29a75cdc9c573429`.
- Comando de restauração: reaplicação da linha, reexecução do mesmo teste e `git hash-object`; saída resumida: 3/3 passaram, `ec=0`, hash restaurado `0da96d08548e5c422073a3465bc18aa46f8ce847` = blob do objeto; `git status --short` vazio.
- Veredito parcial: APROVADO. O login e o `active-tenant` resolvem permissões pelo mesmo `resolveLoginPermissions`, que filtra chaves em `ROLE_PERMISSIONS` e chama `resolvePermissionsForRoles`; o vermelho-controle prova que o teste detecta a ausência do array canônico, sem capacidade fabricada observada.

## Item 2 — Acesso do PermissionProvider

- Comando de prova positiva: probe runtime via `npx --no-install tsx -e <render AuthProvider→TenantProvider→PermissionProvider>` com sessão Financeiro `permissions=[]` e contexto ativo `permissions=["dashboard:view"]`; saída resumida: `permissions=[]`, `can_dashboard_view=false`, `ec=0`. Isso prova que o array exposto não une mais o contexto estático.
- Comando de achado: o mesmo probe runtime com sessão `roles=["Super Admin"]`, `permissions=[]`; saída resumida: `{"permissions":[],"can_dashboard_view":true,"can_arbitrary":true}`, seguido de `AssertionError`, `ec=1`. N=2/2 permissões ausentes amostradas foram promovidas; a forma é genérica porque `can(permission)` usa `... || isPlatformAdmin({ roles, permissions })`, e `isPlatformAdmin` aceita o rótulo de papel.
- Comando vermelho-controle: mutação temporária `return permission === "dashboard:view" || ...` e repetição do probe Financeiro; saída resumida: acusou `true !== false`, `ec=1`. O teste versionado `node --test --import tsx tests/dashboard-profile-behavior.test.tsx`, porém, continuou 4/4 verde (`ec=0`) sobre o mesmo mutante, pois não exercita o provider.
- Comando de restauração: reversão exata do mutante, repetição do probe Financeiro e `git hash-object`; saída resumida: probe `ec=0`; hash `8ab7987365e9ae2b628d7736d657636049fe5bb9` = blob do objeto; árvore limpa.
- Veredito parcial: REPROVADO — `bloqueia`, gravidade grave, classe quebra de permissão, escopo `dentro-do-bloco`. Evidência de origem/escopo: o diff `3fbcaea2..849bf840 -- frontend/src/providers/PermissionProvider.tsx` mostra que o bloco alterou precisamente a fonte de permissões do provider, e o corpo C1 Item 2 classifica promoção sem base no array real como `dentro-do-bloco`. O provider continua concedendo qualquer capacidade a `Super Admin` mesmo quando o backend entregou array vazio; além disso, o teste novo do bloco não detecta a mutação obrigatória.

## Item 3 — Matriz RBAC e Item 12 do SAN3

- Comando: `node --test --import tsx tests/dashboard-profile-permissions.test.ts`; saída resumida: 4/4 passaram, `ec=0`. O censo executado sobre `Object.keys(ROLE_PERMISSIONS)` produziu 13 papéis: 11 caem em `/dashboard` por `dashboard:read`; `finance` cai em `/finance` por `financial_entries:read`; `inventory` cai em `/inventory` por `inventory_items:read`; `ec=0`.
- Comando: leitura executável dos blocos de rota em `frontend/src/App.tsx`; saída resumida: `/dashboard` guarda `dashboard:read`, `/finance` guarda `financial_entries:read`, `/inventory` guarda `inventory_items:read`, `ec=0`. Assim, os destinos de Financeiro e Estoque carregam a mesma capacidade efetiva que os levou até lá e não nascem em 403.
- Comando vermelho-controle Financeiro: mutação temporária de Financeiro e Estoque para `/dashboard`, seguida do teste; saída resumida: Financeiro acusou esperado `/finance`, real `/dashboard`; 2/4 passaram, 2 falharam, `ec=1`.
- Comando vermelho-controle Estoque: restauração apenas de Financeiro, mantendo Estoque em `/dashboard`, seguida do teste; saída resumida: Estoque acusou esperado `/inventory`, real `/dashboard`; 3/4 passaram, 1 falhou, `ec=1`.
- Comando de restauração: restauração de Estoque, reexecução e hashes; saída resumida: 4/4 passaram, `ec=0`; hash `b78828901b5157118d957b76059c929aba18bc26` = blob do objeto; árvore limpa.
- Veredito parcial: APROVADO. A matriz executada deriva do catálogo backend, Financeiro e Estoque chegam a rotas cujos guards aceitam suas permissões reais, e os dois vermelhos-controle são detectados separadamente.

## Teardown

- Comando: `git status --short`, `git diff --check`, inspeção de `LinkType`, listagem `jdash-c1-*`, `git worktree remove --force C:/Users/AMP/w-jdash-c1-cdx` e verificação final.
- Saída resumida: worktree estava limpo e detached em `849bf840`; `git diff --check` `ec=0`; `node_modules` raiz e frontend eram diretórios reais, `LinkType` vazio; zero container `jdash-c1-*`; nenhuma porta ou base viva foi usada. O Git desregistrou o worktree, mas o Windows deixou a pasta física vazia; após confirmar caminho absoluto e diretório vazio, a pasta foi removida e `WORKTREE_EXISTS=False`.
- Veredito parcial: teardown concluído; mutantes restaurados por hash; processos iniciados pela cadeira = 0; containers/redes/volumes `jdash-c1-*` = 0; worktree removido; base viva intocada.

