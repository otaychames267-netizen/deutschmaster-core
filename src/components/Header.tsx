import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Moon, Sun, Globe, GraduationCap, User as UserIcon } from "lucide-react";
import { RTL_LANGS } from "@/lib/i18n";
import { useEffect } from "react";

const LANGS = [
  { code: "en", label: "English" }, { code: "de", label: "Deutsch" }, { code: "ar", label: "العربية" },
  { code: "fr", label: "Français" }, { code: "es", label: "Español" }, { code: "it", label: "Italiano" }, { code: "tr", label: "Türkçe" },
];

export function Header() {
  const { t, i18n } = useTranslation();
  const { theme, toggle } = useTheme();
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = RTL_LANGS.includes(i18n.language) ? "rtl" : "ltr";
  }, [i18n.language]);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <GraduationCap className="h-6 w-6 text-accent" />
          <span>DeutschMaster</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="/#features" className="hover:text-accent">{t("nav.features")}</a>
          <a href="/#pricing" className="hover:text-accent">{t("nav.pricing")}</a>
          <a href="/#faq" className="hover:text-accent">{t("nav.faq")}</a>
          <a href="/#contact" className="hover:text-accent">{t("nav.contact")}</a>
        </nav>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><Globe className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {LANGS.map((l) => (
                <DropdownMenuItem key={l.code} onClick={() => i18n.changeLanguage(l.code)}>{l.label}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" onClick={toggle}>{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><UserIcon className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>{t("nav.dashboard")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>{t("nav.profile")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/billing" })}>{t("nav.billing")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/security" })}>{t("nav.security")}</DropdownMenuItem>
                {isAdmin && <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>{t("nav.admin")}</DropdownMenuItem></>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/" }); }}>{t("nav.logout")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild><Link to="/login">{t("nav.login")}</Link></Button>
              <Button size="sm" asChild><Link to="/register">{t("nav.signup")}</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
