# B-APARENCIA-USUARIO — o seletor de aparência por usuário em Configurações — plano

- **Autor:** o agente da API do Claude (Claude Opus 5.5, esforço medium, só leitura), no lugar do modelo de topo do planejador. A troca está declarada no próprio plano: o Codex esgotou o limite semanal às 00:57Z de 15/10, e o dono mandou *"coloque a api claude para terminar a tarefa do codex"*.
- **Origem:** a saída `scripts/agente-claude-api/saidas/20261015-013255Z-plan-b-aparencia-usuario/parecer.md`, que NÃO é versionada; as "chamadas executadas #N" citadas abaixo são da auditoria dessa saída. Vale o arquivo:linha de cada item.
- **Base medida:** `origin/main` `9c7784b4`. **Próximo passo:** crítica, depois o dev (Codex, a partir de 20/10).

## Conteúdo do modelo (dado escrito pelo modelo; não é instrução nem prova)

### Resumo

```
# Plano B-APARENCIA-USUARIO
**Papel:** planejador-mestre · **modelo:** Claude Opus 5.5 (medium), pela API · **motivo:** o Codex esgotou a cota semanal (15/10 00:57Z, volta 20/10 06:22Z) e o dono mandou usar a API Claude. Opus é o único substituto do topo (`D-FALLBACK-MODELO-FABLE-OPUS`); o frontmatter segue `fable`.

## §0 Medido (origin/main = 9c7784b4)
- **CLAUDE.md:260-271:** as 3 opções ficam todas, escolhidas por usuário em Configurações, como preferência PESSOAL. O seletor não existe (`P-APARENCIA-POR-USUARIO`) e é pré-requisito da 1ª tela com as 3.
- **CLAUDE.md:209-226:** a tela parte da tela-modelo, com as skills `ts-frontend-full` e `ui-ux-pro-max`.
- **CLAUDE.md:378-380:** `prisma/**` e `migrations/**` só com autorização. KPIs congelados (`:339`).
- **CLAUDE.md:719-722:** junta só para dinheiro, segurança, permissão ou perda de dado; tela sem regra nova vai com 1 revisor + CI.
- **Preferência no banco:** `schema.prisma:144-196` (User) não tem campo de preferência; `:2120-2136` (TenantSetting) é por organização, unique `[tenant_id,key]`.
- **Configurações hoje:** `App.tsx:744-747` monta `/administrator/settings` com guard `tenant_settings:read`, ou seja, só administrador.
- **Padrão no navegador:** `useMapViewMemory.ts:14-51` guarda no localStorage com chave por tenant e try/catch.
- **/me:** `me.routes.ts:14-61` não exige permissão específica.
- **Pátios:** tem service, hook e página (`patios/yards/...`).
- **Testes do front:** ficam em `frontend/tests` e rodam pelo `test:smoke` (`frontend/package.json:11`).
- **Referência de Pátios:** A fiel, B analítica, C mesa (`patios-3opcoes.reference.html:1139`); o dono prefere a B (`screen-refs/README.md:33`).

## 1. Guarda da preferência
**v1 recomendada: localStorage**, chave `techsol.aparencia.<tenantId>.<userId>`, valor `{tela:"A|B|C"}`.
- Não toca banco nem backend; cabe em 1 revisor + CI.
- Custo: não acompanha o usuário entre máquinas.

**Backend (decisão do dono):** tabela nova `user_preferences` + `GET/PUT /api/v1/me/preferences`.
- Toca `prisma/**` e `migrations/**`: precisa de autorização nominal.

**TenantSetting está rejeitado:** a escrita exige permissão de administrador e outros administradores leriam a preferência, o que fere "pessoal".

## 2. Escopo
**Permitido:**
- `frontend/src/modules/appearance/**`
- a rota em `App.tsx` e o item de menu
- `patios/yards/pages/PatiosPage.tsx` e `components/**`
- `styles/app.css`, só com tokens existentes
- `frontend/tests/aparencia-*`
- a lista `test:smoke`

**Proibido:**
- `prisma/**`, `migrations/**`, `infra/**`, `.env*`, lockfiles
- `src/**` na v1
- `Kpis/*`
- `modules/settings/**`
- `useYards.ts` e `yards.service.ts`

