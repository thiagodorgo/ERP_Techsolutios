# R-B-SAN3-13-ciclo1 — reprovação da junta de DADO do B-SAN3-13 (PR #460)

- **Objeto:** `ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d`. Ciclo 1. Régua: unanimidade de 3, com veto.
- **Quem reprovou:** a C2 `jurado-san313-c2-opus` (Claude Opus 5.5, declarado). Voto em `votos/B-SAN3-13/c2-voto.json`, evidência em `c2-evidencia.md`.
- **Bloqueios, dentro do bloco:**
  - **C2-01 (grave, perda de dado):** material `pending` gravado entre a checagem e o `deleteWorkOrder` é apagado com a OS (`drift_work_order_local_store.dart:200-203`). A ação `work_order_material.add` fica órfã. Sonda S3: `materiais_de_w=0`. O plano dizia (R8', l.189/360/377) que o material sobrevivia "em tabela própria", o que é falso.
  - **C2-02 (não grave):** resposta pendente gravada pelo `saveAnswer` com o run `synced` não retém a OS; nada é apagado. Contraria CA-19/F25 e a Q3; a chave `run_id` do mapa de retenção não tem produtor.
- **Ajuste e nota:** C2-03 (J1, J2, J5, J6 sem teste vermelho) e C2-04 (a regra de fabricação também apaga o pendente de linha fabricada).
- **C1 e C3:** ainda não votaram neste ciclo. As cadeiras Codex caíram por limite antes de medir (ver `votos/B-SAN3-13/00-quedas.md`). Ordem do dono: Claude cobre uma por vez até o Codex voltar.
- **Papéis do ciclo seguinte (§C7.4-bis):**
  - quem achou: `jurado-san313-c2-opus`;
  - quem audita e planeja: `planejador-mestre` em Fable, identidade nova (`D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`);
  - quem desenvolve: Codex Sol, quando voltar (20:13 BRT), identidade ≠ `dev-san313-opus`.
