// B-SAN3-10b-F4-SEED-ISOLADO — motor e verificador da demonstracao isolada, contra uma API FALSA em memoria.
//
// REGRA (A4 do plano v2): a API falsa so codifica comportamento MEDIDO contra a API real (Postgres, papel de
// runtime sem bypass de RLS). Cada comportamento cita, no comentario, a medicao que o mediu:
//   E10, E11          — evidencia do plano v2 (troca de senha, OS, recibo do sync)
//   E11-P2            — evidencia da Emenda 1.1 (login sem tenantId = 401 sob o papel de runtime)
//   E1-A2             — evidencia da Emenda 1 (localizacao, foto, encargo e vistoria repetidos; encargo e da gestao)
//   F3-T2 … F3-T7     — diario do Dev B, F3 (usuarios, cadastros, criacao repetida, menu, token da provisoria)
//   F4-T1, F4-T2, F4-T5 — diario do Dev B, F4 (patio, processo, vistoria, OS, check-in, financeiro, sync repetido)
//   SC                — B-SAN3-10b-SEED-CONSENT: evidencia E5 (S1 a S20) e E5b (P1 a P5) do plano, a sonda no Postgres
//                       da critica (B1-B15, C1-C5) e, do #568, D1, D2, D6, D7 e `[T-17-ACEITE-VELHO-db] (f)`: perfil de
//                       operador, consentimento pela rota do app, posicao trancada e a trilha da auditoria
//                       (`operator-profile.controller.ts:25/47`, `field-location.controller.ts:47-53`, `audit.routes.ts`).
// O que nao foi medido nao entra como regra: o falso aceita (o motor tem de ler antes) e o resto fica para a pilha.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { semear } from "../scripts/demo-isolado/semear.mjs";
import { avaliarEsperado, lerMatriz, verificar } from "../scripts/demo-isolado/verificar.mjs";

const FIXTURE = path.resolve("scripts/demo-isolado/fixture-exemplo.json");
const MATRIZ = path.resolve("scripts/demo-isolado/matriz-exemplo.tsv");
const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));

type Json = Record<string, any>;
type Chamada = { metodo: string; caminho: string; corpo: Json | undefined; ator?: string };
// Opcoes do arnes (SC): cada uma forca uma resposta MEDIDA, nunca inventa comportamento.
//   aceiteVelho      — todo aceite num perfil desligado sai `superseded` (S9; (f)), como se o relogio do servidor estivesse atras
//   aceite503UmaVez  — o 1o aceite sai 503 `field_location_busy`, sem gravar nada e sem evento na trilha
//   trilhaFalha      — a leitura de `/audit-events` sai 500
type Opcoes = { aceiteVelho?: boolean; aceite503UmaVez?: boolean; trilhaFalha?: boolean };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Papeis da fixture com a permissao (catalogo da ref 80f5b4d9, `getRolePermissions`; E3 do plano).
const CRIA_PERFIL = ["tenant_admin", "manager"];
const MANDA_POSICAO = ["tenant_admin", "field_technician", "operator"];
const LE_AUDITORIA = ["tenant_admin", "manager", "auditor"];
type Conta = { id: string; tenantId: string; email: string; nome: string; senha: string; trocar: boolean; roles: string[] };

// Rotulos do menu do servidor por papel: um SUBCONJUNTO do que a API real devolveu (F3-T6, F4-T7).
const MENU: Record<string, string[]> = {
  super_admin: ["Visão Geral", "Dashboard", "Usuários"],
  tenant_admin: ["Dashboard", "Usuários", "Auditoria", "Ordens de Serviço", "Mapa Operacional", "Financeiro"],
  manager: ["Dashboard", "Ordens de Serviço", "Mapa Operacional", "Pátios", "Processos", "Financeiro"],
  field_dispatcher: ["Dashboard", "Ordens de Serviço", "Despachos"],
  field_technician: ["Dashboard", "Ordens de Serviço", "Despachos"],
  finance: ["Ordens de Serviço", "Financeiro", "Pagamentos"],
  auditor: ["Dashboard", "Auditoria", "Ordens de Serviço", "Mapa Operacional", "Financeiro"],
};
const CONJUNTOS = ["FRONT", "REAR", "LEFT", "RIGHT", "ROOF", "DASH_PANEL", "ENGINE", "CHASSIS_ID", "ODOMETER", "INNER_OBJECTS", "DAMAGES"];
// Caminho da OS (work-order.validators.ts:20-31), so as arestas que o motor usa.
const hojeSp = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const PROXIMO_OS: Record<string, string> = { assigned: "accepted", accepted: "on_route", on_route: "on_site", on_site: "in_progress", in_progress: "completed" };

const SENHA_PLATAFORMA = `plat-${randomUUID()}`;
const SENHA_DEMO = `demo-${randomUUID()}`;
const PROVISORIA_ADMIN = `prov-${randomUUID()}`;

