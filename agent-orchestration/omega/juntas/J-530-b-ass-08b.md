# J-530 — junta completa do PR #530 (B-ASS-08b, ligação do canal de cobrança)

> Junta completa (dinheiro, superfície externa, banco), por unanimidade de 3, com as 3 cadeiras em PARALELO (`D-JUNTA-PARALELA-1011`, contrato pelo #531). Objeto: `6e236f4ef2d968a83517c046405a16aaa18ffb58`. Briefing: `erp-pausa-2026-10-03/revisoes/j530/BRIEFING.md`, com a revisão 2 e as ressalvas R1–R7 do inspetor.

## Terreno
O inspetor `insp-j530` (Claude Opus, corpo lido de `origin/main`) deu LIBERADO COM RESSALVA: R1–R7 aplicadas, CI 16/16 no objeto, backend 4927 testes com 0 falhas e 2 pulados, backend-postgres 503/0/0.

## Votos
- **C1, `j530-c1-api`** (Claude Opus 5.5 pela API; dinheiro e concorrência): **REPROVADO**.
  - **J530-C1-01 — GRAVE, dentro do bloco:** o `invoice_issue` é enfileirado depois e fora da transação da baixa (`reconcile.service.ts` l.209-212; `channel.runtime.ts` l.188-191). Uma falha depois do commit deixa o demonstrativo pago sem nota para sempre, em silêncio.
  - **J530-C1-02 — GRAVE, dentro do bloco:** o `invoice_cancel` do estorno total e do chargeback é enfileirado fora da transação da reversão (l.185-187 e l.168-170; `channel.runtime.ts` l.193-196). A nota autorizada fica de pé sobre uma receita estornada.
  - **J530-C1-03 — não grave, dentro do bloco:** com o provedor de nota desligado, não fica linha PENDING com `skip_reason`, e religar o provedor não emite nada. É a mesma classe.
  - **Aprovado por execução:** nenhuma cobrança nem pagamento em dobro, e a ordem de travas se sustenta.
- **C2, `j530-c2-api`** (Claude Opus 5.5 pela API; superfície e segredo): **APROVADO**. Foram 594 comparações webhook × rota inexistente, todas idênticas. Os não graves:
  - **C2-A1, dentro do bloco:** sem `trust proxy`, o bloqueio por IP vale para todos atrás do proxy;
  - **C2-A2, anterior ao bloco:** o IP bloqueado consome a cota global do provedor;
  - **C2-A3, dentro do bloco:** com o segredo indecifrável, o erro cai no handler HTML do Express;
  - **C2-A4, anterior ao bloco (#522), classe GRAVE:** sem o cliente, um corpo autenticado com referência cruzada baixa o demonstrativo de outra organização. Não há conferência entre `chargeId` e `externalChargeId`, nem entre `externalReference` e `statementId`. Só é explorável com o segredo vazado ou com erro do provedor. O bloco ligou esse caminho na produção.
- **C3, `j530-c3-cdx`** (Codex 1, gpt-5.6-sol; regressão, escopo e registro): **REPROVADO** por um único achado BAIXO.
  - **C3-02:** a migração G14 não tem `BEGIN;`/`COMMIT;`, que o briefing pedia.
  - **C3-01, anterior ao bloco:** a suíte inteira não é reproduzível no host (dependências POSIX).
  - Banco, R-PRF, escopo e registro passaram.

## Triagem (fluxo rápido 10(3)3), 11/11 02:04 SP, orquestrador
- **Conserta agora (GRAVE, dentro do bloco, uma classe):** J530-C1-01, J530-C1-02 e J530-C1-03. A propriedade a enunciar: toda intenção de nota (emitir ou cancelar) nasce na MESMA transação da baixa ou da reversão; com o provedor desligado, nasce com `skip_reason` e é retomada quando ele for religado.
- **Grave, anterior ao bloco:** C2-A4. Leitura do orquestrador, declarada (§A6): ela vai ao topo com a recomendação de entrar neste conserto, porque o bloco liga o caminho, a conferência é barata e é dinheiro entre organizações. Se o topo justificar adiar, vira pendência GRAVE que bloqueia ligar o canal, com dono no B-ASS-08c.
- **Mesma leva, simples:** C3-02 (BEGIN/COMMIT na G14) e C2-A3 (envelope JSON da casa no erro do verificador).
- **Pendência com dono no B-ASS-08c, que bloqueia ligar o canal:** C2-A1 (trust proxy por ambiente) e C2-A2 (a cota do IP bloqueado).
- **Registro:** C3-01, de ambiente do host.
- **Próximo (10(5), defeito grave):** a auditoria do topo e o plano de resolução, num planejador de topo de identidade nova (Claude Opus pela API, declarado). Depois, um conserto único pelo dev da 08b, que não achou nada, com testes vermelhos sem o conserto. Depois, a conferência de outro modelo, a CI, o merge e o porteiro. Nenhuma cadeira se refaz, salvo pelo 10(4).

## Papéis (§C7.4-bis)
- **Acharam:** `j530-c1-api`, `j530-c2-api` e `j530-c3-cdx`.
- **Planeja:** `topo-530-api`, identidade nova.
- **Desenvolve:** `dev-08b`, que não achou nem planejou.
- **Confere:** uma identidade nova de outro modelo que o dev.

## Fechamento, 11/11 06:43 SP, orquestrador
- **Topo (10(5)):** `topo-530-api` escreveu o plano v1; a crítica `crit-530-cl` deu VOLTA (CRIT530-01: nota pendente no estorno; CRIT530-02: corrida no despacho). O topo escreveu o v2, e a crítica r2 `crit-530-r2` deu APROVADO COM AJUSTES (6 ajustes viraram requisito). O C2-A4 (a baixa cruzada entre organizações) entrou no conserto.
- **Conserto único:** `dev-08b` (subagente Claude, não achou nem planejou), head `6f710cec` (9 commits sobre o equivalente rebaseado `46ab3ed5`), CI 16/16.
- **Conferência:** `conf-530-cl` (Claude Opus, identidade nova; **sem cruzamento**, declarado pelo §C7 11(2): API no limite, Codex 1 sem cota, Codex 2 ocupado). **CONFERIDO**, `refazer_cadeira: null` (os 3 desvios do dev passaram no crivo do 10(4)). Os graves C1-1c, C1-1d, CRIT530-01, CRIT530-02 e C2-A4 ficaram consertados por execução, num Postgres descartável sob papel sem bypass.
- **Não graves que sobram (10(4): viram pendência, o bloco segue):**
  - `P-CONF530-01-TESTE-DONO-LEITURA-NA-TRAVA` (MÉDIA): a leitura do status na mesma instrução da trava (o fecho do CRIT530-02) não tem teste-dono no repo; a mutação CONF-2 sobrevive, e a sonda `revisoes/j530/conf-530/zz-conf530-probe-db.test.ts` a mata. **Dono: B-ASS-08c**, que liga o provedor de nota: o teste entra ANTES de o canal ligar. Leitura do orquestrador, declarada (§A6): o canal de pagamento e nota segue desligado na produção, então a corrida não emite nota real até o 08c.
  - `P-CONF530-02` (BAIXA): comentário de `StatementInvoiceRepository.beginIssue` desatualizado. Dono: B-ASS-08c.
  - `P-CONF530-03` (BAIXA): 3 caminhos do conserto fora da letra do PERMITIDO, todos declarados no diário. Registro.
- **Decisão:** junta + conserto + conferência + CI verde = **merge** (§C7 10(3)6). Depois, o porteiro.

## Porteiro pós-merge — 11/11 07:13 SP
- **Quem:** `porteiro-530` (Claude Opus 5.5, nível menor, declarado, identidade nova). Parecer integral fora do repositório: `erp-pausa-2026-10-03/revisoes/porteiro-530-parecer.md`. Janela 06:44:52 → 07:13:47 SP, medida na ref `a0979f51`.
- **Veredito:** LIBERADO COM RESSALVA, para o `B-ASS-08c`.
- **Conferido por execução:** o squash `a0979f51` tem a mesma árvore do head aprovado `6f710cec`. Testes do bloco sem banco: 163/163, 0 pulo. Com banco (Postgres 16 próprio, papel NOSUPERUSER NOBYPASSRLS asserido): 74/74, 0 pulo, e uma 2ª execução de 31/31. CI do merge (run 42997614148): `backend` com 5038 testes, 5036 pass, 0 fail e 2 pulados (por desenho, da paridade RBAC), e `backend-postgres` 503/503. O canal fica desligado por padrão: 0 chamadas externas, e o webhook é idêntico à rota inexistente em 36 comparações. Sem vazamento pelo §2.8. Limpeza §C5 conferida.
- **Ressalvas de registro (para este PR de registro):**
  - R1: registrar `P-CONF530-01`/`02`/`03` com dono `B-ASS-08c`; a `01` trava ligar o canal até o teste-dono CONF-P1 estar no repositório.
  - R2: versionar a ata, os votos e o parecer.
  - R3: o corpo do PR #530 cita números anteriores ao conserto; os do objeto mergeado são 5038/5036/0/2 e 503/503.
  - R5: reatribuir ao `B-ASS-08c` a `P-ASS08-MUTATE-SEM-GUARDA` (ALTA) e a `P-ASS08-RECUPERADA-SEM-COBRANCA`, cujo dono era o `B-ASS-08b`, já mergeado. A `P-ASS08-RECONSULTA-SEM-VALOR` segue com o dono alternativo.
- **Para o `B-ASS-08c`, antes de ligar o canal:** fechar a `MUTATE-SEM-GUARDA`; acertar o documento e o comentário `statement-settlement.service.ts:151` ("nota viva", junto com a `P-CONF530-02`, R4); pôr as suítes `ass-0*-db` na lista curada do `backend-postgres` (O1).
- **Observação fora do #530 (O2):** o worktree `w-dev522` e o ramo local do #522 continuam de pé; é limpeza do #522.
- **Nota do redator `reg-1111-cl`, não do porteiro:** este PR de registro gravou R1, R4, R5 e O1 em `controle/pendencias.md`. O1 virou a `P-ASS-DB-FORA-DA-LISTA-CURADA`, com dono a definir pelo orquestrador (candidato: o `B-ASS-08c`); mexer em `.github/**` exige autorização do dono. R4 virou a `P-ASS08C-DOC-E-COMENTARIO-NOTA-VIVA`. Por ordem do orquestrador (11/11 07:14 SP), entram a ata e este resumo do parecer; os votos (`revisoes/j530/`) e o parecer integral ficam fora do repositório.
