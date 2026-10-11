# B-AGENTE-API-2 — Relatório do desenvolvimento

> **Papel:** DEV do bloco, identidade NOVA `dev-agapi2-codex`; não planejo nem julgo o plano.
> **Modelo:** Codex em **GPT-5.6 Sol** (`gpt-5.6-sol`), **nível menor**, conforme o contrato.
> **Worktree:** `C:/Users/AMP/w-agapi2`; ramo `chore/agente-api-2`.
> **Proibições:** nenhuma chamada à API da Anthropic; `ERP_AGENTE_ANTHROPIC_KEY` não lida nem impressa; despachante sempre com dublês; sem commit/push; Python global não recebe pacotes.
> **Gravação:** incremental.

## Estado

| Item | Estado |
|---|---|
| Fontes de verdade e histórico citado | LIDOS |
| B0 terreno | FEITO |
| B1 venv/dependências | FEITO |
| H1/H2 | FEITO — ambas verdadeiras |
| Implementação e testes | FEITO; bateria final em curso |
| 28 mutações | FEITO — 28/28 vermelhas e restauradas por SHA-256 |
| Bateria final | PENDENTE |

## Log incremental — comando → saída → veredito

### B0 — terreno (2026-10-11 13:37:58Z)

- `git rev-parse HEAD` → `d0a52d1c736391a94c5d7bd28b9ee61678e87818`.
- `git branch --show-current` → `chore/agente-api-2`.
- `git status --short --branch` → `## chore/agente-api-2...origin/chore/agente-api-2`; árvore limpa.
- `git diff --name-only origin/main...HEAD` → somente `docs/revisoes/GOV/B-AGENTE-API-2-brief.md` e `docs/revisoes/GOV/B-AGENTE-API-2-plano.md`.
- A premissa de partida do plano registra outro SHA histórico; no terreno entregue pelo orquestrador o brief e o plano já estão versionados no `d0a52d1c`. A regra do plano para premissa falsa é medir e seguir; nenhuma alteração de desenho decorre disso.
- `rg` não está instalado nesta máquina; buscas locais usam `Get-ChildItem`/`Select-String`.
- Lidos integralmente, na ordem pedida: brief, plano, toda a pasta atual `scripts/agente-claude-api/` e os documentos anteriores citados (`B-AGENTE-API-{brief,plano,dev,revisao,ajustes,gramatica,gramatica-revisao}.md`). Também foram lidos `CLAUDE.md` e `PROJECT_MEMORY.md` antes do bloco.

### B1 — venv próprio e dependências

- `python -m venv scripts/agente-claude-api/.venv` → prefixo `C:\Users\AMP\w-agapi2\scripts\agente-claude-api\.venv`.
- `.venv/Scripts/python.exe -m pip install -r requirements.txt` → concluído no venv próprio; nada instalado no Python global.
- `.venv/Scripts/python.exe -m pip freeze` → 15 pacotes:

```text
annotated-types==0.8.0
anthropic==1.13.0
anyio==4.15.1
docstring_parser==0.18.0
h11==0.16.0
httpcore2==2.13.1
httpx2==2.13.1
idna==3.20
jiter==0.17.0
pydantic==2.14.0
pydantic_core==2.50.0
sniffio==1.3.1
truststore==0.10.4
typing-inspection==0.4.4
typing_extensions==4.16.0
```

### H1/H2 — hipóteses de terreno

- H1, lock de byte em processos distintos: processo filho adquiriu `TravaArquivo`; o pai mediu
  `ocupada_enquanto_vivo=sim`; matou o filho e adquiriu o mesmo lock, medindo
  `liberada_apos_morte=sim`. Logo `msvcrt.locking` atende e a morte libera o slot do SO.
- H2, repositório Git temporário real: snapshot de bytes + `status --porcelain=v2`; comando
  `git apply --check --whitespace=error-all p.patch` → `codigo=0` e
  `worktree_inalterado=true`. A premissa é verdadeira; nenhuma adaptação do plano foi necessária.

### Implementação

- Novos módulos: `contexto.py`, `entregas.py`, `patches.py`, `travas.py`, `uso_diario.py` e
  `despachante.py`; modelo literal em `pacotes/MODELO.md`.
- Integração: contexto obrigatório em execução intelectual, hashes sem conteúdo cru, teto efetivo
  mínimo, nomes com UUID128, saída canônica, três slots, reserva diária antes do cliente, terminais
  estritos `entregar_redacao`/`entregar_patch`, novos comandos e artefatos confinados.
- Testes novos: 191 métodos enumerados (35 contexto + 30 entregas + 33 patches + 37 uso diário +
  26 paralelismo + 30 despachante). Linha de base 180 → total **371**.
- Primeira suíte integrada: `.venv/Scripts/python.exe -B -m unittest discover -s tests -t .` →
  `Ran 371 tests in 11.383s` · `OK`.

