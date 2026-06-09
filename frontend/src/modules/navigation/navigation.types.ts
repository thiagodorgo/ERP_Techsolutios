import type { NavigationItem, NavigationItemStatus, NavigationScope } from "../../navigation/types";

export type { NavigationItem, NavigationItemStatus, NavigationScope };

export type BackendNavigationItem = {
  id: string;
  label: string;
  description?: string;
  path: string;
  icon: string;
  group: NavigationScope;
  order: number;
  status: NavigationItemStatus;
  requiredPermissions: string[];
  requiredModules?: string[];
  platformOnly?: boolean;
  tenantOnly?: boolean;
  children?: BackendNavigationItem[];
  relatedEndpoints?: string[];
  metadata?: Record<string, unknown>;
};

export type BackendNavigationMenuResponse = {
  data?: BackendNavigationItem[];
  items?: BackendNavigationItem[];
  userType?: string;
  tenantId?: string | null;
  metadata?: {
    generatedAt?: string;
    scope?: NavigationScope;
    groups?: NavigationScope[];
  };
};

export type NavigationMenuState = {
  items: NavigationItem[];
  loading: boolean;
  error: Error | null;
  isFallback: boolean;
  refetch: () => Promise<void>;
};
