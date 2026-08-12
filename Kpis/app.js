const dashboardData = {
  "project": {
    "name": "ERP Techsolutions",
    "version": "CHK-P1-RENDER-ENVELOPE",
    "updatedAt": "2026-08-04",
    "sourceBranch": "fallback congelado no merge #335",
    "summary": "Fallback embutido, CONGELADO no último merge (#335, 04/08/2026): CHECKLIST P1 render-envelope + menu do builder. backend 2115/2115, smoke 1003/1003, Flutter 839/839, 135 blocos. Servido por HTTP, o painel hidrata dos JSON e mostra o estado corrente.",
  },
  "kpis": [
    {
      "label": "FIX-NAV-MENU-PLATFORM-JWT",
      "value": "Menu Platform sob JWT restaurado",
      "note": "Navigation usa opt-in explícito para o pseudo-tenant platform; demais consumidores seguem fail-closed, JWT e headers legados convergem no tenantContext e tenants reais preservam RBAC persistente."
    },
    {
      "label": "Ω4 (PÓS-FASE 1)",
      "value": "Financeiro do tenant completo (8 agregados)",
      "note": "Contas, Titulo AR/AP com CHOKEPOINT de fechamento, Faturamento anti-refaturamento, Caixa/Extrato + liquidacao, Conciliacao bancaria, Fechamento/trava retroativa, Cheque (mutex + compensa via chokepoint), Dashboard real (agregado backend, front nunca soma). Junta adversarial + pos-analise por agregado; backend 989->1242 (0 fail, 6 skip), smoke 486->514; Flutter/mobile inalterados; D-Ω4-KPI-RELATORIO reconciliado (PRs #206-#225)."
    },
    {
      "label": "Ω3F (Fase 1)",
      "value": "Hub operacional da OS ponta a ponta + ações de linha",
      "note": "10 abas/capacidades do hub de OS via revelacao progressiva C2 (Financeiro x1,5, Orcamento, Comentarios, Anexos, Cancelar/Duplicar/Imprimir, Quilometragem, Mobile, Logs, Mapa) + acoes de linha na lista; junta adversarial + pos-analise por bloco; backend 799->989 (0 fail, 6 skip), smoke 378->486; Flutter/mobile inalterados; D-Ω3F-KPI-RELATORIO reconciliado (PRs #184-#204)."
    },
    {
      "label": "Ω-INFRA-4",
      "value": "Backup + restore comprovado + observabilidade",
      "note": "backup-database.mjs (pg_dump -Fc -> S3 SSE, retencao segura) + backup-database.yml GATED + uptime cron + PD-INFRA-2 (Fly-native US$0). DRILL DE RESTORE COMPROVADO AO VIVO: script REAL -> MinIO -> download -> pg_restore ~3,6s -> integridade exata (62 policies RLS) + isolamento por tenant sob role nao-superuser. Design-junta 3/3 condicionado. FECHA o saneamento (PRs 1-7). Ativacao=hand-off."
    },
    {
      "label": "Ω-INFRA-3",
      "value": "Produção config-as-code + CORS/seed fixes",
      "note": "fly.production.toml api+web (min>=1, force_https, sem seed) + deploy-production.yml GATED (promocao por imagem, trava dupla real) + smoke-production. FIX P-SAN-CORS + P-SAN-SEED-GUARD. +15 testes. Junta J-SAN-PROD-CODE 4/4. PR #182/4a2db09."
    },
    {
      "label": "Ω-INFRA-2",
      "value": "Staging config-as-code",
      "note": "fly.staging.toml api+web (gru, liveness/readiness, scale-to-zero) + nginx template envsubst (validado ao vivo) + CD GATED (SKIPPED ate ativar, main verde) + smoke (/health/ready+login+/me). Junta-de-codigo J-SAN-5 3/3. PR #181/b772103."
    },
    {
      "label": "JUNTA-MAPAS",
      "value": "Junta de Mapas criada",
      "note": "3 agentes em cadeia (planejador->dev->avaliador) para toda tarefa de mapa/geo + docs/maps/kb-mapas.md (precos SKU, ToS de cache, versoes Flutter, tudo datado 2026) + D-JUNTA-MAPAS. Docs/agentes-only: nada ativado. MapLibre permanece base web; Google/SKU pago = PD + junta de 5."
    },
    {
      "label": "B-124",
      "value": "Dashboard web enriquecido",
      "note": "Dashboard compoe work-orders + operations/dispatches + field-locations/latest + notifications (+ approvals/pending); 8 KPIs, fila critica combinada, despachos, status de campo e eventos derivados."
    },
    {
      "label": "B-123",
      "value": "Fluxo de OS fiel",
      "note": "7 telas do fluxo de OS mobile alinhadas ao prototipo (visual-only); estados semanticos por tokens."
    },
    {
      "label": "B-122",
      "value": "Alinhamento visual",
      "note": "Perfil do operador fiel ao prototipo aprovado; sem dados tecnicos crus na UI."
    },
    {
      "label": "B-121",
      "value": "MVP integrado Web/Mobile",
      "note": "Web MVP ligado aos endpoints reais + hardening mobile (timeline, auto-sync root, adapter, base URL)."
    },
    {
      "label": "Flutter",
      "value": "839/839",
      "note": "Fallback congelado no merge #335 (04/08/2026). O valor corrente é hidratado de Kpis/kpis-latest.json."
    },
    {
      "label": "Frontend smoke",
      "value": "1003/1003",
      "note": "Fallback congelado no merge #335 (04/08/2026). O valor corrente é hidratado de Kpis/kpis-latest.json."
    },
    {
      "label": "Backend tests",
      "value": "2115/2115",
      "note": "Fallback congelado no merge #335 (04/08/2026). O valor corrente é hidratado de Kpis/kpis-latest.json."
    },
    {
      "label": "Blocos concluídos",
      "value": "135",
      "note": "Fallback congelado no merge #335 (04/08/2026). O valor corrente é hidratado de Kpis/kpis-latest.json."
    },
    {
      "label": "Mobile contracts",
      "value": "18/18",
      "note": "tests/mobile-backend-contracts.test.ts (inalterado)."
    },
    {
      "label": "Mobile + Core SaaS",
      "value": "21/21",
      "note": "mobile-backend-contracts + core-saas-contract (inalterado)."
    },
    {
      "label": "MVP demo",
      "value": "99%",
      "note": "Fallback congelado no merge #335 (04/08/2026). O valor corrente é hidratado de Kpis/kpis-latest.json. Percentual estimado, sujeito a revisão humana."
    },
    {
      "label": "MVP vendavel",
      "value": "88%",
      "note": "Fallback congelado no merge #335 (04/08/2026). O valor corrente é hidratado de Kpis/kpis-latest.json. Percentual estimado, sujeito a revisão humana."
    }
  ],
  "blocks": [
    {
      "id": "B-102",
      "title": "Checklist answers sync",
      "status": "concluido",
      "progress": 100,
      "summary": "Respostas/notas/conclusao para runs backend-ready."
    },
    {
      "id": "B-103",
      "title": "OS status sync",
      "status": "parcial",
      "progress": 75,
      "summary": "statusUpdate backend-ready para Work Orders."
    },
    {
      "id": "B-104",
      "title": "Upload real de evidencias",
      "status": "parcial",
      "progress": 75,
      "summary": "Multipart local/dev com blob opaco e checksum."
    },
    {
      "id": "B-105",
      "title": "GPS/mapa operacional",
      "status": "parcial",
      "progress": 68,
      "summary": "Provider abstrato, Field Location, mapa simples e sync manual."
    },
    {
      "id": "B-106",
      "title": "Adapter GPS nativo",
      "status": "parcial",
      "progress": 76,
      "summary": "Geolocator, permissao when-in-use, opt-in explicito e captura manual."
    },
    {
      "id": "B-107",
      "title": "OS local-only mapping",
      "status": "parcial",
      "progress": 82,
      "summary": "work_order.create, serverId mapping e conflito manual inicial."
    },
    {
      "id": "B-108",
      "title": "Hardening de evidencias/storage",
      "status": "parcial",
      "progress": 86,
      "summary": "Storage provider protegido, scanner testavel, evfile_* e auditoria segura."
    },
    {
      "id": "B-109",
      "title": "Aprovacao operacional real",
      "status": "concluido",
      "progress": 100,
      "summary": "GET /approvals/pending e POST /approve|/reject no backend."
    },
    {
      "id": "B-121",
      "title": "MVP integrado Web/Mobile",
      "status": "concluido",
      "progress": 100,
      "summary": "Web MVP nos endpoints reais (OS lista/detalhe, Dashboard, Aprovacao, nav) + hardening mobile (timeline, auto-sync root, adapter, base URL)."
    },
    {
      "id": "B-122",
      "title": "Alinhamento visual ao prototipo aprovado",
      "status": "concluido",
      "progress": 100,
      "summary": "Perfil do operador fiel ao perfil.png, sem dados tecnicos crus; auditoria das telas MVP registrada."
    },
    {
      "id": "B-123",
      "title": "Fidelidade visual do fluxo de OS mobile",
      "status": "concluido",
      "progress": 100,
      "summary": "7 telas do fluxo de OS alinhadas ao prototipo (visual-only): lista, detalhe/check-in, execucao, checklists, run, evidencias e sync."
    },
    {
      "id": "B-124",
      "title": "Dashboard web enriquecido com despachos e localizacoes",
      "status": "concluido",
      "progress": 100,
      "summary": "Dashboard web compoe work-orders + operations/dispatches + field-locations/latest + notifications (+ approvals/pending): 8 KPIs derivados, fila critica combinada, despachos ativos, status de campo real (stale 15 min), alertas acionaveis e eventos das listas. Web-only; smoke 44/44."
    }
  ],
  "contracts": [
    {
      "domain": "Web MVP",
      "status": "concluido",
      "endpoints": [
        "GET /api/v1/work-orders (+/:id, /:id/timeline)",
        "GET /api/v1/operations/dispatches",
        "GET /api/v1/field-locations/latest",
        "GET /api/v1/approvals/pending + POST /approve|/reject",
        "GET /api/v1/notifications/unread-count",
        "GET /api/v1/navigation/menu"
      ],
      "detail": "B-121 religou lista/detalhe de OS, Dashboard, Aprovacao e nav MVP-only; B-124 enriqueceu o Dashboard com operations/dispatches + field-locations/latest (+ approvals/pending), fila critica combinada e status de campo real (mock atras de VITE_USE_MOCKS, fallback por fonte)."
    },
    {
      "domain": "Mobile hardening",
      "status": "concluido",
      "endpoints": [
        "GET /api/v1/work-orders/:id/timeline",
        "GET /api/v1/mobile/checklists/:id/render (fields + components)"
      ],
      "detail": "B-121 conectou a timeline real com fallback local, montou o auto-sync no app root e tornou a base URL configuravel por --dart-define."
    },
    {
      "domain": "Evidencias",
      "status": "parcial",
      "endpoints": [
        "POST /api/v1/mobile/evidence-uploads"
      ],
      "detail": "B-108 preserva multipart, valida MIME JPEG/PNG, limite 10 MB e checksum SHA-256, retorna file_id opaco evfile_* sem path/bucket/storage key/token/base64/binario."
    },
    {
      "domain": "KPIs mobile",
      "status": "concluido",
      "endpoints": [
        "Kpis/kpis-latest.json"
      ],
      "detail": "Historico: ate 2026-08-12 os numeros do Flutter viviam num painel proprio (mobile/flutter_app/Kpis/), apagado pela D-KPI-DUPLA-REVOGADA. A metrica flutter_tests passou a viver no painel unico."
    },
    {
      "domain": "KPIs raiz",
      "status": "concluido",
      "endpoints": [
        "Kpis/kpis-latest.json",
        "Kpis/index.html"
      ],
      "detail": "Reflete os percentuais mobile em Kpis/ conforme politica obrigatoria de KPIs duplos."
    }
  ],
  "domains": [
    {
      "name": "Flutter",
      "status": "parcial",
      "detail": "B-108 trata stored, rejected, scan_failed e pending_review, preservando evidencia local em erro."
    },
    {
      "name": "Evidencias",
      "status": "parcial",
      "detail": "Provider local protegido dev/test, EvidenceScanner Noop/Fake e auditoria segura accepted/rejected/scan_failed/stored."
    },
    {
      "name": "Politica KPIs duplos",
      "status": "vigente",
      "detail": "KPI por PR (D-KPI-PER-PR, 2026-07-13): todo PR que altere codigo/teste/escopo atualiza os KPIs no proprio PR com contagem real; a junta do PR valida. A publicacao pos-avaliacao humana foi REVOGADA. Politica dupla mobile/raiz mantida."
    }
  ],
  "validations": [
    {
      "name": "flutter analyze + flutter test",
      "result": "limpo + pass 764/764 na PR #119"
    },
    {
      "name": "frontend check/build/test:smoke",
      "result": "pass 44/44 na PR #125 (B-124: 33 -> 44); check e build OK"
    },
    {
      "name": "mobile-backend-contracts",
      "result": "pass 18/18 (inalterado; backend nao tocado)"
    },
    {
      "name": "mobile + Core SaaS contracts",
      "result": "pass 21/21 (inalterado; backend nao tocado)"
    },
    {
      "name": "PR #117",
      "result": "merged 38facb24a3bc8592cc3ccd6c11d4e428420532ed"
    },
    {
      "name": "PR #118",
      "result": "merged f05566828a2b05d9c4400112d66be490477f0a17"
    },
    {
      "name": "PR #119",
      "result": "merged e851fd35e141545401abfc0fac774f62e1c2f615"
    },
    {
      "name": "PR #121",
      "result": "merged fc7e17810940edf933b5e4a2071f8f456e05d4e9"
    },
    {
      "name": "PR #123",
      "result": "merged 2537558f3f078425c13119a60445e960aac26bb2 (head 24d439072778438ed3de837fc66a4ef6bce31944)"
    },
    {
      "name": "PR #125",
      "result": "merged dcfa25063111532f8cc1c77d7af8ec4519406bb0 (head 6605b13630e3f29f98670aabf9ee32e274f40d47)"
    },
    {
      "name": "Politica KPI",
      "result": "B-124 foi publicado sob a politica ANTERIOR (pos-avaliacao humana, PR #125); desde 2026-07-13 vale KPI-por-PR (D-KPI-PER-PR)"
    }
  ],
  "estimates": [
    {
      "label": "MVP demo",
      "value": "96%",
      "detail": "Mantido no valor oficial publicado (estimado); sem decisao humana para alterar no B-124."
    },
    {
      "label": "MVP vendavel",
      "value": "78%",
      "detail": "Mantido no valor oficial publicado (estimado); sem decisao humana para alterar no B-124."
    }
  ],
  "risks": [
    {
      "title": "Storage externo final pendente",
      "severity": "medio",
      "detail": "S3/presigned real e download protegido final permanecem fora do B-108."
    },
    {
      "title": "Antivirus real pendente",
      "severity": "medio",
      "detail": "B-108 entrega scanner testavel Noop/Fake, nao antivirus real."
    },
    {
      "title": "DB/Redis receipt pendente",
      "severity": "medio",
      "detail": "Persistencia duravel de recibos de arquivo permanece pendente."
    }
  ],
  "nextBlocks": [
    {
      "id": "B-12x",
      "title": "Storage externo de evidencias",
      "detail": "S3/presigned real, antivirus real, download protegido e retencao."
    },
    {
      "id": "B-12x",
      "title": "Settings web com backend dedicado",
      "detail": "Settings web segue mock-only; falta backend de configuracao da organizacao."
    }
  ],
  "history": [
    {
      "date": "2026-07-05",
      "title": "B-124",
      "detail": "Dashboard web enriquecido com despachos e localizacoes (web-only): work-orders + operations/dispatches + field-locations/latest + notifications (+ approvals/pending), 8 KPIs, fila critica combinada, status de campo real. Flutter 764/764 inalterado, smoke 44/44, 49 blocos."
    },
    {
      "date": "2026-07-05",
      "title": "B-123",
      "detail": "Fidelidade visual do fluxo de OS mobile (visual-only): 7 telas alinhadas ao prototipo. Flutter 764/764, 48 blocos."
    },
    {
      "date": "2026-07-05",
      "title": "B-122",
      "detail": "Alinhamento visual ao prototipo aprovado: Perfil do operador fiel ao perfil.png, sem dados tecnicos crus. Flutter 764/764, 47 blocos."
    },
    {
      "date": "2026-07-05",
      "title": "B-121",
      "detail": "MVP integrado Web/Mobile: web nos endpoints reais + hardening mobile. Flutter 764/764, smoke 33/33, MVP demo 96%, MVP vendavel 78%, 46 blocos (consolida B-109 a B-120)."
    },
    {
      "date": "2026-06-18",
      "title": "B-108",
      "detail": "Hardening de evidencias/storage, EvidenceStorageProvider, EvidenceScanner, evfile_*, Flutter 662/662, MVP demo 93%, MVP vendavel 76%, 38 blocos."
    },
    {
      "date": "2026-06-18",
      "title": "B-107",
      "detail": "Criacao remota de OS local-only, localId -> serverId, conflito manual inicial, Flutter 654/654, MVP demo 92%, MVP vendavel 72%, 37 blocos."
    },
    {
      "date": "2026-06-18",
      "title": "B-106",
      "detail": "Adapter GPS nativo real, permissoes when-in-use, opt-in explicito, Flutter 633/633, MVP demo 90%, MVP vendavel 68%, 36 blocos."
    },
    {
      "date": "2026-06-17",
      "title": "B-152F",
      "detail": "Registro historico: na epoca do B-105 havia dois paineis em paridade manual. A politica dupla foi revogada em 2026-08-12 (D-KPI-DUPLA-REVOGADA) e o painel passou a ser um so."
    },
    {
      "date": "2026-06-15",
      "title": "KPI-DASHBOARD-001",
      "detail": "Criado painel permanente Kpis/."
    }
  ]
};

