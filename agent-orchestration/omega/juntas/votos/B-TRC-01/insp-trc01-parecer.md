Papel `inspetor-de-terreno-da-junta` · identidade `inspetor-trc01-cdx` · modelo `GPT-5.6 Sol (high)` · mandato_md5 `6d8dc6de14a4cf7a2206c5922a9c2fb8` · corpo_md5_eol_neutro `89b4563001df748a4016ae57b05fbd20`

# Parecer de terreno — B-TRC-01 / PR 426

## Objeto

PR 426 aberto, não draft. Git (`origin/feat/traccar-b-trc-01`), o SHA do disparo e GitHub (`headRefOid`) convergem em `5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91`. Há 14 check-runs no head, todos `completed/success`. O head `e38b47...` presente no pré-voo do mandato ficou obsoleto e não foi herdado como fato.

## 1. Isolamento

`VERDE` — worktree detached próprio limpo no head; o worktree do dev tem 52 falsos ` M` de stat-cache, todos com conteúdo EOL-neutro idêntico ao blob. Os três mandatos declaram worktree, dependências e cluster Linux próprios por cadeira, nomes exclusivos e proibição da base viva/portas do dono. Não há resíduo `trc01/jtrc01/jur/crit`, probe ou processo Node desta junta; os recursos `j03a-c2` são da junta paralela e não foram tocados. Disco livre `11,77 GB`.

## 2. Insumos do briefing

`VERDE COM RESSALVAS` — ciclo 1 confirmado por ausência de ata/reprovação/voto anterior no head. Os corpos tratam todos os insumos como `A RE-VERIFICAR`. Plano v2.1, emendas v2.2/v2.3, comando, relatório do dev (Retomadas 3–7), decisão T13 e os dois testes pedidos pela pré-revisão existem no objeto; §8.3 traz escopo e §8.8 traz bateria com forma. Ressalvas: os mandatos não escrevem literalmente `ciclo 1`; a aprovação separada do `agente-dba-guardiao` ainda não existe e será necessária para o DoD/merge.

## 3. Papéis e inelegibilidade

`VERDE COM RESSALVA` — o obituário foi lido primeiro; zero colisão das cadeiras com identidades sepultadas/reservadas, atas ou reprovações. Os novos inelegíveis (`dev-trc01-503-agy`, `dev-trc01-503-gemini`, `dev-trc01-503-flash`, `rev-503-delta`) e os anteriores não coincidem com as três cadeiras. Competências cobrem banco/RLS, superfície/segredo e contrato/atribuição. Como os corpos novos não existem na árvore da sessão, cada cadeira deve receber o blob `.claude` do head e validar o MD5 EOL-neutro: (a) `725c583fc448803e57251e33bb05ba07`; (b) `b7c63c7d058361a4dddb31b3f2191037`; (c) `e1d8770fa15e8b6984da8cf52ea1dff9`.

## 4. Fatias S0, baseline e check-runs

`VERDE` — S0: 55 agentes, espelho recursivo consistente. Baseline no worktree detached: `npm run check`, exit 0, árvore limpa. CI: 14 check-runs, todos concluídos com sucesso.

## 5. Quórum e perda de jurado

`VERDE COM RESSALVA` — unanimidade 3/3; voto perdido não conta; queda retoma mesma identidade/mandato com reexecução P1 e registro P6. As cadeiras rodarão uma por vez (e nunca mais de 2). O disparo deve declarar expressamente `ciclo 1`.

## Veredito

**LIBERADO COM RESSALVA**

O tabuleiro está apto ao início da junta no head `5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91`, condicionado a o orquestrador destacar no briefing:

1. **R-CICLO:** declarar literalmente `ciclo 1` no disparo de cada cadeira.
2. **R-CORPO:** como o diretório da sessão não contém as três identidades, colar o corpo `.claude` do blob do head, limitar as ferramentas conforme o corpo e exigir o MD5 EOL-neutro medido antes do voto. Divergência invalida/bloqueia a cadeira.
3. **R-DBA:** convocar identidade independente do `agente-dba-guardiao` para revisar a migração aditiva. A ausência não bloqueia o start da junta, mas bloqueia o fechamento do DoD/merge exigido por §8.10.

O head antigo `e38b47...` embutido na seção MEDIDO dos mandatos é pré-voo do commit pai. O próprio mandato exige resolução dinâmica; o delta `e38b47...→5abdf83...` contém somente os quatro mandatos. O objeto foi resolvido novamente por Git/GitHub e a CI do SHA atual está concluída.

## Limpeza

Worktree detached `C:\Users\AMP\w-insp-trc01` removido pelo nome (`exists_after=False`, ausente de `git worktree list`); dois logs temporários removidos. Nenhum container/rede/volume criado. Base viva, portas do dono e junta paralela não foram tocadas. No worktree do PR foram escritos somente esta evidência e este parecer.
