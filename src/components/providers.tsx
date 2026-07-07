import { ReactNode } from "react";
import { AppProvider } from "../context/AppContext";

export const Providers = ({ children }: { children: ReactNode }) => {
  return <AppProvider>{children}</AppProvider>;
};
