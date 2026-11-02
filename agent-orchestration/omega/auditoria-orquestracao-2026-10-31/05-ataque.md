SE SUSTENTA COM CORRECOES

# 05. Ataque à análise 04, `aud-ataque`

Identidade nova, Claude Opus 5.5, nível menor declarado. Não escrevi 01 a 04, não votei, não planejei, não desenvolvi. Só leitura. Medido em 31/10/2026, a partir das 22:33 SP, em `origin/main` = `0fda595a`; head do #477 no momento: `78f78916` (o conserto segue correndo). "l.N" sem outro nome = linha de `04-analise.md`. Caminhos relativos a `C:/Users/AMP/erp-pausa-2026-10-03/`.

## 1. Em uma página

**Os números da 04 se reproduzem. O que não se sustenta é o que ela conclui a partir deles.**

- **A resposta à pergunta do dono precisa mudar.** "NÃO COMPROVADO" fica de pé (N = 1, aberto). "E a evidência aponta o contrário" (l.8) cai. A prova é uma tautologia (P1), e a 04 mede só as 20 linhas do contrato, quando o dono aprovou um pacote: fluxo, filas, trava e o próprio plano v2 do antivírus (P2, P3).
- **A causa C2 culpa o modelo, e o repositório a desmente.** Em 21/10 o mesmo Sol, com o mesmo esforço, fez a crítica do B-SAN3-20 por execução: achou 3 bloqueantes em 2 rodadas, e o bloco aprovou de primeira com 0 bloqueantes na junta. O que mudou foi o prompt do orquestrador (P5). M2 e a recomendação D-a caem.
- **M7 não mede o risco que promete medir** e reabre o que o dono recusou (P6). **M3**, na parte "modelo diferente", não tem causa e tem contraexemplo (P7). **M4**, na parte "parar em ajustes", não evitaria a F11 (P11).
- **A comparação "não é fora da curva" quebra a regra do próprio relatório 02** (distinto contra cru) (P8). "Parcialmente comprovado" apoia-se numa amostra escolhida pelo resultado (P9).
- **Faltam 4 erros do orquestrador** (seção 3), e a explicação alternativa "Docker desligado" nem aparece (P10).
- **O que resiste:** C1 (provar a porta ao lado), a parte `ec=0` de M4, M5, M1 com um número corrigido, e a recusa em voltar a re-junta (por falta de dado, não pelo 1,45).

## 2. Problemas, do mais grave ao menor

### P1. "0 de 25" é verdade por construção, não evidência (GRAVE)
**Trecho:** l.8 "0 de 25 defeitos tem como primeira etapa capaz uma etapa que o item 10 alterou"; l.54 "O que não é causa, medido"; l.30.

**Por quê:** o item 10 só altera etapas depois do dev: pré-revisão, voto, triagem, conserto, verificador. Um defeito que nasceu no plano ou no dev tem, por definição, plano, crítica ou dev como primeira etapa capaz. O número não pode dar outra coisa, com o item 10 bom ou ruim. Ele não testa a pergunta.

**Comando:** `git diff 264c3760^ 264c3760 -- CLAUDE.md | grep '^+'`, lido junto da tabela de 03 §4 (colunas Etapa × Mudou).

**Agravante:** a classificação é juízo de um auditor, sem comando, e não está entre os itens E1-E14 reexecutados. Tem inconsistência: 03 §3.1 diz que em L1 a crítica podia pegar (contradição l.138×l.140 do plano) e conta L1 como Dev. A crítica vem antes do dev, então seriam crítica 10 e dev 12, não 9 e 13.

### P2. A 04 mede 20 linhas; o dono aprovou um pacote (GRAVE)
**Trecho:** l.7, l.39 ("Datas batem; causa não isolável"), l.50 ("Não está no contrato. Nasceu 30/10 09:06"), l.24.

