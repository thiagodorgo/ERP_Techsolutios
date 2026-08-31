# SAN2-4b — DIÁRIO DO DEV · correção **C4** (teardown resiliente do `rls_test_`)

> **Instância:** `dev-san2-4b` (sucessor) — identidade **nova**. Não achei nada, não voto, não julgo a
> validade do achado (§C7.4-bis). **Papel: quem desenvolve.**
> **Mandato:** as correções **C3 e C4**. Este diário é o da **C4** — a TERCEIRA porta de gênese de
> órfãs: o `finally` de `tests/rls-tenant-isolation.test.ts:3148-3151` faz `DROP OWNED`/`DROP ROLE`
> **crus**, sem `dropEphemeralRoleResilient`, ao contrário das outras famílias.
> **Plano obrigatório:** `agent-orchestration/omega/planos/SAN2-4b-plano.md` §3-C4, §4-C4, §5, §7.
> **Escrita incremental** (`D-JUNTA-RESILIENTE`). **A lição herdada da C1/C2:** o verde não prova;
> o vermelho-controle prova.
> **Terreno:** o §0 do diário irmão (`dev-c3-sweep.md`) é o MESMO terreno — mesma sessão, mesmo
> cluster `san2-4b-pg` na porta **56432**, mesmo head de abertura `f6631d0`. Não o duplico aqui;
> o que for específico da C4 está registrado abaixo.

---
## §1 — O defeito, lido no arquivo antes de qualquer edição

`tests/rls-tenant-isolation.test.ts`, `finally` do único `test()` (l.3148-3151 no head de abertura):

```ts
await withRoleCatalogLock(adminClient, async (tx) => {
  await tx.$executeRawUnsafe(`DROP OWNED BY "${roleName}"`);
  await tx.$executeRawUnsafe(`DROP ROLE IF EXISTS "${roleName}"`);
});
```

**Dois statements dentro de UMA transação, sem retry e sem relatório.** É a forma (a) que o comentário
do próprio arnês (`auth-identity-fixture.ts`, bloco "C-B") descreve como o defeito que o
`dropEphemeralRoleResilient` existe para matar — e da qual as outras famílias já saíram
(`vehicle-identity-schema`, `impound-process-checklist-link-schema`, e o próprio
`createEphemeralRole`). A `rls_test_` ficou para trás: é a **terceira porta de gênese de órfã**,
somada ao SIGKILL e ao SIGINT (medicao-3 O-2).

**Por que um erro no 1.º statement leva o 2.º junto** (a armadilha `25P02`, escrita no arnês): erro
dentro de transação **aborta a transação**; o `DROP ROLE IF EXISTS` seguinte não roda — nem falha
"sozinho", simplesmente nunca é emitido. O `IF EXISTS` não salva nada: ele suprime "role
inexistente", não "transação abortada".

---

## §2 — O VERMELHO-CONTROLE da C4: as duas formas, a MESMA falha, o MESMO cluster

**Sonda `c4-probe.mts`** (scratchpad; roda sob `tsx` a partir da raiz do worktree para resolver
`@prisma/client`, e é apagada ao final — §5). Ela **não lê** o arquivo corrigido: replica a FORMA A
**verbatim** do bloco acima e chama a FORMA B do arnês. A falha injetada é a **mesma das duas**: o
duplo de teste que rejeita a **primeira** aquisição de `$transaction` — exatamente o do drill PC do
`db-catalog-write-guard.test.ts` (l.394-416).

> **Por que injeção transitória, e não uma dependência permanente.** A classe que o 4a nomeou é
> falha **por concorrência** em `pg_authid`/`pg_auth_members` — transitória por natureza. Uma falha
> permanente (ex.: `2BP01` por objeto dependente) faria as DUAS formas deixarem a role viva, e a
> forma B falharia **alto**, que é o desenho correto — mas não distinguiria as duas. A injeção
> transitória é o discriminador honesto, e é a que o drill D39 do arnês já usa.

Cada iteração cria uma role `rls_test_` com a assinatura **real** do criador
(l.31-41: `LOGIN` + `GRANT USAGE ON SCHEMA` + DML em todas as tabelas + sequences).

### C4-R1 · **N = 10** · log `C4-R1-vermelho-verde.json` + `C4-R1-stderr.log` · ec=0

| forma | sobreviveu | lançou | grants da sobrevivente | `attempts` | falhas reportadas |
|---|---|---|---|---|---|
| **A — crua** (o código como estava) | **10/10** | 10/10 | **460** (= 115 × 4) | — | **nenhuma** (a exceção sobe e é só isso) |
| **B — `dropEphemeralRoleResilient`** (a correção) | **0/10** | 0/10 | — | **2** em 10/10 | **2** em 10/10, com o marcador em **10/10** |

**A inversão é total, e a órfã da FORMA A é a órfã do 4a:** `460` grants, `LOGIN`, sem expiração —
a mesma assinatura das 68 da base viva (medicao-3 §F10). A sonda não simula a órfã: ela a **produz**,
10 vezes seguidas, pela porta que a C4 fecha.

