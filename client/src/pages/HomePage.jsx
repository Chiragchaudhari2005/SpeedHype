import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/react'

const HomePage = () => {
  const { isSignedIn } = useAuth()

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-block p-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-full mb-6">
          <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
          Your Automotive World. One Platform.
        </h1>
        <p className="text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
          Connect with car and bike enthusiasts worldwide. Share your passion, discover builds, join communities, and elevate your automotive journey.
        </p>
        
        {isSignedIn ? (
          <Link 
            to="/dashboard" 
            className="inline-block bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all transform hover:scale-105"
          >
            Go to Dashboard
          </Link>
        ) : (
          <div className="space-x-4">
            <Link 
              to="/sign-up" 
              className="inline-block bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all transform hover:scale-105"
            >
              Join SpeedHype
            </Link>
            <Link 
              to="/sign-in" 
              className="inline-block bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl w-full mt-12">
        {[
          {
            title: 'Feed',
            description: 'Stay updated with the latest posts, builds, and discussions from the automotive community.',
            icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
          },
          {
            title: 'Communities',
            description: 'Join niche groups for specific brands, models, or types of vehicles. Share knowledge and experiences.',
            icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13 0a5 5 0 00-7.742-.742'
          },
          {
            title: 'Blogs',
            description: 'Read and write detailed guides, reviews, and stories about automotive culture and technology.',
            icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z'
          },
          {
            title: 'Cars',
            description: 'Explore vehicle specifications, modifications, and performance data from enthusiasts worldwide.',
            icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
          },
          {
            title: 'Compare',
            description: 'Side-by-side comparison of vehicles, parts, and performance metrics to make informed decisions.',
            icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
          },
          {
            title: 'Dashboard',
            description: 'Your personal hub for tracking activities, managing content, and connecting with other enthusiasts.',
            icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'
          }
        ].map((feature, index) => (
          <div 
            key={index} 
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all hover:transform hover:-translate-y-1"
          >
            <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={feature.icon} />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
            <p className="text-zinc-400">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* CTA Section */}
      <div className="mt-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to accelerate your automotive journey?</h2>
        <p className="text-zinc-400 mb-8 max-w-2xl mx-auto">
          Join thousands of enthusiasts who are sharing, learning, and connecting on SpeedHype.
        </p>
        {!isSignedIn && (
          <Link 
            to="/sign-up" 
            className="inline-block bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all transform hover:scale-105"
          >
            Get Started Free
          </Link>
        )}
      </div>
    </div>
  )
}

export default HomePage