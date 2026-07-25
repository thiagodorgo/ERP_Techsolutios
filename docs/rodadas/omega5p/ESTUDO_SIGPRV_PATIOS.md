# ESTUDO — Módulo Pátios de Recolhimento de Veículos (SIGPRV) no ERP Techsolutions

> **Natureza:** estudo técnico-científico de fundamentação para a rodada Ω5P.
> **Data:** julho/2026 · **Âncora regulatória:** nacional, parametrizável por UF/órgão · **Alvo comercial:** pátios credenciados a órgãos de trânsito **e** pátios privados (guincho/seguradora), desde o início.
> **Escopo do MVP definido:** núcleo de custódia (entrada, vagas, diárias, liberação) + portal do proprietário + leilões. Pagamento online fora do MVP.
> **Método:** revisão normativa primária (CTB, leis alteradoras, Resolução CONTRAN vigente), revisão jurisprudencial, levantamento de mercado e modelagem formal do domínio. Referências na seção 13.

---

## Resumo

O gerenciamento de veículos recolhidos por determinação de autoridade é um domínio de **custódia jurídica de bem de terceiro**, e não de mera logística de estacionamento. As consequências de projeto são três: (i) o registro operacional é **prova** — precisa ser íntegro, atribuível, cronologicamente encadeado e retido por prazo legal; (ii) o faturamento (diárias) é **regulado** — com regra de acumulação, teto temporal e regime intertemporal definidos em lei; (iii) o desfecho do processo (liberação ou leilão) é um **procedimento administrativo com prazos e notificações** cuja inobservância gera nulidade e responsabilização. A Resolução CONTRAN nº 1025/2026, que revogou a Res. 623/2016 e instituiu o Sivec (Sistema Integrado de Veículos Custodiados), converte o "sistema do pátio" de diferencial comercial em **requisito regulatório homologável** — criando uma janela de oportunidade para produtos projetados desde já como *Sivec-ready*. Este estudo formaliza o domínio (ontologia, máquina de estados, invariantes), deriva o motor de diárias e o processo de leilão diretamente da norma, especifica o modelo de ameaças do portal público sob LGPD e propõe a arquitetura de referência sobre o ERP Techsolutions, maximizando reuso do que as rodadas Ω3F/Ω4C já entregaram.

---

## 1. Problema e contexto

Pátios operam sob pressão simultânea de quatro stakeholders com interesses parcialmente conflitantes: o **órgão de trânsito** (conformidade, prestação de contas, desocupação dos pátios), o **proprietário** (transparência, custo, devolução rápida), o **operador do pátio** (receita de diárias, giro de vagas, proteção contra responsabilização por avarias) e o **credor/arrematante** no leilão. A dor histórica do setor — superlotação e passivo de veículos abandonados — motivou a própria Lei 13.160/2015, que reduziu de 90 para 60 dias o prazo para levar a leilão o veículo não reclamado. O problema de engenharia, portanto, não é "controlar vagas": é **operar uma cadeia de custódia auditável que sustente cobrança regulada e alienação válida**.

## 2. Marco regulatório (fundamento de cada requisito)

### 2.1 CTB — arts. 269 a 271 e 328
- **Remoção** é medida administrativa (art. 269); a **restituição** do veículo removido exige prévio pagamento de multas, taxas e despesas de remoção e estada, além de outros encargos (art. 271, § 1º), e a liberação é condicionada ao reparo de equipamento obrigatório defeituoso (art. 271, § 2º), com liberação restrita para transporte ao local de reparo mediante autorização e prazo (redação da Lei 13.160/2015).
- **Estadia**: o pagamento corresponde ao período integral em que o veículo permanecer no depósito, **limitado a 6 (seis) meses** (art. 271, § 10, incluído pela Lei 13.281/2016; espelhado no art. 328, § 5º). Há previsão de **devolução de quantias** quando comprovado recolhimento indevido ou abuso no período de permanência (art. 271, § 13, referido pela Res. 1025/2026, art. 5º, VII).
- **Leilão** (art. 328, redação da Lei 13.160/2015): veículo não reclamado em **60 dias** do recolhimento será avaliado e leiloado, preferencialmente por meio eletrônico; publicado o edital, a **preparação pode iniciar após 30 dias** do recolhimento; classificação em **conservado** (apto a trafegar) e **sucata** (inapto); sem oferta ≥ avaliação, o lote vai ao leilão seguinte com arremate mínimo de **50% da avaliação**; conservado leiloado **2 vezes sem arremate → sucata**; **vedado retorno de sucata à circulação**; § 6º define a **ordem de destinação dos valores** (custeio do leilão rateado proporcionalmente; despesas; credores trabalhistas/tributários/garantia real; multas do órgão realizador; demais multas do SNT em ordem cronológica; demais créditos); § 12: **saldo remanescente** fica à disposição do antigo proprietário por **5 anos** (notificação em até 30 dias pós-leilão), após o que vai ao fundo do art. 320 (Funset); § 13 estende o regime a animais recolhidos; §§ 14-15 tratam de veículos com **restrição policial/judicial** (autoridade é notificada para retirar mediante quitação de remoção/estadia); §§ 16-18 autorizam **destinação direta à reciclagem** de irrecuperáveis/queimados/adulterados/estrangeiros sem possibilidade de regularização (§ 18 incluído pela Lei 13.281/2016).

