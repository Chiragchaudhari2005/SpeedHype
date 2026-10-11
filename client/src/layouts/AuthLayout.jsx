import { Link } from 'react-router-dom'
import speedhypeLogo from '../assets/speedhype logo.png'

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4 py-10 selection:bg-red-600 selection:text-white">
      {/* Top Precision Accent Line */}
      <div className="fixed top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-80" />

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-block transition-transform hover:scale-105">
            <img
              src={speedhypeLogo}
              alt="SpeedHype"
              className="h-12 w-auto mx-auto object-contain"
            />
          </Link>
          <h1 className="mt-4 text-2xl sm:text-3xl font-black text-white">{title}</h1>
          {subtitle && (
            <p className="mt-1.5 text-xs sm:text-sm text-zinc-400">{subtitle}</p>
          )}
        </div>

        {/* Auth Content Card */}
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
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