# Credenciais de demonstração (modo REAL — backend + banco)

> Roteiro de validação humana do acesso (Ω-ACESSO). Todos os usuários pertencem ao tenant **demo**.
> Senha única de dev via env `DEMO_ADMIN_PASSWORD` (default `ChangeMe123!`). **Nunca** use estas senhas
> em produção. Semeie com `npm run db:seed:demo` (base + usuários + frota).

## Como subir
```bash
# .env: CORE_SAAS_PERSISTENCE="prisma"
npm run db:seed:demo      # tenant + papéis + 9 usuários + provisionamento de módulos + frota
npm run dev               # API :3000
npm --prefix frontend run dev   # Web :5174
```

## Usuários por papel (senha: `ChangeMe123!`)

| Papel (interno) | Rótulo UI | E-mail | Vê o Mapa Operacional (web)? |
|---|---|---|---|
| `super_admin` | Admin Plataforma | plataforma.demo@example.com | ✅ opera |
| `tenant_admin` | Administrador | admin.demo@example.com | ✅ opera |
| `manager` | Gestor Operacional | gestor.demo@example.com | ✅ opera |
| `operator` | Operador | operador.demo@example.com | ✅ opera |
| `auditor` | Auditor | auditor.demo@example.com | 👁 só leitura (sem ações de despacho) |
| `finance` | Financeiro | financeiro.demo@example.com | ❌ não vê |
| `inventory` | Estoque | estoque.demo@example.com | ❌ não vê |
| `support` | Suporte | suporte.demo@example.com | ❌ não vê |
| `field_technician` | Técnico de Campo | tecnico.demo@example.com | ❌ não vê (vive no app mobile) |

## O que validar (login→menu→clique)
1. Cada papel **loga** (senha certa → 200; senha errada → 401 uniforme).
2. O item **Mapa Operacional** aparece no menu conforme a coluna acima (matriz em `navigation-matrix.md`).
3. Para admin/manager/operator: clicar em **Mapa Operacional** abre `/operations/map` e o mapa carrega.
4. Auditor vê o mapa mas **não** tem botões de atribuição/despacho.
5. Gating dinâmico: remover o módulo `field_operations` do tenant demo (Console da Plataforma ou
   `UPDATE tenants SET modules = array_remove(modules,'field_operations') WHERE slug='demo';`) → o item
   **some do menu** de todos os papéis. Restaurar → volta.

## Raiz técnica (Ω-ACESSO)
O menu vinha **vazio para todos** porque o backend devolvia `modules: []` hardcoded (`prisma-core-saas.store`),
filtrando todo item com `requiredModules`. Corrigido com a coluna real `tenants.modules` (provisionada ao
demo), o `operator` ganhando `field_location:read` para operar o mapa, e o sidebar respeitando o
`governedPaths` do backend (gating dinâmico). Ver task-history `T-ACESSO`.

## Staging (Fly.io/gru — Ω-INFRA-2, config-as-code)

O CD `deploy-staging.yml` roda `db:seed:demo` no banco de staging a cada push na `main` (gated por
`STAGING_DEPLOY_ENABLED=true`), então os **mesmos usuários/senha acima** valem no staging. A **URL do staging**
(`https://erp-techsolutions-web-staging.fly.dev` ou domínio próprio) entra aqui após o primeiro deploy verde —
depende do hand-off de ativação (conta Fly + secrets no GitHub Environment `staging`; ver `docs/deployment.md`).
Login demo do smoke pós-deploy: `gestor.demo@example.com` / `STAGING_DEMO_ADMIN_PASSWORD`.
