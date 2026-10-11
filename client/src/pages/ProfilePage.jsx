import { UserProfile } from '@clerk/react'

const ProfilePage = () => {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-red-900/60 bg-red-950/50 text-[11px] font-bold uppercase tracking-wider text-red-400 mb-2">
          Driver Credentials
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white">Your Profile</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage your SpeedHype account security, authentication, and garage preferences.</p>
      </div>

      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 sm:p-6 shadow-xl overflow-x-auto">
        <UserProfile 
          appearance={{
            elements: {
              formButtonPrimary: 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 font-bold',
              footerActionLink: 'text-red-500 hover:text-red-400 font-medium',
              card: 'bg-transparent shadow-none border-0 w-full',
              headerTitle: 'text-white font-bold',
              headerSubtitle: 'text-zinc-400',
              navbar: 'border-b border-zinc-800',
              navbarButton: 'text-zinc-400 hover:text-white border-b-2 border-transparent hover:border-red-500 font-semibold',
              navbarButtonActive: 'text-white border-red-500 font-bold',
              pageScrollBox: 'border-t border-zinc-800',
              profileSectionTitle: 'text-white font-bold',
              profileSectionContent: 'text-zinc-400',
              formFieldLabel: 'text-zinc-200 font-semibold',
              formFieldInput: 'bg-zinc-950 border-zinc-700 text-white focus:border-red-500',
              identityPreviewText: 'text-white font-medium',
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