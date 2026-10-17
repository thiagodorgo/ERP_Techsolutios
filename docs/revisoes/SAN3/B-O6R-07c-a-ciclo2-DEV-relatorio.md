# B-O6R-07c-a — ciclo 2 — relatório incremental do desenvolvedor

> **Papel:** desenvolvedor do ciclo 2 · **identidade:** `dev-07ca-ciclo2` (nova; não achou os defeitos, não planejou —
> §C7.4-bis). **Modelo que de fato rodou:** Claude Opus 5.5 (`claude-opus-5-5`), nível menor, por
> `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO` (topo só no plano e na auditoria de reprovação; dev no nível menor).
> **Fonte:** `docs/revisoes/SAN3/B-O6R-07c-a-ciclo2-auditoria-e-plano.md` (§2), ramo `fix/o6r07c-subresource-scope`,
> head `bd504cc4072ef26b022356abf4328c38dcb79a6e`, worktree `C:/Users/AMP/w-07ca` (o do orquestrador, por ordem do
> disparo; o §2.9 do plano nomeia `C:/Users/AMP/w-dev07ca2` — divergência registrada, vale o disparo).
> **Ambiente:** Windows 11, Git Bash `MINGW64_NT-10.0-22631 3.6.6`, Node v20.19.5, `node_modules` do worktree (222
> entradas, sem junction). Nada exportado por conveniência. Disco C: 18 GB livres no início.

Formato de cada passo: **comando** · **saída resumida** · **estado**.

## Passo 0 — terreno e leitura (19:2xZ–19:44Z)

- `git rev-parse HEAD` → `bd504cc4…`; `git status --short` vazio; ramo `fix/o6r07c-subresource-scope`;
  `git log 46b44dad^..bd504cc4` → só o commit do plano (`bd504cc4`) sobre o objeto da auditoria (`46b44dad`).
- `git worktree list` → main, `w-03a`, `w-07ca`, `w-agapi`, `w-govmod`, `w-pvpr`, `w-traccar` (sem `w-aud07ca`).
- `df -h /c` → 18 GB livres. `node -v` → v20.19.5. `ls node_modules | wc -l` → 222.
- Lidos inteiros: o plano do ciclo 2 (§1 e §2), a ata do ciclo 1, o voto e a evidência da C2 (formas C2a/C2b/C2c, MG3b,
  km_c2), o relatório do dev do ciclo 1, o helper `tests/helpers/o6r07c-census.ts` (588 l.), o guard
  `tests/o6r07c-census-guard.test.ts` (304 l.) e as fixtures de forma.
- EOL medido (`git ls-files --eol`): `src/**` dos 3 arquivos de produto = `i/lf w/crlf`; helper, guard, fixtures de forma e
  o instantâneo = `i/lf w/lf`.
- PAR do instantâneo por lote (leitura do fixture): `work-order-actions` 4 (OS·SEM-ALCANCE ×2, OS·07c-a, OS·07a);
  `checklist-actions` 14 (VISTORIA·07c-b ×12, OS·SEM-ALCANCE ×2); `inventory-actions` 3 (SEM-ALCANCE-CAMPO);
  `evidence-actions` 6 (N ×3 `evidence.field_*`, EVIDENCIA-OS·07c-b ×3); `expense-actions` 3 (R).
- **Estado:** leitura concluída; nenhuma linha de código escrita; nenhuma mutação aplicada.

### Observações de premissa já anotadas (a medir antes de codar, ainda NÃO medidas)

1. §2.5 `tocaCorpo` para `PAR`: o plano manda o censo de lotes receber `c3.semente.osA`; o censo de camadas e o de lotes
   rodam em **processos filhos distintos** com `CORE_SAAS_PERSISTENCE=memory` (helper l.47-48, 212-213, 535-536) — a OS da
   semente não existe no processo de lotes. A medir (GET da OS no processo de lotes) antes de decidir; a decidir pela regra
   do plano (R3: divergência do instantâneo é defeito do remédio).
2. §2.5 `LOTES_DA_OS`/`LOTES_DE_VISTORIA` "derivados do instantâneo": o lote de vistoria também tem pares `OS·SEM-ALCANCE`
   (`checklist.run_create`, `checklist_run.create`), então "lote com par de classe `OS·*`" incluiria os dois; e no modo
   `gravar` o `classificar` roda sem instantâneo. A regra exata de derivação fica a definir e registrar.
