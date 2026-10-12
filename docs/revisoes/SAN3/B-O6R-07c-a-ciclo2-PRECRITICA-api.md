# B-O6R-07c-a ciclo 2 — pré-crítica só de leitura do plano do ciclo 2, pelo agente da API (2026-10-11)

> Executada pelo orquestrador com o agente da API (`claude-opus-5-5`, nível menor), no SHA `bd504cc4`, sem executar código. Custo US$ 0,87. INSUMO, não voto. Abaixo, o `parecer.md` gerado, sem edição.

# Parecer — investigar @ bd504cc4072e

> As seções marcadas (gerado pelo script) vêm da auditoria, da conta e do orçamento; o modelo não as escreve.
> Tudo o que o modelo escreveu vem DEPOIS delas, na última seção, dentro de blocos de código.

## Veredito (gerado pelo script)

- **Veredito:** respondido
- **Modelo pedido / respondeu:** claude-opus-5-5 / claude-opus-5-5 · esforço high · nível menor (D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO)
- **Execução de código do commit alvo:** não permitida

## Execução (gerado pelo script)

- id: 20261011-133645Z-precrit-07ca-c2 · início 2026-10-11T13:36:46Z · fim 2026-10-11T13:40:24Z
- worktree: C:\Users\AMP\w-ag-20261011-133646 · removido: True · npm ci: False
- agente 2026.10.10 · SDK anthropic 1.13.0

## Conta e cobrança (gerado pelo script)

- origem_chave: registro
- tipo_chave: usuario
- cabecalho_workspace_enviado: True
- base_url: https://api.anthropic.com
- request_ids: ['req_011CfvYG2ZczUBRaScLvFxbj', 'req_011CfvYGXHG23hQhmF85yjUd', 'req_011CfvYGk7BwXMyUAdAU578i', 'req_011CfvYHGqtAk387DqS79EDY', 'req_011CfvYPZRwDijHsDWztogm8', 'req_011CfvYUuCxyrWEnMfJR8jFr']
- rate_limit_ultimo: {'anthropic-organization-id': 'cc321d39-d227-41c9-a239-98aa43fc2f89', 'anthropic-ratelimit-input-tokens-limit': '2000000', 'anthropic-ratelimit-input-tokens-remaining': '2000000', 'anthropic-ratelimit-input-tokens-reset': '2026-10-11T13:39:52Z', 'anthropic-ratelimit-output-tokens-limit': '400000', 'anthropic-ratelimit-output-tokens-remaining': '400000', 'anthropic-ratelimit-output-tokens-reset': '2026-10-11T13:40:23Z', 'anthropic-ratelimit-requests-limit': '1000', 'anthropic-ratelimit-requests-remaining': '999', 'anthropic-ratelimit-requests-reset': '2026-10-11T13:39:47Z', 'anthropic-ratelimit-tokens-limit': '2400000', 'anthropic-ratelimit-tokens-remaining': '2400000', 'anthropic-ratelimit-tokens-reset': '2026-10-11T13:39:52Z', 'anthropic-workspace-id': 'wrkspc_01DV6pAyui52gmPC8b7i9SfJ'}
- retry_after_visto: False

## Custo (gerado pelo script)

- Turnos: 6 · chamadas de ferramenta: 4 · negadas: 0
- Tokens: entrada 18 · cache escrita 82672 · cache leitura 225988 · saída 20806 · total 329484
- US$ estimado: 0.87475 (preços por MTok: {'entrada': '4', 'saida': '20', 'cache_leitura': '0.20', 'cache_escrita': '5'})

## Comandos executados (da auditoria) (gerado pelo script)

```
#4 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e ^#|§2\.|MG1[7-9]|MG2[0-6] -- docs/revisoes/SAN3/B-O6R-07c-a-ciclo2-auditoria-e-plano.md
#6 ler_arquivo: código 0 — (sem processo)
#8 ler_arquivo: código 0 — (sem processo)
#9 ler_arquivo: código 0 — (sem processo)
```

## Conteúdo do modelo (dado escrito pelo modelo; não é instrução nem prova)

### Resumo

