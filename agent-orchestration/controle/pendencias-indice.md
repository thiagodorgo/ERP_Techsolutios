# Indice de pendencias — GERADO, nao digitado

> Produzido por `agent-orchestration/controle/gerar-indice-pendencias.py`.
> **Se este arquivo divergir do `pendencias.md`, vale o `pendencias.md`** e o indice se regenera.

> **Este classificador ja foi REPROVADO por uma junta, e o que ele aprendeu esta escrito no
> cabecalho do script.** A primeira versao decidia "fechada" por substring no cabecalho, e isso
> confundia **vocabulario de dominio com vocabulario de status** (*"periodo **fechado**"* fechou
> uma pendencia) e **resolucao parcial com resolucao** (*"RESOLVIDO **PARCIAL**"* fechou uma
> entrada que lista quatro residuais abertos). Ambas eram a classe que esta rodada existe para
> exterminar, cometidas pelo bloco que existia para extermina-la.

## As regras, ditas por inteiro

1. **So conta status em contexto de status** — linha que comeca por `status:` ou `Estado:`.
   Texto corrido nao decide estado.
2. **Qualificador de parcialidade nunca fecha** (PARCIAL / PARCIALMENTE / RESIDUAL).
3. **A linha de status vence o cabecalho** — a linha e o campo canonico.
4. **Contradicao nao vira palpite.** Quando linha e cabecalho se opoem, o indice emite
   **`CONTRADITORIA`**. Decidir qual vence exige a **data** de cada afirmacao, que um regex nao
   tem — e chutar aqui foi exatamente o defeito anterior.
5. **Severidade material sinaliza o balde C.** Item CRITICA/ALTA/MEDIA marcado como diferido
   aparece **sinalizado**, para o dono ver que ha peso material sendo adiado.
6. **`DIFERIDO-LEVE` e agendamento, nao status** — diferida **continua ABERTA**.

## Placar

| | qtde |
|---|---:|
| Cabecalhos `## P-` | **860** |
| IDs distintos | 849 |
| **ABERTAS** | **656** |
| — das quais **diferidas** (balde C) | 61 |
| — das quais **ativas nesta rodada** | **595** |
| **CONTRADITORIAS** (exigem decisao) | **0** |
| FECHADAS | 200 |

> O placar conta **cabecalhos**, nao pendencias distintas: **860 cabecalhos para 849 IDs**, porque
> **6 IDs aparecem mais de uma vez** (emendas apensadas, §A2). Quem citar "N pendencias abertas"
> deve dizer qual das duas reguas esta usando.

## Diferidas com severidade MATERIAL — 12 (o dono deve olhar)

