# J-B-TRC-01 — junta do ciclo 1 (2026-10-13 → 2026-10-16) · PR #426, Traccar em dev com ingestão privada e quarentena

- **Objeto:** `5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91` (head do PR com os mandatos regerados; CI 14/14 concluído). O delta desde o `e38b47ea`, citado na seção MEDIDO dos mandatos, são só os 4 mandatos.
- **Régua:** bloco de SEGURANÇA, junta completa, unanimidade de 3 com veto, ciclo 1 (§C7 item 8): todo `bloqueia` dentro do bloco reprova.
- **Inspetor de terreno:** `inspetor-trc01-cdx` (GPT-5.6 Sol), **LIBERADO COM RESSALVA** (`votos/B-TRC-01/insp-trc01-parecer.md`): R-CICLO (ciclo 1), R-CORPO (corpo do blob, md5 antes de medir), R-DBA (a migração aditiva com o `agente-dba-guardiao` em separado).
- **Guardião de banco:** `dba-trc01-cdx2` (sucessor P3), **APROVA COM RESSALVA** (`votos/B-TRC-01/dba-guardiao-parecer.md`): rollback manual executado; a superfície transversal da quarentena depende do papel de runtime sem bypass, dentro do desenho autorizado.
- **Cadeiras:** nível menor, declarado em cada voto. Corpo lido do blob do objeto, md5 EOL-neutro conferido; mandatos forma A com pré-voo OK (`00-mandatos/cadeira-{a,b,c}.md`).

## VEREDITO: REPROVADO (1 × 2)

| cadeira | identidade que votou | executor e modelo | voto | bloqueia |
|---|---|---|---|---|
| (a) RLS, unicidade e banco | `jurado-trc01-a-rls-e-banco-cdx3` (3º ocupante, P3) | Codex, GPT-5.6 Sol médio | **REPROVADO** | 2 |
| (b) superfície e segredo | `jurado-trc01-b-superficie-e-segredo-cdx2` (2º ocupante, P3) | Codex, GPT-5.6 Sol médio | **APROVADO** | — |
| (c) contrato e atribuição | `jurado-trc01-c-contrato-e-atribuicao-claude` | **Claude Code, Claude Opus 5.5** (troca só de EXECUTOR, mesmo nível, por ordem do dono de 16/10: *"vc de uma ajuda ao codex na junta traccar"*) | **REPROVADO** | 1 |

**Os bloqueios (todos `dentro-do-bloco`):**
- **(a)-1, classe não grave — a CI não executa as provas de banco do Traccar.** Os seis testes `-db` nascidos no bloco não estão no job `backend-postgres`; no job sem `DATABASE_URL` eles se pulam (6/6 skipped) e o processo fica verde. Medido: 0 ocorrência de cada nome no workflow; com banco, 44/44, e N=10 dá 440/440. O CI 14/14 do objeto aprovava sem executar nenhuma prova de banco, RLS, atomicidade ou pool.
- **(a)-2, classe grave (perda de dado), por não-medição:** o log SQL por transação/GUC, o `pg_terminate_backend` e o rollback por `pg_dump` exigidos pelo corpo da cadeira não foram executados pela própria cadeira (o protocolo dela: "não consigo medir = REPROVADO"; a aprovação do guardião de banco é parecer separado).
- **(c)-1, classe não grave — a atribuição da posição não tem dimensão de tempo.** O predicado `wo.vehicle_id = vínculo.vehicle_id` (`src/modules/field-dispatch/field-dispatch-prisma.repository.ts:39-41`) usa a viatura que a OS tem quando a posição CHEGA, não a que ela tinha no instante do fix. Reproduzido pelo caminho do produto: OS com despacho aceito pelo técnico A, a viatura da OS trocada de V1 para V2, um fix de V2 tirado antes da troca e entregue depois entra no trajeto de A (204), enquanto o fix real de A em V1 vai para a quarentena. Contraria a decisão do dono de 2026-09-08 ("vínculo pessoa↔veículo por janela de tempo, nunca mapa estático"), a D4 e a emenda v2.2 A-3. Nenhum teste nem mutação do catálogo pega o caso. Origem: `d5a4f25b3` (B-TRC-01, 2026-10-11).

**O que as cadeiras aprovaram por execução (não reabrir no ciclo 2 sem razão nova):** organização nunca vem do payload (45 grafias de chave reservada → 422, zero escrita); idempotência sob corrida com barreira provada no log do Postgres; chave de outra organização → 409 e quarentena; quarentena sob 20 entregas concorrentes = 1 episódio, sem coordenada; resolução sem escolher organização acima do teto; canário com papel BYPASSRLS → 503 e nada gravado; superfície (listener próprio, nenhuma porta pública), autenticação, rotação e segredo, e logs sem segredo (cadeira b); a trava `Ω6R-SEC-002` intocada (395 rotas, mesmo md5, sem diff de permissão). Base medida pela cadeira (c): **120/120** nas 13 suítes traccar, zero pulado (o relatório do dev dizia 113: número não herdado).

**Notas que não reprovam:** a regra de re-descobrir só uma vez sem vigia; três formas de mutação do dev que não compilavam ou caíam por erro de banco, refeitas pela cadeira (c) como 10c, 23c e OWN-13b; hipótese não medida de a desigualdade comparar o relógio do Node com o do Postgres.

**Terreno e quedas (P6, `votos/B-TRC-01/00-quedas.md`):** a junta atravessou 3 dias por cota do Codex: a cadeira (a) caiu duas vezes (a 1ª sem gravar nada, a 2ª com a legalidade gravada) e a (b) uma vez; o guardião de banco uma vez. A máquina suspendeu na madrugada de 16/10 e as janelas morreram (~7 h perdidas). A cadeira (c) mediu em paralelo com a (b) (2 jurados ao mesmo tempo, P5), em portas e containers próprios, e limpou tudo.

**Separação de papéis (§C7.4-bis) e as três perguntas da reprovação:**
- achou: as cadeiras (a) e (c); planejou o ciclo 1: o planejador do B-TRC-01; desenvolveu: o dev do B-TRC-01;
- (a) a composição cobriu a competência: sim — banco/RLS na (a), contrato e atribuição na (c);
- (b) quem achou NÃO conserta: o ciclo 2 nasce de uma auditoria e de um plano no modelo de TOPO, com identidade nova, e de um dev que não é nenhuma das cadeiras;
- (c) dado podre no planejamento: o relatório do dev dizia 113 testes, a cadeira mediu 120; e o plano não tinha critério para posição atrasada depois de troca de viatura — fica para a auditoria de topo responder.

**Próximo (`D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`):** o modelo de topo audita a reprovação (achados reais ou artefatos do processo?) e escreve o plano detalhado do ciclo 2. Ciclo 2 é o último em que achado não grave reprova (§C7 item 8(2)). O parecer do guardião de banco (R-DBA) continua valendo para o merge.
