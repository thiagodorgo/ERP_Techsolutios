# J-B-SAN3-01 — ata da junta (a web deixa de fabricar dado quando o backend recusa)

## Ciclo 1 — 2026-09-18 — REPROVADO 2 × 2

- **Objeto:** `bb540fb3` (PR #387); head na junta `74f3f7c9` (+ registro). Base `origin/main@02bd7dab`.
- **Inspetor de terreno:** `LIBERADO COM RESSALVA` (8 ressalvas) — `votos/B-SAN3-01/00b-inspetor-terreno.md`. A R1 fez a junta ganhar a 4ª
  cadeira (`guardiao-fail-closed`) e unanimidade de 4; o briefing v2 absorveu R2, R3, R6, R7 e R8.
- **Votos:** C1 `validador-mestre` APROVADO (0 · 1 ajuste · 5 notas) · C2 `master-teste-telas-rotas` APROVADO (0 · 0 · 7 notas) · C3
  `cognicao-visual` REPROVADO (C3-B1) · C4 `guardiao-fail-closed` REPROVADO (C4-01, C4-02, C4-03).
- **Quedas (P6):** `votos/B-SAN3-01/00-quedas.md` — C1 e C4 caíram uma vez por 429 antes de medir; a C2 caiu duas vezes dentro do
  workflow e a 3ª instância sobrescreveu o parcial da 2ª.
- **Papéis:** planejador `planejador-mestre`; desenvolvedor `general-purpose` (3 instâncias); orquestrador decidiu as emendas; nenhum
  deles votou.
- **Registro da reprovação e as três perguntas do §C7.4-bis:** `agent-orchestration/omega/reprovacoes/R-B-SAN3-01-ciclo1.md`.
- **Próximo:** ciclo 2, o último (`D-TETO-DOIS-CICLOS`) — emenda 3 do comando.
## Ciclo 2 — 2026-09-19 — REPROVADO (1 cadeira de 4) · teto atingido · decisão do dono

- **Objeto:** `8adaaa31` (PR #387); head do PR = o objeto. Correção: `git diff ec8492fd 8adaaa31`. CI 7/7 verde.
- **Inspetor de terreno:** `LIBERADO COM RESSALVA` (9 ressalvas; a R-D forte fez a C4 sair do `coordenador-de-acessos` para um jurado
  criado pela `agente-fabrica` com a competência de mutação no corpo) — `votos/B-SAN3-01-c2/00b-inspetor-terreno.md`.
- **Votos:** C1 `validador-mestre` APROVADO (4 notas) · C2 `master-teste-telas-rotas` APROVADO (5 notas) · C3 `frontend-pixel-master`
  (identidade nova) APROVADO (1 ajuste pré-existente, 4 notas) · **C4 `jurado-san3-01c2-fail-closed-web` (identidade nova) REPROVADO**
  (2 `bloqueia` dentro do bloco, 1 ajuste, 8 notas).
- **Os dois bloqueios:** (A-01) a decisão da PÁGINA não está amarrada ao estado — uma linha em `WorkOrdersPage.tsx` faz o 403 chegar à
  tela como vazio, com KPIs 0, e bloco 67/67, `tsc` e smoke 1193/1193 seguem verdes; (A-02) o guard G1 não pega o próximo membro
  DENTRO das próprias raízes — barrel de dois níveis e entidade fabricada inline em arquivo novo nascem permitidos, e o cabeçalho dos
  services afirma um alcance que a mutação desmente. O ajuste (A-03): os vigias W1/W2 da fiação dos hooks são textuais.
- **Papéis (§C7.4-bis):** planejador `planejador-mestre` (Fable); desenvolvedor do ciclo 2, agente novo; quem achou no ciclo 1
  (`cognicao-visual`, `guardiao-fail-closed`) não sentou no ciclo 2; nenhum deles votou.
- **Teto (`D-TETO-DOIS-CICLOS`): dois ciclos reprovados → parada e dossiê ao dono**, em
  `agent-orchestration/omega/reprovacoes/DOSSIE-B-SAN3-01-parada.md`.
- **Decisão do dono (2026-09-19, `D-SAN3-01-MERGE-COM-BLOCO-DE-GUARDA`):** opção B — **mergear a correção** (a perda de dado está
  fechada e provada por execução: bloco 67/67, smoke 1193/1193, backend 2996/2998, e2e 3/3) e **abrir um bloco no gate** só para as
  duas propriedades que faltaram, com dono e caráter bloqueante: `B-SAN3-01b`.
