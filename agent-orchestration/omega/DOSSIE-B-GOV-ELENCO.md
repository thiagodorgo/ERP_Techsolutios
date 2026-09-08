# DOSSIÊ AO DONO — `B-GOV-ELENCO` parou no teto de dois ciclos

**Para:** Thiago · **Data:** 2026-09-08 · **Motivo:** `D-TETO-DOIS-CICLOS` — ciclo 1 reprovado 3×0, ciclo 2
(fatia A) reprovado 2×1. **Não há ciclo 3.** Nada foi pushado; nenhum PR aberto.

**Onde o trabalho está:** `chore/gov-auditoria-elenco` @ `d2d25f6b` (fatia A) e o superset
`chore/gov-elenco-fatia-b` @ `c0cbfe10` (assento permanente + a sua diretiva de modelo). Histórico inteiro
preservado. `demo/investidor` intocada.

---

## 1 · O que você pediu, e o que existe hoje

Você pediu auditoria agente a agente e skill a skill, espelhamento, repo organizado, documentado no padrão da
casa. **A auditoria foi feita e os defeitos são reais.** O que não passou foi a **ferramenta** que os mede e o
**desenho** do assento permanente.

**Defeitos reais achados em `origin/main` — todos verificados por cadeira independente:**

| Achado | Estado |
|---|---|
| **5 de 11 skills nunca carregaram** — `SKILL.md` um nível fundo. O `--check` estava verde: paridade de bytes prova que o espelho copiou, e ele copiou o defeito | corrigido na branch, 32/32 renames provados por hash de blob |
| **15 especialistas de blocos encerrados** — ~19,8 KB de `description` em toda sessão | aposentados; `A-C1` conferiu corpo, ata, PR e commit de revival |
| **Índice do Codex divergente** — dizia 23, listava 26, três eram especialistas | reconciliado, 23 = 23 |
| **Backfill do #380** — `pr`/`merge_commit`/`approved_head` em `null` pós-merge | preenchido |

## 2 · O que cada junta achou

**Ciclo 1 — REPROVADO 3×0.** Três classes distintas, nenhuma redundante: o painel de KPI se contradizendo na
mesma carga (card 161, gráfico 162); a enumeração de vereditos defendida **por exclusão** (string não prevista
nasce permitida); e o instrumento **cego para a própria classe** — a regex de prefixo não reconhecia
`agente-*`, então a cadeira que o pegou era invisível a ele. Duas cadeiras chegaram **independentemente** ao
mesmo fato: `Bash` dá poder de escrita a quem julga.

**Ciclo 2, fatia A — REPROVADO 2×1.** `A-C1` (escopo/registro/KPI) e `A-C3` (separação de poderes) aprovaram.
`A-C2` reprovou por **duas classes novas de falso-positivo**: linha `tools:` com comentário faz o auditor
acusar com **nome de ferramenta fabricado**, em vez da recusa nomeada que o plano promete; e link CommonMark
válido entre `<>`, para arquivo que existe, é reportado como quebrado.

## 3 · O que foi corrigido, e o que a correção provou

O ciclo 2 **fechou os três bloqueantes do ciclo 1**, e isso foi medido, não afirmado:

- **`C3-A1` fechado** — a pergunta do auditor inverteu: em vez de "quem julga?" por prefixo (cega a 13 de 24
  papéis), pergunta "quem está **autorizado a escrever**?", com **default-deny**. `A-C2` provou em **16
  mutações**: papel de nome qualquer com ferramenta de escrita nasce negado; ferramenta desconhecida é
  negada, não ignorada.
- **`C3-A2` fechado com honestidade** — a frase falsa *"§C7.4-bis respeitado por construção"* morreu. No
  lugar, um aviso que **nomeia e conta** os papéis com `Bash` e aponta o dono da decisão pendente.
- **`C1-01` fechado** — `blocks_completed` 162 no `value` **e** no `display`, `FROZEN` regenerado.

E a separação de papéis funcionou de verdade: o dev é identidade distinta, não julgou achado nenhum, devolveu
três decisões em vez de resolvê-las, e **recusou-se a fazer o mutante passar** — bastava uma linha fazendo uma
passada de limpeza ignorar linha que pareça cerca, mudaria só o teste e ninguém veria. Ele escreveu o motivo:
seria código escrito para o teste.

## 4 · POR QUE A CORREÇÃO NÃO BASTOU — o padrão, que é a informação que vale

**As duas juntas acharam a mesma família de defeito: o instrumento erra na fronteira da gramática que ele
próprio define.**

| Ciclo | Gramática | Onde errou |
|---|---|---|
| 1 | nomes de papel (regex de prefixo) | cega a `agente-*` — 13 de 24 papéis |
| 1 | ferramentas (lista de 3 literais) | `MultiEdit` passava limpo |
| 2 | subconjunto YAML do frontmatter | comentário no fim da linha → **acusação com nome fabricado** |
| 2 | destinos de link | `<destino>` do CommonMark → arquivo existente acusado |

**Cada conserto fechou a classe apontada e abriu a vizinha.** Isso não é azar: é a consequência de **parsear
YAML e Markdown com regex**. O auditor declara um subconjunto, e tudo que cai fora dele vira **diagnóstico
falso** em vez de **recusa honesta**. Um terceiro ciclo fecharia estas duas classes e, pelo padrão medido,
abriria a próxima.

**A boa notícia dentro do padrão:** todas as falhas medidas são **fail-closed** — vermelho falso, nunca verde
falso. A única exceção medida é `A-C2-05` (destino de link com espaço nunca é conferido), `BAIXA`,
prevalência 0. O guard erra **acusando**, não **absolvendo**.

