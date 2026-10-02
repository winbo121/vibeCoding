import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Analyzer from './pages/Analyzer'
import Chat from './pages/Chat'
import Board from './pages/Board'
import BoardDetail from './pages/BoardDetail'
import Faqs from './pages/Faqs'
import Home from './pages/Home'
import Jobs from './pages/Jobs'
import Login from './pages/Login'
import NearbyFood from './pages/NearbyFood'
import Profile from './pages/Profile'
import Shooter from './pages/Shooter'
import UserPrograms from './pages/UserPrograms'
import Users from './pages/Users'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <ProtectedRoute adminOnly>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="user-programs"
              element={
                <ProtectedRoute adminOnly>
                  <UserPrograms />
                </ProtectedRoute>
              }
            />
            <Route
              path="chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="faqs"
              element={
                <ProtectedRoute>
                  <Faqs />
                </ProtectedRoute>
              }
            />
            <Route
              path="board"
              element={
                <ProtectedRoute>
                  <Board />
                </ProtectedRoute>
              }
            />
            <Route
              path="board/:id"
              element={
                <ProtectedRoute>
                  <BoardDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="analyzer"
              element={
                <ProtectedRoute>
                  <Analyzer />
                </ProtectedRoute>
              }
            />
            <Route
              path="jobs"
              element={
                <ProtectedRoute>
                  <Jobs />
                </ProtectedRoute>
              }
            />
            <Route
              path="nearby-food"
              element={
                <ProtectedRoute>
                  <NearbyFood />
                </ProtectedRoute>
              }
            />
            <Route
              path="shooter"
              element={
                <ProtectedRoute>
                  <Shooter />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
