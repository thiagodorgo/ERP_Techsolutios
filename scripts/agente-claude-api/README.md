# Agente Claude API — revisor e investigador só-leitura, com cerca

Programa Python que usa a API do Claude (SDK oficial `anthropic`, versão fixada) para **ler** o
repositório e devolver um **parecer**. Ele tem duas tarefas:

- `revisar-pr <N>` — revisa um PR: lê o diff e as regras do contrato, explora o código e entrega um parecer;
- `investigar "<pergunta>"` — responde a uma pergunta sobre o código, com a evidência.

Ele **não** conserta, **não** commita, **não** faz push, **não** mergeia e **não** comenta em PR. Quem
lê o parecer e age é o orquestrador. Decisão do dono: `D-AGENTE-CLAUDE-API` em
`agent-orchestration/controle/decisoes.md`; plano: `docs/revisoes/GOV/B-AGENTE-API-plano.md`.

## Por que ele é seguro de rodar ("mais autonomia, não muita")

O agente decide sozinho **o que ler e o que verificar**, mas tudo passa por uma cerca imposta pelo
**código**, nunca pelo modelo:

1. **Worktree descartável.** O próprio script cria `git worktree add --detach` no commit alvo, fora do
   repositório, e o remove no fim (`git worktree remove --force`). Nunca opera no checkout principal
   nem em worktree de outro bloco.
2. **Raiz confinada.** Todo caminho é resolvido com `realpath` (segue junction, symlink e nome 8.3) e
   tem de ficar dentro do worktree. UNC, `\\?\`, `\\.\`, ADS (`a.ts:x`), outra unidade, absoluto e `..`
   são recusados. `.env*`, `*.pem`, `*.key`, `id_*`, `.git/` e `node_modules/` são negados — e o
   conteúdo negado **nunca é aberto**.
3. **Sem shell.** Não existe ferramenta "rodar comando". Cada ferramenta monta o argv ela mesma
   (`shell=False`), com flags só da lista permitida, timeout e saída truncada.
4. **Nada do commit alvo é executado por padrão.** As verificações que rodam código do commit
   revisado (`espelho_codex`, `teste`) e o `npm ci` só rodam com a flag explícita
   `--permitir-execucao-do-alvo` — e essa flag tem custo de segurança real (seção própria abaixo).
   Sem ela, o agente só lê e roda `git`/`gh` de leitura.
5. **Ambiente limpo.** Os processos filhos recebem só uma lista fechada de variáveis (sem chave,
   sem `DATABASE_URL`, sem `REDIS_URL`, sem token). Isso tira o segredo do **ambiente** do filho; não
   impede um código executado de buscá-lo em outro lugar (ver a seção da flag).
6. **Orçamento.** Tetos de turnos, chamadas, tokens (com cache) e US$. Antes de **cada** chamada ao
   modelo, o script prevê o pior caso dela (o histórico inteiro, os resultados pendentes e a saída
   máxima) e **não faz** a chamada que poderia passar do teto: o custo final medido nunca passa do
   `--max-custo-usd`. Por turno, no máximo 12 ferramentas executam e 384 KB de resultado voltam ao
   modelo (o resto volta como "peça de novo no próximo turno"). Ao estourar, para e grava um parecer
   **parcial**.
7. **Segredos redigidos** em tudo o que sai (resultado de ferramenta, auditoria, parecer, erro).
8. **Auditoria.** Um JSONL por execução, gravado a cada evento.
9. **Parada.** Um arquivo `STOP` na pasta da execução, ou Ctrl+C, encerra e grava o parcial.
10. **Injeção.** O que vem do repositório, do PR ou de um comando é **dado**, nunca instrução — e a
    cerca não depende de o modelo obedecer.

## Instalação (uma vez)

```
cd scripts/agente-claude-api
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
```

O `.venv/` é ignorado pelo git (`.gitignore` local). Nada vai para o Python global. Se o Python da
Microsoft Store não criar o venv, use `C:\Users\<você>\AppData\Local\Programs\Python\Python313\python.exe -m venv .venv`.
Exige **Python 3.11 ou mais novo**: a redação de JWT usa grupo atômico e quantificador possessivo do
módulo `re`, que só existem a partir do 3.11 (medido e testado no 3.13).

## A chave e o workspace (antes do primeiro uso real)

A chave vem **só** de `ERP_AGENTE_ANTHROPIC_KEY` — nunca de `ANTHROPIC_API_KEY`. Com o nome padrão
no ambiente do usuário, o próprio Claude Code passaria a usar essa chave e cobraria os créditos da
API no lugar do plano Max.

Grave no ambiente do **usuário** do Windows (nunca no repositório, nunca num `.env`). A chave **não**
pode ir na linha de comando: um `setx ERP_AGENTE_ANTHROPIC_KEY "<chave>"` fica gravado em texto claro no
histórico do terminal (o PSReadLine do PowerShell e o `.bash_history` guardam o que você digita). No
PowerShell, peça a chave sem eco e grave direto no ambiente do usuário:

```powershell
$s = Read-Host -AsSecureString "Chave da API (não aparece na tela)"
$b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
try {
    [Environment]::SetEnvironmentVariable("ERP_AGENTE_ANTHROPIC_KEY",
        [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b), "User")
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b)
}
Remove-Variable s, b
```

O que você digita no `Read-Host` não entra no histórico; o histórico guarda só os comandos acima, sem a
chave. O ID do workspace **não** é segredo e pode ir na linha de comando:

```powershell
[Environment]::SetEnvironmentVariable("ERP_AGENTE_ANTHROPIC_WORKSPACE", "<id do workspace, ex.: wrkspc_...>", "User")
```

Depois, abra uma janela de terminal **nova** (as variáveis do usuário só valem para processos novos).

- Chave **de usuário** (`sk-ant-usr…`) exige o ID do workspace: a API responde 400 "not scoped to a
  workspace" sem o cabeçalho `anthropic-workspace-id`. Sem o ID, o script **para antes de qualquer
  chamada**, com mensagem clara. Chave de workspace dispensa o ID.
- Se a variável foi gravada depois de a sessão abrir, o script a lê de `HKCU\Environment` e a passa
  explicitamente ao cliente. Ele nunca a imprime nem a grava.
- O script remove do próprio processo **toda** variável `ANTHROPIC_*` (inclusive
  `ANTHROPIC_CUSTOM_HEADERS`, que trocaria a chave) e recusa `ANTHROPIC_BASE_URL` diferente de
  `https://api.anthropic.com`.

