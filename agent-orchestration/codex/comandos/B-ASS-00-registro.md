# B-ASS-00 — registro da trilha de assinatura, franquia, pagamento e nota

> **Autor:** `dev-ass00-sol` · Codex GPT-5.6 Sol · nível menor declarado · esforço medium.
> **Plano:** Claude Fable 5.1, `planejador-assinatura`, com correções de 31/10 e 02/11.
> **Verificador:** Claude independente que não escreveu esta entrega.
> **Base F0:** `origin/main@c6195c1256e2e34277a0225accbf106fcd5aeeb2`; avanço integrado sem conflito por `git merge origin/main`: `18e54804882204e70e5b9a1a3905f9a76236027b` (#493).

## 1. Objetivo

Registrar, sem código, somente as lacunas do pacote B-ASS ainda ausentes na `origin/main`: decisão consolidada, pendências com dono, PD técnica pública, itens 57–62 do portão e a rastreabilidade deste bloco.

## 2. Fontes

- Plano externo `B-ASSINATURA-plano.md`: §§2.5, 4.0, 7, 8, 9 e 12, lido integralmente.
- `REGISTRO-PENDENTE.md`, lido integralmente, com as falas literais de 30/10, 31/10 e 02/11.
- `revisoes/porteiro-488-parecer.md`: `LIBERADO COM RESSALVA` para o B-ASS-00.
- `origin/main`: PRs #485, #489 e #495 já incorporados; o ramo `docs/registro-0311` não tem PR aberto e aponta para a `main`.

## 3. Escopo permitido

- `agent-orchestration/controle/decisoes.md`
- `agent-orchestration/controle/pendencias.md`
- `agent-orchestration/controle/pendencias-indice.md` — somente saída do gerador oficial
- `docs/omega-pd.md`
- `docs/revisoes/SAN3/PLANO_SAN3.md`
- `agent-orchestration/codex/comandos/B-ASS-00-registro.md`

## 4. Escopo proibido

`src/**`, `frontend/**`, `prisma/**`, `tests/**`, `Kpis/**`, `CLAUDE.md`, `AGENTS.md`, lockfiles e a cópia do plano externo.

## 5. Requisitos

- **R-REG-1:** toda decisão nova cita fala literal e separa `LEITURA`. Critério: `grep -n "LEITURA"` encontra a marca na entrada nova.
- **R-REG-2:** os seis itens 57–62 têm bloco dono e critério numérico. Critério: exatamente 6 linhas numeradas, sem colisão com a `origin/main` medida na F0.
- **R-REG-3:** nenhuma pendência nova fica sem dono. Critério: `python agent-orchestration/controle/gerar-indice-pendencias.py` termina sem aviso e o índice regenerado é idêntico numa segunda execução.
- **R-PUBLICO:** nenhum preço, valor de franquia, cálculo ou percentual comercial, nome de cliente ou estratégia comercial é versionado. A marca usada é `(valores fora do repositório público)`.

## 6. Fatias e validação

1. F0: medir `origin/main`, os PRs já incorporados e a numeração do portão.
2. F1: apensar somente a decisão e a PD ausentes.
3. F2: criar pendências com dono, itens 57–62 e Frente 5; regenerar o índice.
4. F3: validar `git diff --check`, LF, índice, marcas `LEITURA` e escopo do diff.

Sem `npm ci`, Docker, testes de produto ou atualização de KPI. Revisão simples; não fazer merge nesta etapa.

## 7. Conteúdo deliberadamente omitido do repositório público

- preços ou faixas de preço de provedores;
- valores de planos, franquias e excedentes;
- cálculo ou percentual comercial;
- projeções econômicas, nomes de clientes e estratégia comercial;
- cópia do plano externo e da pesquisa externa.