function renderDashboard(data) {
  setText("project-title", data.project.name);
  setText("dashboard-version", data.project.version);
  setText("last-updated", data.project.updatedAt);
  setText("source-branch", data.project.sourceBranch);
  setText("project-summary", data.project.summary);
  renderKpis(data.kpis);
  renderTimeline(data.blocks);
  renderProgress(data.blocks);
  renderContractMap(data.contracts);
  renderDomainStatus(data.domains);
  renderValidations(data.validations);
  renderEstimates(data.estimates);
  renderRisks(data.risks);
  renderNextBlocks(data.nextBlocks);
  renderHistory(data.history);
}

function renderKpis(items) {
  renderInto("kpi-cards", items, (item) => `
    <article class="kpi-card">
      <div class="kpi-card__label">${escapeHtml(item.label)}</div>
      <div class="kpi-card__value">${escapeHtml(item.value)}</div>
      <p class="kpi-card__note">${escapeHtml(item.note)}</p>
    </article>
  `);
}

function renderTimeline(items) {
  renderInto("timeline", items, (item) => `
    <article class="timeline-item" data-status="${escapeHtml(item.status)}">
      ${statusBadge(item.status)}
      <h3>${escapeHtml(item.id)} - ${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.summary)}</p>
    </article>
  `);
}

