import { UserProfile } from '@clerk/react'

const ProfilePage = () => {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Profile</h1>
        <p className="text-zinc-400">Manage your account settings and preferences</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <UserProfile 
          appearance={{
            elements: {
              formButtonPrimary: 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700',
              footerActionLink: 'text-red-500 hover:text-red-400',
              card: 'bg-transparent shadow-none border-0',
              headerTitle: 'text-white',
              headerSubtitle: 'text-zinc-400',
              navbar: 'border-b border-zinc-800',
              navbarButton: 'text-zinc-400 hover:text-white border-b-2 border-transparent hover:border-red-500',
              navbarButtonActive: 'text-white border-red-500',
              pageScrollBox: 'border-t border-zinc-800',
              profileSectionTitle: 'text-white',
              profileSectionContent: 'text-zinc-400',
              formFieldLabel: 'text-white',
              formFieldInput: 'bg-zinc-800 border-zinc-700 text-white focus:border-red-500',
              identityPreviewText: 'text-white',
              identityPreviewEditButton: 'text-red-500 hover:text-red-400',
              footer: 'border-t border-zinc-800',
              footerAction: 'text-zinc-400'
            }
          }}
          routing="path"
          path="/profile"
        />
      </div>
    </div>
  )
}

export default ProfilePage