### 2.2 Resolução CONTRAN nº 1025/2026 (DOU 30/06/2026) — a norma operacional vigente
Revoga a Res. 623/2016 (art. 45) e disciplina remoção, guarda, liberação e leilão. Pontos estruturantes para o software:

1. **Sivec** (art. 1º, § 1º): plataforma nacional de integração/governança. O **centro de custódia deve dispor de sistema eletrônico homologado pelo órgão máximo executivo de trânsito da União, com interoperabilidade e integração de dados com o Sivec** (art. 9º, III) e manter as informações **permanentemente atualizadas** (art. 9º, IV). ⇒ *o produto é objeto de homologação*.
2. **Vistoria eletrônica de recepção** com registro obrigatório mínimo (art. 9º, I): data/hora de entrada; origem com nº do auto de infração/ato/decisão judicial; identificação do agente/autoridade; identificação do veículo (placa, chassi, Renavam, marca, modelo); **imagens do estado físico** conforme especificações federais.
3. **Termo de Recolhimento do Veículo** (art. 14): órgão aplicador, veículo, fundamento legal, local/data/hora, local de guarda, proprietário/condutor quando possível; § 1º exige registrar **objetos deixados no veículo**, **equipamentos obrigatórios ausentes**, **estado geral de lataria, pintura e pneus** e o prazo de retirada sob pena de leilão; § 2º: presente no ato = notificado, ainda que se recuse a assinar.
4. **Notificações** (art. 15): ausente o proprietário, notificação em **até 10 dias** da remoção; preferencialmente via **SNE** (art. 282-A CTB); sem adesão, **postal em 10 dias** e, frustrada, **edital**; a partir de **01/01/2027, exclusivamente via SNE** (art. 24, I, da Lei 14.440/2022). **Edital complementar** após **30 dias** sem regularização+retirada, acessível por **no mínimo 10 dias**, com conteúdo mínimo definido (art. 26).
5. **Guarda monitorada** (art. 17): alternativa em que o veículo permanece com o proprietário sob solução tecnológica homologada, mediante 9 requisitos (segurança, ausência de adulteração/furto/restrições, licenciamento em 1 dos 3 últimos exercícios etc.). É funcionalidade de fronteira (depende de homologação federal) — mapeada como extensão futura.
6. **Diárias** (art. 21): custos suportados pelo proprietário/interessado; **§ 1º: diária = período de 24 horas contado da entrada, devida nova diária somente após o transcurso de cada período** (modelo *rolling*, não dia-calendário); **§ 2º: teto de 6 meses**, pagamento devido **por quem retirar o veículo**, seja ou não o proprietário; § 3º: em pátios de terceiros, remoção/guarda podem ser pagas diretamente ao administrador.
7. **Transparência ao proprietário** (arts. 22 e 25, § 2º): localização, situação, histórico de movimentações, valores atualizados e pendências devem estar disponíveis ao proprietário por canais digitais. ⇒ *fundamenta juridicamente o Portal do Proprietário do MVP*.
8. **Liberação** (arts. 23-24): quitação prévia + regularização; liberação apenas p/ transporte a reparo com autorização e reapresentação em até 60 dias; **comprovante de liberação** com data/hora de entrada e saída e identificação de quem retira, preferencialmente eletrônico.
9. **Leilão** (arts. 25-39): "não reclamado" = não promoveu **simultaneamente** regularização e retirada em 60 dias; preparação a partir de 30 dias (classificação conservado/sucata por critérios federais, **avaliação com sigilo dos valores**, lotes); leilão **eletrônico** em plataforma **homologada**, conduzido por leiloeiro administrativo ou oficial; **edital com antecedência mínima de 15 dias úteis** (Lei 14.133/2021); **pagamento do arrematante em até 3 dias** por sistema conectado ao Sivec; **nota de leilão** assinada eletronicamente = comprovante de transferência de propriedade (art. 124, III, CTB); sucata → **baixa definitiva** no Renavam; **retirada pelo arrematante em até 60 dias** (prorrogável 1x; descumprimento → novo leilão); **saldo remanescente**: conta específica, notificação em 30 dias, disponível por 5 anos, depois **Funset** via GRU; insuficiência → cobrança dos débitos remanescentes do antigo proprietário (protesto/dívida ativa/ação).
10. **Sanções** (arts. 40-42) a centros de custódia (advertência, suspensão até 6 meses, cancelamento), leiloeiros e arrematantes inadimplentes (perda do bem, retenção de valores, proibição até 1 ano). **Retenção documental mínima de 5 anos com rastreabilidade** (art. 9º, VII).
11. **Transição** (art. 44): até o Sivec operar, Detrans desvinculam débitos em 15 dias úteis; após operação, **12 meses para carga do estoque legado**; obrigações dependentes do sistema ficam dispensadas até lá. ⇒ *janela para lançar "Sivec-ready" antes da especificação técnica final.*

