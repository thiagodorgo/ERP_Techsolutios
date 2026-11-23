# Ata da J-619: junta completa do PR #619 (B-APP-ORG-2, o app dos itens 69 e 70: entrar sem escolher, os chamados e as comissões de todos os pátios)

**Redator:** `reg-2211-cl` (Claude Opus, nível menor, declarado), registro de 22/11. Não votou, não planejou, não
desenvolveu nem conferiu o bloco. Fontes, todas fora do repositório, em `~/erp-pausa-2026-10-03/`:
`revisoes/app-org/junta-app/` (`composicao.md`, os mandatos, `votos/*-voto.json`, `votos/*-evidencia.md`,
`votos/inspetor-parecer.md`, `votos/inspetor-evidencia.md`, `votos/00-quedas.md`), a Emenda 1.8.3.15 do plano
(`planos/plano-B-APP-ORG-69-70-emenda1.8.3.15.md`), o diário do conserto (`revisoes/app-org/dev-japp-fix-cl.md`), a
conferência (`revisoes/app-org/conf-japp-fix-dp.md`), o parecer do porteiro (cópia em
`omega/juntas/porteiro-619-parecer.md`) e `REGISTRO-PENDENTE.md` (21/11, 20:05 a 23:13). O orquestrador registrou a
falta desta ata às 22:49 de 21/11; o `porteiro-619` a pôs como ressalva (1).

- **Nível:** junta completa (§C7 item 10(1)): o bloco mexe na sessão do app, no isolamento entre pátios e no fluxo de
  autenticação (a A4, a senha provisória vencida). Fluxo rápido, §C7 item 10(3).
