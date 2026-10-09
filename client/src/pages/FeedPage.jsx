import { Link } from 'react-router-dom'

const FeedPage = () => {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Your Feed</h1>
        <p className="text-zinc-400">Stay updated with the latest from the automotive community</p>
      </div>

      {/* Feed Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-orange-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold">SH</span>
              </div>
              <div>
                <h3 className="font-bold">What's on your mind?</h3>
                <p className="text-sm text-zinc-400">Share your latest build or discovery</p>
              </div>
            </div>
            <textarea 
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-4 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              placeholder="Share your latest automotive update..."
              rows="3"
            />
            <div className="flex justify-between items-center mt-4">
              <div className="flex space-x-4">
                <button className="text-zinc-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                <button className="text-zinc-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
              </div>
              <button className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-medium py-2 px-6 rounded-lg">
                Post
              </button>
            </div>
          </div>

          {/* Feed Items */}
          <div className="space-y-6">
            {[1, 2, 3].map((item) => (
              <div key={item} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-start mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-orange-600 rounded-full flex items-center justify-center mr-4">
                    <span className="text-white font-bold">U{item}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold">Automotive Enthusiast {item}</h4>
                        <p className="text-sm text-zinc-400">Posted {item * 2} hours ago</p>
                      </div>
                      <button className="text-zinc-400 hover:text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                
                <p className="mb-4">
                  Just finished installing a new turbo kit on my project car! The difference in performance is incredible. 
                  Can't wait to take it to the track this weekend.
                </p>
                
                <div className="bg-zinc-800 rounded-lg p-4 mb-4">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">Track Day - This Saturday</span>
                  </div>
                  <p className="text-sm text-zinc-400">
                    Local circuit • 10AM - 6PM • All skill levels welcome
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
                  <div className="flex space-x-6">
                    <button className="flex items-center text-zinc-400 hover:text-red-500">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                      <span>42</span>
                    </button>
                    <button className="flex items-center text-zinc-400 hover:text-blue-500">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>8</span>
                    </button>
                    <button className="flex items-center text-zinc-400 hover:text-green-500">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Trending */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold mb-4">Trending Topics</h3>
            <div className="space-y-3">
              {[
                { tag: '#TurboUpgrade', posts: '142' },
                { tag: '#TrackDay', posts: '89' },
                { tag: '#ProjectCar', posts: '76' },
                { tag: '#PerformanceTuning', posts: '64' },
                { tag: '#ElectricConversion', posts: '45' }
              ].map((topic, index) => (
                <div key={index} className="flex justify-between items-center p-3 hover:bg-zinc-800 rounded-lg cursor-pointer">
                  <span className="font-medium">{topic.tag}</span>
                  <span className="text-sm text-zinc-400">{topic.posts} posts</span>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Communities */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4">Suggested Communities</h3>
            <div className="space-y-4">
              {[
                { name: 'JDM Enthusiasts', members: '5.2k', color: 'from-red-600 to-orange-600' },
                { name: 'Electric Vehicle Builders', members: '3.8k', color: 'from-green-600 to-emerald-600' },
                { name: 'Classic Car Restoration', members: '2.9k', color: 'from-blue-600 to-cyan-600' },
                { name: 'Track & Performance', members: '4.1k', color: 'from-purple-600 to-pink-600' }
              ].map((community, index) => (
                <div key={index} className="flex items-center p-3 hover:bg-zinc-800 rounded-lg cursor-pointer">
                  <div className={`w-10 h-10 bg-gradient-to-r ${community.color} rounded-lg flex items-center justify-center mr-3`}>
                    <span className="text-white font-bold">{community.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{community.name}</h4>
                    <p className="text-sm text-zinc-400">{community.members} members</p>
                  </div>
                  <button className="text-sm bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1 rounded-lg">
                    Join
                  </button>
                </div>
              ))}
            </div>
            <Link 
              to="/communities" 
              className="block text-center mt-4 text-red-500 hover:text-red-400 font-medium"
            >
              View all communities →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FeedPage