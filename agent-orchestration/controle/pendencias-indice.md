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
| Cabecalhos `## P-` | **610** |
| IDs distintos | 599 |
| **ABERTAS** | **455** |
| — das quais **diferidas** (balde C) | 65 |
| — das quais **ativas nesta rodada** | **390** |
| **CONTRADITORIAS** (exigem decisao) | **0** |
| FECHADAS | 152 |

> O placar conta **cabecalhos**, nao pendencias distintas: **610 cabecalhos para 599 IDs**, porque
> **6 IDs aparecem mais de uma vez** (emendas apensadas, §A2). Quem citar "N pendencias abertas"
> deve dizer qual das duas reguas esta usando.

## Diferidas com severidade MATERIAL — 13 (o dono deve olhar)

| ID | linha | severidade | titulo |
|---|--:|---|---|
| `P-019` | 228 | **MÉDIA** | P-019 - Ocorrencias residuais de persona demo "Marina Costa" fora do mapa (2026- |
| `P-026` | 328 | **MÉDIA** | P-026 - F11: front `UserRole` nao cobre os 9 papeis canonicos (menu visual aprox |
| `P-027` | 343 | **MÉDIA** | P-027 - F11: divergencias matriz x catalog + perms `purchase_orders:read`/`repor |
| `P-Ω3a` | 416 | **MÉDIA** | P-Ω3a (Ω3-a ServiceQuote) — pendências declaradas |
| `P-SAN-PROD-BOOTSTRAP` | 576 | **MÉDIA** | P-SAN-PROD-BOOTSTRAP - Bootstrap idempotente do 1o platform_admin real (Ω-INFRA- |
| `P-Ω3F4C-ACTIVATION-PROMPT` | 764 | **MÉDIA** | P-Ω3F4C-ACTIVATION-PROMPT - Aprovar dispara sem diálogo de modo de acionamento/o |
| `P-Ω4-FINANCE-READ-ORFA` | 1029 | **ALTA** | P-Ω4-FINANCE-READ-ORFA — /finance (dashboard) ainda gated pela órfã finance:read |
| `P-Ω4-3-INVOICE-ATOMIC` | 1082 | **MÉDIA** | P-Ω4-3-INVOICE-ATOMIC — Título↔carimbo não-atômico (BAIXA) |
| `P-Ω4-3-INVOICE-TOCTOU-DELETE` | 1104 | **MÉDIA** | P-Ω4-3-INVOICE-TOCTOU-DELETE — DELETE de item durante o faturamento infla o títu |
| `P-Ω4-8-DASHBOARD-FIDELITY` | 1421 | **MÉDIA** | P-Ω4-8-DASHBOARD-FIDELITY — Reduções de composição do dashboard vs financeiro.pn |
| `P-RBAC-GATING-MOCKSHELLS` | 1534 | **MÉDIA** | P-RBAC-GATING-MOCKSHELLS — gating RBAC das 3 telas-casca fica com a ligação a da |
| `P-PURCHASE-ORDERS-BACKEND-GATE` | 1726 | **MÉDIA** | P-PURCHASE-ORDERS-BACKEND-GATE - Gate server-side de Pedidos/Relatórios pendente |
| `P-CHK-SEED-DEMO-SUJO` | 2221 | **MÉDIA** | P-CHK-SEED-DEMO-SUJO (2026-08-08) — dados de demonstração com nomes técnicos e l |

## SEM STATUS — nenhuma linha `status:`/`Estado:` (o indice NAO chuta) — 3

| ID | linha | severidade | dono | titulo |
|---|--:|---|---|---|
| `P-INFRA-RLS` | 495 | — | sim | P-INFRA-RLS (transversal — apontado pelo coordenador no Ω3-d) — RLS não enforçada em run |
| `P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS` | 7525 | ALTA | sim | P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS (2026-09-07) — leituras de plataforma sem ten |
| `P-O6R-07B-TESTE-DO-DEFAULT-CEGO-AO-EXPORT` | 10148 | MÉDIA | sim | P-O6R-07B-TESTE-DO-DEFAULT-CEGO-AO-EXPORT (2026-09-06) — teste reescreve a regra do defa |

## CONTRADITORIAS — cabecalho e linha de status se opoem — 0

| ID | linha | severidade | dono | titulo |
|---|--:|---|---|---|

## ABERTAS · balde A — material — 214

| ID | linha | severidade | dono | titulo |
|---|--:|---|---|---|
| `P-Ω3F3B-UPDATE-VALIDA4` | 722 | MÉDIA | sim | P-Ω3F3B-UPDATE-VALIDA4 - Validação #4 depende da imutabilidade de customer/service no up |
| `P-Ω4-3-CURRENCY-BRL` | 1094 | MÉDIA | sim | P-Ω4-3-CURRENCY-BRL — Item da OS aceita moeda ≠ BRL, mas faturar exige BRL (MÉDIA-BAIXA) |
| `P-GOLIVE-VALIDATE-CONSTRAINT` | 1490 | MÉDIA | sim | P-GOLIVE-VALIDATE-CONSTRAINT — Operacionalizar VALIDATE CONSTRAINT do CHECK do cancelame |
| `P-AUDIT-FOLLOWUPS` | 1682 | MÉDIA | **a atribuir** | P-AUDIT-FOLLOWUPS - Melhorias de Auditoria (2026-07-20, PR-SCALE-3, todas BAIXA/MEDIA) |
| `P-CHK-PRISMA-CLIENT-TYPING` | 1848 | MÉDIA | sim | P-CHK-PRISMA-CLIENT-TYPING (2026-08-02) — repo prisma de checklist descarta os tipos ger |
| `P-MOBILE-BANNER-INTEGRACAO` | 2054 | MÉDIA | **a atribuir** | P-MOBILE-BANNER-INTEGRACAO (2026-08-06) — banner "Integração remota ainda não ativa" é E |
| `P-MOBILE-OS-SEEDS` | 2068 | ALTA | sim | P-MOBILE-OS-SEEDS (2026-08-06) — lista de OS do app mostra SEEDS locais como se fossem d |
| `P-CHK-PATCH-SEM-LOCK` | 2139 | MÉDIA | sim | P-CHK-PATCH-SEM-LOCK (2026-08-07) — PATCH de checklist é last-write-wins sem guarda de v |
| `P-CHK-CHIPS-SEM-CONSUMIDOR` | 2162 | MÉDIA | **a atribuir** | P-CHK-CHIPS-SEM-CONSUMIDOR (2026-08-08) — inspector grava config que NINGUÉM lê (MÉDIA,  |
| `P-JUNTA-LIMPEZA-BASE-VIVA` | 2201 | MÉDIA | **a atribuir** | P-JUNTA-LIMPEZA-BASE-VIVA (2026-08-08) — 2º incidente de limpeza ad-hoc por subagente na |
| `P-O6R-B04` | 2922 | ALTA | sim | P-O6R-B04 (2026-08-14) — `fix/inventory-consistency` — Ω6R-DAT-002, DAT-003 (2 P0) + QUA |
| `P-O6R-B07` | 3103 | ALTA | sim | P-O6R-B07 (2026-08-14) — `fix/authorization-and-uploads` — Ω6R-SEC-002 (P0) + SEC-003, S |
| `P-O6R-B07-APPROVAL-BY-POLICY` | 3185 | MÉDIA | **a atribuir** | P-O6R-B07-APPROVAL-BY-POLICY (2026-09-02) — `finance`/`inventory` sem `work_orders:appro |
| `P-O6R-B11` | 3382 | ALTA | sim | P-O6R-B11 (2026-08-14) — `fix/mobile-work-order-contracts` — Ω6R-QUA-004, QUA-005 (2 P1) |
| `P-O6R-B01-RELIGACAO-SEM-REMEDIO` | 3858 | ALTA | sim | P-O6R-B01-RELIGACAO-SEM-REMEDIO (2026-08-19) — **ALTA** · assimetria sem via de saída |
| `P-O6R-B01-LOGERROR-MORTO` | 3882 | ALTA | sim | P-O6R-B01-LOGERROR-MORTO (2026-08-19) — **ALTA (observabilidade)** · a falha da fonte de |
| `P-ARNES-RLS-TEST-FORA-DO-SWEEP` | 3980 | MÉDIA | sim | P-ARNES-RLS-TEST-FORA-DO-SWEEP (2026-08-28 — B-O6R-ARNES, C-C) — MÉDIA · decisão CONSCIE |
| `P-GOV-MAIN-SEM-PROTECAO` | 4985 | MÉDIA | sim | P-GOV-MAIN-SEM-PROTECAO — ATUALIZAÇÃO (2026-08-25): ruleset INSTALADO |
| `P-SAN2-LEITURA-DAS-79` | 5018 | MÉDIA | sim | P-SAN2-LEITURA-DAS-79 (2026-08-29) — MÉDIA · **Dono:** bloco próprio, DEPOIS do ciclo 5  |
| `P-SAN2-2-INDICE-DONO-SEMPRE-SIM` | 5196 | MÉDIA | sim | P-SAN2-2-INDICE-DONO-SEMPRE-SIM (2026-08-30) — MÉDIA · a coluna "dono" do índice diz **s |
| `P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY` | 5299 | MÉDIA | sim | P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY (2026-08-30) — MÉDIA · o painel não renderiza `releas |
| `P-OBITUARIO-DERIVADO-DO-DIRETORIO` | 5400 | MÉDIA | sim | P-OBITUARIO-DERIVADO-DO-DIRETORIO (2026-08-31) — MÉDIA · o `OBITUARIO-IDENTIDADES.md` co |
| `P-KPI-RECENT-CONGELADO` | 5602 | MÉDIA | sim | P-KPI-RECENT-CONGELADO (2026-08-31) — MÉDIA · a seção "Últimas demandas" do painel está  |
| `P-ARNES-SWEEP-DEPENDE-DA-DISCIPLINA-DO-OPERADOR` | 5736 | MÉDIA | sim | P-ARNES-SWEEP-DEPENDE-DA-DISCIPLINA-DO-OPERADOR (2026-08-31) — MÉDIA · "as 68 órfãs da b |
| `P-O6R-B02-CRASH-NO-LOAD-SEM-SKIP` | 6233 | MÉDIA | sim | P-O6R-B02-CRASH-NO-LOAD-SEM-SKIP (2026-09-02 — carve-out do CP-3 do ciclo 5) — MÉDIA · e |
| `P-JUNTA-RECURSO-EFEMERO-POR-BLOCO` | 6318 | MÉDIA | sim | P-JUNTA-RECURSO-EFEMERO-POR-BLOCO (2026-09-04 — incidente de terreno entre sessões simul |
| `P-METODO-FERRAMENTA-SINTATICA-COMO-PROVA` | 6454 | ALTA | sim | P-METODO-FERRAMENTA-SINTATICA-COMO-PROVA (2026-09-04 — dado de método das rodadas Ω6R si |
| `P-O6R-B07-RATE-LIMIT-DISTRIBUIDO` | 6589 | MÉDIA | sim | P-O6R-B07-RATE-LIMIT-DISTRIBUIDO (2026-09-02) — freio de login por IP é IN-PROCESS — MÉD |
| `P-AUTH-KDF-ROTACAO-V2` | 6815 | MÉDIA | sim | P-AUTH-KDF-ROTACAO-V2 (registro 3/7, 2026-09-03) — rotação de KDF `v=2` é promessa sem m |
| `P-C3-DOIS-PRS-SEM-KPI` | 6923 | MÉDIA | sim | P-C3-DOIS-PRS-SEM-KPI (2026-09-05 — achado da sessão irmã, conferido por execução) — MÉD |
| `P-DERIVADO-ESQUECIDO` | 6955 | MÉDIA | sim | P-DERIVADO-ESQUECIDO (2026-09-05 — três instâncias em três PRs consecutivos meus) — MÉDI |
| `P-GOV-REGISTRO-PURO-QUORUM` | 7055 | MÉDIA | sim | P-GOV-REGISTRO-PURO-QUORUM (2026-09-05) — MÉDIA · PR de registro puro: junta de 3 ou uma |
| `P-O6R-B07B-SCANNER-AV-REAL` | 7150 | ALTA | sim | P-O6R-B07B-SCANNER-AV-REAL (2026-09-06) — produção e staging recusam TODO upload até hav |
| `P-O6R-B07B-ATTACHMENT-STORED-DO-CLIENTE` | 7214 | ALTA | sim | P-O6R-B07B-ATTACHMENT-STORED-DO-CLIENTE (2026-09-06) — linha `attachment stored` com cha |
| `P-O6R-B07B-CHECKLIST-JSON-FILEURL` | 7255 | MÉDIA | sim | P-O6R-B07B-CHECKLIST-JSON-FILEURL (2026-09-06) — ramo JSON do anexo de checklist aceita  |
| `P-O6R-B07B-DATAURI-NO-VALUE` | 7269 | MÉDIA | sim | P-O6R-B07B-DATAURI-NO-VALUE (2026-09-06) — data-URI base64 persistido no `value` de resp |
| `P-O6R-B07B-MOBILE-RETRY-PERMANENTE` | 7284 | MÉDIA | sim | P-O6R-B07B-MOBILE-RETRY-PERMANENTE (2026-09-06) — o app re-tenta para sempre o que foi r |
| `P-O6R-B06-RECONCILE-BLOQUEADO` | 7394 | ALTA | sim | P-O6R-B06-RECONCILE-BLOQUEADO (2026-09-07) — o script de reparação NÃO foi entregue; a j |
| `P-O6R-B06-DIVERGENCIA-MOBILE-NAO-FATURADA` | 7446 | MÉDIA | sim | P-O6R-B06-DIVERGENCIA-MOBILE-NAO-FATURADA (2026-09-07) — a trilha de divergência do app  |
| `P-O6R-B06-USAGE-BEST-EFFORT-RESIDUAL` | 7473 | ALTA | sim | P-O6R-B06-USAGE-BEST-EFFORT-RESIDUAL (2026-09-07) — as chaves de anexo e de job continua |
| `P-O6R-B06-BASE-SEM-PRODUTOR` | 7501 | ALTA | sim | P-O6R-B06-BASE-SEM-PRODUTOR (2026-09-07) — três categorias de custo caem sempre em `unal |
| `P-O6R-B06-AGGREGATE-DAILY-SEM-AGENDA` | 7552 | MÉDIA | sim | P-O6R-B06-AGGREGATE-DAILY-SEM-AGENDA (2026-09-07) — ninguém enfileira o job da projeção  |
| `P-O6R-B06-RATEIO-CURSOR-100K` | 7570 | ALTA | sim | P-O6R-B06-RATEIO-CURSOR-100K (2026-09-07) — o teto do rateio ficou ALTO, mas continua se |
| `P-GOV-AUDITOR-FORA-DA-CI` | 7798 | MÉDIA | sim | P-GOV-AUDITOR-FORA-DA-CI (2026-09-07) — o auditor de elenco e o `--check` das skills são |
| `P-GOV-VEREDITO-SEM-PARSER` | 7841 | ALTA | sim | P-GOV-VEREDITO-SEM-PARSER (2026-09-07) — veredito de junta é PROSA, e nenhum gate o lê — |
| `P-GOV-BASH-EM-QUEM-JULGA` | 7872 | ALTA | sim | P-GOV-BASH-EM-QUEM-JULGA (2026-09-07) — `Bash` dá poder de escrita a todo papel que julg |
| `P-GOV-ESPELHO-CONTRATO-SEM-GUARD` | 7921 | MÉDIA | sim | P-GOV-ESPELHO-CONTRATO-SEM-GUARD (2026-09-07) — `CLAUDE.md` e `AGENTS.md` podem divergir |
| `P-GOV-KPI-DISPLAY-SEM-GUARD` | 7979 | MÉDIA | sim | P-GOV-KPI-DISPLAY-SEM-GUARD (2026-09-08) — nenhum guard compara o CARD com o `value` do  |
| `P-GOV-C10-ENCERRADO` | 8007 | MÉDIA | sim | P-GOV-C10-ENCERRADO (2026-09-08) — a checagem C10 mede PESO e não sabe se o bloco encerr |
| `P-GOV-AUDITOR-SEM-CHECAGEM-DE-LINK` | 8035 | MÉDIA | sim | P-GOV-AUDITOR-SEM-CHECAGEM-DE-LINK (2026-09-08) — o auditor de elenco DEIXOU de conferir |
| `P-GOV-ESGOTADO-SEM-TESTE` | 8117 | MÉDIA | sim | P-GOV-ESGOTADO-SEM-TESTE (2026-09-08) — "modelo esgotado" é declarado, não provado — MÉD |
| `P-GOV-RECUSA-CANCELA-ACUSACAO` | 8138 | MÉDIA | sim | P-GOV-RECUSA-CANCELA-ACUSACAO (2026-09-08) — a chave excluída da recusa cancela acusação |
| `P-GOV-DEFAULT-DENY-POR-NOME-BASE` | 8153 | MÉDIA | sim | P-GOV-DEFAULT-DENY-POR-NOME-BASE (2026-09-08) — a allowlist de escrita é chaveada pelo A |
| `P-GOV-MODELO-FIXADO-SEM-MECANISMO` | 8167 | MÉDIA | sim | P-GOV-MODELO-FIXADO-SEM-MECANISMO (2026-09-08) — `MODELO_FIXADO` é lista de obrigação se |
| `P-GOV-CAMINHO-REPO-SESSAO` | 8197 | ALTA | sim | P-GOV-CAMINHO-REPO-SESSAO (2026-09-08) — FECHADA em 2026-09-08 por `D-MEDIR-NA-REF-ALVO` |
| `P-O6R-SUITES-DB-SEM-TEARDOWN` | 8264 | MÉDIA | sim | P-O6R-SUITES-DB-SEM-TEARDOWN (2026-09-09) — execuções consecutivas de `npm test` contra  |
| `P-SAN3-INDICE-SEVERIDADE-POR-MENCAO` | 8376 | CRÍTICA | sim | P-SAN3-INDICE-SEVERIDADE-POR-MENCAO (2026-09-11) — a coluna de severidade do índice é a  |
| `P-SAN3-INDICE-SO-PRIMEIRA-LINHA-DE-STATUS` | 8408 | MÉDIA | sim | P-SAN3-INDICE-SO-PRIMEIRA-LINHA-DE-STATUS (2026-09-11) — o índice lê só a primeira linha |
| `P-SAN3-FLIPS-DE-REGISTRO` | 8448 | MÉDIA | sim | P-SAN3-FLIPS-DE-REGISTRO (2026-09-11) — conserto feito fora da linha de status nunca fec |
| `P-DONO-CLOUD-BILLING-ESCOPO` | 8507 | MÉDIA | sim | P-DONO-CLOUD-BILLING-ESCOPO (2026-09-11) — Cobrança de nuvem calculada nunca vira fatura |
| `P-WEB-FIN-BAIXA-E-CONTA-SEM-TELA` | 8524 | ALTA | sim | P-WEB-FIN-BAIXA-E-CONTA-SEM-TELA (2026-09-11) — Web emite título mas não liquida: sem te |
| `P-WEB-FIN-CHEQUE-FECHAMENTO-COMISSAO-SEM-TELA` | 8542 | MÉDIA | sim | P-WEB-FIN-CHEQUE-FECHAMENTO-COMISSAO-SEM-TELA (2026-09-11) — Cheques, fechamento de perí |
| `P-CHK-APLICABILIDADE-SEM-ROTA` | 8560 | MÉDIA | sim | P-CHK-APLICABILIDADE-SEM-ROTA (2026-09-11) — Motor de aplicabilidade de checklist existe |
| `P-WEB-CHK-EXECUCOES-INEXISTENTES` | 8577 | MÉDIA | sim | P-WEB-CHK-EXECUCOES-INEXISTENTES (2026-09-11) — "Ver execuções" leva à lista de modelos; |
| `P-WEB-ROTAS-SEM-PORTA` | 8630 | MÉDIA | sim | P-WEB-ROTAS-SEM-PORTA (2026-09-11) — Rotas vivas sem menu/link; provisionamento de módul |
| `P-WEB-GATE-MODULO-INCOMPLETO` | 8664 | ALTA | sim | P-WEB-GATE-MODULO-INCOMPLETO (2026-09-11) — 27 itens do menu fora do gate de módulo; bac |
| `P-MOBILE-PRESTADOR-SEM-PORTA` | 8710 | ALTA | sim | P-MOBILE-PRESTADOR-SEM-PORTA (2026-09-11) — Fluxo Prestador (diagnóstico, execução, mate |
| `P-MOBILE-CONCLUSAO-SEM-PORTA` | 8727 | MÉDIA | sim | P-MOBILE-CONCLUSAO-SEM-PORTA (2026-09-11) — Tela de Conclusão, onde a comissão aparece,  |
| `P-MOBILE-CATALOGO-MODULOS-INERTE` | 8744 | MÉDIA | sim | P-MOBILE-CATALOGO-MODULOS-INERTE (2026-09-11) — Catálogo de módulos nunca renderiza; Est |
| `P-MOBILE-LGPD-GPS-SEM-PORTA` | 8761 | ALTA | sim | P-MOBILE-LGPD-GPS-SEM-PORTA (2026-09-11) — Consentimento LGPD de GPS nunca pode ser dado |
| `P-MOBILE-GUINCHO-ENTREGA-INALCANCAVEL` | 8778 | ALTA | sim | P-MOBILE-GUINCHO-ENTREGA-INALCANCAVEL (2026-09-11) — Perna de entrega do guincho nunca a |
| `P-MOBILE-FILA-OS-NAO-DRENADA` | 8812 | ALTA | sim | P-MOBILE-FILA-OS-NAO-DRENADA (2026-09-11) — "Pedir aprovação" e "não consigo iniciar" en |
| `P-MOBILE-ESTOQUE-TECNICO-FABRICADO` | 8829 | ALTA | sim | P-MOBILE-ESTOQUE-TECNICO-FABRICADO (2026-09-11) — Estoque do técnico é catálogo semente  |
| `P-MOBILE-MINHAS-OS-SEM-FILTRO` | 8863 | ALTA | sim | P-MOBILE-MINHAS-OS-SEM-FILTRO (2026-09-11) — "Minhas OS" lista a organização inteira, se |
| `P-MOBILE-FAXINA-TERMOS-TECNICOS` | 8881 | MÉDIA | sim | P-MOBILE-FAXINA-TERMOS-TECNICOS (2026-09-11) — App mostra papel cru, placeholder técnico |
| `P-MOBILE-TESTE-ALCANCABILIDADE` | 8899 | MÉDIA | sim | P-MOBILE-TESTE-ALCANCABILIDADE (2026-09-11) — Nenhum teste prova que toda rota do app te |
| `P-MOBILE-DESPACHO-SEM-PUSH` | 8916 | MÉDIA | sim | P-MOBILE-DESPACHO-SEM-PUSH (2026-09-11) — Despacho só chega ao técnico se ele abrir e at |
| `P-NOTIF-SEM-CANAL-EXTERNO` | 8933 | MÉDIA | sim | P-NOTIF-SEM-CANAL-EXTERNO (2026-09-11) — Notificação só grava linha; não há canal de e-m |
| `P-FLEET-ALERTAS-SEM-AGENDADOR` | 8984 | MÉDIA | sim | P-FLEET-ALERTAS-SEM-AGENDADOR (2026-09-11) — Alertas de frota só disparam por botão; nen |
| `P-MOBILE-CHECKIN-CONFERE-CODIGO-DA-OS` | 9001 | MÉDIA | sim | P-MOBILE-CHECKIN-CONFERE-CODIGO-DA-OS (2026-09-11) — Check-in pede dígitos da placa e co |
| `P-KPI-ROADMAP-CONGELADO` | 9054 | MÉDIA | sim | P-KPI-ROADMAP-CONGELADO (2026-09-11) — Roadmap do painel parado em 2026-08-19 marca bloc |
| `P-KPI-MVP-REGUA-CODIGO-ESCRITO` | 9072 | MÉDIA | sim | P-KPI-MVP-REGUA-CODIGO-ESCRITO (2026-09-11) — `mvp_demo 99`/`mvp_vendavel 88` medem códi |
| `P-DOC-GO-LIVE-READINESS-VENCIDO` | 9089 | MÉDIA | sim | P-DOC-GO-LIVE-READINESS-VENCIDO (2026-09-11) — Documento diz "nenhum código bloqueia o g |
| `P-GOV-C28-REGULARIZACAO-NAO-ESCRITA` | 9140 | MÉDIA | sim | P-GOV-C28-REGULARIZACAO-NAO-ESCRITA (2026-09-11) — §C2.8 trava todo bloco sem parecer e  |
| `P-GOV-DEVOPS-ESCREVE-E-VOTA` | 9174 | MÉDIA | sim | P-GOV-DEVOPS-ESCREVE-E-VOTA (2026-09-11) — `agente-devops-provisionador` pode escrever e |
| `P-GOV-INSPETOR-RECEITAS-1` | 9191 | MÉDIA | sim | P-GOV-INSPETOR-RECEITAS-1.1-E-3.3 (2026-09-11) — Receitas do inspetor: md5 cru, falso ve |
| `P-GOV-SKILL-BACKEND-REVIEW-MENTE-SOBRE-CI` | 9208 | MÉDIA | sim | P-GOV-SKILL-BACKEND-REVIEW-MENTE-SOBRE-CI (2026-09-11) — Skill afirma que teste `-db` se |
| `P-GOV-AUDITOR-RAIZ-POR-IMPORT-META` | 9225 | MÉDIA | sim | P-GOV-AUDITOR-RAIZ-POR-IMPORT-META (2026-09-11) — Auditor de elenco só audita a árvore o |
| `P-GOV-SYNC-AGENTS-ARGV-FROUXO` | 9242 | MÉDIA | sim | P-GOV-SYNC-AGENTS-ARGV-FROUXO (2026-09-11) — `sync-agent-agents.mjs` com argumento desco |
| `P-GOV-SEGUNDO-CONTRATO-NO-HANDOFF` | 9259 | MÉDIA | sim | P-GOV-SEGUNDO-CONTRATO-NO-HANDOFF (2026-09-11) — Segundo "contrato de execução" na ref,  |
| `P-SAN3-ROTEIRO-DEMO-OPERACAO` | 9344 | MÉDIA | sim | P-SAN3-ROTEIRO-DEMO-OPERACAO (2026-09-11) — não existe roteiro de demonstração e operaçã |
| `P-WEB-FATURAR-OS-SEM-TELA` | 9360 | ALTA | sim | P-WEB-FATURAR-OS-SEM-TELA (2026-09-12) — a web não fatura OS: a rota existe e nenhuma te |
| `P-SAN3-CHECKLIST-RUN-SEM-ESCOPO-POR-OBJETO` | 9370 | ALTA | sim | P-SAN3-CHECKLIST-RUN-SEM-ESCOPO-POR-OBJETO (2026-09-12) — técnico responde, conclui e dá |
| `P-FIELD-LOCATION-SEM-CONSENTIMENTO-NO-BACKEND` | 9380 | ALTA | sim | P-FIELD-LOCATION-SEM-CONSENTIMENTO-NO-BACKEND (2026-09-12) — o backend grava a posição d |
| `P-NAV-MODULOS-NAO-RESOLVIDOS-LIBERA-MENU` | 9393 | MÉDIA | sim | P-NAV-MODULOS-NAO-RESOLVIDOS-LIBERA-MENU (2026-09-12) — lista de módulos não resolvida l |
| `P-SAN3-INDICE-ITEM-DO-GATE-SO-PELA-HOSPEDEIRA` | 9413 | MÉDIA | sim | P-SAN3-INDICE-ITEM-DO-GATE-SO-PELA-HOSPEDEIRA (2026-09-12) — dois itens do gate só apare |
| `P-WEB-CONCILIACAO-SEM-TELA` | 9425 | ALTA | sim | P-WEB-CONCILIACAO-SEM-TELA (2026-09-13) — a conciliação é prometida e a web não concilia |
| `P-SAN3-01-DESPACHO-FORMS-SEM-CATCH` | 9443 | MÉDIA | sim | P-SAN3-01-DESPACHO-FORMS-SEM-CATCH (2026-09-17) — formulários de despacho sem `catch`: r |
| `P-SAN3-01-ORCAMENTO-LINHAS-TOTAL-ZERO` | 9463 | MÉDIA | sim | P-SAN3-01-ORCAMENTO-LINHAS-TOTAL-ZERO (2026-09-17) — as linhas do orçamento falham e a a |
| `P-SAN3-01-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS` | 9508 | MÉDIA | sim | P-SAN3-01-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS (2026-09-17) — o alerta de erro da tela  |
| `P-SAN3-01-E2E-LOGIN-DEFASADO` | 9517 | ALTA | sim | P-SAN3-01-E2E-LOGIN-DEFASADO (2026-09-17) — os 13 casos do e2e rastreado morrem no login |
| `P-SAN3-PAINEL-TRILHA-DO-GATE` | 9535 | MÉDIA | sim | P-SAN3-PAINEL-TRILHA-DO-GATE (2026-09-18) — o painel de KPI não acompanha o gate da vers |
| `P-SAN3-01-DASHBOARD-DESPACHOS-ERRO-COMO-VAZIO` | 9544 | MÉDIA | sim | P-SAN3-01-DASHBOARD-DESPACHOS-ERRO-COMO-VAZIO (2026-09-18) — o Dashboard mostra o selo t |
| `P-SAN3-01-LOGISTICS-FICCAO-ROTEADA` | 9553 | MÉDIA | sim | P-SAN3-01-LOGISTICS-FICCAO-ROTEADA (2026-09-18) — a rota viva `/logistics` serve OS e at |
| `P-SAN3-01-INVENTARIO-FECHAMENTO-CONTAGEM-FABRICADO` | 9562 | MÉDIA | sim | P-SAN3-01-INVENTARIO-FECHAMENTO-CONTAGEM-FABRICADO (2026-09-18) — fechar contagem cíclic |
| `P-WEB-FONTE-INTER-NAO-CARREGADA` | 9685 | MÉDIA | sim | P-WEB-FONTE-INTER-NAO-CARREGADA (2026-09-19) — a web inteira renderiza em Segoe UI, e o  |
| `P-SAN3-04A-CHECKLIST-ESCOPO-ESTOQUE` | 9703 | MÉDIA | sim | P-SAN3-04A-CHECKLIST-ESCOPO-ESTOQUE (2026-09-18) — o Estoque lê vistorias mas não respon |
| `P-SAN3-04A-MASTER-DATA-EDIT-SCOPED` | 9711 | MÉDIA | sim | P-SAN3-04A-MASTER-DATA-EDIT-SCOPED (2026-09-18) — Operador e Estoque não editam cadastro |
| `P-SAN3-04A-MATRIZ-L37-X-BULLETS` | 9719 | MÉDIA | sim | P-SAN3-04A-MATRIZ-L37-X-BULLETS (2026-09-18) — a matriz se contradiz sobre Financeiro e  |
| `P-SAN3-04A-SUPPORT-SEM-POLITICA` | 9728 | MÉDIA | sim | P-SAN3-04A-SUPPORT-SEM-POLITICA (2026-09-18) — o Suporte lê seis áreas sem a política de |
| `P-SAN3-04A-DASHBOARD-SCOPED` | 9736 | MÉDIA | sim | P-SAN3-04A-DASHBOARD-SCOPED (2026-09-18) — o painel do Técnico de Campo é da organização |
| `P-SAN3-04A-CHECKLIST-POR-ESCOPO-ESCRITORIO` | 9744 | MÉDIA | sim | P-SAN3-04A-CHECKLIST-POR-ESCOPO-ESCRITORIO (2026-09-18) — Gestor e Operador concluem vis |
| `P-SAN3-04A-AUDIT-SCOPED` | 9752 | MÉDIA | sim | P-SAN3-04A-AUDIT-SCOPED (2026-09-18) — o Gestor lê a auditoria da organização inteira, n |
| `P-SAN3-04A-SEED-PAPEIS-LEGADOS` | 9760 | MÉDIA | sim | P-SAN3-04A-SEED-PAPEIS-LEGADOS (2026-09-18) — base preparada só com o seed não tem cinco |
| `P-SAN3-04A-PERMISSOES-ORFAS` | 9769 | MÉDIA | sim | P-SAN3-04A-PERMISSOES-ORFAS (2026-09-18) — 25 permissões do catálogo que nenhuma rota co |
| `P-SAN3-04A-MENU-RESIDUAL` | 9787 | MÉDIA | sim | P-SAN3-04A-MENU-RESIDUAL (2026-09-18) — três itens do menu levam a "acesso não permitido |
| `P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS` | 9811 | MÉDIA | sim | P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS (2026-09-18) — depois de trocar de organ |
| `P-SAN3-04A-NAVIGATION-MATRIX-DEFASADA` | 9820 | ALTA | sim | P-SAN3-04A-NAVIGATION-MATRIX-DEFASADA (2026-09-18) — `docs/navigation-matrix.md` diverge |
| `P-AUTH-CLAIMS-SEM-TENANT-ROLE` | 9830 | MÉDIA | sim | P-AUTH-CLAIMS-SEM-TENANT-ROLE (2026-09-18) — o JWT não carrega `tenant_role`/`tenant_rol |
| `P-SAN3-B1-FLUTTER-CI-X-MAQUINA-DO-DONO` | 9840 | MÉDIA | sim | P-SAN3-B1-FLUTTER-CI-X-MAQUINA-DO-DONO (2026-09-21) — o Flutter do CI (3.47.5) e o da má |
| `P-SAN3-00-RESIDUO-ELENCO-DEMO-INVESTIDOR` | 9850 | MÉDIA | sim | P-SAN3-00-RESIDUO-ELENCO-DEMO-INVESTIDOR (2026-09-21) — 33 identidades aposentadas e/ou  |
| `P-SAN3-00-IGNORE-GLOBAL-POR-NOME-DENTRO-DOS-REINCLUIDOS` | 9863 | MÉDIA | **a atribuir** | P-SAN3-00-IGNORE-GLOBAL-POR-NOME-DENTRO-DOS-REINCLUIDOS (2026-09-21) — dentro dos diretó |
| `P-GOV-CICLOS-CORPOS-ORFAOS` | 9876 | MÉDIA | sim | P-GOV-CICLOS-CORPOS-ORFAOS (2026-09-28) — cinco regras vivas fora do contrato ainda fala |
| `P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS` | 9891 | MÉDIA | sim | P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS (2026-09-28) — o gatilho da auditoria do ciclo 3 o |
| `P-GOV-SEM-TETO-AJUSTES-DA-JUNTA` | 9906 | MÉDIA | sim | P-GOV-SEM-TETO-AJUSTES-DA-JUNTA (2026-09-28) — quatro ajustes da junta do B-GOV-SEM-TETO |
| `P-GOV-CORPOS-EM-VOO-COM-TETO-REVOGADO` | 9930 | MÉDIA | sim | P-GOV-CORPOS-EM-VOO-COM-TETO-REVOGADO (2026-09-28) — seis corpos de jurado dos PRs #388  |
| `P-GOV-INSPETOR-CICLO-DECLARADO-NAO-DERIVADO` | 9942 | MÉDIA | sim | P-GOV-INSPETOR-CICLO-DECLARADO-NAO-DERIVADO (2026-09-28) — a trava do ciclo 4 lê o númer |
| `P-SAN3-01B-FIACAO-DO-CREATE-TEXTUAL` | 10015 | MÉDIA | sim | P-SAN3-01B-FIACAO-DO-CREATE-TEXTUAL (2026-10-02) — a página de criar OS pode engolir a m |
| `P-SAN3-01B-MOCK-POR-CONVENCAO-DE-NOME` | 10046 | MÉDIA | sim | P-SAN3-01B-MOCK-POR-CONVENCAO-DE-NOME (2026-10-02) — o guard decide pelo NOME do arquivo |
| `P-SAN3-01B-DASHBOARD-NOVA-OS-SEM-GATE` | 10066 | MÉDIA | sim | P-SAN3-01B-DASHBOARD-NOVA-OS-SEM-GATE (2026-10-02) — outro botão "Nova OS" no Dashboard  |
| `P-SAN3-05-SUITE-DB-SOB-PAPEL-REAL` | 10098 | ALTA | sim | P-SAN3-05-SUITE-DB-SOB-PAPEL-REAL (2026-10-03) — suíte de banco ainda roda majoritariame |
| `P-SAN3-05-RUNNER-SEM-TIMEOUT` | 10107 | MÉDIA | sim | P-SAN3-05-RUNNER-SEM-TIMEOUT (2026-10-09) — runner e job backend sem teto por arquivo —  |
| `P-SAN3-05-LOCAL-AUTH-WORK-SEM-GUC` | 10114 | MÉDIA | sim | P-SAN3-05-LOCAL-AUTH-WORK-SEM-GUC (2026-10-09) — default de LocalAuthLoginService pode e |
| `P-SAN3-05-POSTURA-NO-HEALTH` | 10129 | MÉDIA | sim | P-SAN3-05-POSTURA-NO-HEALTH (2026-10-03) — postura do papel no readiness — MÉDIA |
| `P-SAN3-05-SECURITY-DEFINER-INVENTARIO` | 10135 | ALTA | sim | P-SAN3-05-SECURITY-DEFINER-INVENTARIO (2026-10-03) — funções de dono que escapa — ALTA |
| `P-SAN3-05-STAGING-CD-AMARRACAO` | 10142 | ALTA | sim | P-SAN3-05-STAGING-CD-AMARRACAO (2026-10-03) — CD de staging depende dos atos de provisão |
| `P-WO-LISTA-SO-20-MAIS-RECENTES` | 10240 | MÉDIA | sim | P-WO-LISTA-SO-20-MAIS-RECENTES (2026-10-08) — a lista de OS só carrega as 20 mais recent |
| `P-WO-PRIORIDADE-MEDIA-SEM-ACENTO` | 10263 | MÉDIA | sim | P-WO-PRIORIDADE-MEDIA-SEM-ACENTO (2026-10-08) — "Media" sem acento em rótulos de priorid |
| `P-SAN3-05-ATO2-CINCO-TAREFAS` | 10283 | ALTA | sim | P-SAN3-05-ATO2-CINCO-TAREFAS (2026-10-08) — medir as 5 tarefas automáticas sob o papel e |
| `P-INDICE-PENDENCIAS-CLASSIFICADOR` | 10322 | MÉDIA | sim | P-INDICE-PENDENCIAS-CLASSIFICADOR (2026-10-08) — o gerador do índice erra severidade e i |
| `P-SAN3-05-RATCHET-INST-SOME` | 10331 | MÉDIA | sim | P-SAN3-05-RATCHET-INST-SOME (2026-10-09) — uma instanciação reconhecida libera a classe  |
| `P-SAN3-05-IGUALDADE-CATALOGO-L0-SEM-TESTE` | 10338 | MÉDIA | sim | P-SAN3-05-IGUALDADE-CATALOGO-L0-SEM-TESTE (2026-10-09) — igualdade catálogo↔L0 não é uma |
| `P-SAN3-05-GUARDA-FILHOS-LISTA-FECHADA` | 10345 | MÉDIA | sim | P-SAN3-05-GUARDA-FILHOS-LISTA-FECHADA (2026-10-09) — T14c conta grafias em vez de fechar |
| `P-SAN3-05-CENARIO-JOB-CLOUD-CHARGES` | 10352 | MÉDIA | sim | P-SAN3-05-CENARIO-JOB-CLOUD-CHARGES (2026-10-09) — cenário lê efeito da rota, não do job |
| `P-SAN3-05-TIMEOUT-MATA-SO-O-BASH` | 10359 | MÉDIA | sim | P-SAN3-05-TIMEOUT-MATA-SO-O-BASH (2026-10-09) — timeout do helper não mata o grupo — MÉD |
| `P-SAN3-05-REGRA-EM-TABELA` | 10387 | ALTA | sim | P-SAN3-05-REGRA-EM-TABELA (2026-10-09) — regra INSTEAD/ALSO em tabela escapa da trava —  |
| `P-SAN3-06B-TENANTS-BACKEND-EM-MEMORIA` | 10429 | ALTA | sim | P-SAN3-06B-TENANTS-BACKEND-EM-MEMORIA (2026-10-09) — organizações da plataforma ainda nã |
| `P-SAN3-06B-MODULOS-DA-ORG-SEM-PORTA-E-SEM-PERSISTENCIA` | 10436 | MÉDIA | sim | P-SAN3-06B-MODULOS-DA-ORG-SEM-PORTA-E-SEM-PERSISTENCIA (2026-10-09) — módulos por organi |
| `P-SAN3-06B-AUDITORIA-GLOBAL-SEM-ENDPOINT` | 10443 | MÉDIA | sim | P-SAN3-06B-AUDITORIA-GLOBAL-SEM-ENDPOINT (2026-10-09) — trilha cross-org sem fonte — MÉD |
| `P-SAN3-06B-CONFIG-PLATAFORMA-SEM-BACKEND` | 10450 | MÉDIA | sim | P-SAN3-06B-CONFIG-PLATAFORMA-SEM-BACKEND (2026-10-09) — configuração global sem autorida |
| `P-SAN3-06B-APIS-CREDENCIAIS-SEM-BACKEND` | 10457 | MÉDIA | sim | P-SAN3-06B-APIS-CREDENCIAIS-SEM-BACKEND (2026-10-09) — credenciais administrativas sem c |
| `P-SAN3-06B-PLANOS-SEM-ENDPOINT` | 10464 | MÉDIA | sim | P-SAN3-06B-PLANOS-SEM-ENDPOINT (2026-10-09) — catálogo comercial sem rota — MÉDIA |
| `P-SAN3-06B-CLOUD-BILLING-ESCRITA` | 10471 | ALTA | sim | P-SAN3-06B-CLOUD-BILLING-ESCRITA (2026-10-09) — escrita cloud aguarda definição de produ |
| `P-SAN3-06B-SHELL-PLATAFORMA-FANTASMA` | 10478 | MÉDIA | sim | P-SAN3-06B-SHELL-PLATAFORMA-FANTASMA (2026-10-09) — shell contém controles estáticos — M |
| `P-SAN3-06B-MENU-PLATAFORMA-TRES-FONTES` | 10485 | MÉDIA | sim | P-SAN3-06B-MENU-PLATAFORMA-TRES-FONTES (2026-10-09) — menu ainda possui três registros d |
| `P-CI-DOCKER-HUB-LIMITE` | 10506 | MÉDIA | sim | P-CI-DOCKER-HUB-LIMITE (2026-10-09) — o CI baixa Postgres e Redis do Docker Hub sem logi |
| `P-CLOUD-BILLING-ORG-SISTEMA` | 10520 | MÉDIA | sim | P-CLOUD-BILLING-ORG-SISTEMA (2026-10-10) — o rateio do Cloud Billing pode cobrar a organ |
| `P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD` | 10541 | ALTA | sim | P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD (2026-09-18) — o censo de duplicatas do estoque  |
| `P-O6R-B04-CONSUMIDORES-503` | 10558 | MÉDIA | sim | P-O6R-B04-CONSUMIDORES-503 (2026-09-18) — o 503 de estoque e de contagem é contrato novo |
| `P-O6R-B04-UI-STATUS-FECHANDO` | 10568 | MÉDIA | sim | P-O6R-B04-UI-STATUS-FECHANDO (2026-09-18) — a web não conhece o status "fechando" nem os |
| `P-O6R-B04-OPEN-NO-TETO-DO-TIMEOUT` | 10577 | MÉDIA | sim | P-O6R-B04-OPEN-NO-TETO-DO-TIMEOUT (2026-09-20) — a abertura de contagem cresce com N den |
| `P-DEPLOY-RUNBOOK-SEM-PRE-CONDICAO-DO-CENSO` | 10596 | MÉDIA | sim | P-DEPLOY-RUNBOOK-SEM-PRE-CONDICAO-DO-CENSO (2026-09-20) — o runbook de deploy não diz qu |
| `P-O6R-B04-GUARD-D1-ESCRITOR-POR-FORMA` | 10655 | MÉDIA | sim | P-O6R-B04-GUARD-D1-ESCRITOR-POR-FORMA (2026-10-10) — o D1 do T-D deriva o universo de es |
| `P-O6R-B04-GUARD-D2-INDIRECAO-AO-LEDGER` | 10663 | MÉDIA | sim | P-O6R-B04-GUARD-D2-INDIRECAO-AO-LEDGER (2026-10-10) — o universo W do D2 mede alcance a  |
| `P-O6R-B04-GUARD-D7-PORTA-COMO-PROPRIEDADE` | 10672 | MÉDIA | sim | P-O6R-B04-GUARD-D7-PORTA-COMO-PROPRIEDADE (2026-10-10) — o D7 enumera "toda porta públic |
| `P-O6R-B04-GUARD-D5-TRANSICAO-POR-SQL-CRU` | 10681 | MÉDIA | sim | P-O6R-B04-GUARD-D5-TRANSICAO-POR-SQL-CRU (2026-10-10) — o D5 trata a transição de status |
| `P-TRC-VINCULO-POSSE` | 10739 | ALTA | sim | P-TRC-VINCULO-POSSE (2026-10-10) — quem vincula rastreador e como prova que é dono — ALT |
| `P-TRC-LGPD` | 10752 | ALTA | sim | P-TRC-LGPD (2026-10-10) — posição da viatura como dado pessoal do técnico, guarda e aces |
| `P-TRC-TETO-ORGANIZACOES` | 10764 | MÉDIA | sim | P-TRC-TETO-ORGANIZACOES (2026-10-10) — teto de 500 organizações ativas na descoberta do  |
| `P-FIELD-DISPATCH-REASSIGN-NAO-ATOMICO` | 10774 | MÉDIA | sim | P-FIELD-DISPATCH-REASSIGN-NAO-ATOMICO (2026-10-10) — reatribuição e evento em transações |
| `P-PORTAL-LISTEN-SEM-TRATADOR` | 10786 | MÉDIA | sim | P-PORTAL-LISTEN-SEM-TRATADOR (2026-10-10) — falha do listen do portal derruba a API do E |
| `P-O6R-07C-DANO-DEBITA-EXTRATO-DE-COLEGA` | 10794 | ALTA | sim | P-O6R-07C-DANO-DEBITA-EXTRATO-DE-COLEGA (2026-10-10) — o técnico de campo, ao registrar  |
| `P-BLOCO-GOV-GUARDA-POR-PROPRIEDADE` | 10803 | MÉDIA | sim | P-BLOCO-GOV-GUARDA-POR-PROPRIEDADE (2026-10-10) — o bloco transversal que conserta os gu |
| `P-BLOCO-BAT-01` | 10810 | MÉDIA | sim | P-BLOCO-BAT-01 (2026-10-10) — o arnês transversal da bateria (`pg-barrier`/`createGate`, |
| `P-TRC-AWS-ESTUDO-MIGRACAO` | 10844 | MÉDIA | sim | P-TRC-AWS-ESTUDO-MIGRACAO (2026-10-11) — estudo de custo e de migração do ERP inteiro pa |
| `P-EXPENSE-REST-SEM-IDEMPOTENCIA` | 10877 | MÉDIA | sim | P-EXPENSE-REST-SEM-IDEMPOTENCIA (2026-10-11) — as rotas REST de despesa duplicam relatór |
| `P-O6R-07C-APP-RECUSA-PERMANENTE-SEM-SAIDA` | 10899 | MÉDIA | sim | P-O6R-07C-APP-RECUSA-PERMANENTE-SEM-SAIDA (2026-10-10) — ação que o servidor recusa de f |
| `P-O6R-07C-VINCULO-A-OS-ALHEIA-POR-REFERENCIA` | 10906 | MÉDIA | sim | P-O6R-07C-VINCULO-A-OS-ALHEIA-POR-REFERENCIA (2026-10-10) — 10 vias aceitam `work_order_ |
| `P-O6R-07C-FLEET-ALERTS-RUN-PELO-CAMPO` | 10913 | MÉDIA | sim | P-O6R-07C-FLEET-ALERTS-RUN-PELO-CAMPO (2026-10-10) — o técnico de campo dispara a varred |
| `P-O6R-07CA-SUBAPP-EM-ROUTER-INVISIVEL` | 10925 | MÉDIA | sim | P-O6R-07CA-SUBAPP-EM-ROUTER-INVISIVEL (2026-10-10) — sub-app `express()` montado dentro  |
| `P-GOV-GUARDA-POR-PROPRIEDADE` | 10931 | CRÍTICA | sim | P-GOV-GUARDA-POR-PROPRIEDADE (2026-10-11) — o vigia do censo de rotas do 07c-a reconhece |
| `P-LOGISTICS-MOCK` | 10945 | MÉDIA | sim | P-LOGISTICS-MOCK (2026-10-11) — a tela `/logistics` serve dado inventado sempre, mesmo f |
| `P-O6R-B03-FILA-POR-USUARIO` | 10984 | CRÍTICA | sim | P-O6R-B03-FILA-POR-USUARIO (2026-10-11) — a fila do app é por aparelho e organização: a  |
| `P-O6R-B03-CONTRATO-CONFLITO-POR-ACAO` | 10991 | MÉDIA | sim | P-O6R-B03-CONTRATO-CONFLITO-POR-ACAO (2026-10-11) — o app precisa consumir o conflito po |
| `P-O6R-B03-APP-RECEIPT-ATTACH-NAO-SUPORTADO` | 10998 | MÉDIA | sim | P-O6R-B03-APP-RECEIPT-ATTACH-NAO-SUPORTADO (2026-10-11) — o app enfileira `expense_recei |
| `P-O6R-B03-PUBLICACAO-SEM-WRITER-ANTIGO` | 11008 | ALTA | sim | P-O6R-B03-PUBLICACAO-SEM-WRITER-ANTIGO (2026-10-11) — publicar o 03a exige tirar de cena |
| `P-APARENCIA-POR-USUARIO` | 11023 | MÉDIA | sim | P-APARENCIA-POR-USUARIO (2026-10-14) — as 3 aparências aprovadas de cada tela ainda não  |
| `P-TELAS-ACHADOS-MAQUETES-14-10` | 11032 | MÉDIA | sim | P-TELAS-ACHADOS-MAQUETES-14-10 (2026-10-14) — defeitos do sistema de hoje achados ao mon |
| `P-TECNICO-LE-SO-ATRIBUIDAS` | 11049 | ALTA | sim | P-TECNICO-LE-SO-ATRIBUIDAS (2026-10-14) — o técnico de campo ainda lê todas as OS da org |
| `P-USERS-DEFEITOS-14-10` | 11058 | ALTA | sim | P-USERS-DEFEITOS-14-10 (2026-10-14) — a tela de Usuários tem defeitos de acesso e de seg |
| `P-AUDIT-SEGURANCA-15-10` | 11070 | ALTA | sim | P-AUDIT-SEGURANCA-15-10 (2026-10-15) — a Auditoria esconde o que mais importa e não tem  |
| `P-REGISTRO-GATE-SEM-PLACAR-VIVO` | 11091 | MÉDIA | sim | P-REGISTRO-GATE-SEM-PLACAR-VIVO (2026-10-15) — o gate da versão vendável não tem placar  |
| `P-07CB-SUPERIOR-UNICO` | 11097 | MÉDIA | sim | P-07CB-SUPERIOR-UNICO (2026-10-15) — quem autoriza quando a empresa tem uma pessoa só co |
| `P-FINANCEIRO-DEFEITOS-16-10` | 11105 | CRÍTICA | sim | P-FINANCEIRO-DEFEITOS-16-10 (2026-10-16) — o Financeiro de hoje não faz a baixa e soma d |
| `P-ESTOQUE-DEFEITOS-16-10` | 11121 | MÉDIA | sim | P-ESTOQUE-DEFEITOS-16-10 (2026-10-16) — a tela de Estoque conta errado, esconde a custód |
| `P-DESP-TECNICO-VE-DESPACHO-ALHEIO` | 11140 | ALTA | sim | P-DESP-TECNICO-VE-DESPACHO-ALHEIO (2026-10-17) — o Técnico de Campo vê e muda a situação |
| `P-07CB1-ATRIBUICAO-WEB-COM-DESPACHO-ATIVO` | 11181 | MÉDIA | sim | P-07CB1-ATRIBUICAO-WEB-COM-DESPACHO-ATIVO (2026-10-17) — atribuir pela web uma OS que te |
| `P-TRC-VIATURA-PERIODOS` | 11202 | MÉDIA | sim | P-TRC-VIATURA-PERIODOS (2026-10-18) — histórico OS↔viatura por períodos — MÉDIA |
| `P-CI-LISTA-CURADA-6-PRE-EXISTENTES` | 11231 | MÉDIA | sim | P-CI-LISTA-CURADA-6-PRE-EXISTENTES (2026-10-18) — 6 suítes `-db` pré-existentes fora da  |
| `P-TRC-F1-DESPACHO-REACEITE` | 11271 | MÉDIA | sim | P-TRC-F1-DESPACHO-REACEITE (2026-10-18) — despacho re-aceito ou reatribuído depois do fi |
| `P-07CB1-CA6-CA7-SUPERIOR-AUTORIZA-TROCA` | 11311 | CRÍTICA | sim | P-07CB1-CA6-CA7-SUPERIOR-AUTORIZA-TROCA (2026-10-18) — a autorização do superior para a  |
| `P-JUNTA-MUTACAO-NEGADA-PELO-HARNESS` | 11415 | MÉDIA | sim | P-JUNTA-MUTACAO-NEGADA-PELO-HARNESS (2026-10-20) — o classificador de permissões do Clau |
| `P-SAN3-02-PAI-CANCELADO` | 11430 | CRÍTICA | sim | P-SAN3-02-PAI-CANCELADO (2026-10-19) — original cancelado por status continua sendo o pa |
| `P-SAN3-02-DEADLOCK-RESIDUAL` | 11437 | CRÍTICA | sim | P-SAN3-02-DEADLOCK-RESIDUAL (2026-10-19) — deadlock entre escritores de itens de OS sem  |
| `P-SAN3-02-TELA-DELTA` | 11457 | MÉDIA | sim | P-SAN3-02-TELA-DELTA (2026-10-19) — a tela de faturar não mostra complementares nem repe |
| `P-INDICE-PENDENCIAS-CRITICA-COMO-SEVERIDADE` | 11464 | CRÍTICA | sim | P-INDICE-PENDENCIAS-CRITICA-COMO-SEVERIDADE (2026-10-20) — o gerador do índice lê a pala |
| `P-TRC02-LIMITES-POR-ROTA-PROD` | 11486 | MÉDIA | sim | P-TRC02-LIMITES-POR-ROTA-PROD (2026-10-20) — os valores de produção dos dois baldes e da |
| `P-TRC02-QUARENTENA-SEM-TIPO-DE-MENSAGEM` | 11493 | MÉDIA | sim | P-TRC02-QUARENTENA-SEM-TIPO-DE-MENSAGEM (2026-10-20) — o episódio de quarentena mistura  |
| `P-TRC02-RECIBO-VINCULO-VIATURA-FK` | 11500 | MÉDIA | sim | P-TRC02-RECIBO-VINCULO-VIATURA-FK (2026-10-20) — `traccar_ingress_receipts(vehicle_id)`  |
| `P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO` | 11507 | ALTA | sim | P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO (2026-10-20) — o que o ERP exibe da telemetria de v |
| `P-TRC02-AMOSTRA-SO-COM-POSICAO-ACEITA` | 11536 | MÉDIA | sim | P-TRC02-AMOSTRA-SO-COM-POSICAO-ACEITA (2026-10-20) — odômetro e ignição de viatura sem d |
| `P-07C-CENSO-EXEC` | 11550 | MÉDIA | sim | P-07C-CENSO-EXEC (2026-10-20) — o detector de curinga do censo não vê `re.exec(t)` — MÉD |
| `P-TRC02-LOCK-INDICE-RECIBO-PROD` | 11572 | MÉDIA | sim | P-TRC02-LOCK-INDICE-RECIBO-PROD (2026-10-20) — o índice único novo do recibo trava escri |
| `P-SAN3-05-WRAPPERS-BUDGET` | 11579 | MÉDIA | sim | P-SAN3-05-WRAPPERS-BUDGET (2026-10-20) — `withTenantRlsBudget` e `findFirstTenantRls` nã |

## ABERTAS · balde B — processo/registro — 176

| ID | linha | severidade | dono | titulo |
|---|--:|---|---|---|
| `P-006` | 73 | — | **a atribuir** | P-006 - RLS por-tenant e rate-limit por-tenant (proposta, nao implementar) |
| `P-007` | 80 | — | **a atribuir** | P-007 - Prisma forward-only: rollback via SQL manual (2026-07-07) |
| `P-SAN-E2E` | 509 | — | sim | P-SAN-E2E - Playwright e2e fora do gate obrigatório (Ω-GATE, 2026-07-13) |
| `P-SAN-KPI-BACKFILL` | 534 | — | **a atribuir** | P-SAN-KPI-BACKFILL - Backfill de merge_commit/approved_head nos KPIs pode persistir null |
| `P-Ω3F6-COMISSAO-REVERSAL` | 832 | — | **a atribuir** | P-Ω3F6-COMISSAO-REVERSAL - dual-gate na engine de cálculo + reversão de comissão de OS c |
| `P-Ω3F6-COMISSAO-PRISMA-COV` | 844 | — | **a atribuir** | P-Ω3F6-COMISSAO-PRISMA-COV - caminho Prisma do gate de supressão só coberto por tsc+revi |
| `P-Ω3F7B-MAPA-ETAPA` | 938 | — | **a atribuir** | P-Ω3F7B-MAPA-ETAPA - Mapa de posição por etapa: falta a FONTE DE DADOS (Ω3F-7b, 2026-07- |
| `P-Ω3F7-MOBILETAB-NITS` | 951 | — | **a atribuir** | P-Ω3F7-MOBILETAB-NITS - Nits da pós-análise da MobileTab (Ω3F-7, 2026-07-17) |
| `P-Ω4-2B-KPI-AGREGADO` | 1040 | BAIXA | sim | P-Ω4-2B-KPI-AGREGADO — KPIs/tabs somam só as linhas carregadas (MÉDIO, Ω4-8 Dashboard) |
| `P-Ω4-3-INVOICE-LEASTPRIV` | 1116 | BAIXA | sim | P-Ω4-3-INVOICE-LEASTPRIV — Rota invoice não exige work_order_financials:read (BAIXA) |
| `P-Ω4-4-EDGES` | 1138 | — | sim | P-Ω4-4-EDGES — Bordas do Ω4-4 (Caixa/Extrato + liquidação) — implementado, com decisões  |
| `P-Ω4-5-BATCH` | 1265 | — | sim | P-Ω4-5-BATCH — conciliação em LOTE (importar extrato CSV/OFX → casar N lançamentos) — AD |
| `P-Ω4-7-DUPLA-CONTAGEM` | 1387 | BAIXA | sim | P-Ω4-7-DUPLA-CONTAGEM — cheque-register vs payTitle p/ o mesmo dinheiro (BAIXA — risco d |
| `P-Ω3F6` | 1435 | BAIXA | sim | P-Ω3F6 — cluster de cancelamento: STATUS-BYPASS/TERMINAL-GUARD/ZERO-ATOMICIDADE RESOLVID |
| `P-GOLIVE-GATES` | 1499 | — | sim | P-GOLIVE-GATES — Gates humanos de go-live (R1 provedor, R2 restore cronometrado, smoke a |
| `P-SCREEN-REFS-PATH` | 1742 | — | **a atribuir** | P-SCREEN-REFS-PATH — screen-refs/ na raiz × docs/claude-code-handoff/screen-refs/ (2026- |
| `P-ERP-MOBILE-DC-HTML` | 1749 | — | **a atribuir** | P-ERP-MOBILE-DC-HTML — protótipo `ERP Mobile.dc.html` ausente (2026-07-28) |
| `P-CLAUDE-COMPANIONS-DRAFTS` | 1756 | — | **a atribuir** | P-CLAUDE-COMPANIONS-DRAFTS — arquivos companheiros criados como drafts fundados (2026-07 |
| `P-KPI-PR18A-MVP-VENDAVEL` | 1783 | — | **a atribuir** | P-KPI-PR18A-MVP-VENDAVEL — latest 88% × history 92% (2026-07-29) |
| `P-IMPOUND-CHK-VISIBILITY` | 1812 | — | sim | P-IMPOUND-CHK-VISIBILITY (2026-08-01) — consequência de RBAC no endpoint de custódia (co |
| `P-CHK-AUTOLINK-FASE-REAL` | 2403 | — | **a atribuir** | P-CHK-AUTOLINK-FASE-REAL (2026-08-11 — junta `J-CHK-P1-PR04B-autolink`, nascida da decis |
| `P-IMPOUND-LINK-SEM-UNLINK` | 2420 | — | **a atribuir** | P-IMPOUND-LINK-SEM-UNLINK (2026-08-11 — junta `J-CHK-P1-PR04B-autolink`, fato comum aos  |
| `P-O6R-BACKLOG` | 2478 | — | **a atribuir** | P-O6R-BACKLOG (2026-08-14) — os 29 achados da auditoria Ω6R entram no controle operacion |
| `P-O6R-B03` | 2886 | — | sim | P-O6R-B03 (2026-08-14) — `fix/expense-sync-atomic` — Ω6R-DIN-009 (P0) + QUA-001 (P1) — * |
| `P-O6R-B12` | 2988 | — | sim | P-O6R-B12 (2026-08-18) — `fix/jurisdiction-profile-versioning` — Ω6R-DAT-004 (1 P1) — ** |
| `P-O6R-B08` | 3280 | — | **a atribuir** | P-O6R-B08 (2026-08-14) — `fix/durable-jobs-realtime` — Ω6R-ARQ-001..003 + PERF-001 (4 P1 |
| `P-O6R-B09` | 3326 | — | sim | P-O6R-B09 (2026-08-14) — `fix/dispatch-atomic-timeline` — Ω6R-ARQ-004 (P1) — **BLOQUEIA  |
| `P-O6R-B10` | 3350 | — | **a atribuir** | P-O6R-B10 (2026-08-14) — `fix/client-load-shedding` — Ω6R-PERF-002, PERF-003 (2 P1) — ** |
| `P-TESTS-FORA-DO-TYPECHECK` | 3436 | — | **a atribuir** | P-TESTS-FORA-DO-TYPECHECK (2026-08-14 — ciclo 3 da revisão do CHK P1 PR-04c-A) |
| `P-CHK-DEFERRED-SEM-LEITURA` | 3454 | BAIXA | **a atribuir** | P-CHK-DEFERRED-SEM-LEITURA (2026-08-14 — ciclo 4 da revisão do CHK P1 PR-04c-A) |
| `P-O6R-B05-WORKER-EXTERNO-DIFERIDO` | 3562 | — | sim | P-O6R-B05-WORKER-EXTERNO-DIFERIDO (2026-08-15 — bloco B-O6R-05, decisão C4) |
| `P-O6R-B05-HEARTBEAT-NAO-DETECTA-HANDLER-TRAVADO` | 3586 | — | **a atribuir** | P-O6R-B05-HEARTBEAT-NAO-DETECTA-HANDLER-TRAVADO (2026-08-15 — bloco B-O6R-05) |
| `P-O6R-B05-README-ATIVACAO` | 3594 | — | sim | P-O6R-B05-README-ATIVACAO (2026-08-15 — bloco B-O6R-05) |
| `P-O6R-B05-DATABASE-URL-SEM-FORMA-NEM-HOST` | 3688 | — | sim | P-O6R-B05-DATABASE-URL-SEM-FORMA-NEM-HOST (2026-08-15 — junta do PR #353, ressalva do `a |
| `P-O6R-B01-ROLE-LITERAIS` | 3731 | — | **a atribuir** | P-O6R-B01-ROLE-LITERAIS (2026-08-18 — ciclo 2 do B-O6R-01, plano §9) |
| `P-O6R-B01-ROUTE-ERROR-LEAK` | 3749 | — | **a atribuir** | P-O6R-B01-ROUTE-ERROR-LEAK (2026-08-18 — ciclo 2 do B-O6R-01, plano §9; achado B-7 do R- |
| `P-O6R-ARNES-ISOLAMENTO` | 3760 | — | sim | P-O6R-ARNES-ISOLAMENTO (2026-08-18) — o arranjo do lote de testes contra Postgres, **ant |
| `P-O6R-B01-ROUTE-ERROR-LEAK` | 3899 | — | sim | P-O6R-B01-ROUTE-ERROR-LEAK — **EMENDA de escopo (2026-08-19)** |
| `P-O6R-ARNES-ISOLAMENTO` | 3909 | — | sim | P-O6R-ARNES-ISOLAMENTO — **EMENDAS medidas pela junta do ciclo 3** |
| `P-O6R-ARNES-ISOLAMENTO` | 3931 | — | sim | P-O6R-ARNES-ISOLAMENTO — **EMENDAS do bloco B-O6R-ARNES (2026-08-28)** — o bloco próprio |
| `P-ARNES-VAZAMENTO-LINEAR-IDENTIDADES` | 4059 | — | sim | P-ARNES-VAZAMENTO-LINEAR-IDENTIDADES — **ATRIBUÍDO POR EXECUÇÃO** (2026-08-28, B-O6R-ARN |
| `P-ARNES-CANONICA1-VERMELHO-AMBIENTAL` | 4090 | — | sim | P-ARNES-CANONICA1-VERMELHO-AMBIENTAL (2026-08-28 — B-O6R-ARNES) — pré-existente, NOMEADO |
| `P-O6R-ARNES-ISOLAMENTO` | 4537 | — | sim | P-O6R-ARNES-ISOLAMENTO — EMENDAS medidas pela junta do ciclo 4 (2026-08-28, cadeira do a |
| `P-O6R-ARNES-ISOLAMENTO` | 4556 | — | sim | P-O6R-ARNES-ISOLAMENTO — EMENDAS do bloco `SAN2-4b` (2026-08-31) — mecanismo da orfa e d |
| `P-ARNES-CONEXAO-SEM-ASSEVERACAO-DE-IDENTIDADE` | 4626 | BAIXA | sim | P-ARNES-CONEXAO-SEM-ASSEVERACAO-DE-IDENTIDADE (2026-08-28) — BAIXA · **Dono:** bloco de  |
| `P-REG-DIVERGENCIA-SEM-PLANEJADOR-MESTRE` | 4754 | — | sim | P-REG-DIVERGENCIA-SEM-PLANEJADOR-MESTRE (2026-08-28) — divergência de processo, registra |
| `P-ARNES-RATCHET-POR-CONTAGEM-CEGO-A-PROSA` | 5490 | — | sim | P-ARNES-RATCHET-POR-CONTAGEM-CEGO-A-PROSA (2026-08-31 — achado do `SAN2-4b`, correcoes C |
| `P-REG-BATERIA-NAO-TYPECHECA-TESTS` | 5561 | — | sim | P-REG-BATERIA-NAO-TYPECHECA-TESTS (2026-08-31 — achado do `SAN2-4b`, correcao C2) — `pre |
| `P-AUTHORITY-N-NAO-CANONICO-NO-STORED` | 5681 | BAIXA | sim | P-AUTHORITY-N-NAO-CANONICO-NO-STORED (2026-08-31) — BAIXA · os campos numéricos do `stor |
| `P-CLAUDE-ABERTURA-PRECEDENCIA-DESATUALIZADA` | 5935 | BAIXA | sim | P-CLAUDE-ABERTURA-PRECEDENCIA-DESATUALIZADA (2026-09-01 — medido pelo dev do `SAN2-6`, § |
| `P-ESPELHO-C7-3-MECANISMO-PESQUISADOR` | 6067 | BAIXA | sim | P-ESPELHO-C7-3-MECANISMO-PESQUISADOR (2026-09-02 — achado `C1-A3` da junta `J-SAN2-6`) — |
| `P-KPI-CARIMBO-MVP-DEFASADO-SAN2-5` | 6111 | BAIXA | sim | P-KPI-CARIMBO-MVP-DEFASADO-SAN2-5 (2026-09-02 — achado `C3-N1` da junta `J-SAN2-6`) — BA |
| `P-O6R-B02-INDISPUTE-RESTORE` | 6150 | — | sim | P-O6R-B02-INDISPUTE-RESTORE (2026-08-22) — estorno devolve `in_dispute` para `open` |
| `P-O6R-B02-CHEQUE-UNCLEAR` | 6166 | — | sim | P-O6R-B02-CHEQUE-UNCLEAR (2026-08-22) — não existe des-compensar um cheque compensado po |
| `P-O6R-ARNES-ISOLAMENTO` | 6211 | — | sim | P-O6R-ARNES-ISOLAMENTO — EMENDA do ciclo 5 do B-O6R-02 (2026-09-02) — o objeto disputado |
| `P-O6R-ARNES-ISOLAMENTO` | 6252 | — | sim | P-O6R-ARNES-ISOLAMENTO — EMENDA de PRECISÃO do ciclo 5 (2026-09-03) — o vazamento +5/+5  |
| `P-O6R-B02-RULINGS-SEM-DESTINO` | 6290 | BAIXA | sim | P-O6R-B02-RULINGS-SEM-DESTINO (2026-09-03 — ACHADO-1 do `critico-c5-adversarial`) — BAIX |
| `P-KPI-HISTORY-MD-BACKLOG` | 6833 | BAIXA | sim | P-KPI-HISTORY-MD-BACKLOG (registro 4/7, 2026-09-03) — espelho `Kpis/kpis-history.md` com |
| `P-STATUS-NEGRITO-INVISIVEL-AO-GERADOR` | 7018 | BAIXA | sim | P-STATUS-NEGRITO-INVISIVEL-AO-GERADOR (2026-09-05) — BAIXA · achado ao consertar a quart |
| `P-O6R-B07B-LEGADO-MIME` | 7307 | BAIXA | sim | P-O6R-B07B-LEGADO-MIME (2026-09-06) — linhas antigas com `mime_type` declarado pelo clie |
| `P-O6R-B07B-REJEICAO-SEM-AUDIT-LOG` | 7316 | BAIXA | sim | P-O6R-B07B-REJEICAO-SEM-AUDIT-LOG (2026-09-06) — recusa de upload em V2–V5 só em log est |
| `P-O6R-B07B-CODIGOS-INCONSISTENTES` | 7325 | BAIXA | sim | P-O6R-B07B-CODIGOS-INCONSISTENTES (2026-09-06) — V4 usa `400` onde as irmãs usam `415`/` |
| `P-O6R-B07B-RECEIPT-CONTENT-TYPE` | 7335 | BAIXA | sim | P-O6R-B07B-RECEIPT-CONTENT-TYPE (2026-09-06) — V1 não cruza o `content_type` do recibo c |
| `P-O6R-B07B-S3-PREFIXO-LEGADO` | 7345 | BAIXA | sim | P-O6R-B07B-S3-PREFIXO-LEGADO (2026-09-06) — chave S3 gravada com prefixo antigo passa a  |
| `P-O6R-B06-SEM-PODA-POR-IDADE` | 7588 | BAIXA | sim | P-O6R-B06-SEM-PODA-POR-IDADE (2026-09-07) — `cloud_usage_events` não pode ser podada por |
| `P-O6R-B06-DECIMAL-NA-BORDA` | 7604 | BAIXA | sim | P-O6R-B06-DECIMAL-NA-BORDA (2026-09-07) — `totalUnblendedCost: number` continua lossy no |
| `P-GOV-MAQUINAS-DE-DESFAZER-PROMOVER` | 7709 | BAIXA | sim | P-GOV-MAQUINAS-DE-DESFAZER-PROMOVER (2026-09-07) — competência reutilizável saiu na apos |
| `P-GOV-SKILLS-RELEVANCIA` | 7776 | BAIXA | sim | P-GOV-SKILLS-RELEVANCIA (2026-09-07) — 5 skills voltaram a carregar; 1 delas não tem rel |
| `P-GOV-AUDITOR-ARESTAS-MENORES` | 8179 | BAIXA | sim | P-GOV-AUDITOR-ARESTAS-MENORES (2026-09-08) — quatro arestas BAIXA do auditor enxuto — BA |
| `P-O6R-LISTCOSTLINEITEMS-SEM-ESCOPO-IMPORT` | 8325 | BAIXA | sim | P-O6R-LISTCOSTLINEITEMS-SEM-ESCOPO-IMPORT (2026-09-09) — a leitura do rateio soma por ov |
| `P-O6R-B06-DELTA-RESIDUAIS` | 8348 | BAIXA | sim | P-O6R-B06-DELTA-RESIDUAIS (2026-09-09) — dois residuais do conserto de isolamento, nomea |
| `P-WEB-EVENTBUS-MOCK` | 8647 | BAIXA | sim | P-WEB-EVENTBUS-MOCK (2026-09-11) — Provider de eventos cicla mocks a cada 9 s contra rot |
| `P-API-VERBOS-SEM-CONSUMIDOR` | 8693 | BAIXA | sim | P-API-VERBOS-SEM-CONSUMIDOR (2026-09-11) — Verbos de administração sem nenhuma tela (mer |
| `P-MOBILE-STUBS-MOCKS-MORTOS` | 8795 | BAIXA | sim | P-MOBILE-STUBS-MOCKS-MORTOS (2026-09-11) — Stubs `Pending*` mortos (token local nunca nu |
| `P-MOBILE-OCR-ANDAIME-INERTE` | 8846 | BAIXA | sim | P-MOBILE-OCR-ANDAIME-INERTE (2026-09-11) — OCR de recibo: estados, colunas e permissão s |
| `P-JOBS-HANDLERS-PLACEHOLDER` | 8950 | BAIXA | sim | P-JOBS-HANDLERS-PLACEHOLDER (2026-09-11) — Dois handlers vazios ("Placeholder") consomem |
| `P-IMPOUND-OUTBOX-SIVEC-SEM-CONSUMIDOR` | 8967 | BAIXA | sim | P-IMPOUND-OUTBOX-SIVEC-SEM-CONSUMIDOR (2026-09-11) — Outbox Sivec é escrito por 5 reposi |
| `P-CATALOGO-TELAS-PLANEJADAS-AUSENTES` | 9020 | BAIXA | sim | P-CATALOGO-TELAS-PLANEJADAS-AUSENTES (2026-09-11) — Telas do catálogo nunca feitas: rota |
| `P-DOC-CONTRATOS-PROMETEM-INEXISTENTE` | 9037 | BAIXA | sim | P-DOC-CONTRATOS-PROMETEM-INEXISTENTE (2026-09-11) — Contrato promete Cognito e `POST /mo |
| `P-GOV-MOLDE-SEM-CORPOS-DE-JURADO` | 9106 | BAIXA | sim | P-GOV-MOLDE-SEM-CORPOS-DE-JURADO (2026-09-11) — Molde de plano/briefing não prevê os cor |
| `P-O6R-B06-ATA-RESIDUOS-DE-REGISTRO` | 9123 | BAIXA | sim | P-O6R-B06-ATA-RESIDUOS-DE-REGISTRO (2026-09-11) — Ata e votos do B06 com resíduos: plano |
| `P-GOV-SKILL-384-SEM-DECISAO` | 9157 | BAIXA | sim | P-GOV-SKILL-384-SEM-DECISAO (2026-09-11) — Skill `backend-review-ts-prisma` (#384) entro |
| `P-GOV-DECISOES-1968-GATE-INEXISTENTE` | 9276 | BAIXA | sim | P-GOV-DECISOES-1968-GATE-INEXISTENTE (2026-09-11) — Decisão viva sustentada pelo parecer |
| `P-GOV-CONTRATO-HIGIENE-TEXTUAL` | 9293 | BAIXA | sim | P-GOV-CONTRATO-HIGIENE-TEXTUAL (2026-09-11) — Contrato com "assento" solto, `1-ter` ante |
| `P-GOV-MONOCULTURA-FABLE-NOS-GATES` | 9310 | BAIXA | sim | P-GOV-MONOCULTURA-FABLE-NOS-GATES (2026-09-11) — Os três gates fixados no mesmo modelo c |
| `P-GOV-ESPECIALISTAS-SEM-POLITICA-DE-VERSIONAMENTO` | 9327 | BAIXA | sim | P-GOV-ESPECIALISTAS-SEM-POLITICA-DE-VERSIONAMENTO (2026-09-11) — Não há regra se corpos  |
| `P-SAN3-01-ORCAMENTO-SELECTS-SEM-ERRO` | 9472 | BAIXA | sim | P-SAN3-01-ORCAMENTO-SELECTS-SEM-ERRO (2026-09-17) — erro em qualquer dos 3 services deix |
| `P-SAN3-01-JURISDICAO-DEFAULTS-LOCAIS` | 9481 | BAIXA | sim | P-SAN3-01-JURISDICAO-DEFAULTS-LOCAIS (2026-09-17) — `GET /jurisdiction-defaults` falha e |
| `P-SAN3-01-OS-LEGADO-MORTO` | 9490 | BAIXA | sim | P-SAN3-01-OS-LEGADO-MORTO (2026-09-17) — páginas, repositório e mocks legados de OS sem  |
| `P-SAN3-01-SHELL-BADGES-ZERO-NO-ERRO` | 9499 | BAIXA | sim | P-SAN3-01-SHELL-BADGES-ZERO-NO-ERRO (2026-09-17) — os contadores do shell viram "0" quan |
| `P-SAN3-01-CREATE-INVALID-DATE-MENSAGEM` | 9526 | BAIXA | sim | P-SAN3-01-CREATE-INVALID-DATE-MENSAGEM (2026-09-17) — data malformada no create de OS vi |
| `P-SAN3-01-NAV-MENU-DEMO-NO-ERRO` | 9581 | BAIXA | sim | P-SAN3-01-NAV-MENU-DEMO-NO-ERRO (2026-09-18) — quando o menu do backend falha, a navegaç |
| `P-SAN3-01-BATERIA-TSX-CWD` | 9622 | BAIXA | sim | P-SAN3-01-BATERIA-TSX-CWD (2026-09-18) — os testes `.tsx` do frontend só ficam verdes co |
| `P-SAN3-01-STALE-ICONE-COR` | 9631 | BAIXA | sim | P-SAN3-01-STALE-ICONE-COR (2026-09-18) — o ícone da faixa "dados desatualizados" diverge |
| `P-SAN3-01-C2-DIVERGENCIA-VAZIO-NO-CARD` | 9649 | BAIXA | sim | P-SAN3-01-C2-DIVERGENCIA-VAZIO-NO-CARD (2026-09-18) — divergência do plano do ciclo 2 (§ |
| `P-SAN3-04A-MATRIZ-BULLETS-101-103` | 9795 | BAIXA | sim | P-SAN3-04A-MATRIZ-BULLETS-101-103 (2026-09-18) — dois tópicos da matriz não citam o Fina |
| `P-SAN3-04A-TARIFAS-X-L41-FINANCE` | 9803 | BAIXA | sim | P-SAN3-04A-TARIFAS-X-L41-FINANCE (2026-09-18) — tópicos de tarifas e tabelas de valores  |
| `P-KPI-NOTAS-CARREGADAS-REGRESSAO-392` | 9920 | BAIXA | sim | P-KPI-NOTAS-CARREGADAS-REGRESSAO-392 (2026-09-28) — quatro métricas do KPI carregadas se |
| `P-GOV-PROJECT-MEMORY-TETO-VELHO` | 9952 | BAIXA | sim | P-GOV-PROJECT-MEMORY-TETO-VELHO (2026-09-28) — o PROJECT_MEMORY.md, de leitura obrigatór |
| `P-CHORE-CLEANUP-DESCE-EM-WORKTREES` | 9962 | BAIXA | sim | P-CHORE-CLEANUP-DESCE-EM-WORKTREES (2026-09-28) — a limpeza pós-merge apaga cache dentro |
| `P-GOV-OBITUARIO-SEMTETO` | 9972 | BAIXA | sim | P-GOV-OBITUARIO-SEMTETO (2026-10-01) — os três votantes do B-GOV-SEM-TETO não estão no O |
| `P-GOV-PAUSA-ESCADA-C76BIS` | 9982 | BAIXA | sim | P-GOV-PAUSA-ESCADA-C76BIS (2026-10-01) — a parada por Opus esgotado (§C7.6-bis) e a paus |
| `P-GOV-PAUSA-ELABORACOES-DO-TRANSCRITOR` | 9992 | BAIXA | sim | P-GOV-PAUSA-ELABORACOES-DO-TRANSCRITOR (2026-10-01) — 61 elaborações do texto do orquest |
| `P-GOV-PAUSA-CASO-SEM-FONTE` | 10002 | BAIXA | sim | P-GOV-PAUSA-CASO-SEM-FONTE (2026-10-01) — o caso do Dev-T4 que motivou a P7 é chamado de |
| `P-SAN3-01B-PAGINA-FIACAO-DE-INTERACAO` | 10024 | BAIXA | sim | P-SAN3-01B-PAGINA-FIACAO-DE-INTERACAO (2026-10-02) — 9 sítios de fiação de interação da  |
| `P-SAN3-01B-GUARD-DE-ROTA-COM-ATALHO-DE-PLATAFORMA` | 10033 | BAIXA | sim | P-SAN3-01B-GUARD-DE-ROTA-COM-ATALHO-DE-PLATAFORMA (2026-10-02) — o `PermissionGuard` de  |
| `P-SAN3-01B-PROVA-DO-GATE-EXTENSIONAL` | 10056 | BAIXA | sim | P-SAN3-01B-PROVA-DO-GATE-EXTENSIONAL (2026-10-02) — a prova de que o botão "Nova OS" usa |
| `P-SAN3-05-LEITURA-MORTA-PROJECAO-DIARIA` | 10086 | BAIXA | sim | P-SAN3-05-LEITURA-MORTA-PROJECAO-DIARIA (2026-10-03) — leitura da projeção diária sem ch |
| `P-SAN3-05-LACO-POR-TENANT-DUPLICADO` | 10092 | BAIXA | sim | P-SAN3-05-LACO-POR-TENANT-DUPLICADO (2026-10-03) — dois laços confiados pelo ratchet — B |
| `P-SAN3-05-LOG-DO-SERVIDOR-FORA-DA-CI` | 10121 | BAIXA | sim | P-SAN3-05-LOG-DO-SERVIDOR-FORA-DA-CI (2026-10-09) — CI não lê o server.log do PostgreSQL |
| `P-SAN3-11-VIGENTE-NAO-VINCULADA` | 10153 | BAIXA | sim | P-SAN3-11-VIGENTE-NAO-VINCULADA (2026-10-01 — B-SAN3-11) |
| `P-SAN3-11-ORDEM-DO-REPOSITORIO-INDEFINIDA` | 10170 | BAIXA | sim | P-SAN3-11-ORDEM-DO-REPOSITORIO-INDEFINIDA (2026-10-01 — B-SAN3-11) |
| `P-SAN3-11-CENSO-CAST-RECORD` | 10182 | BAIXA | sim | P-SAN3-11-CENSO-CAST-RECORD (2026-10-05 — B-SAN3-11, revisão do ciclo 3) |
| `P-SAN3-11-TESTES-L3-DESCONHECIDO-E-REDE` | 10194 | BAIXA | sim | P-SAN3-11-TESTES-L3-DESCONHECIDO-E-REDE (2026-10-05 — B-SAN3-11, revisão do ciclo 3) |
| `P-WEB-TOPBAR-ROTULO-FALLBACK` | 10219 | BAIXA | sim | P-WEB-TOPBAR-ROTULO-FALLBACK (2026-10-08) — a barra do topo mostra "Operação" em /users  |
| `P-WEB-PADRAO-MICRODIFERENCAS` | 10229 | BAIXA | sim | P-WEB-PADRAO-MICRODIFERENCAS (2026-10-08) — três diferenças miúdas entre o app e o desig |
| `P-CSV-FORMULA-GLOBAL` | 10252 | BAIXA | sim | P-CSV-FORMULA-GLOBAL (2026-10-08) — os exportadores CSV não neutralizam fórmulas — BAIXA |
| `P-WO-FILTROS-LEGADO-MORTO` | 10274 | BAIXA | sim | P-WO-FILTROS-LEGADO-MORTO (2026-10-08) — componente de filtros antigo sem uso — BAIXA |
| `P-OS-EXPORTAR-PERMISSAO-PREMISSA` | 10295 | BAIXA | sim | P-OS-EXPORTAR-PERMISSAO-PREMISSA (2026-10-08) — exportar a lista de OS usa a permissão d |
| `P-OS-EX4-SO-COLUNA-CLIENTE` | 10305 | BAIXA | sim | P-OS-EX4-SO-COLUNA-CLIENTE (2026-10-08) — o teste de neutralização de fórmula só confere |
| `P-OS-ARIA-CONTROLS-FECHADO` | 10314 | BAIXA | sim | P-OS-ARIA-CONTROLS-FECHADO (2026-10-08) — nenhum teste confere o aria-controls com o pai |
| `P-SAN3-05-LIMPEZA-SEM-FINALLY-MIGRATOR` | 10366 | BAIXA | sim | P-SAN3-05-LIMPEZA-SEM-FINALLY-MIGRATOR (2026-10-09) — fixture pode deixar migrador com p |
| `P-SAN3-05-GUARDA-LOG-FORMA-TEXTUAL` | 10373 | BAIXA | sim | P-SAN3-05-GUARDA-LOG-FORMA-TEXTUAL (2026-10-09) — guarda de log aceita campo textual ind |
| `P-SAN3-05-T15-FALSO-VERMELHO-PORTA` | 10380 | BAIXA | sim | P-SAN3-05-T15-FALSO-VERMELHO-PORTA (2026-10-09) — pid ou tempo pode casar a porta — BAIX |
| `P-SAN3-05-VIEW-SOBRE-FUNCAO-INVOKER` | 10394 | BAIXA | sim | P-SAN3-05-VIEW-SOBRE-FUNCAO-INVOKER (2026-10-09) — view sobre função SQL invoker não é r |
| `P-SAN3-05-SUITE-SEM-FORMAS-F1-F3` | 10401 | BAIXA | sim | P-SAN3-05-SUITE-SEM-FORMAS-F1-F3 (2026-10-09) — a suíte não fixa as formas de view que o |
| `P-SAN3-05-MENSAGEM-DA-RECUSA` | 10422 | BAIXA | sim | P-SAN3-05-MENSAGEM-DA-RECUSA (2026-10-09) — o texto da recusa atribui a via ao papel e n |
| `P-SAN3-06B-E2E-PLATAFORMA-DEFASADO` | 10492 | BAIXA | sim | P-SAN3-06B-E2E-PLATAFORMA-DEFASADO (2026-10-09) — cenário Playwright espera console anti |
| `P-SAN3-06B-HEALTH-FETCH-DIRETO` | 10499 | BAIXA | sim | P-SAN3-06B-HEALTH-FETCH-DIRETO (2026-10-09) — readiness exige resposta crua de 503 — BAI |
| `P-SAN3-06B-TESTES-RESIDUAIS` | 10513 | BAIXA | sim | P-SAN3-06B-TESTES-RESIDUAIS (2026-10-10) — lacunas de teste e um rótulo de Saúde deixado |
| `P-LINT-RAIZ-SEM-MJS` | 10527 | BAIXA | sim | P-LINT-RAIZ-SEM-MJS (2026-10-10) — o lint da raiz não cobre `scripts/*.mjs` — BAIXA |
| `P-KPI-MARCO-2026-10-09-NOTAS` | 10534 | BAIXA | sim | P-KPI-MARCO-2026-10-09-NOTAS (2026-10-10) — três notas do revisor do KPI por marco (#412 |
| `P-O6R-B04-REGISTRO-CICLO1-NAO-VERSIONADO` | 10643 | BAIXA | sim | P-O6R-B04-REGISTRO-CICLO1-NAO-VERSIONADO (2026-10-10) — os votos, o parecer do inspetor  |
| `P-O6R-B04-CENSO-DETECTOR-DE-LITERAIS` | 10690 | BAIXA | sim | P-O6R-B04-CENSO-DETECTOR-DE-LITERAIS (2026-10-10) — o detector somente-leitura do censo  |
| `P-REG-GERADOR-SEVERIDADE-POR-PALAVRA` | 10816 | BAIXA | sim | P-REG-GERADOR-SEVERIDADE-POR-PALAVRA (2026-10-10) — o gerador do índice toma a maior pal |
| `P-AGENTE-CHECK-SEM-GENERATE` | 10836 | BAIXA | sim | P-AGENTE-CHECK-SEM-GENERATE (2026-10-10) — npm run check no worktree descartável exige p |
| `P-AGENTE-API-ANINHAMENTO-PROFUNDO` | 10871 | BAIXA | sim | P-AGENTE-API-ANINHAMENTO-PROFUNDO (2026-10-10) — entrada de ferramenta aninhada além de  |
| `P-INDICE-SEVERIDADE-POR-SUBSTRING` | 10952 | BAIXA | sim | P-INDICE-SEVERIDADE-POR-SUBSTRING (2026-10-11) — o gerador do índice tira a severidade d |
| `P-O6R-B03-TRANSIENT-CODES-DUPLICADOS` | 11003 | BAIXA | sim | P-O6R-B03-TRANSIENT-CODES-DUPLICADOS (2026-10-11) — a lista de códigos transitórios do s |
| `P-O6R-03A-ENUM-SEM-DENUNCIA` | 11016 | BAIXA | sim | P-O6R-03A-ENUM-SEM-DENUNCIA (2026-10-14) — tipo novo no enum do sync de despesa não é de |
| `P-ARNES2-D3-HANDLES-DO-BOOT-RECUSADO` | 11157 | BAIXA | sim | P-ARNES2-D3-HANDLES-DO-BOOT-RECUSADO (2026-10-17) — o que mantinha vivo por ~10 s o proc |
| `P-INVENTORY-CYCLE-COUNT-B16-INTERMITENTE` | 11169 | BAIXA | sim | P-INVENTORY-CYCLE-COUNT-B16-INTERMITENTE (2026-10-17) — o B16 de `inventory-cycle-count- |
| `P-07CB1-CANCELAR-EM-NO-LOCAL` | 11187 | BAIXA | sim | P-07CB1-CANCELAR-EM-NO-LOCAL (2026-10-17) — cancelar ou falhar despacho em "No local" en |
| `P-TRC-CI-COMENTARIO-DENOMINADOR` | 11194 | BAIXA | sim | P-TRC-CI-COMENTARIO-DENOMINADOR (2026-10-18) — o comentário da lista curada do `ci.yml`  |
| `P-TRC-VIATURA-NULL-SEM-SINAL` | 11209 | BAIXA | sim | P-TRC-VIATURA-NULL-SEM-SINAL (2026-10-18) — a OS que perde a viatura para NULL por SQL n |
| `P-TRC-QUARENTENA-CONSERVADORA` | 11217 | BAIXA | sim | P-TRC-QUARENTENA-CONSERVADORA (2026-10-18) — troca de viatura depois do instante quarent |
| `P-TRC-AMBIGUIDADE-MESMO-OPERADOR` | 11224 | BAIXA | sim | P-TRC-AMBIGUIDADE-MESMO-OPERADOR (2026-10-18) — OS desconhecida do mesmo operador não pr |
| `P-TRC-OWN-ONCE-SEM-VIGIA` | 11238 | BAIXA | sim | P-TRC-OWN-ONCE-SEM-VIGIA (2026-10-18) — a propriedade OWN-ONCE (o evento sai uma vez) nã |
| `P-TRC-RELOGIOS-NODE-POSTGRES` | 11244 | BAIXA | sim | P-TRC-RELOGIOS-NODE-POSTGRES (2026-10-18) — hipótese: relógio do Node × relógio do Postg |
| `P-TRC-TETO-REDUNDANTE` | 11251 | BAIXA | sim | P-TRC-TETO-REDUNDANTE (2026-10-18) — redundância do teto de organizações na descoberta — |
| `P-TRC-M-B1-CONTROLE-TERMINATED` | 11257 | BAIXA | sim | P-TRC-M-B1-CONTROLE-TERMINATED (2026-10-18) — sob a mutação M-B1 o T-B1 cai no controle  |
| `P-TRC-AUTORIZACAO-EM-BLOCO` | 11264 | BAIXA | sim | P-TRC-AUTORIZACAO-EM-BLOCO (2026-10-18) — a `D-TRC01-VEHICLE-ASSIGNED-AT` foi aprovada p |
| `P-TRC01-CENSUS-GUARD-SEM-REEXECUCAO` | 11280 | BAIXA | sim | P-TRC01-CENSUS-GUARD-SEM-REEXECUCAO (2026-10-18) — o `o6r07c-census-guard` não roda inte |
| `P-TRC01-R-CICLO2-PERGUNTA-A` | 11288 | BAIXA | sim | P-TRC01-R-CICLO2-PERGUNTA-A (2026-10-18) — o `R-B-TRC-01-ciclo2.md` não responde por esc |
| `P-07CB1-K2-CONCLUSAO-APOS-REINICIO` | 11295 | BAIXA | sim | P-07CB1-K2-CONCLUSAO-APOS-REINICIO (2026-10-18) — a conclusão de vistoria já aplicada vo |
| `P-07CB1-RESIDUAL-BACKFILL` | 11303 | BAIXA | sim | P-07CB1-RESIDUAL-BACKFILL (2026-10-18) — ex-técnico só de despacho reatribuído antes do  |
| `P-07CB1-TECHNICIAN-SEM-FIELD-DISPATCH-UPDATE` | 11320 | BAIXA | sim | P-07CB1-TECHNICIAN-SEM-FIELD-DISPATCH-UPDATE (2026-10-18) — o `technician` despachado nã |
| `P-07CB1-UPLOAD-EVIDENCE-TENANT-MISMATCH-403` | 11328 | BAIXA | sim | P-07CB1-UPLOAD-EVIDENCE-TENANT-MISMATCH-403 (2026-10-18) — upload com `evidence_id` de o |
| `P-07CB1-USAR-DO-SERVIDOR-SEM-ESTADO` | 11336 | BAIXA | sim | P-07CB1-USAR-DO-SERVIDOR-SEM-ESTADO (2026-10-18) — "usar a do servidor" marca a ação loc |
| `P-07CB1-EVIDENCIA-FIELD-OS-ALHEIA-ECOADA` | 11343 | BAIXA | sim | P-07CB1-EVIDENCIA-FIELD-OS-ALHEIA-ECOADA (2026-10-18) — evidência `field_*` aceita `work |
| `P-07CB1-IDEMP-VISTORIA-SEM-ATOR` | 11351 | BAIXA | sim | P-07CB1-IDEMP-VISTORIA-SEM-ATOR (2026-10-18) — a idempotência durável da vistoria por `c |
| `P-07CB1-APP-SEM-MILEAGE-NA-FILA` | 11358 | BAIXA | sim | P-07CB1-APP-SEM-MILEAGE-NA-FILA (2026-10-18) — o app não emite `work_order.mileage` pela |
| `P-DASH-PERFIL-SUPER-ADMIN-ATALHO-UI` | 11382 | BAIXA | sim | P-DASH-PERFIL-SUPER-ADMIN-ATALHO-UI (2026-10-19) — o rótulo "Super Admin" (da sessão ou  |
| `P-FRONT-DOM-MINIMO-TRIPLICADO` | 11401 | BAIXA | sim | P-FRONT-DOM-MINIMO-TRIPLICADO (2026-10-19) — o DOM mínimo de teste do frontend existe em |
| `P-SAN3-02-OS-NAO-TRAVADA` | 11423 | BAIXA | sim | P-SAN3-02-OS-NAO-TRAVADA (2026-10-19) — cancelar a OS durante um faturamento em voo cont |
| `P-SAN3-02-DOWN-COM-COMPLEMENTAR` | 11444 | BAIXA | sim | P-SAN3-02-DOWN-COM-COMPLEMENTAR (2026-10-19) — o down da 20260878 para na ponta B se hou |
| `P-KPI-REGRA-PR-FERRAMENTA` | 11471 | BAIXA | sim | P-KPI-REGRA-PR-FERRAMENTA (2026-10-20) — não há regra escrita sobre PR de ferramenta con |
| `P-TRC02-COMMANDRESULT-IGNORADO` | 11515 | BAIXA | sim | P-TRC02-COMMANDRESULT-IGNORADO (2026-10-20) — `commandResult` e `queuedCommandSent` igno |
| `P-TRC02-STATUS-TIMEOUT-PROD` | 11522 | BAIXA | sim | P-TRC02-STATUS-TIMEOUT-PROD (2026-10-20) — `status.timeout` e `event.status.enable` de p |
| `P-TRC02-DEFICIT-2N` | 11529 | BAIXA | sim | P-TRC02-DEFICIT-2N (2026-10-20) — testes novos abaixo de 2N — BAIXA |
| `P-07C-CENSO-TITULO-T9` | 11543 | BAIXA | sim | P-07C-CENSO-TITULO-T9 (2026-10-20) — o título do T9 do censo congela "os 3 de hoje" em p |
| `P-SAN3-05-LITERAL-DML` | 11557 | BAIXA | sim | P-SAN3-05-LITERAL-DML (2026-10-20) — o inventário de DML do papel de runtime é um número |
| `P-TRC01-IDEMPOTENCIA-CONCORRENTE-503` | 11564 | BAIXA | sim | P-TRC01-IDEMPOTENCIA-CONCORRENTE-503 (2026-10-20) — duas entregas idênticas concorrentes |
| `P-TRC-BATERIA-RATCHET-T13` | 11586 | BAIXA | sim | P-TRC-BATERIA-RATCHET-T13 (2026-10-20) — a bateria dos blocos do Traccar não nomeia a gu |
| `P-TRC02-PORTAS-DE-LEITURA-SEM-CHAMADOR` | 11593 | BAIXA | sim | P-TRC02-PORTAS-DE-LEITURA-SEM-CHAMADOR (2026-10-20) — três portas de leitura da telemetr |
| `P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA` | 11600 | BAIXA | sim | P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA (2026-10-20) — migrações anteriores à 202 |

## ABERTAS · balde C — DIFERIDO-LEVE (lista nominal, vetavel) — 65

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
| `P-028` | 313 | — | sim | P-028 - Divida sistemica de acentuacao em strings de UI antigas (2026-07-09) |
| `P-026` | 328 | MÉDIA | sim | P-026 - F11: front `UserRole` nao cobre os 9 papeis canonicos (menu visual aproxima) (20 |
| `P-027` | 343 | MÉDIA | sim | P-027 - F11: divergencias matriz x catalog + perms `purchase_orders:read`/`reports:read` |
| `P-030` | 375 | BAIXA | **a atribuir** | P-030 - Ω2-a.2: residuais BAIXA do gate (comentario 422 enganoso; mapeamento P2003 espec |
| `P-032` | 399 | — | sim | P-032 (Ω2-e) — item de menu Configurações ainda gateado por tenant.manage |
| `P-Ω3a` | 416 | MÉDIA | sim | P-Ω3a (Ω3-a ServiceQuote) — pendências declaradas |
| `P-037` | 471 | BAIXA | sim | P-037 (Ω3-c, BAIXA — validador) — assimetria memory×prisma em freezeChecklistSnapshot |
| `P-Ω3d` | 481 | — | sim | P-Ω3d (Ω3-d Anexos de OS) — coverage/cosmético (junta APROVOU; não-veto) |
| `P-SAN-PROD-WEBIMG` | 659 | — | **a atribuir** | P-SAN-PROD-WEBIMG - Rollback do frontend sem imagem GHCR (Ω-INFRA-3, 2026-07-14) |
| `P-SAN-INFRA1-NITS` | 669 | — | **a atribuir** | P-SAN-INFRA1-NITS - Nits não-bloqueantes do Ω-INFRA-1 (J-SAN-4, 2026-07-13) |
| `P-Ω3F2B-ACENTOS` | 691 | — | sim | P-Ω3F2B-ACENTOS - Varredura de acentuação no WorkOrderForm + validador (J-OMEGA3F-2B, 20 |
| `P-Ω3F4B-SHARE-TOKEN-UNIQUE` | 739 | BAIXA | **a atribuir** | P-Ω3F4B-SHARE-TOKEN-UNIQUE - share_token sem unicidade/índice; endpoint público adiado ( |
| `P-Ω3F4B-APPROVE-CRASH` | 751 | — | **a atribuir** | P-Ω3F4B-APPROVE-CRASH - Crash duro entre reserva e carimbo do approve (J-OMEGA3F-4B cicl |
| `P-Ω3F4C-ACTIVATION-PROMPT` | 764 | MÉDIA | sim | P-Ω3F4C-ACTIVATION-PROMPT - Aprovar dispara sem diálogo de modo de acionamento/origem-de |
| `P-Ω3F5-DOC-TYPE` | 778 | — | **a atribuir** | P-Ω3F5-DOC-TYPE - Categoria de documento no upload manual de anexo (Ω3F-5, 2026-07-15) |
| `P-Ω3F5A-TAG-TOCTOU` | 789 | — | **a atribuir** | P-Ω3F5A-TAG-TOCTOU - Comentário pode persistir com uma tag a menos sob delete concorrent |
| `P-Ω3F6B-MENUITEM-INLINE` | 887 | — | **a atribuir** | P-Ω3F6B-MENUITEM-INLINE - `.ui-menu-item` com background inline mata o hover (J-OMEGA3F- |
| `P-Ω3F6B-DS-NITS` | 901 | — | **a atribuir** | P-Ω3F6B-DS-NITS - Nits de DS/A11y apontados na J-OMEGA3F-6B (2026-07-17) |
| `P-Ω3F-9-SLA-FIELD` | 964 | — | sim | P-Ω3F-9-SLA-FIELD — Campo de prazo/SLA real na OS (aberta, Ω3F-9) |
| `P-Ω3F-9-DISPATCH-DTO` | 973 | — | sim | P-Ω3F-9-DISPATCH-DTO — Expor "envio ativo" no DTO da lista de OS (aberta, Ω3F-9) |
| `P-Ω4-2A-NITS` | 983 | BAIXA | sim | P-Ω4-2A-NITS — Observações da junta do Ω4-2a (2026-07-17) |
| `P-Ω4-ACCOUNT-ACTIVE` | 1012 | BAIXA | sim | P-Ω4-ACCOUNT-ACTIVE — Título pode referenciar conta financeira INATIVA (BAIXA — decidir  |
| `P-Ω4-2A-COBERTURA` | 1020 | BAIXA | sim | P-Ω4-2A-COBERTURA — Nits menores do Ω4-2a (BAIXA) |
| `P-Ω4-2B-A11Y` | 1050 | BAIXA | sim | P-Ω4-2B-A11Y — Menu ⋮ e modais sem dismiss por Escape/clique-fora + focus-trap (BAIXA) |
| `P-Ω4-3-TEST-HERMETIC` | 1073 | BAIXA | sim | P-Ω4-3-TEST-HERMETIC — createMemoryWorkOrderInvoicingService não é puramente memory (BAI |
| `P-Ω4-6-REOPEN-FOUR-EYES` | 1226 | BAIXA | sim | P-Ω4-6-REOPEN-FOUR-EYES — reopen sem segundo ator (risco residual conhecido, BAIXA) |
| `P-Ω4-5-CATEGORY-CASE` | 1292 | BAIXA | sim | P-Ω4-5-CATEGORY-CASE — Filtro ?category= é case-sensitive (BAIXA, pré-existente Ω4-4) |
| `P-Ω4-OVERDUE-TZ` | 1312 | BAIXA | sim | P-Ω4-OVERDUE-TZ — isTitleOverdue + parseDueDate no fuso de negócio (BAIXA, sintoma-irmão |
| `P-Ω4-6-FRONT-RESOLVE-NAME` | 1322 | BAIXA | sim | P-Ω4-6-FRONT-RESOLVE-NAME — /financial-periods expõe closedBy/reopenedBy UUID (BAIXA, pa |
| `P-Ω4-6-NITS` | 1330 | BAIXA | sim | P-Ω4-6-NITS — Nits da pós-análise do Ω4-6 (BAIXA) |
| `P-Ω4-8-SUMMARY-SCALE` | 1412 | BAIXA | sim | P-Ω4-8-SUMMARY-SCALE — /financial-summary faz full-scan das linhas (BAIXA) |
| `P-Ω4-8-DASHBOARD-FIDELITY` | 1421 | MÉDIA | sim | P-Ω4-8-DASHBOARD-FIDELITY — Reduções de composição do dashboard vs financeiro.png (BAIXA |
| `P-UI-REFRESH-LIVENESS` | 1509 | — | **a atribuir** | P-UI-REFRESH-LIVENESS — indicador sutil de auto-atualização nas telas (WS-UI-REFRESH, 20 |
| `P-UI-REFRESH-ERROR-COPY` | 1522 | — | **a atribuir** | P-UI-REFRESH-ERROR-COPY — cópia de erro referencia refresh manual que não existe mais (W |
| `P-RBAC-GATING-MOCKSHELLS` | 1534 | MÉDIA | sim | P-RBAC-GATING-MOCKSHELLS — gating RBAC das 3 telas-casca fica com a ligação a dados (WS- |
| `P-CHECKLIST-RUNS-STATUS-COPY` | 1573 | — | **a atribuir** | P-CHECKLIST-RUNS-STATUS-COPY — status técnico cru na cópia da tela de execuções (2026-07 |
| `P-FINANCE-HEADER-ACTIONS` | 1584 | BAIXA | **a atribuir** | P-FINANCE-HEADER-ACTIONS — page header do Financeiro sem ações à direita (§11 #4, pré-ex |
| `P-JMAPAS7-PERF-SCALE` | 1622 | — | **a atribuir** | P-JMAPAS7-PERF-SCALE — otimização de agregação (groupBy SQL vs full-scan) no technician- |
| `P-WOTS-SCALE` | 1633 | — | **a atribuir** | P-WOTS-SCALE — otimização de agregação (full-scan) no work-order-timeseries (2026-07-19) |
| `P-PLATFORM-HEALTH-OBSERVABILITY` | 1698 | — | **a atribuir** | P-PLATFORM-HEALTH-OBSERVABILITY - Saude da Plataforma = parada honesta ate observabilida |
| `P-PURCHASE-ORDERS-BACKEND-GATE` | 1726 | MÉDIA | sim | P-PURCHASE-ORDERS-BACKEND-GATE - Gate server-side de Pedidos/Relatórios pendente (2026-0 |
| `P-DS-TABS-ARIA` | 1872 | BAIXA | sim | P-DS-TABS-ARIA — Padrão WAI-ARIA de abas incompleto no `Tabs` do design system (BAIXA) |
| `P-PATIOS-HEX-TOKENS` | 1885 | BAIXA | sim | P-PATIOS-HEX-TOKENS — Hex inline no módulo pátios contra J-002 (BAIXA) |
| `P-CHK-RUN-DTO-NARROW` | 1897 | BAIXA | sim | P-CHK-RUN-DTO-NARROW — Estreitar o resumo de ChecklistRun removendo UUIDs não-usados (BA |
| `P-CHK-RUN-ASSIGNEE-SCOPE` | 1910 | BAIXA | sim | P-CHK-RUN-ASSIGNEE-SCOPE — `listChecklistRunsForProcess` não escopa por assignee (BAIXA, |
| `P-CHK-CATALOG-EXHAUSTIVE` | 1981 | BAIXA | sim | P-CHK-CATALOG-EXHAUSTIVE (2026-08-03) — Catálogo de componentes é array, não Record (tsc |
| `P-WO-LIST-TECH-NAME` | 1992 | BAIXA | sim | P-WO-LIST-TECH-NAME (2026-08-04) — DTO da lista de OS sem o nome do técnico atribuído (B |
| `P-USERS-LAST-ACCESS` | 2001 | BAIXA | sim | P-USERS-LAST-ACCESS (2026-08-04) — DTO de usuários sem "último acesso" (BAIXA, UX) |
| `P-AUD-ACTOR-NAME` | 2009 | BAIXA | sim | P-AUD-ACTOR-NAME (2026-08-04) — DTO de auditoria sem nome/perfil do ator (BAIXA, UX) |
| `P-CHK-SEED-DEMO-SUJO` | 2221 | MÉDIA | sim | P-CHK-SEED-DEMO-SUJO (2026-08-08) — dados de demonstração com nomes técnicos e lixo de t |
| `P-CHK-PREVIEW-DOCK-LIMIAR` | 2240 | BAIXA | **a atribuir** | P-CHK-PREVIEW-DOCK-LIMIAR (2026-08-08) — limiar de 1600px é constante, não medição do co |
| `P-RBAC-PROVISION-DESCRICOES` | 2306 | BAIXA | **a atribuir** | P-RBAC-PROVISION-DESCRICOES (2026-08-08) — descrição curada das permissões duplicada no  |
| `P-CHK-CREATE-RAZAO-NAO-NORMALIZADA` | 3472 | — | **a atribuir** | P-CHK-CREATE-RAZAO-NAO-NORMALIZADA (2026-08-14 — ciclo 4 da revisão do CHK P1 PR-04c-A) |
| `P-O6R-B05-REDIS-HOST-DNS-DIFERIDO` | 3668 | — | **a atribuir** | P-O6R-B05-REDIS-HOST-DNS-DIFERIDO (2026-08-15 — bloco B-O6R-05) |
| `P-REDIS-DEV-LIXO-DE-FILA` | 3712 | — | **a atribuir** | P-REDIS-DEV-LIXO-DE-FILA (2026-08-15 — achado lateral da junta do PR #353) |

## FECHADAS — 152

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
| `P-029` | 361 | MÉDIA | **a atribuir** | P-029 - Ω2-a.2: modal de edicao de Tarifa mantem selects de referencia habilitados, mas  |
| `P-031` | 392 | — | **a atribuir** | P-031 - Higiene: diretorios untracked .claude/skills/* fora do escopo das PRs (2026-07-1 |
| `P-Ω3b` | 435 | MÉDIA | sim | P-Ω3b (Ω3-b Despacho endurecido + Comentário/Timeline da OS) — validador-mestre |
| `P-036` | 456 | ALTA | sim | P-036 (PRÉ-EXISTENTE — descoberto no smoke do Ω3-c) — create de checklist quebrado no li |
| `P-SAN-CORE-PRISMA-COV` | 524 | — | **a atribuir** | P-SAN-CORE-PRISMA-COV - Adapter prisma do Core SaaS não é exercido pelo gate (Ω-GATE, 20 |
| `P-SAN-KRYOS` | 545 | — | **a atribuir** | P-SAN-KRYOS - Descontaminação Kryos (Ω-DOCS, 2026-07-13) — RESOLVIDA |
| `P-SAN-CORS` | 553 | — | **a atribuir** | P-SAN-CORS - CORS bare (`app.use(cors())` = `*`) e CORS_ORIGIN é config morta (Ω-INFRA-1 |
| `P-SAN-SEED-GUARD` | 567 | MÉDIA | **a atribuir** | P-SAN-SEED-GUARD - Seed demo sem guarda de runtime contra produção (J-SAN-5, 2026-07-14) |
| `P-SAN-PROD-BOOTSTRAP` | 576 | MÉDIA | sim | P-SAN-PROD-BOOTSTRAP - Bootstrap idempotente do 1o platform_admin real (Ω-INFRA-3, 2026- |
| `P-Ω3F1-ENTITYTYPE` | 681 | — | **a atribuir** | P-Ω3F1-ENTITYTYPE - Enum técnico cru na linha "Entidade" da aprovação (J-OMEGA3F-1, 2026 |
| `P-Ω3F3A-MOEDA-AGREGADO` | 704 | MÉDIA | **a atribuir** | P-Ω3F3A-MOEDA-AGREGADO - Total agregado somava moedas heterogêneas (J-OMEGA3F-3A, 2026-0 |
| `P-Ω3F6-COMISSAO` | 802 | MÉDIA | **a atribuir** | P-Ω3F6-COMISSAO - `keep_unpaid` grava a decisão mas não suprime a comissão (Ω3F-6, 2026- |
| `P-Ω3F6-STATUS-BYPASS` | 853 | — | **a atribuir** | P-Ω3F6-STATUS-BYPASS - Cancelamento legado por PATCH /status não grava decisão financeir |
| `P-Ω3F6-TERMINAL-GUARD` | 878 | — | **a atribuir** | P-Ω3F6-TERMINAL-GUARD - Itens financeiros podem ser lançados em OS cancelada (J-OMEGA3F- |
| `P-Ω3F6-ZERO-ATOMICIDADE` | 916 | — | **a atribuir** | P-Ω3F6-ZERO-ATOMICIDADE - `zero` do cancel: N deletes sequenciais sem transação (+ N+1)  |
| `P-Ω3F6B-MENU-GATE-SEM-TESTE` | 928 | — | **a atribuir** | P-Ω3F6B-MENU-GATE-SEM-TESTE - Gate do menu ⋮ não é coberto (provado por mutação) (pós-an |
| `P-Ω4-COMPETENCIA-TZ` | 997 | BAIXA | sim | P-Ω4-COMPETENCIA-TZ — RESOLVIDO (fix-omega4-competencia-tz, pré-Ω4-6) |
| `P-Ω4-FINANCE-READ-ORFA` | 1029 | ALTA | sim | P-Ω4-FINANCE-READ-ORFA — /finance (dashboard) ainda gated pela órfã finance:read (BAIXA, |
| `P-Ω4-3-REFATURAR-DELTA` | 1058 | MÉDIA | sim | P-Ω4-3-REFATURAR-DELTA — Faturar o delta de itens adicionados após o 1º faturamento (BAI |
| `P-Ω4-3-INVOICE-ATOMIC` | 1082 | MÉDIA | sim | P-Ω4-3-INVOICE-ATOMIC — Título↔carimbo não-atômico (BAIXA) |
| `P-Ω4-3-INVOICE-TOCTOU-DELETE` | 1104 | MÉDIA | sim | P-Ω4-3-INVOICE-TOCTOU-DELETE — DELETE de item durante o faturamento infla o título (BAIX |
| `P-Ω4-4-READINESS` | 1123 | — | sim | P-Ω4-4-READINESS — O que o Ω4-4 (Caixa/liquidação) precisa construir (GUIA, não bug) |
| `P-Ω4-4-LIQUID-ATOMIC` | 1159 | MÉDIA | sim | P-Ω4-4-LIQUID-ATOMIC — Liquidação lançamento↔título não-atômica (MÉDIA) |
| `P-Ω4-4-REVERSE-MUTABLE` | 1172 | — | sim | P-Ω4-4-REVERSE-MUTABLE — reverse() não chama assertMutable — ✅ RESOLVIDO no Ω4-5 |
| `P-Ω4-4-REVERSE-IDEM` | 1183 | MÉDIA | sim | P-Ω4-4-REVERSE-IDEM — Idempotência do estorno é app-level sem rede no banco (MÉDIA) |
| `P-Ω4-4-CHOKEPOINT-CLOSING` | 1193 | — | sim | P-Ω4-4-CHOKEPOINT-CLOSING — chokepoint só bloqueia 'closed', não 'closing' — ✅ RESOLVIDO |
| `P-Ω4-6-CLOSE-RACE` | 1206 | MÉDIA | sim | P-Ω4-6-CLOSE-RACE — read-skew entre a leitura do snapshot e o commit do 'closed' (MÉDIA, |
| `P-Ω4-5-DIVERGENCE` | 1235 | — | sim | P-Ω4-5-DIVERGENCE — Ω4-5 Conciliação (divergence_type + write-path de reconcile) — ✅ RES |
| `P-Ω4-6-READINESS` | 1275 | — | sim | P-Ω4-6-READINESS — O que o Ω4-6 (Fechamento) precisa construir + a exceção reconcile (GU |
| `P-Ω4-COMPETENCIA-TZ` | 1300 | ALTA | sim | P-Ω4-COMPETENCIA-TZ — STATUS: RESOLVIDO (2026-07-18) |
| `P-Ω4-8-READINESS` | 1340 | — | sim | P-Ω4-8-READINESS — Guia do Dashboard financeiro real (Ω4-8) |
| `P-Ω4-7-READINESS` | 1353 | — | sim | P-Ω4-7-READINESS — Guia do Cheque (Ω4-7) |
| `P-Ω4-7-CLEAR-ATOMIC` | 1363 | MÉDIA | sim | P-Ω4-7-CLEAR-ATOMIC — Resíduo de atomicidade do clear/bounce do cheque (BAIXA — espelha  |
| `P-Ω4-7-ENTRY-OWNERSHIP` | 1375 | BAIXA | sim | P-Ω4-7-ENTRY-OWNERSHIP — Lançamento de cheque manipulável direto por /financial-entries  |
| `P-Ω4-7-CLEAR-RETRO` | 1398 | BAIXA | sim | P-Ω4-7-CLEAR-RETRO — Compensação retroativa a período fechado (BAIXA) |
| `P-GOLIVE-SECRET-ROTATE` | 1465 | CRÍTICA | sim | P-GOLIVE-SECRET-ROTATE — ~~Chave Google Maps: rotação humana obrigatória~~ — **FECHADA ( |
| `P-RBAC-CATALOG-MATRIZ` | 1551 | — | **a atribuir** | P-RBAC-CATALOG-MATRIZ — divergências pré-existentes catalog.ts × RBAC_MATRIX.md em check |
| `P-CHECKLIST-BUILDER-READONLY` | 1562 | — | **a atribuir** | P-CHECKLIST-BUILDER-READONLY — builder interativo no modo "Visualizar" para papel só-lei |
| `P-MAPA-GOOGLE-PADDING-RESIZE` | 1597 | — | **a atribuir** | P-MAPA-GOOGLE-PADDING-RESIZE — GoogleMapsCanvas não re-enquadra ao expandir rail (WS-MAP |
| `P-MAPA-TERM-OPERADORES` | 1609 | — | **a atribuir** | P-MAPA-TERM-OPERADORES — terminologia residual "operadores" no subtítulo/aria dos canvas |
| `P-WOTS-FRONT-ACCESS` | 1643 | — | **a atribuir** | P-WOTS-FRONT-ACCESS — gráfico temporal deve tratar 403 (papel sem work_orders:read) no D |
| `P-PLATFORM-MOCK-WIRING` | 1650 | — | **a atribuir** | P-PLATFORM-MOCK-WIRING - Telas de Plataforma 100% mock hardcoded (2026-07-20, WS-CARDS-C |
| `P-SCALE-RBAC-OWNER-APPROVAL` | 1665 | — | **a atribuir** | P-SCALE-RBAC-OWNER-APPROVAL - Expansao de RBAC (purchase_orders/reports) requer o dono N |
| `P-PLATFORM-TENANTDETAIL-REAL` | 1713 | — | **a atribuir** | P-PLATFORM-TENANTDETAIL-REAL - Detalhe da Organizacao (plataforma) ainda mock (2026-07-2 |
| `P-NAV-MENU-PLATFORM` | 1763 | — | **a atribuir** | P-NAV-MENU-PLATFORM — menu `scope=platform` falhava sob JWT/Prisma (2026-07-28) |
| `P-RBAC-CHECKLIST-DRIFT` | 1796 | — | sim | P-RBAC-CHECKLIST-DRIFT (2026-08-01) — reconciliação residual da matriz de checklist (fol |
| `P-CHK-TEMPLATE-PRISMA-V7` | 1834 | — | sim | P-CHK-TEMPLATE-PRISMA-V7 (2026-08-01) — createTemplate falha no runtime do Prisma v7 (bu |
| `P-DOSSIE-PAGE-TABS` | 1923 | BAIXA | sim | P-DOSSIE-PAGE-TABS — Página fallback /patios/processos/:id não reflete as abas Checklist |
| `P-CHK-RENDER-ENVELOPE` | 1945 | ALTA | sim | P-CHK-RENDER-ENVELOPE (2026-08-03) — O run screen mobile renderiza dos SEEDS, não do bac |
| `P-SUITE-ENV-PERSISTENCE` | 2019 | MÉDIA | **a atribuir** | P-SUITE-ENV-PERSISTENCE (2026-08-05) — suíte backend depende de `CORE_SAAS_PERSISTENCE=m |
| `P-CHK-COMPONENT-TYPE-CHECK` | 2082 | ALTA | **a atribuir** | P-CHK-COMPONENT-TYPE-CHECK (2026-08-08) — CHECK do banco recusava os 3 tipos do PR-01 —  |
| `P-CHK-PATCH-SEM-TYPE` | 2113 | ALTA | **a atribuir** | P-CHK-PATCH-SEM-TYPE (2026-08-06) — o PATCH de modelo de checklist não carrega `type` (M |
| `P-CHK-INATIVAR-COM-RUN-ATIVA` | 2181 | MÉDIA | **a atribuir** | P-CHK-INATIVAR-COM-RUN-ATIVA (2026-08-08) — inativar um modelo derruba quem já está no c |
| `P-RBAC-CATALOGO-NAO-CHEGA-AO-BANCO` | 2252 | ALTA | **a atribuir** | P-RBAC-CATALOGO-NAO-CHEGA-AO-BANCO (2026-08-08) — permissão declarada em código nasce MO |
| `P-RBAC-PROVISIONAMENTO-CONVERGENTE` | 2284 | ALTA | **a atribuir** | P-RBAC-PROVISIONAMENTO-CONVERGENTE (2026-08-08) — migração de dados de RBAC era no-op SI |
| `P-CHK-DOSSIE-VERSAO-NA-UI` | 2320 | — | sim | P-CHK-DOSSIE-VERSAO-NA-UI (2026-08-10 — junta do CHK P1 PR-03, 2ª rodada) |
| `P-CHK-FLUTTER-KIND-COLAPSA` | 2343 | MÉDIA | sim | P-CHK-FLUTTER-KIND-COLAPSA (2026-08-10 — junta do CHK P1 PR-04, voto vencido do `coorden |
| `P-CHK-CUSTODIA-AUTOLINK-SEM-FILTRO` | 2375 | — | **a atribuir** | P-CHK-CUSTODIA-AUTOLINK-SEM-FILTRO (2026-08-10 — junta do CHK P1 PR-04, achado A3 do `cr |
| `P-WORKTREE-INTEROP-ORFAO` | 2434 | — | sim | P-WORKTREE-INTEROP-ORFAO (2026-08-12) — **RESOLVIDA no mesmo dia: DESCARTADA por decisão |
| `P-WORKTREE-INTEROP-ORFAO` | 2459 | — | **a atribuir** | P-WORKTREE-INTEROP-ORFAO — registro original (achado do `porteiro-pos-merge` no gate do  |
| `P-O6R-B01` | 2558 | — | **a atribuir** | P-O6R-B01 (2026-08-14) — `fix/identity-authority` — Ω6R-SEC-001 + Ω6R-TEN-001 (2 P0) — * |
| `P-O6R-B02` | 2744 | BAIXA | sim | P-O6R-B02 (2026-08-14) — `fix/financial-uow` — Ω6R-DIN-001..004, DIN-008 (5 P0) + QUA-00 |
| `P-O6R-B05` | 3020 | — | **a atribuir** | P-O6R-B05 (2026-08-14) — `fix/production-runtime-gates` — Ω6R-DAT-001 + Ω6R-DIN-006 (2 P |
| `P-O6R-B06` | 3060 | — | **a atribuir** | P-O6R-B06 (2026-08-14) — `fix/billing-durability` — Ω6R-DIN-005 + Ω6R-DIN-007 (2 P0) — * |
| `P-O6R-B07A-PROVISIONAMENTO-DA-CHAVE` | 3204 | ALTA | **a atribuir** | P-O6R-B07A-PROVISIONAMENTO-DA-CHAVE (2026-09-02) — `work_orders:approve` exige migração  |
| `P-O6R-B07A-STICKY-409-VIRA-403` | 3248 | ALTA | **a atribuir** | P-O6R-B07A-STICKY-409-VIRA-403 (2026-09-02) — o escopo por objeto muda o código de um te |
| `P-NPM-TEST-VERDE-VAZIO-NO-WINDOWS` | 3487 | — | **a atribuir** | P-NPM-TEST-VERDE-VAZIO-NO-WINDOWS (2026-08-15 — porteiro pós-merge do #352) |
| `P-O6R-B05-STAGING-SCALE-ZERO` | 3575 | — | **a atribuir** | P-O6R-B05-STAGING-SCALE-ZERO (2026-08-15 — bloco B-O6R-05, questão Q5) |
| `P-SUITE-NAO-SUPORTA-ENV-PRISMA` | 3605 | — | **a atribuir** | P-SUITE-NAO-SUPORTA-ENV-PRISMA (2026-08-15 — bloco B-O6R-05, revelado ao consertar o `np |
| `P-O6R-B01-ANONIMO-SEM-LOCKOUT` | 3829 | ALTA | sim | P-O6R-B01-ANONIMO-SEM-LOCKOUT (2026-08-19) — **ALTA** · o caminho anônimo não arma o loc |
| `P-ARNES-DIVERGENCIA-RUNNER-SUMICO-NAO-EXISTE-NA-MAIN` | 4121 | MÉDIA | sim | P-ARNES-DIVERGENCIA-RUNNER-SUMICO-NAO-EXISTE-NA-MAIN (2026-08-28) — divergência do plano |
| `P-ARNES-DIVERGENCIA-KPI-APP-JS-FORA-DA-` | 4154 | — | sim | P-ARNES-DIVERGENCIA-KPI-APP-JS-FORA-DA-§5 (2026-08-28) — divergência do plano, registrad |
| `P-ARNES-AUTO-DEFEITOS-DO-PROPRIO-BLOCO` | 4169 | — | sim | P-ARNES-AUTO-DEFEITOS-DO-PROPRIO-BLOCO (2026-08-28) — DOIS achados por execução CONTRA a |
| `P-O6R-B02` | 4210 | — | sim | P-O6R-B02 — CICLO 4 REPROVADO 4×1 (2026-08-28) — a classe que reprova é de ARNÊS, não de |
| `P-O6R-B02-OVERCLAIM-ORFA-SQL-CRU` | 4230 | MÉDIA | sim | P-O6R-B02-OVERCLAIM-ORFA-SQL-CRU (2026-08-28 — cadeira de ataque, ajuste A1) — MÉDIA |
| `P-O6R-B02-TESTE-RLS-SUPERUSER` | 4249 | MÉDIA | sim | P-O6R-B02-TESTE-RLS-SUPERUSER (2026-08-28 — cadeira de banco, ajuste A2) — MÉDIA |
| `P-O6R-B02-DIVERGENCIA-D27-D21` | 4264 | BAIXA | sim | P-O6R-B02-DIVERGENCIA-D27-D21 (2026-08-28 — cadeira de validação, ajuste A3) — BAIXA (re |
| `P-O6R-B02-BATERIA-CANONICAS-1-2` | 4275 | MÉDIA | sim | P-O6R-B02-BATERIA-CANONICAS-1-2 (2026-08-28 — validação, ajuste A4) — MÉDIA |
| `P-O6R-B02-SUITES-LIST-CI` | 4294 | MÉDIA | sim | P-O6R-B02-SUITES-LIST-CI (2026-08-28 — validação A5 + arnês #6) — MÉDIA |
| `P-O6R-B02-REGISTRO-STATUS-LOG` | 4421 | BAIXA | sim | P-O6R-B02-REGISTRO-STATUS-LOG (2026-08-28 — validação A5) — BAIXA |
| `P-O6R-B02-CENSO-CASO-PERMANENTE` | 4434 | BAIXA | sim | P-O6R-B02-CENSO-CASO-PERMANENTE (2026-08-28 — validação A6) — BAIXA |
| `P-O6R-B02-S0-ESPELHO-NO-HEAD` | 4448 | ALTA | sim | P-O6R-B02-S0-ESPELHO-NO-HEAD (2026-08-28 — validação A7) — **FECHADA POR NÃO-REPRODUÇÃO  |
| `P-O6R-B02-RUNNER-SUMICO-SEM-SKIP` | 4464 | MÉDIA | **a atribuir** | P-O6R-B02-RUNNER-SUMICO-SEM-SKIP (2026-08-28 — arnês #4 / D26b) — MÉDIA (mesma classe do |
| `P-ARNES-AUTHORITY-PORTAL-INTERMITENTE` | 4638 | MÉDIA | sim | P-ARNES-AUTHORITY-PORTAL-INTERMITENTE (2026-08-28) — MÉDIA · **Dono: a atribuir por exec |
| `P-ARNES-REGISTROS-DEFASADOS-NA-MAIN` | 4696 | BAIXA | sim | P-ARNES-REGISTROS-DEFASADOS-NA-MAIN (2026-08-28) — BAIXA · **FECHADA (2026-08-29, este P |
| `P-ARNES-BACKFILL-359` | 4721 | MÉDIA | **a atribuir** | P-ARNES-BACKFILL-359 (2026-08-28) — MÉDIA · **FECHADA (2026-08-28, este PR)** |
| `P-REG-S0-GUARD-FALSO-VERMELHO` | 4792 | MÉDIA | sim | P-REG-S0-GUARD-FALSO-VERMELHO (2026-08-29) — MÉDIA · **Dono:** próximo bloco que puder t |
| `P-REG-BATERIA-BARATA-DUAS-LISTAS` | 4864 | MÉDIA | sim | P-REG-BATERIA-BARATA-DUAS-LISTAS (2026-08-29) — MÉDIA · **Dono:** `B-O6R-02` ciclo 5 (é  |
| `P-GOV-MAIN-SEM-PROTECAO` | 4952 | ALTA | sim | P-GOV-MAIN-SEM-PROTECAO — a `main` não tem proteção nenhuma (2026-08-24) |
| `P-C7-BIS-TER-FORA-DA-MAIN` | 5042 | MÉDIA | sim | P-C7-BIS-TER-FORA-DA-MAIN (2026-08-30) — MÉDIA · **FECHADA no mesmo PR que a abriu** |
| `P-SAN2-2-PORTA-55432-RESERVADA` | 5119 | BAIXA | sim | P-SAN2-2-PORTA-55432-RESERVADA (2026-08-30) — armadilha de terreno, não defeito de produ |
| `P-SYNC-AGENTS-NAO-RECURSIVO` | 5805 | MÉDIA | sim | P-SYNC-AGENTS-NAO-RECURSIVO (2026-08-31 — medido pelo dev do `SAN2-5`, entrega E2d) — MÉ |
| `P-O6R-B07A-REGISTRO-A2-DIVIDA-368` | 6667 | — | **a atribuir** | P-O6R-B07A-REGISTRO-A2-DIVIDA-368 (2026-09-02) — reatribuição da dívida de backfill do # |
| `P-O6R-SUBRECURSO-OBJECT-SCOPE` | 6718 | ALTA | sim | P-O6R-SUBRECURSO-OBJECT-SCOPE (registro 2/7, 2026-09-03) — 10 vias mutantes sobre OS ALH |
| `P-GOV-D-DURABILIDADE-FORA-DA-MAIN` | 7111 | MÉDIA | sim | P-GOV-D-DURABILIDADE-FORA-DA-MAIN (2026-09-05) — MÉDIA · a decisão sobre durabilidade só |
| `P-O6R-B07B-STAGING-SEM-UPLOAD` | 7177 | ALTA | sim | P-O6R-B07B-STAGING-SEM-UPLOAD (2026-09-06) — staging para de aceitar foto no dia do depl |
| `P-GOV-FILA-P1-ANTES-DE-P0` | 7355 | MÉDIA | sim | P-GOV-FILA-P1-ANTES-DE-P0 (2026-09-06) — um P1 executado com 6 P0 abertos, e a agenda da |
| `P-O6R-B06-DIVERGENCIA-ESCOPO-TESTES-DB` | 7622 | MÉDIA | sim | P-O6R-B06-DIVERGENCIA-ESCOPO-TESTES-DB (2026-09-07) — duas suítes fora da lista §6 tiver |
| `P-O6R-B06-PAPEL-DO-DRILL-VEM-DO-ARNES` | 7657 | BAIXA | sim | P-O6R-B06-PAPEL-DO-DRILL-VEM-DO-ARNES (2026-09-07) — o papel sem BYPASSRLS não se chama  |
| `P-GOV-WORKTREES-NAO-IGNORADAS` | 7730 | MÉDIA | sim | P-GOV-WORKTREES-NAO-IGNORADAS (2026-09-07) — FECHADA POR NÃO-REPRODUÇÃO em 2026-09-08 —  |
| `P-GOV-NOTA-KPI-CONGELADA` | 7935 | MÉDIA | **a atribuir** | P-GOV-NOTA-KPI-CONGELADA (2026-09-07) — nota de KPI medida num head antigo, apresentada  |
| `P-GOV-BAIXA-CICLO1-FECHADOS` | 7960 | BAIXA | **a atribuir** | P-GOV-BAIXA-CICLO1-FECHADOS (2026-09-08) — os três achados BAIXA do ciclo 1, fechados na |
| `P-GOV-INSPETOR-33-SEM-NORMA` | 8078 | ALTA | sim | P-GOV-INSPETOR-33-SEM-NORMA (2026-09-08) — o contrato do inspetor manda bloquear por nor |
| `P-WEB-CLOUD-BILLING-CARTAZ` | 8489 | MÉDIA | sim | P-WEB-CLOUD-BILLING-CARTAZ (2026-09-11) — Tela Cloud Billing é cartaz de literais com se |
| `P-WEB-PLATAFORMA-TELAS-FICCAO` | 8594 | MÉDIA | sim | P-WEB-PLATAFORMA-TELAS-FICCAO (2026-09-11) — Planos e Módulos, Auditoria Global, APIs e  |
| `P-WEB-PLATAFORMA-SEGURANCA-FABRICADA` | 8612 | ALTA | sim | P-WEB-PLATAFORMA-SEGURANCA-FABRICADA (2026-09-11) — Configurações da Plataforma mostram  |
| `P-RBAC-MATRIZ-X-CATALOGO-QUATRO-CELULAS` | 9403 | ALTA | sim | P-RBAC-MATRIZ-X-CATALOGO-QUATRO-CELULAS (2026-09-12) — quatro células de ação da matriz  |
| `P-SAN3-01-DESPACHO-DETALHE-FABRICADO` | 9434 | ALTA | sim | P-SAN3-01-DESPACHO-DETALHE-FABRICADO (2026-09-17) — o detalhe do despacho fabricava `dis |
| `P-SAN3-01-MOCKMODE-TRES-AUTORIDADES` | 9571 | MÉDIA | sim | P-SAN3-01-MOCKMODE-TRES-AUTORIDADES (2026-09-18) — três interruptores de modo mock com p |
| `P-SAN3-01-NOVA-OS-SEM-GATE-NO-BOTAO` | 9590 | BAIXA | sim | P-SAN3-01-NOVA-OS-SEM-GATE-NO-BOTAO (2026-09-18) — o botão "Nova OS" do cabeçalho da lis |
| `P-SAN3-01-OS-VAZIO-SEM-ACAO` | 9640 | BAIXA | sim | P-SAN3-01-OS-VAZIO-SEM-ACAO (2026-09-18) — a lista de OS vazia não oferecia a ação de cr |
| `P-SAN3-01B-PAGINA-NAO-AMARRADA-AO-ESTADO` | 9658 | ALTA | sim | P-SAN3-01B-PAGINA-NAO-AMARRADA-AO-ESTADO (2026-09-19) — a decisão da página não está ama |
| `P-SAN3-01B-GUARD-ALCANCE-MENOR-QUE-AS-RAIZES` | 9667 | ALTA | sim | P-SAN3-01B-GUARD-ALCANCE-MENOR-QUE-AS-RAIZES (2026-09-19) — o guard do mock não pega o p |
| `P-SAN3-01B-VIGIA-TEXTUAL-DA-FIACAO` | 9676 | MÉDIA | sim | P-SAN3-01B-VIGIA-TEXTUAL-DA-FIACAO (2026-09-19) — os vigias da fiação dos hooks são text |
| `P-SAN3-01B-CABECALHO-OS-DIVERGE-DA-REFERENCIA` | 10076 | BAIXA | sim | P-SAN3-01B-CABECALHO-OS-DIVERGE-DA-REFERENCIA (2026-10-02) — o cabeçalho da lista de OS  |
| `P-OS-FILTRAR-EXPORTAR` | 10205 | MÉDIA | sim | P-OS-FILTRAR-EXPORTAR (2026-10-08) — a lista de OS não tem Filtrar nem Exportar, que as  |
| `P-SAN3-05-T15-TETO-DE-RELOGIO` | 10408 | MÉDIA | sim | P-SAN3-05-T15-TETO-DE-RELOGIO (2026-10-09) — o T15 reprova por tempo de máquina sob carg |
| `P-O6R-B04-DIVERGENCIA-ESCOPO-TESTE-ISOLAMENTO` | 10586 | BAIXA | sim | P-O6R-B04-DIVERGENCIA-ESCOPO-TESTE-ISOLAMENTO (2026-09-18) — um teste de rota fora da li |
| `P-TRC-FORMA-QUATRO-OU-SETE` | 10697 | ALTA | sim | P-TRC-FORMA-QUATRO-OU-SETE (2026-10-10) — conflito §A2 entre a forma do Traccar na decis |
| `P-TRC-AWS-FLY-PRAZO` | 10709 | ALTA | sim | P-TRC-AWS-FLY-PRAZO (2026-10-10) — escolha AWS × Fly, que o registro pôs antes do Dia 1  |
| `P-TRC-CONVIVENCIA-APP` | 10718 | ALTA | sim | P-TRC-CONVIVENCIA-APP (2026-10-10) — app e Traccar disputam o mesmo "último ponto" do té |
| `P-TRC-ATRIBUICAO-PRODUTO` | 10729 | MÉDIA | sim | P-TRC-ATRIBUICAO-PRODUTO (2026-10-10) — o que a atribuição por despacho mostra e esconde |
| `P-O6R06-A10-LIMPEZA-FK-INTERMITENTE` | 10822 | MÉDIA | sim | P-O6R06-A10-LIMPEZA-FK-INTERMITENTE (2026-10-10) — o A10 de `o6r06-usage-atomic-db` falh |
| `P-TRC-PLANO-V22` | 10852 | MÉDIA | sim | P-TRC-PLANO-V22 (2026-10-11) — o plano do Traccar precisa da v2.2 com as decisões do don |
| `P-OWNER-PORTAL-POW-TESTE-PROBABILISTICO` | 10859 | BAIXA | sim | P-OWNER-PORTAL-POW-TESTE-PROBABILISTICO (2026-10-10) — o teste de PoW falha 1 vez em 256 |
| `P-TRC-MODELOS-RASTREADOR` | 10884 | — | **a atribuir** | P-TRC-MODELOS-RASTREADOR (2026-10-11) — os modelos de rastreador da operação (F-9) — FEC |
| `P-TRC-PORTA-WEB-8080-8082` | 10894 | — | **a atribuir** | P-TRC-PORTA-WEB-8080-8082 (2026-10-11) — divergência de porta da web do Traccar no overl |
| `P-O6R-07CA-DB-FORA-DA-LISTA-CI` | 10919 | MÉDIA | sim | P-O6R-07CA-DB-FORA-DA-LISTA-CI (2026-10-10) — a suíte `tests/o6r07c-subresource-scope-db |
| `P-O6R-B03-UUID-PATTERN-INVALIDO` | 10961 | ALTA | sim | P-O6R-B03-UUID-PATTERN-INVALIDO (2026-10-11) — a regex de UUID do módulo de despesa recu |
| `P-O6R-B03-EVENTO-DE-ITEM-VIOLA-FK` | 10967 | ALTA | sim | P-O6R-B03-EVENTO-DE-ITEM-VIOLA-FK (2026-10-11) — o evento de sync do item apontava o ITE |
| `P-O6R-B03-COMPATIBILIDADE-LEGADA` | 10972 | CRÍTICA | sim | P-O6R-B03-COMPATIBILIDADE-LEGADA (2026-10-11) — recibo gravado pela versão anterior (cha |
| `P-O6R-B03-PROVA-DE-REPLAY-POR-ATOR` | 10978 | ALTA | sim | P-O6R-B03-PROVA-DE-REPLAY-POR-ATOR (2026-10-11) — a prova de replay de um ator não pode  |
| `P-O6R-07CB-EMENDA-DECISOES` | 11083 | ALTA | sim | P-O6R-07CB-EMENDA-DECISOES (2026-10-15) — o plano do 07c-b precisa das três respostas do |
| `P-CONFLITO-INICIO-ATENDIMENTO` | 11147 | ALTA | sim | P-CONFLITO-INICIO-ATENDIMENTO (2026-10-17) — duas decisões do dono dizem onde começa o " |
| `P-TRC-DEMO-LOGIN-SEM-ORG-INERTE` | 11365 | BAIXA | sim | P-TRC-DEMO-LOGIN-SEM-ORG-INERTE (2026-10-18) — na demo do Traccar, o login sem organizaç |
| `P-CI-PSQL18-IMAGEM` | 11374 | ALTA | sim | P-CI-PSQL18-IMAGEM (2026-10-19) — `ubuntu-latest` virou ubuntu-26.04 com psql 18 e o job |
| `P-DASH-PERFIL-TROCA-CLIQUE-SEM-TESTE` | 11392 | BAIXA | sim | P-DASH-PERFIL-TROCA-CLIQUE-SEM-TESTE (2026-10-19) — a navegação depois da troca de organ |
| `P-DASH-PERFIL-STATUS-FORA-DO-LITERAL` | 11408 | BAIXA | sim | P-DASH-PERFIL-STATUS-FORA-DO-LITERAL (2026-10-20) — a linha de status da P-DASH-PERFIL-T |
| `P-TRC02-LIMITADOR-POR-ROTA` | 11478 | MÉDIA | sim | P-TRC02-LIMITADOR-POR-ROTA (2026-10-20) — evento e posição com limitador e concorrência  |