**FATO:** a fila não é vizinha do upgrade, ela é parte dele.
- `sed -n 78,83p PAUSA-2026-10-28.md`: sob o título "plano refatorado aprovado pelo dono", estão juntos o fluxo (`contrato-item-10.md`), as filas (`fila-3010.sh`), a trava e "plano v2 do antivírus".
- `sed -n 5,9p ferramentas/fila-3010.sh`: a primeira tarefa da fila é o `reg-3010-fix`, que a tsv descreve como "conserto #475 + contrato item 10" (`grep reg-3010-fix ferramentas/agentes-vivos.tsv`).
- `sed -n 16p painel/filas.log`: `09:27 MERGE #475: MERGED`. **Quem mergeou o upgrade foi a fila.**
- A memória do projeto (`project-fluxo-rapido-2026-10-30.md`) lista "Codex primeiro, nas duas contas, por `fila-lib.sh`" no mesmo "How to apply".

**Efeito:** "fila nasceu 21 min antes do merge" (l.39) é fato usado como afastamento, e aponta o contrário. A coluna "Ligada ao #475?" de C4 e C2 deveria dizer: *mesmo pacote aprovado; efeito em defeitos não isolado*. A pergunta do dono foi "nossa modificação", não "o texto do item 10". Pela conta da própria 03 §1, 9 defeitos saíram de filas e do orquestrador escrevendo código e emenda.

**Limite:** isto mostra vínculo, não causa. Continua sem contrafactual.

### P3. A cronologia não absolve, e "sem marca = v1" é refutado pelo próprio plano (GRAVE)
**Trecho:** l.8 ("lançado às 09:09, 18 min antes do merge; as linhas do overlay vêm da v1"), l.29 (sob o título FATO), E14.
- **O plano v2 é entrega do pacote.** Lançado às 09:09 (`agentes-vivos.tsv` l.243), 1 min antes do registro da aprovação às 09:10, e citado nela. `sed -n 17,18p planos/B-AV-REAL-plano.md`: v2.5 "Régua nova: D-JUNTA-FLUXO-RAPIDO", v2.6 "**Fatias para o Codex GPT-5.6 Sol e o Docker desligado**".
- **O coração de C1 é da v2, não da v1.** O aceite "F7: só o CLI `docker compose config`" está escrito no v2.6: *"F7 usa só `docker compose config`, medido funcionando com o daemon desligado"*. O plano foi fatiado para o executor e para o Docker desligado daquele dia.
- **O critério da 04 falha no teste.** `git show 2746eb60:docs/revisoes/SAN3/B-AV-REAL-plano.md | sed -n 205p | grep -c '\[v2\]'` → 0, e `sed -n 208p` → 0. F7 e F10 não têm marca e são da v2 (v2.3 "§4 reescrito"; 03 §9 também diz F10 = v2). Logo, ausência de marca não prova origem na v1. A v1 não está no git (`git log --all -- docs/revisoes/SAN3/B-AV-REAL-plano.md` começa em `1279454e`, 30/10), e a v2 foi gravada em cima do mesmo arquivo em disco: **origem das l.139/141: não medida**. 03 §3.1 chamou isso de "leitura minha"; a 04 promoveu a FATO.

**Efeito:** "antes do merge" não é "antes do upgrade". O plano, a fila e a régua foram feitos na mesma hora, pelo mesmo orquestrador, para o mesmo pacote.

### P4. "Plano e dev não mudaram de texto" é falso; "executor e fluxo mudaram juntos" também (MÉDIO, nos dois sentidos)
**Trecho:** l.8, l.30 ("Nenhuma dessas etapas mudou de texto no #475… só o item 10"); l.38.
- `git diff 264c3760^ 264c3760 -- CLAUDE.md | grep -E '^\+.*Quem faz'`: o último tópico do item 10 trata de quem desenvolve e de quem planeja. Mudou de texto.
- Ao mesmo tempo, l.38 ("entrou no mesmo PR… não se separam") ignora 03 §9: Sol como primeira escolha é anterior ao #475 (`D-IAS-EXTERNAS-PRIMEIRO`, 17/10; 2 contas, 28/10). E há separador parcial: B-DASH-PERFIL, só Codex, fluxo velho (`02` §7.4). **Isto favorece o upgrade**, e a 04 não usa.

