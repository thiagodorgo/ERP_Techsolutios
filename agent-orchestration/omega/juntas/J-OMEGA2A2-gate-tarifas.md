# J-Ω2a2 — Gate das Tarifas (Ω2-a.2) — junta de 5 (aprovada no ciclo 2)

## Ciclo 1 — 4/5 APROVADO; inspetor-de-rotas (VETO) REPROVADO
| Agente | Veredito | Evidência-chave |
|---|---|---|
| validador-mestre | APROVADO | Migration aditiva down/re-up executados de verdade; RLS confirmado no catálogo do Postgres; **natural key A1 com customer_id no schema + migration + banco vivo**; RBAC espelho papel a papel; números todos batendo (26/0, 17/17, 291/291). Registrou P-029/030/031 em pendencias.md. |
| inspetor-de-rotas (veto) | **REPROVADO** | **B1:** list DTO omitia validFrom/validTo → coluna Vigência sempre "Sem vigência definida" (provado live). **B2:** edição enviava referências que o backend ignora em silêncio → falso sucesso 200 (provado live). |
| master-teste | APROVADO | Prova A1 ao vivo: tarifa padrão + por-cliente para o MESMO serviço coexistem (201+201); repetição → 409 duplicate_tariff. |
| cognicao-visual | APROVADO | Tela viva (D-007), moeda PT-BR, sem enum cru; estudo doutoral citado. |
| frontend-pixel-master | APROVADO | Densidade/tokens/page-header coerentes com os irmãos registry. |

## Correções (R-omega2a2-1) + Ciclo 2
B1: `toTariffListDto` emite `validFrom/validTo` (+2 testes, backend 19/19). B2: selects de referência
`disabled` na edição + dica + referências fora do payload (+2 testes SSR, front 293/293). Comentário
obsoleto de máquina de estado corrigido (P-030a).

**inspetor-de-rotas (ciclo 2): APROVADO** — provou ao vivo: item da LISTA com `validFrom/validTo` ISO;
PATCH só com campos editáveis (referências intactas); 19/19 + 4/4; checks verdes.

**Veredito final: 5/5 APROVADO.** Nota não-bloqueante do inspetor: `GET /navigation/menu` não lista nenhum
item `/cadastros/*` (padrão do repo — o grupo Cadastros é servido pelo registry do frontend com gate por
permissão real); fica relatado para eventual unificação futura.
