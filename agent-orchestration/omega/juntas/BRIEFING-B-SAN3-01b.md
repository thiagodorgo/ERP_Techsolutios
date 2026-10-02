# BRIEFING — junta 1 do B-SAN3-01b (PR #402): a web guarda por alcance e o estado da página

> Escrito pelo orquestrador em 2026-10-02, depois do parecer `BLOQUEADO` do inspetor de terreno
> (`votos/B-SAN3-01b/00-inspetor-terreno.md`). Nada aqui é fato herdado: cada cadeira mede de novo.
> O plano do bloco é `docs/revisoes/SAN3/B-SAN3-01b-plano.md`; a junta é a da sua seção 10.

## Objeto

- **O head do PR #402**, resolvido pela própria cadeira por `git` e por `gh pr view 402 --json headRefOid`, com os
  check-runs concluídos. Nunca um SHA digitado.
- **O código do bloco é o de `b02745b7`** (o fechamento do dev de nuvem). Os commits depois dele são só registro da
  junta: mandatos, o parecer do inspetor, a queda (P6), o mandato e o corpo da cadeira nova, este briefing. A cadeira
  confere isso por `git diff --name-only b02745b7 <objeto>` (ressalva R1 do inspetor).
- **A cerca de cada mandato diz o head em que ele foi gerado**, que fica atrás do objeto porque o registro da junta
  continua entrando no ramo (o próprio mandato, os pareceres, as quedas). A norma da cerca vive no PR #393, ainda
  aberto, e não é norma da `main`: a cadeira resolve o objeto por conta própria, confere que o delta entre a cerca e
  o objeto é só registro, e não bloqueia por cerca diferente do objeto.
- **O inspetor liberou com ressalva na segunda passada** (`votos/B-SAN3-01b/00-inspetor-terreno-passada2.md`). A
  ressalva forte P2-R1 é do disparo da C2: o corpo dela não está no diretório de agentes da sessão, então ela roda
  como agente geral com o corpo do objeto, e a 1ª linha da evidência dela traz o md5 EOL-neutro desse corpo.

## Quórum e cadeiras

**Unanimidade de 3** (§C7.1-ter(b): o bloco toca permissão e protege contra perda de dado). Sem crítico, sem suplente
nomeado; queda relança a mesma identidade, que não herda conclusão; voto perdido nunca aprova.

| cadeira | identidade | itens (seção 10 do plano) |
|---|---|---|
| C1 | `guardiao-fail-closed` | as 9 mutações do §0.6 e o oráculo A3; o gerador do Apêndice A e os 12 controles contra G1 e G1b; a bateria do §8, o escopo A16 e o KPI do §9 |
| C2 | `jurado-san3-01b-c2-cadeia-de-acesso` (identidade nova, escrita pela `agente-fabrica`) | CE-G2 contra `RBAC_MATRIX.md`, a rota e os casos GB1 a GB3; a régua do gate igual à do backend e à do botão, e a nota N5; o vermelho-controle no head-base de GB1 e GB2 |
| C3 | `cognicao-visual` | o cabeçalho com e sem o botão contra a referência; a aparência dos estados idêntica entre head-base e head; a linguagem dos textos tocados |

**Por que a C2 é uma identidade nova:** o inspetor declarou o `coordenador-de-acessos` inelegível (item 3.1). Ele
achou o C2-05, o botão "Nova OS" sem gate, na junta do `B-SAN3-04a`, e este bloco fecha essa pendência. O plano
(seção 10) nomeia o remédio: identidade nova pela fábrica, com a mesma competência.

**Duas declarações da fábrica sobre o corpo novo (§A2, consignadas também na ata):**
- O frontmatter traz `model: opus`, que o mandato da fábrica não pediu. Precedente medido em `origin/main`: os seis
  jurados de identidade nova (`jurado-semteto-*`, `jurado-pausa-*`) têm `model: opus`.
- O método muda em relação ao `coordenador-de-acessos`, que valida com login real, subindo API e web. Este bloco não
  tem premissa de banco (plano §0.2 e §10), então o corpo mede o elo do backend pela forma que o plano usou: o catálogo
  `ROLE_PERMISSIONS` executado, mais a rota e o middleware lidos no blob do head. A competência herdada é a mesma; o
  instrumento é o do plano.

**Elegibilidade de C1 e C3, decidida pelo inspetor (ressalva R3):** as duas votaram o ciclo 1 do bloco-pai
`B-SAN3-01`, mas não acharam os defeitos do `01b`. O parentesco entre o C4-02 do `01` e o A-02 do `01b` é o mesmo
guard com defeito distinto. A ata consigna a elegibilidade como decidida.

