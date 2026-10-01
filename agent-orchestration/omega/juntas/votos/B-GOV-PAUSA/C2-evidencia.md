mandato_md5 = becd53d8fe673d5561b14c1c282664c6 (medido: `tr -d '\r' < C:/Users/AMP/w-pausa/agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/c2.md | md5sum`) · declarado no disparo: becd53d8fe673d5561b14c1c282664c6 · CONFERE
# Evidência — cadeira C2 da junta 1 do B-GOV-PAUSA (PR 397)

- papel: cadeira C2 — consistência normativa e espelho · identidade: `jurado-pausa-c2-consistencia-normativa-espelho` (nova) · modelo: Opus (claude-opus-5-5), o do frontmatter `model: opus`; sem substituição.
- lançada como `general-purpose` (R1 do inspetor: o tipo não está registrado na sessão); corpo aplicado = blob `67c2c280:.claude/agents/especialistas/jurado-pausa-c2-consistencia-normativa-espelho.md`, lido INTEIRO. md5 EOL-neutro do corpo recebido = `facd19fd5c1a6ab892d08fb61c4dfc23` = md5 do blob no head (medido no worktree próprio: `MSYS_NO_PATHCONV=1 git -C C:/Users/AMP/w-jur-pz2 show HEAD:.claude/agents/especialistas/jurado-pausa-c2-consistencia-normativa-espelho.md | tr -d '\r' | md5sum`) = o declarado no disparo. CONFERE.
- Ferramentas: obedeço ao corpo (`Read, Grep, Glob, Bash`); as únicas escritas são este arquivo e `C2-voto.json`, por Bash. Nomes dos arquivos: o MANDATO e o disparo dizem `C2-evidencia.md`/`C2-voto.json` (maiúsculo); o corpo diz `c2-*` — segui o mandato (fonte do disparo). Anotado como nota de terreno.
- head resolvido por mim (2026-10-01T18:32Z): `git fetch origin` ec=0 · `git rev-parse origin/docs/gov-pausa-grava-e-para` = `67c2c280612cb644f246af0b5410cab59afe028d` · `gh pr view 397 --json headRefOid,isDraft,mergeable,state` = headRefOid `67c2c280612cb644f246af0b5410cab59afe028d`, draft=false, MERGEABLE, OPEN → as duas vias COINCIDEM. merge-base(origin/main, head) = `5b6e103638f398d6074eecc5daebdf2d3bcd2252` = origin/main.
- R4 do inspetor: a colagem do mandato nomeia `ed61f998`; o objeto é `67c2c280` (1 commit acima, o que versiona os mandatos). Medi `67c2c280`.
- Legalidade: `00-inspetor-terreno.md` (não commitado, de propósito) lido inteiro → **LIBERADO COM RESSALVA** (R1–R4), objeto `67c2c280612cb644f246af0b5410cab59afe028d`, quórum MAIORIA DE 3 sem veto, 14/14 check-runs verdes. O objeto liberado = o head que resolvi. Legalidade CONFERIDA.
- `00-quedas.md`: tabela vazia → não substituo caído (P3 não se aplica); não há `C2-evidencia.md` anterior.
- Worktree próprio: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree add --detach C:/Users/AMP/w-jur-pz2 67c2c280…` ec=0 (não existia antes: `ls` → No such file) · `test -e C:/Users/AMP/w-jur-pz2/.git` OK · `rev-parse HEAD` = 67c2c280… · porcelain = 0.
- $SCRATCH = `C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad`
- Ambiente: Git Bash (MINGW64_NT-10.0-22631, /bin/bash.exe); cwd por comando = `C:/Users/AMP/w-jur-pz2` (git -C); variáveis que defini: só locais por comando (EV, SCRATCH, H); `MSYS_NO_PATHCONV=1` SÓ como prefixo por comando, nunca exportada. Sem banco, sem Docker; base viva 5432/6379 nunca alvo. Não leio arquivos c1-*/c3-*/C1-*/C3-*.
- Resíduo alheio (R2) apenas reportado: `git worktree list` mostra 16 worktrees além do meu, inclusive `w-devs4` e `w-pl4f` (8dc14144) que não constavam da lista do inspetor — alheios, não tocados.

## Item 1 — o espelho [hora estimada, NÃO medida — ver correção no fim]

Insumos: blobs do head `67c2c280` e de `origin/main` (`5b6e1036`) extraídos por `MSYS_NO_PATHCONV=1 git -C C:/Users/AMP/w-jur-pz2 show <ref>:<caminho> > $SCRATCH/pz2/<nome>.<head|main>` (blobs LF: CR=0; cópia de trabalho do meu worktree CRLF).

### 1(a) hunks como multiconjunto
- comando: `git -C C:/Users/AMP/w-jur-pz2 diff -U0 origin/main 67c2c280 -- CLAUDE.md` e `-- AGENTS.md` (ec=0/0, 47 linhas cada) → `python $SCRATCH/pz2/hunks.py` (linhas `^[+-]` não `^[+-][+-]`, CR removido, `collections.Counter`).
- saída: CLAUDE 38 linhas (+33 −5) · AGENTS 38 linhas (+33 −5) · só-CLAUDE = 0 · só-AGENTS = 0 → **MULTICONJUNTO IGUAL**. Hunks: CLAUDE `-524,2 +524,4 · -529,2 +531,3 · -562,0 +566,21 · -570,0 +595,3 · -575 +602,2`; AGENTS os mesmos com offset +28 (`-552…`). Piso do mandato (diff dos dois filtros grep, cwd w-jur-pz2, HEAD) → `IDENTICAS`.
- vermelho-controle (irmão que sabidamente acusa): cópia do diff de AGENTS com 1º `P7`→`P8` (substituição provada: `diff -q` differ) → `MULTICONJUNTO DIFERENTE`; cópia com 1 linha `+linha so do Codex` a mais → `so AGENTS: 1`, `DIFERENTE`. O comparador acusa.
- linhas de um lado só: **0** (nenhuma FERRAMENTA, nenhuma REGRA COMUM assimétrica).
- veredito parcial 1(a): **VERDE**.

### 1(b) item 7 inteiro, borda provada
- comando: `python $SCRATCH/pz2/item7.py` (CR normalizado antes de buscar borda; início = `^7\. \*\*Protocolo de junta resiliente`; fim = linha anterior ao 1º `^---$` depois do início).
- saída (blob head): CLAUDE.md início casa **1×**, l.524–604, 81 linhas, CR=0, md5 cru = md5 EOL-neutro = `89888b2cfdd7f71c8938f9091b5de04f` · AGENTS.md início casa **1×**, l.552–632, 81 linhas, CR=0, md5 cru = EOL-neutro = `89888b2cfdd7f71c8938f9091b5de04f`. Linha seguinte ao bloco = `---` nos dois; última não vazia = `   registra o roteiro de retomada antes de encerrar (P7)**.` (a cauda "Do orquestrador … (P7)**." que o corpo pede alcançar). Cópia de trabalho CRLF (w-jur-pz2): CR=81 em cada bloco, md5 cru `433039729ad3aefc15bc923dd0eaf533` nos dois, EOL-neutro `89888b2c…` nos dois — cru≠blob só por EOL (não é vermelho; matéria da C3, e é a cópia de trabalho, não o blob).
- linhas da fábrica (~524–596 / ~552–624) estavam velhas: o bloco hoje termina em 604/632 (E2 acrescentou linhas) — re-verificado, não herdado.
- veredito parcial 1(b): **VERDE** (md5 EOL-neutro igual, borda provada pelo controle 3 abaixo).

### 1(c) modelo de mandato nos três
- comando: `python $SCRATCH/pz2/modelo.py` (bloco cercado por ``` após a linha com `Modelo de mandato`; indentação e CR removidos) + `diff` dois a dois.
- saída: CLAUDE l.588 (cerca 589–598) · AGENTS l.616 (cerca 617–626) · PROTOCOLO l.115 (cerca 117–126): **8 linhas** em cada, `[P7]` presente nos 3, md5 `6d5c8fa956f5eec1a96669abf9e936a1` nos 3; `diff` C×A ec=0, C×P ec=0, A×P ec=0 (vazios).
- veredito parcial 1(c): **VERDE**.

