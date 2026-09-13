# J-SAN3-plano-ciclo1 — junta do PR #386, ciclo 1 (plano SAN3 v4 + registro + fechamento do B-O6R-06)

**Veredito: REPROVADO · Placar 0 × 3** (unanimidade de 3 exigida) — 6 achados `bloqueia` dentro do que o PR escreveu,
1 `bloqueia` pré-existente.
**Conteúdo julgado:** `a143d2c33674cc2c3562de40cc9d3a95350cabe5` · **head do PR na junta:** `0436d51cc0b1f074ff329f1e4ac0b0edf7d5dd2f`
(entre os dois só entraram arquivos em `agent-orchestration/omega/juntas/`) · **base:** `origin/main@15ef3fbe` ·
**CI no head:** verde (`fce82fef` 7/7, medida pelo inspetor; `0436d51c` verde).

## 1. Composição, modelo e papéis no caso

| Cadeira | Titular | Suplente | Modelo que rodou | Voto |
|---|---|---|---|---|
| C1 — ordem, dependências, agenda e viabilidade | `estrategista` | `agente-dba-guardiao` | Opus 5 (papel sem modelo fixado) | **REPROVADO** |
| C2 — isolamento, permissão e segurança | `coordenador-de-acessos` | `guardiao-fail-closed` | Opus 5 | **REPROVADO** |
| C3 — diff × regras, KPI e registro | `validador-mestre` | `agente-ci-doutor` | Opus 5 | **REPROVADO** |

Nenhum suplente entrou; nenhuma queda (`votos/SAN3-plano/00-quedas.md`). C1 e C2 rodaram em paralelo; C3 depois (P5).

**Separação de papéis (§C7.4-bis):** quem achou os defeitos do registro e do produto — 8 inventariantes
somente-leitura e o `critico-adversarial` (duas rodadas sobre o plano); quem planejou — o orquestrador (autor do plano e
do briefing, inelegível para votar); quem aplicou a correção do registro — um agente `general-purpose` que não achou
nenhum dos defeitos. As cadeiras mediram e julgaram; nenhuma propôs correção.

## 2. Gate de início

`inspetor-de-terreno-da-junta` (Fable 5.1, sem fallback): **LIBERADO COM RESSALVA** —
`votos/SAN3-plano/00b-inspetor-terreno.md`. As 7 ressalvas foram absorvidas no §6 do briefing (`0436d51c`) antes do
disparo das cadeiras.

## 3. Os bloqueantes

| Achado | Cadeira | Escopo | Defeito |
|---|---|---|---|
| C1-02 | C1 | dentro | O bloco que fecha o gate exige "faturar" pela web; a web não fatura OS e nenhum bloco constrói a ação |
| C2-01 | C2 | dentro | O check-in do app (controle de segurança ineficaz, rótulo que mente) ficou fora do gate por mitigação, que o §2 proíbe |
| C2-02 | C2 | dentro | Item 16 conta 27 caminhos fora do gate de módulo; são 38; o guard proposto passa verde com o defeito |
| C3-01 | C3 | dentro | O conflito do faturamento foi atribuído à `D-Ω4-C1`; o índice é a `D-Ω4-C2` |
| C3-02 | C3 | dentro | `status-geral.md` publica 103/260 contra 105/258 do gerador |
| C3-03 | C3 | dentro | Duas pendências do painel fechadas sem cumprir o próprio critério de fechamento |
| C2-09 | C2 | **pre-existente** | Técnico responde, conclui e dá ciência em vistoria de OS alheia — não reprova; entra no gate pela regra única |

Todos os bloqueantes foram **conferidos no código pelo orquestrador antes de entrarem no plano de correção**.

## 4. Ajustes e notas (seguem para o plano de correção)

C1: C1-01 (trava de `prisma/schema.prisma` ausente na agenda), C1-03 a C1-06. C2: C2-03 a C2-08, C2-10 a C2-12. C3:
C3-04 a C3-08 (o C3-08 — diretório de worktree órfão `.claude/worktrees/san2-r` — é resíduo alheio: reportado aqui, não
varrido). O texto integral de cada achado está no voto da cadeira.

## 5. O que acontece agora

- Registro da reprovação: `agent-orchestration/omega/reprovacoes/R-SAN3-plano-ciclo1.md` (as três perguntas do §C7.4-bis).
- Pendências novas já registradas, a partir dos votos: `P-WEB-FATURAR-OS-SEM-TELA`, `P-SAN3-CHECKLIST-RUN-SEM-ESCOPO-POR-OBJETO`,
  `P-FIELD-LOCATION-SEM-CONSENTIMENTO-NO-BACKEND`, e 6 emendas.
- Plano de correção: `agent-orchestration/omega/planos/SAN3-plano-ciclo2-correcao.md` — escrito pelo orquestrador,
  aplicado por um agente distinto.
- Ciclo 2: a `agente-fabrica` cria o especialista de **cobertura de fluxo prometido** (a competência que faltou ao
  plano) e o suplente; as outras duas cadeiras vêm de papéis permanentes que não atuaram no caso; as três cadeiras do
  ciclo 1 não votam no ciclo 2. Novo inspetor de terreno antes. Teto: `D-TETO-DOIS-CICLOS`.
