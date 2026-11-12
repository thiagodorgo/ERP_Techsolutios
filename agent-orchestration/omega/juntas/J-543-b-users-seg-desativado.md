# Ata da J-543 (PR #543, B-USERS-SEG-DESATIVADO: o acesso de quem foi desativado, ou teve a sessão encerrada, acaba na hora; SEGURANÇA, junta completa, unanimidade de 3)

- **Objeto julgado:** `dd3db1ad`, o head do `dp-543`, com o merge da main e a Emenda 2.
- **Inspetor:** `insp-543-api`, Claude Opus 5.5 pela API. Parecer: LIBERADO COM RESSALVA.
  - As ressalvas 1 a 6 entraram no briefing e nos mandatos.
  - Os check-runs estavam concluídos e verdes, e o smoke `VERDE`.
- **Cadeiras** (lançadas juntas às 19:54 SP de 11/11):

| Cadeira | Identidade | Modelo | Voto | Achados |
|---|---|---|---|---|
| C1 autenticação e propriedade | `j543-c1-dp` | DeepSeek Pro | APROVA | nenhum |
| C2 banco e custo | `j543-c2-dp` | DeepSeek Pro | APROVA | nenhum |
| C3 contrato, clientes e implantação | `j543-c3c-api`, sucessora 2 (P3) | Claude Opus 5.5 pela API | APROVA | C3-01, C3-03 e C3-04 (não graves, dentro do bloco); C3-02 (não grave, pré-existente) |

- **As quedas da C3** (detalhe em `00-quedas.md`):
  - `j543-c3-api` nunca rodou: o anexo foi passado com caminho do Git Bash, e o lançador morreu antes do container. As duas primeiras tentativas da sucessora caíram no mesmo erro. Custo zero.
  - `j543-c3b-api` fechou o item 1 (APROVA parcial) e parou no teto de custo.
  - O sucessor no Antigravity foi recusado por cota (429, cerca de 148 h). Custo zero.
  - `j543-c3c-api` re-executou os comandos do item 1, recriou a sonda do web com a mesma forma, obteve as mesmas saídas, mediu os itens 2 e 3 e votou.
- **Resultado:** **UNANIMIDADE, 3/3 APROVA.**
- **Triagem (§C7 10(3)3):**
  - **C3-01:** o `API_CONTRACTS.md` e a `RBAC_MATRIX.md` citam a `D-DONO-TODAS-RECOMENDACOES-1111`, que não tinha entrada em `decisoes.md`. Não grave e simples: conserta na mesma leva.
  - **C3-03:** a frase do diário dizia que nenhum teste fala com o portão real, mas as suítes `-db` falam. Não grave e simples: conserta na mesma leva.
  - **C3-04:** o demo do Traccar não foi executado. Vira a pendência `P-USERS-SEG-DEMO-TRACCAR-SEM-PROVA`.
  - **C3-02:** pré-existente. Com a sessão encerrada, o mapa web reconecta o stream a cada 10 s até o polling limpar a sessão. Vira a pendência `P-WEB-MAPA-STREAM-RECONECTA-TOKEN-MORTO`.
  - A observação sobre o token sem `sid` (o usuário ativo segue até o token vencer) é o residual (1) do contrato, já coberto pela `P-SID-OBRIGATORIO`.
- **Conserto:** `fix-543-api`, Claude pela API, identidade de dev declarada. Ele não achou nem escreveu o bloco. O mesmo conserto faz o merge da main `fd51409c`; o `tests/san3-05-acessos-de-plataforma-guard.test.ts` conflita em código, e a resolução é a união do inventário do T13.
- **Composição (§C7.4-bis):**
  - quem achou: `j543-c3b-api` e `j543-c3c-api`;
  - quem consertou: `fix-543-api`;
  - quem confere: uma identidade nova de outro modelo, quando houver crédito (§C7 11(1)).
- **Depois:** a conferência, o CI, o merge seguro e o porteiro.

## Depois da junta (12/11)
- **Conserto da mesma leva:** `fix-543-api`. O `2b519013` traz a decisão do dono, a frase do diário e as duas pendências; o `a1b959bf` é o merge da main `fd51409c`.
  - Ele parou certo: depois do merge, a `users-seg-desativado-sse-db` deu 403 pelo gate de módulo do #544, porque a organização de teste não tinha módulos.
- **Emenda 3 do plano** (só a fixture, `TODOS_OS_MODULOS` como o F3 do #544), escrita pelo orquestrador.
  - Revisão: `rev-emenda3-543`, APROVADO COM AJUSTES (2 notas).
  - Aplicação: `fix-543b-api`, head `bf1b7b5c`. O T16 e o T16b deram 2/2, com o vermelho-controle 403 reproduzido.
- **CI do `bf1b7b5c`:** 8/8 verde. Backend 5352/5350/0/2, `backend-postgres` 603/603, smoke VERDE.
- **Conferência:** `conf-543-api`, Claude pela API. Veredito: **CONFERIDO**, sem refazer cadeira.
  - **Sem cruzamento, exceção declarada:** a Codex 1 estava no limite de 5 h, e o DeepSeek no pico. A 1ª tentativa no Codex não rodou.
  - O produto do bloco tem o mesmo patch-id que a junta julgou; o T13 deu 35/35; as 21 suítes do bloco, 106/106, com 0 pulados.
  - **Nota:** as suítes `-db` do bloco não estão na lista `SUITES=` do `backend-postgres`. Isso já está na `P-CI-LISTA-CURADA-USERS-SEG-DB`.
- **Composição (§C7.4-bis):**
  - quem achou: `j543-c3b-api` e `j543-c3c-api`, e `fix-543-api` (o achado do merge);
  - quem consertou: `fix-543-api` e `fix-543b-api`;
  - quem conferiu: `conf-543-api`.
