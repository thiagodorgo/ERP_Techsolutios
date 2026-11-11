# J-527 — junta do PR #527 (B-USERS-ACESSO-SEG: reset de senha por administrador, senha provisória, status e último administrador)

> Junta completa, unanimidade de 3, porque o bloco toca segurança, permissão e isolamento entre organizações (§C7 item 10(1)). Objeto: `6acae1c62037bcf5e3c8b1242a2f9688ecbe9465`. Briefing: `erp-pausa-2026-10-03/revisoes/j527/BRIEFING.md` (revisão 2).

## Pré-revisão (10(3)1)
`prerev-527` (Codex 2) caiu por limite; o sucessor `prerev-527-cl` (Claude, exceção declarada) deu APROVADO, com 12 mutações vermelhas, e deixou para a junta a N1 (forma da prova) e a Q1 (pergunta de permissão), ambas obrigatórias.

## Inspetor de terreno (`insp-j527-opus`, Claude Opus 5.5): LIBERADO COM RESSALVA
As condições R1–R8 entraram no briefing (revisão 2) e nos mandatos, às 12:12 do dia 10/11. Diferença declarada: o bastão é o arquivo global `painel/bastao-memoria.txt`. Parecer: `revisoes/j527/insp-parecer.md`.

## Votos
- **C1 — `j527-c1` (Codex 1).** O filtro de cibersegurança da OpenAI parou a cadeira às 15:20 de 10/11. Antes disso ela provou o item 2 (Q1) por execução.
  - O dono decidiu que um Claude medisse os itens que faltavam. O sucessor `j527-c1-cl` (Claude Opus 5.5, sem cruzamento declarado) reexecutou a Q1 (P3) e ela confere.
  - Ao escrever a sonda dos itens 1 e 3, o classificador de segurança do próprio Claude o parou. **Voto: REPROVADO.** Os itens 1 e 3 ficaram NÃO MEDIDOS de forma independente; só a linha de base das suítes do bloco passou: `reset-db` 10/10, `criacao-db` 3/3, `logs-db` 1/1 e `provisoria` P2 7/7.
  - **C1-Q1-PLATFORM-PROVISORIA — GRAVE, dentro do bloco:** com o token da senha provisória de um alvo `super_admin`, `GET /api/v1/platform/tenants` responde **200** (esperado 403). O portão de plataforma decide por `actor.roles` do JWT e ignora a marca `must_change_password`. No mesmo teste, a troca de organização e a religação recusam com 403 `password_change_required`.
- **C2 — `j527-c2` (Codex 2)** caiu por limite às 12:48 sem medir nada. O sucessor `j527-c2-cl` (Claude Opus 5.5, sem cruzamento declarado) votou **REPROVADO**. Os itens 1 (UEM-02, P-SEG-1) e 2 (S3, S4, S5) foram aprovados por execução, e no item 3 (N1) o ciclo roda sob o papel de produção sem vazamento.
  - **C2CL-01 — GRAVE, dentro do bloco:** a sessão da senha provisória cria ordem de serviço por `POST /api/v1/mobile/sync/work-order-actions` (200, accepted 1, 1 OS no banco). O roteador `/api/v1/mobile` (`mobile.routes.ts:43`) autoriza pelos papéis do JWT, sem o RBAC persistente. Na varredura de 440 rotas, 8 rotas `/mobile` respondem à provisória.
  - **C2CL-02 — GRAVE, pré-existente:** o roteador não tem diff no PR; o último commit dele é `40c3651f`, de 18/10. Pelo mesmo caminho, o usuário desativado cria OS com o token de até 15 min. Vira pendência nomeada com bloco dono.
- **C3 — `j527-c3` (Codex 2, cruzamento houve): REPROVADO.** Contrato, pendências e regressão verdes.
  - **C3-E1 — BAIXA, dentro do bloco:** o diário do dev está no diff fora do PERMITIDO exato.

## Quedas (P6)
- `j527-c2`: limite de 5 h às 12:48; causa: esperou o bastão dentro do `codex exec`. Lição em `feedback-codex-nao-espera-bastao`.
- `j527-c1`: filtro da OpenAI às 15:20.
- `j527-c1-cl`: classificador do Claude, ao escrever a sonda dos itens 1 e 3.
- Nenhum filtro foi contornado; a decisão foi levada ao dono.