## Cercas × testes × mutações

| Cerca | Teste | Mutação | Vermelho medido |
|---|---|---|---|
| Contexto/SHA | `test_contexto_sha_divergente_recusa_antes_do_modelo` | C1: comparação do SHA → `False` | VERMELHO |
| Contexto como dado | `test_contexto_vai_na_mensagem_nao_no_system` | C2: conteúdo concatenado ao system | VERMELHO |
| Contexto sem cru em auditoria | `test_contexto_cru_nao_vaza_em_artefatos_do_script` | C3: metadados → conteúdo cru | VERMELHO |
| Tipo de redação | `test_validar_tipo_divergente_recusado` | R1: comparação de tipos retirada | VERMELHO |
| Destino da redação | `test_redigir_nao_escreve_no_repo` | R2: destino fora da saída | VERMELHO |
| Fontes conferidas | `test_redigir_fonte_inventada_nao_e_conferida` | R3: toda fonte `True` | VERMELHO |
| Redação de segredo | `test_redigir_segredo_e_nul_redigidos_ou_recusados` | R4: Markdown cru | VERMELHO |
| Patch só check | `test_patch_check_nao_muda_worktree_indice_nem_status` | P1: remove `--check` | VERMELHO |
| Check precisa passar | `test_patch_sha_divergente_ou_check_vermelho_nao_publica_patch` | P2: ignora exit do check | VERMELHO |
| Todo caminho | `test_segundo_arquivo_tambem_e_validado` | P3: só primeiro arquivo validado | VERMELHO |
| Patch textual | `test_patch_formas_nao_textuais_recusadas` | P4: aceita `GIT binary patch` | VERMELHO |
| Base verdadeira | `test_patch_sha_divergente_ou_check_vermelho_nao_publica_patch` | P5: confia no `base_sha` | VERMELHO |
| Limite diário inclusivo | `test_teto_diario_decimal_limites_e_env` | U1: `>` → `>=` | VERMELHO |
| Estado ambíguo fecha | `test_uso_diario_soma_resumos_e_falha_fechado` | U2: ignora JSON inválido | VERMELHO |
| Reserva atômica | `test_duas_execucoes_paralelas_nao_furam_teto_n50` | U3: lock retirado | VERMELHO |
| Erro conserva reserva | `test_falha_nao_conclui_reserva` | U4: conclui em todo `finally` | VERMELHO |
| Portão antes do cliente | `test_cliente_so_depois_da_reserva_e_simulacao_nao_reserva` | U5: cliente antes da reserva | VERMELHO |
| Três slots | `test_quarto_processo_nao_entra_com_tres_slots_ocupados` | L1: quatro slots | VERMELHO |
| ID de saída UUID | `test_nomes_do_produto_unicos_com_relogio_congelado` | L2: remove UUID da saída | VERMELHO |
| Lock de SO | `test_lock_exclusivo_00` | L3: `msvcrt.locking` retirado | VERMELHO |
| Worktree único | `test_nomes_do_produto_unicos_com_relogio_congelado` | L4: worktree constante | VERMELHO |
| Schema fechado da fila | `test_fila_invalida_07` | D1: aceita chave extra | VERMELHO |
| Codex máximo 1 | `test_scheduler_limites_e_ordem_com_runners_falsos` | D2: pool Codex 2 | VERMELHO |
| Tag única | `test_codex_tag_unica` | D3: tag = ID puro | VERMELHO |
| Sem retry de limite | `test_limite_codex_uma_chamada_e_estado_aguardando` | D4: relança uma vez | VERMELHO |
| Duas frases do limite | `test_classificador_03` | D5: casa só `try again at` | VERMELHO |
| Despachante sem Git | `test_despachante_zero_git_e_codex_sequencial` | D6: insere `git status` | VERMELHO |
| Argv/modelo fixos | `test_despachante_argv_fixo_shell_false_sol` | D7: modelo vindo da fila | VERMELHO |

### B7 — rodada de mutação

- Arnês efêmero fora do repositório: controle do teste nominal verde; troca textual com âncora
  exatamente uma vez; execução com `.venv/Scripts/python.exe -B`; restauração dos bytes em
  `finally`; SHA-256 antes/depois obrigatório.
- Primeira passada: 25/28 vermelhas. R1 e U4 expuseram testes que ainda conferiam uma forma mais
  ampla que a propriedade; U5 tinha âncora multilinha incompatível com o EOL do disco. Os testes
  foram estreitados para a propriedade e a âncora virou uma linha, sem mudar o produto.
- Reexecução dos três: R1, U4 e U5 vermelhas. Consolidado: **28/28 vermelhas; 28/28 restauradas;
  nenhum SHA-256 divergente**.

## Não executado

- Ensaio manual contra a API real: reservado ao ORQUESTRADOR pelo plano e proibido ao DEV.
