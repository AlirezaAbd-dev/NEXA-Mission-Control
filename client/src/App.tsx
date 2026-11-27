import { tr, useUiLocale } from "@/i18n";
import { MutationFeedback } from "@/components/common/MutationFeedback";
import { apiError } from "@/lib/apiError";
import React, { useEffect, Suspense } from "react";
import { RouterProvider } from "react-router";
import {
  QueryClient,
  QueryClientProvider,
  MutationCache,
} from "@tanstack/react-query";
import { router } from "./routes/router";
import { useUiStore } from "./stores/ui.store";

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (!mutation.options.meta?.handlesError) useUiStore.getState().setMutationError(apiError(error));
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  useUiLocale();
  const theme = useUiStore((s) => s.theme);
  const uiTheme = useUiStore((s) => s.uiTheme);
  const previewUiTheme = useUiStore((s) => s.previewUiTheme);
  const effectiveUiTheme = previewUiTheme ?? uiTheme;

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      root.style.colorScheme = "light";
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (effectiveUiTheme === "teal") {
      root.removeAttribute("data-ui-theme");
    } else {
      root.setAttribute("data-ui-theme", effectiveUiTheme);
    }
  }, [effectiveUiTheme]);

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense
        fallback={
          <div className="p-8 animate-pulse text-muted-foreground">{tr("Loading Mission Control…")}</div>
        }
      >
        <RouterProvider router={router} />
      </Suspense>
      <MutationFeedback />
    </QueryClientProvider>
  );
};

export default App;
