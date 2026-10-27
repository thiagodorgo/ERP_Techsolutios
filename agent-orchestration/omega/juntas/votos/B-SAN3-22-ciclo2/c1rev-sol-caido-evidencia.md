papel: cadeira C1 REVALIDADA | identidade: jurado-san322-c1-r2-sol | executor: Codex CLI | corpo: jurado-san322-c1-banco-e-concorrencia | modelo: GPT-5.6 Sol (esforço medium; nível menor DECLARADO, §C7.6; substituição: nenhuma) | objeto: 6b03e44d8136792398f521ccaf85d8dd45168a6d | mandato_md5: 7d34f8556aedcf9362fb1edb38c34f22 | corpo carregado × blob do objeto: IDENTICO (EOL-neutro)

# Evidência — C1 revalidada — B-SAN3-22, ciclo 2

## Legalidade e terreno inicial

- Parecer lido inteiro: `insp-san322c2-parecer.md`, identidade `inspetor-san322-c2`, **LIBERADO COM RESSALVA**; as 6 ressalvas foram lidas. Esta execução começou depois de 01:39Z e é a C1 em Codex GPT-5.6 Sol permitida pelo parecer.
- Revalidação às 2026-10-27T01:44:10Z: `git ls-remote origin refs/heads/fix/checklist-trava-versao` = `gh pr view 464 --json headRefOid` = `6b03e44d8136792398f521ccaf85d8dd45168a6d`; PR OPEN, não draft, MERGEABLE. Head não andou.
- Recursos antes do lançamento: commit livre 8,11 GB (piso 4 GB); disco C: 8,78 GB (piso C1 8,2 GB; parada abaixo de 7 GB); trabalhos Docker fora de `erp-*`: 0. Base viva `erp-postgres`/`erp-redis` nunca será lida nem tocada; portas 5432/6379 proibidas.
- Worktree exclusivo criado por `git worktree add --detach`: `C:/Users/AMP/j22r2-c1-wt`, HEAD no objeto, sem `.env`, sem junction. Scratch exclusivo: `C:/Users/AMP/erp-pausa-2026-10-03/j22r2-c1/`.
- Variáveis previstas em cada comando Node/npm: `DATABASE_URL`, `REDIS_URL`, `CORE_SAAS_PERSISTENCE`; valores de segredo não serão publicados. Containers exclusivos: `j22r2-c1-pg` e `j22r2-c1-redis`; banco `j22r2_c1`; bind somente em `127.0.0.1:48021/48022` após conferência.
- Corpo do blob lido inteiro. Comparação EOL-neutra do arquivo carregado no worktree contra `git show <objeto>:.claude/agents/especialistas/jurado-san322-c1-banco-e-concorrencia.md`: `IDENTICO`; md5 EOL-neutro de ambos `8fca8229f50e7c04d5ed8739bc39c243`.
- As ferramentas antigas em `j22-c1o/` **não serão executadas no lugar**. Serão copiadas para `j22r2-c1/`, com worktree, portas, banco, pasta de saída e `OBJ` de restauro trocados para esta cadeira/objeto; o diff da cópia será publicado antes de rodar.
- Regra (2): toda conclusão do ciclo 1 é A RE-VERIFICAR; cada comando registrado será reexecutado no objeto novo e classificado `IGUAL`/`DIFERENTE`. Ciclo 2, unanimidade de 3 com veto; achado `bloqueia` + `dentro-do-bloco` reprova. Não li votos/evidências das outras cadeiras deste ciclo.

### Diff publicado das ferramentas copiadas (antes da execução)

Comando: `git diff --no-index` por arquivo entre `j22-c1o/` e `j22r2-c1/`; cópia integral em `C:/Users/AMP/erp-pausa-2026-10-03/j22r2-c1/copy-diff.txt`.

```diff
run-test.sh:
-S=C:/Users/AMP/erp-pausa-2026-10-03/j22-c1o
-PW=$(cat $S/j22-c1.pw)
-cd C:/Users/AMP/j22-c1-wt
-DATABASE_URL="postgresql://postgres:$PW@127.0.0.1:47921/j22_c1?schema=public" REDIS_URL="redis://127.0.0.1:47922" ...
+S=C:/Users/AMP/erp-pausa-2026-10-03/j22r2-c1
+PW=$(cat $S/j22r2-c1.pw)
+cd C:/Users/AMP/j22r2-c1-wt
+DATABASE_URL="postgresql://postgres:$PW@127.0.0.1:48021/j22r2_c1?schema=public" REDIS_URL="redis://127.0.0.1:48022" ...

probe.sh:
-S=.../j22-c1o; W=C:/Users/AMP/j22-c1-wt
-PW=$(cat $S/j22-c1.pw); DB=${4:-j22_c1}
-DATABASE_URL="postgresql://postgres:$PW@127.0.0.1:47921/$DB?schema=public" REDIS_URL="redis://127.0.0.1:47922" ...
+S=.../j22r2-c1; W=C:/Users/AMP/j22r2-c1-wt
+PW=$(cat $S/j22r2-c1.pw); DB=${4:-j22r2_c1}
+DATABASE_URL="postgresql://postgres:$PW@127.0.0.1:48021/$DB?schema=public" REDIS_URL="redis://127.0.0.1:48022" ...

mutrun.sh:
-S=.../j22-c1o; W=C:/Users/AMP/j22-c1-wt
+S=.../j22r2-c1; W=C:/Users/AMP/j22r2-c1-wt

restore.sh:
-O=44d9cbb3874e45340ca43c934364c3d0103c53b8
-W=C:/Users/AMP/j22-c1-wt
+O=6b03e44d8136792398f521ccaf85d8dd45168a6d
+W=C:/Users/AMP/j22r2-c1-wt
```

`mut.mjs`, `mutn.mjs`, `rawsql.mjs` e `zz-j22c1-probe.ts`: sem diferença. Assim, a cópia troca exatamente worktree, portas, banco, pasta de saída/senha e objeto de restauro; o script antigo não foi executado.