**Efeito:** o texto mudou, a prática já vinha de antes. As duas frases estão erradas em direções opostas.

### P5. C2 culpa o modelo; o mesmo modelo fez a melhor crítica da janela (GRAVE)
**Trecho:** l.48 ("no modelo que não achou nada"), l.34, l.63 (M2), l.71 (D-a).

**FATO, B-SAN3-20, 21/10, antes do #475:**
- `sed -n '43p;46p' ferramentas/agentes-vivos.tsv` → `Codex gpt-5.6-sol medium`, VOLTA (2 bloqueia, 4 ajuste) e VOLTA (1 bloqueia, 1 ajuste).
- `sed -n 1,7p revisoes/B-SAN3-20-critica-r1.md` → "GPT-5.6 Sol"; a razão decisiva, no fim do arquivo, diz "demonstram por execução uma interleaving alcançável".
- `02` §4: esse bloco teve 0 bloqueantes na junta e aprovou de primeira.

| Prompt | `critico-adversarial` | worktree | Execução pedida |
|---|---:|---:|---|
| `crit-san3-20-cdx.md` (21/10) | 1 | 2 | "por execução, não por leitura", Postgres descartável |
| `rev-plano-avreal-sol.md` (29/10) | 0 | 0 | 1 parágrafo; o parecer declara sem Docker |
| `rev-plano-avreal-v2-sol.md` (30/10) | 0 | 0 | "Sem Docker"; `VOLTA` restrito |

Comando: `grep -c critico-adversarial prompts/...` e `grep -c -i worktree prompts/...`. Mesmo modelo e mesmo esforço. **A variável que mudou e tem medida é o prompt.**

Outros contraexemplos:
- "Não achou nada" é falso até no bloco: a v1 do Sol deu VOLTA com 3 achados reais, e a v2 corrigiu a partir deles. Sol também deu VOLTA em `rev-emenda3` e em `conf-san303` (`agentes-vivos.tsv`, últimas linhas).
- Crítica com Opus não garante junta limpa: B-SAN3-12b (r2 Opus, 5 bloqueia) → 6 bloqueantes no voto; B-SAN3-22 (Opus) → 3 (01 §3 e 02 §6).
- "Sem Docker" não é o divisor: `sed -n 8p revisoes/crit-emenda-o6r11.md` ("nada de Docker") e `sed -n 6p revisoes/crit-emenda-san303.md` ("Sem Docker"), 7 e 10 graves. Só a de assinatura teve Postgres próprio. Confirmei que as 3 executaram sondas, o que a 03 não mediu e a 04 afirmou sem comando.
- Pelo critério da própria 04 (l.32, "3 = mediana"), a crítica Sol não produziu mais bloqueantes que a mediana. Ela não pode ser, ao mesmo tempo, normal e a causa nº 2.

**M2 troca 3 coisas de uma vez** (modelo, execução, Docker), então não ensina nada. O critério de desfazer ("3 críticas Sol seguidas acharem o mesmo que o baseline Opus") não roda: se o Opus substitui o Sol, não há Sol para comparar. **D-a pede ao dono para contrariar "Codex primeiro" sem causa comprovada.**

**Limite:** B-SAN3-20 é N = 1, bloco de dinheiro, plano iniciado em Astra e concluído em Fable. É contraexemplo, não prova de que o prompt basta. **Não medido:** os prompts das 3 críticas Opus não estão em `prompts/` (`ls prompts | grep -E 'crit-(o6r11|san303|assin)'` → nada), então a comparação Sol × Opus de l.34 é também prompt × prompt desconhecido, com "grave" sem conferência de quantos eram reais.

**Vale registrar:** o prompt curto é de 29/10 08:05 (`stat prompts/rev-plano-avreal-sol.md`), antes da aprovação do fluxo. O encurtamento não nasceu do item 10. A restrição de `VOLTA` e "lista completa de achados de uma vez" entram em 30/10 09:41, 14 min depois do merge, esta última com as palavras do item 10.

