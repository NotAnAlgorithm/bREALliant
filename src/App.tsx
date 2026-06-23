import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { AppLayout } from './components/layout/AppLayout'
import { Auth } from './pages/Auth'
import { Home } from './pages/Home'
import { Lesson } from './pages/Lesson'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="lesson/:lessonId" element={<Lesson />} />
          <Route path="auth" element={<Auth />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
