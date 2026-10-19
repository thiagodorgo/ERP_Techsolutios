# Guard "número estimado chega à tela" — revisão de 2026-10-18

- **Dev:** `dev-kpi-guard-estimativa-opus` (Claude Opus, nível menor, declarado; identidade nova). Não achou o problema
  (quem achou foi o orquestrador) e não revisa; um conferidor independente revisa depois.
- **Worktree / ramo:** `C:/Users/AMP/w-reg1810` · `docs/registro-2026-10-18` (PR #445), head `286d1104` + marco de KPI de
  18/10 não commitado.
- **Escopo tocado:** `tests/kpi-dashboard-charts.test.ts` (só o caso da estimativa e auxiliares locais) e este relatório.
  `Kpis/app.js` só na mutação temporária, revertida e conferida por hash.

## 1. O problema medido

Com o marco de 18/10, nenhuma métrica de `Kpis/kpis-latest.json` declara mais "estimad" no `note`
(`mvp_vendavel` = 29% medido; `mvp_demo` = `null`/"NÃO MEDIDO"). O caso falhava na pré-condição
`assert.ok(estimadas.length > 0, ...)`, que o próprio guard escreveu pedindo revisão.

## 2. N antes e depois

Comando (as duas vezes, container Linux, `npm ci` próprio):
`bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh C:/Users/AMP/w-reg1810 "node --test --import tsx tests/kpi-achados-paridade.test.ts tests/kpi-dashboard-charts.test.ts tests/kpi-dashboard-contraste.test.ts tests/kpi-loop-ferramentas.test.ts"`

| Momento | tests | pass | fail | ec | Falha |
|---|---|---|---|---|---|
| Antes (test sha256 `fcabaf02…`) | 41 | 40 | 1 | 1 | `not ok 19` — "o kpis-latest.json real tem métricas declaradas estimadas; se não tem mais, revise este guard" |
| Depois (test sha256 `fd8669e0…`) | 41 | 41 | 0 | 0 | — |

O N não muda: o caso foi revisto no lugar, não desdobrado em outros.

## 3. O que o caso passou a afirmar

O caso continua um só ("painel: número declarado ESTIMATIVA na fonte chega à tela dizendo que é estimativa") e agora
roda três cenários em toda execução, todos pelo mesmo `runDashboard` do arquivo (o `serve` já aceitava outro conteúdo
para o latest e o histórico; o histórico é o `kpis-history.json` real):

1. **Cópia com estimativa (sempre):** cópia do `kpis-latest.json` real com `mvp_vendavel` = 88% e `mvp_demo` = 99%,
   `note` com "estimado" e `caveat` com "Percentual estimado, sujeito a revisão humana — …". Pré-condição: a cópia
   declara exatamente `["mvp_demo","mvp_vendavel"]` estimadas (o cenário não pode ficar vazio). Por métrica: o `caveat`
   diz "estimad"; o número dela aparece num cartão (`card-scope`, `card-readiness`, `kpi-cards`, `kpi-secondary`); e
   a ressalva, escapada como o `esc()` do app.js, está **no mesmo cartão, depois do número**.
2. **Cópia sem estimativa (sempre) — o inverso:** cópia do real em que toda métrica cujo `note` ou `caveat` diga
   "estimad" passa a dizer medição. Pré-condição: zero estimadas, e o `card-scope` não vazio (o inverso precisa ter o
   que medir). Afirmação: nenhum dos quatro cartões diz "estimad" no texto nem no HTML.
3. **Painel real:** se o real declara estimadas, roda a verificação direta do cenário 1 nele; se não declara (o caso de
   18/10), roda o inverso do cenário 2 nele. A pré-condição antiga ("o real tem de ter estimadas") saiu.

Assim a propriedade é exercitada todo dia, com ou sem métrica estimada no dado real, e nenhum dos ramos é vazio por
construção.

## 4. Vermelho-controle (executado; `Kpis/app.js` restaurado e conferido por hash)

Runner: `$S/mutar.sh` (scratchpad) — aplica a mutação com âncora de ocorrência única (aborta se ≠ 1), roda a mesma
bateria no container Linux, restaura da cópia e compara sha256. Hash de `Kpis/app.js` antes de toda mutação:
`8075145294553762142300919b3ee4a55703cd7d5640924dd9e387b7f80ec249` (o arquivo já tinha a troca do `FROZEN` do marco, que
não é deste trabalho).

| Mutação | O que tira/põe em `renderScopeCard` | Resultado | Mensagem | Restauro |
|---|---|---|---|---|
| M1 | tira `if (mv.caveat) html += …state-caveat…` (a mutação original) | 41 · pass 40 · **fail 1** (`not ok 19`), ec=1 | "cópia com estimativa · metrics.mvp_vendavel: a fonte declara o número estimado e a ressalva NÃO chegou ao cartão #card-scope, depois do número." | sha256 igual |
| M2 | tira `if (md.caveat) html += …state-caveat--second…` (o defeito do 99%, que a busca global de antes não via) | 41 · pass 40 · **fail 1** (`not ok 19`), ec=1 | "cópia com estimativa · metrics.mvp_demo: … NÃO chegou ao cartão #card-scope, depois do número." | sha256 igual |
| M3 | põe "Percentual estimado, sujeito a revisão humana." fixo no cartão de escopo (ressalva velha) | 41 · pass 40 · **fail 1** (`not ok 19`), ec=1 | "cópia sem estimativa · #card-scope: a fonte não declara estimativa em métrica nenhuma e o cartão ainda diz \"estimad\" — ressalva velha mentindo." | sha256 igual |

Depois das três: `Kpis/app.js` = `80751452…c249` (igual ao de antes), `git diff --check` ec=0, nenhum container `tl*` restante.
O teste ficou com 586 linhas, todas CRLF (como o resto do arquivo na árvore; o índice guarda LF).

## 5. Achado fora do escopo (não corrigido aqui — `Kpis/*` é proibido para este dev)

**A prosa da conclusão do painel REAL ainda chama o 29% medido de estimativa.** `Kpis/app.js` l.1167–1169 (função da
conclusão) escreve, sempre que `mvp_vendavel` existe, sem olhar a fonte:
`"Do lado do escopo, " + mv + " do produto vendável está construído — percentual estimado de escopo, não medida de prontidão"`.
Medido executando o app.js com o latest real (sonda `$S/probe.mjs`): o único elemento que diz "estimad" é
`#conclusion-text` — "Do lado do escopo, 29% do produto vendável está construído — percentual estimado de escopo, não medida
de prontidão". É a "ressalva velha mentindo" que o inverso persegue, e a frase também descreve mal a métrica nova (o 29% é
"itens do gate da versão vendável fechados", não "escopo construído").

