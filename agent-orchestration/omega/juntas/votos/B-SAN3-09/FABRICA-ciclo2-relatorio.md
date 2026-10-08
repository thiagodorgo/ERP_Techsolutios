# B-SAN3-09 · ciclo 2 · junta 2 — relatório da `agente-fabrica`

- **Papel:** `agente-fabrica` (não vota, não acha, não planeja, não desenvolve). Escreveu os três corpos das cadeiras da junta 2.
- **Modelo da fábrica:** Claude Opus 5.5 (`claude-opus-5-5`).
- **Modelo das cadeiras — substituição declarada (§C7.6-bis):** as três cadeiras são **identidade nova** e rodam em **Claude
  Opus**. O bloco não toca dinheiro, e pela `D-FABLE-ASTRA-SO-DINHEIRO` (decisão do dono, 2026-10-08) o Fable só roda em papel
  de bloco de dinheiro. O frontmatter dos três corpos continua `model: fable`, como manda o §C7.6-bis: o fallback é do
  **invocador**, e quem lança declara o papel, o modelo que rodou e o motivo. Cada corpo manda a cadeira registrar isso na 1ª
  linha da evidência e no voto, e **parar** se estiver abaixo do Opus.
- **Fonte lida:** o disco de `C:/Users/AMP/w-nuv09`, ramo `feat/bootstrap-platform-admin`. O head é
  `054f7a7ea350ba80837bcecf370475df6a1795b4`, lido nos arquivos de ref `refs/heads/feat/bootstrap-platform-admin` e
  `refs/remotes/origin/feat/bootstrap-platform-admin` do repositório principal. Os dois valores são iguais.
- **Ressalva §A7:** a fábrica não tem `Bash` e não mediu nada por `git show`/`git ls-tree`. Toda linha citada abaixo e nos corpos
  é leitura de disco, marcada **[A RE-VERIFICAR]** nos corpos.
- **Moldes:**
  - `jurado-san3-01b-c2-cadeia-de-acesso.md`, lido em w-nuv09;
  - `jurado-san3-11-c2-registro-e-escopo.md`, lido no disco do checkout principal, porque **não existe** em w-nuv09: o ramo não
    integrou o #401.

## Arquivos escritos (LF, 0 CR conferido por busca)

| arquivo | cadeira |
|---|---|
| `.claude/agents/especialistas/jurado-san3-09c2-c1-entrada-e-registro.md` | C1 |
| `.claude/agents/especialistas/jurado-san3-09c2-c2-dryrun-e-concorrencia.md` | C2 |
| `.claude/agents/especialistas/jurado-san3-09c2-c3-guard-ast-e-escopo.md` | C3 |

- O espelho em `.agents/agents/especialistas/` **não** foi escrito. É do orquestrador: `node scripts/sync-agent-agents.mjs`, depois
  `--check`.
- O ignore global cobre `.claude/` e `.agents/`, então os corpos precisam de `git add -f` nos dois espelhos. Corpo só conta se
  estiver commitado no objeto que a junta julga.

## De onde veio cada item (plano `docs/revisoes/SAN3/B-SAN3-09-plano.md`, §15.4)

Comum às três cadeiras:
- quórum e teto: l.1854-1856;
- inelegíveis por nome: l.1857-1858;
- "Reprovação por construção": l.1866-1869, copiada **verbatim** em cada corpo.

Cada cadeira tem os três itens da sua linha na tabela, sem item a mais. As sub-medições detalham o que o próprio §15 manda
medir para aquele item.

