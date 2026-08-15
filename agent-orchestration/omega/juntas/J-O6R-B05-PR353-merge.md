# J-O6R-B05-PR353 — junta do PR #353 (B-O6R-05 `fix/production-runtime-gates`)

- **Data:** 2026-08-15 · **PR:** #353 · **CI:** 7/7 verde · **Estado:** MERGEABLE/CLEAN
- **Composição (3, §C7.1):** `agente-secops` (veto em config de produção) · `agente-ci-doutor` (veto vigente na
  trilha) · `agente-dba-guardiao`
- **Resultado: APROVADO COM RESSALVA, 3×0.** Nenhum veto exercido. Nenhuma ressalva bloqueia o merge; todas
  viraram pendência.

O bloco fecha os dois primeiros P0 da auditoria Ω6R: **DAT-001** (produção podia subir com o agregado core-saas
em memória) e **DIN-006** (o worker de jobs nunca subia).

---

## 1. As quatro ratificações

**(1) A resolução da C4 — worker incondicional. RATIFICADA pelas três cadeiras**, cada uma por um motivo
diferente, o que fortalece a decisão:

- `agente-secops`: a alternativa recusada seria *"uma chave versionada cujo único efeito é desligar um gate de
  produção, satisfazível por declaração e sem prova no boot"* — e **gate com interruptor documentado é pior que
  gate nenhum**, porque produz registro de conformidade falso.
- `agente-ci-doutor`: é a única testável. Neutralizar o gate do worker **mata 5 testes**; a alternativa teria um
  ramo que **nenhum teste poderia exercitar no boot**, porque o processo que o tornaria verificável não existe —
  verde que não exercita nada, exatamente o que a cadeira vetou.
- `agente-dba-guardiao`: com a exigência incondicional, **nada neste bloco lê estado de um store para decidir
  saúde**. O ramo alternativo exigiria ler a chave do sinal de vida, e um segundo processo escrevendo a mesma
  chave produziria veredito de saúde **de outro processo** — split-brain de leitura sobre um dado sem dono.

**(2) O corpo mínimo do endpoint de saúde do worker. RATIFICADO** — seis campos, idênticos nos quatro estados.
Verificado por execução contra o app real: nenhum identificador de instância, versão, commit, host, chave de
fila ou instante do último sinal. Headers forjados devolvem resposta **byte-idêntica**. O `ci-doutor` conferiu
a simetria que importa: **todo campo é consumido** por alguma probe e **nada consumido falta**. O `secops`
registrou a favor que a rota nova **nasceu menor que a vizinha** (`/health` e `/health/ready` expõem versão e
commit; esta não), que é a direção certa numa rota pública sem autenticação.

**(3) O custo do smoke de contêiner na CI. RATIFICADO — com correção do número.**
O valor de **3m57s que o orquestrador reportou é a duração do job inteiro, não o custo do smoke.** Medido pelo
`agente-ci-doutor` passo a passo contra três execuções da `main`:

| Passo novo | Custo |
|---|---|
| Preparação do runtime | 5s |
| Carga da imagem da API | 12s |
| Carga da imagem de migração | 13s |
| **O smoke em si** | **60s** |
| Passos de encerramento | ~3s |
| **Incremental atribuível** | **~1m33s** |

Os ~68s restantes vieram do build ter ido de ~55s para 2m05s por **cache frio no primeiro run do branch** — não
do smoke. **A ata registra 1m33s (smoke: 60s)**, e é este o número que vai ao history, não o 3m57s.
O `secops` avaliou a superfície e não o minuto: o passo roda em `pull_request` inclusive de fork, mas **não
amplia nada** — permissões do job intocadas, publicação de imagem segue condicionada a `push`, os builds novos
não publicam, e o smoke não consome secret. O `dba` pagaria mais: é o **único** ponto de toda a bateria onde
migração, boot real, reinício e releitura acontecem contra um Postgres de verdade numa configuração com forma
de produção — sem ele o DAT-001 estaria fechado por unidade e **aberto por integração**.

**(4) A ampliação do gate de Redis além do plano. RATIFICADA pelas três** — e as três a chamam de melhoria, não
de excesso. O §2.2 mandava recusar dois nomes, isto é, **blocklist de string: a classe de gate que se contorna
reescrevendo o mesmo endereço**. O entregue decide por **endereço**.
Verificação independente, com probes próprias contra o validador real: **41 casos / 0 divergências** (`secops`)
e **38 hosts** (`dba`), este último achando **14 notações de loopback que os testes do bloco não cobrem — todas
recusadas mesmo assim**. As fronteiras foram medidas exatas: o último endereço do bloco de loopback é recusado,
os vizinhos de fora são aceitos, e uma notação octal que apenas *parece* loopback (`0127.0.0.1`, que vale 87)
é **aceita** — prova de que o parser decide por valor, não por prefixo.
**E o comentário não superdeclara:** as quatro famílias que ele diz **não** cobrir foram medidas aceitas,
exatamente como declarado. Esta é a frente que já havia sido pega superdeclarando; agora declaração e execução
batem.

