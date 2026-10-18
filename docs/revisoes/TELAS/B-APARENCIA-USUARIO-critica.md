# B-APARENCIA-USUARIO — crítica do plano

- **Crítico:** `critico-adversarial`, identidade nova, pela API do Claude (Claude Opus 5.5, esforço medium, só leitura). Não escreveu nem planejou o plano.
- **Origem:** a saída `scripts/agente-claude-api/saidas/20261016-014900Z-critica-aparencia/parecer.md`, que NÃO é versionada; as "chamadas executadas #N" citadas abaixo são da auditoria dessa saída. Vale o arquivo:linha de cada achado.
- **Base medida:** `origin/main` `4fe7524e`. **Veredito:** APROVA COM AJUSTES. **Os ajustes valem sobre o plano:** o dev implementa o plano COM eles.

## Conteúdo do modelo (dado escrito pelo modelo; não é instrução nem prova)

### Resumo

```
Veredito do critico-adversarial: APROVA COM AJUSTES. Medi em origin/main = 4fe7524e; o plano foi medido em 9c7784b4.

Premissas que conferem: Configurações é só de administrador (App.tsx:744-747); a sessão expõe user.id (types.ts:15); test:smoke é uma lista explícita (package.json:11); PatiosPage usa useYards (:80); o texto das decisões em CLAUDE.md:260-271 e da junta proporcional em :719-722 confere.

Premissas que caíram: (1) "um fetch só" ignora usePatiosDashboardSummary e useAutoRefresh (PatiosPage.tsx:81-82); (2) o risco do pattern-css-guard está invertido: ele não barra classe nova, exige que .pat-patios-grid e o grid-template-columns sobrevivam.

Buracos: o item de menu "para todos" não cabe no escopo. O menu é montado por papel (appSidebarNav.ts:152,171-208), e o teste do menu do Estoque compara os itens exatos com deepEqual (san3-04a-sidebar-estoque-financeiro.test.tsx:44), arquivo fora do escopo permitido. A mutação do "Padrão A" é fraca. O contexto sem tenant não está definido (tenant?: em types.ts:38).

Governança: o escopo proibido é respeitado (prisma/**, migrations/**, src/**, Kpis/* ficam fora), e 1 revisor + CI basta para a v1 só frontend.

Ajustes, por seção do plano: 1) §3/§5: o "um fetch só" cobre também o resumo e o autorefresh, com a mutação "chamar usePatiosDashboardSummary na view B". 2) §2: pôr no escopo appSidebarNav.ts e os testes de menu, ou AppShell.tsx, conforme a resposta à pergunta (c), e criar o critério "todo papel vê o item". 3) §5: asserção explícita de que, sem nada guardado, a página mostra a A. 4) §4 passo 1: sem tenant ou sem usuário, não grava e cai em A, com teste. 5) §8: corrigir o texto do risco do CSS. 6) §4 passo 5: manter os exports que os smokes antigos importam.

Decisões do dono: (a) guardar no navegador ou no backend; (b) padrão A ou B em Pátios; (c) onde fica o item de menu; (d) se Pátios estreia junto; (e) se o app Flutter também segue a preferência.
```

### Achados


#### Achado 1 — gravidade: ajuste · escopo: pre-existente · linha: 81 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #20

```
arquivo: frontend/src/modules/patios/yards/pages/PatiosPage.tsx
motivo: O critério 'um fetch só' cobre só useYards. Uma view que chame o resumo duplica a requisição e nenhum teste fica vermelho.
comando citado: ler_arquivo {"caminho": "frontend/src/modules/patios/yards/pages/PatiosPage.tsx", "linha_inicial": 1, "max_linhas": 100}
saída citada:
80: useYards(STABLE_FILTERS);
81: usePatiosDashboardSummary();
82: useAutoRefresh(refresh, ...)
```

#### Achado 2 — gravidade: ajuste · escopo: pre-existente · linha: 152 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #39

```
arquivo: frontend/src/layouts/appSidebarNav.ts
motivo: O menu é montado por papel. 'O item de menu' não diz o arquivo, e o critério 'Aberto a todos' só testa o guard da rota: o item pode ficar escondido do técnico com o teste verde.
comando citado: ler_arquivo {"caminho": "frontend/src/layouts/appSidebarNav.ts", "linha_inicial": 148, "max_linhas": 62}
saída citada:
152: items: [..., CONFIGURACOES, AUDITORIA]
171: admin: [..., G_ADMIN_FULL]
184: { label: "ADMINISTRAÇÃO", items: [NOTIFICACOES, CENTRAL_NOTIFICACOES] }
```

#### Achado 3 — gravidade: ajuste · escopo: pre-existente · linha: 44 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #45

```
arquivo: frontend/tests/san3-04a-sidebar-estoque-financeiro.test.tsx
motivo: O teste compara o menu exato do Estoque e está fora do escopo permitido (só aparencia-*). Pôr o item no menu lateral o deixa vermelho e o dev não pode corrigi-lo.
comando citado: ler_arquivo {"caminho": "frontend/tests/san3-04a-sidebar-estoque-financeiro.test.tsx", "linha_inicial": 40, "max_linhas": 55}
saída citada:
44: assert.deepEqual(
49: { label: "ADMINISTRAÇÃO", items: ["Notificações", "Modelos de Checklist"] },
```

#### Achado 4 — gravidade: ajuste · escopo: pre-existente · linha: 38 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #33

```
arquivo: frontend/src/modules/auth/types.ts
motivo: O userId confere, mas o tenant é opcional. A chave por tenant e usuário não tem caso definido sem tenant (plataforma).
comando citado: ler_arquivo {"caminho": "frontend/src/modules/auth/types.ts", "linha_inicial": 10, "max_linhas": 50}
saída citada:
15:   id: string;
38:   tenant?: AuthTenant;
```

#### Achado 5 — gravidade: ajuste · escopo: pre-existente · linha: 145 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #37

```
arquivo: frontend/tests/patios-yards.smoke.test.tsx
motivo: A mutação 'Padrão B quebra os smokes antigos' só fica vermelha por acaso. Falta uma asserção explícita do padrão A e a obrigação de manter esses exports.
comando citado: buscar {"padrao": "yards|summary|toHaveBeenCalled|calls|fetchCount|callCount", "caminhos": ["frontend/tests/patios-yards.smoke.test.tsx"]}
saída citada:
145: const { computeYardKpis, shouldShowInvite, occupancyTone } = await import("../src/modules/patios/yards/pages/PatiosPage");
```

#### Achado 6 — gravidade: nota · escopo: pre-existente · linha: 22 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #29

```
arquivo: frontend/tests/pattern-css-guard.test.ts
motivo: O risco está invertido: o guard não barra classes novas, ele exige que as existentes sobrevivam.
comando citado: ler_arquivo {"caminho": "frontend/tests/pattern-css-guard.test.ts", "max_linhas": 60}
saída citada:
22: const REQUIRED_RULES ...
32: ".pat-patios-grid",
50: grid-template-columns
```

### Limitações

```
- Não pude executar testes (execução não permitida); a quebra do teste de menu do Estoque foi deduzida da leitura do código.
- Não remedi me.routes.ts nem schema.prisma, que só pesam na opção com backend.
```
