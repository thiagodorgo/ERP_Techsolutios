# Arquitetura

O ERP Techsolutions usa frontend React + TypeScript + Vite, backend Node.js + TypeScript, PostgreSQL planejado como persistencia principal, Redis para cache/coordenacao futura e Docker para ambiente local.

## Boundaries principais

### Console da Plataforma

Boundary global do dono do SaaS/Super Admin. Gerencia tenants, planos, modulos, saude da plataforma e auditoria global.

Escopo: `platform`

### Administrador

Boundary do administrador do tenant/empresa cliente. Gerencia configuracoes, usuarios e permissoes dentro do tenant atual.

Escopo: `tenant`

### Usuarios

Boundary operacional para listar, convidar, editar e gerenciar usuarios e permissoes do tenant atual.

Escopo: `tenant`

### Checklists

Boundary tenant-scoped para modelos e execucoes de checklist configuraveis.

Escopo: `tenant`

Responsabilidade da plataforma: definir o catalogo de componentes permitidos (`text`, `textarea`, `number`, `currency`, `date`, `datetime`, `select`, `multi_select`, `checkbox`, `radio`, `boolean`, `photo`, `file`, `signature`, `barcode`, `qr_code`, `location`, `rating`).

Responsabilidade do tenant: configurar templates, campos, ordem, obrigatoriedade, regras, status, publicacao e execucao dentro do seu proprio `tenant_id`.

## Separacao platform scope vs tenant scope

- Platform scope usa permissoes `platform:*`.
- Tenant scope usa permissoes de dominio como `users:read`, `roles:manage`, `tenant:manage`, `inventory:read`.
- Usuario comum de tenant nao deve visualizar ou acessar Console da Plataforma.
- O Console da Plataforma usa layout frontend separado e API boundary separado.

## Multi-tenancy

Entidades tenant-scoped devem carregar `tenant_id` e sempre filtrar por tenant. Entidades globais da plataforma podem existir sem `tenant_id`, mas qualquer acao sobre dados de tenant deve ser auditavel.

No modulo `checklists`, templates, campos, execucoes e respostas sao entidades tenant-scoped. Nenhum repository ou endpoint deve consultar essas entidades apenas por `id`; toda leitura, escrita, publicacao, exclusao logica ou execucao deve validar tambem o `tenant_id` resolvido do contexto autenticado.

## Checklists configuraveis

O modulo `checklists` deve ser implementado de forma modular quando sair da fase documental:

```txt
src/modules/checklists/
  checklist.routes.ts
  checklist.controller.ts
  checklist.service.ts
  checklist.repository.ts
  checklist.schemas.ts
  checklist.types.ts
  checklist.permissions.ts
```

Regras arquiteturais:

- separar controller, service, repository, schemas/validators, types e permissoes;
- validar entrada de dados antes de acionar service/repository;
- nunca confiar em `tenant_id` do body;
- padronizar erros e respostas conforme as rotas existentes;
- nao introduzir dependencia nova sem necessidade;
- registrar auditoria para criacao, edicao, publicacao, desativacao, execucao, resposta, conclusao e cancelamento;
- preservar historico de templates por versao;
- manter execucoes antigas vinculadas a `template_version`;
- preparar respostas/evidencias para mobile Flutter e sincronizacao offline futura.

Decisao desta fase: a implementacao backend, migration Prisma e frontend ficam fora do escopo. A entrega atual formaliza contratos, entidades e permissoes para reduzir risco antes de codigo.

## Backend MVP necessario

O backend MVP deve atender o frontend com contratos claros, versionados e separados por boundary. Quando a persistencia final ainda nao existir, a implementacao pode usar service mockado ou em memoria, desde que:

- nao misture escopo platform e tenant;
- preserve contratos HTTP;
- nao crie dados sensiveis;
- registre pendencias de persistencia e auditoria.

Para o boundary `/api/v1/platform/*`, qualquer fallback por headers legados fica restrito a desenvolvimento/teste/local. Em producao, a Console da Plataforma deve depender de actor autenticado e permissao de plataforma.

## Evolucao planejada

- Persistir modulos habilitados por tenant.
- Criar auditoria global para acoes de plataforma.
- Implementar modo suporte auditado.
- Reduzir headers legados por feature flag ou modo strict.
- Planejar RLS como safety net posterior.
