papel: cadeira C3 (refeita, ciclo 2, regra (3) do §C7 item 9) | identidade: jurado-san312b-c3-r2-opus (NOVA) | corpo: jurado-san312b-c3-dinheiro-e-contrato | executor: subagente Claude | modelo: Claude Opus 5.5 (claude-opus-5-5), nível menor DECLARADO (§C7.6; substituição: nenhuma — a linha C3 do R- §4 nomeia Claude Opus) | objeto: e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2 | mandato_md5: 66147331d4b6a773ec0107669cf306b4 (tr -d '\r' < 00-mandatos/cadeira-c3r2.md | md5sum; declarado no disparo: não declarado) | corpo_md5: 3edfee9fdffd5ebd1a64620072eaad3d (blob .claude/ no objeto, EOL-neutro) (recebido: carregado por git show e77a5ac1:… → 3edfee9fdffd5ebd1a64620072eaad3d) | corpo carregado × blob do objeto: IDENTICO

# Evidência — C3 refeita, ciclo 2, junta de DINHEIRO do B-SAN3-12b (PR #469)

## Terreno (início 2026-10-28T02:12:14Z)
- Hora real do start (date -u): 2026-10-28T02:09:15Z.
- origin/main no início: f076973921539165df8d406b8c061dbf4e4ee127 (= merge-base do mandato). ls-remote do ramo = e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2 = objeto.
- $SCRATCH: C:/Users/AMP/erp-pausa-2026-10-03/j12b2-c3r2/ (sondas e logs; nada no repo).
- Worktree próprio: C:/Users/AMP/j12b-c2-c3r2-wt (nome do mandato específico; o genérico dizia j12b2-<cadeira>-wt — vale o mandato), detached em e77a5ac1, .git presente, .env ausente, status 0; npm ci próprio raiz e frontend; zero junction.
- Recursos no start: memória de commit livre 12,4 GB (piso 4 GB); disco C: livre 12,54 GiB (piso C3 9,1 GiB; piso de parada 7,5 GB). Nota: o "livre em C: 225G" do MEDIDO do mandato é a coluna USADO do df, não a livre (df -BG: 238G tamanho, 225G usado, 13G livre) — só o número do redator, não o terreno.
- Base viva: erp-postgres (5432) e erp-redis (6379) de pé, do dono — NUNCA alvo. Nenhum container j12b* existente no start. Portas da C3 pelo inspetor: Postgres 48124 (app 48125).
- Legalidade: parecer insp-san312b-c2-parecer.md (inspetor-san312b-c2-sol, Codex Sol): LIBERADO COM RESSALVA (1 ressalva no arquivo: paralelismo condicionado à rechecagem dos pisos; "C3 começa somente após C2 terminar e limpar"). Medido no start: worktree j12b-c2-c2rev-wt ausente e fora de git worktree list; nenhum container j12b*; o codex.exe vivo é o app-server da extensão do VS Code (linha de comando lida), não a C2. A C1 está viva em paralelo por ordem do orquestrador; rechecagem dos pisos após a instalação (abaixo).
- Divergências de registro, só notas: (i) o inspetor nomeou a C3 "jurado-san312b-c3-r2-sol" (Codex Sol); o disparo me nomeia jurado-san312b-c3-r2-opus (Claude Opus), o que o mandato ("Claude Opus ou Codex GPT-5.6 Sol") e o R- §4 (C3 = Claude Opus) admitem; nome fora da lista de inelegíveis (R- §4 l.201, ressalva do inspetor, executores das RETOMADAS 1–9, red-san312b-c2-sol, inspetor, jurados do ciclo 1, orquestrador). (ii) O disparo genérico cita "7 ressalvas" do parecer; o parecer do ciclo 2 tem 1; as 7 do prompt são tomadas como roteiro.
- Quórum: DINHEIRO, unanimidade de 3 com veto; ciclo 2 — todo bloqueia dentro-do-bloco reprova. Não li votos/evidências c1*/c2* do ciclo 2. Li do ciclo 1 só o meu antecessor (c3-voto.json, achados C3-01..C3-08) como roteiro A RE-VERIFICAR.


## Recursos depois da instalação (02:13:45Z)
- `npm ci` raiz ec=0 (326 pacotes), `npm --prefix frontend ci` ec=0 (103) — logs em $SCRATCH/npmci-*.log. `node_modules` e `frontend/node_modules`: atributo `Directory` (não ReparsePoint) → zero junction. `npx prisma generate` com URL sintética ec=0. Node v20.19.5.
- Disco C: 11,86 GiB livres (≥ 7,5); memória de commit livre 12,37 GB (≥ 4). Paralelismo com a C1 dentro dos pisos.

## Item 1 — a baixa (foco C3-05/R5 e C3-01/R6; regressão F1–F5, F21)

### 1.a Testes do bloco, de `frontend/` (bateria R14), 02:14:22Z
- Comando: `cd frontend && timeout -k 15 600 node --test --import tsx tests/finance-*.test.ts* tests/financial-*.adapter.test.ts tests/dense-expandable-row.test.tsx tests/finance-titles.test.tsx` → $SCRATCH/bloco-objeto.tap
- Saída: ec=0 · tests 112 · pass 112 · fail 0 · skipped 0 · cancelled 0. Casos nomeados presentes: F1/F2/F3, F3 409, R6 ×2, R5(a)(b)(c), F6/F21, F6, F10/F22, F10, F14, F5 ×2, F1, F2, R5(d), F8 ×4 (guard), F20 ×2.
- Veredito parcial: verde.

