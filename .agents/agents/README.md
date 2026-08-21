# `.agents/agents/` — papéis de junta para o Codex (espelho de `.claude/agents/`)

> **D-INTEROP-CLAUDE-CODEX (2026-07-28).** O nível alto das rodadas deste repositório vem da **junta
> de agentes** (§C7 do `AGENTS.md`/`CLAUDE.md`): planejador → dev → **avaliador + secops + crítico +
> dba votando**, com ciclos de reprovação adversariais. No Claude Code isso são agentes isolados em
> `.claude/agents/*.md`. Aqui estão os **mesmos papéis** em formato portátil para o Codex —
> **corpo verbatim** (as instruções e os poderes de VETO não sofrem drift), frontmatter portátil
> (`name` + `description`), com um preâmbulo de orientação Codex no topo de cada arquivo.
>
> Mantidos em dia por `scripts/sync-agent-agents.mjs` (cópia + `--check`, sem symlink). Alterou um
> agente em `.claude/agents/`, rode o script para espelhar (e vice-versa). Fonte canônica de conduta:
> `CLAUDE.md`; regras de junta: §C7.

## Como o Codex usa estes papéis (agentes isolados obrigatórios)

Invoque cada arquivo como a definição de um subagente isolado (o corpo é o system-prompt). A decisão
`D-JUNTA-SEPARACAO-DE-PAPEIS-TODO-FLUXO` revogou a emulação por passes sequenciais do mesmo agente: planejar,
implementar, revisar/votar, exercer o porteiro pré-merge e executar o fechamento pós-merge são alçadas
incompatíveis. Sem agentes isolados suficientes, a entrega bloqueia; trocar o nome do papel não cria independência.

Fluxo obrigatório:

1. **Planejar** — adote `planejador-mestre` (ou `omega5p-planejador` na rodada de Pátios) e publique o
   plano curto **antes de qualquer código** (em `docs/juntas/`). Nenhuma linha de código sem plano.
2. **Atacar o plano** — adote `critico-adversarial` e tente derrubar o plano (borda/concorrência/
   multi-tenant/RBAC/erro/premissa). O que sobreviver vira requisito explícito.
3. **Implementar** — adote o `*-dev-*` do domínio (backend/frontend/portal/mapas), **só** dentro do
   escopo permitido do plano.
4. **Junta (agentes de veto INDEPENDENTES — cada voto pertence a pessoa/agente distinto):**
   rode os revisores aplicáveis ao PR; cada um emite **APROVADO/REPROVADO** com achados por severidade.
   Dinheiro/alienação/superfície pública/migração ⇒ os obrigatórios abaixo **têm de** rodar.
5. **Reprovação** — se algum veto REPROVAR, siga o **protocolo de ciclos** (§C7.4): ciclos 1–2 a
   `agente-fabrica` cria 1–2 especialistas sob medida; ciclo 3 o `critico-adversarial` reabre a
   premissa + pesquisa (`agente-pesquisador-web`, ≥5 fontes); ciclos 4–5 replanejam. Registre em
   `agent-orchestration/omega/reprovacoes/R-<entrega>-<ciclo>.md`.
6. **Registrar a ata** — votos + justificativa em `docs/juntas/` (ou `agent-orchestration/omega/juntas/`).
   **Junta sem registro = merge inválido.** Verde da junta + CI verde habilitam o porteiro, não o merge.
7. **Porteiro pré-merge** — novo agente, `gpt-5.6-sol`/`ultra`, reexecuta o head exato. Só
   `LIBERADO: merge do PR #<n> no head <sha>` autoriza; ressalva/bloqueio não autorizam; novo head expira.
8. **Pós-merge factual** — outro agente distinto faz backfill, reconciliação, limpeza e compactação. Não vota.

> **Regra da dúvida (§C7.3):** qualquer incerteza → adote `agente-pesquisador-web` (≥3 fontes) e registre
> a PD em `docs/omega-pd.md` **antes** de decidir. Dúvida sem pesquisa = veto.

## Papéis por função

### Planejar / estratégia
| Papel | Função |
|---|---|
| `planejador-mestre` | O plano obrigatório antes de qualquer código; `gpt-5.6-sol`/`ultra` por regra específica. |
| `omega5p-planejador` | Planejador da rodada Ω5P (Pátios/SIGPRV) — publica plano curto por PR. |
| `planejador-mapas` | Planejador da Junta de Mapas (geo/tiles/rotas/geocoding). |
| `estrategista` | Ordem e agrupamento das entregas por dependência e risco. |