### P6. M7 não mede o risco declarado e reabre o loop (GRAVE)
**Trecho:** l.68, l.73, l.84.
- O risco que o item 10 declara é "um conserto pode criar defeito novo que nenhuma cadeira julgue". Reexecutar **só comandos já registrados** não vê defeito novo. O verificador já "roda o comando de cada achado" (10(3)5), então M7 repete boa parte dele.
- O D1 prova a classe: `grep -n D1 revisoes/rev-emenda-avreal.md`, defeito que nenhuma cadeira viu. M7 teria dado verde em cima dele.
- Exclui C1, sem motivo escrito, embora a C1 tenha 12 dos 27 achados e o conserto toque privacidade, censo e prazos (lotes L3 a L6 de `juntas/J-B-AV-REAL/triagem.md`).
- Dono: *"nao quero refazer cadeiras"*; 10(4) admite só 2 casos. Chamar de "controle, uma vez" não muda o que é. O D-c não avisa do conflito.
- "~40 min" sem comando. `stat juntas/J-B-AV-REAL/c?-voto.json`: C1 terminou 19:16, C2 19:54, C3 20:12, ou seja **56 min** só das duas, com Docker.

### P7. M3, "modelo diferente do dev": sem causa, com contraexemplo e com conflito não declarado (MÉDIO)
**Trecho:** l.49, l.64, l.70-73.
- `02` §5: pré-revisão em modelo diferente do dev já houve. B-TRC-02 (Flash × Opus) e B-SAN3-02 (Codex × Opus). Nos dois a junta ainda achou bloqueante que ela não viu. Modelo diferente: N = 2, 0 de 2 evitaram.
- Com dev em Sol, "modelo diferente" é Claude ou Gemini. Gemini não pode ser revisor único (`D-GEMINI-SEGUNDO-REVISOR`, item 8(1) do contrato), e Claude contraria `D-CODEX-PRIMEIRO`. D-a a D-c não trazem isso.
- A outra metade de M3 (ler o resumo do teste, mutação como escrita, subir o entregável) tem causa medida: `sed -n 10p prompts/prerev-avreal-sol.md` ("à sua escolha") e `revisoes/prerev-avreal-parecer.md` l.98-100. Essa fica.

### P8. "Não é fora da curva" compara distinto com cru (MÉDIO)
**Trecho:** l.10 e l.32.

`02` §2: "cru compara com cru". Nos 13 blocos não há dedupe. Cru, o B-AV-REAL tem 5; só 2 de 13 chegam a 5 (B-O6R-04a e B-SAN3-12b, `02` §6). A 04 não mostra isso, nem a densidade: 02 §1 diz "2ª maior de 14", e a 1ª tem 479 linhas.

Com painel completo (N = 9, `02` §6), recalculado: B/mil 0,77 × 2,50 cru (3,25 vezes) ou 1,50 distinto (1,95 vezes); R/mil 3,33 × 9,99 distinto (3,0 vezes).

**Limite justo:** os outros blocos não têm dedupe, e 2002 linhas é denominador pequeno. Dizer "em 1 de 4 medidas não é fora da curva" é o honesto.

### P9. "Parcialmente comprovado" vem de amostra escolhida pelo resultado (MÉDIO)
**Trecho:** l.10, l.37 ("3 de 4 blocos amostrados"), l.79, E14.
- Os 4 "amostrados" (13, 02, 12a, TRC-02) são exatamente os 4 que `02` §7.5 já tinha listado como incompletos. A taxa real é 4 de 13: **9 de 13 votaram com as 3 cadeiras no ciclo 1.**
- Painel completo não explica o tamanho: entre os 9 com 3 votos, a mediana é 4,3 por cadeira, contra 7,7 distinto (`02` §6).
- Espalhar por ciclos também não fecha a conta. Somando **todos** os ciclos dos 2 blocos em que a cadeira ficou de fora por reprovação ou por decisão (ata 13 l.17 "o ciclo reprovou antes"; ata 12a l.20 "seguradas"): 12a 5,21 R/mil e 13 4,15 R/mil, contra 9,99 num voto só. (Contagem de `02` §4; denominador de `02` §6.)
- `02` §7.5 diz "não medido: quanto disso explica o número" e "as cadeiras antigas já listavam vários achados. A frase não criou o hábito". A 04 diz "comprovado" e, em l.79, afirma sem rótulo de hipótese. O correto é **HIPÓTESE**.

