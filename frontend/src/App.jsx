import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Board from './pages/Board'
import BoardDetail from './pages/BoardDetail'
import Faqs from './pages/Faqs'
import Home from './pages/Home'
import Login from './pages/Login'
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
