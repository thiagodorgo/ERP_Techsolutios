# J-B-SAN3-12b: junta do PR #469 (Financeiro: baixa e contas, aparência A)

- **Bloco:** B-SAN3-12b, no ramo `feat/web-financeiro-baixa-e-contas`.
- **Régua:** o bloco mexe com DINHEIRO, então a junta é completa, com unanimidade de 3 (`D-GOV-PROPORCIONAL` (1)). A partir do ciclo 2 vale a `D-JUNTA-SO-CADEIRA-VERMELHA`, e no ciclo 3 só bloqueia defeito de produto grave (§C7 item 8(2)).
- **Orquestrador:** sessão Claude Code (Opus 5.5).
- **Resultado:** **APROVADO no ciclo 3, por unanimidade (3/3)**, no objeto `cfb19fd115bac02ef65eb94202b01a64e6730854`.

## Ciclo 1: objeto `fc5ead6c`, REPROVADO (C1 e C3)
- **Votos:** a C2 aprovou. A C1 reprovou por C1-01, C1-02 e C1-03, e a C3 por C3-05, C3-02 e C3-07.
- **Auditoria e plano:** feitos pelo topo em `omega/reprovacoes/R-B-SAN3-12b-ciclo1.md`, que traz a Emenda E2 com 9 fatias.
- **Votos e evidências:** `votos/B-SAN3-12b/`.

## Ciclo 2: objeto `e77a5ac1`, REPROVADO (C1 e C3)
- **Inspetor:** `inspetor-san312b-c2-sol` deu LIBERADO COM RESSALVA.
- **C1, refeita:** `jurado-san312b-c1-r2-opus` REPROVOU. O bloqueio foi o C1r2-01: os valores dos indicadores passavam da borda do cartão entre 1280 e 1440 px.
- **C2, revalidada:** `jurado-san312b-c2-r2b-opus` APROVOU, só com notas. Foi sucessora P3 de `jurado-san312b-c2-r2-sol`, que caiu por um defeito do lançador (CLIXML). A queda está registrada em `votos/B-SAN3-12b-ciclo2/00-quedas.md`.
- **C3, refeita:** `jurado-san312b-c3-r2-opus` REPROVOU, por dois bloqueios:
  - C3R2-01: a trava do F8 só pegava `.reduce` com receptor simples;
  - C3R2-02: o merge da `main` reabriu pendências que estavam fechadas.
- **Auditoria e plano:** `planejador-san312b-c2rep-fable` fez a auditoria do topo em `omega/reprovacoes/R-B-SAN3-12b-ciclo2.md`.
  - Concluiu que os defeitos são reais, que nenhum é grave e que a máquina está sã.
  - O C3R2-02 era maior do que a cadeira mediu: foram DOIS fechamentos perdidos.
  - Daí veio a Emenda E3, com 4 fatias.
- **Dev do conserto:** `dev-san312b-ciclo3-claude` fez as 4 fatias: `864598f5`, `19abdf55`, `fccd77b0` e `cfb19fd1`.

## Ciclo 3: objeto `cfb19fd1`, APROVADO (3 × 0)
- **Mandatos:** `red-san312b-c3-opus` escreveu os 4, e todos passaram no pré-voo, reconferido pelo orquestrador.
- **Inspetor:** `inspetor-san312b-ciclo3-opus` deu LIBERADO COM RESSALVA, com 3 ressalvas:
  - disparo como agente genérico, com o corpo lido pelo blob;
  - plano de perda de jurado;
  - regras do Postgres da C3.

  O CI do objeto tinha 14 de 14 verdes.
- **Regra (2) para a C2:** pelo comando do inspetor, a interseção do diff `e77a5ac1..cfb19fd1` com o `arquivos_medidos` da C2 é `FinanceiroViewA.tsx`, `pendencias.md`, `pendencias-indice.md` e `B-SAN3-12-plano.md`. Como não é vazia, a C2 foi revalidada e não carregou o voto.