| cadeira | item | linha do §15.4 | detalhe no §15 |
|---|---|---|---|
| C1 | (1) C3-F3: MF3-a…f, tabela gerada × `BOOTSTRAP_FLAGS`, T1.5c, T2.4b, `--dryrun` por processo real | l.1862 | §15.1.1 l.1582-1635 |
| C1 | (2) M-1, M-2, eco do token e `ps` com `-p <sentinela>` | l.1862 | §15.2 l.1799-1800 |
| C1 | (3) 5 instâncias do 3b-1, critério (i)/(ii) e mutação; 3b-2, 3a-1, C3-A1 × Runbook B e T1.8 | l.1862 | §15.1.5 l.1762-1793; §15.2 l.1801-1803; §15.5 l.1871-1880 |
| C2 | (1) A11: matriz MA1–MA5 × 5 estados, MT-1, processo filho `--dry-run` no limpo | l.1863 | §15.1.4 l.1699-1760 |
| C2 | (2) A18: T2.10 com N declarado, MA6 com frequência em N ≥ 5 | l.1863 | §15.1.4 l.1726-1732, 1748-1749, 1759 |
| C2 | (3) arnês: clone sem conexão pendurada, teardown com 0 resíduo (inclusive com falha forçada), ratchet, corpo byte-idêntico a `7812fe7c` | l.1863 | §15.1.4 l.1735-1738; §15.3 l.1812-1814, 1847-1848 |
| C3 | (1) C3-F1: MF1-a…g, diferencial `ts.preProcessFile`, fecho sem `env.ts` | l.1864 | §15.1.2 l.1637-1668; tabela l.1687-1697 |
| C3 | (2) C3-F2: matriz ramo × caso vermelho (MF2-a…f) | l.1864 | §15.1.3 l.1670-1697 |
| C3 | (3) ≥ 3 mutações novas (verificador e conjunto de flags) + escopo do dev por laço, `Kpis/**` | l.1864 | §15.3 l.1811-1827, 1847-1848; D-C2-1 l.1879 e l.1896-1898 |

Padrões que os corpos propõem e que o mandato pode trocar:

| cadeira | worktree | prefixo de container | evidência e voto |
|---|---|---|---|
| C1 | `C:/Users/AMP/w-j9c2c1` | `jurado-san3-09c2-c1-*` | `C1c2-evidencia.md` / `C1c2-voto.json` |
| C2 | `C:/Users/AMP/w-j9c2c2` | `jurado-san3-09c2-c2-*` | `C2c2-evidencia.md` / `C2c2-voto.json` |
| C3 | `C:/Users/AMP/w-j9c2c3` | não usa banco (container só se precisar, com o prefixo `jurado-san3-09c2-c3-*`) | `C3c2-evidencia.md` / `C3c2-voto.json` |

- Os arquivos de evidência e voto ficam em `votos/B-SAN3-09/`. Os nomes `C1-*`, `C2-*` e `C3-*` são do ciclo 1 e os corpos
  proíbem gravar neles.
- O parecer do inspetor da **junta 2** vai no arquivo que o mandato nomear. O `00-inspetor-terreno.md` é da junta 1 e os corpos
  dizem que ele **não** libera esta junta.

## Divergências que as cadeiras precisam saber

São leituras de disco: cada corpo manda medir, nunca herdar. A gravidade é de quem mede.

### Entre o plano e o relatório do dev

1. **`passwordReset=false` no dry-run com reset** (dono da medição: **C2**, item 1(f)).
   - O dev declarou a divergência (`DEV-ciclo2-relatorio.md` l.45-48). O T2.4 asserta
     `reset: [false, false, false, false, false]` (teste `-db` l.269-272).
   - Pelo `main()` do script (l.413), a CLI do dry-run com `--reset-password` diz "já existia (senha mantida)", enquanto a
     execução real redefine a senha.
   - O plano exigia "relatório coerente com o estado" (l.1742) e congelou o corpo neste ciclo (l.1812-1814).
   - O script **nasceu neste bloco**, então classificar o escopo exige evidência.
2. **MF1-b…g e MF2-a…f nunca rodaram como mutação externa** (dono: **C3**). O dev declarou isso em l.78, e a seção QUEDA
   (l.97-104) só acrescentou MF3-b…f e MF1-a.
3. **MF3-b** (dono: **C1**): o dev mediu também o T1.5c vermelho (l.35). O plano espera vermelho só nas linhas
   `constructor`/`toString`/`__proto__`/`hasOwnProperty` (l.1631). Possível mutação errada por precedência (`!a in B`). A C1
   prova o `diff` do mutante.