function renderProgress(items) {
  renderInto("contract-progress", items, (item) => `
    <article class="progress-item">
      <div class="progress-top"><span>${escapeHtml(item.id)}</span><span>${item.progress}%</span></div>
      <div class="progress-bar" data-status="${escapeHtml(item.status)}"><span style="width: ${clampPercent(item.progress)}%"></span></div>
    </article>
  `);
}

function renderContractMap(items) {
  renderInto("contract-map", items, (item) => `
    <article class="contract-card">
      <header><h3>${escapeHtml(item.domain)}</h3>${statusBadge(item.status)}</header>
      <p>${escapeHtml(item.detail)}</p>
      ${item.endpoints.length > 0 ? `<ul>${item.endpoints.map((endpoint) => `<li>${escapeHtml(endpoint)}</li>`).join("")}</ul>` : ""}
    </article>
  `);
}

function renderDomainStatus(items) {
  renderInto("domain-status", items, (item) => `
    <article class="status-row">
      <header><h3>${escapeHtml(item.name)}</h3>${statusBadge(item.status)}</header>
      <p>${escapeHtml(item.detail)}</p>
    </article>
  `);
}

function renderValidations(items) {
  renderInto("validation-list", items, (item) => `<article class="validation-item"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.result)}</span></article>`);
}