### 2.3 Jurisprudência e regime intertemporal das diárias
O **Tema Repetitivo 124/STJ** firmou, sob a redação antiga do CTB, que é legal condicionar a liberação ao prévio pagamento de remoção e estada, mas a estada só poderia ser cobrada pelos **30 primeiros dias**. Com a Lei 13.160/2015 e o § 10 do art. 271 (Lei 13.281/2016), o teto passou a **6 meses**, e a jurisprudência posterior aplica o novo limite às remoções ocorridas sob sua vigência (ex.: TJMG, 2022, afastando o Tema 124 por superação legislativa). **Consequência de projeto:** o motor de diárias precisa aplicar o teto **conforme a data de entrada** do veículo (regra intertemporal), além do teto configurável por perfil.

### 2.4 Demais normas incidentes
**Lei 12.977/2014** (desmonte) e Decreto 1.305/1994 — destino de sucatas e certidão de baixa; **Lei 14.133/2021** — regime licitatório dos leilões públicos; **Lei 14.440/2022** — SNE obrigatório a partir de 2027; **LGPD (Lei 13.709/2018)** — tratamento de dados de proprietários/condutores, imagens e consulta pública (seção 7); **legislações estaduais/municipais** — credenciamento, tabelas de preços e procedimentos locais (dimensão parametrizada, seção 9).

## 3. Estado da arte e mercado

O poder público acelera a digitalização da ponta de liberação: o Detran-SP opera a LIVE, liberação hiperautomatizada via portal com conta GOV.BR (selo prata/ouro) e quitação por PIX, exibindo inclusive os valores cobrados pelo pátio; Goiás e Mato Grosso do Sul disponibilizam consulta/liberação digital equivalentes. No lado privado, soluções estabelecidas como o SGIPRV (DSIN) cobrem vistorias em campo e na chegada, imagens, guias de remoção/diária, notificações com AR, seleção de aptos a leilão e prestação de contas ao DETRAN; há SaaS de nicho (ex.: ConfisCAR) precificados por local de guarda e usuário, confirmando o modelo multi-pátio como requisito de mercado. Antes mesmo da Res. 1025, o Detran-SP já exigia **homologação** do sistema informatizado dos operadores de pátio (Portaria de 2018) — a Res. 1025 nacionaliza essa lógica via Sivec. **Lacuna identificada:** nenhuma solução dominante nasceu desenhada para a Res. 1025/2026 (evento-fonte auditável, prazos da nova resolução, guarda monitorada, interoperabilidade Sivec); produtos legados terão custo de adaptação. A tese de produto do módulo é ocupar essa posição.

## 4. Ontologia do domínio e modelo formal

### 4.1 Conceito central: Processo de Custódia (`ImpoundProcess`)
Agregado-raiz que une: veículo (possivelmente **não identificado** — placa/chassi adulterados são caso de negócio, não erro de validação), origem (órgão/convênio, autoridade, auto de recolhimento, BO, ordem judicial), vínculo com a OS de remoção do ERP, pátio/vaga, encargos, notificações, liberação ou alienação.

