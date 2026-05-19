import type { ReactNode } from "react";

export function PhoneFrame({
  children,
  label,
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="device-frame w-[340px]">
        <div className="relative aspect-[9/19.5] w-full overflow-hidden rounded-[2.2rem] bg-background">
          <div className="absolute left-1/2 top-2 z-20 h-6 w-28 -translate-x-1/2 rounded-full bg-foreground" />
          <div className="h-full w-full overflow-hidden">{children}</div>
        </div>
      </div>
      {label && (
        <p className="mt-3 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </p>
      )}
    </div>
  );
}