### 1.b Sonda PRÓPRIA com rede gravada (arnês DOM do bloco, testes dele pulados; só os meus `C3R2-*` rodam)
- Sonda: $SCRATCH/zz-j12bc3r2-sonda.test.tsx (md5 63644677225e8808d34bace4a7e61ca6) = `finance-page-live.test.tsx` do objeto com `^test(`→`test.skip(` (33 pulados) + $SCRATCH/zz-tail.tsx (md5 16394135644a4b15171be06e90752107, os 5 casos meus). Copiada para `frontend/tests/` do MEU worktree só para rodar.
- Comando: `cd frontend && timeout -k 15 300 node --test --import tsx tests/zz-j12bc3r2-sonda.test.tsx` → $SCRATCH/sonda-objeto.tap · ec=0 · tests 38 · pass 5 · fail 0 · skipped 33 (os 33 pulados são os do arquivo-base, por construção; os 5 meus rodaram).
- (1a) Matriz R6/C3-01 — 9 desfechos × releitura {igual, mudou (paidAmount 0→400)} = 18 cenários, todos com exatamente 1 releitura `GET /financial-titles/t-vencido` e 1 POST: "já está registrada" SÓ em 409dup (igual e mudou), rede/mudou e 500/mudou. 422 overpayment/mudou, title_already_paid/mudou, title_cancelled/mudou, period_closed/mudou, 400 invalid_amount/mudou e 403/mudou: already=false e o texto "O título mudou desde que você abriu" presente; 422paid e 422cancel fecham (form=false), o resto volta ao formulário. 18/18 OK. (Foi aqui que o ciclo 1 achou o C3-01: 422 overpayment + releitura maior → "já registrada".)
- (1b) Mesmo id e trava: sequência 500 → 422 overpayment → rede → 201 no MESMO formulário, releitura retida por portão: nas 3 falhas, botão `disabled` durante a releitura, 0 `role=alert` antes da releitura, um 2º submit durante a releitura NÃO gera POST (pays = 1, 2, 3), 1 alerta depois. 4 POSTs com exatamente as 5 chaves (`account_id, amount, client_action_id, occurred_at, payment_method`), amount 1000 (número) ×4, ids distintos = 1. Formulário novo (outro título) → id novo = true.
- (1c) R5 extra: "Manter o cheque" volta à oferta sem POST; 1ª confirmação → `POST /cheques/ch-1/cancel` corpo null, 409 `transition_conflict` → "O cheque mudou enquanto você agia; recarregue e tente de novo." e o botão FICA; 2ª confirmação → 200, botão some; os 2 POST = `["POST","/cheques/ch-1/cancel",null]`.
- Veredito parcial: verde (R5, R6, F1, F2, F3 na forma da sonda).

### 1.c Vermelho-controle da sonda no objeto do ciclo 1 (`fc5ead6c` = `e77a5ac1~13`), entre 02:14:22Z e 02:20:44Z (horas medidas; correção: antes estava uma hora estimada)
- Comando: `git -C <wt> checkout fc5ead6c -- frontend/src` (21 caminhos) → mesma sonda → $SCRATCH/sonda-ciclo1.tap → `git checkout e77a5ac1 -- frontend/src`.
- Saída: ec=1 · tests 38 · pass 1 · fail 4 · skipped 33. VERMELHOS: C3R2-1a (7 cenários FALHA, entre eles 422over/mudou, 422paid/mudou, 400amount/mudou, 403/mudou → "já registrada" — o C3-01 reproduzido; e 409dup/igual SEM "já registrada"), C3R2-1c (sem botão "Cancelar o cheque" — o C3-05), C3R2-2a (agregado total=10, 4 URLs ×2 — o C3-02), C3R2-2b (rodada velha sobrescreve: count 111). Verde: C3R2-1b (o F2 já estava certo no ciclo 1 — a sonda não é tautológica: distingue o que mudou do que não mudou).
- Restauro: `git status --porcelain --untracked-files=no` = 0 (só a sonda `??`, apagada no teardown).
- Veredito parcial: a sonda acusa — controle válido.

