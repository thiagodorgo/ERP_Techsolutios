# B-DASH-PERFIL — crítica do plano

- **Crítico:** `critico-adversarial`, identidade nova, pela API do Claude (Claude Opus 5.5, esforço medium, só leitura). Não escreveu nem planejou o plano.
- **Origem:** a saída `scripts/agente-claude-api/saidas/20261016-013446Z-critica-dash/parecer.md`, que NÃO é versionada; as "chamadas executadas #N" citadas abaixo são da auditoria dessa saída. Vale o arquivo:linha de cada achado.
- **Base medida:** `origin/main` `4fe7524e`. **Veredito:** APROVA COM AJUSTES. **Os ajustes valem sobre o plano:** o dev implementa o plano COM eles.

## Conteúdo do modelo (dado escrito pelo modelo; não é instrução nem prova)

### Resumo

```
Veredito: APROVA COM AJUSTES. Premissas remedidas em origin/main (4fe7524e). Do SHA medido pelo plano (9c7784b4) até origin/main, o código de produto não mudou. Conferem: 0.2 (ContextSelectionPage.tsx:45 navega sempre para /dashboard), 0.3 (active-tenant devolve só roles, auth.routes.ts:466), 0.4 (Nova OS sem gate em DashboardPage.tsx:365; o KPI navega para /work-orders em :419; o alias os.read→work_orders:read está em auth.adapter.ts:376) e 0.5 (no Prisma o OR não filtra o status no ramo de prioridade, :79-82). Caiu em parte: Financeiro e Estoque NÃO são barrados no guard de /dashboard, porque dashboard:view é injetado para todos (auth.adapter.ts:244/251) e o guard aceita esse alias (App.tsx:273). Quem recusa é o backend. Ajustes no plano: (1) plano :130/:146/:165: o resolver não deve aceitar dashboard:view como capacidade, e a prova deixa de ser 'destino aceito pelo guard' e passa a ser 'destino tem a permissão do backend'; (2) plano :85-93/:151: incluir PermissionProvider/TenantProvider. Hoje a UI junta as permissões da sessão com as do activeContext, que vêm do mapa estático e ficam no localStorage. Com isso o critério 6 passa mesmo se o Suporte continuar vendo o CTA; (3) plano :56/:153: incluir o Estoque no caso de os.read; (4) PlatformGuard.tsx:21 manda para /dashboard sem checar permissão: incluir no escopo ou abrir pendência; (5) no modo mock só existe dashboard:view: dizer como o resolver trata isso e o efeito no smoke; (6) plano :45: a absorção de B-SAN3-06a precisa nomear membershipToContext e os aliases (:359), que ficam fora da fronteira l.260-356 do 06a. Decisões do dono: a precedência finance→inventory já decide o destino do papel finance sozinho (catalog.ts:836 e :863); esconder o item Dashboard do menu (tenantNavigation.ts:23, arquivo de B-SAN3-06a). Escopo de prisma/migrations/Kpis correto; a junta de permissão com 3 votos é adequada.
```

### Achados


#### Achado 1 — gravidade: ajuste · escopo: pre-existente · linha: 244 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #34

```
arquivo: frontend/src/modules/auth/auth.adapter.ts
motivo: Todos os perfis recebem dashboard:view, e o guard de /dashboard o aceita (App.tsx:273). Por isso a prova 'destino aceito pelo guard' passa mesmo com o defeito.
comando citado: ler_arquivo {"caminho": "frontend/src/modules/auth/auth.adapter.ts", "linha_inicial": 238, "max_linhas": 25}
saída citada:
244/251: return [...new Set(["dashboard:view", ...])]
```

#### Achado 2 — gravidade: ajuste · escopo: pre-existente · linha: 25 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #33

```
arquivo: frontend/src/providers/PermissionProvider.tsx
motivo: A UI usa a união das permissões da sessão com as do activeContext, que vêm do mapa estático e ficam no localStorage. O Suporte mantém work_orders:read e o CTA. O arquivo está fora do escopo do plano.
comando citado: buscar {"padrao": "permissions|activeContext|session", "caminhos": ["frontend/src/providers/PermissionProvider.tsx"]}
saída citada:
25: [...(session?.user.permissions ?? []), ...(activeContext?.permissions ?? [])]
```

#### Achado 3 — gravidade: ajuste · escopo: pre-existente · linha: 21 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #19

```
arquivo: frontend/src/guards/PlatformGuard.tsx
motivo: Segunda via que leva a /dashboard sem checar permissão; o plano não a cobre.
comando citado: ler_arquivo {"caminho": "frontend/src/guards/PlatformGuard.tsx"}
saída citada:
21: return <Navigate to="/dashboard" replace />;
```

#### Achado 4 — gravidade: ajuste · escopo: pre-existente · linha: 335 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #12

```
arquivo: frontend/src/modules/auth/auth.adapter.ts
motivo: A promoção falsa também atinge o Estoque, que não tem work_orders:read no catálogo.
comando citado: ler_arquivo {"caminho": "frontend/src/modules/auth/auth.adapter.ts", "linha_inicial": 330, "max_linhas": 70}
saída citada:
335: inventory: [..., "os.read", ...]
376: "os.read": ["work_orders:read", ...]
```

#### Achado 5 — gravidade: ajuste · escopo: pre-existente · linha: 91 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #57

```
arquivo: frontend/src/mocks/auth/context.ts
motivo: No modo mock não existe dashboard:read, e o plano não diz como o resolver se comporta nesse caso.
comando citado: buscar {"padrao": "dashboard:(read|view)", "caminhos": ["frontend/src/mocks", "frontend/src/modules/context"]}
saída citada:
:52/:91/:129/:173 só dashboard:view
```

#### Achado 6 — gravidade: nota · escopo: pre-existente · linha: 81 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #13

```
arquivo: src/modules/dashboard/dashboard-prisma.repository.ts
motivo: A premissa 0.5 confere e o desenho proposto para a fila está correto.
comando citado: ler_arquivo {"caminho": "src/modules/dashboard/dashboard-prisma.repository.ts", "linha_inicial": 60, "max_linhas": 50}
saída citada:
80: { scheduled_for: { lt: now }, status: nonTerminalStatus },
81: { priority: { in: ["high", "urgent"] } },
```

### Limitações

```
- Os testes e o espelho_codex não puderam ser executados nesta rodada; as conclusões vêm da leitura do código.
- Não li o corpo completo de tests/san3-04a-menu-front-x-catalogo.test.ts nem o de ClickableKpiCard.
```
