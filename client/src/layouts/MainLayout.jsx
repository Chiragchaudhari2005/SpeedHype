import Navbar from '../components/Navbar'
import { Link } from 'react-router-dom'

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-red-600 selection:text-white">
      {/* Top Precision Accent Line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-80" />
      
      <Navbar />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
      
      <footer className="bg-zinc-950 border-t border-zinc-900/90 py-8 sm:py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-zinc-400">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span>SpeedHype &copy; {new Date().getFullYear()} · Precision Automotive Network</span>
            </div>
            
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 font-medium text-zinc-400">
              <Link to="/feed" className="hover:text-white transition-colors">Feed</Link>
              <Link to="/communities" className="hover:text-white transition-colors">Communities</Link>
              <Link to="/blogs" className="hover:text-white transition-colors">Journal</Link>
              <Link to="/cars" className="hover:text-white transition-colors">Car Catalog</Link>
              <Link to="/compare" className="hover:text-white transition-colors">Compare</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default MainLayout