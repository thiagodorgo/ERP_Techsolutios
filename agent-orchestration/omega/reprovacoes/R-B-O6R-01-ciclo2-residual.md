# R-B-O6R-01 · ciclo 2 — achado RESIDUAL, para a junta julgar

> **Relatório de ACHADOR** (`D-JUNTA-SEPARACAO-DE-PAPEIS`). Descreve o defeito, a evidência executada e o
> motivo. **Não propõe correção.**
>
> **Achado por:** o desenvolvedor da fatia 3, que o encontrou **fora do próprio escopo** e **não o consertou** —
> a superfície é da fatia 2 e ele não é o achador dela. É o comportamento que a regra pede.
> **Confirmado por:** orquestrador, com medição própria.

## R-1 · existe um QUINTO escritor de catálogo, e ele escreve fora do lock

**Evidência executada:**

```
$ grep -c "withRoleCatalogLock" <arquivos que escrevem catálogo>
tests/auth-login-candidates-fn-db.test.ts:0     <-- escreve catálogo, NÃO toma o lock
tests/helpers/auth-identity-fixture.ts:3
tests/rls-tenant-isolation.test.ts:3
tests/auth-identity-link-events-db.test.ts:3
```

`tests/auth-login-candidates-fn-db.test.ts` executa `CREATE ROLE` (`:187`), `GRANT SELECT` (`:190`) e
`ALTER FUNCTION … OWNER TO` (`:210`) — três escritas de catálogo — **fora** da fila do
`pg_advisory_xact_lock` que a fatia 2 instituiu.

**Sintoma observado:** um deadlock `40P01` num agrupamento ad-hoc de 9 arquivos em paralelo, montado pelo
desenvolvedor da fatia 3 para medir a bateria focada.

**Ressalva honesta do próprio achador:** é uma forma que **nem a CI nem o `npm test` usam**. Na forma do job,
o batch está verde **19 vezes** (16 na fatia 2 + 3 na verificação independente do orquestrador).

## Por que é defeito mesmo com o batch verde — e é a SÉTIMA instância da classe

O comentário que documenta o lock (`tests/helpers/auth-identity-fixture.ts:30-39`) afirma:

> *"…e **quatro** suítes do batch -db escrevem catálogo ao mesmo tempo…"*
>
> *"Timeout da transação EXPLÍCITO: com os **quatro** escritores enfileirando no lock…"*

**São cinco, e o quinto não enfileira.** O artefato afirma uma enumeração que a execução não produz — a mesma
classe que este bloco passou dois ciclos combatendo, agora **dentro da correção da instabilidade**.

O dano não é o verde de hoje. É que a próxima pessoa lê *"os quatro escritores enfileiram"*, conclui que a
fila cobre o batch inteiro, e projeta em cima disso. **Foi assim que o `A-1` nasceu.**

## O que a junta precisa decidir

1. **Bloqueia o merge?** O batch está verde 19×, mas a enumeração do mecanismo está errada por escrito.
2. **Se não bloqueia:** o comentário é corrigido agora (custo: uma frase) ou vira pendência registrada?
3. **Se bloqueia:** o quinto escritor entra no lock — e a cadeira diz se *quatro-no-lock-mais-um-fora* é
   residual aceitável ou é o `A-1` esperando outra forma de execução.

**A cadeira criada para exatamente esta pergunta é a `inspetor-de-arnes-concorrente`** (§C7.4, ciclo 1), cujo
veto declarado inclui *"denominador variável — alta gravidade **mesmo com `fail 0`**"*.
