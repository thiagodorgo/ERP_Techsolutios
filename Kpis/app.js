const dashboardData = {
  "project": {
    "name": "ERP Techsolutions",
    "version": "B-108",
    "updatedAt": "2026-06-18",
    "sourceBranch": "feature/evidence-storage-hardening",
    "summary": "B-108 Hardening de evidências/storage publicado apos avaliacao humana. Kpis/ reflete mobile/flutter_app/Kpis/ para Flutter 662/662, MVP demo 93%, MVP vendavel 76% e 38 blocos entregues."
  },
  "kpis": [
    {
      "label": "B-108",
      "value": "Evidence storage hardening",
      "note": "EvidenceStorageProvider, scanner testavel, evfile_* e auditoria segura."
    },
    {
      "label": "Flutter",
      "value": "662/662",
      "note": "Total real validado no gate B-108G."
    },
    {
      "label": "Backend tests",
      "value": "15/15",
      "note": "npm test passou com core-saas.test.ts."
    },
    {
      "label": "Mobile contracts",
      "value": "18/18",
      "note": "tests/mobile-backend-contracts.test.ts."
    },
    {
      "label": "Mobile + Core SaaS",
      "value": "21/21",
      "note": "mobile-backend-contracts + core-saas-contract."
    },
    {
      "label": "MVP demo",
      "value": "93%",
      "note": "Percentual mobile vindo de mobile/flutter_app/Kpis/kpis-latest.json."
    },
    {
      "label": "MVP vendavel",
      "value": "76%",
      "note": "Percentual mobile vindo de mobile/flutter_app/Kpis/kpis-latest.json."
    },
    {
      "label": "Blocos entregues",
      "value": "38",
      "note": "B-076 ate B-108 + B-098F, incluindo sub-blocos."
    },
    {
      "label": "Escopo B-108K",
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
    }
  ],
  "contracts": [
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
      "detail": "Fonte dos percentuais Flutter/mobile: 662/662, 93%, 76%, 38 blocos."
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
      "status": "concluido",
      "detail": "KPIs publicados somente apos avaliacao humana, merge e gate, em bloco documental separado."
    }
  ],
  "validations": [
    {
      "name": "flutter test --reporter compact",
      "result": "pass 662/662 no gate B-108G"
    },
    {
      "name": "npm test",
      "result": "pass 15/15 no gate B-108G"
    },
    {
      "name": "mobile-backend-contracts",
      "result": "pass 18/18"
    },
    {
      "name": "mobile + Core SaaS contracts",
      "result": "pass 21/21"
    },
    {
      "name": "PR #104",
      "result": "merged 468fcf16c6b42865aecbd45b05f4c37ced0c3068"
    },
    {
      "name": "Head aprovado",
      "result": "4b221cfdfe3acad9c65214ac5fc7e7892a050331"
    },
    {
      "name": "Politica KPI",
      "result": "publicado apos avaliacao humana, merge e gate B-108G"
    }
  ],
  "estimates": [
    {
      "label": "MVP demo",
      "value": "93%",
      "detail": "Estimado no KPI mobile apos B-108."
    },
    {
      "label": "MVP vendavel",
      "value": "76%",
      "detail": "Estimado no KPI mobile apos B-108."
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
      "id": "B-109",
      "title": "Approval real de OS",
      "detail": "Fluxo de aprovacao operacional."
    },
    {
      "id": "B-110",
      "title": "Storage externo de evidencias",
      "detail": "Presigned URL, antivirus real, download protegido e retencao."
    }
  ],
  "history": [
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