Prova de conta, **uma vez**, depois de gravar as duas variáveis (faz 1 chamada mínima, `max_tokens=0`):

```
.venv/Scripts/python -m agente_claude verificar-conta
```

Ela imprime `request_id`, o modelo que respondeu, o `usage`, os cabeçalhos de rate limit, a origem
e o tipo da chave e se o cabeçalho de workspace foi enviado — nunca a chave.

## Uso

```
.venv/Scripts/python -m agente_claude revisar-pr 416
.venv/Scripts/python -m agente_claude investigar "Onde o backend resolve o tenant em /api/v1/work-orders?"
.venv/Scripts/python -m agente_claude investigar "..." --sha <40 hex>
.venv/Scripts/python -m agente_claude versao
```

Rode de dentro de qualquer checkout/worktree do repositório: o repositório é o
`git rev-parse --show-toplevel` do diretório atual.

| Opção | Padrão | O que faz |
|---|---|---|
| `--esforco` | `medium` | `low`, `medium` ou `high` (vai em `output_config.effort`) |
| `--max-turnos` | 30 | teto de chamadas ao modelo (1..200) |
| `--max-ferramentas` | 60 | teto de chamadas de ferramenta (1..500) |
| `--max-tokens` | 1 500 000 | teto de tokens somados (entrada + cache + saída) |
| `--max-custo-usd` | 6.00 | teto de custo estimado |
| `--max-tokens-resposta` | 8000 | `max_tokens` de cada chamada (256..32000) |
| `--permitir-execucao-do-alvo` | **desligado** | deixa rodar código do commit alvo (`espelho_codex`, `teste`, `npm ci`). Leia a seção abaixo antes de ligar |
| `--npm-ci` | desligado | `npm ci` próprio no worktree (habilita `verificar teste`); **exige** `--permitir-execucao-do-alvo` |
| `--saida` | `saidas/<data>-<tarefa>-<alvo>/` | pasta da execução (tem de ser nova) |
| `--worktree-dir` | `%USERPROFILE%\w-ag-<data>` | onde nasce o worktree (≤ 60 caracteres, não existente) |
| `--timeout-comando` / `--timeout-verificacao` | 120 / 900 s | por execução de ferramenta |
| `--manter-worktree` | desligado | só depuração; o parecer diz o comando para removê-lo |
| `--simular` | desligado | modelo falso embutido: exercita tudo **sem** chamar a API |

O modelo é fixo, `claude-opus-5-5`, no **nível menor** pela decisão
`D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`, com o esforço declarado no parecer. A CLI não aceita
modelo, URL base nem chave por argumento.

**Custo de disco do `--npm-ci`:** medido em 2026-10-10, o worktree com `node_modules` ocupa
**≈ 488 MB** enquanto a execução dura (o plano estimou ≈ 446 MB de `node_modules` + 56 MB de checkout); é removido no fim. O script exige 3 GB livres com `--npm-ci`
e 2 GB sem.

