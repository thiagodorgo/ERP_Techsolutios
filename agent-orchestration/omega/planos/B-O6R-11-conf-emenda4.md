# conf-emenda4-o6r11: conferência da Emenda 4 (despesa) do B-O6R-11

> **Papel:** `conf-emenda4-o6r11`, identidade nova; não escreveu a emenda, o plano nem o código. **Modelo que rodou:** Opus (claude-opus-5-5), declarado.
> **Refs medidas (§A7), depois de `git fetch origin`:** `origin/main` `0fda595a`; `origin/fix/mobile-fila-duravel-b-o6r-11` `19e18e15`.
> **Sonda:** clone próprio `C:/Users/AMP/s-cf4/r` (`git clone --shared`, esparso em `mobile/flutter_app`, sem tocar worktree alheio). Nela apliquei D1 a D7 ao pé da letra e reescrevi os testes a partir do texto da emenda. Sem Docker, sem base viva, sem porta. Flutter local 3.41.6. Removida ao fim; o log das mutações ficou em `revisoes/conf-emenda4-o6r11-mutacoes.log`.
> **Regra da VOLTA, do mandato:** só se o dev errar ou o técnico perder dado. Quem acha não propõe conserto (§C7.4-bis): aqui só defeito, comando e motivo.

## Evidência incremental (P1)

| # | comando | saída resumida | parcial |
|---|---|---|---|
| C.1 | `git fetch origin; git rev-parse origin/main origin/fix/mobile-fila-duravel-b-o6r-11` | `0fda595a` / `19e18e15`, iguais às refs da emenda | refs válidas |
| C.2 | `git show <ramo>:.../sync_models.dart` | `copyWith` tem `clearLastErrorCode`, `clearLastSafeError`, `clearProcessedAt` | D4 da emenda implementável |
| C.3 | `git show <ramo>:.../sync_queue_repository.dart` | `pendingForTenant` = pending + failed + conflict; `update` sem guarda de transição | resgate, retry e discard gravam |
| C.4 | `git show <ramo>:.../sync_conflict_resolver.dart` | `useServer` → `synced`, processedAt, erros limpos, sem marca | conflito de despesa + "Versão do gestor" = "Sincronizado" |
| C.5 | `git grep -n "SyncQueueSummary\|lastSafeError" <ramo> -- lib` | fora da tela: só `diagnostics_screen.dart:31`, aberta da home (`home_screen.dart:158,259`) | Diagnóstico segue por status cru |
| C.6 | `git grep -n "syncEngineProvider\|flushTenant" <ramo> -- lib` | só a definição e o provider, 0 chamadores | `SyncEngine` é caminho morto, como a emenda diz |
| C.7 | `git grep -c "Aguardando envio\|isStalledAction\|PendingBackendExpenseSyncBatchApi" 19e18e15 -- lib`; `git grep -n "Aguardando envio\|stalled-card\|showDialog" 19e18e15 -- sync_screen.dart` | ambos sem saída, rc=1 | prova negativa da emenda confere |
| C.8 | `git grep -n "lastSafeError: '" <ramo> -- sync_replay_service.dart` | l.219, 759, 1463: "Conflito remoto exige decisao manual." | D7.6 ecoa isso no cartão |
| C.9 | `grep -n ... planos/B-REENVIOS-plano.md` l.196, l.202, l.231 | 3º PR: molde "sem token → Pending"; `sync_screen.dart` e `auto_sync_coordinator.dart` PROIBIDOS lá | "canal desligado" passa a incluir "sem token" |
| C.10 | `grep -n "legacy-discard\|Assumir\|Q-A1" planos/B-REENVIOS-plano.md`; `grep -c "Assumir" planos/B-O6R-11-emenda-4-despesa.md`; `grep -n P19 revisoes/fidelidade-3110.md` | 2º PR: ação sem usuário "não é enviada por ninguém" (l.69); cartão legado com Assumir e Descartar para toda ação (l.76, l.88, l.97); P19 aprovada = parada até Assumir; emenda 4 cita Assumir **0** vezes | ver Defeito 3 |
| C.11 | sonda (D1-D6): `flutter analyze lib` | No issues found | desenho compila; `apiConfigProvider` sai sem quebrar |
| C.12 | sonda: `flutter test` com p3 no texto literal | p1, p2, p4 verdes; **p3 vermelho**: `syncing` termina `pending`, `SYNC_INTERRUPTED`, "O envio foi interrompido…" | ver Defeito 2 |
| C.13 | sonda: `expense_receipt.attach` `syncing`, canal desligado, `triggerManual` | `conflict`, "Minha versão reenvia; Versão do gestor encerra este item." | ver R1 |
| C.14 | sonda (D7 inteiro): w1 a w8 + caso do comprovante | verdes. Medido: ícone `error_outline` na linha "Aguardando envio" legada; `check_circle_outline` na "Descartado"; corpo "Work Order Status Update não foi enviado após 5 tentativas…"; conflito "Work Order Status Update — Conflito remoto exige decisao manual."; comprovante + "Versão do gestor" → chip "Sincronizado" | D7 implementável; ver Defeito 4, R1, R2 |
| C.15 | sonda: `flutter test --concurrency=4` | `+944 -3`: p3 literal (C.12); `b106` 20 (artefato do meu clone esparso, sem `Kpis/`); **guard 21** `auto_sync_coordinator.dart:57: V3 portadora descartada - _triggerSync()` | nenhum outro teste existente fica vermelho: as edições do §3 bastam |
| C.16 | sonda com `git stash -u` (head puro): `flutter test test/core/sync/bo6r11_guard_fila_await_ast_test.dart` | guard 21 vermelho, mesma linha 57 | já está no ramo |
| C.17 | `gh run view 41259009193 --log-failed` (CI do head `19e18e15`) | `+893 -1 … guard 21 … V3 portadora descartada`; `+934 -1: Some tests failed`; job flutter failure | CI confirma; ver Defeito 1 |
| C.18 | sonda: 20 mutações, uma por vez, restauradas do backup; base verde por nome antes | todas vermelhas (lista em (3)); amostra M-P2 e M-V2 com motivo visível: é a asserção, não compilação | mordem |
| C.19 | sonda: `_resolveStalled` sem reler (usa `action` em vez de `fresh`) | w4 **verde**, w5/w6 **verdes** | ver R3 |
| C.20 | head puro: cenário de p1 com `MockExpenseSyncBatchApi(results: const [])` | `failed r=1 MISSING_RESULT`; `failed r=3 MISSING_RESULT` | vermelho-controle executável confere |
| C.21 | sonda: `git diff 0fda595a --stat -- sync_replay_service.dart`; `grep '^@@'` | `+12 −0`; hunks l.127 e l.145 | "≈ +14" e "≤ l.250" conferem |
| C.22 | `rm -rf C:/Users/AMP/s-cf4`; `git status --short`; disco; memória | sonda removida; 3 não rastreados que já estavam; 23 GB; memória livre mínima medida 7,3 GB | limpo, acima dos pisos |

