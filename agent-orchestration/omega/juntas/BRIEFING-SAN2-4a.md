# BRIEFING — junta do bloco SAN2-4a (PR #365)

**Head julgado:** `4199b92` · **CI:** verde no head anterior (`83d0366`); reconfira · **Terreno:** `LIBERADO COM RESSALVA` (R1 = este briefing; R2 = diário untracked, **já persistido em `4199b92`**; R3 = worktree inerte do ciclo 5; R4 = fatos de KPI/§5.1 endereçados à cadeira 3).
**Quórum: MAIORIA de 3** (§8 do plano) — **diff de código VAZIO por construção**; o bloco só mede.

## 1. A natureza do bloco — e é o primeiro item a julgar

O SAN2-4 foi partido em **4a (MEDIR)** e **4b (CORRIGIR)**. **Este PR não conserta nada.** Se houver conserto escondido no diff, a junta está julgando outra coisa e o padrão 4a/4b existe só no papel. O inspetor já verificou (diff de código vazio nas duas pontas) — **a junta reverifica por conta própria.**

O bloco deixa **12 observações nomeadas** para o 4b — **11 delas com dono** —, e **nenhum defeito de produto** foi encontrado. *(Corrigido de "11" em `2026-08-31`; a contagem antiga vinha sem derivação. Ver a **errata E-B1** no §8.)*

**De onde sai a contagem** (por **rótulo distinto** nos três diários de medição, contado, não lembrado):

| Diário | Rótulos | Subtotal | Com dono nomeado |
|---|---|---|---|
| medição 1 | `OBS-1` `OBS-2` `OBS-3` | **3** | **2** — `OBS-1` → SAN2-4b; `OBS-2` → *"a junta do SAN2-4a designa"*; `OBS-3` **sem dono** |
| medição 2 | `O-1` `O-2` `O-3` `O-4` | **4** | **4** — tabela *"Sugestão de dono"* |
| medição 3 | `O-1` `O-2` `O-3` `O-4` `O-5` | **5** | **5** — coluna *"Dono sugerido"* |
| **Total** | | **3+4+5 = 12** | **2+4+5 = 11** |

A 12ª — `OBS-3` da medição 1 — é **nota de método sem dono**: *"N=10 tem 96,2 % de chance de sair verde com o defeito presente … o critério de N da pendência era, ele próprio, cego para a classe de defeito que ela perseguia"*. **As duas contagens são verdadeiras e medem coisas diferentes**; o que faltava era dizer **qual** delas o briefing publicava.

## 2. As três medições

**M1 — a intermitência do `authority-portal` é `1/256`.** Causa isolada byte a byte: o tamper de `tests/authority-portal.test.ts:161` nunca vê o `"A"` (o hash sempre termina em `=`), troca o **padding**, e o payload vira 33 bytes com os 32 originais **intactos**; `parseStored` re-deriva com `keylen=33` e o `timingSafeEqual` passa quando o 33º byte é zero. **Previsão bateu com o `verifyPassword` real em 20.000/20.000.** Medido **390/100.000 = 0,390%** (1/256 = 0,3906%).
Os verdes **F1 0/30** e **F2 0/10** (contenção provada, **+48,0% a +73,5%** de duração — pareamento **mín↔mín / máx↔máx**; o "+78%" que este briefing repetia da M1 foi retirado pela **errata E-1** do `medicao-1-authority-portal.md`, §8) **não provam nada**: P(0 em 40) = **85,5%**; ~766 execuções para 95% de poder. E **não refutam** o vermelho original 1/2 — forma diferente (suíte inteira, outra máquina).

**M2 — o denominador 37 não identifica a lista.** Três registros, **duas** listas; **ambas fecham 37** (`1+6+5+10+5+1+9` e `1+6+15+1+9+5`), unidas por `link-events(5)+role-real(10) == links(15)`. **Partições do mesmo total, não contradição** — o errado era a *descrição* da pendência. O critério do **D29** é **sozinho insuficiente**; o discriminador é o par **`(arquivos, testes)`**, que o runner já imprime. A sentença "nenhuma combinação de 6 fecha 37" é **falsa por contraexemplo executado**.