### 4.2 Máquina de estados (transições nomeadas = eventos de custódia)
```
EM_REMOCAO → RECEPCAO (chegada ao pátio; vistoria pendente)
RECEPCAO → CUSTODIA_ATIVA        [somente com vistoria de entrada completa]
CUSTODIA_ATIVA → LIBERACAO_EM_ANDAMENTO → LIBERADO
CUSTODIA_ATIVA → LIBERADO_PARA_REPARO → CUSTODIA_ATIVA | LIBERADO   [art. 23, §1º]
CUSTODIA_ATIVA → ELEGIVEL_LEILAO (D+60, não reclamado)
ELEGIVEL_LEILAO → EM_PREPARACAO_LEILAO → LOTEADO → ARREMATADO → ENCERRADO_LEILAO
LOTEADO → CUSTODIA_ATIVA         [reclamado antes da consumação — art. 26, §1º]
CUSTODIA_ATIVA|ELEGIVEL_LEILAO → RECICLAGEM_DIRETA → ENCERRADO      [CTB §§16-18]
CUSTODIA_ATIVA → BLOQUEIO_JUDICIAL ⇄ CUSTODIA_ATIVA                 [§§14-15]
ARREMATADO → LOTEADO             [inadimplência do arrematante — Res. art. 42]
qualquer → TRANSFERIDO_PATIO (evento, preserva o processo)
```

### 4.3 Invariantes (verificáveis por teste)
- **I1** Um processo ativo ocupa no máximo 1 vaga; uma vaga aloja no máximo 1 processo ativo.
- **I2** `CustodyEvent` é *append-only*; cada evento carrega `hash = H(hash_anterior ‖ payload)` — adulteração quebra a cadeia (prova de integridade barata, sem blockchain).
- **I3** Estado `CUSTODIA_ATIVA` pressupõe vistoria de entrada com o conjunto mínimo do art. 9º, I (dados + fotos obrigatórias).
- **I4** Diárias acumuladas ≤ teto do perfil vigente na **data de entrada** (regime intertemporal, § 2.3).
- **I5** `LIBERADO` pressupõe: autorização do órgão registrada **e** (débitos exigíveis quitados **ou** dispensa fundamentada) **e** identificação de quem retira **e** comprovante com data/hora de entrada e saída.
- **I6** Nenhum lote é consumado sem trilha de notificação íntegra (notificação inicial ≤ 10 dias + edital ≥ 30 dias acessível ≥ 10 dias + edital de leilão ≥ 15 dias úteis).
- **I7** `Σ SettlementAllocation.valor = valor arrematado`, respeitada a ordem do art. 328, § 6º; alocação de classe inferior só recebe após exaurir a superior.
- **I8** Sucata jamais transiciona para estado que permita circulação; 2º leilão sem arremate reclassifica conservado → sucata automaticamente.
- **I9** Registros e documentos do processo são imutáveis e retidos por ≥ 5 anos após encerramento (art. 9º, VII); exclusão física é vedada — apenas anonimização LGPD pós-prazo.
- **I10** Todo acesso do portal público é registrado (quem consultou o quê, quando, de onde) — accountability LGPD.

## 5. Motor de diárias — formalização

Sejam `t₀` a data/hora de **entrada** (evento de recepção), `t` o instante de cálculo, `T_stop` o instante de congelamento (liberação/arrematação/reciclagem). A norma federal (Res. 1025, art. 21, § 1º) define a diária como **período rolante de 24 h**:

`n_diárias(t) = min( ⌈ (min(t, T_stop) − t₀) / 24h ⌉ , cap(perfil, t₀) )`, com nova diária devida **apenas após transcorrido** cada período (portanto ⌈·⌉ com a convenção de que a 1ª diária vence em `t₀+24h` — parametrizável se o perfil público local dispuser diferente) e `cap = 6 meses` para regimes públicos com entrada sob a lei nova, `30 diárias` para entradas sob o regime do Tema 124/STJ, e **livre/contratual** para perfis privados. O valor unitário vem da **tabela vigente na data de cada acumulação** (`TariffRate` com vigência), por categoria do veículo e pátio. Propriedades exigidas do motor: **idempotência** (job diário com chave única `processId+refDate`; reexecução não duplica), **determinismo temporal** (timezone do pátio, DST-safe), **recalculabilidade** (mudança retroativa de tabela gera *ajuste* como novo lançamento, nunca sobrescrita — I2), **congelamento** em `T_stop`, e **separação cobrança×responsável** (devido por *quem retira*, art. 21, § 2º — o pagador só se conhece na liberação).

