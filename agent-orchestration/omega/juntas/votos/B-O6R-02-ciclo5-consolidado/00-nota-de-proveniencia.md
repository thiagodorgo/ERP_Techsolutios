# Pareceres do PR #378 (registro consolidado do B-O6R-02 ciclo 5) — nota de proveniência

**Por que este diretório existe.** O PR #378 fechou 10 dívidas de registro, entre elas a **R1**: dois
pareceres de porteiro que existiam **só em disco**, com 0 refs em `git log --all`
(`D-DURABILIDADE-BRANCHES-LOCAIS`). Ao ser julgado, o próprio #378 produziu **quatro** pareceres novos
que também não existiam no repositório — a mesma classe, no PR que a pagou. Achado **A2** do
`porteiro-pos-merge` de `ed0a692`. Este diretório é o conserto.

**O que há aqui, e o que cada coisa é:**

| arquivo | quem produziu | quando | veredito |
|---|---|---|---|
| `01-cadeira-independente-passada1.md` | cadeira independente (papel `porteiro-pos-merge`), pré-merge | 2026-09-05 | LIBERADO COM RESSALVA (R1–R4 + 4 ressalvas) |
| `02-cadeira-independente-passada2.md` | idem, sobre o delta `4db8b64 → e3dd810` | 2026-09-05 | LIBERADO COM RESSALVA (5 over-claims) |
| `03-cadeira-independente-passada3.md` | idem, sobre o delta `e3dd810 → c98f615` | 2026-09-06 | **LIBERADO** |
| `04-porteiro-pos-merge-ed0a692.md` | `porteiro-pos-merge`, identidade nova, pós-merge | 2026-09-06 | LIBERADO COM RESSALVA → start do `B-O6R-07b` |

**Fidelidade, dita sem suavizar.** Os quatro corpos abaixo são o **texto devolvido por cada agente**,
persistido por quem orquestrou a sessão (o autor do PR #378) — **não** foram escritos em arquivo pelos
próprios agentes. Não houve reescrita de conteúdo, mas a transcrição é do orquestrador, e quem lê deve
saber disso: não é a mesma coisa que um parecer que o próprio autor gravou. A alternativa — deixá-los
sem existir — é o defeito que este diretório corrige.

**O que estes pareceres acharam, em uma linha:** seis over-claims do autor do #378, todos corrigidos no
próprio PR antes do merge; **três deles da mesma classe** — datar texto da `main` por commit que só
existe dentro de uma branch squashada —, e a terceira ocorrência aconteceu **no commit que escreveu a
regra contra ela**. É a evidência mais direta que esta rodada produziu de que o §C7.4-bis não é
formalidade: regra escrita não impediu a repetição; medição de terceiro impediu.
