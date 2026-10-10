papel: inspetor-de-terreno-da-junta · modelo: GPT-6 Astra (invocação do dono; sem fallback) · mandato_md5: f48e02e59ec26b776e4b863c26b1f1ce · corpo_md5: 910c63c27fc371f6e9976bf4739977a6

# Parecer — ciclo 3 do B-O6R-04a / PR #389

**Veredito: LIBERADO COM RESSALVA — 2026-10-10T13:35:54.261Z.**

Terreno liberado para a junta do ciclo 3 no SHA abaixo. Não constitui aprovação do mérito nem autorização de merge. R3 é ressalva forte de mandato, atribuída ao orquestrador; não foi omitida nem tratada como verificada.

## Objeto e medições

- **Head:** de1dff89a8fd8a501bf57dd92983a23c244fd5fd, igual por git, gh e ls-remote. Main c1cfdabe12c74b58f8393dbee4f333224c56b303 é ancestral. Desde e62d1e4b só entrou inspetor-c3.md.
- **Sem dev no ciclo 3:** git diff --exit-code 35ef85be HEAD -- src tests prisma scripts .github → saída vazia, ec 0. 19/19 arquivos centrais no w-389 e no worktree próprio com MD5 EOL-neutro igual ao blob.
- **Árvore e isolamento (1.1–1.3):** worktree detached próprio limpo antes/depois do baseline; w-389 só com as duas saídas autorizadas. Plano C3.3 declara worktree/npm ci próprios e cluster Linux descartável por cadeira, prefixos j389c3-c1/c2/c3, proibição da base viva e disco ≥10 GB. Nenhum container de jurado anterior encontrado; nenhuma sonda solta nos três worktrees inspecionados. w-07ca e w-traccar não foram inspecionados.
- **Insumos (2.1–2.3):** plano C3, Emenda 8, ata e reprovação C2 presentes. C3.3 manda reexecutar e falsificar independentemente a conclusão do planejador; não a aceitei como evidência de produto. Escopo no §8, bateria/forma no §10 e emendas; alvo HC3 resolvido pelo inspetor. Cinco pendências presentes e indexadas, com a ressalva de dono abaixo. Auditoria da máquina não aplicável ao ciclo 3; obrigatoriedade também revogada no §C7 item 8(2).
- **Inelegibilidade (3.1/3.1-bis):** obituário lido antes do grep; nenhuma identidade proposta sepultada/reservada. Cruzamento nominal de atas/reprovações/votos: C1/C2 suplentes não votaram neste bloco; coordenador-de-acessos e inspetor-de-arnes-concorrente têm atuações em outros casos, permitidas aos papéis permanentes. Separados dos votantes C1/C2/C3 dos ciclos anteriores, crítico, planejadores, devs e das instâncias anteriores do inspetor. Ausência de voto não foi inferida da mera ausência no obituário.
- **Competência/corpos (3.2–3.3):** C1 banco/RLS/concorrência, C2 fail-closed de produto, C3 acesso/rotas. Corpos dos suplentes presentes nos dois espelhos; permanentes iguais ao alvo no diretório da sessão. Os suplentes não existem na sessão: carregar os blobs do alvo, com os hashes abaixo. Normas citadas conferidas no CLAUDE.md do head, idêntico ao de origin/main.
- **S0/baseline (4.1–4.2):** sync-agent-agents.mjs --check → 49 agentes consistentes, ec 0. npm ci próprio → 326 pacotes, ec 0; db:generate ec 0; npm run check ec 0, código capturado diretamente do processo. Node 20.19.5; sem banco, DATABASE_URL fictícia no processo de geração/check; nenhuma conexão com a base viva. Aviso EBADENGINE de dependência transitiva registrado, instalação e baseline concluíram.
- **Check-runs (4.3): CONFERIDO — 14/14 completed/success no SHA exato**, sete jobs em cada uma das duas execuções (backend, backend-postgres, frontend, flutter, authority-portal, owner-portal, docker); 0 pending/queued/in_progress/cancelled e nenhum vermelho. PR permanece OPEN/draft, MERGEABLE.
- **Quórum (5.1):** unanimidade de 3; C1+C2 no máximo em paralelo, C3 depois; P3/P5/P6/P7 e perda de voto declarados pelo contrato/plano. Suplentes de emergência nomeados; uma mesma identidade não pode preencher duas cadeiras.

## Hashes dos corpos para o disparo Codex

