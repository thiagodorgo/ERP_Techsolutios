import type { Role } from "../core-saas/permissions/catalog.js";
import type { CommissionRepository } from "./commission.repository.js";
import {
  CommissionError,
  type CommissionActorContext,
  type CommissionPayeeRateRecord,
  type UpsertPayeeCommissionRateResult,
} from "./commission.types.js";
import {
  parseExpectedRuleId,
  parseRateReason,
  parseRateType,
  parseRateValueText,
  parseRequiredUuid,
} from "./commission.validators.js";

type RawRecord = Record<string, unknown>;

const SELF_RATE_EXCEPTION_ROLES: ReadonlySet<Role> = new Set([
  "manager",
  "tenant_admin",
  "super_admin",
  "platform_admin",
]);

export class CommissionRateService {
  constructor(private readonly repository: CommissionRepository) {}

  async upsertPayeeRate(
    actor: CommissionActorContext,
    rawUserId: unknown,
    body: RawRecord,
  ): Promise<UpsertPayeeCommissionRateResult> {
    const payeeUserId = parseRequiredUuid(rawUserId, "userId");
    const rateType = parseRateType(body.rateType ?? body.rate_type);
    const rateValueText = parseRateValueText(body.rateValue ?? body.rate_value, rateType);
    const reason = parseRateReason(body.reason);
    const expectedRuleId = parseExpectedRuleId(body.expectedRuleId ?? body.expected_rule_id);

    const isSelf = payeeUserId === actor.userId;
    // B-COMISSAO:nao-define-a-propria
    if (isSelf && !hasSelfRateExceptionRole(actor.roles)) {
      throw new CommissionError(
        403,
        "COMMISSION_SELF_RATE_FORBIDDEN",
        "self_rate_forbidden",
        "You cannot define your own commission rate.",
      );
    }

    return this.repository.runCommissionUnit(actor.tenantId, async (unit) => {
      // Passo 1a + 1b: cria a política engine se não existir e trava a linha com FOR NO KEY UPDATE
      await unit.ensureEnginePolicy(actor.tenantId, actor.userId);
      const policyId = await unit.lockCommissionRate(actor.tenantId); // B-COMISSAO:trava-taxa

      // Confere que o usuário existe na organização do ator
      const exists = await unit.userExistsInTenant(actor.tenantId, payeeUserId);
      if (!exists) {
        throw payeeNotFoundError();
      }

      const currentRule = await unit.findCurrentPayeeRate(actor.tenantId, payeeUserId);
      const currentRuleId = currentRule?.ruleId ?? null;

      // B-COMISSAO:regra-esperada
      if (expectedRuleId !== currentRuleId) {
        throw new CommissionError(
          409,
          "COMMISSION_RATE_CONFLICT",
          "rate_changed_meanwhile",
          "The commission rate for this payee has changed since it was last read.",
        );
      }

      // Idempotente quando rateType e rateValue são idênticos à regra vigente
      if (currentRule && currentRule.rateType === rateType && currentRule.rateValue === rateValueText) {
        return {
          changed: false,
          previousRule: currentRule,
          currentRule,
        };
      }

      const now = new Date();
      const created = await unit.replacePayeeRate(
        policyId,
        {
          tenantId: actor.tenantId,
          payeeUserId,
          actorUserId: actor.userId,
          rateType,
          rateValueText,
          reason,
          expectedRuleId,
          selfChange: isSelf,
        },
        currentRuleId,
        now,
      );

      return {
        changed: true,
        previousRule: currentRule ?? undefined,
        currentRule: created,
      };
    });
  }

  async listCurrentRates(actor: CommissionActorContext): Promise<CommissionPayeeRateRecord[]> {
    return this.repository.listCurrentPayeeRates(actor.tenantId);
  }

  async listPayeeHistory(actor: CommissionActorContext, rawUserId: unknown): Promise<CommissionPayeeRateRecord[]> {
    const payeeUserId = parseRequiredUuid(rawUserId, "userId");
    const history = await this.repository.listPayeeRateHistory(actor.tenantId, payeeUserId);
    if (!history) {
      throw payeeNotFoundError();
    }
    return history;
  }

  async getMyRate(actor: CommissionActorContext): Promise<CommissionPayeeRateRecord | null> {
    return this.repository.findCurrentPayeeRate(actor.tenantId, actor.userId);
  }
}

function hasSelfRateExceptionRole(roles: readonly Role[]): boolean {
  // B-COMISSAO:gestor-excecao
  return roles.some((role) => SELF_RATE_EXCEPTION_ROLES.has(role));
}

function payeeNotFoundError(): CommissionError {
  return new CommissionError(
    404,
    "COMMISSION_PAYEE_NOT_FOUND",
    "payee_not_found",
    "The payee user was not found in this organization.",
  );
}
