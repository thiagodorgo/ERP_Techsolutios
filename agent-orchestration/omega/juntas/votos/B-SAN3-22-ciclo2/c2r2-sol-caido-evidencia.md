papel: cadeira C2 | identidade: jurado-san322-c2-r2-sol | executor: Codex CLI | corpo: jurado-san322-c2-contrato-classificador-consumidores | modelo: GPT-5.6 Sol (nível menor DECLARADO, §C7.6; esforço medium; substituição: nenhuma) | objeto: 6b03e44d8136792398f521ccaf85d8dd45168a6d | mandato_md5: 574264f83505bd4b43c96b474f020b76 | corpo carregado × blob do objeto: IDENTICO (EOL-neutro)

# Evidência — C2 refeita — B-SAN3-22, ciclo 2

## Terreno e legalidade inicial

- Parecer lido inteiro: `insp-san322c2-parecer.md`, identidade `inspetor-san322-c2`, **LIBERADO COM RESSALVA**; seis ressalvas lidas.
- Ressalva 1 destacada: os scripts originais de `j22-c2` nunca serão executados no lugar. Se reutilizados, serão copiados para `C:/Users/AMP/erp-pausa-2026-10-03/j22r2-c2/`, com worktree, porta e `OBJ` alterados, e o diff será publicado aqui antes da execução.
- Head no início: `git ls-remote origin refs/heads/fix/checklist-trava-versao` = `gh pr view 464 --json headRefOid` = `6b03e44d8136792398f521ccaf85d8dd45168a6d`; PR `OPEN`, não rascunho, `MERGEABLE`.
- Recursos no lançamento: disco C: 9,28 GB livres (mínimo C2 8,05 GB); memória de commit livre 7,96 GB (mínimo 4 GB); trabalhos Docker fora de `erp-*`: 0.
- Terreno autorizado: worktree exclusivo `C:/Users/AMP/j22r2-c2-wt`; Redis exclusivo `j22r2-c2-redis` em `127.0.0.1:48032`; base viva `erp-*` e portas 5432/6379/3000/5173/5050/8899 não serão tocadas; junction de `node_modules` proibida.
- Scratch: `C:/Users/AMP/erp-pausa-2026-10-03/j22r2-c2/`. Variáveis: `OBJ`, `WT`, `SCRATCH`, `REDIS_URL`. Node e demais versões serão registrados depois da instalação.

Comando executado → comparação EOL-neutra do corpo no disco de `w-san322` contra `git show 6b03e44d8136792398f521ccaf85d8dd45168a6d:.claude/agents/especialistas/jurado-san322-c2-contrato-classificador-consumidores.md`; `git ls-remote`; `gh pr view`; `Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory`; `Get-PSDrive C`; `docker ps`.

Saída resumida → corpo `IDENTICO`; head remoto = head do PR = objeto; memória 7,96 GB; disco 9,28 GB; Docker alheio 0.

Veredito parcial → **LEGALIDADE INICIAL VERDE**, condicionada à estabilidade do head e ao isolamento/teardown final.

### Ressalva 1 — diff publicado das cópias, antes da execução

Comando executado → `git diff --no-index` entre `j22-c2/<script>` e `j22r2-c2/<script>` para `ce13.sh`, `ce13b.sh`, `drill.sh`, `silent.sh` e a sonda REST.

Saída resumida (diff integral das adaptações relevantes):

```diff
-cd C:/Users/AMP/j22-c2-wt || exit 1
-S=C:/Users/AMP/erp-pausa-2026-10-03/j22-c2
-OBJ=44d9cbb3874e45340ca43c934364c3d0103c53b8
+cd C:/Users/AMP/j22r2-c2-wt || exit 1
+S=C:/Users/AMP/erp-pausa-2026-10-03/j22r2-c2
+OBJ=6b03e44d8136792398f521ccaf85d8dd45168a6d
-REDIS_URL=redis://127.0.0.1:47932
+REDIS_URL=redis://127.0.0.1:48032
```

