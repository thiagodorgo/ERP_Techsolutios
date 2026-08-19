# PLANO DE CORREÇÃO — B-O6R-01 · ciclo 3 · v1

**Papel:** planejador (Fable — `D-PLANEJADOR-MODELO-FABLE`). Não achou os defeitos, não implementa, não julga.
**Entrada:** [`R-B-O6R-01-ciclo3-premissa.md`](../reprovacoes/R-B-O6R-01-ciclo3-premissa.md) · [`J-O6R-B01-ciclo2.md`](../juntas/J-O6R-B01-ciclo2.md) · `docs/omega-pd.md → PD-O6R-B01-ISOLAMENTO`.
**Escopo:** reduzido por decisão do orquestrador — só o que **o bloco introduziu**.

**Não reabre** o que a junta ratificou 5×0 (lock `20268801`, sweep 60 min, `maxWait`/`timeout` 30s, 404, 88/88,
desvio M≥2N) nem o que a pesquisa fechou (só cluster/contêiner por worker isola catálogo; o advisory lock é
*workaround* que falha por quem não o toma). **Por isso este plano não promete isolamento de catálogo por
lock — promete um ratchet que fica vermelho, mais a transferência registrada do problema de arranjo.**

---

## C1 · O backfill ganha escopo — a escolha do P2, com a perda declarada

**P2 dá duas opções. Escolho a segunda: a prova troca o statement pelo escopado.**

Por que a primeira (exclusividade de lote) não fecha: só seria garantível na forma `backend-postgres`. O job
`backend` roda os 246 arquivos num `node --test` só, e o local idem — **um arquivo não tem como exigir
solidão** sem mexer no arranjo das três formas, que **saiu do bloco**. Escolher exclusividade seria puxar de
volta o que o orquestrador tirou. E mesmo sozinho, o verbatim liga **usuários do seed** — que nascem sem
vínculo *por desenho* — apensando eventos irreversíveis: exatamente o que **P6** proíbe.

**O que se perde, sem maquiagem:** a suíte deixa de executar o SQL **byte-idêntico** da migração. Essa prova
volta para onde sempre foi legítima — o `prisma migrate deploy` da CI, que roda o verbatim numa base
recém-criada onde ele é **estruturalmente o único escritor** (exclusividade de graça), com o output anexado.
A suíte continua provando, sobre a sentença escopada: por-usuário (jamais por e-mail), idempotência do
`NOT EXISTS`, evento na mesma cadeia, e a ponta silenciosa sob role efêmera.

**Mecanismo:** `scopeBackfillSql(verbatim, tenantIds)` injeta **uma** cláusula por âncora textual exata no
`WHERE` do CTE `missing`. **Fail-closed dos dois lados:** âncora ausente → `assert` reprova (o teste **nunca**
degrada para rodar sem escopo em silêncio); e asserção de **ida-e-volta** — removida a cláusula, o texto volta
byte-idêntico ao verbatim.

**Tripwire (a prova que fica vermelha):** cria um tenant+usuário "terceiro simulado" **fora** da lista de
escopo e afirma, após o backfill, que ele **continua sem vínculo e sem evento**. Determinístico — dispensa
concorrência e dispensa vermelho ocasional.

**Alternativa recusada com motivo:** verbatim dentro de transação com rollback — os INSERTs com FK seguram
locks de chave sobre linhas de terceiros durante a transação: **modo de falha novo para consertar um antigo**.

**Drill A:** passar o verbatim (bypass do escopo) → o tripwire **tem** de ficar vermelho.

## C2 · O quinto escritor entra no lock, e a enumeração para de mentir

A sequência de catálogo do subteste *"dois lados do DONO"* sai da suíte e vira `createCloneOwnerProbe` **no
arnês**, inteira dentro de `withRoleCatalogLock`. O arquivo de teste fica com **zero** palavra-chave de
catálogo — condição que o guard do C3 explora. Teardown no mesmo lock. Nome ganha sufixo aleatório.

