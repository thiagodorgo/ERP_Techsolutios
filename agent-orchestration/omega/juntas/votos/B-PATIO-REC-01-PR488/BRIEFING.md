# Briefing da junta do PR #488 (B-PATIO-REC-01), objeto `ea6d4aef54181a0dc4030ec56e174e378aec5e12`

- **Bloco:** recebimento do pátio, domínio da intenção de pagamento, sem rede. Mexe em **dinheiro**, **permissão** (`charging:online_payment`), **RLS** e **migrações** (M-REC-1, M-REC-2 e M-REC-7a, autorizadas pelo dono na Q12).
- **Rito:** junta completa, com inspetor e 3 cadeiras, e **unanimidade com veto** (§C7 item 10(1)). A junta vota **uma vez**. Cada cadeira entrega a lista completa de achados, cada um com o comando que o reproduz (item 10(3)).
- **Dev:** Claude (`dev-rec01-opus`).
- **Pré-revisão:** Codex (`prerev-488-sol`), APROVADO, nenhum achado (`revisoes/prerev-488-parecer.md`).
- **Cruzamento (item 11):** C1 e C2 no Codex, que é outro modelo; C3 no Claude. **Declarado:** 2 de 3 cadeiras cruzam modelo, para poupar o semanal do Codex. A C3 é a mais mecânica.
- **Fontes:**
  - `planos/B-PATIO-RECEBIMENTO-plano-v3.md` §9.1;
  - `planos/B-PATIO-RECEBIMENTO-plano-v3-emenda-1.md` §§0–11, em especial:
    - §3.1;
    - §10 (A8: filtro `tenant_id` explícito e `assertRowsBelongToTenant`);
    - §11 (`*_amount` em reais e TypeScript em centavos; as 3 guardas);
  - o diário `docs/revisoes/PATIO/B-PATIO-REC-01-dev.md`, no objeto.
- **A re-verificar, nunca tomar como fato:** as contagens do diário e o "sem achado" da pré-revisão.

## Terreno
- **Worktree:** cada cadeira cria o próprio com `git -C C:/Users/thiag/Documents/GitHub/ERP_Techsolutios worktree add --detach <wt> ea6d4aef` e roda `npm ci` próprio. **Nunca junction.**
- **Postgres próprio** (`postgres:16`, em 127.0.0.1, usuário `postgres`):
  - C1: `j488-c1-pg`, porta 55491;
  - C2: `j488-c2-pg`, porta 55492;
  - C3: `j488-c3-pg`, porta 55493.
- Antes de subir o Docker, confira se há pelo menos 4 GB livres.
- **Um ambiente externo fora do escopo está no ar.** Nunca toque em:
  - `erp-postgres` e `erp-redis`;
  - as portas 3000, 5173, 5432 e 6379;
  - o worktree externo da apresentação (caminho omitido neste repositório público);
  - a árvore principal.

  Nunca rode `prune` nem `down -v`.
- **No fim:** derrube o container e remova o worktree com `git worktree remove --force`.

## Mandato (§C7.7)
- **P1:** depois de CADA item, apense a `<cadeira>-evidencia.md` três linhas: comando, saída resumida e veredito parcial.
- **P2:** antes da mensagem final, escreva `<cadeira>-voto.json`. A mensagem final é 1 linha apontando o arquivo.
- **P4:** no máximo 3 itens; logs longos ficam só no arquivo de evidência.
- **P3:** se você substituir uma cadeira que caiu, re-execute cada comando do `<cadeira>-evidencia.md` dela, compare a saída e depois meça a cauda.
- **P7:** se receber PAUSA, termine o comando em curso, grave `## PAUSA <hora UTC>` e pare.

## Voto
- **Campos do JSON:** cadeira, identidade, modelo, objeto, voto (APROVADO ou REPROVADO), evidencia, resumo, achados `[{id, gravidade, escopo, comando, saida, motivo}]` e arquivos_medidos.
- **GRAVE** = perde dado, vaza entre organizações, quebra permissão ou erra dinheiro.
- Não proponha correção.
- "Não consigo medir" = REPROVADO.

## Ressalvas do inspetor (inspetor-j488-opus, LIBERADO COM RESSALVA), cobertas aqui
- **R1, perda de jurado.**
  - Voto perdido não conta. A junta só fecha com **3 votos válidos referidos a `ea6d4aef`**, e sem eles o bloco não entra.
  - Se uma cadeira cair, o sucessor tem **nome novo**: o nome da cadeira mais `-b`, por exemplo `jurado-j488-c1-sol-b`.
  - O sucessor primeiro re-executa cada comando do `<cadeira>-evidencia.md` de quem caiu e compara a saída (P3). Só depois mede a cauda.
  - Toda queda vai para `revisoes/j488/00-quedas.md` (P6).
  - Teto P5: no máximo 2 cadeiras ao mesmo tempo. A C3 roda junto com a C1, porque a C2 espera o limite do Codex; se a C2 começar antes de uma das duas terminar, ela espera.
- **R4, terreno.** Num worktree novo, `npm run check` dá TS2305 até gerar o cliente Prisma. Rode `npm run db:generate` com um `DATABASE_URL` no ambiente; pode ser o do seu Postgres. Esse vermelho não é da base.
- **R3.** `C:/Users/thiag/w-rec01` é o worktree do dev: está limpo e no objeto. Nenhum jurado o usa.
- **R5.** A `main` andou depois do objeto, sem conflito e sem migração nova. Julga-se o objeto e o CI dele.