Por isso o inverso cobre os **cartões** (o que o mandato pediu) e deixa `#conclusion-text` de fora, com o motivo
escrito no comentário do teste. Se o inverso cobrisse a superfície inteira, o caso ficaria vermelho no painel real hoje.
Quem corrigir a frase (condicioná-la ao `caveat`/`note` da fonte e ao `label` novo) pode estender
`CARTOES_DE_METRICA` com `conclusion-text` no mesmo PR — o cenário 2 e o ramo real passam a vigiá-la.

## 6. Diff do teste

```diff
diff --git a/tests/kpi-dashboard-charts.test.ts b/tests/kpi-dashboard-charts.test.ts
index 7dcdfcd4..24bf2ebb 100644
--- a/tests/kpi-dashboard-charts.test.ts
+++ b/tests/kpi-dashboard-charts.test.ts
@@ -384,36 +384,114 @@ test("painel: quebra de medida declarada existe no histórico e é DESENHADA com
   assert.match(svg, /quebra|mudan[çc]a de medida/i, "o leitor precisa da explicação da quebra junto ao gráfico");
 });

-test("painel: número declarado ESTIMATIVA na fonte chega à tela dizendo que é estimativa", async () => {
-  // Regressão real, pega por revisão adversarial: o painel anterior mostrava "Percentual estimado,
-  // sujeito a revisão humana" como texto visível. A reconstrução tirou a ressalva da tela E promoveu
-  // o número a manchete de 44px com barra de progresso — dando a um palpite a mesma gramática visual
-  // de "2 de 15 achados críticos corrigidos", que é contagem real. Este guard fecha a classe: se a
-  // fonte declara o número estimado, a palavra tem de sobreviver até o HTML.
-  const metrics = (LATEST.metrics ?? {}) as Record<string, { note?: string; caveat?: string }>;
-  const estimadas = Object.keys(metrics).filter((k) => /estimad/i.test(String(metrics[k]?.note ?? "")));
-  assert.ok(estimadas.length > 0, "o kpis-latest.json real tem métricas declaradas estimadas; se não tem mais, revise este guard");
+// Auxiliares LOCAIS do caso da estimativa (abaixo). Os cartões são onde o painel põe as métricas; a prosa
+// da conclusão (`conclusion-text`) fica de fora DE PROPÓSITO e com registro: em 2026-10-18 ela ainda diz
+// "percentual estimado de escopo" para o 29% medido — achado nomeado em
+// `docs/revisoes/KPI-GUARD-ESTIMATIVA-2026-10-18.md`, fora do escopo deste guard (corrigir é em `Kpis/app.js`).
+const CARTOES_DE_METRICA = ["card-scope", "card-readiness", "kpi-cards", "kpi-secondary"] as const;
+type MetricaFonte = { note?: string; caveat?: string; display?: unknown; value?: unknown };
+const ESTIMAD = /estimad/i;
+/** O mesmo escape do `esc()` do app.js, reescrito aqui: o HTML do cartão traz o texto escapado. */
+const escHtml = (v: string) =>
+  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
+const metricasDe = (latest: Record<string, unknown>) => (latest.metrics ?? {}) as Record<string, MetricaFonte>;
+/** Métricas que a FONTE declara estimadas — o critério é o `note`, como sempre foi neste guard. */
+const estimadasDe = (latest: Record<string, unknown>) =>
+  Object.keys(metricasDe(latest))
+    .filter((k) => ESTIMAD.test(String(metricasDe(latest)[k]?.note ?? "")))
+    .sort();
+const clonar = (v: unknown) => JSON.parse(JSON.stringify(v)) as Record<string, unknown>;
+
+/** Cópia do latest REAL com as duas métricas de escopo declaradas estimadas — a forma do 88%/99% de antes. */
+function latestComEstimativa(): Record<string, unknown> {
+  const copia = clonar(LATEST);
+  const m = metricasDe(copia);
+  m.mvp_vendavel = { ...m.mvp_vendavel, value: 88, display: "88%", note: "[sintético] percentual estimado à mão, não medido.", caveat: "Percentual estimado, sujeito a revisão humana — escopo vendável." };
+  m.mvp_demo = { ...m.mvp_demo, value: 99, display: "99%", note: "[sintético] percentual estimado por escopo da rodada.", caveat: "Percentual estimado, sujeito a revisão humana — escopo demonstrável." };
+  return copia;
+}

-  const { els } = await runDashboard({ withFetch: true });
-  const superficie = [...els.values()].map((e) => `${e.textContent} ${e.innerHTML}`).join(" ");
+/** Cópia do latest REAL sem nenhuma métrica estimada: quem declarava estimativa passa a declarar medição. */
+function latestSemEstimativa(): Record<string, unknown> {
+  const copia = clonar(LATEST);
+  const m = metricasDe(copia);
+  for (const k of Object.keys(m)) {
+    if (ESTIMAD.test(String(m[k]?.note ?? "")) || ESTIMAD.test(String(m[k]?.caveat ?? ""))) {
+      m[k] = { ...m[k], note: "[sintético] medido por execução.", caveat: "Medição estrita por execução." };
+    }
+  }
+  return copia;
+}

+/** Direto: cada métrica estimada leva a ressalva para o MESMO cartão onde o seu número aparece, depois dele. */
+function confereRessalvaNoCartao(cenario: string, latest: Record<string, unknown>, els: Map<string, FakeEl>, estimadas: readonly string[]) {
+  const metrics = metricasDe(latest);
   for (const k of estimadas) {
     const caveat = String(metrics[k].caveat ?? "");
     assert.match(
       caveat,
-      /estimad/i,
-      `metrics.${k}: a fonte diz que é estimativa no campo \`note\`, que o painel NÃO renderiza — a ressalva precisa estar no \`caveat\`.`,
+      ESTIMAD,
+      `${cenario} · metrics.${k}: a fonte diz que é estimativa no campo \`note\`, que o painel NÃO renderiza — a ressalva precisa estar no \`caveat\`.`,
     );
