"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { usePreferences } from "@/stores/preferences";

function PreferenceSync() {
  const { textSize, highContrast } = usePreferences();
  useEffect(() => {
    document.documentElement.dataset.text = textSize;
    document.documentElement.dataset.contrast = highContrast ? "high" : "normal";
  }, [textSize, highContrast]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <PreferenceSync />
      {children}
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