As quatro substituições acima aparecem em cada roteiro em que o valor existia (`ce13`, `ce13b`, `drill`, `silent`). Em `ce13b.sh`, o bloco que criava e apagava `tests/zz-j22c2-forma.test.ts` por `cat`/`rm` foi removido e substituído por:

```diff
-# forma minha: URL numa variável declarada 3 linhas antes, sem token
-cat > tests/zz-j22c2-forma.test.ts <<'EOT'
-... duas sondas criadas por shell ...
-rm -f tests/zz-j22c2-forma.test.ts
+# A forma própria é criada/removida separadamente por apply_patch, fora deste roteiro.
+echo "forma própria: medir separadamente (sem criação de arquivo por shell)"
```

Na sonda REST:

```diff
-const OUT = process.env.J22C2_OUT ?? "C:/Users/AMP/erp-pausa-2026-10-03/j22-c2/i2b-rest.tsv";
+const OUT = process.env.J22C2_OUT ?? "C:/Users/AMP/erp-pausa-2026-10-03/j22r2-c2/i2b-rest.tsv";
```

`mut.mjs` e `contrato.mjs` foram copiados byte a byte e ainda não foram executados; não contêm worktree, porta nem `OBJ` fixos. Nenhum script original foi executado no lugar.

Veredito parcial → **RESSALVA 1 CUMPRIDA** para os roteiros copiados; toda execução subsequente usa somente `j22r2-c2/`.

## Item 1 — C2-01 / E4-01 e E4-10 — FECHADO

Comandos executados → com `REDIS_URL=redis://127.0.0.1:48032`, três execuções de `node --test --import tsx tests/checklist-template-lock.test.ts tests/checklist-routes.test.ts`; sonda própria `tests/zz-j22c2-rest.test.ts` pelo app em memória; mutações de âncora única via `j22r2-c2/mut.mjs`; `contrato-r2.mjs` sobre `API_CONTRACTS.md` 3.6.2 × TSV da sonda; vermelho-controle com `git checkout <objeto>~8 -- src/modules/checklists/checklist.service.ts`.

Saída resumida → três rodadas idênticas: `# tests 29 · pass 29 · fail 0 · skipped 0`. Incluem `E3-20 (REST)` e `CE-10a/10b/10c`; a sonda própria: `1/1`, sem falha.

Sonda REST, linhas exigidas (porta · status · code · reason):

```text
E3-20 arquivado: GET detalhe        404 CHECKLIST_NOT_FOUND checklist_not_found
E3-20 arquivado: PATCH              404 CHECKLIST_NOT_FOUND checklist_not_found
E3-20 arquivado: DELETE             404 CHECKLIST_NOT_FOUND checklist_not_found
E3-20 arquivado: publish            404 CHECKLIST_NOT_FOUND checklist_not_found
E3-20 arquivado: createRun          404 CHECKLIST_NOT_FOUND checklist_not_found
E3-20 arquivado: render sem viva    404 CHECKLIST_NOT_FOUND checklist_not_found
render do arquivado COM viva        200 - -
CE-12 PATCH outra organização       404 CHECKLIST_NOT_FOUND checklist_not_found
CE-12 publish outra organização     404 CHECKLIST_NOT_FOUND checklist_not_found
CE-12 DELETE outra organização      404 CHECKLIST_NOT_FOUND checklist_not_found
CE-12 GET outra organização         404 CHECKLIST_NOT_FOUND checklist_not_found
id inexistente: GET detalhe         404 CHECKLIST_NOT_FOUND checklist_not_found
rascunho sem viva: render           409 CHECKLIST_NOT_PUBLISHED checklist_not_published
inativo sem viva: render            409 CHECKLIST_NOT_PUBLISHED checklist_not_published
```

Mutações executadas:

1. ramo do 404 neutralizado (`if (false && archived && !servesActiveRun)`): âncora 1, numstat 1/1; `E3-20` vermelho, `expected 404 · actual 409`; restauro `hash-object = blob`.
2. `renderChecklist` usando `getTemplate` no lugar de `getTemplateForRun`: âncora 1, numstat 1/1; `CE-10c` vermelho; restauro `hash-object = blob`.
3. mutação própria: contagem viva reduzida a `run.status === "in_progress"`, esquecendo `pending_acknowledgement`: âncora 1, numstat 1/1; a primeira seleção `CE-7c|CE-10c|E3-20` não casou o título composto e foi **medição inválida** (2 verdes não usados). Reexecução correta com `--test-name-pattern='CE-7a'`: `CE-7a/7b/7c/7d/8a/8b` vermelho por `expected 409 · actual 200`; restauro `hash-object = blob`.

Cruzamento E4-10 por script próprio: 5 fatos no contrato e 5 no runtime; `dito_e_nao_feito=0`, `feito_e_nao_dito=0`. Mutação `--sem-arquivado`: vermelho com `feito_e_nao_dito=2` (`arquivado_404_seis_portas`, `arquivado_render_viva_200`).

Vermelho-controle `<objeto>~8`: a sonda própria publicou `render sem viva = 409 CHECKLIST_NOT_PUBLISHED/checklist_not_published`; o caso `E3-20` ficou vermelho por `expected 404 · actual 409`. Serviço restaurado ao blob do objeto.

Veredito parcial → **VERDE**. Nenhum achado no Item 1; C2-01/E4-01 e E4-10 foram re-verificados por execução. A classe anterior não se repetiu.

## Item 2 — C2-06/07/08/09 · E4-02/E4-03 — FECHADO

Comandos executados → CE-13 isolado no objeto; gerador próprio `ce13-count-r2.mjs`; roteiros copiados/adaptados `ce13.sh`, `ce13b.sh`, `silent.sh`; mutações próprias via `mut.mjs`/`apply_patch`; guard novo executado sobre `tests` de `<objeto>~21`; controles com o guard e o snapshot de `<objeto>~8`; todos com `REDIS_URL=redis://127.0.0.1:48032`.

Saída resumida → CE-13 no objeto: `tests 14 · pass 1 · fail 0 · skipped 13 · 0 violações`; imprime `8 declarações / 35 sítios mutantes`. O gerador próprio, após corrigir a janela para terminar no `})` como a propriedade declara, reconfirmou `8/35`. No `<objeto>~8`, o mesmo gerador deu `6/26`; a diferença é exatamente `+2 declarações/+9 sítios` existentes nos casos acrescentados, não uma divergência da propriedade (D-C2-3 aceita).

Mutações de forma, todas vermelhas e nomeando o sítio:

```text
URL variável PATCH, marcador l.122     → checklist-template-lock.test.ts:122 sem expectedUpdatedAt
URL variável DELETE, marcador l.316    → checklist-template-lock.test.ts:316 sem expectedUpdatedAt
URL variável publish, marcador l.423   → checklist-template-lock.test.ts:423 sem expectedUpdatedAt
URL concatenada                        → helpers/o6r07c-census.ts:90 sem expectedUpdatedAt
URL literal/template                   → checklist-snapshot-dispatch.test.ts:42 sem expectedUpdatedAt
updateTemplate direto                  → checklist-run-lifecycle-db.test.ts:384 sem expectedUpdatedAt
components sem componentKey            → checklist-template-lock.test.ts:249 sem componentKey
```

Regra (iv), resultado descartado:

- `const republished = await req(...)` → `await req(...)`: CE-13 vermelho em `checklist-snapshot-dispatch.test.ts:44`, status não afirmado.
- `const publicado = await chamar(...)` → `await chamar(...)`: CE-13 vermelho em `helpers/o6r07c-census.ts:90`, status não afirmado.
- caso próprio `await api.requestJson(...)`: CE-13 vermelho em `zz-j22r2-c2-dotted-helper.test.ts:2`. Isso prova que `[\w.]+` alcança helper pontuado; a forma `\w+` da letra antiga não alcançaria (D-C2-8 aceita).

Cinco sítios E4-03 com token defasado, um por vez:

```text
U1 routes PATCH inactive       → vermelho, 0/15 (caso dono falhou)
U2 routes publish helper       → vermelho, 13/15; duas falhas expected 200 / actual 409
U3 snapshot PATCH              → vermelho, 0/15
U4 snapshot publish            → vermelho, 0/15
U5 census publish              → vermelho; semente acusa 409 template_changed_since_read antes das 14 asserções
```

O primeiro roteiro de U2 encontrou âncora 0 porque a linha mudou; essa tentativa não contou. A mutação foi reaplicada por contexto único e produziu os dois vermelhos acima. Todos os cinco arquivos foram restaurados com `hash-object = blob`.

Guard novo sobre `tests` de `<objeto>~21`: `ec=1`, **35 violações únicas** publicadas entre as linhas 76–110 do TAP: 30 `sem expectedUpdatedAt`, 5 `resultado descartado`, 0 `sem componentKey`; portanto ≥30 e com classes nomeadas.

Mutação própria fora das formas prometidas: URL passada como parâmetro de helper ficou verde (`1/1`; censo passou a 9 declarações/35 sítios). É residual explicitamente declarado no comentário do guard e há `P-FRONT-TESTE-DE-INTERACAO` com dono; aceito, não é furo novo.

Vermelhos-controle `<objeto>~8`: (a) guard antigo + marcador do DELETE por variável removido permaneceu **verde** `1/1`; (b) snapshot antigo + token defasado no publish permaneceu **verde** `1/1`. As duas classes fechadas por E4-02/E4-03 foram reproduzidas.

Veredito parcial → **VERDE**. C2-06/07/08/09 não se repetiram; nenhuma falha silenciosa nos cinco sítios atuais. O residual é preexistente/declarado e já tem pendência com dono.

## Item 3 — regressão C2, E4-07, CE-33, escopo e E4-11 — FECHADO COM BLOQUEIO

Comandos executados → três rodadas de `node --test --import tsx tests/checklist-template-change.test.ts tests/checklist-editor-classifier-parity.test.ts`; classificador isolado; mutação E4-07; controle com teste de `<objeto>~8`; `git diff -U0 <objeto>~8..<objeto>` por arquivo/hunk; classificação CE-33; diff de escopo e busca das três pendências/donos; sonda D-W1 já executada no Item 1.

Saída resumida → três rodadas idênticas: `51/51`, falhas 0, pulos 0. Classificador isolado: **33/33**. CE-37: 18 casos verdes (publicado, legado e editor; sem mudança/rótulo/nome+seção/reordenação/mover seção, mais os casos de normalização).

E4-07: no objeto, `schema.sectionsX` e `schema.sections2` dão `field`; mutação `/^schema\.sections(?:\..*)?$/` → `/^schema\.sections(?:\..*)?/` produziu exatamente 2 vermelhos: `expected field · actual text`; `31/33`. Com o teste de `<objeto>~8` (sem as duas linhas), a mesma mutação ficou **verde 31/31**. Código e teste restaurados por hash.

Regressão da C2 do ciclo 1: CE-18/CE-37/normalizações E3b-01/TEXT_PATHS = 51/51 em três rodadas; REST da trava = 29/29 em três rodadas (Item 1), denominadores iguais. D-W1 reexecutada: primeiro salvar legado classifica `text` com exatamente `[schema.sections, schema.source]`; pela REST, com 1 viva e com 0 vivas retorna 200, versão `2→2`, sem 409 e preserva a ordem/render `placa,fotos,assinatura`. Ratificação aceita, sem efeito de perda.

CE-33, somente os hunks `<objeto>~8..<objeto>`:

| arquivo | hunks | classificação |
|---|---:|---|
| `tests/checklist-template-lock.test.ts` | 11 | guard/regressão e pré-condição da trava; toda requisição nova tem status/code/reason afirmado |
| `tests/checklist-template-lock-db.test.ts` | 6 | forma tenant-first, controles de lock e novos casos C1; nenhuma asserção existente alterada |
| `tests/checklist-template-change.test.ts` | 1 | regressão E4-07 com duas asserções de classificação |
| `tests/checklist-routes.test.ts` | 3 | encanamento do resultado + asserções 200 nos dois sítios |
| `tests/checklist-snapshot-dispatch.test.ts` | 1 | encanamento + duas asserções 200 |
| `tests/helpers/o6r07c-census.ts` | 1 | encanamento + falha explícita se publish ≠ 200 |
| `frontend/tests/checklists-editor-lock.smoke.test.tsx` | 3 | guard de forma da C3; sem requisição mutante |

Total: **26 hunks**. Categoria CE-33 (iv), asserção de negócio alterada: **0**. Categoria (v), requisição mutante sem status 2xx afirmado: **0**. Os hunks anteriores não foram herdados cegamente: `git diff -U0 <objeto>~8..<objeto> -- <7 arquivos>` enumerou todo delta novo (somente estes 26); o restante não mudou, e suas propriedades foram reexecutadas nas regressões acima.

Escopo medido:

- `<objeto>~8..<objeto>`: 25 caminhos; `<objeto>~7..<objeto>` (somente dev do ciclo 2): 13 caminhos.
- Proibidos nomeados (`frontend/src`, `prisma`, `mobile`, `src/database`, `core-saas`, `.github`, `Kpis`, repositórios de checklist, manifestos/lockfiles): **0**.
- `checklist.service.ts`: somente 5 linhas dentro de `renderChecklist`, o ramo 404 já executado.
- `TEXT_PATHS`: 0 caminho alterado no conserto.

E4-11: três pendências presentes, ABERTAS e com dono: `P-CHK-EDITOR-LEITURAS-B` (orquestrador/B-CHK-EDITOR-LEITURAS-B), `P-CHK-COMPONENTES-EMPATE-ORDER-INDEX` (orquestrador, preexistente em `b08c7557`) e `P-FRONT-TESTE-DE-INTERACAO` (orquestrador). D-C2-1 é da C3; D-C2-2 não muda requisito desta cadeira; D-C2-3 aceita (8/35 recontado); D-C2-4 é deslocamento de linha; D-C2-5 acusa a falha da semente; D-C2-6 superada pelo script próprio; D-C2-7 é registro; D-C2-8 foi executada e aceita.

### Achado C2R2-01 — conflito de escopo dentro da Emenda E4

- **Defeito:** E4-11 manda gravar as três pendências com `(+ python agent-orchestration/controle/gerar-indice-pendencias.py)` e exige “índice regenerado”; porém E4.2, posterior e “consolidado”, lista como registro permitido apenas `pendencias.md`, plano, relatório e ata/votos, e declara **“PROIBIDO: tudo o mais”**. O objeto do ciclo 2 toca `agent-orchestration/controle/pendencias-indice.md` (10 adições/7 remoções). As duas regras não podem ser verdadeiras ao mesmo tempo sem consolidação silenciosa.
- **Evidência:** `git diff <objeto>~8..<objeto> -- agent-orchestration/controle/pendencias-indice.md`; `git log -- ...` atribui o toque ao commit `c0e477b7246b21b3cd33e1a12c41280756fe71c9` do ciclo 2; leitura literal de E4-11 e E4.2 no objeto.
- **Gravidade:** `bloqueia`.
- **Escopo:** `dentro-do-bloco` (origem no commit do dev do ciclo 2, posterior ao objeto do ciclo 1).
- **Classe:** `não grave` (processo/escopo; não é perda/vazamento/permissão/dinheiro).
- **Motivo:** o requisito “diff do conserto ⊆ PERMITIDO” não é demonstrável na própria E4; §A2 proíbe escolher silenciosamente entre as duas cláusulas. Nenhuma correção é proposta.

Veredito parcial → **VERMELHO** pelo C2R2-01. Produto, classificador, consumidores e CE-33 ficaram verdes; a classe de produto anterior não se repetiu. O bloqueio é novo e de processo, com informação nova.
