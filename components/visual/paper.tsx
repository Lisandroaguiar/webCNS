import type { HTMLAttributes, ReactNode } from "react";

export function PaperScrap({ children, className = "", ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={`paper-scrap ${className}`} {...props}>{children}</div>;
}

export function GridPaper({ children, className = "", ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={`grid-paper ${className}`} {...props}>{children}</div>;
}

export function Tape({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`tape-detail ${className}`} />;
}
