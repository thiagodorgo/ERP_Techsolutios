# Parecer do porteiro pós-merge — PR #440 (B-O6R-07c-b1, `Ω6R-SEC-002`)

- **Papel · modelo:** `porteiro-pos-merge-440` (identidade nova) · **Claude Opus** (nível menor, declarado; `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`).
- **Ref medida:** `40c3651f066278654e2c71df4c3b38e1d90994c8` (topo de `origin/main`), por `git show`/`git ls-tree`; testes num worktree detached próprio (`C:/Users/AMP/w-porteiro440`, `npm ci` próprio, já removido).
- **Evidência comando a comando:** `porteiro-440-evidencia.md` (mesmo diretório).

## O que executei e o resultado
1. **O merge está íntegro.** `git log origin/main -3` e `gh pr view 440`: o PR está MERGED, o merge commit é `40c3651f` e o head é `a8977a0f`. A árvore de `a8977a0f` é igual à de `40c3651f` (`6c5b3ebd`). De `7ff1e003`, o objeto julgado, até `a8977a0f` mudaram só registro e governança (17 arquivos, nenhum em src/tests/prisma).
2. **Promessa × diff.** O diff próprio é `a26f8afe..40c3651f`, com 69 arquivos. Toda promessa do corpo aparece no código:
   - a trava única (`work-order.service.ts:1759`), chamada em `:1714` e `:1825` e em `field-dispatch.service.ts:264`, `:571` e `:657`;
   - 403 ao ativar rascunho (`field-dispatch.service.ts:954`);
   - 409 para OS encerrada (`:968`);
   - `rejected not_found` para evidência (`mobile-evidence-sync.ts:276`);
   - reatribuir à mesma pessoa é no-op (`work-order.service.ts:1763`).

   A migration `20260877000000_backfill_…` não é destrutiva: o DELETE só aparece no comentário de rollback. A autorização nominal está em `decisoes.md:3664` (P6). Os arquivos que o corpo não cita estão na lista PERMITIDA do plano do ciclo 2. Nada cresceu em silêncio.
3. **Números reexecutados:**
   - `npm run check` passou limpo.
   - `o6r07c-b-scope`: **187/187**. É o número do corpo.
   - `o6r07c-subresource-scope`: 24/24.
   - `san3-05-acessos-de-plataforma-guard`: 35/35 com `--test-concurrency=1`. Nas rodadas concorrentes houve 2 falhas, e as duas foram OOM no processo-filho do gerador: o commit da máquina chegou a 386 MB livres, e a falha mudava de subteste a cada rodada.
   - `o6r07c-b-scope-db`: **13/13** num Postgres próprio (`porteiro440-pg`, porta 55440, já removido). Havia no Docker 1 trabalho de outro agente, então eu fui o 2º.
   - `o6r07c-census-guard`: T0–T11, T13 e T14 passaram, incluindo T14 (gerado == instantâneo) e T11 (lista ·07c-b vazia). T12 e "tempo do censo" não puderam ser medidos aqui porque o processo morreu sem memória (`Fatal process out of memory`).
   - CI do head `a8977a0f`: 14/14 check-runs completed/success.
   - **Não reexecutado:** a suíte backend inteira (3565/3563), por pressão de memória na máquina.
