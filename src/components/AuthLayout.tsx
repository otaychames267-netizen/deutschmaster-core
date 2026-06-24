import { Link } from "@tanstack/react-router";
import { useTheme } from "@/lib/theme";
import { Moon, Sun, GraduationCap } from "lucide-react";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const { theme, toggle } = useTheme();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel — branding */}
      <div className="relative hidden flex-1 overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between lg:p-10">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,oklch(0.5_0.18_264/0.4),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_80%_80%,oklch(0.78_0.14_82/0.15),transparent)]" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">AuraLingovia</span>
        </div>

        {/* Quote */}
        <div className="relative z-10">
          <blockquote className="space-y-3">
            <p className="text-xl font-medium leading-relaxed text-white/90">
              "The most effective way to learn a language is through consistent, structured practice with realistic exam conditions."
            </p>
            <footer className="text-sm text-white/60">
              Professional TELC B1 & B2 Preparation
            </footer>
          </blockquote>
          <div className="mt-8 flex items-center gap-6 text-sm text-white/50">
            <span>TELC B1</span>
            <span>·</span>
            <span>TELC B2</span>
            <span>·</span>
            <span>7 Languages</span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col lg:max-w-lg">
        {/* Top bar */}
        <div className="flex items-center justify-between p-6">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">AuraLingovia</span>
          </Link>
          <div className="hidden lg:block" />

          <button
            onClick={toggle}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        {/* Form area */}
        <div className="flex flex-1 items-center justify-center px-6 pb-10 pt-2">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
              {subtitle && (
                <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
