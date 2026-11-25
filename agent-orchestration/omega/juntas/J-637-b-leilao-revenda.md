# J-637 — junta completa do PR #637 (revenda quando o arrematante não paga, `B-LEILAO-REVENDA`)

- **Objeto da 1ª votação:** `d0362937b`; **objeto final aprovado:** `f87579493`; squash na `main`: `cae731c0` (19:35).
- **Composição:** inspetor + três cadeiras DeepSeek Pro, nível menor declarado; quórum de unanimidade de três por envolver dinheiro. Código escrito por outra casa (Codex 7, Azure e Claude Opus).

## 1ª votação
- **Inspetor BLOQUEADO** (`inspetor-parecer-1-bloqueado.md`): as cadeiras C2 e C3 montaram terreno e a C1 produziu voto antes da liberação do inspetor. A emenda do mandato passou a admitir o terreno das cadeiras em paralelo, e o 2º inspetor (`insp-637b-dp`) deu **LIBERADO**.
- **Votos:** C1 APROVA (rateio, livro de diárias e lance não pago), C2 APROVA (uma vez só, relote e lance mínimo em lote), C3 APROVA (regras do dono, permissão e contrato) — unanimidade de 3.

## O defeito grave achado depois da junta
- **`revtela-637-op` (revisor de telas), DEFEITO:** o **D1 grave** — na revenda, o painel sugere como rodada padrão o último edital `DESIGNATED`, que depois de uma rodada deserta é a rodada deserta; o backend aceitava a avaliação em qualquer edital `DESIGNATED` e reescrevia sem rastro a avaliação e o lance mínimo do certame encerrado (`12000.00/6000.00` → `9000.00/4500.00`). **D2 não grave** (o teste do painel lê o texto-fonte) e **R1 a R4** não graves.
- **Emenda 2.4** (com a 2.4.1 e a 2.4.2, e as decisões `D-DONO-2411-REVENDA-K3-JUNTO` e `D-DONO-2411-REVENDA-K5-A1`): a avaliação só na rodada nova, em todo estado, e a rodada com resultado fechada para avaliação.
- **Conserto único** (Codex 6 + Azure), **conferência `conf-637-dp` CONFERIDO** (18:29): sondas antigo/novo, vermelhos novos por valor com restauro provado, 6 mutações mortas, forma e escopo ok, CI do head com `fail 0`.

## Revotação (E2.4.2-K6: o conserto mudou regra de dinheiro além do D1)
- **Inspetor `insp-637c-dp` LIBERADO:** prova da trava dos votos carregados com `git diff --name-only d0362937b..f87579493` (20 arquivos). Carregam a C2 itens 1–2; a C3 não carrega (o `.github/workflows/ci.yml` mudou fora dos itens refeitos, vindo do merge da `main`).
- **C1b refeita APROVA:** RV26/RV24 verdes no objeto novo e vermelhos no antigo e na base; regressão dos caminhos legítimos verde; mutação própria morta.
- **C2 itens 1–2 carregados** (o inspetor provou) **e C2b item 3 refeito APROVA:** RV17, RV27 (nas duas ordens da trava) e RV10, 6 de 6; mutação própria morta.
- **C3b revalidada (regra 9(2)) APROVA:** re-executa a evidência da C3 no objeto novo, e a saída igual mantém o verde.
- **Unanimidade final no objeto `f87579493`.** CI do head 18/18: `backend` 7857/7855, fail 0, skipped 2; `backend-postgres` 1415/0; `frontend` 2128/0.

**Resultado: merge pelo fluxo rápido, com unanimidade do conjunto (votos carregados + refeitos).** **Lição registrada:** o revisor de telas foi arranjado tarde — a junta unânime não viu o D1, e a camada de renderização o achou depois; o revisor de telas passa a ser etapa fixa antes de toda junta de bloco com tela (decisão do dono, por PR).
