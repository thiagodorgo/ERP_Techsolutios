# J-O6R-B01 — aprovação do plano do bloco `fix/identity-authority` (Ω6R-SEC-001 + Ω6R-TEN-001)

- **Data:** 2026-08-16 · **Objeto:** o **plano** do B-O6R-01, antes da primeira linha de código.
- **Composição final (5):** `critico-adversarial` · `agente-secops` · `agente-dba-guardiao` ·
  especialista em contorno de isolamento de dados · `agente-devops-provisionador` (entrou na rodada 4).
- **Resultado: APROVADO COM CORREÇÕES, 5×0** na 5ª rodada, sobre o **plano v6**. Nenhum veto pendente.
  Todas as correções são **executáveis no comando do bloco**; as cadeiras declararam explicitamente que
  **nenhuma exige sexta rodada**.
- **Pré-condição cumprida:** o porteiro pós-merge do #353 liberou o start **com a condição** de plano
  aprovado por junta antes de qualquer código. É esta a aprovação.

---

## 1. Por que foram cinco rodadas

O bloco fecha os **dois P0 mais graves** da auditoria Ω6R e é pré-requisito dos blocos 02, 03, 04, 07 e 11:

- **SEC-001** — quem administra **uma** organização se promove a papel de plataforma e passa a ler, alterar
  e suspender **todas as outras**. O filtro que parecia proteger bloqueia as *permissões* de plataforma e
  deixa passar o *papel*, que é o vetor real.
- **TEN-001** — a troca de organização correlaciona contas **pelo e-mail** e emite acesso para uma linha de
  usuário diferente da autenticada. Tomada de conta **sem credencial**.

As cinco rodadas não foram desperdício: **cada uma matou uma classe de defeito que teria ido para produção
parecendo consertada**. Em ordem:

| Rodada | O que a junta pegou |
|---|---|
| 1 | A **religação reintroduzia o próprio achado**: fundir identidades daria, a quem provasse a senha de uma organização, acesso a **todas as outras** daquela identidade. E os testes planejados não pegariam — comparavam papéis e contagens, quando o que mudava era **alcançabilidade**. |
| 2 | **Revogar o vínculo não revogava o acesso** — a sessão criada pela religação se renovava por 7 dias e sobrevivia à revogação *e* à troca de senha. E a política de isolamento escolhida **mataria o caminho novo sob a conta real de produção**, ficando verde na CI (superusuário). |
| 3 | **Terceira afirmação falsa sobre produção**, na seção reescrita para corrigir a segunda. Mais: o **teste que o próprio crítico exigira era teatro** (passava com a correção ausente, porque a rotação já trocara o token), e a trilha à prova de adulteração **quebraria sob a conta real** (a escrita que retorna linha aplica política de leitura). |
| 4 | O **canal de detecção não existia**: medido com banco descartável e o Prisma do repositório, o motor de migração **descarta as mensagens de aviso do banco** — em nenhum dos quatro caminhos de implantação o alerta chegaria a alguém. Pior: o plano mandava anexar esse silêncio ao PR **como evidência de saúde**. |
| 5 | A **terceira ocorrência da classe CI-verde/produção-quebrada**, dentro do próprio v6 (ver §4). |

## 2. A lição estrutural — o §0, e por que ele precisou ser alargado

Três reprovações seguidas foram por **afirmação falsa sobre como a produção está configurada**. A raiz é
comum e não era culpa de desatenção: **a produção nunca foi ativada**, então toda frase sobre "sob a role de
produção" era **inferência lida em documentação, apresentada como fato**.

O v5 introduziu o **§0**: o plano **para de afirmar** como ambientes não medidos estão configurados —
condicional com as duas pontas, detecção executável que falha alto, e cada premissa **rotulada** como
documental ou medida.

E então o v6 precisou **alargar a cerca**: o veto da rodada 4 nasceu de uma afirmação sobre **como a
ferramenta se comporta**, que estava do lado de fora. Entrou a regra *"comportamento de ferramenta também se
mede"*. É a lição que vale além deste bloco: **cercar uma classe de erro só funciona se você cercar a classe,
não o exemplar**.

## 3. O que virou fato medido

O `agente-secops` e o `agente-devops-provisionador`, independentemente, executaram leituras na plataforma e
mediram: o repositório **não tem nenhuma variável de ambiente configurada**, e os ambientes de **staging e
produção não existem**. Não há banco, não há conta de aplicação, não há nada a configurar errado.