**Verificações disponíveis** (lista fechada): `diff_check` (`git diff --check`, sempre), `espelho_codex`
(`node scripts/sync-agent-agents.mjs --check`, só com `--permitir-execucao-do-alvo`) e `teste`
(`node --test` de um arquivo de `tests/` sem `-db`, só com `--permitir-execucao-do-alvo` **e** `--npm-ci`).
Sem a flag, o agente recebe "não permitido nesta execução" e a auditoria registra a recusa.
`npm run check` **não** está disponível: num worktree novo ele exige `prisma generate`, que exige
`DATABASE_URL` (proibido no ambiente das verificações) — pendência `P-AGENTE-CHECK-SEM-GENERATE`.

## Rodar código do commit alvo (`--permitir-execucao-do-alvo`) — leia antes de ligar

`espelho_codex` roda o `scripts/sync-agent-agents.mjs` **do commit revisado**; `teste` roda os
`tests/*.test.ts` **do commit revisado**; `npm ci` roda os scripts de instalação do `package.json`
**do commit revisado** e das dependências dele. Isso é executar o código de quem escreveu o PR.

O que esse código alcança, sem eufemismo:

- Ele roda **como o seu usuário do Windows**, com os mesmos direitos que você tem.
- Ele alcança o **`HKCU`** — é ali, em `HKCU\Environment`, que mora a `ERP_AGENTE_ANTHROPIC_KEY`. O
  "ambiente limpo" tira a chave do ambiente do processo filho, mas não impede o filho de ler o registro
  (`reg query`, PowerShell, qualquer linguagem).
- Ele alcança o **keyring do `gh`** — o token do GitHub (escopos `repo` e `workflow`) sai com um
  `gh auth token`.
- Ele alcança o **disco fora do worktree**: lê e grava qualquer arquivo que o seu usuário lê e grava, e
  pode plantar arquivos no worktree (inclusive hard link, que o `ler_arquivo` recusa, mas que mostra
  que o worktree deixou de ser confiável depois da execução).
- Ele alcança a **rede**.

