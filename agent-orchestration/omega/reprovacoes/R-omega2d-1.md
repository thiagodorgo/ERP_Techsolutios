# R-Ω2d — ciclo 1 (reprovação da junta de gate de Tags + POI)

Junta de 5: frontend-pixel **APROVADO**; **inspetor-de-rotas (VETO)**, **cognicao-visual (VETO)** e um 3º
agente REPROVARAM com o MESMO achado, provado ao vivo. (validador-mestre e master-teste bateram no limite de
sessão — reset 23h; o veto dos 3 que rodaram é claro e concordante.) Ciclo 1 do protocolo v3.

## Blocker (lição B1, provado ao vivo) — só POI (Tags OK)
`toPoiListDto` (src/modules/pois/poi.dto.ts) **omitia `address`**, mas `PontosInteressePage` renderiza a
coluna "Endereço" (lê `poi.address`), anuncia "Buscar por nome, categoria ou endereço" e `filterPois` busca
por address. Como a lista é a única fonte da tabela, a coluna ficava **"—" em toda linha** e a busca por
endereço nunca casava, mesmo com endereço gravado. Os testes mascaravam porque injetavam `address` direto no
mock (não pelo shape do list DTO).

## Correção
- `toPoiListDto` passa a emitir `address: poi.address ?? null`.
- Testes de regressão no backend: list DTO com address presente + null quando ausente (pois 16→18).

**Pós-correção:** backend pois **18/18** · core-saas 26/26 · build/diff limpos · **live: `GET /pois` traz
`address` e a busca por endereço casa**. Frontend inalterado (a tela já consumia o campo).
**Ciclo 2:** re-verificação pelo inspetor-de-rotas (um dos autores do veto).
