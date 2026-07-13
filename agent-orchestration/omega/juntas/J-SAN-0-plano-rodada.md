# J-SAN-0 — Ata: plano da RODADA SANEAMENTO + Ω-INFRA (ratificação)

Junta de ratificação do plano da rodada (7 PRs / 4 trilhas: Ω-GATE → Ω-GOV → Ω-DOCS → Ω-INFRA-1..4).
Composição ≥3: **planejador-mestre · estrategista · critico-adversarial**.

## Veredictos (3/3 APROVADO)
| Agente | Veredito | Nota |
|---|---|---|
| planejador-mestre | **APROVADO** | Ordem respeita dependências duras (GATE→GOV→infra); fatiamento são; premissas conferidas contra o repo. Condição: gravar o parágrafo de fronteira externa. |
| estrategista | **APROVADO** | Cadeia causal correta; risco ascende monotônico (container→staging→prod→backup); restore comprovado como pré-condição é o ponto forte. Refino: fronteira de provisionamento + hand-off em lote. |
| critico-adversarial | **APROVADO** (executável p/ PR1-4; parcial p/ 5-7) | 3 requisitos abaixo. |

## Convergência (o achado central, independente e unânime)
`D-SAN-AUTONOMIA` pré-autoriza a **DECISÃO** de contratar provedor (junta de 5) e o gasto — mas **não fabrica
credencial**. PRs 5-7 exigem conta+pagamento+domínio+secrets que só o humano provê. **Fronteira externa
irredutível.** Teto autônomo: **PRs 1-4 completos + IaC/pipelines/scripts/runbooks de 5-7 escritos e aprovados
em junta-de-código**; ativação viva (smoke/restore reais) = **um único dossiê de hand-off** (humano interrompido
uma vez), no CHECKPOINT entre PR4 e PR5.

## Requisitos do critico → todos ATENDIDOS neste PR (Ω-GATE)
1. **Gravar D-SAN-AUTONOMIA já no PR1** (não no PR2) — FEITO em `controle/decisoes.md` (D-SAN-AUTONOMIA), com o
   escopo exato (decisão/gasto sim; credencial não) e "falta de credencial/pagamento/domínio externo" adicionada
   às paradas imediatas irredutíveis.
2. **Checkpoint PAUSA-HANDOFF-CREDENCIAIS explícito entre PR4 e PR5** — FEITO em `omega/lista-saneamento.md`.
3. **Rebase de Ω3 pós-merge do Ω-GATE** — já coberto: Ω3-d é o último Ω mergeado; a diretriz do dono manda
   `git pull origin main` antes de cada bloco Ω novo (pós-Ω-GATE). Registrado em [[project-saneamento-infra-directive]].

## Decisão
Plano **APROVADO**. Execução autônoma PR1→PR4 + config-as-code de PR5-7; parada planejada no checkpoint de
credenciais. D-KPI-PER-PR (revogação KPI pós-humano) permanece tarefa do PR2 (Ω-GOV).