### 1.d Mutações do item 1 (runner meu, uma por vez, âncora única CRLF-consciente, numstat não vazio, restauro por `git checkout e77a5ac1 -- <f>` + `hash-object` = blob), 02:20:44Z
- Runner: $SCRATCH/mutar.mjs; lista $SCRATCH/mut-item1.json; log $SCRATCH/mut-item1.log; TAP por mutação $SCRATCH/mut-<id>.tap.
- R5-M1 | botão de cancelar também para cheque deposited | numstat 1 1 frontend/src/modules/finance/entries/components/BaixaForm.tsx | tests/finance-page-live.test.tsx /R5/ | tests 33 · pass 2 · fail 1 · skipped 30  | VERMELHO (esperado VERMELHO) | falhos: R5(b): cheque já depositado (warning cheque_still_depositable) — 
- R5-M2 | gate do cancelar por cheques:unlink_title | numstat 1 1 frontend/src/modules/finance/pages/FinanceiroPage.tsx | tests/finance-page-live.test.tsx /R5/ | tests 33 · pass 2 · fail 1 · skipped 30  | VERMELHO (esperado VERMELHO) | falhos: R5(c): ator que desvincula mas não tem cheques:update não vê 'Cancelar o cheque'
- R5-M3 | POST /cancel com corpo {} | numstat 1 1 frontend/src/modules/finance/entries/financial-entries.service.ts | tests/finance-page-live.test.tsx /R5/ | tests 33 · pass 2 · fail 1 · skipped 30  | VERMELHO (esperado VERMELHO) | falhos: R5(a): com cheques:update, depois de desvincular um cheque registrado a baixa oferece '
- R5-M3b | rota /cheques/<id> sem /cancel | numstat 1 1 frontend/src/modules/finance/entries/financial-entries.service.ts | tests/finance-page-live.test.tsx /R5/ | tests 33 · pass 2 · fail 1 · skipped 30  | VERMELHO (esperado VERMELHO) | falhos: R5(a): com cheques:update, depois de desvincular um cheque registrado a baixa ofe
- R6-M1 | paidAmount maior → already ANTES da razão | numstat 5 0 frontend/src/modules/finance/entries/components/BaixaForm.tsx | tests/finance-page-live.test.tsx /R6/ | tests 33 · pass 1 · fail 1 · skipped 31  | VERMELHO (esperado VERMELHO) | falhos: R6: 422 overpayment com o título já pago em parte → razão da recusa
- F1 | a baixa vai a PATCH /status | numstat 1 1 frontend/src/modules/finance/titles/financial-titles.service.ts | tests/finance-page-live.test.tsx /F1/F2/F3/ | tests 33 · pass 0 · fail 1 · skipped 32  | VERMELHO (esperado VERMELHO) | falhos: F1/F2/F3: rede caiu → relê o título antes de falar e trava o reenvio até a rele
- F2 | client_action_id novo a cada envio | numstat 1 1 frontend/src/modules/finance/entries/components/BaixaForm.tsx | tests/finance-page-live.test.tsx /F1/F2/F3/ | tests 33 · pass 0 · fail 1 · skipped 32  | VERMELHO (esperado VERMELHO) | falhos: F1/F2/F3: rede caiu → relê o título antes de falar e trava o reenvio até a
- C3R2-MID | MINHA: id novo SÓ no reenvio depois de falha sem status (rede/timeout); 1º envio e 4xx/5xx intactos | numstat 2 1 frontend/src/modules/finance/entries/components/BaixaForm.tsx | tests/finance-page-live.test.tsx | tests 33 · pass 32 · fail 1 · skipped 0  | VERMELHO (esperado VERMELHO) | falhos: F1/F2/F3: rede ca
- F3 | falha vira erro final sem releitura | numstat 3 1 frontend/src/modules/finance/entries/components/BaixaForm.tsx | tests/finance-page-live.test.tsx /F3|R6|F1/F2/F3/ | tests 33 · pass 0 · fail 4 · skipped 29  | VERMELHO (esperado VERMELHO) | falhos: F1/F2/F3: rede caiu → relê o título antes de falar e trava o reenvio
- F4 | tirar unlink_requires_privilege da lista | numstat 0 1 frontend/src/modules/finance/entries/finance-errors.ts | tests/financial-entries.adapter.test.ts | tests 11 · pass 9 · fail 2 · skipped 0  | VERMELHO (esperado VERMELHO) | falhos: F4: a lista do código é IGUAL, como conjunto, à lista da tela de API_CONTRACTS.md 
- F4b | acrescentar bounce_reason_required à lista | numstat 1 0 frontend/src/modules/finance/entries/finance-errors.ts | tests/financial-entries.adapter.test.ts | tests 11 · pass 9 · fail 2 · skipped 0  | VERMELHO (esperado VERMELHO) | falhos: F4: a lista do código é IGUAL, como conjunto, à lista da tela de API_CONTRACTS
- F5 | Cheque no seletor de meios | numstat 1 0 frontend/src/modules/finance/entries/useFinanceActions.ts | tests/finance-baixa.smoke.test.tsx | tests 9 · pass 8 · fail 1 · skipped 0  | VERMELHO (esperado VERMELHO) | falhos: F5: os meios oferecidos são Pix, Transferência, Boleto, Dinheiro e Cartão — nunca cheque | restau
- F21 | campo de valor no bloco do cheque pendente | numstat 1 1 frontend/src/modules/finance/entries/components/BaixaForm.tsx | tests/finance-page-live.test.tsx /F6/ | tests 33 · pass 1 · fail 1 · skipped 31  | VERMELHO (esperado VERMELHO) | falhos: F6/F21: 422 title_has_pending_cheque → bloco do cheque (valor e nº), sem 
- FIM | árvore rastreada após a rodada: limpa
- Resumo: 13/13 VERMELHAS pelo caso indicado (R5-M1→R5(b); R5-M2→R5(c); R5-M3 e R5-M3b→R5(a); R6-M1→R6 422 overpayment; F1, F2→F1/F2/F3; F3→F1/F2/F3+F3 409+R6 ×2; F4, F4b→2 casos F4 do adapter; F5→F5 smoke; F21→F6/F21). 13/13 restauradas com hash igual ao blob (grep DIFERENTE = 0); árvore limpa no fim.
- Mutação MINHA (C3R2-MID): `client_action_id` regenerado SÓ no reenvio depois de falha sem status HTTP (rede/timeout), com o 1º envio e o reenvio depois de 4xx/5xx intactos → VERMELHA no caso vivo "F1/F2/F3" (33 · pass 32 · fail 1). A forma é acusada pelos testes do bloco; não é critério que não pode falhar.

### 1.e As 32 razões por conjuntos gerados (entre 02:20:44Z e 02:23:31Z, horas medidas; correção: antes estava uma hora estimada)
- Comando: `cd frontend && node --import tsx $SCRATCH/razoes.mjs $SCRATCH <finance-errors.ts> <client.ts> [controle]` (razoes.mjs md5 9a556ab3677a4cb2e352f30dbb3175ec); fontes: `FINANCE_UI_ERROR_REASONS` EXECUTADO (not_found→404, forbidden→403); plano §4.1 l.211-215 do objeto ($SCRATCH/plano-lista.txt); `API_CONTRACTS.md` l.590-603 do objeto ($SCRATCH/api-lista.txt), dividido em "lista da tela" × "Novos FORA da lista da tela".
- Saída: código N=32 · plano N=32 · API lista-da-tela N=32 · API fora N=4 [bounce_reason_required, invalid_group_by, invalid_from, invalid_to]; diferenças nos dois sentidos = ∅ (IGUAIS como conjunto); fora∩código = ∅. Mensagens: 32 · únicas 32; razão desconhecida → genérica distinta das 32 ("Não foi possível concluir a operação. Recarregue a tela e tente de novo."); rede → "Sem conexão com o servidor. Nada foi confirmado…"; `invalid_amount` com 400 → "Informe um valor maior que zero.".
- Controle: tirar `cheque_not_linked` (N=31) → DIFEREM (plano−código e API−código = [cheque_not_linked]); pôr `bounce_reason_required` (N=33) → DIFEREM (e fora∩código acusa). O comparador acusa nos dois sentidos.
- Censo inverso da rota NOVA que a tela passa a chamar (`POST /cheques/:id/cancel`, `cheque.routes.ts:84-89`, `requirePermission(CHEQUE_PERMISSIONS.update)` = `"cheques:update"`): `cheque.service.ts:296 cancel` → `chequeLinkedUnlinkFirstError` / `assertTransition` / `getWritable` / `flipOnly`; razões possíveis nos arquivos do módulo (cheque_linked_unlink_first, invalid_transition, cheque_not_editable, transition_conflict, cheque_write_conflict, cheque_not_found→404) — todas nas 32 (a 404 por status). As demais rotas: backend byte-idêntico desde o ciclo 1 (medido no item 3), censo do ciclo 1 vale como roteiro sem mudança de fonte.
- Gate do cancelar na tela = `can("cheques:update")` (`FinanceiroPage.tsx`, `access.cancelCheque`) = permissão exata da rota; a R5-M2 (gate por `cheques:unlink_title`) fica VERMELHA.

