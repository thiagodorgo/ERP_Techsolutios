const dashboardData = {
  "project": {
    "name": "ERP Techsolutions",
    "version": "B-124",
    "updatedAt": "2026-07-05",
    "sourceBranch": "fix/b124-kpis-post-human-approval",
    "summary": "Ω-GOV (2026-07-13): politica KPI-por-PR (D-KPI-PER-PR) substitui a publicacao pos-avaliacao humana; backend_tests corrigido 15/15 -> 766/766 (suite backend INTEIRA que o Ω-GATE/PR #174 fez o CI rodar com Postgres+Redis). Contexto anterior (B-124, PR #125, web-only): dashboard web enriquecido; Flutter 764/764 e contratos mobile inalterados; smoke web 33/33 -> 44/44, MVP demo 96%, MVP vendavel 78% e 49 blocos entregues."
  },
  "kpis": [
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
      "value": "764/764",
      "note": "Total real revalidado na PR #123 (apos cada uma das 7 telas)."
    },
    {
      "label": "Frontend smoke",
      "value": "44/44",
      "note": "test:smoke 33 -> 44 na PR #125 (B-124): +10 unit do dashboard.adapter + 1 render do dashboard."
    },
    {
      "label": "Backend tests",
      "value": "768/768",
      "note": "Suite backend INTEIRA no gate do CI (101 arquivos + Postgres+Redis), 0 fail/0 skip. Ω-INFRA-1 +2 (health-routes). Substitui o antigo 15/15 (so core-saas). KPI-por-PR (D-KPI-PER-PR)."
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
      "value": "96%",
      "note": "Mantido no valor oficial publicado (estimado); sem decisao humana para alterar no B-124."
    },
    {
      "label": "MVP vendavel",
      "value": "78%",
      "note": "Mantido no valor oficial publicado (estimado); sem decisao humana para alterar no B-124."
    },
    {
      "label": "Blocos entregues",
      "value": "49",
      "note": "B-076 ate B-124, incluindo sub-blocos; 48 ate B-123 + B-124."
    },
    {
      "label": "Escopo B-124K",
      "value": "KPI/docs",
      "note": "Publicacao documental pos-avaliacao humana; sem feature nova ou codigo funcional."
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
        "mobile/flutter_app/Kpis/kpis-latest.json",
        "mobile/flutter_app/Kpis/index.html"
      ],
      "detail": "Fonte dos percentuais Flutter/mobile: 764/764, 96%, 78%, 49 blocos."
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
      "detail": "Kpis/ raiz sincronizado com mobile/flutter_app/Kpis/ apos B-105; politica de KPIs duplos documentada."
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

renderDashboard(dashboardData);