function criarApi(opcoes: Opcoes = {}) {
  const plataformaId = randomUUID();
  const orgId = randomUUID();
  const orgs = [
    { id: plataformaId, name: "Plataforma", slug: "platform", status: "active" },
    { id: orgId, name: fixture.organizacao.nome, slug: "organizacao-exemplo-x", status: "active" },
  ];
  const contas: Conta[] = [
    { id: randomUUID(), tenantId: plataformaId, email: fixture.plataforma.email, nome: "Plataforma", senha: SENHA_PLATAFORMA, trocar: false, roles: ["super_admin"] },
    { id: randomUUID(), tenantId: orgId, email: fixture.admin.email, nome: fixture.admin.nome, senha: PROVISORIA_ADMIN, trocar: true, roles: ["tenant_admin"] },
  ];
  const tokens = new Map<string, string>();
  const c: Record<string, Json[]> = {
    customers: [], vehicles: [], teams: [], "service-catalog": [], "price-tables": [], tariffs: [], "jurisdiction-profiles": [],
    yards: [], areas: [], spots: [], processos: [], charges: [], locations: [], "work-orders": [], eventos: [],
    "financial-accounts": [], "financial-titles": [], "financial-entries": [], settings: [],
    perfis: [], auditoria: [],
  };
  let aceite503Pendente = opcoes.aceite503UmaVez === true;
  const recibos = new Map<string, string>();
  const chamadas: Chamada[] = [];
  let relogio = 0;
  const agora = () => new Date(Date.UTC(2026, 10, 14, 6, 0, relogio++)).toISOString();

  const resposta = (status: number, corpo: unknown) =>
    new Response(corpo === undefined ? "" : JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
  const erro = (status: number, code: string, reason?: string) => resposta(status, { error: { code, ...(reason ? { reason } : {}) } });
  const pagina = (itens: Json[], url: URL, filtro: (i: Json) => boolean = () => true) => {
    const busca = (url.searchParams.get("search") ?? "").toLowerCase();
    const filtrados = itens.filter((i) => filtro(i) && (!busca || [i.name, i.plate, i.title].some((v) => String(v ?? "").toLowerCase().includes(busca))));
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
    const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
    // Forma medida: {items, pagination:{limit, offset, total}}, sem o envelope `data` (F3-T3, F4-T1, F4-T2).
    return resposta(200, { items: filtrados.slice(offset, offset + limit), pagination: { limit, offset, total: filtrados.length } });
  };
  const achar = (nome: string, id: string) => c[nome].find((i) => i.id === id);
  const evento = (processId: string, tipo: string) => c.eventos.push({ id: randomUUID(), processId, tipo });
  const eventoOs = (os: Json, eventType: string, toStatus: string, message?: string) =>
    os.timeline.push({ id: randomUUID(), workOrderId: os.id, eventType, toStatus, message: message ?? null, createdAt: agora() });

  async function fetch(endereco: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
    const url = new URL(endereco);
    const metodo = (init.method ?? "GET").toUpperCase();
    const caminho = url.pathname.replace(/^\/api\/v1/, "");
    const corpo = init.body ? JSON.parse(init.body) : undefined;
    // Quem chamou (pelo token), para os testes saberem o ator (SC, §4.5 do plano).
    const ator = contas.find((x) => x.id === tokens.get((init.headers?.authorization ?? "").replace(/^Bearer /, "")))?.email;
    chamadas.push({ metodo, caminho: caminho + url.search, corpo, ator });

    if (metodo === "POST" && caminho === "/auth/login") {
      // Sob o papel de runtime, login sem tenantId → 401 INVALID_CREDENTIALS (E11-P2; F3-T2).
      if (!corpo?.tenantId) return erro(401, "INVALID_CREDENTIALS");
      // tenantId de outra organizacao → 401 (F3-T7).
      const conta = contas.find((x) => x.email === corpo?.email && x.tenantId === corpo?.tenantId);
      if (!conta || conta.senha !== corpo?.password) return erro(401, "INVALID_CREDENTIALS");
      const token = `tok-${randomUUID()}`;
      tokens.set(token, conta.id);
      return resposta(200, { data: { access_token: token, must_change_password: conta.trocar } });
    }
    const token = (init.headers?.authorization ?? "").replace(/^Bearer /, "");
    const conta = contas.find((x) => x.id === tokens.get(token));
    // Token revogado pela troca de senha → 401 session_inactive (F3-T7).
    if (!conta) return erro(401, "UNAUTHORIZED", "session_inactive");
    if (metodo === "POST" && caminho === "/auth/password") {
      if (corpo?.currentPassword !== conta.senha) return erro(401, "UNAUTHORIZED", "invalid_credentials");
      conta.senha = corpo.newPassword;
      conta.trocar = false;
      // A troca derruba todas as sessoes da conta, inclusive a atual (F3-T7: revoked_sessions=1).
      for (const [t, id] of [...tokens]) if (id === conta.id) tokens.delete(t);
      return resposta(200, { data: { changed: true, revoked_sessions: 1, unlinked: false } });
    }
    // Token da provisoria fora da troca → 403 password_change_required (F3-T7).
    if (conta.trocar) return erro(403, "FORBIDDEN", "password_change_required");
    const papeis = conta.roles;
    if (metodo === "GET" && caminho === "/navigation/menu") {
      const rotulos = [...new Set(papeis.flatMap((r) => MENU[r] ?? []))];
      return resposta(200, { data: rotulos.map((l) => ({ id: l, label: l, path: `/${l}`, children: [] })) });
    }
    if (metodo === "GET" && caminho === "/platform/overview") {
      if (!papeis.includes("super_admin")) return erro(403, "FORBIDDEN");
      // Forma medida (F3-T2, F4-T2): {data:{totalOrgs, activeOrgs, orgs:[{id,name,slug,status,…}]}}.
      return resposta(200, { data: { totalOrgs: orgs.length, activeOrgs: orgs.length, orgs } });
    }
    if (conta.tenantId !== orgId) return erro(403, "FORBIDDEN", "module_not_enabled");
    const gestao = papeis.some((r) => ["tenant_admin", "manager"].includes(r));
    const corpoDe = (k: string) => corpo?.[k];

    if (caminho === "/users") {
      const daOrg = contas.filter((x) => x.tenantId === orgId);
      const dto = (x: Conta) => ({ id: x.id, tenantId: x.tenantId, name: x.nome, email: x.email, roles: x.roles, status: "active" });
      // GET /users → {data:[…]}, papeis como texto (F3-T2).
      if (metodo === "GET") return resposta(200, { data: daOrg.map(dto) });
      // E-mail repetido → 409 user_email_conflict (E10; F3-T2).
      if (daOrg.some((x) => x.email === corpo.email)) return erro(409, "CONFLICT", "user_email_conflict");
      const nova: Conta = { id: randomUUID(), tenantId: orgId, email: corpo.email, nome: corpo.name, senha: `prov-${randomUUID()}`, trocar: true, roles: corpo.roles };
      contas.push(nova);
      // A provisoria volta UMA vez, no 201 (E10; F3-T2).
      return resposta(201, { data: { ...dto(nova), temporaryPassword: nova.senha } });
    }

    // Cadastros (F3-T3; criacao repetida F3-T7).
    const cad = /^\/(customers|vehicles|teams|service-catalog|price-tables|tariffs|jurisdiction-profiles|yards|financial-accounts|financial-titles|financial-entries)(?:\/([^/]+))?(?:\/(members|areas|pay))?$/.exec(caminho);
    if (cad) {
      const [, nome, id, sub] = cad;
      const itens = c[nome];
      if (metodo === "GET" && !id) {
        const direcao = url.searchParams.get("direction");
        const tabela = url.searchParams.get("price_table_id");
        return pagina(itens, url, (i) => (!direcao || i.direction === direcao) && (!tabela || i.priceTableId === tabela));
      }
      if (metodo === "GET" && id && !sub) {
        const item = achar(nome, id);
        return item ? resposta(200, { data: item }) : erro(404, "NOT_FOUND");
      }
      if (metodo === "GET" && id && sub === "areas") return resposta(200, { items: c.areas.filter((a) => a.yardId === id) });
      if (metodo === "POST" && id && sub === "areas") {
        const area = { id: randomUUID(), yardId: id, name: corpo.name, kind: corpo.kind };
        c.areas.push(area);
        return resposta(201, { data: area });
      }
      if (metodo === "POST" && id && sub === "members") {
        const equipe = achar("teams", id);
        // Membro repetido → 409 duplicate_member (F3-T3).
        if (equipe.members.some((x: Json) => x.userId === corpo.user_id)) return erro(409, "CONFLICT", "duplicate_member");
        equipe.members.push({ id: randomUUID(), userId: corpo.user_id });
        equipe.memberCount = equipe.members.length;
        return resposta(201, { data: equipe.members.at(-1) });
      }
      if (metodo === "POST" && id && sub === "pay") {
        const titulo = achar("financial-titles", id);
        // Baixa repetida → 422 title_already_paid (F4-T2).
        if (titulo.status === "paid") return erro(422, "UNPROCESSABLE", "title_already_paid");
        titulo.status = "paid";
        titulo.paidAmount = titulo.amount;
        const lancamento = { id: randomUUID(), titleId: id, accountId: corpo.account_id, direction: titulo.direction === "receivable" ? "in" : "out", amount: titulo.amount, description: corpo.description ?? null, reconciled: false, reconciledAt: null };
        c["financial-entries"].push(lancamento);
        return resposta(201, { data: lancamento });
      }
      if (metodo === "PATCH" && id && nome === "price-tables") {
        // draft → published → 200 (F3-T3).
        achar(nome, id).status = corpo.status;
        return resposta(200, { data: achar(nome, id) });
      }
      if (metodo === "POST" && !id) {
        // Repetido (F3-T7, F4-T2): cliente e titulo → 201 (duplicam); viatura → 409 duplicate_plate; equipe, servico
        // e tabela → 409 duplicate_name; conta → 409 duplicate_account. Perfil, patio e tarifa repetidos nao foram
        // medidos: o falso aceita (o motor tem de ler antes).
        if (nome === "vehicles" && itens.some((i) => i.plate === corpo.plate)) return erro(409, "CONFLICT", "duplicate_plate");
        if (["teams", "service-catalog", "price-tables"].includes(nome) && itens.some((i) => i.name === corpo.name)) return erro(409, "CONFLICT", "duplicate_name");
        if (nome === "financial-accounts" && itens.some((i) => i.name === corpo.name)) return erro(409, "CONFLICT", "duplicate_account");
        const novo: Json = { id: randomUUID(), name: corpo.name };
        if (nome === "vehicles") Object.assign(novo, { plate: corpo.plate, status: "active" });
        if (nome === "teams") Object.assign(novo, { members: [], memberCount: 0 });
        if (nome === "service-catalog") Object.assign(novo, { basePrice: 350, requiresDestination: corpoDe("requires_destination") === true });
        if (nome === "price-tables") Object.assign(novo, { status: "draft" });
        if (nome === "tariffs") Object.assign(novo, { priceTableId: corpo.price_table_id, serviceCatalogId: corpo.service_catalog_id, unitPrice: 350 });
        if (nome === "jurisdiction-profiles") Object.assign(novo, { dailyModel: corpo.daily_model, releaseRequirements: corpo.release_requirements });
        if (nome === "financial-accounts") Object.assign(novo, { kind: corpo.kind });
        if (nome === "financial-titles") {
          Object.assign(novo, { document: corpo.document, direction: corpo.direction, amount: corpo.amount, paidAmount: 0, status: "open", overdue: String(corpo.due_date) < hojeSp() });
        }
        itens.push(novo);
        return resposta(201, { data: novo });
      }
    }

    // Vagas (F4-T1).
    const vaga = /^\/(?:yard-areas\/([^/]+)\/spots|yard-spots\/([^/]+))$/.exec(caminho);
    if (vaga) {
      const [, areaId, spotId] = vaga;
      if (metodo === "GET" && areaId) return resposta(200, { items: c.spots.filter((s) => s.areaId === areaId) });
      if (metodo === "POST" && areaId) {
        // Vaga repetida na area → 409 duplicate (F4-T1).
        if (c.spots.some((s) => s.areaId === areaId && s.code === corpo.code)) return erro(409, "CONFLICT", "duplicate");
        const nova = { id: randomUUID(), areaId, code: corpo.code, vehicleClass: corpo.vehicle_class, status: "FREE", currentProcessId: null };
        c.spots.push(nova);
        return resposta(201, { data: nova });
      }
      if (metodo === "PATCH" && spotId) {
        achar("spots", spotId).status = corpo.status;
        return resposta(200, { data: achar("spots", spotId) });
      }
    }

    // Processos de patio (F4-T1; encargo e da gestao, E1-A2).
    const proc = /^\/impound-processes(?:\/([^/]+))?(\/transitions|\/spot|\/inspection|\/inspection\/photos|\/inspection\/complete|\/verify|\/charges)?$/.exec(caminho);
    if (proc) {
      const [, id, sub] = proc;
      if (!gestao) return erro(403, "FORBIDDEN", "permission_required");
      if (metodo === "GET" && !id) {
        const placa = url.searchParams.get("plate");
        return pagina(c.processos, url, (p) => !placa || p.vehiclePlate === placa);
      }
      if (metodo === "POST" && !id) {
        // Mesma placa de novo → 201 (duplica o processo) (F4-T1).
        const p = { id: randomUUID(), vehiclePlate: corpo.vehicle_plate, vehicleModel: corpo.vehicle_model ?? null, originAuthority: corpo.origin_authority, status: "IN_REMOVAL", vistoria: null, fotos: [] as Json[], completa: false };
        c.processos.push(p);
        evento(p.id, "STATUS_CHANGE");
        return resposta(201, { data: p });
      }
      const p = achar("processos", id);
      if (!p) return erro(404, "NOT_FOUND");
      const visao = () => ({ inspection: p.vistoria, photos: p.fotos, requiredSets: CONJUNTOS, complete: p.completa });
      if (metodo === "GET" && !sub) return resposta(200, { data: p });
      if (metodo === "POST" && sub === "/transitions") {
        const legal: Record<string, string> = { IN_REMOVAL: "RECEPTION", RECEPTION: "ACTIVE_CUSTODY" };
        // Transicao repetida → 409 invalid_transition (F4-T1).
        if (legal[p.status] !== corpo.to) return erro(409, "CONFLICT", "invalid_transition");
        p.status = corpo.to;
        evento(p.id, "STATUS_CHANGE");
        return resposta(200, { data: p });
      }
      if (metodo === "POST" && sub === "/spot") {
        const s = achar("spots", corpo.spot_id);
        // Vaga ja ocupada → 409 spot_not_free (F4-T1).
        if (s.status !== "FREE") return erro(409, "CONFLICT", "spot_not_free");
        Object.assign(s, { status: "OCCUPIED", currentProcessId: p.id });
        evento(p.id, "SPOT_ASSIGNED");
        return resposta(200, { data: p });
      }
      if (metodo === "GET" && sub === "/inspection") {
        // Antes de gravar → 404 inspection_not_found; depois, sem o envelope `data` (F4-T1).
        return p.vistoria ? resposta(200, visao()) : erro(404, "NOT_FOUND", "inspection_not_found");
      }
      if (metodo === "PUT" && sub === "/inspection") {
        // Gravar de novo e uma escrita (re-audita) (E1-A2).
        p.vistoria = {
          id: p.vistoria?.id ?? randomUUID(),
          inspectedAt: corpo.inspected_at,
          bodyworkState: corpo.bodywork_state, paintState: corpo.paint_state, tiresState: corpo.tires_state,
          internalObjects: corpo.internal_objects, missingEquipment: corpo.missing_equipment,
          signatureStatus: String(corpo.signature_status).toUpperCase(), completedAt: p.vistoria?.completedAt ?? null,
        };
        return resposta(200, { data: p.vistoria });
      }
      if (metodo === "POST" && sub === "/inspection/photos") {
        // Foto repetida → 201 e linha nova (E1-A2).
        const foto = { id: randomUUID(), set: corpo.set, fileUrl: corpo.file_url, status: "stored" };
        p.fotos.push(foto);
        evento(p.id, "PHOTO_SET");
        return resposta(201, { data: foto });
      }
      if (metodo === "POST" && sub === "/inspection/complete") {
        const guardados = new Set(p.fotos.map((f: Json) => f.set));
        // Conjunto faltando → 409 reception_inspection_incomplete; completo → 200, tambem repetido (F4-T1).
        if (CONJUNTOS.some((s) => !guardados.has(s))) return erro(409, "IMPOUND_GUARD_FAILED", "reception_inspection_incomplete");
        p.completa = true;
        p.vistoria.completedAt = agora();
        evento(p.id, "INSPECTION");
        return resposta(200, { data: p.vistoria });
      }
      if (metodo === "GET" && sub === "/verify") return resposta(200, { data: { processId: p.id, valid: true, eventCount: c.eventos.filter((e) => e.processId === p.id).length } });
      if (sub === "/charges") {
        if (metodo === "GET") return resposta(200, { items: c.charges.filter((x) => x.processId === p.id) });
        // Encargo repetido → 201 e linha nova (E1-A2).
        const encargo = { id: randomUUID(), processId: p.id, kind: corpo.kind, description: corpo.description, unitAmount: corpo.unit_amount };
        c.charges.push(encargo);
        return resposta(201, { data: encargo });
      }
    }

    // Perfil de operador (SC). Cria so quem tem `operator_profiles:create` (S3: tecnica → 403); mesmo usuario de novo
    // → 409 duplicate_profile (S5/S5b). O consentimento nasce `true` so se o corpo mandar (pre-existente,
    // `RBAC_MATRIX.md:146`). createdBy = updatedBy = o ator e createdAt = updatedAt na criacao (P1).
    const perfilDe = (userId: string) => c.perfis.find((p) => p.userId === userId);
    const registrar = (action: string, resourceId: string) =>
      c.auditoria.push({ id: randomUUID(), action, actor_user_id: conta.id, tenant_id: orgId, resourceId, timestamp: agora() });
    const prf = /^\/operator-profiles(?:\/([^/]+))?$/.exec(caminho);
    if (prf) {
      const [, id] = prf;
      if (metodo === "POST" && !id) {
        if (!papeis.some((r) => CRIA_PERFIL.includes(r))) return erro(403, "FORBIDDEN", "permission_required");
        if (perfilDe(corpo.user_id)) return erro(409, "CONFLICT", "duplicate_profile");
        const quando = agora();
        const ligado = corpo.tracking_consent === true;
        const p: Json = {
          id: randomUUID(), userId: corpo.user_id, phone: corpo.phone ?? null, trackingConsent: ligado, trackingConsentAt: ligado ? quando : null,
          createdBy: conta.id, updatedBy: conta.id, createdAt: quando, updatedAt: quando,
        };
        c.perfis.push(p);
        // Trilha: `operator_profile.created` (operator-profile.controller.ts:25).
        registrar("operator_profile.created", p.id);
        return resposta(201, { data: p });
      }
      // Lista: sem updatedAt, createdBy e updatedBy (S6; `operator-profile.dto.ts`, lista).
      if (metodo === "GET" && !id) {
        return pagina(c.perfis.map((p) => ({ id: p.id, userId: p.userId, phone: p.phone, trackingConsent: p.trackingConsent, trackingConsentAt: p.trackingConsentAt, createdAt: p.createdAt })), url);
      }
      const p = c.perfis.find((x) => x.id === id);
      if (!p) return erro(404, "NOT_FOUND");
      if (metodo === "GET") return resposta(200, { data: p });
      if (metodo === "PATCH") {
        if (!papeis.some((r) => CRIA_PERFIL.includes(r))) return erro(403, "FORBIDDEN", "permission_required");
        // O cadastro nunca liga o consentimento (S8; B3 no Postgres): `true` num perfil desligado → 422.
        if (corpo.tracking_consent === true && !p.trackingConsent) return erro(422, "UNPROCESSABLE", "tracking_consent_holder_only");
        // Desligar pelo cadastro passa (P5; B13: o gestor desliga), e editar o telefone tambem (C3).
        if (corpo.tracking_consent === false) Object.assign(p, { trackingConsent: false, trackingConsentAt: null });
        if ("phone" in corpo) p.phone = corpo.phone;
        Object.assign(p, { updatedBy: conta.id, updatedAt: agora() });
        // Trilha: `operator_profile.updated` (operator-profile.controller.ts:47).
        registrar("operator_profile.updated", p.id);
        return resposta(200, { data: p });
      }
    }

    // Consentimento pela rota do app (SC; contrato `mobile_location_consent@2026-11.b-san3-17`).
    if (metodo === "POST" && (caminho === "/mobile/location-consent" || caminho === "/mobile/location-consent/revoke")) {
      // Sem `field_location:send` → 403 (S14: o gestor); sem perfil → 422 operator_profile_required (S2; B4).
      if (!papeis.some((r) => MANDA_POSICAO.includes(r))) return erro(403, "FORBIDDEN", "permission_required");
      const p = perfilDe(conta.id);
      if (!p) return erro(422, "UNPROCESSABLE", "operator_profile_required");
      if (caminho.endsWith("/revoke")) {
        // Revoga o proprio: desliga, updatedBy = o ator (S18, P3; B6/B7, C2).
        Object.assign(p, { trackingConsent: false, trackingConsentAt: null, updatedBy: conta.id, updatedAt: agora() });
        registrar("field_location.consent_revoked", p.id);
        return resposta(200, { data: { granted: false, status: "applied" } });
      }
      // client_action_id nao-UUID → 400 (S10b); decided_at alem de agora + 5 min → 400 (S10).
      if (!UUID_RE.test(String(corpo?.client_action_id ?? ""))) return erro(400, "BAD_REQUEST", "invalid_client_action_id");
      const decidido = Date.parse(String(corpo?.decided_at ?? ""));
      if (Number.isNaN(decidido) || decidido > Date.parse(agora()) + 5 * 60 * 1000) return erro(400, "BAD_REQUEST", "invalid_date");
      if (aceite503Pendente) {
        aceite503Pendente = false;
        return erro(503, "SERVICE_UNAVAILABLE", "field_location_busy");
      }
      // Perfil desligado e decided_at <= updatedAt → 200 superseded, nao liga (S9; `[T-17-ACEITE-VELHO-db] (f)`; B1).
      if (!p.trackingConsent && (opcoes.aceiteVelho || decidido <= Date.parse(p.updatedAt))) {
        registrar("field_location.consent_superseded", p.id);
        return resposta(200, { data: { granted: false, status: "superseded" } });
      }
      // Liga (S11, P2); ja ligado → 200 applied, sem mudar nada (S12).
      if (!p.trackingConsent) Object.assign(p, { trackingConsent: true, trackingConsentAt: new Date(decidido).toISOString(), updatedBy: conta.id, updatedAt: agora() });
      registrar("field_location.consent_granted", p.id);
      return resposta(200, { data: { granted: true, status: "applied" } });
    }

    // Trilha da auditoria (`audit.routes.ts`): so `action`, `actorId`, `limit` e `offset`; a visao NAO traz a entidade.
    if (metodo === "GET" && caminho === "/audit-events") {
      if (opcoes.trilhaFalha) return erro(500, "INTERNAL", "internal_error");
      if (!papeis.some((r) => LE_AUDITORIA.includes(r))) return erro(403, "FORBIDDEN", "permission_required");
      const acao = url.searchParams.get("action");
      const quem = url.searchParams.get("actorId");
      const limit = Number.parseInt(url.searchParams.get("limit") ?? "50", 10);
      const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
      const filtrados = c.auditoria.filter((e) => (!acao || e.action === acao) && (!quem || e.actor_user_id === quem)).reverse();
      const visao = filtrados.slice(offset, offset + limit).map(({ id, action, actor_user_id, tenant_id, timestamp }) => ({ id, action, actor_user_id, tenant_id, timestamp }));
      return resposta(200, { data: visao, ...(filtrados.length > offset + limit ? { nextOffset: offset + limit } : {}) });
    }

    // Localizacao (E1-A2, F4-T2): repetida → 201 e linha nova; `latest` traz o operador com e-mail.
    // Desde o #568 (SC): sem perfil → 422 operator_profile_required (S1, D1); perfil desligado → 422
    // tracking_consent_required (S7; B2); ligado → 201 (S15, D2).
    if (metodo === "POST" && caminho === "/mobile/field-locations") {
      const p = perfilDe(conta.id);
      if (!p) return erro(422, "UNPROCESSABLE", "operator_profile_required");
      if (!p.trackingConsent) return erro(422, "UNPROCESSABLE", "tracking_consent_required");
      const l = { id: randomUUID(), operatorUserId: conta.id, latitude: corpo.latitude, longitude: corpo.longitude, operator: { userId: conta.id, email: conta.email } };
      c.locations.push(l);
      return resposta(201, { data: l });
    }
    if (metodo === "GET" && caminho === "/field-locations/latest") {
      // O ponto de quem nao consente sai da lista (S19, D7).
      const consente = (userId: string) => perfilDe(userId)?.trackingConsent === true;
      const ultimas = new Map(c.locations.filter((l) => consente(l.operatorUserId)).map((l) => [l.operatorUserId, l]));
      return resposta(200, { data: [...ultimas.values()] });
    }

    // OS (F4-T2).
    const wo = /^\/work-orders(?:\/([^/]+))?(\/assign|\/timeline)?$/.exec(caminho);
    if (wo) {
      const [, id, sub] = wo;
      const ve = (o: Json) => !papeis.includes("field_technician") || o.assignedUserId === conta.id;
      if (metodo === "GET" && !id) return pagina(c["work-orders"].filter(ve), url);
      if (metodo === "POST" && !id) {
        // Titulo repetido nao foi medido: o falso aceita (o motor tem de buscar antes).
        const o = { id: randomUUID(), title: corpo.title, status: "open", assignedUserId: null, plate: corpo.service_details?.plate ?? null, timeline: [] as Json[] };
        c["work-orders"].push(o);
        eventoOs(o, "work_order_created", "open");
        return resposta(201, { data: o });
      }
      const o = achar("work-orders", id);
      if (!o || !ve(o)) return erro(404, "NOT_FOUND");
      if (metodo === "GET" && !sub) return resposta(200, { data: o });
      if (metodo === "GET" && sub === "/timeline") return resposta(200, { data: o.timeline });
      if (metodo === "POST" && sub === "/assign") {
        // Atribuicao repetida → 200 e um 2o evento work_order_assigned (F4-T2).
        o.assignedUserId = corpo.userId;
        o.status = "assigned";
        eventoOs(o, "work_order_assigned", "assigned");
        return resposta(200, { data: o });
      }
    }
    if (metodo === "POST" && caminho === "/mobile/sync/work-order-actions") {
      const resultado: Json = { accepted: [], already_applied: [], conflicts: [], rejected: [] };
      for (const a of corpo.actions) {
        const chave = `${conta.id}:${a.client_action_id}`;
        // O recibo vive na memoria do processo da API (E5, E11): o mesmo id na mesma vida → already_applied.
        if (recibos.has(chave)) { resultado.already_applied.push({ client_action_id: a.client_action_id }); continue; }
        const o = achar("work-orders", a.payload.work_order_id);
        const para = a.payload.status;
        // A mesma situacao → aceita e grava o evento de novo (E11; F4-T5). Fora do caminho → conflito (F4-T5).
        if (para !== o.status && PROXIMO_OS[o.status] !== para) { resultado.conflicts.push({ client_action_id: a.client_action_id, error: { reason: "invalid_status_transition" } }); continue; }
        // O "No local" exige os 2 ultimos caracteres da placa da OS (R15, F4-T2).
        if (para === "on_site" && a.payload.checkin_confirmation?.last_digits !== String(o.plate).slice(-2)) {
          resultado.conflicts.push({ client_action_id: a.client_action_id, error: { reason: "checkin_confirmation_mismatch" } });
          continue;
        }
        o.status = para;
        eventoOs(o, "work_order_status_changed", para, a.payload.message);
        recibos.set(chave, "accepted");
        resultado.accepted.push({ client_action_id: a.client_action_id });
      }
      return resposta(200, { data: resultado });
    }

    // Conciliacao: exige o estado lido (400 expected_state_required) (F4-T2).
    const conc = /^\/financial-entries\/([^/]+)\/reconcile$/.exec(caminho);
    if (conc && metodo === "PATCH") {
      const e = achar("financial-entries", conc[1]);
      if (typeof corpo.expected_reconciled !== "boolean" || !("expected_reconciled_at" in corpo)) return erro(400, "BAD_REQUEST", "expected_state_required");
      e.reconciled = corpo.reconciled;
      e.reconciledAt = agora();
      return resposta(200, { data: e });
    }
    // Marcador: GET antes → 404; PUT → 200 (cada PUT e uma escrita: re-audita, N4) (F4-T2).
    const conf = /^\/tenant-settings\/([a-z0-9_.]+)$/.exec(caminho);
    if (conf) {
      const s = c.settings.find((x) => x.key === conf[1]);
      if (metodo === "GET") return s ? resposta(200, { data: s }) : erro(404, "NOT_FOUND", "not_found");
      if (metodo === "PUT") {
        if (s) s.value = corpo.value;
        else c.settings.push({ key: conf[1], value: corpo.value });
        return resposta(200, { data: c.settings.find((x) => x.key === conf[1]) });
      }
    }
    return erro(404, "NOT_FOUND", "route_not_found");
  }

  const escritas = () => chamadas.filter((x) => x.metodo !== "GET" && x.caminho !== "/auth/login");
  const estado = () =>
    JSON.stringify({ c, contas: contas.map((x) => ({ email: x.email, roles: x.roles, trocar: x.trocar })) }, (k, v) => (k === "createdAt" ? undefined : v));
  const reiniciar = () => recibos.clear();
  return { fetch, chamadas, escritas, estado, reiniciar, colecoes: c, plataformaId, orgId, contas, opcoes };
}

function prepararDir(api: ReturnType<typeof criarApi>, comTenantId = true, fixturePath = FIXTURE) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "demo-isolado-motor-"));
  const saida = path.join(dir, "saida");
  fs.mkdirSync(saida);
  fs.writeFileSync(path.join(dir, "plataforma.pw"), `${SENHA_PLATAFORMA}\n`);
  fs.writeFileSync(path.join(dir, "demo.pw"), `${SENHA_DEMO}\n`);
  if (comTenantId) fs.writeFileSync(path.join(saida, "plataforma.tenant-id"), api.plataformaId);
  fs.writeFileSync(path.join(saida, `${fixture.admin.email}.provisoria`), PROVISORIA_ADMIN);
  return {
    dir,
    saida,
    argv: (extra: string[] = [], fx = fixturePath) => [
      "--fixture", fx,
      "--admin-plataforma", path.join(dir, "plataforma.pw"),
      "--senhas", path.join(dir, "demo.pw"),
      "--provisorias", saida,
      ...extra,
    ],
    limpar: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

const AMBIENTE = ["DEMO_ISOLADO_API", "DEMO_ISOLADO_PROJETO", "NODE_ENV", "ALLOW_PROD_SEED", "ALLOW_PROD_BOOTSTRAP"];
async function comAmbiente<T>(valores: Record<string, string | undefined>, fn: () => Promise<T>): Promise<T> {
  const antes = Object.fromEntries(AMBIENTE.map((k) => [k, process.env[k]]));
  for (const k of AMBIENTE) delete process.env[k];
  for (const [k, v] of Object.entries(valores)) if (v !== undefined) process.env[k] = v;
  try {
    return await fn();
  } finally {
    for (const k of AMBIENTE) {
      if (antes[k] === undefined) delete process.env[k];
      else process.env[k] = antes[k];
    }
  }
}

const BOM = { DEMO_ISOLADO_API: "http://127.0.0.1:3111", DEMO_ISOLADO_PROJETO: "b10b-seed" };
type Api = ReturnType<typeof criarApi>;

async function rodarMotor(api: Api, argv: string[], ambiente: Record<string, string | undefined> = BOM) {
  const linhas: string[] = [];
  const codigo = await comAmbiente(ambiente, () => semear({ argv, fetch: api.fetch, escrever: (l: string) => linhas.push(l) }));
  return { codigo, linhas, saida: linhas.join("\n") };
}

async function rodarVerificador(api: Api, argv: string[], ambiente: Record<string, string | undefined> = BOM) {
  const linhas: string[] = [];
  const codigo = await comAmbiente(ambiente, () => verificar({ argv, fetch: api.fetch, escrever: (l: string) => linhas.push(l) }));
  return { codigo, linhas, saida: linhas.join("\n") };
}

const sem = (argv: string[], flag: string) => argv.filter((_, i, a) => a[i] !== flag && a[i - 1] !== flag);
const argvVerificador = (d: ReturnType<typeof prepararDir>, matriz = MATRIZ) => [...sem(d.argv(), "--provisorias"), "--matriz", matriz, "--provisorias", d.saida];

test("C6 idempotencia: a 1a execucao cria tudo (ET1 a ET8); a 2a faz 0 escritas e imprime criados=0 (mata a M8)", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    const r1 = await rodarMotor(api, d.argv());
    assert.equal(r1.codigo, 0, r1.saida);
    for (const etapa of ["ET1", "ET2", "ET3", "ET4", "ET5", "ET6", "ET7", "ET8"]) assert.match(r1.saida, new RegExp(`^ETAPA ${etapa} criados=[1-9]`, "m"), etapa);
    const estado1 = api.estado();
    const escritas1 = api.escritas().length;

    const r2 = await rodarMotor(api, d.argv());
    assert.equal(r2.codigo, 0, r2.saida);
    assert.match(r2.saida, /^DEMO-ISOLADO FIM criados=0 existentes=[1-9][0-9]*$/m);
    for (const etapa of ["ET1", "ET2", "ET3", "ET4", "ET5", "ET6", "ET7", "ET8"]) assert.match(r2.saida, new RegExp(`^ETAPA ${etapa} criados=0 `, "m"), etapa);
    assert.equal(api.escritas().length, escritas1, "a 2a execucao nao pode escrever");
    assert.equal(api.estado(), estado1);
  } finally {
    d.limpar();
  }
});

