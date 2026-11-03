# B-SAN3-21 — relatório do dev (acentuação dos textos da web, item 49)

- **Dev:** `dev-san321-opus`, Claude Opus 5.5 (nível menor, declarado). Não escreveu o plano.
- **Autor do plano:** orquestrador, Claude Opus 5.5 (`C:/Users/thiag/erp-pausa-2026-10-03/planos/B-SAN3-21-plano.md`).
- **Verificador:** Codex GPT-5.6 Sol (§C7 item 11). Sem cruzamento invertido: dev Claude, verificador Codex.
- **Ramo:** `fix/web-acentuacao`, worktree `C:/Users/thiag/w-san321`, base `origin/main` `7c89c73b`.
- **Nível:** revisão simples + CI (§C7 item 10(1)).

Gravado por fatia (P1): cada comando, exit e saída resumida.

## Fatia 0 — terreno

| Comando | Exit | Saída resumida |
|---|---|---|
| `git fetch -q origin && git rev-parse origin/main` | 0 | `7c89c73b64d78aceca8af64fb90d2e49261b2bad` |
| `git worktree add -b fix/web-acentuacao C:/Users/thiag/w-san321 origin/main` | 0 | `HEAD is now at 7c89c73b` |
| `Get-CimInstance Win32_OperatingSystem` (memória de commit livre) | 0 | 15,26 GB livres (≥ 4 GB) |
| `npm ci` (raiz) e `npm --prefix frontend ci`, no worktree, sem junction | 0 / 0 | dependências próprias |

## Fatia 1 — medição e guard (vermelho-controle)

**Medição exploratória** (scripts no scratchpad, fora do repo; AST do TypeScript, só nós de texto):

| Medição | Resultado |
|---|---|
| lista do §3 do plano, grafia do plano, sem regra de fronteira | 69 ocorrências |
| vocabulário acentuado do próprio `frontend/src` × literais sem acento | 138 pares; os ambíguos (`de/dê`, `a/à`, `esta/está`, `e/é`, verbos com ênclise) ficaram fora |
| forma minúscula em literal de uma palavra só | chave em todos os casos medidos: `"situacao"` 15×, `"concluida"` 9×, `"movimentacoes"` 10×, `"historico"` 5×, `"/patios/..."` 79× |
| `"Operador Logistico"` | **chave de comparação** (§4): `roles.includes("Operador Logistico")` em `layouts/appSidebarNav.ts:287`, `allowedRoles` em `navigation/tenantNavigation.ts` (5×), tipo `Role` em `modules/auth/types.ts:5`, retorno de `modules/auth/auth.adapter.ts:231` e `modules/context/repository.ts:141,155`, mocks de sessão. **Parado e registrado**: fica sem acento neste bloco, como exceção nomeada no guard. |

**Guard** `tests/san3-21-acentuacao-guard.test.ts`: lista do plano (67 termos) + 63 medidos pelo dev, cada um com a forma minúscula (exceto `faca`), 259 grafias. Nenhum termo do plano retirado. Regras de fronteira e de minúscula descritas no cabeçalho do arquivo.

| Comando | Exit | Saída resumida |
|---|---|---|
| `node --test --import tsx tests/san3-21-acentuacao-guard.test.ts` na `origin/main` 7c89c73b (guard novo, código intocado) | 1 | **vermelho-controle: N = 310** ocorrências em 42 arquivos; `arquivos=653 literais=48450 termos=259`; `# tests 3 # pass 2 # fail 1` (falha só o teste do critério; os controles de falso positivo e positivo passam) |
| mesmo guard só com a lista do §3 do plano (cópia temporária, apagada) | 1 | 102 ocorrências (a lista do plano, com as formas minúsculas em frase) |

## Fatia 2 — conserto dos textos

- Troca feita por script (scratchpad, fora do repo) que reusa as regras do guard: só dentro dos literais que o guard acusa, pela posição do nó na AST, nunca por `sed` no arquivo. Cada literal tocado foi relido na `git diff --word-diff`; nenhuma chave, rota, tipo, valor de enum ou chave de permissão mudou (as chaves de `statusLabels`/`priorityLabels`/`labels` e os `value=` de `<option>` ficaram iguais; só o rótulo).
- Um à mão, fora do alcance do guard: `operador/usuario` → `operador/usuário` (`WorkOrderAssignForm.tsx:32`); a barra antes da palavra é fronteira de rota na regra (a).
- **Parado e registrado (§4):** `"Operador Logistico"` (11 literais) segue sem acento. É nome de perfil comparado no código; trocar muda quem vê o quê no menu. Exceção nomeada no guard. Pendência proposta para o orquestrador: `P-SAN3-21-PERFIL-LOGISTICO` (o nome de perfil vira chave técnica + rótulo, num bloco que mexe em navegação).
- `"Painel Logistico"` (rótulo de menu, não comparado) foi corrigido para `"Painel Logístico"`.
- **Observados e NÃO tocados (fora do escopo de acentuação):** `"Tenant, e-mail ou senha inválidos."` (`auth.adapter.ts:209`) mostra o termo técnico "Tenant" na UI (§3/§11 do contrato); `frontend/tests/smoke-flow.test.tsx:1456` afirma `doesNotMatch(/Acoes do despacho/)`, que já era vacuoso na `origin/main` (o texto não existe em `frontend/src`, nem com acento).
- Valor padrão de observação enviado ao backend: `DispatchReassignForm.tsx:15` e `DispatchStatusActions.tsx:19` (`useState("... pela operação.")`) são texto livre editável pelo usuário, não chave nem enum; ficaram com acento.