**A segunda metade do aceite, medida:** o stderr mostra o teardown resiliente **reportando** as
falhas em vez de engoli-las —
`[o6r-arnes] teardown de "rls_test_…": 2 statement(s) de catálogo falharam em 2 tentativa(s) — role removida:`
com `tentativa 1 · DROP OWNED BY … → falha-injetada-san2-4b-c4`. "Resiliente" não virou "silencioso".

**Efeito colateral da FORMA A que a tabela não mostra e importa:** ela **lançou 10/10** de dentro de
um `finally`. Numa falha real do teste, essa exceção **mascara o erro original** — some com o motivo
verdadeiro da reprovação e deixa a órfã viva. A FORMA B não lança quando a role morre (0/10).

---
## §3 — A CORREÇÃO C4 aplicada

**Arquivo único: `tests/rls-tenant-isolation.test.ts`.** O `finally` passa a chamar
`await dropEphemeralRoleResilient(adminClient, roleName)` — drop-in, como o §3-C4 do plano prevê.
O `withRoleCatalogLock` **externo saiu** porque o helper toma o lock **por statement** (janelas
curtas, propriedade PB do arnês); mantê-lo aninhado seria pedir o mesmo advisory lock por dentro
dele próprio.

O comentário registra, dentro do código: o que era, por que a transação única mata o segundo
statement (`25P02`), o número medido (10/10 × 0/10), e que este arquivo era **a última família de
fora** — `vehicle-identity-schema` e `impound-process-checklist-link-schema` já haviam migrado no
B-O6R-ARNES.

**Conferência por grep — nenhum DROP cru sobrou no arquivo:**

```
grep -n 'DROP OWNED\|DROP ROLE' tests/rls-tenant-isolation.test.ts
  -> apenas 2 ocorrencias, AMBAS em comentario (a prosa que explica a migracao).
     Zero em $executeRawUnsafe / SQL.
```

**Import:** `dropEphemeralRoleResilient` e `sweepOrphanEphemeralRoles` entram no mesmo `import` do
arnês onde já vinha `withRoleCatalogLock` — nenhum caminho de módulo novo.

---

## §4 — A PROVA (§4-C4): vaza-metro F7, N = 10, com controle de aparição

**Forma F7 do 4a:** snapshot de `pg_roles` (contagem **e lista ordenada**) imediatamente antes e
depois de UMA execução de `run-backend-tests.mjs tests/rls-tenant-isolation.test.ts`, no cluster
descartável; em paralelo, um poller consulta `rolname LIKE 'rls_test\_%'` durante a execução — o
**controle de aparição**, que existe para que "Δ=0" não possa ser satisfeito por um teste que nunca
criou role nenhuma.

Estado do catálogo antes da bateria: **15 roles**, nenhuma das famílias de arnês viva (conferido).

| rodada | ec | roles antes | roles depois | **Δ** | lista ordenada | poller: amostras com a role | roles distintas vistas |
|---|---|---|---|---|---|---|---|
| F7-r01 | 0 | 15 | 15 | **0** | **IDÊNTICA** | 7 | 1 |
| F7-r02 | 0 | 15 | 15 | **0** | **IDÊNTICA** | 6 | 1 |
| F7-r03 | 0 | 15 | 15 | **0** | **IDÊNTICA** | 6 | 1 |
| F7-r04 | 0 | 15 | 15 | **0** | **IDÊNTICA** | 6 | 1 |
| F7-r05 | 0 | 15 | 15 | **0** | **IDÊNTICA** | 6 | 1 |
| F7-r06 | 0 | 15 | 15 | **0** | **IDÊNTICA** | 6 | 1 |
| F7-r07 | 0 | 15 | 15 | **0** | **IDÊNTICA** | 6 | 1 |
| F7-r08 | 0 | 15 | 15 | **0** | **IDÊNTICA** | 6 | 1 |
| F7-r09 | 0 | 15 | 15 | **0** | **IDÊNTICA** | 6 | 1 |
| F7-r10 | 0 | 15 | 15 | **0** | **IDÊNTICA** | 6 | 1 |

| exigência do §4-C4 | exigido | executado | ok |
|---|---|---|---|
| Diff conferido: o `finally` chama o helper, nenhum DROP cru sobra (grep transcrito) | — | §3 acima | **sim** |
| Vaza-metro Δ=0 | 10/10 | **10/10** | **sim** |
| Controle de aparição (poller vê a role nascer e morrer) | ≥5/10 | **10/10** (6-7 amostras por rodada, 1 role distinta) | **sim** |

**A lista ordenada, e não só a contagem.** Δ=0 por contagem pode esconder "uma nasceu, outra morreu".
Comparei a `string_agg(rolname ORDER BY rolname)` inteira: **idêntica em 10/10**.

**Regressão dos outros gatilhos de sweep** (a C3 mexeu no fixture que todos importam):