### Item 1 — veredito parcial: VERDE
- C3-05/R5: oferta após desvínculo de `registered`, gate exato `cheques:update`, dois passos (Manter não envia), POST `/cheques/<id>/cancel` sem corpo, 422 `cheque_linked_unlink_first` e 409 `transition_conflict` mantêm o botão com a mensagem, 200 remove; `deposited` não oferece; sem permissão, aviso honesto (pedir a quem administra). R5-M1/M2/M3/M3b vermelhas.
- C3-01/R6: 18/18 cenários da matriz; "já registrada" só em 409 duplicate_payment ou (rede/5xx E pagamento relido); recusa 4xx definitiva com título mudado → razão + "O título mudou…". R6-M1 vermelha; controle do ciclo 1 vermelho.
- Regressão F1–F5, F21: verde, mutações vermelhas, mesmo id em 3 desfechos de falha, releitura antes de falar com o botão travado e sem POST durante a releitura.

## Item 2 — conciliação e números (foco C3-02/R4; R12, F8, F9, F10, F14, F18, F20, F22)

### 2.a F14/R4 pela sonda própria (C3R2-2a, C3R2-2b; mesmo TAP do 1.b, executado dentro da janela medida 02:14:22Z–02:20:44Z)
- C3R2-2a — 3 ordens de chegada das contas (imediata; depois do 1º agregado; depois das 4 situações): nas 3, `/financial-entries/aggregate` total=6, distintas=6, repetidas=[] (4 situações + 1 por conta ativa); toda outra rota ×1 (summary, accounts, titles receivable, titles payable, entries, reconciliation-policy, balance ×1 por conta); "Banco do Brasil: 1 a conciliar" e "Caixa da loja: 1 a conciliar" presentes depois da carga. Contas chegando depois NÃO refazem as situações.
- C3R2-2b — R4(b) no hook real `useEntriesAggregate`: 1ª rodada retida (count 111), refresh(true) responde 222, a rodada velha solta depois → dado final = o da nova (222), sem sobrescrita nem apagamento.
- Controle no ciclo 1 (1.c): C3R2-2a VERMELHO (agregado total=10; reconciled=false ×2, reconciled=true ×2, value ×2, date ×2 — o C3-02); C3R2-2b VERMELHO (a velha sobrescreve com 111).
- "A conciliar" vem do servidor: `FinanceiroViewA.tsx:91` lê `aggregate.items[0].count` do `/aggregate … reconciled=false`; o caso vivo F14 confere "A conciliar: 2 lançamentos" do dublê-servidor.