- **Objeto da junta:** `cf781a4875328936e4d05a88734b5bc5374fb5cd`, head do PR #619 (ramo `feat/app-org-2-app`),
  merge-base `36b5586d` (a `main` com o #612). 26 commits e 3 merges sem conteúdo próprio, 44 caminhos, todos em
  `mobile/flutter_app/`. CI com 18 check-runs, todos `success` (inspetor, passadas 1 e 2).
- **Objeto do merge:** `d2f55bd13f26fe604ffe3b9115937235b6b4157e`, o conserto único. Squash na `main`: `51acef6b`, em
  2026-11-22T01:49:26Z (21/11 22:49 SP). A árvore do squash é a do head aprovado (`git diff d2f55bd1 51acef6b` vazio,
  pelo porteiro).
- **Composição:** recomendada por `briefing-japp-cl` (Claude Opus, nível menor), decidida pelo orquestrador. Os mandatos
  têm md5 EOL-neutro em `junta-app/md5-mandatos.txt`. A junta foi disparada às 20:05 de 21/11.
- **Quórum:** com a C4, a junta teve 4 cadeiras. A unanimidade das 4 foi leitura do redator do briefing, declarada
  (`composicao.md` §2.1), e o orquestrador a adotou. Os votos da C1, da C2 e da C3 escrevem "unanimidade de 3"
  porque os mandatos deles nasceram antes da C4; o da C4 escreve "das 4 cadeiras".

## Quem fez o quê no bloco (a base do cruzamento, §C7 item 11)

Fonte: `composicao.md` §1 (registro de agentes vivos, trailers e `git blame` de `36b5586d..7eee8d11`), e §2.1 para a A4.

- **Planos:** o plano-base e as Emendas até a 1.8.3.1 são Claude (Opus e Fable); a 1.8.3.9 e o protótipo que o dev
  copiou são do `plan-1839-fable` (Claude Fable, topo); as 1.8.3.6 a 1.8.3.8 e os Adendos da 1.8.3.9 são do
  `orq-claude-opus`; a 1.8.3.14 (a A4) é do orquestrador.
- **Código:**
  - A1: começo pelo `dev-a1-cx4` (Codex conta 4), que caiu às 13:42, e o resto pelo `dev-a1-cl` (Claude);
  - A3-dados: `dev-a3d-cx3` (Codex conta 3), que caiu às 13:46, e o conserto da `[G1]` pelo `dev-a3d-cl` (Claude);
  - A3-tela, A2, os Adendos da 1.8.3.9 e a integração: Claude (`dev-a3t-cl`, `dev-a2-cl`, `dev-1839b-cl`, `dev-int-app-cl`);
  - o conserto da 1.8.3.9: `dev-1839-azc` (Azure `gpt-5.3-codex`);
  - a A4, a saída do `PROTOTIPO` e o CM4: `dev-a4-azc` e `dev-a4b-azc` (Azure).
- **Críticas e verificações:** DeepSeek (`crit-1838-dp`, `crit2-1838-dp`, `crit-1839-dp`, `verif-a1-dp`,
  `verif-a3d-dp`, `verif-a3t-dp`), Codex conta 5 (`verif-a2-cx5`, `reconf-a2-cx5`), Claude (`verif-a4-cl`,
  `reconf-a4-cl` e os workflows de conferência), Gemini Argon como 2º revisor (`rev2-a1-argon`) e Azure
  (`verif-1839b-azc`).
- **Pré-revisão (§C7 item 10(3) passo 1):** `prerev-619-dp` (DeepSeek), no `7eee8d11`, COM ACHADO: P619-01 (baixa), a
  âncora da MC3 cita um teste (CM3) que não a pega; a mutação só fica vermelha no G-ESCUTA. Defeito de âncora do plano,
  não de produto.
- **Leituras declaradas do briefing (§A6):** Azure e Codex contam como casas diferentes, e as contas do Codex como uma
  casa só. Na leitura estrita do item 11 ("outro modelo é a outra casa"), as cadeiras OpenAI têm sobreposição de casa
  com o conserto da 1.8.3.9, e isso fica escrito aqui.

## Inspetor de terreno

- **Identidade:** `insp-japp-cl`, Claude Opus 5.5, nível menor, declarado. O tipo de agente não estava carregado na
  sessão; o corpo foi o da `origin/main` `36b5586d`, copiado em `junta-app/corpo-inspetor-origin-main.md`, com md5
  EOL-neutro `cbbed450…` igual ao `git show origin/main:` (medido às 20:05).
- **Passada 1 (20:05–20:17): BLOQUEADO.** O terreno estava limpo: isolamento, resíduo, espelho, baseline, CI 18/18,
  inelegibilidade e memória. Bloqueou o briefing:
  - **B1:** o `mandato-C3.md` (item `A4-FORA`) dava como fato que a A4 não estava no objeto; ela estava, pelos commits
    `0fd5b851`, `df7b8f04` e `cf781a48`, que entraram depois do briefing;
  - **B2:** nenhuma cadeira julgava a A4, que mexe no fluxo de autenticação; o id `MT1` colidia; a lei do escopo da C3
    não tinha a 1.8.3.14.
- **A decisão do orquestrador (20:18):** pela P4 (máximo 3 itens por cadeira), nasce a **C4**, dona da A4 e da 1.8.3.14
  (`jc4-app-sol5`, Codex conta 5), e o mandato da C3 é acertado. O `briefing-japp-cl` escreveu o `mandato-C4.md` e
  refez o `md5-mandatos.txt` EOL-neutro.
- **Passada 2 (20:28–20:38): LIBERADO COM RESSALVA.** B1 e B2 limpos, o objeto sem mudança, 18/18 `success`, `npm ci`,
  `sync-agent-agents.mjs --check` (`OK — 95 agentes`), `dart format` 3.13.4 (`0 changed`) e `flutter analyze` limpos.
  As ressalvas:
  - o conferidor original das donas não lê a C4 (a regex só aceita `C[123]`); as donas foram conferidas por outra via,
    250 ids com exatamente uma dona;
  - a C1 e a C2 tinham o voto em apuração e só o gravaram depois do LIBERADO;
  - **R8:** a conta 5 do Codex também fez a `crit2-18313-cx5`, crítica do plano do servidor (1.8.3.13), e isso não
    estava declarado. Foi declarado na `composicao.md` às 20:39.
- **Ressalva documental, registrada pelas 4 cadeiras:** o `votos/inspetor-parecer.md` ficou com o texto da passada 1
  (BLOQUEADO). O veredito da passada 2 está em `votos/inspetor-evidencia.md` e na nota do orquestrador das 20:39 em
  `composicao.md`. Todos os votos citam essa fonte.

## Votos

| Cadeira | Identidade | Casa e modelo | Cruzamento, declarado | Voto | Achados |
|---|---|---|---|---|---|
| C1 — isolamento e sessão | `jc1-app-dp` (voto final como `jc1-app-dp-final`, a mesma identidade, P7/P3) | DeepSeek Pro, nível menor | total no código: o DeepSeek não escreveu linha do app; sobreposição na verificação (`verif-a1-dp`) e nas críticas das emendas | **APROVADO** (20:47) | C1-01 (nota) |
| C2 — dinheiro e comissões | `jc2-app-sol6` (voto final como `jc2-app-sol6-final`) | Codex conta 6, GPT-5.6 Sol | parcial: o Sol da conta 3 escreveu a A3-dados; o Azure aplicou a porta | **REPROVADO** (20:44) | C2-01 (bloqueia, não grave) |
| C3 — regressão, escopo e registro, com a A2 | `jc3-app-sol3` | Codex conta 3, GPT-5.6 Sol | parcial: a conta 3 escreveu a A3-dados e criticou emendas; limpa na A2, na A1, na 1.8.3.9 e na integração | **APROVA COM RESSALVAS NÃO GRAVES** (disparada às 21:09; voto gravado às 21:57) | C3-01 a C3-11 (notas) |
| C4 — a A4 e a Emenda 1.8.3.14 | `jc4-app-sol5` (caiu), sucessor `jc4-app-dp-suc` | Codex conta 5, GPT-5.6 Sol; o sucessor é DeepSeek Pro, nível menor | o sucessor não tem cruzamento de casa com o código julgado (Azure e Sol) | **REPROVADO** pelo sucessor (21:22) | C4-01 a C4-08 |

### C1 (`jc1-app-dp`)

- Os 3 itens por execução: 10 mutações ML mortas por `expect`, mais o G-ESCUTA e a `[G1]` por mutação-controle; 15
  mutações ME e MJ mortas, 5 censos; 6 mutações MN, MO e ML11 mortas; 2 mutações próprias (PROPRIA-C1-1 e -2) mortas. A
  re-execução P3 de ML1, ME1 e ML11 bateu com os logs originais.
- **C1-01 (nota, não grave, dentro do bloco):** o `retainTenants` de `lib/core/auth/listen_sessions.dart` não tinha a
  guarda de época que os outros métodos têm. A instância órfã da 1ª pessoa remove a sessão de escuta da 2ª, na memória
  e com revogação no servidor. Só tira disponibilidade; nada vaza nem se perde.

### C2 (`jc2-app-sol6`)

- Itens 1 e 2 aprovados, sem achado: o censo de dinheiro deu 0 (`double` fora da feature), 8 mutações aplicáveis
  mortas, as literais velhas das MC dão `NAO-SE-APLICA` porque a 1.8.3.14 as trocou (essas são da C4); MI1 a MI6, MK1,
  MK2 e PROPRIA-C2-2 mortas.
- **C2-01 (bloqueia, não grave, dentro do bloco):** a tela nova usa `Colors.white` literal, fora dos tokens do sistema,
  em `commissions_screen.dart:333` e `finance_section_switch.dart:26` e `:51`.

### C3 (`jc3-app-sol3`)

- Suíte: objeto `+2063 ~238` e base `+1984 ~238`, os dois verdes; o delta de +79 explicado (104 casos novos `bapporg2`,
  menos 5 do grupo 5 do `b098`, menos 20 realocados de `bapporg_troca_telas`). Format, analyze, CI e regressões
  verdes. 44/44 caminhos no PERMITIDO das 10 fontes, PROIBIDO vazio, merges sem conteúdo próprio. ML9 e MA2-1 a MA2-7
  mortas.
- **As 11 notas, todas não graves, de processo ou de registro:**
  - **C3-01:** não há registro da conferência visual da A2 pelo orquestrador Claude;
  - **C3-02, C3-03, C3-05 e C3-08:** as pendências `P-APP-SERIAL-LOCK-UNICO`, `P-APP-SAIR-LIMPEZA-QUE-LANCA`,
    `P-APP-COMISSOES-SKELETON-DO-KIT` e `P-APP-OSCARD-TRANSBORDA-390` estavam sem dono e fora da `main`;
  - **C3-04 e C3-06:** as pendências `P-APP-ORG-SESSAO-DE-ESCUTA-ORFA` e `P-APP-ORG-COMISSAO-A-RECEBER` não existiam
    em lugar nenhum;
  - **C3-07:** a pendência "a linha não mostra o número do chamado" só estava descrita no diário `dev-a3t-cl`, sem id
    e sem dono;
  - **C3-09:** o diário `dev-1839-azc` ficou com 2 marcas `EM APURAÇÃO`, fecha `CONCLUÍDO` e não transcreve as
    mutações;
  - **C3-10:** o diário `dev-a4-azc` tem 14 bytes de controle, declara o head `df7b8f04` em vez do `cf781a48`, e o
    commit `cf781a48` não tem trailer de coautoria;
  - **C3-11:** a pré-revisão cruzada mediu o `7eee8d11`; a cauda até o `cf781a48` (a A4) teve verificações, mas não
    nova pré-revisão do objeto inteiro.
- A C3 aceitou a `P-APP-ORG-ESCOLHA-SAI` aberta, com dona `B-APP-ORG-2` na `main`.

### C4: a cadeira original, a queda e o sucessor

- **`jc4-app-sol5` (Codex conta 5), disparada às 20:28.** Mediu os 3 itens e gravou 8 achados na evidência
  (`votos/C4-evidencia.md`), com o voto em apuração. **Caiu às 21:04** pelo limite de uso da conta 5, depois de gravar
  os achados e antes do voto final (`votos/00-quedas.md`). Sem voto, ela não conta (P3).
- **Sucessor `jc4-app-dp-suc` (DeepSeek Pro, identidade nova).** Pela P3, re-executou os 8 comandos registrados no seu
  próprio worktree (`w-jc4-suc`, no `cf781a48`) e mediu a cauda do mandato. A base deu as mesmas contagens do caído,
  em 2 rodadas. Os 8 achados foram confirmados (`votos/C4suc-evidencia.md`):
  - **C4-01 (bloqueia, não grave):** a frase da senha vencida some quando a rede cai, porque o aviso de sem internet
    tem precedência (`change_password_screen.dart:76-81`). O Sair continua e a troca continua impedida;
  - **C4-02 (bloqueia, não grave):** o TP1 não prova que Sair é a única ação; a mutação PROPRIA-C4-1 (um segundo botão)
    sobrevive com `+2`;
  - **C4-03 (bloqueia, não grave):** a A4 mexeu em `auth_repository.dart` além do `switch` nominal do PERMITIDO (o
    valor no enum, a mensagem e o `locksForm`);
  - **C4-04 (nota):** no estado vencido, o título e o subtítulo da tela ainda mandavam trocar a senha;
  - **C4-05 (bloqueia, marcado GRAVE pelo sucessor):** o arnês não prova a identidade do pátio em cada bloco de
    comissão; a mutação PROPRIA-C4-2 (o estado de Y no bloco de X) sobrevive ao CM4, ao CM8 e ao CM9, com `+8`. **O
    próprio sucessor mediu que o produto não mistura pátios; só falta o teste que pegue a mistura** (`REGISTRO-PENDENTE.md`
    21/11 21:22; `C4-voto.json`, justificativa);
  - **C4-06 (bloqueia, não grave):** as literais das MC no diário do dev não servem para reaplicar a mutação;
  - **C4-07 (nota):** o Adendo deve dizer que a l.204 é a única âncora que mata o CM4;
  - **C4-08 (bloqueia, não grave):** não há teste da troca Despesas | Comissões; o B083 passa sem ela.

## Quedas de agente (P6)

| agente | modelo | mandato | fase da morte | erro | custo do redo |
|---|---|---|---|---|---|
| `jc4-app-sol5` | GPT-5.6 Sol, pino pela conta 5 | C4, 3 itens | depois de gravar 8 achados, antes do voto final | limite de uso da conta ("try again at Nov 22nd 12:53 AM") | o sucessor `jc4-app-dp-suc` re-executou os 8 comandos e mediu a cauda, ~16 min (21:06 a 21:22) |

Não houve outra queda nesta junta. A C1, a C2 e a C3 retiveram o voto até o LIBERADO e voltaram com a mesma
identidade e o mesmo mandato para gravá-lo a partir da própria evidência (P7/P3). Isso não foi queda.

## Triagem (§C7 item 10(3))

Triador: o orquestrador (`orq-claude-opus`, Claude Opus), na Emenda 1.8.3.15 (21:54 de 21/11). Ele não achou nenhum
dos itens e não consertou nem conferiu. A emenda foi escrita com a C3 ainda regravando o voto final; as 11 notas já
estavam medidas na evidência dela.

**Nenhum defeito grave de produto.** O C4-05 veio marcado grave e foi triado como não grave, pela medição do próprio
achador: o produto não mistura pátios, só falta o teste. O `porteiro-619` conferiu essa triagem e a aceitou (parecer,
item 4). Por isso não houve auditoria do topo (§C7 item 10(5)).

| Achado | Gravidade | Destino | Dono |
|---|---|---|---|
| C2-01 — `Colors.white` literal em 3 pontos | não grave, simples | conserto único, item 1 | `dev-japp-fix-cl` |
| C4-01 — a frase vencida some sem rede | não grave, simples | conserto único, item 2 (TP3) | `dev-japp-fix-cl` |
| C4-04 — título e subtítulo incoerentes no estado vencido | não grave, simples | conserto único, item 3 | `dev-japp-fix-cl` |
| C4-02 — o TP1 não prova a ação única | não grave, simples | conserto único, item 4 | `dev-japp-fix-cl` |
| C4-05 — falta o teste da identidade do pátio em cada bloco | não grave, simples (rebaixado, acima) | conserto único, item 5 (CM10) | `dev-japp-fix-cl` |
| C4-08 — falta o teste da troca Despesas \| Comissões | não grave, simples | conserto único, item 6 (TF1) | `dev-japp-fix-cl` |
| C1-01 — `retainTenants` sem guarda de época | não grave, simples | conserto único, item 7 (EP10) | `dev-japp-fix-cl` |
| C4-03 — a A4 além do `switch` | não grave | por registro: o enum, a mensagem e o `locksForm` entram no PERMITIDO de forma nominal (Emenda 1.8.3.15 §2) | orquestrador |
| C4-06 e C4-07 — as literais das MC no diário | não grave | por registro: as literais certas, por `git show HEAD:<arquivo> \| grep -nF`, no diário do conserto (`dev-japp-fix-cl.md`, a partir da l.110); a âncora da MC4 é a l.204 | `dev-japp-fix-cl` |
| C3-02, C3-03, C3-05, C3-08 | não grave, registro | pendências abertas pelo registro de 21/11 (PR #620) | o registro |
| C3-04 | não grave, registro | este registro: `P-APP-ORG-SESSAO-DE-ESCUTA-ORFA` (BAIXA) | o bloco de sessão do app |
| C3-06 | não grave, registro | este registro: `P-APP-ORG-COMISSAO-A-RECEBER` (BAIXA) | `B-COMISSAO-MOTOR` |
| C3-07 | não grave, registro | este registro: `P-APP-COMISSOES-SEM-NUMERO-DO-CHAMADO` (BAIXA) | `B-COMISSAO-MOTOR` |
| C3-01, C3-09, C3-10, C3-11 | não grave, processo | registrados nesta ata, sem pendência (leitura do redator, declarada: são fatos do processo deste bloco, sem nada a consertar no produto; o C3-10 é da mesma classe da `P-DIARIO-AZURE-POWERSHELL-ESCAPE`, que já existe) | orquestrador |
| P619-01 (pré-revisão) — a âncora da MC3 cita o teste errado | baixa, do plano | a mutação fica vermelha no G-ESCUTA; registrado nesta ata | orquestrador |

**Sem refazer cadeira** (§C7 item 10(4)): o conserto não mexe em regra de dinheiro, permissão nem isolamento fora do
que os achados apontam. A guarda do C1-01 é exatamente o que o achado pediu, e o G-ESCUTA e a `[G1]` ficaram sem diff.

## Os papéis (§C7.4-bis)

- **Quem achou:** `jc1-app-dp` (C1-01), `jc2-app-sol6` (C2-01), `jc3-app-sol3` (C3-01 a C3-11), `jc4-app-sol5` (os 8
  da C4) e `jc4-app-dp-suc`, que os confirmou por execução; `prerev-619-dp` (P619-01).
- **Quem planejou o conserto:** `orq-claude-opus` (Claude Opus), na Emenda 1.8.3.15. Não achou nada.
- **Quem desenvolveu:** `dev-japp-fix-cl` (Claude Opus, nível menor). Não achou nada.
- **Quem conferiu:** `conf-japp-fix-dp` (DeepSeek Pro, nível menor), de outra casa. Não consertou.
- **Cruzamento do conserto, declarado:** planejador e dev são da mesma casa (Claude); o verificador é de outra
  (DeepSeek), como manda o §C7 item 11(1).

## Conserto único e conferência

- **Conserto:** `dev-japp-fix-cl`, worktree próprio `~/w-japp-fix`, a partir do `cf781a48`, um commit por item,
  `79acdb2f` … `d2f55bd1`. Empurrado sem force às 22:14 de 21/11 (`cf781a48..d2f55bd1`). 9 arquivos, `+404 −13`:
  - `lib/`: `listen_sessions.dart` (a guarda), `change_password_screen.dart` (a frase sob queda de rede e os textos),
    `commissions_screen.dart` e `finance_section_switch.dart` (os tokens), `other_patios_calls.dart` (1 linha que passa
    a sessão ao `retainTenants`, leitura declarada do dev);
  - `test/`: TP1 reforçado e TP3 em `bapporg2_provisoria_app_test.dart`; CM10 em `bapporg2_comissoes_dados_test.dart`;
    TF1 em `bapporg2_troca_financas_test.dart` (novo); EP10, EP11 e EP12 em `bapporg2_epoca_test.dart`.
  - Bateria do dev: suíte inteira `+2069 ~238`, 0 `[E]`; format 3.13.4 `0 changed`; `flutter analyze` limpo;
    `git diff --check` limpo; 0 caminho local de máquina no diff; G-ESCUTA e `[G1]` sem diff e verdes (`+15`, `+4`).
  - Leituras declaradas do dev: o parâmetro `current` é opcional, porque torná-lo obrigatório quebraria o G-ESCUTA
    (PARE da emenda), e o EP12 varre `lib/` e exige `current:` em toda chamada; a linha em `other_patios_calls.dart`; o
    EP10 reproduz o cenário da evidência da C1, l.110.
- **Conferência:** `conf-japp-fix-dp`, worktree próprio no `d2f55bd1`. **CONFERIDO**, item a item:
  - os 7 itens do §1 pelo comando de cada achado (o `grep` do C2-01 dá 0; TP1, TP3, CM10, TF1 e EP10 verdes);
  - as 5 mutações do §3 vermelhas por `expect`: PROPRIA-C4-1 (TP1, `is too many`), PROPRIA-C4-2 (CM10, `patio-x`
    onde devia ser `patio-y`), apagar o `FinanceSectionSwitch` (TF1), apagar a guarda nova (EP10 e EP11) e voltar o
    `Colors.white` (o `grep` dá 1). Cada uma restaurada, com `git status` vazio;
  - as 3 leituras do dev aceitáveis. Nota da conferência: a sonda que a C1 citou
    (`sondas-c1/bapporg2_c1_retain_sonda_test.dart`) não existe na pasta; o EP10 reproduz o cenário pela evidência;
  - escopo: os 9 arquivos, exatamente o PERMITIDO mais a linha declarada; `auth_repository.dart` sem diff;
  - suíte inteira `+2069 ~238`, 0 `[E]`; format, analyze e `diff --check` limpos; os runs do head `44970546169`
    (`pull_request`) e `44970542439` (`push`, `d2f55bd1`) com os 9 jobs `success`.
  - **Nota de registro:** a linha final "Veredito" do diário da conferência ficou como `EM APURAÇÃO` (o esqueleto da
    P2 não foi atualizado), embora os 5 itens digam CONFERIDO. O orquestrador registrou CONFERIDO às 22:49 de 21/11.

## Nota de contagem (ressalva (5) do porteiro)

- **O corpo do #619 diz `+2061 ~238`. A contagem real do objeto mergeado é `+2069 ~238`.** O corpo do PR não foi
  reescrito; o número oficial é o desta ata.
- Medido: `+2069 ~238` no `d2f55bd1` pelo dev (`dev-japp-fix-cl.md:136`) e pela conferência; no `51acef6b` pelo
  `porteiro-619`, que reexecutou a suíte (`04:11 +2069 ~238: All other tests passed!`), e no job `flutter` do CI da
  `main` (run `44973243958`).
- No `cf781a48`, o objeto da junta, a C3 mediu `+2063 ~238`, igual ao CI daquele head. O conserto somou 6 testes
  (TP3, CM10, TF1, EP10, EP11, EP12): 2063 + 6 = 2069.
- **Hipótese, não medida:** o `+2061` é o número do `7eee8d11`, antes da A4, que somou o TP1 e o TP2 (2061 + 2 =
  2063). O porteiro o atribuiu ao "objeto antes do conserto"; a C3 mostra que o `cf781a48` já tinha 2063.

## Resultado

**APROVADO PARA MERGE** pelo fluxo rápido: nenhum defeito grave; os não graves e simples entraram num conserto único,
feito por quem não achou e conferido por outra casa; os de registro têm dono; o CI está verde.

- **Merge:** squash `51acef6b`, 21/11 22:49 SP, a partir do `d2f55bd1`. O diff fica só em `mobile/`; nada em `Kpis/`
  (KPI congelado). CI da `main` no `51acef6b`: run `44973243958` `completed success` (backend `7337/7335`, 2 pulados;
  backend-postgres `1092`; frontend `2097`; flutter `+2069 ~238`; 0 `not ok`).
- **Porteiro:** `porteiro-619` (Claude Opus 5.5, nível menor), 22:50–23:13, **LIBERADO COM RESSALVA**
  (`omega/juntas/porteiro-619-parecer.md`). Os itens 69 e 70 **não** fecham com este PR: falta a parte do servidor
  (`B-APP-ORG-2S`, sem PR na `main`) e o ensaio E-69/E-70.
- **As ressalvas do porteiro e onde estão:**
  1. a ata J-619: esta;
  2. C3-04, C3-06 e C3-07 sem pendência: abertas em `controle/pendencias.md` neste registro; C3-01, C3-09, C3-10 e C3-11
     com destino na triagem acima;
  3. `P-APP-ORG-ESCOLHA-SAI`: fechada neste registro, com a prova na `main`. A redistribuição das pendências com dono
     `B-APP-ORG-2` que o bloco não consertou (por exemplo, `P-APP-T9O-SOB-CARGA` e `P-APP-COMISSOES-SKELETON-DO-KIT`)
     fica com o orquestrador;
  4. a limpeza: o ramo remoto e o local `feat/app-org-2-app` e os worktrees `~/w-app-int` e `~/w-japp-fix` foram
     removidos pelo orquestrador às 23:13 de 21/11 (`REGISTRO-PENDENTE.md`);
  5. a contagem: a nota acima.
- **Lateral do porteiro, fora deste objeto:** a ata J-613 (#613) também não está na `main`. Fica com o orquestrador.
