# J-O6R-B01 · junta do ciclo 2 — **REPROVADO POR VETO**

- **Data:** 2026-08-18 · **Objeto:** o código do ciclo 2 do B-O6R-01 (`d1d3a50`), três fatias.
- **Composição (5):** `inspetor-de-arnes-concorrente` e `guardiao-fail-closed` (criadas no ciclo 1, §C7.4) ·
  `critico-adversarial` · `agente-secops` · `agente-dba-guardiao`.
- **Placar:** 4 APROVADO_COM_CORREÇÕES · **1 VETO** → **o bloco não merga.**

## Papéis do ciclo (`D-JUNTA-SEPARACAO-DE-PAPEIS`) — a ata é inválida sem isto

| Papel | Quem | Observação |
|---|---|---|
| **Acharam** (ciclo 1) | 7 lentes adversariais + 23 céticos + orquestrador | nenhum propôs correção |
| **Planejou** | `planejador-mestre` (Fable) | não achou nada; recebeu o relatório, **não** o `decisoes.md` contaminado |
| **Desenvolveram** | três agentes distintos, um por fatia | nenhum é o dev do ciclo 1; nenhum julgou achado |
| **Votaram** | as 5 cadeiras acima | duas delas criadas para os defeitos deste bloco |

O desenvolvedor da fatia 3 achou o R-1 **fora do próprio escopo e não o consertou** — a superfície era da
fatia 2. Comportamento correto, sem ser cobrado.

---

## O VETO — `inspetor-de-arnes-concorrente`

**Medido, não opinado: 4 vermelhas em 12 execuções (33%)** na forma **exata** do job `backend-postgres` —
bloco `env:` do job, `RBAC_DB_PARITY=1`, **`npm run db:seed` prévio**, os 23 arquivos, `pipefail` + `tee`,
exit lido de `PIPESTATUS[0]`. Denominador **constante em 145**.

### Crédito à fatia 2, primeiro

**Zero `XX000` e zero `40P01` nas 12 rodadas da cadeira.** O `pg_advisory_xact_lock` resolve a corrida de
catálogo que foi contratado para resolver, e o modo de falha do ciclo 1 — *"menos testes com total plausível"*
— **foi eliminado**: o denominador não varia mais.

### O que bloqueia é OUTRO objeto compartilhado

`public.users`, a FK `auth_identity_links_tenant_id_user_id_fkey` (**23503**) e o UNIQUE correspondente
(**23505**) — intocados pelo lock.

**Origem única:** `tests/auth-identity-backfill-db.test.ts:88` executa `adminClient.$executeRawUnsafe(backfillSql)`
— a sentença extraída da migração, **sem cláusula de escopo**: escreve para **todo usuário da base sem
vínculo**, enquanto 22 suítes irmãs criam e apagam usuários em paralelo.

Na rodada 06 o `23505` atinge o subteste *"a PONTA SILENCIOSA"* — **uma das provas de identidade da conexão
efêmera** — e o *"Missing expected rejection"* mostra asserção de invariante **invertendo de sinal** sob
contenção.

### A frase que decide a leitura de todas as provas deste PR

> *"Minhas rodadas 01 a 04 são VERDES; a 05 é a primeira vermelha. O KPI declara estabilidade a partir de 3
> execuções, e o §7 do plano exigia 10. **A evidência publicada termina exatamente onde o defeito começa.**"*

### Vaza-metro — o sweep conhece uma família de três

Antes/depois de 11 rodadas: `o6r_b01_%` 0→**1** · `o6r_clone_owner_%` 3→**4** · `rls_test_%` 67→**68**. Duas
das novas são **LOGIN com escrita em 115 tabelas**. O sweep da fatia 2 **funciona** (as 18 órfãs do ciclo 1
saíram), mas **o batch cria três famílias de role e o varredor conhece uma**.

**Aborto provado matando:** `SIGKILL` aos 5s deixa role `rolcanlogin=t` com 345 privilégios de escrita viva
por até 60 min. Nenhum dos quatro arquivos tem handler de `SIGINT`/`SIGTERM`.

### Sem achado — a identidade da conexão está honesta

As suítes que alegam rodar sob role restrita **provam**: asserção de `rolsuper`/`rolbypassrls` false/false ·
prova diferencial (trilha lê 0 pela efêmera, 1 pela privilegiada) · `42501` sob a efêmera. E
`grep -c createEphemeralRole` no arquivo que a errata agora cita devolve **1** (era **0**, no arquivo errado):
**o B-1 está honesto.**

