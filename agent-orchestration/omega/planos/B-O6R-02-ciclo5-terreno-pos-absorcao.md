# B-O6R-02 ciclo 5 — terreno pós-absorção

> Medição executada no head real depois do merge S0-zero. Este arquivo abre uma série própria; não herda números de outro head como se fossem comparáveis.

## 1. Identidade do terreno

- head completo: `84bb90b6e3520cbc6d8c9f84057cae506751d853`
- head curto: `84bb90b`
- `origin/main`: `f895dd25f0d8cd5fb6b7c18373245e43f968fcd9`
- pais do merge: `12c382510e61a0048393695fd371618dee8e49db` e `f895dd25f0d8cd5fb6b7c18373245e43f968fcd9`
- Node: `v20.19.5`
- migrations: `103` em `origin/main`, `105` em `12c3825` e `105` no head pós-absorção. As duas adicionais são `20260869000000_add_financial_invariants` e `20260870000000_add_reversal_pair_atomicity`.

## 2. Âncoras re-medidas

Comando executado no head real, não na árvore simulada:

| âncora | blob pós-absorção | resultado |
|---|---:|---|
| `src/modules/financial-entries/financial-entry-undo-owners.ts` | `e352c6c` | esperado; sobreviveu da branch |
| `src/modules/financial-entries/financial-entry.service.ts` | `9be7caf` | esperado; sobreviveu da branch |
| `tests/helpers/auth-identity-fixture.ts` | `b12b25f` | esperado; veio da main |
| `tests/audit-security.test.ts` | `0a4f812` | esperado; veio da main |
| `scripts/run-backend-tests.mjs` | `335f6a1` | esperado; resolução main-integral confirmada |

Todas as cinco âncoras coincidem com a régua pós-absorção do §7.2(2).

## 3. Bateria barata D29 — lista-6

Forma executada:

- lista exata: `tests/audit-security.test.ts`; `tests/auth-identity-backfill-db.test.ts`; `tests/auth-identity-links-db.test.ts`; `tests/rls-tenant-isolation.test.ts`; `tests/vehicle-identity-schema.test.ts`; `tests/impound-process-checklist-link-schema.test.ts`;
- comando: `node scripts/run-backend-tests.mjs <lista-6>`;
- `CORE_SAAS_PERSISTENCE` não exportada;
- `DATABASE_URL` e `REDIS_URL` apontando exclusivamente para o cluster descartável próprio `codex-o6r-c5-d29-*-48991c575f76`, portas efêmeras `32769` e `32770`;
- PostgreSQL 16 recém-migrado, `105` migrations; Redis 7 saudável; Node `v20.19.5`;
- 13 rodadas sequenciais.

Resultado: **13/13 verdes**, em todas `6 arquivos · 37 testes · pass 37 · fail 0 · skipped 0 · XX000 0`. Forma e denominador constantes nas treze execuções.

## 4. Comparabilidade

O vermelho-controle histórico do D29 — `5/13` medido em `12c3825` e `7/13` registrado em `pendencias.md` — vale como referência de **espécie**: a classe existia, foi reproduzida e tinha produtor nomeado. Ele não é comparável por **forma** com o número novo: os heads diferem, a referência histórica cruza `103 × 105` migrations e o mecanismo único do PR #359 está entre as séries.

Assim, o resultado `13/13` deste arquivo **abre uma série própria** no head `84bb90b`; não é continuação aritmética nem alegação de progresso “contra 5/13”.

## 5. Critérios re-baseados

`git diff --name-only 12c3825 HEAD -- src/` produziu exatamente:

```text
src/modules/authority/authority-password.ts
```

É a correção C1 do SAN2-4b já publicada na main; não pertence ao produto financeiro. Portanto:

- o §9.9 passa a comparar `src/**` com o head pós-absorção `84bb90b6e3520cbc6d8c9f84057cae506751d853`;
- a conferência de âncoras usa a tabela re-medida deste arquivo, não a tabela do §0 do plano.

