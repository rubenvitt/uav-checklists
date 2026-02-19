import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import './index.css'
import AppRouter from './router.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 56 * 60 * 60 * 1000, // 56h
    },
  },
})

const persister = createSyncStoragePersister({
  storage: window.localStorage,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 56 * 60 * 60 * 1000 }}>
      <AppRouter />
      <TanStackDevtools plugins={[
        { name: 'TanStack Query', render: <ReactQueryDevtoolsPanel />, defaultOpen: true },
      ]} />
    </PersistQueryClientProvider>
  </StrictMode>,
)
