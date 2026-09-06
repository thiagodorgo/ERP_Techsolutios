# `.agents/agents/` — papéis de junta para o Codex (espelho de `.claude/agents/`)

> **D-INTEROP-CLAUDE-CODEX (2026-07-28).** O nível alto das rodadas deste repositório vem da **junta
> de agentes** (§C7 do `AGENTS.md`/`CLAUDE.md`): planejador → dev → **avaliador + secops + crítico +
> dba votando**, com ciclos de reprovação adversariais. No Claude Code isso são 23 agentes isolados em
> `.claude/agents/*.md`. Aqui estão os **mesmos 23 papéis** em formato portátil para o Codex —
> **corpo verbatim** (as instruções e os poderes de VETO não sofrem drift), frontmatter portátil
> (`name` + `description` + `model`, quando o papel o fixa), com um preâmbulo de orientação Codex no topo
> de cada arquivo. O `model:` é **preservado por contrato** pelo sync (`D-PLANEJADOR-MODELO-FABLE`): só o
> `tools:` é removido, por ser mecanismo do Claude Code — apagar o `model:` faria o espelho Codex perder a
> regra **em silêncio**, e o `planejador-mestre` em Fable é obrigatório na revalidação de código corrigido.
>
> Mantidos em dia por `scripts/sync-agent-agents.mjs` (cópia + `--check`, sem symlink). Alterou um
> agente em `.claude/agents/`, rode o script para espelhar (e vice-versa). Fonte canônica de conduta:
> `CLAUDE.md`; regras de junta: §C7.
>
> **Cadeiras efêmeras de ciclo (`.claude/agents/especialistas/`) SÃO espelhadas** — e o `--check` as
> cobre. Medido em 2026-09-05: `node scripts/sync-agent-agents.mjs --check` → `OK — 34 agentes`
> (`ec=0`), com **11** corpos em `.claude/agents/especialistas/` e **11** em
> `.agents/agents/especialistas/`. Provado **por mutação**: alterado o corpo de um especialista sem
> espelhar, o `--check` sai **`ec=1`** e **nomeia o arquivo** (`DIVERGE:
> .agents/agents/especialistas/jurado-c5-banco-fk-triggers.md`); restaurado, volta a `ec=0`.
> Codex: leia os espelhos em `.agents/agents/especialistas/` como os demais.
>
> Texto anterior, preservado (§A2 — acrescentar, nunca apagar) e **falso desde `1aeb6e9` (2026-08-25)**:
> ~~"Cadeiras efêmeras de ciclo NÃO são espelhadas: o sync é cego a subdiretório
> (`P-SYNC-AGENTS-NAO-RECURSIVO`, ABERTA — o `--check` ec=0 não prova nada sobre elas). … Codex: leia-os
> direto de `.claude/agents/especialistas/` na raiz do repositório."~~ Era **verdade quando escrito**
> (entrou por `f895dd2`, #368, 2026-09-02, herdando a premissa de `8145415`) e envelheceu sem que
> ninguém o revisse. `P-SYNC-AGENTS-NAO-RECURSIVO` está **FECHADA** — ver `pendencias.md`.

## Como o Codex usa estes papéis (protocolo de emulação da junta)

**Se o seu Codex puder criar subagentes isolados:** invoque cada arquivo como a definição do subagente
(o corpo é o system-prompt). Rode-os como o Claude Code roda — planejador primeiro, dev depois, e os
revisores de veto **em paralelo**.

**Se não puder (caminho de emulação — sempre válido):** a junta é OBRIGATÓRIA; só o mecanismo muda.
Emule assim, num único fluxo, **adotando um papel de cada vez** (carregue o arquivo do papel como se
fosse o seu system-prompt naquele passe e ATUE estritamente naquele escopo):

1. **Planejar** — adote `planejador-mestre` e publique o
   plano curto **antes de qualquer código** (em `docs/juntas/`). Nenhuma linha de código sem plano.
2. **Atacar o plano** — adote `critico-adversarial` e tente derrubar o plano (borda/concorrência/
   multi-tenant/RBAC/erro/premissa). O que sobreviver vira requisito explícito.
3. **Implementar** — adote o `*-dev-*` do domínio (backend/frontend/portal/mapas), **só** dentro do
   escopo permitido do plano.
4. **Junta (passes de veto INDEPENDENTES — cada um é um passe adversarial próprio, não um carimbo):**
   rode os revisores aplicáveis ao PR; cada um emite **APROVADO/REPROVADO** com achados por severidade.
   Dinheiro/alienação/superfície pública/migração ⇒ os obrigatórios abaixo **têm de** rodar.
5. **Reprovação — teto de DOIS ciclos (`D-TETO-DOIS-CICLOS`; o teto de 5 está REVOGADO):** no ciclo 2
   corrige-se (quem achou NÃO conserta — §C7.4-bis) e volta-se à junta com **identidade nova** na
   cadeira que reprovou; **reprovou no ciclo 2 → PARA e vira dossiê ao dono — não há ciclo 3.**
   Registre em `agent-orchestration/omega/reprovacoes/R-<entrega>-<ciclo>.md`. Em voo: o `B-O6R-02`
   está no ciclo 5, que já era o teto dele — **o ciclo 5 é a última tentativa**; se reprovar, para.
6. **Registrar a ata** — votos + justificativa em `docs/juntas/` (ou `agent-orchestration/omega/juntas/`).
   **Junta sem registro = merge inválido.** Verde da junta + CI verde = merge (§C7.1).

> **Resiliência de junta (P1–P6 — §C7.7 do `AGENTS.md`, inline):** toda cadeira grava **evidência
> incremental** em `agent-orchestration/omega/juntas/votos/<JUNTA>/<cadeira>-evidencia.md` a cada
> item, escreve o **voto em arquivo ANTES da mensagem final** (mensagem final = 1 linha), nasce como
> esqueleto `EM APURAÇÃO`, mandato ≤3 itens, máximo 2 disparos em paralelo, quedas em `00-quedas.md`.

> **Regra da dúvida (§C7.3):** qualquer incerteza → adote `agente-pesquisador-web` (≥3 fontes) e registre
> a PD em `docs/omega-pd.md` **antes** de decidir. Dúvida sem pesquisa = veto.

## Os 23 papéis por função

### Planejar / estratégia
| Papel | Função |
|---|---|
| `planejador-mestre` | O plano obrigatório antes de qualquer código. |
| `planejador-mapas` | Planejador da Junta de Mapas (geo/tiles/rotas/geocoding). |
| `estrategista` | Ordem e agrupamento das entregas por dependência e risco. |

### Implementar (devs)
| Papel | Função |
|---|---|
| `dev-mapas` | Implementação de mapa/geo (React/backend/Flutter). |
| `frontend-pixel-master` | Frontend pixel-perfect a partir de referência visual. |

### Junta / VETO (revisão)
| Papel | Poder | Função |
|---|---|---|
| `validador-mestre` | **VETO** | Validação avançada final do diff × plano × regras. |
| `avaliador-mapas` | **VETO** | Revisa qualquer diff de mapa/geo antes do merge. |
| `critico-adversarial` | ataque | Ataca o plano antes do código; obrigatório nos blocos de invariante — dinheiro/segurança/permissão/perda de dado (§C7.1-ter(b)). |
| `coordenador-de-acessos` | **VETO** | Cadeia completa de acesso (papel→permissão→menu→rota→backend), RBAC, SoD. |
| `inspetor-de-rotas` | **VETO** | Caça rotas erradas em toda PR. |
| `master-teste-telas-rotas` | **VETO** | Prova cada tela ponta a ponta. |
| `cognicao-visual` | **VETO** | Fidelidade §11 / anti-tela-morta (antes e depois de criar tela). |
| `agente-ci-doutor` | veto no gate | Triagem de CI/testes vermelhos por causa raiz (nunca skipa teste). |
| `inspetor-de-arnes-concorrente` | **VETO** | Corrida de catálogo do Postgres em arnês de teste (role/schema sob paralelismo), denominador que varia, lixo com privilégio. **Achador/votante: não escreve a correção.** |
| `guardiao-fail-closed` | **VETO** | Enumeração de segurança fail-closed — prova POR MUTAÇÃO se o membro não previsto nasce permitido e se a omissão quebra o build. **Achador/votante: não escreve a correção.** |

### Gates fail-closed (não julgam mérito; sem o parecer deles nada começa)
| Papel | Poder | Função |
|---|---|---|
| `inspetor-de-terreno-da-junta` | **gate (fail-closed)** | Antes de TODA junta: terreno limpo — worktree próprio por jurado que muta, cluster Postgres descartável por jurado, insumos do briefing, inelegibilidade por nome, fatia S0, baseline honesto. Sem o `LIBERADO` dele a junta não começa (§C7.1-bis). |
| `porteiro-pos-merge` | **gate (fail-closed)** | Após TODO merge: promessa do PR × diff real, contagens REEXECUTADAS, KPI com backfill, ata da junta, pendências por amostragem, limpeza §C5 — só então autoriza o início da próxima demanda (§C2.8). |

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

## Especialistas do protocolo de reprovação (§C7.4) — subpasta `especialistas/`

Criados pela `agente-fabrica` nos ciclos 1–2 de uma reprovação, **sob medida para o defeito que reprovou**.
**Entram na junta seguinte e votam**, e permanecem disponíveis pelo resto da rodada. Todos nascem **sem
ferramenta de escrita** (`Read`/`Grep`/`Glob`/`Bash`) — reforço estrutural do §C7.4-bis: quem acha não conserta.

| Papel | Poder | Nasceu em | Função |
|---|---|---|---|
| `inspetor-fixtures-financeiras-legadas` | **VETO** | B-O6R-02/F6, ciclo 1 | Fixture legada × invariante nova: prova **por execução** que `title_restore_conflict` continua discriminando sem afrouxar `DIN-004`/`title_has_payments`. **Achador/votante: não planeja, não corrige.** |
| `especialista-maquinas-de-desfazer` | **VETO** | B-O6R-02, ciclo 2 | Enumera **todas** as portas da API que desfazem o mesmo efeito monetário/de estado e prova que **concordam**; caça estado alcançável **sem rota de saída** (guard que fecha a saída sem fechar a entrada); exige invariante de **efeito líquido**, nunca de existência de linha; executa os drills de mutação em fixture. **Achador/votante: não escreve a correção.** |
| `especialista-arnes-postgres-node` | **VETO** | B-O6R-02, ciclo 2 | Valida o **arranjo** de cada medição (comando, env — inclusive `DATABASE_URL` —, N e forma do job) antes do número; ataca barreira de teste com **decoy**; enumera promessa que pode rejeitar **sem handler**; mede vazamento de catálogo e de dado antes/depois, inclusive em lote **abortado**. Piso: **15/15 na forma exata do job — não se arredonda.** **Achador/votante: não escreve a correção.** |

> **Divergência RESOLVIDA (§A2) — corrigida em 2026-09-05, B-O6R-02 ciclo 5.** O `--check` **cobre**
> `especialistas/`. **Não confira à mão; rode o guard.** Medido neste head:
> `node scripts/sync-agent-agents.mjs --check` → `OK — 34 agentes, espelho consistente` (`ec=0`), e
> `.claude/agents/especialistas/*.md` = **11** contra `.agents/agents/especialistas/*.md` = **11**.
> O script é **recursivo de propósito** (`scripts/sync-agent-agents.mjs`, `listMd()`), com o motivo no
> próprio comentário: *"o listing raso já deixou `especialistas/` fora do espelho E do `--check` dois
> ciclos seguidos"*.
>
> **Por que isto era perigoso, e não apenas desatualizado:** o texto abaixo mandava **desligar um guard
> que funciona** ("conferir à mão antes da junta") — e conferência manual antes da junta é exatamente o
> passo que falhou os dois ciclos que motivaram a versão recursiva. A afirmação "a versão recursiva vive
> na trilha de governança" não se sustenta: ela está na `main`.
>
> **CORREÇÃO (2026-09-05), de um over-claim meu apanhado por cadeira independente antes do merge.** Eu
> havia escrito aqui que a nota e o script recursivo *"entraram no mesmo commit `99f1840`, logo a nota já
> nasceu falsa"*. **É falso, e o erro é de medição.** Medido na história da **branch** (`7adff45` ainda é
> objeto): a nota entrou em **`8145415` (2026-08-23)**, quando o script **era** raso; o script virou
> recursivo em **`1aeb6e9` (2026-08-25)**, e `8145415` é ancestral de `1aeb6e9`. A nota **nasceu
> verdadeira** e ficou falsa **dois dias depois** — ninguém a reviu ao consertar o script.
>
> O "mesmo commit" só aparece porque o **squash** do #371 colapsou a branch inteira em `99f1840`: eu datei
> os dois com `git log -S` **na `main`**, onde a história interna da branch não existe mais, e li o
> achatamento como simultaneidade. **Regra que fica:** `git log -S` na `main` não data nada que aconteceu
> **dentro** de uma branch squashada — é a mesma classe do `is-ancestor`, que diz "não-ancestral" para toda
> branch squash-mergeada. O mecanismo real não é "nota nascida falsa", é **conserto que não atualizou a
> documentação** — e é esse que a próxima pessoa precisa reconhecer.
>
> Texto original preservado (§A2 — acrescentar, nunca apagar), **falso e sem efeito**:
>
> > ~~neste head, `scripts/sync-agent-agents.mjs:66` lê **apenas o topo** de `.claude/agents/` e o
> > `--check` varre **apenas o topo** de `.agents/agents/` — os arquivos de `especialistas/` não são
> > espelhados nem cobertos pelo guard. O espelho desta subpasta depende da versão **recursiva** do
> > script, que vive na trilha de governança. Enquanto as duas versões não convergirem, o espelho de
> > `especialistas/` **não é garantido pelo `--check`**: conferir à mão antes da junta.~~

## Composição típica da junta por tipo de PR
- **Feature normal:** planejador → crítico → dev → `validador-mestre` (VETO) + `inspetor-de-rotas` + `coordenador-de-acessos` (se toca acesso) + `cognicao-visual` (se toca tela).
- **Dinheiro / alienação / invariante financeiro:** **`critico-adversarial` OBRIGATÓRIO** (tolerância zero) + avaliador (VETO).
- **Superfície pública / portal:** **`agente-secops` (VETO) + `critico-adversarial`** obrigatórios + `coordenador-de-acessos`.
- **Migração de banco:** **`agente-dba-guardiao` (VETO)** obrigatório (tx-ROLLBACK sem DROP; RLS/FK/CHECK).
- **Mapa/geo:** `planejador-mapas` → `dev-mapas` → `avaliador-mapas` (VETO).
- **Decisão crítica** (deploy de produção, dependência nova, serviço externo pago): junta **unânime com 5 agentes** + PD (§C7.1).
