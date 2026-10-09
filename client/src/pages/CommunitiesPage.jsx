const CommunitiesPage = () => {
  const communities = [
    {
      name: 'JDM Enthusiasts',
      description: 'Japanese Domestic Market fans sharing builds, tips, and meets',
      members: '5,234',
      posts: '12,847',
      color: 'from-red-600 to-orange-600',
      tags: ['JDM', 'Imports', 'Tuning', 'Meets']
    },
    {
      name: 'Electric Vehicle Builders',
      description: 'EV conversions, battery tech, and electric performance discussions',
      members: '3,812',
      posts: '8,942',
      color: 'from-green-600 to-emerald-600',
      tags: ['EV', 'Conversion', 'Battery', 'Performance']
    },
    {
      name: 'Classic Car Restoration',
      description: 'Preserving and restoring vintage automobiles to their former glory',
      members: '2,956',
      posts: '6,123',
      color: 'from-blue-600 to-cyan-600',
      tags: ['Classic', 'Restoration', 'Vintage', 'Preservation']
    },
    {
      name: 'Track & Performance',
      description: 'Circuit racing, time attacks, and performance tuning enthusiasts',
      members: '4,128',
      posts: '9,876',
      color: 'from-purple-600 to-pink-600',
      tags: ['Track', 'Racing', 'Performance', 'Tuning']
    },
    {
      name: 'Off-Road & 4x4',
      description: 'Adventure vehicles, overlanding, and off-road modifications',
      members: '3,245',
      posts: '7,543',
      color: 'from-yellow-600 to-amber-600',
      tags: ['OffRoad', '4x4', 'Overland', 'Adventure']
    },
    {
      name: 'Motorcycle Crew',
      description: 'Two-wheel enthusiasts sharing rides, mods, and group rides',
      members: '2,678',
      posts: '5,432',
      color: 'from-indigo-600 to-violet-600',
      tags: ['Motorcycle', 'Bikes', 'Rides', 'Mods']
    },
    {
      name: 'Drift Community',
      description: 'Slide enthusiasts sharing techniques, events, and build logs',
      members: '1,987',
      posts: '4,321',
      color: 'from-rose-600 to-pink-600',
      tags: ['Drift', 'Slide', 'Events', 'Technique']
    },
    {
      name: 'Luxury & Exotic',
      description: 'High-end and exotic car discussions, reviews, and ownership experiences',
      members: '1,543',
      posts: '3,210',
      color: 'from-gray-600 to-zinc-600',
      tags: ['Luxury', 'Exotic', 'Supercars', 'Hypercars']
    },
    {
      name: 'DIY Mechanics',
      description: 'Home garage projects, tool recommendations, and repair guides',
      members: '4,567',
      posts: '11,234',
      color: 'from-teal-600 to-cyan-600',
      tags: ['DIY', 'Mechanics', 'Tools', 'Repair']
    }
  ]

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Communities</h1>
        <p className="text-zinc-400">Join niche groups for specific brands, models, or types of vehicles</p>
      </div>

      {/* Search and Filter */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search communities..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>
          <div className="flex space-x-4">
            <select className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500">
              <option>All Categories</option>
              <option>Brand Specific</option>
              <option>Vehicle Type</option>
              <option>Activity Based</option>
              <option>Technical</option>
            </select>
            <button className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-medium px-6 py-3 rounded-lg">
              Create Community
            </button>
          </div>
        </div>
      </div>

      {/* Community Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {communities.map((community, index) => (
          <div key={index} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all hover:transform hover:-translate-y-1">
            {/* Community Header */}
            <div className={`h-32 bg-gradient-to-r ${community.color} relative`}>
              <div className="absolute bottom-4 left-4">
                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-lg">
                  <span className={`text-2xl font-bold bg-gradient-to-r ${community.color} bg-clip-text text-transparent`}>
                    {community.name.charAt(0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Community Info */}
            <div className="p-6 pt-12">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold mb-1">{community.name}</h3>
                  <p className="text-zinc-400 text-sm mb-3">{community.description}</p>
                </div>
                <button className="text-sm bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg">
                  Join
                </button>
              </div>

              {/* Stats */}
              <div className="flex space-x-6 mb-4">
                <div>
                  <p className="text-2xl font-bold">{community.members}</p>
                  <p className="text-xs text-zinc-400">Members</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{community.posts}</p>
                  <p className="text-xs text-zinc-400">Posts</p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {community.tags.map((tag, tagIndex) => (
                  <span 
                    key={tagIndex} 
                    className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Active Members */}
            <div className="px-6 pb-6">
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((member) => (
                    <div 
                      key={member} 
                      className="w-8 h-8 bg-zinc-800 border-2 border-zinc-900 rounded-full flex items-center justify-center text-xs font-bold"
                    >
                      U{member}
                    </div>
                  ))}
                  <div className="w-8 h-8 bg-zinc-800 border-2 border-zinc-900 rounded-full flex items-center justify-center text-xs text-zinc-400">
                    +{parseInt(community.members.replace(',', '')) - 4}
                  </div>
                </div>
                <span className="text-sm text-zinc-400">Active now</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center mt-12">
        <div className="flex items-center space-x-2">
          <button className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button className="w-10 h-10 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold">
            1
          </button>
          <button className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700">
            2
          </button>
          <button className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700">
            3
          </button>
          <button className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700">
            ...
          </button>
          <button className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700">
            10
          </button>
          <button className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default CommunitiesPage