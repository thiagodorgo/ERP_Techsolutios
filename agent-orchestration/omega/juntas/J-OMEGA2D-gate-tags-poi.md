# J-Ω2d — Gate de Tags + POI (Ω2-d) — junta de 5 (aprovada no ciclo 2)

## Ciclo 1 — REPROVADO (mesmo achado em 3 agentes, provado ao vivo)
| Agente | Veredito | Nota |
|---|---|---|
| inspetor-de-rotas (veto) | **REPROVADO** | POI: `toPoiListDto` omitia `address` → coluna "Endereço" morta + busca por endereço nunca casava (lição B1). Tags OK. |
| cognicao-visual (veto) | **REPROVADO** | Mesmo root cause — coluna/busca de endereço desonestas (§6.1 densidade honesta). |
| (3º agente) | **REPROVADO** | Mesmo achado, prova empírica (POST com address → GET lista sem address). |
| frontend-pixel-master | **APROVADO** | Densidade/tokens/swatch/coordenada ok. |
| validador-mestre / master-teste | (não rodaram — limite de sessão, reset 23h) | — |

## Correção (R-Ω2d-1) + Ciclo 2
`toPoiListDto` passou a emitir `address: poi.address ?? null` (+2 testes backend: address presente e null).
Tags não tinha o problema (list DTO já completo). Frontend inalterado (já consumia o campo).

**inspetor-de-rotas (ciclo 2): APROVADO** — provou ao vivo: `GET /pois` traz `address`; `?search=<endereço>`
casa (inclusive um POI cujo NOME não tem o termo, só o endereço); Tags/RBAC sem regressão; pois 18/18 · 26/0.

**Veredito: APROVADO.** O veto pegou uma coluna/busca morta (contrato front×back quebrado) e forçou o list
DTO completo — a mesma lição B1 recorrente, agora travada por teste do shape do DTO. Pendência: **TagAssignment**
(join polimórfico) declarada fora do bloco.