test("C6 provisorias: cada troca termina e apaga o arquivo; na 2a execucao 1 login por papel, sem provisoria", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    assert.equal((await rodarMotor(api, d.argv())).codigo, 0);
    assert.deepEqual(fs.readdirSync(d.saida), ["plataforma.tenant-id"]);
    const logins = () => api.chamadas.filter((x) => x.caminho === "/auth/login");
    const antes = logins().length;
    assert.equal((await rodarMotor(api, d.argv())).codigo, 0);
    const segunda = logins().slice(antes);
    // 1 login por papel por execucao (R2 do plano v2): plataforma, admin e os usuarios da fixture.
    assert.equal(segunda.length, 2 + fixture.usuarios.length);
    assert.ok(segunda.every((x) => x.corpo?.password === SENHA_DEMO || x.corpo?.password === SENHA_PLATAFORMA));
  } finally {
    d.limpar();
  }
});

test("C6-e1 ler antes de escrever: localizacao, foto, encargo e vistoria nao repetem na 2a execucao (mata a M16a, M16b e M16c)", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    assert.equal((await rodarMotor(api, d.argv())).codigo, 0);
    assert.equal(api.colecoes.locations.length, 1);
    assert.equal(api.colecoes.charges.length, 1);
    assert.equal(api.colecoes.processos[0].fotos.length, 11);
    const antes = api.chamadas.length;
    assert.equal((await rodarMotor(api, d.argv())).codigo, 0);
    const segunda = api.chamadas.slice(antes);
    const rota = (re: RegExp) => segunda.filter((x) => x.metodo !== "GET" && re.test(x.caminho)).length;
    assert.equal(rota(/^\/mobile\/field-locations$/), 0, "localizacao repetida");
    assert.equal(rota(/\/inspection\/photos$/), 0, "foto repetida");
    assert.equal(rota(/\/charges$/), 0, "encargo repetido");
    assert.equal(rota(/\/inspection$/), 0, "vistoria gravada de novo");
    assert.equal(api.colecoes.locations.length, 1);
    assert.equal(api.colecoes.charges.length, 1);
    assert.equal(api.colecoes.processos[0].fotos.length, 11);
    // SC: o perfil e o consentimento tambem nao repetem.
    assert.equal(api.colecoes.perfis.length, 1, "perfil repetido");
    assert.equal(api.colecoes.perfis.filter((p) => p.trackingConsent === true).length, 1, "consentimento ausente ou repetido");
  } finally {
    d.limpar();
  }
});