**Inelegíveis, por nome:** `coordenador-de-acessos` (achou o C2-05); `jurado-san3-01c2-fail-closed-web` (achou A-01 a
A-03); `master-teste-telas-rotas` (achou o C2-N5); o `planejador-mestre` deste plano (instâncias 2, Opus, e 3, Fable);
o dev de nuvem `dev-b-san3-01b`; a instância da `agente-fabrica` que escreveu a C2; o inspetor; o orquestrador.

**Modelo:** o contrato fixa Fable só para gates e planejador. As cadeiras rodam em **Opus 5.5**, declarado no disparo
e na 1ª linha da evidência de cada uma (ressalva R5).

## Divergência declarada (§A2): o corpo da C2 no diff

O §6 do plano lista `.claude/**` e `.agents/**` como PROIBIDO **para o dev**, e o critério A16 confere o diff contra o
PERMITIDO. O corpo novo da C2 tem de estar versionado na ref julgada, nos dois espelhos (§C7.1-bis, item 3.3 do
inspetor; corpo só em disco não conta). Versioná-lo é ato de registro do orquestrador, não do dev, com precedente no
`B-SAN3-04a`, que versionou no próprio ramo os corpos da C4 do `01`.

Caminhos de registro que este PR carrega além do desenvolvimento: `.claude/agents/especialistas/jurado-san3-01b-c2-cadeia-de-acesso.md`,
o espelho em `.agents/agents/especialistas/`, `agent-orchestration/omega/juntas/votos/B-SAN3-01b/**` e este briefing.
A C1 julga o A16 sobre o diff do desenvolvimento e pode julgar esta declaração; a ata a registra de novo.

## Ressalvas do inspetor que a junta herda como contexto, não como fato

- **R2:** o plano nomeia o diretório da junta com prefixo `J-`; o que existe, e o que os mandatos usam, é
  `votos/B-SAN3-01b/`.
- **R4:** a C1 carrega medição pesada. O plano deixou a divisão em duas fatias a critério do orquestrador. Decisão: uma
  cadeira só, com evidência incremental a cada item (P1). Se ela cair, relança-se a mesma identidade, e o sucessor
  re-executa o que está gravado (P3).
- **R6:** há resíduo inerte de outras rodadas na árvore principal e worktrees antigos. Nada disso é alvo da cadeira:
  resíduo alheio se reporta, não se varre.
- **R7:** os worktrees `C:/Users/AMP/w-j01bc1`, `w-j01bc2` e `w-j01bc3` não existem. Cada cadeira cria o seu, detached
  no objeto, com `npm ci` próprio na raiz e no frontend. O `prisma generate` do check da raiz exige `DATABASE_URL` no
  ambiente do comando; use uma URL fictícia, nunca a 5432.
- **R8:** no head anterior o CI deu 14/14 verdes. O objeto novo precisa de check-runs concluídos; vermelho é insumo do
  voto.
- **R9:** o baseline do inspetor foi `npm ci --ignore-scripts` na raiz mais `prisma generate` com URL fictícia; a bateria
  do §8 das cadeiras não inclui o check da raiz.

## Pré-existentes nomeados pelo plano (seção 13) — não reprovam

O N2 (`N-S1ERR`: a página de criar OS engole a mensagem de recusa e os gates ficam verdes) e os demais itens da seção
13, cada um com dono proposto. Cobrar como defeito do bloco o que a seção 13 já nomeia é reprovar por construção. Achado
novo da mesma família é achado: a cadeira declara o escopo com evidência de data ou origem.

## Ambiente de quem mede

Nunca `export MSYS_NO_PATHCONV=1`; publique `env | grep -c '^MSYS_NO_PATHCONV='` = 0, `git --version`, `node -v` e
`uname -srm` antes de medir. Node 20 para paridade com a CI. A base viva (`erp-postgres` 5432, `erp-redis` 6379) nunca é
alvo. Worktree próprio em caminho curto, removido pelo nome depois de conferir que nenhum processo seu está vivo nele.
Nunca `tail -f`. Timeout em tudo o que executa artefato mutado. O checkout desta máquina é CRLF (`core.autocrlf=true`):
uma mutação por regex tem de provar que aplicou antes de a cor do teste valer.

## Regra de voto

Todo achado declara **`gravidade`** (`bloqueia` | `ajuste` | `nota`) e **`escopo`** (`dentro-do-bloco` |
`pre-existente`, este com evidência de data ou origem, sem a qual conta como `dentro-do-bloco`). **"Não consigo
medir" = REPROVADO.** Nenhuma cadeira propõe correção (§C7.4-bis). As três votam juntas, sem ler o voto umas das
outras. Evidência incremental em `votos/B-SAN3-01b/C<n>-evidencia.md` e voto em `votos/B-SAN3-01b/C<n>-voto.json`,
nascido como esqueleto `EM APURAÇÃO` e gravado item a item (P1, P2). Sob PAUSA, grava `## PAUSA <hora UTC>` e para
(P7).