### P10. Explicações alternativas não descartadas (MÉDIO)
**Comando:** `grep -c tipo 04-analise.md` → 0; `grep -c desligado 04-analise.md` → 0.
- **Docker desligado.** v2.6 e `sed -n 193p planos/B-AV-REAL-plano.md`: "Docker está desligado agora". É a razão escrita do aceite de F7, e a 04 não a cita. M1 e M2 exigem Docker e não dizem como conciliar com isso nem com o teto de trabalhos Docker. **Limite:** não explica tudo. Com Docker ligado, F8 a F10 sobem só o compose de dev (`sed -n 204p`, `--profile av`); o overlay nunca sobe em fatia nenhuma. Isso sustenta M1.
- **Tipo de bloco.** Integração com daemon real em container, exercida de ponta a ponta pela C3. `02` §7.2 tem a tabela; a 04 não usa.
- **Plano muito especificado dá lista de conferência à cadeira.** Matriz de 14 proteções, cada uma com mutação (v2.2). `03` §4: o plano pedia a propriedade em 18 de 23 achados. E os "3 itens" do mandato carregam várias proteções: `juntas/J-B-AV-REAL/mandatos.md`, C1 cobre R1, R12(a), R2, R3, R8b, R4, R5u, R10u, R13. Pode subir o R sem haver mais defeito. **Não medido:** o mesmo nos mandatos antigos.

### P11. C4 e M4: a F11 não ficou órfã por causa da fila (MÉDIO)
**Trecho:** l.50, l.65 ("eram 3").
- `stat prompts/dev-avreal-sol.md` → 30/10 09:42. `sed -n 7p`: *"Se F11 depender delas, pare em F7 e registre"*. O dev fez isso: `git show 2746eb60:docs/revisoes/SAN3/B-AV-REAL-dev.md | sed -n 150p`.
- Quem largou a F11 foi o prompt à mão de 31/10 10:42, `prompts/dev-avreal-docker-sol.md` ("SÓ F8, F9, F10 e F12"), 25 h depois. Parar a fila em `APROVADO COM AJUSTES` não mudaria isso. É o erro 3 de `03` §6, não o erro 2.
- O outro caso, C2-A6, é `pre-existente`, e a triagem registra "comportamento de hoje correto, medido por sonda 6/6". Não é defeito de produto nascido da fila.
- **Fica de M4:** decidir por marcador do diário, não `ec=0` (`painel/filas.log` l.101-102), e rotacionar log. A parte "parar em ajustes" é boa higiene, com **0 defeito provado** como causa.

### P12. "Fica como está" justificado com número de antes do upgrade (MÉDIO)
**Trecho:** l.74 ("1,45… igual ao 1,47"), contra l.84.

O 1,45 é só de blocos ANTES (`02` §8), então não diz nada sobre o item 10. E está cortado pelo teto da regra 8(2). L.74 decide "item 10 inteiro fica"; l.84 diz "não concluir nada sobre o verificador antes de M7". O que os dados permitem é "não há dado para mudar", não "nenhum número justifica".

### P13. C5, "Ligada ao #475? Não": falta medir, e 01 disse outra coisa (MÉDIO)
**Trecho:** l.51, l.66.
- `01`, "O que de fato mudou", linha 6: 11 commits entre a pré-revisão e o voto, e "Em parte: 'o dev conserta' está no item 10". O item 10 não manda reconferir o conserto da pré-revisão antes do voto. Foi nesse vão que entraram os 2 defeitos do `b407692a`. A 04 endureceu "em parte" para "Não".
- Baseline ausente: `01` "Não medido: se o orquestrador escreveu código no #464 e no #469"; 03 §2 "não medi desde quando ele commita". "Eram 4" tem N = 1, sem antes.
- Mandato: #464 e #469 têm "4 PRE-VOO OK"; a primeira junta sob o fluxo novo tem 0 (`01`, tabela de blocos). É 1 caso, então não é causa. "Não" também não se prova.

