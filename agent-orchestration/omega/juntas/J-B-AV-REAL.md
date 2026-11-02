# J-B-AV-REAL: junta do PR #477 (antivírus ClamAV real no upload, fail-closed)

- **Bloco:** B-AV-REAL, trilha do item 27 do gate (`PLANO_SAN3.md`). Ramo `feat/evidence-clamav-scanner`.
- **Régua:** fluxo rápido, `D-JUNTA-FLUXO-RAPIDO` (§C7 item 10): junta uma vez, triagem, um conserto, conferência, merge.
- **Orquestrador:** sessão Claude Code (Opus 5.5).
- **Resultado:** **APROVADO PELA CONFERÊNCIA** no objeto `1181537e1a5a0cae3f862abd36cb77a55d38a126`. A junta reprovou uma vez, sem achado grave; não se refez cadeira.
- **O item 27 continua aberto:** ele só fecha com o serviço respondendo no ambiente real.

## Junta: objeto `2746eb6055abcdab863a2d1ce3c7cb2a8a5f6c77`, REPROVADO (3 × 0)

- **Inspetor:** LIBERADO COM RESSALVA, com 16 check-runs verdes no objeto (`votos/B-AV-REAL/00-inspetor.md`).

| Cadeira | Identidade | Modelo | Voto | `bloqueia` | Ressalvas |
|---|---|---|---|---|---|
| C1 | `c1-j-avreal` | Claude Opus | reprova | A1 | 11 |
| C2 | `c2-j-avreal` | Claude Opus | reprova | C2-A1, C2-A2 | 4 |
| C3 | `c3-j-avreal` | Claude Opus | reprova | C3-A1, C3-A2 | 7 |

- C2-A1/C3-A1 e C2-A2/C3-A2 são o mesmo defeito visto por duas cadeiras, então os bloqueantes distintos são 3.
- **Monocultura:** as 3 cadeiras rodaram em Claude Opus, o que fica declarado.

## Triagem (item 10(3)), feita pelo orquestrador em 31/10, 20:20 SP

Nenhum achado é GRAVE na definição do item 10: todo vermelho do antivírus fecha falhando, sem aprovar arquivo. Os dois do overlay impediam o entregável de funcionar e exigiam decisão de desenho, por isso a auditoria do topo (item 10(5)). Detalhe em `votos/B-AV-REAL/triagem.md`.

- **Consertar agora:** lotes L1 a L11.
- **Pendência com dono `B-AV-REAL-RESIDUAL`, sem segurar o bloco:** `P-AVREAL-TETO-IDADE`, `P-AVREAL-PRAZO-SOMA`, `P-AVREAL-VERSION-FUTURO`, `P-AVREAL-SEGUNDA-RESPOSTA`, `P-AVREAL-ROTAS-ROTULO`, `P-AVREAL-B108-PROVA`, `P-AVREAL-PANE-CI`.

## Conserto e conferência

- **Plano do conserto:** `planejador-emenda-avreal` (Claude Fable), `votos/B-AV-REAL/B-AV-REAL-emenda-junta.md`.
- **Dev do conserto:** `fix-avreal-argon` (Gemini 4 Argon, pelo Antigravity), E1 a E13, head `4a5ceba3`. O conserto não toca `src/`.
- **Integração da `main`:** head `1181537e`, pelo orquestrador. Conflito só em `log-execucao.md`, `pendencias.md` e `pendencias-indice.md`. Os dois primeiros mantêm as entradas dos dois lados, e o índice saiu do gerador oficial. Prova: 683 cabeçalhos na base + 8 do ramo + 3 da `main` = 694.
- **Conferência (item 10(3).5):** `conf-avreal-sol` (Codex GPT-5.6 Sol), identidade nova, que não consertou, no objeto `1181537e` (`votos/B-AV-REAL/conf-avreal-parecer.md` e `conf-evidencia.md`):
  - L1 a L11 e D1 a D7 reexecutados;
  - mutações das fatias, cada uma vermelha, restaurada e verde;
  - overlay real com `up --wait`: clamd sem saída para a rede; base de `28164` para `28171` em 94 s, com `RestartCount=0`; processo vivo além do prazo acelerado;
  - `git diff 2746eb60..1181537e --stat -- src/` vazio;
  - CI do objeto com todos os jobs verdes.
  - **Achados novos: nenhum.** Veredito: APROVADO.
- **Cadeiras não refeitas:** item 10(4). O conserto não mudou regra de dinheiro, permissão nem isolamento, e a conferência não achou defeito grave.

## Separação de papéis (§C7.4-bis)

- **Quem achou:** C1, C2 e C3.
- **Quem planejou:** `planejador-emenda-avreal`.
- **Quem desenvolveu:** `fix-avreal-argon`.
- **Quem conferiu:** `conf-avreal-sol`.

Quem achou não consertou, e quem consertou não conferiu; a conferência rodou em modelo diferente do dev (`D-UM-FAZ-OUTRO-VERIFICA`).

- **(a) A composição cobre a competência?** Sim: protocolo, superfície e operação real tiveram cadeira própria.
- **(b) Quem achou é quem consertou?** Não.
- **(c) O planejador usou dado podre?** Não: a revisão da emenda achou 7 defeitos (D1 a D7), corrigidos antes do dev e reexecutados na conferência.

## Limites declarados

- A prova em ambiente real é do overlay local; a imagem é `amd64`, com a ressalva nos dois documentos.
- O item 27 e `P-O6R-B07B-SCANNER-AV-REAL` só fecham com o serviço no ambiente real.
- `D7` da conferência: a suíte local sem `DATABASE_URL` para em `core-saas-role-authority`; é pré-existente, fora do bloco e tratada pela emenda.