| Comando | Exit | Saída resumida |
|---|---|---|
| script de troca (AST) | 0 | 310 trocas em 42 arquivos de `frontend/src`; 0 divergência entre texto cru e texto do nó |
| `git diff --stat -- frontend/src` | 0 | 42 arquivos, 218 inserções, 218 remoções (a troca à mão caiu numa linha já trocada) |
| `node --test --import tsx tests/san3-21-acentuacao-guard.test.ts` | 0 | `ocorrencias=0`; `# tests 3 # pass 3 # fail 0` |
| `npm --prefix frontend run check` | 0 | `tsc -b --noEmit` limpo |
| `npm --prefix frontend run test:smoke` (1ª) | 1 | `# tests 1556 # pass 1549 # fail 7`: todas por expectativa de texto antigo (`invalidos`, `nao autorizado`, `observacao obrigatoria`, `Ordens de Servico`, `Arquivo obrigatorio`, `Nenhuma evidencia anexada`, `Enviar evidencia`, `Arquivo disponivel`, `Titulo obrigatorio.`…) |
| expectativas atualizadas em 5 arquivos de `frontend/tests` (só o texto que mudou) | 0 | `auth-login-errors.adapter`, `dashboard-profile-provider` (inclusive o `doesNotMatch` da linha 194, que ficaria vacuoso), `finance-page-live`, `smoke-flow`, `work-orders.adapter` |
| `npm --prefix frontend run test:smoke` (2ª) | 0 | `# tests 1556 # pass 1556 # fail 0 # skipped 0` |
| `node --test --import tsx` nas 10 suítes da raiz que leem `frontend/` (`approval-frontend-contract`, `checklist-editor-blockers-parity`, `checklist-editor-classifier-parity`, `dashboard-profile-permissions`, `inventario-fluxos`, `kpi-dashboard-charts`, `kpi-loop-ferramentas`, `operator-profiles`, `san3-04a-menu-front-x-catalogo`, guard) | 0 | `# tests 97 # pass 97 # fail 0` |

## Fatia 3 — mutações e falso positivo

| Comando | Exit | Saída resumida |
|---|---|---|
| **M1**: `WorkOrderDetailPanel.tsx:17` `"Não informado"` → `"Nao informado"` (âncora única), guard | 1 | `ocorrencias=1`: `WorkOrderDetailPanel.tsx:17 "Nao" -> "Não"`; `# pass 2 # fail 1` |
| restauro do M1 (cópia de segurança) | 0 | arquivo igual ao conserto |
| **M2**: `TenantSettingsPage.tsx:30` `<h1>Configurações</h1>` → `<h1>Configuracoes</h1>` (texto de JSX), guard | 1 | `ocorrencias=1`: `TenantSettingsPage.tsx:30 "Configuracoes" -> "Configurações"`; `# pass 2 # fail 1` |
| restauro do M2 | 0 | `git diff --numstat` do arquivo vazio |
| guard depois dos restauros | 0 | `ocorrencias=0`; `# pass 3 # fail 0` |
| **controle de falso positivo** (teste 2 do guard, fixture em memória): `situacaoX`, `{ situacao: 1, Nao: 2, "Nao": 3 }`, `type Status = "Nao" \| …`, `import … from "./Configuracoes/Nao"`, `"situacao"`, `"/patios/patios"`, `"techsol.aparencia"`, `@media … .comprovante-liberacao-print`, `"informacoes-gerais"`, comentários | 0 | 0 ocorrência |
| **controle positivo** (teste 3): as formas do M1 e do M2 em fixture, frase com minúscula, a exceção por literal exato (`"Operador Logistico"` passa, `"Painel Logistico"` acusa) | 0 | 8 achados esperados, exatamente |

## Fatia 4 — bateria do §5

| Comando | Exit | Saída resumida |
|---|---|---|
| `npm --prefix frontend run check` | 0 | `tsc -b --noEmit` limpo |
| `npm --prefix frontend run build` | 0 | `✓ built in 10.83s` (só o aviso de tamanho de chunk que já existia) |
| `npm --prefix frontend run test:smoke` | 0 | `# tests 1556 # pass 1556 # fail 0 # skipped 0` |
| `node --test --import tsx tests/san3-21-acentuacao-guard.test.ts` | 0 | `arquivos=653 literais=48450 termos=259 ocorrencias=0`; `# pass 3 # fail 0` |
| `npm run db:generate` sem `DATABASE_URL` | 1 | `PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL` (o `prisma.config` exige a variável até para gerar; ambiente, não código) |
| `DATABASE_URL=postgresql://gen:gen@127.0.0.1:55470/gen npm run db:generate` (só gera, não conecta) | 0 | cliente gerado |
| `npm run check` | 0 | `tsc -p tsconfig.json --noEmit` limpo (antes do `db:generate`: exit 2 por falta do cliente Prisma no worktree novo, `TS2305 @prisma/client`; ambiente) |
| `npm run lint` | 0 | limpo |
| `npm test` | — | **não rodado inteiro localmente.** O bloco só muda texto de `frontend/`; as 10 suítes da raiz que leem `frontend/` passaram (fatia 2, 97/97). A suíte inteira roda no job `backend` do CI, com Postgres e Redis do próprio CI (§5 do plano: "senão, as suítes afetadas e o CI"). Nenhum container Docker subido; a demo (3000, 5173, `erp-postgres`, `erp-redis`) não foi tocada. |
| `git diff --check` | 0 | limpo |
| `git diff --name-only origin/main` ⊆ PERMITIDO | 0 | 42 em `frontend/src`, 5 em `frontend/tests`, o guard, o relatório, o comando; nada em `prisma/`, `src/`, `mobile/`, `Kpis/`, lockfiles |
