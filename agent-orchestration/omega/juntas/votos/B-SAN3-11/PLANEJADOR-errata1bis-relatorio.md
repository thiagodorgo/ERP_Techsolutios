papel: planejador-mestre | identidade: planejador-errata1-b-san3-11 (mesma identidade da errata 1; o fluxo voltou ao planejador após correção de código, §C7.6) | modelo: Fable (claude-fable-5-1, por contrato, obrigatório na revalidação, sem substituição) | mandato_md5: 310f353fad2be576c246beeca01a59b1

# ERRATA 1-bis — B-SAN3-11 (PR 401) — dois critérios da errata 1 (A17, A18) eram inalcançáveis pela própria forma de referência

> Arquivo de saída do planejador da errata 1-bis. Incremental (P1): cada seção leva a hora UTC e, onde há medição, o comando e a
> saída resumida. O orquestrador apensa a **seção 15-bis** (ao fim deste arquivo) verbatim ao fim de `docs/revisoes/SAN3/B-SAN3-11-plano.md`,
> logo após a §15. Tudo antes dela é trilha de medição.

## 0. Verificações de identidade — 2026-10-02T16:14Z

- Mandato: `agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-errata1bis.md` em `C:/Users/AMP/w-nuv11`
  (HEAD `ff1f69b4` = FETCH_HEAD do ramo) → `tr -d '\r' | md5sum` = `310f353fad2be576c246beeca01a59b1` (68 linhas); o blob
  `git show ff1f69b4:<caminho>` dá o mesmo md5. Conclusão parcial: mandato íntegro.
- Corpo do papel: o mesmo da errata 1 (md5 `4c912f69a93f07b14d8fd1c49539c778`, blob de `origin/main` 4ab9d232), já conferido às 15:20Z.
- Papéis (§C7.4-bis): quem achou = o dev da errata 1 (parou e relatou, não propôs — `DEV-ERRATA1-401.md` §9); quem planeja = esta
  identidade; quem desenvolve = o mesmo dev da errata 1 retoma (a correção é de **critério**, não de código — ver seção 15-bis).
  Esta identidade não desenvolve, não vota, não commita; `C:/Users/AMP/w-dev11` é **só leitura** para mim.

## 1. Leitura do mandato e do insumo (relato do dev, §9 e PARADA) — 2026-10-02T16:17Z

Mandato (68 linhas) lido inteiro. MEDIDO nele: head do PR `508240fb` (o orquestrador apensou a §15 ao plano — 1319 linhas — e versionou
a trilha), check-runs 7/7, PR `CONFLICTING`. HIPÓTESES a derrubar: 1ª linha com `mandato_md5`; D1/D2 re-medidos por execução própria
(`ETIMEDOUT` no arquivo); decisão forma × critério para A17, A18 e o total da varredura, sem escopo novo e sem afrouxar P-A/P-B; o que vale
do já commitado e a ordem do que falta; destino do `pendencias-indice.md`; terreno (`w-dev11` só leitura; `w-pl11b` se precisar).

Relato do dev (`DEV-ERRATA1-401.md`, 170 linhas, §0–10 lidos; Opus 5.5 declarado na 1ª linha) — lido como quem executou, não como fato:
- Cadeia local em `w-dev11` (não empurrada): `46bd9fbe` (registro da parada) ← `3208cf13` (KPI recontado) ← `92cfc05e` (E6/E7, só o arquivo
  de teste, 15+/17−) ← `1654ae57` (merge da `origin/main` 4ab9d232; 7 conflitos, todos registro/KPI, as duas entradas) ← `508240fb`.
- Ele mediu: 16/16 em CRLF e em LF @ `92cfc05e`; `test:smoke` 1218/1218 real; guards da raiz verdes; KPI `169 → 170`, `pr 401`, history n=166.
- **D1**: sob `timeout: 1`, os três testes (T12–T14) caem com `gerador não executou: spawnSync … ETIMEDOUT` — `morto por sinal` = 0, A17 pedia 3.
- **D2**: varredura no head dele → `NULL=1` (a linha de retorno da própria forma), A18 pedia 0; `EOL=3`, §15.7 dizia "pode continuar 2".
- Ele **parou e não decidiu** (§C7.4-bis) — correto: o executor falsificou a premissa do plano e devolveu por escrito.
- Observação dele (§5): `pendencias-indice.md` não foi regenerado pelo commit original do bloco (`dd58142f`); fora do PERMITIDO da errata 1.

Conclusão parcial: os dois achados são **defeitos do planejador** (critérios que a própria forma de referência não pode cumprir — a classe
"critério impossível de passar" do §C7.4(a)), não do dev. Nada no relato pede mudança de código; pede mudança de critério. A verificar por execução.

## 2. Re-medição de D1 (ordem `error` × `signal` no `spawnSync` sob teto) — 2026-10-02T16:16Z

