import { Link } from 'react-router-dom'

const NotFoundPage = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center">
      {/* Error Code */}
      <div className="relative mb-6">
        <div className="font-mono text-8xl sm:text-9xl font-black bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">
          404
        </div>
        <div className="pointer-events-none absolute -top-4 -right-4 w-28 h-28 bg-red-600/20 rounded-full blur-2xl"></div>
      </div>

      {/* Message */}
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-red-900/60 bg-red-950/50 text-[11px] font-bold uppercase tracking-wider text-red-400 mb-3">
        Pit Lane Detour
      </div>
      <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">You&apos;ve Drifted Off Track</h1>
      <p className="text-sm sm:text-base text-zinc-400 mb-8 max-w-lg leading-relaxed">
        The apex you were looking for doesn&apos;t exist or has moved to a new paddock. Return to the track below.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm justify-center">
        <Link 
          to="/" 
          className="inline-flex items-center justify-center bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3 px-6 rounded-xl text-sm shadow-lg shadow-red-950/50 transition-all hover:scale-[1.02]"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Back to Home
        </Link>
        
        <Link 
          to="/dashboard" 
          className="inline-flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-white font-bold py-3 px-6 rounded-xl text-sm transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Go to Dashboard
        </Link>
      </div>

      {/* Quick Links */}
      <div className="mt-12">
        <h3 className="text-lg font-bold mb-4">Quick Links</h3>
        <div className="flex flex-wrap justify-center gap-4">
          {[
            { label: 'Feed', path: '/feed' },
            { label: 'Communities', path: '/communities' },
            { label: 'Blogs', path: '/blogs' },
            { label: 'Cars', path: '/cars' },
            { label: 'Compare', path: '/compare' },
            { label: 'Profile', path: '/profile' }
          ].map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-zinc-300 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-8 text-center text-zinc-500 max-w-2xl">
        <p className="text-sm">
          If you believe this is an error, please{' '}
          <a href="mailto:support@speedhype.com" className="text-red-500 hover:text-red-400">
            contact support
          </a>{' '}
          or check our{' '}
          <Link to="/help" className="text-red-500 hover:text-red-400">
            help center
          </Link>.
        </p>
      </div>
    </div>
  )
}

export default NotFoundPage