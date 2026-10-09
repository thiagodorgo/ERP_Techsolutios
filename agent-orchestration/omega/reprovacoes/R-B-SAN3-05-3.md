# R-B-SAN3-05-3 — reprovação da junta 3 do B-SAN3-05 (2026-10-09)

- **Veredito:** REPROVADO pela C1 (`jurado-san305-c3-trava-de-views`); C2 e C3 não votaram por decisão do dono — ata em
  `J-B-SAN3-05.md`, seção "Ciclo 3".
- **Bloqueantes graves:** C1-c3-01 (leitura entre organizações por `GRANT SELECT (colunas)` numa view com dono que escapa),
  C1-c3-02 (escrita entre organizações por `UPDATE`/`INSERT` de coluna). Notas: C1-c3-03, C1-c3-04.
- **Decisão do dono:** D-405-PROIBIR-VIEWS — a trava e o MODO 6 recusam QUALQUER view/matview que alcance tabela FORCE,
  sem analisar dono nem privilégio. Ciclo 4 curto, só desse ponto.
