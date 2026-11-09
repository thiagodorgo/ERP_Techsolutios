# B-ASS-07 — porta fiscal, reforma tributária e Focus NFe — relatório do dev

Plano: `B-ASSINATURA` §3, §4.5, §4.6, §4.7 e §12. Dev declarado: `dev-ass07-codex` (Codex 3, `gpt-5.6-sol`, esforço medium). O dev não revisa nem julga a própria entrega; pré-revisão, conferência e junta completa cabem a Claude e/ou DeepSeek.

## Recorte do portão 1 + 1

Este bloco entrega a porta comum, as regras fiscais, o adaptador Focus NFe e o falso Focus. NFE.io e PlugNotas ficam no `B-ASS-15`.

- Fora por NFE.io: T-NF-7..12, T-NF-20, T-NF-29, T-NF-42, T-NF-45 e T-NF-48, além das parcelas NFE.io dos testes comuns de reemissão/campos.
- Fora por PlugNotas: T-NF-13..18, T-NF-21, T-NF-30, T-NF-32, T-NF-43, T-NF-46 e T-NF-47, além das parcelas PlugNotas dos testes comuns.
- Permanecem aqui os casos Focus e comuns: porta, datas, regime/rota, assíncrono, idempotência/reenissão Focus, canal desligado, allowlist, segredo, registro de emissor/webhook Focus, PDF público Focus, campos Focus e cancelamento Focus.
- T-NF-db-1 fica para o B-ASS-08: `billing_invoice_sequences` e `seq` nascem na M5. A F6 deste bloco usa dublê em memória e não usa Docker.

## F0 — terreno, dependência e baseline

- Worktree `C:/Users/thiag/w-ass07`, ramo `feat/b-ass-07-porta-fiscal`, fast-forward para `origin/main@4cd1889d`.
- O B-ASS-06 está na base e `providers/http/billing-http.client.ts` existe. Não foi criado segundo cliente.
- Cofre conferido: adaptadores recebem segredo por `VaultService.readSecretForProvider`.
- `npm ci` próprio concluído; junction proibida e não usada.
- **PREMISSA FALSA:** `npm ci` deixaria o cliente Prisma pronto — `npm run check` falhou com `@prisma/client` sem `Prisma`/`PrismaClient`. Comando: `npm run check`. Saída: erros TS2305 em massa. Correção ambiental: `DATABASE_URL=postgresql://placeholder:placeholder@127.0.0.1:1/placeholder npx prisma generate`; nenhuma conexão foi aberta.
- Após gerar o cliente: `npm run check` verde; regressão R-EXT-0 do B-ASS-06: 4/4.
- Vermelho-controle na `origin/main`: `git ls-tree -r --name-only origin/main -- src/modules/subscription-billing/providers/invoice tests/ass-07-*.test.ts` não encontra porta, adaptador nem suítes do bloco.
- Sem migração, sem Docker, canal desligado e KPI congelado.

## RETOMADA 0

- **head medido:** `e1af3189` (commit F0 antes do carimbo no próprio relatório; o amend que grava esta linha altera o SHA).
- **feito:** contrato, terreno, recorte Focus-only, dependência do cliente HTTP/cofre e baseline medidos.
- **falta:** F1 a F8, bateria, PR e CI.
- **próximo comando:** `mkdir -p src/modules/subscription-billing/providers/invoice src/modules/subscription-billing/providers/tax` (a criação de arquivos será feita por patch).