4. **MF3-c** (dono: **C1**): o plano espera o T1.5c vermelho (l.1632); o dev mediu só o T1.2b (l.36). No T1.5c (teste
   l.279-285) o sentinela fica na posição 2 e a recusa acontece na posição 1, então o caso talvez **não possa** acusar eco.
   Possível critério que não pode falhar.
5. **MF3-f** (dono: **C1**): o dev relatou TS2322 **e** TS2741 (l.39). O TS2741 pode vir do literal `flags` de `parseArgv`
   (script l.122-126), e não do tipo de exaustividade. A C1 atribui cada diagnóstico à sua linha.
6. **MA1 e MA2** (dono: **C2**): o dev relatou "arquivo T2 vermelho, 0/1 no nível do arquivo" (l.24-25), sem nomear o subteste.
   Pode ser vermelho de carga ou de colapso do arnês. A C2 prova que o mutante carrega antes de contar a morte.
7. **Restauro do dev** (donos: **C1** e **C2**): foi provado por md5 host × container (`19c50cf7…`, l.30), e não contra o blob
   (o plano pede md5 = blob, l.1752). Os corpos exigem a prova contra o blob.

### Entre o plano e o código lido no head

8. **Linhas do plano** (donos: **C1** e **C2**): as linhas que o plano cita para mutação são do objeto do ciclo 1, `7812fe7c`.

   | âncora | plano | head |
   |---|---|---|
   | MA1 | l.212 | l.231 |
   | MA2 | l.257 | l.276 |
   | MA3 | l.282 | l.301 |
   | MA4 | l.297 | l.316 |
   | MA5 | l.317 | l.336 |
   | lock (MA6) | l.190 | l.209 |
   | credencial (M-1) | l.294 | l.313 |
   | trava em `main()` (M-2) | l.368 | l.387 |

   A âncora `if (dryRun) {` ocorre **duas** vezes, então MA1 e MA2 exigem índice de ocorrência.
9. **Checagem de eco do T1.2b** (dono: **C1**): o teste (l.123) só checa eco em token de 3+ caracteres **que não seja substring de
   flag conhecida**. O plano dizia só "tokens de 3+ caracteres" (l.1617).
10. **Teste extra do §15.6** (dono: **C1**): o §15.6 (l.1884-1885) promete um teste que exige que toda flag dos comandos do
    Runbook B esteja em `BOOTSTRAP_FLAGS`. A fábrica não o achou em `tests/san3-09-*`.
