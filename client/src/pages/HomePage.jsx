import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/react'

const features = [
  {
    title: 'The Paddock Feed',
    description: 'Real-time updates, garage project milestones, and vehicle launches from drivers across the globe.',
    path: '/feed',
    tag: 'Live Pulse',
    icon: (
      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  {
    title: 'Niche Communities',
    description: 'Join focused crews by chassis, engine, brand, or discipline—from JDM legends and track days to EV conversions.',
    path: '/communities',
    tag: 'Crews & Pits',
    icon: (
      <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  {
    title: 'SpeedHype Journal',
    description: 'Deep dives, track reviews, build logs, and technical teardowns written by real enthusiasts.',
    path: '/blogs',
    tag: 'Editorial',
    icon: (
      <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    )
  },
  {
    title: 'Verified Car Catalog',
    description: 'Ex-showroom pricing, power curves, torque, mileage, and dimensions sourced from manufacturer data.',
    path: '/cars',
    tag: '0% Guesswork',
    icon: (
      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    )
  },
  {
    title: 'Head-to-Head Compare',
    description: 'Direct side-by-side spec comparisons with difference highlighting to help you choose your next machine.',
    path: '/compare',
    tag: 'Telemetry',
    icon: (
      <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    title: 'Enthusiast Dashboard',
    description: 'Your command center: manage your garage vehicles, published stories, joined crews, and recent telemetry.',
    path: '/dashboard',
    tag: 'Garage Hub',
    icon: (
      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )
  }
]

const HomePage = () => {
  const { isSignedIn } = useAuth()

  return (
    <div className="py-6 sm:py-12">
      {/* Hero Section */}
      <section className="relative text-center max-w-4xl mx-auto px-2">
        {/* Subtle Ambient Glow */}
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-72 w-96 rounded-full bg-red-600/15 blur-3xl" />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-red-900/60 bg-red-950/40 text-red-300 text-xs font-bold uppercase tracking-wider mb-6">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
          <span>The Digital Garage & Telemetry Platform</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight sm:leading-none">
          Your Automotive World.{' '}
          <span className="block mt-2 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">
            One Platform.
          </span>
        </h1>

        {/* Subhead */}
        <p className="mt-5 text-base sm:text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed">
          Connect with drivers, tuners, and builders worldwide. Explore verified vehicle specifications, join dedicated crews, write build logs, and compare machines head-to-head.
        </p>

        {/* Telemetry Stats Bar */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
          {[
            ['100% Sourced', 'Verified specs only'],
            ['Real Builds', 'Community journals'],
            ['Side-by-Side', 'Live spec compare'],
            ['Pit Lane Chat', 'Real-time discussions'],
          ].map(([heading, caption]) => (
            <div key={heading} className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2.5 sm:p-3 text-center">
              <p className="text-xs sm:text-sm font-black text-white">{heading}</p>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 font-medium">{caption}</p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          {isSignedIn ? (
            <>
              <Link 
                to="/dashboard" 
                className="w-full sm:w-auto inline-flex items-center justify-center bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3.5 px-8 rounded-xl text-base shadow-lg shadow-red-950/50 transition-all hover:scale-[1.02]"
              >
                Go to Dashboard →
              </Link>
              <Link 
                to="/cars" 
                className="w-full sm:w-auto inline-flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 font-bold py-3.5 px-6 rounded-xl text-base transition-colors"
              >
                Browse Car Database
              </Link>
            </>
          ) : (
            <>
              <Link 
                to="/sign-up" 
                className="w-full sm:w-auto inline-flex items-center justify-center bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3.5 px-8 rounded-xl text-base shadow-lg shadow-red-950/50 transition-all hover:scale-[1.02]"
              >
                Join SpeedHype Free
              </Link>
              <Link 
                to="/sign-in" 
                className="w-full sm:w-auto inline-flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 font-bold py-3.5 px-6 rounded-xl text-base transition-colors"
              >
                Sign In to Garage
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features Grid */}
      <section className="mt-16 sm:mt-20">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-400">High-Octane Features</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-black text-white">Engineered for the driving enthusiast</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature) => (
            <Link 
              key={feature.title}
              to={feature.path}
              className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 sm:p-6 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900 hover:-translate-y-1 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700/50 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-800">
                    {feature.tag}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-red-300 transition-colors">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs font-semibold text-red-400 group-hover:text-red-300">
                <span>Explore</span>
                <span className="transform transition-transform group-hover:translate-x-1">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="mt-16 sm:mt-20 rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-red-950/40 p-6 sm:p-12 text-center relative overflow-hidden">
        <div className="pointer-events-none absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-red-600/10 blur-3xl" />
        <h2 className="text-2xl sm:text-4xl font-black text-white">
          Ready to accelerate your automotive journey?
        </h2>
        <p className="mt-3 text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
          Join drivers, tuners, and journalists who are sharing, discussing, and exploring on SpeedHype today.
        </p>
        <div className="mt-6">
          <Link 
            to={isSignedIn ? '/feed' : '/sign-up'} 
            className="inline-flex items-center justify-center bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3 px-8 rounded-xl text-base shadow-lg shadow-red-950/60 transition-transform hover:scale-105"
          >
            {isSignedIn ? 'Open Your Feed →' : 'Create Free Account →'}
          </Link>
        </div>
      </section>
    </div>
  )
}

export default HomePage