test("C6b o recibo do sync nao e confiavel: depois do reinicio, 0 evento novo e 0 OS nova (mata a M9)", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    assert.equal((await rodarMotor(api, d.argv())).codigo, 0);
    const eventos = () => api.colecoes["work-orders"].map((o) => o.timeline.map((e: Json) => e.toStatus).join(",")).join("|");
    const antes = eventos();
    const totalOs = api.colecoes["work-orders"].length;
    assert.match(antes, /open,assigned,accepted,on_route,on_site,in_progress,completed/);
    api.reiniciar();
    const r = await rodarMotor(api, d.argv());
    assert.equal(r.codigo, 0, r.saida);
    assert.equal(eventos(), antes, "o reinicio gerou evento");
    assert.equal(api.colecoes["work-orders"].length, totalOs, "o reinicio gerou OS");
    // O motor nunca cria OS pelo sync.
    assert.equal(api.chamadas.filter((x) => x.caminho === "/mobile/sync/work-order-actions" && x.corpo?.actions?.some((a: Json) => a.type !== "work_order.status_change")).length, 0);
  } finally {
    d.limpar();
  }
});

test("C6b retomada no meio do caminho: a situacao ja adiante e pulada, sem evento repetido; situacao incompativel sai 5", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  const parcial = path.join(d.dir, "parcial.json");
  const f = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  f.ordens_de_servico[0].passos_do_app = f.ordens_de_servico[0].passos_do_app.slice(0, 2);
  fs.writeFileSync(parcial, JSON.stringify(f));
  try {
    assert.equal((await rodarMotor(api, d.argv([], parcial))).codigo, 0);
    const os0 = api.colecoes["work-orders"].find((o) => o.title === fixture.ordens_de_servico[0].titulo);
    assert.equal(os0.status, "on_route");
    api.reiniciar();
    const r = await rodarMotor(api, d.argv());
    assert.equal(r.codigo, 0, r.saida);
    assert.equal(os0.timeline.map((e: Json) => e.toStatus).join(","), "open,assigned,accepted,on_route,on_site,in_progress,completed");
    os0.status = "cancelled";
    const r2 = await rodarMotor(api, d.argv());
    assert.equal(r2.codigo, 5, r2.saida);
    assert.match(r2.saida, /^DEMO-ISOLADO ESTADO_INESPERADO ET6 situacao=cancelled passo=assigned$/m);
  } finally {
    d.limpar();
  }
});

