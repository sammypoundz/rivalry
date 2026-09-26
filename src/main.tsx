import { StrictMode, useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { queryClient, MUTATED_EVENT, invalidateAll } from "./lib/queries";
import "./index.css";

/**
 * Listens for successful mutations anywhere in the app (votes, likes, image
 * likes, gallery uploads/removals, contest entries, referrals…) and invalidates
 * all React Query caches, so every mounted screen re-renders with fresh data
 * immediately — no page refresh needed.
 */
function QueryBridge({ children }: { children: ReactNode }) {
  useEffect(() => {
    const onMutated = () => invalidateAll();
    window.addEventListener(MUTATED_EVENT, onMutated);
    return () => window.removeEventListener(MUTATED_EVENT, onMutated);
  }, []);
  return children;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <QueryBridge>
        <App />
      </QueryBridge>
    </QueryClientProvider>
  </StrictMode>,
);
