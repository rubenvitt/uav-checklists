import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: 'https://41757821305362d95e55f076d122fc5f@sentry.rubeen.dev/2',
  sendDefaultPii: true,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
    Sentry.feedbackIntegration({
      colorScheme: 'system',
      autoInject: false,
      showBranding: false,
      formTitle: 'Feedback geben',
      submitButtonLabel: 'Absenden',
      cancelButtonLabel: 'Abbrechen',
      nameLabel: 'Name',
      emailLabel: 'E-Mail',
      messageLabel: 'Beschreibung',
      messagePlaceholder: 'Was ist passiert? Was hast du erwartet?',
      successMessageText: 'Danke für dein Feedback!',
      isRequiredLabel: '(Pflichtfeld)',
      addScreenshotButtonLabel: 'Screenshot hinzufügen',
      removeScreenshotButtonLabel: 'Screenshot entfernen',
      themeLight: {
        background: '#ffffff',
        backgroundHover: '#f1f5f9',
        foreground: '#0f172a',
        border: '#e2e8f0',
        accent: '#0f172a',
        accentForeground: '#f8fafc',
        success: '#16a34a',
        error: '#dc2626',
      },
      themeDark: {
        background: '#1e293b',
        backgroundHover: '#334155',
        foreground: '#f1f5f9',
        border: '#334155',
        accent: '#f1f5f9',
        accentForeground: '#0f172a',
        success: '#22c55e',
        error: '#ef4444',
      },
    }),
  ],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ['localhost'],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true,
})

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
