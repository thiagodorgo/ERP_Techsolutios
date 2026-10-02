# Trilha em espera — pasta separada, com comportamento e previsão

Os arquivos com `trilha = espera` no [`../manifesto.tsv`](../manifesto.tsv): tocam um PR em voo, um bloco planejado do
`PLANO_SAN3` §5, ou um arquivo que a `main` mudou depois da base comum. Em 30/09: **125 arquivos**. O que cada um
faz e o que o destrava está na tabela de temas do [`../README.md`](../README.md) e, por arquivo, nas colunas
`pr_em_voo`, `blocos_planejados` e `main_mudou_depois` do manifesto.

**Como a nuvem trabalha aqui (D-DEMO-UX-NUVEM, item 2):**
1. **Pode planejar já.** O plano escreve o comportamento, **quem destrava** (o PR ou bloco da coluna) e a
   **previsão** de entrada (depois de qual merge), e mede a sobreposição real com o plano do bloco que destrava.
2. **Desenvolve em ramo separado** (`feat/demo-ux-espera-<tema>`), sem abrir PR para a `main` antes de o bloco
   que destrava mergear. Quando mergear: regenera o manifesto, reporta sobre a `main` nova e só então segue o
   rito normal (crítico, junta, porteiro).
3. **Sobreposição nominal** (`*` na coluna): o bloco declara um diretório amplo, não o arquivo. Não segura o
   trabalho sozinha — o plano mede a sobreposição real e diz, com comando, se colide.
4. O **`B-SAN3-21`** (acentuação da web) é o **último** bloco a tocar texto por desenho: o que só colide com ele
   (e com o `06a`, o menu) entra **antes** dele, com o aviso no plano.
5. Nada desta pasta passa na frente da ordem do dono: perda de dado → multi-tenant → segurança → dinheiro →
   confiabilidade → contratos → fluxos de venda → acabamento → documentação.
