import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { initPwa, registerServiceWorker } from "@/lib/pwa";
import { initChunkRecovery, isChunkLoadError, reloadOnceForNewVersion } from "@/lib/chunk-recovery";
import { installDomTranslateGuard } from "@/lib/dom-translate-guard";
import { reportClientError } from "@/lib/client-error-report";

// Client only: must run at module load so a beforeinstallprompt that fires before hydration is not lost.
initPwa();
// A deploy while a student's tab is open makes the old route chunks disappear — reload once instead of showing an error page.
initChunkRecovery((error) => reportClientError("chunk", error));
installDomTranslateGuard(); // browser page-translation must not crash React (NotFoundError insertBefore/removeChild)

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-7xl font-bold tracking-tight text-foreground">404</p>
        <h1 className="mt-4 text-xl font-semibold text-foreground">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter();
  const staleBuild = isChunkLoadError(error);
  useEffect(() => {
    console.error("[AuraLingovia]", error);
    reportClientError(staleBuild ? "chunk" : "boundary", error);
    // a failed route chunk means "a new version was released while this page was open": one automatic reload fixes it
    if (staleBuild) reloadOnceForNewVersion();
  }, [error, staleBuild]);

  if (staleBuild) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">A new version is available</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We just updated AuraLingovia. Reload the page to continue — your progress is saved.
          </p>
          <p dir="rtl" className="mt-1 text-sm text-muted-foreground">تمّ تحديث الموقع. أعد تحميل الصفحة باش تكمّل — تقدّمك محفوظ.</p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred. Try refreshing the page.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AuraLingovia — Test your German. Master every section." },
      { name: "description", content: "Prepare for the TELC B1 or B2 German exam with structured practice, realistic simulations, and a beautifully designed learning experience." },
      { name: "author", content: "AuraLingovia" },
      { name: "theme-color", content: "#0a0a0c" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "AuraLingovia" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black" },
      { property: "og:site_name", content: "AuraLingovia" },
      // Link-preview card (Telegram / WhatsApp / social). www URLs on purpose: the bare domain answers with a redirect, and
      // some crawlers (WhatsApp) do not follow redirects for images. New file name = no stale cached preview image.
      { property: "og:title", content: "AuraLingovia – Telc B1 & B2 Exam Preparation" },
      { property: "og:description", content: "Pass your German exam with precision. Realistic exam simulation and AI feedback for Telc B1 & B2." },
      { property: "og:image", content: "https://www.auralingoviatestdeutsch.academy/og-card.jpg" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "AuraLingovia — Telc B1 & B2 exam preparation: Lesen, Hören, Schreiben, Mündlich" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.auralingoviatestdeutsch.academy/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "AuraLingovia – Telc B1 & B2 Exam Preparation" },
      { name: "twitter:description", content: "Pass your German exam with precision. Realistic exam simulation and AI feedback for Telc B1 & B2." },
      { name: "twitter:image", content: "https://www.auralingoviatestdeutsch.academy/og-card.jpg" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@300..700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => { registerServiceWorker(); }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Outlet />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
