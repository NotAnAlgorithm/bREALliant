import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { RequireAuth } from './components/auth/RequireAuth'
import { AppLayout } from './components/layout/AppLayout'
import { AuthProvider } from './contexts/AuthProvider'
import { Auth } from './pages/Auth'
import { Account } from './pages/Account'
import { Home } from './pages/Home'
import { Lesson } from './pages/Lesson'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route
              path="lesson/:lessonId"
              element={
                <RequireAuth>
                  <Lesson />
                </RequireAuth>
              }
            />
            <Route path="auth" element={<Auth />} />
            <Route path="account" element={<Account />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