### P14. O resumo tira a pré-revisão da lista de quem deixou passar (MÉDIO)
**Trecho:** l.9 ("Quem deixou passar 24 de 25 foram crítica sem execução, dev… e fila…, nenhuma delas escrita no item 10"); l.20.
- A pré-revisão está no item 10 e deixou passar os mesmos 24, com 2 afirmações contrárias ao real (`03` §4). L.49 admite; o veredito não. Junto dos 5 segurados (0 graves), o resumo deveria dizer os 24.
- L.20: "avulsa em 4 de 14" inclui o próprio B-AV-REAL. Antes do upgrade são **3 de 13** (`02` §5: 02, TRC-01, TRC-02). O erro vem de 03 §2, e E14 não o pegou.

### P15. "53% de processo" sem o aviso do próprio 02 (MÉDIO)
**Trecho:** l.82.

`02` §8: "Mapa de classes (escolha minha)… Se 'guarda de teste' contasse como produto, seria 31 × 7", isto é 18%. E l.47 põe como causa nº 1 justamente teste que não prova, a classe que esse mapa chama de "processo". As duas leituras não convivem sem o aviso.

### P16. O bloco foi afirmado, não confirmado (MÉDIO)
**Trecho:** l.7 ("O bloco com 'altos erros' é o B-AV-REAL").

`01` H1: "**O dono não nomeou o bloco.**" e "o B-O6R-11 é o outro candidato". `grep -c H1 04-analise.md` → 0. O B-O6R-11 aparece só em C5, embora `03` §7 meça 42 defeitos, 33 deles de plano e de correção de plano em Fable, e `agentes-vivos.tsv` traga 7, 10 e 17 graves em 3 planos no mesmo dia. **A 04 não tem linha de causa para a qualidade do plano na origem.** Dá para responder às duas leituras, mas hoje ela responde a uma só.

### P17. Custos sem comando, e sem total (MÉDIO)
**Trecho:** l.62-68, coluna "Custo por bloco".

A regra da auditoria: dado inexistente é "não medido", sem estimar. "+15 a 30 min", "20 a 40 min", "~40 min", "5 a 10 min", "10 a 20 min" não têm comando nem rótulo. A 04 também não soma: pelos próprios números, M1 + M2 + M3 + M5 dão **cerca de 57 a 102 min a mais por bloco de infra**, sem contar M4 nem tokens Claude. O dono pediu *"aceleração"*, e esse total é o que ele precisa ver. (Soma de estimativas, não medida.)

### P18. Erros pequenos, todos corrigíveis numa linha