4. **KPI.** `git diff a26f8afe 40c3651f -- Kpis/` deu 0 linhas, então o KPI segue congelado e intocado.
5. **Junta.** As atas dos ciclos 1 (REPROVADO 1×2) e 2 (APROVADO 3×0) existem. Os três votos dizem APROVADO, o inspetor deu LIBERADO, e o objeto votado foi `7ff1e003`.
6. **Pendências conferidas na ref:**
   - `P-07CB1-CANCELAR-EM-NO-LOCAL` (l.11180) e `P-07CB1-ATRIBUICAO-WEB-COM-DESPACHO-ATIVO` (l.11174) estão registradas, com dono `B-O6R-07c-b2`.
   - **K2 após reinício e CA6/CA7 NÃO estão em `pendencias.md`.** A ata do ciclo 2 (l.45-49) diz "já registradas", o que contradiz o próprio C3c2-A2 da mesma ata (l.37).
   - As 8 do C3c2-A2 estão ausentes: K2, `P-07CB1-RESIDUAL-BACKFILL` e as 6 notas da §1.5.
   - O `omega/reprovacoes/R-B-O6R-07c-b1-1.md` pedido no §2.11 do plano não existe.
   - **Amostra de "fecha":** `P-CONFLITO-INICIO-ATENDIMENTO`. É verdade: `DISPATCH_SERVICE_STARTED = {arrived, in_service}`, sem `on_route` (`field-dispatch.service.ts:81`), e o resolver está ligado em `work-order.service.ts:2205-2208`.
   - **Nenhuma** pendência do #440 bloqueia o B-TRC-01 nem o PR de registro. As que bloqueavam o B-TRC-01 (FORMA-QUATRO-OU-SETE, AWS-FLY-PRAZO, CONVIVENCIA-APP, PLANO-V22) estão FECHADAS.
7. **`Ω6R-SEC-002` no papel: o registro NÃO permite dizer P0 = 0.**
   - `docs/revisoes/O6R/achados.jsonl:9` ainda diz `status: parcialmente_superado`, e 16 de 17 P0 estão fechados.
   - O critério de código (CE-2, `PLANO_SAN3.md:325`) se sustenta pela junta e pela minha reexecução parcial. Para fechar no papel faltam:
     - (a) `achados.jsonl:9` → `fechado`, `fechado_por: B-O6R-07c-b1 (PR #440, 40c3651f)`, `fechado_em` e `evidencia_fechamento`;
     - (b) `P-O6R-SUBRECURSO-OBJECT-SCOPE` (`pendencias.md:6714`, status em l.6766) → FECHADA;
     - (c) `P-O6R-B07` (l.3156): registrar que o residual do SEC-002 fechou e que ela fica aberta só pelo SEC-004;
     - (d) `P-O6R-07CB-EMENDA-DECISOES` (l.11078) → FECHADA;
     - (e) `P-CONFLITO-INICIO-ATENDIMENTO` (l.11143) → FECHADA;
     - (f) `Kpis/kpis-latest.json:136` (`p0_abertos: 1`) fica para o marco do loop de KPI, porque o KPI está congelado e não é cobrança deste merge.
8. **Limpeza §C5:**
   - **A branch remota `fix/o6r07cb1-despacho-atribui` NÃO foi apagada** (`git ls-remote` = 1).
   - A branch local está presa ao `w-07cb1`, do orquestrador.
   - O worktree `C:/Users/AMP/w-j07cb1c2-c2` (detached `7ff1e003`, limpo) sobrou do jurado C2, embora a ata diga "worktrees removidos".
   - Nenhum arquivo rastreado foi apagado. Há 27 GB livres.

## Não executado
- A suíte backend completa (3565 testes): pressão de memória da máquina.
- Os subtestes T12 e "tempo do censo" do `o6r07c-census-guard`: OOM local. A CI do head está verde.

LIBERADO COM RESSALVA: merge do B-TRC-01 (#426, após a junta do ciclo 3) e o PR de registro | no PR de registro: append das 8 pendências do C3c2-A2 (incluindo K2-após-reinício e CA6/CA7, que a ata diz "já registradas" e não estão), o `R-B-O6R-07c-b1-1.md`, e o fechamento no papel do `Ω6R-SEC-002` (`achados.jsonl:9` e pendências 6714/3156/11078/11143). Antes disso: apagar a branch remota `fix/o6r07cb1-despacho-atribui` e o worktree `w-j07cb1c2-c2`. Até o registro, P0 = 0 não pode ser declarado.
