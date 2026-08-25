import { applyStoredTheme } from "@seldon/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app.css";
import { router } from "./router.js";

// Before React paints, so a light-theme user never sees a dark flash.
// The console's CSP forbids inline scripts, so this is the earliest hook.
applyStoredTheme();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

const root = document.getElementById("root");
if (!root) throw new Error("Terminus has no mount point");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
