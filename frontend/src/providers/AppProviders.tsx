import type { ReactNode } from "react";

import { AuthProvider } from "./AuthProvider";
import { EventProvider } from "./EventProvider";
import { PermissionProvider } from "./PermissionProvider";
import { TenantProvider } from "./TenantProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TenantProvider>
        <PermissionProvider>
          <EventProvider>{children}</EventProvider>
        </PermissionProvider>
      </TenantProvider>
    </AuthProvider>
  );
}
