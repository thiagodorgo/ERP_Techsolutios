# R-Ω2a2 — ciclo 1 (reprovação da junta de gate de Tarifas)

Junta de 5: validador/master-teste/cognicao-visual/pixel-master **APROVADO**; **inspetor-de-rotas (VETO)
REPROVADO** com 2 blockers provados ao vivo. Ciclo 1 do protocolo v3 (blockers claros → correção direta).

| # | Blocker (provado com login real) | Correção |
|---|---|---|
| B1 | `toTariffListDto` omitia `validFrom/validTo`, mas a coluna **Vigência** da lista e o modal de edição consomem esses campos — toda linha exibia "Sem vigência definida" mesmo com vigência gravada. | List DTO passa a emitir `validFrom/validTo` (ISO ou null). Testes novos no backend (19/19). |
| B2 | No modo edição, os selects Tabela/Serviço/Cliente ficavam HABILITADOS e iam no PATCH, mas o backend os ignora em silêncio (imutáveis por design) → usuário "trocava" o serviço, recebia 200, nada mudava (falso sucesso). | Selects `disabled={isEdit}` + dica "Fixa/Fixo após a criação — para trocar, crie outra tarifa"; referências ficam FORA do payload de update. Testes SSR novos (3 selects desabilitados na edição; habilitados na criação). |
| P-030(a) | Comentário obsoleto em tariffs.types.ts alegava máquina de estado 422 (Tarifa não tem). | Comentário corrigido. |

Pendências registradas pelo validador em `controle/pendencias.md` (P-029/P-030/P-031) — P-029 é o próprio B2
(resolvido); P-030(b) ramos P2003 específicos são código morto no Prisma 7 (comportamento correto via
genérico, fica registrado); P-030(c) selects server-side p/ >100 registros (UX futura).

**Pós-correção:** backend tariffs **19/19** · core-saas 26/26 · frontend smoke **293/293**.
**Ciclo 2:** re-verificação dirigida pelo inspetor-de-rotas (autor do veto).
