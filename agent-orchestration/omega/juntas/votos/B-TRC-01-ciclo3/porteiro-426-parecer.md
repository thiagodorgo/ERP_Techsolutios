# Parecer — porteiro-pos-merge-426 (PR #426, B-TRC-01)

- **Papel:** porteiro-pos-merge · **modelo que rodou:** Opus (claude-opus-5-5), nível menor, declarado (`D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`). Sem fallback.
- **Ref medida:** `c1485c94f3e99a33f5b8f6aec96a12bc922a237e` (origin/main), worktree detached próprio `C:/Users/AMP/w-porteiro426` com `npm ci` próprio, já removido.
- **Evidência item a item:** `porteiro-426-evidencia.md` (mesmo diretório).

## O que foi executado (resultado)
1. **Merge:** `gh pr view 426` → MERGED, merge `c1485c94`, head `9b93df5f`. `git rev-parse c1485c94^{tree} 9b93df5f^{tree}` → idênticos: o squash é exatamente o head.
2. **CI:** check-runs de `9b93df5f` e de `7c220467` → 14/14 completed/success (7 jobs × 2).
3. **`npm run check`** → exit 0. A primeira tentativa deu exit 2 só porque o cliente Prisma não estava gerado no worktree novo; depois de `prisma generate`, com URL fictícia e sem conexão, passou. É ambiente, não produto.
4. **Traccar sem banco:** os 8 arquivos com `REDIS_URL=redis://127.0.0.1:1` → **70/70**, 0 falha, 0 pulo.
5. **As 6 suítes `-db` do Traccar** no container Linux próprio → **50/50**, 0 falha, 0 pulo, `ec=0`, teardown limpo. Bate com o 50/50 do orquestrador.
6. **T13** → **35/35**. Bate com o declarado.
7. **Docker:** antes de subir, 0 containers fora de `erp-*`; depois, nenhum container nem rede `tl*` restante.

## Achados
- **Delta pós-junta `7c220467..9b93df5f`, fora o que veio da `main`.** Não toca `src/` nem `prisma/`.
  - Toca só `agent-orchestration/**` (ata, votos, mandatos, inspetor, `R-ciclo2`), `docs/revisoes/TRACCAR/B-TRC-01-integracao-440-dev.md` e `tests/traccar-position-ingestion-db.test.ts` (+9/−2): o `assignVehicle` passa a mandar `event: {fromStatus: current.status, …}`.
  - O merge `770a74c1` não teve resolução manual: `--remerge-diff` sai vazio.
  - O #440 mexeu em `field-dispatch*.repository.ts` e o auto-merge foi limpo. O `vehicle_assigned_at` vem do gatilho (`20260876`), então as escritas novas do #440 o alimentam sem código.
- **Promessa × diff.** Tudo o que o corpo promete está no diff. Fora do corpo, mas coerentes com o bloco: `.github/workflows/ci.yml` (+11, as 6 `-db` na lista curada), `API_CONTRACTS.md` (+30), `.env.example` (+22), `src/database/rls.ts` (+81) e `field-location/*`. Ressalva menor de forma, que não bloqueia.
- **Migrações.**
  - `git ls-tree`: 20260874 → 75 → 76 → 77, ordenadas e sem prefixo duplicado.
  - A 20260877 entrou na `main` antes das 74–76.
    - Em base nova, a ordem é a numérica; o UPDATE da 77 (`migration.sql:96-103`) dispara o gatilho da 76 de forma conservadora.
    - Em base que já aplicou a 77, as 74–76 entram depois e as OS antigas ficam com `vehicle_assigned_at` NULL, o que falha fechado (está documentado na própria 76).
  - **NÃO medido:** o `_prisma_migrations` da base viva, que é proibida.