function renderEstimates(items) {
  renderInto("estimate-list", items, (item) => `
    <article class="estimate-card">
      <h3>${escapeHtml(item.label)}</h3>
      <strong>${escapeHtml(item.value)}</strong>
      <p>${escapeHtml(item.detail)}</p>
    </article>
  `);
}

function renderRisks(items) {
  renderInto("risk-list", items, (item) => `
    <article class="risk-item" data-severity="${escapeHtml(item.severity)}">
      <header><h3>${escapeHtml(item.title)}</h3>${statusBadge(item.severity === "alto" ? "risco" : "parcial")}</header>
      <p>${escapeHtml(item.detail)}</p>
    </article>
  `);
}

function renderNextBlocks(items) {
  renderInto("next-blocks", items, (item) => `
    <article class="next-item">
      <header><h3>${escapeHtml(item.id)}</h3>${statusBadge("planejado")}</header>
      <p><strong>${escapeHtml(item.title)}.</strong> ${escapeHtml(item.detail)}</p>
    </article>
  `);
}

function renderHistory(items) {
  renderInto("history-summary", items, (item) => `
    <article class="history-item">
      <header><h3>${escapeHtml(item.title)}</h3><span>${escapeHtml(item.date)}</span></header>
      <p>${escapeHtml(item.detail)}</p>
    </article>
  `);
}

function statusBadge(status) {
  return `<span class="status-badge" data-status="${escapeHtml(status)}">${escapeHtml(status)}</span>`;
}