test("C2 motor: alvo recusado sai 2 com 0 chamadas (mata a M5)", async () => {
  const bases = [
    "https://api.producao.exemplo.invalid",
    "http://localhost:3101",
    "http://192.168.0.10:3101",
    "http://100.64.0.1:3101",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3200",
    "https://api:3000",
    "https://127.0.0.1:3101",
    undefined,
  ];
  for (const base of bases) {
    const api = criarApi();
    const d = prepararDir(api);
    try {
      const r = await rodarMotor(api, d.argv(), { ...BOM, DEMO_ISOLADO_API: base });
      assert.equal(r.codigo, 2, `${base}: ${r.saida}`);
      assert.match(r.saida, /^DEMO-ISOLADO RECUSA ALVO_RECUSADO$/m);
      assert.equal(api.chamadas.length, 0, `${base}: houve chamada`);
    } finally {
      d.limpar();
    }
  }
});

test("C1 motor: producao sai 2, sem escape, com 0 chamadas", async () => {
  for (const extra of [{}, { ALLOW_PROD_SEED: "1" }, { ALLOW_PROD_BOOTSTRAP: "1" }]) {
    const api = criarApi();
    const d = prepararDir(api);
    try {
      const r = await rodarMotor(api, d.argv(), { ...BOM, NODE_ENV: "production", ...extra });
      assert.equal(r.codigo, 2, r.saida);
      assert.match(r.saida, /AMBIENTE_PRODUCAO/);
      assert.equal(api.chamadas.length, 0);
    } finally {
      d.limpar();
    }
  }
});