## 2. Os vetos da ata, conferidos por execução

**`agente-secops` — os quatro cumpridos.** Nomes-nunca-valores nos manifestos do provedor (executou a afirmação
dos cabeçalhos: sem as cinco variáveis, o schema reprova com exatamente cinco issues, uma por chave) · guard por
allowlist literal de chaves, **mais forte que o pedido** (reprova qualquer chave com valor fora dela, não só as
exigidas) · endpoint respondendo do processo com chave namespeada, com o identificador de instância indo **só**
para dentro do valor no Redis · probe do cron lendo o corpo, executada em 7 cenários — inclusive **estado
inesperado com HTTP 200 → falha**, que é a prova de que lê o corpo e não o status —, e sem imprimir a URL nem o
marcador plantado no host em nenhum deles.
**Mais a trava do §11 item 7, executada:** o smoke **recusa rodar** contra alvo com segredo real, sai antes de
subir qualquer coisa e **não imprime o valor rejeitado**. O destino é fixo no código; nenhuma variável o move.
Trava por construção, não por disciplina de quem chama.

**`agente-ci-doutor` — veto satisfeito, e da forma mais direta possível:** a cadeira **trouxe cada um dos dois
P0 de volta** ao contêiner de produção e **viu o smoke ficar vermelho**. É o que o veto pedia — *bloco de
correção não fecha com verde que não exercite o defeito*.

**`agente-dba-guardiao` — as correções absorvidas.** Reexecutou as suítes do domínio: gates + paridade
**91/91**, restart com a variável exportada **6/6**, sinal de vida **22/22**, todas com **zero pulos**. E
confirmou o que era o veto #1 do `ci-doutor`: as metades que exigem banco **rodam nos dois jobs sem pular**.

## 3. Escopo e travas — conferidos, não presumidos

**Nenhum ambiente foi ativado.** Os workflows de deploy **não aparecem no diff**; as travas de ativação e a
configuração de escala das máquinas seguem intocadas. **O bloqueio de deploy produtivo da J-6R permanece
integral** — este bloco torna o deploy *possível de ser correto quando for autorizado*, e não o autoriza.
**Zero dependência nova:** 13 de produção e 8 de desenvolvimento na `main`, o mesmo no HEAD; `package.json`
mudou **uma linha**. `prisma/**` intocado. §2.8 limpo por varredura programática das linhas adicionadas.

## 4. As ressalvas (todas viraram pendência; nenhuma bloqueia)

| Cadeira | Ressalva | Pendência |
|---|---|---|
| `secops` | O compose de produção **não subia** na `main` (era acidentalmente fail-closed). Este bloco o faz subir, com cinco segredos legíveis por quem clonar. A classe não é nova e há freios naturais, mas nada impede copiar o arquivo para um host real e rodar com segredo público — o que é forja de token de plataforma. | registrada abaixo |
| `ci-doutor` | O custo do smoke é **1m33s**, não 3m57s — corrigido no §1(3). | (correção de registro) |
| `dba` | **Assimetria invertida:** o bloco nasceu para fechar "banco blindado, Redis aberto" e entregou o inverso — o Redis ganhou forma **e** endereço, o banco só presença. Não é superdeclaração (o plano especificou assim), mas fecha pelo caminho errado. | `P-O6R-B05-DATABASE-URL-SEM-FORMA-NEM-HOST` |

**Condição da ressalva do `dba`, cumprida antes do merge:** o comentário do campo da URL do banco em
`src/config/env.ts` foi reescrito para **declarar o que ele não faz**. A frase anterior prometia mais rigor do
que as linhas seguintes entregavam — a classe exata que reprovou blocos quatro vezes nesta rodada.

Também registrado: `P-REDIS-DEV-LIXO-DE-FILA` (42.393 chaves de payload de fila antigas na máquina do dono;
faxina **escopada**, nunca por curinga solto — já houve incidente de delete em massa nesta rodada).

## 5. O que a junta NÃO decidiu

- **Não liberou deploy.** O bloqueio da J-6R segue integral; 13 dos 15 P0 continuam abertos.
- **Não tocou a configuração de escala do staging** — é custo do dono, decidido por ele em separado e entregue
  em PR próprio, deliberadamente fora deste.
- **Não reclassificou nenhum achado** da auditoria.
