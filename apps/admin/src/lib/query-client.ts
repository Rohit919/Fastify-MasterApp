import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s — admin data doesn't change every render
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
