/**
 * "Install the app" entry points (PWA):
 *  - InstallAppBanner: dismissible card at the top of the content area, phones only.
 *  - InstallAppMenuItem: always-available entry in the sidebar Account group.
 * Android / desktop Chrome use the browser's own install dialog; iPhone / iPad get a short Share → Add to Home Screen guide.
 * Both disappear once the app is installed (standalone window) or when the browser cannot install at all.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Share, SquarePlus, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { dismissBanner, isBannerDismissed, promptInstall, usePwa } from "@/lib/pwa";

function IosGuideDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const steps = [
    { icon: Share, text: t("pwa.ios_step1") },
    { icon: SquarePlus, text: t("pwa.ios_step2") },
    { icon: Smartphone, text: t("pwa.ios_step3") },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle dir="auto">{t("pwa.ios_title")}</DialogTitle>
          <DialogDescription dir="auto">{t("pwa.ios_note")}</DialogDescription>
        </DialogHeader>
        <ol className="space-y-3">
          {steps.map(({ icon: Icon, text }, i) => (
            <li key={i} className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <span dir="auto" className="pt-1 text-sm leading-snug text-foreground">{text}</span>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}

/** One place that decides what "install" means on this device: native prompt where the browser offers one, the iOS guide otherwise. */
function useInstallAction() {
  const pwa = usePwa();
  const [guideOpen, setGuideOpen] = useState(false);
  const available = !pwa.installed && (pwa.canPrompt || pwa.ios);
  const run = async () => {
    if (pwa.canPrompt) await promptInstall();
    else if (pwa.ios) setGuideOpen(true);
  };
  return { available, run, pwa, guideOpen, setGuideOpen };
}

export function InstallAppBanner() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { available, run, pwa, guideOpen, setGuideOpen } = useInstallAction();
  // Start hidden and read storage in an effect: no hydration mismatch and no one-frame flash for people who already dismissed it.
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => { setDismissed(isBannerDismissed()); }, []);

  if (!isMobile || !available || dismissed) return null;

  return (
    <>
      <div role="region" aria-label={t("pwa.install_title")} className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 shadow-sm">
        <img src="/pwa-icon-192.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p dir="auto" className="text-sm font-semibold leading-snug text-foreground">{t("pwa.install_title")}</p>
          <p dir="auto" className="mt-0.5 text-xs leading-snug text-muted-foreground">{t("pwa.install_desc")}</p>
          <div className="mt-2.5 flex items-center gap-2">
            <Button size="sm" onClick={run}>{pwa.canPrompt ? t("pwa.install_cta") : t("pwa.how")}</Button>
            <Button size="sm" variant="ghost" onClick={() => { dismissBanner(); setDismissed(true); }}>{t("pwa.later")}</Button>
          </div>
        </div>
      </div>
      <IosGuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </>
  );
}

export function InstallAppMenuItem() {
  const { t } = useTranslation();
  const { available, run, guideOpen, setGuideOpen } = useInstallAction();
  if (!available) return null;
  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={run} className="gap-3 text-sidebar-foreground/60 transition-all duration-150 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground">
          <Smartphone className="h-4 w-4 shrink-0" />
          <span className="flex-1 group-data-[collapsible=icon]:hidden">{t("pwa.install_cta")}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <IosGuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </>
  );
}