**O comentário do arnês é corrigido** (correção vinculante nº 4 da junta): a frase *"quatro suítes escrevem
catálogo"* vira a enumeração real — quem toma o lock, quem **não** toma e é anterior ao bloco (com ponteiro
para `P-O6R-ARNES-ISOLAMENTO`), e o ponteiro para o guard como detector de escritor novo.

**Prova dinâmica:** conexão auxiliar toma o lock; o helper dispara em paralelo; o teste afirma **waiter em
`pg_locks`** (`granted = false`) e conclusão só após o release. Rotulada com honestidade: a introspecção é
determinística, o tempo não — o valor probatório real está no drill.

**Sobre o `XX000`:** a afirmação *"morreu"* **não entra em artefato nenhum**. Entra o resultado do protocolo
do §6, com N e forma. A lição do ciclo 2 vale ao contrário também: **evidência só do tamanho do que foi medido.**

**Drill C:** remover o lock do helper → a prova de fila **tem** de ficar vermelha.

## C3 · P3 — um ratchet que fica vermelho, com o alcance declarado

Hoje **nada** fica vermelho quando uma suíte nova escreve catálogo fora do lock. Isolamento real é o bloco
irmão. O que cabe aqui, sem fingir mais do que entrega: **detector estático com trava de contagem**
(`tests/db-catalog-write-guard.test.ts`).

Varre `tests/**` por escrita em **catálogo de cluster** (`CREATE/DROP/ALTER ROLE`, `GRANT`, `REVOKE`,
`OWNER TO`) — **não** inclui DDL de esquema: essa classe é o **P4**, que saiu do bloco, e o guard não pode
anexá-la de volta. Allowlist **congelada por arquivo e por contagem**, uma linha de motivo por entrada,
baseline **[medir na implementação]**. Arquivo fora da lista com o padrão → vermelho. Contagem diferente da
congelada → vermelho.

**Residual declarado:** o guard é **lexical** — SQL de catálogo montado por concatenação escapa. *Se* isso
acontecer, a classe só fecha com o isolamento por arranjo do bloco irmão; *se não*, o ratchet cumpre: nenhum
escritor novo entra despercebido. **P3 pede mecanismo em vez de convenção — isto é mecanismo (a CI fica
vermelha sem depender da memória de autor nenhum), com alcance declarado.**

**Drill B:** (i) `CREATE ROLE` em arquivo fora da lista → vermelho; (ii) um `GRANT` a mais em arquivo
congelado → vermelho.

## C4 · O varredor cobre as duas famílias que o bloco cria

`sweepOrphanEphemeralRoles` passa a cobrir `o6r_b01_` **e** `o6r_clone_owner_` (grupo opcional casa as **5
órfãs legadas sem sufixo**). Escopo continua **exclusivamente o namespace do próprio arnês** + idade — os
prefixos alheios (68 `rls_test_` com LOGIN) **não são tocados**: são do bloco irmão, e varrê-los daqui seria o
improviso que a decisão de escopo proíbe. **P5** é atendido pelo desenho por idade: role deixada por `SIGKILL`
é recolhida pela próxima execução.

**Drill D:** reverter a regex para só `o6r_b01_` → o teste da órfã sintética **tem** de ficar vermelho.

## C5 · As 231 órfãs — parar de produzir (medido); limpar, só com junta

Parar de produzir é consequência do C1, e é **afirmado apenas pela medição** (delta = 0), nunca por frase.

**As 231 existentes ficam.** Alcançá-las exige contornar o append-only — a quebra de garantia que o próprio
bloco declara. Isso é **decisão de junta com privilégio**, não linha de plano → pendência
`P-O6R-B01-TRILHA-ORFA-LIMPEZA`, com a contagem medida e a nota de que a CI não é afetada (banco nasce limpo).

