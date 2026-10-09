import { useAuth } from '@clerk/react'
import { Navigate } from 'react-router-dom'

const ProtectedRoute = ({ children }) => {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-400" role="status">
        Loading your session...
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />
  }

  return children
}

export default ProtectedRoute