test("C3 motor: projeto fora da lista sai 2 com 0 chamadas", async () => {
  for (const projeto of ["erp-o6r-smoke", "", "b10b-", "b10bx-seed", "b10b-Seed"]) {
    const api = criarApi();
    const d = prepararDir(api);
    try {
      const r = await rodarMotor(api, d.argv(), { ...BOM, DEMO_ISOLADO_PROJETO: projeto });
      assert.equal(r.codigo, 2, `${projeto}: ${r.saida}`);
      assert.equal(api.chamadas.length, 0);
    } finally {
      d.limpar();
    }
  }
});

test("C5 motor: sem senha sai 4 com 0 chamadas; senha, provisoria e id nunca na saida", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    const r = await rodarMotor(api, sem(d.argv(), "--senhas"));
    assert.equal(r.codigo, 4, r.saida);
    assert.match(r.saida, /SENHA_AUSENTE/);
    assert.equal(api.chamadas.length, 0);
    const r2 = await rodarMotor(api, sem(d.argv(), "--admin-plataforma"));
    assert.equal(r2.codigo, 4, r2.saida);
    assert.equal(api.chamadas.length, 0);
    const ok = await rodarMotor(api, d.argv());
    assert.equal(ok.codigo, 0, ok.saida);
    for (const segredo of [SENHA_DEMO, SENHA_PLATAFORMA, PROVISORIA_ADMIN, api.plataformaId, api.orgId]) {
      assert.equal(ok.saida.includes(segredo), false, "segredo ou id na saida");
    }
  } finally {
    d.limpar();
  }
});

test("C6-e11 motor: todo login manda tenantId; sem o arquivo do id sai 3 com 0 chamadas (mata a M23)", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    const r = await rodarMotor(api, d.argv());
    assert.equal(r.codigo, 0, r.saida);
    const logins = api.chamadas.filter((x) => x.caminho === "/auth/login");
    assert.ok(logins.length >= 7);
    assert.ok(logins.every((x) => typeof x.corpo?.tenantId === "string" && x.corpo.tenantId.length === 36), "login sem tenantId");
    assert.equal(logins[0].corpo?.tenantId, api.plataformaId);
    assert.ok(logins.slice(1).every((x) => x.corpo?.tenantId === api.orgId));
  } finally {
    d.limpar();
  }
  for (const conteudo of [undefined, "nao-e-uuid"]) {
    const api2 = criarApi();
    const d2 = prepararDir(api2, false);
    try {
      if (conteudo) fs.writeFileSync(path.join(d2.saida, "plataforma.tenant-id"), conteudo);
      const r = await rodarMotor(api2, d2.argv());
      assert.equal(r.codigo, 3, r.saida);
      assert.match(r.saida, /^DEMO-ISOLADO RECUSA FUNDACAO_AUSENTE$/m);
      assert.equal(api2.chamadas.length, 0);
    } finally {
      d2.limpar();
    }
  }
});

test("C4 motor: censo na fonte real — fundacao ausente, base nao virgem e API em memoria saem 3 sem escrita", async () => {
  for (const [nome, motivo, orgs] of [
    ["sem a org da fixture", "FUNDACAO_AUSENTE", (a: Api) => [{ id: a.plataformaId, name: "Plataforma", slug: "platform" }]],
    ["com outra organizacao", "ALVO_NAO_VIRGEM", (a: Api) => [
      { id: a.plataformaId, name: "Plataforma", slug: "platform" },
      { id: a.orgId, name: fixture.organizacao.nome, slug: "organizacao-exemplo-x" },
      { id: randomUUID(), name: "Outra Exemplo", slug: "outra-exemplo-x" },
    ]],
    ["API em memoria (lista vazia)", "PERSISTENCIA_NAO_REAL", () => []],
  ] as const) {
    const api = criarApi();
    const d = prepararDir(api);
    const original = api.fetch;
    // So o `overview` muda: o falso devolve a lista de organizacoes que o caso injeta.
    const comOverview = async (endereco: string, init: any = {}) => {
      if (new URL(endereco).pathname.endsWith("/platform/overview")) {
        api.chamadas.push({ metodo: "GET", caminho: "/platform/overview", corpo: undefined });
        const lista = (orgs as (a: Api) => Json[])(api);
        return new Response(JSON.stringify({ data: { totalOrgs: lista.length, orgs: lista } }), { status: 200 });
      }
      return original(endereco, init);
    };
    try {
      const linhas: string[] = [];
      const codigo = await comAmbiente(BOM, () => semear({ argv: d.argv(), fetch: comOverview, escrever: (l: string) => linhas.push(l) }));
      assert.equal(codigo, 3, `${nome}: ${linhas.join("\n")}`);
      assert.ok(linhas.includes(`DEMO-ISOLADO RECUSA ${motivo}`), `${nome}: ${linhas.join("\n")}`);
      assert.equal(api.escritas().length, 0, `${nome}: escreveu`);
    } finally {
      d.limpar();
    }
  }
});

test("C6-e11 a ancora literal do login: 1 por arquivo, com tenantId, sem dotenv (Emenda 1.1 §2 e 1.2 A3)", () => {
  const ancora = "const corpo = { email, password: senha, tenantId };";
  for (const arquivo of ["scripts/demo-isolado/semear.mjs", "scripts/demo-isolado/verificar.mjs"]) {
    const texto = fs.readFileSync(path.resolve(arquivo), "utf8");
    assert.equal(texto.split(ancora).length - 1, 1, `${arquivo}: a ancora do login`);
    assert.equal(texto.split("/auth/login").length - 1, 1, `${arquivo}: um ponto de login`);
    assert.equal(texto.includes("dotenv"), false, `${arquivo}: dotenv`);
  }
});

test("verificador: depois do motor, a matriz generica fecha com falta=0 e 7 linhas MENU OK", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    assert.equal((await rodarMotor(api, d.argv())).codigo, 0);
    const r = await rodarVerificador(api, argvVerificador(d));
    assert.equal(r.codigo, 0, r.saida);
    const total = lerMatriz(fs.readFileSync(MATRIZ, "utf8")).filter((x) => !x.tela).length;
    assert.match(r.saida, new RegExp(`^VERIFICADOR ok=${total} falta=0$`, "m"));
    assert.equal((r.saida.match(/^PRE MENU-[a-z]+ OK$/gm) ?? []).length, 7);
  } finally {
    d.limpar();
  }
});

test("C6-e11 verificador: todo login do verificador manda tenantId, e ele nao escreve (mata a M23b)", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    assert.equal((await rodarMotor(api, d.argv())).codigo, 0);
    const antes = api.chamadas.length;
    const r = await rodarVerificador(api, argvVerificador(d));
    assert.equal(r.codigo, 0, r.saida);
    const logins = api.chamadas.slice(antes).filter((x) => x.caminho === "/auth/login");
    assert.equal(logins.length, 7, "1 login por papel");
    assert.ok(logins.every((x) => typeof x.corpo?.tenantId === "string" && x.corpo.tenantId.length === 36), "login sem tenantId");
    assert.equal(api.chamadas.slice(antes).filter((x) => x.metodo !== "GET" && x.caminho !== "/auth/login").length, 0, "o verificador escreveu");
  } finally {
    d.limpar();
  }
});

test("verificador morde (V1, Emenda 1.4): antes do motor sai 6, so MENU-plataforma OK; sem o id sai 3 sem chamada", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    const r = await rodarVerificador(api, argvVerificador(d));
    assert.equal(r.codigo, 6, r.saida);
    const total = lerMatriz(fs.readFileSync(MATRIZ, "utf8")).filter((x) => !x.tela).length;
    assert.match(r.saida, new RegExp(`^VERIFICADOR ok=1 falta=${total - 1}$`, "m"));
    assert.match(r.saida, /^PRE MENU-plataforma OK$/m);
  } finally {
    d.limpar();
  }
  const api2 = criarApi();
  const d2 = prepararDir(api2, false);
  try {
    const r = await rodarVerificador(api2, argvVerificador(d2));
    assert.equal(r.codigo, 3, r.saida);
    assert.equal(api2.chamadas.length, 0);
  } finally {
    d2.limpar();
  }
});

test("verificador: matriz vazia, so cabecalho, so linhas de tela ou cabecalho errado sai 1 (nunca verde vazio)", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  const cab = "passo\tid\tpapel\tleitura_api\tesperado\tassercao_tela\terrata\n";
  try {
    for (const conteudo of ["", "# so comentario\n", cab, `${cab}1.1\tTELA-x\t-\t-\t-\tAparece\t-\n`, "a\tb\tc\td\te\tf\tg\nx\ty\tz\tGET /api/v1/users\tconta>=1\t-\t-\n"]) {
      const arq = path.join(d.dir, "m.tsv");
      fs.writeFileSync(arq, conteudo);
      const r = await rodarVerificador(api, argvVerificador(d, arq));
      assert.equal(r.codigo, 1, JSON.stringify(conteudo) + r.saida);
      assert.match(r.saida, /MATRIZ_INVALIDA/);
    }
  } finally {
    d.limpar();
  }
});