### Vermelho-controle do item 1 (em cópias, `python $SCRATCH/pz2/ctl1.py` e `ctl4.py`; substituição provada em cada)
1. 1º `P7`→`P8` dentro do item 7 da cópia do AGENTS → EOL-neutro `1db13a5c…` ≠ `89888b2c…` → **DIVERGE** ✔
2. item 7 da cópia do AGENTS convertido a CRLF (só EOL) → cru `433039729…` ≠ `89888b2c…` (**CRU DIVERGE**) e EOL-neutro `89888b2c…` (**EOL IGUAL**) ✔
3. borda: ` X` no fim da última linha não vazia antes de `---` (AGENTS l.631, `…encerrar (P7)**. X`) → **DIVERGE** ✔ — o extrator alcança a cauda.
4. apagada a linha `[P7]` do modelo numa cópia do PROTOCOLO (l.125) → modelo vira 7 linhas, `[P7]=False`; `diff modelo-CLAUDE × mutante` ec=1 (`8d7 < o arquivo. Não inicie item novo.  [P7]`) → **ACUSA** ✔
- cópias descartadas (`rm -f`).
- **veredito parcial ITEM 1: VERDE** — hunks simétricos com 0 linhas de um lado só; item 7 idêntico (EOL-neutro `89888b2cfdd7f71c8938f9091b5de04f`, 81 linhas, borda provada); modelo com [P7] idêntico nos três (8 linhas). Os 4 controles acusaram.

## Item 2 — lista PRÓPRIA de lugares vivos, cruzada com o plano [hora estimada, NÃO medida — ver correção no fim]

### 2(a) comando do briefing §5, como está (piso)
- comando: `git -C C:/Users/AMP/w-jur-pz2 grep -c -i -E '\[P[1-6]\]|P1[–-]P[36]|P1–P6|junta resiliente|JUNTA-RESILIENTE|modelo de mandato|evid[eê]ncia incremental|voto-arquivo|00-quedas|perda de jurado' 67c2c280 -- CLAUDE.md AGENTS.md 'docs/claude-code-handoff/*.md' .agents/agents .claude/agents .claude/skills .agents/skills scripts tests Kpis agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md agent-orchestration/docs/conhecimento-de-terreno.md` ec=0. Saída (N por caminho):
```
.agents/agents/README.md:1
.agents/agents/especialistas/jurado-pausa-c1-fidelidade-transcricao.md:9
.agents/agents/especialistas/jurado-pausa-c2-consistencia-normativa-espelho.md:29
.agents/agents/especialistas/jurado-pausa-c3-escopo-registro-kpi.md:6
.agents/agents/especialistas/jurado-semteto-c1-fidelidade-transcricao.md:4
.agents/agents/especialistas/jurado-semteto-c2-consistencia-normativa.md:4
.agents/agents/especialistas/jurado-semteto-c3-escopo-registro.md:4
.agents/agents/inspetor-de-terreno-da-junta.md:1
.claude/agents/especialistas/jurado-pausa-c1-fidelidade-transcricao.md:9
.claude/agents/especialistas/jurado-pausa-c2-consistencia-normativa-espelho.md:29
.claude/agents/especialistas/jurado-pausa-c3-escopo-registro-kpi.md:6
.claude/agents/especialistas/jurado-semteto-c1-fidelidade-transcricao.md:4
.claude/agents/especialistas/jurado-semteto-c2-consistencia-normativa.md:4
.claude/agents/especialistas/jurado-semteto-c3-escopo-registro.md:4
.claude/agents/inspetor-de-terreno-da-junta.md:1
AGENTS.md:14
CLAUDE.md:14
Kpis/app.js:1
Kpis/kpis-history.json:8
Kpis/kpis-history.md:2
Kpis/kpis-latest.json:5
agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:12
tests/financial-entry-link-census.test.ts:3
tests/financial-ledger-helper.test.ts:12
tests/insurance-policies-routes.test.ts:1
tests/insurance-policies.test.ts:1
tests/inventory-items-routes.test.ts:1
```
- + mesmo padrão em `EXECUTION_MODEL.md comando-template.md` (raiz; ambos existem no head): **0** (git grep ec=1) · `git grep -i -c 'pausa' 67c2c280 -- .claude/agents .claude/skills` → só os 3 corpos novos `jurado-pausa-c1/c2/c3` (36/31/33); 0 em gate, 0 em skill.
- observações: o README Codex agora casa 1 (o plano mediu 2 em c9eda7bb: a linha l.69 passou de `P1–P6` a `P1–P7` e só `00-quedas` casa); `conhecimento-de-terreno.md` casa 0 no padrão do briefing (só tem P7, não P1–P6); skills casam 0.

### 2(a') padrão PRÓPRIO, gerado pela propriedade, sobre a ÁRVORE INTEIRA do head (não só os caminhos do briefing)
- gerador: `python $SCRATCH/pz2/gerador.py <ref> <saida.json> [caminho=copia ...]` — lê `git ls-tree -r <ref>` e cada blob por `git show` (CR normalizado), regex Python Unicode (`re.I`), oito famílias:
```
A-nome = junta[- ]resiliente|JUNTA-RESILIENTE
B-faixa = \bP1\s*(?:[–—-]|\ba\b|até|ao|\.\.|…|/)\s*P?[1-7]\b
C-enum = \bP[1-7]\b(?:\s*(?:,|\be\b|/|·)\s*\bP[1-7]\b){2,}
D-conta = \b(?:seis|sete|6|7)\s+(?:normas|regras)\b
E-tag = \[P[1-7]\]
F-escopo = toda junta,\s*inspe|sobreviv\w*\s+(?:à|a)\s+morte
G-nomes = evid[eê]ncia incremental|voto-arquivo|voto-esqueleto|disparo escalonado|00-quedas|perda de jurado|registro padronizado de quedas|modelo de mandato
H-P7 = \bP7\b|\bPAUSA\b|pausa ordenada|D-PAUSA-GRAVA-E-PARA
```
  (H-P7 sensível a caixa: `PAUSA` maiúsculo e `P7` exato — `pausa` minúsculo é termo de produto e o 'pausa de ~15 min' do P5.) Classe por caminho, critério do plano §4 = corpo §2(b): VIVO = os 2 contratos, EXECUTION_MODEL/comando-template/PROJECT_MEMORY (raiz) e `docs/claude-code-handoff/*.md` (inclui a cópia `docs/claude-code-handoff/CLAUDE.md`, de 2026-07-13, que **não** carrega o protocolo: 1 casamento de 'junta', 0 de P-normas), corpos nos dois espelhos e o README Codex, PROTOCOLO, skills, scripts, tests, .github, `conhecimento-de-terreno.md`, templates; VIVO-inerte = corpos `jurado-semteto-*` (identidades que já votaram); REGISTRO = o resto (votos, atas, briefings, planos, decisoes, pendencias, status-geral, logs, Kpis). 'carrega o protocolo' = casamento de A/D/F/G, ou de B/C/E numa linha com contexto de junta (`junta|jurad|cadeira|evidência|voto|§C7.7|inspetor|porteiro|mandato|queda`). 'precisa e falta' = VIVO ∧ carrega ∧ sem P7.
