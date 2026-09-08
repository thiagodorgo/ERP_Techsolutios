# R-B-GOV-ELENCO-ciclo2-A — reprovação do ciclo 2, fatia A (o TETO)

**Veredito:** REPROVADO 2×1 (unanimidade de 3) · **Head:** `d2d25f6b` · **Data:** 2026-09-08
**Consequência:** `D-TETO-DOIS-CICLOS` — **não há ciclo 3**. Fatia A não merga; fatia B não começa.
**Dossiê ao dono:** `agent-orchestration/omega/DOSSIE-B-GOV-ELENCO.md` · **Ata:** `J-B-GOV-ELENCO-ciclo2-A.md`

## Bloqueantes

| id | cadeira | gravidade · escopo | o quê |
|---|---|---|---|
| `A-C2-02` | `inspetor-de-arnes-concorrente` | ALTA · dentro-do-bloco | comentário no fim da linha `tools:` → acusação `C4` com **nome de ferramenta fabricado**, em vez da recusa nomeada que o plano promete |
| `A-C2-03` | idem | ALTA · dentro-do-bloco | destino de link entre `<>` (CommonMark 6.3) para arquivo **existente** → reportado como quebrado; irmã: destino com query string |

Ambos `dentro-do-bloco` com evidência de origem executada (`git cat-file -e fe2748c8:scripts/audit-agents-skills.mjs`
falha; o script nasce em `25c0112a`). Prevalência **0** no head — defeitos **latentes** do guard.
Direção da falha: **fail-closed** (vermelho falso, nunca verde falso).

## Não-bloqueantes registrados

`A-C1-01` (BAIXA, datação divergente no mesmo commit) · `A-C2-01` (MÉDIA, a allowlist de escrita não recebeu
a honestidade — N e dono — que o mesmo bloco exigiu da exceção `Bash`) · `A-C2-04`, `A-C2-05` (BAIXA;
`A-C2-05` é o **único fail-OPEN medido**: destino de link com espaço nunca é conferido) ·
`A-C3-01` (MÉDIA, `agente-devops-provisionador` julga **e** está na allowlist de escrita; o N do aviso cai de
17 para 16) · `A-C3-02` (MÉDIA, a `EMENDA 2` é ato de planejamento assinado por quem não é o planejador —
sem afrouxar propriedade, confirmado por 4 mutações reexecutadas).

## A causa raiz, medida nos dois ciclos

O instrumento erra **na fronteira da gramática que ele próprio define**, e cada conserto fecha a classe
apontada e abre a vizinha: prefixo de nome e lista de ferramentas (ciclo 1) → subconjunto YAML e gramática de
link (ciclo 2). É a consequência de parsear YAML e Markdown com regex: o que cai fora do subconjunto declarado
vira **diagnóstico falso** em vez de **recusa honesta**. Opções com custo no §5 do dossiê.

## O que passou e não se perde

Default-deny do `C4` provado em **16 mutações**; `EMENDA 2` confirmada como **não-afrouxadora** pelas três
cadeiras (o artefato passa no critério antigo **e** no novo); forma publicada (Node v20.19.5,
`core.autocrlf=true`) pela primeira vez neste bloco; separação de papéis do §C7.4-bis cumprida de verdade —
o dev é identidade distinta, devolveu três decisões em vez de resolvê-las, e recusou-se a escrever código
para o teste.
