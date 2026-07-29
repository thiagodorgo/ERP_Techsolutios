# R-nav-menu-platform-1 — opt-in ausente no middleware compartilhado

> **Entrega:** FIX-NAV-MENU-PLATFORM-JWT · **Ciclo:** 1 ·
> **Data:** 2026-07-28 · **Resultado inicial:** REPROVADO

## Achado bloqueante

O primeiro diff desviava o pseudo-tenant `platform` no comportamento global de
`createPersistentRbacContextMiddleware()`. Como a factory é usada por dezenas
de routers, o bypass alteraria silenciosamente superfícies de dinheiro,
custódia, dashboard e ordens de serviço.

- **Severidade:** VETO/ALTA
- **Revisores que levantaram o veto:** coordenador-de-acessos,
  validador-mestre e critico-adversarial
- **Regra violada:** RA-10/RA-11; caminho padrão dos consumidores
  não-Navigation deve permanecer fail-closed

## Correção exigida e aplicada

1. Converter o desvio em opt-in explícito, falso/ausente por padrão.
2. Ativar a flag somente em `createNavigationRouter`.
3. Limitar os middlewares dos routers montados amplamente em `/api/v1` aos
   próprios prefixos `/me` e `/sessions`.
4. Provar que tenant UUID continua usando RBAC persistente e que falha do
   resolver continua em 500 genérico, sem fallback.

## Reverificação

O especialista criado pela fábrica para resolução RBAC/raio de impacto
inspecionou 55 invocações da factory antes do rebase: somente Navigation
passava `allowPlatformControlPlaneContext: true`; as outras 54 permaneciam sem
flag. Após Ω5P PR-18a entrar na `main`, a prova final contou 56 invocações:
somente Navigation com flag e as outras **55** fail-closed. Amostra ampliada de
auth/sessions, financeiro, custódia, dashboard, ordens de serviço e navegação:
**186 pass, 0 fail, 2 skips DB-gated**.

**Fechamento:** SANADO; especialista e junta definitiva APROVARAM.