## (1) Despesa vira erro ou cartão de Descartar com o canal desligado?

**O caminho principal fecha.** A checagem de tipo impede `syncing`, tentativa e rede (p1, M-P1). Os replays de OS, vistoria e evidência filtram pelos tipos próprios e não pegam despesa. `SyncEngine` não tem chamador (C.6). Despesa só entra em `stalled` com canal ligado, e aí sem Descartar (w7, M-V4).

**Sobram dois caminhos:** R1 (comprovante vira cartão vermelho) e R2 (ícone de erro). O Diagnóstico está em R5.

## (2) Nada se perde ao ligar o token; sem dobra

**Sem dobra: confere.** `_running` impede passada dupla; resgate de `syncing` e de `failed` são disjuntos (p3); com canal ligado o resgate não roda (p4, M-R4); o legado nunca chegou ao servidor (401 sem token, E.5) e o backend deduplica pela chave (B-REENVIOS M.18, R-B4).

**"Nada se perde" indo do 1º direto ao 3º PR: confere.** Só deixa `failed/5` com "Tentar de novo" (R-x, w7).

**Mas a emenda ignora o 2º PR, que fica entre eles:** ver Defeito 3.

## (3) Testes, vermelho-controle, mutações, comandos

- **Comandos rodam:** todos os arquivos citados existem; `flutter analyze lib` limpo; os testes escritos do texto da emenda compilam.
- **Vermelho-controle:** C.7 e C.20 conferem. Os arquivos novos não compilam no head, como a emenda declara.
- **Mutações que mordem (executadas, C.18):** M-P1, M-P2, M-R1, M-R2, M-R3, M-R4, M-PR1, M-PR2, M-S1, M-S2, M-S3, M-S4, M-S5, M-S6, M-V1, M-V2, M-V3, M-V4, M-V5, M-V6. M-V6 foi aproximada por `expenseChannelOff: false` no contador, o que dá a mesma contagem crua.
- **Defeitos:** Defeito 1 (suíte não fecha), Defeito 2 (p3 impossível), R3 (releitura sem teste).
- **Detalhes sem efeito:** o §3 diz "4 `find.text`" no `b122`; são 2 `find.text` e 2 títulos de teste. O texto do conflito aparece no cartão e na linha, então w8 precisa escopar pelo cartão.