### 2.b F8 — a trava, o comando e a propriedade (executado na janela medida 02:23:31Z–02:27:49Z)
- `git grep -n -E 'reduce\(|\+= *[a-zA-Z.]*amount' e77a5ac1 -- frontend/src/modules/finance` = 8 linhas = o inventário (7 em commissions/**, 1 em titles/financial-titles.adapter.ts:198); a MESMA saída em `c9a2d036` (8 linhas idênticas por arquivo:linha) → as 8 são pré-existentes à base do ramo; 0 em accounts/, entries/, pages/.
- Forma R12 (PCRE `\b(\w+)\s*=\s*\1\s*[+-]`) no objeto, módulo inteiro: n=0 (o inventário segue o das 8, como a R12 manda).
- Varredura da propriedade em accounts/, entries/, pages/ (`+=`, `-=`, `++`, `reduce(`, sumBy, Math.*, for…of, `.length`, `+ Number(`, `+ …amount/total/balance/count`): 0 soma de dinheiro. Revistos: `useFinanceActions.ts:49` (arredonda o valor digitado), `:58` `titleOpenBalance` = amount − paidAmount do servidor (diferença, não soma; pré-existente no bloco desde o ciclo 1, é o "saldo em aberto"); `useEntriesAggregate.ts:21` (contador de rodada); `FinanceiroViewA.tsx:423` contagem de títulos por alvo só com a carga completa (R3(c)), `:500` restantes = total − carregados (contagem); `.length` restantes = contadores de linhas/paginação, não dinheiro. Nenhum acúmulo novo de dinheiro no delta do ciclo 2.

### 2.c Mutações do item 2 (mesmo runner; $SCRATCH/mut-item2.json → mut-item2.log), 02:24:40Z–02:25:10Z
- R4-M1 | consultas por conta de volta junto das 4 situações (forma do ciclo 1) | numstat 1 1 frontend/src/modules/finance/pages/FinanceiroPage.tsx | tests/finance-page-live.test.tsx /F14/ | tests 33 · pass 0 · fail 1 · skipped 32  | VERMELHO (esperado VERMELHO) | falhos: F14: a página pede cada rota e cada URL de agregado
- R4-M2 | useFinancialSummary chamado de novo (mutação F14 original, na página) | numstat 1 0 frontend/src/modules/finance/pages/FinanceiroPage.tsx | tests/finance-page-live.test.tsx /F14/ | tests 33 · pass 0 · fail 1 · skipped 32  | VERMELHO (esperado VERMELHO) | falhos: F14: a página pede cada rota e cada URL de agregad
- C3R2-RND-oficial | MINHA: sem a trava de rodada superada (R4(b)) — suíte viva inteira | numstat 0 1 frontend/src/modules/finance/entries/useEntriesAggregate.ts | tests/finance-page-live.test.tsx | tests 33 · pass 33 · fail 0 · skipped 0  | VERDE (esperado ?) | falhos: - | restauro hash igual | 15s
- C3R2-RND-sonda | MINHA: sem a trava de rodada superada (R4(b)) — minha sonda C3R2-2b | numstat 0 1 frontend/src/modules/finance/entries/useEntriesAggregate.ts | tests/zz-j12bc3r2-sonda.test.tsx /C3R2-2/ | tests 38 · pass 1 · fail 1 · skipped 36  | VERMELHO (esperado VERMELHO) | falhos: C3R2-2b: R4(b) — a rodada velha qu
- R12-M1 | soma = soma + Number(e.amount) com for…of na view A | numstat 3 0 frontend/src/modules/finance/pages/views/FinanceiroViewA.tsx | tests/finance-no-money-reduce.guard.test.ts | tests 4 · pass 2 · fail 2 · skipped 0  | VERMELHO (esperado VERMELHO) | falhos: F8: o módulo financeiro tem EXATAMENTE as 8 ocorrências d
- F8 | items.reduce somando amount na view A | numstat 2 0 frontend/src/modules/finance/pages/views/FinanceiroViewA.tsx | tests/finance-no-money-reduce.guard.test.ts | tests 4 · pass 4 · fail 0 · skipped 0  | VERDE (esperado VERMELHO) | falhos: - | restauro hash igual | 1s
- F8b | entrada falsa no inventário congelado | numstat 1 0 frontend/tests/finance-no-money-reduce.guard.test.ts | tests/finance-no-money-reduce.guard.test.ts | tests 4 · pass 2 · fail 2 · skipped 0  | VERMELHO (esperado VERMELHO) | falhos: F8: o módulo financeiro tem EXATAMENTE as 8 ocorrências do inventário congelado (n
- F9 | fallback dos títulos vira lista (failed=false) | numstat 1 1 frontend/src/modules/finance/pages/FinanceiroPage.tsx | tests/finance-page-live.test.tsx /F9/ | tests 33 · pass 0 · fail 1 · skipped 32  | VERMELHO (esperado VERMELHO) | falhos: F9: títulos fora do ar (fallback) → painel de erro na aba, nunca 'nenhum tít
- F10 | conciliação sem expected_reconciled / expected_reconciled_at | numstat 0 2 frontend/src/modules/finance/entries/useFinanceActions.ts | tests/finance-page-live.test.tsx /F10/ | tests 33 · pass 0 · fail 2 · skipped 31  | VERMELHO (esperado VERMELHO) | falhos: F10/F22: conciliar manda o estado lido; 409 reconciliation_
- F22 | expected_reconciled_at: null fixo | numstat 1 1 frontend/src/modules/finance/entries/useFinanceActions.ts | tests/finance-page-live.test.tsx /F10/ | tests 33 · pass 1 · fail 1 · skipped 31  | VERMELHO (esperado VERMELHO) | falhos: F10: desfazer (com o privilégio) manda reconciled=false e o carimbo lido, em ms; F20: s
- C3R2-409 | MINHA: 409 na conciliação sem releitura (volta direto ao formulário) | numstat 1 4 frontend/src/modules/finance/entries/components/ConciliarForm.tsx | tests/finance-page-live.test.tsx /F10/ | tests 33 · pass 1 · fail 1 · skipped 31  | VERMELHO (esperado VERMELHO) | falhos: F10/F22: conciliar manda o estado lid
- F20 | Estornar habilitado no conciliado | numstat 1 1 frontend/src/modules/finance/entries/components/EntryDetail.tsx | tests/finance-contas-extrato.smoke.test.tsx | tests 8 · pass 7 · fail 1 · skipped 0  | VERMELHO (esperado VERMELHO) | falhos: F20: lançamento conciliado — Estornar e Excluir desabilitados com a frase; s
- FIM | árvore rastreada após a rodada: limpa
- Resumo: R4-M1 (F14: URL ×2), R4-M2 (F14: summary ×2), R12-M1, F8b, F9, F10, F22, F20 e a minha C3R2-409 (409 da conciliação sem releitura → F10/F22 vermelho) = VERMELHAS pelo caso indicado; todas restauradas com hash = blob (DIFERENTE = 0); árvore limpa.
- **F8 da minha forma ficou VERDE**: `([] as {amount:number}[]).reduce((a, e) => a + e.amount, 0)` em `pages/views/FinanceiroViewA.tsx` → guard 4/4 pass.
- **C3R2-RND (minha, R4(b))**: tirar `if (round !== roundRef.current) return;` de `useEntriesAggregate.ts` → suíte viva inteira VERDE (33/33); só a minha sonda C3R2-2b acusa (VERMELHA). O código cumpre a R4(b) (sonda verde no objeto), mas nenhum teste do bloco a prende.

### 2.d A lacuna da trava F8 confirmada com formas realistas (02:26:09Z)
- $SCRATCH/mut-item2b.json → mut-item2b.log: (i) `items.filter((e) => e.direction === "in").reduce((s, e) => s + e.amount, 0)` em `entries/useFinanceActions.ts` (diretório do bloco, inventário vazio) → guard `tests 4 · pass 4 · fail 0` = VERDE; (ii) `Object.values(m).reduce((s, b) => s + b.balance, 0)` em `pages/views/FinanceiroViewA.tsx` → VERDE. Restauro hash = blob nos dois; árvore limpa.
- Causa no objeto: `frontend/tests/finance-no-money-reduce.guard.test.ts` `scanFinance` casa só `([A-Za-z_$][\w$.?]*)\.reduce\(` — o receptor tem de ser uma cadeia de identificadores; `<chamada>(…).reduce(`, `(<expr>).reduce(` e `x[i].reduce(` escapam, nas DUAS réguas ("strict" e "broad"). O próprio comentário do guard diz "`strict` = a forma do `rg` do §9.2 (`reduce(` ou `+= …amount`)" e "`broad` = qualquer `.reduce(`".
- O comando do §9.2 acusa a mesma forma: com a mutação (i) aplicada, `git grep -n -E 'reduce\(|\+= *[a-zA-Z.]*amount' -- frontend/src/modules/finance` = 9 linhas (1 em entries/) ≠ 8; restaurado (hash igual, status 0). Mas esse comando é passo manual da bateria; na CI quem roda é o guard (`finance-no-money-reduce.guard` está no `test:smoke`, job `frontend`, Node 20).
- Texto que o guard não cumpre (ratificação 14:40Z, versionada no objeto em `docs/revisoes/SAN3/B-SAN3-12-plano.md` l.1079ss.): "o guard … varre `frontend/src/modules/finance/**` inteiro e compara com um inventário congelado …; qualquer ocorrência fora do inventário reprova; … nos diretórios que o 12b cria ou edita … o inventário é vazio"; e "O `rg` da bateria do §9 passa a ser: `rg` lista exatamente as 8". Ocorrência = o que a forma do `rg` casa; o guard deixa passar ocorrência dessa forma.
- Origem: guard criado no bloco (`git log --diff-filter=A` → c022182d 2026-10-26, o commit do 12b); o regex de `reduce` é o do ciclo 1 (a R12 só acrescentou `x = x ±`). N no produto hoje = 0 (nenhuma soma de dinheiro nos diretórios do bloco).
- Veredito parcial: achado C3R2-01 (abaixo, no voto) — a trava do F8 não cumpre a forma ratificada; dentro-do-bloco; não grave (nenhum número errado na tela hoje); ciclo 2.

### 2.e F18 — o CE-4 na CI do objeto (insumo), janela medida 02:27:49Z–02:32:22Z
- `git diff --name-only f0769739 e77a5ac1 -- src prisma .github Kpis scripts` = 0 (o PR não toca backend); `git diff --name-only fc5ead6c e77a5ac1 -- tests/b-san3-12-ce4-db.test.ts src/modules/financial-{titles,entries,accounts,summary} src/modules/cheques prisma` = 0 → o CE-4 e o backend que ele exerce são byte-idênticos ao objeto do ciclo 1.
- `gh run list --commit e77a5ac1…` → runs 40609948720 (pull_request) e 40609945219 (push), completed/success. `gh run view <id> --log` → $SCRATCH/ci-<id>.log (43621 e 42475 linhas). Nas duas: `ok 248 - B-SAN3-12 CE-4 (F18): conta → título → baixa → extrato → saldo → conciliar → 409 → 400 → 403 → 200, com as permissões do BANCO`, no job `backend`, subcaso `[braço 2 — base SÓ-MIGRADA (papéis da organização)]`; job backend: tests 4157 · pass 4155 · fail 0 · skipped 2. `ci.yml` do objeto: 0 linha com `b-san3-12` (o CE-4 não está nas SUITES do backend-postgres).
- Leitura: o braço 1 (base provisionada) segue sem execução na CI — é a pendência `P-SAN3-12-CE4-BRACO1-NA-CI` (aberta no objeto, dono B-SAN3-12c + ferramentas, critério escrito), já aceita pela E2.4; não reabro.

## Item 3 — escopo, contrato, registro e bateria (foco C3-07/R7; R8, R13, E2.1, D-1..D-9)

### 3.a Escopo por laço (janela medida 02:32:22Z–02:33:44Z)
- PR efetivo `git diff --name-only f0769739..e77a5ac1` = 70 caminhos ($SCRATCH/pr-paths.txt). Proibidos pela lista (src/, prisma/, migrations/, infra/, .github/, Kpis/, mobile/, lockfiles, commissions/, payable-source/, InvoicesPage, navigation.registry.ts, auth.adapter.ts, app.css, components/**, PermissionGuard, work-orders/, .env): 5 casam `frontend/src/components/{dense-list/*,patterns/KpiStatCard.tsx}` — todos do commit 8ff80316 do ciclo 1 e NOMINALMENTE permitidos pelo §7.2 ("biblioteca (ampliação nominal)", plano l.454); COMPONENT_LIBRARY.md e docs/navigation-matrix.md também nominais no §7.2. Resto = 0. Controle: a mesma lista + `src/x.ts` + `Kpis/a.json` → 7 (o laço acusa).
- Ciclo 2 do dev e do registro (commits não-merge `fc5ead6c..e77a5ac1`, first-parent): b90aa9f0, 7d8e8342, 16aa7fdc, f137e186, 702d6bbb, 8b7ebab5, bb4f0680, 37a83404 (dev) + b2cbd5fd, 8dd477b8 (registro da junta/reprovação). Arquivos de produto/teste/registro TODOS dentro do E2.1 (laço contra a lista literal do E2.1: FORA = 0); proibidos = 0.
- Merges (3: b5246e8d, f1e71a1b, e77a5ac1). Arquivos que diferem dos DOIS pais: b5246e8d → pendencias.md, pendencias-indice.md, frontend/package.json (os 3 conflitos previstos) + docs/revisoes/SAN3/B-SAN3-12b-dev.md (+30 −0: a `## RETOMADA 1` da fatia 1, como a E2.6 manda; a E2.5 passo 5 diz "nenhum outro arquivo editado neste commit" — nota de registro, arquivo permitido); f1e71a1b → nenhum; e77a5ac1 → pendencias.md e índice. `frontend/package.json` no PR: só a linha `test:smoke`.
- Cabeçalhos `## ` de pendencias.md: 0 ausentes no objeto em relação a cada pai dos merges (b5246e8d^1/^2, e77a5ac1^1/^2) e à merge-base; 0 repetidos no objeto.

### 3.b R7 — índice = gerador (C3-07), janela medida 02:27:49Z–02:33:44Z
- Gerador do próprio ref, rodado numa cópia ($SCRATCH/gerador/<ref>/, `python -I gen.py`), comparado EOL-neutro com o índice versionado do mesmo ref: objeto e77a5ac1 → 0 linhas (md5 versionado = gerado = 3312d05c7657ea6fb901069b05b6e93d); e em TODO commit de `fc5ead6c..e77a5ac1` que tocou pendencias.md (e77a5ac1, f0769739, bb4f0680, b5246e8d, f7922ab7) → 0.
- Vermelho-controle: objeto do ciclo 1 fc5ead6c → 104 linhas (o C3-07 reproduzido). R7-M1 (status `ABERTA`→`fechada` na l.319 da cópia, sem regenerar o versionado) → 12 linhas. O comparador acusa.
- Veredito parcial: C3-07 fechado.

### 3.c R13 — ratificações e E2 versionadas e verbatim
- Plano do objeto: `^## Ratificação do orquestrador` = 2 (14:35Z com os 2 itens + 14:40Z = as 3 ratificações), `^## Emenda E2` = 1; transcrições apensas (§4.1 + `POST /cheques/:chequeId/cancel`; §10 C3 julga F20–F22; F4 = 32) em l.1254ss., corpo v3 não editado.
- Verbatim: trecho "Ratificação 14:35Z" até "Transcrições da E2" no plano do objeto × a cópia do orquestrador `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-SAN3-12-plano.md`: 182 × 182 linhas, 0 diferença (sem CR, sem espaço final, sem linha vazia).
- R13-M1 (tirar a 2ª ratificação numa cópia) → contagem 1 (vermelho); ciclo 1 fc5ead6c → 0.
- D-8 corrigido no relatório (l.198-202: Node 22.14.0 por caminho absoluto, nunca `nvm use`; CI Node 20; TAP 1475 nas duas versões). Pendências da E2.4 no objeto, 1 cabeçalho cada, status ABERTA, com dono e encerramento: P-SAN3-12B-BUSCA-TABELA-TITULOS, P-WEB-GUARDA-ROTA-TEXTO-SEM-ACENTO, P-FINANCE-SUMMARY-ADAPTER-NUM-ZERO, P-SAN3-12-CE4-BRACO1-NA-CI; e P-FINANCE-FRONT-SOMA-DINHEIRO-PRE-EXISTENTE e P-SAN3-12B-MENU-ABAS-FORA-DO-GOVERNO abertas com dono.

### 3.d O fechamento de P-SAN3-20-RESUMO-CHEQUE-VINCULADO se perdeu no merge da main (R8/E2.5 passo 2)
- Status da seção por ref (`git show <ref>:agent-orchestration/controle/pendencias.md`): c9a2d036 ABERTA · 5d8aa9a3 (dev do 12b, "fecha P-SAN3-20-RESUMO-CHEQUE-VINCULADO") FECHADA · fc5ead6c FECHADA · b5246e8d^1 (ramo antes do merge) FECHADA · b5246e8d^2 (main f7922ab7) ABERTA · **b5246e8d (merge da fatia 1) ABERTA** · bb4f0680, f1e71a1b, e77a5ac1^1/^2 e **objeto e77a5ac1: ABERTA**.
- A main não mexeu na seção (c9a2d036 × b5246e8d^2: 0 linhas); o objeto tem a seção IGUAL à da base (0 linhas de diferença com c9a2d036): o merge descartou o lado do ramo — a linha `status: FECHADA pelo B-SAN3-12b … vale no merge` e a linha `critério medido no fechamento (B-SAN3-12b): …`.
- O índice do objeto (gerado, R7 = 0) diz o mesmo: `P-SAN3-20-RESUMO-CHEQUE-VINCULADO | 11626 | BAIXA | sim` (aberta).
- Texto que não se cumpre: E2.5 passo 2 — "os dois lados ficam … conferir que os cabeçalhos `## P-…` do objeto (…, **o fechamento de `P-SAN3-20-RESUMO-CHEQUE-VINCULADO`**) e os do #464 existem uma vez cada"; R8 "com os dois lados do registro". O relatório do dev (l.281) diz "cada cabeçalho conferido uma vez, inclusive … P-SAN3-20-RESUMO-CHEQUE-VINCULADO" — conferiu o cabeçalho, não o fechamento.
- O critério de produto do fechamento continua cumprido (o rótulo "R$ 1.000,00 em 1 cheque vinculado a títulos aguardam compensação" está na tela: asserção do caso vivo F14, verde no 1.a). O defeito é do registro: o objeto deixa de rastrear o que o bloco entregou (§A5).
- Veredito parcial: achado C3R2-02 (no voto).

### 3.e D-1 a D-9 no objeto
- D-1, D-2: transcrição (§4.7/§12.1 pedem o rótulo; §7.2 pede `workOrderId` no tipo; o número segue vindo do servidor). D-3: transcrição de ambiente, formalizada pela E2/R14 ("de `frontend/` para os `.tsx`, como a D-3 transcreve") — medição da forma da raiz no 3.f. D-4: da C2 (não julgo). D-5 e D-9: DECLARADAS pela E2.2 (emenda do planejador de topo) — não é silêncio. D-6: revertida pela E2/R5 (o produto agora oferece "Cancelar o cheque", item 1); o texto da D-6 no relatório (l.192-195) continua descrevendo o ciclo 1 ("sem 'Cancelar o cheque'", "cancele-o lá") sem marca de superado — nota de registro (a R13 só manda corrigir a D-8). D-7: transcrição (o bloco lê `GET /cheques?title_id=`, rota do §4.1). D-8: corrigida (R13(c)) e medida por mim no 3.f.

### 3.f Bateria do R14 no meu worktree (script $SCRATCH/bateria.sh; logs $SCRATCH/bat-*.log)
- front-check | início 02:32:26Z | fim 02:33:01Z | ec=0 | 
- smoke-node20 | início 02:33:02Z | fim 02:36:39Z | ec=0 | # tests 1475 # pass 1475 # fail 0 # skipped 0 
- smoke-node22 | início 02:36:39Z | fim 02:40:13Z | ec=0 | # tests 1475 # pass 1475 # fail 0 # skipped 0 
- front-build | início 02:40:13Z | fim 02:40:37Z | ec=0 | 
- raiz-check | início 02:40:37Z | fim 02:41:19Z | ec=0 | 
- raiz-lint | início 02:41:19Z | fim 02:41:34Z | ec=0 | 
- raiz-build | início 02:41:34Z | fim 02:41:51Z | ec=0 | 
- diff-check | início 02:41:51Z | fim 02:41:51Z | ec=0 | 
- Node 22: o log do smoke 22 imprime `v22.14.0` duas vezes (raiz e `frontend/`), por `PATH=/c/Users/AMP/AppData/Local/nvm/v22.14.0:$PATH`, sem `nvm use`. D-8 verdadeiro: 1475/1475 nas duas versões (meta R14 ≥ 1453).
- `git diff --check f0769739 e77a5ac1` → vazio (ec=0, log 0 byte). `git status --porcelain` depois da bateria → vazio (artefatos de build ignorados).
- Testes do bloco de `frontend/` (1.a): 112/112, ≥ 84 da meta R14.
- `npm test` da raiz não está na bateria do R14 e não foi rodado: o PR não toca `src/`, `prisma/`, `scripts/` (0 caminho) e o job `backend` da CI no objeto está `success` (4157 · 4155 · 0 · 2). Redução declarada; `arquivos_medidos` = `**` pelos check/build/test:smoke.
- Recursos após a bateria (02:41:59Z): memória de commit livre 12,27 GB.

### 2.f F18 — CE-4 no MEU Postgres descartável (autorizado pelo inspetor: nome próprio, porta 48124, 127.0.0.1), script $SCRATCH/ce4.sh, log $SCRATCH/ce4.txt
- 02:43:09Z pg run ec=0
- 02:43:10Z redis run ec=0
- 02:43:12Z pg_isready após 2s
- CREATE DATABASE
- 02:43:14Z versão: PostgreSQL 16.15 on x86_64-pc-linux-musl, compiled by gcc (A
- 02:43:32Z migrate j12b2_c3r2_a ec=0 · 119 linhas de aplicação · última: 20260882000000_grant_finance_unreconcile_and_cheque_unlink_permissions
- 02:43:51Z migrate j12b2_c3r2_b ec=0 · 119 linhas de aplicação · última: 20260882000000_grant_finance_unreconcile_and_cheque_unlink_permissions
- 02:43:53Z provision-rbac (só no banco A) ec=0
- 02:44:08Z CE-4 j12b2_c3r2_a #1 ec=0 · # tests 2 # pass 2 # fail 0 # skipped 0  · braço: [braço 1 — base PROVISIONADA (papéis globais)]
- 02:44:19Z CE-4 j12b2_c3r2_a #2 ec=0 · # tests 2 # pass 2 # fail 0 # skipped 0  · braço: [braço 1 — base PROVISIONADA (papéis globais)]
- 02:44:30Z CE-4 j12b2_c3r2_a #3 ec=0 · # tests 2 # pass 2 # fail 0 # skipped 0  · braço: [braço 1 — base PROVISIONADA (papéis globais)]
- 02:44:42Z CE-4 j12b2_c3r2_b #1 ec=0 · # tests 2 # pass 2 # fail 0 # skipped 0  · braço: [braço 2 — base SÓ-MIGRADA (papéis da organização)]
- 02:44:53Z CE-4 j12b2_c3r2_b #2 ec=0 · # tests 2 # pass 2 # fail 0 # skipped 0  · braço: [braço 2 — base SÓ-MIGRADA (papéis da organização)]
- 02:45:05Z CE-4 j12b2_c3r2_b #3 ec=0 · # tests 2 # pass 2 # fail 0 # skipped 0  · braço: [braço 2 — base SÓ-MIGRADA (papéis da organização)]
- 02:45:05Z FIM
- Containers `j12b2-c3r2-pg` (postgres:16-alpine, 127.0.0.1:48124) e `j12b2-c3r2-redis` (redis:7-alpine, 127.0.0.1:48126); senha aleatória por execução em arquivo do $SCRATCH, só por ambiente de comando (na evidência: ***); variáveis definidas só como prefixo: DATABASE_URL, REDIS_URL, CORE_SAAS_PERSISTENCE (nenhum export). Banco A `j12b2_c3r2_a` migrado + `db:provision-rbac` (CONVERGIDO, 912 concessões); banco B `j12b2_c3r2_b` só migrado. Última migração nos dois: 20260882000000_grant_finance_unreconcile_and_cheque_unlink_permissions.
- Resultado: banco A 3× `tests 2 · pass 2 · fail 0 · skipped 0`, braço 1 (PROVISIONADA); banco B 3× idem, braço 2 (SÓ-MIGRADA). O teste afirma `rolsuper=false, rolbypassrls=false` do papel efêmero do app (l.88-91) e passou.
- Mutação F18 (runner, $SCRATCH/mut-f18b.log): 1º passo da conciliação com `expected_reconciled: true` em vez do lido → braço 1 VERMELHO pelo passo certo (`conciliar: … 409 reconciliation_stale`), 2 · 1 · 1; restauro hash = blob. Uma tentativa anterior minha (mut-f18.log) mutou o passo 7 (que já espera 409) e ficou verde — mutação mal escolhida (continua "estado antigo"), descartada como controle; registrada por honestidade.
- Veredito parcial F18: verde nos dois braços, 3+3, skipped 0; braço 1 sem CI é a pendência aberta da E2.4.

### Item 2 — veredito parcial: C3-02/R4 FECHADO (F14 6 URLs, sem repetição, em 3 ordens; R4(b) cumprida no código); F9, F10, F14, F18, F20, F22 e R12 verdes com mutações vermelhas. ACHADO C3R2-01 (bloqueia, dentro-do-bloco, não grave): a trava F8 não pega `<chamada>(…).reduce(` / `(<expr>).reduce(`. Nota C3R2-03: R4(b) sem teste que a prenda.

### Item 3 — veredito parcial
- C3-07/R7 FECHADO (índice = gerador no objeto e em todo commit do ciclo 2; controle 104 e R7-M1 12). R13 cumprida (2 cabeçalhos/3 ratificações + E2 verbatim; D-8 verdadeiro; pendências da E2.4 com dono e critério). Escopo do ciclo 2 dentro do E2.1, 0 proibido; PR sem src/prisma/.github/Kpis/scripts. Main ancestral (f0769739 = origin/main = merge-base), PR MERGEABLE. Bateria R14 verde (check, smoke Node 20 e 22 1475/1475, builds, lint, diff --check).
- ACHADO C3R2-02 (bloqueia, dentro-do-bloco, não grave): o merge da main (b5246e8d) descartou o fechamento de P-SAN3-20-RESUMO-CHEQUE-VINCULADO. Nota C3R2-04: texto da D-6 no relatório não marcado como superado.

## Teardown (02:46:56Z)
- Containers `j12b2-c3r2-pg` e `j12b2-c3r2-redis` removidos por `docker rm -f -v` (nome exato); `docker ps -a --filter name=j12b2-c3r2- -q | wc -l` = 0. Bancos j12b2_c3r2_* sumiram com o container.
- Senha: busca na evidência e no voto = 0; nos logs do $SCRATCH = 0; arquivo da senha apagado.
- Toda mutação restaurada com `hash-object` = blob (DIFERENTE = 0 em todos os logs); checkout do ciclo 1 restaurado (status 0); sonda copiada apagada do worktree antes da bateria; `git status --porcelain` do worktree = 0 no fim.
- Processos com o caminho do worktree = 0 (listagem do Win32_Process sem a própria consulta); `git worktree remove --force C:/Users/AMP/j12b-c2-c3r2-wt` ec=0, caminho ausente, fora do `git worktree list`.
- Objeto no fim: ls-remote do ramo = gh pr view 469 headRefOid = e77a5ac14e6ca8021ee5fb5ff4ba2f839675ead2 (não andou); origin/main no fim = f076973921539165df8d406b8c061dbf4e4ee127 (não andou); PR OPEN, MERGEABLE.
- Base viva (erp-postgres, erp-redis, portas 5432/6379/3000/5173/5050/8899) nunca tocada. `w-san312b`: única escrita = c3r2-evidencia.md e c3r2-voto.json no diretório do ciclo 2. Nenhum commit.
- $SCRATCH (C:/Users/AMP/erp-pausa-2026-10-03/j12b2-c3r2/) fica com sondas, runner, listas de mutação, TAPs e logs — roteiro de re-execução (P3); sem senha.
- Disco C: 12,33 GiB livres no fim.

VOTO: REPROVADO — (1) a trava do F8 deixa passar soma de dinheiro por `<chamada>(…).reduce(` / `(<expr>).reduce(` nos diretórios do bloco, forma que o `rg` ratificado acusa (C3R2-01); (2) o merge da main perdeu o fechamento de P-SAN3-20-RESUMO-CHEQUE-VINCULADO que a E2.5 manda conferir (C3R2-02) | escopo: dentro-do-bloco | classe: não grave | ciclo 2 | evidência: mutações C3R2-F8-filter/-values guard 4·4·0 com `git grep` = 9; status FECHADA→ABERTA em b5246e8d, seção do objeto = a da base. C3-05, C3-02, C3-07 e C3-01 fechados.
