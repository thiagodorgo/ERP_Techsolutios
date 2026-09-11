# PARECER DE REGULARIZAÇÃO — porteiro pós-merge — #382 / #383 / #384

> Emitido em 2026-09-09, a pedido do orquestrador, para cobrir três merges que entraram na `main`
> **sem o gate do §C2.8**. Ref medida: `main @ a01fc014`, no worktree `gov-elenco`.
> A versão incremental (protocolo P2, gravada durante a apuração) está ao lado, em
> `00-parecer-incremental-p2.md`. Este arquivo é a palavra final do agente, verbatim.

## NOTA DE MODELO (obrigatória)

Meu frontmatter fixa `model: fable`. A cota do Fable está **esgotada** nesta conta (HTTP 429, medido
hoje). O contrato prevê a exceção — *"indisponibilidade do modelo vira nota"* (`D-FALLBACK-MODELO-FABLE-OPUS`,
§C7.6). **Rodei em Opus.** Fica a nota, e fica também a observação de que `P-GOV-ESGOTADO-SEM-TESTE`
(MÉDIA, aberta) existe justamente porque "o Fable esgotou" é hoje declarado e não provado — eu não colhi
o 429 com minhas mãos; recebi-o do orquestrador.

## NOTA DE CONTAMINAÇÃO — eu sou a QUARTA instância da classe que o #383 declarou fechada

Antes de qualquer veredito, medi o contrato que me foi carregado (§A7, item 3.3):

```
git show a01fc014:CLAUDE.md            | grep -c "1-quater. ASSENTO PERMANENTE"  -> 0
grep -c "C7.1-quater" <árvore principal>/CLAUDE.md                               -> 0
git show origin/chore/gov-elenco-fatia-b:CLAUDE.md | grep -c "1-quater. ASSENTO" -> 1
git show 25c0112a:CLAUDE.md                        | grep -c "1-quater. ASSENTO" -> 1
```

O `CLAUDE.md` do meu prompt **carrega o §C7.1-quater** e a regra *"Ata sem o parecer dele = merge
inválido"*. Essa cláusula **não existe na ref julgada**. Ela existe **só** em
`origin/chore/gov-elenco-fatia-b` / `25c0112a` — a branch cujo desenho foi **reprovado em duas juntas e
nunca mergeou**. Aplicado o §A7 da ref (*"norma citada que não existe na ref julgada não se aplica"*),
**não exigi assento permanente de nenhum dos três merges**. Se eu tivesse aplicado o corpo como
carregado, teria reprovado os três por construção — exatamente a patologia dos 11 em 16.

Item 3.3 aplicado a mim mesmo: meu **corpo** bate com a ref (5 de 5 frases distintivas presentes em
`a01fc014:.claude/agents/porteiro-pos-merge.md`; 0 menções ao assento). **O contrato é que não bate.**
A detecção do #383 funcionou; a prevenção dele não — e isso é medição, não opinião (achado M-3).

---

## O que executei

**Terreno.** `main@a01fc014` no worktree `gov-elenco` (limpo antes e depois de tudo que rodei). Nenhum
`git clean`. Base viva `erp-postgres`/`erp-redis` não tocada. `b06`, `gov-descuido` e a árvore principal
só lidos por `git show`/`git ls-tree`/`status --no-optional-locks`.

**1 · Merges íntegros.** Os três `MERGED`, `merge_commit` conferindo com `origin/main`, **CI 7/7 SUCCESS**
em cada.

**2 · Promessa × entregue.** `git diff --numstat 90d30f8a a01fc014 -- src tests prisma frontend mobile
.github` → **vazio**. Reproduz a afirmação dos três corpos. Verificações por presença que **conferem**:
- §A7 em `CLAUDE.md:103` e `AGENTS.md:112`, **idênticos EOL-neutro**;
- item 3.3 novo no `inspetor-de-terreno-da-junta` (dois espelhos, `sync --check` verde);
- resíduo alheio do #383 reproduz **à linha**: `+86` e `+96` nas duas cadeiras, nos dois espelhos;
- **todos** os fatos da skill do #384: 27 arquivos com `$queryRaw`/`$executeRaw` em `src/`;
  `$queryRawUnsafe` **exatamente 1**, em `src/routes/health.routes.ts:115`;
  `"test": "node scripts/run-backend-tests.mjs"`; `withTenantRls` em `src/database/rls.ts:29`; lista
  `SUITES` em `ci.yml:174+`; guard de zero pulos.