**M3 — a exclusão do varredor é DUPLA.** Criador único (`tests/rls-tenant-isolation.test.ts:25`); além de `rls_test_` estar fora de `SWEPT_ROLE_FAMILIES`, `sweepOrphanEphemeralRoles` tem **um único chamador que o criador nunca invoca** — fechar uma porta não resolve. Janela de exposição **~70% do tempo de vida do processo**. **5/5 órfãs** com assinatura idêntica (**460 privilégios = 115 tabelas × 4**) que **bate com a assinatura da pendência**, ligando o mecanismo às 68 **sem contá-las**; o timestamp do nome **data** cada uma. Idade **descartada** (retrodatada 2h sobreviveu a 4 oportunidades, 0 recolhimentos).

## 3. As três cadeiras (identidades NOVAS, maioria de 3)

- **C1 — `auditor-da-medicao-1`.** A causa 1/256 se sustenta? **Reproduza** a aritmética (33º byte zero) e confira a previsão × real. O cálculo de poder (P(0 em 40)=85,5%) está certo? E a ressalva de que F1/F2 **não refutam** o 1/2 foi mantida sem suavizar?
- **C2 — `auditor-das-medicoes-2-e-3`.** As duas listas fecham 37 **por execução própria**? O par `(arquivos, testes)` discrimina de fato? A exclusão dupla do varredor existe **no código** (leia `SWEPT_ROLE_FAMILIES` e os chamadores de `sweepOrphanEphemeralRoles`)? A assinatura 460/115 bate com a pendência?
- **C3 — `zelador-do-escopo-e-do-kpi`.** **Diff de código VAZIO** (reverifique)? Os 8+ arquivos cabem no §5? O backfill `364`/`c9fd3a1`/`23d9227` está certo (**head da ata**, não o do GitHub)? `blocks_completed` **154** e o **guard do freeze mordeu** (exit 1 antes, 0 depois)? Métricas de teste **intocadas**? E as **12 observações** (11 com dono — derivação no §1) estão nomeadas para o 4b, sem conserto?

## 4. O que atacar com mais força

- **Conserto escondido.** É a única forma de este bloco ser fraude: medir e consertar junto.
- **Número sem N e forma.** O padrão do bloco é alto; onde ele cair, é achado.
- **O 68 CARREGADO.** Está declarado como não-remedido, ou alguém o apresentou como medido?
- **Duas falhas de instrumento** (M3): `$!` do Git Bash não é PID do Windows (teria publicado **"0/5 órfãs" falso**) e a corrida de ~11 ms. Foram publicadas — confirme que estão lá e não maquiadas.

## 5. Armadilhas que fabricam achado FALSO

- **`md5sum` e `git status` mentem sob `core.autocrlf=true`** — meça eol-neutro (`git diff --exit-code`).
- **`grep -c $'\r'` é inútil** no Git Bash desta máquina.
- **O índice de pendências não muda** ao ser regenerado — é `P-SAN2-2-INDICE-DONO-SEMPRE-SIM`, **não** defasagem.
- **`erp-postgres`/`erp-redis` são INTOCÁVEIS**, nem para leitura. O uptime `Up 2 days` atravessa o bloco e é a prova de que ninguém os tocou — **preserve isso**.

## 6. Inelegibilidade

Identidades **novas**. Confira contra o **`OBITUARIO-IDENTIDADES.md`** — mas **ausência do nome NÃO absolve** (cobertura parcial declarada, `P-OBITUARIO-DERIVADO-DO-DIRETORIO`): o `grep` nas atas segue obrigatório. Inelegíveis também: orquestrador, `planejador-mestre` do bloco, `dev-san2-4a`, o inspetor desta junta e o `porteiro-pos-merge` do #364.

## 7. Protocolo (P1–P6) — colar no mandato de cada cadeira

