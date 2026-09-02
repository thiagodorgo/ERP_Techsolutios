# SAN2-4b — CORRIGIR o arnês a partir das 12 observações medidas do 4a

> **Plano do `planejador-mestre`** (Fable por contrato, `D-PLANEJADOR-MODELO-FABLE`), gravado seção a
> seção em 2026-08-31. Branch **`fix/san2-4b-corrigir-arnes`** (criada da `main` = `45c3b97`), worktree
> `.claude/worktrees/san2-r`, head no momento do plano **`fca131a`** (= `main` + o parecer do porteiro
> do #365, único delta — conferido por `git log/diff 45c3b97..HEAD`). Autorização de start: porteiro
> pós-merge do #365 = **LIBERADO COM RESSALVA**
> (`agent-orchestration/omega/juntas/votos/SAN2-4a/00c-porteiro-pos-merge-365.md`), e este plano
> incorpora a dívida dupla dele como obrigação do PR (§3-C6). Quem planeja não desenvolve nem vota
> (§C7.4-bis) — outro agente executa este plano, e esse agente **não pode ser** nenhuma das instâncias
> `dev-san2-4a` que acharam os defeitos (achador não conserta).

## §0 — A natureza do bloco

O SAN2-4 foi partido em **4a (MEDIR)** e **4b (CORRIGIR)**. O 4a entregou o diagnóstico com N, forma e
causa, e uma junta de 3 cadeiras já derrubou as conclusões que iam além da medição (J-SAN2-4a,
APROVADO 3×0, 5 achados tratados no pós-voto). **Este bloco consome esse diagnóstico — não o re-deriva.**
Toda correção aqui nasce de uma observação nomeada do 4a; correção sem observação-mãe é escopo
estourado e reprova por si. O inverso também vale: observação que este bloco NÃO fecha tem a exclusão
justificada por escrito no §3.0 — silêncio sobre uma das 12 é defeito do plano.

## §1 — Objetivo, ator, fluxo, contrato, modelagem, baseline

**1.1 Objetivo.** Fechar, com prova de poder declarada, as observações do 4a que são deste bloco:
(1) o defeito do caso de teste `tests/authority-portal.test.ts:161` (tamper que troca padding, não
dado — taxa 1/256 por execução, causa nomeada em 7 elos); (2) o defeito de `src/` que a mesma cadeia
expôs — `parseStored` derivando `keylen` do stored RECEBIDO (`authority-password.ts:79`), aceitando
extensão-em-comprimento a 1/256 por byte, contradizendo o comentário do próprio código; (3) a
**exclusão DUPLA** da família `rls_test_` do varredor de órfãs (fora de `SWEPT_ROLE_FAMILIES` **e**
criador que nunca invoca o sweep) mais o teardown não-resiliente — o mecanismo que produz órfã com
LOGIN e 460 grants a 100% quando o processo morre na janela de ~70% da execução; (4) as erratas e
fechamentos de registro que as medições 2 e 3 deixaram prescritos com dono 4b; (5) a dívida dupla de
KPI do porteiro do #365.

**1.2 Ator.** Executor: instância dev nova designada pelo orquestrador (identidade que não escreveu
nenhuma medição do 4a — §C7.4-bis). Leitores-alvo: a junta deste PR, a junta do ciclo 5 do `B-O6R-02`
(consome o §V.3 da medição 2 via apenso ao D29) e a junta dona de `P-ARNES-RLS-TEST-FORA-DO-SWEEP`
(as 68 órfãs da base viva — que este bloco NÃO toca).

**1.3 Fluxo origem→destino.** Observações das 3 medições (`omega/juntas/votos/SAN2-4a/medicao-*.md`)
→ correções C1–C4 em `src/`+`tests/` (§3) → provas com N exigido (§4) → apensos/erratas/fechamentos
em `pendencias.md`, `status-geral.md`, plano do ciclo 5 (§3-C5) → KPI com backfill do #365 (§3-C6) →
inspetor de terreno → junta (§8, unanimidade de 3) → PR → porteiro pós-merge.

**1.4 Contrato REST: N/A declarado.** Nenhuma rota, payload ou código de status nasce ou muda (nenhum
404/422/409 a definir). O único contrato tocado é interno: `verifyPassword` fica MAIS estrito
(stored não-canônico → `false`), e §4-C1 prova que nenhum stored legítimo é rejeitado.

**1.5 Modelagem: N/A declarado.** Nenhum model, migration, Decimal, timestamptz. O formato
armazenado `scrypt$N$r$p$salt$hash` **não muda um byte** — só a validação endurece; credenciais
existentes continuam válidas sem migração (provado em §4-C1 pelos controles positivos). Em registro,
vale o princípio do delete lógico: apenso e errata datados, nunca reescrita (§A2).

**1.6 Baseline N de testes e meta M≥2N — medido na abertura, não copiado.** O dev abre o bloco
medindo por execução os denominadores dos arquivos que vai tocar (forma F1/F4 do 4a, 1 rodada cada):
`authority-portal` (12 no 4a), `rls-tenant-isolation` (1), `db-catalog-write-guard` (?) e as demais
suítes-gatilho do sweep; mais `kpi-dashboard-charts` (16). Esse é o N do baseline. O bloco ADICIONA
testes (≥1 caso novo pinando a classe padding — §3-C2; drills do guard estendidos sem test() novo —
§3-C3), mas M≥2N por contagem de casos não é alcançável num bloco de correção cirúrgica: a quota se
cumpre como nos precedentes SAN2-3/SAN2-4a (ambos aprovados 3×0) — **prova dobrada por bateria de
execuções-com-veredito** (§4 soma 100.000 iterações de sonda + 30 execuções do arquivo + 10 do
vaza-metro + 2+2+2 das provas de sweep + 3 da lista-6 + suíte completa), cada uma com ec, N, forma e
log nomeado. A junta pode derrubar o argumento; ele está declarado, não escondido.

## §2 — O que o 4a estabeleceu (resumo com ORIGEM; nada aqui é re-derivação)

Cada linha carrega a fonte. O dev NÃO re-mede nada disto — confere a citação e usa.

1. **A intermitência do `authority-portal` é 1/256 por execução, sem elo temporal.** Causa nomeada em
   7 elos medidos: o tamper da l.161 nunca vê `"A"` (o hash termina em `=` em 100.000/100.000), troca
   o **padding** do base64; 44 chars sem padding = 33 bytes com os 32 originais **intactos** + `0x00`;
   `parseStored` re-deriva com `keylen=33`; scrypt é prefixo-estável; o guard de comprimento não pega
   (33===33); `timingSafeEqual` passa sse o 33º byte derivado é `0x00` = 1/256. Previsão byte a byte
   × `verifyPassword` REAL: 20.000/20.000 na sonda E3 do bloco + 40.000/40.000 e 200.000/200.000 da
   C1 da junta. Origem: `medicao-1-authority-portal.md` §F3 (elos 1–7) + J-SAN2-4a (voto C1).
2. **OBS-2 é de `src/` e é o mais sério dos dois:** `parseStored`
   (`src/modules/authority/authority-password.ts:79`) deriva `keylen: hash.length` do stored
   RECEBIDO — o tamanho da chave é função do dado de entrada; extensão-em-comprimento de um stored
   válido é aceita a 1/256 por byte extra. O comentário das l.82-85 ("um stored corrompido
   simplesmente falha") é **contradito pela execução**. Origem: medicao-1 §5 OBS-2. Dono em aberto na
   medição ("a junta designa"); **este plano o assume — §3.0 item 2 argumenta por quê.**
3. **P(0 em 40) = 85,5% sob 1/256; ~766 execuções para 95% de poder; o N=10 da pendência tinha 96,2%
   de chance de sair verde com o defeito presente.** "Ficou verde" não prova nada nesta classe — o N
   de prova se deriva do PODER, não de número redondo. Origem: medicao-1 §F3/OBS-3 (conferido pela C1
   até o limite: 765 dá 94,99%).
4. **A exclusão do varredor é DUPLA.** (a) `rls_test_` fora de `SWEPT_ROLE_FAMILIES`
   (`tests/helpers/auth-identity-fixture.ts:105-111`, decisão consciente escrita na l.94); (b)
   `sweepOrphanEphemeralRoles` tem **chamador único** (`createEphemeralRole`, l.310) e o criador da
   família (`tests/rls-tenant-isolation.test.ts:25`) importa só `withRoleCatalogLock` — nunca invoca
   o sweep. **Fechar uma porta não resolve**: com a família registrada mas sem chamador no criador,
   rodar o criador sozinho continuaria sem varrer nada. Origem: medicao-3 §F6.3 + F8.2 (a órfã
   sobreviveu ao próprio criador E à suíte do varredor) + F9 (sobreviveu retrodatada 2h, 2/2, com
   vermelho-controle verde 2/2). Confirmado pela C2 da junta em cluster próprio.
5. **São 5 gatilhos de sweep, não 4** — 5 arquivos, 8 chamadas de `createEphemeralRole`; o quinto é
   `tests/db-catalog-write-guard.test.ts` (3 chamadas), justamente o guard que exercita o sweep de
   propósito. Origem: errata C2-A2 apensa à medicao-3 §F6.3.
6. **O teardown de `rls_test_` não usa `dropEphemeralRoleResilient`** — `DROP OWNED`+`DROP ROLE` crus
   nas l.3148-3151, terceira porta de gênese (falha do `DROP OWNED` leva o `DROP ROLE` junto), ao
   contrário das outras famílias (helper na l.251 do fixture). Origem: medicao-3 O-2.
7. **Gênese e assinatura da órfã:** 5/5 órfãs produzidas quando o kill cai na janela (~70% do tempo
   de vida do processo, 1883-1970 ms); todas idênticas: LOGIN, sem expiração, **460 grants = 115
   tabelas × 4** — a mesma assinatura das 68 de `P-O6R-ARNES-ISOLAMENTO` (18/08). Cada nome embute
   `Date.now()` → toda órfã é datável pelo nome, sem catálogo. **O 68 segue CARREGADO** — a base viva
   não foi tocada e não é deste bloco. Origem: medicao-3 §F7/F8/F10.
8. **Bateria barata: as DUAS listas fecham 37; a receita reprodutível do ciclo 5 é o §V.3 — a lista
   NOMEADA de 6 arquivos — NÃO o par `(arquivos, testes)`** (três listas de 6 distintas dão `(6,37)`,
   executadas pela C2). A única sentença falsa é a de impossibilidade do `status-geral.md` l.33; as 7
   contagens por arquivo dela estão certas; B≡C (pendencias.md ≡ plano do ciclo 5) é replicação, não
   corroboração. Origem: medicao-2 §R/§V + errata-da-errata E-2 (achado C2-A1) + J-SAN2-4a.
9. **Ressalva de escopo do 4a que este bloco herda:** o 1/2 do jurado (suíte inteira, máquina dele)
   NÃO está totalmente explicado — sob 1/256, ver ao menos 1 falha em 2 execuções tem P = 0,78%; ou
   azar de 1-em-128, ou existe segunda contribuição só no arranjo de suíte inteira. As medições não
   decidem entre as duas. Origem: medicao-1 §4.2.
10. **Dívida dupla do porteiro do #365 (item 4.5):** (a) backfill §C3.5 — `pr 365` ·
    `merge_commit 45c3b97` · `approved_head 4199b92` (head julgado da ata J-SAN2-4a l.4, NÃO o
    headRefOid `aa22b7f`); (b) `blocks_completed` 154 → **155** (condição literal escrita na entrada
    do 4a, cumprida pelo merge). Origem: `00c-porteiro-pos-merge-365.md` §4.5 e veredito.
11. **A contagem canônica é 12 observações (11 com dono)** — errata E-B1 do briefing, consignada na
    ata; o corpo do PR #365 carrega o 11 antigo. Origem: porteiro §2.2 + J-SAN2-4a ("erro do
    orquestrador").
12. **Fatos de terreno re-conferidos por ESTE planejador no head `fca131a`** (leitura/execução, zero
    edição): `parseStored` l.63-80 e comentário l.82-85 como descritos; `FROZEN_ALLOWLIST` do guard é
    ratchet por CONTAGEM com motivo por arquivo (`rls-tenant-isolation.test.ts` count 8; precedente
    escrito de mudança consciente: "5 -> 4 porque o DROP ROLE saiu daqui para o teardown resiliente");
    os drills PD do sweep no guard iteram `["audit_rls","vid_rls_test","vid_link_rls"]` DENTRO de um
    único test() (estender a lista não muda denominador); `sweepOrphanEphemeralRoles` NÃO é exportada;
    `dropEphemeralRoleResilient(adminClient, roleName, precedingStatements?)` é drop-in para o
    teardown do rls; **nenhum teste pina a exclusão da `rls_test_` do sweep** (a decisão vive só no
    comentário l.94 + pendência); todos os usos de `keylen` no repo são 32 (grep transcrito na sessão
    de planejamento); KPI: history com 148 entradas, última = SAN2-4a com 3 nulls e blocks 154.

## §3 — Correção proposta, item a item

### §3.0 — As 12 observações: o que este bloco fecha e o que NÃO fecha (com a razão de cada exclusão)

| # | Observação (origem) | Destino neste bloco | Correção |
|---|---|---|---|
| 1 | M1-OBS-1 · tamper da l.161 troca padding | **FECHA** | C2 |
| 2 | M1-OBS-2 · `parseStored` deriva keylen do input (`src/`) | **FECHA** (argumento abaixo) | C1 |
| 3 | M1-OBS-3 · critério de N cego para a classe (método) | **FECHA como registro** — entra no apenso de fechamento da pendência; não é código | C5 |
| 4 | M2-O-1 · errata E-1 no `status-geral.md` l.33 | **FECHA** | C5 |
| 5 | M2-O-2 · apensar o §V.3 (lista NOMEADA) ao critério D29 do ciclo 5 | **FECHA** (a parte do 4b; o consumo é da junta do ciclo 5) | C5 |
| 6 | M2-O-3 · registrar B≡C (replicação ≠ corroboração) | **FECHA** | C5 |
| 7 | M2-O-4 · `P-REG-BATERIA-BARATA-DUAS-LISTAS` muda de natureza e fecha | **FECHA** (fechamento diferido ao 4b por escrito — porteiro §7.2) | C5 |
| 8 | M3-O-1 · exclusão DUPLA do varredor | **FECHA** (as DUAS portas — §2.4: fechar uma não resolve) | C3 |
| 9 | M3-O-2 · teardown de `rls_test_` não-resiliente | **FECHA** | C4 |
| 10 | M3-O-3 · recontagem das 68 da base viva | **NÃO FECHA.** Razão: exige `erp-postgres`, proibido neste bloco (nem leitura, §5.2); e o dono designado pela medição é a **junta** de `P-ARNES-RLS-TEST-FORA-DO-SWEEP` (recontagem supervisionada, só SELECT). O 4b apensa à pendência o que a correção C3 muda no cálculo dela (§3-C5.4) e ela **fica ABERTA** | — |
| 11 | M3-O-4 · armadilha de nomenclatura (substring vs prefixo ancorado) | **FECHA como registro + drill**: apenso nas pendências (C5) e a família nova entra nos drills PD do guard, que exercitam a ancoragem por execução (C3) | C3+C5 |
| 12 | M3-O-5 · assinatura 460=115×4 liga mecanismo às 68 | **FECHA como registro** — emenda em `P-O6R-ARNES-ISOLAMENTO` | C5 |

**Também NÃO é deste bloco, dito por extenso:** (a) **medir a hipótese da segunda contribuição do 1/2
do jurado** (§2.9) — custaria ~766 execuções da suíte inteira e, pós-correção, o objeto medido já é
outro; o fechamento da pendência declara a ressalva em vez de fingir que ela sumiu (§3-C5.2); (b)
**consolidar os 3 diários em `omega/medicoes/SAN2-4a-medicao.md`** (divergência mandato×plano já
registrada nos próprios diários) — cópia verbatim criaria um 4º registro da mesma verdade, e a
medição 2 acabou de provar que replicação não é corroboração (§V.1.6/E-3); o 4b **declara os diários
de `votos/SAN2-4a/` como registro canônico** no apenso de cada pendência, fechando a divergência por
decisão escrita, não por silêncio; (c) **taxa de exposição real** (frequência de morte de processo —
medicao-3 §F8.4) — fora do alcance de qualquer correção de arnês; (d) **outra máquina/outro Node**
(medicao-1 §4.4) — argumento, não medição, e segue argumento.

**Por que a OBS-2 (item 2) CABE aqui, e não em pendência própria.** Três razões, em ordem de força:
(i) **fechar só o teste MASCARA o defeito do `src/`** — o único código do repositório que exercita
hoje o caminho padding-removido é exatamente a linha de teste que o C2 vai corrigir; corrigido o
teste sem corrigir o `src/`, a classe fica sem exercício nenhum e o comentário l.82-85 continua
mentindo com aval de suíte verde. É o risco nº 1 do §7, e a única forma de o evitar é os dois
consertos andarem juntos; (ii) **o teste de regressão que pina a classe (§3-C2) só é determinístico
COM o `src/` corrigido** — sem C1, asserir `false` sobre o stored padding-removido falharia 1 vez a
cada 256: é aritmeticamente impossível entregar o guard da classe sem a correção de `src/`; (iii) a
medição deixou o dono para a junta calibrar ("candidatos naturais, o 4b ou uma pendência própria") e
a junta do 4a não designou — este plano designa o 4b e **paga o preço da designação: o quórum sobe
para unanimidade de 3 (§8)**, porque `authority-password.ts` é caminho de autenticação.

### §3-C1 — `src/modules/authority/authority-password.ts`: keylen deixa de ser função do input

**Ordem: PRIMEIRA correção do bloco** — C2 depende dela (ver (ii) acima).

1. **Rejeição de base64 não-canônico em `parseStored`**: após decodificar `parts[4]` (salt) e
   `parts[5]` (hash), exigir round-trip — `Buffer.from(x,"base64").toString("base64") === x` — e
   devolver `undefined` se falhar. Isso mata o vetor medido (44 chars sem `=` → re-encode devolve com
   `=` → ≠ input → rejeitado ANTES de qualquer scrypt), e não rejeita nenhum stored legítimo:
   `hashPassword` emite `Buffer.toString("base64")`, que é canônico por construção (§4-C1 prova por
   controle, não só por argumento).
2. **Pino do keylen**: o comprimento decodificado do hash deve ser **igual a
   `AUTHORITY_SCRYPT_PARAMS.keylen` (32)**; diferente → `undefined`. O keylen passa a ser constante
   do sistema, nunca derivado do dado (o princípio que a OBS-2 nomeia). Todos os usos no repo são 32
   (§2.12); rotação futura de keylen exigiria versão nova do formato — fora de escopo, dito no
   comentário. `N/r/p` continuam self-describing (a rotação DELES continua possível, como hoje).
3. **Comentário l.82-85 corrigido** para dizer o que o código agora garante — citando a medição
   (1/256 por byte de extensão, medicao-1 §F3) como o motivo de as duas validações existirem.
   Comentário de código não é registro §A2: pode ser reescrito, com data e referência.

**Espelho/referência:** o próprio arquivo (validações fail-closed já existentes em `parseStored`,
l.63-78) — a correção estende o padrão local, não inventa um novo.

### §3-C2 — `tests/authority-portal.test.ts`: o tamper passa a adulterar DADO, e a classe padding ganha guard

**Ordem: junto com C1, mesmo commit** (um sem o outro deixa estado intermediário indefensável).

1. **Corrigir o tamper da l.161** para virar um caractere que carregue **6 bits de dado**: trocar o
   **primeiro** caractere do payload do hash (após o último `$`), `A↔B`. NÃO o último (`=`, padding —
   o defeito atual) e NÃO o penúltimo (em 44 chars de 32 bytes, o 43º char carrega 4 bits de dado + 2
   bits zero de preenchimento; uma troca que só mova os 2 bits baixos decodifica para os MESMOS 32
   bytes e re-flakearia o teste). O comentário do teste explica essa aritmética para o próximo leitor.
2. **Caso NOVO pinando a classe da OBS-1/OBS-2**: stored válido com o `=` final removido/trocado
   exatamente como o tamper antigo fazia (`hash.slice(0,-1)+"A"`) → `verifyPassword` DEVE devolver
   `false` — determinístico com C1 (rejeição canônica), flaky 1/256 sem C1. É o anti-máscara: se
   alguém reverter C1, este caso reprova (em ~766 execuções de CI — e a sonda §4-C1 pega na hora).
3. **Caso NOVO de comprimento**: stored com hash base64 **canônico** de comprimento ≠ 32 bytes (ex.:
   33 bytes bem-encodados) → `false` (pino do keylen). Fecha a outra metade da OBS-2, que a rejeição
   canônica sozinha não cobre.
4. O denominador do arquivo muda (12 → 13-14 conforme a implementação agrupar os casos); o número
   novo é medido por execução e publicado no diário com o porquê (§4-C2).

### §3-C3 — Exclusão dupla do varredor: as DUAS portas fecham juntas (M3-O-1 + M3-O-4)

**Ordem: depois de C1/C2 (independente delas), e as duas portas no MESMO commit** — a medição provou
que uma porta só não muda o comportamento observável (§2.4), e um commit intermediário com meia
correção é exatamente o estado que engana o próximo medidor.

1. **Porta 1 — família registrada:** `"rls_test"` entra em `SWEPT_ROLE_FAMILIES`
   (`tests/helpers/auth-identity-fixture.ts:105-111`). A ancoragem existente (`^` no regex, `LIKE`
   por prefixo) já garante que `vid_rls_test_` e `rls_test_` não se confundem (provado por execução
   na F9 2/2) — nada a mudar nos padrões. O **comentário das l.94-101** (a decisão consciente de
   deixar de fora) é REESCRITO para registrar a decisão NOVA, datada, citando a medição 3 (o preço
   medido da exclusão: 100% de gênese na janela, 0 recolhimentos em 4 oportunidades, 460 grants por
   órfã) e a junta deste bloco — e mantendo a parte que continua verdadeira: o destino das **68 da
   base viva** segue com a junta de `P-ARNES-RLS-TEST-FORA-DO-SWEEP` (§3.0 item 10).
2. **Porta 2 — o criador invoca o sweep:** exportar o varredor do fixture (export direto de
   `sweepOrphanEphemeralRoles` ou wrapper exportado fino; decisão do dev, registrada no diário) e
   `tests/rls-tenant-isolation.test.ts` passa a invocá-lo DENTRO do `withRoleCatalogLock` que já
   detém, antes do `CREATE ROLE` — mesmo desenho de `createEphemeralRole` l.310 (sweep e criação sob
   o mesmo lock). Com isso o chamador único vira dois, e rodar o criador sozinho passa a recolher as
   órfãs velhas da própria família.
3. **Drills do guard estendidos:** nos DOIS testes PD de sweep de `tests/db-catalog-write-guard.test.ts`
   (recolhe-o-que-deve / não-toca-no-que-não-deve), a família `rls_test` entra no laço de famílias
   varridas (órfã sintética retrodatada 2h → recolhida) e o controle de timestamp NOVO passa a valer
   também para ela. Sem test() novo — o laço é interno (§2.12) — o denominador do guard não muda; a
   ancoragem (M3-O-4) fica exercitada permanentemente com a família nova na mesa.
4. **Ratchet do guard atualizado conscientemente:** as edições acima e a C4 mudam contagens de
   padrões de escrita de catálogo por arquivo; cada entrada afetada da `FROZEN_ALLOWLIST` é
   atualizada com o número MEDIDO pelo próprio guard e um motivo no formato do precedente escrito
   ("o DROP ROLE saiu daqui para o teardown resiliente do arnês"). Errar a contagem = guard vermelho
   na bateria — autodetectável.

**Espelho/referência:** o tratamento que as famílias `audit_rls`/`vid_rls_test`/`vid_link_rls`
receberam no B-O6R-ARNES (registro + sweep + drills PD) — a `rls_test_` passa a ser tratada COMO as
irmãs, que era o estado assimétrico que a medição 3 nomeou.

### §3-C4 — Teardown resiliente do `rls_test_` (M3-O-2)

`tests/rls-tenant-isolation.test.ts:3148-3151`: o `DROP OWNED`/`DROP ROLE` cru do `finally` é
substituído por `await dropEphemeralRoleResilient(adminClient, roleName)` — drop-in (§2.12), mesma
semântica de falha alta (role sobrevivente → throw, nunca silêncio). Fecha a terceira porta de gênese
(falha do `DROP OWNED` levando o `DROP ROLE` junto). **Espelho:** `vehicle-identity-schema` e
`impound-process-checklist-link-schema`, cujos DROPs migraram para o helper no B-O6R-ARNES (os
motivos da allowlist do guard registram a migração literalmente).

### §3-C5 — Registro: erratas, apensos e fechamentos (tudo datado, texto original intocado — §A2)

1. **`agent-orchestration/docs/status-geral.md` l.33** — errata E-1 apensa (sentença de
   impossibilidade FALSA, com os 2 contraexemplos executados; as 7 contagens por arquivo CORRETAS) +
   ponteiro para o §V.3 da medição 2 como receita canônica. Origem: medicao-2 §V.2.
2. **`P-ARNES-AUTHORITY-PORTAL-INTERMITENTE`** (`pendencias.md`) — apenso de fechamento: causa
   (1/256, 7 elos, medicao-1 §F3), correção (C1+C2 deste bloco), prova (§4-C1/C2), a lição de método
   da OBS-3 (N por poder, nunca redondo) e a **ressalva herdada por extenso** (§2.9): o 1/2 do jurado
   não fica totalmente explicado; qualquer recorrência da assinatura naquela linha é POR CONSTRUÇÃO
   defeito novo (o caminho 1/256 deixa de existir) e nasce como pendência nova. **FECHA.**
3. **`P-REG-BATERIA-BARATA-DUAS-LISTAS`** — apenso de fechamento: não havia conflito a arbitrar; a
   sentença falsa está corrigida por errata (item 1); B≡C registrado como replicação (M2-O-3); o
   discriminador é a lista NOMEADA do §V.3, não o 37 nem o par. **FECHA** (o diferimento ao 4b está
   escrito na medicao-2 l.497 e no porteiro §7.2).
4. **`P-ARNES-RLS-TEST-FORA-DO-SWEEP`** — apenso (fica **ABERTA**): a família entrou no sweep e o
   criador passou a varrer (C3), o que muda o cálculo da pendência — de agora em diante órfã nova da
   família morre em ≤60 min de qualquer suíte-gatilho (agora 6 gatilhos: os 5 do §2.5 + o criador);
   **as 68 da base viva continuam intocadas e são a decisão que resta** (recontagem supervisionada,
   só SELECT, datável pelo nome — medicao-3 F8.1/O-3); registrar também o risco residual do §7.3
   para a junta dona pesar.
5. **`P-O6R-ARNES-ISOLAMENTO`** — emenda: assinatura 460=115×4 confirmada por mecanismo (M3-O-5),
   armadilha de nomenclatura por substring (M3-O-4), e os denominadores por arquivo/lista medidos
   pela medição 2 (previsto no plano do 4a §5.1 e nunca aplicado — o 4a não tocou `pendencias.md`,
   porteiro §7.2).
6. **`P-SAN2-2-PORTA-55432-RESERVADA`** — apenso de fechamento: o critério dela (consultar `netsh`
   antes de fixar porta, transcrever, escolher fora das faixas) foi executado e transcrito DUAS vezes
   pelo 4a (medicao-2 §T2 e medicao-3 §T2, com a faixa 55353-55452 reproduzida por execução nas
   duas). **FECHA**, citando as duas transcrições. E o apenso de errata de até 5 linhas ao §6 de
   `agent-orchestration/omega/planos/SAN2-2-plano.md` (as linhas do 55432 ganham nota datada
   apontando o netsh) — herdado do plano do 4a §5.1, nunca aplicado.
7. **`agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md`** — apenso datado ao critério
   **D29**: a receita é o **§V.3 da medição 2 — a lista NOMEADA de 6 arquivos** com o par `(6,37)`
   conferido; NÃO o denominador sozinho, NÃO o par sozinho (errata-da-errata E-2/C2-A1). Citar a
   linha literal que o porteiro conferiu no merge (parecer §6.6).
8. **Em cada apenso:** declarar os diários `omega/juntas/votos/SAN2-4a/medicao-*.md` como registro
   canônico das medições (fecha a divergência de caminho registrada nos três diários — §3.0.b).
9. **`agent-orchestration/controle/pendencias-indice.md`** — regenerado por
   `gerar-indice-pendencias.py`, comparação EOL-neutra transcrita; o script NÃO é editado (o defeito
   do falso-sim tem dono próprio, SAN2-5).
10. **`status-geral.md`** — parágrafo curto de estado do bloco (junto da errata do item 1).

### §3-C6 — KPI (dívida dupla do porteiro + entrada do bloco, §C3)

1. **Backfill §C3.5 do #365** na entrada SAN2-4a do `Kpis/kpis-history.json`: `pr 365` ·
   `merge_commit "45c3b97"` · `approved_head "4199b92"` (head julgado da ata J-SAN2-4a l.4; NÃO o
   headRefOid `aa22b7f` — o delta é o pós-voto, 15 arquivos, zero código, medido pelo porteiro
   §4.5). Nota de backfill no history e `release.backfill_note` do `kpis-latest.json` reescrita para
   descrever o backfill do #365 (padrão dos #362/#363/#364).
2. **Entrada NOVA SAN2-4b** (append no history + latest): `blocks_completed` **155** (a condição
   literal da entrada do 4a — "sobe para 155 SO QUANDO ESTE BLOCO MERGEAR" — foi cumprida pelo merge
   do #365), com a mesma condição escrita para o 156; `pr/merge_commit/approved_head` **null na
   autoria** (§C3.5); `backend_tests` de **execução real** (o PR toca a trilha backend — suíte
   completa §6.6; o número novo inclui os testes adicionados); `frontend_smoke_tests 1126/1126`,
   `flutter_tests 864/864` e contratos `34/34` **CARREGADOS com marcador §C3.3** (trilhas não
   tocadas — o diff do §6.10 prova); `mvp_demo 99`/`mvp_vendavel 88` intocados (nenhum escopo
   movido).
3. `node scripts/kpi-freeze.mjs` (grava a linha FROZEN do `Kpis/app.js` — nunca à mão) → `--check`
   ec=0; `tests/kpi-dashboard-charts.test.ts` reexecutado DEPOIS das edições.

## §4 — Como PROVAR cada correção, com o N exigido (derivado do poder, não de número redondo)

> Regra herdada do 4a (OBS-3): para um defeito de 1/256, "ficou verde" não prova nada — P(0 em 40) =
> 85,5%. Cada prova abaixo declara o N, o que o N compra em poder, e onde a prova mora quando o N de
> arquivo é impotente por natureza. Todo número com ec, forma, env, Node e log nomeado (P8).

**§4-C1 (parseStored) — a prova de PODER do bloco. Sonda de scratchpad, forma da F3 do 4a, contra o
`verifyPassword` REAL corrigido (import de `src/`, zero edição pela sonda):**
- **Tamper-padding (o vetor medido): N = 100.000 iterações → exigido 0/100.000 `true`.** Poder: se o
  1/256 persistisse, P(0 em 100.000) = (255/256)^100000 ≈ e^-390 < 10^-169 — refutação praticamente
  certa. (Referência de custo: a E2 do 4a fez 100k em ~4,3 min; a rejeição canônica corta ANTES do
  scrypt, então esta sonda é mais barata.)
- **Controle positivo (anti-regressão de aceitação): 100.000/100.000** — hash gerado por
  `hashPassword` (FAST_PARAMS) verifica `true` em TODAS as iterações. É a prova de que a rejeição
  canônica não rejeita stored legítimo (canônico por construção) — controle, não argumento.
- **Controle negativo: 0/100.000** — senha errada `false` sempre.
- **Malformados das l.164-165: 10.000 cada → 0 `true`, 0 exceções** (paridade com o 4a).
- **Caminho de produção: N = 3** — hash com `AUTHORITY_SCRYPT_PARAMS` (OWASP N=2^17) verifica `true`
  3/3 (o pino de keylen e a rejeição canônica valem para os params reais, não só para os rápidos).
- **Pino de comprimento: N = 1.000** — stored com hash canônico de 33 bytes → `false` 1.000/1.000
  (sem o pino, a taxa esperada seria ~1/256 ≈ 3,9 de aceitação em 1.000; P(0 em 1.000 | 1/256) =
  2,0% — o zero refuta a ausência do pino com 98% de poder; o mecanismo é determinístico, o N=1.000
  é cinto-e-suspensório contra implementação errada do pino).

**§4-C2 (teste corrigido) — regressão, com a impotência do N de arquivo DECLARADA:**
- `node scripts/run-backend-tests.mjs tests/authority-portal.test.ts`, forma F1 do 4a, **N = 30
  execuções → exigido 30/30 ec=0**, denominador novo constante e publicado (12 → 13-14, §3-C2.4).
- **Declaração de poder:** 30 verdes têm poder de só 11,1% contra um residual 1/256 (o número do
  próprio 4a) — este N NÃO é a prova da correção; é regressão de forma e pino de denominador. **A
  prova é a sonda §4-C1** + o fato aritmético de o tamper novo carregar 6 bits de dado (comentado no
  teste). Publicar isso no diário com esta letra, para ninguém ler 30/30 como o que ele não é.

**§4-C3 (sweep, as duas portas) — mecanismo determinístico: o poder vem dos CONTROLES, não do N:**
- **Porta 1, forma F9 do 4a em cluster descartável próprio, N = 2 rodadas** (paridade com o 4a, que
  mediu o estado ANTES como 2/2 sobrevivente): órfã sintética `rls_test_<ts-2h>` → **recolhida 2/2**
  (a inversão exata do resultado do 4a); vermelho-controle `audit_rls_<ts-2h>` recolhida 2/2 (prova
  que o sweep rodou de verdade); contraprova anti-mass-delete: prefixo NÃO registrado sobrevive 2/2;
  controle de execução corrente: `rls_test_<ts-novo>` sobrevive 2/2 (o corte de 60 min protege os
  processos irmãos — a correção não pode matar a role da rodada viva).
- **Porta 2, N = 2:** órfã sintética `rls_test_<ts-2h>` plantada; rodar **o criador SOZINHO**
  (`run-backend-tests.mjs tests/rls-tenant-isolation.test.ts`) → órfã **recolhida 2/2** e o teste
  verde (no 4a, F8.2-S1, ela sobrevivia à passada do criador — inversão provada no chamador novo).
- **Permanente:** os drills PD do guard com a família nova (§3-C3.3) rodam na suíte para sempre —
  a prova não vive só no diário deste bloco.
- **Gênese pós-SIGKILL, dita sem disfarce:** a correção NÃO impede a órfã de nascer (morte de
  processo continua matando o `finally`); ela garante o recolhimento em ≤60 min pela próxima
  passada. A prova usa órfã retrodatada por SQL (forma F9) porque esperar 60 min de relógio não
  acrescenta poder — o corte é comparação de timestamp, exercitada pelos drills nos dois sentidos.

**§4-C4 (teardown resiliente) — leitura + regressão do caminho feliz:**
- Diff conferido (o `finally` chama o helper; nenhum DROP cru sobra no arquivo — grep transcrito).
- **Forma F7 do 4a, N = 10 rodadas** com vaza-metro (snapshot de `pg_roles` antes/depois) → **Δ=0 em
  10/10**, com controle de aparição (poller ~16 Hz vê a role nascer e morrer) em ≥5 rodadas — os
  mesmos números do 4a; regressão exige igualdade.
- **Caminho de falha do `DROP OWNED`: NÃO exercitado aqui, declarado** — a semântica de resiliência
  do helper já é exercitada por `db-catalog-write-guard.test.ts` l.378-441 (injeção de falha), que
  roda na bateria. Mesma honestidade do 4a (F8.4).

**§4-C5 (registro) — prova por leitura + máquina:** grep dos marcadores de errata/apenso (um por
item do §3-C5, com data 2026-08-31/09-01); índice regenerado com comparação EOL-neutra transcrita;
nenhuma linha pré-existente alterada (diff dos arquivos de registro contém só adições — conferido por
`git diff` sem linhas `-` fora de contexto nos blocos apensados).

**§4-C6 (KPI) — prova por parser, não por olho:** `node -e` lê os dois JSONs e assere: entrada
SAN2-4a com `pr 365`/`merge_commit "45c3b97"`/`approved_head "4199b92"`; entrada SAN2-4b com 3 nulls
e `blocks_completed 155`; latest coerente. Depois `kpi-freeze --check` ec=0, `node --check
Kpis/app.js` ec=0, `kpi-dashboard-charts` verde reexecutado pós-edição.

**§4-INV (invariante do ciclo 5, protegido por prova):** a lista-6 do §V.3, **N = 3 rodadas** →
`(6 arquivos, 37 testes)` idêntico 3/3, ec=0. As correções C3/C4 tocam dois membros da lista
(`rls-tenant-isolation`, e o fixture que todos importam) sem criar nem remover test() — o denominador
que o D29 vai consumir **não pode se mover**; se mover, é achado que PARA o bloco antes do PR (a
comparabilidade com o vermelho-controle histórico 5/13-7/13 morreria junto — medicao-2 §V.3).

## §5 — Escopo (caminhos exatos)

### 5.1 Permitido (lista fechada; fora dela = fora do bloco)

**Código (cirúrgico, um arquivo por correção):**
- `src/modules/authority/authority-password.ts` — SOMENTE `parseStored` + comentário l.82-85 (C1).
- `tests/authority-portal.test.ts` — tamper l.161 + casos novos da classe (C2).
- `tests/helpers/auth-identity-fixture.ts` — `SWEPT_ROLE_FAMILIES` + comentário l.94-101 + export do
  varredor (C3.1/C3.2). O corpo de `sweepOrphanEphemeralRoles`, o regex, o corte de 60 min e
  `dropEphemeralRoleResilient` NÃO mudam.
- `tests/rls-tenant-isolation.test.ts` — invocação do sweep sob o lock existente (C3.2) + teardown
  resiliente (C4). O corpo do teste RLS em si não muda.
- `tests/db-catalog-write-guard.test.ts` — família nova nos dois drills PD + entradas afetadas da
  `FROZEN_ALLOWLIST` com contagem medida e motivo (C3.3/C3.4). Nenhum test() novo, nenhum removido.

**Registro/KPI (§3-C5/C6):** `agent-orchestration/controle/pendencias.md` ·
`agent-orchestration/controle/pendencias-indice.md` (regenerado) ·
`agent-orchestration/docs/status-geral.md` · `agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md`
(apenso D29) · `agent-orchestration/omega/planos/SAN2-2-plano.md` (apenso ≤5 linhas) ·
`agent-orchestration/omega/planos/SAN2-4b-plano.md` (este arquivo) · `Kpis/kpis-history.json` ·
`Kpis/kpis-latest.json` · `Kpis/app.js` (SOMENTE a linha FROZEN, via script) ·
`agent-orchestration/omega/juntas/**` (briefing/votos/ata/pareceres desta junta, pelos papéis dela) ·
diário do dev em `agent-orchestration/omega/juntas/votos/SAN2-4b/` (evidência incremental,
`D-JUNTA-RESILIENTE`) · scratchpad da sessão (sondas §4 e logs; morre com o bloco).

### 5.2 PROIBIDO (com o porquê escrito)

- **`erp-postgres`/`erp-redis`: nenhum comando, nem leitura.** As 68 órfãs vivas são da junta de
  `P-ARNES-RLS-TEST-FORA-DO-SWEEP` (§3.0 item 10). Toda `DATABASE_URL`/`REDIS_URL` deste bloco é env
  explícita para cluster descartável `san2-4b-*` — jamais herdada de `.env`.
- **Qualquer arquivo de código fora dos 5 listados** — em particular: os outros 4 gatilhos do sweep
  (`auth-identity-backfill-db`, `auth-identity-link-events-db`, `auth-identity-role-real-db`,
  `auth-login-candidates-fn-db`), `scripts/**` (o runner e o `kpi-freeze` são EXECUTADOS, nunca
  editados), `prisma/**`, `migrations/**`, `.github/**`, `frontend/**`, `mobile/**`, `portals/**`,
  `package.json`, `package-lock.json`, `.claude/agents/**`, `.agents/**`, `infra/**`, `.env`.
  Correção que "aproveitaria" para melhorar outra coisa é a classe que a `D-JUNTA-SEPARACAO-DE-PAPEIS`
  existe para impedir.
- **Reescrever registro:** nenhuma linha existente de `pendencias.md`/`status-geral.md`/planos alheios
  é apagada ou alterada — só apenso/errata datados (§A2). (Comentário de CÓDIGO nos arquivos
  permitidos pode ser reescrito — código não é registro.)
- **Mass-delete em qualquer base** — teardown só escopado por nome exato ou containers `san2-4b-*`
  (o incidente de 26/07 é a regra; o sweep corrigido é allowlist ancorada + corte de idade, e os
  drills provam as duas contraprovas).
- **Junction/symlink de `node_modules` entre worktrees** (26/08) — este worktree tem `npm ci` próprio.
- **Porta sem consulta ao `netsh`** (§3.0.1 do plano do 4a, herdado) · **medir commit com
  `git archive`+`tar` sob autocrlf** · **comparar regenerados com md5 cru** — só EOL-neutro.
- **`demo/investidor` e qualquer outra branch: intocadas.** Nenhum commit fora de
  `fix/san2-4b-corrigir-arnes`.

## §6 — Bateria de validação (na ordem; ec registrado um a um no diário)

0. **Baseline de abertura (antes de editar):** denominadores por execução dos 5 arquivos de código
   tocados + `kpi-dashboard-charts` (§1.6); `netsh interface ipv4 show excludedportrange
   protocol=tcp` transcrito; portas escolhidas fora das faixas (preferência 56432/56379); cluster
   `san2-4b-pg` (postgres:16) + `san2-4b-redis` sobem; `npx prisma migrate deploy` ec=0 com **103**
   migrations conferidas por SELECT.
1. `npm run check` · `npm run lint` — ec=0.
2. **Sonda §4-C1** (100k + controles + OWASP N=3 + pino N=1.000) — todos os exigidos batidos.
3. **§4-C2**: authority-portal N=30, 30/30, denominador novo pinado.
4. **§4-C3**: porta 1 (F9-forma, N=2, 4 exigências) e porta 2 (criador sozinho, N=2) no cluster
   descartável.
5. **§4-C4**: F7-forma N=10, Δ=0 10/10, controle de aparição ≥5/5.
6. **Suíte completa**: `npm test` com `DATABASE_URL`/`REDIS_URL` → `san2-4b-*` (nunca a base viva) —
   verde, número novo de `backend_tests` registrado (execução real, §3-C6.2); `npm run build` ec=0.
   As 5 suítes-gatilho do sweep passam dentro dela (regressão dos 8 call-sites).
7. **§4-INV**: lista-6 do §V.3, N=3 → `(6,37)` idêntico 3/3.
8. **KPI (§4-C6)**: editar JSONs → `kpi-freeze` → `--check` ec=0 → `node --check Kpis/app.js` ec=0 →
   `kpi-dashboard-charts` verde → parser `node -e` do backfill/155/nulls.
9. **Registro (§4-C5)**: índice regenerado EOL-neutro; grep dos marcadores; diff só-adição nos
   arquivos de registro.
10. **Escopo**: `git diff --name-only main...HEAD` ⊆ lista do §5.1 (transcrito); `git diff --check`
    limpo; `node scripts/sync-agent-agents.mjs --check` ec=0 (fatia S0 — o bloco não toca agentes).
11. **Teardown**: `docker rm -f san2-4b-pg san2-4b-redis`; `docker ps` transcrito sem `san2-4b-*` e
    com `erp-postgres`/`erp-redis` de uptime contínuo; linha de limpeza §C5 no fechamento do PR.

## §7 — Riscos e rollback

1. **Consertar o teste e MASCARAR o defeito do `src/` — o risco nº 1, por desenho.** Se C2 entrar sem
   C1, o único exercício vivo da classe padding morre junto com o conserto, e a suíte verde passa a
   atestar um `src/` que aceita extensão-em-comprimento a 1/256. Mitigação tripla: ordem obrigatória
   (C1 primeiro, mesmo commit que C2 — §3-C1/C2); o caso novo do §3-C2.2, que é determinístico só com
   C1 presente (reverter C1 o re-flakeia); e a sonda §4-C1, cujo 0/100.000 tem poder ~1 contra o
   residual. O jurado que encontrar C2 sem C1 no diff reprova por desenho, não por gosto.
2. **C1 rejeitar stored legítimo (quebrar login real).** Argumento: `hashPassword` sempre emitiu
   base64 canônico com keylen 32 — não existe stored legítimo não-canônico para rejeitar. Mas
   argumento não é prova: os controles positivos do §4-C1 (100.000/100.000 FAST + 3/3 OWASP) e a
   suíte completa (§6.6, inclui `authority-credential`, `authority-portal-rls` e todo o caminho de
   auth) são a prova. Risco residual: stored ESCRITO À MÃO fora do `hashPassword` em alguma base —
   nenhum mecanismo do repo o produz; declarado, não coberto.
3. **C3 e as 68 da base viva.** Registrar a família no sweep NÃO toca a base viva neste bloco (nenhum
   comando, §5.2). O risco residual é FUTURO: uma violação de `DATABASE_URL` que aponte uma
   suíte-gatilho para `erp-postgres` varreria as 68 (>60 min) antes de a junta datá-las/contá-las —
   perda de evidência, não de dado de produto (roles de arnês; a datação vive nos NOMES e a
   recontagem lista nome+data). Esse mesmo vetor de violação já varreria hoje as outras 5 famílias:
   a correção não cria o vetor, iguala a `rls_test_` às irmãs. O trade-off vai por escrito no apenso
   (§3-C5.4) e a cadeira de catálogo da junta o pesa com o quórum de unanimidade; se a junta preferir
   sequenciar (recontagem antes do registro da família), o voto dela o diz e o ciclo 2 reordena.
4. **Ratchet do guard errado** → guard vermelho na própria bateria (autodetectável, §3-C3.4). Errar o
   motivo (prosa) é o que a cadeira de escopo confere.
5. **Denominador da lista-6 se mover** → §4-INV detecta e PARA o bloco antes do PR (o D29 do ciclo 5
   depende do `(6,37)`).
6. **Queda de agente por `server_error`** (14 quedas em ~28 disparos na rodada — postmortem de
   29/08): plano já em disco seção a seção; o dev grava diário incremental em `votos/SAN2-4b/` a cada
   forma concluída (`D-JUNTA-RESILIENTE`); sucessor re-executa a forma interrompida inteira (N por
   forma, nunca metade herdada).
7. **Disco** (18 GB livres no parecer do porteiro): um postgres:16 + logs cabem; abaixo de ~10 GB,
   `DEEP_CLEAN=1 bash scripts/post-merge-cleanup.sh` antes de prosseguir (§C5).
8. **Teto de dois ciclos** (`D-TETO-DOIS-CICLOS`): reprovado no ciclo 2 → PARA e dossiê ao dono; a
   fábrica cria especialista DENTRO dos dois ciclos se a reprovação exigir competência nova; quem
   achar não conserta (§C7.4-bis), e o replanejamento volta a um `planejador-mestre` em Fable
   (obrigatório na revalidação — `D-PLANEJADOR-MODELO-FABLE`).
9. **Rollback: trivial e total.** Sem migration, sem mudança de formato armazenado, sem dependência
   nova, base viva jamais tocada: reverter = fechar o PR sem merge e apagar a branch (ou `git revert`
   do squash se já mergeado — as validações de C1 são aditivas e reversíveis byte a byte; o sweep
   volta ao estado anterior removendo a família da lista).

## §8 — Junta e quórum, sob `D-JUNTA-ESCOPO-E-CALIBRACAO`

**Quórum decidido: UNANIMIDADE DE 3.** Argumento: o §C7.1-ter(b) manda unanimidade-3 quando o bloco
toca **dinheiro, segurança, permissão ou perda de dado** — e este bloco toca DOIS dos quatro: (i)
`authority-password.ts` é primitivo de autenticação (`verifyPassword` muda de comportamento para
entradas não-canônicas — segurança, literal); (ii) o sweep derruba roles (classe perda-de-dado/
mass-delete, ainda que confinada a famílias de arnês com allowlist ancorada + contraprovas). O
precedente maioria-3 do 4a não se transfere: lá o diff de código era vazio por construção; aqui é o
contrário. NÃO é unanimidade-5: nada de produção, dependência nova ou serviço pago. O
`critico-adversarial` NÃO é convocado — regra literal do 1-ter(b), crítico só em bloco de invariante
(financeiro), e a cadeira de segurança cobre o ataque técnico ao C1.

**Composição (3 cadeiras, identidades elegíveis conferidas por nome contra
`OBITUARIO-IDENTIDADES.md` pelo inspetor):**
1. **Segurança/cripto** — julga C1/C2 e §4-C1/C2: a aritmética do base64 (inclusive o porquê de o
   penúltimo char não servir de tamper), o pino do keylen, os controles, e se o poder declarado
   sustenta as conclusões. Ataca a correção como um adversário do parse.
2. **Catálogo/Postgres** — julga C3/C4 e §4-C3/C4/INV em cluster descartável PRÓPRIO: as duas
   portas, os drills, o ratchet, o trade-off das 68 (risco §7.3), o `(6,37)` intacto. **Não pode ser**
   `jurado-c5-arnes-catalogo-postgres` nem `critico-c5-adversarial` (RESERVADAS à junta do ciclo 5 —
   obituário; queimá-las aqui desmontaria a composição do próximo bloco).
3. **Escopo/KPI/registro** — julga §5 (diff ⊆ lista fechada, nenhum conserto extra), §3-C5 (apensos
   só-adição, fechamentos com lastro), §3-C6 (backfill 365/45c3b97/4199b92 conferido por parser,
   155 com condição escrita), §1.6 (baseline/M≥2N) e a separação de papéis do ciclo.

**Regras do rito:** inspetor de terreno ANTES (fail-closed, §C7.1-bis — worktree limpo, S0 verde,
cluster do dev morto antes do voto, baseline honesto, plano de perda de jurado); protocolo resiliente
(`PROTOCOLO-JUNTA-RESILIENTE.md`: mandato ≤3 itens, evidência incremental, voto em arquivo antes da
mensagem final, máx 2 disparos paralelos, `00-quedas.md`); todo voto declara `gravidade` E `escopo`
com evidência de data/origem (1-ter(a)) — defeito que anteceda o bloco e esteja fora do §5.1 é
`pre-existente` → pendência nomeada com dono, não reprovação; o veto inteiro vale para o que o bloco
mexeu. Registro em `J-SAN2-4b.md` + `votos/SAN2-4b/`; a ata consigna o **head julgado** — é ele que o
backfill §C3.5 do próximo bloco usa, não o headRefOid (lição dos #362-#365).

**Papéis do ciclo (§C7.4-bis), nomeados:** planejador = esta instância (`planejador-mestre` Fable;
não desenvolve, não vota); achadores = as instâncias `dev-san2-4a` das 3 medições + cadeiras
C1/C2/C3 da J-SAN2-4a (nenhum deles desenvolve nem julga este bloco); dev = identidade nova designada
pelo orquestrador; jurados = terceiros. Em reprovação: quem achou não conserta; correção volta por
plano novo deste papel em Fable.

---

**Fecho.** O 4a comprou, com três medições e uma junta, o direito de este bloco ser pequeno: cinco
arquivos de código, cada linha com uma observação-mãe, cada correção com um N que significa alguma
coisa. O que este plano mais protege é a assimetria que o justifica — o teste que vai ficar verde
não pode ser a única testemunha do `src/` que o deixava passar.
