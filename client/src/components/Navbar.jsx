import { useAuth, UserButton } from '@clerk/react'
import { Link } from 'react-router-dom'

const Navbar = () => {
  const { isSignedIn } = useAuth()

  return (
    <nav className="bg-zinc-950 border-b border-zinc-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-600 rounded-full"></div>
              <span className="text-white font-bold text-xl">SpeedHype</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            {isSignedIn ? (
              <>
                <Link 
                  to="/feed" 
                  className="text-zinc-300 hover:text-white transition-colors font-medium"
                >
                  Feed
                </Link>
                <Link 
                  to="/communities" 
                  className="text-zinc-300 hover:text-white transition-colors font-medium"
                >
                  Communities
                </Link>
                <Link 
                  to="/blogs" 
                  className="text-zinc-300 hover:text-white transition-colors font-medium"
                >
                  Blogs
                </Link>
                <Link 
                  to="/cars" 
                  className="text-zinc-300 hover:text-white transition-colors font-medium"
                >
                  Cars
                </Link>
                <Link 
                  to="/compare" 
                  className="text-zinc-300 hover:text-white transition-colors font-medium"
                >
                  Compare
                </Link>
                <Link 
                  to="/dashboard" 
                  className="text-zinc-300 hover:text-white transition-colors font-medium"
                >
                  Dashboard
                </Link>
                <UserButton 
                  appearance={{
                    elements: {
                      userButtonAvatarBox: 'w-8 h-8'
                    }
                  }}
                />
              </>
            ) : (
              <>
                <Link 
                  to="/" 
                  className="text-zinc-300 hover:text-white transition-colors font-medium"
                >
                  Home
                </Link>
                <Link 
                  to="/sign-in" 
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  to="/sign-up" 
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar