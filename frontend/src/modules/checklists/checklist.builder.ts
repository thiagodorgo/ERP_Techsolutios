import type {
  CreateTenantChecklistInput,
  TenantChecklist,
  TenantChecklistBuilderComponent,
  TenantChecklistBuilderDraft,
  TenantChecklistComponentCatalogItem,
  TenantChecklistComponentInput,
  TenantChecklistComponentType,
  TenantChecklistType,
} from "./types";

export function createEmptyChecklistDraft(type: TenantChecklistType = "towing_collection"): TenantChecklistBuilderDraft {
  return {
    name: "",
    description: "",
    type,
    components: [],
  };
}

export function createDraftFromChecklist(checklist: TenantChecklist): TenantChecklistBuilderDraft {
  return {
    name: checklist.name,
    description: checklist.description ?? "",
    type: checklist.type,
    components: checklist.components
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((component) => ({
        id: component.id,
        componentKey: component.componentKey,
        type: component.type,
        label: component.label,
        required: component.required,
        orderIndex: component.orderIndex,
        config: component.config,
        validationRules: component.validationRules,
        visibilityRules: component.visibilityRules,
      })),
  };
}

export function addComponentToDraft(
  draft: TenantChecklistBuilderDraft,
  catalogItem: TenantChecklistComponentCatalogItem,
): TenantChecklistBuilderDraft {
  const nextIndex = draft.components.length;
  const component: TenantChecklistBuilderComponent = {
    id: `local_${catalogItem.type}_${Date.now()}_${nextIndex}`,
    componentKey: `${catalogItem.type}_${nextIndex + 1}`,
    type: catalogItem.type,
    label: catalogItem.label,
    required: false,
    orderIndex: nextIndex,
    config: catalogItem.defaultConfig,
    validationRules: {},
    visibilityRules: {},
  };

  return normalizeDraftOrder({
    ...draft,
    components: [...draft.components, component],
  });
}

export function moveDraftComponent(
  draft: TenantChecklistBuilderDraft,
  componentId: string,
  direction: "up" | "down",
): TenantChecklistBuilderDraft {
  const currentIndex = draft.components.findIndex((component) => component.id === componentId);
  const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= draft.components.length) {
    return draft;
  }

  const components = [...draft.components];
  const [component] = components.splice(currentIndex, 1);

  if (!component) {
    return draft;
  }

  components.splice(nextIndex, 0, component);

  return normalizeDraftOrder({
    ...draft,
    components,
  });
}

export function removeDraftComponent(
  draft: TenantChecklistBuilderDraft,
  componentId: string,
): TenantChecklistBuilderDraft {
  return normalizeDraftOrder({
    ...draft,
    components: draft.components.filter((component) => component.id !== componentId),
  });
}

export function updateDraftComponent(
  draft: TenantChecklistBuilderDraft,
  componentId: string,
  patch: Partial<Pick<TenantChecklistBuilderComponent, "label" | "required" | "config">>,
): TenantChecklistBuilderDraft {
  return {
    ...draft,
    components: draft.components.map((component) =>
      component.id === componentId
        ? {
            ...component,
            ...patch,
          }
        : component,
    ),
  };
}

export function buildChecklistInputFromDraft(draft: TenantChecklistBuilderDraft): CreateTenantChecklistInput {
  const components: TenantChecklistComponentInput[] = draft.components.map((component, index) => ({
    componentKey: component.componentKey,
    type: component.type,
    label: component.label,
    required: component.required,
    orderIndex: index,
    config: component.config,
    validationRules: component.validationRules,
    visibilityRules: component.visibilityRules,
  }));

  return {
    name: draft.name.trim(),
    description: draft.description.trim() || undefined,
    type: draft.type,
    schema: buildSchemaPreview(draft),
    components,
  };
}

export function buildSchemaPreview(draft: TenantChecklistBuilderDraft) {
  return {
    source: "w02a_builder",
    type: draft.type,
    components: draft.components.map((component, index) => ({
      componentKey: component.componentKey,
      type: component.type,
      label: component.label,
      required: component.required,
      orderIndex: index,
      config: component.config,
    })),
  };
}

export function hasChecklistPendingChanges(checklist: TenantChecklist): boolean {
  if (checklist.status !== "published" || !checklist.publishedAt) {
    return false;
  }

  return new Date(checklist.updatedAt).getTime() > new Date(checklist.publishedAt).getTime();
}

export function defaultComponentForType(
  componentType: TenantChecklistComponentType,
  catalog: readonly TenantChecklistComponentCatalogItem[],
): TenantChecklistComponentCatalogItem | undefined {
  return catalog.find((component) => component.type === componentType);
}

function normalizeDraftOrder(draft: TenantChecklistBuilderDraft): TenantChecklistBuilderDraft {
  return {
    ...draft,
    components: draft.components.map((component, index) => ({
      ...component,
      orderIndex: index,
    })),
  };
}