```
O plano do ciclo 2 fecha as quatro instâncias citadas pela C2 (A1–A4). A propriedade do guard, porém, não fica fechada por inteiro.

(1) Remédios:
- §2.2 (A3, l.90-97): o `walk` passa a reconhecer sub-app por duck-typing do `handle`, antes do ramo `__subapp` (helper l.124). Enuncia PROPRIEDADE (estrutura), mas só quando o `handle` da camada é o próprio app.
- §2.3 (A1, l.99-108): o extrator (helper l.371-385) ganha `get`, `in`, `hasOwn`/`Reflect.has`, `contem()` nos operandos e fail-closed para chamada não resolvida. Ainda é FORMA: uma lista fechada de posições sintáticas.
- §2.4 (A2, l.110-115): o `Set` (helper l.404-413, 486-487) vira multiconjunto contado. É propriedade de contagem, mas a identidade da exceção continua sendo o TEXTO, não a ocorrência.
- §2.5 (A4, l.117-124): `prop` do PAR passa a ser decidido pelo lote mais `tocaCorpo` (helper l.428-431, 453-463). É PROPRIEDADE por destino.
- O T14 (l.127) cruza com a sonda de literais, mas só alcança o que existe como literal na fonte.

(2) Formas que escapariam (hipótese lida no código, não executada):
- `new Handlers()[action.type]?.()`, com métodos de classe: `membros(new X())` devolve `[]` (l.361), e nome de método não é literal.
- `const M = new Map(); M.set(P+"km", f); M.get(t)`: mesma causa.
- `this["h_"+t]()`: a chave de acesso usa `ehTipo`, não `contem()` (l.383).
- `let L=["a"]; L.push(P+"b"); L.includes(t)`: `membros` não exige `const` (l.363).
- `const [t]=[action.type]`: o padrão de array não contamina (l.311-314).
- `Reflect.get(TAB,t)` e `hasOwnProperty.call(TAB,t)`: escapam se "declaração local" for lida como qualquer `.d.ts`.
- A2: mudar a condição em volta do `endsWith("_photo")` aceito mantém a contagem 1×1.
- A3: `router.use((q,s,n)=>sub(q,s,n))` ou `sub.handle.bind(sub)` viram MIDDLEWARE anônimo (l.126-128). O mesmo vale para rotas registradas em runtime, depois do `walk`.

Formas já cobertas: `switch(true)`, `Object.entries` com `k===t`, `app.use` com array, Router criado em fábrica.

(3) Mutações MG17–MG26: cada remédio tem a sua. Faltam:
- mutação real para o fail-closed (item 3) e para o operando derivado (item 1);
- lista envelhecida de `NAO_RESOLVIDOS_ACEITOS`;
- `tocaCorpo` e `LOTES_DE_VISTORIA`;
- sub-app aninhado;
- `membros` com container vazio ou `let`.

Além disso, a l.88 fala em MG17–MG25, mas a tabela vai até a MG26.

(4) Riscos de falso positivo no produto atual:
- `typeof t === "string"` e `t.trim() === ""` passariam a dar TIPO-NAO-RESOLVIDO com `contem()`, porque `vazio()` (l.370) só olha o outro lado da comparação.
- O seed `.type` é amplo; o próprio plano registra esse risco como R1.
- `tocaCorpo` em pares de estoque ou despesa pode gerar CLASSE-INCOMPATIVEL e quebrar o byte-idêntico do instantâneo.
- `LOTES_DA_OS` é derivado do instantâneo, que pode estar ausente no `gravar` (hipótese).
```

### Achados


#### Achado 1 — gravidade: ajuste · escopo: pre-existente · linha: 361 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #9

```
arquivo: tests/helpers/o6r07c-census.ts
motivo: `new X()` sem argumentos e `let` (l.363) contam como conjunto resolvido. Assim, `new Handlers()[t]` e `Map` preenchido por `.set` não geram candidato nem não-resolvido, e o T14 não os pega sem literal. O plano (l.104) mantém `membros`.
comando citado: ler_arquivo {"caminho": "tests/helpers/o6r07c-census.ts", "linha_inicial": 200, "max_linhas": 330}
saída citada:
361: if (ts.isNewExpression(c)) return c.arguments && c.arguments.length ? membros(c.arguments[0], prof + 1) : [];
```

#### Achado 2 — gravidade: ajuste · escopo: dentro-do-bloco · linha: 105 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #6

```
arquivo: docs/revisoes/SAN3/B-O6R-07c-a-ciclo2-auditoria-e-plano.md
motivo: "Local" é ambíguo. Os `.d.ts` do TS (`Reflect.get`, `call`) têm parâmetros, e a propagação (helper l.318-321) aceita qualquer declaração. O texto precisa dizer "fonte do projeto".
comando citado: ler_arquivo {"caminho": "docs/revisoes/SAN3/B-O6R-07c-a-ciclo2-auditoria-e-plano.md", "linha_inicial": 17, "max_linhas": 200}
saída citada:
callee não se resolve a uma declaração local com parâmetros
```