- execução: `timeout 600 python gerador.py 67c2c280… ger-head.json` ec=0 → 312 arquivos com casamento. VIVO com casamento: 28 (+6 VIVO-inerte). Saída-resumo dos VIVO:
```
VIVO        N=6    proto=True  P1-P6|seis=False P7=True  FALTA_P7=False .agents/agents/README.md {'B-faixa': 1, 'H-P7': 4, 'G-nomes': 1}
VIVO        N=48   proto=True  P1-P6|seis=False P7=True  FALTA_P7=False .agents/agents/especialistas/jurado-pausa-c1-fidelidade-transcricao.md {'H-P7': 35, 'A-nome': 2, 'E-tag
VIVO        N=127  proto=True  P1-P6|seis=True  P7=True  FALTA_P7=False .agents/agents/especialistas/jurado-pausa-c2-consistencia-normativa-espelho.md {'A-nome': 8, 'B-faixa':
VIVO        N=33   proto=True  P1-P6|seis=False P7=True  FALTA_P7=False .agents/agents/especialistas/jurado-pausa-c3-escopo-registro-kpi.md {'H-P7': 25, 'E-tag': 7, 'G-nomes':
VIVO        N=1    proto=True  P1-P6|seis=False P7=False FALTA_P7=True  .agents/agents/inspetor-de-terreno-da-junta.md {'G-nomes': 1}
VIVO        N=48   proto=True  P1-P6|seis=False P7=True  FALTA_P7=False .claude/agents/especialistas/jurado-pausa-c1-fidelidade-transcricao.md {'H-P7': 35, 'A-nome': 2, 'E-tag
VIVO        N=127  proto=True  P1-P6|seis=True  P7=True  FALTA_P7=False .claude/agents/especialistas/jurado-pausa-c2-consistencia-normativa-espelho.md {'A-nome': 8, 'B-faixa':
VIVO        N=33   proto=True  P1-P6|seis=False P7=True  FALTA_P7=False .claude/agents/especialistas/jurado-pausa-c3-escopo-registro-kpi.md {'H-P7': 25, 'E-tag': 7, 'G-nomes':
VIVO        N=1    proto=True  P1-P6|seis=False P7=False FALTA_P7=True  .claude/agents/inspetor-de-terreno-da-junta.md {'G-nomes': 1}
VIVO        N=44   proto=True  P1-P6|seis=True  P7=True  FALTA_P7=False AGENTS.md {'G-nomes': 10, 'A-nome': 3, 'H-P7': 19, 'B-faixa': 4, 'D-conta': 1, 'F-escopo': 2, 'E-tag': 
VIVO        N=44   proto=True  P1-P6|seis=True  P7=True  FALTA_P7=False CLAUDE.md {'G-nomes': 10, 'A-nome': 3, 'H-P7': 19, 'B-faixa': 4, 'D-conta': 1, 'F-escopo': 2, 'E-tag': 
VIVO        N=4    proto=False P1-P6|seis=False P7=True  FALTA_P7=False agent-orchestration/docs/conhecimento-de-terreno.md {'H-P7': 4}
VIVO        N=45   proto=True  P1-P6|seis=True  P7=True  FALTA_P7=False agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md {'A-nome': 2, 'H-P7': 19, 'B-faixa': 6, 
VIVO        N=2    proto=True  P1-P6|seis=False P7=False FALTA_P7=True  scripts/audit-agents-skills.mjs {'B-faixa': 2}
VIVO        N=3    proto=False P1-P6|seis=False P7=False FALTA_P7=False tests/financial-entry-link-census.test.ts {'E-tag': 3}
VIVO        N=12   proto=False P1-P6|seis=False P7=False FALTA_P7=False tests/financial-ledger-helper.test.ts {'E-tag': 12}
VIVO        N=25   proto=False P1-P6|seis=False P7=True  FALTA_P7=False tests/financial-uow-journal-classification.test.ts {'H-P7': 21, 'E-tag': 4}
VIVO        N=1    proto=False P1-P6|seis=False P7=False FALTA_P7=False tests/insurance-policies-routes.test.ts {'E-tag': 1}
VIVO        N=1    proto=False P1-P6|seis=False P7=False FALTA_P7=False tests/insurance-policies.test.ts {'E-tag': 1}
VIVO        N=1    proto=False P1-P6|seis=False P7=False FALTA_P7=False tests/inventory-items-routes.test.ts {'E-tag': 1}
VIVO        N=1    proto=False P1-P6|seis=False P7=False FALTA_P7=False tests/san3-04a-matriz-x-catalogo-guard.test.ts {'B-faixa': 1}
VIVO        N=2    proto=False P1-P6|seis=False P7=False FALTA_P7=False tests/san3-04a-menu-front-x-catalogo.test.ts {'B-faixa': 2}
VIVO-inerte N=6    proto=True  P1-P6|seis=False P7=False FALTA_P7=False .agents/agents/especialistas/jurado-semteto-c1-fidelidade-transcricao.md {'B-faixa': 1, 'E-tag': 4, 'G-
VIVO-inerte N=6    proto=True  P1-P6|seis=False P7=False FALTA_P7=False .agents/agents/especialistas/jurado-semteto-c2-consistencia-normativa.md {'G-nomes': 1, 'B-faixa': 1, '
VIVO-inerte N=6    proto=True  P1-P6|seis=False P7=False FALTA_P7=False .agents/agents/especialistas/jurado-semteto-c3-escopo-registro.md {'G-nomes': 1, 'B-faixa': 1, 'E-tag':
VIVO-inerte N=6    proto=True  P1-P6|seis=False P7=False FALTA_P7=False .claude/agents/especialistas/jurado-semteto-c1-fidelidade-transcricao.md {'B-faixa': 1, 'E-tag': 4, 'G-
VIVO-inerte N=6    proto=True  P1-P6|seis=False P7=False FALTA_P7=False .claude/agents/especialistas/jurado-semteto-c2-consistencia-normativa.md {'G-nomes': 1, 'B-faixa': 1, '
VIVO-inerte N=6    proto=True  P1-P6|seis=False P7=False FALTA_P7=False .claude/agents/especialistas/jurado-semteto-c3-escopo-registro.md {'G-nomes': 1, 'B-faixa': 1, 'E-tag':
```
- 'FALTA_P7=True' em 3 arquivos, julgados um a um (o gerador marca, o juízo é meu, pela frase):
  - `.claude/agents/inspetor-de-terreno-da-junta.md:145` e espelho `.agents/…:151` — '5.1 **Plano de perda de jurado declarado**' (requisito do §C7.1-bis, não o conjunto P1–P6; nenhum outro casamento no corpo). **Não carrega P1–P6** → P7 não é exigível (cobrar seria reprovação por construção, corpo §'Reprovação por CONSTRUÇÃO'). Coincide com o plano §4 ("não precisa") e S-13.
  - `scripts/audit-agents-skills.mjs:162,512` — cita '§C7.7 **P1/P2**' nominalmente para justificar a tolerância a `Bash` (o jurado grava evidência e voto). Subconjunto **verdadeiro**, não total; P7 grava no mesmo arquivo pelo mesmo `Bash` → a propriedade auditada não muda. **Lugar meu que o plano não listou** (o padrão do plano, `P1[–-]P[36]`, não vê `P1/P2`); classificação: VIVO, nominal, não precisa de P7.
- falsos positivos: 8 `tests/*.ts` (rótulos `[P5]`/`[P6]`/`P7` do arnês financeiro, `P1/P2` de itens do plano SAN3) e 5 arquivos de código (`frontend/src/layouts/appSidebarNav.ts`, `frontend/tests/san3-04a-sidebar-…`, `frontend/tests/work-orders-honest-errors.test.tsx` [P1]/[P2]/[P3] de estados de tela, `src/modules/core-saas/permissions/catalog.ts`, `src/modules/financial-uow/financial-uow.ts` 'P7' do ciclo 3 do B-O6R-02) — domínio, não protocolo. `agent-orchestration/omega/plano-mestre.md:5` 'padrões P1–P6' (2026-07-13, `361f2c18`) é anterior a `D-JUNTA-RESILIENTE` (2026-08-29) — outra coisa, e REGISTRO.
- veredito parcial 2(a): **VERDE** — população gerada; nenhum lugar VIVO que carrega P1–P6 ficou sem P7.

### 2(b) tabela de ocorrências VIVAS (gerada de `ger-head.json`)

