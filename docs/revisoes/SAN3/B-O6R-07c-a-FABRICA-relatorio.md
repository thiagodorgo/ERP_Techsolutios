# B-O6R-07c-a — relatório da fábrica (corpos de jurado da junta do PR #414)

> **Papel:** `agente-fabrica`. **Modelo:** Claude Opus 5.5, no nível menor. A substituição foi declarada pelo §C7.6-bis: o
> bloco é de permissão, e a `D-FABLE-ASTRA-SO-DINHEIRO` reserva o Fable a bloco de dinheiro. O disparo citou também a decisão
> do dono de 2026-10-10 ("o topo fica só no plano e em toda reprovação de junta"), que eu **não** achei em
> `agent-orchestration/controle/decisoes.md`, nem no disco do `w-07ca` nem no da árvore principal.
> **Instância anterior:** caiu por falha de rede antes de escrever qualquer arquivo. Este trabalho recomeçou do zero.
> **Sem `Bash`:** tudo abaixo foi **lido** com Read/Grep/Glob no disco, sem executar nada. O ramo
> `fix/o6r07c-subresource-scope` estava em `054dada26ce6d225f344604d512b1c0f3a72e6a4` (local = origem), lido nos arquivos de
> ref. O reflog dá a esse commit a mensagem "merge origin/main", feito depois do último commit do dev (`d4cd35e3`).
> **Fonte do mandato:** `docs/revisoes/SAN3/B-O6R-07c-plano.md` v3, seção "### 07c-a.7 Junta", mais "## Comum", "## 07c-a"
> e as críticas r1 e r2.

## Corpos criados (só `.claude/`; o espelho `.agents/` é do orquestrador)

| cadeira | arquivo | os 3 itens (07c-a.7, sem diluir) |
|---|---|---|
| C1 | `.claude/agents/especialistas/jurado-07ca-c1-escopo-por-objeto.md` | (1) G-NEG/G-POS/G-WIDE por sonda própria nas 13 entradas, pelos 2 papéis `assigned_only`, por status, motivo e efeito, com vermelho-controle na base · (2) `RBAC_MATRIX.md:45,66` × catálogo × comportamento, S-MOD, 404 cross-tenant · (3) a km com a semântica do status do 07a e o S-KM-RESTART |
| C2 | `.claude/agents/especialistas/jurado-07ca-c2-censo-e-guard.md` | (1) gerador próprio e as contagens (409/75/183·14/0; 59/5/30; 468) · (2) as formas das duas críticas e MG1–MG16, mais o residual MG3b · (3) CE-G1 (a)(b)(c) e o T6/T11 na letra |
| C3 | `.claude/agents/especialistas/jurado-07ca-c3-regressao-escopo.md` | (1) a régua das 44, `npm test`, o `-db` em cluster próprio e na CI · (2) fixtures (i)/(ii), diff no PERMITIDO, PROIBIDO vazio · (3) registro, sem KPI |

Os três têm:
- frontmatter com `name`, `description`, `tools: Read, Grep, Glob, Bash` e `model: fable` (o orquestrador lança no nível
  menor e declara);
- a régua: unanimidade de 3 com veto, teto de 2 ciclos, `gravidade` + `escopo` (pre-existente com evidência) + `classe`,
  "não consigo medir" = REPROVADO, e nenhum jurado propõe correção;
- P1, P2, P4 e P7, com o voto-esqueleto;
- o terreno: worktree próprio detached (`C:/Users/AMP/w-j07cac1`, `w-j07cac2`, `w-j07cac3`), `npm ci` próprio, container
  Linux próprio sem porta publicada (prefixos `j07ca-c1-`, `j07ca-c2-`, `j07ca-c3-`), e a base viva e as portas do dono
  proibidas;
- os inelegíveis por nome do 07c-a.7, mais os dois devs nomeados no relatório do dev, a fábrica, o orquestrador, o
  inspetor e as outras duas cadeiras;
- a regra do bloco dividido: cobrar o 07c-b é reprovação por construção.

A C1 carrega a **tensão §A2**: o `PLANO_SAN3.md:254` pede o `coordenador-de-acessos`, mas essa identidade achou o `C2-09`
(item 51); a competência entra pela C1 com identidade nova. A C3 confere se essa tensão está registrada.

Saída padrão dos votos: `agent-orchestration/omega/juntas/votos/B-O6R-07c-a/C<n>-evidencia.md` e `C<n>-voto.json`. É
hipótese; o mandato nomeia o caminho que vale.

## O que usei de cada corpo de origem

Li os corpos de origem no disco de `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/agents/`. Não os medi por
`git ls-tree c1cfdabe` como o 07c-a.7 manda, porque não tenho `Bash`; ver a divergência D7.

- **`coordenador-de-acessos.md` → C1.** Usei:
  - a cadeia papel → permissões → rota → backend, com identidade real e chamando as rotas: virou a **sonda por HTTP** no app
    montado, passando por toda a pilha de middlewares e nunca chamando o serviço direto;
  - "rota fora da matriz do papel → backend 403": virou a **matriz efetiva** entrada × papel × (catálogo · base · objeto);
  - "divergência com a matriz = VETO": virou o diff base × objeto contra a `RBAC_MATRIX.md:45,66`.
- **`guardiao-fail-closed.md` → C2.** As três perguntas viraram os itens:
  - **mutação** (o membro não previsto nasce negado?) → as formas das críticas e MG1–MG16, com o rito de mutação restaurável;
  - **tautologia** (o guard pode falhar?) → o "caminho do preguiçoso": abrir uma via, regenerar o instantâneo com o `gravar`
    e ver se algo fica vermelho, mais a tabela T0–T13 × mutação;
  - **autoridade única** → as listas literais do guard classificadas como catraca ou como allowlist, provado por mutação.

  Vieram também a postura de achador que não escreve o conserto e o "compila + verde + aceito = fail-open".
