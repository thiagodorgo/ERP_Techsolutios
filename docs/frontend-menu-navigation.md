# Frontend Menu Navigation

## Fonte oficial

O frontend deve considerar `GET /api/v1/navigation/menu` como fonte oficial de menu quando o backend estiver disponivel. O menu local atual pode permanecer como fallback de transicao e mock, mas nao deve ser tratado como fonte de autorizacao.

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

## Relacao com telas

O registry referencia as telas existentes e planejadas:

- P01/P02/P03/P04 no Console da Plataforma;
- W02A Checklists, W03 Configuracoes, Notificacoes e telas administrativas tenant;
- runtime operacional de checklists em `/operations/checklists`;
- rotas planejadas de operacao, logistica e financeiro.

Nao implementar telas novas nesta rodada apenas por aparecerem como `planned` ou `future` no registry.
