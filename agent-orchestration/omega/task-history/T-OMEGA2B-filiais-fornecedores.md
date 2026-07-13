# T-OMEGA2B — Filiais + Fornecedores (Ω2-b)

## META
Dois cadastros densos multi-tenant do lote Ω2-b, espelhando o padrão provado (price-tables/tariffs):
**Filiais** (CRUD sobre o model `Branch` JÁ EXISTENTE — sem migration) e **Fornecedores** (Supplier
greenfield: model + migration RLS). Telas `/cadastros/filiais` e `/cadastros/fornecedores` no grupo GESTÃO.

## TOCADO
- **DB:** model `Supplier` novo (name natural key, document/email/phone/address/category/notes, is_active,
  audit cols) + back-relation Tenant + migration aditiva `20260725000000_add_suppliers` (RLS ENABLE+FORCE +
  policy; uniques (tenant_id,id)/(tenant_id,name); FK Restrict). **Branch intocado** (usa status
  active|inactive como soft-delete — o model não tem is_active/created_by).
- **Backend:** `src/modules/branches/` e `src/modules/suppliers/` (9 arquivos cada, espelho price-tables);
  routers em app.ts. Branches: 409 duplicate_code; Suppliers: 409 duplicate_name, email validado/normalizado.
- **RBAC:** `branches:*` e `suppliers:*` espelhando `price_tables:*` (24 ocorrências no catalog.ts) + seed
  descrições + core-saas.test.ts lista (26/26 mantido).
- **Frontend:** `registry/branches/` (FiliaisPage + BranchFormModal — **código imutável na edição**: disabled
  + dica + fora do payload, lição do veto B2 de Tarifas) e `registry/suppliers/` (FornecedoresPage +
  SupplierFormModal — nome editável, é só natural key de 409). Rotas + menu GESTÃO + tenantNavigation.
  cadastros-nav 6→8. Fonte canônica: estudo doutoral §5 (lista de ativos), §6.1 (julgamento pré-computado),
  §3 (carga cognitiva). Gênero: Filial Ativa/Inativa; Fornecedor Ativo/Inativo (convenção do repo).

## Screen-element-map
| Tela | Colunas | Ações | Estados |
|---|---|---|---|
| /cadastros/filiais | Nome, Código, Situação, Criada em | criar/editar (código fixo na edição), desativar via status | loading/empty/error/acesso-negado |
| /cadastros/fornecedores | Nome, CNPJ/CPF, Contato (email·tel), Categoria, Situação | criar/editar, desativar via is_active | idem |

## RESULTADO TESTÁVEL
- Backend: `check`/`lint`/`build` verde · core-saas **26/26** · **branches 13/13 + suppliers 14/14** (+
  regressão price-tables/tariffs 30/30 = 57/57 no conjunto) · migration suppliers **deploy + down/re-up**
  verificados (`\d suppliers`: forced RLS + policy + uniques) · `git diff --check` limpo.
- **Live HTTP** (gestor.demo, após re-seed): filial 201 / dup code **409**; fornecedor 201 (com CNPJ
  formatado) / dup **409** / email inválido **400**; finance **403** em ambos; lists OK.
- Frontend: `check`/`build` verde · `test:smoke` **311/311** (+18: 2×adapter 5 + 2×smoke 4; nav 6→8).
- Incidente de ambiente (não é bug): o dev server segurava Prisma client antigo → `Cannot read ... 'create'`;
  restart resolveu (mesmo sintoma já visto no Ω2-a.1).

## Pendência registrada
`prisma/seed.ts` `satisfies Record<Permission,string>` já estava violado no HEAD (~34 descrições antigas
ausentes; nenhum gate typechecka o seed; fallback runtime cobre). Registrado para rodada de documentação.

> **RETIFICAÇÃO (Ω-DOCS · D-DOCS-KRYOS · 2026-07-13):** as citações a "estudo doutoral" acima referenciavam
> `docs/research/estudo-doutoral-interfaces-10-saas.md` — conteúdo do projeto **Kryos** (outro SaaS do dono,
> supervisão de refrigeração/SCADA) que vazou para este repo e foi **REMOVIDO**. As decisões de UI destes
> blocos permanecem válidas por mérito próprio (tabelas densas, cópia PT-BR, estados/transições válidos); a
> **fonte canônica de UI do ERP Techsolutions** é `DESIGN_SYSTEM.md`, `COMPONENT_LIBRARY.md` e as docs próprias
> (`docs/09-mapa-telas-frontend.md`, `screen-refs/`). A atribuição ao estudo Kryos fica retificada.