- **`inspetor-de-rotas.md` → C2.** Usei:
  - o inventário textual de rotas do backend (o passo 2 dele), como **terceira fonte** contra o gerador próprio e o helper;
  - a saída em tabela rota → esperado → observado, aplicada às formas e às MG.

  A regra "cross-tenant → 404 (403 = VETO)" foi para a **C1**, porque o plano pôs o 404 no item 2 dela.
- **Modelo de forma:** `especialistas/jurado-san305-c4-credencial-arnes-escopo.md` e `-boot-e-suite.md`, mais o
  `jurado-san305-c3-regressao-e-escopo.md` para a C3. Deles vieram a estrutura das seções, a legalidade antes do mérito, a
  norma na ref julgada, as armadilhas do ` M` fantasma e do CR, o rito de mutação restaurável, o vermelho-controle por item,
  a reprovação por construção e o JSON do voto.

## Divergências entre o plano e os corpos de origem (e as que achei no terreno)

- **D1 — escopo do `coordenador-de-acessos` × mandato da C1.** O corpo de origem cobre os 9 papéis, o seed, as claims, o
  menu, o `App.tsx`, o provisionamento de módulo e o diff contra `docs/navigation-matrix.md`. O mandato da C1 é estreito: 13
  vias, matriz l.45/66, S-MOD, 404 e km. O bloco não toca menu nem frontend. Mantive só a cadeia que o bloco mexe, porque
  P4 limita a 3 itens.
- **D2 — "login real" × a identidade do arnês.** O corpo de origem pede login real com API e web de pé. O app em memória
  identifica o ator por cabeçalhos do middleware de contexto (`x-tenant-id`, `x-user-id`, `x-role`, lidos no teste do
  bloco). A C1 usa esse caminho pela pilha inteira e tem de dizer **de onde vêm as permissões**: do catálogo, e não de
  cabeçalho.
- **D3 — `inspetor-de-rotas`.** O oráculo dele (`task-history/T-*.md`), o inventário de frontend e a cadeia de
  provisionamento (passos 1, 3, 4, 6 e 7) não se aplicam a este bloco e ficaram fora.
- **D4 — `guardiao-fail-closed`.** A preferência dele por vermelho do **compilador** em vez de vermelho de teste não se
  aplica, porque o guard do bloco é teste por desenho do plano, e não foi imposta. O formato de voto dele
  (`A FAVOR/CONTRA/ABSTENÇÃO`) foi trocado pelo JSON da casa (`APROVADO/REPROVADO/ABSTENÇÃO`).
- **D5 — a C3 não tem corpo de origem.** O plano diz "corpo novo". Escrevi-a a partir da competência de
  regressão/escopo/registro dos corpos `san305`, sem KPI (§C7 item 8(5)).
- **D6 — o plano × o que o dev mediu.** Cada caso virou instrução de medir, e não fato:
  - a régua de **44** suítes não reproduz: o dev chegou a 73 e depois a 76. A C3 regenera pela regra da v1 e declara;
  - pelo plano, o **MG2** derrubaria o T4, e não derrubou: o dev acrescentou um MG2T4;
  - o dev montou o **MG3** por `router.use(sub)`, e não como o N2. A C2 aplica também a forma do plano;
  - o **MG3b** (sub-app dentro de `Router`, inscrito como `MIDDLEWARE`, guard verde) é residual medido pelo dev e vai ao
    item 2(d) da C2, com a régua das críticas (silencioso × visível no diff);
  - o dev diz que o `-db` "se declara pulado" no job `backend`, mas esse job **tem** `DATABASE_URL` de serviço
    (`.github/workflows/ci.yml:34`, no disco). A C3 mede no **log** da CI.
- **D7 — o 07c-a.7 manda medir os corpos em `git ls-tree c1cfdabe`.** Eu os li no disco da árvore principal, cuja `main`
  está em `ab52ec50` segundo o disparo, sem `git`. É hipótese: quem versionar confere.
- **D8 — o objeto termina num merge de `origin/main`** (`054dada2`), e os números do plano são de `c1cfdabe`. Os corpos mandam
  usar `B = git merge-base origin/main <objeto>` como base. A C2 explica as diferenças de contagem chave a chave pelo que a
  `main` trouxe. A C3 mede o diff do bloco a partir de `B` e o conteúdo próprio do merge (`git show --remerge-diff`): sem
  isso, o #389 que entrou pela `main` (`prisma/**`, `.github/**`) seria lido como PROIBIDO tocado.
- **D9 — a bateria (07c-a.6) inclui `node scripts/sync-agent-agents.mjs --check` "se a fábrica criar corpos".** Agora se
  aplica, e está no item 2 da C3. O relatório do dev (S11) dizia "não se aplica".

## Para o orquestrador

1. Rodar `scripts/sync-agent-agents.mjs` para criar o espelho `.agents/agents/especialistas/`.
2. Dar `git add -f` nos **dois** espelhos. O ignore global cobre `.claude/` e `.agents/`, e o corpo só vale se estiver
   commitado no ramo julgado.
3. Commitar, empurrar e registrar os 3 agentes no relatório do PR #414.
4. Registrar a tensão §A2 em `controle/`, se ainda não estiver lá (a C3 vai procurar).
5. Registrar a decisão do dono de 2026-10-10 sobre o nível dos modelos, que os corpos mandam o jurado citar pela fonte.