| arquivo:linha | padrão (gerador C2) | classe | carrega P1–P6? | P7 chegou? | precisa? | por quê |
|---|---|---|---|---|---|---|
| `CLAUDE.md:402` | G-nomes:`perda de jurado` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:524` | A-nome:`junta resiliente` A-nome:`JUNTA-RESILIENTE` H-P7:`P7` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:525` | B-faixa:`P1–P7` H-P7:`D-PAUSA-GRAVA-E-PARA` H-P7:`P7` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:526` | D-conta:`sete normas` F-escopo:`Toda junta, inspe` H-P7:`P7` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:527` | B-faixa:`P1–P6` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:530` | A-nome:`JUNTA-RESILIENTE` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:531` | B-faixa:`P1–P6` F-escopo:`sobrevive à morte` H-P7:`pausa ordenada` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:532` | H-P7:`P7` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:535` | G-nomes:`Evidência incremental` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:540` | G-nomes:`Voto-arquivo` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:543` | G-nomes:`voto-esqueleto` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:548` | G-nomes:`Perda de jurado` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:559` | G-nomes:`Disparo escalonado` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:562` | G-nomes:`Registro padronizado de quedas` G-nomes:`00-quedas` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:566` | H-P7:`P7` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:567` | H-P7:`D-PAUSA-GRAVA-E-PARA` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:570` | H-P7:`PAUSA` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:571` | H-P7:`PAUSA` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:577` | H-P7:`PAUSA` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:580` | H-P7:`PAUSA` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:584` | H-P7:`P7` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:585` | B-faixa:`P1/P2` H-P7:`P7` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:588` | G-nomes:`Modelo de mandato` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:590` | E-tag:`[P1]` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:591` | E-tag:`[P2]` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:592` | E-tag:`[P4]` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:594` | E-tag:`[P3]` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:595` | H-P7:`PAUSA` H-P7:`PAUSA` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:597` | E-tag:`[P7]` H-P7:`P7` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:600` | G-nomes:`00-quedas` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:602` | H-P7:`PAUSA` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `CLAUDE.md:603` | H-P7:`P7` | VIVO | sim | sim | — | contrato; item 7 (P1–P7) |
| `AGENTS.md:430` | G-nomes:`perda de jurado` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:552` | A-nome:`junta resiliente` A-nome:`JUNTA-RESILIENTE` H-P7:`P7` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:553` | B-faixa:`P1–P7` H-P7:`D-PAUSA-GRAVA-E-PARA` H-P7:`P7` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:554` | D-conta:`sete normas` F-escopo:`Toda junta, inspe` H-P7:`P7` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:555` | B-faixa:`P1–P6` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:558` | A-nome:`JUNTA-RESILIENTE` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:559` | B-faixa:`P1–P6` F-escopo:`sobrevive à morte` H-P7:`pausa ordenada` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:560` | H-P7:`P7` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:563` | G-nomes:`Evidência incremental` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:568` | G-nomes:`Voto-arquivo` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:571` | G-nomes:`voto-esqueleto` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:576` | G-nomes:`Perda de jurado` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:587` | G-nomes:`Disparo escalonado` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:590` | G-nomes:`Registro padronizado de quedas` G-nomes:`00-quedas` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:594` | H-P7:`P7` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:595` | H-P7:`D-PAUSA-GRAVA-E-PARA` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:598` | H-P7:`PAUSA` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:599` | H-P7:`PAUSA` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:605` | H-P7:`PAUSA` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:608` | H-P7:`PAUSA` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:612` | H-P7:`P7` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:613` | B-faixa:`P1/P2` H-P7:`P7` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:616` | G-nomes:`Modelo de mandato` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:618` | E-tag:`[P1]` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:619` | E-tag:`[P2]` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:620` | E-tag:`[P4]` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:622` | E-tag:`[P3]` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:623` | H-P7:`PAUSA` H-P7:`PAUSA` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:625` | E-tag:`[P7]` H-P7:`P7` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:628` | G-nomes:`00-quedas` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:630` | H-P7:`PAUSA` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `AGENTS.md:631` | H-P7:`P7` | VIVO | sim | sim | — | espelho Codex; item 7 idêntico (md5) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:1` | A-nome:`JUNTA RESILIENTE` A-nome:`JUNTA-RESILIENTE` H-P7:`P7` H-P7:`D-PAUSA-GRAVA-E-PARA` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:3` | B-faixa:`P1–P7` F-escopo:`TODA junta, inspe` H-P7:`P7` H-P7:`P7` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:4` | B-faixa:`P1–P6` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:5` | H-P7:`P7` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:8` | F-escopo:`sobrevive à morte` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:9` | B-faixa:`P1–P6` H-P7:`pausa ordenada` H-P7:`P7` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:11` | G-nomes:`Evidência incremental` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:26` | G-nomes:`Voto-arquivo` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:35` | G-nomes:`perda de jurado` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:61` | G-nomes:`Disparo escalonado` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:71` | G-nomes:`Registro padronizado de quedas` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:73` | G-nomes:`00-quedas` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:82` | H-P7:`P7` H-P7:`D-PAUSA-GRAVA-E-PARA` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:91` | H-P7:`PAUSA` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:95` | H-P7:`PAUSA` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:97` | H-P7:`PAUSA` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:102` | H-P7:`PAUSA` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:112` | B-faixa:`P1/P2` H-P7:`P7` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:113` | B-faixa:`P1/P2` G-nomes:`evidência incremental` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:115` | G-nomes:`Modelo de mandato` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:118` | E-tag:`[P1]` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:119` | E-tag:`[P2]` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:120` | E-tag:`[P4]` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:122` | E-tag:`[P3]` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:123` | H-P7:`PAUSA` H-P7:`PAUSA` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:125` | E-tag:`[P7]` H-P7:`P7` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:132` | G-nomes:`00-quedas` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:133` | H-P7:`PAUSA` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:134` | H-P7:`P7` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:138` | G-nomes:`voto-esqueleto` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:142` | B-faixa:`P1/P2` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:144` | G-nomes:`voto-esqueleto` | VIVO | sim | sim | — | a fonte (§C7.7) |
| `.agents/agents/README.md:69` | B-faixa:`P1–P7` H-P7:`P7` | VIVO | sim | sim | — | protocolo de emulação Codex |
| `.agents/agents/README.md:72` | G-nomes:`00-quedas` | VIVO | sim | sim | — | protocolo de emulação Codex |
| `.agents/agents/README.md:73` | H-P7:`P7` H-P7:`D-PAUSA-GRAVA-E-PARA` | VIVO | sim | sim | — | protocolo de emulação Codex |
| `.agents/agents/README.md:74` | H-P7:`PAUSA` | VIVO | sim | sim | — | protocolo de emulação Codex |
| `agent-orchestration/docs/conhecimento-de-terreno.md:91` | H-P7:`P7` H-P7:`D-PAUSA-GRAVA-E-PARA` | VIVO | não | sim | — | lição de terreno; só P7, não carrega P1–P6 |
| `agent-orchestration/docs/conhecimento-de-terreno.md:92` | H-P7:`PAUSA` H-P7:`PAUSA` | VIVO | não | sim | — | lição de terreno; só P7, não carrega P1–P6 |
| `.claude/agents/inspetor-de-terreno-da-junta.md:145` | G-nomes:`perda de jurado` | VIVO | não (conceito/nominal) | não | não | 5.1 "plano de perda de jurado" (§C7.1-bis), não o conjunto P1–P6 |
| `.agents/agents/inspetor-de-terreno-da-junta.md:151` | G-nomes:`perda de jurado` | VIVO | não (conceito/nominal) | não | não | espelho do inspetor; idem |
| `scripts/audit-agents-skills.mjs:162` | B-faixa:`P1/P2` | VIVO | não (conceito/nominal) | não | não | cita "§C7.7 P1/P2" nominalmente p/ justificar Bash; subconjunto verdadeiro, não total |
| `scripts/audit-agents-skills.mjs:512` | B-faixa:`P1/P2` | VIVO | não (conceito/nominal) | não | não | cita "§C7.7 P1/P2" nominalmente p/ justificar Bash; subconjunto verdadeiro, não total |

Corpos (resumo por arquivo; ocorrências completas em `$SCRATCH/pz2/ger-head.json`):

