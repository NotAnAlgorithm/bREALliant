import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { RequireAuth } from './components/auth/RequireAuth'
import { AppLayout } from './components/layout/AppLayout'
import { AuthProvider } from './contexts/AuthProvider'
import { ThemeProvider } from './contexts/ThemeProvider'
import { Auth } from './pages/Auth'
import { Account } from './pages/Account'
import { Home } from './pages/Home'
import { Lesson } from './pages/Lesson'
import { Practice } from './pages/Practice'
import { Review } from './pages/Review'

export default function App() {
  return (
    <ThemeProvider>
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
              <Route
                path="review"
                element={
                  <RequireAuth>
                    <Review />
                  </RequireAuth>
                }
              />
              <Route
                path="practice"
                element={
                  <RequireAuth>
                    <Practice />
                  </RequireAuth>
                }
              />
              <Route path="auth" element={<Auth />} />
              <Route path="account" element={<Account />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