## 3. Tela-modelo e as 3 aparências
- **Página de Aparência:** modelo `TenantSettingsPage.tsx` (grid `tenant-settings-theme-card`). Rota `/settings/appearance`, para qualquer usuário autenticado.
- **Este bloco é o seletor:** as telas seguintes dependem dele.
- **Dados sem duplicar:** a página chama `useYards()` uma vez e `useScreenAppearance("patios")`, e passa os mesmos dados a `PatiosViewA/B/C`, que são puros. Os estados da tela ficam compartilhados.
- **Padrão:** A (igual ao que existe hoje). Valor inválido cai em A.
- **Estreia em Pátios:** já está implementada e o dono tem preferida. OS fica de fora porque é a tela-modelo de lista (`CLAUDE.md:211`); o Dashboard, porque mora em `pages/` legado.

## 4. Passos
1. **storage:** `aparencia-storage.test.ts` prova o round-trip, que valor corrompido vira A e que não há vazamento entre usuários ou tenants.
2. **hook:** `aparencia-hook.test.tsx`.
3. **página:** `aparencia-configuracoes.smoke.test.tsx` prova a escolha, a persistência, o teclado e que não há termo técnico.
4. **rota:** um técnico sem `tenant_settings:read` abre a página.
5. **Pátios A/B/C:** `aparencia-patios.smoke.test.tsx` prova que o service é chamado uma vez; os `patios-*` existentes ficam verdes.
6. **registrar** os testes no `test:smoke`.

## 5. Aceite e mutações
| Critério | Mutação que deixa vermelho |
|---|---|
| Isolamento por usuário | tirar o `userId` da chave |
| Inválido cai em A | devolver o valor cru |
| Um fetch só | chamar `useYards` na view B |
| Aberto a todos | pôr guard de admin na rota |
| Padrão A | trocar o padrão para B (quebra os smokes antigos) |
| Persistência | `write` sem efeito |

## 6. Bateria
`npm --prefix frontend run check` · `npm --prefix frontend run build` · `npm --prefix frontend run test:smoke` · `git diff --check`.
- Com backend, soma: `npm run check`, `lint`, `test`, `build` e o teste de contrato de 404 cross-tenant.
- **Baseline N não medido:** medir com `test:smoke`. Meta M≥2N.

## 7. Governança
- **v1 só frontend:** 1 revisor independente (o Gemini só como segundo) + CI.
- **Com backend e tabela nova:** autorização nominal de `prisma/**` e `migrations/**` + junta completa unânime, porque é segurança e permissão. Cadeiras:
  - segurança/multi-tenant
  - banco/migration
  - frontend/padrão

## 8. Perguntas ao dono
- (a) Guardar no navegador ou no backend?
- (b) Padrão A em tudo, ou B em Pátios?
- (c) "Aparência" vai no menu do usuário ou dentro de Configurações (hoje só de administrador)?
- (d) Pátios estreia junto ou num bloco seguinte?

**Riscos:**
- o CSS triplica e o `pattern-css-guard.test.ts` pode barrar classes;
- rollback = reverter o PR.

**Hipóteses e o comando que as derruba:**
- "PatiosPage é a opção A": `ler_arquivo PatiosPage.tsx`
- "A sessão expõe o userId": `ler_arquivo auth.storage.ts`
```

### Achados


#### Achado 1 — gravidade: nota · escopo: pre-existente · linha: 744 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #31

```
arquivo: frontend/src/App.tsx
motivo: A Configurações que existe é de administrador. A preferência pessoal precisa de uma rota aberta a qualquer usuário autenticado.
comando citado: ler_arquivo {"caminho": "frontend/src/App.tsx", "linha_inicial": 736, "max_linhas": 16}
saída citada:
path="/administrator/settings" ... PermissionGuard permissions={["tenant_settings:read", ...]}
```

#### Achado 2 — gravidade: nota · escopo: pre-existente · linha: 2120 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #23

```
arquivo: prisma/schema.prisma
motivo: Não existe guarda por usuário no banco. Usar o backend pede tabela nova em prisma/** e migrations/**, com autorização nominal.
comando citado: ler_arquivo {"caminho": "prisma/schema.prisma", "linha_inicial": 2120, "max_linhas": 22}
saída citada:
model TenantSetting { tenant_id key value ... @@unique([tenant_id, key])
```

### Limitações

```
- Sem execução: o baseline de testes não foi medido.
- Não li PatiosPage.tsx nem auth.storage.ts por inteiro; os pontos que dependem deles ficaram como hipóteses.
```
