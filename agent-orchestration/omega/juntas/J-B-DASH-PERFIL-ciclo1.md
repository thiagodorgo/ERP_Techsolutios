# J-B-DASH-PERFIL — junta do ciclo 1 (2026-10-19) · PR #446, o painel e as permissões seguem o perfil da sessão

- **Objeto:** `849bf840f2bdecae87b82a17b26adf505d8a2a8e` (head do PR com a `main` integrada e os corpos das 3 cadeiras nos dois espelhos; CI 14/14 verde).
- **Régua:** bloco de PERMISSÃO — junta completa, unanimidade de 3 com veto; ciclo 1: todo `bloqueia` dentro do bloco reprova (§C7 item 8(2)).
- **Plano e emenda:** `docs/revisoes/TELAS/B-DASH-PERFIL-plano.md` e `-critica.md`; emenda de 18/10 (`C:/Users/AMP/erp-pausa-2026-10-03/planos/B-DASH-PERFIL-emenda-2026-10-18.md`, `D-EMENDA-ANTES-DO-CODIGO`).
- **Corpos das cadeiras:** fábrica `fabrica-dash-gemini` (Gemini 3.1 Pro), revisados pelo orquestrador; md5 conferidos pelo inspetor e por cada cadeira.
- **Mandatos:** forma A, pré-voo 4/4 OK (`redator-dash-cdx`, Codex).
- **Inspetor de terreno:** `inspetor-dash-cdx` (Codex GPT-5.6 Sol) — **LIBERADO** (`votos/B-DASH-PERFIL/insp-dash-parecer.md`).

## VEREDITO: REPROVADO (1 × 2)

| cadeira | identidade que votou | executor e modelo | voto | bloqueia |
|---|---|---|---|---|
| C1 cadeia de acesso | `jurado-dash-c1-cdx` | Codex, GPT-5.6 Sol médio | **REPROVADO** | 1 (grave) |
| C2 troca de organização | `jurado-dash-c2-opus` (reserva; o ocupante Gemini caiu sem medir) | Claude Code, Claude Opus 5.5 | **APROVADO** | — |
| C3 regressão e escopo | `jurado-dash-c3-opus` (sucessor P3 de `jurado-dash-c3-cdx`) | Claude Code, Claude Opus 5.5 | **REPROVADO** | 1 |

**Os bloqueios (dentro do bloco):**
- **C1-01 — o Super Admin passa por cima da sessão (classe declarada pela C1: grave, quebra de permissão).** Com `roles=[Super Admin]` e `permissions=[]` na sessão, o `PermissionProvider` responde `can("dashboard:view") = true` e `can(<permissão inventada>) = true`; o teste do bloco `frontend/tests/dashboard-profile-behavior.test.tsx` segue 4/4 verde diante disso (`c1-voto.json`). A propriedade do bloco ("o que a sessão traz é o que a tela libera") não vale para esse papel, e nada a vigia.
- **C3-01 — nenhum teste prende a mudança central.** Duas mutações no `PermissionProvider` passam pela suíte inteira (1327/1327): M1, que devolve o provider da base (volta a unir as permissões do contexto), e M1b, que une e força `dashboard:view` — reabrindo `/dashboard` para Financeiro e Estoque, o defeito que o bloco corrige. Causa medida: o auxiliar da emenda grava a mesma lista na sessão E no contexto ativo em todo setup, então "só a sessão" e "sessão + contexto" ficam indistinguíveis. No backend, a mutação M3 (`resolveLoginPermissions` forçando `dashboard:view`) passa 92/92 nos 14 arquivos de auth; o guarda é um `assert.match` sobre o texto da linha.

**Notas e ressalvas (não reprovam):**
- C2-opus-01 (dentro do bloco): nenhum teste do repositório executa a troca de organização nem a navegação pós-seleção — M1a, M1b e M3b passam verdes (a mesma classe do C3-01, medida por outro caminho).
- C2-opus-02 (pré-existente, 2026-07-02): os módulos habilitados do contexto vêm do mapa estático por papel; hoje sem efeito (o único leitor não é importado). Dono sugerido: pendência do B-SAN3-06a.
- C3-02: `dashboard-profile-behavior.test.tsx` não está no `test:smoke` nem em job da CI (o plano o previu por comando direto e proíbe mexer em `frontend/package.json`).
- C3-03: os 6 corpos de jurado fora da lista do plano não reprovam — entram pelo PR do bloco desde #414/#401/#405 e o inspetor e o mandato exigem os corpos no objeto.
- C3-04/C3-05: ver `c3-voto.json`.

**O que as cadeiras confirmaram por execução** (A RE-VERIFICAR no ciclo 2 só se o ciclo 2 tocar a propriedade): troca de organização substitui as permissões por inteiro (C2, em 3 níveis, incluindo navegador real); sessão restaurada idêntica (C2); a tela inicial pós-seleção cai numa rota aceita pelos 13 papéis, sem laço (C2); frontend 1327/1327, `check`/`build` ec 0, raiz `check`/`lint`/`build` ec 0, backend 3695/3706 (9 falhas só de `traccar-dev-topology`, que exige Docker dentro do contêiner — pré-existente, do #426, 12/12 no Windows) (C3); escopo: 64 caminhos, 0 proibidos, 0 asserções removidas (C3).

## Terreno, quedas e substituições (P6, `votos/B-DASH-PERFIL/00-quedas.md`)
- C2: o Gemini 3.1 Pro caiu antes de medir — cota diária de 250 pedidos/dia esgotada; o sucessor Opus partiu do zero.
- C3: o Codex caiu no limite de uso (05:38Z) durante a medição, gravando a evidência em caminho errado; o parcial foi movido para `c3-cdx-parcial-*.{md,json}` e o sucessor Opus re-executou o roteiro registrado (P3) e mediu a cauda.
- Memória: a VM do Docker/WSL chegou a ~8 GB num `npm test` em contêiner; a memória de commit livre caiu a 0,2–0,7 GB. O teste de "3 trabalhos no Docker" foi reprovado; vale o teto de 2.

## Separação de papéis (§C7.4-bis) e as três perguntas da reprovação
- achou: C1 (Codex) e C3 (Opus); planejou: o plano do B-DASH (e a emenda, `planejador-dash-emenda-gemini`); desenvolveu: `dev-b-dash-perfil-opus` e `dev-dash-emenda-cdx`.
- (a) a composição cobriu a competência: sim — cadeia de acesso, troca de organização e regressão/escopo.
- (b) quem achou NÃO conserta: o ciclo 2 nasce de auditoria e plano no modelo de TOPO (Fable) e de um dev que não é C1 nem C3.
- (c) dado podre: a emenda de 18/10 mandou o auxiliar de teste "injetar as permissões na sessão do mesmo jeito que o app real"; o auxiliar gravou também no contexto, apagando a diferença que o bloco existe para criar. Fica para a auditoria de topo responder se a premissa da emenda foi mal enunciada.

**Próximo (`D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`):** o Fable audita a reprovação e escreve o plano do ciclo 2. Ciclo 2 é o último em que achado não grave reprova.