### Implementar (devs)
| Papel | Função |
|---|---|
| `omega5p-dev-backend` | Backend Node/TS/Express/Prisma das fatias Ω5P. |
| `omega5p-dev-frontend` | Console React/Vite do operador (`/patios`). |
| `omega5p-dev-portal` | Superfícies PÚBLICAS isoladas (PWAs/BFFs) — foco em segurança. |
| `dev-mapas` | Implementação de mapa/geo (React/backend/Flutter). |
| `frontend-pixel-master` | Frontend pixel-perfect a partir de referência visual. |

### Junta / VETO (revisão)
| Papel | Poder | Função |
|---|---|---|
| `validador-mestre` | **VETO** | Validação avançada final do diff × plano × regras. |
| `omega5p-avaliador` | **VETO** | Avaliador bloqueante da rodada Ω5P (Seção 10 + invariantes I1-I10). |
| `avaliador-mapas` | **VETO** | Revisa qualquer diff de mapa/geo antes do merge. |
| `critico-adversarial` | ataque | Ataca o plano antes do código; reabre a premissa nos ciclos 4–5. |
| `coordenador-de-acessos` | **VETO** | Cadeia completa de acesso (papel→permissão→menu→rota→backend), RBAC, SoD. |
| `inspetor-de-rotas` | **VETO** | Caça rotas erradas em toda PR. |
| `master-teste-telas-rotas` | **VETO** | Prova cada tela ponta a ponta. |
| `cognicao-visual` | **VETO** | Fidelidade §11 / anti-tela-morta (antes e depois de criar tela). |
| `agente-ci-doutor` | veto no gate | Triagem de CI/testes vermelhos por causa raiz (nunca skipa teste). |
| `inspetor-de-arnes-concorrente` | **VETO** | Corrida de catálogo do Postgres em arnês de teste (role/schema sob paralelismo), denominador que varia, lixo com privilégio. **Achador/votante: não escreve a correção.** |
| `guardiao-fail-closed` | **VETO** | Enumeração de segurança fail-closed — prova POR MUTAÇÃO se o membro não previsto nasce permitido e se a omissão quebra o build. **Achador/votante: não escreve a correção.** |
| `porteiro-pos-merge` | **VETO pré-merge** | Nome técnico legado; agente independente Sol/ultra que autoriza somente o PR/head exatos. |

### Segurança / banco / infra / custo
| Papel | Poder | Função |
|---|---|---|
| `agente-secops` | **VETO** | Secrets/hardening — OBRIGATÓRIO em todo PR que toque secret/env/CORS/TLS/pipeline. |
| `agente-dba-guardiao` | **VETO** | Migrations aditivas up/down provadas, backup/restore — OBRIGATÓRIO em PR de migração. |
| `agente-devops-provisionador` | vota | Containerização, healthcheck, CD (trilhas Ω-INFRA). |
| `agente-finops` | vota | Custo de provedores nas PDs de escolha (Ω-INFRA). |

### Pesquisa / meta
| Papel | Função |
|---|---|
| `agente-pesquisador-web` | Pesquisa exclusiva na net sob dúvida (não escreve código) — regra da dúvida §C7.3. |
| `agente-fabrica` | Cria novos agentes/especialistas sob medida durante o protocolo de reprovação (ciclos 1–2). |

## Composição típica da junta por tipo de PR
- **Feature normal:** planejador → crítico → dev → `validador-mestre` (VETO) + `inspetor-de-rotas` + `coordenador-de-acessos` (se toca acesso) + `cognicao-visual` (se toca tela).
- **Dinheiro / alienação / invariante financeiro:** **`critico-adversarial` OBRIGATÓRIO** (tolerância zero) + avaliador (VETO).
- **Superfície pública / portal:** **`agente-secops` (VETO) + `critico-adversarial`** obrigatórios + `coordenador-de-acessos`.
- **Migração de banco:** **`agente-dba-guardiao` (VETO)** obrigatório (tx-ROLLBACK sem DROP; RLS/FK/CHECK).
- **Mapa/geo:** `planejador-mapas` → `dev-mapas` → `avaliador-mapas` (VETO).
- **Decisão crítica** (deploy de produção, dependência nova, serviço externo pago): junta **unânime com 5 agentes** + PD (§C7.1).
