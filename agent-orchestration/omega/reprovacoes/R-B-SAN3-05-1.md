# R-B-SAN3-05-1 — ciclo 1 reprovado

- **Entrega:** `B-SAN3-05` (PR #405). **Ata:** `J-B-SAN3-05.md`, ciclo 1, **REPROVADO 3 × 0**.
- **Regra:** §C7 item 8 (`D-GOV-PROPORCIONAL`): junta completa, teto de 2 ciclos — o ciclo 2 é o último em que achado não grave
  bloqueia; no 3º, só defeito de produto grave. O vazamento da senha no log (A4/F-C2-01) é defeito de segurança grave.
- **A corrigir no ciclo 2:** A4 = F-C2-01 (MODO 0 deixa passar a amostragem de log: senha no `server.log`), A2 (escrita no
  catálogo fora do lock: teste intermitente), C3-F1/F1b/F2 (ratchet do gerador fail-open para acesso não reconhecido), C3-F3
  (superfície T11); e os ajustes A1, A3, F-C2-02 a F-C2-04.
- **Papéis do ciclo 2 (§C7.4-bis):** planejador e dev com identidade nova; cadeiras do ciclo 2 com identidade nova.
