# J-O6R-B05 — plano do bloco `fix/production-runtime-gates` (Ω6R-DAT-001 + Ω6R-DIN-006)

- **Data:** 2026-08-14
- **Objeto:** o plano do **B-O6R-05**, primeiro bloco vinculante após o merge do CHK P1 PR-04c-A
  (`J-CHK-04C-EMENDA`, §4 item 2).
- **Composição (5):** duas lentes de ataque independentes (`medições+gate`, `bateria+escopo`) e três cadeiras
  votantes — `agente-secops`, `agente-ci-doutor`, `agente-dba-guardiao`.
- **Resultado: APROVADO COM CORREÇÕES OBRIGATÓRIAS — 5×0.** Nenhum parecer REPROVADO. Os vetos exercidos
  **condicionam o merge**; nenhum derruba o plano.
- **Nota de contrato:** `D-PLANEJADOR-MODELO-FABLE` fixa o `planejador-mestre` em Fable. A cota do Fable 5
  esgotou na sessão e o plano foi escrito em **Opus 5**. Este é um **plano novo**, não a revalidação de código
  corrigido do §C7.4 (onde o Fable é obrigatório, não padrão); a própria decisão prevê a exceção por
  indisponibilidade do modelo, "que vira nota no registro da junta" — é esta nota.

---

## 1. A espinha factual do plano foi reproduzida, do zero, por TRÊS agentes: confere 5/5

O plano afirmava ter **medido** (não deduzido) o comportamento do validador de ambiente contra os manifestos.
Três agentes escreveram probes próprias e chegaram ao mesmo resultado, incluindo os dois achados que mudam o
enquadramento do `Ω6R-DAT-001`:

- o `docker-compose.prod.yml` **não sobe hoje** — o serviço da API sai com erro antes de escutar a porta, porque
  a estrofe de ambiente é anterior aos gates do portal e não traz nenhum `PORTAL_*`;
- um ambiente de produção **completo e válido** que apenas **omita** a variável de persistência **passa** na
  validação e cai em memória — e como o `Dockerfile` marca produção no estágio de runtime, **toda** execução da
  imagem oficial é "produção".

Uma lente foi conferir a proveniência e achou as probes do próprio planejador no scratchpad, carimbadas no mesmo
dia: **a leitura é fresca, não snapshot velho**. Isso importa porque um plano desta rodada já foi reprovado por
apresentar memória como leitura fresca.

**Correção de registro (§A2) — o `agente-dba-guardiao` retirou parte da própria contestação.** Na junta anterior
(`J-CHK-04C-EMENDA`) essa cadeira registrou que "DAT-001 não se sustenta como escrito". Aqui ela confirma o
mecanismo medido e **retira a parte da contestação que atingiria a substância** do achado. A severidade P0
permanece — reclassificar exige junta própria (`J-CHK-04C-EMENDA` §7).

## 2. As decisões (Q1–Q7)

| # | Pergunta | Decisão | Observação |
|---|---|---|---|
| **Q1** | endpoint de saúde do worker público, ou atrás de segredo? | **PÚBLICO E MÍNIMO**, corpo reduzido | Unânime. O `agente-secops` **veta** qualquer variante com segredo compartilhado: o smoke de produção roda sem credencial de propósito, e o cron de uptime não tem secret nenhum. |
| **Q2** | heartbeat vencido derruba o readiness? | **NÃO** | Confirmado o fato que sustenta: com uma única máquina fixa, 503 no readiness converteria falha de jobs em queda total da API. Condicionado às provas de corpo do V2 do `agente-ci-doutor`. |
| **Q3** | o processo worker dedicado fica no B-O6R-08? | **SIM**, condicionado | Ver a correção C4: enquanto o processo não existe, a flag que declara "outro roda o worker" é satisfazível só no nome. |
| **Q4** | heartbeat em Redis com TTL, ou tabela durável? | **REDIS COM TTL** | Cadeira do `agente-dba-guardiao`. Ela vota com o plano **mas substitui a justificativa**, que estava factualmente errada. |
| **Q6** | o smoke de contêiner entra na CI? | **ENTRA NA CI** — *a junta contrariou o planejador* | O plano recomendava manual + roteirizado, admitindo honestamente que seria "cobertura menor do que 'smoke persistente' sugere". A junta achou o caminho barato: **usar o job `docker` que já existe**, em vez de criar um novo. |
| **Q7** | entregar a válvula de escape da persistência? | **NÃO** | Sustentado por varredura própria: não existe caminho legítimo de produção sem banco neste repo. |