function renderInto(id, items, template) {
  const element = document.getElementById(id);
  if (!element) return;
  element.innerHTML = items.map(template).join("");
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Render síncrono do fallback embutido (honesto no último merge; usado quando file:// bloqueia o fetch).
renderDashboard(dashboardData);

// Hidratação HONESTA em runtime: sobrescreve versão/data/resumo, os cards de métrica e o histórico
// a partir de Kpis/kpis-latest.json e Kpis/kpis-history.json — a fonte de verdade atualizada por PR
// com contagem de execução REAL. Se aberto via file:// (sem servidor), o fetch falha e o fallback
// embutido permanece. Servir a pasta por HTTP mostra sempre o estado corrente.
function metricCard(label, metric) {
  if (!metric) return null;
  const value = metric.display || (metric.value != null ? String(metric.value) : "");
  return { label, value, note: metric.note || "" };
}
async function hydrateFromLatest() {
  if (typeof fetch !== "function") return;
  let latest = null;
  let history = null;
  try {
    const [lr, hr] = await Promise.all([
      fetch("./kpis-latest.json", { cache: "no-store" }),
      fetch("./kpis-history.json", { cache: "no-store" }),
    ]);
    if (lr && lr.ok) latest = await lr.json();
    if (hr && hr.ok) history = await hr.json();
  } catch (_) {
    return; // file:// ou offline → mantém o fallback embutido honesto
  }
  if (latest && latest.metrics) {
    const m = latest.metrics;
    const rel = latest.release || {};
    if (latest.version) setText("dashboard-version", latest.version);
    if (rel.summary) setText("project-summary", rel.summary);
    if (Array.isArray(history) && history.length) {
      const last = history[history.length - 1];
      if (last && last.snapshot_date) setText("last-updated", last.snapshot_date);
    }
    const liveCards = [];
    if (rel.status_label || rel.summary) {
      const prTag = rel.pr ? ` (#${rel.pr})` : (rel.status === "published_per_pr" ? " (aguardando merge)" : "");
      liveCards.push({ label: (latest.version || "Rodada atual") + prTag, value: rel.title || rel.status_label || "", note: rel.summary || rel.status_label || "" });
    }
    [
      metricCard("Backend tests", m.backend_tests),
      metricCard("Frontend smoke", m.frontend_smoke_tests),
      metricCard("Flutter", m.flutter_tests),
      metricCard("Blocos concluídos", m.blocks_completed),
      metricCard("MVP demo", m.mvp_demo),
      metricCard("MVP vendável", m.mvp_vendavel),
    ].forEach((c) => { if (c) liveCards.push(c); });
    // Preserva as narrativas históricas de rodadas anteriores após as métricas correntes vivas.
    // A1-c2 (junta): a comparação era por string EXATA e o embutido tinha "MVP vendavel" sem
    // acento e sinônimos ("Blocos entregues") — o card rançoso de 07/07 aparecia AO LADO do
    // vivo na mesma grade. Agora a exclusão é normalizada (sem acento, caixa baixa) e cobre os
    // rótulos-métrica históricos: métrica embutida NUNCA convive com a métrica hidratada.
    const normalizeLabel = (label) => String(label || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    const METRIC_LABELS = new Set([
      "backend tests", "frontend smoke", "flutter", "blocos concluidos", "blocos entregues",
      "mvp demo", "mvp vendavel", "mobile contracts", "mobile + core saas", "escopo b-124k",
    ]);
    const narrative = (dashboardData.kpis || []).filter((k) => !METRIC_LABELS.has(normalizeLabel(k.label)));
    renderKpis(liveCards.concat(narrative));
    // M4-c2: sem sobrescrever, a "Fonte" mostrava a branch embutida de um PR antigo ao lado da
    // versão corrente. A fonte real do painel hidratado são os JSON.
    setText("source-branch", latest.source_branch || "Kpis/*.json (runtime)");
  }
  if (Array.isArray(history) && history.length) {
    const hist = history
      .slice()
      .reverse()
      .map((h) => ({
        date: h.snapshot_date || "",
        title: h.version + (h.pr ? ` · #${h.pr}` : "") + (h.merge_commit ? ` · ${h.merge_commit}` : ""),
        detail: h.description || `backend ${h.backend_tests || "?"} · smoke ${h.frontend_smoke || "?"} · flutter ${h.flutter_tests || "?"} · blocos ${h.blocks_completed ?? "?"}`,
      }));
    renderHistory(hist);
    // M8/N1 — frescor coerente: os gráficos só aparecem quando o `latest` TAMBÉM chegou.
    // Sem este gate, um 404 só no kpis-latest.json deixaria cards congelados (fallback) ao
    // lado de gráficos correntes — duas épocas na mesma tela, sem aviso.
    if (latest && latest.metrics) renderCharts(history);
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// D-KPI-INDEX-PAINEL — o painel (index.html) é o artefato PRINCIPAL de acompanhamento,
// não os JSON. Gráficos em SVG inline, ZERO dependência (PD-004). Toda série sai do
// kpis-history.json (contagem real por PR); sem servidor (file://) o fetch falha, a seção
// fica escondida, o aviso honesto aparece e NADA é inventado (D-007).
//
// Correções da junta (ciclo 1 REPROVADO — ver agent-orchestration/omega/reprovacoes/
// R-kpi-painel-ciclo1.md). `critico-adversarial` + `cognicao-visual`:
//  A1  o `hidden` era decorativo: `.section-grid--tight{display:block}` (origem autor) vencia
//      o `[hidden]{display:none}` do UA → 4 caixas vazias em file://. Corrigido no CSS.
//  A2  o ritmo somava métricas com `|| 0`: métrica ausente virava zero e FABRICAVA um pico de
//      +969 que nunca existiu (e achatava as 24 barras reais). Agora o delta é POR MÉTRICA e
//      só conta quando os dois lados existem; a chave legada `frontend_smoke` é reconciliada.
//  A4  `buildChartSeries` é exposta para o guard comparar a SÉRIE com o JSON (o guard antigo
//      passava verde com série 100% fabricada).
//  B3a small multiples: cada trilha com escala própria (a escala compartilhada achatava o
//      Flutter, que cresceu 37%, numa reta). B3b viewBox por painel (1 unidade ≈ 1px CSS).
//  M5  queda real vira barra âmbar com sinal, nunca zero silencioso.
//  M6  `roundOf` testa as rodadas ANTES do substring de checklist (senão Ω-VID PR-08 caía em
//      "Checklist"). M7 corte em 19/07 (quando o registro por PR virou contínuo).
//  F4  eixo X proporcional à DATA real + tick final. F6 cores por token. F9 lacuna de medição
//      não é interpolada. F10 escala Y redonda. F11 tabela sr-only + aria-describedby.
//  B10 `metricNumber` tolera número formatado ("1.003/1.003" já não vira 1).
// ───────────────────────────────────────────────────────────────────────────────
const CHART_COLORS = {
  backend: "var(--chart-1)",
  frontend: "var(--chart-2)",
  flutter: "var(--chart-3)",
  blocks: "var(--chart-4)",
  neutral: "var(--chart-bar)",
  negative: "var(--partial)",
};
const CHART_GRID = "var(--chart-grid)";
const CHART_AXIS = "var(--chart-axis)";
const CHART_VALUE = "var(--chart-value)";
const CHART_SURFACE = "var(--panel)";

// A política KPI-por-PR foi decidida em 13/07/2026 (D-KPI-PER-PR), mas o registro só virou
// CONTÍNUO em 19/07 — antes disso uma rodada inteira cabia num snapshot (Ω4 = 1 registro para
// 21 PRs). Comparar barras dos dois regimes mentiria, então o gráfico de rodadas corta aqui.
const KPI_PER_PR_SINCE = "2026-07-19";

const TRACK_KEYS = ["backend_tests", "frontend_smoke_tests", "flutter_tests"];

/** Quantas entregas o gráfico de ritmo mostra (janela de leitura, não de cálculo). */
const VELOCITY_WINDOW = 24;

/** "2107/2107" | "1.003/1.003" | 2107 → 2107. `null` quando não há número honesto (nunca vira 0). */
function metricNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const digits = String(raw).split("/")[0].replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

/** O history usa `frontend_smoke` em 28 snapshots antigos e `frontend_smoke_tests` nos novos. */
function smokeOf(row) {
  return row.frontend_smoke_tests != null ? row.frontend_smoke_tests : row.frontend_smoke;
}

function trackValue(row, key) {
  return metricNumber(key === "frontend_smoke_tests" ? smokeOf(row) : row[key]);
}

function setChartHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function ptBr(value) {
  return Number(value).toLocaleString("pt-BR");
}

function shortDate(iso) {
  const parts = String(iso || "").split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : String(iso || "");
}

/** Passo "redondo" (1/2/5 × 10^n) — o eixo Y não pode sair com 571, 1.142, 1.713… (F10). */
function niceStep(raw) {
  if (!(raw > 0)) return 1;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/** Dias desde a época a partir do `snapshot_date` (UTC puro — sem depender do fuso do leitor). */
function dayIndex(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** Rodada a partir do campo `version` do history. Rodada vence substring (M6). */
function roundOf(version) {
  const v = String(version || "").toUpperCase().replace(/^Ω/, "OMEGA");
  if (v.startsWith("TELAS")) return "Telas";
  if (v.startsWith("OMEGA-VID")) return "Ω-VID";
  if (v.startsWith("OMEGA5P")) return "Ω5P";
  if (v.startsWith("OMEGA4C")) return "Ω4C";
  if (v.startsWith("OMEGA4")) return "Ω4";
  if (v.startsWith("OMEGA3")) return "Ω3";
  if (v.startsWith("OMEGA-GATE") || v.startsWith("OMEGA-GOV") || v.startsWith("OMEGA-DOCS") || v.startsWith("OMEGA-INFRA") || v.startsWith("SAN")) return "Saneamento";
  if (v.startsWith("GOV-")) return "Governança";
  if (v.startsWith("WS-MAPA") || v.startsWith("M7-SLA") || v.startsWith("JUNTA-MAPAS") || v.startsWith("GOOGLE-MAPS")) return "Mapa";
  if (v.startsWith("WS-") || v.startsWith("PR-SCALE") || v.startsWith("ONDA")) return "Onda 1";
  if (v.startsWith("CHK") || v.startsWith("CHECKLIST")) return "Checklist";
  if (v.startsWith("FIX-") || v.startsWith("KPI-")) return "Correções";
  if (v.startsWith("OMEGA")) return "Ω";
  if (v.startsWith("B-") || v.startsWith("BLOCO")) return "Blocos B";
  return "Outras";
}

/**
 * Deriva TODAS as séries do painel a partir do history bruto — função pura, sem DOM.
 * Exposta de propósito: o guard (`tests/kpi-dashboard-charts.test.ts`) compara o que sai daqui
 * com o que ele mesmo calcula do JSON, para que série fabricada não passe verde (A4).
 */
function buildChartSeries(history) {
  const rows = (history || []).filter((h) => h && h.snapshot_date);
  const dates = rows.map((h) => h.snapshot_date);

  const tracks = [
    { key: "backend_tests", label: "Backend", color: CHART_COLORS.backend },
    { key: "frontend_smoke_tests", label: "Frontend (smoke)", color: CHART_COLORS.frontend },
    { key: "flutter_tests", label: "Flutter", color: CHART_COLORS.flutter },
  ]
    .map((t) => {
      const points = rows.map((h) => trackValue(h, t.key));
      const real = points.filter((p) => p !== null);
      // Crescimento só sobre a JANELA recente. Percentual desde o início mentiria: o backend saiu
      // de 15 (só o core-saas) para 766 (suíte inteira) num RE-BASELINE de medição em 13/07 — a
      // manchete diria "+14000%" de crescimento que nunca houve.
      const from = Math.max(1, points.length - VELOCITY_WINDOW);
      let recent = 0;
      for (let i = from; i < points.length; i += 1) {
        const a = points[i - 1];
        const b = points[i];
        if (a !== null && b !== null) recent += b - a;
      }
      return { ...t, points, first: real[0], last: real[real.length - 1], measured: real.length, recent };
    })
    .filter((t) => t.measured > 1);

  const blocks = rows.map((h) => metricNumber(h.blocks_completed));

  const byRound = new Map();
  rows
    .filter((h) => String(h.snapshot_date) >= KPI_PER_PR_SINCE)
    .forEach((h) => {
      const round = roundOf(h.version);
      const entry = byRound.get(round) || { value: 0, since: h.snapshot_date };
      entry.value += 1;
      byRound.set(round, entry);
    });
  const rounds = Array.from(byRound.entries())
    .sort((a, b) => String(a[1].since).localeCompare(String(b[1].since)))
    .map(([label, entry]) => ({ label, value: entry.value, color: CHART_COLORS.backend }));

  // Delta POR MÉTRICA e só quando os dois lados foram medidos (A2). Queda real é preservada
  // com sinal (M5) — o gráfico nunca zera uma regressão em silêncio.
  const velocity = [];
  for (let i = 1; i < rows.length; i += 1) {
    const value = TRACK_KEYS.reduce((acc, key) => {
      const a = trackValue(rows[i - 1], key);
      const b = trackValue(rows[i], key);
      return acc + (a !== null && b !== null ? b - a : 0);
    }, 0);
    velocity.push({ label: shortDate(dates[i]), value });
  }
  // O painel desenha só as 24 últimas — janela exposta de propósito para o guard auditar
  // exatamente o que é DESENHADO (fora dela há re-baselines de medição, ex.: 05/07→13/07, quando
  // `backend_tests` deixou de contar só o core-saas e passou a contar a suíte inteira: +751 que
  // não foi entrega nenhuma). Se um re-baseline desses entrar na janela, o guard acusa.
  const velocityWindow = velocity.slice(-VELOCITY_WINDOW);

  return { rows, dates, tracks, blocks, rounds, velocity, velocityWindow };
}

/**
 * Gráfico de linhas. `series`: [{label, color, points: (number|null)[]}].
 * `dates`: ISO por ponto — o eixo X é proporcional ao TEMPO REAL (F4), não ao índice.
 */
function lineChart(series, dates, options) {
  const opt = options || {};
  const W = opt.width || 960;
  const H = opt.height || 260;
  const padL = opt.compact ? 44 : 56;
  const padR = 16;
  const padT = 14;
  const padB = opt.showAxis === false ? 12 : 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const values = series.flatMap((s) => s.points.filter((p) => p !== null));
  if (!values.length) return "";

  const max = Math.max(...values);
  const min = Math.min(...values);
  const stepY = niceStep((max - (opt.zeroBased ? 0 : min)) / 3 || max / 3);
  const bottom = opt.zeroBased ? 0 : Math.max(0, Math.floor(min / stepY) * stepY);
  const top = Math.max(Math.ceil(max / stepY) * stepY, bottom + stepY);
  const range = top - bottom;

  const times = dates.map(dayIndex);
  const first = times.find((t) => t !== null) || 0;
  const last = times.filter((t) => t !== null).pop() || first + 1;
  const spanT = last - first || 1;
  const px = (i) => (times[i] === null ? padL : padL + ((times[i] - first) / spanT) * innerW);
  const py = (v) => padT + innerH - ((v - bottom) / range) * innerH;

  let grid = "";
  for (let v = bottom; v <= top + stepY * 0.001; v += stepY) {
    const y = py(v);
    grid += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="${CHART_GRID}" stroke-width="1" />`;
    grid += `<text x="${padL - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="${CHART_AXIS}" font-size="11">${escapeHtml(ptBr(v))}</text>`;
  }

  let paths = "";
  series.forEach((s) => {
    // F9 — lacuna de medição NÃO é interpolada: cada trecho contíguo é uma polyline própria e
    // o salto sobre a lacuna vira tracejado translúcido (dá para VER que ali não houve medição).
    const runs = [];
    let current = [];
    s.points.forEach((v, i) => {
      if (v === null) {
        if (current.length) runs.push(current);
        current = [];
        return;
      }
      current.push({ x: px(i), y: py(v) });
    });
    if (current.length) runs.push(current);
    if (!runs.length) return;
    const color = escapeHtml(s.color);

    if (opt.fill && runs.length === 1) {
      const pts = runs[0];
      const baseY = (padT + innerH).toFixed(1);
      const poly = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
      paths += `<polygon points="${pts[0].x.toFixed(1)},${baseY} ${poly} ${pts[pts.length - 1].x.toFixed(1)},${baseY}" fill="${color}" opacity="0.12" />`;
    }
    runs.forEach((pts, idx) => {
      if (idx > 0) {
        const a = runs[idx - 1][runs[idx - 1].length - 1];
        const b = pts[0];
        paths += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${color}" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.45" />`;
      }
      if (pts.length === 1) {
        paths += `<circle cx="${pts[0].x.toFixed(1)}" cy="${pts[0].y.toFixed(1)}" r="2" fill="${color}" />`;
        return;
      }
      paths += `<polyline points="${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}" fill="none" stroke="${color}" stroke-width="${opt.compact ? 2 : 2.25}" stroke-linejoin="round" stroke-linecap="round" />`;
    });
    const tail = runs[runs.length - 1];
    const end = tail[tail.length - 1];
    paths += `<circle cx="${end.x.toFixed(1)}" cy="${end.y.toFixed(1)}" r="4" fill="${CHART_SURFACE}" stroke="${color}" stroke-width="2.5" />`;
  });

  // F4 — ticks pelas datas reais, com o ÚLTIMO ponto sempre rotulado.
  let axis = "";
  if (opt.showAxis !== false) {
    const idxs = [];
    for (let t = 0; t <= 4; t += 1) idxs.push(Math.round((t / 4) * (dates.length - 1)));
    if (idxs[idxs.length - 1] !== dates.length - 1) idxs.push(dates.length - 1);
    Array.from(new Set(idxs)).forEach((i) => {
      axis += `<text x="${px(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" fill="${CHART_AXIS}" font-size="11">${escapeHtml(shortDate(dates[i]))}</text>`;
    });
  }

  const described = opt.describedBy ? ` aria-describedby="${escapeHtml(opt.describedBy)}"` : "";
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(opt.aria || "Gráfico de evolução")}"${described} class="chart-svg">${grid}${paths}${axis}</svg>`;
}

/** Barras verticais. Valor 0 não desenha barra (F14); valor negativo desenha em âmbar (M5). */
function barChart(items, options) {
  const opt = options || {};
  const W = opt.width || 960;
  const H = opt.height || 220;
  const padL = 20;
  const padR = 16;
  const padT = 20;
  const padB = opt.showLabels === false ? 26 : 44;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  if (!items.length) return "";
  const maxUp = Math.max(...items.map((i) => Math.max(0, i.value)), 1);
  const maxDown = Math.max(...items.map((i) => Math.max(0, -i.value)), 0);
  const scale = innerH / (maxUp + maxDown || 1);
  const zeroY = padT + maxUp * scale;
  const slot = innerW / items.length;
  const barW = Math.max(5, Math.min(52, slot * 0.6));

  let bars = "";
  items.forEach((item, i) => {
    const cx = padL + slot * i + slot / 2;
    if (item.value !== 0) {
      const h = Math.abs(item.value) * scale;
      const up = item.value > 0;
      const color = escapeHtml(up ? item.color || CHART_COLORS.neutral : CHART_COLORS.negative);
      bars += `<rect x="${(cx - barW / 2).toFixed(1)}" y="${(up ? zeroY - h : zeroY).toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(1, h).toFixed(1)}" rx="4" fill="${color}" />`;
      if (opt.showValues !== false) {
        const label = `${up ? "" : "−"}${ptBr(Math.abs(item.value))}`;
        bars += `<text x="${cx.toFixed(1)}" y="${(up ? zeroY - h - 6 : zeroY + h + 13).toFixed(1)}" text-anchor="middle" fill="${CHART_VALUE}" font-size="11" font-weight="700">${escapeHtml(label)}</text>`;
      }
    }
    if (opt.showLabels !== false) {
      bars += `<text x="${cx.toFixed(1)}" y="${H - 14}" text-anchor="middle" fill="${CHART_AXIS}" font-size="11">${escapeHtml(item.label)}</text>`;
    }
  });
  const base = `<line x1="${padL}" y1="${zeroY.toFixed(1)}" x2="${W - padR}" y2="${zeroY.toFixed(1)}" stroke="${CHART_GRID}" stroke-width="1" />`;
  const described = opt.describedBy ? ` aria-describedby="${escapeHtml(opt.describedBy)}"` : "";
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(opt.aria || "Gráfico de barras")}"${described} class="chart-svg">${base}${bars}</svg>`;
}

/**
 * Barras HORIZONTAIS — para dado categórico com rótulo de texto. Vertical colidia: 9 rodadas em
 * 620px dão 65px de slot e "Governança"/"Correções" a 11px pedem ~60px cada, encostando uma na
 * outra. Deitado, o rótulo lê na horizontal e cada linha respira.
 */
function hBarChart(items, options) {
  const opt = options || {};
  const W = opt.width || 620;
  const labelW = opt.labelWidth || 92;
  const valueW = 42;
  const rowH = 26;
  const padT = 8;
  const padR = 12;
  const H = padT * 2 + items.length * rowH;
  const trackW = W - labelW - valueW - padR;
  if (!items.length) return "";
  const max = Math.max(...items.map((i) => i.value), 1);

  let rows = "";
  items.forEach((item, i) => {
    const y = padT + i * rowH;
    const barH = 13;
    const w = Math.max(2, (item.value / max) * trackW);
    rows += `<text x="0" y="${(y + barH).toFixed(1)}" fill="${CHART_AXIS}" font-size="11" font-weight="700">${escapeHtml(item.label)}</text>`;
    rows += `<rect x="${labelW}" y="${(y + 3).toFixed(1)}" width="${trackW}" height="${barH}" rx="4" fill="${CHART_GRID}" opacity="0.5" />`;
    rows += `<rect x="${labelW}" y="${(y + 3).toFixed(1)}" width="${w.toFixed(1)}" height="${barH}" rx="4" fill="${escapeHtml(item.color || CHART_COLORS.neutral)}" />`;
    rows += `<text x="${(labelW + trackW + 8).toFixed(1)}" y="${(y + barH).toFixed(1)}" fill="${CHART_VALUE}" font-size="11" font-weight="800">${ptBr(item.value)}</text>`;
  });

  const described = opt.describedBy ? ` aria-describedby="${escapeHtml(opt.describedBy)}"` : "";
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(opt.aria || "Gráfico de barras")}"${described} class="chart-svg">${rows}</svg>`;
}

/** Tabela sr-only: leitor de tela precisa dos NÚMEROS — `role="img"` sozinho é mudo (F11). */
function srTable(id, caption, headers, rows) {
  const head = headers.map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${escapeHtml(String(c))}</th>` : `<td>${escapeHtml(String(c))}</td>`)).join("")}</tr>`)
    .join("");
  return `<table id="${escapeHtml(id)}" class="sr-only"><caption>${escapeHtml(caption)}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderCharts(history) {
  const section = document.getElementById("charts-section");
  if (!section) return;
  const data = buildChartSeries(history);
  if (data.rows.length < 2 || !data.tracks.length) return;
  const { dates, tracks, blocks, rounds, velocity } = data;
  const period = `${shortDate(dates[0])} a ${shortDate(dates[dates.length - 1])}`;

  // ── 1. Cobertura de testes — SMALL MULTIPLES (B3a): cada trilha com escala PRÓPRIA.
  //    O nível está na manchete de cada faixa; o gráfico mostra FORMA, não nível.
  setChartHtml(
    "chart-tests",
    tracks
      .map((t) => {
        // N5 — saldo negativo também aparece (simétrico ao M5 das barras): queda não se esconde.
        const growth = t.recent !== 0 ? `${t.recent > 0 ? "+" : "−"}${ptBr(Math.abs(t.recent))} nas ${VELOCITY_WINDOW} últimas entregas` : null;
        const chart = lineChart([{ label: t.label, color: t.color, points: t.points }], dates, {
          width: 1320,
          height: 92,
          compact: true,
          showAxis: false,
          aria: `${t.label}: de ${ptBr(t.first)} a ${ptBr(t.last)} testes entre ${period}, em ${t.measured} medições.`,
          describedBy: `sr-track-${t.key}`,
        });
        const table = srTable(
          `sr-track-${t.key}`,
          `${t.label} — contagem de testes por entrega`,
          ["Data", "Testes"],
          dates.map((d, i) => [d, t.points[i]]).filter((r) => r[1] !== null).map((r) => [r[0], ptBr(r[1])]),
        );
        return `<div class="chart-multi">
            <div class="chart-multi__head">
              <span class="chart-multi__label"><i style="background:${escapeHtml(t.color)}"></i>${escapeHtml(t.label)}</span>
              <span class="chart-multi__value">${ptBr(t.last)}${growth ? `<small>${escapeHtml(growth)}</small>` : ""}</span>
            </div>
            ${chart}${table}
          </div>`;
      })
      .join("") +
      // M1-c2 — o eixo de datas vive DENTRO do canvas rolável, com a mesma largura do SVG:
      // como irmão de fora, em tela estreita ele dizia "04/08" sob um ponto que era 29/07.
      `<div class="chart-axis-range" aria-hidden="true"><span>${escapeHtml(shortDate(dates[0]))}</span><span>${escapeHtml(shortDate(dates[dates.length - 1]))}</span></div>`,
  );

  // ── 2. Blocos entregues.
  const blocksReal = blocks.filter((b) => b !== null);
  setChartHtml(
    "chart-blocks",
    lineChart([{ label: "Blocos", color: CHART_COLORS.blocks, points: blocks }], dates, {
      width: 620,
      height: 240,
      zeroBased: true,
      fill: true,
      aria: `Blocos entregues: de ${ptBr(blocksReal[0] || 0)} a ${ptBr(blocksReal[blocksReal.length - 1] || 0)} entre ${period}.`,
    }),
  );

  // ── 3. Entregas por rodada — só a partir de 19/07 (M7/F8): antes o registro era consolidado
  //    e uma rodada inteira cabia num snapshot; comparar as barras dos dois regimes mentiria.
  setChartHtml(
    "chart-rounds",
    hBarChart(rounds, {
      width: 620,
      aria: `Entregas por rodada desde ${shortDate(KPI_PER_PR_SINCE)}: ${rounds.map((r) => `${r.label} ${r.value}`).join(", ")}.`,
    }),
  );

  // ── 4. Ritmo — testes adicionados por entrega (janela das últimas VELOCITY_WINDOW).
  const window24 = data.velocityWindow;
  const positives = window24.filter((d) => d.value > 0);
  setChartHtml(
    "chart-velocity",
    barChart(window24, {
      width: 1320,
      height: 200,
      showLabels: false,
      aria: `Testes adicionados nas últimas ${window24.length} entregas: ${positives.length} adicionaram teste; maior acréscimo ${ptBr(Math.max(...window24.map((d) => d.value), 0))}.`,
      describedBy: "sr-velocity",
    }) +
      // F11 (parcial no ciclo 1): as barras do ritmo eram anônimas para o leitor de tela.
      srTable("sr-velocity", "Testes adicionados por entrega (janela recente)", ["Entrega", "Testes adicionados"], window24.map((d) => [d.label, ptBr(d.value)])),
  );

  section.hidden = false;
  const notice = document.getElementById("charts-offline-note");
  if (notice) notice.hidden = true;

  // M2-c2 — quando o gráfico rola (tela estreita), abrir mostrando o PRESENTE, não 15/06:
  // o recorte inicial à esquerda deixava a faixa mais recente fora da tela sem afordância.
  if (typeof document.querySelectorAll === "function") {
    Array.from(document.querySelectorAll(".chart-canvas") || []).forEach((el) => {
      if (el && typeof el.scrollWidth === "number" && el.scrollWidth > el.clientWidth) el.scrollLeft = el.scrollWidth;
    });
  }
}

hydrateFromLatest();
