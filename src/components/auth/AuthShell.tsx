import { ReactNode } from "react";
import { Link } from "@/lib/router-compat";
import { Ornament } from "@/components/ui/ornament";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-10 sm:py-14">
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, hsl(40 75% 52% / 0.08), transparent 60%), radial-gradient(ellipse 50% 40% at 100% 100%, hsl(350 70% 28% / 0.05), transparent 50%)",
        }}
      />

      <div className="relative w-full max-w-[420px]">
        <div className="mb-7 text-center">
          <Ornament className="mb-5 opacity-90" />
          <h1 className="font-display text-[2rem] sm:text-[2.25rem] leading-tight text-foreground">
            {title}
          </h1>
          {subtitle && <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{subtitle}</p>}
        </div>

        <div className="rounded-xl border border-border/70 bg-card/95 backdrop-blur-sm shadow-elegant p-6 sm:p-8">
          {children}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors">
            ← На главную
          </Link>
        </p>
      </div>
    </div>
  );
}
