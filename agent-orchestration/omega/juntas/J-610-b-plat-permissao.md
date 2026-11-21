# Ata da J-610: junta completa do PR #610 (B-PLAT-PERMISSAO, o antigo item 72)

**Redator:** `reg-2011-cl` (Claude Opus, nível menor, declarado), registro de 20/11. Fontes: a pasta da junta fora do
repositório (`composicao.md`, mandatos, `votos/`), as conferências e o parecer do porteiro, e o `gh pr view 610`.
**Objeto:** `7d2ac80e8ea66fcc7f4e1fb3eadae715b9c44f66` (PR #610, ramo `feat/plat-permissao`). É o merge da `main`
`ebdcf62f` sobre o conserto `090bf5ab`. Head-base do bloco `7b39c01a`.
**Nível e quórum:** junta completa (permissão de plataforma), **unanimidade de 3**, fluxo rápido do §C7 item 10(3).
O item 72 está fora do portão (`D-DONO-1711-72-FORA-DO-PORTAO`) e é pré-requisito da Fase 6 da AWS (`D-AWS-13`).
**Resultado:** 2 APROVA e 1 REPROVA (C3, só registro), sem defeito grave. Pela triagem do item 10(3), o achado da C3
era não grave e simples; foi consertado na mesma leva e conferido por quem não consertou, sem refazer cadeira
(item 10(4)).

## Antes da junta

- A lista de saída do dev `dev-plat-perm-azc` **não foi aceita** (`conf-saida-610-cl`): as mutações tinham sido
  provadas sobre uma suíte com 5 vermelhos.
- O diagnóstico `diag-610-dp` (DeepSeek Pro) achou 2 defeitos do bloco: a catraca do PrismaPg e a ordem de registro.
  Achou também 5 rotas que faltavam no instantâneo, defasado pelo merge.
- O conserto `fix-610-ar` (Argon) parou: o Postgres em 1º plano o prendeu por 50 min. O sucessor `fix-610-cl` (Claude
  Opus) chegou a `090bf5ab`, com CI 9/9.
- A conferência `conf-610-azc` (Azure) deu **CONFERIDO**.
- O ramo foi atualizado com a `main` por `merge-610-cl` (Claude), e o head ficou em `7d2ac80e`. Os registros que
  tinham virado CRLF no merge anterior (`fc1b4191`) voltaram a LF.

## Terreno

- **Inspetor:** `insp-j610-cl` (Claude Opus, nível menor; corpo da `origin/main` `ebdcf62f`), 20/11 de 12:48 a 13:06
  SP. Deu **LIBERADO COM RESSALVA**, com as ressalvas:
  - **R1:** o SHA completo nos mandatos estava errado; o orquestrador o corrigiu;
  - **R2:** `merge-610-cl` faltava na lista de inelegíveis;
  - **R3:** o insumo `conf-610-azc.md` estava danificado (NUL e escapes interpretados);
  - **R4:** havia resíduo inerte;
  - **R5:** os md5 dos mandatos estavam defasados no registro;
  - **R6:** os sinais de saúde estavam parados.
- O objeto tinha 18 check-runs `completed/success`.

## Cadeiras e votos

| Cadeira | Identidade | Modelo e casa | Voto | Achados |
|---|---|---|---|---|
| C1 · a autorização da plataforma falha fechado em toda rota | `jc1-610-ar` | Gemini 4 Argon (nível menor), Google | **APROVA** | 0 |
| C2 · a migração das 6 chaves só para o `super_admin` | `jc2-610-azc` | gpt-5.3-codex (Azure, nível Sol), OpenAI | **APROVA** | C2-N1 (nota, pré-existente) |
| C3 · regressão, escopo e registro | `jc3-610-dp` | DeepSeek Pro (nível menor), DeepSeek | **REPROVA** | C3-01 (bloqueia), C3-02 (nota) |

Não houve queda de cadeira.

## Achados e triagem (§C7 item 10(3))

Nenhum achado é grave (nenhum perde dado, vaza entre organizações, quebra permissão ou erra dinheiro).

| Id | Gravidade no voto | O que é | Destino |
|---|---|---|---|
| C3-01 | bloqueia, `dentro-do-bloco` | 6 pendências da lei faltavam em `pendencias.md` no objeto. Foram perdidas no merge `fc1b4191`, de 19/11. São `P-PLAT-PAPEL-SEM-RELEITURA`, `P-PLAT-PORTAO-SEM-ORG-PLATAFORMA`, `P-FRONT-ATALHO-SUPER-ADMIN`, `P-CLOUD-CHARGE-ROUTER-ORFAO`, `P-PARSE-ROLES-SEM-TRIM` e `P-VARREDURAS-SEM-USE-SEM-CAMINHO` | não grave (registro, não produto) e simples → consertado na mesma leva |
| C3-02 | nota | `decisoes.md` não tinha os ids do canal `d72-p1` e `d72-p2`, nem a nota "crítica r2 e Emenda 2 sem cruzamento" | consertado na mesma leva |
| C2-N1 | nota, pré-existente | o mandato dizia que o drill pulava no job `backend`, mas no objeto ele executa verde | levado para a ata, sem mudança |

**Lição do orquestrador:** para provar que um merge não perdeu nada, compare o resultado com **todos** os heads
anteriores do ramo, não só com a base.

## Conserto e conferência

- **Conserto** (passo 4): `fix-610c-cl` (Claude Opus; não achou), com head `c5f30058`. O porteiro mediu
  `git diff --numstat 7d2ac80e c5f30058`, que deu só registro:
  - `decisoes.md`, 5/0;
  - `pendencias-indice.md`, 41/35;
  - `pendencias.md`, 42/0.

  Nenhum arquivo de código mudou depois do voto.
- **Conferência** (passo 5): `conf-610c-dp` (DeepSeek Pro; não consertou) deu **CONFERIDO** em `c5f30058`:
  - as 6 pendências estão com texto igual ao do head anterior `6a9a8c24`;
  - os ids `d72` e a nota de cruzamento estão em `decisoes.md`;
  - o índice gerado é byte-idêntico ao versionado;
  - o CI deu 18/18.

## Desfecho

- **Merge:** squash `3b7351e7` às 14:26 SP de 20/11 (`gh pr view 610`: `mergedAt` 2026-11-20T17:26:05Z). Head
  aprovado `c5f30058`, com árvore igual à do squash.
- **Porteiro:** `porteiro-610-cl` (Claude Opus, nível menor) deu **LIBERADO COM RESSALVA**. O próximo start é a F1 do
  `B-USERS-CONCESSAO-PAINEL`, a partir da `main` ≥ `3b7351e7`.
  - Reexecutou 49 testes (48 passam e 1 é pulado: o drill exige banco). Matou por mutação a checagem de permissão.
  - Mediu o CI do merge: backend 7228/7226/0 fail, 2 pulados; backend-postgres 1009/1009.
- **Ressalvas do porteiro e onde ficaram:**
  - (1) marcar `P-PLATAFORMA-PERMISSAO-IGNORADA` como resolvida pelo #610, absorvendo a `P-PLAT-PORTAO-SEM-PERMISSAO`
    da F4, e gravar esta ata: feito neste registro;
  - (2) a Fase 6 da AWS só começa depois deste registro e com a migração `20260905000000` aplicada na AWS
    (`P-AWS-MIGRADOR`);
  - (3) o resíduo `pg-platperm-initdb.log` foi removido;
  - (4) o ramo da concessão ainda não tinha o #610; a F1 o trouxe (`a6f6973c`).
