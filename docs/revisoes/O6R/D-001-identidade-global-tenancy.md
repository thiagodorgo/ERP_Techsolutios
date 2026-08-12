# Rascunho D-001 — Identidade global e memberships tenant

Status: proposta para deliberação humana. Motivação: Ω6R-SEC-001/TEN-001.

## Decisão proposta

Separar identidade autenticável global (`subject` imutável do IdP) de `User/Membership` tenant-scoped. Troca de organização resolve exclusivamente memberships do subject; e-mail é atributo mutável, nunca chave de autorização. Papéis globais só podem ser atribuídos por operação de plataforma com SoD/auditoria.

## Consequências

Migração aditiva e backfill validado; claims passam a carregar subject+membership. Lookup cross-tenant deixa de depender de bypass RLS em `users`. Exige testes de homônimos, multi-org legítimo e revogação.
