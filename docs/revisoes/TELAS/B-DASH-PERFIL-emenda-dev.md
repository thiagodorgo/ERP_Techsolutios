# B-DASH-PERFIL — emenda do arnês de permissões

## Identidade e escopo

- Dev: `dev-dash-emenda-cdx` — Codex GPT-5.6 Sol, esforço médio, nível menor.
- Worktree: `C:/Users/AMP/w-dash`; ramo medido: `fix/dash-perfil`.
- Produto, backend, Prisma, KPI, workflows e lockfiles: fora da emenda; não serão alterados.
- Asserções e títulos de testes: fora da emenda; não serão alterados.

## Evidência incremental

### Pré-voo

```text
git -C C:/Users/AMP/w-dash branch --show-current
fix/dash-perfil

git -C C:/Users/AMP/w-dash status --short
árvore já continha trabalho não commitado do B-DASH-PERFIL; preservado sem checkout, stash, reset ou clean

Get-ChildItem C:/Users/AMP/w-dash/frontend/tests -Directory
nenhuma pasta de auxiliares existente; criada a convenção frontend/tests/helpers
```

### Implementação

Concluído: o helper comum persiste uma cópia da sessão com `session.user.permissions`, usando
`setStoredAuthSession`; os 37 setups medidos passaram a chamá-lo sem mudar asserções ou títulos.

```text
verificação dos 37 caminhos de fail-files3.txt
lista=37 helper=37 legado=0
```

## Arquivos tocados pela emenda

- `frontend/tests/helpers/session-permissions.ts`
- `frontend/tests/auditoria-sessoes.test.tsx`
- `frontend/tests/branches.smoke.test.tsx`
- `frontend/tests/central-notificacoes.smoke.test.tsx`
- `frontend/tests/checklists-access-gating.smoke.test.tsx`
- `frontend/tests/checklists-editor.smoke.test.tsx`
- `frontend/tests/checklists-models-list.smoke.test.tsx`
- `frontend/tests/checklists-preview.smoke.test.tsx`
- `frontend/tests/commissions.smoke.test.tsx`
- `frontend/tests/customers.smoke.test.tsx`
- `frontend/tests/damages.smoke.test.tsx`
- `frontend/tests/extrato-profissional.test.tsx`
- `frontend/tests/finance-titles.test.tsx`
- `frontend/tests/fines.smoke.test.tsx`
- `frontend/tests/fuel-logs.smoke.test.tsx`
- `frontend/tests/insurance-policies.smoke.test.tsx`
- `frontend/tests/inventory.smoke.test.tsx`
- `frontend/tests/maintenance-orders.smoke.test.tsx`
- `frontend/tests/notifications.smoke.test.tsx`
- `frontend/tests/patios-dossie-versao.smoke.test.tsx`
- `frontend/tests/patios-leiloes-funil.smoke.test.tsx`
- `frontend/tests/patios-perfis.smoke.test.tsx`
- `frontend/tests/patios-processos.smoke.test.tsx`
- `frontend/tests/patios-yards.smoke.test.tsx`
- `frontend/tests/pois.smoke.test.tsx`
- `frontend/tests/price-tables.smoke.test.tsx`
- `frontend/tests/remuneracoes-liquidar.test.tsx`
- `frontend/tests/scheduled-notification.test.tsx`
- `frontend/tests/service-catalog.smoke.test.tsx`
- `frontend/tests/service-quotes.smoke.test.tsx`
- `frontend/tests/suppliers.smoke.test.tsx`
- `frontend/tests/tags.smoke.test.tsx`
- `frontend/tests/tariffs.smoke.test.tsx`
- `frontend/tests/teams.smoke.test.tsx`
- `frontend/tests/users.smoke.test.tsx`
- `frontend/tests/vehicles.smoke.test.tsx`
- `frontend/tests/work-order-registry-links.test.tsx`
- `frontend/tests/work-orders-page-live.test.tsx`
- `docs/revisoes/TELAS/B-DASH-PERFIL-emenda-dev.md`

## Validações

### TypeScript

```text
npm --prefix C:/Users/AMP/w-dash/frontend run check
> @erp-techsolutions/frontend@0.1.0 check
> tsc -b --noEmit
exit code 0
```

### Smoke completo

```text
npm --prefix C:/Users/AMP/w-dash/frontend run test:smoke
# tests 1327
# pass 1326
# fail 1
exit code 1
```

Falha localizada por execução isolada em
`frontend/tests/checklists-editor.smoke.test.tsx`: o caso somente-leitura esperava
`Ver execuções deste modelo`, cujo próprio comentário e gate exigem `checklist_runs:read`, mas o
preparo fornecia apenas `tenant_checklists:read`. Nenhuma asserção foi alterada. O preparo passou a
declarar as duas permissões de leitura, preservando o título e a semântica do caso.

```text
node --test --import tsx tests/checklists-editor.smoke.test.tsx
# tests 31
# pass 31
# fail 0
```

Reexecução após o ajuste de preparo:

```text
npm --prefix C:/Users/AMP/w-dash/frontend run test:smoke
# tests 1327
# pass 1327
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 214232.3825
exit code 0
```

### Vermelho-controle

```text
# chamada comentada temporariamente em frontend/tests/branches.smoke.test.tsx
node --test --import tsx tests/branches.smoke.test.tsx
not ok 1 - filiais renderiza cabecalho, tabs de situacao, acao de criar e estado vazio (D-007)
# tests 4
# pass 3
# fail 1
exit code 1
```

O helper foi religado imediatamente após a prova.

```text
node --test --import tsx tests/branches.smoke.test.tsx
# tests 4
# pass 4
# fail 0
exit code 0
```

### Escopo, whitespace e asserções

```text
git -C C:/Users/AMP/w-dash diff --stat -- frontend/tests
38 files changed, 90 insertions(+), 83 deletions(-)
```

O stat inclui `frontend/tests/operator-profiles.smoke.test.tsx`, que já estava modificado antes desta
emenda e foi apenas o modelo lido; a emenda não o alterou. O helper novo é untracked e, por isso, não
aparece no `git diff --stat`. Contagem própria da emenda: 37 arquivos da lista + 1 helper + este
relatório = 39 arquivos.

```text
git -C C:/Users/AMP/w-dash diff --check
sem saída
exit code 0
```

```text
git -C C:/Users/AMP/w-dash diff -U0 -- frontend/tests | grep -E "^[-+].*(expect|assert)"
sem saída
exit code 1 do grep (nenhuma correspondência)
```

Resultado: asserções mudadas = 0.

```text
conferência da lista medida
lista=37 helper=37 legado=0

conferência do conjunto tocado pela emenda
arquivos_emenda=39 proibidos=0
```

## Fora do escopo

- Nenhum arquivo de `frontend/src/`, `src/`, `prisma/`, `Kpis/`, `.github/` ou lockfile.
- Nenhum commit, push, Docker, base viva ou porta reservada.
- `frontend/tests/operator-profiles.smoke.test.tsx`, os demais arquivos já modificados do bloco e os
  testes novos preexistentes ficaram fora: pertencem ao trabalho não commitado recebido e foram preservados.