A cerca do agente (caminho, argv, orçamento, redação) vale contra o **modelo**, não contra esse código.
Por isso a flag vem **desligada**, e só se liga para um **SHA de autoria confiável** — um PR seu ou de
um agente seu, que você leu. Nunca para PR de terceiro, fork ou commit que você não conhece. O parecer
registra se a execução foi permitida (`execucao.permitir_execucao_alvo` e a linha "Execução de código do
commit alvo" no `.md`).

## O que sai

Na pasta da execução (ignorada pelo git):

- `parecer.json` — o parecer validado (`agente-claude-api.parecer@2026-10-10.v1`);
- `parecer.md` — o mesmo, legível. **Primeiro** vêm as seções geradas pelo script, cada uma marcada
  "(gerado pelo script)": Veredito, Execução, **Conta e cobrança**, Custo e Comandos executados (da
  auditoria). **Depois** vem a seção "Conteúdo do modelo", com Resumo, Achados e Limitações, e todo
  texto do modelo fica dentro de blocos de código com delimitador mais longo que qualquer sequência de
  crases do texto, para o modelo não conseguir forjar uma seção do script;
- `auditoria.jsonl` — uma linha por evento: cada chamada ao modelo (request-id, modelo que
  respondeu, tokens, custo acumulado, rate limit) e cada ferramenta (argv real, código, bytes,
  negada ou não);
- `resumo.json` — início e fim;
- `erro.txt` — só em erro, redigido.

No parecer, `custo`, `conta`, `modelo` e `comandos_executados` são preenchidos **pelo script** a partir
da auditoria; o que o modelo declarou vai em `comandos_declarados_pelo_modelo`. Cada achado traz
`evidencia.conferida`, que só é `true` quando o comando citado é uma chamada **executada** de verdade:
mesma ferramenta e mesmos argumentos (normalizados: campos nulos, falsos e vazios contam como
ausentes), na forma `<ferramenta> <JSON>` (`buscar {"padrao": "x", "caminhos": ["src"]}`) ou
`<ferramenta> chave=valor` (`buscar padrao=x`). Citar só o nome da ferramenta, um pedaço do argumento,
texto livre ou uma chamada que a cerca negou dá `false`. `false` não prova que o achado é falso; diz
que a evidência não foi conferida. O porquê vai ao lado, em `evidencia.motivo_conferencia`. A citação é
texto do modelo: antes de qualquer parse, ela é recusada se passar de 8000 caracteres ou de
profundidade 2 (argumento de ferramenta é sempre plano), e qualquer erro na conferência vira `false`
com o motivo — nunca derruba o parecer. A prova de cobrança na conta da API é o `request-id` + os
cabeçalhos de rate limit de cada resposta.

**Códigos de saída:** `0` parecer completo · `2` parcial (orçamento, STOP, Ctrl+C, recusa do modelo,
sem `entregar_parecer`) · `3` recusa prévia (chave ausente, usuário sem workspace, URL base estranha,
argumento inválido, disco curto, pasta já existente) · `4` erro de API · `5` erro interno, **inclusive**
quando a revisão terminou mas a montagem ou a gravação de um artefato falhou. Em 2, 4 e 5 o parecer,
a auditoria (com o evento `fim`) e o `resumo.json` sempre existem: cada etapa da gravação tem a sua rede.
Se a montagem falhar, grava-se um parecer de emergência (só campos do script, `parcial`) com o parecer do
modelo cru em `parecer_do_modelo_sem_montagem`. Toda falha fica em `parecer.json.falhas_de_gravacao` e no
`erro.txt`.

## Parar

- **STOP:** crie um arquivo `STOP` (vazio serve) na pasta da execução. O agente para antes da próxima
  chamada ao modelo ou da próxima ferramenta, grava o parcial e remove o worktree.
- **Ctrl+C:** termina o item em curso (o processo filho é morto com a árvore), grava o parcial e
  remove o worktree. Um **segundo** Ctrl+C durante a limpeza aborta só a limpeza; o parecer e a
  CLI dizem o comando exato para remover o worktree.

Worktree órfão (queda de energia, por exemplo):

```
git worktree list
git worktree remove --force C:\Users\<você>\w-ag-<data>
git worktree prune
```

Antes de remover, confira que nenhum processo usa o caminho. **Nunca** apague o diretório à mão
nem use junction de `node_modules`.

## O que a cerca NÃO cobre

| Fora da cerca | Dono / mitigação |
|---|---|
| **Tudo o que o código do commit alvo faz** quando `--permitir-execucao-do-alvo` está ligada (`espelho_codex`, `teste`, scripts do `npm ci`): ler `HKCU` (a chave), usar o keyring do `gh`, ler e gravar fora do worktree, usar a rede | quem liga a flag; ela vem desligada e só se liga para SHA de autoria confiável (seção própria acima) |
| CPU, memória e disco consumidos pelas verificações | orquestrador; checagem de espaço livre inicial |
| Escopo do token do `gh` (keyring): ele lê qualquer repositório privado do usuário | dono; o script fixa `-R` no `origin` e três subcomandos de leitura |
| Objetos gravados em `.git/objects` pelo `git fetch` e o registro em `.git/worktrees/` | `git worktree prune` no fim; `git gc` do `post-merge-cleanup.sh` |
| A qualidade do julgamento (o modelo pode errar ou perder achados) | orquestrador que lê o parecer |
| A chave na memória do processo e no registro do usuário | dono (rotação; gravar sem pôr a chave na linha de comando; nunca em máquina compartilhada) |
| Variáveis de proxy/TLS do cliente HTTP (`HTTPS_PROXY`, `SSL_CERT_FILE`…) lidas pelo SDK | dono do ambiente; o TLS com `api.anthropic.com` continua valendo |
| Dois processos do agente na mesma pasta de saída ou de worktree | o script recusa se a pasta existir (código 3) |
| Conteúdo de arquivo protegido (`.env*`, `*.pem`…) que esteja **rastreado** num commit ou no diff do PR: chega ao modelo por `git_diff`, `gh_pr_diff`, `git_show <rev>` (o patch do commit) e `buscar` sem caminho, só com a redação por padrão. A negação por nome vale para leitura de disco, para `git_show <rev>:<caminho>` e para os caminhos citados: `git_show <caminho>` (sem `:`) é recusado pelo git como revisão inválida, e os caminhos vão ao git como literais (`--literal-pathspecs`), então `cfg/*.env` não expande para `cfg/.env` | dono do repositório (nenhum segredo versionado) e o revisor do PR; um PR que versiona `.env` deve ser apontado pelo próprio agente |

## Testes

```
.venv/Scripts/python -m unittest discover -s tests -t . -v
python -m unittest discover -s tests -t .          # também no Python global, sem o SDK
```

A suíte é `unittest` da biblioteca padrão, **sem rede** (abrir socket falha), **sem o SDK** e **sem o
registro real** (a leitura de `HKCU` é bloqueada na suíte). Junction, symlink e nome 8.3 são criados de
verdade nos testes de caminho. Nenhum teste chama a API.
