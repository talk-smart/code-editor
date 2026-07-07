import { ReactNode } from "react";
import { AppProvider } from "../context/AppContext";
import { WorkspaceProvider } from "../context/WorkspaceManager";

export const Providers = ({ children }: { children: ReactNode }) => {
  return (
    <AppProvider>
      <WorkspaceProvider>
        {children}
      </WorkspaceProvider>
    </AppProvider>
  );
};
