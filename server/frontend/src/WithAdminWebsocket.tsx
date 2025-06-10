import type { ReactNode } from "react";
import { useAdminWebsocket } from "./utils/useAdminWebsocket";

interface Props {
  children?: ReactNode;
}

export default function WithAdminWebsocket({ children }: Props) {
  useAdminWebsocket();

  return <>{children}</>;
}