Isso promoveu "a produção nunca foi ativada" de premissa documental a **fato medido**, com os dois comandos
registrados como **procedimento de re-medição** — porque no dia em que um ambiente povoado receber esta
migração, essa frase é o **gatilho para reabrir** a análise.

Foi também o que fechou o veto da rodada 4 por um motivo mais forte do que o plano escrevia: **o cenário de
dano é inalcançável** pelos quatro caminhos. A degradação silenciosa exigiria base já povoada + esta migração
aplicada depois + conta sem privilégio; e os ambientes nascerão vazios, aplicando esta migração como parte do
primeiro esquema, onde o backfill é vacuoso.

## 4. A terceira armadilha da classe CI-verde/produção-quebrada — condição de implementação

Achada pelo `critico-adversarial` **dentro do v6**, e composta por duas decisões que estavam certas isoladas:

- a linha de vínculo **deixou de ter campo de proveniência** (a história passou a viver na trilha);
- a trilha é **só-de-inserção**, sem política de leitura — deliberadamente ilegível por organização, para não
  virar chave de junção entre elas.

Juntas: **o gancho da troca de senha decide com base num fato que só existe na trilha, e a trilha é ilegível
para a aplicação sob a conta real.** Na CI, superusuário lê e o teste passa; sob a conta de produção, lê zero
e o gancho decide errado — silenciosamente.

**Não é motivo de sexta rodada:** o conserto é escolha entre duas opções fechadas, ambas dentro dos artefatos
que este bloco cria. É **condição para abrir o PR**, e entra no comando do bloco.

## 5. Correções vinculantes — todas para o comando, nenhuma para nova rodada

| Cadeira | Correções |
|---|---|
| `critico-adversarial` | 7 — a nº 1 é a armadilha do §4 (condição de implementação); as demais fecham vacuidade nos testes das duas pontas do backfill (uma asserção satisfeita pelo trabalho da própria migração, e um erro de permissão produzindo o mesmo resultado que o silêncio) |
| `agente-devops-provisionador` | 6 — entre elas, o discriminante do runbook chega **ilegível em staging** (o semeador cria usuários por caminho que não passa pela criação normal, então a métrica nasce falsa por desenho) e a **ordem de ativação é circular** como escrita |
| `agente-secops` | 4, sem veto, sem gatilho de junta-5 |
| `agente-dba-guardiao` | 6, nenhuma bloqueante |
| especialista em isolamento | mantém a ratificação do mecanismo elevado; correções de redação da ata |

Os pareceres completos das cinco rodadas ficam em `C:\tmp\voto{,2,3,4,5}-b01-*.md`; o plano aprovado é o
**v6** (`C:\tmp\plano-b-o6r-01-v6.md`, 407 linhas).

## 6. Registros de honestidade que a ata carrega

- **O planejador corrigiu âncoras erradas nos pareceres das próprias cadeiras** (três, na rodada 5), e as
  cadeiras **confirmaram as correções contra si mesmas**. Uma delas revelou um achado colateral real: existe
  um **comentário no código apontando para linhas erradas de um manifesto**, e foi dele que a citação errada
  saiu.
- O `agente-secops` **corrigiu um erro do próprio parecer da rodada 1**: havia descrito a resolução de papéis
  como preferindo o papel da organização, quando o global já vence. O endurecimento continua no plano, mas
  **reclassificado como defesa em profundidade**, não conserto de falha.
- O planejador **descartou duas soluções propostas pelas próprias cadeiras**, com motivo escrito — uma delas
  porque reproduziria a mesma classe de defeito, e outra porque dependia de comportamento de ferramenta não
  medido, que a regra nova passou a proibir.

## 7. O que esta junta NÃO decidiu

- **Não liberou deploy.** O bloqueio de deploy produtivo da J-6R segue **integral**; fechar este bloco leva
  os P0 fechados de 2 para 4, e **13 continuam abertos**.
- **Não reclassificou nenhum achado** da auditoria.
- **Não aprovou código** — aprovou o **plano**. A implementação passa por revisão adversarial própria e por
  junta de PR, como todo bloco.
- Decisões que o plano escalou e que seguem com a junta do PR: auditoria da origem no movimento de vínculo,
  ordem de ativação dos smokes, intervalo da reavaliação preguiçosa, e o alcance do gatilho de proteção da
  trilha.
