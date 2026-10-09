import { useAuth } from '@clerk/react'
import { Link } from 'react-router-dom'

const DashboardPage = () => {
  const { user } = useAuth()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.firstName || 'Enthusiast'}!</h1>
        <p className="text-zinc-400">Your automotive dashboard is ready to roll</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-zinc-400 text-sm">Your Posts</p>
              <p className="text-2xl font-bold">12</p>
            </div>
            <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-zinc-500">Total shared content</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-zinc-400 text-sm">Communities</p>
              <p className="text-2xl font-bold">5</p>
            </div>
            <div className="w-10 h-10 bg-orange-600/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13 0a5 5 0 00-7.742-.742" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-zinc-500">Active group memberships</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-zinc-400 text-sm">Connections</p>
              <p className="text-2xl font-bold">47</p>
            </div>
            <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-zinc-500">Fellow enthusiasts</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { name: 'Feed', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', color: 'bg-red-600', path: '/feed' },
            { name: 'Communities', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13 0a5 5 0 00-7.742-.742', color: 'bg-orange-600', path: '/communities' },
            { name: 'Blogs', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z', color: 'bg-yellow-600', path: '/blogs' },
            { name: 'Cars', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: 'bg-green-600', path: '/cars' },
            { name: 'Compare', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'bg-blue-600', path: '/compare' },
            { name: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', color: 'bg-purple-600', path: '/profile' }
          ].map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:border-zinc-700 hover:transform hover:-translate-y-1 transition-all"
            >
              <div className={`w-12 h-12 ${item.color} rounded-lg flex items-center justify-center mb-2`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                </svg>
              </div>
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="space-y-4">
            {[
              { action: 'Posted in "Turbocharged Builds"', time: '2 hours ago' },
              { action: 'Liked a comparison post', time: '5 hours ago' },
              { action: 'Joined "Electric Vehicles" community', time: '1 day ago' },
              { action: 'Added new car to garage', time: '2 days ago' },
              { action: 'Commented on blog post', time: '3 days ago' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                  <span>{activity.action}</span>
                </div>
                <span className="text-zinc-500 text-sm">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage