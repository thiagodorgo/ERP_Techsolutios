# KPIs raiz — ERP Techsolutions

Esta pasta contem os KPIs gerais do projeto. Desde B-152F, ela tambem reflete
os percentuais mobile quando uma entrega mexe em Flutter/mobile.

## Política de KPIs por PR (vigente desde 2026-07-13 — D-KPI-PER-PR)

> A política anterior ("KPIs so apos avaliacao humana em bloco B-xxxK") esta **REVOGADA** (decisao do dono,
> rodada Ω-GOV). A validacao dos numeros passa a ser da **junta do PR**; o humano audita a posteriori pelo history.

1. Todo PR que altere codigo, teste ou escopo atualiza `kpis-latest.json`, `kpis-history.*` (append) e
   `index.html` **no mesmo PR**.
2. As contagens de teste vem de **execucao real no PR** — nunca copiadas do bloco anterior.
3. `mvp_demo`/`mvp_vendavel` so mudam quando o PR mover escopo, com 1 linha de justificativa no history.
4. Blocos `B-xxxK`/`B-xxxF` deixam de ser etapa obrigatoria (podem virar resumo de marco). Os campos `pr`,
   `merge_commit`, `approved_head` referem-se ao **PR corrente**; `status: "published_per_pr"`.
5. Se a entrega mexeu em Flutter/mobile, a métrica `flutter_tests` entra aqui mesmo — o painel é único desde 2026-08-12 (`D-KPI-DUPLA-REVOGADA`);
   fora do mobile, so `Kpis/*`; nos dois, ambos. Se existir `index.html`, atualizar tambem o HTML.

## Política de limpeza pós-validação

Todo bloco que executar testes, builds, Flutter, Node, Android, iOS ou geracao de artefatos deve limpar os artefatos temporarios ao final, sem apagar arquivos rastreados e preservando assets untracked explicitamente permitidos.

## Politica de KPIs duplos

Existem dois conjuntos de KPIs:

- `Kpis/`: KPIs gerais/raiz do projeto.
- (histórico) `mobile/flutter_app/Kpis/`: painel próprio do app Flutter, APAGADO em 2026-08-12 — manter dois em paridade manual só multiplicava o risco de divergirem.

Regras obrigatorias:

- Mexeu no Flutter/mobile: atualizar `Kpis/*` (painel único) e refletir os
  percentuais mobile em `Kpis/*`.
- Mexeu fora do mobile: atualizar `Kpis/*`.
- Mexeu nos dois: atualizar os dois conjuntos.
- Se existir `index.html`: atualizar tambem o HTML.

## B-124 refletido na raiz

- B-124 — Dashboard web enriquecido com despachos e localizacoes (publicacao
  B-124K pos-avaliacao humana). **Web-only**: nenhum arquivo mobile/backend
  alterado.
- O Dashboard web (`/dashboard`) passou a compor 4 fontes reais em paralelo:
  `GET /work-orders` + `GET /operations/dispatches` +
  `GET /field-locations/latest` + `GET /notifications/unread-count`
  (+ `GET /approvals/pending`, com `work_order_id` opcional no backend).
- 8 KPIs derivados dos dados (nunca fixos); fila critica combinada com
  ordenacao por criticidade (SLA vencido &gt; prioridade &gt; operador sem
  sinal &gt; aprovacao pendente &gt; OS sem operador) e acao contextual por
  item; status de campo real (regra stale de 15 min reutilizada do
  `operations-map.adapter`); despachos ativos com status desconhecido
  tolerado; alertas acionaveis; eventos derivados das listas (sem timeline por
  OS). Fallback por fonte com rotulos Dados demonstrativos/Fallback local.
- Flutter tests: 764/764 (inalterado; B-124 e web-only). Backend: inalterado.
- Frontend smoke: **44/44** (era 33/33; +10 unit do `dashboard.adapter` + 1
  render do dashboard na PR #125); frontend check e build OK.
- MVP demo: 96% e MVP vendavel: 78% — mantidos nos valores oficiais publicados
  (sem decisao humana explicita para alterar no B-124; B-123 fechou fidelidade
  mobile de OS e B-124 fechou o dashboard web, mas os percentuais seguem
  oficiais ate revisao).
- Blocos entregues: 49 (regra de contagem: 48 ate B-123 + B-124).

Metadados: PR #125 (merge `dcfa25063111532f8cc1c77d7af8ec4519406bb0`, head
`6605b13630e3f29f98670aabf9ee32e274f40d47`), status
`published_after_human_approval`.

## B-123 refletido na raiz

- B-123 — Fidelidade visual do fluxo de OS mobile (publicacao B-123K).
- 7 telas/areas alinhadas ao prototipo aprovado (visual-only): lista de OS,
  detalhe/check-in, execucao, checklists da OS, execucao de checklist,
  evidencias e sincronizacao/fila offline.
- Estados semanticos por tokens centrais (pills/faixas do mobile_kit); sem
  dado tecnico cru na UI; nenhum repository/service/contrato/sync/model/
  provider alterado; nenhuma dependencia nova.
- Flutter tests: 764/764 (revalidado apos cada tela na PR #123; analyze sem
  issues; dart format limpo).
- Frontend smoke: 33/33 (frontend nao alterado). Backend: inalterado.
- MVP demo: 96% e MVP vendavel: 78% — mantidos nos valores oficiais
  publicados (sem decisao humana para alterar no B-123).
- Blocos entregues: 48 (regra de contagem: 47 ate B-122 + B-123).

Metadados: PR #123 (merge `2537558f3f078425c13119a60445e960aac26bb2`, head
`24d439072778438ed3de837fc66a4ef6bce31944`), status
`published_after_human_approval`.

## B-122 refletido na raiz

- B-122 — Alinhamento visual ao prototipo aprovado (publicado junto ao B-121K).
- Perfil do operador recriado fiel a `screen-refs/mobile/perfil.png`: hero com
  avatar/nome/e-mail e "Papel · Organizacao" (rotulo PT-BR), secoes Conta e
  organizacao, Aparencia, Seguranca e sessao e botao Sair.
- Removidos da UI: modo de autenticacao, expiracao de token, permissoes cruas,
  modulos, tenants e IDs internos (suporte tecnico no Diagnostico dev-only).
- Auditoria: 11 telas web MVP + shell conformes; web sem rota de Perfil
  (lacuna documentada); fluxo de OS mobile em Material stock (lacuna).
- Flutter tests: 764/764 (revalidado na PR #121). Frontend smoke: 33/33
  (frontend nao alterado no B-122). Backend: inalterado.
- MVP demo: 96% e MVP vendavel: 78% — mantidos nos valores oficiais publicados
  no B-121K (sem novos percentuais propostos).
- Blocos entregues: 47 (regra de contagem: 46 ate B-121 + B-122).

Metadados: PR #121 (merge `fc7e17810940edf933b5e4a2071f8f456e05d4e9`, head
`f151b4fb6e53200204846aed5abb0699c0308d94`), status
`published_after_human_approval`.

## B-121 refletido na raiz

- B-121 — MVP integrado Web/Mobile (publicacao B-121K pos-avaliacao humana).
- Web MVP ligado aos endpoints reais: lista/detalhe de OS com timeline, Dashboard
  composto de work-orders + notifications, Aprovacao operacional no detalhe
  (motivo obrigatorio na reprovacao, RBAC) e nav MVP-only via `GET /navigation/menu`.
- Matriz tela x endpoint x status das 27 telas MVP em `docs/api-screen-endpoints.md`.
- Hardening mobile: timeline real no detalhe/check-in com fallback local seguro,
  auto-sync no app root com ordem segura, adapter de checklist tolerando `fields`
  e `components` e base URL por `--dart-define=API_BASE_URL`.
- Consolida os blocos B-109 a B-120 mergeados desde a ultima publicacao (B-108).
- Flutter tests: 764/764.
- Frontend smoke tests: 33/33.
- Backend tests: 15/15 (backend nao alterado no B-121).
- Mobile backend contracts: 18/18.
- Mobile + Core SaaS contracts: 21/21.
- Flutter modules: 17/17.
- MVP demo: 96% (ultimo valor documentado na rodada B-113 a B-120; estimado).
- MVP vendavel: 78% (ultimo valor documentado na rodada B-113 a B-120; estimado).
- Blocos entregues: 46.

Metadados: PR #117 (merge `38facb24a3bc8592cc3ccd6c11d4e428420532ed`, head
`73a50e905b5a7a3c4665910e705f168d239a8dd9`), PR #118 (merge
`f05566828a2b05d9c4400112d66be490477f0a17`, head
`474e5ec49e562a39ddcb1eec15253816ff11f520`), PR #119 (merge
`e851fd35e141545401abfc0fac774f62e1c2f615`, head
`72d6ccc6476be752ccf8d368a5252c8c97fac522`), status
`published_after_human_approval`.

Limitacoes mantidas: S3/presigned real, DB/Redis receipt, antivirus real,
download protegido final, retencao definitiva, Dashboard web sem
dispatches/field-locations, Settings web sem backend dedicado e piloto Android
real em dispositivo fisico pendente.

## B-108 refletido na raiz

- B-108 — Hardening de evidências/storage.
- `EvidenceStorageProvider` e `LocalProtectedEvidenceStorageProvider` publicados para dev/test.
- `EvidenceScanner` testavel com `NoopEvidenceScanner` e fake de teste.
- Referencia opaca `evfile_*` publicada na resposta.
- MIME validation JPEG/PNG.
- Size validation 10 MB.
- Checksum SHA-256 obrigatorio.
- Auditoria segura `accepted`/`rejected`/`scan_failed`/`stored`.
- Upload multipart mobile preservado.
- Resposta publica sem path, bucket, storage key, URL publica, token, base64 ou binario.
- Flutter tests: 662/662.
- Backend tests: 15/15.
- Mobile backend contracts: 18/18.
- Mobile + Core SaaS contracts: 21/21.
- Flutter modules: 17/17.
- MVP demo: 93%.
- MVP vendavel: 76%.
- Blocos entregues: 38.

Metadados: PR #104, merge commit `468fcf16c6b42865aecbd45b05f4c37ced0c3068`,
approved head `4b221cfdfe3acad9c65214ac5fc7e7892a050331`, status
`published_after_human_approval`.

Limitacoes mantidas: S3/presigned real, DB/Redis receipt, antivirus real,
download protegido final e retencao definitiva seguem pendentes.

## B-107 refletido na raiz

- B-107 — Criação remota de OS/local-only mapping + resolução manual de conflitos.
- `work_order.create` suportado no sync mobile existente.
- `localId -> serverId` implementado para `accepted` e `already_applied`.
- `rejected` mantém OS local com falha segura.
- `conflicts` entram em resolução manual inicial.
- `statusUpdate` local-only fica bloqueado antes de `serverId` e elegível após o mapeamento.
- Flutter tests: 654/654.
- Backend tests: 15/15.
- Mobile backend contracts: 18/18.
- Mobile + Core SaaS contracts: 21/21.
- Flutter modules: 17/17.
- MVP demo: 92%.
- MVP vendavel: 72%.
- Blocos entregues: 37.

Metadados: PR #102, merge commit `db36fb318adc234e1fcc6bfeaeb17b6260847c3c`,
approved head `b3da11d1605af9edb68e5e8f587881fc22115f3f`, status
`published_after_human_approval`.

Limitacoes mantidas: Approval real pendente, evidence attach real pendente,
merge avancado campo a campo de conflitos pendente, hardening final de
evidencias/storage pendente e piloto Android real ainda precisa validacao em
dispositivo fisico.

## B-106 refletido na raiz

- B-106 — Adapter GPS nativo real + permissões Android/iOS.
- Field Location e DeviceLocationProvider com adapter geolocator real.
- Flutter tests: 633/633.
- Backend tests: 15/15.
- Backend contract tests focados: 47/47.
- Flutter modules: 17/17.
- MVP demo: 90%.
- MVP vendavel: 68%.
- Blocos entregues: 36.

Limitacoes mantidas: Sem background tracking, Sem stream continuo, Sem timer, Sem envio silencioso, Geofencing pendente, Roteirizacao pendente, Provider externo de mapa pendente, se aprovado, Approval real pendente, Conflitos manuais avancados pendentes, Hardening final de evidencias/storage pendente, Piloto Android real ainda precisa validacao em dispositivo fisico.

## Contrato do painel (reescrito em 2026-08-17)

`index.html` + `app.js` + `styles.css` foram refeitos do zero. Quem for mexer precisa saber destas regras —
todas têm teste que falha se forem quebradas.

### De onde vem cada coisa

O painel **hidrata em tempo de execução** de `kpis-latest.json` e `kpis-history.json`. Nenhum número mora no
HTML ou no JS. Além das chaves antigas, o `kpis-latest.json` carrega cinco blocos escritos para esta página:

| Bloco | O que é | Fonte de verdade |
|---|---|---|
| `production_readiness` | veredito de produção, contagem de achados por severidade, lista dos fechados | `docs/revisoes/O6R/achados.jsonl` |
| `findings` | os 30 achados, com resumo em linguagem de negócio | idem |
| `roadmap` | os 12 blocos de correção, ordem vinculante, trilha represada | `docs/revisoes/O6R/PLANO_O6R.md` |
| `recent` | últimas entregas: o que cada uma fechou e o que descobriu | `git log main` + atas das juntas |
| `series_breaks` | pontos em que a métrica **mudou o que mede** | descrição do próprio registro no history |

Cada um carrega `as_of` e `source`. Quem acrescentar uma dimensão nova entrega **no mesmo PR** o lugar dela no
painel — número novo sem lugar no painel é entrega incompleta (§C3).

### As regras que têm guarda

1. **Nada de dado inventado (D-007).** Dado ausente é seção escondida ou **buraco na série** — nunca zero, nunca
   estimativa, nunca interpolação. `|| 0` num ponto de série fabrica um pico; foi assim que nasceu uma barra
   falsa de +969 numa versão antiga.
2. **Quebra de medida é declarada, não inferida.** Duas vezes a métrica mudou o que mede (13/07: backend
   15→766, console web 44→378). Ligá-las por linha contínua afirmaria um crescimento que não houve. As quebras
   vivem em `series_breaks` e são localizadas pela **transição** (`de` → `para`), não pela data — várias
   entregas dividem o mesmo `snapshot_date`. Inferir a quebra pelo tamanho do salto puniria crescimento real.
3. **A cópia congelada é gerada, nunca digitada.** Por `file://` o navegador bloqueia a leitura dos JSON, e o
   painel cai numa cópia embutida, **rotulada na tela** como congelada. Ela é produzida por
   `node scripts/kpi-freeze.mjs` e comparada pelo guard: editou o JSON, rode o script e faça commit dos dois
   juntos. `node scripts/kpi-freeze.mjs --check` verifica sem escrever.
4. **`[hidden]` manda sempre.** O `styles.css` declara `[hidden]{display:none !important}` de propósito — já
   houve regra de layout vencendo o `hidden` do navegador e a seção aparecendo vazia.
5. **Zero dependência.** Nenhum recurso externo em nenhum dos três arquivos: sem CDN, sem fonte por URL, sem
   `<img src>`. Os gráficos são SVG inline escrito à mão (PD-004).
6. **`buildChartSeries(history)` é pura e global.** É o que permite ao guard recomputar a série e comparar
   ponto a ponto. Pontos ausentes ficam `null` **no array** (não removidos), senão o alinhamento com as datas
   quebra. Se você mudar a assinatura, atualize `tests/kpi-dashboard-charts.test.ts` junto.

### Os três guards

- `tests/kpi-dashboard-contraste.test.ts` (6) — mede contraste nos dois temas, exige que nenhuma cor nasça
  dentro de um bloco de tema, proíbe cor literal fora dos tokens e cobra regra de CSS para toda classe de
  marca SVG que o `app.js` emite. Este último existe porque um `<rect class="week-gap">` sem regra nasceu
  **preto** e virou a maior barra do gráfico.
- `tests/kpi-dashboard-charts.test.ts` (16) — executa o `app.js` de verdade num sandbox. A 1ª versão deste
  guard era **teatro**: um crítico trocou as três séries por retas sintéticas e tudo passou verde, porque só
  checava "tem `<svg>`". Hoje ele amarra a curva ao JSON e prova o inverso também — **mutar o histórico tem de
  mover a curva**.
- `tests/kpi-achados-paridade.test.ts` (5) — exige que `achados.jsonl`, o painel e o cronograma contem a mesma
  história. Achou um achado crítico órfão (sem bloco de correção) na primeira execução. Também trava a saída
  fácil: **zerar o contador de críticos não libera produção** — trocar o veredito exige junta nova registrada
  em `fonte_veredito`.