---

## O R-1 dividiu a junta — e a medição do orquestrador desempatou

| Posição | Cadeiras |
|---|---|
| **R-1 bloqueia** | `critico-adversarial` · `agente-secops` · `agente-dba-guardiao` |
| **R-1 não bloqueia** | `inspetor-de-arnes-concorrente` · `guardiao-fail-closed` |

A especialista concluiu **não bloqueia** com método impecável: 12 execuções sem um único `XX000`, e
amostragem de `pg_locks` a 1 Hz mostrando **máximo de 1 titular do lock, nenhum esperando** — o verde vem de
**separação temporal**, não de serialização.

**O orquestrador provocou a falha que ela não conseguiu.** Quarta execução do mesmo arranjo:

```
not ok 9 - auth_login_candidates: filtros, teto interno, dois lados do dono e sonda
  Raw query failed. Code: `XX000`. Message: `tuple concurrently updated`
  async TestContext.<anonymous> (tests/auth-login-candidates-fn-db.test.ts:228:9)
```

**É exatamente o quinto escritor, o que não toma o lock.** A conclusão da especialista era ausência de
evidência, não evidência de ausência — e a maioria das outras três cadeiras estava certa.

**Duas causas independentes, portanto, produzem o mesmo sintoma:** o backfill sem escopo (23503/23505) e o
quinto escritor fora do lock (`XX000`).

---

## Ratificado por unanimidade (5×0)

- **Os cinco parâmetros:** constante do lock `20268801` (distinta da de provisioning `20260863`) · idade do
  sweep 60 min · `maxWait` 30s + `timeout` 30s · **404** para `:id` malformado · a recomposição de
  `backend_contract_tests_focused` para **88/88 com composição declarada**.
- **O desvio da meta M ≥ 2N:** ratificado. Num ciclo de **correção** sobre bloco que já entregou ~4N, a conta
  cheia seria inflação; vale a cobertura por **prova que fica vermelha** mais os 4 drills.

---

## O que este ciclo ENTREGOU, e que não volta à mesa

Registrado porque o veto é sobre a **prova**, não sobre o desenho, e o próximo ciclo não deve refazer nada disto:

- **`Ω6R-SEC-001` fail-closed por construção** — papel novo sem classificação passa de *"compila e nasce
  atribuível"* para `TS1360`, exit 2. Verificado pelo orquestrador por mutação no arquivo real, com
  restauração provada por `md5`.
- **O guard tautológico morreu.** Ele afirmava uma prova que não produzia — a mesma classe do B-1, em tipo.
- **O caminho Prisma (produção) tem teste que morre.** O drill 4 revelou mais do que o achado previa: sem o
  guard do serviço, o `PATCH` de si mesmo para `super_admin` **retorna 200 e persiste o assignment** —
  escalada completa. Aquele guard é a **única** barreira em produção.
- **A prova do B-1 existe** e está no arquivo certo, sob role efêmera.
- **A corrida de catálogo do A-1 morreu** — zero `XX000` do tipo original nas 12 rodadas da cadeira.
- **Os artefatos pararam de mentir:** migração só-comentário (zero DDL), erratas **apensadas** (zero linhas
  removidas do `decisoes.md`), `API_CONTRACTS` corrigido.

## Correções vinculantes — enunciadas como PROPRIEDADE, nunca como patch

1. **A prova central tem de ser repetível no arranjo em que a CI a executa.** Hoje o batch é vermelho em
   4 de 12; enunciado como propriedade, não como conserto.
2. **Nenhuma suíte do batch paralelo pode escrever fora do próprio escopo.** Ou a escrita se confina às
   linhas que a suíte possui, ou o batch garante que ela está sozinha — **hoje nenhuma das duas é verdade**.
   *(A cadeira deliberadamente não diz qual das duas: a escolha do arranjo é de quem planeja.)*
3. **O varredor de órfãs tem de cobrir os prefixos que o próprio batch cria** — hoje cobre um de três.
4. **O quinto escritor de catálogo** (R-1) — a enumeração do mecanismo tem de bater com a execução, e o
   comentário que diz *"quatro escritores"* está errado por escrito.

## Consequência

**Ciclo 3** (§C7.4): o crítico reabre a premissa, com pesquisa ≥5 fontes, teto de 6 agentes. Os papéis
continuam separados — quem achou não conserta.
