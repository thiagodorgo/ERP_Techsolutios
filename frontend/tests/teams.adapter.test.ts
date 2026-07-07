import assert from "node:assert/strict";
import test from "node:test";

test("teams adapter normaliza envelope de lista com paginacao", async () => {
  const { adaptTeamsResponse } = await import("../src/modules/registry/teams/teams.adapter");

  const data = adaptTeamsResponse({
    data: {
      items: [
        {
          id: "team-1",
          name: "Guincho Zona Sul",
          leader_user_id: "usr-10",
          status: "active",
          is_active: true,
          member_count: 4,
          created_at: "2026-06-01T10:00:00.000Z",
          updated_at: "2026-06-02T10:00:00.000Z",
        },
        {
          id: "",
          name: "Sem identificador",
        },
      ],
      pagination: { limit: 20, offset: 0, total: 1 },
    },
  });

  assert.equal(data.items.length, 1);
  assert.equal(data.source, "api");
  assert.equal(data.items[0].name, "Guincho Zona Sul");
  assert.equal(data.items[0].leaderUserId, "usr-10");
  assert.equal(data.items[0].isActive, true);
  assert.equal(data.items[0].memberCount, 4);
  assert.equal(data.pagination.total, 1);
  assert.equal(data.pagination.limit, 20);
});

test("teams adapter normaliza recurso unico com membros e tolera campos ausentes", async () => {
  const { adaptTeamResponse } = await import("../src/modules/registry/teams/teams.adapter");

  const team = adaptTeamResponse({
    data: {
      id: "team-2",
      name: "Prancha Litoral",
      members: [
        { id: "mem-1", userId: "usr-1", userName: "Carla Mendes", roleInTeam: "Motorista" },
        { id: "mem-2", user_id: "usr-2" },
        { id: "mem-3" },
      ],
    },
  });

  assert.ok(team);
  assert.equal(team?.id, "team-2");
  assert.equal(team?.name, "Prancha Litoral");
  assert.equal(team?.leaderUserId, null);
  assert.equal(team?.notes, null);
  // status default "active" e isActive default true quando o backend nao envia.
  assert.equal(team?.status, "active");
  assert.equal(team?.isActive, true);
  // membro sem userId é descartado; memberCount cai para a contagem real.
  assert.equal(team?.members.length, 2);
  assert.equal(team?.members[0].userName, "Carla Mendes");
  assert.equal(team?.members[0].roleInTeam, "Motorista");
  assert.equal(team?.members[1].userId, "usr-2");
  assert.equal(team?.members[1].userName, null);
  assert.equal(team?.memberCount, 2);
});

test("teams adapter mapeia rotulos PT-BR de status (token -> label) e situacao feminina", async () => {
  const { getTeamOperationalStatusLabel, getTeamStatusLabel, TEAM_STATUS_OPTIONS } = await import("../src/modules/registry/teams/teams.adapter");

  assert.equal(getTeamOperationalStatusLabel("active"), "Operacional");
  assert.equal(getTeamOperationalStatusLabel("forming"), "Em formação");
  assert.equal(getTeamOperationalStatusLabel("inactive"), "Desmobilizada");
  // token desconhecido nao vaza cru — cai no padrao PT-BR.
  assert.equal(getTeamOperationalStatusLabel("weird_token"), "Operacional");
  // situacao (isActive) em genero feminino.
  assert.equal(getTeamStatusLabel(true), "Ativa");
  assert.equal(getTeamStatusLabel(false), "Inativa");
  assert.equal(TEAM_STATUS_OPTIONS.length, 3);
});

test("teams adapter retorna lista vazia no fallback (D-007) e adapta usuarios do seletor", async () => {
  const { adaptTeamsResponse, adaptTenantUsersResponse } = await import("../src/modules/registry/teams/teams.adapter");

  const data = adaptTeamsResponse({ data: { items: [], pagination: { limit: 20, offset: 0, total: 0 } } }, "fallback", "sem dados");
  assert.equal(data.items.length, 0);
  assert.equal(data.pagination.total, 0);
  assert.equal(data.source, "fallback");
  assert.equal(data.fallbackReason, "sem dados");

  const users = adaptTenantUsersResponse([
    { id: "usr-1", name: "Rafael Souza", email: "rafael@x.com", roles: ["manager"], status: "active" },
    { id: "", name: "Sem id" },
  ]);
  assert.equal(users.length, 1);
  assert.equal(users[0].name, "Rafael Souza");
  assert.deepEqual(users[0].roles, ["manager"]);
});

test("teams adapter valida nome obrigatorio e filtra por situacao/busca", async () => {
  const { validateTeam, filterTeams } = await import("../src/modules/registry/teams/teams.adapter");

  const errors = validateTeam({ name: "" });
  assert.ok(errors.map((error) => error.field).includes("name"));
  assert.equal(validateTeam({ name: "Guincho Zona Sul" }).length, 0);

  const base = {
    leaderUserId: null,
    status: "active",
    notes: null,
    memberCount: 0,
    members: [],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };
  const items = [
    { ...base, id: "a", name: "Guincho Zona Sul", isActive: true },
    { ...base, id: "b", name: "Prancha Litoral", isActive: false },
  ];

  assert.equal(filterTeams(items, { search: "", isActive: "inactive" }).length, 1);
  assert.equal(filterTeams(items, { search: "prancha", isActive: "all" })[0].id, "b");
  assert.equal(filterTeams(items, { search: "guincho", isActive: "inactive" }).length, 0);
});