| arquivo | ec | denominador |
|---|---|---|
| `auth-identity-backfill-db` | 0 | `# tests 6 · # pass 6` |
| `auth-identity-link-events-db` | 0 | `# tests 5 · # pass 5` |
| `auth-identity-role-real-db` | 0 | `# tests 10 · # pass 10` |
| `auth-login-candidates-fn-db` | 0 | `# tests 11 · # pass 11` |
| `db-catalog-write-guard` | 0 | `# tests 5 · # pass 5` |

**§4-INV (invariante do ciclo 5), N = 3:** a lista-6 do §V.3 —
`audit-security` · `auth-identity-backfill-db` · `auth-identity-links-db` · `rls-tenant-isolation` ·
`vehicle-identity-schema` · `impound-process-checklist-link-schema` — sai
**`# tests 37 · # pass 37 · # fail 0 · # skipped 0`, ec=0, em 3/3**. O par `(6, 37)` que o D29 do
ciclo 5 vai consumir **não se moveu**, apesar de a C3 e a C4 tocarem dois membros da lista.

---

## §5 — O QUE ESTAS PROVAS **NÃO** COBREM (as duas correções)

1. **A C3 NÃO impede a órfã de nascer, e a C4 só fecha UMA das três portas de gênese.** Morte de
   processo (SIGKILL/SIGINT) continua matando o `finally` inteiro — nenhum código roda. O que a C3
   garante é o **recolhimento em ≤60 min** pela próxima passada de qualquer gatilho (agora 6: os 5
   do §2.5 do plano + o criador). O que a C4 fecha é a terceira porta, a **falha do `DROP OWNED`
   levando o `DROP ROLE` junto** — a única das três que roda com o processo vivo.
2. **A prova do sweep usa órfã RETRODATADA por SQL, não relógio.** Esperar 60 min reais não
   acrescentaria poder: o corte é comparação de timestamp, e ela está exercitada **nos dois
   sentidos** (velha recolhida, nova preservada, 8/8). Mas fica dito: nenhuma órfã envelheceu de
   verdade nesta medição.
3. **O vermelho-controle da C4 usa falha INJETADA, não concorrência real.** A classe é transitória
   por natureza e a injeção a modela fielmente (é a mesma do drill D39 do arnês) — mas não medi
   `pg_authid` sob contenção real de N processos. Argumento, não medição, quanto à frequência.
4. **Falha PERMANENTE do `DROP OWNED` (ex.: `2BP01` por objeto dependente) não foi exercitada por
   mim.** Nesse caso o helper falha **alto** (lança, por desenho fail-closed) e a role sobrevive —
   comportamento correto e diferente do medido aqui. A injeção de falha do
   `db-catalog-write-guard.test.ts` l.380-441 cobre o caminho na suíte permanente; eu não a repeti.
5. **Suíte completa (`npm test`) NÃO foi executada** — é o §6.6 da bateria do bloco e exige a
   trilha inteira; **não é deste mandato** (C3 e C4). Rodei os **5 gatilhos de sweep**, os **6
   arquivos da lista-6** e o guard. O `backend_tests` de execução real do KPI (§3-C6.2) sai de lá,
   não daqui.
6. **`npm run lint` não é uma segunda ferramenta**: no `package.json` deste repo ele cai no mesmo
   `tsc --noEmit` do `check`. Rodei o `check` (ec=0); dizer "lint verde" seria vender dois quando há
   um. (Mesma observação que a C1 registrou.)
7. **Uma máquina, um cluster, rodadas SEQUENCIAIS.** Windows 11, Node v20.19.5, `postgres:16` em
   container próprio. Nada aqui mede o comportamento sob o paralelismo entre arquivos da suíte
   inteira, que é o arranjo em que o fenômeno original apareceu.
8. **As 68 órfãs da base viva seguem INTOCADAS e não contadas.** `erp-postgres` não recebeu nenhum
   comando, nem de leitura (§5.2). A recontagem é da junta dona de
   `P-ARNES-RLS-TEST-FORA-DO-SWEEP`, que continua **ABERTA**.
9. **Registro (§3-C5) e KPI (§3-C6) NÃO foram tocados** — não são deste mandato. O bloco segue
   incompleto sem eles.

---

## §6 — Escopo, terreno de saída e estado

**Escopo — conferido por execução:** ver o §7 do diário irmão (`dev-c3-sweep.md`), que transcreve o
`git status`/`git diff --name-only`/`git diff --check` do par C3+C4 (as duas correções compartilham
`tests/rls-tenant-isolation.test.ts` e foram medidas na mesma sessão).

**ESTADO: correção C4 CONCLUÍDA e PROVADA no N exigido.** Vermelho-controle **10/10 sobreviveu**
(forma crua, 460 grants cada) contra **0/10** (helper resiliente, `attempts=2`, falhas reportadas
com o marcador em 10/10); vaza-metro **Δ=0 em 10/10** com lista ordenada idêntica e controle de
aparição em 10/10. **Não commitei** (mandato).