| arquivo | classe | N | carrega o protocolo? | P7 chegou? | precisa? | por quê |
|---|---|---|---|---|---|---|
| `.agents/agents/especialistas/jurado-pausa-c1-fidelidade-transcricao.md` | VIVO | 48 | sim | sim | — | corpo novo deste bloco (cadeira desta junta); modelo com [P7] |
| `.agents/agents/especialistas/jurado-pausa-c2-consistencia-normativa-espelho.md` | VIVO | 127 | sim | sim | — | corpo novo deste bloco (cadeira desta junta); modelo com [P7] |
| `.agents/agents/especialistas/jurado-pausa-c3-escopo-registro-kpi.md` | VIVO | 33 | sim | sim | — | corpo novo deste bloco (cadeira desta junta); modelo com [P7] |
| `.agents/agents/especialistas/jurado-semteto-c1-fidelidade-transcricao.md` | VIVO-inerte | 6 | sim | não | não (inerte) | identidade que JÁ VOTOU (#394, J-B-GOV-SEM-TETO.md:21–23); modelo P1–P4 embutido; inerte (plano §4); OBITUARIO = P-GOV-OBITUARIO-SEMTETO (pré-existente) |
| `.agents/agents/especialistas/jurado-semteto-c2-consistencia-normativa.md` | VIVO-inerte | 6 | sim | não | não (inerte) | identidade que JÁ VOTOU (#394, J-B-GOV-SEM-TETO.md:21–23); modelo P1–P4 embutido; inerte (plano §4); OBITUARIO = P-GOV-OBITUARIO-SEMTETO (pré-existente) |
| `.agents/agents/especialistas/jurado-semteto-c3-escopo-registro.md` | VIVO-inerte | 6 | sim | não | não (inerte) | identidade que JÁ VOTOU (#394, J-B-GOV-SEM-TETO.md:21–23); modelo P1–P4 embutido; inerte (plano §4); OBITUARIO = P-GOV-OBITUARIO-SEMTETO (pré-existente) |
| `.claude/agents/especialistas/jurado-pausa-c1-fidelidade-transcricao.md` | VIVO | 48 | sim | sim | — | corpo novo deste bloco (cadeira desta junta); modelo com [P7] |
| `.claude/agents/especialistas/jurado-pausa-c2-consistencia-normativa-espelho.md` | VIVO | 127 | sim | sim | — | corpo novo deste bloco (cadeira desta junta); modelo com [P7] |
| `.claude/agents/especialistas/jurado-pausa-c3-escopo-registro-kpi.md` | VIVO | 33 | sim | sim | — | corpo novo deste bloco (cadeira desta junta); modelo com [P7] |
| `.claude/agents/especialistas/jurado-semteto-c1-fidelidade-transcricao.md` | VIVO-inerte | 6 | sim | não | não (inerte) | identidade que JÁ VOTOU (#394, J-B-GOV-SEM-TETO.md:21–23); modelo P1–P4 embutido; inerte (plano §4); OBITUARIO = P-GOV-OBITUARIO-SEMTETO (pré-existente) |
| `.claude/agents/especialistas/jurado-semteto-c2-consistencia-normativa.md` | VIVO-inerte | 6 | sim | não | não (inerte) | identidade que JÁ VOTOU (#394, J-B-GOV-SEM-TETO.md:21–23); modelo P1–P4 embutido; inerte (plano §4); OBITUARIO = P-GOV-OBITUARIO-SEMTETO (pré-existente) |
| `.claude/agents/especialistas/jurado-semteto-c3-escopo-registro.md` | VIVO-inerte | 6 | sim | não | não (inerte) | identidade que JÁ VOTOU (#394, J-B-GOV-SEM-TETO.md:21–23); modelo P1–P4 embutido; inerte (plano §4); OBITUARIO = P-GOV-OBITUARIO-SEMTETO (pré-existente) |

Falsos positivos VIVO (tests/, rótulos de domínio — `[P5]`/`[P6]`/`P7` de harness financeiro, `P1/P2` de itens de plano; `carrega_protocolo=False` pelo discriminador de contexto): `tests/financial-entry-link-census.test.ts` (N=3), `tests/financial-ledger-helper.test.ts` (N=12), `tests/financial-uow-journal-classification.test.ts` (N=25), `tests/insurance-policies-routes.test.ts` (N=1), `tests/insurance-policies.test.ts` (N=1), `tests/inventory-items-routes.test.ts` (N=1), `tests/san3-04a-matriz-x-catalogo-guard.test.ts` (N=1), `tests/san3-04a-menu-front-x-catalogo.test.ts` (N=2)

REGISTRO: 284 arquivos (votos/, J-*, BRIEFING-*, planos/, revisoes/, decisoes.md, pendencias.md, status-geral.md, log-execucao.md, codex/comandos/, POSTMORTEM, Kpis/* notas/FROZEN, plano-mestre.md de 2026-07-13 — "padrões P1–P6" ali é anterior a D-JUNTA-RESILIENTE de 2026-08-29, outra coisa).

(`CLAUDE.md:402` = §C7.1-bis "plano de perda de jurado declarado" — requisito do inspetor, não o conjunto; coerente com S-13.)

### 2(c) cruzamento com o plano §4 e S-01…S-14 — nos dois sentidos

**S-01 (P1–P6/"seis" como total).**
- **Achado de instrumento (forma 1 da classe "grep que só conhece uma grafia"):** o comando do corpo/briefing `grep -n -E 'P1[–-]P6|seis normas'` rodado no Git Bash desta máquina (LANG vazio) devolve **0 linhas** em `CLAUDE.md` do head — e também **0** em `origin/main`, onde `P1–P6, inline` existe em l.524 (`grep -F` acha). Com `LC_ALL=C.UTF-8` o mesmo comando acha l.527 e l.531 (head) e l.524 (main). Vazio pelos dois motivos opostos: o colchete `[–-]` é lido byte a byte sem locale UTF-8. **Não usei esse vazio como prova**; medi com Python Unicode (`$SCRATCH/pz2/s01.py`) e com `LC_ALL=C.UTF-8`. `git grep -E` também é cego ao colchete; `git grep -P` não (provado: casa l.524 da main).
- medida (`python s01.py` nos blobs do head, padrão `P1\s*[–—-]\s*P[1-7]|P1 a P[1-7]|P1\.\.P[1-7]|(seis|sete|6|7) normas|toda junta, inspe|sobreviv[ea] (à|a) morte`, `re.I`): CLAUDE l.525 `P1–P7, inline` (total = sete ✔) · l.526 `seguem as sete normas abaixo` (✔) · l.527 `Origem medida de P1–P6` (subconjunto: a origem das seis primeiras — verdadeiro) · l.531 `sobrevive à morte de quem o fez (P1–P6) e à pausa ordenada pelo dono (P7…)` (subconjunto, verdadeiro); AGENTS l.553/554/555/559 idênticas; PROTOCOLO l.3 `(P1–P7)` ✔, l.4 `P1–P6 nascem do postmortem` (subconjunto), l.8–9 idem l.531; README l.69 `P1–P7` ✔. **Nenhuma frase viva apresenta P1–P6 ou "seis" como o total.** S-01 do plano **não se confirma no head** (resolvido pela E2 — o plano mediu `c9eda7bb`).

**S-02 (escopo declarado × sujeitos de P7).** CLAUDE/AGENTS l.526/554: "Toda junta, inspeção de terreno e porteiro seguem as sete normas abaixo; a **P7** alcança, além deles, **todo agente vivo** — dev, planejador, fábrica — e o orquestrador"; l.531/559 "sobrevive à morte … (P1–P6) **e à pausa ordenada pelo dono** (P7, que não é morte)"; PROTOCOLO l.3–5 e l.8–9 dizem o mesmo. Sujeitos de P7 no bullet (cada agente vivo; quem não tem evidência: dev, planejador, fábrica; orquestrador) ⊆ escopo declarado. "Vigias" aparecem como **objeto** da ação do orquestrador ("para os vigias"), não como sujeito que grava — fora do escopo de sujeito, sem contradição. **Propriedade satisfeita**; S-02 não se confirma no head.

**S-03 (README Codex).** `grep -c 'P7' .agents/agents/README.md`: head = **2** linhas (main = 0). l.69 `Resiliência de junta (P1–P7 — §C7.7 do AGENTS.md, inline)`; l.73–76: "todo agente vivo termina o comando em curso, grava `## PAUSA <hora UTC>` (head · feito · falta · próximo comando · meio-escritos) no seu arquivo de evidência — quem não tem um, no arquivo de saída que o mandato nomeia — e para sozinho com 1 linha, sem iniciar item novo; a retomada é pela mesma identidade, do mesmo mandato. Pausa não é morte nem parada." → grava a seção ✔, para sozinho ✔, retomada pela mesma identidade ✔. Diferença de grau (é resumo): omite "o orquestrador nomeia um no disparo se o mandato não o fizer" e os deveres do orquestrador — o README já resumia P1–P6 sem P3/P6 por extenso e remete ao §C7.7 do AGENTS.md inline (idêntico ao CLAUDE, item 1). Não é regra comum divergente; no máximo `nota`. S-03 **não se confirma no head**.

**Diferença de conjunto — lugar meu que o plano não listou:** (i) `scripts/audit-agents-skills.mjs:162,512` (cita §C7.7 P1/P2 — nominal e verdadeiro, não precisa de P7; o padrão do plano não vê `P1/P2`); (ii) os 6 corpos `jurado-pausa-*` (não existiam em `c9eda7bb`; carregam `[P7]` no modelo — conferido no meu, l.141–152); (iii) `CLAUDE.md:402`/`AGENTS` §C7.1-bis "plano de perda de jurado" (plano trata no S-13); (iv) `docs/claude-code-handoff/CLAUDE.md` (cópia de 2026-07-13, não carrega o protocolo — 0 normas P). Nenhum deles é defeito.
**S-* do plano que a minha lista não confirma:** S-01, S-02, S-03 — **resolvidos no head** (E2). O resto da tabela §4 do plano confere: gates 0, EXECUTION_MODEL/comando-template 0, `pausa` só nos 3 corpos novos, semteto inertes, Kpis/tests registro/falso positivo. (O falso positivo "skills ts-frontend-full 'resiliente'" do plano não aparece no meu gerador, que exige "junta resiliente".)

### Controles de recall e de discriminação (item 2)
- **R1/R2/R3** — `python gerador.py origin/main ger-main.json` ec=0: R1 `CLAUDE.md:524` `P1–P6` (B-faixa) + `junta resiliente` ✔ · R2 `.agents/agents/README.md:69` `P1–P6` ✔ · R3 `PROTOCOLO:3` `TODA junta, inspe` (F-escopo) ✔. Na main o gerador marca CLAUDE/AGENTS/PROTOCOLO/README como "carrega P1–P6, P7=False" — o estado anterior que o bloco tinha de mudar; no head os quatro têm P7=True. Gerador **não** é cego.
- **Mutação VIVO** — cópia do `validador-mestre.md` do head + `Siga as normas P1-P6 da junta resiliente.` (hífen comum), substituição provada (`diff -q` differ), `gerador.py … .claude/agents/validador-mestre.md=<copia>` → `VIVO N=2 proto=True P1-P6|seis=True P7=False FALTA_P7=True` (l.104: A-nome `junta resiliente`, B-faixa `P1-P6`) ✔ pega e classifica VIVA, carrega P1–P6, sem P7.
- **Mutação REGISTRO** — cópia de `decisoes.md` + `- 2026-08-30 — registrado: a junta adotou as normas P1–P6 da junta resiliente naquela data.` → mesma execução: `decisoes.md` `REGISTRO … FALTA_P7=False`, l.2909 capturada (A-nome, B-faixa) ✔. As duas saem em classes diferentes: o critério discrimina.
- cópias e o json mutante descartados.
- **veredito parcial ITEM 2: VERDE** — dos 4 lugares vivos que carregam o protocolo (CLAUDE, AGENTS, PROTOCOLO, README Codex) os 4 têm P7; nenhuma frase viva conta P1–P6/"seis" como total; o escopo declarado cobre os sujeitos de P7; os lugares a mais da minha lista não carregam P1–P6 como conjunto. Recall R1–R3 encontrados; as duas mutações saíram em classes opostas. Nota de instrumento registrada (grep com colchete `[–-]` cego sem locale UTF-8).

## Item 3 — mecanismo e vocabulário [hora estimada, NÃO medida — ver correção no fim]

### 3(a) sujeitos de P7 e destino da seção `## PAUSA` — gerados do texto por regra publicada
- gerador: `python $SCRATCH/pz2/sujeitos.py 67c2c280… CLAUDE=… AGENTS=… PROTOCOLO=… README=… TERRENO=… DECISOES=…` (blobs do head). Regras: **trechos** = bullet `- **P7 —` até `**Modelo de mandato` + parágrafo `**Do orquestrador` (contratos); `## P7` até `## Modelo de mandato` + `## O que o orquestrador faz` (PROTOCOLO); bloco `Sob ordem de pausa do dono` (README); bullet `- **Pausa ordenada` (terreno); entrada `## D-PAUSA-GRAVA-E-PARA` inteira (decisoes, REGISTRO). **Sujeitos** = vocabulário fixo casado no trecho: `(cada|todo) agente vivo · orquestrador · <cadeira>|jurado|cadeira · inspetor · porteiro · dev · planejador · fábrica · vigias · jobs sem modelo`. **Destino do agente** = tokens de arquivo em crase na cláusula `grava … ## PAUSA … para sozinho` (a última 'grava' antes de '## PAUSA'), sem a lista '(head · …)'; token sem '/' é resolvido pelo caminho completo no mesmo arquivo (P1: `agent-orchestration/omega/juntas/votos/<JUNTA>/<cadeira>-evidencia.md`); 'quem não tem um — X —' + 'arquivo de saída que o mandato nomeia' + 'orquestrador nomeia um no disparo' = convenção em texto vivo com fallback. **Roteiro do orquestrador** = caminho em crase na frase 'roteiro de retomada'. **Existe** = `git cat-file -e 67c2c280:<prefixo antes do 1º '<'>`.
- saída (ec=0):
```
CLAUDE    | agente vivo     | l.569   | `<cadeira>-evidencia.md` | existe: [(('agent-orchestration/omega/juntas/votos', True), 'agent-orchestration/omega/juntas/votos/<JUNTA>/<cadeira>-evidencia.md')]
CLAUDE    | orquestrador    | l.569   | roteiro: `agent-orchestration/docs/status-geral.md` | existe: ('agent-orchestration/docs/status-geral.md', True)
CLAUDE    | cadeira/jurado  | l.571   | `<cadeira>-evidencia.md` | existe: [(('agent-orchestration/omega/juntas/votos', True), 'agent-orchestration/omega/juntas/votos/<JUNTA>/<cadeira>-evidencia.md')]
CLAUDE    | dev             | l.572   | arquivo de saída que o mandato nomeia (convenção) + fallback: orquestrador nomeia no disparo | existe: ('convenção', True)
CLAUDE    | planejador      | l.572   | arquivo de saída que o mandato nomeia (convenção) + fallback: orquestrador nomeia no disparo | existe: ('convenção', True)
CLAUDE    | fábrica         | l.572   | arquivo de saída que o mandato nomeia (convenção) + fallback: orquestrador nomeia no disparo | existe: ('convenção', True)
CLAUDE    | vigias          | l.576   | objeto ("para os vigias") — não grava | existe: None
CLAUDE    | jobs sem modelo | l.578   | "não são alvo" — não grava | existe: None
CLAUDE    | agente vivo     | l.602   | AUSENTE | existe: None
CLAUDE    | orquestrador    | l.599   | roteiro: roteiro de retomada antes de encerrar (P7)** | existe: None
CLAUDE    | vigias          | l.602   | objeto ("para os vigias") — não grava | existe: None
AGENTS    | agente vivo     | l.597   | `<cadeira>-evidencia.md` | existe: [(('agent-orchestration/omega/juntas/votos', True), 'agent-orchestration/omega/juntas/votos/<JUNTA>/<cadeira>-evidencia.md')]
AGENTS    | orquestrador    | l.597   | roteiro: `agent-orchestration/docs/status-geral.md` | existe: ('agent-orchestration/docs/status-geral.md', True)
AGENTS    | cadeira/jurado  | l.599   | `<cadeira>-evidencia.md` | existe: [(('agent-orchestration/omega/juntas/votos', True), 'agent-orchestration/omega/juntas/votos/<JUNTA>/<cadeira>-evidencia.md')]
AGENTS    | dev             | l.600   | arquivo de saída que o mandato nomeia (convenção) + fallback: orquestrador nomeia no disparo | existe: ('convenção', True)
AGENTS    | planejador      | l.600   | arquivo de saída que o mandato nomeia (convenção) + fallback: orquestrador nomeia no disparo | existe: ('convenção', True)
AGENTS    | fábrica         | l.600   | arquivo de saída que o mandato nomeia (convenção) + fallback: orquestrador nomeia no disparo | existe: ('convenção', True)
AGENTS    | vigias          | l.604   | objeto ("para os vigias") — não grava | existe: None
AGENTS    | jobs sem modelo | l.606   | "não são alvo" — não grava | existe: None
AGENTS    | agente vivo     | l.630   | AUSENTE | existe: None
AGENTS    | orquestrador    | l.627   | roteiro: roteiro de retomada antes de encerrar (P7)** | existe: None
AGENTS    | vigias          | l.630   | objeto ("para os vigias") — não grava | existe: None
PROTOCOLO | agente vivo     | l.95    | `<cadeira>-evidencia.md` | existe: [(('agent-orchestration/omega/juntas/votos', True), 'agent-orchestration/omega/juntas/votos/<JUNTA>/<cadeira>-evidencia.md')]
PROTOCOLO | orquestrador    | l.90    | roteiro: `agent-orchestration/docs/status-geral.md` | existe: ('agent-orchestration/docs/status-geral.md', True)
PROTOCOLO | cadeira/jurado  | l.89    | `<cadeira>-evidencia.md` | existe: [(('agent-orchestration/omega/juntas/votos', True), 'agent-orchestration/omega/juntas/votos/<JUNTA>/<cadeira>-evidencia.md')]
PROTOCOLO | dev             | l.89    | arquivo de saída que o mandato nomeia (convenção) + fallback: orquestrador nomeia no disparo | existe: ('convenção', True)
PROTOCOLO | planejador      | l.89    | arquivo de saída que o mandato nomeia (convenção) + fallback: orquestrador nomeia no disparo | existe: ('convenção', True)
PROTOCOLO | fábrica         | l.89    | arquivo de saída que o mandato nomeia (convenção) + fallback: orquestrador nomeia no disparo | existe: ('convenção', True)
PROTOCOLO | vigias          | l.96    | objeto ("para os vigias") — não grava | existe: None
PROTOCOLO | jobs sem modelo | l.99    | "não são alvo" — não grava | existe: None
PROTOCOLO | agente vivo     | l.133   | AUSENTE | existe: None
PROTOCOLO | orquestrador    | l.128   | roteiro: roteiro de retomada antes de encerrar (P7) | existe: None
PROTOCOLO | vigias          | l.133   | objeto ("para os vigias") — não grava | existe: None
PROTOCOLO | jobs sem modelo | l.134   | "não são alvo" — não grava | existe: None
README    | agente vivo     | l.73    | "arquivo de evidência" sem caminho no trecho -> convenção P1 (votos/<JUNTA>/<cadeira>-evidencia.md) | existe: ('convenção-P1', ('agent-orchestration/omega/juntas/votos', True))
TERRENO   | agente vivo     | l.92    | "arquivo de evidência" sem caminho no trecho -> convenção P1 (votos/<JUNTA>/<cadeira>-evidencia.md) | existe: ('convenção-P1', ('agent-orchestration/omega/juntas/votos', True))
TERRENO   | orquestrador    | l.92    | roteiro: AUSENTE | existe: None
TERRENO   | vigias          | l.96    | objeto ("para os vigias") — não grava | existe: None
TERRENO   | jobs sem modelo | l.94    | "não são alvo" — não grava | existe: None
DECISOES  | agente vivo     | l.2832  | "arquivo de evidência" sem caminho no trecho -> convenção P1 (votos/<JUNTA>/<cadeira>-evidencia.md) | existe: ('convenção-P1', ('agent-orchestration/omega/juntas/votos', True))
DECISOES  | orquestrador    | l.2833  | roteiro: roteiro de retomada antes de encerrar o turno | existe: None
DECISOES  | cadeira/jurado  | l.2859  | "arquivo de evidência" sem caminho no trecho -> convenção P1 (votos/<JUNTA>/<cadeira>-evidencia.md) | existe: ('convenção-P1', ('agent-orchestration/omega/juntas/votos', True))
DECISOES  | inspetor        | l.2876  | "arquivo de evidência" sem caminho no trecho -> convenção P1 (votos/<JUNTA>/<cadeira>-evidencia.md) | existe: ('convenção-P1', ('agent-orchestration/omega/juntas/votos', True))
DECISOES  | porteiro        | l.2866  | "arquivo de evidência" sem caminho no trecho -> convenção P1 (votos/<JUNTA>/<cadeira>-evidencia.md) | existe: ('convenção-P1', ('agent-orchestration/omega/juntas/votos', True))
DECISOES  | dev             | l.2845  | arquivo de saída que o mandato nomeia (convenção) + fallback: orquestrador nomeia no disparo | existe: ('convenção', True)
DECISOES  | planejador      | l.2855  | arquivo de saída que o mandato nomeia (convenção) + fallback: orquestrador nomeia no disparo | existe: ('convenção', True)
DECISOES  | fábrica         | l.2868  | arquivo de saída que o mandato nomeia (convenção) + fallback: orquestrador nomeia no disparo | existe: ('convenção', True)
DECISOES  | vigias          | l.2836  | objeto ("para os vigias") — não grava | existe: None
DECISOES  | jobs sem modelo | l.2836  | "não são alvo" — não grava | existe: None
```
- leitura: **todo sujeito que grava tem destino** — jurado/cadeira (e inspetor/porteiro, que têm o arquivo do P1: PROTOCOLO l.13 'Todo mandato de jurado, inspetor ou porteiro exige … apensar ao arquivo' + l.16 o caminho) → `agent-orchestration/omega/juntas/votos/<JUNTA>/<cadeira>-evidencia.md`, diretório **existe** na ref; dev/planejador/fábrica → 'o arquivo de saída que o seu mandato nomeia' + fallback 'o orquestrador nomeia um no disparo se o mandato não o fizer' (CLAUDE l.571–573, AGENTS l.599–601, PROTOCOLO l.89–90) — **convenção definida em texto vivo, total** (não há sujeito que escape: ou tem P1, ou tem mandato que nomeia, ou o orquestrador nomeia). Exercício da convenção no próprio bloco: `00-mandatos/planejador.md:94` 'grava a secao PAUSA no plano', `dev-pausa-emenda.md:100` 'no relatorio'; `fabrica.md` não nomeia → cai no fallback. Orquestrador → roteiro em `## PAUSA <hora UTC>` de `agent-orchestration/docs/status-geral.md` (CLAUDE l.576–577; PROTOCOLO l.97–98) — **existe** (`git cat-file -e` ok), e o §A4 item 1 (CLAUDE l.80) manda lê-lo antes de cada bloco. Vigias e jobs sem modelo: **objeto**, não gravam. As linhas 'AUSENTE' do 2º trecho (`Do orquestrador` / `O que o orquestrador faz`) são o resumo dos deveres, que remete ao bullet P7 do mesmo arquivo — não é destino próprio. README/terreno/decisoes-Decisão dizem 'arquivo de evidência' sem caminho → convenção P1 (diretório existe); o parágrafo 'Decisão.' de decisoes (registro E1) é explicitamente subordinado ao texto vivo (decisoes l.2896–2899).
- **S-04 não se confirma no head** (resolvido pela E2/T-21).
- vermelho-controle 1 (cópia do CLAUDE, substituição provada por `diff`): (a) ``<cadeira>-evidencia.md` do P1` → ``agent-orchestration/omega/pausas/<agente>.md`` no bullet P7 (l.571) → linha 'agente vivo' vira `existe: [('agent-orchestration/omega/pausas', False)]` ✔; (b) roteiro `status-geral.md` → `pausas/<agente>.md` na l.577 → linha 'orquestrador' vira `('agent-orchestration/omega/pausas', False)` ✔. (Na 1ª tentativa o `replace(...,1)` pegou a ocorrência da l.80 do §A4, não a do roteiro — a tabela, corretamente, NÃO virou; refeito com âncora única.) dev/planejador/fábrica não mudam (não eram afetados) ✔.
- vermelho-controle 3: 'para os vigias, ' apagado da l.576 da cópia → contagem de linhas 'vigias' da tabela do CLAUDE 2 → **1** (some a da l.576; fica a da l.602) ✔ — a tabela é gerada do texto, não de memória.
- veredito parcial 3(a): **VERDE**.

### 3(b) roteiro de retomada
- comando: `git -C C:/Users/AMP/w-jur-pz2 grep -n -i -P 'custo/trilha|trilha de custo|arquivo de custo' 67c2c280` ec=0 → nos 5 arquivos vivos do texto (CLAUDE, AGENTS, PROTOCOLO, README, terreno) = **0/0/0/0/0**; fora deles só registro/plano/briefing/mandato/notas de KPI (decisoes l.2880–2881 T-22, BRIEFING, plano, `dev-pausa-emenda.md:79`, `Kpis/*`), o meu próprio corpo (l.262–263 nos dois espelhos) e um falso positivo (`docs/omega-pd.md:241` 'centro-de-custo/trilha'). O destino novo (`## PAUSA <hora UTC>` em `agent-orchestration/docs/status-geral.md`) **resolve** na ref (cat-file ok) e é lido antes de cada bloco (§A4, CLAUDE l.80).
- vermelho-controle: o 1(b) acima (roteiro trocado por caminho inexistente → 'não existe').
- **S-05 não se confirma no head** (resolvido pela E2/T-22). veredito parcial 3(b): **VERDE**.

### 3(c) "pare" × PARADA, e as listas [hora estimada, NÃO medida — ver correção no fim]
- padrão declarado (`python $SCRATCH/pz2/pare.py`, `re.I`, fronteira de palavra Unicode `(?<![\wÀ-ÿ])…(?![\wÀ-ÿ])`): `pare|parem|pares|parar|parou|param|parada|paradas|para`; `para` minúsculo é listado como verbo-candidato só se seguido de `sozinho|quem|os vigias|o bloco|.|;|,|e|imediatamente|em` ou precedido de `não|nunca|só então|então|e` — o resto (preposição) é contado e descartado pela regra.
- saída: CLAUDE.md 62 casamentos (30 preposição descartada, 32 listados); AGENTS.md 65 (33 descartados, 32 listados) — as 32 listadas são **idênticas** nos dois (diff das listas sem nº de linha = vazio).
- classificação das 32 (CLAUDE; AGENTS igual, offset +28 no §C7):

| linha | uso | sentido |
|---|---|---|
| 63 | §A2 "Se bloquear, **pare e peça** validação" | PARADA-like (para e devolve ao dono) |
| 416 | §C7.4 "Reprovação de junta **NÃO para** o bloco" | PARADA (negada) |
| 432 | "**não uma parada**" | PARADA (negada) |
| 443, 460, 461, 462 | "paradas imediatas irredutíveis" (§C7.5) | PARADA |
| 476 (2×), 481, 487, 492, 494 (2×), 516 (2×), 521 | §C7.6-bis "ESGOTADO O OPUS, **PARA**" · "**PARA.** Não se desce mais um degrau" · "termina numa parada" | PARADA |
| 525, 567 | ID `D-PAUSA-GRAVA-E-PARA` | PAUSA (o verbo do dono, W3, em ID) |
| 566, 574 | P7 "grava o estado e **para sozinho**" | PAUSA (verbo do dono) |
| 568 | "Também **não é parada** (§C7.5, §C7.6-bis), que nasce de regra e devolve a decisão ao dono: a pausa nasce da ordem do dono e se retoma" | desambiguação explícita |
| 576 (2×), 602 | "só então **para** quem não respondeu, **para** os vigias" | PARAR-PROCESSO (ação do orquestrador sobre agente/vigia; o terreno l.94 diz "Só se mata quem não respondeu") |
| 596 | linha `[P7]` "e **pare sozinho**" | PAUSA (instrução ao agente, condicionada a "Se receber PAUSA") |
| 612 | §8.1 "**pare e peça** URL/acesso" | PARADA-like |
| 473, 506, 541, 702, 703 | "para esse papel", "caiu para Opus", "Vale para pareceres", "vence para", "mapeia para" | preposição (falso candidato) |

- **S-11:** os exemplos de **ordem** de pausa no head são `"pause tudo", "não use mais tokens"` (CLAUDE l.567, AGENTS l.595) e `"pause tudo", "não use mais tokens até o limite voltar"` (PROTOCOLO l.84) — **nenhum** é verbo de PARADA viva; "pare" saiu dos exemplos (decisoes T-24). O "para sozinho"/"pare sozinho" que resta é a ação do agente (verbo do dono, W3), e l.568 separa pausa de parada por escrito. **S-11 não se confirma no head.**
- **S-07:** listas de jobs sem modelo nos vivos — CLAUDE l.578, AGENTS l.606, PROTOCOLO l.99 e terreno l.94: `rodada de mutação, CI, cluster descartável` nas quatro (= fonte); README não lista. Só o parágrafo "Decisão." de `decisoes.md` (l.2836, REGISTRO E1) mantém `(rodada de mutação, CI)`, e a própria entrada o subordina ao texto vivo (l.2896–2899). **S-07 não se confirma no head.**
- **notas do plano, re-medidas:** S-06 confirma (`vigia` não é definido no contrato — 0 ocorrências na main; definido por uso em terreno l.89 "Vigia precisa de linha de base. Um detector armado…", que entrou em `5b6e1036` 2026-09-30, pré-existente, e no PROTOCOLO l.96 "um vigia que dispara re-invoca o orquestrador") · S-08 confirma ("~20–40 min" em CLAUDE l.584/PROTOCOLO l.108/decisoes l.2847 × "~30 min" em terreno l.96; "06:4x" só em decisoes l.2845 — matéria da C1/T-14) · S-09 confirma (o resumo "Do orquestrador" CLAUDE l.602–603 omite "declara quais jobs sem modelo ficam vivos", que o bullet l.578–579 e a fonte l.133–134 trazem — assimetria interna, não contradição) · S-10 confirma (§C7.6-bis l.494–495 "registrado onde está" não cita P7) **e tem dono declarado**: `P-GOV-PAUSA-ESCADA-C76BIS` em `pendencias.md:9879` do head, dono `B-GOV-CICLOS-RESIDUAIS`, BAIXA, não bloqueia · S-12 coerente (CLAUDE l.580–581 "a mesma identidade nasce… (P3: re-executa…)"; PROTOCOLO l.104 "é a regra P3 aplicada a um corte limpo") · S-13 coerente (§C7.5 l.460–463 inalterado; l.568 "não é parada") · S-14 coerente e agora completa (pausa "não é morte" → não é queda do P6; o registro é a seção `## PAUSA` + o roteiro em `status-geral.md`, que existe).
- **nota nova (minha):** "pausa" passa a ter dois sentidos dentro do mesmo item 7: P5 "pausa de ~15 min"/"aplica a pausa de janela instável (P5)" (CLAUDE l.560, l.599 — existiam na main l.557/572) e P7 "ordem de pausa do dono"/"pausa ordenada" (novos). Distinguidos por qualificador e pelo token `PAUSA` em caixa alta; nenhum texto vivo manda o agente agir sobre a pausa do P5. `nota`, dentro-do-bloco (o bloco introduziu o 2º sentido no mesmo item); não bloqueia.
- vermelho-controle 2: o padrão casa `**PARA.**` do §C7.6-bis (l.487, e na tabela de fallback l.516) ✔ e **não** casa dentro de `separação`/`SEPARAÇÃO`/`compare`/`parecer`/`pareceres`/`disparo` (presentes 1/1/1/7/1/4 vezes no CLAUDE; casamento interno = False em todas) ✔.
- veredito parcial 3(c): **VERDE**.

- **veredito parcial ITEM 3: VERDE** — todo sujeito de P7 que grava tem destino na ref (diretório `votos/` do P1; `status-geral.md`) ou convenção em texto vivo com fallback total; o roteiro de retomada resolve; nenhum verbo de PARADA viva é dado como exemplo de ordem de pausa; listas de jobs coerentes com a fonte. Os 3 vermelhos-controle acusaram.


## Correção de terreno (minha) — horas dos cabeçalhos
- Os cabeçalhos dos itens 1–3 tinham horas UTC **estimadas**, não medidas (18:40Z/19:05Z/19:30Z/19:45Z); medi `date -u` no fim = **2026-10-01T19:21:50Z**, anterior a duas delas. Substituí-as pela marca "estimada, NÃO medida". Medidas de verdade: início 18:32:01Z (`date -u`, cabeçalho) e fim 19:21:50Z. Nenhum resultado depende dessas horas.

## Fechamento [2026-10-01T19:32:47Z, medido]
- head re-resolvido no fim (19:21:50Z): git = gh = 67c2c280612cb644f246af0b5410cab59afe028d (não andou durante a medição).
- limpeza: git worktree remove --force C:/Users/AMP/w-jur-pz2 ec=0 (diretório inexistente; worktree list = 0; sem prune); scratchpad/pz2 e scripts de voto apagados; nenhum arquivo rastreado tocado; base viva nunca tocada; resíduo alheio só reportado.
- não li nenhum arquivo C1-*/C3-* (existem C1-evidencia.md e C1-voto.json no diretório; não abertos).
- voto gravado em C2-voto.json ANTES da mensagem final (P2): APROVADO, 3 itens VERDE, 4 achados nota, 0 ajuste, 0 bloqueia.
