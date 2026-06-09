export type NavigationScope = "platform" | "tenant" | "operations" | "logistics" | "finance";

export type NavigationStatus =
  | "implemented"
  | "partial"
  | "mock"
  | "planned"
  | "backend-ready"
  | "frontend-ready"
  | "future";

export type NavigationItem = {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly path: string;
  readonly icon: string;
  readonly group: NavigationScope;
  readonly order: number;
  readonly status: NavigationStatus;
  readonly requiredPermissions: readonly string[];
  readonly requiredModules?: readonly string[];
  readonly platformOnly?: boolean;
  readonly tenantOnly?: boolean;
  readonly children?: readonly NavigationItem[];
  readonly relatedEndpoints?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
};

export type NavigationMenuContext = {
  readonly userId?: string;
  readonly tenantId?: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly enabledModules?: readonly string[];
  readonly scope?: NavigationScope;
};

export type NavigationMenuResponse = {
  readonly data: readonly NavigationItem[];
  readonly metadata: {
    readonly generatedAt: string;
    readonly scope?: NavigationScope;
    readonly groups: readonly NavigationScope[];
  };
};
