import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { initVersionWatch } from "./lib/version-watch";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  // a tab that stays open across a deploy would fail on its next route chunk — see lib/version-watch.ts (client only, no-op without a build id)
  if (typeof window !== "undefined") initVersionWatch(router as any);

  return router;
};
