# J-597: ata da junta completa do PR #597 (B-GUI-D1: destino e veículo atendido da OS chegam ao app; a placa só mascarada)

**Orquestrador:** Claude Opus 5.5, em 17/11. A ata foi escrita em 18/11 pelo PR de registro.
**Objeto:** `02009efe` (PR #597, ramo `feat/gui-d1-dados-da-os`).
**Fluxo:** completo (§C7 10), com unanimidade de 3. Tela de app, permissão e escopo; sem porteiro (não é item do portão).

## Terreno

O inspetor `insp-597-cl` (Claude) deu **LIBERADO COM RESSALVA** (R1 a R7, cada uma com a cadeira dona).

## Cadeiras e votos (3 de 3 APROVA)

| Cadeira | Identidade | Modelo | Voto | Achados |
|---|---|---|---|---|
| C1 · servidor, contrato e máscara | `j597-c1-servidor-cl` | Claude Opus 5.5 | **APROVA** | C1-01, C1-02, C1-03 |
| C2 · app | `j597-c2-app-dp` | DeepSeek Flash | **APROVA** | C2-01 |
| C3 · escopo, regressão e registro | `j597-c3-escopo-cl` | Claude Opus 5.5 | **APROVA** | C3-N1, C3-N2 |

- **Cruzamento:** a C2 é a outra casa (DeepSeek Flash); a C1 e a C3 são Claude, com "sem cruzamento" declarado.
- **Quedas:** nenhuma.

## Achados não graves (na leva do conserto, sem reprovar)

| Id | O defeito |
|---|---|
| **C1-01** | A guarda da lista fechada (D2) não cobre a forma residencial real nem as outras chaves que o título promete. O produto não vaza (sonda no objeto), mas duas mutações fazem um dado de `serviceDetails` vazar por outro campo da lista. |
| **C1-02** | Nenhum teste do servidor pega o FIM da placa chegando por outro campo da lista (a MYD sobrevive); a trava é a D7 do app. |
| **C1-03** | Pré-existente: a placa digitada em texto livre (que não é modelo nem cor) chega inteira à lista por `title`/`serviceAddress`/`destinationAddress`. Amplia a `P-OS-PLACA-NO-TEXTO-LIVRE`. |
| **C2-01** | Três comentários de fixture contradizem a asserção ao lado (dizem "schema 16/18" com `expect(userVersion, 19)`). |
| **C3-N1** | 2 das 3 pendências novas têm como dono um bloco que não existe e não tem ID (`P-OS-REBOQUE-SEM-MODELO-E-COR`, `P-OS-PLACA-NO-TEXTO-LIVRE`). |
| **C3-N2** | Pré-existente ao objeto: a `main` `89cf79fe` cruza o objeto por nome em `API_CONTRACTS.md` (hunks disjuntos). |

## Triagem (§C7 10(3))

- Nenhum grave. **Entram no conserto simples:** C1-01, C1-02 e C2-01 → conserto único `fix-597-cl` + integração da `main`.
- **C1-03** → ampliar a `P-OS-PLACA-NO-TEXTO-LIVRE`.
- **C3-N1** → dono `B-WO-FORM-VEICULO` (bloco de backlog, decisão do orquestrador).
- **Emenda 1.2 do B-GUI-D1** (conflito de sentido #595 × #597, medido na árvore fundida): D7a e D7b passam a seguir o percurso do FID1, nas 3 aparências; o mesmo dev aplica.

## O conserto e a conferência

- **Dev:** `fix-597-cl` (Claude, identidade nova), head `9ccefc9b`; a Emenda 1.2 aplicada; MYA/MYB/MYD vermelhas sem o conserto; produto intocado.
- **Conferência:** `verif-597-df` (DeepSeek Flash, outra casa), **CONFERIDO** — C1-01/C1-02/C2-01/C1-03+C3-N1 resolvidos; os 3 votos revalidados pela regra (2) com conclusão igual.

## Desfecho

- **Merge:** squash `47be5f51` (17/11 21:08). Sem porteiro: o B-GUI-D1 é tela do app, fora do portão.