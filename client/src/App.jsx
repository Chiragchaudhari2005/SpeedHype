import { Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import FeedPage from './pages/FeedPage'
import NotificationsPage from './pages/NotificationsPage'
import CommunitiesPage from './pages/CommunitiesPage'
import CommunityDetailsPage from './pages/CommunityDetailsPage'
import CommunityEditorPage from './pages/CommunityEditorPage'
import BlogsPage from './pages/BlogsPage'
import BlogDetailsPage from './pages/BlogDetailsPage'
import BlogEditorPage from './pages/BlogEditorPage'
import CarsPage from './pages/CarsPage'
import VehicleEditorPage from './pages/VehicleEditorPage'
import ComparePage from './pages/ComparePage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={
        <MainLayout>
          <HomePage />
        </MainLayout>
      } />
      
      <Route path="/sign-in/*" element={<SignInPage />} />
      
      <Route path="/sign-up/*" element={<SignUpPage />} />

      {/* Protected Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <MainLayout>
            <DashboardPage />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute>
          <MainLayout>
            <ProfilePage />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/feed" element={
        <ProtectedRoute>
          <MainLayout>
            <FeedPage />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/notifications" element={
        <ProtectedRoute>
          <MainLayout>
            <NotificationsPage />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/communities" element={
        <ProtectedRoute>
          <MainLayout>
            <CommunitiesPage />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/communities/new" element={
        <ProtectedRoute>
          <MainLayout>
            <CommunityEditorPage />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/communities/:communityId/edit" element={
        <ProtectedRoute>
          <MainLayout>
            <CommunityEditorPage />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/communities/:communityId" element={
        <ProtectedRoute>
          <MainLayout>
            <CommunityDetailsPage />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/blogs" element={
        <ProtectedRoute>
          <MainLayout>
            <BlogsPage />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/blogs/new" element={
        <ProtectedRoute>
          <MainLayout>
            <BlogEditorPage />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/blogs/:blogId/edit" element={
        <ProtectedRoute>
          <MainLayout>
            <BlogEditorPage />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/blogs/:blogId" element={
        <ProtectedRoute>
          <MainLayout>
            <BlogDetailsPage />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/cars" element={
        <ProtectedRoute>
          <MainLayout>
            <CarsPage />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/cars/new" element={
        <ProtectedRoute>
          <MainLayout>
            <VehicleEditorPage />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/compare" element={
        <ProtectedRoute>
          <MainLayout>
            <ComparePage />
          </MainLayout>
        </ProtectedRoute>
      } />

      {/* 404 Route */}
      <Route path="*" element={
        <MainLayout>
          <NotFoundPage />
        </MainLayout>
      } />
    </Routes>
  )
}

export default App
