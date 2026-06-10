# Frontend Menu Navigation

## Fonte oficial

O frontend deve considerar `GET /api/v1/navigation/menu` como fonte oficial de menu quando o backend estiver disponivel. O menu local atual pode permanecer como fallback de transicao e mock, mas nao deve ser tratado como fonte de autorizacao.

Implementacao atual:

- service: `frontend/src/modules/navigation/navigation.service.ts`;
- adapter: `frontend/src/modules/navigation/navigation.adapter.ts`;
- hook: `frontend/src/modules/navigation/useNavigationMenu.ts`;
- mock/fallback: `frontend/src/modules/navigation/navigation.mock.ts`;
- `PlatformLayout` consome `scope=platform`;
- `AppShell`/`Sidebar` consomem o menu tenant/operations/logistics/finance sem `scope`;
- `VITE_USE_MOCKS=true` usa fallback local seguro;
- falha de API em runtime usa fallback local e marca `isFallback=true` no hook;
- resposta backend vazia tambem usa fallback local filtrado enquanto a persistencia de modulos do tenant nao estiver completa para todos os seeds/ambientes.

Contrato esperado por item:

```ts
type NavigationItem = {
  id: string;
  label: string;
  description?: string;
  path: string;
  icon: string;
  group: "platform" | "tenant" | "operations" | "logistics" | "finance";
  order: number;
  status: string;
  requiredPermissions: string[];
  requiredModules?: string[];
  platformOnly?: boolean;
  tenantOnly?: boolean;
  children?: NavigationItem[];
  relatedEndpoints?: string[];
};
```

## Regras de renderizacao

- usuario sem permissao nao ve link;
- grupos vazios nao aparecem;
- sidebar expandida e recolhida usam a mesma lista filtrada;
- itens Platform aparecem apenas para atores Platform;
- itens Tenant/Operacao aparecem conforme tenant, RBAC e modulos habilitados;
- `status` e informativo e nao substitui RBAC;
- `relatedEndpoints` serve para rastreabilidade, nao para montar chamadas automaticamente;
- icones devem ser resolvidos por nome padronizado, preferencialmente via `lucide-react`.
- icone desconhecido usa fallback `Circle`;
- a sidebar renderiza grupos por `group`: Platform, Administração, Operação, Logística e Financeiro;
- status `planned`, `future`, `mock` e `backend-ready` pode aparecer como badge discreta quando retornado pelo backend.

## Relacao com telas

O registry referencia as telas existentes e planejadas:

- P01/P02/P03/P04 no Console da Plataforma;
- W02A Checklists, W03 Configuracoes, Notificacoes, Mapa Operacional e telas administrativas tenant;
- runtime operacional de checklists em `/operations/checklists`;
- rotas planejadas de operacao, logistica e financeiro.

Nao implementar telas novas nesta rodada apenas por aparecerem como `planned` ou `future` no registry.

`/operations/map` e excecao ja implementada nesta rodada: o link exige `field_location:read`, modulo `field_operations` habilitado, e a tela consome os endpoints existentes de localizacao com fallback/mock seguro. Quando `work_orders:read` tambem esta disponivel, o mapa mostra OS atual/atribuida e link para `/work-orders/:workOrderId`; sem essa permissao, a tela nao renderiza link/acao de OS.

`/work-orders` agora possui UI web implementada e usa `work_orders:read` no menu/guard frontend. As rotas complementares `/work-orders/new` e `/work-orders/:workOrderId` usam `work_orders:create` e `work_orders:read`, respectivamente. Acoes sensiveis dentro do detalhe usam `work_orders:status` e `work_orders:assign`.

`/operations/dispatches` esta implementado como UI web inicial de Despachos Operacionais. O item exige `field_dispatch:read` e modulo `field_operations`; criar, alterar status, cancelar e reatribuir sao exibidos conforme `field_dispatch:create`, `field_dispatch:update`, `field_dispatch:cancel` e `field_dispatch:reassign`. A tela consome `/api/v1/operations/dispatches` e usa `/api/v1/work-orders` apenas para enriquecer OS/prioridade quando `work_orders:read` estiver disponivel.

## Hardcode restante

Ainda existem `frontend/src/navigation/platformNavigation.ts` e `frontend/src/navigation/tenantNavigation.ts` como fallback/mock local. Eles nao sao a fonte oficial em modo real e devem ser removidos apenas em rodada propria, depois que o consumo backend estiver estabilizado.
