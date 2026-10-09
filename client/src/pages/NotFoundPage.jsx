import { Link } from 'react-router-dom'

const NotFoundPage = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center">
      {/* Error Code */}
      <div className="relative mb-8">
        <div className="text-9xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
          404
        </div>
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-r from-red-600 to-orange-600 rounded-full opacity-20 blur-xl"></div>
        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full opacity-20 blur-xl"></div>
      </div>

      {/* Message */}
      <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
      <p className="text-xl text-zinc-400 mb-8 max-w-2xl">
        The page you're looking for doesn't exist or has been moved. 
        Don't worry, you can navigate back to safety.
      </p>

      {/* Illustration */}
      <div className="relative w-64 h-64 mb-8">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 border-4 border-dashed border-zinc-800 rounded-full animate-pulse"></div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 border-4 border-dashed border-zinc-700 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-orange-600 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link 
          to="/" 
          className="inline-flex items-center justify-center bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all transform hover:scale-105"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Back to Home
        </Link>
        
        <Link 
          to="/dashboard" 
          className="inline-flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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