import { SignUp } from '@clerk/react'
import AuthLayout from '../layouts/AuthLayout'

const SignUpPage = () => {
  return (
    <AuthLayout 
      title="Join SpeedHype" 
      subtitle="Create your account and enter the automotive community"
    >
      <SignUp 
        appearance={{
          elements: {
            formButtonPrimary: 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700',
            footerActionLink: 'text-red-500 hover:text-red-400',
            card: 'bg-transparent shadow-none',
            headerTitle: 'text-white',
            headerSubtitle: 'text-zinc-400',
            socialButtonsBlockButton: 'border-zinc-700 hover:bg-zinc-800',
            formFieldLabel: 'text-white',
            formFieldInput: 'bg-zinc-800 border-zinc-700 text-white focus:border-red-500',
            identityPreviewText: 'text-white',
            identityPreviewEditButton: 'text-red-500 hover:text-red-400',
            footer: 'border-t border-zinc-800',
            footerAction: 'text-zinc-400'
          }
        }}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        redirectUrl="/dashboard"
      />
    </AuthLayout>
  )
}

export default SignUpPage