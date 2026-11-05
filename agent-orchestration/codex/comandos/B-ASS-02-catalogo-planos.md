# B-ASS-02 — catálogo de planos, vigência e assinatura por organização

## Identidade e origem

- Dev: `dev-ass02` · nível menor declarado · identidade de dev.
- Plano: `planejador-assinatura` · Claude Fable 5.1, corrigido em 31/10 e 02/11.
- Verificação: outro modelo, com pré-revisão, junta completa de três cadeiras e conferência.

## Objetivo

Persistir quatro planos-base e dois add-ons sem valores comerciais, criar versões imutáveis com
vigência, atribuir uma assinatura por organização e reconciliar `tenants.modules` com plano e
add-ons vigentes.

## Fonte e execução

Executar `B-ASSINATURA-plano.md` §4.2, §3, §5 e §12, requisitos R-PLAN-1 a R-PLAN-12 e fatias
F0–F9. Evidências incrementais ficam em `docs/revisoes/ASSINATURA/B-ASS-02-dev.md`.

M1 e M1b foram autorizadas pela fala do dono de 31/10; M1-d foi autorizada pela fala de 05/11.
As três são aditivas, transacionais e têm drill em banco descartável.

## Restrições

- Nenhum preço, valor comercial, segredo ou nome de pessoa entra no repositório ou no PR.
- Não tocar frontend, módulos cloud, integrações, lockfiles ou KPI congelado.
- Não fazer merge: a junta completa é obrigatória e independente do dev.