| Trecho | Problema | Comando |
|---|---|---|
| l.3 | "Medido… 22:45–23:30 SP": hora impossível. O arquivo foi gravado às 22:33 | `stat -c '%y' 04-analise.md` → `22:33:20`; `04-analise-evidencia.md` → `22:31`, e ele diz "Início ~22:45" |
| l.31 | Comando citado não reproduz como escrito: sem o prefixo dá 0 | `git log origin/main --since=2026-10-10 --diff-filter=A --name-only --format= -- 'omega/reprovacoes/R-*.md' \| wc -l` → 0; com `agent-orchestration/` → 14. O número (10 + #389 = 11 de 13) está certo |
| l.52 | "`LIMITE` → 6 em 31/10": são 5 em 31/10 e 1 em 30/10 | `stat -c '%y' $S/codex-dev-avreal-1-1.status` → 30/10 10:06 |
| l.62 | "Aceite por leitura: era 3 de 3": L3 foi mutação executada, na forma errada. São 2 de 3 | `revisoes/prerev-avreal-parecer.md` l.98-100 |
| l.49 | "9 de 23 desmentem o dev": 03 diz "desmente **ou reduz**"; A2 é "em parte", A9 "só no mesmo frame" | `03` §4 e §3.2 |
| l.33 | "O único defeito que escapou da junta (D1)": é o único **conhecido**; o verificador tem N = 0 | l.9 da própria 04 |
| l.65 | "Logs perdidos por etiqueta: era 1": há outro caso, `cog-474-r2-1` | `grep -n cog-474-r2-1 painel/filas.log` (`AVISO… LIMITE` às 10:25) × `.status` `ec=0` às 10:35 |
| E5 | "As duas críticas não tocaram as linhas": a v2 imprimiu a linha do F10 com `tee` | parecer v2, item 3: `sed -n '193p;204,208p'`; `sed -n 206p planos/B-AV-REAL-plano.md`. Leu e não viu, o que é outra causa |
| l.81 | "O prompt v2 fez isso; 0 menções ao overlay" sugere causa. 03 §6 item 1 avisa: a v1, sem a restrição, também teve 0 | `grep -c -iE 'overlay\|freshclam\|internal' revisoes/rev-plano-avreal-parecer.md` → 0 |
| 02 §7.6, usado em 03 §1 | "#405: 20 achados, C3 6/1": no campo `achados`, C3 tem 4/0 e o total é 17 | `git show origin/main:agent-orchestration/omega/juntas/votos/B-SAN3-05/C3-voto.json`. O 3×0 segue valendo. Não medi de onde vêm os outros 3 |

## 3. Erros do orquestrador que faltam

1. **Crítica lançada sem o corpo do `critico-adversarial`, sem worktree e sem pedir execução,** num bloco de segurança, depois de ter feito o contrário em 21/10 (P5). A 03 §6 item 1 registra a restrição de `VOLTA`, não esta regressão.
2. **Registro falso da F11.** `sed -n 249p ferramentas/agentes-vivos.tsv` → `concluido 10:36 SP F5 a F7 e F11`. O dev escreveu que a F11 parou (`B-AV-REAL-dev.md` l.150). O registro de agentes vivos é o que a retomada usa (P8 do contrato), e esse estado falso cobriu a fatia órfã até a C3 achar.
3. **Ressalvas do inspetor sem destino.** `sed -n 82,88p juntas/J-B-AV-REAL/00-inspetor.md`: 5 arquivos do diff sem cadeira, e 2 inelegíveis fora da lista. `triagem.md` só leva 2 ressalvas adiante. **Limite:** `grep -c 'env.example' juntas/J-B-AV-REAL/c?-voto.json` → 0, 0, 0, mas a C3 declara `**` em `arquivos_medidos`; não sei se foi visto. **Não medido:** se a identidade de cada voto foi conferida, como a ressalva 3 pedia.
4. **Plano v1 em Astra e v2 "em cima do arquivo".** `sed -n 2,3p planos/B-AV-REAL-plano.md` e `sed -n 2p prompts/plan-avreal-astra.md`: a ordem citada no prompt ("coloca para fazer o antivirus") não nomeia modelo. A 04 usa a v1 para afastar o #475 e não abre causa para ela, embora l.17 a mencione. Se as l.139/141 são da v1, é premissa herdada e não remedida, a classe do §C7.4-bis (c). **Não medido:** se houve ordem do dono para o Astra neste bloco.

## 4. O que confirmei e resiste

| Item | Comando | Resultado |
|---|---|---|
| 27 achados, 5 bloqueia | E3, lido nos votos e na triagem | Confere |
| 11 de 13 reprovaram no ciclo 1 | `git log … agent-orchestration/omega/reprovacoes/R-*.md` | 14 arquivos, 10 blocos + #389. Confere |
| Máximo antes = 22 | `ataque-votos.py` sobre B-SAN3-22 (3/19) e 12b (6/14) | Confere; #400 ciclo 1 = 5/17 |
| Job verde com `not ok 8` | `gh run view 41207885759 --job 124556664769 --log` | Confere |
| Plano l.139, 141, 205, 208 | `git show 2746eb60:…` | Confere |
| 0 menção a overlay nos pareceres | leitura inteira dos 2 pareceres | Confere |
| #475 só acrescenta, último upgrade | `git log origin/main -1 -- CLAUDE.md` | Confere |
| 3 críticas Opus executaram sondas | cabeçalhos dos 3 pareceres | Confere; a 04 acertou onde a 03 não mediu |

**Conclusões que ficam:**
- **"O texto do item 10 não escreveu os defeitos":** fica, reformulado, sem o "0 de 25".
- **C1 é a família mais forte.** Vale como causa de fundo, com 2 ressalvas: 1 dos 7 casos (`ec=0`) é de outro bloco, e a existência em 28/08 não mostra que a frequência não subiu. `03` §9: "quanto do antes tinha falso verde igual: não medido". Só o B-AV-REAL teve autópsia.
- **"Causas em ordem de peso" (l.43) não tem métrica de peso,** e o job falso aparece em C1, C2 e C3. Trate como lista, não como ranking.
- **M1** (com "2 de 3"), **M3** (só o mandato), **M4** (só o `ec=0` e o log), **M5** e **M6** têm causa. **M2** e **M7** não: precisam ser refeitas ou retiradas antes de ir ao dono.
- **"Não voltar a re-junta"** se mantém pelo motivo certo: não há dado para voltar, N = 0 no verificador. "Mais junta não os evitaria" (l.78) vale para o nascimento, não para a detecção.

## 5. Evidência (P1)

- **Refs:** `git fetch origin`; `origin/main` = `0fda595a`; `gh pr view 477` → OPEN, `78f78916`.
- **Relógio:** `date` 22:37 SP; `stat` 01 22:00, 02 22:08, 03 22:23, 04-evidência 22:31, 04 22:33.
- **Pacote:** `PAUSA-2026-10-28.md` l.78-83; `ferramentas/fila-3010.sh`; `painel/filas.log` l.1-25; `agentes-vivos.tsv` l.241-258; memória `project-fluxo-rapido-2026-10-30.md`.
- **Plano:** `planos/B-AV-REAL-plano.md` 88.449 bytes, gravado 30/10 09:39; l.2-3, 11-19, 137-140, 193, 203-207. `grep -c '\[v2\]'` nas linhas de F7 e F10 → 0 e 0, em disco e em `2746eb60`.
- **Críticas:** prompts v1, v2 e `crit-san3-20-cdx.md`; pareceres v1, v2, B-SAN3-20 r1/r2, `crit-emenda-o6r11`, `crit-emenda-san303`, `crit-assinatura`.
- **Votos:** `ataque-votos.py` no scratchpad da sessão, só leitura de `origin/main`: B-SAN3-22 total 22 (3 B); 12b 20 (6); 09 ciclo 1 22 (5); 05 17 (7); 20 13 (0); 13 ciclo 1 4 (2); 12a ciclo 1 8 (3).
- **Contas:** `python -I`: mediana B com 3 votos = 3; B cru ≥ 5 antes = 2 de 13; mediana B/mil com 3 votos = 0,77; 12a todos os ciclos 22 R, 3 B, 5,21 R/mil; 13 todos os ciclos 13 R, 3 B, 4,15 R/mil.
- **Junta:** `juntas/J-B-AV-REAL/{mandatos,triagem,00-inspetor}.md`; `stat c?-voto.json` → 19:16, 19:54, 20:12.
- **Quedas:** `$S/codex-*.status` por `stat` (`S` = scratchpad da sessão, o de `fila-lib.sh` l.4).
- **Atas antigas:** `git show origin/main:agent-orchestration/omega/juntas/J-B-SAN3-13.md` l.11-17; `J-B-SAN3-12a.md` l.20.
- **Não reexecutei:** mutações e sondas das cadeiras (sem Docker, por mandato), Flutter, a contagem completa dos 13 blocos.
- **Não medido, além do citado acima:** quantos graves das críticas Opus eram reais; quanto custa, de verdade, cada medida; o efeito isolado do pacote de 30/10 em defeitos, que com N = 1 não tem como sair.
