import { isMockMode } from "../../config/env";
import { apiRequest } from "../../services/api/client";
import { getMockNavigationMenu } from "./navigation.mock";
import type { BackendNavigationMenuResponse, NavigationScope } from "./navigation.types";

export async function getNavigationMenu(scope?: NavigationScope): Promise<BackendNavigationMenuResponse> {
  if (isMockMode()) {
    return getMockNavigationMenu(scope);
  }

  return apiRequest<BackendNavigationMenuResponse>(navigationMenuPath(scope));
}

function navigationMenuPath(scope?: NavigationScope): string {
  return scope ? `/navigation/menu?scope=${encodeURIComponent(scope)}` : "/navigation/menu";
}