## (4) Texto final

Verdadeiros e sem termo técnico: aviso novo (fala só de despesas, condicional), S-n3, diálogo (salvo o rótulo), "Aguardando envio", "Descartado", acentos da lista D7.8. Defeitos em Defeito 4, R4 e R6.

## (5) Escopo e 2º PR

- **Escopo:** as edições literais do §3 bastam (C.15). O único vermelho que sobra é o guard, e aí o §3 é o que impede o conserto (Defeito 1). Diff do replay dentro do limite (C.21).
- **Sem antecipação insegura:** a API `Pending` sem condição não envia nada sob sessão nenhuma, então a fila sem usuário não vaza; `actionsForTenant` cru no resgate é o que o 2º PR mantém (PA3).
- **Ressalvas:** Defeito 3 e R7.

## Defeitos que seguram

**Defeito 1. O ramo já está vermelho, e a emenda proíbe consertar. O dev erra.**
Motivo: a F4c pôs `await queue.update` em `_triggerSync`, que virou portadora; `auto_sync_coordinator.dart:57` a descarta no `ref.listen`; o guard 21 da emenda 3 reprova. O diário da F4c só rodou "7 + 2 + 9". A emenda 4 §0 dá F4c por feita e cita N = 905 sem esse vermelho; o §3 diz "só o bloco l.79-89", e D4' diz "Nada mais no arquivo"; o arquivo do guard não está no PERMITIDO. O §5 exige zero falha. Na F7c, o dev só tem três saídas: parar, sair do escopo ou afrouxar o guard.
Comando: `gh run view 41259009193 --log-failed | grep "V3 portadora"`; e no ramo, `cd mobile/flutter_app && flutter test test/core/sync/bo6r11_guard_fila_await_ast_test.dart` → `-1`.

**Defeito 2. (p3) não passa com o desenho D4/D4'. O dev erra.**
Motivo: p3 pede "as 3 despesas `pending` com `retryCount 0` e erros limpos", semeando uma `syncing`. D4' lê `actions` uma vez e `reclaimExpensesAwaitingBackend` só pega `failed`; a `syncing` sai de `reclaimInterruptedSyncing` com `SYNC_INTERRUPTED` e texto (e mantém o `retryCount` que tinha). Na sonda, o caso fica vermelho. O dev vai ter de mudar teste ou desenho sem emenda.
Comando: na F-S1a', escrever p3 como está na emenda e rodar `flutter test test/core/sync/bo6r11_despesa_aguardando_envio_test.dart`; `expect(lastErrorCode, isNull)` da despesa `syncing` falha com `'SYNC_INTERRUPTED'`.

**Defeito 3. A promessa e a decisão do dono não sobrevivem ao 2º PR. O técnico pode perder dado.**
Motivo: o 2º PR entra antes do 3º (P24; emenda 2 l.75). Com ele, toda despesa gravada antes dele fica sem usuário e "não é enviada por ninguém" até o técnico tocar "Assumir" (`B-REENVIOS` l.69; P19 aprovada). Isso desmente, para esse legado:
- P6(iv): "saem na passada seguinte sem o técnico fazer nada";
- o aviso da tela: "serão enviadas automaticamente";
- o corpo do PR (F7c): "sobe sozinha quando o 3º PR ligar o canal".

E o cartão legado do 2º PR dá **"Descartar" a toda ação sem usuário, inclusive despesa, sem confirmação**, com a marca do 1º PR (`B-REENVIOS` l.76, l.88, RA4(4) l.97). É exatamente o que o dono mandou tirar (`D-DESPESA-SEM-DESCARTAR`, e P25 pede confirmação); o que for descartado ali não volta. A emenda 4 afirma "Despesa nunca ganha Descartar" e o F6c não leva nada disso ao plano do 2º PR.
Comando: `grep -c "Assumir\|legacy" planos/B-O6R-11-emenda-4-despesa.md` → 0; `grep -n "legacy-discard\|não é enviada por ninguém" planos/B-REENVIOS-plano.md`; `grep -n "D-DESPESA-SEM-DESCARTAR" planos/B-REENVIOS-plano.md` → nada.

