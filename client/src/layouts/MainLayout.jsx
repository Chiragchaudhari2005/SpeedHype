import Navbar from '../components/Navbar'

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="bg-zinc-900 border-t border-zinc-800 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-zinc-400">
          <p>© {new Date().getFullYear()} SpeedHype. Your Automotive World. One Platform.</p>
        </div>
      </footer>
    </div>
  )
}

export default MainLayout