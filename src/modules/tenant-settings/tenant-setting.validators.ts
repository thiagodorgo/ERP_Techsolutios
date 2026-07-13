import { TenantSettingError } from "./tenant-setting.types.js";

// Chave: minúsculas + snake_case/pontos, 2–80 chars (primeiro char [a-z], demais [a-z0-9_.]).
const keyPattern = /^[a-z][a-z0-9_.]{1,79}$/;

export function parseKey(value: unknown): string {
  const key = typeof value === "string" ? value : "";
  if (!keyPattern.test(key)) {
    throw new TenantSettingError(
      400,
      "TENANT_SETTING_INVALID",
      "invalid_key",
      "key must be lowercase snake_case/dot-separated (2-80 chars).",
    );
  }
  return key;
}

// value é obrigatório no upsert; texto livre (pode conter JSON serializado), ≤5000. NÃO faz trim do
// conteúdo (preserva JSON/formatação), mas rejeita value vazio/só-espaços — um parâmetro precisa ter
// conteúdo (veto junta Ω2-e: value em branco é dado incompleto). Para "remover" um parâmetro use um
// value significativo; não há DELETE nesta fatia.
export function parseValue(value: unknown): string {
  if (value === undefined || value === null) {
    throw new TenantSettingError(400, "TENANT_SETTING_INVALID", "required_value", "value is required.");
  }
  if (typeof value !== "string") {
    throw new TenantSettingError(400, "TENANT_SETTING_INVALID", "invalid_value", "value must be a string.");
  }
  if (value.trim().length === 0) {
    throw new TenantSettingError(400, "TENANT_SETTING_INVALID", "required_value", "value must not be empty.");
  }
  if (value.length > 5000) {
    throw new TenantSettingError(400, "TENANT_SETTING_INVALID", "value_too_long", "value must be at most 5000 characters.");
  }
  return value;
}

function parseOptionalBounded(value: unknown, field: string, maxLength: number): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return undefined;
  if (normalized.length > maxLength) {
    throw new TenantSettingError(
      400,
      "TENANT_SETTING_INVALID",
      `invalid_${field}`,
      `${field} must be at most ${maxLength} characters.`,
    );
  }
  return normalized;
}

export function parseOptionalCategory(value: unknown): string | undefined {
  return parseOptionalBounded(value, "category", 40);
}

export function parseOptionalDescription(value: unknown): string | undefined {
  return parseOptionalBounded(value, "description", 300);
}

// Filtro de lista ?category= — não valida tamanho (só recorta), pois filtro inválido não é erro.
export function parseOptionalCategoryFilter(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized ? normalized.slice(0, 40) : undefined;
}