**Defeito 4. §1 e D7 se contradizem no critério que a junta vai cobrar. O dev erra.**
Motivo: P-TELA-VERDADEIRA diz "os textos novos e alterados têm acento e não usam termo técnico". D7.3 e D7.4 montam texto novo com `_actionLabel`, que sai em inglês: medido "Work Order Status Update não foi enviado após 5 tentativas"; no diálogo, «Work Order Status Update» de Ordens de Serviço. D7.6 põe no cartão de conflito "Conflito remoto exige decisao manual.", sem acento, enquanto §3 e R-y afirmam que "o cartão não as ecoa". Quem seguir D7 reprova pelo §1; quem seguir o §1 sai de D7 e entra no `_actionLabel`, que é do `B-SAN3-19`.
Comando: montar D7.3 e D7.6 e ler os `Text` de `stalled-card-<id>` e `conflict-card-<id>` (saída em C.14); `git grep -n "Conflito remoto" origin/fix/mobile-fila-duravel-b-o6r-11 -- mobile/flutter_app/lib/core/sync/sync_replay_service.dart`.

## Ressalvas (não seguram sozinhas; cabem na mesma correção)

- **R1. Comprovante com cartão vermelho e "Sincronizado" falso.** `expense_receipt.attach` `syncing` (app morto durante uma passada antiga) vira `conflict` com canal desligado. "Versão do gestor" encerra o item e o chip mostra "Sincronizado", mesmo sabendo que nada chegou ao servidor (401 sem token). R-ac só cita "Minha versão". O comprovante continua no aparelho (`expense_repository.dart`, `uploadStatus: local`), por isso não conto como perda. Comando: C.13 e C.14.
- **R2. Ícone de estado cru.** `_ActionRow` usa `_statusIcon(action.status)`; D7.2 não trata o ícone. Despesa `failed` legada mostra `error_outline` ao lado de "Aguardando envio", e "Descartado" mostra o mesmo `check_circle_outline` de sincronizado. w1 e w6 não olham o ícone. Comando: `find.byIcon(Icons.error_outline)` na fila de w1 → 1.
- **R3. Releitura de D7.5 sem teste nem mutação.** Declarada "obrigatória", mas `_resolveStalled` sem reler passa em w4, w5 e w6 (C.19). A F5 limita a sonda ao `_resolveConflict`.
- **R4. "não foi enviado após N tentativas"** é a mesma afirmação que E.15 rejeitou em "Nada foi enviado": falsa quando a falha foi timeout depois de o servidor gravar.
- **R5. Diagnóstico.** Segue contando `failed` cru e mostra `NETWORK_ERROR` da despesa legada até a 1ª passada; depois dela, a despesa `syncing` resgatada mantém o cartão `SYNC_INTERRUPTED`. A tela abre da home. Não está em §6. Comando: `git show origin/fix/mobile-fila-duravel-b-o6r-11:mobile/flutter_app/lib/core/diagnostics/diagnostics_screen.dart | sed -n 31p`.
- **R6. "Auto sync" e "Ultimo sync:".** D7.8 diz "toda string da tela", mas não os lista nem entre os que ficam; `grep -c "Auto sync\|Ultimo sync" planos/B-O6R-11-emenda-4-despesa.md` → 0; sem teste. Fica sem dono.
- **R7. Aparelho compartilhado até o 2º PR.** O cartão deixa u2 descartar item de OS encalhado de u1, com confirmação. A leitura cruzada já existe hoje; o botão é novo. Não está declarado.
- **R8. Depois do 3º PR, "canal desligado" inclui "sem token".** Com o molde de `B-REENVIOS` l.196, na janela sem token a tela volta a dizer "Envio de despesas ainda não ativado" e D4' zera a contagem de uma `failed` real. Não perde dado. O 3º PR proíbe `sync_screen.dart` e `auto_sync_coordinator.dart` (l.231), e o F6c não avisa. `B-REENVIOS` l.196 também diz que `apiConfigProvider` "fica como está (outros usos)"; a emenda o remove, com 0 leitores medidos.

## O que conferiu sem ressalva

P1 e P2 da sonda, a apresentação D5 e os contadores (r3, r4, w1, w2), o resgate puro (r1, r2), o resolvedor (s1 a s4), a confirmação do Descartar (w5, w6), o aviso condicional (w3, w3') e o isolamento do diff do replay. Fora do guard, nenhum teste existente ficou vermelho além dos que o §3 manda editar.

Modelo que rodou: Opus (claude-opus-5-5), sem fallback. Sem commit, push, Docker ou base viva; nada rastreado tocado.

VEREDITO: VOLTA