- **Regras do dono para o Traccar,** por `git grep` e por teste verde:
  - **Nenhuma porta pública:**
    - em `docker-compose.traccar.yml`, só `127.0.0.1:` nas linhas 37-38 e 41-42;
    - as redes são `internal: true` (linhas 18 e 23);
    - `src/app.ts` não foi tocado;
    - teste em `traccar-ingest-listener.test.ts:182`.
  - **Listener desligado por padrão:**
    - `src/config/env.ts:311` traz `booleanFlag(false)`;
    - teste em `traccar-ingest-listener.test.ts:249`.
  - **Token:**
    - comparado em tempo constante, com `timingSafeEqual` em `traccar-forward-auth.ts:14,57` e o teste espião em `traccar-forward-auth.test.ts:95`;
    - fora do log, por redact em `traccar-ingest.logger.ts:31-39` e pelos 9 testes "sem segredo" em `traccar-ingest-logs.test.ts:106-142`.
  - **`tenant_id` do payload:**
    - é chave reservada e dá 422, em `traccar-position.schema.ts:8-21`;
    - o teste `-db` `ok 20` está verde.
- **KPI congelado.** `Kpis/` não mudou nem em `40c3651f..c1485c94` nem em `7c220467..9b93df5f`.
- **Ata.** `J-B-TRC-01-ciclo3.md` existe: objeto `7c220467`, APROVADO 3×0, papéis registrados nas linhas 60-62 (plano em Fable). Os ciclos 1 e 2 têm ata e `R-*`.
- **Pendências.**
  - Os 11 IDs do §4 do plano do ciclo 3 e o (c″)-F1 deram **0 ocorrências** no `pendencias.md` da ref, como o orquestrador declarou.
    - Nenhum deles diz "bloqueia".
    - O "resíduo de terreno" (`w-jc2-b`, `w-jc2-b3`) já não aparece em `git worktree list`.
  - **Amostra de "fechada", verdadeira:**
    - "nada reescrito" está declarado em `B-TRC-01-ciclo3-dev.md:182`;
    - o `ebdf6374` não toca `prisma/`;
    - o (c′)-P1 está no código (`field-dispatch-prisma.repository.ts:43,47`) e o teste `ok 31` está verde.
- **Próximos alvos.** Nada aberto bloqueia o marco de KPI, a demonstração em dev nem o PR de registro.
  - O `P-O6R-B09` (`pendencias.md:3322`, ABERTA, "BLOQUEIA field-dispatch e a trilha do Mapa") vale para **feature nova** que grave ou leia o agregado de despacho.
    - Uma demonstração que só roda o código já mergeado (`scripts/traccar-dev-demo.mjs`) fica fora dele.
    - Se a demonstração exigir código novo em field-dispatch, ela cai sob o B09.
  - `P-TRC-LGPD`, `P-MOBILE-LGPD-GPS-SEM-PORTA`, `P-TRC-VINCULO-POSSE` e `P-TRC-AWS-ESTUDO-MIGRACAO` bloqueiam produção, staging com dado real, B-TRC-03 e B-TRC-06, e não dev.
- **Limpeza §C5,** só reportada:
  - a branch remota foi apagada;
  - a branch local `feat/traccar-b-trc-01` continua, no `w-trc01`;
  - `fix/o6r07cb1-despacho-atribui` (#440 MERGED) e o worktree `C:/Users/AMP/w-07cb1` continuam;
  - `fix/dash-perfil` aparece como já mergeada (worktree `w-dash`);
  - há 3 arquivos soltos sem rastreio no `w-trc01`: `.npmtest-503.log`, `check_md5.cjs` e `check_md5.js`;
  - zero arquivo rastreado apagado (`^ D` = 0);
  - o disco tem 29 GB livres, então não precisa de DEEP_CLEAN.

## Sem execução
- `_prisma_migrations` da base viva (proibida).
- `traccar-dev-topology.test.ts` (exige `docker compose`; fora do mandato).
- A suíte inteira `backend`/`backend-postgres`: usei como insumo os check-runs `success` do head.

LIBERADO COM RESSALVA: marco de KPI, demonstração em dev do ponto no mapa e PR de registro | o PR de registro precisa gravar em `controle/pendencias.md` as 11 pendências do §4 do plano do ciclo 3 e o (c″)-F1, cada uma com dono e teste de encerramento (o B-TRC-03 não começa sem elas); a limpeza pós-merge tem de remover a branch local `feat/traccar-b-trc-01` e a `fix/o6r07cb1-despacho-atribui` com o worktree `w-07cb1` (conferir antes se há processo vivo) e os 3 soltos do `w-trc01`; e a demonstração, se pedir código novo em field-dispatch, cai sob o `P-O6R-B09`
