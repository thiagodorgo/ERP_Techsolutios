# PROTOCOLO DE JUNTA RESILIENTE (`D-JUNTA-RESILIENTE`, 2026-08-29)

> Norma permanente para TODA junta, inspeção de terreno e porteiro. Nasce do postmortem das **14 quedas de
> agente em ~28 disparos (~50%)** da sessão de 28–29/08 — `omega/POSTMORTEM-QUEDAS-2026-08-29.md`.
> O que este protocolo NÃO muda: quóruns, vetos, identidade nova por ciclo, separação de papéis
> (§C7.4-bis) e o teto de dois ciclos (`D-TETO-DOIS-CICLOS`). Ele muda **como o trabalho sobrevive à morte
> de quem o fez**.

## P1 — Evidência incremental: escrever no disco a cada item, nunca só no fim

Todo mandato de jurado, inspetor ou porteiro exige: **após CADA item medido**, apensar ao arquivo

```
agent-orchestration/omega/juntas/votos/<JUNTA>/<cadeira>-evidencia.md
```

uma entrada curta com três linhas: **comando executado → saída resumida → veredito parcial do item**.

Por quê: das 14 quedas, as mais caras foram no fim — um inspetor morreu na limpeza com a inspeção pronta,
dois jurados morreram indo compor o voto, um deles **depois de achar um defeito real**. Trabalho ~90% feito
virou 100% perdido porque tudo viajava na mensagem final. Com o arquivo de evidência, a morte custa apenas
a cauda não medida.

## P2 — Voto-arquivo-primeiro: a mensagem final é 1 linha

O jurado **escreve o JSON do voto em arquivo** (`<cadeira>-voto.json`, mesmo diretório) **ANTES** de compor
a mensagem final. A mensagem final vira **uma linha** apontando o arquivo. O mesmo vale para pareceres de
inspetor e de porteiro (`.md`).

Por quê: morrer streamando o voto (quedas #8, #10, #13 do postmortem) é a perda mais idiota possível — o
julgamento existe e evapora. Sob P2, essas três mortes teriam custado zero.

## P3 — Emenda à regra R2 (perda de jurado): re-executar é barato, herdar é proibido

Texto vigente da R2, que fica: *voto perdido não conta; o sucessor tem identidade nova.*

Texto **emendado** do que o sucessor faz: *"**Nada conta sem re-execução própria** — mas evidência
**registrada em arquivo** pelo caído (P1) é **roteiro de re-execução barata**: o sucessor re-roda cada
comando registrado e compara a saída, e só então mede a cauda que faltou. **Conclusão sem comando
registrado continua sendo não-insumo**, inclusive parcial favorável."*

Por quê: a R2 nasceu para impedir herança de afirmação não verificada (foi isso que contaminou a junta do
ciclo 4 do financeiro) — e isso fica intacto. O que ela nunca precisou proibir é re-verificar uma medição
cujo comando está escrito: re-rodar e comparar custa segundos e **é** verificação própria. A 50% de
mortalidade, essa distinção é a diferença entre a junta custar 1× e custar 3×.

## P4 — Mandato ≤3 itens · medição ≠ voto · saída final curta

- Cadeira com mais de **3 itens** vira **duas cadeiras**.
- Logs e saídas longas vão no **arquivo de evidência** (P1), nunca na mensagem final.
- Bloco de medição pesada separa **medir** (uma fatia, só números com N e forma) de **julgar** (outra fatia)
  — o padrão 4a/4b já aprovado na rodada Ω-SAN2.

Por quê (dito com precisão, corrigindo a lição de 29/08): mandato longo **não mata** — quatro agentes
morreram na mensagem 1, antes de qualquer trabalho, o que prova falha por request. A relação verdadeira é
*morte ≈ exposição × taxa da janela*. Mandato curto reduz a exposição **e** o custo de cada perda. É a
prática certa pelo motivo certo, não por superstição.

## P5 — Disparo escalonado + detector de janela instável

- Máximo **2 jurados em paralelo**; o terceiro só dispara quando um dos dois conclui.
- **2 quedas em menos de 30 minutos → pausa de ~15 minutos** antes de qualquer redisparo, registrada no
  arquivo de quedas da junta.

Por quê: as quedas agrupam no tempo (os dois disparos de 3-em-paralelo perderam 2–3 membros cada).
Paralelismo não causa o erro, mas multiplica os streams expostos dentro da janela ruim — e redisparar
imediatamente dentro dela foi o que multiplicou as perdas.

## P6 — Registro padronizado de quedas: a série que decide as hipóteses

Toda queda vira uma linha em `votos/<JUNTA>/00-quedas.md`, com colunas fixas:

| agente | modelo (pin/herdado) | mandato (nº itens) | fase da morte | erro | custo do redo |

Por quê: (a) sem série histórica, cada sessão redescobre o problema; (b) há uma **hipótese em aberto** que
só a série resolve — na sessão do postmortem, agentes pinados em `fable` morreram 1/5 (~20%) e os que
herdavam o modelo da sessão ~13/23 (~57%), **n pequeno demais para concluir**. Ninguém pina modelo por
palpite; a série do P6 confirma ou descarta.

## Modelo de mandato (colar no disparo de cada cadeira)

```
Após CADA item: apense a <cadeira>-evidencia.md → comando · saída resumida · veredito parcial.  [P1]
Antes da mensagem final: escreva <cadeira>-voto.json. Mensagem final = 1 linha apontando o arquivo.  [P2]
Máximo 3 itens; logs longos só no arquivo de evidência.  [P4]
Se você substituir um caído: re-execute cada comando do <cadeira>-evidencia.md dele e compare, depois
meça a cauda. Conclusão sem comando registrado NÃO é insumo.  [P3]
```

## O que o orquestrador faz (não o agente)

- Dispara no máximo 2 em paralelo e aplica a pausa de janela instável (P5).
- Commita os arquivos de evidência e voto após cada conclusão (agente não commita).
- Preenche `00-quedas.md` (P6) no momento de cada perda.
- Na ata: consigna quedas, custo de redo real e, quando houver suplente, **quais itens foram re-executados
  do roteiro** vs medidos de novo.

## Emenda (2026-09-01, medida na junta `J-SAN2-2`) — voto-esqueleto: a granularidade do registro acompanha a da medição

As cadeiras C2 e C4 do `J-SAN2-2` morreram **cinco vezes no mesmo ponto**: a transição *medir → gravar
o voto*. O P2 mata a morte streamando o voto, mas o voto continuava sendo **ato único**. A correção que
funcionou, em duas escalas, passa a ser norma de P1/P2:

1. **voto-esqueleto**: o artefato de saída (evidência E voto) **nasce como esqueleto** com os itens
   `EM APURAÇÃO`, e cada item é gravado **ao ser medido**;
2. **item grande também se fatia**: o item 3 da C4 virou objeto de 6 sub-chaves e a queda seguinte
   custou 1/6 em vez de 6/6.

Regra: **onde medir tem N passos, gravar tem N passos.** Inline nos contratos desde o SAN2-6 (§C7.7,
dentro do P2).