## 6. Leilão — linha do tempo normativa e liquidação

`D0` entrada → `≤D10` notificação do proprietário (SNE/postal; edital se frustrada) → `≥D30` edital complementar (acessível ≥ 10 dias) e início facultativo da preparação (classificação conservado/sucata, avaliação **sigilosa**, loteamento) → `≥D60` elegível se não houve regularização **e** retirada simultâneas → edital do leilão com **≥ 15 dias úteis** → certame **eletrônico em plataforma homologada** com leiloeiro → arrematação → **pagamento ≤ 3 dias** (inadimplência: perda do bem, retenção de valores, suspensão ≤ 1 ano, reintegração do lote) → nota de leilão assinada eletronicamente (= título de transferência; sucata = baixa no Renavam) → **retirada ≤ 60 dias** (prorrogável 1x) → **liquidação em cascata** (art. 328, § 6º): custeio do leilão rateado pró-valor → despesas de remoção/estadia → credores trabalhistas/tributários/garantia real → multas do órgão realizador → demais multas SNT em ordem cronológica → demais créditos → **saldo** em conta específica por 5 anos (notificar ex-proprietário em ≤ 30 dias) → Funset. No MVP o sistema **não é a plataforma de lances**: ele prepara, documenta, integra-se ao certame externo homologado e liquida — decisão registrada em D-Ω5P-06.

## 7. Portal do proprietário — modelo de ameaças e controles (LGPD)

Base legal do tratamento: execução de políticas públicas/obrigação legal (arts. 22 e 25, § 2º, da Res. 1025 mandam disponibilizar as informações ao proprietário) e legítimo interesse na modalidade privada. Ameaças e controles:

| Ameaça | Vetor | Controle |
|---|---|---|
| Enumeração de acervo | consulta só por placa | exigir **placa + Renavam** (e/ou 4 últimos do CPF/CNPJ) em conjunto; resposta idêntica p/ "não encontrado" e "não autorizado" |
| Scraping/stalking | automação | rate-limit por IP+chave, CAPTCHA progressivo, sessão curta assinada, sem indexação |
| Vazamento por excesso | fotos/dados completos | minimização: status, pátio (endereço público), débitos, pendências; fotos com marca-d'água e resolução reduzida; dados do proprietário nunca exibidos |
| Repúdio | "não fui notificado" | `PortalAccessLog` imutável (I10) compõe a trilha probatória |
| Engenharia social na liberação | retirada por terceiro | fluxo de **solicitação** de liberação com upload de documentos e validação interna; agendamento; conferência presencial |
| Evolução | contas GOV.BR (padrão Detran-SP/GO) | arquitetura de autenticação plugável; GOV.BR como provedor futuro (fora do MVP) |

Dado pessoal sensível (biometria/reconhecimento facial, sugerido no documento-ideia) fica **desaconselhado**: LGPD art. 11 impõe regime agravado e o ganho no MVP é nulo.

## 8. Arquitetura de referência no ERP Techsolutions

**Reuso direto** (não duplicar): OS de remoção com aceite/GPS/check-in, checklist eletrônico e fotos, assinatura, timeline mobile (Ω3F P1) → a "operação de remoção" do documento-ideia **já existe**; anexos genéricos, motor de notificações internas com visibilidade, contas a pagar por origem, extrato, auditoria global, sessões e telemetria (Ω4C); domínio bases/pátios e colunas configuráveis/Excel (Ω3F P2). **Núcleo novo:** módulo `impound` (processo, eventos hash-encadeados, máquina de estados), `yard` físico (áreas hierárquicas quadra→corredor→fileira→vaga, tipos coberta/moto/pesado, ocupação), `charging` (tarifas com vigência, acumulador de diárias, guias), `release`, `auction` (preparação, eventos, lotes, liquidação em cascata), `owner-portal` (BFF público isolado, sem sessão do ERP, CORS próprio, rate-limit) e `jurisdiction` (perfis normativos). **Sivec-readiness:** camada `interop` com contratos de exportação versionados por evento (recepção, movimentação, liberação, leilão) e fila de sincronização *outbox* — a especificação técnica federal ainda não foi publicada; a decisão de projeto é aderir por *adapter* quando sair (D-Ω5P-05), cumprindo desde já o dado mínimo do art. 9º. **Multi-tenant:** um tenant-operador pode ter N pátios e M convênios; RLS e índices tenant-first conforme padrão da casa; retenção de 5 anos implica política de arquivamento, não exclusão.

