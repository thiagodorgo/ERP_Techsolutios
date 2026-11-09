# B-O6R-03b — diário do desenvolvimento

- Autor/dev: `dev-o6r03b-codex` — Codex, GPT-5.6 Sol, esforço medium, identidade exclusiva de desenvolvimento.
- Plano: Claude (`B-REENVIOS-plano.md`). Verificação prevista: Claude e/ou DeepSeek; este dev não julga a própria entrega.
- Base: `origin/main@4cd1889dbbe0d35780649b81de86522d7539c409`; ramo `fix/mobile-rdv-sync`.
- PREMISSA FALSA (ambiente): `C:/Users/AMP/w-o6r03b` não pôde ser criado — comando `mkdir -p /c/Users/AMP` — saída `Permission denied`; continuidade isolada em `C:/Users/thiag/w-o6r03b`, sem junction.

## B-F0 — terreno

- B-F0 | `flutter pub get` e `npm ci` próprios; `DATABASE_URL=postgresql://dummy:dummy@127.0.0.1:1/dummy?schema=public npx prisma generate` verde; A (#512, `1dab0957`) e 1º PR (#483, `7c89c73b`) presentes na base; N_f = 1021/1021, zero falha/skip; N_b = 3986 testes, 3851 pass, 7 fail, 128 skip. Não-verdes pré-existentes, reexecutados e nomeados: `tests/core-saas-role-authority.test.ts` sem registrar teste (piso de denominador); `domain event publishes mapped checklist attachment job`; `domain event publishes mapped notification job for checklist completion`; os três casos de `tests/job-queue.test.ts`; e `o writer grava SET … EX na chave namespeada, com ida real ao Redis` — todos os seis casos funcionais dependem do Redis indisponível, sem tocar a porta 6379. PREMISSA FALSA (plano antigo): `ExpenseSyncActionTypes.backendSupported` e a troca de `sync_interrupted_reclaim.dart` já vieram na main; não serão reimplementados.

## B-F1 — hipóteses e vermelho-controle

- B-F1 | M.27/R-B1 confirmado: `GET /mobile/bootstrap` publica `id: category.key`, e `ExpenseCategorySnapshot.id` preserva essa chave; não cabe alteração nos arquivos condicionais de bootstrap. M.23 confirmado: `BootstrapRepository` grava `userId: sub`, igual ao `actor.userId` do backend. Vermelho-controle em `origin/main@4cd1889d`, worktree temporário e dependências próprias: RB2(2) HTTP 503 ficou `failed` em vez de `pending/SYNC_BUSY`; RB2(3) não autorizado ficou `failed` em vez de conflito; RB3(5) item sem `report_id` foi enviado; RB3(6) o resultado do `expense.report.create` não propagou `report_id`; RB3(8) comprovante legado foi enviado pelo batch; RB4b falhou porque o payload do app não contém `report_id`. PREMISSA FALSA (RB2(1)): a API `Pending` já preserva a ação sem alteração na main, portanto esse controle ficou verde antes do bloco. Controles temporários não integram a entrega.
