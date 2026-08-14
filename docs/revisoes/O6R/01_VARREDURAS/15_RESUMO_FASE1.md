# Fase 1 — resumo dos sinais

## Ferramentas

- TypeScript backend: verde.
- TypeScript frontend: verde.
- Flutter analyze: verde.
- “ESLint” do repo: comando termina verde, mas `npm run lint` delega ao check TypeScript; o sinal será avaliado por A5.
- Prisma validate: verde.
- Audits de dependências: 15 avisos somados nos quatro workspaces, nenhum caminho de exploração produtivo confirmado nesta fase.
- Dart outdated: saída integral preservada; versões não foram classificadas como defeito só por estarem desatualizadas.

## Pistas que orientam a revisão profunda

1. Fluxos multi-write cruzam serviços/repositórios com transações próprias; a contagem lexical de `$transaction` é insuficiente e exige tracing manual.
2. Query raw aparece em 72 locais, em grande maioria tagged templates; todas seguem na amostra A2/A3 para tenant, lock e injeção.
3. Censo Express preliminar: 403 endpoints em 70 arquivos. Percentuais de auth e validação serão apenas os que a auditoria manual comprovar.
4. Não houve `@ts-ignore`/`@ts-expect-error`; há um `any` explícito confirmado no caminho cross-tenant de usuários.
5. Nenhum segredo hardcoded foi confirmado pela caça lexical; seeds e defaults de produção seguem sob inspeção contextual.

Estes sinais não são achados. Somente evidências reabertas pelo Relator entram em `REGISTRO_ACHADOS_O6R.md` e `achados.jsonl`.
