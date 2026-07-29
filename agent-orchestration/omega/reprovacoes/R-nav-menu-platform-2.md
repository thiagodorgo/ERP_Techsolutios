# R-nav-menu-platform-2 — itens tenant sem tenant real

> **Entrega:** FIX-NAV-MENU-PLATFORM-JWT · **Ciclo:** 2 ·
> **Data:** 2026-07-28 · **Resultado inicial:** REPROVADO

## Achado bloqueante

Depois do opt-in, `operator` e `viewer` com `tenant_id="platform"` e scope
ausente ainda podiam receber itens `tenantOnly`. A fronteira anterior só
barrava item tenant sem `tenantId` quando o papel também era reconhecido como
ator de plataforma.

- **Severidade:** VETO/ALTA
- **Impacto:** mistura indevida entre plano de controle e menu tenant
- **Regra violada:** RA-3/RA-7/RA-8; pseudo-tenant nunca pode provisionar
  superfície tenant

## Correção exigida e aplicada

1. Normalizar `platform` como ausência de tenant ativo em Navegação.
2. Exigir `context.tenantId` para qualquer item `tenantOnly`,
   independentemente do papel.
3. Cobrir `operator` e `viewer` com scopes `platform`, `tenant`, ausente e
   inválido; todos devem retornar `data:[]`.
4. Manter tenant UUID no resolvedor persistente e provar que grants armazenados
   substituem claims.

## Reverificação

O especialista criado pela fábrica para paridade JWT × `legacy_headers`
executou **104/104**: `platform_admin` e `super_admin` produziram os mesmos
quatro IDs Platform nas duas vias; `operator`, `viewer`, papel desconhecido e
roles vazio ficaram vazios; scope tenant para ator Platform ficou vazio; tenant
UUID continuou persistente e falha do resolver continuou fail-closed.

**Fechamento:** SANADO; especialista e junta definitiva APROVARAM.
