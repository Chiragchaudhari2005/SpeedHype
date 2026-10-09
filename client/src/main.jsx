import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const content = clerkPublishableKey ? (
  <ClerkProvider publishableKey={clerkPublishableKey}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ClerkProvider>
) : (
  <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
    <section className="max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-8">
      <h1 className="text-2xl font-bold">Clerk authentication is not configured</h1>
      <p className="mt-3 text-zinc-300">
        Set a valid Clerk publishable key in <code>client/.env.local</code> as
        <code className="ml-1">VITE_CLERK_PUBLISHABLE_KEY</code>, then restart the client.
      </p>
    </section>
  </main>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {content}
  </StrictMode>,
)
