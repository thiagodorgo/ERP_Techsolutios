# R-B-SAN3-13-ciclo2 — reprovação do ciclo 2 da junta de DADO do B-SAN3-13 (PR #460)

- **Objeto:** `cbf2db292f0643b9647017005c361a2e11da61c7`. Ciclo 2, o último em que achado não grave reprova (§C7 item 8(2)).
- **Votos:**
  - C2b `jurado-san313-c2b-opus`: APROVADO (C2b-01 ajuste; C2b-02 e C2b-03 notas);
  - C1 `jurado-san313-c1-opus`: APROVADO (N-1 a N-4 notas);
  - C3 `jurado-san313-c3-opus`: **REPROVADO**.
  - Todas em Claude Opus, declarado (ressalva R2 do inspetor, ordem do dono).
- **C3-01** (bloqueia, dentro do bloco, NÃO grave): o contrato de `GET /work-orders` em `API_CONTRACTS.md` não traz os motivos que o código emite e o teste confere. São `invalid_scope` e `invalid_open_only` (400 `WORK_ORDER_FILTER_INVALID`, `work-order.validators.ts:54,61`) e `scope_resolver_unavailable` e `scope_resolution_failed` (503). O plano v3 (§3, CA-3, §14) os punha no contrato; o texto exato da E2 os perdeu.
- **Notas da C3:** C3-02, C3-03 e C3-04.
- **Papéis do ciclo 3:** achou `jurado-san313-c3-opus`; audita e planeja o topo (`planejador-mestre` Fable, identidade nova); desenvolve uma identidade nova ≠ achador ≠ planejador.
- **Regra do ciclo 3:** só defeito de produto GRAVE reprova. Pelo §C7 item 9, a C3 é refeita, e C1 e C2b carregam o voto se o diff do conserto não cruzar o `arquivos_medidos` delas.