test("verificador: os predicados da matriz", () => {
  const lista = { status: 200, json: { items: [{ name: "A (b)", operator: { email: "x@exemplo.invalid" }, roles: ["manager"], amount: 754, plate: "EXM-1A01", createdAt: "1" }] } };
  assert.equal(avaliarEsperado("existe(name=A (b))", lista), null);
  assert.equal(avaliarEsperado("existe(operator.email=x@exemplo.invalid; roles∋manager)", lista), null);
  assert.equal(avaliarEsperado("existe(amount=754.00) E existe(plate~EXM1A01) E existe(name≠vazio)", lista), null);
  assert.notEqual(avaliarEsperado("existe(name=B)", lista), null);
  assert.equal(avaliarEsperado("nenhum(name=B) E todos(roles∋manager) E conta=1 E conta>=1 E conta(roles∋manager)=1", lista), null);
  assert.notEqual(avaliarEsperado("conta=2", lista), null);
  assert.notEqual(avaliarEsperado("todos(name=B)", { status: 200, json: { items: [] } }), null);
  const obj = { status: 200, json: { data: { total: "0.00", eventCount: 17, valid: true, orgs: [{ slug: "platform" }], photos: [{ set: "FRONT" }] } } };
  assert.equal(avaliarEsperado("campo(total)=0.00 E campo(eventCount)>=3 E campo(valid)=true E campo(valid)≠vazio", obj), null);
  assert.equal(avaliarEsperado("conta(orgs)=1 E existe(orgs: slug=platform) E conta(photos: set=FRONT)=1", obj), null);
  assert.notEqual(avaliarEsperado("campo(eventCount)>=18", obj), null);
  const linha = { status: 200, json: { data: [{ toStatus: "accepted", createdAt: "1" }, { toStatus: "completed", createdAt: "2" }] } };
  assert.equal(avaliarEsperado("sequencia(toStatus: accepted,completed)", linha), null);
  const repetida = { status: 200, json: { data: [...linha.json.data, { toStatus: "completed", createdAt: "3" }] } };
  assert.notEqual(avaliarEsperado("sequencia(toStatus: accepted,completed)", repetida), null);
  const menu = { status: 200, json: { data: [{ label: "A", children: [{ label: "B" }] }] } };
  assert.equal(avaliarEsperado("status=200 E menu⊇{A|B} E menu∌{C}", menu), null);
  assert.notEqual(avaliarEsperado("menu⊇{C}", menu), null);
  assert.notEqual(avaliarEsperado("menu∌{B}", menu), null);
  assert.equal(avaliarEsperado("status=503", { status: 503, json: null }), null);
  assert.notEqual(avaliarEsperado("conta>=0", { status: 503, json: null }), null);
  assert.notEqual(avaliarEsperado("forma-desconhecida(x)", lista), null);
});

// ---------------------------------------------------------------------------------------------------------
// B-SAN3-10b-SEED-CONSENT (SC): perfil de operador, consentimento pela rota do app e a trilha do perfil na ET6.
// ---------------------------------------------------------------------------------------------------------
const EMAIL_TECNICA = fixture.usuarios.find((u: Json) => u.chave === "tecnica").email;
const EMAIL_GESTOR = fixture.usuarios.find((u: Json) => u.chave === "gestor").email;
const TEXTO_DO_APP = /locationConsentTextVersion = '([^']+)'/.exec(
  fs.readFileSync(path.resolve("mobile/flutter_app/lib/core/location/location_consent_store.dart"), "utf8"),
)?.[1];
const idDe = (api: Api, email: string) => api.contas.find((x) => x.email === email)?.id;
const perfilDaTecnica = (api: Api) => api.colecoes.perfis.find((p) => p.userId === idDe(api, EMAIL_TECNICA));
const posts = (lista: Chamada[], caminho: string) => lista.filter((x) => x.metodo === "POST" && x.caminho === caminho);

// O arnes age como uma pessoa da organizacao, pelas rotas do produto (login com a senha de demonstracao).
async function comoUsuario(api: Api, email: string, metodo: string, caminho: string, corpo?: Json) {
  const login = await api.fetch("http://127.0.0.1:3111/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: SENHA_DEMO, tenantId: api.orgId }),
  });
  assert.equal(login.status, 200, `login de ${email}`);
  const token = (await login.json()).data.access_token;
  const r = await api.fetch(`http://127.0.0.1:3111/api/v1${caminho}`, {
    method: metodo,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  return r.status;
}
const MSG_TRILHA = /^DEMO-ISOLADO ESTADO_INESPERADO ET6 o perfil teve decisão ou mudança depois da criação$/m;

test("SC1 ET6: perfil pelo admin so com user_id, aceite pela tecnica com o texto do app, depois a posicao", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    const r = await rodarMotor(api, d.argv());
    assert.equal(r.codigo, 0, r.saida);
    const tecnicaId = idDe(api, EMAIL_TECNICA);
    const criacoes = posts(api.chamadas, "/operator-profiles");
    assert.equal(criacoes.length, 1, "1 criacao de perfil");
    assert.equal(criacoes[0].ator, fixture.admin.email, "o perfil nasce pelo admin");
    assert.deepEqual(Object.keys(criacoes[0].corpo ?? {}), ["user_id"], "so o vinculo no corpo");
    assert.equal(criacoes[0].corpo?.user_id, tecnicaId);
    const aceites = posts(api.chamadas, "/mobile/location-consent");
    assert.equal(aceites.length, 1, "1 aceite");
    assert.equal(aceites[0].ator, EMAIL_TECNICA, "o aceite e da propria tecnica");
    assert.ok(TEXTO_DO_APP, "a versao do texto do app foi lida");
    assert.equal(aceites[0].corpo?.text_version, TEXTO_DO_APP, "o texto do app");
    assert.match(String(aceites[0].corpo?.client_action_id), UUID_RE);
    const perfil = perfilDaTecnica(api);
    assert.ok(Date.parse(aceites[0].corpo?.decided_at) > Date.parse(perfil.createdAt), "decided_at depois da criacao do perfil");
    assert.equal(perfil.trackingConsent, true);
    const indice = (caminho: string) => api.chamadas.findIndex((x) => x.metodo === "POST" && x.caminho === caminho);
    assert.ok(indice("/operator-profiles") < indice("/mobile/location-consent"), "perfil antes do aceite");
    assert.ok(indice("/mobile/location-consent") < indice("/mobile/field-locations"), "aceite antes da posicao");
  } finally {
    d.limpar();
  }
});

test("SC2 2a execucao: 0 perfil, 0 aceite; nunca revoke nem PATCH de perfil", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    assert.equal((await rodarMotor(api, d.argv())).codigo, 0);
    const antes = api.chamadas.length;
    const r2 = await rodarMotor(api, d.argv());
    assert.equal(r2.codigo, 0, r2.saida);
    const segunda = api.chamadas.slice(antes);
    assert.equal(segunda.filter((x) => x.metodo !== "GET" && x.caminho.startsWith("/operator-profiles")).length, 0, "perfil escrito de novo");
    assert.equal(segunda.filter((x) => x.metodo !== "GET" && x.caminho.startsWith("/mobile/location-consent")).length, 0, "aceite de novo");
    assert.equal(api.chamadas.filter((x) => x.caminho.startsWith("/mobile/location-consent/revoke")).length, 0, "o motor revogou");
    assert.equal(api.chamadas.filter((x) => x.metodo === "PATCH" && x.caminho.startsWith("/operator-profiles")).length, 0, "PATCH de perfil");
    assert.equal(api.colecoes.perfis.length, 1);
  } finally {
    d.limpar();
  }
});

test("SC3 aceite superseded sai 5 antes da posicao", async () => {
  const api = criarApi({ aceiteVelho: true });
  const d = prepararDir(api);
  try {
    const r = await rodarMotor(api, d.argv());
    assert.equal(r.codigo, 5, r.saida);
    assert.match(r.saida, /^DEMO-ISOLADO ESTADO_INESPERADO ET6 consentimento status=superseded$/m);
    assert.equal(posts(api.chamadas, "/mobile/field-locations").length, 0, "gravou a posicao");
  } finally {
    d.limpar();
  }
});

test("SC4 revogado pelo titular: a 2a execucao sai 5 e nao re-liga", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    assert.equal((await rodarMotor(api, d.argv())).codigo, 0);
    assert.equal(await comoUsuario(api, EMAIL_TECNICA, "POST", "/mobile/location-consent/revoke", {}), 200);
    const antes = api.chamadas.length;
    const r2 = await rodarMotor(api, d.argv());
    assert.equal(r2.codigo, 5, r2.saida);
    assert.match(r2.saida, MSG_TRILHA);
    assert.equal(posts(api.chamadas.slice(antes), "/mobile/location-consent").length, 0, "aceite depois da revogacao");
    assert.equal(perfilDaTecnica(api).trackingConsent, false);
  } finally {
    d.limpar();
  }
});