```
Crie <cadeira>-voto.json PRIMEIRO, itens marcados EM APURAÇÃO, e preencha cada um ao medir.   [P2+]
Após CADA item: apense a <cadeira>-evidencia.md → comando · saída · veredito parcial.          [P1]
Item grande também se fatia: onde medir tem N passos, gravar tem de ter N passos.
Mensagem final = 1 linha. Máx 3 itens por cadeira.                                             [P4]
Sucessor re-executa os comandos registrados do caído; conclusão sem comando NÃO é insumo.      [P3]
Achado declara `gravidade` E `escopo` COM evidência de data/origem.                     [§C7.1-ter]
"Não consigo medir" = REPROVADO. Você não propõe correção.                              [§C7.4-bis]
```

**Perda de jurado (P5/P6):** máx 2 cadeiras em paralelo; 2 quedas em <30 min → pausa; toda queda vira linha em `votos/SAN2-4a/00-quedas.md`. A junta do SAN2-3 custou **5 disparos para 3 cadeiras com 2 quedas e ZERO votos perdidos** — porque o voto nascia como esqueleto.

**Afirmação de ata anterior é "a re-verificar", nunca fato herdado.**

---

## 8. ⚠ E-B1 · ERRATA do orquestrador — as "11 observações" sem derivação

> **Datada `2026-08-31`, pós-junta do PR #365** (APROVADO 3×0) · achado da cadeira **C3**
> (`zelador-do-escopo-e-do-kpi`), registrado no seu voto como `alvo_extra_da_C1.analogo_na_minha_area`,
> gravidade `baixa`, escopo **`pre-existente / fora do bloco`** — o defeito é **deste briefing**, que é
> insumo da junta, **untracked** e **fora do diff do PR**; não é do bloco SAN2-4a. Corrigida por agente
> que **não** a achou (§C7.4-bis). **Aponho — não reescrevo em silêncio** (§A2).

**As frases retiradas, na íntegra:**

- §1: *"O bloco deixa **11 observações nomeadas** para o 4b, e **nenhum defeito de produto** foi encontrado."*
- §3, mandato da C3: *"E as **11 observações** estão nomeadas para o 4b, sem conserto?"*

**O defeito:** o `11` foi publicado **duas vezes, como se fosse a contagem**, e **não deriva de nada
registrado**. A C3 contou por rótulo distinto e achou **12**; `grep "11 observ|onze observ|11 achado"`
nos três diários e no plano volta **vazio** — o número nasceu aqui, no briefing, e em lugar nenhum
mais. Pior que estar errado: o `11` **fecha** — mas só sob uma regra **tácita** ("as que têm dono
nomeado") que **ninguém escreveu**. Um número que fecha por acidente é mais perigoso que um que não
fecha, porque não convida à conferência.

**A correção aplicada:** o §1 passa a publicar **12 (11 com dono)** e traz a **tabela de derivação**
— `3 + 4 + 5 = 12` por rótulo, `2 + 4 + 5 = 11` por dono — nomeando de onde vem cada parcela (a coluna
"Sugestão de dono" da M2, a "Dono sugerido" da M3, e as duas atribuições da M1) e **qual** é a 12ª
(`OBS-3` da M1, nota de método sem dono). O mandato da C3 no §3 passa a citar as duas contagens. O
briefing deixa de publicar número sem derivação — que é a mesma classe do achado **C1-A1** (o `+78 %`)
que esta rodada corrigiu na M1, e por isso a **terceira** ocorrência da classe foi corrigida junto: o
§2 repetia o `+48 % a +78 %` herdado da M1 e agora diz **`+48,0 % a +73,5 %`** com o pareamento
declarado, apontando para a errata **E-1** do `medicao-1-authority-portal.md`.

**O que a errata NÃO move:** **nada do veredito**. A C3 é explícita — *"Nada falso no bloco"* —, os três
itens do seu mandato foram medidos e **aprovados**, e o `12` só torna a frase **mais** favorável ao
bloco (uma observação a mais nomeada para o 4b, não uma a menos). Nenhuma cadeira votou com base neste
número, e a própria C3 corrigiu **o denominador do seu próprio mandato** ao medir.

**Dono da classe daqui para frente:** a próxima passada do `inspetor-de-terreno-da-junta` — número
publicado em briefing **sem derivação registrada** é insumo defeituoso, e o §C7.1-bis já o obriga a
conferir os insumos antes de a junta começar.