## 9. Parametrização nacional (dimensões de variação por UF/órgão/contrato)

`JurisdictionProfile` captura: prazos (notificação=10d, edital=30d, elegibilidade=60d, edital de leilão=15 d.u. — default federal, sobrescrevível), modelo de diária (`ROLLING_24H` federal | `CALENDAR` contratual), teto (6 meses | 30 diárias legado | ilimitado contratual), exigências documentais de liberação (checklist configurável por perfil), classificação/vistoria adicionais, e canais de notificação aceitos (SNE-only ≥ 01/01/2027). `TariffTable` versionada por vigência × categoria de veículo × serviço (remoção base, km excedente, diária, serviços adicionais), com **escopo público-credenciado** (tabela do órgão) ou **privado-contratual** (negociada com seguradora/cliente) — a dupla natureza tarifária decidida para o produto.

## 10. IA e automações (fase pós-MVP, com fundamento)
ALPR/OCR de placa e CRLV na recepção (acurácia alta em cenário controlado de pátio), detecção assistida de avarias comparando fotos de entrada/saída (reduz litígio de responsabilidade do depositário — art. 20 da Res. 1025), busca semântica no dossiê e leitura automática de autos. Reconhecimento facial: excluído (seção 7). Todas dependem de decisão de junta para eventual serviço externo (D-SAN-AUTONOMIA).

## 11. Questões abertas de pesquisa/produto
(a) Especificação técnica do Sivec e da homologação de sistemas — acompanhar atos do órgão máximo (a Res. delega ~12 regulamentações); (b) critérios federais de classificação conservado/sucata (art. 28, I) ainda por detalhar; (c) guarda monitorada como produto (hardware homologado); (d) interoperabilidade com SNE para notificação eletrônica direta; (e) tabela de categorias de veículo unificada vs. por órgão; (f) tratamento probatório de veículo sem identificação possível.

## 12. Síntese das decisões que o estudo recomenda à junta
D-Ω5P-01 evento de custódia *append-only* com hash encadeado; D-Ω5P-02 diária *rolling 24h* federal com modelo alternativo por perfil; D-Ω5P-03 teto intertemporal por data de entrada; D-Ω5P-04 portal com autenticação por posse de dados combinados + arquitetura plugável p/ GOV.BR; D-Ω5P-05 Sivec por *adapter/outbox*, sem integração especulativa; D-Ω5P-06 leilão: o sistema prepara/documenta/liquida, não hospeda lances no MVP; D-Ω5P-07 pagamento online fora do MVP (registro manual de quitação), PSP futuro só via junta-de-5; D-Ω5P-08 retenção 5 anos + anonimização LGPD pós-prazo.

## 13. Referências
1. Lei nº 9.503/1997 (CTB), arts. 269-271 e 328 — planalto.gov.br.
2. Lei nº 13.160/2015 — nova redação dos arts. 270, 271 e 328 do CTB (leilão em 60 dias; preparação após 30; conservado/sucata; teto de estadia) — planalto.gov.br; Senado Notícias, 27/08/2015.
3. Lei nº 13.281/2016 — art. 271, § 10 (teto de 6 meses) e art. 328, § 18 — legjur.com.
4. Resolução CONTRAN nº 1025, de 26/06/2026 (DOU 30/06/2026) — remoção, guarda, liberação e leilão; institui o Sivec; revoga a Res. 623/2016 — legisweb.com.br/legislacao/?id=497435.
5. Resolução CONTRAN nº 623/2016 (revogada; referência histórica) — gov.br/transportes.
6. STJ, Tema Repetitivo 124 (REsp 1.104.775/RS) — prévio pagamento p/ liberação; estada limitada a 30 dias no regime anterior.
7. TJMG, 7ª Câmara Cível, 2022 — licitude da cobrança por 6 meses após a alteração legislativa (superação do Tema 124) — Conjur, 29/08/2022.
8. Lei nº 14.440/2022, art. 24, I — SNE como canal exclusivo de notificação a partir de 01/01/2027.
9. Lei nº 14.133/2021 — regime dos leilões públicos. · Lei nº 12.977/2014 e Decreto nº 1.305/1994 — sucata/baixa.
10. Lei nº 13.709/2018 (LGPD).
11. Mercado: DSIN SGIPRV (dsin.com.br); ConfisCAR (confiscar.app); Detran-SP LIVE (liberação digital com GOV.BR e PIX) e Portaria de homologação de sistemas de pátio (2018); Detran-GO Expresso; Detran-MS consulta digital.
