import { Link } from "@/lib/router-compat";
import logo from "@/assets/logo-light.svg";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
  variant?: "light" | "dark";
};

const sizes = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-14 w-14",
};

export const Logo = ({ size = "md", showText = true, className = "", variant = "light" }: LogoProps) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <div
      className={`${sizes[size]} shrink-0 rounded-full bg-background/95 p-1 shadow-md ring-2 ring-gold/40 flex items-center justify-center`}
    >
      <img src={logo} alt="Шёлковый путь" className="h-full w-full object-contain" />
    </div>
    {showText && (
      <div className="hidden sm:flex flex-col leading-tight">
        <span className={`font-display text-xl font-semibold tracking-tight ${variant === "dark" ? "text-[hsl(40_75%_70%)]" : ""}`}>
          Шёлковый <span className="italic text-gradient-gold">путь</span>
        </span>
        <span className={`font-marcellus text-[10px] uppercase tracking-[0.22em] ${variant === "dark" ? "text-[hsl(40_30%_75%)]" : "text-muted-foreground"}`}>
          Фестиваль-конкурс · 2026
        </span>
      </div>
    )}
  </div>
);

export const LogoLink = ({ size = "md", showText = true, variant = "light" }: LogoProps) => (
  <Link to="/" className="group">
    <Logo size={size} showText={showText} variant={variant} />
  </Link>
);
