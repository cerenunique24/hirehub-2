import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
};

/**
 * Shared content boundary for the authenticated client and freelancer areas.
 * Spacing lives here so role-specific pages start on the same visual grid.
 */
export default function PageContainer({ children }: PageContainerProps) {
  return <div className="panel-page-shell">{children}</div>;
}