| ID | linha | severidade | titulo |
|---|--:|---|---|
| `P-019` | 228 | **MÉDIA** | P-019 - Ocorrencias residuais de persona demo "Marina Costa" fora do mapa (2026- |
| `P-026` | 332 | **MÉDIA** | P-026 - F11: front `UserRole` nao cobre os 9 papeis canonicos (menu visual aprox |
| `P-027` | 347 | **MÉDIA** | P-027 - F11: divergencias matriz x catalog + perms `purchase_orders:read`/`repor |
| `P-Ω3a` | 421 | **MÉDIA** | P-Ω3a (Ω3-a ServiceQuote) — pendências declaradas |
| `P-SAN-PROD-BOOTSTRAP` | 583 | **MÉDIA** | P-SAN-PROD-BOOTSTRAP - Bootstrap idempotente do 1o platform_admin real (Ω-INFRA- |
| `P-Ω4-FINANCE-READ-ORFA` | 1040 | **ALTA** | P-Ω4-FINANCE-READ-ORFA — /finance (dashboard) ainda gated pela órfã finance:read |
| `P-Ω4-3-INVOICE-ATOMIC` | 1093 | **MÉDIA** | P-Ω4-3-INVOICE-ATOMIC — Título↔carimbo não-atômico (BAIXA) |
| `P-Ω4-3-INVOICE-TOCTOU-DELETE` | 1115 | **MÉDIA** | P-Ω4-3-INVOICE-TOCTOU-DELETE — DELETE de item durante o faturamento infla o títu |
| `P-Ω4-8-DASHBOARD-FIDELITY` | 1433 | **MÉDIA** | P-Ω4-8-DASHBOARD-FIDELITY — Reduções de composição do dashboard vs financeiro.pn |
| `P-RBAC-GATING-MOCKSHELLS` | 1546 | **MÉDIA** | P-RBAC-GATING-MOCKSHELLS — gating RBAC das 3 telas-casca fica com a ligação a da |
| `P-PURCHASE-ORDERS-BACKEND-GATE` | 1738 | **MÉDIA** | P-PURCHASE-ORDERS-BACKEND-GATE - Gate server-side de Pedidos/Relatórios pendente |
| `P-CHK-SEED-DEMO-SUJO` | 2233 | **CRÍTICA** | P-CHK-SEED-DEMO-SUJO (2026-08-08) — dados de demonstração com nomes técnicos e l |

## SEM STATUS — nenhuma linha `status:`/`Estado:` (o indice NAO chuta) — 4

| ID | linha | severidade | dono | titulo |
|---|--:|---|---|---|
| `P-INFRA-RLS` | 502 | — | sim | P-INFRA-RLS (transversal — apontado pelo coordenador no Ω3-d) — RLS não enforçada em run |
| `P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS` | 7597 | ALTA | sim | P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS (2026-09-07) — leituras de plataforma sem ten |
| `P-O6R-07B-TESTE-DO-DEFAULT-CEGO-AO-EXPORT` | 10251 | MÉDIA | sim | P-O6R-07B-TESTE-DO-DEFAULT-CEGO-AO-EXPORT (2026-09-06) — teste reescreve a regra do defa |
| `P-B-SAN3-22-FRONT-TOKEN-E-3-APARENCIAS` | 11886 | — | **a atribuir** | P-B-SAN3-22-FRONT-TOKEN-E-3-APARENCIAS (2026-10-25) — consumidor web ainda não envia o t |

## CONTRADITORIAS — cabecalho e linha de status se opoem — 0

| ID | linha | severidade | dono | titulo |
|---|--:|---|---|---|

## ABERTAS · balde A — material — 292

| ID | linha | severidade | dono | titulo |
|---|--:|---|---|---|
| `P-Ω3F3B-UPDATE-VALIDA4` | 731 | MÉDIA | sim | P-Ω3F3B-UPDATE-VALIDA4 - Validação #4 depende da imutabilidade de customer/service no up |
| `P-Ω4-3-CURRENCY-BRL` | 1105 | MÉDIA | sim | P-Ω4-3-CURRENCY-BRL — Item da OS aceita moeda ≠ BRL, mas faturar exige BRL (MÉDIA-BAIXA) |
| `P-GOLIVE-VALIDATE-CONSTRAINT` | 1502 | MÉDIA | sim | P-GOLIVE-VALIDATE-CONSTRAINT — Operacionalizar VALIDATE CONSTRAINT do CHECK do cancelame |
| `P-AUDIT-FOLLOWUPS` | 1694 | MÉDIA | **a atribuir** | P-AUDIT-FOLLOWUPS - Melhorias de Auditoria (2026-07-20, PR-SCALE-3, todas BAIXA/MEDIA) |
| `P-CHK-PRISMA-CLIENT-TYPING` | 1860 | MÉDIA | sim | P-CHK-PRISMA-CLIENT-TYPING (2026-08-02) — repo prisma de checklist descarta os tipos ger |
| `P-MOBILE-BANNER-INTEGRACAO` | 2066 | MÉDIA | **a atribuir** | P-MOBILE-BANNER-INTEGRACAO (2026-08-06) — banner "Integração remota ainda não ativa" é E |
| `P-CHK-CHIPS-SEM-CONSUMIDOR` | 2174 | MÉDIA | **a atribuir** | P-CHK-CHIPS-SEM-CONSUMIDOR (2026-08-08) — inspector grava config que NINGUÉM lê (MÉDIA,  |
| `P-JUNTA-LIMPEZA-BASE-VIVA` | 2213 | MÉDIA | **a atribuir** | P-JUNTA-LIMPEZA-BASE-VIVA (2026-08-08) — 2º incidente de limpeza ad-hoc por subagente na |
| `P-O6R-B04` | 2967 | ALTA | sim | P-O6R-B04 (2026-08-14) — `fix/inventory-consistency` — Ω6R-DAT-002, DAT-003 (2 P0) + QUA |
| `P-O6R-B07` | 3148 | ALTA | sim | P-O6R-B07 (2026-08-14) — `fix/authorization-and-uploads` — Ω6R-SEC-002 (P0) + SEC-003, S |
| `P-O6R-B07-APPROVAL-BY-POLICY` | 3230 | MÉDIA | **a atribuir** | P-O6R-B07-APPROVAL-BY-POLICY (2026-09-02) — `finance`/`inventory` sem `work_orders:appro |
| `P-O6R-B11` | 3427 | ALTA | sim | P-O6R-B11 (2026-08-14) — `fix/mobile-work-order-contracts` — Ω6R-QUA-004, QUA-005 (2 P1) |
| `P-O6R-B01-RELIGACAO-SEM-REMEDIO` | 3914 | ALTA | sim | P-O6R-B01-RELIGACAO-SEM-REMEDIO (2026-08-19) — **ALTA** · assimetria sem via de saída |
| `P-O6R-B01-LOGERROR-MORTO` | 3938 | ALTA | sim | P-O6R-B01-LOGERROR-MORTO (2026-08-19) — **ALTA (observabilidade)** · a falha da fonte de |
| `P-ARNES-RLS-TEST-FORA-DO-SWEEP` | 4036 | MÉDIA | sim | P-ARNES-RLS-TEST-FORA-DO-SWEEP (2026-08-28 — B-O6R-ARNES, C-C) — MÉDIA · decisão CONSCIE |
| `P-GOV-MAIN-SEM-PROTECAO` | 5041 | MÉDIA | sim | P-GOV-MAIN-SEM-PROTECAO — ATUALIZAÇÃO (2026-08-25): ruleset INSTALADO |
| `P-SAN2-LEITURA-DAS-79` | 5074 | MÉDIA | sim | P-SAN2-LEITURA-DAS-79 (2026-08-29) — MÉDIA · **Dono:** bloco próprio, DEPOIS do ciclo 5  |
| `P-SAN2-2-INDICE-DONO-SEMPRE-SIM` | 5252 | MÉDIA | sim | P-SAN2-2-INDICE-DONO-SEMPRE-SIM (2026-08-30) — MÉDIA · a coluna "dono" do índice diz **s |
| `P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY` | 5355 | MÉDIA | sim | P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY (2026-08-30) — MÉDIA · o painel não renderiza `releas |
| `P-OBITUARIO-DERIVADO-DO-DIRETORIO` | 5456 | MÉDIA | sim | P-OBITUARIO-DERIVADO-DO-DIRETORIO (2026-08-31) — MÉDIA · o `OBITUARIO-IDENTIDADES.md` co |
| `P-ARNES-SWEEP-DEPENDE-DA-DISCIPLINA-DO-OPERADOR` | 5792 | MÉDIA | sim | P-ARNES-SWEEP-DEPENDE-DA-DISCIPLINA-DO-OPERADOR (2026-08-31) — MÉDIA · "as 68 órfãs da b |
| `P-O6R-B02-CRASH-NO-LOAD-SEM-SKIP` | 6289 | MÉDIA | sim | P-O6R-B02-CRASH-NO-LOAD-SEM-SKIP (2026-09-02 — carve-out do CP-3 do ciclo 5) — MÉDIA · e |
| `P-JUNTA-RECURSO-EFEMERO-POR-BLOCO` | 6374 | MÉDIA | sim | P-JUNTA-RECURSO-EFEMERO-POR-BLOCO (2026-09-04 — incidente de terreno entre sessões simul |
| `P-METODO-FERRAMENTA-SINTATICA-COMO-PROVA` | 6510 | ALTA | sim | P-METODO-FERRAMENTA-SINTATICA-COMO-PROVA (2026-09-04 — dado de método das rodadas Ω6R si |
| `P-O6R-B07-RATE-LIMIT-DISTRIBUIDO` | 6645 | MÉDIA | sim | P-O6R-B07-RATE-LIMIT-DISTRIBUIDO (2026-09-02) — freio de login por IP é IN-PROCESS — MÉD |
| `P-AUTH-KDF-ROTACAO-V2` | 6871 | MÉDIA | sim | P-AUTH-KDF-ROTACAO-V2 (registro 3/7, 2026-09-03) — rotação de KDF `v=2` é promessa sem m |
| `P-C3-DOIS-PRS-SEM-KPI` | 6979 | MÉDIA | sim | P-C3-DOIS-PRS-SEM-KPI (2026-09-05 — achado da sessão irmã, conferido por execução) — MÉD |
| `P-DERIVADO-ESQUECIDO` | 7011 | MÉDIA | sim | P-DERIVADO-ESQUECIDO (2026-09-05 — três instâncias em três PRs consecutivos meus) — MÉDI |
| `P-GOV-REGISTRO-PURO-QUORUM` | 7111 | MÉDIA | sim | P-GOV-REGISTRO-PURO-QUORUM (2026-09-05) — MÉDIA · PR de registro puro: junta de 3 ou uma |
| `P-O6R-B07B-SCANNER-AV-REAL` | 7206 | ALTA | sim | P-O6R-B07B-SCANNER-AV-REAL (2026-09-06) — produção e staging recusam TODO upload até hav |
| `P-AVREAL-RETRY-AFTER` | 7238 | MÉDIA | sim | P-AVREAL-RETRY-AFTER (2026-10-31) — 503 do scanner sem `Retry-After` — MÉDIA |
| `P-O6R-B07B-ATTACHMENT-STORED-DO-CLIENTE` | 7284 | ALTA | sim | P-O6R-B07B-ATTACHMENT-STORED-DO-CLIENTE (2026-09-06) — linha `attachment stored` com cha |
| `P-O6R-B07B-CHECKLIST-JSON-FILEURL` | 7325 | MÉDIA | sim | P-O6R-B07B-CHECKLIST-JSON-FILEURL (2026-09-06) — ramo JSON do anexo de checklist aceita  |
| `P-O6R-B07B-DATAURI-NO-VALUE` | 7339 | MÉDIA | sim | P-O6R-B07B-DATAURI-NO-VALUE (2026-09-06) — data-URI base64 persistido no `value` de resp |
| `P-O6R-B07B-MOBILE-RETRY-PERMANENTE` | 7354 | MÉDIA | sim | P-O6R-B07B-MOBILE-RETRY-PERMANENTE (2026-09-06) — o app re-tenta para sempre o que foi r |
| `P-O6R-B06-RECONCILE-BLOQUEADO` | 7464 | ALTA | sim | P-O6R-B06-RECONCILE-BLOQUEADO (2026-09-07) — o script de reparação NÃO foi entregue; a j |
| `P-O6R-B06-DIVERGENCIA-MOBILE-NAO-FATURADA` | 7516 | MÉDIA | sim | P-O6R-B06-DIVERGENCIA-MOBILE-NAO-FATURADA (2026-09-07) — a trilha de divergência do app  |
| `P-O6R-B06-AGGREGATE-DAILY-SEM-AGENDA` | 7624 | MÉDIA | sim | P-O6R-B06-AGGREGATE-DAILY-SEM-AGENDA (2026-09-07) — ninguém enfileira o job da projeção  |
| `P-O6R-B06-RATEIO-CURSOR-100K` | 7642 | ALTA | sim | P-O6R-B06-RATEIO-CURSOR-100K (2026-09-07) — o teto do rateio ficou ALTO, mas continua se |
| `P-GOV-AUDITOR-FORA-DA-CI` | 7871 | MÉDIA | sim | P-GOV-AUDITOR-FORA-DA-CI (2026-09-07) — o auditor de elenco e o `--check` das skills são |
| `P-GOV-VEREDITO-SEM-PARSER` | 7914 | ALTA | sim | P-GOV-VEREDITO-SEM-PARSER (2026-09-07) — veredito de junta é PROSA, e nenhum gate o lê — |
| `P-GOV-BASH-EM-QUEM-JULGA` | 7945 | ALTA | sim | P-GOV-BASH-EM-QUEM-JULGA (2026-09-07) — `Bash` dá poder de escrita a todo papel que julg |
| `P-GOV-ESPELHO-CONTRATO-SEM-GUARD` | 7994 | MÉDIA | sim | P-GOV-ESPELHO-CONTRATO-SEM-GUARD (2026-09-07) — `CLAUDE.md` e `AGENTS.md` podem divergir |
| `P-GOV-KPI-DISPLAY-SEM-GUARD` | 8052 | MÉDIA | sim | P-GOV-KPI-DISPLAY-SEM-GUARD (2026-09-08) — nenhum guard compara o CARD com o `value` do  |
| `P-GOV-C10-ENCERRADO` | 8080 | MÉDIA | sim | P-GOV-C10-ENCERRADO (2026-09-08) — a checagem C10 mede PESO e não sabe se o bloco encerr |
| `P-GOV-AUDITOR-SEM-CHECAGEM-DE-LINK` | 8108 | MÉDIA | sim | P-GOV-AUDITOR-SEM-CHECAGEM-DE-LINK (2026-09-08) — o auditor de elenco DEIXOU de conferir |
| `P-GOV-ESGOTADO-SEM-TESTE` | 8190 | MÉDIA | sim | P-GOV-ESGOTADO-SEM-TESTE (2026-09-08) — "modelo esgotado" é declarado, não provado — MÉD |
| `P-GOV-RECUSA-CANCELA-ACUSACAO` | 8211 | MÉDIA | sim | P-GOV-RECUSA-CANCELA-ACUSACAO (2026-09-08) — a chave excluída da recusa cancela acusação |
| `P-GOV-DEFAULT-DENY-POR-NOME-BASE` | 8226 | MÉDIA | sim | P-GOV-DEFAULT-DENY-POR-NOME-BASE (2026-09-08) — a allowlist de escrita é chaveada pelo A |
| `P-GOV-MODELO-FIXADO-SEM-MECANISMO` | 8240 | MÉDIA | sim | P-GOV-MODELO-FIXADO-SEM-MECANISMO (2026-09-08) — `MODELO_FIXADO` é lista de obrigação se |
| `P-GOV-CAMINHO-REPO-SESSAO` | 8270 | ALTA | sim | P-GOV-CAMINHO-REPO-SESSAO (2026-09-08) — FECHADA em 2026-09-08 por `D-MEDIR-NA-REF-ALVO` |
| `P-O6R-SUITES-DB-SEM-TEARDOWN` | 8337 | MÉDIA | sim | P-O6R-SUITES-DB-SEM-TEARDOWN (2026-09-09) — execuções consecutivas de `npm test` contra  |
| `P-SAN3-INDICE-SEVERIDADE-POR-MENCAO` | 8450 | CRÍTICA | sim | P-SAN3-INDICE-SEVERIDADE-POR-MENCAO (2026-09-11) — a coluna de severidade do índice é a  |
| `P-SAN3-INDICE-SO-PRIMEIRA-LINHA-DE-STATUS` | 8482 | MÉDIA | sim | P-SAN3-INDICE-SO-PRIMEIRA-LINHA-DE-STATUS (2026-09-11) — o índice lê só a primeira linha |
| `P-SAN3-FLIPS-DE-REGISTRO` | 8522 | MÉDIA | sim | P-SAN3-FLIPS-DE-REGISTRO (2026-09-11) — conserto feito fora da linha de status nunca fec |
| `P-DONO-CLOUD-BILLING-ESCOPO` | 8581 | MÉDIA | sim | P-DONO-CLOUD-BILLING-ESCOPO (2026-09-11) — Cobrança de nuvem calculada nunca vira fatura |
| `P-WEB-FIN-CHEQUE-FECHAMENTO-COMISSAO-SEM-TELA` | 8617 | MÉDIA | sim | P-WEB-FIN-CHEQUE-FECHAMENTO-COMISSAO-SEM-TELA (2026-09-11) — Cheques, fechamento de perí |
| `P-CHK-APLICABILIDADE-SEM-ROTA` | 8635 | MÉDIA | sim | P-CHK-APLICABILIDADE-SEM-ROTA (2026-09-11) — Motor de aplicabilidade de checklist existe |
| `P-WEB-CHK-EXECUCOES-INEXISTENTES` | 8652 | MÉDIA | sim | P-WEB-CHK-EXECUCOES-INEXISTENTES (2026-09-11) — "Ver execuções" leva à lista de modelos; |
| `P-WEB-ROTAS-SEM-PORTA` | 8705 | MÉDIA | sim | P-WEB-ROTAS-SEM-PORTA (2026-09-11) — Rotas vivas sem menu/link; provisionamento de módul |
| `P-WEB-GATE-MODULO-INCOMPLETO` | 8739 | ALTA | sim | P-WEB-GATE-MODULO-INCOMPLETO (2026-09-11) — 27 itens do menu fora do gate de módulo; bac |
| `P-MOBILE-PRESTADOR-SEM-PORTA` | 8785 | ALTA | sim | P-MOBILE-PRESTADOR-SEM-PORTA (2026-09-11) — Fluxo Prestador (diagnóstico, execução, mate |
| `P-MOBILE-CONCLUSAO-SEM-PORTA` | 8802 | MÉDIA | sim | P-MOBILE-CONCLUSAO-SEM-PORTA (2026-09-11) — Tela de Conclusão, onde a comissão aparece,  |
| `P-MOBILE-CATALOGO-MODULOS-INERTE` | 8819 | MÉDIA | sim | P-MOBILE-CATALOGO-MODULOS-INERTE (2026-09-11) — Catálogo de módulos nunca renderiza; Est |
| `P-MOBILE-LGPD-GPS-SEM-PORTA` | 8836 | ALTA | sim | P-MOBILE-LGPD-GPS-SEM-PORTA (2026-09-11) — Consentimento LGPD de GPS nunca pode ser dado |
| `P-MOBILE-GUINCHO-ENTREGA-INALCANCAVEL` | 8853 | ALTA | sim | P-MOBILE-GUINCHO-ENTREGA-INALCANCAVEL (2026-09-11) — Perna de entrega do guincho nunca a |
| `P-MOBILE-FILA-OS-NAO-DRENADA` | 8887 | ALTA | sim | P-MOBILE-FILA-OS-NAO-DRENADA (2026-09-11) — "Pedir aprovação" e "não consigo iniciar" en |
| `P-MOBILE-ESTOQUE-TECNICO-FABRICADO` | 8904 | ALTA | sim | P-MOBILE-ESTOQUE-TECNICO-FABRICADO (2026-09-11) — Estoque do técnico é catálogo semente  |
| `P-MOBILE-TESTE-ALCANCABILIDADE` | 8999 | MÉDIA | sim | P-MOBILE-TESTE-ALCANCABILIDADE (2026-09-11) — Nenhum teste prova que toda rota do app te |
| `P-MOBILE-DESPACHO-SEM-PUSH` | 9016 | MÉDIA | sim | P-MOBILE-DESPACHO-SEM-PUSH (2026-09-11) — Despacho só chega ao técnico se ele abrir e at |
| `P-NOTIF-SEM-CANAL-EXTERNO` | 9033 | MÉDIA | sim | P-NOTIF-SEM-CANAL-EXTERNO (2026-09-11) — Notificação só grava linha; não há canal de e-m |
| `P-FLEET-ALERTAS-SEM-AGENDADOR` | 9084 | MÉDIA | sim | P-FLEET-ALERTAS-SEM-AGENDADOR (2026-09-11) — Alertas de frota só disparam por botão; nen |
| `P-MOBILE-CHECKIN-CONFERE-CODIGO-DA-OS` | 9101 | MÉDIA | sim | P-MOBILE-CHECKIN-CONFERE-CODIGO-DA-OS (2026-09-11) — Check-in pede dígitos da placa e co |
| `P-KPI-MVP-REGUA-CODIGO-ESCRITO` | 9172 | MÉDIA | sim | P-KPI-MVP-REGUA-CODIGO-ESCRITO (2026-09-11) — `mvp_demo 99`/`mvp_vendavel 88` medem códi |
| `P-DOC-GO-LIVE-READINESS-VENCIDO` | 9189 | MÉDIA | sim | P-DOC-GO-LIVE-READINESS-VENCIDO (2026-09-11) — Documento diz "nenhum código bloqueia o g |
| `P-GOV-C28-REGULARIZACAO-NAO-ESCRITA` | 9240 | MÉDIA | sim | P-GOV-C28-REGULARIZACAO-NAO-ESCRITA (2026-09-11) — §C2.8 trava todo bloco sem parecer e  |
| `P-GOV-DEVOPS-ESCREVE-E-VOTA` | 9274 | MÉDIA | sim | P-GOV-DEVOPS-ESCREVE-E-VOTA (2026-09-11) — `agente-devops-provisionador` pode escrever e |
| `P-GOV-INSPETOR-RECEITAS-1` | 9291 | MÉDIA | sim | P-GOV-INSPETOR-RECEITAS-1.1-E-3.3 (2026-09-11) — Receitas do inspetor: md5 cru, falso ve |
| `P-GOV-SKILL-BACKEND-REVIEW-MENTE-SOBRE-CI` | 9308 | MÉDIA | sim | P-GOV-SKILL-BACKEND-REVIEW-MENTE-SOBRE-CI (2026-09-11) — Skill afirma que teste `-db` se |
| `P-GOV-AUDITOR-RAIZ-POR-IMPORT-META` | 9325 | MÉDIA | sim | P-GOV-AUDITOR-RAIZ-POR-IMPORT-META (2026-09-11) — Auditor de elenco só audita a árvore o |
| `P-GOV-SYNC-AGENTS-ARGV-FROUXO` | 9342 | MÉDIA | sim | P-GOV-SYNC-AGENTS-ARGV-FROUXO (2026-09-11) — `sync-agent-agents.mjs` com argumento desco |
| `P-GOV-SEGUNDO-CONTRATO-NO-HANDOFF` | 9359 | MÉDIA | sim | P-GOV-SEGUNDO-CONTRATO-NO-HANDOFF (2026-09-11) — Segundo "contrato de execução" na ref,  |
| `P-SAN3-ROTEIRO-DEMO-OPERACAO` | 9444 | MÉDIA | sim | P-SAN3-ROTEIRO-DEMO-OPERACAO (2026-09-11) — não existe roteiro de demonstração e operaçã |
| `P-WEB-FATURAR-OS-SEM-TELA` | 9460 | ALTA | sim | P-WEB-FATURAR-OS-SEM-TELA (2026-09-12) — a web não fatura OS: a rota existe e nenhuma te |
| `P-SAN3-CHECKLIST-RUN-SEM-ESCOPO-POR-OBJETO` | 9470 | ALTA | sim | P-SAN3-CHECKLIST-RUN-SEM-ESCOPO-POR-OBJETO (2026-09-12) — técnico responde, conclui e dá |
| `P-FIELD-LOCATION-SEM-CONSENTIMENTO-NO-BACKEND` | 9480 | ALTA | sim | P-FIELD-LOCATION-SEM-CONSENTIMENTO-NO-BACKEND (2026-09-12) — o backend grava a posição d |
| `P-NAV-MODULOS-NAO-RESOLVIDOS-LIBERA-MENU` | 9493 | MÉDIA | sim | P-NAV-MODULOS-NAO-RESOLVIDOS-LIBERA-MENU (2026-09-12) — lista de módulos não resolvida l |
| `P-SAN3-INDICE-ITEM-DO-GATE-SO-PELA-HOSPEDEIRA` | 9513 | MÉDIA | sim | P-SAN3-INDICE-ITEM-DO-GATE-SO-PELA-HOSPEDEIRA (2026-09-12) — dois itens do gate só apare |
| `P-SAN3-01-DESPACHO-FORMS-SEM-CATCH` | 9543 | MÉDIA | sim | P-SAN3-01-DESPACHO-FORMS-SEM-CATCH (2026-09-17) — formulários de despacho sem `catch`: r |
| `P-SAN3-01-ORCAMENTO-LINHAS-TOTAL-ZERO` | 9563 | MÉDIA | sim | P-SAN3-01-ORCAMENTO-LINHAS-TOTAL-ZERO (2026-09-17) — as linhas do orçamento falham e a a |
| `P-SAN3-01-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS` | 9608 | MÉDIA | sim | P-SAN3-01-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS (2026-09-17) — o alerta de erro da tela  |
| `P-SAN3-01-E2E-LOGIN-DEFASADO` | 9617 | ALTA | sim | P-SAN3-01-E2E-LOGIN-DEFASADO (2026-09-17) — os 13 casos do e2e rastreado morrem no login |
| `P-SAN3-PAINEL-TRILHA-DO-GATE` | 9635 | MÉDIA | sim | P-SAN3-PAINEL-TRILHA-DO-GATE (2026-09-18) — o painel de KPI não acompanha o gate da vers |
| `P-SAN3-01-DASHBOARD-DESPACHOS-ERRO-COMO-VAZIO` | 9644 | MÉDIA | sim | P-SAN3-01-DASHBOARD-DESPACHOS-ERRO-COMO-VAZIO (2026-09-18) — o Dashboard mostra o selo t |
| `P-SAN3-01-LOGISTICS-FICCAO-ROTEADA` | 9653 | MÉDIA | sim | P-SAN3-01-LOGISTICS-FICCAO-ROTEADA (2026-09-18) — a rota viva `/logistics` serve OS e at |
| `P-SAN3-01-INVENTARIO-FECHAMENTO-CONTAGEM-FABRICADO` | 9662 | MÉDIA | sim | P-SAN3-01-INVENTARIO-FECHAMENTO-CONTAGEM-FABRICADO (2026-09-18) — fechar contagem cíclic |
| `P-WEB-FONTE-INTER-NAO-CARREGADA` | 9785 | MÉDIA | sim | P-WEB-FONTE-INTER-NAO-CARREGADA (2026-09-19) — a web inteira renderiza em Segoe UI, e o  |
| `P-SAN3-04A-CHECKLIST-ESCOPO-ESTOQUE` | 9803 | MÉDIA | sim | P-SAN3-04A-CHECKLIST-ESCOPO-ESTOQUE (2026-09-18) — o Estoque lê vistorias mas não respon |
| `P-SAN3-04A-MASTER-DATA-EDIT-SCOPED` | 9811 | MÉDIA | sim | P-SAN3-04A-MASTER-DATA-EDIT-SCOPED (2026-09-18) — Operador e Estoque não editam cadastro |
| `P-SAN3-04A-MATRIZ-L37-X-BULLETS` | 9819 | MÉDIA | sim | P-SAN3-04A-MATRIZ-L37-X-BULLETS (2026-09-18) — a matriz se contradiz sobre Financeiro e  |
| `P-SAN3-04A-SUPPORT-SEM-POLITICA` | 9828 | MÉDIA | sim | P-SAN3-04A-SUPPORT-SEM-POLITICA (2026-09-18) — o Suporte lê seis áreas sem a política de |
| `P-SAN3-04A-DASHBOARD-SCOPED` | 9836 | MÉDIA | sim | P-SAN3-04A-DASHBOARD-SCOPED (2026-09-18) — o painel do Técnico de Campo é da organização |
| `P-SAN3-04A-CHECKLIST-POR-ESCOPO-ESCRITORIO` | 9845 | MÉDIA | sim | P-SAN3-04A-CHECKLIST-POR-ESCOPO-ESCRITORIO (2026-09-18) — Gestor e Operador concluem vis |
| `P-SAN3-04A-AUDIT-SCOPED` | 9853 | MÉDIA | sim | P-SAN3-04A-AUDIT-SCOPED (2026-09-18) — o Gestor lê a auditoria da organização inteira, n |
| `P-SAN3-04A-PERMISSOES-ORFAS` | 9871 | MÉDIA | sim | P-SAN3-04A-PERMISSOES-ORFAS (2026-09-18) — 25 permissões do catálogo que nenhuma rota co |
| `P-SAN3-04A-MENU-RESIDUAL` | 9889 | MÉDIA | sim | P-SAN3-04A-MENU-RESIDUAL (2026-09-18) — três itens do menu levam a "acesso não permitido |
| `P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS` | 9913 | MÉDIA | sim | P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS (2026-09-18) — depois de trocar de organ |
| `P-SAN3-04A-NAVIGATION-MATRIX-DEFASADA` | 9922 | ALTA | sim | P-SAN3-04A-NAVIGATION-MATRIX-DEFASADA (2026-09-18) — `docs/navigation-matrix.md` diverge |
| `P-AUTH-CLAIMS-SEM-TENANT-ROLE` | 9932 | MÉDIA | sim | P-AUTH-CLAIMS-SEM-TENANT-ROLE (2026-09-18) — o JWT não carrega `tenant_role`/`tenant_rol |
| `P-SAN3-B1-FLUTTER-CI-X-MAQUINA-DO-DONO` | 9942 | MÉDIA | sim | P-SAN3-B1-FLUTTER-CI-X-MAQUINA-DO-DONO (2026-09-21) — o Flutter do CI (3.47.5) e o da má |
| `P-SAN3-00-RESIDUO-ELENCO-DEMO-INVESTIDOR` | 9952 | MÉDIA | sim | P-SAN3-00-RESIDUO-ELENCO-DEMO-INVESTIDOR (2026-09-21) — 33 identidades aposentadas e/ou  |
| `P-GOV-CICLOS-CORPOS-ORFAOS` | 9978 | MÉDIA | sim | P-GOV-CICLOS-CORPOS-ORFAOS (2026-09-28) — cinco regras vivas fora do contrato ainda fala |
| `P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS` | 9993 | MÉDIA | sim | P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS (2026-09-28) — o gatilho da auditoria do ciclo 3 o |
| `P-GOV-SEM-TETO-AJUSTES-DA-JUNTA` | 10008 | MÉDIA | sim | P-GOV-SEM-TETO-AJUSTES-DA-JUNTA (2026-09-28) — quatro ajustes da junta do B-GOV-SEM-TETO |
| `P-GOV-CORPOS-EM-VOO-COM-TETO-REVOGADO` | 10032 | MÉDIA | sim | P-GOV-CORPOS-EM-VOO-COM-TETO-REVOGADO (2026-09-28) — seis corpos de jurado dos PRs #388  |
| `P-GOV-INSPETOR-CICLO-DECLARADO-NAO-DERIVADO` | 10044 | MÉDIA | sim | P-GOV-INSPETOR-CICLO-DECLARADO-NAO-DERIVADO (2026-09-28) — a trava do ciclo 4 lê o númer |
| `P-SAN3-01B-FIACAO-DO-CREATE-TEXTUAL` | 10117 | MÉDIA | sim | P-SAN3-01B-FIACAO-DO-CREATE-TEXTUAL (2026-10-02) — a página de criar OS pode engolir a m |
| `P-SAN3-01B-MOCK-POR-CONVENCAO-DE-NOME` | 10148 | MÉDIA | sim | P-SAN3-01B-MOCK-POR-CONVENCAO-DE-NOME (2026-10-02) — o guard decide pelo NOME do arquivo |
| `P-SAN3-01B-DASHBOARD-NOVA-OS-SEM-GATE` | 10168 | MÉDIA | sim | P-SAN3-01B-DASHBOARD-NOVA-OS-SEM-GATE (2026-10-02) — outro botão "Nova OS" no Dashboard  |
| `P-SAN3-05-SUITE-DB-SOB-PAPEL-REAL` | 10201 | ALTA | sim | P-SAN3-05-SUITE-DB-SOB-PAPEL-REAL (2026-10-03) — suíte de banco ainda roda majoritariame |
| `P-SAN3-05-RUNNER-SEM-TIMEOUT` | 10210 | MÉDIA | sim | P-SAN3-05-RUNNER-SEM-TIMEOUT (2026-10-09) — runner e job backend sem teto por arquivo —  |
| `P-SAN3-05-LOCAL-AUTH-WORK-SEM-GUC` | 10217 | MÉDIA | sim | P-SAN3-05-LOCAL-AUTH-WORK-SEM-GUC (2026-10-09) — default de LocalAuthLoginService pode e |
| `P-SAN3-05-POSTURA-NO-HEALTH` | 10232 | MÉDIA | sim | P-SAN3-05-POSTURA-NO-HEALTH (2026-10-03) — postura do papel no readiness — MÉDIA |
| `P-SAN3-05-SECURITY-DEFINER-INVENTARIO` | 10238 | ALTA | sim | P-SAN3-05-SECURITY-DEFINER-INVENTARIO (2026-10-03) — funções de dono que escapa — ALTA |
| `P-SAN3-05-STAGING-CD-AMARRACAO` | 10245 | ALTA | sim | P-SAN3-05-STAGING-CD-AMARRACAO (2026-10-03) — CD de staging depende dos atos de provisão |
| `P-WO-LISTA-SO-20-MAIS-RECENTES` | 10343 | MÉDIA | sim | P-WO-LISTA-SO-20-MAIS-RECENTES (2026-10-08) — a lista de OS só carrega as 20 mais recent |
| `P-WO-PRIORIDADE-MEDIA-SEM-ACENTO` | 10366 | MÉDIA | sim | P-WO-PRIORIDADE-MEDIA-SEM-ACENTO (2026-10-08) — "Media" sem acento em rótulos de priorid |
| `P-SAN3-05-ATO2-CINCO-TAREFAS` | 10386 | ALTA | sim | P-SAN3-05-ATO2-CINCO-TAREFAS (2026-10-08) — medir as 5 tarefas automáticas sob o papel e |
| `P-INDICE-PENDENCIAS-CLASSIFICADOR` | 10425 | MÉDIA | sim | P-INDICE-PENDENCIAS-CLASSIFICADOR (2026-10-08) — o gerador do índice erra severidade e i |
| `P-SAN3-05-RATCHET-INST-SOME` | 10434 | MÉDIA | sim | P-SAN3-05-RATCHET-INST-SOME (2026-10-09) — uma instanciação reconhecida libera a classe  |
| `P-SAN3-05-IGUALDADE-CATALOGO-L0-SEM-TESTE` | 10441 | MÉDIA | sim | P-SAN3-05-IGUALDADE-CATALOGO-L0-SEM-TESTE (2026-10-09) — igualdade catálogo↔L0 não é uma |
| `P-SAN3-05-GUARDA-FILHOS-LISTA-FECHADA` | 10448 | MÉDIA | sim | P-SAN3-05-GUARDA-FILHOS-LISTA-FECHADA (2026-10-09) — T14c conta grafias em vez de fechar |
| `P-SAN3-05-CENARIO-JOB-CLOUD-CHARGES` | 10455 | MÉDIA | sim | P-SAN3-05-CENARIO-JOB-CLOUD-CHARGES (2026-10-09) — cenário lê efeito da rota, não do job |
| `P-SAN3-05-TIMEOUT-MATA-SO-O-BASH` | 10462 | MÉDIA | sim | P-SAN3-05-TIMEOUT-MATA-SO-O-BASH (2026-10-09) — timeout do helper não mata o grupo — MÉD |
| `P-SAN3-05-REGRA-EM-TABELA` | 10490 | ALTA | sim | P-SAN3-05-REGRA-EM-TABELA (2026-10-09) — regra INSTEAD/ALSO em tabela escapa da trava —  |
| `P-SAN3-06B-TENANTS-BACKEND-EM-MEMORIA` | 10532 | ALTA | sim | P-SAN3-06B-TENANTS-BACKEND-EM-MEMORIA (2026-10-09) — organizações da plataforma ainda nã |
| `P-SAN3-06B-MODULOS-DA-ORG-SEM-PORTA-E-SEM-PERSISTENCIA` | 10541 | MÉDIA | sim | P-SAN3-06B-MODULOS-DA-ORG-SEM-PORTA-E-SEM-PERSISTENCIA (2026-10-09) — módulos por organi |
| `P-SAN3-06B-AUDITORIA-GLOBAL-SEM-ENDPOINT` | 10548 | MÉDIA | sim | P-SAN3-06B-AUDITORIA-GLOBAL-SEM-ENDPOINT (2026-10-09) — trilha cross-org sem fonte — MÉD |
| `P-SAN3-06B-CONFIG-PLATAFORMA-SEM-BACKEND` | 10555 | MÉDIA | sim | P-SAN3-06B-CONFIG-PLATAFORMA-SEM-BACKEND (2026-10-09) — configuração global sem autorida |
| `P-SAN3-06B-APIS-CREDENCIAIS-SEM-BACKEND` | 10562 | MÉDIA | sim | P-SAN3-06B-APIS-CREDENCIAIS-SEM-BACKEND (2026-10-09) — credenciais administrativas sem c |
| `P-SAN3-06B-CLOUD-BILLING-ESCRITA` | 10577 | ALTA | sim | P-SAN3-06B-CLOUD-BILLING-ESCRITA (2026-10-09) — escrita cloud aguarda definição de produ |
| `P-SAN3-06B-SHELL-PLATAFORMA-FANTASMA` | 10585 | MÉDIA | sim | P-SAN3-06B-SHELL-PLATAFORMA-FANTASMA (2026-10-09) — shell contém controles estáticos — M |
| `P-SAN3-06B-MENU-PLATAFORMA-TRES-FONTES` | 10592 | MÉDIA | sim | P-SAN3-06B-MENU-PLATAFORMA-TRES-FONTES (2026-10-09) — menu ainda possui três registros d |
| `P-CI-DOCKER-HUB-LIMITE` | 10613 | MÉDIA | sim | P-CI-DOCKER-HUB-LIMITE (2026-10-09) — o CI baixa Postgres e Redis do Docker Hub sem logi |
| `P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD` | 10649 | ALTA | sim | P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD (2026-09-18) — o censo de duplicatas do estoque  |
| `P-O6R-B04-CONSUMIDORES-503` | 10666 | MÉDIA | sim | P-O6R-B04-CONSUMIDORES-503 (2026-09-18) — o 503 de estoque e de contagem é contrato novo |
| `P-O6R-B04-UI-STATUS-FECHANDO` | 10676 | MÉDIA | sim | P-O6R-B04-UI-STATUS-FECHANDO (2026-09-18) — a web não conhece o status "fechando" nem os |
| `P-O6R-B04-OPEN-NO-TETO-DO-TIMEOUT` | 10685 | MÉDIA | sim | P-O6R-B04-OPEN-NO-TETO-DO-TIMEOUT (2026-09-20) — a abertura de contagem cresce com N den |
| `P-DEPLOY-RUNBOOK-SEM-PRE-CONDICAO-DO-CENSO` | 10704 | MÉDIA | sim | P-DEPLOY-RUNBOOK-SEM-PRE-CONDICAO-DO-CENSO (2026-09-20) — o runbook de deploy não diz qu |
| `P-O6R-B04-GUARD-D1-ESCRITOR-POR-FORMA` | 10763 | MÉDIA | sim | P-O6R-B04-GUARD-D1-ESCRITOR-POR-FORMA (2026-10-10) — o D1 do T-D deriva o universo de es |
| `P-O6R-B04-GUARD-D2-INDIRECAO-AO-LEDGER` | 10771 | MÉDIA | sim | P-O6R-B04-GUARD-D2-INDIRECAO-AO-LEDGER (2026-10-10) — o universo W do D2 mede alcance a  |
| `P-O6R-B04-GUARD-D7-PORTA-COMO-PROPRIEDADE` | 10780 | MÉDIA | sim | P-O6R-B04-GUARD-D7-PORTA-COMO-PROPRIEDADE (2026-10-10) — o D7 enumera "toda porta públic |
| `P-O6R-B04-GUARD-D5-TRANSICAO-POR-SQL-CRU` | 10789 | MÉDIA | sim | P-O6R-B04-GUARD-D5-TRANSICAO-POR-SQL-CRU (2026-10-10) — o D5 trata a transição de status |
| `P-TRC-VINCULO-POSSE` | 10847 | ALTA | sim | P-TRC-VINCULO-POSSE (2026-10-10) — quem vincula rastreador e como prova que é dono — ALT |
| `P-TRC-LGPD` | 10860 | ALTA | sim | P-TRC-LGPD (2026-10-10) — posição da viatura como dado pessoal do técnico, guarda e aces |
| `P-TRC-TETO-ORGANIZACOES` | 10872 | MÉDIA | sim | P-TRC-TETO-ORGANIZACOES (2026-10-10) — teto de 500 organizações ativas na descoberta do  |
| `P-FIELD-DISPATCH-REASSIGN-NAO-ATOMICO` | 10882 | MÉDIA | sim | P-FIELD-DISPATCH-REASSIGN-NAO-ATOMICO (2026-10-10) — reatribuição e evento em transações |
| `P-PORTAL-LISTEN-SEM-TRATADOR` | 10894 | MÉDIA | sim | P-PORTAL-LISTEN-SEM-TRATADOR (2026-10-10) — falha do listen do portal derruba a API do E |
| `P-O6R-07C-DANO-DEBITA-EXTRATO-DE-COLEGA` | 10902 | ALTA | sim | P-O6R-07C-DANO-DEBITA-EXTRATO-DE-COLEGA (2026-10-10) — o técnico de campo, ao registrar  |
| `P-BLOCO-GOV-GUARDA-POR-PROPRIEDADE` | 10911 | MÉDIA | sim | P-BLOCO-GOV-GUARDA-POR-PROPRIEDADE (2026-10-10) — o bloco transversal que conserta os gu |
| `P-BLOCO-BAT-01` | 10918 | MÉDIA | sim | P-BLOCO-BAT-01 (2026-10-10) — o arnês transversal da bateria (`pg-barrier`/`createGate`, |
| `P-TRC-AWS-ESTUDO-MIGRACAO` | 10952 | MÉDIA | sim | P-TRC-AWS-ESTUDO-MIGRACAO (2026-10-11) — estudo de custo e de migração do ERP inteiro pa |
| `P-EXPENSE-REST-SEM-IDEMPOTENCIA` | 10985 | MÉDIA | sim | P-EXPENSE-REST-SEM-IDEMPOTENCIA (2026-10-11) — as rotas REST de despesa duplicam relatór |
| `P-O6R-07C-APP-RECUSA-PERMANENTE-SEM-SAIDA` | 11007 | MÉDIA | sim | P-O6R-07C-APP-RECUSA-PERMANENTE-SEM-SAIDA (2026-10-10) — ação que o servidor recusa de f |
| `P-O6R-07C-VINCULO-A-OS-ALHEIA-POR-REFERENCIA` | 11014 | MÉDIA | sim | P-O6R-07C-VINCULO-A-OS-ALHEIA-POR-REFERENCIA (2026-10-10) — 10 vias aceitam `work_order_ |
| `P-O6R-07C-FLEET-ALERTS-RUN-PELO-CAMPO` | 11021 | MÉDIA | sim | P-O6R-07C-FLEET-ALERTS-RUN-PELO-CAMPO (2026-10-10) — o técnico de campo dispara a varred |
| `P-O6R-07CA-SUBAPP-EM-ROUTER-INVISIVEL` | 11033 | MÉDIA | sim | P-O6R-07CA-SUBAPP-EM-ROUTER-INVISIVEL (2026-10-10) — sub-app `express()` montado dentro  |
| `P-GOV-GUARDA-POR-PROPRIEDADE` | 11039 | CRÍTICA | sim | P-GOV-GUARDA-POR-PROPRIEDADE (2026-10-11) — o vigia do censo de rotas do 07c-a reconhece |
| `P-LOGISTICS-MOCK` | 11053 | MÉDIA | sim | P-LOGISTICS-MOCK (2026-10-11) — a tela `/logistics` serve dado inventado sempre, mesmo f |
| `P-O6R-B03-PUBLICACAO-SEM-WRITER-ANTIGO` | 11137 | ALTA | sim | P-O6R-B03-PUBLICACAO-SEM-WRITER-ANTIGO (2026-10-11) — publicar o 03a exige tirar de cena |
| `P-APARENCIA-POR-USUARIO` | 11152 | MÉDIA | sim | P-APARENCIA-POR-USUARIO (2026-10-14; re-escopo 2026-11-09) — telas de Pátios ainda sem m |
| `P-TELAS-ACHADOS-MAQUETES-14-10` | 11164 | MÉDIA | sim | P-TELAS-ACHADOS-MAQUETES-14-10 (2026-10-14) — defeitos do sistema de hoje achados ao mon |
| `P-TECNICO-LE-SO-ATRIBUIDAS` | 11181 | ALTA | sim | P-TECNICO-LE-SO-ATRIBUIDAS (2026-10-14) — o técnico de campo ainda lê todas as OS da org |
| `P-USERS-DEFEITOS-14-10` | 11190 | ALTA | sim | P-USERS-DEFEITOS-14-10 (2026-10-14) — a tela de Usuários tem defeitos de acesso e de seg |
| `P-AUDIT-SEGURANCA-15-10` | 11202 | ALTA | sim | P-AUDIT-SEGURANCA-15-10 (2026-10-15) — a Auditoria esconde o que mais importa e não tem  |
| `P-REGISTRO-GATE-SEM-PLACAR-VIVO` | 11223 | MÉDIA | sim | P-REGISTRO-GATE-SEM-PLACAR-VIVO (2026-10-15) — o gate da versão vendável não tem placar  |
| `P-07CB-SUPERIOR-UNICO` | 11229 | MÉDIA | sim | P-07CB-SUPERIOR-UNICO (2026-10-15) — quem autoriza quando a empresa tem uma pessoa só co |
| `P-FINANCEIRO-DEFEITOS-16-10` | 11237 | CRÍTICA | sim | P-FINANCEIRO-DEFEITOS-16-10 (2026-10-16) — o Financeiro de hoje não faz a baixa e soma d |
| `P-ESTOQUE-DEFEITOS-16-10` | 11253 | MÉDIA | sim | P-ESTOQUE-DEFEITOS-16-10 (2026-10-16) — a tela de Estoque conta errado, esconde a custód |
| `P-DESP-TECNICO-VE-DESPACHO-ALHEIO` | 11272 | ALTA | sim | P-DESP-TECNICO-VE-DESPACHO-ALHEIO (2026-10-17) — o Técnico de Campo vê e muda a situação |
| `P-07CB1-ATRIBUICAO-WEB-COM-DESPACHO-ATIVO` | 11314 | MÉDIA | sim | P-07CB1-ATRIBUICAO-WEB-COM-DESPACHO-ATIVO (2026-10-17) — atribuir pela web uma OS que te |
| `P-TRC-VIATURA-PERIODOS` | 11335 | MÉDIA | sim | P-TRC-VIATURA-PERIODOS (2026-10-18) — histórico OS↔viatura por períodos — MÉDIA |
| `P-CI-LISTA-CURADA-6-PRE-EXISTENTES` | 11364 | MÉDIA | sim | P-CI-LISTA-CURADA-6-PRE-EXISTENTES (2026-10-18) — 6 suítes `-db` pré-existentes fora da  |
| `P-TRC-F1-DESPACHO-REACEITE` | 11404 | MÉDIA | sim | P-TRC-F1-DESPACHO-REACEITE (2026-10-18) — despacho re-aceito ou reatribuído depois do fi |
| `P-07CB1-CA6-CA7-SUPERIOR-AUTORIZA-TROCA` | 11444 | CRÍTICA | sim | P-07CB1-CA6-CA7-SUPERIOR-AUTORIZA-TROCA (2026-10-18) — a autorização do superior para a  |
| `P-JUNTA-MUTACAO-NEGADA-PELO-HARNESS` | 11548 | MÉDIA | sim | P-JUNTA-MUTACAO-NEGADA-PELO-HARNESS (2026-10-20) — o classificador de permissões do Clau |
| `P-SAN3-02-PAI-CANCELADO` | 11563 | CRÍTICA | sim | P-SAN3-02-PAI-CANCELADO (2026-10-19) — original cancelado por status continua sendo o pa |
| `P-SAN3-02-DEADLOCK-RESIDUAL` | 11570 | CRÍTICA | sim | P-SAN3-02-DEADLOCK-RESIDUAL (2026-10-19) — deadlock entre escritores de itens de OS sem  |
| `P-SAN3-02-TELA-DELTA` | 11590 | MÉDIA | sim | P-SAN3-02-TELA-DELTA (2026-10-19) — a tela de faturar não mostra complementares nem repe |
| `P-INDICE-PENDENCIAS-CRITICA-COMO-SEVERIDADE` | 11597 | CRÍTICA | sim | P-INDICE-PENDENCIAS-CRITICA-COMO-SEVERIDADE (2026-10-20) — o gerador do índice lê a pala |
| `P-TRC02-LIMITES-POR-ROTA-PROD` | 11619 | MÉDIA | sim | P-TRC02-LIMITES-POR-ROTA-PROD (2026-10-20) — os valores de produção dos dois baldes e da |
| `P-TRC02-QUARENTENA-SEM-TIPO-DE-MENSAGEM` | 11626 | MÉDIA | sim | P-TRC02-QUARENTENA-SEM-TIPO-DE-MENSAGEM (2026-10-20) — o episódio de quarentena mistura  |
| `P-TRC02-RECIBO-VINCULO-VIATURA-FK` | 11633 | MÉDIA | sim | P-TRC02-RECIBO-VINCULO-VIATURA-FK (2026-10-20) — `traccar_ingress_receipts(vehicle_id)`  |
| `P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO` | 11640 | ALTA | sim | P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO (2026-10-20) — o que o ERP exibe da telemetria de v |
| `P-TRC02-AMOSTRA-SO-COM-POSICAO-ACEITA` | 11669 | MÉDIA | sim | P-TRC02-AMOSTRA-SO-COM-POSICAO-ACEITA (2026-10-20) — odômetro e ignição de viatura sem d |
| `P-07C-CENSO-EXEC` | 11683 | MÉDIA | sim | P-07C-CENSO-EXEC (2026-10-20) — o detector de curinga do censo não vê `re.exec(t)` — MÉD |
| `P-TRC02-LOCK-INDICE-RECIBO-PROD` | 11705 | MÉDIA | sim | P-TRC02-LOCK-INDICE-RECIBO-PROD (2026-10-20) — o índice único novo do recibo trava escri |
| `P-SAN3-05-WRAPPERS-BUDGET` | 11712 | MÉDIA | sim | P-SAN3-05-WRAPPERS-BUDGET (2026-10-20) — `withTenantRlsBudget` e `findFirstTenantRls` nã |
| `P-SAN3-20-CHEQUE-FISICO-DUPLICADO` | 11764 | MÉDIA | sim | P-SAN3-20-CHEQUE-FISICO-DUPLICADO (2026-10-24) — duas linhas podem representar o mesmo c |
| `P-SAN3-20-DRIFT-MIGRACOES-X-SCHEMA` | 11776 | MÉDIA | sim | P-SAN3-20-DRIFT-MIGRACOES-X-SCHEMA (2026-10-24) — 76 sentenças de drift preexistente — M |
| `P-SAN3-20-CHECK-STATUS-X-PAID` | 11780 | MÉDIA | sim | P-SAN3-20-CHECK-STATUS-X-PAID (2026-10-24) — banco não amarra status a paid_amount — MÉD |
| `P-SAN3-12-CHEQUE-DESVINCULADO-CAIXA-SEM-TITULO` | 11830 | MÉDIA | sim | P-SAN3-12-CHEQUE-DESVINCULADO-CAIXA-SEM-TITULO (2026-10-25) — cheque desvinculado que co |
| `P-SAN3-12-BOUNCE-COMO-DESVIO` | 11834 | MÉDIA | sim | P-SAN3-12-BOUNCE-COMO-DESVIO (2026-10-25) — `bounce` sem privilégio tira o cheque do con |
| `P-SAN3-12-STATUS-CANCELLED-COM-CHEQUE-PENDENTE` | 11851 | CRÍTICA | sim | P-SAN3-12-STATUS-CANCELLED-COM-CHEQUE-PENDENTE (2026-10-25) — `changeStatus → cancelled` |
| `P-CHK-RUN-SNAPSHOT-IMUTAVEL` | 11867 | MÉDIA | sim | P-CHK-RUN-SNAPSHOT-IMUTAVEL (2026-10-25) — forma histórica da vistoria depende do modelo |
| `P-MOBILE-RUN-SO-NO-APARELHO` | 11874 | ALTA | sim | P-MOBILE-RUN-SO-NO-APARELHO (2026-10-25) — vistoria offline ainda desconhecida pelo serv |
| `P-B-SAN3-22-CI-DB-SUITE` | 11892 | MÉDIA | sim | P-B-SAN3-22-CI-DB-SUITE (2026-10-26) — suíte nova de lock fora da lista curada do job `b |
| `P-WO-LEITURAS-TENANT-WIDE-TECNICO` | 11898 | MÉDIA | sim | P-WO-LEITURAS-TENANT-WIDE-TECNICO (2026-10-25) — o técnico ainda LÊ OS e despachos de co |
| `P-MOBILE-SYNC-FAILED-SEM-DESCARTE` | 11908 | MÉDIA | sim | P-MOBILE-SYNC-FAILED-SEM-DESCARTE (2026-10-25) — ação failed e tipos não replayados não  |
| `P-MOBILE-EVIDENCIA-CONFLITO-SEM-DESCARTE` | 11923 | MÉDIA | sim | P-MOBILE-EVIDENCIA-CONFLITO-SEM-DESCARTE (2026-10-25) — evidência em conflict com blob n |
| `P-MOBILE-MATERIAL-SEM-REPLAY` | 11930 | CRÍTICA | sim | P-MOBILE-MATERIAL-SEM-REPLAY (2026-10-25) — work_order_material.add fica pending para se |
| `P-MOBILE-SYNC-INTERROMPIDO-REENVIO-MANUAL` | 11942 | MÉDIA | sim | P-MOBILE-SYNC-INTERROMPIDO-REENVIO-MANUAL (2026-11-02) — ação de OS, vistoria ou evidênc |
| `P-O6R-B11-PENDENCIAS-DO-RAMO-388` | 11999 | MÉDIA | sim | P-O6R-B11-PENDENCIAS-DO-RAMO-388 (2026-11-02) — índice das 12 pendências do ramo `fix/mo |
| `P-MOBILE-MATERIAL-E-FILA-NAO-ATOMICOS` | 12020 | ALTA | sim | P-MOBILE-MATERIAL-E-FILA-NAO-ATOMICOS (2026-09-18) — `addSelection` grava N materiais e  |
| `P-MOBILE-FILA-RMW-STORE` | 12044 | MÉDIA | sim | P-MOBILE-FILA-RMW-STORE (2026-09-18) — a serialização do `B-O6R-11` protege UMA instânci |
| `P-AUDIT-CRITICA-NA-TRANSACAO` | 12171 | MÉDIA | sim | P-AUDIT-CRITICA-NA-TRANSACAO (2026-10-26) — evento de auditoria `critical` gravado DEPOI |
| `P-ARNES-WINDOWS-DRILLS-EBUSY-SETSID` | 12193 | MÉDIA | sim | P-ARNES-WINDOWS-DRILLS-EBUSY-SETSID (2026-10-26) — drills deixam EBUSY no `after` e o ho |
| `P-SAN3-12-CHEQUE-DUPLO-VALOR-CHEIO` | 12207 | MÉDIA | sim | P-SAN3-12-CHEQUE-DUPLO-VALOR-CHEIO (2026-10-26) — segundo cheque do valor cheio enquanto |
| `P-CHK-EDITOR-GRADE-ESTREITA` | 12217 | MÉDIA | sim | P-CHK-EDITOR-GRADE-ESTREITA (2026-10-26) — abaixo de 1180 px a grade do editor de checkl |
| `P-CHK-EDITOR-LEITURAS-B` | 12223 | MÉDIA | sim | P-CHK-EDITOR-LEITURAS-B (2026-10-26) — editor de checklist: as leituras que a aparência  |
| `P-FRONT-TESTE-DE-INTERACAO` | 12236 | MÉDIA | sim | P-FRONT-TESTE-DE-INTERACAO (2026-10-26) — o smoke do front é SSR e não exercita handlers |
| `P-REGISTRO-MERGE-CONFERE-TRES-VIAS` | 12295 | MÉDIA | sim | P-REGISTRO-MERGE-CONFERE-TRES-VIAS (2026-10-28) — o merge de registro confere cabeçalhos |
| `P-SAN3-10-VARREDURA-SEGURANCA-FINAL` | 12338 | ALTA | sim | P-SAN3-10-VARREDURA-SEGURANCA-FINAL (2026-10-30) — varredura de segurança antes do portã |
| `P-AVREAL-TETO-IDADE` | 12368 | MÉDIA | sim | P-AVREAL-TETO-IDADE (2026-10-31) — sem teto superior para `CLAMAV_MAX_DB_AGE_HOURS` em p |
| `P-AVREAL-B108-PROVA` | 12398 | MÉDIA | sim | P-AVREAL-B108-PROVA (2026-10-31) — `b108_evidence_storage_hardening_test.dart` não prova |
| `P-AVREAL-PANE-CI` | 12404 | MÉDIA | sim | P-AVREAL-PANE-CI (2026-10-31) — modos `unavailable`, recuperação e HTTP 503 com daemon f |
| `P-LEGAL-RECEBIMENTO-DE-TERCEIROS` | 12424 | ALTA | sim | P-LEGAL-RECEBIMENTO-DE-TERCEIROS (2026-10-31) — parecer de advogado e contador antes de  |
| `P-AUDITORIA-MEDIR-CRUZAMENTO` | 12435 | MÉDIA | sim | P-AUDITORIA-MEDIR-CRUZAMENTO (2026-10-31) — medir em 3 blocos se os falsos verdes caíram |
| `P-CONFLITO-RECEBIMENTO-PLATAFORMA-X-DOIS-MODOS` | 12529 | ALTA | sim | P-CONFLITO-RECEBIMENTO-PLATAFORMA-X-DOIS-MODOS (2026-11-02) — `D-PLATAFORMA-RECEBE-E-REP |
| `P-CONFLITO-ASSINATURA-FILIAL-X-ORGANIZACAO` | 12542 | ALTA | sim | P-CONFLITO-ASSINATURA-FILIAL-X-ORGANIZACAO (2026-11-02) — filial é organização própria,  |
| `P-WEB-LOGIN-MENSAGEM-TENANT` | 12575 | MÉDIA | sim | P-WEB-LOGIN-MENSAGEM-TENANT (2026-11-03) — a tela de login mostra "Tenant, e-mail ou sen |
| `P-DESPACHOS-NOME-TECNICO-BACKEND` | 12631 | MÉDIA | sim | P-DESPACHOS-NOME-TECNICO-BACKEND (2026-11-03) — o nome do técnico precisa vir do backend |
| `P-PATIO-LISTPROCESSES-ERRO-VIRA-VAZIO` | 12649 | MÉDIA | sim | P-PATIO-LISTPROCESSES-ERRO-VIRA-VAZIO (2026-11-03) — `listProcessesByYard` transforma qu |
| `P-CLOUD-BILLING-3-APARENCIAS` | 12666 | MÉDIA | sim | P-CLOUD-BILLING-3-APARENCIAS (2026-11-03) — Cloud Billing da plataforma ainda não segue  |
| `P-ASS-CANAL-DESLIGADO` | 12722 | ALTA | sim | P-ASS-CANAL-DESLIGADO (2026-11-03) — canal de pagamento e nota, cofre e webhooks ainda n |
| `P-ASS-VISAO-DO-CLIENTE` | 12729 | ALTA | sim | P-ASS-VISAO-DO-CLIENTE (2026-11-03) — cliente sem rota e tela honestas da assinatura — A |
| `P-ASS-RASTREAMENTO-NAO-COBRADO` | 12736 | ALTA | sim | P-ASS-RASTREAMENTO-NAO-COBRADO (2026-11-04) — rastreamento aprovado como item próprio ai |
| `P-ASS-ADAPTADORES-FORA-DO-PORTAO` | 12743 | MÉDIA | sim | P-ASS-ADAPTADORES-FORA-DO-PORTAO (2026-11-03) — adaptadores posteriores ao primeiro par  |
| `P-ASS-SANDBOX-REAL` | 12749 | MÉDIA | sim | P-ASS-SANDBOX-REAL (2026-11-03) — homologação real dos provedores escolhidos depende de  |
| `P-ASS-SECRETS-MANAGER` | 12755 | MÉDIA | sim | P-ASS-SECRETS-MANAGER (2026-11-03) — chave do cofre ainda sem integração ao gerenciador  |
| `P-MOBILE-VERSAO-SEM-INCREMENTO` | 12784 | MÉDIA | sim | P-MOBILE-VERSAO-SEM-INCREMENTO (2026-11-04) — a versão não distingue o app anterior à mu |
| `P-ENSAIO-PADROES-APONTAM-PARA-DEV` | 12793 | MÉDIA | sim | P-ENSAIO-PADROES-APONTAM-PARA-DEV (2026-11-04) — padrões de ferramentas podem alcançar o |
| `P-SAN3-10B-F4-SEED-ISOLADO` | 12817 | MÉDIA | sim | P-SAN3-10B-F4-SEED-ISOLADO (2026-11-04) — seed isolado não reproduz os quatro fluxos pri |
| `P-ASS00-RESIDUOS-CONFERENCIA` | 12833 | MÉDIA | sim | P-ASS00-RESIDUOS-CONFERENCIA (2026-11-04) — resíduos não graves da conferência do conser |
| `P-MOBILE-ROTAS-SEM-SERVIDOR` | 12844 | ALTA | sim | P-MOBILE-ROTAS-SEM-SERVIDOR (2026-11-04) — o app de campo chama rotas que o servidor não |
| `P-MOBILE-SYNC-ESTOQUE-TIPOS` | 12851 | ALTA | sim | P-MOBILE-SYNC-ESTOQUE-TIPOS (2026-11-04) — tipos de ação de estoque do app não batem com |
| `P-MOBILE-STATUS-NOMES` | 12858 | MÉDIA | sim | P-MOBILE-STATUS-NOMES (2026-11-04) — nomes de status da OS no app divergem dos do servid |
| `P-RBAC-FIELD-TECHNICIAN-DESPESA` | 12864 | MÉDIA | sim | P-RBAC-FIELD-TECHNICIAN-DESPESA (2026-11-04) — `field_technician` sem permissão de despe |
| `P-AUTH-TOKEN-LOCAL-CLAIMS` | 12876 | MÉDIA | sim | P-AUTH-TOKEN-LOCAL-CLAIMS (2026-11-04) — o token local não traz todos os claims do contr |
| `P-WEB-SHELL-CELULAR-ROLA-DE-LADO` | 12889 | MÉDIA | sim | P-WEB-SHELL-CELULAR-ROLA-DE-LADO (2026-11-04) — em 390 px a web rola de lado por causa d |
| `P-ASS03-RMED3-VACUUM-6B` | 12933 | MÉDIA | sim | P-ASS03-RMED3-VACUUM-6B (2026-11-06) — o "byte a byte" do R-MED-3 varia ±6 B depois de V |
| `P-JOBS-REENFILEIRA-MULTIPLICA` | 12964 | MÉDIA | sim | P-JOBS-REENFILEIRA-MULTIPLICA (2026-11-06) — re-enfileirar no `finally` multiplica as ca |
| `P-FILA-USUARIO-CONFLITO-DE-OUTRO-USUARIO` | 12994 | MÉDIA | sim | P-FILA-USUARIO-CONFLITO-DE-OUTRO-USUARIO (2026-11-08) — o painel de conflito no detalhe  |
| `P-ASS07-REGIME-VOCAB-FECHADO` | 13030 | MÉDIA | sim | P-ASS07-REGIME-VOCAB-FECHADO (2026-11-09) — classificação de regime fiscal é fail-open p |
| `P-O6R-03b-VERSAO-DO-GESTOR-SEM-RECIBO` | 13060 | MÉDIA | sim | P-O6R-03b-VERSAO-DO-GESTOR-SEM-RECIBO (2026-11-09) — "Versão do gestor" em conflito de d |
| `P-BACKEND-ENVELOPE-400-FALHA-DE-INFRA` | 13071 | MÉDIA | sim | P-BACKEND-ENVELOPE-400-FALHA-DE-INFRA (2026-11-09) — falha de infraestrutura no sync de  |
| `P-O6R-03b-ITEM30-SESSAO-SEM-GUARDA` | 13079 | MÉDIA | sim | P-O6R-03b-ITEM30-SESSAO-SEM-GUARDA (2026-11-09) — o "com sessão válida" do item 30 não t |
| `P-S3-FORCE-PATH-STYLE-NAO-DESLIGA` | 13102 | MÉDIA | sim | P-S3-FORCE-PATH-STYLE-NAO-DESLIGA (2026-11-10) — `CHECKLIST_STORAGE_S3_FORCE_PATH_STYLE= |
| `P-DESPESA-APROVACAO-SEM-TRAVA-E-SEM-STATUS-NO-APP` | 13108 | MÉDIA | sim | P-DESPESA-APROVACAO-SEM-TRAVA-E-SEM-STATUS-NO-APP (2026-11-10) — aprovação e devolução d |
| `P-SAN3-05-T11-ORDEM-INSTAVEL` | 13122 | MÉDIA | sim | P-SAN3-05-T11-ORDEM-INSTAVEL (2026-11-10) — o T11d/T11e de `san3-05-leituras-de-platafor |
| `P-ASS08-OBX5-EAGER-E-CANCEL` | 13129 | MÉDIA | sim | P-ASS08-OBX5-EAGER-E-CANCEL (2026-11-09) — R-OBX-5 partes (i) e (iii): marcação eager na |
| `P-ASS08-MUTATE-SEM-GUARDA` | 13164 | ALTA | sim | P-ASS08-MUTATE-SEM-GUARDA (2026-11-10) — o `#mutate` da outbox atualiza por id sem confe |
| `P-ASS08-RECONSULTA-SEM-VALOR` | 13171 | MÉDIA | sim | P-ASS08-RECONSULTA-SEM-VALOR (2026-11-10) — a reconsulta por referência devolve só `{ ch |
| `P-ASS08-RECUPERADA-SEM-COBRANCA` | 13177 | MÉDIA | sim | P-ASS08-RECUPERADA-SEM-COBRANCA (2026-11-10) — o desfecho `recovered` não grava `subscri |
| `P-ASS08-RECONSULTA-CONSISTENCIA` | 13184 | MÉDIA | sim | P-ASS08-RECONSULTA-CONSISTENCIA (2026-11-10) — a listagem `GET /v3/payments?externalRefe |
| `P-USERS-201-SEM-NO-STORE` | 13204 | MÉDIA | sim | P-USERS-201-SEM-NO-STORE (2026-11-10) — criação de usuário devolve senha provisória sem  |
| `P-USERS-DESATIVADO-TOKEN-MOBILE` | 13210 | CRÍTICA | sim | P-USERS-DESATIVADO-TOKEN-MOBILE (2026-11-10) — token anterior à desativação ainda alcanç |
| `P-GUARD3-SO-RECONHECE-SET-CONFIG` | 13217 | MÉDIA | sim | P-GUARD3-SO-RECONHECE-SET-CONFIG (2026-11-10) — guard 3 não reconhece `SET LOCAL` — MÉDI |
| `P-APARENCIA-APP-SELETOR` | 13229 | MÉDIA | sim | P-APARENCIA-APP-SELETOR (2026-11-10) — app ainda não tem seletor para as aparências B e  |
| `P-LOGIN-CONTRASTE-ERRO` | 13235 | MÉDIA | sim | P-LOGIN-CONTRASTE-ERRO (2026-11-10) — faixa de erro do login web não alcança o contraste |
| `P-B-ASS-08c-OBRIGACOES-DA-08b` | 13247 | ALTA | sim | P-B-ASS-08c-OBRIGACOES-DA-08b (2026-11-10) — bloco futuro `B-ASS-08c`, com as formas e o |
| `P-INDICE-PENDENCIAS-NAO-LE-GRAVE` | 13267 | ALTA | sim | P-INDICE-PENDENCIAS-NAO-LE-GRAVE (2026-11-10) — o índice gerado não reconhece a gravidad |
| `P-SAN3-08-APROVAR-NA-OS-CRIA-OS-NOVA` | 13297 | MÉDIA | sim | P-SAN3-08-APROVAR-NA-OS-CRIA-OS-NOVA (2026-11-11) — aprovar um orçamento de dentro de um |
| `P-SAN3-08-RESOLVER-TIPO-FAIL-OPEN` | 13303 | MÉDIA | sim | P-SAN3-08-RESOLVER-TIPO-FAIL-OPEN (2026-11-11) — falha ao ler o tipo do serviço desliga  |
| `P-SAN3-08-ORCAMENTO-SEM-ALCADA` | 13309 | MÉDIA | sim | P-SAN3-08-ORCAMENTO-SEM-ALCADA (2026-11-11) — aprovar orçamento não confere alçada nem s |
| `P-SAN3-08-APPROVE-OS-NAO-ATOMICA` | 13316 | MÉDIA | sim | P-SAN3-08-APPROVE-OS-NAO-ATOMICA (2026-11-11) — falha no meio da aprovação gera OS em do |
| `P-ASS08C-TRUST-PROXY` | 13329 | ALTA | sim | P-ASS08C-TRUST-PROXY (2026-11-11) — sem `trust proxy`, o bloqueio por IP do webhook vale |
| `P-ASS08C-COTA-IP-BLOQUEADO` | 13335 | MÉDIA | sim | P-ASS08C-COTA-IP-BLOQUEADO (2026-11-11) — IP já bloqueado ainda consome a cota global do |
| `P-ASS08C-NOTA-DA-BAIXA-MANUAL` | 13341 | ALTA | sim | P-ASS08C-NOTA-DA-BAIXA-MANUAL (2026-11-11) — baixa/estorno manuais sem intenção de nota, |
| `P-ASS08C-TROCA-DE-PROVEDOR-DE-NOTA` | 13349 | MÉDIA | sim | P-ASS08C-TROCA-DE-PROVEDOR-DE-NOTA (2026-11-11) — `invoice_issue` nunca tentada presa ao |
| `P-ASS08C-REEMISSAO-APOS-REPAGAMENTO` | 13354 | ALTA | sim | P-ASS08C-REEMISSAO-APOS-REPAGAMENTO (2026-11-11) — repagar depois de um estorno total nã |
| `P-ASS08C-NOTA-PRESA-EM-PROCESSAMENTO` | 13360 | MÉDIA | sim | P-ASS08C-NOTA-PRESA-EM-PROCESSAMENTO (2026-11-11) — `invoice_cancel` em `NEEDS_REVIEW in |
| `P-APP-DETALHE-OS-LARGURA-INFINITA` | 13378 | ALTA | sim | P-APP-DETALHE-OS-LARGURA-INFINITA (2026-11-11) — no APK debug o detalhe da OS fica em br |
| `P-APP-ANTIGO-INICIAR-ROTA-DE-AGENDADA` | 13385 | MÉDIA | sim | P-APP-ANTIGO-INICIAR-ROTA-DE-AGENDADA (2026-11-11) — o app antigo recusa "Iniciar rota"  |
| `P-DESPACHO-DUPLICADO-MESMO-TECNICO` | 13392 | MÉDIA | sim | P-DESPACHO-DUPLICADO-MESMO-TECNICO (2026-11-11) — dois despachos ativos do mesmo técnico |
| `P-V533-P1-OS-TITULO-COM-UUID` | 13432 | MÉDIA | sim | P-V533-P1-OS-TITULO-COM-UUID (2026-11-11) — a OS criada pela aprovação nasce com o UUID  |
| `P-HTTP-ERRO-ECOA-MENSAGEM-CRUA` | 13500 | MÉDIA | sim | P-HTTP-ERRO-ECOA-MENSAGEM-CRUA (2026-11-11) — o tratador genérico de erro devolve a mens |
| `P-CONF530-01-TESTE-DONO-LEITURA-NA-TRAVA` | 13507 | MÉDIA | sim | P-CONF530-01-TESTE-DONO-LEITURA-NA-TRAVA (2026-11-11) — a leitura do status na mesma ins |
| `P-ORG-SUSPENSA-NAO-CORTA-ACESSO` | 13562 | MÉDIA | sim | P-ORG-SUSPENSA-NAO-CORTA-ACESSO (2026-11-11) — nem o login, nem o refresh, nem o RBAC pe |
| `P-ASS-DB-FORA-DA-LISTA-CURADA` | 13577 | MÉDIA | sim | P-ASS-DB-FORA-DA-LISTA-CURADA (2026-11-11) — nenhuma suíte `ass-0*-db` está na lista cur |
| `P-SAN3-07-APP-NOME-TECNICO-OFFLINE` | 13584 | MÉDIA | sim | P-SAN3-07-APP-NOME-TECNICO-OFFLINE (2026-11-11) — o app de campo mostra "Tenant Demo" e  |
| `P-MOBILE-GATE-CHAVE-FORA-DO-CATALOGO` | 13605 | CRÍTICA | **a atribuir** | P-MOBILE-GATE-CHAVE-FORA-DO-CATALOGO (2026-11-11) — 4 telas do app pedem permissão que o |

## ABERTAS · balde B — processo/registro — 303

| ID | linha | severidade | dono | titulo |
|---|--:|---|---|---|
| `P-006` | 73 | — | **a atribuir** | P-006 - RLS por-tenant e rate-limit por-tenant (proposta, nao implementar) |
| `P-007` | 80 | — | **a atribuir** | P-007 - Prisma forward-only: rollback via SQL manual (2026-07-07) |
| `P-SAN-E2E` | 516 | — | sim | P-SAN-E2E - Playwright e2e fora do gate obrigatório (Ω-GATE, 2026-07-13) |
| `P-SAN-KPI-BACKFILL` | 541 | — | **a atribuir** | P-SAN-KPI-BACKFILL - Backfill de merge_commit/approved_head nos KPIs pode persistir null |
| `P-Ω3F6-COMISSAO-REVERSAL` | 843 | — | **a atribuir** | P-Ω3F6-COMISSAO-REVERSAL - dual-gate na engine de cálculo + reversão de comissão de OS c |
| `P-Ω3F6-COMISSAO-PRISMA-COV` | 855 | — | **a atribuir** | P-Ω3F6-COMISSAO-PRISMA-COV - caminho Prisma do gate de supressão só coberto por tsc+revi |
| `P-Ω3F7B-MAPA-ETAPA` | 949 | — | **a atribuir** | P-Ω3F7B-MAPA-ETAPA - Mapa de posição por etapa: falta a FONTE DE DADOS (Ω3F-7b, 2026-07- |
| `P-Ω3F7-MOBILETAB-NITS` | 962 | — | **a atribuir** | P-Ω3F7-MOBILETAB-NITS - Nits da pós-análise da MobileTab (Ω3F-7, 2026-07-17) |
| `P-Ω4-2B-KPI-AGREGADO` | 1051 | BAIXA | sim | P-Ω4-2B-KPI-AGREGADO — KPIs/tabs somam só as linhas carregadas (MÉDIO, Ω4-8 Dashboard) |
| `P-Ω4-3-INVOICE-LEASTPRIV` | 1127 | BAIXA | sim | P-Ω4-3-INVOICE-LEASTPRIV — Rota invoice não exige work_order_financials:read (BAIXA) |
| `P-Ω4-4-EDGES` | 1149 | — | sim | P-Ω4-4-EDGES — Bordas do Ω4-4 (Caixa/Extrato + liquidação) — implementado, com decisões  |
| `P-Ω4-5-BATCH` | 1276 | — | sim | P-Ω4-5-BATCH — conciliação em LOTE (importar extrato CSV/OFX → casar N lançamentos) — AD |
| `P-Ω3F6` | 1447 | BAIXA | sim | P-Ω3F6 — cluster de cancelamento: STATUS-BYPASS/TERMINAL-GUARD/ZERO-ATOMICIDADE RESOLVID |
| `P-GOLIVE-GATES` | 1511 | — | sim | P-GOLIVE-GATES — Gates humanos de go-live (R1 provedor, R2 restore cronometrado, smoke a |
| `P-SCREEN-REFS-PATH` | 1754 | — | **a atribuir** | P-SCREEN-REFS-PATH — screen-refs/ na raiz × docs/claude-code-handoff/screen-refs/ (2026- |
| `P-ERP-MOBILE-DC-HTML` | 1761 | — | **a atribuir** | P-ERP-MOBILE-DC-HTML — protótipo `ERP Mobile.dc.html` ausente (2026-07-28) |
| `P-CLAUDE-COMPANIONS-DRAFTS` | 1768 | — | **a atribuir** | P-CLAUDE-COMPANIONS-DRAFTS — arquivos companheiros criados como drafts fundados (2026-07 |
| `P-KPI-PR18A-MVP-VENDAVEL` | 1795 | — | **a atribuir** | P-KPI-PR18A-MVP-VENDAVEL — latest 88% × history 92% (2026-07-29) |
| `P-IMPOUND-CHK-VISIBILITY` | 1824 | — | sim | P-IMPOUND-CHK-VISIBILITY (2026-08-01) — consequência de RBAC no endpoint de custódia (co |
| `P-CHK-AUTOLINK-FASE-REAL` | 2444 | — | **a atribuir** | P-CHK-AUTOLINK-FASE-REAL (2026-08-11 — junta `J-CHK-P1-PR04B-autolink`, nascida da decis |
| `P-IMPOUND-LINK-SEM-UNLINK` | 2461 | — | **a atribuir** | P-IMPOUND-LINK-SEM-UNLINK (2026-08-11 — junta `J-CHK-P1-PR04B-autolink`, fato comum aos  |
| `P-O6R-BACKLOG` | 2519 | — | **a atribuir** | P-O6R-BACKLOG (2026-08-14) — os 29 achados da auditoria Ω6R entram no controle operacion |
| `P-O6R-B12` | 3033 | — | sim | P-O6R-B12 (2026-08-18) — `fix/jurisdiction-profile-versioning` — Ω6R-DAT-004 (1 P1) — ** |
| `P-O6R-B08` | 3325 | — | **a atribuir** | P-O6R-B08 (2026-08-14) — `fix/durable-jobs-realtime` — Ω6R-ARQ-001..003 + PERF-001 (4 P1 |
| `P-O6R-B09` | 3371 | — | sim | P-O6R-B09 (2026-08-14) — `fix/dispatch-atomic-timeline` — Ω6R-ARQ-004 (P1) — **BLOQUEIA  |
| `P-O6R-B10` | 3395 | — | **a atribuir** | P-O6R-B10 (2026-08-14) — `fix/client-load-shedding` — Ω6R-PERF-002, PERF-003 (2 P1) — ** |
| `P-TESTS-FORA-DO-TYPECHECK` | 3492 | — | **a atribuir** | P-TESTS-FORA-DO-TYPECHECK (2026-08-14 — ciclo 3 da revisão do CHK P1 PR-04c-A) |
| `P-CHK-DEFERRED-SEM-LEITURA` | 3510 | BAIXA | **a atribuir** | P-CHK-DEFERRED-SEM-LEITURA (2026-08-14 — ciclo 4 da revisão do CHK P1 PR-04c-A) |
| `P-O6R-B05-WORKER-EXTERNO-DIFERIDO` | 3618 | — | sim | P-O6R-B05-WORKER-EXTERNO-DIFERIDO (2026-08-15 — bloco B-O6R-05, decisão C4) |
| `P-O6R-B05-HEARTBEAT-NAO-DETECTA-HANDLER-TRAVADO` | 3642 | — | **a atribuir** | P-O6R-B05-HEARTBEAT-NAO-DETECTA-HANDLER-TRAVADO (2026-08-15 — bloco B-O6R-05) |
| `P-O6R-B05-README-ATIVACAO` | 3650 | — | sim | P-O6R-B05-README-ATIVACAO (2026-08-15 — bloco B-O6R-05) |
| `P-O6R-B05-DATABASE-URL-SEM-FORMA-NEM-HOST` | 3744 | — | sim | P-O6R-B05-DATABASE-URL-SEM-FORMA-NEM-HOST (2026-08-15 — junta do PR #353, ressalva do `a |
| `P-O6R-B01-ROLE-LITERAIS` | 3787 | — | **a atribuir** | P-O6R-B01-ROLE-LITERAIS (2026-08-18 — ciclo 2 do B-O6R-01, plano §9) |
| `P-O6R-B01-ROUTE-ERROR-LEAK` | 3805 | — | **a atribuir** | P-O6R-B01-ROUTE-ERROR-LEAK (2026-08-18 — ciclo 2 do B-O6R-01, plano §9; achado B-7 do R- |
| `P-O6R-ARNES-ISOLAMENTO` | 3816 | — | sim | P-O6R-ARNES-ISOLAMENTO (2026-08-18) — o arranjo do lote de testes contra Postgres, **ant |
| `P-O6R-B01-ROUTE-ERROR-LEAK` | 3955 | — | sim | P-O6R-B01-ROUTE-ERROR-LEAK — **EMENDA de escopo (2026-08-19)** |
| `P-O6R-ARNES-ISOLAMENTO` | 3965 | — | sim | P-O6R-ARNES-ISOLAMENTO — **EMENDAS medidas pela junta do ciclo 3** |
| `P-O6R-ARNES-ISOLAMENTO` | 3987 | — | sim | P-O6R-ARNES-ISOLAMENTO — **EMENDAS do bloco B-O6R-ARNES (2026-08-28)** — o bloco próprio |
| `P-ARNES-VAZAMENTO-LINEAR-IDENTIDADES` | 4115 | — | sim | P-ARNES-VAZAMENTO-LINEAR-IDENTIDADES — **ATRIBUÍDO POR EXECUÇÃO** (2026-08-28, B-O6R-ARN |
| `P-ARNES-CANONICA1-VERMELHO-AMBIENTAL` | 4146 | — | sim | P-ARNES-CANONICA1-VERMELHO-AMBIENTAL (2026-08-28 — B-O6R-ARNES) — pré-existente, NOMEADO |
| `P-O6R-ARNES-ISOLAMENTO` | 4593 | — | sim | P-O6R-ARNES-ISOLAMENTO — EMENDAS medidas pela junta do ciclo 4 (2026-08-28, cadeira do a |
| `P-O6R-ARNES-ISOLAMENTO` | 4612 | — | sim | P-O6R-ARNES-ISOLAMENTO — EMENDAS do bloco `SAN2-4b` (2026-08-31) — mecanismo da orfa e d |
| `P-ARNES-CONEXAO-SEM-ASSEVERACAO-DE-IDENTIDADE` | 4682 | BAIXA | sim | P-ARNES-CONEXAO-SEM-ASSEVERACAO-DE-IDENTIDADE (2026-08-28) — BAIXA · **Dono:** bloco de  |
| `P-REG-DIVERGENCIA-SEM-PLANEJADOR-MESTRE` | 4810 | — | sim | P-REG-DIVERGENCIA-SEM-PLANEJADOR-MESTRE (2026-08-28) — divergência de processo, registra |
| `P-ARNES-RATCHET-POR-CONTAGEM-CEGO-A-PROSA` | 5546 | — | sim | P-ARNES-RATCHET-POR-CONTAGEM-CEGO-A-PROSA (2026-08-31 — achado do `SAN2-4b`, correcoes C |
| `P-REG-BATERIA-NAO-TYPECHECA-TESTS` | 5617 | — | sim | P-REG-BATERIA-NAO-TYPECHECA-TESTS (2026-08-31 — achado do `SAN2-4b`, correcao C2) — `pre |
| `P-AUTHORITY-N-NAO-CANONICO-NO-STORED` | 5737 | BAIXA | sim | P-AUTHORITY-N-NAO-CANONICO-NO-STORED (2026-08-31) — BAIXA · os campos numéricos do `stor |
| `P-CLAUDE-ABERTURA-PRECEDENCIA-DESATUALIZADA` | 5991 | BAIXA | sim | P-CLAUDE-ABERTURA-PRECEDENCIA-DESATUALIZADA (2026-09-01 — medido pelo dev do `SAN2-6`, § |
| `P-ESPELHO-C7-3-MECANISMO-PESQUISADOR` | 6123 | BAIXA | sim | P-ESPELHO-C7-3-MECANISMO-PESQUISADOR (2026-09-02 — achado `C1-A3` da junta `J-SAN2-6`) — |
| `P-KPI-CARIMBO-MVP-DEFASADO-SAN2-5` | 6167 | BAIXA | sim | P-KPI-CARIMBO-MVP-DEFASADO-SAN2-5 (2026-09-02 — achado `C3-N1` da junta `J-SAN2-6`) — BA |
| `P-O6R-B02-INDISPUTE-RESTORE` | 6206 | — | sim | P-O6R-B02-INDISPUTE-RESTORE (2026-08-22) — estorno devolve `in_dispute` para `open` |
| `P-O6R-B02-CHEQUE-UNCLEAR` | 6222 | — | sim | P-O6R-B02-CHEQUE-UNCLEAR (2026-08-22) — não existe des-compensar um cheque compensado po |
| `P-O6R-ARNES-ISOLAMENTO` | 6267 | — | sim | P-O6R-ARNES-ISOLAMENTO — EMENDA do ciclo 5 do B-O6R-02 (2026-09-02) — o objeto disputado |
| `P-O6R-ARNES-ISOLAMENTO` | 6308 | — | sim | P-O6R-ARNES-ISOLAMENTO — EMENDA de PRECISÃO do ciclo 5 (2026-09-03) — o vazamento +5/+5  |
| `P-O6R-B02-RULINGS-SEM-DESTINO` | 6346 | BAIXA | sim | P-O6R-B02-RULINGS-SEM-DESTINO (2026-09-03 — ACHADO-1 do `critico-c5-adversarial`) — BAIX |
| `P-KPI-HISTORY-MD-BACKLOG` | 6889 | BAIXA | sim | P-KPI-HISTORY-MD-BACKLOG (registro 4/7, 2026-09-03) — espelho `Kpis/kpis-history.md` com |
| `P-STATUS-NEGRITO-INVISIVEL-AO-GERADOR` | 7074 | BAIXA | sim | P-STATUS-NEGRITO-INVISIVEL-AO-GERADOR (2026-09-05) — BAIXA · achado ao consertar a quart |
| `P-O6R-B07B-LEGADO-MIME` | 7377 | BAIXA | sim | P-O6R-B07B-LEGADO-MIME (2026-09-06) — linhas antigas com `mime_type` declarado pelo clie |
| `P-O6R-B07B-REJEICAO-SEM-AUDIT-LOG` | 7386 | BAIXA | sim | P-O6R-B07B-REJEICAO-SEM-AUDIT-LOG (2026-09-06) — recusa de upload em V2–V5 só em log est |
| `P-O6R-B07B-CODIGOS-INCONSISTENTES` | 7395 | BAIXA | sim | P-O6R-B07B-CODIGOS-INCONSISTENTES (2026-09-06) — V4 usa `400` onde as irmãs usam `415`/` |
| `P-O6R-B07B-RECEIPT-CONTENT-TYPE` | 7405 | BAIXA | sim | P-O6R-B07B-RECEIPT-CONTENT-TYPE (2026-09-06) — V1 não cruza o `content_type` do recibo c |
| `P-O6R-B07B-S3-PREFIXO-LEGADO` | 7415 | BAIXA | sim | P-O6R-B07B-S3-PREFIXO-LEGADO (2026-09-06) — chave S3 gravada com prefixo antigo passa a  |
| `P-O6R-B06-SEM-PODA-POR-IDADE` | 7661 | BAIXA | sim | P-O6R-B06-SEM-PODA-POR-IDADE (2026-09-07) — `cloud_usage_events` não pode ser podada por |
| `P-O6R-B06-DECIMAL-NA-BORDA` | 7677 | BAIXA | sim | P-O6R-B06-DECIMAL-NA-BORDA (2026-09-07) — `totalUnblendedCost: number` continua lossy no |
| `P-GOV-MAQUINAS-DE-DESFAZER-PROMOVER` | 7782 | BAIXA | sim | P-GOV-MAQUINAS-DE-DESFAZER-PROMOVER (2026-09-07) — competência reutilizável saiu na apos |
| `P-GOV-SKILLS-RELEVANCIA` | 7849 | BAIXA | sim | P-GOV-SKILLS-RELEVANCIA (2026-09-07) — 5 skills voltaram a carregar; 1 delas não tem rel |
| `P-GOV-AUDITOR-ARESTAS-MENORES` | 8252 | BAIXA | sim | P-GOV-AUDITOR-ARESTAS-MENORES (2026-09-08) — quatro arestas BAIXA do auditor enxuto — BA |
| `P-O6R-B06-DELTA-RESIDUAIS` | 8422 | BAIXA | sim | P-O6R-B06-DELTA-RESIDUAIS (2026-09-09) — dois residuais do conserto de isolamento, nomea |
| `P-WEB-EVENTBUS-MOCK` | 8722 | BAIXA | sim | P-WEB-EVENTBUS-MOCK (2026-09-11) — Provider de eventos cicla mocks a cada 9 s contra rot |
| `P-API-VERBOS-SEM-CONSUMIDOR` | 8768 | BAIXA | sim | P-API-VERBOS-SEM-CONSUMIDOR (2026-09-11) — Verbos de administração sem nenhuma tela (mer |
| `P-MOBILE-STUBS-MOCKS-MORTOS` | 8870 | BAIXA | sim | P-MOBILE-STUBS-MOCKS-MORTOS (2026-09-11) — Stubs `Pending*` mortos (token local nunca nu |
| `P-MOBILE-OCR-ANDAIME-INERTE` | 8921 | BAIXA | sim | P-MOBILE-OCR-ANDAIME-INERTE (2026-09-11) — OCR de recibo: estados, colunas e permissão s |
| `P-JOBS-HANDLERS-PLACEHOLDER` | 9050 | BAIXA | sim | P-JOBS-HANDLERS-PLACEHOLDER (2026-09-11) — Dois handlers vazios ("Placeholder") consomem |
| `P-IMPOUND-OUTBOX-SIVEC-SEM-CONSUMIDOR` | 9067 | BAIXA | sim | P-IMPOUND-OUTBOX-SIVEC-SEM-CONSUMIDOR (2026-09-11) — Outbox Sivec é escrito por 5 reposi |
| `P-CATALOGO-TELAS-PLANEJADAS-AUSENTES` | 9120 | BAIXA | sim | P-CATALOGO-TELAS-PLANEJADAS-AUSENTES (2026-09-11) — Telas do catálogo nunca feitas: rota |
| `P-DOC-CONTRATOS-PROMETEM-INEXISTENTE` | 9137 | BAIXA | sim | P-DOC-CONTRATOS-PROMETEM-INEXISTENTE (2026-09-11) — Contrato promete Cognito e `POST /mo |
| `P-GOV-MOLDE-SEM-CORPOS-DE-JURADO` | 9206 | BAIXA | sim | P-GOV-MOLDE-SEM-CORPOS-DE-JURADO (2026-09-11) — Molde de plano/briefing não prevê os cor |
| `P-O6R-B06-ATA-RESIDUOS-DE-REGISTRO` | 9223 | BAIXA | sim | P-O6R-B06-ATA-RESIDUOS-DE-REGISTRO (2026-09-11) — Ata e votos do B06 com resíduos: plano |
| `P-GOV-SKILL-384-SEM-DECISAO` | 9257 | BAIXA | sim | P-GOV-SKILL-384-SEM-DECISAO (2026-09-11) — Skill `backend-review-ts-prisma` (#384) entro |
| `P-GOV-DECISOES-1968-GATE-INEXISTENTE` | 9376 | BAIXA | sim | P-GOV-DECISOES-1968-GATE-INEXISTENTE (2026-09-11) — Decisão viva sustentada pelo parecer |
| `P-GOV-CONTRATO-HIGIENE-TEXTUAL` | 9393 | BAIXA | sim | P-GOV-CONTRATO-HIGIENE-TEXTUAL (2026-09-11) — Contrato com "assento" solto, `1-ter` ante |
| `P-GOV-MONOCULTURA-FABLE-NOS-GATES` | 9410 | BAIXA | sim | P-GOV-MONOCULTURA-FABLE-NOS-GATES (2026-09-11) — Os três gates fixados no mesmo modelo c |
| `P-GOV-ESPECIALISTAS-SEM-POLITICA-DE-VERSIONAMENTO` | 9427 | BAIXA | sim | P-GOV-ESPECIALISTAS-SEM-POLITICA-DE-VERSIONAMENTO (2026-09-11) — Não há regra se corpos  |
| `P-SAN3-01-ORCAMENTO-SELECTS-SEM-ERRO` | 9572 | BAIXA | sim | P-SAN3-01-ORCAMENTO-SELECTS-SEM-ERRO (2026-09-17) — erro em qualquer dos 3 services deix |
| `P-SAN3-01-JURISDICAO-DEFAULTS-LOCAIS` | 9581 | BAIXA | sim | P-SAN3-01-JURISDICAO-DEFAULTS-LOCAIS (2026-09-17) — `GET /jurisdiction-defaults` falha e |
| `P-SAN3-01-OS-LEGADO-MORTO` | 9590 | BAIXA | sim | P-SAN3-01-OS-LEGADO-MORTO (2026-09-17) — páginas, repositório e mocks legados de OS sem  |
| `P-SAN3-01-SHELL-BADGES-ZERO-NO-ERRO` | 9599 | BAIXA | sim | P-SAN3-01-SHELL-BADGES-ZERO-NO-ERRO (2026-09-17) — os contadores do shell viram "0" quan |
| `P-SAN3-01-CREATE-INVALID-DATE-MENSAGEM` | 9626 | BAIXA | sim | P-SAN3-01-CREATE-INVALID-DATE-MENSAGEM (2026-09-17) — data malformada no create de OS vi |
| `P-SAN3-01-NAV-MENU-DEMO-NO-ERRO` | 9681 | BAIXA | sim | P-SAN3-01-NAV-MENU-DEMO-NO-ERRO (2026-09-18) — quando o menu do backend falha, a navegaç |
| `P-SAN3-01-BATERIA-TSX-CWD` | 9722 | BAIXA | sim | P-SAN3-01-BATERIA-TSX-CWD (2026-09-18) — os testes `.tsx` do frontend só ficam verdes co |
| `P-SAN3-01-STALE-ICONE-COR` | 9731 | BAIXA | sim | P-SAN3-01-STALE-ICONE-COR (2026-09-18) — o ícone da faixa "dados desatualizados" diverge |
| `P-SAN3-01-C2-DIVERGENCIA-VAZIO-NO-CARD` | 9749 | BAIXA | sim | P-SAN3-01-C2-DIVERGENCIA-VAZIO-NO-CARD (2026-09-18) — divergência do plano do ciclo 2 (§ |
| `P-SAN3-04A-MATRIZ-BULLETS-101-103` | 9897 | BAIXA | sim | P-SAN3-04A-MATRIZ-BULLETS-101-103 (2026-09-18) — dois tópicos da matriz não citam o Fina |
| `P-SAN3-04A-TARIFAS-X-L41-FINANCE` | 9905 | BAIXA | sim | P-SAN3-04A-TARIFAS-X-L41-FINANCE (2026-09-18) — tópicos de tarifas e tabelas de valores  |
| `P-KPI-NOTAS-CARREGADAS-REGRESSAO-392` | 10022 | BAIXA | sim | P-KPI-NOTAS-CARREGADAS-REGRESSAO-392 (2026-09-28) — quatro métricas do KPI carregadas se |
| `P-GOV-PROJECT-MEMORY-TETO-VELHO` | 10054 | BAIXA | sim | P-GOV-PROJECT-MEMORY-TETO-VELHO (2026-09-28) — o PROJECT_MEMORY.md, de leitura obrigatór |
| `P-CHORE-CLEANUP-DESCE-EM-WORKTREES` | 10064 | BAIXA | sim | P-CHORE-CLEANUP-DESCE-EM-WORKTREES (2026-09-28) — a limpeza pós-merge apaga cache dentro |
| `P-GOV-OBITUARIO-SEMTETO` | 10074 | BAIXA | sim | P-GOV-OBITUARIO-SEMTETO (2026-10-01) — os três votantes do B-GOV-SEM-TETO não estão no O |
| `P-GOV-PAUSA-ESCADA-C76BIS` | 10084 | BAIXA | sim | P-GOV-PAUSA-ESCADA-C76BIS (2026-10-01) — a parada por Opus esgotado (§C7.6-bis) e a paus |
| `P-GOV-PAUSA-ELABORACOES-DO-TRANSCRITOR` | 10094 | BAIXA | sim | P-GOV-PAUSA-ELABORACOES-DO-TRANSCRITOR (2026-10-01) — 61 elaborações do texto do orquest |
| `P-GOV-PAUSA-CASO-SEM-FONTE` | 10104 | BAIXA | sim | P-GOV-PAUSA-CASO-SEM-FONTE (2026-10-01) — o caso do Dev-T4 que motivou a P7 é chamado de |
| `P-SAN3-01B-PAGINA-FIACAO-DE-INTERACAO` | 10126 | BAIXA | sim | P-SAN3-01B-PAGINA-FIACAO-DE-INTERACAO (2026-10-02) — 9 sítios de fiação de interação da  |
| `P-SAN3-01B-GUARD-DE-ROTA-COM-ATALHO-DE-PLATAFORMA` | 10135 | BAIXA | sim | P-SAN3-01B-GUARD-DE-ROTA-COM-ATALHO-DE-PLATAFORMA (2026-10-02) — o `PermissionGuard` de  |
| `P-SAN3-01B-PROVA-DO-GATE-EXTENSIONAL` | 10158 | BAIXA | sim | P-SAN3-01B-PROVA-DO-GATE-EXTENSIONAL (2026-10-02) — a prova de que o botão "Nova OS" usa |
| `P-SAN3-05-LEITURA-MORTA-PROJECAO-DIARIA` | 10188 | BAIXA | sim | P-SAN3-05-LEITURA-MORTA-PROJECAO-DIARIA (2026-10-03) — leitura da projeção diária sem ch |
| `P-SAN3-05-LOG-DO-SERVIDOR-FORA-DA-CI` | 10224 | BAIXA | sim | P-SAN3-05-LOG-DO-SERVIDOR-FORA-DA-CI (2026-10-09) — CI não lê o server.log do PostgreSQL |
| `P-SAN3-11-VIGENTE-NAO-VINCULADA` | 10256 | BAIXA | sim | P-SAN3-11-VIGENTE-NAO-VINCULADA (2026-10-01 — B-SAN3-11) |
| `P-SAN3-11-ORDEM-DO-REPOSITORIO-INDEFINIDA` | 10273 | BAIXA | sim | P-SAN3-11-ORDEM-DO-REPOSITORIO-INDEFINIDA (2026-10-01 — B-SAN3-11) |
| `P-SAN3-11-CENSO-CAST-RECORD` | 10285 | BAIXA | sim | P-SAN3-11-CENSO-CAST-RECORD (2026-10-05 — B-SAN3-11, revisão do ciclo 3) |
| `P-SAN3-11-TESTES-L3-DESCONHECIDO-E-REDE` | 10297 | BAIXA | sim | P-SAN3-11-TESTES-L3-DESCONHECIDO-E-REDE (2026-10-05 — B-SAN3-11, revisão do ciclo 3) |
| `P-WEB-TOPBAR-ROTULO-FALLBACK` | 10322 | BAIXA | sim | P-WEB-TOPBAR-ROTULO-FALLBACK (2026-10-08) — a barra do topo mostra "Operação" em /users  |
| `P-WEB-PADRAO-MICRODIFERENCAS` | 10332 | BAIXA | sim | P-WEB-PADRAO-MICRODIFERENCAS (2026-10-08) — três diferenças miúdas entre o app e o desig |
| `P-CSV-FORMULA-GLOBAL` | 10355 | BAIXA | sim | P-CSV-FORMULA-GLOBAL (2026-10-08) — os exportadores CSV não neutralizam fórmulas — BAIXA |
| `P-WO-FILTROS-LEGADO-MORTO` | 10377 | BAIXA | sim | P-WO-FILTROS-LEGADO-MORTO (2026-10-08) — componente de filtros antigo sem uso — BAIXA |
| `P-OS-EXPORTAR-PERMISSAO-PREMISSA` | 10398 | BAIXA | sim | P-OS-EXPORTAR-PERMISSAO-PREMISSA (2026-10-08) — exportar a lista de OS usa a permissão d |
| `P-OS-EX4-SO-COLUNA-CLIENTE` | 10408 | BAIXA | sim | P-OS-EX4-SO-COLUNA-CLIENTE (2026-10-08) — o teste de neutralização de fórmula só confere |
| `P-OS-ARIA-CONTROLS-FECHADO` | 10417 | BAIXA | sim | P-OS-ARIA-CONTROLS-FECHADO (2026-10-08) — nenhum teste confere o aria-controls com o pai |
| `P-SAN3-05-LIMPEZA-SEM-FINALLY-MIGRATOR` | 10469 | BAIXA | sim | P-SAN3-05-LIMPEZA-SEM-FINALLY-MIGRATOR (2026-10-09) — fixture pode deixar migrador com p |
| `P-SAN3-05-GUARDA-LOG-FORMA-TEXTUAL` | 10476 | BAIXA | sim | P-SAN3-05-GUARDA-LOG-FORMA-TEXTUAL (2026-10-09) — guarda de log aceita campo textual ind |
| `P-SAN3-05-T15-FALSO-VERMELHO-PORTA` | 10483 | BAIXA | sim | P-SAN3-05-T15-FALSO-VERMELHO-PORTA (2026-10-09) — pid ou tempo pode casar a porta — BAIX |
| `P-SAN3-05-VIEW-SOBRE-FUNCAO-INVOKER` | 10497 | BAIXA | sim | P-SAN3-05-VIEW-SOBRE-FUNCAO-INVOKER (2026-10-09) — view sobre função SQL invoker não é r |
| `P-SAN3-05-SUITE-SEM-FORMAS-F1-F3` | 10504 | BAIXA | sim | P-SAN3-05-SUITE-SEM-FORMAS-F1-F3 (2026-10-09) — a suíte não fixa as formas de view que o |
| `P-SAN3-05-MENSAGEM-DA-RECUSA` | 10525 | BAIXA | sim | P-SAN3-05-MENSAGEM-DA-RECUSA (2026-10-09) — o texto da recusa atribui a via ao papel e n |
| `P-SAN3-06B-E2E-PLATAFORMA-DEFASADO` | 10599 | BAIXA | sim | P-SAN3-06B-E2E-PLATAFORMA-DEFASADO (2026-10-09) — cenário Playwright espera console anti |
| `P-SAN3-06B-HEALTH-FETCH-DIRETO` | 10606 | BAIXA | sim | P-SAN3-06B-HEALTH-FETCH-DIRETO (2026-10-09) — readiness exige resposta crua de 503 — BAI |
| `P-SAN3-06B-TESTES-RESIDUAIS` | 10620 | BAIXA | sim | P-SAN3-06B-TESTES-RESIDUAIS (2026-10-10) — lacunas de teste e um rótulo de Saúde deixado |
| `P-LINT-RAIZ-SEM-MJS` | 10635 | BAIXA | sim | P-LINT-RAIZ-SEM-MJS (2026-10-10) — o lint da raiz não cobre `scripts/*.mjs` — BAIXA |
| `P-KPI-MARCO-2026-10-09-NOTAS` | 10642 | BAIXA | sim | P-KPI-MARCO-2026-10-09-NOTAS (2026-10-10) — três notas do revisor do KPI por marco (#412 |
| `P-O6R-B04-REGISTRO-CICLO1-NAO-VERSIONADO` | 10751 | BAIXA | sim | P-O6R-B04-REGISTRO-CICLO1-NAO-VERSIONADO (2026-10-10) — os votos, o parecer do inspetor  |
| `P-O6R-B04-CENSO-DETECTOR-DE-LITERAIS` | 10798 | BAIXA | sim | P-O6R-B04-CENSO-DETECTOR-DE-LITERAIS (2026-10-10) — o detector somente-leitura do censo  |
| `P-REG-GERADOR-SEVERIDADE-POR-PALAVRA` | 10924 | BAIXA | sim | P-REG-GERADOR-SEVERIDADE-POR-PALAVRA (2026-10-10) — o gerador do índice toma a maior pal |
| `P-AGENTE-CHECK-SEM-GENERATE` | 10944 | BAIXA | sim | P-AGENTE-CHECK-SEM-GENERATE (2026-10-10) — npm run check no worktree descartável exige p |
| `P-AGENTE-API-ANINHAMENTO-PROFUNDO` | 10979 | BAIXA | sim | P-AGENTE-API-ANINHAMENTO-PROFUNDO (2026-10-10) — entrada de ferramenta aninhada além de  |
| `P-INDICE-SEVERIDADE-POR-SUBSTRING` | 11060 | BAIXA | sim | P-INDICE-SEVERIDADE-POR-SUBSTRING (2026-10-11) — o gerador do índice tira a severidade d |
| `P-O6R-B03-TRANSIENT-CODES-DUPLICADOS` | 11132 | BAIXA | sim | P-O6R-B03-TRANSIENT-CODES-DUPLICADOS (2026-10-11) — a lista de códigos transitórios do s |
| `P-O6R-03A-ENUM-SEM-DENUNCIA` | 11145 | BAIXA | sim | P-O6R-03A-ENUM-SEM-DENUNCIA (2026-10-14) — tipo novo no enum do sync de despesa não é de |
| `P-ARNES2-D3-HANDLES-DO-BOOT-RECUSADO` | 11289 | BAIXA | sim | P-ARNES2-D3-HANDLES-DO-BOOT-RECUSADO (2026-10-17) — o que mantinha vivo por ~10 s o proc |
| `P-INVENTORY-CYCLE-COUNT-B16-INTERMITENTE` | 11301 | BAIXA | sim | P-INVENTORY-CYCLE-COUNT-B16-INTERMITENTE (2026-10-17) — o B16 de `inventory-cycle-count- |
| `P-07CB1-CANCELAR-EM-NO-LOCAL` | 11320 | BAIXA | sim | P-07CB1-CANCELAR-EM-NO-LOCAL (2026-10-17) — cancelar ou falhar despacho em "No local" en |
| `P-TRC-CI-COMENTARIO-DENOMINADOR` | 11327 | BAIXA | sim | P-TRC-CI-COMENTARIO-DENOMINADOR (2026-10-18) — o comentário da lista curada do `ci.yml`  |
| `P-TRC-VIATURA-NULL-SEM-SINAL` | 11342 | BAIXA | sim | P-TRC-VIATURA-NULL-SEM-SINAL (2026-10-18) — a OS que perde a viatura para NULL por SQL n |
| `P-TRC-QUARENTENA-CONSERVADORA` | 11350 | BAIXA | sim | P-TRC-QUARENTENA-CONSERVADORA (2026-10-18) — troca de viatura depois do instante quarent |
| `P-TRC-AMBIGUIDADE-MESMO-OPERADOR` | 11357 | BAIXA | sim | P-TRC-AMBIGUIDADE-MESMO-OPERADOR (2026-10-18) — OS desconhecida do mesmo operador não pr |
| `P-TRC-OWN-ONCE-SEM-VIGIA` | 11371 | BAIXA | sim | P-TRC-OWN-ONCE-SEM-VIGIA (2026-10-18) — a propriedade OWN-ONCE (o evento sai uma vez) nã |
| `P-TRC-RELOGIOS-NODE-POSTGRES` | 11377 | BAIXA | sim | P-TRC-RELOGIOS-NODE-POSTGRES (2026-10-18) — hipótese: relógio do Node × relógio do Postg |
| `P-TRC-TETO-REDUNDANTE` | 11384 | BAIXA | sim | P-TRC-TETO-REDUNDANTE (2026-10-18) — redundância do teto de organizações na descoberta — |
| `P-TRC-M-B1-CONTROLE-TERMINATED` | 11390 | BAIXA | sim | P-TRC-M-B1-CONTROLE-TERMINATED (2026-10-18) — sob a mutação M-B1 o T-B1 cai no controle  |
| `P-TRC-AUTORIZACAO-EM-BLOCO` | 11397 | BAIXA | sim | P-TRC-AUTORIZACAO-EM-BLOCO (2026-10-18) — a `D-TRC01-VEHICLE-ASSIGNED-AT` foi aprovada p |
| `P-TRC01-CENSUS-GUARD-SEM-REEXECUCAO` | 11413 | BAIXA | sim | P-TRC01-CENSUS-GUARD-SEM-REEXECUCAO (2026-10-18) — o `o6r07c-census-guard` não roda inte |
| `P-TRC01-R-CICLO2-PERGUNTA-A` | 11421 | BAIXA | sim | P-TRC01-R-CICLO2-PERGUNTA-A (2026-10-18) — o `R-B-TRC-01-ciclo2.md` não responde por esc |
| `P-07CB1-K2-CONCLUSAO-APOS-REINICIO` | 11428 | BAIXA | sim | P-07CB1-K2-CONCLUSAO-APOS-REINICIO (2026-10-18) — a conclusão de vistoria já aplicada vo |
| `P-07CB1-RESIDUAL-BACKFILL` | 11436 | BAIXA | sim | P-07CB1-RESIDUAL-BACKFILL (2026-10-18) — ex-técnico só de despacho reatribuído antes do  |
| `P-07CB1-TECHNICIAN-SEM-FIELD-DISPATCH-UPDATE` | 11453 | BAIXA | sim | P-07CB1-TECHNICIAN-SEM-FIELD-DISPATCH-UPDATE (2026-10-18) — o `technician` despachado nã |
| `P-07CB1-UPLOAD-EVIDENCE-TENANT-MISMATCH-403` | 11461 | BAIXA | sim | P-07CB1-UPLOAD-EVIDENCE-TENANT-MISMATCH-403 (2026-10-18) — upload com `evidence_id` de o |
| `P-07CB1-USAR-DO-SERVIDOR-SEM-ESTADO` | 11469 | BAIXA | sim | P-07CB1-USAR-DO-SERVIDOR-SEM-ESTADO (2026-10-18) — "usar a do servidor" marca a ação loc |
| `P-07CB1-EVIDENCIA-FIELD-OS-ALHEIA-ECOADA` | 11476 | BAIXA | sim | P-07CB1-EVIDENCIA-FIELD-OS-ALHEIA-ECOADA (2026-10-18) — evidência `field_*` aceita `work |
| `P-07CB1-IDEMP-VISTORIA-SEM-ATOR` | 11484 | BAIXA | sim | P-07CB1-IDEMP-VISTORIA-SEM-ATOR (2026-10-18) — a idempotência durável da vistoria por `c |
| `P-07CB1-APP-SEM-MILEAGE-NA-FILA` | 11491 | BAIXA | sim | P-07CB1-APP-SEM-MILEAGE-NA-FILA (2026-10-18) — o app não emite `work_order.mileage` pela |
| `P-DASH-PERFIL-SUPER-ADMIN-ATALHO-UI` | 11515 | BAIXA | sim | P-DASH-PERFIL-SUPER-ADMIN-ATALHO-UI (2026-10-19) — o rótulo "Super Admin" (da sessão ou  |
| `P-FRONT-DOM-MINIMO-TRIPLICADO` | 11534 | BAIXA | sim | P-FRONT-DOM-MINIMO-TRIPLICADO (2026-10-19) — o DOM mínimo de teste do frontend existe em |
| `P-SAN3-02-OS-NAO-TRAVADA` | 11556 | BAIXA | sim | P-SAN3-02-OS-NAO-TRAVADA (2026-10-19) — cancelar a OS durante um faturamento em voo cont |
| `P-SAN3-02-DOWN-COM-COMPLEMENTAR` | 11577 | BAIXA | sim | P-SAN3-02-DOWN-COM-COMPLEMENTAR (2026-10-19) — o down da 20260878 para na ponta B se hou |
| `P-KPI-REGRA-PR-FERRAMENTA` | 11604 | BAIXA | sim | P-KPI-REGRA-PR-FERRAMENTA (2026-10-20) — não há regra escrita sobre PR de ferramenta con |
| `P-TRC02-COMMANDRESULT-IGNORADO` | 11648 | BAIXA | sim | P-TRC02-COMMANDRESULT-IGNORADO (2026-10-20) — `commandResult` e `queuedCommandSent` igno |
| `P-TRC02-STATUS-TIMEOUT-PROD` | 11655 | BAIXA | sim | P-TRC02-STATUS-TIMEOUT-PROD (2026-10-20) — `status.timeout` e `event.status.enable` de p |
| `P-TRC02-DEFICIT-2N` | 11662 | BAIXA | sim | P-TRC02-DEFICIT-2N (2026-10-20) — testes novos abaixo de 2N — BAIXA |
| `P-07C-CENSO-TITULO-T9` | 11676 | BAIXA | sim | P-07C-CENSO-TITULO-T9 (2026-10-20) — o título do T9 do censo congela "os 3 de hoje" em p |
| `P-SAN3-05-LITERAL-DML` | 11690 | BAIXA | sim | P-SAN3-05-LITERAL-DML (2026-10-20) — o inventário de DML do papel de runtime é um número |
| `P-TRC01-IDEMPOTENCIA-CONCORRENTE-503` | 11697 | BAIXA | sim | P-TRC01-IDEMPOTENCIA-CONCORRENTE-503 (2026-10-20) — duas entregas idênticas concorrentes |
| `P-TRC-BATERIA-RATCHET-T13` | 11719 | BAIXA | sim | P-TRC-BATERIA-RATCHET-T13 (2026-10-20) — a bateria dos blocos do Traccar não nomeia a gu |
| `P-TRC02-PORTAS-DE-LEITURA-SEM-CHAMADOR` | 11726 | BAIXA | sim | P-TRC02-PORTAS-DE-LEITURA-SEM-CHAMADOR (2026-10-20) — três portas de leitura da telemetr |
| `P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA` | 11733 | BAIXA | sim | P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA (2026-10-20) — migrações anteriores à 202 |
| `P-SAN3-20-DESVINCULAR-DEPOSITADO` | 11741 | BAIXA | sim | P-SAN3-20-DESVINCULAR-DEPOSITADO (2026-10-24) — cheque pago por outro meio não pode ser  |
| `P-SAN3-20-LEGADO-CHECK-SEM-CHEQUE` | 11760 | BAIXA | sim | P-SAN3-20-LEGADO-CHECK-SEM-CHEQUE (2026-10-24) — legado não permite reconciliar instrume |
| `P-SAN3-20-TELA-CHEQUES` | 11768 | — | sim | P-SAN3-20-TELA-CHEQUES (2026-10-24) — backend sem tela de cheque/pagamento — PRODUTO |
| `P-SAN3-20-ATALHO-PAY-CHEQUE-ID` | 11772 | BAIXA | sim | P-SAN3-20-ATALHO-PAY-CHEQUE-ID (2026-10-24) — não há atalho de vínculo e compensação — B |
| `P-SAN3-20-CHEQUE-LIST-TITLEID-SEM-TESTE` | 11784 | BAIXA | sim | P-SAN3-20-CHEQUE-LIST-TITLEID-SEM-TESTE (2026-10-24) — o `titleId` da lista de cheques n |
| `P-SAN3-12-FILA-PEDIDO-DESVINCULO` | 11806 | — | sim | P-SAN3-12-FILA-PEDIDO-DESVINCULO (2026-10-25) — pedido/aprovação do desvínculo não é per |
| `P-SAN3-12-PREFERENCIA-APARENCIA-NO-SERVIDOR` | 11810 | BAIXA | sim | P-SAN3-12-PREFERENCIA-APARENCIA-NO-SERVIDOR (2026-10-25) — a preferência de aparência vi |
| `P-SAN3-12-STATEPANEL-NA-BIBLIOTECA` | 11813 | BAIXA | sim | P-SAN3-12-STATEPANEL-NA-BIBLIOTECA (2026-10-25) — `StatePanel`/`StaleDataBanner` moram e |
| `P-SAN3-12-ESTORNO-DE-BAIXA-SEM-TELA` | 11816 | BAIXA | sim | P-SAN3-12-ESTORNO-DE-BAIXA-SEM-TELA (2026-10-25) — `/reverse` sem chamador na web — PROD |
| `P-SAN3-12-FILTRO-EXTRATO-POR-TITULO-E-MEIO` | 11819 | BAIXA | sim | P-SAN3-12-FILTRO-EXTRATO-POR-TITULO-E-MEIO (2026-10-25) — `GET /financial-entries` não f |
| `P-SAN3-12-PAGAMENTO-MISTO-CHEQUE` | 11826 | — | sim | P-SAN3-12-PAGAMENTO-MISTO-CHEQUE (2026-10-25) — cheque parcial + outro meio no mesmo tít |
| `P-SAN3-12-CAS-VERSION-COLUMN` | 11838 | BAIXA | sim | P-SAN3-12-CAS-VERSION-COLUMN (2026-10-25) — ABA residual do CAS por estado lógico — BAIX |
| `P-SAN3-12-RBAC-MATRIX-128-CONFLITO` | 11842 | BAIXA | sim | P-SAN3-12-RBAC-MATRIX-128-CONFLITO (2026-10-25) — a matriz dizia "sem permissão nova" pa |
| `P-SAN3-12-REASONS-SEM-CONTRATO` | 11846 | BAIXA | sim | P-SAN3-12-REASONS-SEM-CONTRATO (2026-10-25) — 26 `reason` financeiros pré-existentes sem |
| `P-SAN3-12-DRILL-PRISMA-SHIM-WINDOWS` | 11856 | BAIXA | sim | P-SAN3-12-DRILL-PRISMA-SHIM-WINDOWS (2026-10-25) — drills que chamam o shim bash de `nod |
| `P-DRILL-GENERICO-POR-PREFIXO` | 11861 | BAIXA | sim | P-DRILL-GENERICO-POR-PREFIXO (2026-10-25) — o guard de migração prova que o drill CITA a |
| `P-DB-TIMEZONE-UTC` | 11881 | BAIXA | sim | P-DB-TIMEZONE-UTC (2026-10-25) — exibição de updatedAt depende da TimeZone da sessão — B |
| `P-MOBILE-SYNC-SCREEN-RETRATO-VELHO` | 11958 | BAIXA | sim | P-MOBILE-SYNC-SCREEN-RETRATO-VELHO (2026-11-02) — "Minha versão"/"Versão do gestor" grav |
| `P-MOBILE-DISCARDED-FUTURES` | 12087 | BAIXA | sim | P-MOBILE-DISCARDED-FUTURES (2026-09-19) — 16 `Future`s descartadas em função síncrona ma |
| `P-MOBILE-LINHA-CONFLICT-NAO-LIMPA` | 12118 | BAIXA | sim | P-MOBILE-LINHA-CONFLICT-NAO-LIMPA (2026-10-25) — useServer muda só a ação; a linha fica  |
| `P-MOBILE-REPO-SESSAO-DEMO-DURANTE-RELOAD` | 12124 | BAIXA | sim | P-MOBILE-REPO-SESSAO-DEMO-DURANTE-RELOAD (2026-10-25) — o provider nasce com a sessão de |
| `P-MOBILE-FILA-LER-TUDO-GRAVAR-TUDO` | 12131 | BAIXA | sim | P-MOBILE-FILA-LER-TUDO-GRAVAR-TUDO (2026-10-25) — enqueue/update da fila sobrescrevem a  |
| `P-WO-STATUS-VOCABULARIO-APP-BACKEND` | 12139 | BAIXA | sim | P-WO-STATUS-VOCABULARIO-APP-BACKEND (2026-10-25) — approved só no app; rejected terminal |
| `P-WO-LIST-SCOPE-WEB-TECNICO` | 12145 | BAIXA | sim | P-WO-LIST-SCOPE-WEB-TECNICO (2026-10-25) — confirmar que nenhuma tela web com sessão de  |
| `P-MOBILE-ORFAOS-POS-PURGA` | 12159 | BAIXA | sim | P-MOBILE-ORFAOS-POS-PURGA (2026-10-25) — ação e material órfãos da OS que saiu do aparel |
| `P-TENANT-SETTING-AUDIT-SEM-VALOR` | 12177 | BAIXA | sim | P-TENANT-SETTING-AUDIT-SEM-VALOR (2026-10-26) — `tenant_setting.upserted` não diz o valo |
| `P-RBAC-MIGRATION-PARITY-ESTATICA` | 12183 | BAIXA | sim | P-RBAC-MIGRATION-PARITY-ESTATICA (2026-10-26) — a guarda estática não acusa migração que |
| `P-FINANCIAL-SUMMARY-SEM-SEGUNDA-ORGANIZACAO` | 12188 | BAIXA | sim | P-FINANCIAL-SUMMARY-SEM-SEGUNDA-ORGANIZACAO (2026-10-26) — nenhum teste do resumo financ |
| `P-GUARD-MIGRACAO-CONTROLES-SEM-CASO` | 12201 | BAIXA | sim | P-GUARD-MIGRACAO-CONTROLES-SEM-CASO (2026-10-26) — controles transacionais sem caso de r |
| `P-SAN3-12A-RUNBOOK-REAPLICAR-MIGRACAO` | 12212 | BAIXA | sim | P-SAN3-12A-RUNBOOK-REAPLICAR-MIGRACAO (2026-10-26) — falta reaplicação após rollback man |
| `P-CHK-COMPONENTES-EMPATE-ORDER-INDEX` | 12230 | BAIXA | sim | P-CHK-COMPONENTES-EMPATE-ORDER-INDEX (2026-10-26) — componentes de checklist com o mesmo |
| `P-FINANCE-FRONT-SOMA-DINHEIRO-PRE-EXISTENTE` | 12243 | BAIXA | **a atribuir** | P-FINANCE-FRONT-SOMA-DINHEIRO-PRE-EXISTENTE (2026-10-26) — 8 somas de dinheiro/contagem  |
| `P-SAN3-12B-MENU-ABAS-FORA-DO-GOVERNO` | 12250 | BAIXA | sim | P-SAN3-12B-MENU-ABAS-FORA-DO-GOVERNO (2026-10-26) — os itens Cobranças/Pagamentos do men |
| `P-WEB-GUARDA-ROTA-TEXTO-SEM-ACENTO` | 12260 | BAIXA | sim | P-WEB-GUARDA-ROTA-TEXTO-SEM-ACENTO (2026-10-27) — "Acesso nao autorizado" sem acento no  |
| `P-SAN3-12-CE4-BRACO1-NA-CI` | 12270 | BAIXA | sim | P-SAN3-12-CE4-BRACO1-NA-CI (2026-10-27) — o CE-4 `-db` do 12b roda na CI só no braço 2 ( |
| `P-SAN3-12C-CONTA-SEM-AGENCIA-NUMERO` | 12300 | BAIXA | sim | P-SAN3-12C-CONTA-SEM-AGENCIA-NUMERO (2026-10-28) — a referência mostra agência/número qu |
| `P-SAN3-12C-CHEQUE-FILTRO-INVERSO` | 12306 | BAIXA | sim | P-SAN3-12C-CHEQUE-FILTRO-INVERSO (2026-10-28) — a referência sugere títulos cobertos por |
| `P-SAN3-12C-KPI-MARCO-473` | 12312 | BAIXA | sim | P-SAN3-12C-KPI-MARCO-473 (2026-10-28) — o marco de KPI aguarda o merge e o porteiro do 1 |
| `P-SAN3-12C-RESSALVAS-UM-TIPO-POR-VEZ` | 12317 | BAIXA | sim | P-SAN3-12C-RESSALVAS-UM-TIPO-POR-VEZ (2026-10-30) — a referência mistura as duas ressalv |
| `P-SAN3-12C-CONFERENCIA-ROTULO-DO-FORM` | 12323 | BAIXA | sim | P-SAN3-12C-CONFERENCIA-ROTULO-DO-FORM (2026-10-30) — a referência diz "Conciliar e abrir |
| `P-SAN3-12C-CABECALHO-A-24PX` | 12329 | BAIXA | sim | P-SAN3-12C-CABECALHO-A-24PX (2026-10-30) — o cabeçalho da aparência A continua com 24 px |
| `P-C2R-01-ROLE-PERMS-NO-ROTEIRO` | 12333 | BAIXA | sim | P-C2R-01-ROLE-PERMS-NO-ROTEIRO (2026-10-29) — o roteiro da C2 não registra a geração de  |
| `P-AVREAL-PRAZO-SOMA` | 12374 | BAIXA | sim | P-AVREAL-PRAZO-SOMA (2026-10-31) — prazo de varredura não desconta a fase de conexão / ` |
| `P-AVREAL-VERSION-FUTURO` | 12380 | BAIXA | sim | P-AVREAL-VERSION-FUTURO (2026-10-31) — data de `VERSION` no futuro ou regressão de relóg |
| `P-AVREAL-SEGUNDA-RESPOSTA` | 12386 | BAIXA | sim | P-AVREAL-SEGUNDA-RESPOSTA (2026-10-31) — segunda resposta em pacote TCP separado após o  |
| `P-AVREAL-ROTAS-ROTULO` | 12392 | BAIXA | sim | P-AVREAL-ROTAS-ROTULO (2026-10-31) — `tests/avreal-routes.test.ts` chama `verifyUploadCo |
| `P-COBRANCA-P2-VALORES-DOS-PLANOS` | 12412 | — | sim | P-COBRANCA-P2-VALORES-DOS-PLANOS (2026-10-31) — valores dos 4 planos e dos 2 de rastream |
| `P-COBRANCA-P3-DADOS-FISCAIS-DO-EMISSOR` | 12418 | — | sim | P-COBRANCA-P3-DADOS-FISCAIS-DO-EMISSOR (2026-10-31) — regime, município, enquadramento e |
| `P-ARNES-DB-CATALOG-SWEEP-INTERMITENTE` | 12450 | BAIXA | sim | P-ARNES-DB-CATALOG-SWEEP-INTERMITENTE (2026-11-02) — sweep de órfã velha falhou 1 em 5 r |
| `P-ARNES-TRACCAR-TEMPO-SOB-CARGA` | 12456 | BAIXA | sim | P-ARNES-TRACCAR-TEMPO-SOB-CARGA (2026-11-02) — teste de ingestão divide 400 ms com a máq |
| `P-ORQUESTRACAO-TETO-DOCKER-RYZENCASA` | 12462 | BAIXA | sim | P-ORQUESTRACAO-TETO-DOCKER-RYZENCASA (2026-11-02) — três suítes Linux paralelas morreram |
| `P-MOBILE-BANNER-PROMETE-SINCRONIZAR` | 12468 | BAIXA | sim | P-MOBILE-BANNER-PROMETE-SINCRONIZAR (2026-11-02) — banner offline promete sincronizar "a |
| `P-SAN3-03-IMPORT-ID-EM-COLUNA` | 12480 | BAIXA | sim | P-SAN3-03-IMPORT-ID-EM-COLUNA (2026-11-02) — o import da run mora em `metadata.importId` |
| `P-TK11H-BARREIRA-FASE` | 12486 | BAIXA | sim | P-TK11H-BARREIRA-FASE (2026-11-03) — a barreira concorrente do T-K11h não identifica a f |
| `P-PATIOS-VAGAS-DOSSIE-3-APARENCIAS` | 12520 | — | sim | P-PATIOS-VAGAS-DOSSIE-3-APARENCIAS (2026-11-02) — vagas e dossiê ainda usam o visual ant |
| `P-SAN303-HOMOGLIFO-NOME` | 12550 | BAIXA | sim | P-SAN303-HOMOGLIFO-NOME (2026-11-03) — letra de outro alfabeto no nome da organização de |
| `P-SAN303-TESTE-TAG-INVISIVEL` | 12558 | BAIXA | sim | P-SAN303-TESTE-TAG-INVISIVEL (2026-11-03) — nenhum teste cobre tag com caractere invisív |
| `P-SAN3-21-PERFIL-LOGISTICO` | 12565 | BAIXA | sim | P-SAN3-21-PERFIL-LOGISTICO (2026-11-03) — o nome de perfil "Operador Logistico" segue se |
| `P-FRONT-SMOKE-ACOES-DESPACHO-VACUO` | 12583 | BAIXA | sim | P-FRONT-SMOKE-ACOES-DESPACHO-VACUO (2026-11-03) — a asserção `doesNotMatch(/Acoes do des |
| `P-MOBILE-TITULOS-SEM-ACENTO` | 12590 | BAIXA | sim | P-MOBILE-TITULOS-SEM-ACENTO (2026-11-03) — títulos do app sem acento (`Aprovacoes`, `Dia |
| `P-MOBILE-ROTULO-PAPEIS-FORA-DO-MAPA` | 12607 | BAIXA | sim | P-MOBILE-ROTULO-PAPEIS-FORA-DO-MAPA (2026-11-03) — `super_admin`, `technician` e `viewer |
| `P-MOBILE-IOS-CFBUNDLENAME-17` | 12613 | BAIXA | sim | P-MOBILE-IOS-CFBUNDLENAME-17 (2026-11-03) — `CFBundleName` "ERP Techsolutions" tem 17 ca |
| `P-DEMOFIX-TESTE-REQUISITO-TOGGLE` | 12619 | BAIXA | sim | P-DEMOFIX-TESTE-REQUISITO-TOGGLE (2026-11-03) — o toggle de requisito da liberação não t |
| `P-DESPACHOS-UUID-OPERADOR` | 12625 | BAIXA | sim | P-DESPACHOS-UUID-OPERADOR (2026-11-03) — a linha de Despachos mostra o UUID do operador  |
| `P-PATIO-MINIMAPA-SEM-CARREGANDO` | 12637 | BAIXA | sim | P-PATIO-MINIMAPA-SEM-CARREGANDO (2026-11-03) — minimapa tem skeleton `aria-hidden`, sem  |
| `P-PATIO-DOSSIE-SEM-VAGA-PISCA` | 12643 | BAIXA | sim | P-PATIO-DOSSIE-SEM-VAGA-PISCA (2026-11-03) — dossiê mostra "Sem vaga alocada" antes do p |
| `P-PATIO-REC01-TDOM28-DB-CONTRAPROVA` | 12673 | BAIXA | sim | P-PATIO-REC01-TDOM28-DB-CONTRAPROVA (2026-11-03) — vermelho DB do T-DOM-28 cai por `rele |
| `P-PATIO-REC01-CANARIO-SUPERUSUARIO` | 12679 | BAIXA | sim | P-PATIO-REC01-CANARIO-SUPERUSUARIO (2026-11-03) — canário usa executor falso, não linha  |
| `P-PATIO-BODY-PARSER-ANTES-DO-PORTAO` | 12685 | BAIXA | sim | P-PATIO-BODY-PARSER-ANTES-DO-PORTAO (2026-11-03) — parser global lê JSON malformado ante |
| `P-OS-VISTORIA-NO-DETALHE` | 12691 | BAIXA | sim | P-OS-VISTORIA-NO-DETALHE (2026-11-03) — vistoria no detalhe da OS não chegou à `main` —  |
| `P-OS-DESPACHO-NOME-E-LINHA-DO-TEMPO` | 12697 | BAIXA | sim | P-OS-DESPACHO-NOME-E-LINHA-DO-TEMPO (2026-11-03) — nome do técnico e horários do despach |
| `P-KPI-FRESCOR-BORDAS-ANCORA` | 12703 | BAIXA | sim | P-KPI-FRESCOR-BORDAS-ANCORA (2026-11-03) — bordas do guard de frescor ainda têm mutantes |
| `P-OS-TIPO-GUINCHO-PRESTADOR` | 12870 | BAIXA | sim | P-OS-TIPO-GUINCHO-PRESTADOR (2026-11-04) — a OS não tem tipo de serviço próprio — BAIXA |
| `P-API-ENVELOPES-IRREGULARES` | 12882 | BAIXA | sim | P-API-ENVELOPES-IRREGULARES (2026-11-04) — listas sem `data` e `tenant_id` no topo da re |
| `P-SAN3-10B-BATERIA-B8-FORMATOS` | 12896 | BAIXA | sim | P-SAN3-10B-BATERIA-B8-FORMATOS (2026-11-04) — a bateria B8 não pega três formatos de lin |
| `P-SAN3-10B-OP8-PASSO6` | 12902 | BAIXA | sim | P-SAN3-10B-OP8-PASSO6 (2026-11-04) — o passo 6 da Op-8 não foi medido — BAIXA |
| `P-KPI-PAINEL-EXPLICA-DENOMINADOR` | 12908 | BAIXA | sim | P-KPI-PAINEL-EXPLICA-DENOMINADOR (2026-11-04) — o painel não explica que a vendável caiu |
| `P-ASS02-WRITER-MODULES-FORA-DO-REPOSITORIO` | 12921 | BAIXA | sim | P-ASS02-WRITER-MODULES-FORA-DO-REPOSITORIO (2026-11-05) — escrita de `tenants.modules` e |
| `P-SAN3-05-ETIQUETA-UNICA-POR-ROTA` | 12927 | BAIXA | sim | P-SAN3-05-ETIQUETA-UNICA-POR-ROTA (2026-11-05) — a taxonomia de etiquetas aceita uma só  |
| `P-ASS03-CANARIO-LIMIT1` | 12940 | BAIXA | sim | P-ASS03-CANARIO-LIMIT1 (2026-11-06) — o canário `LIMIT 1` só pega bypass por acaso — BAI |
| `P-ASS03-VEICULOS-SEM-DB` | 12946 | BAIXA | sim | P-ASS03-VEICULOS-SEM-DB (2026-11-06) — o SQL real de veículos não tem variante `-db` — B |
| `P-ASS03-METODO-RATEIO-FALLBACK` | 12952 | BAIXA | sim | P-ASS03-METODO-RATEIO-FALLBACK (2026-11-06) — sem medição, o rateio do banco grava `stor |
| `P-ASS03-PD-SWEEP-CATALOGO` | 12958 | BAIXA | sim | P-ASS03-PD-SWEEP-CATALOGO (2026-11-06) — `(PD) sweep` vermelho só no head, por concorrên |
| `P-ASS-SPLIT-MARGEM-CONTRATO` | 12970 | — | sim | P-ASS-SPLIT-MARGEM-CONTRATO (2026-11-06) — redação do contrato e nota sobre a tarifa do  |
| `P-ASS04-CREDITO-EXCEDENTE` | 12976 | BAIXA | sim | P-ASS04-CREDITO-EXCEDENTE (2026-11-06) — crédito aplicado maior que o total do mês fica  |
| `P-ASS04-VERSAO-APOS-ASSINATURA-MUDADA` | 12982 | BAIXA | sim | P-ASS04-VERSAO-APOS-ASSINATURA-MUDADA (2026-11-06) — refechamento com a assinatura mudad |
| `P-ASS04-REFUND-CREDITO-OUTBOX` | 12988 | BAIXA | sim | P-ASS04-REFUND-CREDITO-OUTBOX (2026-11-06) — o reembolso de crédito ainda não existe: só |
| `P-ASS06-COBRANCA-CRIADA-SEM-ID` | 13012 | BAIXA | sim | P-ASS06-COBRANCA-CRIADA-SEM-ID (2026-11-08) — no PIX e no boleto, a cobrança pode ficar  |
| `P-CI-FLUTTER-LIBSQLITE3-FLAKY` | 13018 | BAIXA | sim | P-CI-FLUTTER-LIBSQLITE3-FLAKY (2026-11-09) — o job `flutter` do CI falha intermitente po |
| `P-CI-FINANCIAL-TITLE-CAS-FLAKY` | 13024 | BAIXA | sim | P-CI-FINANCIAL-TITLE-CAS-FLAKY (2026-11-09) — o `financial-title-status-cas-db` (barreir |
| `P-ASS07-FOCUS-GET-MUNICIPAL` | 13036 | BAIXA | sim | P-ASS07-FOCUS-GET-MUNICIPAL (2026-11-09) — `getInvoice`/`cancel` exercidos só na rota Na |
| `P-ASS07-ALREADY-ISSUED-REGEX` | 13042 | BAIXA | sim | P-ASS07-ALREADY-ISSUED-REGEX (2026-11-09) — `already_issued` depende de regex sobre a me |
| `P-ASS07-CERT-REDACAO` | 13048 | BAIXA | sim | P-ASS07-CERT-REDACAO (2026-11-09) — `sanitizedErrorMessage` redige o certificado como JS |
| `P-REFINO-INVENTARIO-SEM-GUARDA` | 13054 | BAIXA | sim | P-REFINO-INVENTARIO-SEM-GUARDA (2026-11-09) — o inventário de fluxos gerado não tem guar |
| `P-DESPESA-ITEM-CORRIDA-SUBMIT` | 13087 | — | sim | P-DESPESA-ITEM-CORRIDA-SUBMIT (2026-11-10) — um item pode entrar num relatório recém-sub |
| `P-MOBILE-RECIBO-409-POR-MOTIVO` | 13095 | BAIXA | sim | P-MOBILE-RECIBO-409-POR-MOTIVO (2026-11-10) — o app trata todo 409 do comprovante como ` |
| `P-PROCESSO-SONDAS-ANTES-DO-WORKTREE` | 13115 | BAIXA | sim | P-PROCESSO-SONDAS-ANTES-DO-WORKTREE (2026-11-10) — o mandato de cadeira não manda guarda |
| `P-ASS08-INDICE-UMA-VIVA` | 13190 | BAIXA | sim | P-ASS08-INDICE-UMA-VIVA (2026-11-10) — índice parcial "uma `charge_create` viva por demo |
| `P-UPLOAD-ARMAZENAMENTO-EFEMERO` | 13196 | — | sim | P-UPLOAD-ARMAZENAMENTO-EFEMERO (2026-11-10) — a evidência móvel guardada pelo servidor f |
| `P-J522-C3B-01-DOIS-HUNKS` | 13223 | BAIXA | sim | P-J522-C3B-01-DOIS-HUNKS (2026-11-10) — `C3B-01`: dois hunks onde o §5 do plano do segun |
| `P-LOGIN-WEB-TERMO-TENANT` | 13241 | BAIXA | sim | P-LOGIN-WEB-TERMO-TENANT (2026-11-10) — login web ainda expõe termo técnico de organizaç |
| `P-USERS-SEG-TOKEN-ANTERIOR-A-TROCA` | 13279 | BAIXA | sim | P-USERS-SEG-TOKEN-ANTERIOR-A-TROCA (2026-11-11) — o access token INTEIRO emitido antes d |
| `P-USERS-SEG-ORDEM-DE-IMPLANTACAO` | 13285 | BAIXA | sim | P-USERS-SEG-ORDEM-DE-IMPLANTACAO (2026-11-11) — o deploy que contém o #527 vai na ordem  |
| `P-SAN3-08-APPROVE-BACKEND-SO-CAMELCASE` | 13291 | BAIXA | sim | P-SAN3-08-APPROVE-BACKEND-SO-CAMELCASE (2026-11-11) — o approve do orçamento só lê camel |
| `P-SAN3-08-CATALOGO-PLATFORM-ADMIN-APROVA` | 13323 | BAIXA | sim | P-SAN3-08-CATALOGO-PLATFORM-ADMIN-APROVA (2026-11-11) — o `platform_admin` cria e aprova |
| `P-ASS08C-NOTA-PENDENTE-POR-ERRO-DE-VALIDACAO` | 13366 | BAIXA | sim | P-ASS08C-NOTA-PENDENTE-POR-ERRO-DE-VALIDACAO (2026-11-11) — nota `pending` que o provedo |
| `P-ASS08-ZUMBI-ORFA-NOTA` | 13372 | BAIXA | sim | P-ASS08-ZUMBI-ORFA-NOTA (2026-11-11) — trabalhador vivo além do tempo de órfã ainda pode |
| `P-REV533-01-DIALOGO-APROVAR-LIGACAO-SEM-TESTE` | 13398 | BAIXA | sim | P-REV533-01-DIALOGO-APROVAR-LIGACAO-SEM-TESTE (2026-11-11) — os desfechos 403, 409 e 404 |
| `P-REV533-02-DIARIO-E-INDICE-FORA-DO-PERMITIDO` | 13405 | BAIXA | sim | P-REV533-02-DIARIO-E-INDICE-FORA-DO-PERMITIDO (2026-11-11) — o diário do dev e o índice  |
| `P-PORT533-04-DONOS-DAS-P-SAN3-08` | 13412 | BAIXA | sim | P-PORT533-04-DONOS-DAS-P-SAN3-08 (2026-11-11) — 5 das 6 pendências do #533 têm dono gené |
| `P-V533-01-409-TITULO-ACAO-CONCLUIDA` | 13418 | BAIXA | sim | P-V533-01-409-TITULO-ACAO-CONCLUIDA (2026-11-11) — o 409 "já aprovado" aparece com o tít |
| `P-V533-02-AVISO-FORA-DA-VISTA` | 13425 | BAIXA | sim | P-V533-02-AVISO-FORA-DA-VISTA (2026-11-11) — a mensagem do desfecho do "Aprovar orçament |
| `P-V533-P3-MODAL-TECLADO` | 13439 | BAIXA | sim | P-V533-P3-MODAL-TECLADO (2026-11-11) — o `Modal` da biblioteca tem quatro faltas de tecl |
| `P-V533-P4-NOVO-ORCAMENTO-ERRO-E-CORTE` | 13446 | BAIXA | sim | P-V533-P4-NOVO-ORCAMENTO-ERRO-E-CORTE (2026-11-11) — o "Novo orçamento" mostra o erro no |
| `P-V533-P5-ORCAMENTOS-RESIDUO-E-UUID` | 13453 | BAIXA | sim | P-V533-P5-ORCAMENTOS-RESIDUO-E-UUID (2026-11-11) — resíduo de teste e fragmento de UUID  |
| `P-V533-P6-QUOTETAB-TERMO-BACKEND` | 13460 | BAIXA | sim | P-V533-P6-QUOTETAB-TERMO-BACKEND (2026-11-11) — a aba Orçamento da OS diz "O total vem d |
| `P-CONF527B-N01-DIARIOS-DE-TELA-FORA-DO-PERMITIDO` | 13466 | BAIXA | sim | P-CONF527B-N01-DIARIOS-DE-TELA-FORA-DO-PERMITIDO (2026-11-11) — os diários dos devs de t |
| `P-CONF527B-N02-USUARIOS-DB-403-SOB-PRISMA` | 13473 | BAIXA | sim | P-CONF527B-N02-USUARIOS-DB-403-SOB-PRISMA (2026-11-11) — `users-acesso-seg-usuarios-db`  |
| `P-C527T-01-401-MOTIVO-DESCONHECIDO-WEB-X-APP` | 13480 | BAIXA | sim | P-C527T-01-401-MOTIVO-DESCONHECIDO-WEB-X-APP (2026-11-11) — web e app tratam de forma di |
| `P-USERS-SEG-TELA-EMAIL-NEGRITO` | 13487 | BAIXA | sim | P-USERS-SEG-TELA-EMAIL-NEGRITO (2026-11-11) — na troca de senha, o e-mail da sessão sai  |
| `P-P527-ARNES-PAPEL-GLOBAL` | 13493 | BAIXA | sim | P-P527-ARNES-PAPEL-GLOBAL (2026-11-11) — os testes `-db` do #527 criam e apagam papéis g |
| `P-CONF530-02` | 13514 | BAIXA | sim | P-CONF530-02 (2026-11-11) — comentário de `StatementInvoiceRepository.beginIssue` desatu |
| `P-CONF530-03` | 13521 | BAIXA | sim | P-CONF530-03 (2026-11-11) — 3 caminhos do conserto do #530 fora da letra do PERMITIDO —  |
| `P-SAN3-07-SENTINELA-SEM-GUARDA` | 13527 | BAIXA | sim | P-SAN3-07-SENTINELA-SEM-GUARDA (2026-11-11) — o P3 do `B-SAN3-07` passa em vazio se o se |
| `P-J535-C3-02-ITEM47-STATUS-X-RESIDUO` | 13534 | BAIXA | sim | P-J535-C3-02-ITEM47-STATUS-X-RESIDUO (2026-11-11) — a pendência do item 47 está FECHADA  |
| `P-SAN3-05-LISTA-SEM-ALLOCATION-RUNS` | 13541 | BAIXA | sim | P-SAN3-05-LISTA-SEM-ALLOCATION-RUNS (2026-11-11) — a lista fechada do `san3-05` não decl |
| `P-ALLOC-MANUAL-INICIO-INCLUSIVO` | 13548 | BAIXA | sim | P-ALLOC-MANUAL-INICIO-INCLUSIVO (2026-11-11) — no rateio manual, o lado do início contin |
| `P-AWS-CUR-DUBLE-SOBREPOSICAO` | 13555 | BAIXA | sim | P-AWS-CUR-DUBLE-SOBREPOSICAO (2026-11-11) — o dublê em memória do resumo de custo filtra |
| `P-ASS08C-DOC-E-COMENTARIO-NOTA-VIVA` | 13570 | BAIXA | sim | P-ASS08C-DOC-E-COMENTARIO-NOTA-VIVA (2026-11-11) — o documento e um comentário dizem "no |
| `P-SAN3-07-SEED-USERS-LEGADO` | 13591 | BAIXA | sim | P-SAN3-07-SEED-USERS-LEGADO (2026-11-11) — o `seed-users.ts` ainda cria os 5 papéis lega |
| `P-SAN3-07-SEED-FORA-DO-TYPECHECK` | 13598 | BAIXA | sim | P-SAN3-07-SEED-FORA-DO-TYPECHECK (2026-11-11) — `npm run check` não compila `prisma/seed |

## ABERTAS · balde C — DIFERIDO-LEVE (lista nominal, vetavel) — 61

| ID | linha | severidade | dono | titulo |
|---|--:|---|---|---|
| `P-004` | 53 | — | **a atribuir** | P-004 - Codigo morto e sidebar dupla no frontend (2026-07-07) |
| `P-005` | 64 | — | **a atribuir** | P-005 - ui-ux-pro-max search.py ausente (2026-07-07) |
| `P-009` | 104 | — | **a atribuir** | P-009 - Contraste de texto muted (#94A3B8) abaixo de 4.5:1 no DS (2026-07-07) |
| `P-010` | 115 | — | **a atribuir** | P-010 - Codigo morto do adapter de dashboard (pre-C3) (2026-07-07) |
| `P-013` | 154 | — | **a atribuir** | P-013 - F2: guard de disponibilidade so na criacao de OS, nao no assign (2026-07-08) |
| `P-014` | 167 | — | **a atribuir** | P-014 - F3: cancelamento de multa gateado so por papel (sem permissao dedicada) (2026-07 |
| `P-015` | 179 | BAIXA | **a atribuir** | P-015 - F3: `driver_id` parser afrouxado (string) x coluna UUID (2026-07-08) |
| `P-016` | 192 | — | **a atribuir** | P-016 - F4 (R4.3): indicador "viatura sem apolice vigente" na tela Viaturas + Mapa adiad |
| `P-017` | 205 | — | **a atribuir** | P-017 - F4: barra de vigencia de apolice cancelada usa tom neutro/verde (2026-07-08) |
| `P-023` | 280 | — | **a atribuir** | P-023 - F9: "ultimo acesso" do usuario nao tem fonte de dado (2026-07-09) |
| `P-026` | 332 | MÉDIA | sim | P-026 - F11: front `UserRole` nao cobre os 9 papeis canonicos (menu visual aproxima) (20 |
| `P-027` | 347 | MÉDIA | sim | P-027 - F11: divergencias matriz x catalog + perms `purchase_orders:read`/`reports:read` |
| `P-030` | 380 | BAIXA | **a atribuir** | P-030 - Ω2-a.2: residuais BAIXA do gate (comentario 422 enganoso; mapeamento P2003 espec |
| `P-032` | 404 | — | sim | P-032 (Ω2-e) — item de menu Configurações ainda gateado por tenant.manage |
| `P-Ω3a` | 421 | MÉDIA | sim | P-Ω3a (Ω3-a ServiceQuote) — pendências declaradas |
| `P-037` | 478 | BAIXA | sim | P-037 (Ω3-c, BAIXA — validador) — assimetria memory×prisma em freezeChecklistSnapshot |
| `P-Ω3d` | 488 | — | sim | P-Ω3d (Ω3-d Anexos de OS) — coverage/cosmético (junta APROVOU; não-veto) |
| `P-SAN-PROD-WEBIMG` | 666 | — | **a atribuir** | P-SAN-PROD-WEBIMG - Rollback do frontend sem imagem GHCR (Ω-INFRA-3, 2026-07-14) |
| `P-SAN-INFRA1-NITS` | 676 | — | **a atribuir** | P-SAN-INFRA1-NITS - Nits não-bloqueantes do Ω-INFRA-1 (J-SAN-4, 2026-07-13) |
| `P-Ω3F4B-SHARE-TOKEN-UNIQUE` | 748 | BAIXA | **a atribuir** | P-Ω3F4B-SHARE-TOKEN-UNIQUE - share_token sem unicidade/índice; endpoint público adiado ( |
| `P-Ω3F4B-APPROVE-CRASH` | 760 | — | **a atribuir** | P-Ω3F4B-APPROVE-CRASH - Crash duro entre reserva e carimbo do approve (J-OMEGA3F-4B cicl |
| `P-Ω3F5-DOC-TYPE` | 789 | — | **a atribuir** | P-Ω3F5-DOC-TYPE - Categoria de documento no upload manual de anexo (Ω3F-5, 2026-07-15) |
| `P-Ω3F5A-TAG-TOCTOU` | 800 | — | **a atribuir** | P-Ω3F5A-TAG-TOCTOU - Comentário pode persistir com uma tag a menos sob delete concorrent |
| `P-Ω3F6B-MENUITEM-INLINE` | 898 | — | **a atribuir** | P-Ω3F6B-MENUITEM-INLINE - `.ui-menu-item` com background inline mata o hover (J-OMEGA3F- |
| `P-Ω3F6B-DS-NITS` | 912 | — | **a atribuir** | P-Ω3F6B-DS-NITS - Nits de DS/A11y apontados na J-OMEGA3F-6B (2026-07-17) |
| `P-Ω3F-9-SLA-FIELD` | 975 | — | sim | P-Ω3F-9-SLA-FIELD — Campo de prazo/SLA real na OS (aberta, Ω3F-9) |
| `P-Ω3F-9-DISPATCH-DTO` | 984 | — | sim | P-Ω3F-9-DISPATCH-DTO — Expor "envio ativo" no DTO da lista de OS (aberta, Ω3F-9) |
| `P-Ω4-2A-NITS` | 994 | BAIXA | sim | P-Ω4-2A-NITS — Observações da junta do Ω4-2a (2026-07-17) |
| `P-Ω4-ACCOUNT-ACTIVE` | 1023 | BAIXA | sim | P-Ω4-ACCOUNT-ACTIVE — Título pode referenciar conta financeira INATIVA (BAIXA — decidir  |
| `P-Ω4-2A-COBERTURA` | 1031 | BAIXA | sim | P-Ω4-2A-COBERTURA — Nits menores do Ω4-2a (BAIXA) |
| `P-Ω4-2B-A11Y` | 1061 | BAIXA | sim | P-Ω4-2B-A11Y — Menu ⋮ e modais sem dismiss por Escape/clique-fora + focus-trap (BAIXA) |
| `P-Ω4-3-TEST-HERMETIC` | 1084 | BAIXA | sim | P-Ω4-3-TEST-HERMETIC — createMemoryWorkOrderInvoicingService não é puramente memory (BAI |
| `P-Ω4-6-REOPEN-FOUR-EYES` | 1237 | BAIXA | sim | P-Ω4-6-REOPEN-FOUR-EYES — reopen sem segundo ator (risco residual conhecido, BAIXA) |
| `P-Ω4-5-CATEGORY-CASE` | 1303 | BAIXA | sim | P-Ω4-5-CATEGORY-CASE — Filtro ?category= é case-sensitive (BAIXA, pré-existente Ω4-4) |
| `P-Ω4-OVERDUE-TZ` | 1323 | BAIXA | sim | P-Ω4-OVERDUE-TZ — isTitleOverdue + parseDueDate no fuso de negócio (BAIXA, sintoma-irmão |
| `P-Ω4-6-FRONT-RESOLVE-NAME` | 1333 | BAIXA | sim | P-Ω4-6-FRONT-RESOLVE-NAME — /financial-periods expõe closedBy/reopenedBy UUID (BAIXA, pa |
| `P-Ω4-6-NITS` | 1341 | BAIXA | sim | P-Ω4-6-NITS — Nits da pós-análise do Ω4-6 (BAIXA) |
| `P-Ω4-8-SUMMARY-SCALE` | 1424 | BAIXA | sim | P-Ω4-8-SUMMARY-SCALE — /financial-summary faz full-scan das linhas (BAIXA) |
| `P-Ω4-8-DASHBOARD-FIDELITY` | 1433 | MÉDIA | sim | P-Ω4-8-DASHBOARD-FIDELITY — Reduções de composição do dashboard vs financeiro.png (BAIXA |
| `P-UI-REFRESH-LIVENESS` | 1521 | — | **a atribuir** | P-UI-REFRESH-LIVENESS — indicador sutil de auto-atualização nas telas (WS-UI-REFRESH, 20 |
| `P-UI-REFRESH-ERROR-COPY` | 1534 | — | **a atribuir** | P-UI-REFRESH-ERROR-COPY — cópia de erro referencia refresh manual que não existe mais (W |
| `P-RBAC-GATING-MOCKSHELLS` | 1546 | MÉDIA | sim | P-RBAC-GATING-MOCKSHELLS — gating RBAC das 3 telas-casca fica com a ligação a dados (WS- |
| `P-CHECKLIST-RUNS-STATUS-COPY` | 1585 | — | **a atribuir** | P-CHECKLIST-RUNS-STATUS-COPY — status técnico cru na cópia da tela de execuções (2026-07 |
| `P-FINANCE-HEADER-ACTIONS` | 1596 | BAIXA | **a atribuir** | P-FINANCE-HEADER-ACTIONS — page header do Financeiro sem ações à direita (§11 #4, pré-ex |
| `P-JMAPAS7-PERF-SCALE` | 1634 | — | **a atribuir** | P-JMAPAS7-PERF-SCALE — otimização de agregação (groupBy SQL vs full-scan) no technician- |
| `P-WOTS-SCALE` | 1645 | — | **a atribuir** | P-WOTS-SCALE — otimização de agregação (full-scan) no work-order-timeseries (2026-07-19) |
| `P-PLATFORM-HEALTH-OBSERVABILITY` | 1710 | — | **a atribuir** | P-PLATFORM-HEALTH-OBSERVABILITY - Saude da Plataforma = parada honesta ate observabilida |
| `P-PURCHASE-ORDERS-BACKEND-GATE` | 1738 | MÉDIA | sim | P-PURCHASE-ORDERS-BACKEND-GATE - Gate server-side de Pedidos/Relatórios pendente (2026-0 |
| `P-DS-TABS-ARIA` | 1884 | BAIXA | sim | P-DS-TABS-ARIA — Padrão WAI-ARIA de abas incompleto no `Tabs` do design system (BAIXA) |
| `P-PATIOS-HEX-TOKENS` | 1897 | BAIXA | sim | P-PATIOS-HEX-TOKENS — Hex inline no módulo pátios contra J-002 (BAIXA) |
| `P-CHK-RUN-DTO-NARROW` | 1909 | BAIXA | sim | P-CHK-RUN-DTO-NARROW — Estreitar o resumo de ChecklistRun removendo UUIDs não-usados (BA |
| `P-CHK-RUN-ASSIGNEE-SCOPE` | 1922 | BAIXA | sim | P-CHK-RUN-ASSIGNEE-SCOPE — `listChecklistRunsForProcess` não escopa por assignee (BAIXA, |
| `P-CHK-CATALOG-EXHAUSTIVE` | 1993 | BAIXA | sim | P-CHK-CATALOG-EXHAUSTIVE (2026-08-03) — Catálogo de componentes é array, não Record (tsc |
| `P-WO-LIST-TECH-NAME` | 2004 | BAIXA | sim | P-WO-LIST-TECH-NAME (2026-08-04) — DTO da lista de OS sem o nome do técnico atribuído (B |
| `P-USERS-LAST-ACCESS` | 2013 | BAIXA | sim | P-USERS-LAST-ACCESS (2026-08-04) — DTO de usuários sem "último acesso" (BAIXA, UX) |
| `P-AUD-ACTOR-NAME` | 2021 | BAIXA | sim | P-AUD-ACTOR-NAME (2026-08-04) — DTO de auditoria sem nome/perfil do ator (BAIXA, UX) |
| `P-CHK-PREVIEW-DOCK-LIMIAR` | 2280 | BAIXA | **a atribuir** | P-CHK-PREVIEW-DOCK-LIMIAR (2026-08-08) — limiar de 1600px é constante, não medição do co |
| `P-RBAC-PROVISION-DESCRICOES` | 2346 | BAIXA | **a atribuir** | P-RBAC-PROVISION-DESCRICOES (2026-08-08) — descrição curada das permissões duplicada no  |
| `P-CHK-CREATE-RAZAO-NAO-NORMALIZADA` | 3528 | — | **a atribuir** | P-CHK-CREATE-RAZAO-NAO-NORMALIZADA (2026-08-14 — ciclo 4 da revisão do CHK P1 PR-04c-A) |
| `P-O6R-B05-REDIS-HOST-DNS-DIFERIDO` | 3724 | — | **a atribuir** | P-O6R-B05-REDIS-HOST-DNS-DIFERIDO (2026-08-15 — bloco B-O6R-05) |
| `P-REDIS-DEV-LIXO-DE-FILA` | 3768 | — | **a atribuir** | P-REDIS-DEV-LIXO-DE-FILA (2026-08-15 — achado lateral da junta do PR #353) |

## FECHADAS — 200

| ID | linha | severidade | dono | titulo |
|---|--:|---|---|---|
| `P-001` | 26 | — | **a atribuir** | P-001 - Validacao de stack |
| `P-002` | 32 | — | **a atribuir** | P-002 - Push remoto |
| `P-003` | 38 | — | **a atribuir** | P-003 - 2 testes de backend vermelhos na baseline `main` (2026-07-07) |
| `P-008` | 87 | ALTA | sim | P-008 - Fallback mock-first do modulo work-orders permanece fabricado (2026-07-07) |
| `P-011` | 128 | — | **a atribuir** | P-011 - Badge de aprovacoes no sidebar e constante hardcoded (2026-07-07) |
| `P-012` | 139 | BAIXA | **a atribuir** | P-012 - F1: tile "km/L medio da frota" e agregado nao-clicavel (2026-07-08) |
| `P-018` | 217 | — | **a atribuir** | P-018 - Attachments: allowlist de mime confia no Content-Type declarado (sem sniffing) ( |
| `P-019` | 228 | MÉDIA | sim | P-019 - Ocorrencias residuais de persona demo "Marina Costa" fora do mapa (2026-07-08) |
| `P-020` | 247 | ALTA | sim | P-020 - F7a: check de saldo sem SELECT FOR UPDATE (corrida teorica de debito) (2026-07-0 |
| `P-021` | 260 | MÉDIA | **a atribuir** | P-021 - F7b: fechar contagem nao duplica ajustes em retry (RESOLVIDO no bloco) (2026-07- |
| `P-022` | 272 | BAIXA | **a atribuir** | P-022 - F7b: AuditLog na contagem do item (RESOLVIDO no bloco) (2026-07-09) |
| `P-024` | 293 | — | **a atribuir** | P-024 - F9/F11: vocabulario RBAC de usuarios (users:read x users.read) parcialmente reco |
| `P-025` | 303 | BAIXA | **a atribuir** | P-025 - NotificationList EmptyState com termo tecnico "tenant" + acentos (pre-existente) |
| `P-028` | 313 | — | sim | P-028 - Divida sistemica de acentuacao em strings de UI antigas (2026-07-09) |
| `P-029` | 366 | MÉDIA | **a atribuir** | P-029 - Ω2-a.2: modal de edicao de Tarifa mantem selects de referencia habilitados, mas  |
| `P-031` | 397 | — | **a atribuir** | P-031 - Higiene: diretorios untracked .claude/skills/* fora do escopo das PRs (2026-07-1 |
| `P-Ω3b` | 442 | MÉDIA | sim | P-Ω3b (Ω3-b Despacho endurecido + Comentário/Timeline da OS) — validador-mestre |
| `P-036` | 463 | ALTA | sim | P-036 (PRÉ-EXISTENTE — descoberto no smoke do Ω3-c) — create de checklist quebrado no li |
| `P-SAN-CORE-PRISMA-COV` | 531 | — | **a atribuir** | P-SAN-CORE-PRISMA-COV - Adapter prisma do Core SaaS não é exercido pelo gate (Ω-GATE, 20 |
| `P-SAN-KRYOS` | 552 | — | **a atribuir** | P-SAN-KRYOS - Descontaminação Kryos (Ω-DOCS, 2026-07-13) — RESOLVIDA |
| `P-SAN-CORS` | 560 | — | **a atribuir** | P-SAN-CORS - CORS bare (`app.use(cors())` = `*`) e CORS_ORIGIN é config morta (Ω-INFRA-1 |
| `P-SAN-SEED-GUARD` | 574 | MÉDIA | **a atribuir** | P-SAN-SEED-GUARD - Seed demo sem guarda de runtime contra produção (J-SAN-5, 2026-07-14) |
| `P-SAN-PROD-BOOTSTRAP` | 583 | MÉDIA | sim | P-SAN-PROD-BOOTSTRAP - Bootstrap idempotente do 1o platform_admin real (Ω-INFRA-3, 2026- |
| `P-Ω3F1-ENTITYTYPE` | 688 | — | **a atribuir** | P-Ω3F1-ENTITYTYPE - Enum técnico cru na linha "Entidade" da aprovação (J-OMEGA3F-1, 2026 |
| `P-Ω3F2B-ACENTOS` | 698 | — | sim | P-Ω3F2B-ACENTOS - Varredura de acentuação no WorkOrderForm + validador (J-OMEGA3F-2B, 20 |
| `P-Ω3F3A-MOEDA-AGREGADO` | 713 | MÉDIA | **a atribuir** | P-Ω3F3A-MOEDA-AGREGADO - Total agregado somava moedas heterogêneas (J-OMEGA3F-3A, 2026-0 |
| `P-Ω3F4C-ACTIVATION-PROMPT` | 773 | MÉDIA | sim | P-Ω3F4C-ACTIVATION-PROMPT - Aprovar dispara sem diálogo de modo de acionamento/origem-de |
| `P-Ω3F6-COMISSAO` | 813 | MÉDIA | **a atribuir** | P-Ω3F6-COMISSAO - `keep_unpaid` grava a decisão mas não suprime a comissão (Ω3F-6, 2026- |
| `P-Ω3F6-STATUS-BYPASS` | 864 | — | **a atribuir** | P-Ω3F6-STATUS-BYPASS - Cancelamento legado por PATCH /status não grava decisão financeir |
| `P-Ω3F6-TERMINAL-GUARD` | 889 | — | **a atribuir** | P-Ω3F6-TERMINAL-GUARD - Itens financeiros podem ser lançados em OS cancelada (J-OMEGA3F- |
| `P-Ω3F6-ZERO-ATOMICIDADE` | 927 | — | **a atribuir** | P-Ω3F6-ZERO-ATOMICIDADE - `zero` do cancel: N deletes sequenciais sem transação (+ N+1)  |
| `P-Ω3F6B-MENU-GATE-SEM-TESTE` | 939 | — | **a atribuir** | P-Ω3F6B-MENU-GATE-SEM-TESTE - Gate do menu ⋮ não é coberto (provado por mutação) (pós-an |
| `P-Ω4-COMPETENCIA-TZ` | 1008 | BAIXA | sim | P-Ω4-COMPETENCIA-TZ — RESOLVIDO (fix-omega4-competencia-tz, pré-Ω4-6) |
| `P-Ω4-FINANCE-READ-ORFA` | 1040 | ALTA | sim | P-Ω4-FINANCE-READ-ORFA — /finance (dashboard) ainda gated pela órfã finance:read (BAIXA, |
| `P-Ω4-3-REFATURAR-DELTA` | 1069 | MÉDIA | sim | P-Ω4-3-REFATURAR-DELTA — Faturar o delta de itens adicionados após o 1º faturamento (BAI |
| `P-Ω4-3-INVOICE-ATOMIC` | 1093 | MÉDIA | sim | P-Ω4-3-INVOICE-ATOMIC — Título↔carimbo não-atômico (BAIXA) |
| `P-Ω4-3-INVOICE-TOCTOU-DELETE` | 1115 | MÉDIA | sim | P-Ω4-3-INVOICE-TOCTOU-DELETE — DELETE de item durante o faturamento infla o título (BAIX |
| `P-Ω4-4-READINESS` | 1134 | — | sim | P-Ω4-4-READINESS — O que o Ω4-4 (Caixa/liquidação) precisa construir (GUIA, não bug) |
| `P-Ω4-4-LIQUID-ATOMIC` | 1170 | MÉDIA | sim | P-Ω4-4-LIQUID-ATOMIC — Liquidação lançamento↔título não-atômica (MÉDIA) |
| `P-Ω4-4-REVERSE-MUTABLE` | 1183 | — | sim | P-Ω4-4-REVERSE-MUTABLE — reverse() não chama assertMutable — ✅ RESOLVIDO no Ω4-5 |
| `P-Ω4-4-REVERSE-IDEM` | 1194 | MÉDIA | sim | P-Ω4-4-REVERSE-IDEM — Idempotência do estorno é app-level sem rede no banco (MÉDIA) |
| `P-Ω4-4-CHOKEPOINT-CLOSING` | 1204 | — | sim | P-Ω4-4-CHOKEPOINT-CLOSING — chokepoint só bloqueia 'closed', não 'closing' — ✅ RESOLVIDO |
| `P-Ω4-6-CLOSE-RACE` | 1217 | MÉDIA | sim | P-Ω4-6-CLOSE-RACE — read-skew entre a leitura do snapshot e o commit do 'closed' (MÉDIA, |
| `P-Ω4-5-DIVERGENCE` | 1246 | — | sim | P-Ω4-5-DIVERGENCE — Ω4-5 Conciliação (divergence_type + write-path de reconcile) — ✅ RES |
| `P-Ω4-6-READINESS` | 1286 | — | sim | P-Ω4-6-READINESS — O que o Ω4-6 (Fechamento) precisa construir + a exceção reconcile (GU |
| `P-Ω4-COMPETENCIA-TZ` | 1311 | ALTA | sim | P-Ω4-COMPETENCIA-TZ — STATUS: RESOLVIDO (2026-07-18) |
| `P-Ω4-8-READINESS` | 1351 | — | sim | P-Ω4-8-READINESS — Guia do Dashboard financeiro real (Ω4-8) |
| `P-Ω4-7-READINESS` | 1364 | — | sim | P-Ω4-7-READINESS — Guia do Cheque (Ω4-7) |
| `P-Ω4-7-CLEAR-ATOMIC` | 1374 | MÉDIA | sim | P-Ω4-7-CLEAR-ATOMIC — Resíduo de atomicidade do clear/bounce do cheque (BAIXA — espelha  |
| `P-Ω4-7-ENTRY-OWNERSHIP` | 1386 | BAIXA | sim | P-Ω4-7-ENTRY-OWNERSHIP — Lançamento de cheque manipulável direto por /financial-entries  |
| `P-Ω4-7-DUPLA-CONTAGEM` | 1398 | BAIXA | sim | P-Ω4-7-DUPLA-CONTAGEM — cheque-register vs payTitle p/ o mesmo dinheiro (BAIXA — risco d |
| `P-Ω4-7-CLEAR-RETRO` | 1410 | BAIXA | sim | P-Ω4-7-CLEAR-RETRO — Compensação retroativa a período fechado (BAIXA) |
| `P-GOLIVE-SECRET-ROTATE` | 1477 | CRÍTICA | sim | P-GOLIVE-SECRET-ROTATE — ~~Chave Google Maps: rotação humana obrigatória~~ — **FECHADA ( |
| `P-RBAC-CATALOG-MATRIZ` | 1563 | — | **a atribuir** | P-RBAC-CATALOG-MATRIZ — divergências pré-existentes catalog.ts × RBAC_MATRIX.md em check |
| `P-CHECKLIST-BUILDER-READONLY` | 1574 | — | **a atribuir** | P-CHECKLIST-BUILDER-READONLY — builder interativo no modo "Visualizar" para papel só-lei |
| `P-MAPA-GOOGLE-PADDING-RESIZE` | 1609 | — | **a atribuir** | P-MAPA-GOOGLE-PADDING-RESIZE — GoogleMapsCanvas não re-enquadra ao expandir rail (WS-MAP |
| `P-MAPA-TERM-OPERADORES` | 1621 | — | **a atribuir** | P-MAPA-TERM-OPERADORES — terminologia residual "operadores" no subtítulo/aria dos canvas |
| `P-WOTS-FRONT-ACCESS` | 1655 | — | **a atribuir** | P-WOTS-FRONT-ACCESS — gráfico temporal deve tratar 403 (papel sem work_orders:read) no D |
| `P-PLATFORM-MOCK-WIRING` | 1662 | — | **a atribuir** | P-PLATFORM-MOCK-WIRING - Telas de Plataforma 100% mock hardcoded (2026-07-20, WS-CARDS-C |
| `P-SCALE-RBAC-OWNER-APPROVAL` | 1677 | — | **a atribuir** | P-SCALE-RBAC-OWNER-APPROVAL - Expansao de RBAC (purchase_orders/reports) requer o dono N |
| `P-PLATFORM-TENANTDETAIL-REAL` | 1725 | — | **a atribuir** | P-PLATFORM-TENANTDETAIL-REAL - Detalhe da Organizacao (plataforma) ainda mock (2026-07-2 |
| `P-NAV-MENU-PLATFORM` | 1775 | — | **a atribuir** | P-NAV-MENU-PLATFORM — menu `scope=platform` falhava sob JWT/Prisma (2026-07-28) |
| `P-RBAC-CHECKLIST-DRIFT` | 1808 | — | sim | P-RBAC-CHECKLIST-DRIFT (2026-08-01) — reconciliação residual da matriz de checklist (fol |
| `P-CHK-TEMPLATE-PRISMA-V7` | 1846 | — | sim | P-CHK-TEMPLATE-PRISMA-V7 (2026-08-01) — createTemplate falha no runtime do Prisma v7 (bu |
| `P-DOSSIE-PAGE-TABS` | 1935 | BAIXA | sim | P-DOSSIE-PAGE-TABS — Página fallback /patios/processos/:id não reflete as abas Checklist |
| `P-CHK-RENDER-ENVELOPE` | 1957 | ALTA | sim | P-CHK-RENDER-ENVELOPE (2026-08-03) — O run screen mobile renderiza dos SEEDS, não do bac |
| `P-SUITE-ENV-PERSISTENCE` | 2031 | MÉDIA | **a atribuir** | P-SUITE-ENV-PERSISTENCE (2026-08-05) — suíte backend depende de `CORE_SAAS_PERSISTENCE=m |
| `P-MOBILE-OS-SEEDS` | 2080 | ALTA | sim | P-MOBILE-OS-SEEDS (2026-08-06) — lista de OS do app mostra SEEDS locais como se fossem d |
| `P-CHK-COMPONENT-TYPE-CHECK` | 2094 | ALTA | **a atribuir** | P-CHK-COMPONENT-TYPE-CHECK (2026-08-08) — CHECK do banco recusava os 3 tipos do PR-01 —  |
| `P-CHK-PATCH-SEM-TYPE` | 2125 | ALTA | **a atribuir** | P-CHK-PATCH-SEM-TYPE (2026-08-06) — o PATCH de modelo de checklist não carrega `type` (M |
| `P-CHK-PATCH-SEM-LOCK` | 2151 | MÉDIA | sim | P-CHK-PATCH-SEM-LOCK (2026-08-07) — PATCH de checklist é last-write-wins sem guarda de v |
| `P-CHK-INATIVAR-COM-RUN-ATIVA` | 2193 | MÉDIA | **a atribuir** | P-CHK-INATIVAR-COM-RUN-ATIVA (2026-08-08) — inativar um modelo derruba quem já está no c |
| `P-CHK-SEED-DEMO-SUJO` | 2233 | CRÍTICA | sim | P-CHK-SEED-DEMO-SUJO (2026-08-08) — dados de demonstração com nomes técnicos e lixo de t |
| `P-RBAC-CATALOGO-NAO-CHEGA-AO-BANCO` | 2292 | ALTA | **a atribuir** | P-RBAC-CATALOGO-NAO-CHEGA-AO-BANCO (2026-08-08) — permissão declarada em código nasce MO |
| `P-RBAC-PROVISIONAMENTO-CONVERGENTE` | 2324 | ALTA | **a atribuir** | P-RBAC-PROVISIONAMENTO-CONVERGENTE (2026-08-08) — migração de dados de RBAC era no-op SI |
| `P-CHK-DOSSIE-VERSAO-NA-UI` | 2361 | — | sim | P-CHK-DOSSIE-VERSAO-NA-UI (2026-08-10 — junta do CHK P1 PR-03, 2ª rodada) |
| `P-CHK-FLUTTER-KIND-COLAPSA` | 2384 | MÉDIA | sim | P-CHK-FLUTTER-KIND-COLAPSA (2026-08-10 — junta do CHK P1 PR-04, voto vencido do `coorden |
| `P-CHK-CUSTODIA-AUTOLINK-SEM-FILTRO` | 2416 | — | **a atribuir** | P-CHK-CUSTODIA-AUTOLINK-SEM-FILTRO (2026-08-10 — junta do CHK P1 PR-04, achado A3 do `cr |
| `P-WORKTREE-INTEROP-ORFAO` | 2475 | — | sim | P-WORKTREE-INTEROP-ORFAO (2026-08-12) — **RESOLVIDA no mesmo dia: DESCARTADA por decisão |
| `P-WORKTREE-INTEROP-ORFAO` | 2500 | — | **a atribuir** | P-WORKTREE-INTEROP-ORFAO — registro original (achado do `porteiro-pos-merge` no gate do  |
| `P-O6R-B01` | 2599 | — | **a atribuir** | P-O6R-B01 (2026-08-14) — `fix/identity-authority` — Ω6R-SEC-001 + Ω6R-TEN-001 (2 P0) — * |
| `P-O6R-B02` | 2785 | BAIXA | sim | P-O6R-B02 (2026-08-14) — `fix/financial-uow` — Ω6R-DIN-001..004, DIN-008 (5 P0) + QUA-00 |
| `P-O6R-B03` | 2927 | — | sim | P-O6R-B03 (2026-08-14) — `fix/expense-sync-atomic` — Ω6R-DIN-009 (P0) + QUA-001 (P1) — * |
| `P-O6R-B05` | 3065 | — | **a atribuir** | P-O6R-B05 (2026-08-14) — `fix/production-runtime-gates` — Ω6R-DAT-001 + Ω6R-DIN-006 (2 P |
| `P-O6R-B06` | 3105 | — | **a atribuir** | P-O6R-B06 (2026-08-14) — `fix/billing-durability` — Ω6R-DIN-005 + Ω6R-DIN-007 (2 P0) — * |
| `P-O6R-B07A-PROVISIONAMENTO-DA-CHAVE` | 3249 | ALTA | **a atribuir** | P-O6R-B07A-PROVISIONAMENTO-DA-CHAVE (2026-09-02) — `work_orders:approve` exige migração  |
| `P-O6R-B07A-STICKY-409-VIRA-403` | 3293 | ALTA | **a atribuir** | P-O6R-B07A-STICKY-409-VIRA-403 (2026-09-02) — o escopo por objeto muda o código de um te |
| `P-NPM-TEST-VERDE-VAZIO-NO-WINDOWS` | 3543 | — | **a atribuir** | P-NPM-TEST-VERDE-VAZIO-NO-WINDOWS (2026-08-15 — porteiro pós-merge do #352) |
| `P-O6R-B05-STAGING-SCALE-ZERO` | 3631 | — | **a atribuir** | P-O6R-B05-STAGING-SCALE-ZERO (2026-08-15 — bloco B-O6R-05, questão Q5) |
| `P-SUITE-NAO-SUPORTA-ENV-PRISMA` | 3661 | — | **a atribuir** | P-SUITE-NAO-SUPORTA-ENV-PRISMA (2026-08-15 — bloco B-O6R-05, revelado ao consertar o `np |
| `P-O6R-B01-ANONIMO-SEM-LOCKOUT` | 3885 | ALTA | sim | P-O6R-B01-ANONIMO-SEM-LOCKOUT (2026-08-19) — **ALTA** · o caminho anônimo não arma o loc |
| `P-ARNES-DIVERGENCIA-RUNNER-SUMICO-NAO-EXISTE-NA-MAIN` | 4177 | MÉDIA | sim | P-ARNES-DIVERGENCIA-RUNNER-SUMICO-NAO-EXISTE-NA-MAIN (2026-08-28) — divergência do plano |
| `P-ARNES-DIVERGENCIA-KPI-APP-JS-FORA-DA-` | 4210 | — | sim | P-ARNES-DIVERGENCIA-KPI-APP-JS-FORA-DA-§5 (2026-08-28) — divergência do plano, registrad |
| `P-ARNES-AUTO-DEFEITOS-DO-PROPRIO-BLOCO` | 4225 | — | sim | P-ARNES-AUTO-DEFEITOS-DO-PROPRIO-BLOCO (2026-08-28) — DOIS achados por execução CONTRA a |
| `P-O6R-B02` | 4266 | — | sim | P-O6R-B02 — CICLO 4 REPROVADO 4×1 (2026-08-28) — a classe que reprova é de ARNÊS, não de |
| `P-O6R-B02-OVERCLAIM-ORFA-SQL-CRU` | 4286 | MÉDIA | sim | P-O6R-B02-OVERCLAIM-ORFA-SQL-CRU (2026-08-28 — cadeira de ataque, ajuste A1) — MÉDIA |
| `P-O6R-B02-TESTE-RLS-SUPERUSER` | 4305 | MÉDIA | sim | P-O6R-B02-TESTE-RLS-SUPERUSER (2026-08-28 — cadeira de banco, ajuste A2) — MÉDIA |
| `P-O6R-B02-DIVERGENCIA-D27-D21` | 4320 | BAIXA | sim | P-O6R-B02-DIVERGENCIA-D27-D21 (2026-08-28 — cadeira de validação, ajuste A3) — BAIXA (re |
| `P-O6R-B02-BATERIA-CANONICAS-1-2` | 4331 | MÉDIA | sim | P-O6R-B02-BATERIA-CANONICAS-1-2 (2026-08-28 — validação, ajuste A4) — MÉDIA |
| `P-O6R-B02-SUITES-LIST-CI` | 4350 | MÉDIA | sim | P-O6R-B02-SUITES-LIST-CI (2026-08-28 — validação A5 + arnês #6) — MÉDIA |
| `P-O6R-B02-REGISTRO-STATUS-LOG` | 4477 | BAIXA | sim | P-O6R-B02-REGISTRO-STATUS-LOG (2026-08-28 — validação A5) — BAIXA |
| `P-O6R-B02-CENSO-CASO-PERMANENTE` | 4490 | BAIXA | sim | P-O6R-B02-CENSO-CASO-PERMANENTE (2026-08-28 — validação A6) — BAIXA |
| `P-O6R-B02-S0-ESPELHO-NO-HEAD` | 4504 | ALTA | sim | P-O6R-B02-S0-ESPELHO-NO-HEAD (2026-08-28 — validação A7) — **FECHADA POR NÃO-REPRODUÇÃO  |
| `P-O6R-B02-RUNNER-SUMICO-SEM-SKIP` | 4520 | MÉDIA | **a atribuir** | P-O6R-B02-RUNNER-SUMICO-SEM-SKIP (2026-08-28 — arnês #4 / D26b) — MÉDIA (mesma classe do |
| `P-ARNES-AUTHORITY-PORTAL-INTERMITENTE` | 4694 | MÉDIA | sim | P-ARNES-AUTHORITY-PORTAL-INTERMITENTE (2026-08-28) — MÉDIA · **Dono: a atribuir por exec |
| `P-ARNES-REGISTROS-DEFASADOS-NA-MAIN` | 4752 | BAIXA | sim | P-ARNES-REGISTROS-DEFASADOS-NA-MAIN (2026-08-28) — BAIXA · **FECHADA (2026-08-29, este P |
| `P-ARNES-BACKFILL-359` | 4777 | MÉDIA | **a atribuir** | P-ARNES-BACKFILL-359 (2026-08-28) — MÉDIA · **FECHADA (2026-08-28, este PR)** |
| `P-REG-S0-GUARD-FALSO-VERMELHO` | 4848 | MÉDIA | sim | P-REG-S0-GUARD-FALSO-VERMELHO (2026-08-29) — MÉDIA · **Dono:** próximo bloco que puder t |
| `P-REG-BATERIA-BARATA-DUAS-LISTAS` | 4920 | MÉDIA | sim | P-REG-BATERIA-BARATA-DUAS-LISTAS (2026-08-29) — MÉDIA · **Dono:** `B-O6R-02` ciclo 5 (é  |
| `P-GOV-MAIN-SEM-PROTECAO` | 5008 | ALTA | sim | P-GOV-MAIN-SEM-PROTECAO — a `main` não tem proteção nenhuma (2026-08-24) |
| `P-C7-BIS-TER-FORA-DA-MAIN` | 5098 | MÉDIA | sim | P-C7-BIS-TER-FORA-DA-MAIN (2026-08-30) — MÉDIA · **FECHADA no mesmo PR que a abriu** |
| `P-SAN2-2-PORTA-55432-RESERVADA` | 5175 | BAIXA | sim | P-SAN2-2-PORTA-55432-RESERVADA (2026-08-30) — armadilha de terreno, não defeito de produ |
| `P-KPI-RECENT-CONGELADO` | 5658 | MÉDIA | sim | P-KPI-RECENT-CONGELADO (2026-08-31) — MÉDIA · a seção "Últimas demandas" do painel está  |
| `P-SYNC-AGENTS-NAO-RECURSIVO` | 5861 | MÉDIA | sim | P-SYNC-AGENTS-NAO-RECURSIVO (2026-08-31 — medido pelo dev do `SAN2-5`, entrega E2d) — MÉ |
| `P-O6R-B07A-REGISTRO-A2-DIVIDA-368` | 6723 | — | **a atribuir** | P-O6R-B07A-REGISTRO-A2-DIVIDA-368 (2026-09-02) — reatribuição da dívida de backfill do # |
| `P-O6R-SUBRECURSO-OBJECT-SCOPE` | 6774 | ALTA | sim | P-O6R-SUBRECURSO-OBJECT-SCOPE (registro 2/7, 2026-09-03) — 10 vias mutantes sobre OS ALH |
| `P-GOV-D-DURABILIDADE-FORA-DA-MAIN` | 7167 | MÉDIA | sim | P-GOV-D-DURABILIDADE-FORA-DA-MAIN (2026-09-05) — MÉDIA · a decisão sobre durabilidade só |
| `P-O6R-B07B-STAGING-SEM-UPLOAD` | 7247 | ALTA | sim | P-O6R-B07B-STAGING-SEM-UPLOAD (2026-09-06) — staging para de aceitar foto no dia do depl |
| `P-GOV-FILA-P1-ANTES-DE-P0` | 7425 | MÉDIA | sim | P-GOV-FILA-P1-ANTES-DE-P0 (2026-09-06) — um P1 executado com 6 P0 abertos, e a agenda da |
| `P-O6R-B06-USAGE-BEST-EFFORT-RESIDUAL` | 7543 | ALTA | sim | P-O6R-B06-USAGE-BEST-EFFORT-RESIDUAL (2026-09-07) — as chaves de anexo e de job continua |
| `P-O6R-B06-BASE-SEM-PRODUTOR` | 7572 | ALTA | sim | P-O6R-B06-BASE-SEM-PRODUTOR (2026-09-07) — três categorias de custo caem sempre em `unal |
| `P-O6R-B06-DIVERGENCIA-ESCOPO-TESTES-DB` | 7695 | MÉDIA | sim | P-O6R-B06-DIVERGENCIA-ESCOPO-TESTES-DB (2026-09-07) — duas suítes fora da lista §6 tiver |
| `P-O6R-B06-PAPEL-DO-DRILL-VEM-DO-ARNES` | 7730 | BAIXA | sim | P-O6R-B06-PAPEL-DO-DRILL-VEM-DO-ARNES (2026-09-07) — o papel sem BYPASSRLS não se chama  |
| `P-GOV-WORKTREES-NAO-IGNORADAS` | 7803 | MÉDIA | sim | P-GOV-WORKTREES-NAO-IGNORADAS (2026-09-07) — FECHADA POR NÃO-REPRODUÇÃO em 2026-09-08 —  |
| `P-GOV-NOTA-KPI-CONGELADA` | 8008 | MÉDIA | **a atribuir** | P-GOV-NOTA-KPI-CONGELADA (2026-09-07) — nota de KPI medida num head antigo, apresentada  |
| `P-GOV-BAIXA-CICLO1-FECHADOS` | 8033 | BAIXA | **a atribuir** | P-GOV-BAIXA-CICLO1-FECHADOS (2026-09-08) — os três achados BAIXA do ciclo 1, fechados na |
| `P-GOV-INSPETOR-33-SEM-NORMA` | 8151 | ALTA | sim | P-GOV-INSPETOR-33-SEM-NORMA (2026-09-08) — o contrato do inspetor manda bloquear por nor |
| `P-O6R-LISTCOSTLINEITEMS-SEM-ESCOPO-IMPORT` | 8398 | BAIXA | sim | P-O6R-LISTCOSTLINEITEMS-SEM-ESCOPO-IMPORT (2026-09-09) — a leitura do rateio soma por ov |
| `P-WEB-CLOUD-BILLING-CARTAZ` | 8563 | MÉDIA | sim | P-WEB-CLOUD-BILLING-CARTAZ (2026-09-11) — Tela Cloud Billing é cartaz de literais com se |
| `P-WEB-FIN-BAIXA-E-CONTA-SEM-TELA` | 8599 | ALTA | sim | P-WEB-FIN-BAIXA-E-CONTA-SEM-TELA (2026-09-11) — Web emite título mas não liquida: sem te |
| `P-WEB-PLATAFORMA-TELAS-FICCAO` | 8669 | MÉDIA | sim | P-WEB-PLATAFORMA-TELAS-FICCAO (2026-09-11) — Planos e Módulos, Auditoria Global, APIs e  |
| `P-WEB-PLATAFORMA-SEGURANCA-FABRICADA` | 8687 | ALTA | sim | P-WEB-PLATAFORMA-SEGURANCA-FABRICADA (2026-09-11) — Configurações da Plataforma mostram  |
| `P-MOBILE-MINHAS-OS-SEM-FILTRO` | 8938 | ALTA | sim | P-MOBILE-MINHAS-OS-SEM-FILTRO (2026-09-11) — "Minhas OS" lista a organização inteira, se |
| `P-MOBILE-FAXINA-TERMOS-TECNICOS` | 8956 | CRÍTICA | sim | P-MOBILE-FAXINA-TERMOS-TECNICOS (2026-09-11) — App mostra papel cru, placeholder técnico |
| `P-KPI-ROADMAP-CONGELADO` | 9154 | MÉDIA | sim | P-KPI-ROADMAP-CONGELADO (2026-09-11) — Roadmap do painel parado em 2026-08-19 marca bloc |
| `P-RBAC-MATRIZ-X-CATALOGO-QUATRO-CELULAS` | 9503 | ALTA | sim | P-RBAC-MATRIZ-X-CATALOGO-QUATRO-CELULAS (2026-09-12) — quatro células de ação da matriz  |
| `P-WEB-CONCILIACAO-SEM-TELA` | 9525 | ALTA | sim | P-WEB-CONCILIACAO-SEM-TELA (2026-09-13) — a conciliação é prometida e a web não concilia |
| `P-SAN3-01-DESPACHO-DETALHE-FABRICADO` | 9534 | ALTA | sim | P-SAN3-01-DESPACHO-DETALHE-FABRICADO (2026-09-17) — o detalhe do despacho fabricava `dis |
| `P-SAN3-01-MOCKMODE-TRES-AUTORIDADES` | 9671 | MÉDIA | sim | P-SAN3-01-MOCKMODE-TRES-AUTORIDADES (2026-09-18) — três interruptores de modo mock com p |
| `P-SAN3-01-NOVA-OS-SEM-GATE-NO-BOTAO` | 9690 | BAIXA | sim | P-SAN3-01-NOVA-OS-SEM-GATE-NO-BOTAO (2026-09-18) — o botão "Nova OS" do cabeçalho da lis |
| `P-SAN3-01-OS-VAZIO-SEM-ACAO` | 9740 | BAIXA | sim | P-SAN3-01-OS-VAZIO-SEM-ACAO (2026-09-18) — a lista de OS vazia não oferecia a ação de cr |
| `P-SAN3-01B-PAGINA-NAO-AMARRADA-AO-ESTADO` | 9758 | ALTA | sim | P-SAN3-01B-PAGINA-NAO-AMARRADA-AO-ESTADO (2026-09-19) — a decisão da página não está ama |
| `P-SAN3-01B-GUARD-ALCANCE-MENOR-QUE-AS-RAIZES` | 9767 | ALTA | sim | P-SAN3-01B-GUARD-ALCANCE-MENOR-QUE-AS-RAIZES (2026-09-19) — o guard do mock não pega o p |
| `P-SAN3-01B-VIGIA-TEXTUAL-DA-FIACAO` | 9776 | MÉDIA | sim | P-SAN3-01B-VIGIA-TEXTUAL-DA-FIACAO (2026-09-19) — os vigias da fiação dos hooks são text |
| `P-SAN3-04A-SEED-PAPEIS-LEGADOS` | 9861 | MÉDIA | sim | P-SAN3-04A-SEED-PAPEIS-LEGADOS (2026-09-18) — base preparada só com o seed não tem cinco |
| `P-SAN3-00-IGNORE-GLOBAL-POR-NOME-DENTRO-DOS-REINCLUIDOS` | 9965 | MÉDIA | **a atribuir** | P-SAN3-00-IGNORE-GLOBAL-POR-NOME-DENTRO-DOS-REINCLUIDOS (2026-09-21) — dentro dos diretó |
| `P-SAN3-01B-CABECALHO-OS-DIVERGE-DA-REFERENCIA` | 10178 | BAIXA | sim | P-SAN3-01B-CABECALHO-OS-DIVERGE-DA-REFERENCIA (2026-10-02) — o cabeçalho da lista de OS  |
| `P-SAN3-05-LACO-POR-TENANT-DUPLICADO` | 10194 | BAIXA | sim | P-SAN3-05-LACO-POR-TENANT-DUPLICADO (2026-10-03) — dois laços confiados pelo ratchet — B |
| `P-OS-FILTRAR-EXPORTAR` | 10308 | MÉDIA | sim | P-OS-FILTRAR-EXPORTAR (2026-10-08) — a lista de OS não tem Filtrar nem Exportar, que as  |
| `P-SAN3-05-T15-TETO-DE-RELOGIO` | 10511 | MÉDIA | sim | P-SAN3-05-T15-TETO-DE-RELOGIO (2026-10-09) — o T15 reprova por tempo de máquina sob carg |
| `P-SAN3-06B-PLANOS-SEM-ENDPOINT` | 10569 | MÉDIA | sim | P-SAN3-06B-PLANOS-SEM-ENDPOINT (2026-10-09) — catálogo comercial sem rota — MÉDIA |
| `P-CLOUD-BILLING-ORG-SISTEMA` | 10627 | MÉDIA | sim | P-CLOUD-BILLING-ORG-SISTEMA (2026-10-10) — o rateio do Cloud Billing pode cobrar a organ |
| `P-O6R-B04-DIVERGENCIA-ESCOPO-TESTE-ISOLAMENTO` | 10694 | BAIXA | sim | P-O6R-B04-DIVERGENCIA-ESCOPO-TESTE-ISOLAMENTO (2026-09-18) — um teste de rota fora da li |
| `P-TRC-FORMA-QUATRO-OU-SETE` | 10805 | ALTA | sim | P-TRC-FORMA-QUATRO-OU-SETE (2026-10-10) — conflito §A2 entre a forma do Traccar na decis |
| `P-TRC-AWS-FLY-PRAZO` | 10817 | ALTA | sim | P-TRC-AWS-FLY-PRAZO (2026-10-10) — escolha AWS × Fly, que o registro pôs antes do Dia 1  |
| `P-TRC-CONVIVENCIA-APP` | 10826 | ALTA | sim | P-TRC-CONVIVENCIA-APP (2026-10-10) — app e Traccar disputam o mesmo "último ponto" do té |
| `P-TRC-ATRIBUICAO-PRODUTO` | 10837 | MÉDIA | sim | P-TRC-ATRIBUICAO-PRODUTO (2026-10-10) — o que a atribuição por despacho mostra e esconde |
| `P-O6R06-A10-LIMPEZA-FK-INTERMITENTE` | 10930 | MÉDIA | sim | P-O6R06-A10-LIMPEZA-FK-INTERMITENTE (2026-10-10) — o A10 de `o6r06-usage-atomic-db` falh |
| `P-TRC-PLANO-V22` | 10960 | MÉDIA | sim | P-TRC-PLANO-V22 (2026-10-11) — o plano do Traccar precisa da v2.2 com as decisões do don |
| `P-OWNER-PORTAL-POW-TESTE-PROBABILISTICO` | 10967 | BAIXA | sim | P-OWNER-PORTAL-POW-TESTE-PROBABILISTICO (2026-10-10) — o teste de PoW falha 1 vez em 256 |
| `P-TRC-MODELOS-RASTREADOR` | 10992 | — | **a atribuir** | P-TRC-MODELOS-RASTREADOR (2026-10-11) — os modelos de rastreador da operação (F-9) — FEC |
| `P-TRC-PORTA-WEB-8080-8082` | 11002 | — | **a atribuir** | P-TRC-PORTA-WEB-8080-8082 (2026-10-11) — divergência de porta da web do Traccar no overl |
| `P-O6R-07CA-DB-FORA-DA-LISTA-CI` | 11027 | MÉDIA | sim | P-O6R-07CA-DB-FORA-DA-LISTA-CI (2026-10-10) — a suíte `tests/o6r07c-subresource-scope-db |
| `P-O6R-B03-UUID-PATTERN-INVALIDO` | 11069 | ALTA | sim | P-O6R-B03-UUID-PATTERN-INVALIDO (2026-10-11) — a regex de UUID do módulo de despesa recu |
| `P-O6R-B03-EVENTO-DE-ITEM-VIOLA-FK` | 11075 | ALTA | sim | P-O6R-B03-EVENTO-DE-ITEM-VIOLA-FK (2026-10-11) — o evento de sync do item apontava o ITE |
| `P-O6R-B03-COMPATIBILIDADE-LEGADA` | 11080 | CRÍTICA | sim | P-O6R-B03-COMPATIBILIDADE-LEGADA (2026-10-11) — recibo gravado pela versão anterior (cha |
| `P-O6R-B03-PROVA-DE-REPLAY-POR-ATOR` | 11086 | ALTA | sim | P-O6R-B03-PROVA-DE-REPLAY-POR-ATOR (2026-10-11) — a prova de replay de um ator não pode  |
| `P-O6R-B03-FILA-POR-USUARIO` | 11092 | CRÍTICA | sim | P-O6R-B03-FILA-POR-USUARIO (2026-10-11) — a fila do app é por aparelho e organização: a  |
| `P-O6R-B03-CONTRATO-CONFLITO-POR-ACAO` | 11105 | MÉDIA | sim | P-O6R-B03-CONTRATO-CONFLITO-POR-ACAO (2026-10-11) — o app precisa consumir o conflito po |
| `P-O6R-B03-APP-RECEIPT-ATTACH-NAO-SUPORTADO` | 11114 | CRÍTICA | sim | P-O6R-B03-APP-RECEIPT-ATTACH-NAO-SUPORTADO (2026-10-11) — o app enfileira `expense_recei |
| `P-RDV-COMPROVANTE-SEM-UPLOAD` | 11122 | MÉDIA | sim | P-RDV-COMPROVANTE-SEM-UPLOAD (2026-11-09) — o comprovante da despesa fica no aparelho at |
| `P-O6R-07CB-EMENDA-DECISOES` | 11215 | ALTA | sim | P-O6R-07CB-EMENDA-DECISOES (2026-10-15) — o plano do 07c-b precisa das três respostas do |
| `P-CONFLITO-INICIO-ATENDIMENTO` | 11279 | ALTA | sim | P-CONFLITO-INICIO-ATENDIMENTO (2026-10-17) — duas decisões do dono dizem onde começa o " |
| `P-TRC-DEMO-LOGIN-SEM-ORG-INERTE` | 11498 | BAIXA | sim | P-TRC-DEMO-LOGIN-SEM-ORG-INERTE (2026-10-18) — na demo do Traccar, o login sem organizaç |
| `P-CI-PSQL18-IMAGEM` | 11507 | ALTA | sim | P-CI-PSQL18-IMAGEM (2026-10-19) — `ubuntu-latest` virou ubuntu-26.04 com psql 18 e o job |
| `P-DASH-PERFIL-TROCA-CLIQUE-SEM-TESTE` | 11525 | BAIXA | sim | P-DASH-PERFIL-TROCA-CLIQUE-SEM-TESTE (2026-10-19) — a navegação depois da troca de organ |
| `P-DASH-PERFIL-STATUS-FORA-DO-LITERAL` | 11541 | BAIXA | sim | P-DASH-PERFIL-STATUS-FORA-DO-LITERAL (2026-10-20) — a linha de status da P-DASH-PERFIL-T |
| `P-TRC02-LIMITADOR-POR-ROTA` | 11611 | MÉDIA | sim | P-TRC02-LIMITADOR-POR-ROTA (2026-10-20) — evento e posição com limitador e concorrência  |
| `P-SAN3-20-DELETE-TITULO-COM-CHEQUE` | 11747 | BAIXA | sim | P-SAN3-20-DELETE-TITULO-COM-CHEQUE (2026-10-24) — título com cheque pendente pode ser ap |
| `P-SAN3-20-RESUMO-CHEQUE-VINCULADO` | 11754 | BAIXA | sim | P-SAN3-20-RESUMO-CHEQUE-VINCULADO (2026-10-24) — KPI pode somar título e cheque pendente |
| `P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO` | 11792 | CRÍTICA | sim | P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO (2026-10-25) — o PERMITIDO do 12a não cobre o que as |
| `P-SAN3-12-REFERENCIA-FINANCEIRO-3OPCOES-CHEQUE` | 11822 | BAIXA | sim | P-SAN3-12-REFERENCIA-FINANCEIRO-3OPCOES-CHEQUE (2026-10-25) — a referência de 16/10 list |
| `P-O6R11-TEXTOS-FORA-DE-D-T` | 11975 | CRÍTICA | sim | P-O6R11-TEXTOS-FORA-DE-D-T (2026-11-02) — textos de falha sem acento fora dos arquivos d |
| `P-MOBILE-TELEMETRIA-TESTE-16-INSTAVEL` | 12151 | BAIXA | sim | P-MOBILE-TELEMETRIA-TESTE-16-INSTAVEL (2026-10-25) — o teste 16 da telemetria falha por  |
| `P-SAN3-12B-BUSCA-TABELA-TITULOS` | 12255 | BAIXA | sim | P-SAN3-12B-BUSCA-TABELA-TITULOS (2026-10-27) — a busca da barra da tabela de títulos da  |
| `P-FINANCE-SUMMARY-ADAPTER-NUM-ZERO` | 12265 | BAIXA | sim | P-FINANCE-SUMMARY-ADAPTER-NUM-ZERO (2026-10-27) — o adaptador do resumo financeiro devol |
| `P-SAN3-12B-R4B-TRAVA-RODADA-SEM-TESTE` | 12275 | BAIXA | sim | P-SAN3-12B-R4B-TRAVA-RODADA-SEM-TESTE (2026-10-28) — a trava de rodada do `/aggregate` ( |
| `P-SAN3-12B-KPI-PRESSED-COM-CONTA` | 12280 | BAIXA | sim | P-SAN3-12B-KPI-PRESSED-COM-CONTA (2026-10-28) — o indicador "A conciliar" publica `aria- |
| `P-SAN3-12B-PERFIL-SEM-ENTRIES-READ-VAZIO` | 12285 | BAIXA | sim | P-SAN3-12B-PERFIL-SEM-ENTRIES-READ-VAZIO (2026-10-28) — perfil com `finance:read` e sem  |
| `P-SAN3-12B-PAGER-ROTULO-FILTRADO` | 12290 | BAIXA | sim | P-SAN3-12B-PAGER-ROTULO-FILTRADO (2026-10-28) — o rótulo do paginador mistura a contagem |
| `P-COBRANCA-PERGUNTAS-P1-P6` | 12343 | — | sim | P-COBRANCA-PERGUNTAS-P1-P6 (2026-10-31) — seis respostas do dono necessárias para a cobr |
| `P-COBRANCA-ADAPTADORES-1-MAIS-1` | 12356 | — | sim | P-COBRANCA-ADAPTADORES-1-MAIS-1 (2026-10-31) — quantidade de integrações no portão |
| `P-B-RDV-COMPROVANTE` | 12362 | — | sim | P-B-RDV-COMPROVANTE (2026-10-31) — envio do comprovante de despesa sem plano |
| `P-SAN303-TAG-DESCONHECIDA` | 12498 | — | sim | P-SAN303-TAG-DESCONHECIDA (2026-11-03) — destino de tag não reconhecida no rateio direto |
| `P-SAN3-19-PLACEHOLDER-CHAVE-CRUA` | 12655 | BAIXA | sim | P-SAN3-19-PLACEHOLDER-CHAVE-CRUA (2026-11-03) — placeholder do app mostra a chave crua d |
| `P-ASS-MEDICAO-FRANQUIA` | 12708 | ALTA | sim | P-ASS-MEDICAO-FRANQUIA (2026-11-03) — franquia sem medição diária por organização — ALTA |
| `P-ASS-DEMONSTRATIVO` | 12715 | ALTA | sim | P-ASS-DEMONSTRATIVO (2026-11-03) — demonstrativo mensal e baixa da assinatura inexistent |
| `P-MOBILE-SEM-PERMISSAO-INTERNET-RELEASE` | 12914 | ALTA | sim | P-MOBILE-SEM-PERMISSAO-INTERNET-RELEASE (2026-11-04) — o APK de release não declarava ac |
| `P-ASS02-TRILHA-PLATAFORMA-EM-MEMORIA` | 13004 | MÉDIA | sim | P-ASS02-TRILHA-PLATAFORMA-EM-MEMORIA (2026-11-08) — a trilha de plataforma do serviço de |
| `P-CONTRATO-EMENDA-P5-P8C` | 13260 | ALTA | sim | P-CONTRATO-EMENDA-P5-P8C (2026-11-10) — a P5 e o P8(c) do §C7.7 precisam entrar no CLAUD |
