# Diário do dev — B-SAN3-15a (estoque real do técnico e a contagem do web; itens 35 a 37, primeira parte)

- **Autor:** `dev-15a-cl`, Claude Opus 5.5, subagente da sessão, nível menor, **identidade de dev declarada**.
- **Exceção declarada** (§C7 itens 6 e 11(6)): as duas contas Codex estão sem cota semanal até 16/11, a API está
  reservada para verificação (com teto do dia) e o Antigravity está no limite de 5 h. Por isso o dev é Claude e a
  **pré-revisão e a conferência serão de outro modelo**, pela API.
- **Verificador:** a definir pelo orquestrador (pré-revisão de outro modelo, pela API).
- Não escrevi o plano nem o critiquei.
- **Plano:** `plano-B-SAN3-15-v2.md` (só o 15a), com a Emenda 1 (requisitos da crítica r2). As emendas prevalecem.
- **Respostas do dono** (11/11, "Sim, todas (Recomendado)", `D-DONO-TODAS-RECOMENDACOES-1111`): vale a recomendação
  de cada pergunta do §9 — 1(a), 2(a), 3(a), 4(a) e 5(a). Sob 5(a), o gerente sem cadastro de profissional usa o
  estoque da base.
- Toda hora vem de `date` (fuso de São Paulo).

## Terreno

- Worktree próprio `C:/Users/thiag/w-15a`, ramo `fix/mobile-estoque-real-do-tecnico`, criado de `origin/main` =
  `da12fec6058876490649017e62b6e8c0e647a292` (#541) às 10:51 de 11/11. `npm ci` próprio (sem junction),
  `prisma generate`.
- `gh pr view 534 --json state` às 10:52: **OPEN**. Pela trava do plano (A-06), a **F4** (banco do aparelho,
  `app_database.dart`) espera o merge do #534; o servidor e o web começam já.
- Maquete `prestador-atendimento-3opcoes.reference.html`: **não existe** na `origin/main` (`git ls-tree` às 10:52).
  A **F4ui** espera a maquete aprovada (plano §6).

## Fatias

### F0a — vermelho-controle (servidor), 10:57–11:24

- **Âncoras (§3, `git grep -F -c` em `src`, `mobile/flutter_app/lib` e `frontend/src`, `origin/main` `da12fec6`):** todas as
  ÂNCORAS NOVAS do 15a deram **0**, salvo duas, declaradas:
  - `return { custodyType: "base" };` (a M-C3 do 15b) dá **1** hoje, em `src/modules/inventory/inventory.service.ts:511`
    (o `resolveCustody` do corpo do movimento). A âncora da M-C3 é **por arquivo**: no arquivo novo
    `inventory.actor-custody.ts` ela é única (1). Quem aplica a M-C3 nomeia o arquivo.
  - `this.location = 'Van-01',` (a M-A10) dá **1** hoje (`prestador_models.dart:11`), como o plano diz ("hoje 1").
- **Testes novos do servidor** (escritos ANTES do código; rodados na `main` `da12fec6`):
  - `tests/bsan315-technician-stock.test.ts` (memória, arnês de rota de `tests/stock-custody.test.ts`):
    `node --test --import tsx tests/bsan315-technician-stock.test.ts` → `# tests 9 · pass 0 · fail 9`. T-B1 a T-B7 e T-B9
    vermelhos por **404** (a rota não existe; o preparo do cenário — itens, perfis, viatura, LINK — passou); T-B10 vermelho
    porque `createActorOperatorProfileResolver` não existe.
  - `tests/bsan315-technician-stock-db.test.ts` (Postgres, papel efêmero `NOSUPERUSER NOBYPASSRLS`): a suíte não existia
    (vermelho-controle do plano: "a suíte não existe"); os casos chamam `technicianStock`/`listCustodyBalances`, que não
    existem na `main`.
- **Ciclo de importação (HIPÓTESE do §2.2):** `inventory.actor-custody.ts` importa `WORK_ORDER_MUTATION_SCOPE` de
  `work-order.types.ts` (que só importa tipos). `npm run check` verde; o `inventory.service.ts` já importava
  `work-orders/work-order.service.js` antes do bloco. **Sem ciclo novo.** `src/modules/work-orders/**` fica fora do diff.
- **App (T-A1 a T-A10, T-M1, T-M1b):** ficam para a F4, que espera o merge do #534 (a migração v16 → v17 do T-M1 é medida
  sobre a `main` com o #534). **Declarado:** a parte do app da F0a anda junto da F4.
- **Web (T-W1, T-W2):** escritos e medidos vermelhos na F7 (abaixo).
- **Sondas da crítica (P3):** a I4a (`X-Tenant-Id` em memória → 200) foi re-executada pelo T-B3 (ii-a): 200, `custody: null`,
  `items: []` depois do código; na `main`, 404 (a rota não existia). A I2c (7 mutações do servidor) é re-executada na F9a,
  com as mutações do plano no código real. A I2d (M-W1) na F7/F9a.
