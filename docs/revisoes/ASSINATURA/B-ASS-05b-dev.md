# B-ASS-05b — a trilha dos planos na tabela durável — relatório do dev

Plano: `B-ASSINATURA`, "Emenda 2 ao §4.5 — bloco `B-ASS-05b`" (fora do repositório,
`erp-pausa-2026-10-03/planos/B-ASSINATURA-plano.md`). Fecha `P-ASS02-TRILHA-PLATAFORMA-EM-MEMORIA`.

**Papéis (declarados)**
- **Plano:** orquestrador (Claude Opus 5.5, topo declarado).
- **Dev:** `dev-ass05b-opus` (Claude Opus 5.5).
- **Junta:** completa, em outro modelo (a trava acusa escrita no banco). Uma votação.

## F0 — terreno

- `git fetch -q origin` → `origin/main` = `015234d05320c4888cb4326affd8f4eb65a3a3e1` (o #510 já está lá).
- `git worktree add -b feat/b-ass-05b-trilha-planos C:/Users/thiag/w-ass05b origin/main` → `HEAD is now at 015234d0`.
- `npm ci` próprio → `npmci=0` (sem junction).
- Memória de commit livre: `11` GB; Docker sem outro trabalho (`docker ps` vazio).
- `docker run -d --name ass05b-pg ... -p 127.0.0.1:55526:5432 postgres:16`; `DATABASE_URL` exportado para ele.
- `npx prisma generate`; `npx prisma migrate deploy` → `All migrations have been successfully applied.`; `npm run db:seed` → executado.

## F1 — R-05b-1: `codes` e `count` na allowlist

- `platform-audit/audit-metadata.ts`: regra nova `codeList` (lista de até 50 itens, cada um na `SHORT_CODE` já existente,
  saída copiada) e as chaves `codes: codeList` e `count` (a regra `count` já existente). Nenhuma outra chave.
- Teste `tests/ass-05b-audit-allowlist.test.ts` (T-05b-1..5):
  `node --test --import tsx tests/ass-05b-audit-allowlist.test.ts` → `# tests 5 · # pass 5 · # fail 0`.
  - T-05b-1 lista válida, vazia e de 50 itens; T-05b-2 15 formas inválidas (fora de `SHORT_CODE`, 41 caracteres, 51 itens,
    não-texto, não-lista) → a chave some e `count` fica; T-05b-3 `count` negativo, fracionário, texto, NaN, infinito → some;
    T-05b-4 as 11 chaves exatas e as 9 antigas com o mesmo comportamento; T-05b-5 a metadata real do `PlansService`
    atravessa a allowlist inteira.
- **Vermelho-controle** na `origin/main` `015234d0` (worktree temporário `w-ass05b-ctl`, só o arquivo de teste copiado):
  `# tests 5 · # pass 0 · # fail 5`, as 5 com `ERR_ASSERTION` / `testCodeFailure` (não é erro de import).
- **Mutação literal** "aceitar qualquer string em `codes`" (`typeof item === "string" && SHORT_CODE.test(item)` →
  `typeof item === "string"`): `not ok 2 - T-05b-2` · `# pass 4 · # fail 1`. Revertida por edição inversa; `cmp` com a
  cópia de antes → igual.
- Vizinhos: `ass-05-vault-service`, `ass-05-vault-routes`, `ass-02-plans-bootstrap-trail`, `ass-05-provider-config` →
  `# tests 25 · # pass 25 · # fail 0`.