Comando: `timeout 120 node scratchpad/pl11b-probe-d1.mjs` (Node v20.19.5, `C:\nvm4w\nodejs\node.exe`; filhos são `node -e`, sem repo). Saída colada:
```
{"caso":"D1-a sleep 5s, timeout 200","status":null,"signal":"SIGTERM","error_code":"ETIMEDOUT","error_msg":"spawnSync C:\\nvm4w\\nodejs\\node.exe ETIMEDOUT"}
{"caso":"D1-b exit 1, sem teto","status":1,"signal":null,"error_code":null}
{"caso":"D1-c process.kill(self, SIGTERM), sem teto","status":1,"signal":null,"error_code":null}
{"caso":"D1-d ENOENT","status":null,"signal":null,"error_code":"ENOENT","error_msg":"spawnSync nao-existe-xyz ENOENT"}
{"caso":"forma §15.3 sob teto → ramo","ramo":"gerador não executou: spawnSync C:\\nvm4w\\nodejs\\node.exe ETIMEDOUT"}
```
Conclusões parciais:
- **D1 confirmado**: morte por teto preenche `error` (ETIMEDOUT) **e** `signal` (SIGTERM) com `status null`; a forma testa `error` primeiro
  → ramo "gerador não executou", nunca "morto por sinal". A17, como escrito, é inalcançável **por construção da própria forma**.
- A **propriedade P-A vale** na forma: a morte vira exceção com a causa nomeada (`ETIMEDOUT`), nunca `exit 1`. O que estava errado era a
  mensagem que o critério cobrava — e a minha própria sonda da errata 1 (VC2) já tinha medido `error=ETIMEDOUT` **e** `signal=SIGTERM`
  juntos; eu rotulei o caso pelo `status === null` em vez de seguir a ordem da forma. Erro do planejador, nomeado na seção 4.
- D1-c: **no Windows, "morto por sinal sem `error`" não é produzível** (sinal auto-enviado vira `status 1`); o ramo `status === null` é
  alcançável só em Linux (sinal externo) e por ENOENT-like sem `error`… que não existe (D1-d tem `error`). O ramo fica: é o que fecha o tipo
  (`exitCode: number`) e o caso Linux; é código vivo lá, inerte aqui. Não se mexe na forma.

## 3. Re-medição de D2 (a regex `NULL` da varredura casa a própria forma; `EOL` = 3) — 2026-10-02T16:16Z

Comandos (em `w-dev11` @ `46bd9fbe`, **só leitura**: `readFileSync` + `git diff --name-only`): `node -e` com a regex NULL da §15.7
(`/\bstatus\b[^;\n]*(?:\?\?|\|\|)/`, "atual") e a candidata `/\bstatus\s*(?:\?\?|\|\|)/` ("cand") sobre a linha nova do dev e a antiga do head;
depois `node san3-11-errata1-varredura.mjs . origin/main`. Saída colada:
```
linha nova (dev): "return { exitCode: result.status, stdout: result.stdout ?? \"\" };"
atual casa nova? true | trecho: "status, stdout: result.stdout ??"     cand casa nova? false
atual casa antiga? true | cand casa antiga? true                        (antiga = `exitCode: result.status ?? 1, stdout: result.stdout ?? ""`)
cand: "result.status||1" -> true · "(result.status || 1)" -> true · "status ?? 0" -> true · "x.status??1" -> true · "status, y ?? 1" -> false · "const s = result.status; s ?? 1" -> false
# TOTAIS (head do dev): MUT=5 · EOL=3 · CP=1 · TETO=0 · NULL=1 · WRITE=3
  :264 CP · :271 NULL (a linha acima) · :276 MUT+EOL (`.replace(/\r\n/g, "\n")` do mutate) · :318 EOL (regex de T14 dentro de mutate) · censo.mjs:42 EOL (`$` em nome de arquivo)
```
Conclusões parciais:
- **D2 confirmado**: o instrumento (`NULL`) reconhece **forma** ("`status` e um `??` qualquer na mesma linha") em vez de enunciar a
  **propriedade** ("`status` coalescido"). O `??` da linha nova coalesce `stdout`, que é texto e cuja coalescência é inofensiva. Defeito do
  instrumento do planejador — a mesma classe que o §C7.4(a) nomeia ("guarda que reconhece forma em vez de enunciar propriedade").
- A candidata `\bstatus\s*(?:\?\?|\|\|)` enuncia a propriedade: casa `status ?? 1`/`status||1` (a instância do head) e não casa a linha nova.
  Limite declarado: não pega coalescência indireta (`const s = result.status; s ?? 1`) — fica como limite nomeado do instrumento, coberto por
  A17 (que mede o comportamento, não o texto).
- **EOL = 3 é o número certo** após a errata: o 3º é o normalizador do `mutate` — a própria correção da P-B. O "pode continuar 2" da §15.7
  era contagem feita antes de a forma existir. A errata 1-bis fixa o alvo por enumeração (3 nomeados), não por número solto.
- `WRITE=3` (2 `package.json` + 1 dentro de `mutate`) — confere com a forma; `TETO=0`, `CP=1` conferem com o alvo.

### 3.1 Bateria de controle do novo A17, por execução (w-pl11b @ 46bd9fbe, CRLF, Node v20.19.5) — 2026-10-02T16:23Z

