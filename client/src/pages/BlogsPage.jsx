import { Link } from 'react-router-dom'

const BlogsPage = () => {
  const blogs = [
    {
      id: 1,
      title: 'The Complete Guide to Turbocharging Your Daily Driver',
      excerpt: 'Learn how to add a turbocharger to your daily driver without compromising reliability. We cover everything from turbo selection to tuning and maintenance.',
      author: 'Mike Chen',
      date: 'Mar 15, 2024',
      readTime: '12 min read',
      category: 'Performance',
      color: 'from-red-600 to-orange-600',
      featured: true
    },
    {
      id: 2,
      title: 'Electric Vehicle Conversions: A Beginner\'s Journey',
      excerpt: 'Follow our 6-month project converting a classic VW Beetle to electric power. Includes cost breakdowns, challenges faced, and performance results.',
      author: 'Sarah Johnson',
      date: 'Feb 28, 2024',
      readTime: '18 min read',
      category: 'EV',
      color: 'from-green-600 to-emerald-600'
    },
    {
      id: 3,
      title: 'Track Day Essentials: What to Bring for Your First Time',
      excerpt: 'Preparing for your first track day? This comprehensive checklist covers everything from safety gear to tools and spare parts.',
      author: 'David Rodriguez',
      date: 'Feb 15, 2024',
      readTime: '8 min read',
      category: 'Track',
      color: 'from-blue-600 to-cyan-600'
    },
    {
      id: 4,
      title: 'The Art of Drifting: Techniques and Car Setup',
      excerpt: 'Master the fundamentals of drifting with our detailed guide to car setup, weight transfer, and throttle control techniques.',
      author: 'Kenji Tanaka',
      date: 'Jan 30, 2024',
      readTime: '15 min read',
      category: 'Drift',
      color: 'from-purple-600 to-pink-600'
    },
    {
      id: 5,
      title: 'Restoring a 1967 Mustang: Part 1 - Body Work',
      excerpt: 'Join us as we begin the restoration of a classic Mustang. This first installment covers rust repair, panel replacement, and body preparation.',
      author: 'Robert Miller',
      date: 'Jan 22, 2024',
      readTime: '14 min read',
      category: 'Restoration',
      color: 'from-yellow-600 to-amber-600'
    },
    {
      id: 6,
      title: 'Off-Road Lighting Systems: LED vs Halogen vs HID',
      excerpt: 'Compare different lighting technologies for off-road use. We test brightness, durability, power consumption, and installation complexity.',
      author: 'Alex Carter',
      date: 'Jan 10, 2024',
      readTime: '10 min read',
      category: 'Off-Road',
      color: 'from-indigo-600 to-violet-600'
    },
    {
      id: 7,
      title: 'Building a Home Garage Workshop on a Budget',
      excerpt: 'Create the perfect workspace without breaking the bank. Includes tool recommendations, organization tips, and essential equipment lists.',
      author: 'Lisa Wang',
      date: 'Dec 28, 2023',
      readTime: '11 min read',
      category: 'DIY',
      color: 'from-teal-600 to-cyan-600'
    },
    {
      id: 8,
      title: 'The Future of Automotive Performance: Hybrid Hypercars',
      excerpt: 'Explore how hybrid technology is revolutionizing the hypercar segment with insane power figures and unprecedented efficiency.',
      author: 'James Wilson',
      date: 'Dec 15, 2023',
      readTime: '16 min read',
      category: 'Technology',
      color: 'from-rose-600 to-pink-600'
    }
  ]

  const categories = [
    { name: 'All', count: 42 },
    { name: 'Performance', count: 12 },
    { name: 'EV', count: 8 },
    { name: 'Restoration', count: 6 },
    { name: 'Track', count: 9 },
    { name: 'Drift', count: 5 },
    { name: 'Off-Road', count: 7 },
    { name: 'DIY', count: 15 },
    { name: 'Technology', count: 11 }
  ]

  const featuredBlog = blogs.find(blog => blog.featured)

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Blogs</h1>
        <p className="text-zinc-400">Read and write detailed guides, reviews, and stories about automotive culture and technology</p>
      </div>

      {/* Featured Blog */}
      {featuredBlog && (
        <div className="mb-12">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className={`h-64 bg-gradient-to-r ${featuredBlog.color} relative`}>
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                <div className="text-center px-8">
                  <span className="inline-block px-4 py-1 bg-white bg-opacity-20 backdrop-blur-sm text-white rounded-full text-sm font-medium mb-4">
                    Featured Article
                  </span>
                  <h2 className="text-3xl font-bold text-white mb-4">{featuredBlog.title}</h2>
                  <div className="flex items-center justify-center space-x-4 text-white">
                    <span>{featuredBlog.author}</span>
                    <span>•</span>
                    <span>{featuredBlog.date}</span>
                    <span>•</span>
                    <span>{featuredBlog.readTime}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-8">
              <p className="text-lg text-zinc-300 mb-6">{featuredBlog.excerpt}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">
                    <span className="font-bold">{featuredBlog.author.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium">{featuredBlog.author}</p>
                    <p className="text-sm text-zinc-400">Automotive Journalist</p>
                  </div>
                </div>
                <button className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-medium px-6 py-3 rounded-lg">
                  Read Full Article
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Categories */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold mb-4">Categories</h3>
            <div className="space-y-2">
              {categories.map((category, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 hover:bg-zinc-800 rounded-lg cursor-pointer"
                >
                  <span className="font-medium">{category.name}</span>
                  <span className="text-sm text-zinc-400">{category.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Write Blog */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4">Share Your Knowledge</h3>
            <p className="text-zinc-400 mb-4">
              Have expertise to share? Write a blog post and help the community learn.
            </p>
            <button className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-medium py-3 rounded-lg mb-4">
              Write a Blog Post
            </button>
            <p className="text-sm text-zinc-400">
              Writing guidelines and tips are available in our{' '}
              <Link to="#" className="text-red-500 hover:text-red-400">contributor guide</Link>.
            </p>
          </div>

          {/* Newsletter */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mt-6">
            <h3 className="text-xl font-bold mb-4">Stay Updated</h3>
            <p className="text-zinc-400 mb-4">
              Get weekly articles and guides delivered to your inbox.
            </p>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Your email"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
              <button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 rounded-lg">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Blog Grid */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Latest Articles</h2>
              <p className="text-zinc-400">Recently published community content</p>
            </div>
            <div className="flex space-x-4">
              <select className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500">
                <option>Newest First</option>
                <option>Most Popular</option>
                <option>Oldest First</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {blogs.filter(blog => !blog.featured).map((blog) => (
              <div key={blog.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all">
                {/* Blog Header */}
                <div className={`h-40 bg-gradient-to-r ${blog.color} relative`}>
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-white bg-opacity-20 backdrop-blur-sm text-white rounded-full text-sm font-medium">
                      {blog.category}
                    </span>
                  </div>
                </div>

                {/* Blog Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-3">{blog.title}</h3>
                  <p className="text-zinc-400 mb-4">{blog.excerpt}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold">{blog.author.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{blog.author}</p>
                        <p className="text-xs text-zinc-400">{blog.date}</p>
                      </div>
                    </div>
                    <span className="text-sm text-zinc-400">{blog.readTime}</span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                    <div className="flex items-center space-x-4">
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
                    </div>
                    <button className="text-red-500 hover:text-red-400 font-medium">
                      Read More →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-12">
            <button className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white font-medium px-8 py-3 rounded-lg">
              Load More Articles
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BlogsPage