| Cadeira | Corpo em .agents/agents/ | MD5 sem CR |
|---|---|---|
| C1 | especialistas/jurado-o6r04a-c2-suplente-banco-rls.md | 6af1ad8f996180a6080a2f4cceca4cdf |
| C2 | especialistas/jurado-o6r04a-c2-suplente-fail-closed-backend.md | 7a9ebea0821847f1784bf17bbae56c2e |
| C3 | coordenador-de-acessos.md | 3425df9a2710310a3b0b2070ef278967 |
| Reserva | inspetor-de-arnes-concorrente.md | 5523bce9cba3c21aa26398ab35b4546f |

Os MD5 de 734bc61… e 0d8203… da inspeção anterior são dos corpos Claude; o preâmbulo Codex muda o hash. S0 confirmou o espelhamento; isso não é divergência de conteúdo.

## R1–R7 re-conferidas e encaminhamentos

- **R1 — recursos:** C3.3 já fixa os prefixos únicos e caminhos C:/Users/AMP/w-j389c3-c*. Os corpos ainda trazem nomes de C2; o orquestrador deve transportar a instrução C3 aos mandatos.
- **R2 — carregamento:** suplentes ausentes da sessão, presentes no head; usar blob + hash da tabela, modelo explicitamente fixado e declaração de fallback se ocorrer. Carregamento das futuras cadeiras não foi atestado como já ocorrido.
- **R3 — FORTE, mandatos ausentes:** git ls-tree e grep da pasta 00-mandatos mostram só C1c2/C2c2/C3c2, inspetor-c2 e inspetor-c3. Não existem ali mandatos das três cadeiras C3; tampouco foram entregues por outro meio. A nota literal C3 está no PLANO, não em mandatos lidos e conferidos. **Dono: orquestrador do B-O6R-04a** — entregar mandatos/pre-voos com nota literal, reexecução própria, isolamento, hashes e P1–P7 antes dos respectivos disparos. Não alegar pré-voo ou briefing aprovado por esta inspeção.
- **R4 — disco:** medido acima de 10 GiB no início e após limpeza (**15.82 GiB finais**). Repetir antes de cada cadeira; preservar P5 e não rodar limpeza profunda sobre o servidor vivo.
- **R5 — resíduo inerte:** w-pvpr detached em e62d1e4b, apenas scripts/mandato-refs.sh e mandato-preflight.sh untracked; sem processo associado detectado. erp-postgres-alt continua Exited; container pastrack é de outro projeto. Nada removido nesses recursos.
- **R6 — texto:** os suplentes ainda dizem “o teto manda” e “ciclo 2/régua completa”. Aplicar a norma vigente do alvo e a nota literal C3; não reaplicar a régua de C2. Dono: orquestrador nos mandatos.
- **R7 — T15:** P-SAN3-05-T15-TETO-DE-RELOGIO continua aberta, dona B-ARNES-2; arquivo vem do #405, commit a9fbe283, anterior ao ciclo 3. C3 deve reexecutar sob Linux/psql16 e declarar N/forma/escopo. Não reproduzi a suíte de mérito nem importei o resultado da junta anterior.
- **R8 — índice:** as cinco pendências aparecem no índice com dono “a atribuir”, apesar de pendencias.md indicar B-GOV-GUARDA-POR-PROPRIEDADE (por referência nas demais) e alternativa B-BAT-01 para o censo. **Dono: orquestrador/registro do B-O6R-04a** — reconciliar a representação do dono; não são cinco pendências inexistentes.
- **R9 — reserva compartilhada:** inspetor-de-arnes-concorrente é reserva de C1 e C3; coordenador-de-acessos só substitui C2 se deixar de ser C3. Se houver perdas múltiplas, recompor com outra identidade elegível; voto perdido ou duplicado não satisfaz unanimidade.

**Régua aplicada:** o §C7 item 8 declara precedência sobre §C7.1-bis e manda achados de processo/registro/mandato do ciclo 3 virarem pendências com dono. Portanto R3/R8 são ressalvas documentais explícitas, não reprovação de produto. O pedido atual exige aguardar CI concluído: condição cumprida por execução, com 14/14 concluídos e verdes. Não houve julgamento de mérito, correção, commit ou merge.

## Limpeza

Worktree C:/Users/AMP/w-insp389c3 removido por git worktree remove --force (ec 0), após conferir caminho absoluto, node_modules próprio sem symlink e processos; diretório ausente confirmado. Nenhum container/volume criado. Apenas insp-c3-evidencia.md e insp-c3-parecer.md foram gravados em w-389. Base viva e worktrees dos outros agentes preservados.

Evidência executada e timestamps: insp-c3-evidencia.md. Orquestrador: versionar exclusivamente as duas saídas; incorporar R1–R9 aos mandatos/registro; se o SHA mudar, reconciliar o delta e conferir check-runs no novo objeto.
