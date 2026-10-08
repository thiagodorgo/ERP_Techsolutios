# R-B-SAN3-11-1 (ciclo 1) — os links novos não parecem links, dois casos nascem do lado permitido, e as pendências novas não têm dono

- **Data:** 2026-10-03 · **Bloco:** `B-SAN3-11` · **PR:** #401 · **Ramo:** `fix/dossie-versao-da-vistoria`
- **Objeto reprovado:** `defa502ee0a03dabbc8786d568d00f7eb7ca726d` · **Junta:** `J-B-SAN3-11.md`, ciclo 1, **REPROVADO 0 × 3**
  (unanimidade de 3 exigida).
- **Evidência executada:** `agent-orchestration/omega/juntas/votos/B-SAN3-11/C{1,2,3}-evidencia.md` e os votos JSON.

## Os bloqueantes — defeito, evidência e motivo, como quem achou os relatou (sem proposta de correção)

1. **C1-01 (cognicao-visual).** Defeito: os links "Ver versão vigente" e "Ver versão anterior" não têm afordância de link
   nem hover. Evidência: estilo computado em repouso e sob `:hover` idêntico ao texto em volta, medido no navegador; causa
   em `frontend/src/styles/global.css` l.26-29, que zera cor e sublinhado de todo `a`. Motivo: a âncora é a forma que o
   bloco escolheu de levar o leitor da versão substituída à vigente; se ela não se distingue, a navegação prometida não
   existe para quem a vê.
2. **C2-01 (guardiao-fail-closed).** Defeito: a remoção de uma chave no DTO não fica vermelha. Evidência: mutações M5b, M5c
   e M2 compilam, a suíte passa (1230/1230 em M2) e o gerador sai 0; em execução, a substituída aparece como "Concluído"
   (M2) ou o dossiê diz "não está vinculada" com a vigente na lista (M5b). Motivo: ausente ou inválido colapsa com `null`,
   e a decisão do §4 do plano ("nulo é vigente") põe esse caso do lado permitido.
3. **C2-02 (guardiao-fail-closed).** Defeito: um ponto de apresentação novo com receptor fora de `/run|checklist/i` é
   descartado em silêncio pelo gerador, e a "consulta" é aceita por qualquer leitura do campo. Evidência: as mutações da
   C2 no voto. Motivo: a guarda reconhece forma de nome, não a propriedade "toda apresentação da situação consulta o
   estado de substituição".
4. **C3-B1 (coordenador-de-acessos).** Defeito: as duas pendências novas do §13 entraram sem dono válido — uma aponta
   para o `B-SAN3-12`, do financeiro, e a outra diz "a definir" —, e o índice as publica com dono "sim". Evidência:
   leitura do `pendencias.md` e do índice no objeto. Motivo: o critério A15 do plano exige pendência com dono.

## O que o ciclo 2 recebe

- **Os ajustes:** C1-02, C1-03, C1-04, C3-A1 e C3-A2. **As notas:** C1-05, C1-06, C2-03 e C3-N1. Texto em `J-B-SAN3-11.md`.
- **A `main` andou** para `b404815c` (#404) e o PR está `CONFLICTING`: o ciclo 2 integra a `main` de então e reconta o KPI.

## Papéis do ciclo 2 (§C7.4-bis)

- **Quem achou:** as três cadeiras do ciclo 1 (`cognicao-visual`, `guardiao-fail-closed`, `coordenador-de-acessos`). Não
  planejam, não desenvolvem e não votam no ciclo 2.
- **Quem planeja:** `planejador-mestre` em Fable (obrigatório no retorno ao planejador, §C7.6), que escreve a seção do
  ciclo 2 no plano a partir deste relatório e re-mede a decisão do §4.
- **Quem desenvolve:** um dev que não achou nem planejou.
- **Junta do ciclo 2:** três identidades novas, escritas pela `agente-fabrica`, com as mesmas três competências.
