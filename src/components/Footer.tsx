import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { GraduationCap } from "lucide-react";

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t bg-muted/30 mt-16">
      <div className="container mx-auto px-4 py-10 grid gap-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 font-bold"><GraduationCap className="h-5 w-5 text-accent" /> Lingovia</div>
          <p className="mt-2 text-sm text-muted-foreground">Professional TELC B1 & B2 preparation.</p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <Link to="/privacy" className="hover:text-accent">{t("footer.privacy")}</Link>
          <Link to="/terms" className="hover:text-accent">{t("footer.terms")}</Link>
          <Link to="/refund" className="hover:text-accent">{t("footer.refund")}</Link>
          <Link to="/cookies" className="hover:text-accent">{t("footer.cookies")}</Link>
        </div>
        <div className="text-sm text-muted-foreground md:text-right">© {new Date().getFullYear()} Lingovia. {t("footer.rights")}.</div>
      </div>
    </footer>
  );
}