**3 · Contagens REEXECUTADAS** — do log do run de CI `34286402713` (head do #384), não copiadas:

| | medido | declarado |
|---|---|---|
| backend | `# tests 2938 / # pass 2936 / # fail 0 / # skipped 2` | `2936/2938` ✓ |
| frontend smoke | `# tests 1126 / # pass 1126` | `1126/1126` ✓ |
| flutter | `+864: All tests passed!` | `864/864` ✓ |
| backend-postgres | `225/225`, **0 skipped** | (guard mordendo) |

**4 · KPI.** `FROZEN == kpis-latest.json` → `True`. `node --check Kpis/app.js` ec=0. Backfill do #381:
`merge_commit` `90d30f8a` real; `approved_head` `81b977f3` justificado por escrito — e **medido**: o blob
de `scripts/audit-agents-skills.mjs` é `c82c5928` em `9c0e6ac9`, `81b977f3` **e** `90d30f8a`. A
justificativa confere.

**5 · Auditor e espelhos.** `audit-agents-skills.mjs` (árvore **e** `--ref a01fc014`):
`0 BLOQUEIA · 1 AVISO`. `sync-agent-agents --check`: 23 agentes. `sync-agent-skills --check`: 12 skills,
39 arquivos.

**6 · Limpeza §C5.** 3 branches remotas apagadas; as 2 preservadas por declaração presentes; 0 branches
locais mergeadas pendentes; **0 arquivos rastreados apagados** na árvore principal; 22 GB livres (acima do
limiar — DEEP_CLEAN não requerido).

**7 · B1 do orquestrador — conferido.** Nenhum dos 4 caminhos era rastreado em `d1fab3bc` (0/0/0/0). A
skill está **rastreada na `main`** (3+3 arquivos, do próprio #384). O corpo removido é recuperável de
`25c0112a`, que está **contido em `origin/chore/gov-elenco-fatia-b`** (durabilidade remota). **Nada
rastreado foi perdido.**

---

## Achados

**G-1 · §C2.8 violado duas vezes, por construção (confirma A-08).** #382 mergeou 19:23:32Z; o commit do
#383 é 20:09:27Z. #383 mergeou 20:20:35Z; o commit do #384 é 22:31:27Z — e o corpo do #384 **prova** a
dependência: *"Ela aplica a si mesma a regra que acabou de entrar na `main`… o §A7 (mergeado no #383)"*.
Prova por presença: `git grep -l "#38{2,3,4}" a01fc014 -- agent-orchestration/` → ec=1 nos três; controle
positivo `#381` → 4 arquivos.
**Atenuante que medi:** o próximo bloco de *feature* teve gate. O primeiro commit do `b06` é `dd16beb1`
(2026-09-06) — *"parecer do porteiro pos-merge do #380 — LIBERADO COM RESSALVA **para o B-O6R-06**"*. Os
starts sem parecer foram os dos três PRs de governança, não o do backlog.

**G-2 · #384 entrou com ZERO linha em `agent-orchestration/` (confirma M-06).** Sem ID de bloco, sem
registro, sem pendência. Fere §C6 e §A5. Ironia medida: o **conteúdo** da skill é o mais honesto dos três
— cada afirmação reproduz na ref. O defeito é só o cartório.

**G-3 · ACHADO PRÓPRIO: as pendências "fechadas" continuam ABERTAS para o instrumento da casa.**
`P-GOV-WORKTREES-NAO-IGNORADAS` (#382) e `P-GOV-CAMINHO-REPO-SESSAO` (#383) declaram fechamento no
cabeçalho, mas a **linha canônica ainda diz `**status:** ABERTA`** — e a regra do próprio gerador
(`gerar-indice-pendencias.py:29`) é *"a LINHA de status vence o CABEÇALHO"*. As duas caem em
**ABERTAS · balde A (material)**. Pior: a contradição é **invisível** — o detector `CABEC` (l.48) exige
`**FECHADA**` em negrito e os cabeçalhos escrevem sem, então `CONTRADITORIAS = 0`. E
`P-GOV-INSPETOR-33-SEM-NORMA` usa `**status:** REBAIXADA`, palavra **fora do vocabulário**
(`FECHAD|RESOLVID|DESCARTAD|DECIDID|ABERT`) → cai em **SEM STATUS**, com severidade ainda lida **ALTA** do
cabeçalho, quando o #382 prometeu BAIXA.

**M-1 · Índice defasado — e o dono é majoritariamente o #381 (corrige M-03).** Gerador real executado em
scratch: **224 abertas · balde A 54 · 296 cabeçalhos · 285 IDs · 3 SEM STATUS**, contra os
**208 · 41 · 277 · 266 · 0** publicados. Atribuição medida por ref: `fe2748c8` 277 = índice 277 (correto)
→ `90d30f8a` **295** (#381 acrescentou **18** e não regenerou) → `1b8319f9` **296** (#382 acrescentou 1) →
#383 editou sem cabeçalho novo → #384 não tocou. Último commit a tocar o índice: **`fe2748c8` (#380)**. Ou
seja: **18 dos 19 são dívida do #381**, que *teve* parecer de porteiro.

**M-2 · `status-geral.md` para no #381 (confirma M-05, com correção).** A última seção é
*"…`B-GOV-ELENCO-ENXUTO` (#381, mergeado)"* — escrita **pelo** #382, que não se registrou. #382, #383 e
#384 não aparecem. O §A4.1 manda ler esse arquivo antes de todo bloco.

**M-3 · A-05 confirmado, e agravado por medição minha.** `P-GOV-CAMINHO-REPO-SESSAO` fecha sobre dois
mecanismos: **detecção** (§A7 + item 3.3), entregue e verificada; e **prevenção** (*"a sessão sai de um
worktree que acompanha a `main`"*), que o próprio corpo do PR intitula **"Prevenção (fora do diff)"** e que
nenhum artefato força. A prevenção é o que *"remove a classe inteira"*. **Um dia depois, a classe
reincidiu — em mim** (nota de contaminação acima). Conformidade parcial medida: `gov-elenco` está na
`main`; `b06` deriva de `1b8319f9` (2 atrás); a árvore principal segue **26 commits atrás** em
`demo/investidor`.

**B-1 · #382 sobrescreveu, não apensou, o `backfill_note` do #381** (§A2 manda acrescentar). Atenuante
medido: o conteúdo substantivo sobrevive verbatim no `description` da entrada — nada se perdeu de fato.

**B-2 · Auto-reportado: uma medição minha respondeu QUASE a pergunta.** Meu `grep -iE "assento permanente"`
na skill deu ec=1, que se leria como "não menciona". Re-medido com a quebra de linha neutralizada: a frase
está partida pelo marcador de citação, e o conceito **está** lá — como ressalva honesta em
`SKILL.md:24-28`. Conclusão inalterada; o método estava errado e fica corrigido aqui.

## O que NÃO consegui executar (dito, não presumido)

- **Não rodei `npm test` / `test:smoke` / `flutter test` localmente.** `gov-elenco` **não tem
  `node_modules`** (medido); a base viva é vedada; `npm ci` num disco a 92% não se justifica para
  reproduzir o que a CI já mediu. Em vez de presumir, **li as contagens dos logs dos jobs de CI** do run
  sobre o head do #384 — é execução, não cópia.
- **Não consigo verificar no repositório que `D-MEDIR-NA-REF-ALVO` foi de fato decisão do dono.** O
  `decisoes.md` afirma, na convenção da casa. Fica como limite do meu instrumento.
- **Não julguei a junta do `b06`.** Mas registro para quem for o gate dela: o commit `ab2540d0` diz
  *"homologacao da cadeira permanente no B-O6R-06"*, e a `cadeira-permanente-backend-review` **não existe
  em `a01fc014`** (0 arquivos, os dois espelhos), nem o §C7.1-quater. Pelo §A7, ata homologada por uma
  cadeira que a ref julgada não tem é norma que não se aplica.

---

## Vereditos

- **#382 — LIBERADO COM RESSALVA.** Entregou tudo que prometeu; o backfill é o mais bem justificado que já
  medi. Dívida: G-3, M-1 (1 cabeçalho), M-2, B-1.
- **#383 — LIBERADO COM RESSALVA.** O melhor medido dos três — a afirmação sobre resíduo alheio reproduz à
  linha. Dívida: M-3 (fechou sobre prevenção fora do diff, e a classe reincidiu em mim), G-3, e deixou
  `P-GOV-INSPETOR-33-SEM-NORMA` aberta **depois de já ter entregue a opção (b) que a fecharia**.
- **#384 — LIBERADO COM RESSALVA.** Conteúdo honesto, cada fato reproduz na ref. Dívida: G-2 — zero
  cartório.

**O repositório está DESTRAVADO para começar bloco novo.** O §C2.8 (*"sem parecer dele, nenhum bloco novo
começa"*) fica satisfeito por **este** parecer — é exatamente para isso que serve uma regularização.
Nenhuma pendência declara `BLOQUEIA` sobre o próximo alvo. E o `B-O6R-06` já em voo
(`fix/billing-durability`, cc579302, 22 commits) **não precisa de nova autorização de start**: o dele foi
dado pelo porteiro do #380.

O que precisa fechar **dentro** da próxima demanda: (1) rodar o gerador e commitar `pendencias-indice.md`;
(2) corrigir as linhas `status:` das duas pendências "fechadas" e trocar `REBAIXADA` por vocabulário
legível, baixando a severidade do cabeçalho do `INSPETOR-33` como o #382 prometeu; (3) registrar
#382/#383/#384 no `status-geral.md` e dar ID e registro ao #384; (4) reabrir ou reescopar
`P-GOV-CAMINHO-REPO-SESSAO` — a prevenção não tem dono nem trava, e eu sou a prova; (5) fechar
`P-GOV-INSPETOR-33-SEM-NORMA`, já entregue pelo #383.
