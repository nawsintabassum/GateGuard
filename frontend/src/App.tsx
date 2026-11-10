import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import AuthPage, { OAuthCallbackPage } from './pages/Auth'
import { AddRepository, AnalysisResults, Dashboard, DocsPage, HistoryPage, ProjectDetails, Projects, QualityRules, Reports, SettingsPage } from './pages/Workspace'
import { api, clearSession, getAccessToken, getStoredUser, type AuthUser } from './lib/api'

function ProtectedLayout() {
  const location = useLocation()
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    let active = true
    const token = getAccessToken()
    if (!token) {
      setAuthenticated(false)
      setChecking(false)
      return
    }
    api.get<{ user: AuthUser }>('/auth/me')
      .then(({ data }) => {
        if (!active) return
        localStorage.setItem('gateguard.user', JSON.stringify(data.user))
        setAuthenticated(true)
      })
      .catch(() => {
        if (!active) return
        clearSession()
        setAuthenticated(false)
      })
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [])

  if (checking) return <div className="auth-page"><div className="auth-form-wrap">Verifying your session…</div></div>
  if (!authenticated) return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />
  return <Layout />
}

function AuthRedirect() {
  const user = getStoredUser()
  return user && getAccessToken() ? <Navigate to="/app/dashboard" replace /> : <AuthPage />
}

export default function App() {
  return <Routes>
    <Route path="/" element={<Landing/>}/>
    <Route path="/auth/oauth/callback" element={<OAuthCallbackPage/>}/>
    <Route path="/auth/:kind" element={<AuthRedirect/>}/>
    <Route path="/auth" element={<Navigate to="/auth/login" replace/>}/>
    <Route path="/app" element={<ProtectedLayout/>}>
      <Route index element={<Navigate to="dashboard" replace/>}/>
      <Route path="dashboard" element={<Dashboard/>}/>
      <Route path="projects" element={<Projects/>}/>
      <Route path="add-repository" element={<AddRepository/>}/>
      <Route path="projects/:id" element={<ProjectDetails/>}/>
      <Route path="analysis/:id" element={<AnalysisResults/>}/>
      <Route path="rules" element={<QualityRules/>}/>
      <Route path="history" element={<HistoryPage/>}/>
      <Route path="reports" element={<Reports/>}/>
      <Route path="settings" element={<SettingsPage/>}/>
      <Route path="docs" element={<DocsPage/>}/>
    </Route>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>
}
