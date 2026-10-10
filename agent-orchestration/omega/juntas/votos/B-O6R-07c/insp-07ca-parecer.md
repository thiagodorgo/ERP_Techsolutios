papel=inspetor-de-terreno-da-junta · modelo=Claude Opus 5.5 (claude-opus-5-5), nivel menor, DECLARADO — o Fable nao rodou por decisao do dono de 2026-10-10 (D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO: topo so no plano e em toda reprovacao de junta; registrada em origin/main@9b611468, #415), nao por cota · mandato_md5=b611ad35a5402a649cc582c5b40c4fca (EOL-neutro, origin/fix/o6r07c-subresource-scope) · corpo_md5=de80b2a9d4fc7edd7b9a26e2d601f97d (EOL-neutro, origin/main:.claude/agents/inspetor-de-terreno-da-junta.md)

# Parecer do inspetor de terreno — junta do B-O6R-07c-a (PR 414), ciclo 1

Evidência incremental (comando, saída e veredito parcial por item, com hora UTC): `insp-07ca-evidencia.md`, no mesmo diretório.
Medido entre 2026-10-10T16:25Z e 16:40Z. Não julgo mérito; julgo se o tabuleiro está limpo.

## Veredito: **LIBERADO COM RESSALVA**

O objeto da junta é **`c8bd4c28b0cd27061cf926e2756877348e89d770`**. Resolvi-o por `git ls-remote` e por `gh pr view 414`, no início e no fim. Ele tem **14/14 check-runs concluídos e verdes**. Em relação ao head de geração do mandato (`98803254`), o delta é só o próprio mandato. A base é `B = merge-base(origin/main, objeto) = ab52ec50` (o merge do #389). Quórum: **unanimidade de 3, com veto** (bloco de permissão, §C7 item 8(1)); ciclo 1, teto de 2 (§C7 item 8(2)).

## Itens

| item | resultado | prova (resumo; o comando inteiro está na evidência) |
|---|---|---|
| 0. Corpo e mandato | VERDE | md5 EOL-neutro do corpo `de80b2a9` e do mandato `b611ad35`, iguais aos publicados; os dois lidos inteiros |
| 4.3 Objeto com check-run concluído | VERDE | `gh api repos/.../commits/c8bd4c28/check-runs`, às 16:38:25Z: total 14, não-verdes 0, pendentes 0. São 2 runs (38067585992 e 38067588841), cada um com authority-portal, owner-portal, frontend, flutter, backend-postgres, backend e docker. As falhas conhecidas T15 (#405) e A10 (o6r06) **não** aparecem neste head |
| 1.1 Head e árvore limpa | VERDE com nota | O meu worktree detached está em `c8bd4c28`, porcelain 0. Na árvore do dev (`w-07ca`, `c8bd4c28`) há **50 entradas fantasma com status M**: `git diff --quiet` dá 0, e o laço EOL-neutro blob × disco deu 49/49 iguais. A 50ª é `controle/pendencias-indice.md`, regravada pelo orquestrador (ver Anomalia). Nenhum arquivo de `src/`, `tests/` ou `.claude/agents/` tem mutação viva |
| 1.2 Plano de isolamento | VERDE | Os 3 corpos declaram por escrito: worktree próprio detached (`w-j07cac1/2/3`, livres hoje); `npm ci` próprio, sem junction; containers só com prefixo próprio (`j07ca-c1-/-c2-/-c3-`), em rede própria e sem porta publicada; `erp-postgres`, `erp-redis`, `erp-postgres-alt` e as portas 3000/5173/5050 nunca são alvo; remoção pelo nome, com contagem de processos antes. Só a C3 usa banco (`postgres:16` + `redis:7` descartáveis); as imagens e a receita estão no host |
| 1.3 Resíduo de jurado anterior | VERDE com ressalva inerte | Containers jur-, crit-, j07ca-, insp07ca- ou dev07c-: 0. Restos inertes, não varridos: `w-pvpr` (arnês do pré-voo, 2 scripts untracked), `.claude/worktrees/san2-r` e `san300` (16K cada), containers Exited `erp-postgres-alt` e `pastrack-teste-banco-teste-1`. Probes soltos: 0 |
| 2.1 Ata anterior | VERDE | Ciclo 1: não há J- nem votos anteriores do 07c. Os 3 corpos marcam como [A RE-VERIFICAR], "roteiro, nunca fato", tudo o que herdam — plano, críticas, relatório do dev, atas do 07a/07b e o próprio corpo (C1 l.32, C2 l.36, C3 l.33) |
| 2.2 Ciclo >= 4 | não se aplica | ciclo 1 |
| 2.3 Plano e insumos | VERDE | No objeto, o plano v3 tem 1440 linhas: 07c-a.5 (permitido e proibido por caminho), 07c-a.6 (bateria com forma), 07c-a.7 (junta). As críticas r1/r2 e os relatórios do dev e da fábrica também estão no objeto. O `src/` do bloco são os 4 arquivos do 07c-a.5. No diff, 0 caminho do 07c-b ou proibido (mobile, checklists, field-dispatch, src/modules/mobile, prisma, Kpis, frontend, .github, package). A main entrou no ramo pelo merge `054dada2` |
| 3.1-bis / 3.1 Inelegibilidade | VERDE | O obituário é idêntico no objeto e na main (md5 `b3b11247`; 33 SEPULTADAS, 0 RESERVADAS). Os nomes `jurado-07ca-c1-escopo-por-objeto`, `jurado-07ca-c2-censo-e-guard` e `jurado-07ca-c3-regressao-escopo` aparecem nele 0/0/0 vezes. Em atas, votos e reprovações das duas refs, só neste mandato; nunca no relatório do dev nem nas críticas. A lista do 07c-a.7 foi conferida no objeto contra as fontes: `coordenador-de-acessos` (achou o C2-09, `votos/SAN3-plano/C2-coordenador-de-acessos-voto.json:54`); `guardiao-fail-closed` (achou o C2c2-03, `votos/SAN3-plano-ciclo2/C2-guardiao-fail-closed-voto.json:30`); `jurado-b07a-autorizacao-e-alcada` (`J-O6R-07a-ciclo1.md:13`); `jurado-b07a-c2-autorizacao-s` (`J-O6R-07a-ciclo2.md:13`); devs `dev-b-o6r-07c-a` e `dev-b-o6r-07c-a-sucessor`; `planejador-b-o6r-07c`; `critico-b-o6r-07c-r1` e `-r2`. Nenhum está na composição. A tensão do `PLANO_SAN3.md:254` está registrada como `REGISTRO-07CA-TENSAO-COORDENADOR` em `origin/main@9b611468:agent-orchestration/controle/decisoes.md` l.3181; no objeto, 0 ocorrências (R2) |
| 3.2 Competência | VERDE | A C1 traz a cadeia de acesso (competência do coordenador-de-acessos). A C2, fail-closed e rotas (guardiao-fail-closed + inspetor-de-rotas). A C3, regressão, escopo, `-db` e registro. Sem migração no bloco, nenhuma cadeira de dba é exigida |
| 3.3 Corpo carregado × corpo julgado | VERDE COM RESSALVA (R1) | md5 EOL-neutro do blob `.claude` no objeto: C1 `23594fb3194c0802651edd8299b8433e`, C2 `faff2d5cbef04f380dca1c3784887867`, C3 `114a51ccaed1894a044123d93ca256ff`; o disco do dev bate. No diretório da sessão os 3 estão **AUSENTES** (nenhum arquivo 07c em especialistas/, nenhum tipo de agente com o nome). Todas as normas citadas existem no objeto (C7.1-bis, C7.1-ter, C7.4-bis, C7.6-bis, P7, D-GOV-PROPORCIONAL, D-MEDIR-NA-REF-ALVO, D-FALLBACK, D-FABLE-ASTRA-SO-DINHEIRO, D-Ω3F-5-COMMENT, D-CLAUDE-2-PROCESSOS), menos a **D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO, que só está na main** (R2). CLAUDE.md e AGENTS.md são iguais no objeto e na main |
| 4.1 Fatia S0 | VERDE | `node scripts/sync-agent-agents.mjs --check`: ec=0, "52 agentes, espelho consistente". especialistas/ tem 29/29, e os 6 corpos jurado-07ca estão rastreados nos dois espelhos. Vermelho-controle: com 1 linha a mais no espelho, ec=1; restaurado, ec=0, porcelain 0 |
| 4.2 Baseline | VERDE | No objeto: `npm ci` próprio (ec=0); `prisma generate` com DATABASE_URL só no ambiente, sem conexão (ec=0); `npm run check` (`tsc --noEmit`) com **ec=0**, exit lido por variável |
| 5.1 Perda de jurado | VERDE | Os 3 corpos declaram: queda relança a **mesma** identidade (P3), que re-executa a evidência registrada; a junta não fecha com menos de 3 votos de mérito; voto perdido nunca conta como aprovação. Quedas são registradas pelo orquestrador (P6); no máximo 2 em paralelo (P5) |
| X. main BEHIND (#415) | não afeta o objeto (R2) | `git diff --name-only ab52ec50 origin/main` dá 7 arquivos, todos de registro, com **0 em comum** com os 29 do PR. O código e os testes julgados são os mesmos com ou sem o #415 |

## Ressalvas — para o briefing das cadeiras, em destaque

- **R1 — os corpos chegam pelo blob do objeto.** Os 3 corpos não existem no diretório da sessão, então as cadeiras só podem nascer como `general-purpose`, com o blob de `c8bd4c28` colado. Cada uma declara o md5 EOL-neutro do corpo que recebeu, contra os valores do item 3.3. Todas têm **veto**: cadeira com md5 diferente **não está liberada**.
- **R2 — o BEHIND não muda o objeto, mas tira registros dele.** O #415 não tem arquivo em comum com o PR. Ficam só em `origin/main@9b611468` (`controle/decisoes.md` e `pendencias.md`):
  - a regra de modelo `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`;
  - o `REGISTRO-07CA-TENSAO-COORDENADOR` (l.3181);
  - as perguntas D1/D2/D3-07c;
  - a `P-O6R-07C-DANO-DEBITA-EXTRATO-DE-COLEGA`.

  Os corpos mandam conferir no objeto. O briefing deve dizer que esses itens estão na main e que a ausência deles no objeto é efeito do BEHIND, não do bloco; a C3 mede o registro na main. O modelo Opus das cadeiras também se sustenta pela `D-FABLE-ASTRA-SO-DINHEIRO`, que está no objeto. Integrar a main **depois** do voto cria um head novo, mas o objeto votado continua `c8bd4c28`. Quem mergear confere que o merge de integração não traz conteúdo próprio além dos 7 arquivos do #415, como no #405.
- **R3 — caminhos nos mandatos.** A C1 (l.112 e l.222) procura o parecer do inspetor em `votos/B-O6R-07c-a/00-inspetor-terreno.md` (marcado como hipótese) e manda as quedas para `votos/B-O6R-07c-a/00-quedas.md`. O diretório real desta junta é `votos/B-O6R-07c/`, e este parecer é `votos/B-O6R-07c/insp-07ca-parecer.md`. Os mandatos das 3 cadeiras devem nomear os dois caminhos reais.
- **R4 — a árvore do dev tem fantasmas.** `w-07ca` mostra 50 entradas com status M sob autocrlf, com conteúdo idêntico ao objeto. Nenhuma cadeira deve ler isso como mutação viva. Ninguém, orquestrador incluído, roda gerador ou ferramenta em `w-07ca` durante a junta.
- **R5 — o terreno é compartilhado.** Durante a inspeção nasceram dois worktrees de outras sessões: `w-03a` (`fix/expense-sync-atomic`) e `w-govmod` (`chore/gov-modelos-topo`). Eles dividem CPU e disco com a junta, e as cadeiras não os tocam. Hoje há 16 GB livres em C:. O orquestrador mede **>= 10 GB antes de cada cadeira** (os corpos só param abaixo de ~2 GB) e dispara no máximo 2 em paralelo (P5).

## Anomalia de terreno relatada pelo orquestrador — medida

Às 16:37Z, o orquestrador rodou `gerar-indice-pendencias.py --help` em `w-07ca`, e o gerador regravou `agent-orchestration/controle/pendencias-indice.md`. Medi:
- `git diff --numstat`: vazio; `git diff --quiet`: ec=0;
- md5 EOL-neutro do blob = md5 do disco = `3175d84ae53fc48345d21653bd9c6359`;
- mtime 13:37 -03:00, coerente com o relato;
- HEAD continua em `c8bd4c28`.

**Sem efeito de conteúdo.** O objeto não muda, e o arquivo não foi alterado pelo dev. Fica registrada como anomalia de terreno (R4).

## Limpeza

Criei o worktree `C:/Users/AMP/w-insp-07ca` e o removi pelo nome, com 0 processo vivo e porcelain 0; o diretório não existe mais. Não criei container (0 insp07ca). Apaguei do scratchpad os meus 5 temporários. Em `w-07ca` escrevi só estes 2 arquivos e não commitei. Não toquei a base viva, as portas do dono, `w-traccar`, `w-pvpr`, `w-03a` nem `w-govmod`.