## Triagem (fluxo rápido 10(3)3) — 10/11 19:12 SP, orquestrador
- **Conserta agora (GRAVES, dentro do bloco, mesma classe):** C2CL-01 e C1-Q1-PLATFORM-PROVISORIA.
  - A causa comum é que a restrição da P-SEG-2 ("na sessão da provisória só a troca de senha funciona") foi posta no RBAC persistente e em rotas de auth escolhidas, e não no portão de autenticação. Por isso, toda rota que autoriza pelos papéis do JWT (`/api/v1/mobile`, `/api/v1/platform/*`) escapa.
  - O conserto tem de ENUNCIAR a propriedade: nenhuma rota além da troca de senha e do mínimo da sessão aceita esse token. Não basta tapar as duas instâncias.
- **Mesma leva (simples):** C3-E1 (o diário entra no PERMITIDO por emenda, ou sai do diff).
- **Pendência com dono (pré-existente):** C2CL-02 vira a `P-USERS-DESATIVADO-TOKEN-MOBILE`. O bloco dono é o próximo que tocar `src/modules/mobile/**`, ou a varredura de segurança do portão vendável (§C7 item 10(6)). O conserto do C2CL-01 pode fechá-la junto, se o portão novo também barrar o desativado; o plano diz se fecha.
- **Não medido (declarado):** os itens 1 e 3 da C1. Entram OBRIGATÓRIOS no roteiro da conferência do conserto, por execução.
- **Próximo (10(5), defeito grave):** auditoria do topo e plano do conserto, no Claude (`D-CODEX-PRIMEIRO-TELAS-E-PLANOS-NO-CLAUDE`); crítica de outro modelo; conserto único por dev que não achou; conferência de outro modelo; CI; merge; porteiro.

## Papéis (§C7.4-bis)
- Acharam: as cadeiras `j527-c1`, `j527-c1-cl`, `j527-c2-cl` e `j527-c3`.
- Planeja: identidade nova, topo.
- Desenvolve: quem não achou nem planejou.
- Confere: modelo diferente do dev.

## Fechamento (11/11 03:05 SP, orquestrador)
- **Conserto:** o plano do topo `B-USERS-ACESSO-SEG-conserto-c1.md`, com as Emendas 3 a 6.1. O backend F0 a F6 foi feito pela API e pelo Codex, e as telas T1 e T2 por subagentes Claude.
- **Conferências de outro modelo:**
  - `conf-527-back-cl` (Claude, contra o dev da API): CONFERIDO. Os 2 graves estão mortos e os itens 1 e 3 da C1, que a junta não tinha medido, foram medidos;
  - `conf-527-telas-api` (API, contra os devs Claude): CONFERIDO;
  - conferência visual do orquestrador: CONFERIDO.
- **Merge:** #527 em `07898adf` às 02:35 de 11/11, com o head aprovado `221f09fb` e a CI 16/16. Os update-branch trouxeram o #528, o #531 e o #532, todos sem interseção com o PR.
- **Porteiro `porteiro-527`:** LIBERADO COM RESSALVA (`erp-pausa-2026-10-03/revisoes/porteiro-527-parecer.md`).
  - As mutações A1 e A8 trazem os graves de volta, e eles estão mortos na main.
  - Contagens reexecutadas: frontend 1713/1713, Flutter do bloco +44, backend da CI do merge 4962/4964 com 0 falha.
  - Achado novo, não grave: os `-db` do bloco disputam os papéis globais quando rodam em paralelo numa base nova (56/59), e com os papéis já na base dão 59/59.
- **Pendências para o próximo registro:**
  - CONF527B-N01, CONF527B-N02, C527T-01 e `P-USERS-SEG-TELA-EMAIL-NEGRITO`;
  - os `-db` em paralelo numa base nova;
  - `P-HTTP-ERRO-ECOA-MENSAGEM-CRUA`, citada mas inexistente: criar ou corrigir a citação;
  - `D-RESET-AUTORIDADE-PLATAFORMA`, que ainda espera a ratificação do dono e vai no estado das 07:00;
  - `P-USERS-DESATIVADO-TOKEN-MOBILE`, que passa ao B-SAN3-26 se ele tocar `src/modules/mobile/**`.
