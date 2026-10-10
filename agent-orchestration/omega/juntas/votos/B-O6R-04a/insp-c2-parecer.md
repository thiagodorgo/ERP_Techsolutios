papel: inspetor-de-terreno-da-junta · modelo: Fable (claude-fable-5-1) · mandato_md5: ff3a7e4b5013e7c6839f5593a8cb0403 · corpo_md5_eol_neutro: de80b2a9d4fc7edd7b9a26e2d601f97d · INSTANCIA 2 (mesma identidade relancada; a instancia 1 caiu ~07:00Z por 429 de sessao, 00-quedas.md) · ciclo 2 · B-O6R-04a · PR #389

# Parecer do inspetor de terreno - junta do ciclo 2 - B-O6R-04a (PR #389)

> Instancia 2, 2026-10-10T07:54:16Z. P3: re-executei cada comando da evidencia da instancia 1 (Passo 0, head, delta, check-runs, disco) e as saidas bateram; depois medi a cauda (itens 1.1-5.1). Evidencia completa com comandos e horas em insp-c2-evidencia.md (secao "## Retomada ... (instancia 2)"). Corpo lido de origin/main; mandato lido de origin/fix/inventory-consistency; ferramentas: Read/Grep/Glob/Bash.

## Objeto
- head julgado: ae863e1aa7a138e8cc3eb536bde2778b11fc4c2f = origin/fix/inventory-consistency = gh headRefOid (OPEN, draft, MERGEABLE, mergeStateStatus CLEAN, base main)
- delta mandato->head: 6cd27088..ae863e1a = 1 commit, so o proprio mandato inspetor-c2.md (+64). Desde o HC da Emenda 7 (297dfbc8, 14/14): + emenda 7 + mandato = 2 arquivos de registro (+91); produto identico.
- merge-base com origin/main = c1cfdabe (merge do #413); 8a79532f e c1cfdabe sao ancestrais do head -> a main de 10/10 esta dentro.
- check-runs no SHA: total 14, 14x completed/success (docker x2, backend x2, backend-postgres x2, frontend x2, flutter x2, authority-portal x2, owner-portal x2; ultimo completed 06:37:34Z); 0 cancelled/queued/in_progress -> objeto VALIDO. CI verde: nenhum job vermelho a repassar como insumo.

## 1. Isolamento
- 1.1 head e arvore limpa: VERDE - w-389 @ae863e1a, porcelain so com 3 ?? (00-quedas.md, insp-c2-evidencia.md, insp-c2-parecer.md = artefatos deste gate); 19/19 arquivos centrais (src/modules/inventory, tests, schema, migration, censo, ci.yml) com md5 EOL-neutro IGUAL ao blob do head.
- 1.2 plano de isolamento declarado: VERDE COM RESSALVA - plano Passo 0/2/3 + emenda 6 (ii, jj) + secoes Terreno dos corpos: worktree proprio detached + npm ci proprio por jurado, cluster Postgres/Redis descartavel proprio, base viva erp-postgres/erp-redis nunca alvo, >= 10 GB antes de cada jurado, P5 sequencial; imagem erp-junta-node20-pg16:local presente (386MB). RESSALVA R1: prefixos divergem (corpos j-b04a-c2-c*/.claude/worktrees vs plano j389-c*-*/C:/Users/AMP/w-*) - fixar UM por cadeira no briefing.
- 1.3 residuo de jurado anterior: VERDE COM RESSALVA - docker ps -a: zero insp389-*/jur-*/crit-*/j05*; so base viva (Up) + erp-postgres-alt (Exited 3 sem., inerte) + pastrack (outro projeto); nenhuma sonda solta em w-389/w-insp389/main/w-pvpr (inclui ignorados). RESSALVA R5: w-pvpr (detached @6cd27088, 2 scripts ?? do pre-voo nao rastreados no head) = residuo INERTE do orquestrador, nao removido por mim.

## 2. Insumos do briefing
- 2.1 ata do ciclo anterior marcada "a re-verificar": VERDE - R-B-O6R-04a-ciclo1.md existe na ref, declarada RECONSTITUIDA no cabecalho, cada item [A RE-VERIFICAR]; os 4 corpos tem a secao "Afirmacoes herdadas - todas [A RE-VERIFICAR]"; o plano R1 diz que nada do ciclo 2 foi julgado por junta. Nenhuma conclusao herdada como fato.
- 2.2 ciclo >= 4: N/A (ciclo 2; so R-ciclo1 na ref) - auditoria da maquina nao exigida.
- 2.3 plano do ciclo: VERDE - plano 908 linhas na ref com §8 escopo arquivo a arquivo, §10 bateria com forma exata/N/ec do processo, "## Retomada 2026-10-10" Passo 0-6 e Emenda 1; comando com Emendas 1-7 (Emenda 7 = D6/D7/D8 da integracao 2); 00-dev.md e 00-dev-integracao.md (integracoes 1 e 2, divergencias declaradas e NAO decididas pelo dev); head nomeado por cadeia explicita (297dfbc8 -> 6cd27088 -> ae863e1a, so registro). Insumo do voto para C3: D7 (T15 do #405, 1/3 sob carga) decidido pre-existente pela Emenda 7.

## 3. Papeis
- 3.1 inelegibilidade por nome: VERDE - C1 jurado-o6r04a-c2-banco-rls, C2 jurado-o6r04a-c2-fail-closed-backend (identidades novas; 0 votos em ref alguma; mencoes externas sao inventario de corpos em voo), C3 agente-ci-doutor (0 participacao no B-O6R-04a; votou em outros blocos, permitido a permanente). Inelegiveis do Passo 3 (dba-guardiao, guardiao-fail-closed, validador-mestre, critico-adversarial, planejadores, devs) sem colisao.
- 3.1-bis OBITUARIO-IDENTIDADES: VERDE - lido antes do grep; nenhum dos 3 SEPULTADA/RESERVADA; a jurado-06-banco-atomicidade-rls (SEPULTADA) era a proposta do §12 original e NAO e usada.
- 3.2 competencia x achados: VERDE - C1-F1 (RLS/censo/migracao) -> C1 banco-rls; C2-01..04 (guards/exaustividade/P2002/lock) -> C2 fail-closed por mutacao; integracao/contrato/regressao/registro -> C3 ci-doutor.
- 3.3 corpo carregado x corpo julgado: VERDE COM RESSALVA - agente-ci-doutor: sessao == head == origin/main (55979e2cc21a1e6aba6bfe36899454a0). Os 4 corpos o6r04a NAO existem no diretorio da sessao (0 arquivos): RESSALVA R2 - disparar como general-purpose com o blob do head + md5 EOL-neutro: banco-rls fb5a34ef3d61e55a9096454801118976 ; fail-closed-backend 82c3016b41e1f5ad9c4a4a0686338200 ; suplente-banco-rls 734bc61bef28f57fd118e65b71f099ce ; suplente-fail-closed-backend 0d8203d885814e8f7ca8488f1560580e ; sem model: no frontmatter -> passar Fable (fallback Opus DECLARADO). Normas citadas (§C7.4-bis, §C7.1-ter a/b/c, §C7 item 8(2), D-GOV-PROPORCIONAL, D-JUNTA-RESILIENTE, D-JUNTA-ESCOPO-E-CALIBRACAO) TODAS existem no CLAUDE.md do head (== origin/main). Errata completa: 0 frases velhas nos 8 blobs (criterio D6); nota: C1 l.20 ainda diz "o teto manda" (palavra residual, regra do §C7.4 intacta).

## 4. Fatias de orquestracao
- 4.1 S0: VERDE - node scripts/sync-agent-agents.mjs --check @ae863e1a -> ec 0, "OK - 49 agentes, espelho consistente"; os 4 corpos nos 2 espelhos.
- 4.2 baseline honesto: VERDE - w-insp389 @ae863e1a, porcelain vazio antes e depois, npm ci proprio (nao junction), npm run check -> ec 0 (lido por variavel).
- 4.3 check-runs: VERDE - 14/14 completed/success no SHA (ver Objeto).

## 5. Quorum
- 5.1 plano de perda e PAUSA: VERDE COM RESSALVA - suplentes rastreados para C1/C2; C3 com suplentes de emergencia nomeados (inspetor-de-arnes-concorrente, coordenador-de-acessos, declaracao na ata); queda relanca a mesma identidade; 00-quedas.md ja aberto (P6). RESSALVA R3: os mandatos das 3 cadeiras ainda nao existem na ref - gerar com o modelo de mandato §C7.7 (P1-P7, inclusive PAUSA) antes do disparo; este inspetor nao os leu.

## Veredito
**LIBERADO COM RESSALVA** (2026-10-10T07:56:18Z). Nenhum item BLOQUEADO: objeto e um SHA com 14 check-runs concluidos e verdes; arvore do dev sem mutacao viva; S0 verde; baseline npm run check ec 0 no head; inelegibilidade sem colisao; ata do ciclo 1 declarada reconstituida e marcada a re-verificar; plano de isolamento e de perda declarados; disco 14 GB. A junta do ciclo 2 pode comecar quando o orquestrador colocar as ressalvas abaixo no briefing.

## Ressalvas (para o briefing das cadeiras, em destaque)
- R1 (nome dos recursos): corpos mandam j-b04a-c2-c1-pg/j-b04a-c2-c2-pg e worktree .claude/worktrees/j-b04a-c2-*; plano Passo 0 + emenda 6-jj mandam prefixos j389-c1-*/j389-c2-*/j389-c3-* e caminho curto C:/Users/AMP/w-*. Fixar UM prefixo por cadeira (residuo e limpeza sao por nome; caminho curto evita Filename too long) e usar worktree detached (w-389 tem a branch checked out).
- R2 (corpo carregado): os 4 corpos o6r04a nao estao no diretorio de agentes da sessao -> disparar general-purpose com o blob do head ae863e1a colado e o md5 EOL-neutro publicado (acima, item 3.3); corpos sem model: -> passar Fable explicitamente, fallback Opus DECLARADO no voto e na ata (§C7.6-bis). agente-ci-doutor pode ser carregado pelo nome (sessao == head).
- R3 (mandatos): os mandatos das 3 cadeiras nao existem na ref; gerar com o modelo de mandato §C7.7 (P1-P7, PAUSA) e pre-voo, sobre HC = origin/fix/inventory-consistency = ae863e1a (ou o head novo que os contenha, com check-runs concluidos de novo).
- R4 (disco e sequencia): 14 GB agora; cada worktree+npm ci ~0,7-1 GB e cada cluster aperta -> o orquestrador re-mede >= 10 GB ANTES de cada cadeira (este papel morre quando a junta comeca); P5: C1 e C2 em paralelo, C3 depois; DEEP_CLEAN=1 NAO roda (apaga erp-junta-node20-pg16:local).
- R5 (residuo inerte, nao removido por mim): w-pvpr (detached @6cd27088, scripts/mandato-refs.sh e mandato-preflight.sh untracked, nao rastreados no head - a ferramenta que gerou o mandato nao esta na ref) e erp-postgres-alt (Exited, 127.0.0.1:55432). Sem privilegio nem mutacao.
- R6 (texto): C1 l.20 "o teto manda identidade nova" - palavra residual da errata; a regra vigente e a do §C7.4. Nota para o registro, nao para o voto.
- R7 (insumo do voto, nao ressalva de terreno): D7 da Emenda 7 (T15 do #405 falhou 1/3 sob carga da suite inteira, pre-existente P-SAN3-05-T15-TETO-DE-RELOGIO) - C3 re-executa e declara escopo com evidencia (§C7.1-ter a).
- Credenciais no diff sao so de containers descartaveis (crit:crit, dev389i); nenhum segredo real.

## Limpeza
- Criado/usado para medir: worktree detached C:/Users/AMP/w-insp389 (reutilizado da instancia 1; npm ci proprio, nao junction) -> processos vivos conferidos (0 alem da propria medicao) -> git worktree remove --force -> ec 0, diretorio ausente; /tmp/s0.out, /tmp/pg.out, /tmp/check.out apagados. Nenhum container criado (nenhum insp389-* nasceu: a inspecao nao precisou de banco). Base viva, w-07c, w-traccar, w-pvpr e w-389 (fora destes 2 arquivos + 00-quedas.md do orquestrador) intocados. Disco ao fim: 14 GB livres.
