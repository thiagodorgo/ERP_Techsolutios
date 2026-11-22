# J-624 — junta completa do PR #624 (pátio: veículo só sai com diárias lançadas e pagas, `B-PATIO-LIVRO-VAZIO`)

- **Defeito de origem:** GRAVE de dinheiro; com o livro vazio, a liberação tratava a dívida como quitada.
- **Decisões do dono, como limite:** opção (a), P2 = recusa e P3 = (i).
- **Objeto votado:** `bd34e3efddf20bd73ce7e5a1c16f8863445ea88e`; **objeto final aprovado:** `357f4c7ac1743e880e3c48f514487a50074af551`; squash na `main`: `6235b894e`.
- **Composição:** inspetor e três cadeiras Claude Opus, nível menor declarado; quórum de unanimidade de três por envolver dinheiro. O desenvolvimento foi feito por outra casa.
- **Votos:** C1 APROVADO, com três achados não graves; C2 APROVADO, com sete achados não graves; C3 REPROVADO somente pelo C3-01, não grave; zero achado grave.
- **Triagem:** 17 itens para o conserto único, cinco pendências novas e três sem ação; nenhuma cadeira refeita, conforme §C7 item 10(4).
- **Conferência independente:** CONFERIDO; chamadas recusadas não escrevem no livro, contrato e código coincidem, as mutações previstas ficam vermelhas sem o conserto e os totais da liberação, do evento e do livro são iguais.
- **CI do objeto final:** `backend` 7631 pass/0 fail; `backend-postgres` 1271 pass/0 fail.

**Resultado: merge pelo fluxo rápido (§C7 item 10(3)), sem unanimidade no voto.** Na votação, C1 e C2 deram APROVADO e a C3 deu REPROVADO, só pelo C3-01, não grave. Nenhuma cadeira achou defeito grave. O C3-01 foi para a triagem e entrou no conserto único (o `API_CONTRACTS.md` §3.12 passou a dizer só as razões que o código emite). A conferência independente deu CONFERIDO, e nenhuma cadeira foi refeita, porque o conserto não mudou regra de dinheiro fora do que os achados apontavam (§C7 item 10(4)). *(Correção de `dev-628-fix3-cl`, Claude Opus: a versão anterior desta linha dizia "APROVADO por unanimidade de 3", o que contradiz a linha Votos; achado A1 de `rev-628b-cl`.)*
