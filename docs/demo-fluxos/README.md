# Quatro fluxos — vídeos do ERP em operação

Quatro reencenações do sistema funcionando, para apresentação. Cada uma mostra o **console web**
e o **aplicativo de campo** lado a lado, com o dado atravessando de um para o outro.

Abra **`index.html`** no navegador. Não precisa de servidor, nem de rede, nem do backend no ar.

| | Fluxo | Arquivo |
|---|---|---|
| 01 | Do chamado à rua | `fluxo-1-chamado.html` |
| 02 | O checklist que a web escreve e o campo preenche | `fluxo-2-checklist.html` |
| 03 | Do resgate à custódia | `fluxo-3-patio.html` |
| 04 | Do serviço ao dinheiro | `fluxo-4-dinheiro.html` |

**Atalhos:** espaço reproduz e pausa · setas andam 5 segundos · os capítulos embaixo saltam
direto para a cena · o botão `1×` troca a velocidade.

---

## O que é espelho e o que é encenação

Esta distinção é o contrato desta pasta. Ela existe para que ninguém — nem o dono, nem um
investidor, nem um agente que mexer aqui depois — confunda o que o produto faz com o que o
vídeo mostra.

### O console web **é o produto** (espelho)

A janela do navegador dentro do vídeo não é um desenho do ERP. É um `<iframe>` carregando
`espelho.html`, que monta **`frontend/src/App.tsx`** — os mesmos componentes, o mesmo roteador,
o mesmo CSS que rodam em operação. O que muda é só de onde vem o dado: em vez da rede, de um
snapshot gravado.

**Consequência:** mexeu na tela do produto, recompilou, o vídeo mudou junto. E o vídeo **não
consegue** mostrar tela que não existe.

### O aparelho é **recriação fiel** (não espelho)

O aplicativo é Flutter/Dart e não roda dentro de um pacote web. Tentar não é um ajuste de
configuração: o app usa `drift` + `sqlite3_flutter_libs`, e no navegador o drift exige WASM e
um worker — é migração da camada offline inteira, que é justamente o núcleo do produto.

Então o telefone é recriado em React. Mas recriado a partir do **código Dart real**
(`mobile/flutter_app/lib/**`), não do protótipo: os rótulos, os estados e os botões de cada
tela foram lidos no `.dart` e reproduzidos. Cada tela recriada declara, no comentário do
`.jsx`, qual arquivo Dart ela espelha.

### Os números são do banco

Tudo que aparece como número vem de `dados-reais.json`, extraído do banco de desenvolvimento
(organização **Guinchos Paraná**). A linha do tempo de um veículo específico é a encenação do
fluxo; os agregados são medidos.

---

## A fundamentação — 93 passos que o produto não faz

Antes de escrever qualquer roteiro, oito agentes leram o código: quatro fundamentando os
fluxos, quatro **refutando** o trabalho dos primeiros. Resultado em
**`fundamentacao/F1.json` … `F4.json`**, no campo `passos_inexistentes`.

São 93 passos que os roteiros originais afirmavam e o produto não faz. Exemplos que mudaram o
Fluxo 02:

- a tela de vistoria do app **não tem stepper** — o stepper vive no detalhe da OS
- **não existe contador "Fotos 0/8"** — cada `photo_upload` guarda **uma** evidência
- o mapa de avarias **é outra tela**, e o modelo "Vistoria de Entrada" não tem esse componente
- **nenhuma tela web renderiza as fotos** de uma vistoria preenchida em campo

Esses arquivos valem além dos vídeos: são um levantamento do que está prometido no protótipo e
ainda não existe no produto.

**Regra para quem editar um fluxo:** leia o `passos_inexistentes` do seu `F<N>.json` antes de
escrever narração. Uma frase que afirma o que o sistema não faz é o defeito que este projeto
mais combate — um artefato afirmando um resultado que a execução não produz.

---

## Como regravar e recompilar

### Regravar o snapshot (quando o dado ou a tela mudarem)

Precisa da API em `:3000` e da web em `:5173`.

```bash
node scripts/demo-fluxos/gravar-snapshot.mjs
```

O script abre o app real no Edge, faz login real como `admin.demo@example.com`, **escolhe a
organização** (sem esse passo toda rota volta para `/select-context`), navega as rotas dos
quatro fluxos e grava em `snapshot-api.json` toda resposta `/api/v1` que as telas consumiram.

O token **não** entra no snapshot — é substituído pelo literal `video-sem-token`.

Para gravar outras rotas: `--rotas /patios/painel,/finance`.

### Recompilar os vídeos

```bash
node docs/demo-fluxos/build.mjs          # ou --watch
```

O esbuild empacota React, lucide-react, o app real e os dados dentro de cada arquivo. Por isso
os `.html` abrem por `file://`.

### Verificar

```bash
MSYS_NO_PATHCONV=1 node .tmp-demo/ver-fluxo.mjs fluxo-2-checklist
```

Abre no Edge de verdade, percorre os capítulos, salva um quadro de cada em
`.tmp-demo/quadros/` e **sai com código 1 se houver qualquer erro de console**.

Para conferir só o espelho:

```bash
MSYS_NO_PATHCONV=1 node .tmp-demo/ver-espelho.mjs "/patios/painel"
```

Falha se alguma tela pedir endereço que o snapshot não tem — é esse guard que impede o vídeo de
mostrar tela vazia sem ninguém perceber.

---

## Arquivos

```
index.html                 hub — a porta de entrada
fluxo-N-*.html             um por fluxo
espelho.html               o console web real (carregado em iframe pelos fluxos)
dados-reais.json           números medidos no banco
snapshot-api.json          respostas gravadas do sistema em operação
fundamentacao/F*.json      o que o produto faz e o que não faz, por fluxo
build.mjs                  compilação (esbuild)
assets/film.css            todo o estilo da sala de projeção
assets/vistoria/           24 imagens de veículo usadas nas vistorias
src/engine.jsx             relógio, interpolação, posições de câmera
src/kit.jsx                peças do aparelho e o feixe entre as superfícies
src/player.jsx             a moldura: palco, transporte, capítulos, cartelas
src/espelho.jsx            monta frontend/src/App.tsx
src/interceptar.js         troca o fetch pelo snapshot (roda antes de tudo)
src/comum.jsx              dados, menu, usuários
src/fluxoN.jsx             os roteiros
```

### Armadilhas já resolvidas (não reintroduzir)

- **Duas cópias de React.** Sem os apelidos de `react`, `react-dom` e `react-router-dom` em
  `build.mjs`, o esbuild resolve React duas vezes e o segundo nasce com o dispatcher nulo:
  *"Cannot read properties of null (reading 'useRef')"*.
- **Viewport do iframe.** O app renderiza em 1440×860 e a moldura o encolhe. Renderizar direto
  a 1180×700 faz os painéis da página se atropelarem — não é assim que o produto aparece.
- **O papel de quem grava.** Com `gestor.demo@example.com` o editor de checklist nasce em modo
  somente leitura e o botão Publicar não aparece. O padrão é `admin.demo@example.com`.
- **`comando | tail` devolve o código do `tail`.** Para conferir sucesso, redirecione para
  arquivo e leia o arquivo.