## 5 · As opções, com custo — a decisão é sua

**Opção 1 — Recusa nomeada na fronteira (menor, e ataca a raiz).**
Em vez de mais gramática: quando a entrada cai fora do subconjunto declarado, o auditor emite *"não consigo
ler o frontmatter, linha N"* e reprova por isso — em vez de adivinhar. Converte **toda** lacuna futura de
gramática de acusação falsa em recusa honesta. É exatamente o que a `A-C2` disse que era o esperado e não
aconteceu. **Custo:** um caminho de código, um ciclo curto. **Risco:** é um bloco novo, com junta nova.

**Opção 2 — Parser de verdade.**
YAML e Markdown com biblioteca, em vez de regex. **Custo:** dependência nova → **junta unânime de 5**
(§C7.1), mais superfície. **Ganho:** a classe inteira morre. **Contra:** o repositório tem tradição de zero
dependência, e um parser de markdown para conferir link é peso grande para o problema.

**Opção 3 — Encolher o auditor ao que regex faz com segurança.**
Manter `C6`/`C7` (localização e nome de `SKILL.md` — **puro sistema de arquivos**, foi o que achou as 5
skills mortas), `C9` (paridade de espelho), `C10` (peso do elenco); **cortar `C8`** (links) e o parsing de
subconjunto YAML, que são a origem dos quatro falsos. **Custo:** perde-se a checagem de link. **Ganho:** o que
sobra é determinístico e já provou valor.

**Opção 4 — Aceitar a fatia A como está, por decisão sua.**
Os defeitos bloqueantes são **latentes** (prevalência 0), **fail-closed**, e a faxina foi verificada por três
cadeiras. Você pode mandar mergear assobre a reprovação. **Custo:** o precedente — a junta deixa de ser
vinculante, e é a terceira vez que ela pega defeito real que eu não vi. **Não recomendo**, mas é sua alçada e
o registro fica honesto se for esse o caminho.

**Minha recomendação: Opção 3 + Opção 1**, nessa ordem, como bloco novo e pequeno. Corta a superfície que
gerou os quatro falsos e troca adivinhação por recusa. A faxina — que é o que você pediu — entra junto e já
está pronta e verificada.

## 6 · O que eu errei, e que a junta pegou antes de virar dano

- **Misturei escopos** no ciclo 1: faxina (que passou inteira) com desenho do assento (que foi reprovado). O
  planejador desfez isso fatiando, mas o ciclo já tinha sido gasto.
- **Escrevi no briefing uma regra de escopo que o meu próprio commit violava** — teria feito as cadeiras
  reprovarem um caminho permitido. O inspetor pegou e bloqueou.
- **Afirmei que o auditor rodava em CI.** Não roda; a CI só executa `sync-agent-agents --check`. O inspetor
  mediu e virou `P-GOV-AUDITOR-FORA-DA-CI`.
- **Violei o §C7.7** no primeiro disparo (mandato de 7 itens, sem P1/P2). Não houve queda, mas o trabalho
  inteiro esteve exposto numa única mensagem.
- **Assinei a `EMENDA 2` sem ser o planejador** (`A-C3-02`). As três cadeiras confirmaram que ela **não
  afrouxou** nada — mas o acúmulo de papel é real e fica registrado.

## 7 · Pendências abertas que precisam de você

| Pendência | O que decidir |
|---|---|
| `P-GOV-MODELO-CODEX-SEM-NOME` | os **dois IDs OpenAI** (raciocínio máximo e degrau abaixo). O repo nunca registrou qual modelo o Codex usa, e o sync leva `model: fable` — nome Anthropic — para dentro dele sem tradução |
| **degrau único** | batemos no limite do **Fable e do Opus** na mesma rodada. `D-FALLBACK-MODELO-FABLE-OPUS` tem um degrau só; o que fazer quando o Opus acabar não está escrito |
| `P-GOV-BASH-EM-QUEM-JULGA` | `Bash` dá escrita a quem julga, e o §C7.7 P1/P2 **obriga** o jurado a escrever evidência e voto. Tirar quebra o protocolo; deixar mantém o buraco |
| `A-C3-01` | `agente-devops-provisionador` está na allowlist de escrita **e** se auto-descreve como votante de junta — papel que julga e escreve |
| `P-GOV-SKILLS-RELEVANCIA` | `blockchain-developer` voltou a carregar e não tem relação com o produto. Fica ou sai? |
| `P-GOV-AUDITOR-FORA-DA-CI` · `P-GOV-WORKTREES-NAO-IGNORADAS` · `P-GOV-VEREDITO-SEM-PARSER` · `P-GOV-ESPELHO-CONTRATO-SEM-GUARD` · `P-GOV-NOTA-KPI-CONGELADA` · `P-GOV-MAQUINAS-DE-DESFAZER-PROMOVER` | registradas com dono e severidade |

## 8 · Uma coisa que este bloco entregou sem estar no pedido

O **assento permanente** foi reprovado como desenho, mas rodou uma vez de verdade — e na estreia **re-escopou
um achado bloqueante**: o componente mecânico de `C2-01` antecedia o bloco e o conserto viveria em caminho
proibido. Sem ele, o ciclo 2 teria nascido carregando uma cobrança impossível — que é exatamente a patologia
que a auditoria de 28/08 mediu em **11 de 16** bloqueantes. O desenho precisa de conserto; a função provou-se.