Terreno próprio: `git worktree add --detach C:/Users/AMP/w-pl11b 46bd9fbe` (os objetos do head local do dev são partilhados entre
worktrees; `w-dev11` não foi tocado) → `porcelain=0`; `cd frontend && npm ci --no-audit --no-fund` → `added 103 packages in 20s`, ec=0
(16:20:43→16:21:03Z), sem junction. Mutações por `pl11b-mut-a17.mjs` (preserva o EOL, lança se não aplicar), restauração por cópia de backup.
Medido por: `timeout 600 node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx` após cada mutação (16:22:15→16:22:35Z; TAPs em
`pl11b-tap-a17-{a,b,c}.log`). Saída colada (`pl11b-a17.log`):
```
[a] teto `timeout: 1` nas opções do spawnSync, forma intacta → ec=1 · 16 tests · 13 pass · 3 fail · not_ok=3 ·
    'gerador não executou'=3 · 'morto por sinal'=0 · ERR_ASSERTION=0 · 'deve deixar gerador vermelho'=0 · 'deve reportar'=0 · 'espelho sem descarte'=0
    (os três `not ok` com `failureType: 'testCodeFailure'`, `code: 'ERR_TEST_FAILURE'`, `error: 'gerador não executou: spawnSync …node.exe ETIMEDOUT'`)
[b] teto + os DOIS `throw` do runCenso removidos → ec=1 · 16 · 13 · 3 · 'gerador não executou'=0 · ERR_ASSERTION=3 ·
    'deve deixar gerador vermelho'=2 (T13/T14: `exitCode null ≠ 1`) · 'espelho sem descarte'=1 (T12: stdout vazio)
[c] teto + `?? 1` restaurado, `throw`s intactos → idêntico a [a] (o `throw` em `error` dispara antes; o `?? 1` vira código morto)
restaurado: `git diff --stat` vazio · porcelain=0 · CR=325 (o re-checkout do arquivo no MEU worktree devolveu o CRLF que um `sed -i` meu tinha tirado)
```
Conclusões parciais:
- O critério por **propriedade** é: "sob teto, os 3 vermelhos são **exceções do arnês** (`ERR_TEST_FAILURE` com `gerador não executou`
  ou `gerador morto por sinal`) e **nenhum** é asserção (`ERR_ASSERTION` = 0)". [a] é o verde do critério novo; **[b] é a mutação que o
  deixa vermelho** (`ERR_ASSERTION` = 3; a morte por tempo virou asserção sobre código de saída/stdout — exatamente o defeito da causa A).
- [c] mostra que A17 (comportamento) **não** pega o `?? 1` quando os `throw` existem — por isso A18 (texto, pela varredura v2) continua
  necessário: os dois critérios são complementares, um mede o que o arnês faz, o outro o que ele diz.

### 3.2 `pendencias-indice.md` — medido, não herdado — 2026-10-02T16:26Z

