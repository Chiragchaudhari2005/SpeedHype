import { Link } from 'react-router-dom'

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-orange-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-white font-bold text-2xl">SpeedHype</span>
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-white">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-zinc-400">{subtitle}</p>
          )}
        </div>

        {/* Auth Content */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-xl">
          {children}
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center text-zinc-400">
          <p className="text-sm">
            By continuing, you agree to our{' '}
            <a href="#" className="text-red-500 hover:text-red-400 font-medium">Terms</a>{' '}
            and{' '}
            <a href="#" className="text-red-500 hover:text-red-400 font-medium">Privacy Policy</a>.
          </p>
          <p className="mt-4 text-sm">
            <Link to="/" className="text-red-500 hover:text-red-400 font-medium">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default AuthLayout