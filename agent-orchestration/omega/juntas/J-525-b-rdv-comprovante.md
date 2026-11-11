# Ata — Junta completa B-RDV-COMPROVANTE (PR #525) — 2026-11-10 — CICLO 1

**Bloco:** B-RDV-COMPROVANTE (§G.3 de `B-REENVIOS-plano.md`): o comprovante de despesa que o técnico fotografa no app sobe ao servidor por uma rota multipart idempotente, com scanner e storage por composição, e o blob local fica no aparelho até a confirmação.
**Objeto:** head `b9e63ec097cb81b64936aaeb60c9715e051e91d0`, ramo `feat/mobile-rdv-comprovante`; CI 16/16 verde no objeto (push `42742684762`, pull_request `42742691191`).
**Nível:** junta completa (superfície externa + dado pessoal + permissão + isolamento), unanimidade de 3 com veto. Sem pré-revisão (como no #522, declarado no briefing).
**Briefing:** `erp-pausa-2026-10-03/revisoes/j525/BRIEFING.md` (revisão 2); mandatos `erp-pausa-2026-10-03/prompts/j525-c{1,2,3}.md` e os dos sucessores `j525-c{1,2}-dp.md`.
**Cruzamento (D-UM-FAZ-OUTRO-VERIFICA):** dev = Claude (`rdvcomp`, Fable 5). Cadeiras: C1 e C2 em Codex, com sucessores em DeepSeek; C3 em Claude Opus, por **exceção declarada** (às 01:33 SP nenhum outro modelo tinha limite).

## Inspetor de terreno (`insp-j525-opus`, Claude Opus): LIBERADO COM RESSALVA
Parecer em `revisoes/j525/insp-parecer.md`. As ressalvas R1–R8 corrigiram o PRÓPRIO briefing e os mandatos antes do disparo, e seis delas eram critério impossível de passar:
- R1: base de diff que trazia `CLAUDE.md`/`AGENTS.md` para o escopo;
- R2: a decisão citada (`D-DESPESA-VERSAO-GESTOR-ESCONDER`) não estava em ref nenhuma, só no disco do orquestrador; ela entrou na `main` pelo #526 às 02:01;
- R3: "merge sem conteúdo próprio" era falso;
- R4: "+1 linha" no catálogo, que na verdade é +3 com 1 permissão;
- R5: os fatos da `RBAC_MATRIX` l.163;
- R6: três frases da C3 sem banco ou com comando de TAP que devolvia 0 linhas.

A R7 trouxe como insumo a revisão automática do Copilot (6 itens), com a regra de não herdar a gravidade dela. A R8 atualizou o terreno vivo.

## Votos
- **C1 (backend):** a `j525-c1` (Codex 1) caiu por limite às 01:02 com o item 1 medido; a sucessora `j525-c1-dp` (DeepSeek Pro, P3) re-executou o item 1 e mediu os itens 2 e 3, este com Postgres próprio `j525-c1-pg`. **REPROVADO.**
  - **C1-A2 GRAVE:** a editabilidade é lida fora da transação que grava. Com barreira, submit 200 e upload 201 `uploaded`: o comprovante entra num relatório já submetido.
  - **C1-D1 GRAVE:** o comprovante `uploaded` fica em `os.tmpdir()`, sem volume nem variável que troque a raiz. Num reinício do container ele some, a linha fica `uploaded` e o app já apagou o blob: perda de dado pessoal.
  - **C1-A1 MÉDIO:** `RBAC_MATRIX.md` l.163 diverge do catálogo executado.
  - **C1-A3 MÉDIO:** o replay depois da submissão volta 422 em vez do mesmo `receiptId`.
  - Isolamento, idempotência e `RR-db` verdes: papel sem superusuário nem bypass, controle sem contexto vazio, M-db vermelha.
- **C2 (app):** a `j525-c2` (Codex 3) caiu por limite às 01:03 com o item 1 medido; a sucessora `j525-c2-dp` (DeepSeek Pro, P3) completou. **REPROVADO.**
  - **C2-DP-02 ALTA:** o lote envia `reportSubmit` antes do upload; o upload leva 422 e o comprovante nunca entra.
  - **C2-DP-03 ALTA:** `ExpenseItem.serverId` não é persistido (falta a coluna no Drift); depois de reiniciar o app, o upload nunca monta a URL.
  - **C2-DP-01 MÉDIA:** o retry depois de um 401 reusa o `FormData` consumido; o blob é preservado.
  - Contrato Dart × TS e canal (C2-2) verdes.
- **C3 (escopo, registro, regressão; `j525-c3`, Claude Opus, exceção declarada): APROVADO**, com 5 não graves:
  - C3-R1: a pendência da "Versão do gestor" fica sem PR-alvo nem fatia;
  - C3-R2: o registro atribui aos testes do app uma prova (409/413/415) que eles não fazem;
  - C3-R3: o contrato omite dois motivos de 409 e os 401/403;
  - C3-R4: a divisão por arquivo de N = 28 está errada no diário;
  - C3-R5: o arquivo-base contradiz o catálogo (mesma classe do C1-A1).
  - Escopo limpo: 35 arquivos, PROIBIDO intocado; o instantâneo regenerado é igual byte a byte.

**Resultado do ciclo 1: REPROVADO** (2 de 3; a regra é unanimidade).

## Quedas (P6)
`revisoes/j525/00-quedas.md`: C1 e C2 caíram por limite do Codex, cada uma 11 min depois do início. A medição dizia 40% livres, e as duas cadeiras queimaram esses 40% em 11 min. Custo do redo: os sucessores DeepSeek re-executaram o item 1 pelo roteiro (P3).

## Triagem (fluxo rápido 10(3)3)
- **Conserta agora:**
  - C1-A2 e C1-D1 (graves);
  - C2-DP-02 e C2-DP-03 (altas: o comprovante não chega ao servidor; a classificação final é do topo).
- **Mesma leva (simples):** C1-A1/C3-R5 (nota da `RBAC_MATRIX`, já prevista no §D2 do plano), C1-A3, C2-DP-01, C3-R1 a C3-R4.
- **Pré-existente (§C7.1-ter(a)), pendência com dono:** a raiz efêmera da evidência móvel (`mobile-evidence-upload.ts` l.58–59, desde 17–18/06). Hoje está mascarada pelo 503 do antivírus em produção (item 27). Registrada como `P-UPLOAD-ARMAZENAMENTO-EFEMERO`, com nota no portão: o item 27 não fecha sem armazenamento durável.

## Próximos passos
Auditoria e plano do topo (defeito grave + decisão de desenho, 10(5)) → crítica de outro modelo → conserto único por dev que não achou → conferência de outro modelo → CI → merge → porteiro.

## Plano do conserto único — 10/11 05:24 SP
- **Plano:** `erp-pausa-2026-10-03/planos/B-RDV-COMPROVANTE-conserto-c1.md`, feito pelo workflow `plano-conserto-b-rdv-comprovante`, em Claude Opus, topo DECLARADO pelo §C7.6-bis. O topo `topo-j525-opus` auditou e planejou. Os verificadores adversariais `atk-backend-j525` e `atk-app` quebraram a versão 11 vezes, todas com prova. A versão final `final-j525-opus` resolveu as 11, duas delas graves: a compensação apagava o objeto de linha viva, e a recuperação recriava o item no servidor.
- **Crítica de outro modelo** (`crit-525-plano`, Codex 2):
  - **Rodada 1, VOLTA.** A-01 ALTA: a liberação soltava o envio de relatório cujo comprovante não fora tentado. A-02 MÉDIA: o portão aceitava S3 local.
  - **Correção** `topo2-j525-opus`, §13: liberação por ação mais isolamento por ação; lista fechada de endpoint AWS. Das 34 formas medidas, o portão recusa 28.
  - **Rodada 2, APROVADO.** Resolvidos por execução: retém só o afetado com 2 e 3 relatórios; aceita só as 6 formas AWS.
- **Dev:** `dev-525-c1` (Claude Opus, identidade nova; não achou, não planejou, não atacou), 18 fatias, ≈ 685 min, M = 102 com 42 mutações. **Conferência:** de outro modelo (Codex), pelo §12.14, com o roteiro das sondas dos ataques. **Cadeira refeita:** nenhuma a priori. Os gatilhos estão nos §8 e §12.16.

## Conserto e conferência (10(3)4–5) — 10/11 05:24–12:20 SP
- **Dev:** `dev-525-c1` (Claude Opus 5.5). Fatias F0–F8; head final `5759387875b167c2823e6e048c4d667b1b408e20`. Diário no ramo: `docs/revisoes/REENVIOS/B-RDV-COMPROVANTE-conserto-c1-dev.md`. O CI do head deu 16/16 `success` (rodadas `42818964407` e `42818976363`). Pelo resumo: `backend` 4775 testes, 0 falha e 2 pulados; `backend-postgres` 503/503; `frontend` 1676/1676; `antivirus` 8/8; `flutter` `+1067: All tests passed!`.
- **Conferência, parte 1:** `conf-525`, Codex 1 `gpt-5.6-sol`, outro modelo, 10:09–10:52. Os 11 achados da junta morreram no head e se reproduzem no objeto: C1-A2, C1-D1, C1-A3, C1-A1/C3-R5, C2-DP-01/02/03 e C3-R1..R4. Ela também matou 4 mutações (M-A2b, M-A2c, M-A2d e M-C4e) e passou as sondas dos ataques (§12.14 item 6), o CI pelo resumo e o escopo (35 arquivos no PERMITIDO). Achado novo: 0. Deu `NAO_CONFERIDO` só por incompletude: não executou as outras 38 mutações. Parecer: `revisoes/j525/conf-525.json`.
- **Conferência, parte 2:** `conf-525-b`, Codex 1, caiu por limite de 5 h às 11:14, depois da preparação e da amostra C1-A3. O sucessor `conf-525-b2` (Claude Opus 5.5, 11:16–12:20) trabalhou SEM cruzamento, declarado pelo §C7 item 11(2): o Codex 1 estava sem limite até 15:09 e o Codex 2 estava com a C2 do #527. As amostras P3 conferem: C1-A3 19/19; M-C4e vermelha no RR-C.4 (c). Das 38 mutações, 37 foram executadas uma por vez e todas morreram pela asserção do plano. A M-db5 ficou `nao_aplicavel`: o head usa `SET LOCAL lock_timeout`, e não o `set_config` que o plano manda apagar, porque o dev trocou a forma para passar no guard 3 de `auth-invariant-guards`. A proteção foi medida: o RR-db.5 cai sem a instrução. Achado novo: 0. Parecer: `revisoes/j525/conf-525-b2.json`.
- **Veredito conjunto: CONFERIDO.** 4 + 37 mutações mortas + 1 não aplicável justificada = 42, e nenhuma parte tem achado. Pelo 10(3)6, a próxima etapa é o merge, e depois o porteiro.
- **Papéis (§C7.4-bis):** acharam as cadeiras `j525-*`; planejaram `topo-j525-opus`, `final-j525-opus` e `topo2-j525-opus`; desenvolveu `dev-525-c1`; conferiram `conf-525`, `conf-525-b` (caído) e `conf-525-b2`. Nenhuma identidade ocupou dois papéis.
- **Atualização do ramo antes do merge (12:23):** a `main` exige ramo em dia. `gh pr update-branch` criou o head `74c8ae59` (merge da `main` `699e6e20`). Ele trouxe só 6 arquivos de registro (`agent-orchestration/**`), e a interseção com os 53 arquivos do PR é 0, medida por `git diff --name-only 57593878 74c8ae59`. A conferência segue válida; o merge espera o CI do head novo.
- **Merge (12:39:54 SP):** squash `2fab491a5c3d49a0a06a40fb4ad7e7b86ddef4bf`, ramo apagado. O head mergeado `74c8ae59` teve CI 16/16, conferido pelo resumo às 12:39: `backend` 4775 testes, 0 falha e 2 pulados; `backend-postgres` 503/503; `flutter` `+1067: All tests passed!`. Pelo 10(3)6, o porteiro vem a seguir.

## Porteiro pós-merge — 10/11 14:16 SP
- **Veredito:** LIBERADO COM RESSALVA; a reexecução local reproduziu 19/19 no backend e +17 no app, e o CI conferiu pelo resumo.
- **Ressalvas de registro:** corpo do PR corrigido com o estado final; pendências novas precisam de dono/PR-alvo, a T11d duplicada deve ser fundida e a dívida do teste de sessão do item 30 precisa ser reatribuída.
- **Ressalvas operacionais:** worktree e ramo local foram removidos; temporários pequenos ficaram por recusa de permissão, e a rodada do merge falhou apenas no build da imagem por erro de rede, com nova execução disparada.
