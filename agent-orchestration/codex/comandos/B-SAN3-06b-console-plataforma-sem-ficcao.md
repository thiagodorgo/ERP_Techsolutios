# B-SAN3-06b — console da plataforma sem ficção

## Objetivo

Entregar Organizações, Cloud Billing e Saúde com dados reais de leitura; substituir superfícies sem fonte por paradas honestas; manter a organização `platform` fora das métricas de clientes.

## Contratos / Endpoints

- `GET /api/v1/platform/overview`
- Cinco leituras de Cloud Billing por `periodStart` e `periodEnd`.
- `GET /api/v1/health/ready`, preservando o corpo de 200 e 503.
- Permissões existentes do boundary `platform:*`; nenhuma permissão nova.

## Regras

- Cloud Billing é estritamente de leitura; nenhum cálculo monetário no frontend.
- Sem fonte, a tela exibe selo ou parada honesta, nunca número ou estado inventado.
- A organização de sistema fica visível e selada, mas não conta como cliente.
- A interface usa “Organização” e “Saúde”, sem termos técnicos de domínio.

## Escopo permitido

- `frontend/src/modules/platform/**`
- `frontend/src/navigation/platformNavigation.ts`
- Literal `PLATFORM_NAV` em `frontend/src/layouts/PlatformLayout.tsx`
- `frontend/tests/san3-06b-*`, trechos autorizados de `smoke-flow.test.tsx` e lista `test:smoke`
- Ampliação nominal: `frontend/tests/platform-health-honest-stop.smoke.test.tsx`, só a l.29 (C-13, `--numstat` = `1 1`)
- Cinco documentos nomeados no plano, scripts do bloco e registros operacionais.

## Escopo proibido

- `src/**`, `prisma/**`, `migrations/**`, `infra/**`, `.env*`, lockfiles, `Kpis/**`, arquivos-base e infraestrutura de banco.

## Validações

- 45 testes T1–T45 e regressões nomeadas no plano.
- `check`, `build`, `test:smoke`, `lint` da raiz e testes de raiz que leem `frontend/src`.
- Cinco geradores, controles negativos, `git diff --check` e os dois `--numstat` exatos.

## Limites

- Não abrir PR; o orquestrador abre após conferir a entrega.
- KPI congelado por `D-GOV-PROPORCIONAL`; não tocar `Kpis/*`.
- Não subir backend, banco ou containers.
