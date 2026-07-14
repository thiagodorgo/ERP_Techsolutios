# J-OMEGA3F-2B — Ata: bloco Ω3F-2b (form de OS dirigido pelo tipo)

Fatia FRONT do Ω3F-2 (consome o discriminador do Ω3F-2a #185). Commits: `64181e3` (feature) +
`e3a333d` (C1 da junta) + registro D-Ω3F-KPI-RELATORIO. Capacidades #23/#24 na UI (spec §1.2 0:20-2:56).

## Veredictos (3/3 favorável — todos APROVADO_CONDICIONADO; condições APLICADAS antes do merge)
| Agente | Veredito | Núcleo |
|---|---|---|
| fid-avaliador (veto) | **APROVADO_CONDICIONADO** | Fidelidade 1:1 com a spec (#24 card revelado só quando exige; #23 chaves exatas do contrato do back; espelho do 422 byte a byte com D-Ω3F-2-DESTINATION-UPDATE). **C1:** acentuar TODAS as strings novas/renomeadas (regra vinculante da rodada l.32-33). |
| cognicao-visual (veto) | **APROVADO_CONDICIONADO** | Sem andaime/termo técnico; cards ausentes (não desabilitados); cadeia viva ponta a ponta (adapter→revelação→payload); grid ok; Origem/Destino nativo do protótipo. Condição = helper da senha acentuado. Débito legado → P-Ω3F2B-ACENTOS. |
| master-teste (veto) | **APROVADO_CONDICIONADO** | Payload↔back PROVADO (camelCase destino; service_details; chaves canônicas; sentinela 0/0 idêntica). Smoke 391→396/0; backend 806/800/0 intacto; branch = main+1. Condição = registrar o desvio de KPI da rodada em `controle/`. |

## Condições — TODAS aplicadas
- **C1 (fid-avaliador + cognicao-visual):** acentuação nas strings novas/renomeadas — Endereço de origem/
  destino, Placa do veículo, Veículo, Descrição do problema, helper "Visível só para a operação; nunca vai
  para auditoria.", mensagens do validador (inválida/obrigatório). Commit `e3a333d`; smoke re-verde 396/0.
- **C-governança (master-teste):** **D-Ω3F-KPI-RELATORIO** registrada em `controle/decisoes.md` — na rodada
  Ω3F os PRs de feature não tocam `Kpis/*`; reconciliação no relatório final (regra §0.1 ratificada 5/5 na
  J-Ω3F-0; exceção de rodada à D-KPI-PER-PR, rastreável).

## Entregas
- `ServiceItem` (front) += serviceType/requiresDestination (adapter snake+camel; legado → null/false).
- `ServiceFormModal` += "Tipo de serviço" (Reboque/Socorro mecânico/Reparo residencial/Outro) + checkbox
  "Exige endereço de destino" (mesmo modal, padrão category).
- `WorkOrderForm`: card "Origem do atendimento"; card **"Destino do reboque" revelado só quando o tipo
  exige** (#24); campos dinâmicos por tipo (#23): socorro=placa/veículo/cor; residencial=senha/objeto/
  descrição (§2.8 no helper). Payload destination_* + service_details (só valores preenchidos).
- `validateWorkOrderForm` espelha o 422 (endereço OU pin válido não-0/0); `buildServiceDetails` puro.
- +5 testes front; smoke 391→**396/0**; backend 806 intacto; tsc/build verdes.

## Observações não-bloqueantes (registradas)
- Título fixo "Destino do reboque" p/ tipos "outro" com exigência → afinar em fatia futura.
- Des-tipar serviço pela UI (update não limpa service_type) → mesmo padrão pré-existente de category; fatia futura.
- O2 do fid-avaliador (fallback mock do createWorkOrder mascara 422 real) → pré-existente do módulo, registrar
  no pente-fino do padrão fallback (P-Ω3F2B-FALLBACK, candidata).
- Gap honesto: revelação condicional provada por leitura de código (sem teste de render do form completo —
  harness de providers pesado); coberto pelos testes puros + prova do master-teste.

**APROVADO — merge do Ω3F-2b (fecha o Ω3F-2 inteiro: 2a backend #185 + 2b front).**
