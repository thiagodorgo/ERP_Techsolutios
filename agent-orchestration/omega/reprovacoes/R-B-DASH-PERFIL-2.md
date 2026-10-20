# R-B-DASH-PERFIL-2 — reprovação do ciclo 2: auditoria de topo e plano do ciclo 3

> Registro do orquestrador (2026-10-19). Quem achou: `jurado-dash2-c2-opus`. Quem auditou e planejou: `planejador-dash-ciclo3-fable` (Fable, sem fallback). Ata: `agent-orchestration/omega/juntas/J-B-DASH-PERFIL-ciclo2.md`. Abaixo, o arquivo do planejador na íntegra.

---

# B-DASH-PERFIL — auditoria da reprovação do ciclo 2 e plano do ciclo 3

> **Papel:** `planejador-mestre` (identidade nova `planejador-dash-ciclo3-fable`) · **Modelo que rodou:** Fable (claude-fable-5-1), o modelo de TOPO do frontmatter — sem substituição. · **Regra:** `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO` (§C7.4): em toda reprovação de junta o topo audita e replaneja; quem achou (C2 `jurado-dash2-c2-opus`) não planeja nem desenvolve; quem planeja não desenvolve nem vota. Não votei, não desenvolvi e não planejei os ciclos anteriores.
>
> **Objeto julgado no ciclo 2:** `faad24ce7c00ab4d7610d0784c0beab8a479ddb0` (PR #446, ramo `fix/dash-perfil`); `B = merge-base(origin/main, objeto) = bf83cda8` = `origin/main` (delta 0). **Produto do bloco:** byte a byte o mesmo do ciclo 1 (patch-id `faa83b03` nos dois objetos; 0 arquivo de `frontend/src|src` entre `849bf840` e `faad24ce`).
>
> **Informação do orquestrador incorporada (19/10):** a C3 do ciclo 2 (`jurado-dash2-c3-cdx`, Codex) **não vota** — o Codex bateu o limite semanal às 22:42Z e só volta em 24/10 20:38; a ata registra "não votou — executor sem limite (P6)". O ciclo 2 já está reprovado pela C2 (unanimidade impossível). A composição do ciclo 3 **não conta com Codex**: executores disponíveis são Claude Opus (subagente), Claude Opus pelo Antigravity e Gemini 4 Argon pela API (2º revisor, nunca único).
>
> **Este documento é somente leitura do repositório:** nenhuma edição, commit, Docker, base viva ou `tail -f`. **Gravado aos poucos (P1/P2):** cada seção nasceu em apuração e foi preenchida ao ser medida; todas estão preenchidas.

---

## Parte 1 — Auditoria da reprovação do ciclo 2 (§C7.4)

### 1.0 Insumos lidos (comando → saída → veredito parcial)

- `Read` de `votos/B-DASH-PERFIL-ciclo2/c2-voto.json` e `c2-evidencia.md` → **REPROVADO**, 1 achado `C2-dash2-01` (`bloqueia — não grave`, `dentro-do-bloco`, classe "arnês/teste + dado podre no registro"); itens 1 e 2 APROVADOS com M1/M1b/M7/M-C2a e M1a/M-C2b vermelhas e restauro provado por hash. Item 3: produto inalterado desde o ciclo 1 (patch-id `faa83b03` igual), M3b sobrevive a `test:smoke` 1335/1335 + raiz 4/4 + `check`; sonda própria de clique (K1–K3) verde no objeto e K1/K2 vermelhos sob M3b → **insumo aceito como A RE-VERIFICAR; os comandos estão registrados (P3) e re-executo abaixo o que cabe sem tocar a árvore.**
- `Read` de `c1-voto.json`/`c1-evidencia.md` → **APROVADO**, 0 achado; C1-01 confirmado `pre-existente` (`011632f1`, 2026-06-07) por `git log -S`/`git blame`; T5/T6 vermelhos sob M3/M2/M6 e F1/F2 → sem relação com o achado do ciclo 2.
- C3 (`jurado-dash2-c3-cdx`, Codex): **ainda não votou** no momento desta auditoria (diretório só tem c1, c2, inspetor e mandatos). Se o voto chegar, o orquestrador avisa e eu incorporo; até lá, esta auditoria trata só o achado da C2.
- `Read` de `insp-dash2-parecer.md` → LIBERADO COM RESSALVA (R1–R5); 20 inelegíveis gerados no objeto; §C7.4-bis do ciclo 2 conferido por nome (achou = `jurado-dash-c1-cdx`, `jurado-dash-c3-opus`; planejou = `planejador-dash-ciclo2-fable`; desenvolveu = `dev-dash-ciclo2-opus`).
- `Read` de `omega/reprovacoes/R-B-DASH-PERFIL-1.md` (plano do ciclo 2 + auditoria do ciclo 1) e de `J-B-DASH-PERFIL-ciclo1.md` → a tabela 1.4 do plano classifica C2-opus-01 (M1a, M3b) como `dentro-do-bloco`, não grave, "M1a entra no conserto; **M3b fica fora, com dono**"; a Parte 3 item 2 nomeia a pendência e afirma "`renderToString` não exercita `onClick`" e dono = "o primeiro bloco de frontend que introduzir arnês de interação (`react-dom/test-utils`/jsdom)".
- `git show faad24ce:docs/revisoes/TELAS/B-DASH-PERFIL-ciclo2-dev.md` → o dev registrou a pendência com `escopo: pre-existente na falta de arnês de interação` — rótulo que o plano NÃO ditou (o plano só disse "fica fora, com dono"); 7/7 mutações vermelhas; `test:smoke` 1335.
- `git show faad24ce:agent-orchestration/controle/pendencias.md | grep -n -A6 P-DASH-PERFIL-TROCA-CLIQUE-SEM-TESTE` → l.11378–11384: ABERTA · BAIXA · **escopo `pre-existente`** · dono "primeiro bloco com arnês de interação" · bloqueia: não · teste de encerramento: "clica em ativar… vermelho sob M3b".
- Terreno desta auditoria: `git -C C:/Users/AMP/w-dash rev-parse HEAD` = `faad24ce` (= `git ls-remote origin refs/heads/fix/dash-perfil` = objeto); `merge-base(origin/main, objeto)` = `bf83cda8` = `origin/main` (delta 0); `git status --short` só com `?? votos/B-DASH-PERFIL-ciclo2/` (os votos) e os ` M` fantasmas de EOL em `.agents/.claude`. Nenhuma edição minha na árvore.

### 1.1 (a) O achado C2-dash2-01 — defeito real do produto ou artefato do processo?

**Resposta curta: achado REAL, mas do ARNÊS e do REGISTRO — não do produto. `dentro-do-bloco`, não grave. A máquina funcionou: a C2 mediu em vez de herdar.**

| pergunta | comando (executado por mim, somente leitura) | saída | conclusão |
|---|---|---|---|
| A linha que M3b muta é do bloco? | `git blame -L 55,55 faad24ce -- frontend/src/pages/ContextSelectionPage.tsx` · `git show bf83cda8:frontend/src/pages/ContextSelectionPage.tsx \| grep -n 'navigate('` | `a6b91ce9 2026-10-18 … navigate(landing);` · base l.45: `navigate("/dashboard");` | **`dentro-do-bloco`** por origem: a linha nasce no único commit de produto do bloco (`a6b91ce9`); M3b é literalmente a linha da base |
| O que o bloco mudou na página? | `git diff -U0 bf83cda8 faad24ce -- frontend/src/pages/ContextSelectionPage.tsx` | +14/−4: `nextSession` da troca, `resolveContextLandingRoute(permissions)`, `if (!landing) throw`, `setActiveContext({ ...context, permissions })`, `navigate(landing)` | a navegação pós-seleção pela landing-route **é a mudança central da página** — não periférica |
| O produto está certo? | sonda própria (§1.3): página REAL + provedores reais + `fetch` dublado + clique pelo `onClick` real | K1 `/finance`, K2 `/inventory`, K3 fica em `/select-context` com a mensagem; 3/3, 0 `console.error` | produto correto por execução (concorda com a C2 do ciclo 2 e com o navegador real da C2 do ciclo 1) |
| Algum teste executado prende a linha? | `git grep -n -E 'ContextSelectionPage\|handleActivate' faad24ce -- tests frontend/tests scripts .github` | só `frontend/tests/dashboard-profile-behavior.test.tsx:10` (lê o FONTE) | o único vigia é o caso 3 (3 `assert.match`) |
| M3b atravessa esse vigia? | checagem de string (sem tocar arquivo): aplicar M3b ao fonte do objeto e testar as 3 regex | objeto `true,true,true` · M3b `true,true,true` | **M3b sobrevive por construção** — as regex conferem a CHAMADA do resolver, não o DESTINO; confirma o `0/1335 + 0/4` da C2 sem precisar mutar a árvore |
| É grave (§C7 item 8(2))? | leitura de `App.tsx` (guarda de `/dashboard` = `["dashboard:read","dashboard:view"]`), T2 do ciclo 2 | sob M3b o Financeiro é mandado a `/dashboard` e a guarda responde "Acesso nao autorizado" | **não grave**: não perde dado, não vaza entre organizações, não quebra permissão na autoridade, não erra dinheiro; é UX errada + lacuna de teste |

**O que é "real" no achado:** (i) a mudança central da página não tem prisão por comportamento executado — fato, medido duas vezes (C2 e eu); (ii) o registro que a adia (`pendencias.md:11380`) declara `pre-existente` **sem evidência de data ou origem** — a "evidência" é uma premissa ("falta de arnês de interação") que é **falsa** no objeto (§1.3). Pelo §C7.1-ter(a), escopo declarado sem evidência válida é `dentro-do-bloco`; no ciclo 2, `dentro-do-bloco` não grave ainda reprova. **O voto está correto na régua do ciclo 2.**

**O que é "processo" no achado:** o plano do ciclo 2 (meu antecessor, Fable) adiou conscientemente um item que ele mesmo classificou `dentro-do-bloco` (tabela 1.4: "M3b fica fora, com dono") no **último ciclo em que não grave reprova** (§2.8 do mesmo plano), apoiado numa premissa não medida (§1.5); o dev converteu "fica fora, com dono" num rótulo `pre-existente` que o plano não ditou; e o mandato da C2 (l.72 e l.102) apresentou a pendência como fato e pediu que a C2 "declarasse o escopo com a evidência do registro". A C2 fez melhor: mediu o registro, achou a premissa falsa e votou pela régua. **Mesma classe do C3-01 do ciclo 1 (arnês que não prende), com informação nova** — ver §1.6.

### 1.2 Por que o plano do ciclo 2 mandou para pendência `pre-existente` o que estava dentro do bloco

Reconstrução a partir do texto do plano (`R-B-DASH-PERFIL-1.md`), sem inferir intenção além do escrito:

1. **Tabela 1.4, linha C2-opus-01:** "real no arnês · `dentro-do-bloco` · não grave · M1a entra no conserto (barato, puro); **M3b fica fora, com dono**". O plano SABIA que M3b era do bloco. O critério de corte foi custo/instrumento, não escopo.
2. **Parte 3, item 2:** "`renderToString` não exercita `onClick`" (verdadeiro para o instrumento que o plano usou na própria sonda 1.2 — e irrelevante, porque o repositório não se limita a `renderToString`) e "dono: o primeiro bloco de frontend que introduzir arnês de interação (`react-dom/test-utils`/jsdom)". Lido junto com o §C7.1 (dependência nova = decisão crítica, unanimidade de 5), o raciocínio implícito é: *prender M3b exige arnês de interação; arnês de interação exige dependência nova; dependência nova não cabe num ciclo de conserto mínimo* — logo adia-se com dono. **O raciocínio seria válido se a premissa fosse verdadeira.** Não era, e não foi medida: `grep -n -i -E 'createRoot|work-orders-page-live|React\.act|DOM m[ií]nimo|jsdom|test-utils' R-B-DASH-PERFIL-1.md` → só a l.256 (a afirmação), **zero comando**.
3. **Contradição interna com a régua que o próprio plano enunciou:** §2.8 "Ciclo 2 é o ÚLTIMO em que achado não grave reprova". Deixar aberto um `dentro-do-bloco` conhecido nesse ciclo só não reprova se a junta aceitar o adiamento; o mandato da C2 (l.72: "a pendência … está registrada no objeto … medido por `grep -c`"; l.102: "declare o escopo dela com a evidência do registro") empurrou nessa direção. `grep -c` mede a PRESENÇA do registro, não a validade do escopo. A C2 não herdou.
4. **O rótulo `pre-existente` é do registro, não do plano.** `git show faad24ce:docs/revisoes/TELAS/B-DASH-PERFIL-ciclo2-dev.md` → o dev escreveu a pendência com "BAIXA, dono: primeiro bloco com arnês de interação"; em `pendencias.md:11380` ficou `escopo: pre-existente na falta de arnês de interação`. O dev "não julga a validade do achado" (§C7.4-bis) e, ao registrar, precisou preencher o campo `escopo` que o plano deixou implícito — escolheu o rótulo que justificava o adiamento. **Defeito de forma (campo sem evidência de data/origem) e de substância (a justificativa é falsa).**

**Veredito parcial:** o adiamento foi uma decisão consciente do plano sobre custo de instrumento, tomada sobre premissa não medida e em conflito com a régua do ciclo; o registro agravou ao rotular `pre-existente`. Nada disso é defeito do produto.

### 1.3 Re-execução própria: o arnês existe? M3b sobrevive? o arnês prende? (comando → saída)

Tudo somente leitura (`git show`, `git grep`, `git blame`) ou sonda a partir do scratchpad com cwd em `C:/Users/AMP/w-dash/frontend`; árvore conferida antes e depois: `git status --short` só com `?? votos/B-DASH-PERFIL-ciclo2/` + fantasmas de EOL; `git hash-object frontend/src/pages/ContextSelectionPage.tsx` = `e34d4cbd…` = `git rev-parse faad24ce:…` (idêntico ao blob do objeto antes e depois).

**(a) O arnês existe no objeto, sem dependência, e roda na CI**
- `git grep -l -E 'createRoot|installMiniDom|class MiniNode' faad24ce -- frontend/tests` → 4 arquivos: `operations-map-google-canvas.test.ts`, `operations-map-libre.test.ts`, `patios-dossie-versao.smoke.test.tsx`, `work-orders-page-live.test.tsx`. Com DOM mínimo completo (`installMiniDom` + `class MiniNode` + `React.act`): **2 cópias** — `work-orders-page-live.test.tsx` (1125 l.) e `patios-dossie-versao.smoke.test.tsx` (1019 l.; instala só para T25/T26). Duplicar o DOM mínimo por arquivo **já é o padrão do repositório** (contrato (a) do cabeçalho: "o DOM mínimo é escrito aqui mesmo").
- `git log -1 --format='%h %ad %s' --date=short 3e40a256` → `2026-10-02 fix(web): a web guarda por alcance e pelo estado da pagina (B-SAN3-01b) (#402)`; `git merge-base --is-ancestor 3e40a256 a6b91ce9` → **SIM** (ancestral do commit do bloco).
- `git show faad24ce:frontend/package.json | sed -n 11p | grep -o 'tests/work-orders-page-live.test.tsx'` → presente no `test:smoke` (153 arquivos); `.github/workflows/ci.yml:325` roda `npm --prefix frontend run test:smoke` em Node 20 → **o arnês já executa na CI**.
- `ls frontend/node_modules | grep -c -E '^(jsdom|happy-dom|@testing-library)$'` → **0**. Nenhuma dependência de DOM; nenhuma é necessária.
- **O próprio bloco editou o arquivo do arnês:** `git diff --stat bf83cda8 faad24ce -- frontend/tests/work-orders-page-live.test.tsx` → `6 +++---` (commit `a6b91ce9`: trocou `setStoredAuthSession` por `setStoredSessionPermissions` no `mount`). A emenda de 18/10 (`B-DASH-PERFIL-emenda-2026-10-18.md` l.63; `-emenda-dev.md` l.74) lista o arquivo entre os 37 setups. **O arnês passou pelas mãos do bloco duas vezes.**

**(b) M3b sobrevive à bateria do objeto — por construção (sem mutar a árvore)**
- `git grep -n -E 'ContextSelectionPage|handleActivate' faad24ce -- tests frontend/tests scripts .github` → só `dashboard-profile-behavior.test.tsx:10` (lê o fonte por `readFileSync`).
- Checagem de string: as 3 regex do caso 3 (`const permissions = nextSession\.user\.permissions`, `setActiveContext\(\{ \.\.\.context, permissions \}\)`, `resolveContextLandingRoute\(permissions\)`) contra o fonte do objeto e contra o fonte com M3b aplicada → `objeto: true,true,true | M3b: true,true,true`. Logo nenhum teste do repositório fica vermelho sob M3b: o `0/1335 + 0/4` registrado pela C2 segue por construção e dispensa re-mutação.

**(c) Sonda própria: o arnês existente monta a página REAL e o clique prende a landing** (`<scratchpad>/dash3-plan/{mini-dom.mts,sonda-ctx.mts,driver.mjs}`; `mini-dom.mts` = `git show faad24ce:frontend/tests/work-orders-page-live.test.tsx | sed -n '30,320p'` + `export`; executado com `SONDA_DIR=… VARIANT=<v> node --import tsx --input-type=module -e "$(cat driver.mjs)"` e cwd `frontend/`, para que `react`/`react-router-dom` resolvam do `frontend/` e sejam a mesma instância que os fontes do worktree)
- Montagem: DOM mínimo instalado ANTES de `react-dom/client`; `VITE_USE_MOCKS=false`; sessão gravada com `tenant org-um`, `permissions ["dashboard:read","work_orders:create"]`, `accessToken tok-0`; `fetch` dublado (`/me/tenants` → Org Um/manager e Org Dois/finance; `/auth/active-tenant` → payload do caso; rota não prevista LANÇA); árvore `MemoryRouter(/select-context) > AuthProvider > TenantProvider > PermissionProvider > Routes{/select-context: <ContextSelectionPage/>+<LocationProbe/>, *: <LocationProbe/>}`; clique = `onClick` real lido de `__reactProps$` do `<button>` cujo texto contém "Org Dois"; o `window.setTimeout` do DOM mínimo colapsa o atraso de 250 ms de `listAvailableContexts`.
- `VARIANT=objeto` → `ok K1 finance: path=/finance` (calls `GET /me/tenants, POST /auth/active-tenant, GET /me/tenants`; sessão `["financial_entries:read"]`; contexto ativo `["financial_entries:read"]`) · `ok K2 inventory: path=/inventory` · `ok K3 só os.read: path=/select-context, erro=true` (sessão `["os.read","work-orders:view"]`, contexto não gravado) → **pass 3 fail 0, console.error 0**.
- `VARIANT=copia` (controle do instrumento: cópia da página transformada pelo esbuild do `frontend/`, imports reescritos para as mesmas URLs, SEM mutação) → **pass 3 fail 0**; `diff copia m3b` → exatamente 1 linha (`navigate(landing);` ↔ `navigate("/dashboard");`).
- `VARIANT=m3b` → `not ok K1 (path=/dashboard)`, `not ok K2 (path=/dashboard)`, `ok K3` → **VERMELHO** (pass 1 fail 2).
- `VARIANT=m3c` (`setActiveContext({ ...context })`, contexto sem as permissões da sessão nova) → `not ok K1`, `not ok K2` (contexto gravado com o mapa estático: `["finance.manage","finance.read","os.read",…]` ≠ sessão) → **VERMELHO**.
- `VARIANT=m3e` (remove o `if (!landing) throw`) → `ok K1`, `ok K2`, `not ok K3` (sem mensagem; contexto gravado indevidamente; a tela fica muda) → **VERMELHO**.
- Nota observada (não é achado): o `GET /me/tenants` dispara 2× porque `useEffect(..., [session])` refaz a lista quando a sessão muda após a troca — o efeito existe na base (`bf83cda8` l.26) e o diff do bloco não o toca; o teste do ciclo 3 **não** asserta a contagem de GETs.

**Veredito parcial:** a premissa "não há arnês de interação" é falsa, e o arnês existente — sem uma linha de dependência — prende M3b, M3c e M3e. O custo do conserto é um arquivo de teste.

### 1.4 (b) Composição e inelegibilidade

- **Ciclo 2 (medido no parecer do inspetor e nos votos):** universo de 20 inelegíveis gerado no objeto; C1 `jurado-dash2-c1-opus`, C2 `jurado-dash2-c2-opus`, C3 `jurado-dash2-c3-cdx` — identidades novas, 0 ocorrência no objeto/main, distintas entre si; §C7.4-bis por nome (achou ciclo 1 = `jurado-dash-c1-cdx`, `jurado-dash-c3-opus`; planejou = `planejador-dash-ciclo2-fable`; desenvolveu = `dev-dash-ciclo2-opus`), nenhum votou. **A composição cobriu a competência que o achado exige:** a cadeira da troca de organização (C2) é exatamente a que mede a navegação pós-seleção, e mediu com sonda de clique própria, controle positivo e restauro por hash.
- **C3 não votou** (Codex no limite semanal, 22:42Z → 24/10 20:38): 1 linha em `00-quedas.md` (P6: `jurado-dash2-c3-cdx | GPT-5.6 Sol (pin) | 3 itens | antes de medir | limite semanal | redo integral`). Não altera o veredito (unanimidade impossível com a C2 reprovando) e não é perda de competência para a auditoria: os itens da C3 (regressão/escopo/CI) foram cobertos pelo dev do ciclo 2 e pelas re-execuções da C2 (`test:smoke` 1335/1335, `check` ec 0, delta de produto 0) e serão medidos de novo no ciclo 3.
- **Quem achou não planeja nem desenvolve:** `jurado-dash2-c2-opus` (achou) ≠ `planejador-dash-ciclo3-fable` (este, identidade nova, Fable) ≠ dev do ciclo 3 (identidade nova, a nomear). Nenhum dos três vota no ciclo 3.
- **Inelegíveis para o ciclo 3 (lista que o inspetor confere por nome):** os 20 do ciclo 2 **+** `jurado-dash2-c1-opus`, `jurado-dash2-c2-opus`, `jurado-dash2-c3-cdx`, `inspetor-dash2-opus`, `inspetor-dash2b-opus`, `dev-dash-ciclo2-opus`, `planejador-dash-ciclo2-fable`, `planejador-dash-ciclo3-fable`, e o dev do ciclo 3 quando nomeado. **Sem Codex**; executores: Claude Opus (subagente), Claude Opus pelo Antigravity, Gemini 4 Argon pela API só como 2º revisor (nunca cadeira única, nunca único revisor).

### 1.5 (c) Dado podre no planejamento — a premissa "não há arnês de interação" foi medida?

**Não.** Evidência: (i) `grep` no plano do ciclo 2 (§1.2 item 2) → a afirmação aparece uma vez (l.256), sem comando; (ii) a sonda do próprio plano (seção 1.2 dele) usou `renderToString` — o planejador generalizou o seu instrumento para o repositório; (iii) um único comando — `git grep -l createRoot faad24ce -- frontend/tests` — teria refutado a premissa em segundos; (iv) a premissa estava refutada **dentro do próprio diff do bloco** (`a6b91ce9` edita `work-orders-page-live.test.tsx`) e **na emenda** que o plano leu (lista dos 37 setups).

Classificação: **dado podre de planejamento, da classe "premissa não medida"** — a mesma família que o plano do ciclo 2 diagnosticou no ciclo 1 ("prova por forma onde a propriedade é comportamental", 1.6 dele), agora na variante "capacidade do repositório afirmada a partir do instrumento do autor". Propagou-se em cadeia: plano → registro do dev (`pre-existente`) → mandato da C2 (l.72/102, "está registrada… medido por `grep -c`"). **Parou na C2**, que aplicou R2/P3 (nada herdado como fato) e mediu. Regra para o ciclo 3 (já aplicada neste plano): toda afirmação sobre o que o repositório TEM ou NÃO TEM vem com o `git grep`/`git show` que a sustenta, na ref julgada (§A7).

O relatório do dev do ciclo 2 também registrou (§A2, sem trocar critério em silêncio) duas falhas de forma nos comandos da bateria do plano do ciclo 2 — `git diff --exit-code origin/main...HEAD -- frontend/src src …` dá ec 1 por construção (o PR contém o produto do ciclo 1) e o contador de asserções removidas conta 1 por `assert.match(` multilinha. Não são dado podre do achado, mas são **comandos de bateria que não podem passar** — a bateria do ciclo 3 (§2.7) mede o escopo no **delta do ciclo** (`faad24ce..HEAD`) e conta linhas removidas de teste com `grep -cE '^-[^-]'` = 0 (o ciclo 3 não remove nada).

### 1.6 Sinal de não-convergência

- **Mesma classe nos ciclos 1 e 2?** Sim: "arnês que não prende a mudança do bloco" (C3-01 → C2-dash2-01).
- **Sem informação nova?** **Não — há informação nova**, de dois tipos: (i) a premissa que sustentava o adiamento foi **refutada por execução** (o arnês existe desde `3e40a256`, roda na CI, não precisa de dependência; `work-orders-page-live` foi tocado pelo próprio bloco); (ii) a lacuna do ciclo 2 **não era desconhecida** — era o único item que o plano deixou conscientemente de fora (7 mutações presas, 1 adiada), não uma classe redescoberta. Pelo critério que o próprio plano do ciclo 2 fixou em §2.8 ("mesma classe **sem informação nova**"), **não há sinal de não-convergência**.
- **O que há:** um erro de **calibração do plano** (adiar um `dentro-do-bloco` conhecido no último ciclo em que não grave reprova, sobre premissa não medida) e um erro de **registro** (rótulo `pre-existente` sem evidência). Ambos se consertam com um arquivo de teste e uma linha de status — ver Parte 2.
- **Convergência esperada no ciclo 3:** o conserto está pré-validado por esta auditoria (sonda verde no objeto, vermelha sob M3b/M3c/M3e); o produto não muda (zero produto desde `a6b91ce9`, dois ciclos de execução concordante); e a régua do ciclo 3 (§C7 item 8(2)) faz qualquer achado residual não grave virar pendência com dono e o bloco mergear. Risco residual a declarar na ata: **todas as cadeiras na mesma família de modelo (Opus)** por indisponibilidade do Codex — mitigado com o Argon como 2º revisor do teste novo (§2.8).
- **Para o dono, em uma linha:** em três ciclos o bloco não teve **nenhum defeito de produto** medido; os ciclos 2 e 3 compraram cobertura de teste (7 + 3 mutações presas) e corrigiram dois registros.

---

## Parte 2 — Plano do ciclo 3 (conserto mínimo; ZERO produto)

### 2.1 Objetivo, ator, fluxo

- **Objetivo:** prender por **comportamento executado** a mudança do bloco em `ContextSelectionPage.handleActivate` (objeto l.41–56): depois do clique em uma organização, o ator vai para a **landing derivada das permissões da sessão NOVA** (não para `/dashboard` incondicional), o **contexto ativo é gravado com essas permissões**, e **sem landing a tela fica na seleção com a mensagem** — de modo que **M3b, M3c e M3e fiquem vermelhas** (e M1a também, de quebra). Fechar `P-DASH-PERFIL-TROCA-CLIQUE-SEM-TESTE` com evidência e corrigir o escopo. **ZERO produto:** nenhuma linha de `frontend/src/**` ou `src/**` muda (produto provado três vezes; patch-id `faa83b03` desde o ciclo 1).
- **Ator:** dev do ciclo 3, **identidade nova** (`dev-dash-ciclo3-<executor>`), nível menor declarado — Claude Opus (subagente) ou Claude Opus pelo Antigravity. Não é a C2 do ciclo 2, não é este planejador, não é o dev do ciclo 2 (§C7.4-bis).
- **Fluxo origem → destino:** inalterado (login → `/select-context` → clique → `POST /auth/active-tenant` → sessão nova → `resolveContextLandingRoute` → `navigate(landing)`). O que muda é só o arnês: a página passa a ser **montada e clicada** num teste do `test:smoke`.
- **Tela-modelo e skills (§4 do CLAUDE.md, `D-TELAS-SEGUEM-O-PADRAO`):** não há tela nova; o **teste-modelo** é `frontend/tests/work-orders-page-live.test.tsx` (B-SAN3-01b, #402) e o padrão de caso é o K1–K3 da sonda desta auditoria (§1.3 c).

### 2.2 Contrato e modelagem

- **Contrato:** sem mudança. `POST /api/v1/auth/active-tenant` `{ tenantId }` com Bearer → 200 `data.permissions` = catálogo do papel (T5), 403 `FORBIDDEN` sem `data` (T6), 401 sem Bearer, 400 sem `tenantId` — provado no ciclo 2 e intocado. Frontend: a landing pós-seleção é `resolveContextLandingRoute(nextSession.user.permissions)` (`dashboard:read` → `/dashboard`; `financial_entries:read` → `/finance`; `inventory_items:read` → `/inventory`; `work_orders:read` → `/work-orders`; `notifications:read` → `/notifications`; senão `null` → erro "Seu perfil não possui telas associadas." e a tela fica na seleção). Nada de `tenant_id` externo, token em log ou campo novo.
- **Modelagem:** nenhuma — sem migration, sem model, sem dado persistido novo.

### 2.3 Arquivos tocados (caminhos exatos) e regra do espelho

| # | arquivo | ação | espelho (módulo/arquivo de referência) |
|---|---|---|---|
| A | `frontend/tests/context-selection-page-live.test.tsx` | **NOVO** (3 casos + `after()` de `console.error`) | `frontend/tests/work-orders-page-live.test.tsx` (`3e40a256`): copiar **verbatim** o DOM mínimo (l.30–320 do objeto: `HTML_NS` … `const text`), a instalação "DOM primeiro, módulos depois" (l.322–364: `installMiniDom()`, espião de `console.error`, `await import` de `react`/`react-dom/client`/`react-router-dom`/provedores, `act`/`settle`), `installFetch` com tabela de rotas em que **rota não prevista LANÇA** (l.366–391), `withPage` (isolamento por caso) e `fire` por `__reactProps$` (l.541–556). Cabeçalho com o mesmo contrato (a)–(g) e **duas diferenças declaradas**: (1) `setTimeout` do `win` colapsa o atraso (`(fn) => globalThis.setTimeout(fn, 0)`) porque `listAvailableContexts` espera `window.setTimeout(resolve, 250)`; (2) o botão é localizado por `text(el).includes("Org Dois")` (o `buttonNamed` do modelo usa `startsWith`, e o texto do botão começa pelas iniciais "OD"). Zero dependência nova. |
| B | `frontend/package.json` | **MODIFICADO**: só a string `"test:smoke"` (l.11) ganha ` tests/context-selection-page-live.test.tsx` no fim | precedente: ciclo 2 (`dashboard-profile-provider`), `san3-06b-*` |
| C | `agent-orchestration/controle/pendencias.md` | **MODIFICADO**: a entrada `P-DASH-PERFIL-TROCA-CLIQUE-SEM-TESTE` (l.11378–11384 do objeto) — só a linha `- **status:** ABERTA · **escopo:** …` é trocada e uma nota `<sub>` é acrescentada logo abaixo (§2.5); corpo original preservado (§A2). **Mais 1 pendência nova** apensada ao fim (`P-FRONT-DOM-MINIMO-TRIPLICADO`, Parte 3 item 4) | formato das entradas FECHADAS (ex.: `P-034`, l.452–453 do objeto) |
| C' | `agent-orchestration/controle/pendencias-indice.md` | **REGENERADO** por `python agent-orchestration/controle/gerar-indice-pendencias.py` (índice é gerado, não digitado) | ciclo 2 |
| D | `docs/revisoes/TELAS/B-DASH-PERFIL-ciclo3-dev.md` | **NOVO** relatório do dev (P1: comando, saída, veredito parcial; hashes das mutações restauradas) | `docs/revisoes/TELAS/B-DASH-PERFIL-ciclo2-dev.md` |
| E | `agent-orchestration/omega/reprovacoes/R-B-DASH-PERFIL-2.md`, `omega/juntas/J-B-DASH-PERFIL-ciclo2.md` (ata), `J-B-DASH-PERFIL-ciclo3.md`, `votos/B-DASH-PERFIL-ciclo3/**` | orquestrador e junta (não o dev) | ata do ciclo 1 |

**Não se toca** (e a bateria prova): `frontend/src/**`, `src/**`, `frontend/tests/work-orders-page-live.test.tsx` e `patios-dossie-versao.smoke.test.tsx` (**não extrair** o DOM mínimo para helper neste ciclo — tocaria dois testes mergeados de outros blocos; fica como pendência com dono), `frontend/tests/helpers/**`, `dashboard-profile-behavior.test.tsx`, `dashboard-profile-provider.test.tsx`, os 37 setups, `tests/**` da raiz.

### 2.4 Os testes e as mutações que cada um deve deixar vermelhas

**Arnês comum do arquivo A** (tudo antes de qualquer `import` de `react-dom/client`, como no modelo): `process.env.VITE_USE_MOCKS = "false"`; `const dom = installMiniDom()`; `dom.win.setTimeout = (fn) => globalThis.setTimeout(fn, 0)`; espião de `console.error`; `await import` de `react`, `react-dom/client`, `react-router-dom`, `../src/pages/ContextSelectionPage`, `../src/providers/{AuthProvider,TenantProvider,PermissionProvider}`, `../src/modules/auth/auth.storage` (`setStoredAuthSession`, `getStoredAuthSession`), `../src/modules/auth/auth.adapter` (`resolveFrontendPermissionsFromBackend`), `../src/mocks/auth/context` (`mockSession`). `LocationProbe` = componente que renderiza `h("span", { "data-probe": "", "data-path": useLocation().pathname })`.

**`mountSelection(payloadPermissions)`:** `dom.storage.clear()`; `setStoredAuthSession({ ...mockSession, accessToken: "tok-0", tenant: { id: "org-um", name: "Org Um" }, user: { ...mockSession.user, roles: [], permissions: ["dashboard:read", "work_orders:create"] } })`; `installFetch([[/\/me\/tenants(\?|$)/, () => json(200, { data: [ {tenant:{id:"org-um",name:"Org Um",status:"active"},user:{id:"u1",roles:["manager"],status:"active"}}, {tenant:{id:"org-dois",name:"Org Dois",status:"active"},user:{id:"u1",roles:["finance"],status:"active"}} ] })], [/\/auth\/active-tenant$/, () => json(200, { data: { accessToken:"tok-B", tokenType:"Bearer", expiresIn:900, refreshToken:"r-B", refreshExpiresAt:<ISO +1h>, sessionId:"s-B", tenant:{id:"org-dois",name:"Org Dois"}, user:{id:"u1",name:"Fulana",email:"f@x.example"}, roles:["finance"], permissions: payloadPermissions } })]])` (rota não prevista LANÇA); `createRoot` + `act(render(MemoryRouter{initialEntries:["/select-context"]} > AuthProvider > TenantProvider > PermissionProvider > Routes{ "/select-context": <div><ContextSelectionPage/><LocationProbe/></div>, "*": <LocationProbe/> }))`; `settle()`. O `installFetch` registra `{ method, url }` de cada chamada. Leitura: `path()` = `data-path` do probe; `html()`; `stored()` = `getStoredAuthSession()`; `ctx()` = `JSON.parse(localStorage["erp-techsolutions.active-context"] ?? "null")`; `posts()` = chamadas `POST` com url terminando em `/auth/active-tenant`.

**Casos** (cada um dentro de `withPage`, que desmonta sempre e assere zero `console.error` quando verde):

- **K1 `Financeiro: o clique leva a /finance, a landing da sessão nova — não a /dashboard`.** `mountSelection(["financial_entries:read"])`; `fire(botão "Org Dois", "onClick")`. Asserções: `path() === "/finance"`; `posts().length === 1` com `Authorization: "Bearer tok-0"` e body `{"tenantId":"org-dois"}`; `stored().user.permissions` deepEqual `resolveFrontendPermissionsFromBackend(["financial_entries:read"])` e **não** inclui `dashboard:read`; `ctx().tenantId === "org-dois"` e `ctx().permissions` deepEqual `stored().user.permissions`. **Vermelho com M3b** (path `/dashboard`), **M3c** (ctx ≠ sessão), **M1a** (sessão inclui `dashboard:read`).
- **K2 `Estoque: o clique leva a /inventory`.** `mountSelection(["inventory_items:read"])`; clique. Asserções: `path() === "/inventory"`; `ctx().permissions` deepEqual `stored().user.permissions` (= adapter de `["inventory_items:read"]`). **Vermelho com M3b, M3c.**
- **K3 `sem capacidade canônica: fica na seleção com a mensagem, sem navegar e sem gravar contexto`.** `mountSelection(["os.read"])`; clique. Asserções: `path() === "/select-context"`; `html()` contém `Seu perfil não possui telas associadas.`; `ctx() === null`; `posts().length === 1` (a troca aconteceu, a navegação não). **Vermelho com M3e.**
- **`after()`:** restaura `console.error` e assere `consoleErrors` vazio (H3: aviso do React é vermelho, não ruído).

**Mutações** (o dev aplica uma por vez em `frontend/src/pages/ContextSelectionPage.tsx` do seu worktree por script com âncora única e CRLF preservado — o `apply.cjs` do ciclo 2 serve —, roda o arquivo A, **restaura por cópia byte a byte** e prova `git hash-object` = `e34d4cbdcb9be31fc9a4100106201d07f344e1bc` = `git rev-parse faad24ce:frontend/src/pages/ContextSelectionPage.tsx`; a cadeira C2 re-executa):

| id | âncora (n=1) | mutação exata | fica vermelho |
|---|---|---|---|
| M3b | `navigate(landing);` | `navigate("/dashboard");` (= linha da base `bf83cda8`) | K1, K2 |
| M3c | `setActiveContext({ ...context, permissions });` | `setActiveContext({ ...context });` | K1, K2 (e o caso 3 de `dashboard-profile-behavior`) |
| M3e | bloco `if (!landing) {\n  throw new Error("Seu perfil não possui telas associadas.");\n}\n` | removido | K3 |
| M1a (re-execução, arquivo `frontend/src/modules/context/repository.ts`, blob `68a4804f…`) | `permissions,` em `nextSession.user` | `permissions: [...currentSession.user.permissions, ...permissions],` | K1 (e T4) |

**Contagem:** +3 casos de comportamento; 0 removidos; `test:smoke` **1335 → 1338**; testes do bloco **19 → 22**; mutações provadas vermelhas **7 → 10** (M3b, M3c, M3e novas; M1a re-presa por caminho novo).

### 2.5 A pendência `P-DASH-PERFIL-TROCA-CLIQUE-SEM-TESTE` — fechada com evidência e escopo corrigido

Na entrada existente (`pendencias.md`, l.11378–11384 do objeto), o dev **troca só a linha de status** e **acrescenta uma nota `<sub>`** logo abaixo dela; cabeçalho, `Origem`, descrição, `bloqueia` e `teste de encerramento` ficam byte a byte (§A2: o texto original se preserva, inclusive o rótulo errado, que a nota explica).

Linha de status nova (substitui `- **status:** ABERTA · **escopo:** \`pre-existente\` … · **dono:** …`):

```
- **status:** FECHADA em <AAAA-MM-DD> (ciclo 3 do `B-DASH-PERFIL`, PR #446) · **severidade:** era BAIXA · **escopo:** `dentro-do-bloco` (corrigido — ver nota) · **dono:** encerrado
  <sub>**FECHADA por EXECUÇÃO no ciclo 3.** O escopo `pre-existente` registrado em 19/10 não tinha evidência de data ou origem (§C7.1-ter(a)): a linha `navigate(landing)` é de `a6b91ce9` (18/10, o commit de produto deste bloco; na base `bf83cda8` era `navigate("/dashboard")`, `0b1a7dfb` de 02/07), e a justificativa "falta de arnês de interação" era FALSA no objeto — `frontend/tests/work-orders-page-live.test.tsx` (`3e40a256`, 02/10, #402) já tinha DOM mínimo + `createRoot` + `React.act` + `onClick` real, sem dependência, no `test:smoke`, e o próprio `a6b91ce9` editou esse arquivo. Achado `C2-dash2-01` (`jurado-dash2-c2-opus`, ciclo 2); auditoria e plano do ciclo 3 em `omega/reprovacoes/R-B-DASH-PERFIL-2.md`. Teste de encerramento: `frontend/tests/context-selection-page-live.test.tsx` (K1–K3, no `test:smoke`), medido em `docs/revisoes/TELAS/B-DASH-PERFIL-ciclo3-dev.md` §3: M3b (`navigate("/dashboard")`) → K1 e K2 vermelhos; M3c (`setActiveContext({ ...context })`) → K1 e K2; M3e (sem a guarda de landing nula) → K3; restauro provado por `git hash-object` = `e34d4cbd…`.</sub>
```

O índice (`pendencias-indice.md`) é **regenerado** (`python agent-orchestration/controle/gerar-indice-pendencias.py`), nunca editado à mão; a linha da pendência passa de ABERTA a FECHADA no índice por consequência.

### 2.6 Escopo PERMITIDO / PROIBIDO

**PERMITIDO (e nada além):**
- `frontend/tests/context-selection-page-live.test.tsx` (novo);
- `frontend/package.json` **somente** a string `"test:smoke"` (l.11; acrescentar o arquivo no fim); nenhuma dependência, nenhum outro script;
- `agent-orchestration/controle/pendencias.md`: **somente** (i) a linha de status + nota `<sub>` da `P-DASH-PERFIL-TROCA-CLIQUE-SEM-TESTE` (§2.5) e (ii) 1 entrada nova apensada ao fim (`P-FRONT-DOM-MINIMO-TRIPLICADO`, Parte 3 item 4); `pendencias-indice.md` **só por regeneração**;
- `docs/revisoes/TELAS/B-DASH-PERFIL-ciclo3-dev.md` (novo);
- registro do orquestrador/junta (não do dev): `agent-orchestration/omega/reprovacoes/R-B-DASH-PERFIL-2.md`, `omega/juntas/J-B-DASH-PERFIL-ciclo2.md`, `J-B-DASH-PERFIL-ciclo3.md`, `votos/B-DASH-PERFIL-ciclo3/**`, `controle/tarefas.md`, `docs/status-geral.md`, `codex/log-execucao.md`; corpos de jurado em `.claude/agents/especialistas/jurado-dash-*` + espelho `.agents/` só se a fábrica regenerar (C3-03: artefato aceito; `sync-agent-agents.mjs --check` tem de passar).

**PROIBIDO:**
- **qualquer arquivo de `frontend/src/**` e de `src/**`** (o produto está provado em três ciclos; mudar reabre C1/C2 e a classe dos 68 smokes); em particular `ContextSelectionPage.tsx`, `repository.ts`, `landing-route.ts`, `PermissionProvider.tsx`, `auth.routes.ts`;
- `frontend/tests/work-orders-page-live.test.tsx`, `frontend/tests/patios-dossie-versao.smoke.test.tsx` (não extrair o DOM mínimo para helper neste ciclo), `frontend/tests/helpers/**`, `frontend/tests/dashboard-profile-behavior.test.tsx`, `frontend/tests/dashboard-profile-provider.test.tsx`, os 37 setups da emenda, `frontend/tests/operator-profiles.smoke.test.tsx`, todo `tests/**` da raiz;
- **dependência nova** (jsdom, happy-dom, @testing-library, playwright…) — decisão crítica de 5 (§C7.1), fora deste ciclo e desnecessária (§1.3);
- `prisma/**`, `migrations/**`, `Kpis/**` (congelado), `infra/**`, `.github/**`, `.env*`, lockfiles, `mobile/**`, `portals/**`, `screen-refs/**`, CSS/tokens/design system, aparência;
- remover ou afrouxar asserção existente; `assert.match` sobre fonte como prova de propriedade comportamental; assertar contagem de `GET /me/tenants` (frágil; o efeito é pré-existente);
- base viva (`erp-postgres`, `erp-redis`), portas 5432/6379/3000/5173/5050/8899, `prune`, `tail -f`, junction de `node_modules`; subir contêiner (o ciclo 3 não precisa de Linux local: a CI é a execução Linux).

### 2.7 Bateria de validação (a exata, nesta ordem; tudo no Windows — a CI é a execução Linux)

Lições do ciclo 2 aplicadas: o escopo é medido no **delta do ciclo** (`faad24ce..HEAD`), não em `origin/main...HEAD` (que contém o produto do ciclo 1 por construção); linhas removidas de teste são contadas com `^-[^-]` (o ciclo 3 não remove nada, então o número é 0 sem exceção de multilinha).

```bash
# 0. terreno (worktree próprio do dev no ramo fix/dash-perfil, a partir de faad24ce; npm ci próprio; sem junction)
git status --short | grep -vE '^ M \.(agents|claude)/'        # vazio
git diff --check
(Get-Item frontend/node_modules).LinkType                       # vazio (PowerShell) — zero junction

# 1. escopo: zero produto, zero teste alheio, zero dependência, zero remoção
git diff --name-only faad24ce..HEAD                              # esperado: exatamente A, B, C, C', D (+ registro do orquestrador, se no mesmo ramo)
git diff --exit-code faad24ce..HEAD -- frontend/src src frontend/tests/helpers frontend/tests/work-orders-page-live.test.tsx frontend/tests/patios-dossie-versao.smoke.test.tsx frontend/tests/dashboard-profile-behavior.test.tsx frontend/tests/dashboard-profile-provider.test.tsx tests prisma migrations infra mobile portals Kpis .github package.json package-lock.json frontend/package-lock.json
test "$(git diff -U0 faad24ce..HEAD -- frontend/package.json | grep -E '^[+-][^+-]' | grep -vc '"test:smoke"')" = 0
test "$(git diff -U0 faad24ce..HEAD -- frontend/tests tests | grep -cE '^-[^-]')" = 0
test "$(git diff -U0 faad24ce..HEAD -- agent-orchestration/controle/pendencias.md | grep -E '^-[^-]' | grep -vc 'status:\*\* ABERTA')" = 0   # só a linha de status sai
grep -c 'tests/context-selection-page-live.test.tsx' frontend/package.json        # 1
grep -cE 'jsdom|happy-dom|testing-library' frontend/tests/context-selection-page-live.test.tsx   # 0

# 2. tipos
npm run check
npm --prefix frontend run check

# 3. testes do bloco (o novo + os vizinhos que compartilham arnês/propriedade)
cd frontend && node --test --import tsx tests/context-selection-page-live.test.tsx tests/dashboard-profile-provider.test.tsx tests/dashboard-profile-behavior.test.tsx tests/work-orders-page-live.test.tsx && cd ..
#    esperado: 3 (novo) + 4 + 4 + os casos de work-orders-page-live, fail 0

# 4. mutações (uma por vez, cópia byte a byte do original, alvo = o arquivo A; restauro; hash = blob do objeto)
#    M3b, M3c, M3e -> frontend/src/pages/ContextSelectionPage.tsx -> K1/K2, K1/K2, K3 vermelhos; restauro e34d4cbd…
#    M1a           -> frontend/src/modules/context/repository.ts   -> K1 vermelho; restauro 68a4804f…
#    após as 4: git diff --stat HEAD -- frontend/src   -> vazio

# 5. regressão
npm --prefix frontend run test:smoke        # esperado: # tests 1338 · pass 1338 · fail 0
npm --prefix frontend run build
npm run lint
npm run build

# 6. registro
python agent-orchestration/controle/gerar-indice-pendencias.py && git diff --stat -- agent-orchestration/controle/pendencias-indice.md   # índice = gerado
git show HEAD:agent-orchestration/controle/pendencias.md | grep -c 'P-DASH-PERFIL-TROCA-CLIQUE-SEM-TESTE'   # >= 1

# 7. espelhos e fechamento
node scripts/sync-agent-agents.mjs --check
node scripts/sync-agent-skills.mjs --check
git diff --check
```

Registrar no relatório do dev (D): SO/Node/SHA, cada comando com exit code e `# tests/pass/fail/skip`, hashes antes/depois de cada mutação, e a limpeza (`frontend/dist`, `dist`, `*.tsbuildinfo`; nunca rastreados, `node_modules`, `.env`). **Contêiner Linux não é exigido:** o ciclo 3 não toca backend nem `tests/` da raiz; os itens 6a/6b do ciclo 2 valem (produto e backend inalterados, patch-id `faa83b03`), e o `test:smoke` roda em Linux na CI (`ci.yml:325`, Node 20) — o inspetor confere os check-runs concluídos no objeto.

### 2.8 Governança do ciclo 3 — régua, formato da junta, separação de papéis

- **Régua (§C7 item 8(2), teto de 2 ciclos):** a partir do ciclo 3 **só bloqueia defeito de produto grave** — perde dado, vaza dado entre organizações, quebra permissão na autoridade ou erra dinheiro. **Todo outro achado** (arnês, forma de teste, registro, mandato, processo) **vira pendência com dono e o bloco mergeia.** Escrever isso, verbatim, no mandato de cada cadeira. A auditoria da máquina do ciclo 3 (`D-SEM-TETO-AUDITORIA-NO-3`) **deixou de ser obrigatória** pela mesma decisão.
- **Junta completa ou junta de 3 no mesmo formato?** As duas coisas são a mesma: o bloco é de **permissão** (`D-GOV-PROPORCIONAL` (1) classifica pelo risco do bloco, não pelo tamanho do delta), logo o formato continua **inspetor de terreno + 3 cadeiras novas + unanimidade com veto**. O que muda no ciclo 3 não é o formato, é a **régua do veto** (acima) e o **tamanho dos mandatos** — enxutos, porque produto e backend não mudam (patch-id `faa83b03`) e o delta é 1 teste + 1 linha + 2 registros:
  - **C1 (cadeia de acesso)** — 2 itens: (1) `git diff --name-only faad24ce..<objeto> -- frontend/src src` = 0 e patch-id do produto = `faa83b03`; (2) re-execução barata dos comandos registrados em `c1-evidencia.md` do ciclo 2 (T5/T6 no Windows, segundos) — P3: comando registrado é roteiro, conclusão herdada não é insumo.
  - **C2 (troca de organização)** — 3 itens: (1) o arquivo A verde no objeto por execução própria (e sonda própria se quiser, sem dependência); (2) M3b, M3c, M3e (e M1a) vermelhas no **seu** worktree, restauro por hash; (3) a pendência fechada com evidência válida de escopo e o índice regenerado (`git show <objeto>:agent-orchestration/controle/pendencias.md | grep -n -A3 P-DASH-PERFIL-TROCA-CLIQUE-SEM-TESTE`).
  - **C3 (regressão e escopo)** — 3 itens: (1) `test:smoke` 1338/1338 e `check`/`build` no objeto; (2) escopo: delta `faad24ce..<objeto>` só nos PERMITIDOS, 0 linha removida em `frontend/tests`/`tests`, 0 dependência; (3) o arquivo A na lista do `test:smoke` e check-runs do objeto concluídos (`gh api repos/thiagodorgo/ERP_Techsolutios/commits/<sha>/check-runs`).
- **Composição (sem Codex; executores disponíveis: Claude Opus subagente, Claude Opus pelo Antigravity, Gemini 4 Argon pela API só como 2º revisor):** inspetor `inspetor-dash3-opus` (Opus subagente); C1 `jurado-dash3-c1-opus` (Opus subagente); C2 `jurado-dash3-c2-agy` (Opus pelo Antigravity — executor diferente do subagente, mesmo modelo); C3 `jurado-dash3-c3-opus` (Opus subagente, disparado quando C1 concluir — P5, máximo 2 em paralelo). **Argon:** opcional, como **2º revisor do arquivo A** (lê o teste e aponta asserção frouxa ou caso que passa por acidente); **não é cadeira, não vota**; seus achados só entram se uma cadeira os re-executar. Todos os corpos são os mesmos do ciclo 1/2 (`jurado-dash-c{1,2,3}-*`), lidos do objeto (R1 do ciclo 2). Mandato forma A com pré-voo para inspetor e cadeiras; P1–P7 verbatim. **Declarar na ata:** as três cadeiras na mesma família de modelo por indisponibilidade do Codex (risco de monocultura; mitigação = Argon como 2º revisor + corpos distintos por competência).
- **Separação de papéis (§C7.4-bis), por nome:** achou = `jurado-dash2-c2-opus`; auditou e planejou = `planejador-dash-ciclo3-fable` (este, Fable, sem fallback); desenvolve = `dev-dash-ciclo3-<executor>` (identidade nova, Opus declarado); nenhum dos três vota. Inelegíveis: lista do §1.4.
- **Briefing obrigatório (o inspetor confere a presença):** este arquivo (via `R-B-DASH-PERFIL-2.md`); a ata do ciclo 2 (com a C3 "não votou — executor sem limite (P6)" e a linha em `00-quedas.md`); a lista de inelegíveis do §1.4; a régua do ciclo 3 verbatim; os comandos da sonda do §1.3(c) como roteiro de re-execução da C2.
- **Objeto:** o SHA do head do ramo depois do commit do ciclo 3 (e de novo merge da `main`, se preciso), com **check-runs concluídos**; ausência/`queued`/`cancelled` bloqueia o start (§C7.1-bis).
- **Sinal de não-convergência a relatar:** se o ciclo 3 reprovar, só pode ser por defeito de produto grave — e o produto não muda neste ciclo. Reprovação por qualquer outra razão é, por construção, **erro de aplicação da régua** e a ata registra assim.

### 2.9 Riscos e rollback

| risco | mitigação |
|---|---|
| R1 — terceira cópia do DOM mínimo (duplicação) | aceita neste ciclo (padrão do repositório: 2 cópias já mergeadas); extração para `frontend/tests/helpers/mini-dom.ts` vira pendência com dono (Parte 3 item 4), em bloco próprio pela regra (1) (um revisor + CI), porque toca testes mergeados de outros blocos |
| R2 — `useEffect(..., [session])` refaz `GET /me/tenants` depois da troca (medido 2×) | pré-existente (base `bf83cda8`), não grave; o teste **não** asserta contagem de GETs, só 1 `POST /auth/active-tenant` |
| R3 — tempo: atraso de 250 ms da lista e `settle` | `setTimeout` do `win` colapsa para 0 (declarado no cabeçalho); `settle` de 4 voltas de macrotask (medido suficiente); se o CI Linux oscilar, aumentar as voltas, nunca introduzir `sleep` real |
| R4 — `navigator` global em Node ≥ 21 | contrato (c) do arnês copiado verbatim (`if (typeof navigator === "undefined")`); CI é Node 20 |
| R5 — tentação de mexer no produto, extrair helper ou "aproveitar" para C1-01 | PROIBIDO; item 1 da bateria reprova qualquer diff fora dos permitidos |
| R6 — todas as cadeiras em Opus | declarado na ata; Argon como 2º revisor do arquivo A; corpos distintos por competência; comandos registrados (P1) permitem re-execução por qualquer sucessor |
| R7 — o dev assertar `path` lendo `window.location` em vez do probe de rota | o DOM mínimo não atualiza `location`; o padrão é o `LocationProbe` com `useLocation()` dentro do `MemoryRouter` (§2.4) |

**Rollback:** revert do(s) commit(s) do ciclo 3 (1 teste, 1 linha do `test:smoke`, 2 entradas de registro, 1 relatório); sem migration, sem dado, sem irreversibilidade. O produto do objeto permanece `faad24ce` byte a byte.

### 2.10 Baseline e meta

- Baseline do bloco (pré-bloco, plano do ciclo 1): **N = 4** casos adjacentes; meta M ≥ 8. Ciclo 1 entregou 13; ciclo 2, **19** (−2 forma, +8 comportamento); ciclo 3 entrega **22** (+3 de comportamento executado: K1, K2, K3). `test:smoke` **1335 → 1338**.
- Mutações provadas vermelhas: ciclo 1 declarou 5; ciclo 2 somou 7 (M1, M1b, M7, M1a, M3, M2, M6); ciclo 3 soma **3** (M3b, M3c, M3e) e re-prende M1a por caminho de clique → **10 sobre a mudança central do bloco**, todas re-executáveis pela C2.
- Pendências: 1 fechada com evidência (`P-DASH-PERFIL-TROCA-CLIQUE-SEM-TESTE`), 1 aberta com dono (`P-FRONT-DOM-MINIMO-TRIPLICADO`); saldo líquido 0.

---

## Parte 3 — O que fica FORA do ciclo 3, com dono

1. **`P-DASH-PERFIL-SUPER-ADMIN-ATALHO-UI`** (C1-01 + S4; `011632f1`, 2026-06-07; UI-only, não grave) — inalterada; dono `B-SAN3-06a`. A C1 do ciclo 2 reconfirmou o `pre-existente` por `git log -S`/`git blame`.
2. **C2-opus-02** — `enabledModules` do contexto por mapa estático (`repository.ts`, `0b1a7dfb`): dono `B-SAN3-06a`, já registrado na ata do ciclo 1.
3. **Guardas de forma remanescentes** em `dashboard-profile-behavior.test.tsx` (Nova OS, KPI, troca): o caso 3 ("troca de organização decide e persiste…") passa a ser **redundante** com K1/K2 (que prendem a mesma propriedade por comportamento); fica como complemento, sem conversão neste ciclo (o arquivo é PROIBIDO). Conversão em bloco próprio, se o dono quiser.
4. **`P-FRONT-DOM-MINIMO-TRIPLICADO` (nova, BAIXA, dentro-do-bloco por origem — nasce no ciclo 3)** — o DOM mínimo sem dependência existe em 3 cópias (`work-orders-page-live.test.tsx` 1125 l., `patios-dossie-versao.smoke.test.tsx` 1019 l., `context-selection-page-live.test.tsx`), por contrato (a) de cada arquivo ("escrito aqui mesmo"). **Dono:** bloco `chore(test)` próprio, regra (1) de `D-GOV-PROPORCIONAL` (um revisor independente + CI), que extrai para `frontend/tests/helpers/mini-dom.ts` e faz os três importar; **bloqueia:** não; **teste de encerramento:** os três arquivos verdes no `test:smoke` importando o helper, e `git grep -c 'class MiniNode' frontend/tests` = 1. O dev do ciclo 3 apensa a entrada (PERMITIDO em §2.6).
5. **Observação sem pendência:** `GET /me/tenants` 2× por `useEffect(..., [session])` (pré-existente; só custo de rede na tela de seleção). Fica no relatório do dev (D) como nota; se o dono quiser, vira pendência no `B-SAN3-06a`.
6. **C3-05** — `traccar-dev-topology` com `docker ENOENT` no contêiner de teste: dono = ferramenta do terreno (`teste-linux.sh`); sem relação com este ciclo (não se sobe contêiner).
7. **Lições de processo já aplicadas neste plano (sem pendência):** bateria mede escopo no delta do ciclo; toda afirmação "o repositório não tem X" vem com o `git grep` na ref julgada; mandato de cadeira não apresenta registro como fato ("medido por `grep -c`" mede presença, não validade).

## Parte 4 — Resumo para a ata e para o briefing

- **Auditoria:** o achado C2-dash2-01 é **real, não grave, `dentro-do-bloco`** (linha `a6b91ce9`; base era `navigate("/dashboard")`), do **arnês e do registro**, não do produto — produto correto por execução em três ciclos e inalterado desde o ciclo 1 (patch-id `faa83b03`). O voto da C2 está certo na régua do ciclo 2.
- **Processo:** o plano do ciclo 2 adiou um `dentro-do-bloco` conhecido no último ciclo em que não grave reprova, sobre a premissa **não medida e falsa** "não há arnês de interação" (há: `work-orders-page-live.test.tsx`, `3e40a256`, no `test:smoke`/CI, sem dependência; o próprio commit do bloco editou esse arquivo); o dev rotulou `pre-existente` sem evidência; o mandato da C2 herdou. **Dado podre de planejamento, parado pela cadeira.** Sem sinal de não-convergência (há informação nova); erro de calibração, não máquina fabricando achados.
- **Ciclo 3 (ZERO produto):** 1 teste novo `frontend/tests/context-selection-page-live.test.tsx` (K1 `/finance`, K2 `/inventory`, K3 fica na seleção com erro) no `test:smoke` (1335 → 1338), copiando o arnês existente; **M3b, M3c, M3e vermelhas** (pré-validado por sonda desta auditoria: objeto 3/3, M3b 1/3, M3c 1/3, M3e 2/3) e M1a re-presa; pendência fechada com evidência e escopo corrigido; 1 pendência nova (DOM mínimo triplicado, dono chore).
- **Junta:** mesmo formato (inspetor + 3 cadeiras novas + unanimidade), mandatos enxutos, **régua do ciclo 3: só defeito de produto grave reprova; o resto vira pendência e o bloco mergeia.** Sem Codex: cadeiras em Opus (subagente ×2 + Antigravity), Argon só como 2º revisor do teste. Achou `jurado-dash2-c2-opus` ≠ planejou `planejador-dash-ciclo3-fable` ≠ dev (identidade nova).

---

## Fechamento (estado ao entregar, 2026-10-19)

- Arquivo completo: Partes 1–4 gravadas por seção (P1/P2); nenhuma seção `## PAUSA` (não houve ordem de pausa).
- Terreno: `C:/Users/AMP/w-dash` em `faad24ce`; `git status --short` só com `?? agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo2/` (os votos, já lá antes) e os ` M` fantasmas de EOL em `.agents/.claude`; `git hash-object frontend/src/pages/ContextSelectionPage.tsx` = `e34d4cbd…` = blob do objeto; zero untracked em `frontend/tests`/`tests`; nenhum worktree, commit, Docker, base viva, porta ou `frontend/dist` criados.
- Artefatos desta auditoria (fora do repositório, re-executáveis): `<scratchpad>/dash3-plan/mini-dom.mts` (l.30–320 do arnês do objeto + `export`), `sonda-ctx.mts` (K1–K3), `driver.mjs` (variantes `objeto|copia|m3b|m3c|m3e`; cwd `C:/Users/AMP/w-dash/frontend`; `SONDA_DIR=<dir> VARIANT=<v> node --import tsx --input-type=module -e "$(cat driver.mjs)"`), `ContextSelectionPage.{copia,m3b,m3c,m3e}.mjs` (cópias transformadas), `sec-*.md` (rascunhos já concatenados aqui).
- Próximo passo do orquestrador: registrar `omega/reprovacoes/R-B-DASH-PERFIL-2.md` apontando para este arquivo e fechar a ata do ciclo 2 (C3 "não votou — executor sem limite (P6)", linha em `00-quedas.md`); disparar o dev do ciclo 3 (identidade nova, Opus declarado) com a Parte 2 como mandato e a Parte 3 como lista do que NÃO fazer; depois inspetor e as 3 cadeiras com o briefing da §2.8.