test("SC4b desligado ou editado pelo gestor: a 2a execucao sai 5 e nao re-liga", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    assert.equal((await rodarMotor(api, d.argv())).codigo, 0);
    const perfil = perfilDaTecnica(api);
    assert.equal(await comoUsuario(api, EMAIL_GESTOR, "PATCH", `/operator-profiles/${perfil.id}`, { tracking_consent: false }), 200);
    assert.equal(perfil.updatedBy, idDe(api, EMAIL_GESTOR));
    const antes = api.chamadas.length;
    const r2 = await rodarMotor(api, d.argv());
    assert.equal(r2.codigo, 5, r2.saida);
    assert.match(r2.saida, MSG_TRILHA);
    assert.equal(posts(api.chamadas.slice(antes), "/mobile/location-consent").length, 0, "aceite depois do desligamento");
    assert.equal(perfil.trackingConsent, false);
  } finally {
    d.limpar();
  }
  // A mudanca de cadastro sozinha tambem para: o aceite caiu (503) antes de ligar, entao nao ha decisao do titular na
  // trilha, e o gestor mexeu no perfil. So `operator_profile.updated` separa este caso do da retomada (SC5).
  const api2 = criarApi({ aceite503UmaVez: true });
  const d2 = prepararDir(api2);
  try {
    assert.equal((await rodarMotor(api2, d2.argv())).codigo, 1);
    const perfil = perfilDaTecnica(api2);
    assert.equal(await comoUsuario(api2, EMAIL_GESTOR, "PATCH", `/operator-profiles/${perfil.id}`, { phone: "(11) 90000-0001" }), 200);
    const antes = api2.chamadas.length;
    const r2 = await rodarMotor(api2, d2.argv());
    assert.equal(r2.codigo, 5, r2.saida);
    assert.match(r2.saida, MSG_TRILHA);
    assert.equal(posts(api2.chamadas.slice(antes), "/mobile/location-consent").length, 0, "aceite depois da mudanca de cadastro");
    assert.equal(perfil.trackingConsent, false);
  } finally {
    d2.limpar();
  }
});

test("SC4c revogado pelo titular e depois o admin criador edita so o telefone: a 2a execucao sai 5 (CSC-01)", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    assert.equal((await rodarMotor(api, d.argv())).codigo, 0);
    const perfil = perfilDaTecnica(api);
    assert.equal(await comoUsuario(api, EMAIL_TECNICA, "POST", "/mobile/location-consent/revoke", {}), 200);
    assert.equal(await comoUsuario(api, fixture.admin.email, "PATCH", `/operator-profiles/${perfil.id}`, { phone: "(11) 90000-0000" }), 200);
    // O caso que a regua antiga deixava passar: quem mexeu por ultimo e quem criou.
    assert.equal(perfil.updatedBy, perfil.createdBy);
    const antes = api.chamadas.length;
    const r2 = await rodarMotor(api, d.argv());
    assert.equal(r2.codigo, 5, r2.saida);
    assert.match(r2.saida, MSG_TRILHA);
    assert.equal(posts(api.chamadas.slice(antes), "/mobile/location-consent").length, 0, "aceite depois da revogacao");
    assert.equal(perfil.trackingConsent, false);
  } finally {
    d.limpar();
  }
});

test("SC4d a trilha do perfil nao se le: sai 5 e nao liga", async () => {
  const api = criarApi({ aceite503UmaVez: true });
  const d = prepararDir(api);
  try {
    assert.equal((await rodarMotor(api, d.argv())).codigo, 1);
    api.opcoes.trilhaFalha = true;
    const antes = api.chamadas.length;
    const r2 = await rodarMotor(api, d.argv());
    assert.equal(r2.codigo, 5, r2.saida);
    assert.match(r2.saida, /^DEMO-ISOLADO ESTADO_INESPERADO ET6 a trilha do perfil não foi lida$/m);
    assert.equal(posts(api.chamadas.slice(antes), "/mobile/location-consent").length, 0, "aceite sem a trilha");
    assert.equal(perfilDaTecnica(api).trackingConsent, false);
  } finally {
    d.limpar();
  }
});

test("SC5 retomada: aceite que caiu (503) e retomado na 2a execucao", async () => {
  const api = criarApi({ aceite503UmaVez: true });
  const d = prepararDir(api);
  try {
    const r1 = await rodarMotor(api, d.argv());
    assert.equal(r1.codigo, 1, r1.saida);
    assert.match(r1.saida, /HTTP_503 papel=tecnica rota=POST \/mobile\/location-consent /);
    assert.equal(posts(api.chamadas, "/mobile/field-locations").length, 0, "posicao antes do aceite");
    const r2 = await rodarMotor(api, d.argv());
    assert.equal(r2.codigo, 0, r2.saida);
    assert.equal(api.colecoes.perfis.length, 1, "1 perfil so");
    assert.equal(perfilDaTecnica(api).trackingConsent, true);
    assert.equal(api.colecoes.locations.length, 1, "posicao gravada");
  } finally {
    d.limpar();
  }
});

test("SC6 o motor nunca liga pelo cadastro (fonte)", () => {
  const texto = fs.readFileSync(path.resolve("scripts/demo-isolado/semear.mjs"), "utf8");
  assert.equal(texto.includes("tracking_consent"), false, "tracking_consent no motor");
  assert.equal(/trackingConsent\s*:/.test(texto), false, "trackingConsent como chave de corpo");
  assert.equal(texto.includes("location-consent/revoke"), false, "revoke no motor");
  assert.equal(texto.split("const corpoPerfil = { user_id: tecnicaId };").length - 1, 1, "a ancora A1");
  assert.equal(texto.split('const TEXTO_DO_CONSENTIMENTO = "2026-11.b-san3-17.v1";').length - 1, 1, "a ancora A8");
});

test("SC7 verificador morde sem consentimento", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    assert.equal((await rodarMotor(api, d.argv())).codigo, 0);
    assert.equal(await comoUsuario(api, EMAIL_TECNICA, "POST", "/mobile/location-consent/revoke", {}), 200);
    const r = await rodarVerificador(api, argvVerificador(d));
    assert.equal(r.codigo, 6, r.saida);
    assert.match(r.saida, /^PRE OPS-perfil-operador FALTA/m);
    assert.match(r.saida, /^PRE OPS-localizacao FALTA/m);
  } finally {
    d.limpar();
  }
});

// Conserto da J-581 (DP-581-01/N1, N2 = ROT-01, ROT-02): a regua, o id do aceite e a sessao das leituras.
test("SC8 o aceite caiu (503) e a titular revogou um perfil que nunca foi ligado: a 2a execucao sai 5 e nao liga (DP-581-01)", async () => {
  const api = criarApi({ aceite503UmaVez: true });
  const d = prepararDir(api);
  try {
    assert.equal((await rodarMotor(api, d.argv())).codigo, 1);
    assert.equal(perfilDaTecnica(api).trackingConsent, false, "o perfil nunca foi ligado");
    assert.equal(await comoUsuario(api, EMAIL_TECNICA, "POST", "/mobile/location-consent/revoke", {}), 200);
    // So a decisao da titular separa este caso do da retomada (SC5): nao ha `consent_granted` nem mudanca de cadastro.
    assert.deepEqual(api.colecoes.auditoria.map((e) => e.action), ["operator_profile.created", "field_location.consent_revoked"]);
    const antes = api.chamadas.length;
    const r2 = await rodarMotor(api, d.argv());
    assert.equal(r2.codigo, 5, r2.saida);
    assert.match(r2.saida, MSG_TRILHA);
    assert.equal(posts(api.chamadas.slice(antes), "/mobile/location-consent").length, 0, "aceite depois da revogacao da titular");
    assert.equal(perfilDaTecnica(api).trackingConsent, false);
  } finally {
    d.limpar();
  }
});

test("SC9 o client_action_id do aceite e deterministico: o mesmo nas 2 execucoes (ROT-01)", async () => {
  const api = criarApi({ aceite503UmaVez: true });
  const d = prepararDir(api);
  try {
    assert.equal((await rodarMotor(api, d.argv())).codigo, 1);
    assert.equal((await rodarMotor(api, d.argv())).codigo, 0);
    const ids = posts(api.chamadas, "/mobile/location-consent").map((x) => x.corpo?.client_action_id);
    assert.equal(ids.length, 2, "o aceite que caiu e o da retomada");
    assert.match(String(ids[0]), UUID_RE);
    assert.equal(ids[1], ids[0], "a retomada e a mesma decisao: o mesmo client_action_id");
  } finally {
    d.limpar();
  }
});

test("SC10 a trilha e o perfil por id sao lidos pela sessao do admin (ROT-02)", async () => {
  const api = criarApi();
  const d = prepararDir(api);
  try {
    assert.equal((await rodarMotor(api, d.argv())).codigo, 0);
    const trilha = api.chamadas.filter((x) => x.metodo === "GET" && x.caminho.startsWith("/audit-events"));
    assert.equal(trilha.length, 5, "as 5 leituras da trilha");
    assert.ok(trilha.every((x) => x.ator === fixture.admin.email), "trilha lida por outra sessao");
    const porId = api.chamadas.filter((x) => x.metodo === "GET" && /^\/operator-profiles\/[0-9a-f-]{36}$/i.test(x.caminho));
    assert.equal(porId.length, 1, "1 leitura do perfil por id");
    assert.equal(porId[0].ator, fixture.admin.email, "perfil por id lido por outra sessao");
  } finally {
    d.limpar();
  }
});