3. §2.5 × T12 existente: com a pertença por lote, o `km_rapida` do N3c (lote de OS) passa a "(na propriedade)" — a
   asserção atual do N3c espera `NAO-CLASSIFICADA:` (fora). E os pares do lote injetado F6 (`prefixo-actions`, fora dos
   lotes registrados) deixam de ser "(na propriedade)" se o prefixo sair da regra. A tratar ao implementar.

## PAUSA 2026-10-10T19:44Z

Ordem de pausa do orquestrador (ordem do dono), recebida durante a leitura.

- **Head:** `bd504cc4072ef26b022356abf4328c38dcb79a6e` (ramo `fix/o6r07c-subresource-scope`), worktree `C:/Users/AMP/w-07ca`.
- **Feito:** só o Passo 0 (terreno e leitura). Comandos e saídas acima. Nenhuma edição em helper, guard, fixtures ou
  registro.
- **Mutações em `src/**`:** **nenhuma aplicada**. Hash conferido às 19:44Z (`git hash-object` × `git rev-parse 4ca2be43:<f>`):
  `mobile-work-order-sync.ts` `7ba80969…` = `7ba80969…`; `mobile-evidence-sync.ts` `be699c9d…` = `be699c9d…`;
  `work-order.routes.ts` `0ee705e9…` = `0ee705e9…`. `git diff --stat 4ca2be43 HEAD -- src` vazio. `git status --short`
  vazio antes de gravar este arquivo (o único arquivo novo agora é este relatório, não rastreado).
- **Arquivos meio-escritos:** nenhum além deste relatório (completo até esta seção).
- **Containers / temporários:** nenhum criado (0 `dev07ca2-*`); nenhum `o6r07c-*` meu no tmpdir; scratchpad sem arquivo meu.
- **Falta (tudo do §2.2–§2.9):**
  1. medir as 3 premissas acima (tocaCorpo entre processos; derivação dos lotes; N3c/F6 sob a pertença por lote);
  2. helper: `walk` com sub-app por duck-typing (§2.2); extrator fail-closed por posição com `get`/`in`/`hasOwn`/
     `Reflect.has`, derivados e chamada não resolvida em `naoResolvidos`, exclusão da chamada de método `.type(` da semente
     (§2.3), medindo o produto antes (R1: parar se > 10 entradas novas); multiconjunto nas duas allowlists (§2.4);
     pertença do PAR por lote + `tocaCorpo` (§2.5); sonda por destino com os literais da fonte e `TIPO-FORA-DO-DESPACHANTE`
     (§2.6); cabeçalho com alcance (portal-app) e residual R5;
  3. guard: T14, `CATEGORIAS` com a categoria nova, 5 subtestes novos no T12 (MG3b, C2a/C2c, C2b, C2-km, C2-cego),
     `prova-tipos` ampliado, caso `km_c2 = R` no B3;
  4. fixtures `inject-mg3b.mts`, `inject-c2-mapa-in.mts`, `inject-c2-sufixo.mts`, `inject-c2-km.mts`,
     `inject-c2-cego.mts` e `grupo-a.mts` (cada uma sozinha e depois em grupo);
  5. `gravar` + `cmp` byte-idêntico; MG17–MG26 uma a uma com restauro provado; caminho do preguiçoso (MG20, MG21);
  6. bateria do §2.9 (cluster `dev07ca2-*`, régua de 80 regenerada, `npm test` em container Linux, build, sync --check,
     `git diff --check`, hash do produto);
  7. registro do §2.7 (pendencias.md APPEND, índice pelo gerador, decisoes.md APPEND, log-execucao.md).
- **Próximo comando exato (retomada):**
  `cd C:/Users/AMP/w-07ca && git rev-parse HEAD && git status --short && grep -n "work_order_id\|workOrderId" src/modules/mobile/mobile-inventory-sync.ts src/modules/mobile/mobile-evidence-sync.ts src/modules/expense-management/expense-management.service.ts | head -40`
  (primeira medida da premissa 1: quais lotes leem `work_order_id` do corpo, antes de implementar o `tocaCorpo`).
