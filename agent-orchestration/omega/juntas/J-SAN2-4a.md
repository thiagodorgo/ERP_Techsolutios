# J-SAN2-4a — ata da junta do bloco SAN2-4a (PR #365)

> **Quórum:** MAIORIA de 3 (§8 do plano — diff de código **vazio por construção**; o bloco só mede).
> **Head julgado:** `4199b92` · **Terreno:** `LIBERADO COM RESSALVA` (R1 briefing · R2 diário untracked,
> persistido em `4199b92` · R3 worktree inerte do ciclo 5 · R4 fatos de KPI endereçados à C3).

## Votos

| Cadeira | Veredito | Achados |
|---|---|---|
| **C1 — `auditor-da-medicao-1`** | **APROVADO** | 1 · BAIXA / `dentro-do-bloco` |
| **C2 — `auditor-das-medicoes-2-e-3`** | **APROVADO** | 2 · atenção / `dentro-do-bloco` |
| **C3 — `zelador-do-escopo-e-do-kpi`** | **APROVADO** | 2 · MÉDIA e BAIXA / `dentro-do-bloco` |

**RESULTADO: APROVADO 3×0.** Quórum exigia maioria; saiu unânime. **Nenhum achado `bloqueia`.**

## A cadeia que a junta fechou, e é o resultado que vale para o ciclo 5

O bloco mediu que **o denominador 37 não identifica a lista** (duas listas fecham 37 por caminhos
diferentes) e propôs como discriminador o par **`(arquivos, testes)`**.

**A C2 executou TRÊS listas distintas de 6 arquivos e todas devolvem `(6,37)`.** O par proposto **também é
insuficiente**. Pior: o contraexemplo **já estava impresso no §R.5 do próprio bloco**, que o mostrou e não
fechou o laço.

**A receita reprodutível exige NOMEAR os 6 arquivos** — o que o §V.3 do bloco felizmente já faz. O ciclo 5
usa o §V.3, **não** o par `(arquivos, testes)` do E-2.

## O que cada cadeira mediu por conta própria

**C1** — não leu a prova, **reproduziu**: sonda própria em **200.000/200.000** confirmando que o ternário da
l.161 nunca vê o `"A"`, e **40.000 execuções contra o `verifyPassword` real** com a previsão byte a byte
batendo **40.000/40.000**. Mostrou que o `keylen=33` estável **não é sorte** (decorre do PBKDF2-HMAC-SHA256
de 1 iteração que fecha o scrypt). Conferiu a estatística até o limite: o teto **766 é apertado** — 765 dá
94,99%. Verificou a **honestidade**, não só a correção: a ressalva de que os 40 verdes não refutam o 1/2
original foi **mantida sem suavizar**, e a pendência segue **ABERTA**. Para a contraprova de que a carga
morreu, usou **instrumento independente** (varredura Windows de `node.exe` por linha de comando, que não
depende do namespace de PID do Git Bash — justamente onde a M3 achara uma falha de instrumento).

**C2** — cluster descartável próprio. Rodou as duas listas (`(7,37)` 3/3 e `(6,37)` 3/3), os 8 denominadores
por arquivo (16/16), e **as três listas de 6** que derrubam o E-2. Leu o código para a exclusão dupla:
`rls_test_` fora de `SWEPT_ROLE_FAMILIES` **e** chamador único `createEphemeralRole` (l.310) que o criador
(`rls-tenant-isolation.test.ts:25`) nunca invoca — ele importa só `withRoleCatalogLock`. Reproduziu
`460 = 115×4` exato e **refez a F9**: `rls_test_` de **mesma idade** sobreviveu a 3 oportunidades enquanto os
controles foram recolhidos → **idade descartada**.

**C3** — provou o backfill por **fonte externa à ata**: o `headSha` do run de CI **é** `23d9227`. Mediu o diff
de código vazio nas **três** pontas (commitado, árvore e **untracked**). Comparou o KPI chave a chave: **455
de 462 folhas** e **146 de 147 entradas** idênticas. E provou que **o guard do freeze morde de verdade** com
drill + **controle** (ec=1 no drill A, ec=0 no controle D).

## Os cinco achados, nenhum bloqueante

| # | Cadeira | Grav. | O quê |
|---|---|---|---|
| **C1-A1** | C1 | BAIXA | o limite **"+78%"** da contenção **não deriva de nenhum pareamento declarado** (os quatro dão 48,0 / 73,5 / 81,9 / 41,1). O limite inferior +48% é exato e nenhuma conclusão depende do superior. |
| **C2-A1** | C2 | atenção | o **E-2** afirma que o par `(arquivos, testes)` "torna a bateria reproduzível por terceiro" — **falso**, três listas dão `(6,37)`. O §V.3 nomeia os 6 e está correto. |
| **C2-A2** | C2 | atenção | a enumeração dos gatilhos do sweep diz **4 suítes**; são **5** (falta `tests/db-catalog-write-guard.test.ts`, de `f081b5d`/28-08). |
| **C3-A1** | C3 | MÉDIA | a **entrada de KPI do próprio SAN2-4a não existe**, e o §1.6/§6.4 a exigiam → no merge do #365 **o painel volta a estar um merge atrás**, o defeito que este PR acabou de corrigir. |
| **C3-A3** | C3 | BAIXA | o `backfill_note` do §1.6 não foi escrito; o campo carrega byte a byte o do **#363**. Defeito de **localização**, não de verdade — a explicação certa está no `summary`. |

**Erro do orquestrador, achado pela C3 e registrado:** o briefing desta junta diz **"11 observações"** sem
derivação; a contagem real é **12** (11 com dono). É o análogo exato do `C1-A1` — número plausível escrito
sem contar. E a C3 divergiu da Parte I do próprio voto, prevalecendo a medição nova: **"7 de 90" é 7 de 462
chaves-folha**.

## O padrão que a junta inteira compartilhou

**Cada cadeira derrubou uma afirmação por execução, não por leitura** — e duas derrubaram afirmações que
**já tinham o contraexemplo impresso** no material que auditavam (o §R.5 no caso do E-2; os quatro
pareamentos no caso do +78%). O defeito recorrente do bloco não foi medir mal: foi **concluir além do que a
própria medição sustentava**.

## Custo da junta (série P6)

**5 disparos para 3 cadeiras · 2 quedas · ZERO votos perdidos.** Idêntico ao SAN2-3 — o voto-esqueleto e a
evidência incremental já entram no mandato desde o primeiro disparo.

## Veredito

**APROVADO 3×0.** Merge autorizado (§C7 — verde da junta = merge), após o pós-voto tratar os cinco achados:
`C3-A1` (criar a entrada de KPI, agora que as três medições fecharam), `C3-A3`, `C2-A1`, `C2-A2` e `C1-A1`,
mais a correção do "11 → 12" no briefing.
