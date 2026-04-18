import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { ToastProvider } from "@/shared/feedback/toast-provider";
import { RealtimeProvider } from "@/shared/realtime/realtime-provider";

export function AppProviders({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 10000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RealtimeProvider queryClient={queryClient}>{children}</RealtimeProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
