# BRIEFING — junta do bloco SAN2-4b (PR #366)

**Head julgado:** `2d2d16d` · **CI:** 7/7 verde (run 33435953434) · **Terreno:** `LIBERADO COM RESSALVA`
(R1 = este briefing, **vinculante** · R2 = o 20º arquivo do diff, cadeira C3 · R3 = suíte completa, cadeira C2).

**Quórum: UNANIMIDADE de 3.** Este é o **primeiro bloco da rodada que toca PRODUTO** — altera `src/` e
`tests/`, e a classe é **segurança + perda de dado** (§C7.1-ter). O precedente de maioria dos blocos
anteriores **não se transfere**: lá o diff de código era vazio.

## 1. O que o bloco corrige, e por que a prova é por VERMELHO-CONTROLE

O **SAN2-4a** (#365) mediu **sem consertar**. Este bloco fecha **11 das 12 observações**, e cada correção
foi provada mostrando que a sonda **detecta o defeito antes** de declará-lo ausente. É o padrão que a junta
deve exigir: **"ficou verde" não prova nada** — o próprio 4a mediu que P(0 falhas em 40) = **85,5%** com o
defeito presente, e que seriam **~766 execuções** para 95% de poder.

**C1 — `src/modules/authority/authority-password.ts`:** `parseStored` derivava o `keylen` do stored
**RECEBIDO** — o tamanho da chave era função do dado de entrada, contra o comentário do próprio código.
Vermelho-controle: **79/20.000** e **18/5.000** sem a correção → **0/100.000** com ela; 100.000/100.000 no
controle positivo; 3/3 OWASP.

**C2 — `tests/authority-portal.test.ts:161`:** o tamper **nunca via o `"A"`** (o hash sempre termina em `=`)
— trocava o **padding**, não o dado, e os 32 bytes originais chegavam **intactos** ao verificador. O teste
"senha adulterada é rejeitada" **passava sem nunca adulterar a senha**. Agora troca o 1º char do payload,
mais **2 guards permanentes**. Denominador **12 → 14**. Vermelho: **30/30** contra o `src/` sem a C1 → verdes
com ela.
**O achado que justifica o método:** no vermelho, `# pass 12` — o tamper corrigido **passou** contra o `src/`
defeituoso. **Se a C2 tivesse feito só a troca do caractere, a detecção da classe cairia para ZERO** — pior
que os 1/256 de antes. Quem dá detecção são os 2 guards.

**C3 — as DUAS portas do varredor.** `rls_test_` fora de `SWEPT_ROLE_FAMILIES` **e**
`sweepOrphanEphemeralRoles` com chamador único que o criador nunca invocava. Vermelho mediu as duas
**separadamente**; e, **mutando uma metade de cada vez**, M1 e M2 deixam o alvo vivo **2/2 cada**, falhando
por **motivos diferentes** — quem fechasse uma porta e medisse só o controle teria visto **verde em M1**.

**C4 — teardown resiliente.** Sob a mesma falha injetada: forma crua **10/10 órfãs** (460 grants cada, a
órfã do 4a reproduzida dez vezes) × `dropEphemeralRoleResilient` **0/10**.

**C5 — registro:** 3 pendências fechadas pelo critério que elas mesmas declaravam; 3 abertas com severidade
**"a classificar"** (não se carimba o que não se mediu). **ABERTAS fica em 187**, dito para não ser lido como
estagnação.

**C6 — KPI medido, não carregado:** **2609/2611** na canônica 3; delta **+2** com causa conferida dos dois
lados (`authority-portal` 12→14, constante em N=3). `blocks_completed` **155**. Backfill do #365
(`45c3b97`/`4199b92`, head da **ata**). Guard do freeze provado **nos dois sentidos** (ec=0 → **ec=1** → ec=0).

## 2. As três cadeiras (identidades NOVAS, UNANIMIDADE)

- **C1 — `auditor-da-correcao-de-produto`.** O `parseStored` corrigido resolve **a causa**, não o sintoma?
  **Reexecute o vermelho-controle** (sem a correção a sonda tem de acusar). O pino de `keylen` fecha a classe?
  E o **teste morde**: rode-o contra o `src/` sem a C1 e confirme que **falha**, e que as 2 falhas são os
  guards novos.
- **C2 — `auditor-do-arnes-e-da-suite`.** As **duas portas** estão fechadas **no código** (leia
  `SWEPT_ROLE_FAMILIES` **e** os chamadores de `sweepOrphanEphemeralRoles`)? Reexecute a **mutação de uma
  metade de cada vez**. O teardown resiliente elimina a órfã (0/10)? E a **suíte completa** (R3 do inspetor):
  **2609/2611** reproduz na canônica 3, com o delta +2 explicado?
- **C3 — `zelador-do-escopo-do-registro-e-do-kpi`.** O diff (**20 arquivos**, R2 do inspetor) cabe no §5.1?
  As 3 pendências fecharam **pela linha de status**, não por cabeçalho? As 3 novas têm severidade honesta?
  O backfill `365`/`45c3b97`/**`4199b92`** é o head da **ata**, não o do GitHub? `blocks_completed` **155**,
  `mvp_*` intocados, nulls na autoria, e o **guard do freeze mordeu**?

## 3. O que atacar com mais força

- **Correção que mascara em vez de consertar.** É o risco §7 do plano. A C2 **já provou** que a correção
  parcial pioraria — procure o análogo nas outras.
- **Conclusão além da medição.** Foi o defeito recorrente do 4a, pego em 3 das 3 cadeiras. Onde o número não
  derivar do método declarado, é achado.
- **Mutação que não muta.** O dev registrou que a **primeira tentativa da C3 não pegou (CRLF)** e que ele
  **descartou as duas rodadas verdes**. Confirme que a mutação final **realmente muta**.
- **O 68 permanece CARREGADO** — recontá-lo exigiria a base viva, que é intocável. Está declarado como não
  remedido, ou alguém o apresentou como medido?

## 4. Armadilhas que fabricam achado FALSO

- **`md5sum` e `git status` mentem sob `core.autocrlf=true`** — meça eol-neutro (`git diff --exit-code`).
- **`grep -c $'\r'` é inútil** no Git Bash desta máquina.
- **O índice de pendências não muda** ao regenerar — é `P-SAN2-2-INDICE-DONO-SEMPRE-SIM`, não defasagem.
- **`erp-postgres`/`erp-redis` são INTOCÁVEIS**, nem para leitura. O uptime **`Up 2 days`** atravessou o bloco
  inteiro e é a prova de que ninguém os tocou — **preserve**. Cluster descartável em **56432+** (nunca 55432).
- **Sem mass-delete ad-hoc** — houve incidente neste repo. Teardown escopado a nome exato.

## 5. Inelegibilidade

Identidades **novas**. Confira contra o `OBITUARIO-IDENTIDADES.md` **e** as atas — **ausência do nome no
obituário NÃO absolve** (cobertura parcial, `P-OBITUARIO-DERIVADO-DO-DIRETORIO`). Inelegíveis também:
orquestrador, `planejador-mestre` do bloco, `dev-san2-4b`, o inspetor desta junta e o `porteiro-pos-merge`
do #365.

## 6. Protocolo (P1–P6) — colar no mandato de cada cadeira

```
Crie <cadeira>-voto.json PRIMEIRO, itens marcados EM APURAÇÃO, e preencha cada um ao medir.   [P2+]
Após CADA item: apense a <cadeira>-evidencia.md → comando · saída · veredito parcial.          [P1]
Item grande também se fatia: onde medir tem N passos, gravar tem de ter N passos.
Mensagem final = 1 linha. Máx 3 itens por cadeira.                                             [P4]
Sucessor re-executa os comandos registrados do caído; conclusão sem comando NÃO é insumo.      [P3]
Achado declara `gravidade` E `escopo` COM evidência de data/origem.                     [§C7.1-ter]
"Não consigo medir" = REPROVADO. Você não propõe correção.                              [§C7.4-bis]
```

**UNANIMIDADE: o voto de qualquer cadeira reprova o bloco.** Afirmação de ata anterior é **"a re-verificar"**,
nunca fato herdado.
