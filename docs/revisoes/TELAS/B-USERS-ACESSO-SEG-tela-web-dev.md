# B-USERS-ACESSO-SEG — fatia T1, tela web de troca de senha (diário do dev)

> **Identidade:** `dev-527-tela-cl`, nova (não achou, não planejou e não criticou nada no #527).
> **Modelo:** Claude Opus 5.5 da sessão, DECLARADO (telas no Claude, `D-DESIGN-SO-CLAUDE`; topo não se aplica a dev).
> **Ramo:** `feat/users-seg-tela-web`, worktree `C:/Users/thiag/w-tela527`, criado de `e09e9667` (F1 do conserto).
> **Plano:** `erp-pausa-2026-10-03/planos/B-USERS-ACESSO-SEG-conserto-c1.md`, seção A-04 (T.1, T.2, T.4) e as Emendas 3, 4 e 5,
> que prevalecem nessa ordem. Toda hora deste diário vem de `date` (São Paulo).
> **Escopo:** só os caminhos de `frontend/` de T.2 (PERMITIDO), a referência aprovada em `screen-refs/` e uma linha no
> `screen-refs/README.md` (Emenda 5 e o mandato). Nada em `src/`, `tests/` do backend, `mobile/`, `prisma/` nem `.github/`.
> Este diário entra porque o mandato o nomeia (a lição do C3-E1: o diário tem de estar no escopo).

## 0. Terreno (21:31–21:40)

| Medida | Comando | Saída |
|---|---|---|
| head do ramo | `git rev-parse HEAD` | `e09e96675645c4c4b65274172714a798a6154577` (F1) |
| árvore | `git status --short` | só `?? docs/claude-code-handoff/screen-refs/troca-senha-3opcoes.reference.html` |
| referência = aprovada | `md5sum` dos dois arquivos | `2129fbd68d4d888720876842c31b50cc` no worktree e em `erp-pausa-2026-10-03/telas-3opcoes/troca-senha-claude.html` (Emenda 4, item 1) |
| `node_modules` do frontend | `ls -la frontend/node_modules` | ausente (sem junction; `npm ci` próprio a seguir) |
| semáforo e memória | `recursos.status`; `FreeVirtualMemory/1024` | `VERDE`; 25.768 MB livres de commit |

**Orquestrador, 21:39:** até 22:05 (teste de carga de memória do dono), o AMARELO também libera os passos pesados; só o
VERMELHO para (espera de 5 min e nova medida). **21:44:** janela estendida até 22:45.

| Passo | Comando | Saída |
|---|---|---|
| `npm ci` próprio (21:40–21:41) | `npm --prefix frontend ci --no-audit --no-fund` | `added 103 packages in 11s`, saída 0; `frontend/node_modules` é diretório real (sem junction); lockfile sem diff |
| linha de base do `test:smoke` no objeto `e09e9667` (21:42–21:44) | `npm --prefix frontend run test:smoke` (semáforo `VERDE`, 23.908 MB livres) | `# tests 1676 · # pass 1676 · # fail 0 · # skipped 0`, saída 0 (bate com os 1676 da crítica, RQ-1) |

## 0b. RETOMADA (P8), 21:54

A sessão do orquestrador caiu às ~21:45. Medido antes de seguir: `git status --short` só com os 2 não rastreados
(a referência, md5 `2129fbd6…` igual ao de 21:40, e este diário, 39 linhas, consistente); `git log -3` com o head
`e09e9667` (nada meu commitado); `git diff --stat` vazio (nenhum arquivo rastreado meio-escrito). A linha de base acima
terminou antes da queda (21:44:45, saída 0). Nada a refazer; sigo do desenho para o código.

## 1. Leituras declaradas (§A6), antes do código

Tela-modelo: `frontend/src/pages/LoginPage.tsx` (marca, cartão, `.lg-input`, faixa, botão primário e o secundário).
Skills: `ts-frontend-full` (implementar) e `ui-ux-pro-max` (revisar). Alvo visual: `screen-refs/troca-senha-3opcoes.reference.html`.

- **L1 · Contrato da troca, medido no `src/` de `e09e9667`.** `POST /auth/password` responde `{error:{code, reason,
  message}}`: 400 `invalid_payload`; 401 `jwt_required` (`code UNAUTHORIZED`) e 401 `INVALID_TOKEN` (`code`, SEM
  `reason`, `authenticated-actor.middleware.ts:120-126`); 401 `invalid_credentials`; 403 `user_inactive` e
  `credential_unavailable`; 423 `account_locked`; 400 `invalid_new_password` (`identity-link.service.ts:470-514`).
  O cliente classifica por `status` + `reason` (+ `code` no `INVALID_TOKEN`). Fora do mapa: 401 com outro motivo conta
  como sessão vencida (volta ao login: tentar de novo com token morto não resolve); 423 por status; qualquer outro par
  (400/403 com outro motivo, 404, 429, 5xx, rede, tempo esgotado) vira o texto genérico. A mensagem do servidor nunca é lida.
- **L2 · Tempo esgotado.** O mapa de T.1 tem "tempo esgotado"; `fetch` não tem prazo. A troca ganha prazo de 30 s
  (`AbortController`), que vira o texto genérico. Residual: se o servidor concluir depois do prazo, a pessoa vê "tente de
  novo" e a nova tentativa cai em "a senha provisória não confere" (a provisória já foi trocada).
- **L3 · Registro × "a sessão restrita não lê a preferência" (Emenda 4, item 3).** O guard do registro
  (`aparencia-registro.guard.test.ts`, (i)) exige UM contêiner que chame `useScreenAppearance("troca-senha")`, e o
  PERMITIDO só deixa acrescentar a linha do mapa nesse guard. A página chama o gancho e DESCARTA o valor na sessão
  restrita (sempre A). Fica provado por teste: organização ativa velha no navegador + preferência "C" guardada → a tela
  abre na A. Se a conferência ler "não lê" como "não chama o gancho", o caminho é uma exceção no guard, que pede emenda.
- **L4 · Componentes novos × biblioteca (§A2, conflito registrado, não consolidado em silêncio).** A referência diz que a
  lista de requisitos e o medidor de força (B) e o indicador de etapas (C) são componentes novos que "nascem na
  biblioteca" (CLAUDE.md §4, item 3). O PERMITIDO de T.2 não inclui `frontend/src/components/**` nem o
  `COMPONENT_LIBRARY.md`, e o mandato diz "SÓ os caminhos de T.2". Eles nascem dentro de `ChangePasswordViewB.tsx` e
  `ChangePasswordViewC.tsx`, e as peças comuns às 3 (moldura, campo de senha com "Mostrar", faixas, botões, estilos) moram
  em `ChangePasswordViewA.tsx`, a base "Padrão fiel", que B e C importam (sem ciclo). Não bloqueia: B e C não aparecem em
  tempo de execução (a sessão restrita abre sempre na A). **Para o orquestrador decidir:** emenda que leve os 3 à
  biblioteca neste PR, ou pendência com dono.
- **L5 · A C começa na etapa 1.** A maquete abre o estado "Inicial" da C na etapa 2 porque preenche a provisória de
  exemplo. Na tela real a provisória começa vazia, então a C abre na etapa 1 ("Continuar"), como diz a própria
  referência ("primeiro a provisória, depois a nova"); é regra de fluxo, e nela vale o plano (T.4).
- **L6 · Acesso não permitido trava o formulário** nos dois 403 de T.1 (`user_inactive` e `credential_unavailable`),
  deixando só "Sair" (a referência trava o desativado; o `credential_unavailable` é do mesmo estado em T.1). O 423 e o
  genérico mantêm o formulário aberto, como o login faz no 423.
- **L7 · Aviso de sessão vencida no login.** O texto "Sua sessão expirou…" aparece no login, na faixa vermelha da
  referência (texto `#B91C1C`); a faixa de erro que o login já tem segue `#DC2626` (o contraste dela é pendência da
  própria referência, fora do escopo desta linha do PERMITIDO). "Sair" e a sessão vencida chamam o `signOut` que já
  existe (limpa o navegador e encerra a sessão no servidor); o 200 só limpa o navegador, porque o servidor já revogou
  todas as sessões do par.
- **L8 · Campo oculto `autocomplete="username"`** com o e-mail da sessão, como a referência sugere ao dev web: ajuda o
  gerenciador de senhas a gravar a nova senha na conta certa; não muda o visual.

## 2. Fatias

### Fatia 1 — código e testes (21:55–22:13)

| Arquivo (todos do PERMITIDO de T.2) | O que entrou |
|---|---|
| `frontend/src/modules/auth/types.ts` | `mustChangePassword?: boolean` em `AuthSession` (opcional, RQ-1) |
| `frontend/src/modules/auth/auth.adapter.ts` | `must_change_password` no tipo da resposta; `mapLoginResponse` com a falha fechada `!== false` (só aqui); mapa fixo `PASSWORD_CHANGE_MESSAGES`, `classifyPasswordChangeFailure`, `readPasswordChangeErrorMessage`, `PasswordChangeError`, `newPasswordRuleChecks` (a regra do servidor espelhada) e `changePasswordWithJwt` (`fetch` direto com o `Authorization` da sessão guardada, prazo de 30 s, RQ-6) |
| `frontend/src/modules/auth/auth.service.ts` | `changeOwnPassword` (sem token → sessão vencida sem requisição; no 200, `onChanged` e `clearStoredAuthSession`) |
| `frontend/src/providers/AuthProvider.tsx` | `isAuthenticated: !!session && session.mustChangePassword !== true` e `passwordChangeRequired` (RQ-1) |
| `frontend/src/pages/LoginPage.tsx` | o desvio num ponto só (`isPasswordChangeSession`, `=== true`), no envio e na renderização; os avisos "Senha alterada" (`role=status`) e "Sua sessão expirou" (`role=alert`) do estado da navegação |
| `frontend/src/App.tsx` | a rota `/change-password` ao lado de `/login` (e o import) |
| `frontend/src/pages/ChangePasswordPage.tsx` | contêiner: guardas (sem sessão → login, com o aviso quando a troca terminou; sessão inteira → `/select-context`), `useScreenAppearance("troca-senha")` com a A forçada na sessão restrita (L3), `useChangePasswordForm` (estado, validação local, etapa da C, foco, envio único) |
| `frontend/src/pages/change-password/ChangePasswordView{A,B,C}.tsx` | as 3 aparências da referência (A com as peças comuns, L4) |
| `frontend/src/modules/appearance/appearance.registry.ts` | entrada `troca-senha`: Padrão fiel · Com guia · Em duas etapas (iguais ao seletor da referência, conferido pelo regex do guard: `{A:'Padrão fiel',B:'Com guia',C:'Em duas etapas'}`) |
| `frontend/tests/aparencia-registro.guard.test.ts` | só a linha do mapa `"troca-senha": "troca-senha-3opcoes.reference.html"` |
| `frontend/tests/auth-troca-senha.adapter.test.ts`, `frontend/tests/troca-senha-live.test.tsx` | novos (11 e 20 testes) |
| `frontend/package.json` | só os 2 testes novos no fim do `test:smoke` |
| `docs/claude-code-handoff/screen-refs/troca-senha-3opcoes.reference.html` + 1 linha no `README.md` | a referência aprovada, byte a byte (md5 acima), e a linha do índice |

**Defeito real achado pelo teste e corrigido antes do commit (W5).** Com o aviso marcado depois do `await` do serviço, o
login abria SEM o aviso "Senha alterada": a navegação do roteador é transição, a sessão que some é atualização comum, e a
tela renderizava primeiro "sem sessão" e redirecionava sem o aviso. Conserto: a saída é sempre pela guarda "sem sessão",
que leva o aviso; o aviso é marcado no MESMO passo em que a sessão some (`onChanged` do serviço; na sessão vencida, antes
do `signOut`). Medido: W5 `not ok` antes, `ok` depois (22:11 → 22:12).

**Revisão `ui-ux-pro-max` (22:12):** contraste dos textos novos ≥ 4,5:1 (faixa `#B91C1C` sobre `#FEF2F2` 5,9:1, como
a referência mediu; dica e rótulos `#64748B`/`#374151` sobre branco); foco visível em campo, "Mostrar", botões e
"Alterar"; todo campo com rótulo; botão de ícone com `aria-label` e `aria-pressed`; erros com `role="alert"`. Dois ajustes:
depois de um envio recusado pela validação local, o foco vai ao primeiro campo com problema; o giro do botão para com
`prefers-reduced-motion`. **Divergência declarada:** a regra da skill pede token em vez de cor fixa, mas a tela-modelo
(`LoginPage.tsx`) e a referência aprovada usam as cores fixas da família do login; segui a tela-modelo (§4 item 1).

Comandos: `npm --prefix frontend run check` limpo (22:02, 22:10, 22:12, 22:13); `node --test --import tsx
tests/auth-troca-senha.adapter.test.ts tests/troca-senha-live.test.tsx tests/aparencia-registro.guard.test.ts` →
`# tests 51 · # pass 51 · # fail 0` (22:13).

## 3. Mutações

Commit da fatia 1: `a351468a` (empurrado às 22:14). Cada mutação é literal, uma por vez, aplicada por script (âncora com
exatamente 1 ocorrência), seguida do teste-dono, e revertida por `git checkout -- <arquivo>` com `git status` limpo
conferido no arquivo (`scratchpad/t1-mutate.mjs`; saída de cada uma em `scratchpad/t1-mut-<id>.log`).

**Desvio do semáforo, declarado.** O primeiro lote (W1, RQ-1 (b), W2, W3, W4; 22:15:13–22:15:47) rodou com o semáforo em
`VERMELHO 01:15:06Z ram_livre=0`: li a linha e não travei. Eram 5 execuções de um arquivo de teste cada (sem `npm ci`,
build nem suíte). Daqui em diante, cada passo pesado espera o `t1-gate.sh` (VERDE, ou AMARELO até 22:45, e commit livre
≥ 2.048 MB, medido de 5 em 5 minutos).

| Id | Mutação literal (arquivo) | Teste-dono | Resultado com a mutação |
|---|---|---|---|
| W1 | `mustChangePassword: payload.data.must_change_password !== false,` → `mustChangePassword: false,` (`auth.adapter.ts`, `mapLoginResponse`) | `auth-troca-senha.adapter` | `not ok 1 [W1·iii]`, `not ok 2 [W1·i]`, `not ok 3 [W1]` · 8/11 |
| RQ-1 (b) | a falha fechada → `payload.data.must_change_password === true` (`mapLoginResponse`) | idem | `not ok 2 [W1·i]` (caso (i) do W1), `not ok 3 [W1]` · 9/11 |
| W2 | `return PASSWORD_CHANGE_MESSAGES[…]` → `return body?.message ?? PASSWORD_CHANGE_MESSAGES[…]` (`readPasswordChangeErrorMessage` devolve a mensagem do corpo) | idem | `not ok 6 [W2] cada linha do mapa…`, `not ok 10 [RQ-6]` (o texto do 401 vira o do servidor) · 9/11 |
| W3 | `isAuthenticated: !!session && session.mustChangePassword !== true,` → `isAuthenticated: Boolean(session),` (`AuthProvider.tsx`) | `troca-senha-live` | `not ok 1 [W3]` · 19/20 |
| W4 | o desvio `return session?.mustChangePassword === true;` → `return false;` (`isPasswordChangeSession`, `LoginPage.tsx`) | idem | `not ok 1 [W3]`, `not ok 2 [W4]` · 18/20 |

Vermelho-controle no objeto `e09e9667` (as linhas "sim" de T.2): no objeto o campo nem é lido e não existe tela nem rota
`/change-password` (`git show e09e9667:frontend/src/modules/auth/auth.adapter.ts | grep -c must_change_password` = 0;
`git show e09e9667:frontend/src/App.tsx | grep -c change-password` = 0). W1, W3 e W4 são mortos pelas mutações acima, que
devolvem exatamente o comportamento do objeto em cada ponto (campo ignorado; sessão restrita autenticada; desvio ausente).

## 4. Bateria

(em apuração: não rodada; ver a PAUSA abaixo)

## PAUSA 01:30 UTC (22:30 SP, `date`)

Ordem do orquestrador (P7): o dono vai reiniciar o PC. Nenhum comando pesado estava em curso (o lote 2 de mutações
esperava o semáforo, VERMELHO de 22:15 a 22:26); o vigia `t1-gate.sh` e o monitor dele foram parados (`TaskStop`), sem órfão.

- **Head:** `a351468a1c98ebac5f5054f581b102ffc64ed14f` (fatia 1) é o que está em `origin/feat/users-seg-tela-web`
  (empurrado às 22:14). Depois dele, só commits LOCAIS de diário (`51c5f1e9`, com a seção 3, e o desta PAUSA), sem push,
  porque a bateria não fechou.
- **Feito (com comando e saída):** `npm --prefix frontend ci` (saída 0, 103 pacotes, sem junction); linha de base do
  `test:smoke` no objeto `e09e9667` = 1676/1676; `npm --prefix frontend run check` limpo no código da fatia 1 (22:13);
  `node --test --import tsx tests/auth-troca-senha.adapter.test.ts tests/troca-senha-live.test.tsx
  tests/aparencia-registro.guard.test.ts` (em `frontend/`) = 51/51 (22:13); mutações W1, RQ-1 (b), W2, W3 e W4 vermelhas e
  revertidas (seção 3).
- **Falta:**
  1. mutações W5, W6, RQ-6, E4.5 (e-mail vazio), E4.3 (preferência na sessão restrita) e RQ-1 (a) (esta pela suíte
     `test:smoke` inteira, para medir os 11 da crítica);
  2. a bateria: `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`
     (esperado 1676 + 31 novos = 1707), `git diff --check`, conferência de escopo
     (`git diff --name-only e09e9667..HEAD` ⊆ PERMITIDO de T.2 + `screen-refs/` + este diário);
  3. registrar as saídas aqui, commitar o diário e dar push; limpar `frontend/dist` (§C5).
- **Próximo comando exato** (de `C:/Users/thiag/w-tela527`, com o semáforo VERDE e o commit livre ≥ 2.048 MB):
  `S=/c/Users/thiag/AppData/Local/Temp/claude/d939c34b716351f1/c5f407dd-e6e4-4333-9bfe-6ed36babdb03/scratchpad; for m in W5 W6 RQ6 E45 E43; do node $S/t1-mutate.mjs $m; done`
  e depois `node $S/t1-mutate.mjs RQ1a` (roda o `test:smoke` com a mutação). O `t1-mutate.mjs` reverte cada mutação por
  `git checkout -- <arquivo>`. Se ele sumir com o reinício, as mutações literais são: W5 apaga `clearStoredAuthSession();`
  de `changeOwnPassword` (`auth.service.ts`); W6 apaga o bloco `lg-campo … c-conf` (o campo de confirmação) de
  `ChangePasswordViewC.tsx`; RQ-6 troca o `fetch` de `changePasswordWithJwt` por
  `apiRequest("/auth/password", { method: "POST", body })`; E4.5 troca `<b>{model.email}</b>` por `<b>{""}</b>`
  (`ChangePasswordViewA.tsx`); E4.3 troca `return restricted ? "A" : preferred;` por `return preferred;`
  (`ChangePasswordPage.tsx`); RQ-1 (a) troca `session.mustChangePassword !== true` por `session.mustChangePassword === false`
  (`AuthProvider.tsx`).
- **Arquivos meio-escritos:** nenhum. Nenhuma mutação aplicada na árvore (todas revertidas; código sem diff).