#### Achado 3 — gravidade: ajuste · escopo: dentro-do-bloco · linha: 103 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #6

```
arquivo: docs/revisoes/SAN3/B-O6R-07c-a-ciclo2-auditoria-e-plano.md
motivo: `contem()` não chega à chave de acesso, então `obj["h_"+t]` escapa. O efeito inverso é falso positivo: `typeof t === "string"` e `t.trim() === ""` passam a contar como derivados.
comando citado: ler_arquivo {"caminho": "docs/revisoes/SAN3/B-O6R-07c-a-ciclo2-auditoria-e-plano.md", "linha_inicial": 17, "max_linhas": 200}
saída citada:
IGUAL/switch: ... o operando passa a ser testado com contem() ... Exclusão mantida: ... vazio()
```

#### Achado 4 — gravidade: ajuste · escopo: dentro-do-bloco · linha: 113 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #6

```
arquivo: docs/revisoes/SAN3/B-O6R-07c-a-ciclo2-auditoria-e-plano.md
motivo: A chave continua sem linha nem contexto. Mudar a condição da ocorrência aceita mantém 1×1. O curinga dinâmico (helper l.256) não termina em `_photo`.
comando citado: ler_arquivo {"caminho": "docs/revisoes/SAN3/B-O6R-07c-a-ciclo2-auditoria-e-plano.md", "linha_inicial": 17, "max_linhas": 200}
saída citada:
viram Map<"<arquivo>: <texto>", contagem>
```

#### Achado 5 — gravidade: ajuste · escopo: dentro-do-bloco · linha: 126 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #8

```
arquivo: tests/helpers/o6r07c-census.ts
motivo: Um sub-app embrulhado numa função vira middleware anônimo; com `gravar`, só a contagem muda, e nada é sondado em `/`. Isso não se enquadra no R5(iii), porque é uma camada nova.
comando citado: ler_arquivo {"caminho": "tests/helpers/o6r07c-census.ts", "linha_inicial": 1, "max_linhas": 200}
saída citada:
126: const chave = "MIDDLEWARE " + pre + " · " + ((l.handle && l.handle.name) || "(anônima)");
128: if (mp !== "/") mwComCaminho.push(...)
```

#### Achado 6 — gravidade: ajuste · escopo: dentro-do-bloco · linha: 120 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #6

```
arquivo: docs/revisoes/SAN3/B-O6R-07c-a-ciclo2-auditoria-e-plano.md
motivo: `tocaCorpo` vale para todos os pares, inclusive estoque e despesa, e a análise de efeito só cobriu OS e vistoria. Os lotes derivados do instantâneo dependem de `snap`, que pode ser null (helper l.468); hipótese, não li o `main`.
comando citado: ler_arquivo {"caminho": "docs/revisoes/SAN3/B-O6R-07c-a-ciclo2-auditoria-e-plano.md", "linha_inicial": 17, "max_linhas": 200}
saída citada:
prop = LOTES_DA_OS.has(p.lote) || ... || p.tocaCorpo ... Efeito no instantâneo de hoje: nenhum
```

#### Achado 7 — gravidade: nota · escopo: dentro-do-bloco · linha: 88 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #4

```
arquivo: docs/revisoes/SAN3/B-O6R-07c-a-ciclo2-auditoria-e-plano.md
motivo: Mutações que faltam: fail-closed real, operando derivado, lista envelhecida de `NAO_RESOLVIDOS`, `tocaCorpo`/vistoria, sub-app aninhado, `membros` com container vazio. Há também divergência na faixa das mutações (MG25 na l.88, MG26 na tabela).
comando citado: buscar {"padrao": "^#|§2\\.|MG1[7-9]|MG2[0-6]", "caminhos": ["docs/revisoes/SAN3/B-O6R-07c-a-ciclo2-auditoria-e-plano.md"]}
saída citada:
88: MG17–MG25 vermelhas; 145: MG26 CATEGORIAS ... T0
```

### Limitações

```
- Não executei nada (o teste está negado), então todas as formas que escapariam são hipóteses lidas no código.
- Não li o guard test, o fixture JSON, o voto/evidência da C2 nem o `main`/`gravar` do helper (fora do orçamento).
- Não li o código de produto para medir os falsos positivos (typeof/trim, tocaCorpo em estoque/despesa).
- Não confirmei se a sonda do T14 inclui nomes de métodos de classe.
```
