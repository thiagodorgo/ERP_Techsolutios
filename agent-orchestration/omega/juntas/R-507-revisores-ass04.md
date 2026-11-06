# R-507 — revisor sênior e revisor do cálculo no lugar da junta, PR #507 (B-ASS-04, demonstrativo mensal), 2026-11-06

- **Decisão do dono:** este bloco **não teve junta**. No lugar: revisor sênior + **segundo revisor só do cálculo** antes do merge, conserto, conferência e porteiro depois, cada um com identidade nova (§C7.4-bis). Registrado em `decisoes.md` (`D-SEGUNDO-REVISOR-CALCULO-0611`).
- **Objeto julgado pelos dois revisores:** head `c4210bd1a4800c570a2d16e96ae195adeee81198` (PR #507 antes do conserto). Base `origin/main` = `3470db1e`.
- **Dev:** Claude Opus (`dev-ass04-opus`) nas fatias F0–F3 e F5–F12; DeepSeek na F4 (esquema e M3). Os dois foram os "desenvolvedores de plantão" do dia, por ordem do dono.
- **Os pareceres inteiros ficam fora do repositório** (`erp-pausa-2026-10-03/revisoes/`), porque trazem valores de teste em centavos; aqui fica o que eles decidiram.

## Revisor sênior (`rev-ass04-senior`, DeepSeek, esforço alto, 06/11 ~11:59 SP): REPROVADO, sem grave

- **Identidade:** braço escolhido pela fila (DeepSeek oficial, fora do pico), identidade nova. Não fez, não planejou e não consertou nada no bloco.
- **Aprovado por execução:** ENABLE+FORCE e política por GUC nas 4 tabelas da M3; isolamento entre organizações em **todas** as portas de escrita do serviço (teste próprio, papel sem bypass); rotas do cliente (`?tenantId` → 400; papel de plataforma e organização de sistema → 403); permissões e drill da M3b; trilha do dinheiro dentro da transação, com a falha da trilha desfazendo o movimento; resposta do cliente sem chave de dinheiro; o job nunca refecha um `reopened` (G4).

| ID | gravidade | escopo | achado |
|---|---|---|---|
| F1 | MÉDIA | dentro-do-bloco | CI `frontend` vermelho: o T40 contava 35 endpoints de plataforma; o script mede 48 (35 + os 13 do bloco) |
| F2 | BAIXA | dentro-do-bloco | 3 arquivos fora do PERMITIDO literal do §4.4 (`censored-tables.ts` gerado, drill da M1, bootstrap de jobs), declarados mas sem emenda escrita |
| F3 | MÉDIA | dentro-do-bloco | o plano pede corridas com barreira determinística; havia 2 de 5, sem barreira, e "fechamento × baixa" não tinha teste |

## Revisor do cálculo (`rev-ass04-calculo`, DeepSeek, esforço alto, 06/11 ~11:28 SP): REPROVADO, 1 grave

- **Identidade:** braço escolhido pela fila, identidade nova, sem Docker, só o cálculo. Montou uma referência própria em inteiros e comparou o motor em 14 casos de borda e 100.000 casos gerados: **0 diferença**. Conversões centavos ↔ decimal exatas; nenhum float sobre dinheiro; 6 de 7 mutações do plano vermelhas.

| ID | gravidade | escopo | achado |
|---|---|---|---|
| A-01 | **GRAVE** | dentro-do-bloco | o refechamento (reabrir → fechar) fixava só a versão do plano base: a do add-on de rastreamento era re-resolvida, e o preço por veículo mudava se uma versão nova fosse publicada entre fechar e refechar (viola o G5) |
| A-02 | MÉDIA | dentro-do-bloco | nenhum teste travava a unidade de espaço (GiB = 1024³): a troca por 10⁹ passava verde |
| A-03 | BAIXA | dentro-do-bloco | crédito aplicado maior que o total do mês deixa o fechamento recusando (422) e o crédito preso como `applied`; o total nunca fica negativo e nenhum centavo é somado errado |

## Triagem (Emenda 1 ao §4.4 do plano, fora do repositório)

- Grave → conserto agora: A-01. Não graves e simples → mesma leva: A-02, F1, F2, F3. Não grave que precisa de desenho → pendência com dono: A-03 (`P-ASS04-CREDITO-EXCEDENTE`, dono `B-ASS-08`).

## Conserto

- **`dev-ass04-opus` (Claude), commit `552f0453`:** A-01 — o pin do refechamento vem do snapshot (`pinOf`): as versões de cada trecho do plano base **e** a do add-on, e só elas concorrem (T-IN-4b; mutação "add-on sem pin" vermelha). Na mesma leitura, um defeito vizinho: o pin era um id só, e um mês com troca de plano caía em `plan_without_price` no refechamento (T-IN-4c; mutação "primeira gravada" vermelha). A-02 — unidade travada por literal (T-ST-3b; mutação `/10⁹` vermelha). F1 — 35 → 48. F2 — registrado na emenda.
- **`dev-ass04-corridas` (DeepSeek), commit `4f324611`:** F3 — `tests/ass-04-statement-races-db.test.ts`, 7 casos com `waitForOwnBlockedStatement` (os 3 cenários do R-ST-5, pagamento × cancelamento, crédito × fechamento e as duas corridas antigas com barreira); 7/7 em 3 execuções; sem `FOR UPDATE` no `lockById`, 5 dos 7 vermelhos.
- **Desvio declarado:** um plano sem versão gravada no snapshot (a assinatura mudou depois do fechamento) resolve a versão vigente; recusar travaria o refechamento para sempre.

## Conferência (`conf-ass04`, DeepSeek, esforço alto, 06/11 ~13:04 SP): APROVADO

- **Identidade:** identidade nova; não achou nem consertou nada. **Objeto:** head `7fd9c7be4698734e713eca918051865b6c0f84b2`.
- Rodou o comando de cada achado no head: A-01 pelo montador e pelo serviço (o total não muda ao refechar depois de publicar versão nova do add-on) e nenhum outro caminho de refechamento re-resolvendo versão; cada teste novo vermelho com o conserto desfeito; corridas 3× verdes e 5/7 vermelhas sem `FOR UPDATE`; escopo `c4210bd1..7fd9c7be` dentro da emenda. Nenhum defeito novo.
- CI do head: backend 4622 / 4620 pass / 0 fail / 2 skip; backend-postgres 503/503; frontend 1636/1636.

## Merge e porteiro (`porteiro-507`, DeepSeek): LIBERADO COM RESSALVA

- Merge `e4e181f2489d3ec2c825e0d52c4a0ba1df4f20b7` (squash do head `f9c83d6e`, que é `7fd9c7be` + a `main` por update-branch), 06/11 ~13:23 SP. 16 check-runs verdes.
- Porteiro: testes do bloco re-executados 67/67; A-01 revalidado na `main`; CI do merge backend 4622 / 0 fail / 2 skip, backend-postgres 503/503, frontend 1636/1636; ramo apagado, worktrees e containers dos revisores removidos.
- **Ressalva (só registro, não bloqueia o B-ASS-05):** carregar esta ata, fechar `P-ASS-DEMONSTRATIVO` e a parte "rota" de `P-ASS-VISAO-DO-CLIENTE`, registrar `P-ASS04-CREDITO-EXCEDENTE` e o desvio declarado com dono. Feito neste registro.

## Papéis (§C7.4-bis)

- Acharam: `rev-ass04-senior`, `rev-ass04-calculo`. Consertaram: `dev-ass04-opus`, `dev-ass04-corridas`. Conferiu: `conf-ass04`. Validou pós-merge: `porteiro-507`. Quem achou não consertou; quem conferiu não fez nem consertou.
- **Cruzamento (§C7 item 11):** o dev principal é Claude e todos os revisores, a conferência e o porteiro são DeepSeek (outro modelo). O F3 foi feito por DeepSeek e conferido por outra identidade DeepSeek, sem cruzamento: os braços Codex estavam sem limite semanal e o Claude da sessão era o dev.

## Segundo dado para a análise da troca da junta

- O revisor do cálculo, só com o cálculo, achou o **único grave** do bloco; o revisor sênior não o achou. O formato "sênior + revisor do cálculo" pegou um erro de dinheiro que um revisor generalista deixou passar.