| Cadeira | Como | Identidade | Executor | Voto | Comando que provou |
|---|---|---|---|---|---|
| C1 | **refeita** | `jurado-san312b-ciclo3-c1-sol61`, sucessora P3 de `jurado-san312b-ciclo3-c1-opus` (pausada pelo dono às 04:49Z; parcial em `c1r3-pausado-opus-*`) | Codex conta 2, GPT-6.1 Sol, **por decisão do dono** (*"a c1 pode rolar com sol 6.1 no codex?"*), que substitui o "C1 só Claude" do R- §4 | APROVADO | `c1r3-evidencia.md`: R-E3-3/4 re-executados, sondas nas 3 larguras, mutações e regressão |
| C2 | **revalidada** (regra 2) | `jurado-san312b-ciclo3-c2rev-sol` | Codex conta 1, GPT-5.6 Sol | APROVADO | `c2rev3-evidencia.md`: os 8 comandos do ciclo 2 re-executados sobre `cfb19fd1` |
| C3 | **refeita** | `jurado-san312b-ciclo3-c3-sol` (retomada P7 da mesma identidade; o dono pausou às 13:03Z, depois de fechados os 3 itens) | Codex conta 1, GPT-5.6 Sol | APROVADO | `c3r3-evidencia.md`: C3R2-01/02 fechados e bateria verde; seção `## RETOMADA` com amostra re-executada |

- **Quedas e pausas (P6/P7):** estão em `votos/B-SAN3-12b-ciclo3/00-quedas.md`. A C1 foi pausada pela ordem do dono (Claude) e retomada por sucessora no Codex. A C3 foi interrompida pelo orquestrador com o PC indo desligar, porque o Codex não recebe PAUSA, e foi retomada pela mesma identidade.
- **Notas e ajustes** (nenhum é grave nem bloqueia; as pendências vão para o próximo PR de registro):
  - **C1:**
    - C1R3-A1: pré-existente, já tem dono em `P-FINANCE-SUMMARY-ADAPTER-NUM-ZERO`;
    - C1R3-N1, N2 e N3: viram as pendências propostas `P-C1R3-INDICADOR-ORG-COM-CONTA`, `P-C1R3-ESTADO-SEM-LEITURA-LANCAMENTOS` e `P-C1R3-TEXTO-PAGER-FILTRADO`;
    - C1R3-N4: pré-existente, `P-WEB-GUARDA-ROTA-TEXTO-SEM-ACENTO`;
    - C1R3-N5: `P-SAN3-12B-BUSCA-TABELA-TITULOS`.
  - **C2:** C2R-01 fica com a orquestração da junta (o `role-perms.json` entra no roteiro), C2-02 com `B-SAN3-24` e C2-03 com a decisão F13/Q4.
  - **C3:**
    - C3R3-N1: pré-existente, `P-FINANCE-FRONT-SOMA-DINHEIRO-PRE-EXISTENTE`;
    - C3R3-N2: ajuste vindo do C3R2-03 (nenhum teste prende a trava de rodada superada), preservado pela E3.
- **Separação de papéis (§C7.4-bis):** todas as identidades são distintas. Há uma por papel:
  - **quem achou:** as cadeiras dos ciclos 1 e 2;
  - **quem planejou:** `planejador-mestre`, `planejador-san312b-c1rep-fable` e `planejador-san312b-c2rep-fable`;
  - **quem desenvolveu:** `dev-san312b-sol`, `dev-san312b-opus`, `dev-san312b-ciclo2-sol` e `dev-san312b-ciclo3-claude`;
  - **quem redigiu:** os redatores de mandato;
  - **quem julgou:** as cadeiras acima.
- **Executores:** no ciclo 2, o Claude cobriu o limite do Codex (C2, C3, dev, redator e inspetor). Em 28/10 o dono corrigiu: *"vc so faz orquestração ate o limite renovar"*. O ciclo 3 votou no Codex, com duas contas (`reference-codex-duas-contas`).

## Merge
- O objeto aprovado é `cfb19fd1`.
- O commit desta ata e dos votos do ciclo 3 acrescenta só `agent-orchestration/omega/juntas/**`.
- O merge vai no head que contém esse commit, com o CI verde. Depois vêm o porteiro e a limpeza pós-merge.
