# R-B-O6R-01 — CI vermelha no PR #357 · relatório de ACHADOR

> **Papéis (`D-JUNTA-SEPARACAO-DE-PAPEIS`):** achado pelo **orquestrador**. Descreve defeito, evidência
> executada e motivo. **Não propõe correção** — outro agente planeja e implementa.

**PR:** #357 · **branch:** `feat/o6r-b01-identity-authority` · **CI run:** 32233576702

| Job | Veredito |
|---|---|
| `backend-postgres` | **pass** — é o job que o veto do ciclo 2 derrubava |
| `frontend` · `owner-portal` · `authority-portal` | pass |
| **`backend`** | **FAIL — 2585 testes, 2581 pass, fail 2** |
| **`flutter`** | **FAIL** — exit 1, causa ainda não isolada |

---

## CI-1 · a suíte que prova o SEC-001 no caminho Prisma roda contra o adaptador de MEMÓRIA

**Testes vermelhos** (ambos em `tests/core-saas-role-authority-db.test.ts`, criada **por este bloco**):

```
not ok 3   - controle POSITIVO: POST /users com manager → 201 (o 403 vem da allowlist, não do encanamento)
             400 !== 201        (core-saas-role-authority-db.test.ts:182)
not ok 549 - SEC-001 no caminho prisma: escalada de papel → 403 e banco intacto
```

### Mecanismo, medido

A suíte decide pular **só por `DATABASE_URL`** (`:30`, `:33-34`). O job `backend` do `ci.yml`:

```yaml
env:
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public
  CORE_SAAS_PERSISTENCE: memory
```

Ou seja: **`DATABASE_URL` está presente → a suíte não pula → ela roda com o app em memória.** O `POST /users`
vai para o adaptador de memória enquanto as asserções esperam o caminho Prisma. Daí o `400`.

**A convenção da casa é a oposta, e está escrita no próprio `ci.yml`:** *"os testes do caminho prisma setam
`CORE_SAAS_PERSISTENCE=prisma` eles mesmos em runtime"*. Contagem de `CORE_SAAS_PERSISTENCE = "prisma"` por
suíte:

| Suíte | Define o modo? |
|---|---|
| `checklist-routes-db.test.ts` | **sim** (`:266`) |
| `core-saas-role-authority-db.test.ts` | **NÃO** |

### Por que é a nona instância da classe

O cabeçalho da própria suíte (`:18-21`) **descreve o risco**: *"AUTO-SKIP sem `DATABASE_URL` … e devolveria
memória no job `backend`"*. O artefato **nomeia o modo de falha e não se protege dele** — a mesma família de
*"o artefato afirma um resultado que a execução não produz"*, agora na forma *"o artefato conhece o defeito e
o documenta em vez de fechá-lo"*.

### Por que ninguém pegou antes

- **Localmente:** `npm test` roda em memória **sem** `DATABASE_URL` → a suíte **pula**. Medido: `npm test`
  4× seguidas, `2572/2562`, fail 0, com esta suíte entre os **10 pulos**.
- **Com `DATABASE_URL` exportado localmente:** roda e **passa 5/5** (medido agora), porque aí o `.env` do
  repositório fixa `CORE_SAAS_PERSISTENCE=prisma`.
- **Só o job `backend` reúne as duas condições** — `DATABASE_URL` presente **e** modo memória.

**O `critico-adversarial` da junta do ciclo 3 apontou esta suíte** como a única do bloco que reporta
verde-cego na forma local do revisor. O achado estava certo; a manifestação é pior do que ele descreveu —
não é só verde-cego local, é **vermelho na CI**.

### A propriedade que falta

*"Uma suíte que prova o caminho de persistência real não pode executar contra o adaptador de memória — nem
passando, nem falhando. Ou ela estabelece o modo que precisa, ou ela se recusa a rodar."*

Hoje ela faz nem uma coisa nem outra: pula por uma condição (`DATABASE_URL`) que **não é** a que ela precisa.

---

## CI-2 · `flutter` vermelho, causa não isolada

`##[error]Process completed with exit code 1` sem linha de teste vermelha no log recuperado. **Não afirmo a
causa.** Registro que o desenvolvedor do ciclo 1 havia reportado um teste de telemetria Flutter que falha
**só sob paralelismo** e passa isolado — pode ser o mesmo, pode não ser. **Exige isolamento antes de qualquer
conclusão.**

---

## O que este relatório NÃO conclui

- Não diz **qual linha mudar** — a propriedade acima é o alvo; o mecanismo é de quem planeja.
- Não afirma que o `flutter` é flake. Não foi medido.
- Não reabre nada que a junta do ciclo 3 aprovou **5×0**: o `backend-postgres` — o job que o veto do ciclo 2
  derrubava — **passou**.
