# J-565: ata da junta completa do PR #565 (B-SAN3-10b-F4-SEED-ISOLADO, item 44: fundação, motor e verificador da demonstração isolada)

**Orquestrador:** Claude Opus 5.5, em 14/11, às 20:2x SP (horas medidas por `date`).

- **Objeto votado:** `ba3e641f` (`ba3e641f1e15e05720cb40ce14f8a952dbdf540d`). As três cadeiras registram esse objeto no próprio voto.
- **Head atual:** `222f21ed`, um merge por união com pais `ba3e641f` e `eeac48a3`, o head da `main`.
  - A absorção foi feita pelo `merge-565-cl`, que fechou o diário às 20:24 SP.
  - CI do head atual: **16/16 verde**, nas rodadas push `43619796396` e pull_request `43619800777`.
    - backend: 5794 testes, 5792 passam, 0 falha e 2 pulos do `RBAC_DB_PARITY`; o C4-db rodou sem pulo.
    - backend-postgres: 621/621.
    - frontend: 1806/1806.
- **Fluxo:** a pré-revisão deu APROVADO com 5 BAIXA, que viraram a Emenda 1.6. O inspetor `insp-565-cl` deu **LIBERADO COM RESSALVA** (R1 a R5, incorporadas ao briefing). Depois veio a junta completa, com as cadeiras em paralelo (`D-JUNTA-PARALELA-1011`).
- **Quórum:** unanimidade de 3.
- **Cruzamento (§C7 11), declarado:**
  - O briefing mandava a C-SEG ao Codex 3 e a C-DADO ao DeepSeek.
  - A C-SEG do Codex 3 (`cseg-10bseed-cx3`) caiu duas vezes. Na primeira, a pilha morreu com a queda do Docker às 10:10, e o orquestrador parou a cadeira às 10:19. Ela foi relançada às 10:42 e morreu de novo às 11:26, por limite de uso do Codex 3 (`votos/00-quedas.md` e a evidência da própria cadeira). O voto dela ficou em `EM_APURACAO` e **não conta**. A correção veio da ressalva PORT565-02 da porteira.
  - A C-SEG foi feita pela suplente Claude `cseg-10bseed-cl2`, pela R9, sem cruzamento, declarado.
  - A C-DADO ficou com o DeepSeek, com cruzamento.
  - A C-ROT ficou com o Claude, como o briefing previa.

## Votos
| Cadeira | Identidade | Modelo | Objeto | Voto | Achados |
|---|---|---|---|---|---|
| C-ROT | `crot-10bseed-cl` | Claude Opus 5.5 | `ba3e641f` | **APROVA** | **CROT-565-01**, não grave, dentro do bloco (abaixo) |
| C-SEG | `cseg-10bseed-cl2` (suplente da `cseg-10bseed-cx3`, R9) | Claude Opus 5.5 | `ba3e641f` | **APROVA** | nenhum |
| C-DADO | `cdado-10bseed-dp` | DeepSeek Pro (DP) | `ba3e641f` | **APROVA** | nenhum |

**Resultado: APROVADO por unanimidade, sem achado grave.**

### CROT-565-01 (não grave, dentro do bloco)
- **O que a cadeira achou:** a regra de e-mail do C11 (v2 §6.4: "e-mail fora de `@exemplo.invalid`: 0"), aplicada à letra nas linhas acrescentadas, dá **1** e não 0.
  - A linha é `"postgresql://u@db.exemplo.invalid:5432/x"`, em `tests/demo-isolado-alvo.test.ts:86`. Esse é o caso de URL de banco recusada que o próprio plano exige à letra (v2 §6.2 C2b e §6.3 V6).
  - O comando da cadeira: `git diff origin/main...ba3e641f -U0 | grep '^+' | grep -v '^+++' | grep -E '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' | grep -vE '@exemplo\.invalid' | wc -l` dá `1`.
- **A propriedade está preservada:** o texto é o usuário de uma URL de teste num subdomínio do domínio reservado `.invalid`. Não é e-mail real nem conteúdo privado, e o Dev B já o declarou no PR.
- **O que há a corrigir:** a letra do C11 contradiz a do C2b, então o defeito é do plano, não do código. A cadeira não propõe correção (§C7.4-bis).
- **Destino, pelo §C7 10(4) (não grave que fica depois da junta):** vira a pendência **`P-565-C11-EMAIL-X-URL-INVALID`**. O regex do C11 deve aceitar também os subdomínios de `.invalid`, como `@[a-z0-9.-]*exemplo\.invalid`, ou o plano declara a exceção do C2b. Vai para o registro.

## A absorção da `main` depois do voto
O objeto votado é `ba3e641f`. O head que vai à `main` é `222f21ed`, que só acrescenta a `main` `eeac48a3` por união. A **porteira** confirma que a absorção não mudou o conteúdo do bloco: para os arquivos que o PR toca, `ba3e641f` contra a união deve diferir só no que veio da `main`. Ela também confirma o CI 16/16 do head atual, a ausência de caminho local no diff e o PR fora de rascunho no momento do merge. Se a absorção tiver mexido em regra do bloco, a junta volta (§C7 10(4)).

## Encaminhamento
1. Porteira do #565 no head `222f21ed`.
2. Com LIBERADO: `gh pr ready 565`, merge, e as travas `isDraft==false` e `state==MERGED` com `|| exit 1`, cada uma em linha própria. Só depois vem a limpeza pós-merge, em passo separado.
3. Pendências para o registro:
   - `P-565-C11-EMAIL-X-URL-INVALID`;
   - o voto morto da `cseg-10bseed-cx3` (queda do Docker às 10:10) e a suplência pela R9;
   - os 6 diretórios `demo-isolado-cli-*` em `%TEMP%` (11:25–11:26 SP), que são resíduo alheio, só registrado.

## Adendo do registro (`reg-1611-cl`, 16/11)
As horas são de São Paulo; o merge e o head vêm de `gh pr view`, e a CI do merge, de `gh run list --commit`. O resto vem do diário do orquestrador, fora do repositório.
- **Merge:** squash `adec93ce` na `main` (14/11 20:52), do head `222f21ed`.
- **Porteira:** LIBERADO COM RESSALVA (PORT565-01: o PR ainda em rascunho na hora da medição; PORT565-02: a causa da morte da C-SEG do Codex 3). A `P-565-C11-EMAIL-X-URL-INVALID` desta ata é a mesma classe já registrada como `P-SEED-C11-CONTRADIZ-C2B` (CROT-565-01, #570), que segue valendo; não se duplica.
