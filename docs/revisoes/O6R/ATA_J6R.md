# ATA J-6R — Junta Ω6R

Data: 2026-08-11. Relator/Presidente: Codex (não vota e não origina achados).

## Composição

- A1 `o6r-arquiteto` — arquitetura e fronteiras.
- A2 `o6r-seguranca` — segurança, tenancy e LGPD.
- A3 `o6r-dados` — dados, concorrência e dinheiro.
- A4 `o6r-performance` — performance e confiabilidade.
- A5 `o6r-qualidade` — qualidade, testes e contratos.

Todos operaram em leitura; o Relator reabriu as evidências aceitas e registrou os achados nos dois registros.

## Votação do veredito

| Votante | Voto | Justificativa resumida |
|---|---|---|
| A1 | REPROVADO | bypass, perda/corrupção e distorções financeiras em caminhos executáveis |
| A2 | REPROVADO | bypass de autorização e duplicação/perda de dinheiro ou estoque |
| A3 | REPROVADO | persistência volátil e corrupção financeira/estoque confirmadas |
| A4 | REPROVADO | confiabilidade e integridade insuficientes para carga produtiva |
| A5 | REPROVADO | defeitos confirmados capazes de perder dinheiro/dados |

Placar: **5×0 — REPROVADO PARA PRODUÇÃO**.

## Severidades contestadas

| Achado | A1 | A2 | A3 | A4 | A5 | Resultado |
|---|---|---|---|---|---|---|
| Ω6R-SEC-002 | P0 | P0 | P0 | P0 | P0 | P0, 5×0 |
| Ω6R-DAT-001 | P0 | P0 | P0 | P0 | P0 | P0, 5×0 |
| Ω6R-DIN-005 | P0 | P0 | P0 | P0 | P0 | P0, 5×0 |
| Ω6R-DIN-006 | P0 | P0 | P0 | P0 | P0 | P0, 5×0 |
| Ω6R-DIN-007 | P0 | P0 | P1 | P1 | P0 | **P0, 3×2** |
| Ω6R-DAT-002 | P0 | P0 | P0 | P0 | P0 | P0, 5×0 |
| Ω6R-DAT-003 | P0 | P0 | P0 | P0 | P0 | P0, 5×0 |

Divergência preservada: A3/A4 defenderam P1 em Ω6R-DIN-007 porque o erro subestima relatório/rateio sem mutar ledger diretamente. A maioria manteve P0: o valor é base de cobrança e o truncamento determinístico produz custo monetário objetivamente incorreto.

## Recomendações externas

Nenhuma recomendação exige contratação de SaaS/ferramenta paga/consultoria. Não houve votação de serviço externo.

## Deliberação

Bloquear deploy produtivo e features nos módulos atingidos até concluir os blocos P0 do `PLANO_O6R.md`; P1 vem antes de nova feature no módulo correspondente. O humano delibera os rascunhos arquiteturais D-001..D-004.
