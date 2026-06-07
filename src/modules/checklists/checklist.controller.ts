import type { Request } from "express";

import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import {
  toChecklistAcknowledgementDto,
  toChecklistAttachmentDto,
  toChecklistMarkerDto,
  toChecklistRunAnswerDto,
  toChecklistRunDto,
  toChecklistTemplateComponentDto,
  toChecklistTemplateDto,
} from "./checklist.dto.js";
import type { ChecklistService } from "./checklist.service.js";
import {
  parseCompleteChecklistRunDto,
  parseCreateChecklistAcknowledgementDto,
  parseCreateChecklistAttachmentDto,
  parseCreateChecklistMarkerDto,
  parseCreateChecklistRunDto,
  parseCreateChecklistTemplateDto,
  parseRegisterDivergenceDto,
  parseUpdateChecklistRunDto,
  parseUpdateChecklistTemplateDto,
} from "./checklist.validator.js";

export type ChecklistServiceResolver = () => Promise<ChecklistService>;

export class ChecklistController {
  constructor(private readonly resolveService: ChecklistServiceResolver) {}

  async listComponents() {
    const service = await this.resolveService();

    return {
      data: service.listComponents(),
    };
  }

  async listTenantChecklists(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const templates = await service.listTemplates(actor);

    return {
      data: templates.map(toChecklistTemplateDto),
    };
  }

  async createTenantChecklist(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const template = await service.createTemplate(
      actor,
      parseCreateChecklistTemplateDto(request.body as Record<string, unknown>),
    );

    return {
      status: 201,
      body: {
        data: toChecklistTemplateDto(template),
      },
    };
  }

  async getTenantChecklist(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const template = await service.getTemplate(actor, readRouteParam(request.params.checklistId));

    return {
      data: toChecklistTemplateDto(template),
    };
  }

  async updateTenantChecklist(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const template = await service.updateTemplate(
      actor,
      readRouteParam(request.params.checklistId),
      parseUpdateChecklistTemplateDto(request.body as Record<string, unknown>),
    );

    return {
      data: toChecklistTemplateDto(template),
    };
  }

  async deleteTenantChecklist(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);

    await service.archiveTemplate(actor, readRouteParam(request.params.checklistId));

    return {
      status: 204,
    };
  }

  async publishTenantChecklist(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const template = await service.publishTemplate(actor, readRouteParam(request.params.checklistId));

    return {
      data: toChecklistTemplateDto(template),
    };
  }

  async listChecklistTemplates(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const templates = await service.listAvailableTemplates(actor);

    return {
      data: templates.map(toChecklistTemplateDto),
    };
  }

  async listAvailableMobileChecklists(request: Request) {
    return this.listChecklistTemplates(request);
  }

  async renderMobileChecklist(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const rendered = await service.renderChecklist(actor, readRouteParam(request.params.checklistId));

    return {
      data: {
        ...rendered,
        components: rendered.components.map(toChecklistTemplateComponentDto),
      },
    };
  }

  async createChecklistRun(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const run = await service.createRun(
      actor,
      parseCreateChecklistRunDto(request.body as Record<string, unknown>),
    );

    return {
      status: 201,
      body: {
        data: toChecklistRunDto(run),
      },
    };
  }

  async updateChecklistRun(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const details = await service.updateRun(
      actor,
      readRouteParam(request.params.runId),
      parseUpdateChecklistRunDto(request.body as Record<string, unknown>),
    );

    return {
      data: toRunDetailsDto(details),
    };
  }

  async createChecklistAttachment(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const attachment = await service.createAttachment(
      actor,
      readRouteParam(request.params.runId),
      parseCreateChecklistAttachmentDto(request.body as Record<string, unknown>),
    );

    return {
      status: 201,
      body: {
        data: toChecklistAttachmentDto(attachment),
      },
    };
  }

  async createChecklistMarker(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const marker = await service.createMarker(
      actor,
      readRouteParam(request.params.runId),
      parseCreateChecklistMarkerDto(request.body as Record<string, unknown>),
    );

    return {
      status: 201,
      body: {
        data: toChecklistMarkerDto(marker),
      },
    };
  }

  async completeChecklistRun(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const details = await service.completeRun(
      actor,
      readRouteParam(request.params.runId),
      parseCompleteChecklistRunDto(request.body as Record<string, unknown>),
    );

    return {
      data: toRunDetailsDto(details),
    };
  }

  async compareChecklistRun(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const comparison = await service.getComparison(actor, readRouteParam(request.params.runId));

    return {
      data: {
        ...comparison,
        run: toChecklistRunDto(comparison.run),
        template: comparison.template ? toChecklistTemplateDto(comparison.template) : null,
        answers: comparison.answers.map(toChecklistRunAnswerDto),
        markers: comparison.markers.map(toChecklistMarkerDto),
        attachments: comparison.attachments.map(toChecklistAttachmentDto),
      },
    };
  }

  async registerChecklistDivergence(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const details = await service.registerDivergence(
      actor,
      readRouteParam(request.params.runId),
      parseRegisterDivergenceDto(request.body as Record<string, unknown>),
    );

    return {
      data: toRunDetailsDto(details),
    };
  }

  async acknowledgeChecklistRun(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.acknowledgeRun(
      actor,
      readRouteParam(request.params.runId),
      parseCreateChecklistAcknowledgementDto(request.body as Record<string, unknown>),
    );

    return {
      status: 201,
      body: {
        data: {
          acknowledgement: toChecklistAcknowledgementDto(result.acknowledgement),
          run: toRunDetailsDto(result.run),
        },
      },
    };
  }

  private async resolveServiceWithActor(request: Request) {
    const actor = requireTenantContext(request);
    const service = await this.resolveService();

    return [service, actor] as const;
  }
}

function toRunDetailsDto(details: {
  readonly run: Parameters<typeof toChecklistRunDto>[0];
  readonly answers: readonly Parameters<typeof toChecklistRunAnswerDto>[0][];
  readonly attachments: readonly Parameters<typeof toChecklistAttachmentDto>[0][];
  readonly markers: readonly Parameters<typeof toChecklistMarkerDto>[0][];
  readonly acknowledgements: readonly Parameters<typeof toChecklistAcknowledgementDto>[0][];
}) {
  return {
    run: toChecklistRunDto(details.run),
    answers: details.answers.map(toChecklistRunAnswerDto),
    attachments: details.attachments.map(toChecklistAttachmentDto),
    markers: details.markers.map(toChecklistMarkerDto),
    acknowledgements: details.acknowledgements.map(toChecklistAcknowledgementDto),
  };
}