11. **Critério (i)/(ii) do 3b-1 contra o remédio do próprio plano** (dono: **C1**).
    - O remédio (l.1783-1784) prescreve o texto "nem CI nem porteiro a fecham" (`pendencias.md` l.580). Essa frase casa `porteiro`, e
      o critério (i) (l.1789) não tem exceção para negação.
    - O remédio também manda **não** reescrever `log-execucao.md` l.4802 ("…porteiro pós-merge, confirmação de
      P-SAN-PROD-BOOTSTRAP"). Essa é uma linha `+` do PR e casa o (ii).
    - Lidos ao pé da letra, os dois critérios **não podem passar**. O corpo da C1 manda publicar o literal e a propriedade, e
      classificar o caso como achado contra a régua quando for o caso (§C7.4, pergunta (a)).
12. **`P-SAN3-09-ORG-PLATAFORMA-NO-CONSOLE`** (dono: **C1**, 3b-2).
    - A descrição já diz "como se fosse cliente" (`pendencias.md` l.592).
    - A linha de severidade (l.595) diz "o `platform_admin` não vê o próprio tenant no console", que é o sentido contrário.
    - A `acao` (l.593) diz "B-SAN3-06a ou bloco equivalente", com dono `B-SAN3-06b` (l.596).
13. **Teardown externo do `-db`** (dono: **C2**, item 3).
    - No `finally` (teste l.730-748), `adminClient.$disconnect()` (l.741) vem **antes** dos dois `DROP DATABASE` que usam o
      mesmo cliente (l.743 e l.746).
    - Os dois erros são engolidos por `catch {}`, o que pode deixar `erp_san3_09_drill_*` para trás.
    - A contagem de resíduo da C2 decide.
14. **Alternativa na asserção do T1.7-mutação** (dono: **C3**): a asserção por forma (teste l.399) aceita
    `includes(intruder) || includes("<não-literal>")` em todas as formas. O plano exige "nomeando o especificador injetado"
    (l.1680).
15. **Tamanho do fecho** (dono: **C3**): o plano manda publicar o tamanho do fecho no nome do caso (l.1667). O nome do T1.7-guard
    (teste l.369) não o traz.
16. **`Kpis/**`** (dono: **C3**): o §15.3 põe `Kpis/**` no PROIBIDO do dev (l.1823). A decisão do orquestrador sobre a D-C2-1
    (l.1896-1898) mandou o dev restaurar `Kpis/*` num commit próprio. Na leitura literal, "Kpis intocado pelo dev" diverge da
    decisão.
17. **Relatório do dev** (dono: **C3**): `DEV-ciclo2-relatorio.md` vive em `agent-orchestration/omega/**`, que o §15.3 marca como
    PROIBIDO "do orquestrador" (l.1826).
18. **Nota do 15.5 fora da região permitida** (dono: **C3**): a nota do 15.5 em `P-O6R-B01-TROCA-SENHA` fica fora das duas regiões
    de `pendencias.md` que o PERMITIDO nomeia (l.1818-1819), embora o parêntese "(3b-1, 3b-2, 15.5)" a cubra.

### De terreno e de norma

19. **`C:/Users/AMP/erp-terreno/receita-pg16.sh` foi escrita para o B-SAN3-05.**
    - `TESTS` e `SAMPLE` nomeiam arquivos daquele bloco, e o `cat-file` aborta sob `set -e` se eles não existirem no objeto.
    - Não sobe Redis.
    - Nomeia tudo `pg16r-*`, e não com o prefixo da cadeira.
    - Derruba tudo no `trap EXIT` e não atende mutação (o próprio `TERRENO-PG16.md` §6 declara o limite).
    - Os corpos tratam essa receita como alternativa **adaptada**. A receita direta é a do §15.3 item 6.
20. **`D-FABLE-ASTRA-SO-DINHEIRO`** existe no disco do checkout principal (`agent-orchestration/controle/decisoes.md`
    l.2982-2985), mas **não** no disco do ramo. Os corpos mandam conferir em `origin/main`.
21. **Modelo no frontmatter:** os dois moldes (`jurado-san3-01b-c2-*` e `jurado-san3-11-c2-*`) têm `model: opus`. Segui a
    instrução do disparo (`model: fable`, gates fixados, §C7.6-bis). Se o orquestrador preferir o padrão dos moldes, a troca
    é de uma linha em cada corpo, e o espelho precisa ser regenerado.

## Pontos de atenção que não são divergência

- **M-1 (C1):** a mutação imprime `JSON.stringify(existingCredential)`. A fábrica não verificou se esse objeto traz o
  `password_hash`. O corpo manda provar que o mutante imprime o hash antes de ler o T2.9.
- **MF1-g (C3):** o arquivo de teste importa o script no topo. Se o `env.ts` validar o ambiente na carga, o T1 pode cair inteiro,
  e esse vermelho seria de carga. O corpo manda medir o guard com a carga de pé, sem réplica.
- **5º estado do A11 (C2):** "convergido com reset" não foi medido pelo planejador (l.1758). Pela leitura, MA4 morreria ali
  também. Fica para a matriz 5 × 5 da C2.

## O que a fábrica não fez

- Não executou nada, não tem `Bash`, e não verificou o head por `git`.
- Não escreveu o espelho `.agents/`, não commitou e não editou nenhum outro arquivo.
- Não sugeriu as "mutações novas" do item 3 da C3, de propósito: o item exige mutações que ninguém listou.