- Gerador: `agent-orchestration/controle/gerar-indice-pendencias.py` (existe na ref; `git ls-files | grep -i indice`); uso
  `python agent-orchestration/controle/gerar-indice-pendencias.py` (Python 3.13.14 nesta máquina). Último regen na main: `5bcdcc58` (#398).
  Cabeçalho do índice: "Se este arquivo divergir do `pendencias.md`, vale o `pendencias.md` e o índice se regenera".
- Medido por: gerador rodado em `w-pl11b` @ `46bd9fbe` (meu worktree) → `indice: 427 cabecalhos / 416 IDs | {'FECHADA': 111, 'ABERTA': 315,
  'SEM-STATUS': 1}`; `git diff --stat` → `273 insertions(+), 271 deletions(-)`. Decomposto por script (id → linha com a coluna do número
  de linha apagada): **253 linhas iguais com só o número de linha deslocado · 0 com conteúdo mudado · 2 novas
  (`P-SAN3-11-VIGENTE-NAO-VINCULADA`, `P-SAN3-11-ORDEM-DO-REPOSITORIO-INDEFINIDA`, ambas BAIXA, dono sim) · 0 sumidas · 7 linhas de placar**.
  A regeneração é limpa; o diff grande é a coluna de linha (o bloco acrescentou 40 linhas ao `pendencias.md`).
- **Achado novo (dentro-do-bloco, nascido em `dd58142f`, 2026-10-01):** `SEM-STATUS: 1` é a **`P-CHK-DOSSIE-VERSAO-NA-UI`** — a pendência que
  o bloco diz fechar (A15). O bloco escreveu `- **status:** **RESOLVIDA em B-SAN3-11 (2026-10-01)** · branch …`; a regex da linha de status
  do gerador (`^[-*>]?\s*\**(?:status|estado)\**\s*:?\s*\**\s*(FECHAD\w*|RESOLVID\w*|…)`) não atravessa o **segundo `**`** antes de `RESOLVIDA`
  → a entrada sai de ABERTA (merge-base) para SEM-STATUS, nunca para FECHADA. Medido por: `node -e` com a regex do gerador → forma do bloco
  `false`, forma `- **status:** RESOLVIDA em B-SAN3-11 (2026-10-01) · branch …` → `true → RESOLVIDA`.
- Prova do conserto (w-pl11b, revertido ao fim): 1 linha reescrita em `pendencias.md` (numstat `1 1`) + gerador → `427 cabecalhos / 416 IDs |
  {'FECHADA': 112, 'ABERTA': 315}` · `SEM STATUS — 0` · `CONTRADITORIAS — 0` · `P-CHK-DOSSIE-VERSAO-NA-UI` listada em **FECHADAS — 112** (l.2244).
- Conclusão parcial: o §6 do plano **já permite** `pendencias.md` e `pendencias-indice.md` ("se o gerador de índice o exigir" — exige);
  a §15.5 da errata 1 os deixou de fora por omissão. É registro do próprio bloco, dono `B-SAN3-11`, custo 1 linha + 1 regen. **Decisão: dentro
  do escopo, E9 (seção 15-bis).** Sem ele, a entrega publicaria a pendência que diz fechar como "sem status" no artefato gerado que diz o que
  está aberto — e a C3 (A15) mediria isso.

### 3.3 KPI em `3208cf13` e estado do ramo — 2026-10-02T16:19Z

- Medido por: `git show 3208cf13:Kpis/kpis-latest.json` / `kpis-history.json` → `version B-SAN3-11 · snapshot 2026-10-02 · blocks 170 ·
  smoke 1218/1218 · backend 3052/3054 · flutter 864/864 · pr 401 · merge_commit null · approved_head null · status published_per_pr ·
  history n=166 (penúltima pr 397 B-GOV-PAUSA, última pr 401 B-SAN3-11)`. `git fetch origin main` → `origin/main` continua `4ab9d232`:
  **a recontagem do dev está certa e vigente**.
- Ramo remoto: `origin/fix/dossie-versao-da-vistoria` = `ff1f69b4` (o orquestrador versionou o mandato 1-bis sobre `508240fb`;
  `git diff --name-only 508240fb ff1f69b4` → só `00-mandatos/planejador-errata1bis.md`). `git merge-base --is-ancestor ff1f69b4 46bd9fbe` →
  **não descende**: o dev precisa integrar por **merge** (0 conflitos esperados: só um arquivo novo) antes do push; nunca rebase.
- Forma commitada em `92cfc05e` lida pelo blob (`git show 46bd9fbe:<teste> | sed -n '258,330p'`): `runCenso` sem `timeout`, `throw` em
  `error`, `throw` em `status === null`, `exitCode: result.status`; `mutate` normaliza/prova/grava; T13 com uma mutação (fallback `runs=`);
  T14 via `mutate`. **Verbatim da §15.3**; diff do arquivo `15+/17−`, nenhum outro arquivo em `92cfc05e`; `3208cf13` só `Kpis/*`;
  `46bd9fbe` só `DEV-relatorio.md` (append).

## 4. O que a errata 1 errou, nomeado (é o planejador que errou, não o dev) — 2026-10-02T16:27Z

1. **A17 cobrava a mensagem de um ramo que a forma não alcança sob teto.** A minha sonda da errata 1 (VC2) **já tinha medido**
   `error=ETIMEDOUT` **e** `signal=SIGTERM` juntos — mas a sonda decidia por `status === null` diretamente ("arnês prescrito: LANÇA (morto
   por sinal)"), enquanto a forma de referência, escrita por mim na mesma hora, testa `error` primeiro. Escrevi o critério a partir do rótulo
   da **réplica** (a sonda) e não do **artefato** (a forma) — a classe que o `medidor-de-cobertura-do-artefato` existe para pegar. Nunca
   executei o critério contra a forma antes de publicar.
2. **A18 media forma, não propriedade.** A regex `NULL` reconhecia "`status` e um `??` na mesma linha" — e a própria forma de referência
   tem um `??` legítimo (em `stdout`) nessa linha. Instrumento que reconhece forma em vez de enunciar propriedade (§C7.4(a)); e o alvo
   `EOL` "pode continuar 2" foi contado no head **antes** de a forma (que acrescenta o normalizador `/\r\n/g`) existir.
3. **A §15.5 estreitou o escopo por omissão** e deixou de fora o par `pendencias.md`/`pendencias-indice.md` que o §6 do plano permite — e
   com isso a linha de status mal-formada da `P-CHK-DOSSIE-VERSAO-NA-UI` (do commit original do bloco) ficaria sem dono na errata.
Custo real: o dev aplicou a forma ao pé da letra, mediu, **parou e devolveu por escrito** sem decidir (§C7.4-bis) — ~25 min dele + esta
errata. A classe para o registro: **todo plano que publica uma forma de referência E um critério sobre ela executa o critério contra a forma
antes de publicar** — "critério impossível de passar" é defeito do planejador, pego aqui por execução do executor, como a norma prevê.

## QUEDA ~2026-10-02T16:30Z → RETOMADA 20:52Z (registro P6/P3)

- Queda desta instância por limite de sessão (HTTP 429, ~16:30Z, reportada pelo orquestrador). Fase da morte: **depois** de gravar a
  §15-bis (16:27Z) e **durante a limpeza** — a contagem de processos com `w-pl11b` na CommandLine, feita por `powershell` chamado de dentro
  do Bash, devolveu `n/d`, a regra fail-closed não removeu o worktree, e a sessão caiu antes de refazer pelo PowerShell direto. Modelo: Fable
  (pin do contrato). Mandato: 1 fatia. Custo do redo: ~1 min (contagem + remoção + esta seção).
- Disco medido ANTES de confiar na memória (20:51:58Z): `ERRATA-1bis-B-SAN3-11.md` **32311 B, 293 linhas, md5 `d8b377de333e90b03173924396843033`**
  (cru = EOL-neutro; arquivo LF), mtime 16:27:36Z; cópia preservada `scratchpad/preservado-2050/` com o **mesmo** md5 e tamanho. Seções
  presentes: 0–4, `15-bis` com 15-bis.1→15-bis.9 e a linha final "Uma linha"; **1** marcador de seção por apurar (só a seção 5, a limpeza). Falsificadores do mandato:
  `mandato_md5` na 1ª linha = 1 · `ETIMEDOUT` = 11 · `A17` = 20 · `pendencias-indice` = 8 · `medido por` = 5.
- Conduta (P3): o texto da §15-bis está completo e gravado com saída — não se reescreve. Re-executo **só** o que estava em curso e não ficou
  gravado: a contagem de processos e a remoção de `w-pl11b`, agora pelo PowerShell direto.

## 5. Limpeza — 2026-10-02T20:53Z (re-executada após a queda)

- Processos com `w-pl11b` na `CommandLine` (`Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'w-pl11b' }`, PowerShell
  direto, 20:52:31Z) → **0**. (Na tentativa pré-queda, a mesma contagem chamada de dentro do Bash devolveu `n/d` e a regra fail-closed não removeu.)
- `git worktree remove --force C:/Users/AMP/w-pl11b` → ec=0 (20:52:47Z); `test -e` → removido; `git worktree list | grep -c pl11` → 0;
  worktrees restantes **18** (todos alheios — inclusive `w-dev11` e `w-dev11lf` do dev, mantidos por ele para a retomada); árvore principal
  `status --porcelain` **55 linhas antes e 55 depois** (nada meu); `%TEMP%/.tmp-censo-*` → **0**.
- `C:/Users/AMP/w-dev11` **só leitura, intocado**: HEAD `46bd9fbe`, `porcelain=0` (tudo o que mutei — `?? 1`, `timeout: 1`, os `throw`,
  a linha de status da P-CHK, o índice — foi no MEU `w-pl11b`, revertido e depois removido).
- Nada escrito no repositório; nenhum commit; nenhum container/cluster; base viva 5432/6379 não tocada.
- Ficam no scratchpad (evidência, fora do repo): `pl11b-probe-d1.mjs`, `pl11b-mut-a17.mjs`, `pl11b-a17.log`, `pl11b-tap-a17-{a,b,c}.log`,
  `pl11b-npmci.log`, `pl11b-teste.bak`, `san3-11-errata1-varredura-v2.mjs` (md5 `646b13719214cedd6cc8fbd6296364e5`), `indice-{head,regen}.md`,
  `kpi-3208.json`, `kpi-hist-3208.json`, e a cópia preservada em `preservado-2050/`.
- Uma linha: removi só o que criei — o worktree `w-pl11b` e as cópias temporárias das sondas; zero rastro fora do scratchpad.
- Falhas de API por sobrecarga nesta instância: **1** — a queda por HTTP 429 (~16:30Z), registrada na seção acima; nenhuma outra (20:51→20:53Z).

## 15-bis. ERRATA 1-bis (texto a apensar verbatim ao plano, após a §15) — 2026-10-02T16:32Z

> Tudo abaixo desta linha (do `### §15-bis` ao fim do arquivo) é o texto que o orquestrador apensa **verbatim** ao fim de
> `docs/revisoes/SAN3/B-SAN3-11-plano.md`, como subseção da §15. Autocontido; os números foram medidos por esta instância
> (seções 0–5 deste arquivo, `ERRATA-1bis-B-SAN3-11.md`, que o orquestrador versiona ao lado dos mandatos).

---

### §15-bis — ERRATA 1-bis (2026-10-02) — A17 e A18 eram inalcançáveis pela própria forma de referência da §15.3; o critério muda, a forma fica

**Autoria:** `planejador-mestre`, identidade `planejador-errata1-b-san3-11` (a mesma da §15), **Fable** (obrigatório: o fluxo voltou ao
planejador após correção de código — §C7.6), mandato `00-mandatos/planejador-errata1bis.md` (md5 EOL-neutro `310f353fad2be576c246beeca01a59b1`,
versionado em `ff1f69b4`). **Quem achou:** o dev da errata 1 (`dev-errata1-b-san3-11`, Opus 5.5 declarado), que aplicou a §15.3 **verbatim**,
mediu, e **parou sem decidir** (`DEV-ERRATA1-401.md` §9) — a conduta certa (§C7.4-bis). **Quem desenvolve:** o mesmo dev retoma; a correção
aqui é de **critério e de registro**, não de código do arnês.

**Natureza:** continuação da errata 1 (terreno, não junta; não abre `R-*`). Os dois achados são **defeitos do planejador** — critérios que a forma
de referência, escrita por ele, não pode cumprir ("critério impossível de passar", §C7.4(a)). Nenhuma propriedade (P-A, P-B) se afrouxa.

#### 15-bis.1 Medido por esta instância (comando + saída resumida; nada herdado)

| # | Medição | Resultado |
|---|---|---|
| N1 | `spawnSync(node -e "setTimeout(…,5000)", {timeout: 200})` em Node v20.19.5 | `status null · signal SIGTERM · error.code ETIMEDOUT` — **os dois campos**; a forma §15.3 (`error` primeiro) devolve `gerador não executou: spawnSync …node.exe ETIMEDOUT`. `process.kill(self, SIGTERM)` no Windows → `status 1, signal null` (sinal sem `error` **não é produzível aqui**; o ramo `status === null` é vivo só em Linux — fica, fecha o tipo) |
| N2 | Regex `NULL` da §15.7 sobre a linha da forma `return { exitCode: result.status, stdout: result.stdout ?? "" };` | **casa** (`status, stdout: result.stdout ??`) — o `??` é do `stdout`; o instrumento reconhece forma, não propriedade |
| N3 | Regex nova `/\bstatus\s*(?:\?\?\|\|\|)/` | linha da forma → **não casa**; `result.status ?? 1` (head antigo) → casa; `status||1`, `(result.status \|\| 1)`, `x.status??1` → casa; `status, y ?? 1` → não casa. Limite declarado: coalescência indireta (`const s = result.status; s ?? 1`) não é vista — coberta por A17′ (comportamento) |
| N4 | Varredura **v2** (15-bis.7) no head do dev `46bd9fbe` | `MUT=5 · EOL=3 · CP=1 · TETO=0 · NULL=0 · WRITE=3`; EOL = `censo.mjs:42` (`$` em nome de arquivo) · `:276` normalizador `/\r\n/g` do `mutate` · `:318` regex de T14 dentro de `mutate(`. Vermelho-controle: `?? 1` restaurado → `NULL=1` |
| N5 | Controle A17 no head do dev, worktree próprio CRLF: **[a]** `timeout: 1` injetado · **[b]** [a] + os dois `throw` removidos · **[c]** [a] + `?? 1` restaurado | [a] `16 tests · 13 pass · 3 fail`, os 3 `not ok` com `code: 'ERR_TEST_FAILURE'` e `error: 'gerador não executou: … ETIMEDOUT'`; `ERR_ASSERTION`=0; `morto por sinal`=0; `deve deixar gerador vermelho`=0; `deve reportar`=0. **[b]** `ERR_ASSERTION`=**3** (`deve deixar gerador vermelho`=2, `espelho sem descarte`=1). **[c]** idêntico a [a] (o `throw` em `error` dispara antes — o `?? 1` vira código morto; só A18′ o pega) |
| N6 | `gerar-indice-pendencias.py` no head do dev | `427 cabecalhos / 416 IDs \| FECHADA 111 · ABERTA 315 · SEM-STATUS 1`; diff `273+/271−` = **253 linhas só com o número de linha deslocado · 0 de conteúdo · 2 novas (`P-SAN3-11-*`) · 0 sumidas · 7 de placar**. O `SEM-STATUS` é a **`P-CHK-DOSSIE-VERSAO-NA-UI`**: o bloco escreveu `- **status:** **RESOLVIDA em B-SAN3-11 (2026-10-01)** · …` e a regex da linha de status do gerador não atravessa o 2º `**` → a pendência que o bloco fecha (A15) sai como "sem status", nunca FECHADA |
| N7 | Mesma entrada com `- **status:** RESOLVIDA em B-SAN3-11 (2026-10-01) · branch …` (1 linha) + gerador | `427 / 416 \| FECHADA **112** · ABERTA 315 · SEM-STATUS **0** · CONTRADITÓRIAS 0`; `P-CHK-DOSSIE-VERSAO-NA-UI` em **FECHADAS**; as duas `P-SAN3-11-*` em ABERTAS (BAIXA, dono sim) |
| N8 | KPI em `3208cf13` pelo blob; `origin/main` re-buscada | `version B-SAN3-11 · blocks 170 · smoke 1218/1218 · pr 401 · merge_commit/approved_head null · history n=166 (…397, 401)`; `origin/main` **continua `4ab9d232`** → recontagem vigente |
| N9 | Ramo | `origin/fix/dossie-versao-da-vistoria` = `ff1f69b4` (+ só `00-mandatos/planejador-errata1bis.md` sobre `508240fb`); `46bd9fbe` **não descende** dele → integrar por **merge** antes do push |
| N10 | Forma commitada em `92cfc05e` (blob) | verbatim da §15.3; só o arquivo de teste (`15+/17−`); `3208cf13` só `Kpis/*`; `46bd9fbe` só `DEV-relatorio.md` (append) |

#### 15-bis.2 Decisões — por propriedade, com a mutação que deixa cada critério vermelho

**D1 → o critério muda; a forma fica.** A propriedade P-A ("morte por tempo/sinal vira exceção com a causa nomeada; nunca código de saída")
**vale** na forma (N1, N5[a]). O que estava errado era A17 cobrar a **mensagem** de um ramo que a morte por teto não alcança. A17 é
substituído por **A17′** (15-bis.6): sob teto, os três vermelhos são **exceções do arnês**, nenhum é asserção. Mutação que o deixa vermelho:
remover os dois `throw` (N5[b], `ERR_ASSERTION`=3). Não se reordena a forma nem se enriquece a mensagem: mudar código para caber num critério
errado é o anti-padrão; e o ramo `status === null` fica porque fecha o tipo (`exitCode: number`) e é o caso Linux.

**D2 → o instrumento muda; o alvo é enumerado.** A regex `NULL` passa a enunciar a propriedade — coalescência aplicada **a `status`**
(`\bstatus\s*(?:\?\?|\|\|)`), não "um `??` na mesma linha" (N2/N3). **A18′**: `TETO=0 · NULL=0 · CP=1 · EOL=3`, com os três `EOL` **nomeados**
(N4) e toda `MUT` de fonte dentro de `mutate(`. Mutação que o deixa vermelho: `?? 1` restaurado → `NULL=1` (N4). O "pode continuar 2" da §15.7
está **revogado**: o terceiro `EOL` é o normalizador — a própria correção da P-B.

**Observação do dev → dentro do escopo, E9.** O §6 do plano já permite `pendencias.md` e `pendencias-indice.md` ("se o gerador de índice o
exigir" — exige: existe na ref e o cabeçalho do índice manda regenerar); a §15.5 os omitiu. A regeneração é limpa (N6) **e** revela que a
linha de status da `P-CHK-DOSSIE-VERSAO-NA-UI`, escrita pelo commit original do bloco (`dd58142f`, 2026-10-01 — **dentro-do-bloco**, dono
`B-SAN3-11`), não é lida pelo gerador: a entrega publicaria como "sem status" a pendência que diz fechar. Conserto de 1 linha + 1 regen (N7).

#### 15-bis.3 Entrega nova — E9 (registro do próprio bloco; sem código)

1. `agent-orchestration/controle/pendencias.md`, entrada `## P-CHK-DOSSIE-VERSAO-NA-UI` (l.2244): **só** a linha de status passa a
   `- **status:** RESOLVIDA em B-SAN3-11 (2026-10-01) · branch \`fix/dossie-versao-da-vistoria\`` (sai o `**…**` interno; o resto da linha e
   os sub-itens E1–E5/Bateria/dono ficam). `git diff --numstat -- pendencias.md` = `1 1`.
2. `python agent-orchestration/controle/gerar-indice-pendencias.py` → `agent-orchestration/controle/pendencias-indice.md` regenerado;
   placar esperado `427 cabecalhos / 416 IDs | FECHADA 112 · ABERTA 315` e `SEM STATUS — 0`. Nenhuma edição manual no índice.
3. Commit próprio: `docs(registro): B-SAN3-11 — linha de status da P-CHK-DOSSIE-VERSAO-NA-UI na forma do gerador e indice regenerado (ERRATA 1-bis)`.

#### 15-bis.4 O que VALE do que o dev já commitou localmente (verificado pelo blob, N8–N10)

| Commit | Conteúdo | Veredito |
|---|---|---|
| `1654ae57` | merge da `origin/main` 4ab9d232 (7 conflitos, só registro/KPI, as duas entradas) | **vale** (§15.10 cumprido; `origin/main` não andou) |
| `92cfc05e` | E6 + E7, só `frontend/tests/patios-dossie-versao.smoke.test.tsx` | **vale, intocado** — nenhum commit novo no arquivo de teste |
| `3208cf13` | E8, recontagem contra a main de agora (170 · 1218/1218 · pr 401 · n=166) | **vale** |
| `46bd9fbe` | `DEV-relatorio.md`, seção da parada (append) | **vale** — registro não se reescreve; a seção da retomada entra depois dela |
As medições do dev em `92cfc05e` (16/16 nos dois terrenos, 1218/1218) são **dele**, mas o head final será outro (merge de N9 + E9): a bateria
da §15.8 roda **inteira no head final**, nos dois terrenos (A22) — é o que conta.

#### 15-bis.5 Ordem do que falta (o dev, sem decidir nada fora disto)

0. `git fetch origin` → `git merge origin/fix/dossie-versao-da-vistoria` (traz `ff1f69b4` e o que o orquestrador versionar com esta errata:
   §15-bis no plano + relatórios do planejador); conflitos esperados **0**; se houver, **as duas entradas**, a do ramo depois; **nunca rebase**.
   `w-dev11lf` → `git -c core.autocrlf=false checkout --detach <head>` a cada head novo (CR=0 conferido).
1. **E9** (15-bis.3) → commit.
2. Controles no **head final**, terreno CRLF (CR>0 no adapter colado), cada um por mutação em cópia de trabalho, TAP contado, restauração por
   cópia e `git diff --stat` vazio: **A17′** ([a] verde do critério **e** [b] vermelho-controle), **A19** (CRLF obrigatório; depois LF),
   **A20**, **A21**. A medição [a]/[b] já feita por esta errata (N5) não substitui a do dev no head final.
3. Bateria §15.8 **inteira**, nos dois terrenos, no head final: `check` · 16/16 · `test:smoke` N/N (TAP) · varredura **v2** → A18′ ·
   `kpi-freeze --check` · guards · listas de diff (A25 + 15-bis.8) · `git diff --check` · **A26** (gerador → `git diff --stat` vazio).
4. Se `test:smoke` der N ≠ 1218 ou a `origin/main` tiver andado: recontagem de novo pela regra (main + 1; TAP), commit `fix(kpi)`.
5. Registro: `DEV-relatorio.md` seção `## ERRATA 1 — retomada (1-bis) — <UTC>` (append, com N5-equivalentes do dev, A19–A21, A26, varredura v2,
   os dois terrenos); 1 linha em `log-execucao.md` e `status-geral.md` → commit `docs(junta)`.
6. `git merge-base --is-ancestor origin/fix/dossie-versao-da-vistoria HEAD; echo $?` → `0` → `git push origin HEAD:fix/dossie-versao-da-vistoria`
   (fast-forward; nunca `--force`). Depois: CI no head → mandatos regenerados (HC = H0) → **inspetor novo** → junta 1 (§15.11, inalterado).
7. Ao fim: 0 processo com `w-dev11` na CommandLine → `git worktree remove --force` dos dois worktrees do dev.

#### 15-bis.6 Critérios — A17′ e A18′ SUBSTITUEM A17 e A18; A26 é novo; A19–A25 ficam como na §15.6

| # | Critério (verde) | Mutação que o deixa VERMELHO | Onde |
|---|---|---|---|
| A17′ | P-A por comportamento: com a **única** mutação `timeout: 1,` nas opções do `spawnSync` de `runCenso`, o TAP tem `# fail 3` (T12, T13, T14), e **cada** `not ok` é exceção do arnês — `grep -cE "gerador (não executou\|morto por sinal)"` = **3**, `grep -c ERR_ASSERTION` = **0**, `grep -c 'deve deixar gerador vermelho'` = 0, `grep -c 'deve reportar'` = 0, `grep -c 'espelho sem descarte'` = 0 — e o arquivo restaurado (`git diff --stat` vazio) | além do teto, remover os dois `throw` de `runCenso` → `ERR_ASSERTION` = 3 (N5[b]) | dev (controle no head final), C2 |
| A18′ | Varredura **v2** (15-bis.7) no head final: `TETO=0 · NULL=0 · CP=1 · EOL=3`, os três `EOL` sendo exatamente `scripts/san3-11-dossie-vistoria-censo.mjs:42`, o normalizador `/\r\n/g` de `mutate` e a regex de T14 dentro de `mutate(`; toda `MUT` de fonte dentro de `mutate(` (as de T11, l.234/251, são recorte de HTML) | restaurar `exitCode: result.status ?? 1` → `NULL=1` (N4); ou tirar o normalizador → `EOL=2` | dev, C3 (script) |
| A26 | E9: no head final, `python agent-orchestration/controle/gerar-indice-pendencias.py` deixa `git diff --stat` **vazio**; o índice tem `SEM STATUS … — 0`, `CONTRADITORIAS … — 0`, `P-CHK-DOSSIE-VERSAO-NA-UI` sob `## FECHADAS` e as duas `P-SAN3-11-*` sob ABERTAS; `git diff --numstat origin/main...HEAD -- agent-orchestration/controle/pendencias.md` cobre a linha de status (sem o `**` interno: `grep -c 'status:\*\* \*\*RESOLVIDA' pendencias.md` = 0) | deixar o `**` interno → `SEM-STATUS 1` e a P-CHK fora de FECHADAS (N6); editar o índice à mão → regen deixa diff | dev, C3 (A15) |

#### 15-bis.7 Instrumento v2 — a única linha que muda na varredura da §15.7 (e o auto-teste)

Em `san3-11-errata1-varredura.mjs` (cópia local do dev; **não** entra no repositório), a linha
```js
  ["NULL", /\bstatus\b[^;\n]*(?:\?\?|\|\|)/],
```
passa a
```js
  ["NULL", /\bstatus\s*(?:\?\?|\|\|)/], // ERRATA 1-bis: coalescência aplicada a `status` (propriedade), não "status e um ?? na mesma linha" (forma)
```
(e o comentário do cabeçalho, `NULL = \`status\` coalescido diretamente (\`status ?? x\` / \`status \|\| x\`)`). md5 EOL-neutro do script v2
desta instância: `646b13719214cedd6cc8fbd6296364e5`. **Auto-teste antes de usar** (cola a saída no relatório):
`node -e 'const r=/\bstatus\s*(?:\?\?|\|\|)/;console.log(r.test("return { exitCode: result.status, stdout: result.stdout ?? \"\" };"), r.test("exitCode: result.status ?? 1"))'`
→ `false true`. (Lembrete da §15.7: mover o script por arquivo, nunca por heredoc em Bash.)

#### 15-bis.8 Escopo (§C4) — a emenda à §15.5

**PERMITIDO** = §15.5 **mais** `agent-orchestration/controle/pendencias.md` (**só** a linha de status da `P-CHK-DOSSIE-VERSAO-NA-UI`) e
`agent-orchestration/controle/pendencias-indice.md` (**só** como saída do gerador) — ambos já no §6 do plano. **Nada mais muda**: o arquivo de
teste fica como em `92cfc05e` (`git diff 92cfc05e HEAD -- frontend/tests/patios-dossie-versao.smoke.test.tsx` **vazio** no head final —
critério A25 ganha esta linha); `scripts/**`, `frontend/src/**`, `frontend/package.json`, `.github/**` continuam PROIBIDOS.

#### 15-bis.9 Registro e o erro do planejador, nomeado

- Esta §15-bis é apensada pelo orquestrador; o dev não a edita. O arquivo de saída do planejador (`ERRATA-1bis-B-SAN3-11.md`, trilha de medição)
  é versionado ao lado de `PLANEJADOR-errata1-relatorio.md`.
- **O que a errata 1 errou:** (1) A17 foi escrito a partir do rótulo da **sonda** (que decidia por `status === null`) e não da **forma** (que
  testa `error` primeiro) — critério tirado da réplica, não do artefato, e nunca executado contra a forma antes de publicar; (2) A18 usava um
  instrumento que reconhece forma, e o alvo `EOL` foi contado antes de a forma existir; (3) a §15.5 estreitou o escopo por omissão. Classe para
  a casa: **plano que publica forma de referência e critério sobre ela executa o critério contra a forma antes de publicar.** Pego por execução
  do executor, que parou e devolveu por escrito — a máquina funcionou como desenhada (§C7.4-bis).
- Pendências novas: **nenhuma**. A condição Windows "sinal sem `error` não é produzível" (N1) é nota de terreno, não achado.

**Uma linha:** A17 e A18 pediam o que a forma de referência não pode dar; a 1-bis troca os dois critérios por A17′ (os três vermelhos sob
teto são exceções do arnês, zero asserções — vermelho-controle: tirar os `throw`) e A18′ (instrumento que vê `status` coalescido, `EOL=3`
nomeados), mantém o código do arnês como está, traz para dentro o par `pendencias.md`/índice com a linha de status da `P-CHK-DOSSIE-VERSAO-NA-UI`
na forma que o gerador lê (E9/A26), e devolve o dev ao caminho: merge do ramo → E9 → controles → bateria nos dois terrenos → registro → push.
