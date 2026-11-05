# J-498 — junta do PR #498 (B-ASS-01, Cloud Billing sem markup), 2026-11-04/05

- **Objeto julgado:** `2e44bd583df807770159fcba4553080d52dda6c6` (head do PR #498 antes do update-branch).
- **Régua:** bloco que MEXE EM PERMISSÃO (o menu passa a exigir `platform:cloud-cost-allocation:read`) e retira 9 rotas — junta completa, unanimidade de 3 com veto (§C7 item 10(1)). Cada cadeira entrega a lista completa de achados, cada um com o comando que o reproduz (§C7 item 10(3)).
- **Briefing:** `revisoes/j498/BRIEFING.md` (fora do repositório), 04/11.
- **Dev:** `dev-ass01-sol` (Codex), com retomada e conserto da pré-revisão. Diário em `docs/revisoes/ASSINATURA/B-ASS-01-dev.md`.
- **Pré-revisão:** `prerev-498-opus` (Claude Opus), APROVADO COM AJUSTES.
- **Crítica do plano:** `crit-ass01e-sol` (Codex), identidade nova.
- **Inspetor de terreno:** `insp-498-sol` (Codex GPT-5.6 Sol, nível menor declarado). **LIBERADO COM RESSALVA** (o PR estava 1 commit atrás da `main`, sem contaminação de corpos, contrato ou mergeabilidade).

## VEREDITO: 2 APROVADO × 1 REPROVADO, nenhum achado grave (triagem da Emenda 3)

| cadeira | identidade | executor e modelo | voto | achados |
|---|---|---|---|---|
| C1 rotas, job e menu | `jurado-j498-c1-sol` | Codex GPT-5.6 Sol | **APROVADO** | nenhum |
| C2 tela e documentos | `jurado-j498-c2-sol` | Codex GPT-5.6 Sol | **APROVADO** | `C2-OBS-01` (BAIXA) |
| C3 tabelas intactas e regressão | `jurado-j498-c3-sol` | Codex GPT-5.6 Sol | **REPROVADO** | `C3-01` (MÉDIA), `C3-02` (BAIXA) |

**Monocultura de modelo, declarada:** o dono ordenou, em 04/11 ~22:50, que o Claude só orquestre por 24 h. Por isso as três cadeiras ficaram em Codex GPT-5.6 Sol, sem cruzamento de modelo nesta junta (declarado no briefing). Nenhuma identidade de jurado colidiu com os inelegíveis `dev-ass01-sol`, `crit-ass01e-sol` e `prerev-498-opus` (medido pelo inspetor).

## Triagem do orquestrador (Emenda 3 ao §4.1, 05/11 ~00:20 SP)

A junta votou uma vez: C1 APROVADO sem achado, C2 APROVADO com 1 BAIXA, C3 REPROVADO com 1 MÉDIA e 1 BAIXA. A triagem do §C7 item 10(3) dá **nenhum achado grave** (nada perde dado, vaza entre organizações, quebra permissão ou erra dinheiro):

- **`C3-02` (BAIXA), dois testes fora da lista literal:** `tests/ass-01-markup-retirado.test.ts` e `tests/ass-01-frontend-sem-markup.test.ts`. O próprio §4.1 os nomeia como critério do R-RM-1/R-RM-4, mas a lista PERMITIDO não os enumerou. **Ficam ratificados por esta emenda.** Foi omissão do plano, não desvio do dev.
- **`C3-01` (MÉDIA), `npm test` local com 14 falhas:** a suíte rodou em Windows (4446 / 4430 / 14 / 2). Falharam drills de banco que o dev já tinha registrado como incompatíveis com Windows (`setsid` ausente, o atalho do `prisma` interpretado pelo Node, `rmdir` EBUSY). O CI Linux do mesmo SHA deu **fail 0** nos dois runs. **Não segura o bloco se a conferência provar que é ambiente:** um verificador que não consertou nem votou roda o `npm test` na `origin/main` (antes do PR), na mesma forma e no mesmo tipo de terreno, e compara os **nomes** dos testes vermelhos. Mesmo conjunto (ou um subconjunto) significa ambiente, e o bloco segue. Teste vermelho só no objeto é defeito e volta para conserto.
- **`C2-OBS-01` (BAIXA):** a rolagem horizontal no celular é anterior ao bloco e já é a pendência `P-WEB-SHELL-CELULAR-ROLA-DE-LADO`. Nada a fazer aqui.

Não há conserto de código. Depois da conferência vêm o merge e o porteiro.

## Conferência (`conf-498-dsp`, DeepSeek Pro, 05/11): CONFERIDO

- Identidade `conf-498-dsp` (DeepSeek Pro `deepseek-v4-pro`, API oficial, pelo Codex). Não fez, não votou e não consertou nada no bloco.
- Base (merge-base de `origin/main` com o objeto): `0c3c7826`; objeto: `2e44bd58`.
- Executou `npm ci`, `db:generate`, `migrate deploy`, `db:seed` e `npm test` inteiro na base e no objeto.
- **Base (HEAD `0c3c7826`):** 4433 testes, 4423 pass, **8 fail**, 2 skipped.
- **Objeto (HEAD `2e44bd58`):** 4445 testes, 4436 pass, **7 fail**, 2 skipped.
- **Comparação dos nomes:** os 7 vermelhos do objeto estão contidos nos 8 da base, todos de ambiente Windows (`setsid` ausente, shim `prisma` interpretado como shell, `rmdir EBUSY` no hook `after`). O único vermelho exclusivo da base é o drill de work-order (hook `rmdir EBUSY`, intermitente), que passou no objeto — o oposto de um defeito introduzido pelo bloco. **Não existe vermelho exclusivo do objeto.**

## Porteiro (`porteiro-498-dsp`, DeepSeek Pro, 05/11 01:33): LIBERADO COM RESSALVA

- Identidade `porteiro-498-dsp` (DeepSeek Pro `deepseek-v4-pro`, API oficial, pelo Codex, nível menor declarado). Não fez, não revisou, não votou e não consertou nada no bloco.
- Merge: `0f2bfb738f71059039a00d08222adf12eaa7c723` (squash do head `64f177b43b6b77f114827fdfcfc6fe2acf6e9ac3`), `origin/main`, 05/11 01:06 SP.
- CI do merge `0f2bfb73`: job `backend` 4454 testes / 0 falhas / 2 pulados; job `backend-postgres` 503 testes / 0 falhas. Zero linhas `not ok`.
- **Veredito:** LIBERADO COM RESSALVA para o B-ASS-02 (catálogo de planos, §4.2) | **a ressalva:** a ata `J-498` ainda não está na `main` — entra neste PR de registro.

## Separação de papéis (§C7.4-bis)

- **Desenvolveu:** `dev-ass01-sol` (Codex).
- **Pré-revisou:** `prerev-498-opus` (Claude Opus).
- **Criticou o plano:** `crit-ass01e-sol` (Codex).
- **Inspetor de terreno:** `insp-498-sol` (Codex GPT-5.6 Sol).
- **Votaram:** `jurado-j498-c1-sol`, `jurado-j498-c2-sol` e `jurado-j498-c3-sol` (todos Codex GPT-5.6 Sol).
- **Conferiu:** `conf-498-dsp` (DeepSeek Pro).
- **Porteiro:** `porteiro-498-dsp` (DeepSeek Pro).

Nenhum deles votou depois de desenvolver, criticar, pré-revisar ou inspecionar o mesmo bloco; inspetor, jurados, conferência e porteiro são identidades novas e distintas do dev, do crítico e da pré-revisão.

## Quedas e retomadas (P6/P8)

- Nenhuma queda registrada nesta junta. O briefing fixava que, se uma cadeira caísse, o sucessor `-b` reexecutaria toda a evidência antes da cauda.

**Próximo:** merge com CI verde (já ocorreu como `0f2bfb73`), porteiro pós-merge (feito) e o registro desta ata neste PR.