**Canal residual nomeado, com as duas pontas:** existe um **segundo** produtor de `event='backfill'` —
`normalizePairIdentity` (`identity-resolver.ts`), chamado no login e nas rotas de identidade. *Se* o contador
der delta 0, o canal dominante era o backfill e está fechado; *se* der > 0, as linhas novas são atribuídas e o
canal — sendo suíte irmã que não conhece a trilha — é **inseparável do arranjo** e vai para o bloco irmão
**com a evidência**, sem conserto improvisado.

## C6 · A frase falsa do v6 vira errata apensada (P9)

Errata ao fim do plano v6, **zero linhas removidas**: cita a linha 277 verbatim, declara que ao pé da letra é
falsa (o próprio §7 exige role efêmera `NOSUPERUSER`, que só existe mudando catálogo), e registra que **foi
essa frase que o desenvolvedor do ciclo 2 tinha diante de si ao escrever "quatro escritores"** — a cadeia
causal que a junta expôs. A frase substituta enuncia só o que C2+C3 **produzem**.

---

## §6 · A prova — N e forma declarados (P8)

O ciclo 2 morreu por *"verde onde ninguém mediu"*.

| Protocolo | N | Forma |
|---|---:|---|
| **F1** — a forma do veto | **12** | `db:seed` **a cada iteração** + o passo do job na forma exata (bloco `env:` completo, `pipefail`, lista `SUITES`, exit de `PIPESTATUS[0]`) |
| **F2** — a forma que ninguém mediu | **3** | suíte inteira (246 arquivos), `memory`, **sem** seed — *smoke da segunda forma*, não prova de paridade |
| **F3** — a CI de verdade | **3** | re-execuções do job no próprio PR, links anexados |

**Critérios de F1:** 12/12 exit 0 · denominador **idêntico nas 12 e igual ao declarado no PR** · `grep` de
`XX000|23503|23505|40P01` = **0 ocorrências** nos 12 taps.

**F4 — as provas determinísticas, que dispensam vermelho:**
- sonda somente-leitura sobre o SELECT **escopado**: exigência **0 instantes** com linha de terceiro (contra
  os 38,9% medidos no arranjo vetado);
- contador de órfãs antes/depois das 12: **delta = 0** (231 → 231). Delta > 0 dispara o condicional do C5.

**Registro de ambiente:** `os.availableParallelism()` e o teto efetivo gravados no relatório — **declarado,
não consertado** (fixá-lo é P1, fora do bloco). Nenhum número viaja sem a forma que o produziu.

---

## §8 · Fecha · não fecha

**Fecha:** os 5 achados do escopo · **P3** (ratchet) · **P8** (N e forma) · **P6** para frente · **P9** ·
as correções vinculantes 1–4 da junta.

**Não fecha, com motivo:** as **231 linhas existentes** (contorna o append-only → junta) · **P1**, **P4**,
**P7**, os **cinco prefixos legados** e a pergunta de arranjo (→ `P-O6R-ARNES-ISOLAMENTO`) · o **residual
lexical** do guard · o canal `normalizePairIdentity` (condicional) · `sendRouteError` (pendência do ciclo 2).

**Inseparabilidade, respondida:** nenhum dos 5 achados exige puxar de volta o que saiu. O único ponto de
contato é o condicional do C5 — e a resposta dele é **medição + transferência**, não anexação.

## §9 · Para a junta

**A ratificar:** a escolha escopada do P2 **com a perda declarada** · o desvio M≥2N reafirmado · o desenho do
ratchet (alcance lexical + allowlist congelada) · a pendência das 231 como destino.

**Ataques convidados** — à `inspetor-de-arnes-concorrente`: o protocolo F1 reproduz a forma da cadeira? a
sonda F4 sobre o SELECT escopado? o condicional do seed? À `guardiao-fail-closed`: existe caminho em que o
teste roda **sem escopo e sem reprovar**? o tripwire é guarda de regressão de verdade? a errata do v6 enuncia
só o que C2+C3 produzem?