## 6. Descartes conscientes da resolução S0-zero

A política main-integral descartou conscientemente crônica ainda não publicada da branch, a ser reescrita em A4/A6 com resultados deste ciclo:

- `agent-orchestration/docs/status-geral.md`: 60 das 80 linhas da branch não estavam na main;
- `Kpis/kpis-history.json`: 16 das 45 linhas da branch não estavam na main;
- `Kpis/kpis-latest.json` da main tem 0 ocorrências de `Ω6R-DIN-010` e 0 de `Ω6R-DIN-011`, enquanto o blob de `12c3825` contém ambos. A6 deve reintroduzi-los com o status sustentado pela execução deste ciclo, nunca com o antigo `aguardando_merge`.

Esses descartes são deliberados: a linha publicada prevaleceu na absorção, e a crônica do bloco será recomposta depois com o head e as medições atuais.

## 7. E3.3 emendado pelo ruling do CP-1 — o `ci.yml` do S0-zero é a resolução FINAL

> Escrito por determinação do pronunciamento do CP-3 (diário, terceiro registro, item 4). O inspetor
> e o `jurado-c5-validador-diff-plano` julgam o `ci.yml` **contra esta seção e o ruling do CP-1**
> (diário, segundo registro + adendo), não contra a letra do apenso E3.3(c).

O apenso E3.3 foi escrito para o mundo pré-CP-1, em que a resolução main-integral dos 9 conflitos
era tida como segura e o único delta necessário no `ci.yml` seria **uma** linha (a 7ª suíte). O
CP-1 mediu o que essa premissa escondia: **6 linhas `SUITES=` vivas do lado-branch** (as suítes dos
ciclos 1–4, que só existem na branch) seriam descartadas — os arquivos entrariam na main **roteados
em lugar nenhum**, auto-pulando verdes no job `backend`. É exatamente a inversão de risco que o
próprio E3.2 usa como fundamento. O ruling do CP-1 (§A) converteu o arquivo para **união dirigida**,
executada no commit de merge `84bb90b`:

| cláusula E3.3 | o que passou a valer (ruling CP-1) | evidência |
|---|---|---|
| (a) UMA linha | **7 linhas** `SUITES=` (as 6 do lado-branch, verbatim com seus comentários, + a 7ª) | diff `origin/main..HEAD -- .github/workflows/ci.yml` confinado à região; contagem `SUITES=` 27 → 34 |
| (b) comentário ATUALIZADO, nunca apagado | substituído por comentário de fechamento de 1 linha ("Fecha o LUGAR RESERVADO da main e P-O6R-B02-SUITES-LIST-CI, cujo dono é este PR") — o rastro completo vive no histórico git e no fechamento da pendência (F6) | l.240 do `ci.yml` em `84bb90b` (medida no worktree, `grep -n`) |
| (c) diff = 1 linha + comentário | diff = 7 linhas + comentários + fechamento, **e nada mais** — nenhum outro job/passo/env mudou | mesmo diff acima |
| (d) mesma PR que traz a suíte | mantida e ampliada: as 7 suítes entram todas neste PR | `git cat-file -e HEAD:<suíte>` ec=0 nas 7 |

Sustentação por execução (P4 do diário): 3 execuções das 7 suítes no cluster descartável nas
condições do job `backend-postgres` — `52/52/0 pulos/0 XX000`, denominador constante.

**Consequências vinculantes:** a autorização de `ci.yml` do §5.1-bis está **CONSUMIDA** — F6 não
toca mais o arquivo, e o critério §10.3(iv) da bateria passa a esperar
`git diff 84bb90b HEAD -- .github/workflows/ci.yml` **VAZIO**. `P-O6R-B02-SUITES-LIST-CI` fecha
neste PR (critério E3.3: linha mergeada + suíte exercida sem pulo; prova final = job
`backend-postgres` verde no CI do PR).