-    // POR MÉTRICA, e não uma busca global: a versão anterior deste guard fazia um único
-    // `match(superficie, /estimad/i)` que o 88% satisfazia sozinho, enquanto o 99% chegava à tela
-    // sem ressalva alguma no mesmo cartão. O guard passava verde e a mensagem de falha dizia que o
-    // `caveat` "chega à tela" — afirmando um resultado que a execução não produzia, dentro do teste
-    // escrito para matar exatamente essa classe.
+    const numero = escHtml(String(metrics[k].display ?? metrics[k].value ?? ""));
+    const cartao = CARTOES_DE_METRICA.map((id) => els.get(id)).find((e) => e && numero !== "" && e.innerHTML.includes(numero));
+    assert.ok(cartao, `${cenario} · metrics.${k}: o número "${numero}" não aparece em cartão nenhum — o guard não tem onde procurar a ressalva.`);
+    // POR MÉTRICA e POR CARTÃO, e não uma busca global: a versão de antes deste guard fazia um único
+    // `match(superficie, /estimad/i)` que o 88% satisfazia sozinho, enquanto o 99% chegava à tela sem
+    // ressalva alguma no mesmo cartão — e a mensagem de falha afirmava um resultado que a execução não produzia.
+    const iNumero = cartao.innerHTML.indexOf(numero);
+    const iRessalva = cartao.innerHTML.indexOf(escHtml(caveat), iNumero);
     assert.ok(
-      superficie.includes(caveat),
-      `metrics.${k}: a fonte declara o número estimado e a ressalva NÃO chegou ao HTML renderizado.`,
+      iRessalva > iNumero,
+      `${cenario} · metrics.${k}: a fonte declara o número estimado e a ressalva NÃO chegou ao cartão #${cartao.id}, depois do número.`,
+    );
+  }
+}
+
+/** Inverso: se a fonte não declara estimativa em métrica nenhuma, nenhum cartão diz "estimad" na tela. */
+function confereCartoesSemEstimativa(cenario: string, els: Map<string, FakeEl>) {
+  const escopo = els.get("card-scope")?.innerHTML ?? "";
+  assert.notEqual(escopo, "", `${cenario}: o cartão de escopo não foi renderizado — o inverso não teria o que medir.`);
+  for (const id of CARTOES_DE_METRICA) {
+    const e = els.get(id);
+    assert.doesNotMatch(
+      `${e?.textContent ?? ""} ${e?.innerHTML ?? ""}`,
+      ESTIMAD,
+      `${cenario} · #${id}: a fonte não declara estimativa em métrica nenhuma e o cartão ainda diz "estimad" — ressalva velha mentindo.`,
     );
   }
+}
+
+test("painel: número declarado ESTIMATIVA na fonte chega à tela dizendo que é estimativa", async () => {
+  // Regressão real, pega por revisão adversarial: o painel anterior mostrava "Percentual estimado,
+  // sujeito a revisão humana" como texto visível. A reconstrução tirou a ressalva da tela E promoveu
+  // o número a manchete de 44px com barra de progresso — dando a um palpite a mesma gramática visual
+  // de "2 de 15 achados críticos corrigidos", que é contagem real. Este guard fecha a classe: se a
+  // fonte declara o número estimado, a palavra tem de sobreviver até o HTML do MESMO cartão.
+  //
+  // Revisto em 2026-10-18: o marco de 18/10 MEDIU o `mvp_vendavel` (29%) e tirou o percentual do
+  // `mvp_demo` ("NÃO MEDIDO"), e o latest real ficou sem métrica estimada — a pré-condição antiga
+  // ("o real tem estimadas") passou a falhar. A propriedade não depende do dado do dia: ela roda
+  // SEMPRE contra uma cópia sintética com o 88%/99% estimados, e o caso soma o inverso — sem
+  // estimativa na fonte, nenhum cartão diz "estimad". O dado real entra pelo ramo que lhe couber.
+  const sintetico = latestComEstimativa();
+  const estimadasSinteticas = estimadasDe(sintetico);
+  assert.deepEqual(estimadasSinteticas, ["mvp_demo", "mvp_vendavel"], "a cópia sintética tem de declarar as duas métricas de escopo estimadas");
+  const comEstimativa = await runDashboard({ withFetch: true, serve: { latest: sintetico, history: HISTORY } });
+  confereRessalvaNoCartao("cópia com estimativa", sintetico, comEstimativa.els, estimadasSinteticas);
+
+  const neutro = latestSemEstimativa();
+  assert.deepEqual(estimadasDe(neutro), [], "a cópia neutra não pode declarar estimativa");
+  const semEstimativa = await runDashboard({ withFetch: true, serve: { latest: neutro, history: HISTORY } });
+  confereCartoesSemEstimativa("cópia sem estimativa", semEstimativa.els);
+
+  const estimadasReais = estimadasDe(LATEST);
+  const real = await runDashboard({ withFetch: true });
+  if (estimadasReais.length > 0) {
+    confereRessalvaNoCartao("painel real", LATEST, real.els, estimadasReais);
+  } else {
+    confereCartoesSemEstimativa("painel real", real.els);
+  }
 });

 test("painel: com zero achados críticos abertos, a página NÃO anuncia destravamento de produção", async () => {
```