**Q5 não foi pautada.** Subir a máquina do staging de zero para uma fixa **custa dinheiro do dono** — decisão
dele, não da junta. Fica a limitação registrada: com a máquina dormindo, o worker não roda em staging.

## 3. Os vetos exercidos (condicionam o merge)

**`agente-secops` — 4 condições**
1. Duas das variáveis de portal **não entram com VALOR** em manifesto versionado de provedor.
2. O guard anti-segredo é por **allowlist de chaves**, não por heurística de "cara de segredo".
3. No caso em que o worker roda no próprio processo, o endpoint responde do estado **do próprio processo**, não
   do Redis; e a chave é namespaceada.
4. A probe do cron lê o **corpo**, e a URL do worker é variável — nunca segredo, nunca impressa.

**`agente-ci-doutor` — 3 condições** (a cadeira que já exercera veto na trilha: *bloco de correção não fecha com
verde que não exercite o defeito*)
1. O teste de restart **não roda onde o plano pensa** e quebra onde ele não previu.
2. Toda probe nova assere o **corpo**, nunca só o status.
3. O guard de paridade **pode passar vazio**, e as sentinelas escolhidas não impedem isso.

**`agente-dba-guardiao` — 5 correções obrigatórias**, entre elas um **defeito verificado** no teardown do teste
de restart: como está escrito, ele é insuficiente e produziria teste vermelho — do lado errado do veto acima.

## 4. As correções de substância que o plano v2 tem de absorver

- **C1 — o buraco do Redis.** A variável do Redis tem valor padrão apontando para `localhost`, e **nada** a
  blinda em produção: um ambiente que a omita passa, e a fila de jobs **e o próprio heartbeat novo** apontariam
  para a máquina local. O gate blinda o banco e deixa o Redis aberto — assimetria injustificável num bloco cujo
  segundo P0 é "o worker nunca sobe". Entra uma cláusula simétrica, com precedente literal já no arquivo.
- **C2 — "crash-loop" é falso.** O serviço não tem política de reinício declarada, então ele **sai com erro uma
  vez e fica parado**; não há laço. A frase vai colada no PR como evidência de campo e precisa estar certa.
- **C3 — a tabela de fixtures que quebram é vendida como exaustiva e não é:** são 4 arquivos, mas **5 testes** —
  falta um caso de provedor self-host. E há uma **quase-vítima** não listada: um teste que gera processo filho
  com exatamente a combinação que os gates novos passam a proibir, e que sobrevive apenas porque a CI não roda
  como produção. Ela está sob o guard de zero pulos: é a primeira a cair se alguém setar produção naquele job.
- **C4 — a flag "outro processo roda o worker" é um escape hatch sem prova.** O plano recusa a válvula da
  persistência exigindo cinco itens de contenção, e introduz esta com **zero prova no boot** — sendo que **não
  existe processo worker dedicado neste repo hoje**. Ou a exigência de worker vira incondicional (e a flag entra
  no B-O6R-08, junto do processo), ou ela recebe a mesma disciplina de cinco itens.
- **C5 — honestidade de alcance, antes que vire overclaim no PR.** A variável de persistência governa **apenas o
  agregado core-saas**; dezenas de arquivos falam com o banco direto. "Memória" perde organizações, usuários,
  vínculos e auditoria — que é exatamente o que o achado descreve — e **não** "o sistema inteiro não persiste".
- **C6 — a frase "removi a probe em seguida" é falsa.** As probes ficaram no scratchpad. Nenhum rail foi
  quebrado (nunca entraram no repo), mas o plano afirma um fato que não ocorreu, e esta rodada reprova
  exatamente essa classe.

## 5. O que esta junta NÃO decidiu

- **Não liberou deploy.** O bloqueio de deploy produtivo da J-6R segue **integral**; este bloco torna o deploy
  *possível de ser correto quando for autorizado*, e não o autoriza.
- **Não reclassificou `Ω6R-DAT-001`.** A contestação parcial foi retirada; a severidade P0 continua.
- **Não deliberou os rascunhos `Ω6R D-001..D-004`** — pauta do dono.
- **Não decidiu Q5** (custo de máquina em staging) — decisão do dono.

## 6. Condição de entrada

O B-O6R-05 só começa **depois do merge do PR-04c-A** (`J-CHK-04C-EMENDA` §4 item 2), e o plano v2 — com C1..C6 e
os vetos absorvidos — é pré-condição para a primeira linha de código do bloco.
