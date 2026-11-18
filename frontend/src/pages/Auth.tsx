import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Github, ShieldCheck, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'
import { Button } from '../components/ui'
import { api, saveSession, type AuthUser } from '../lib/api'

type AuthResponse = { token: string; user: AuthUser }
type MessageResponse = { message: string; devResetToken?: string }

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) return error.response?.data?.message || error.message || 'The request could not be completed.'
  return error instanceof Error ? error.message : 'Something went wrong.'
}


export function OAuthCallbackPage() {
  // Keep one exchange request for this callback code. React StrictMode re-runs
  // effects in development; sharing the same promise avoids consuming the
  // one-time server code twice while still allowing the second effect to handle
  // the result after the first effect is cleaned up.
  const exchangeRequest = useRef<{ code: string; promise: ReturnType<typeof api.post<AuthResponse>> } | null>(null)
  const [params] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    const code = params.get('code')
    if (!code) {
      toast.error(params.get('oauth_error') || 'Social sign-in could not be completed.')
      navigate('/auth/login', { replace: true })
      return () => { active = false }
    }

    if (!exchangeRequest.current || exchangeRequest.current.code !== code) {
      exchangeRequest.current = {
        code,
        promise: api.post<AuthResponse>('/auth/oauth/exchange', { code }),
      }
    }

    exchangeRequest.current.promise
      .then(({ data }) => {
        if (!active) return
        saveSession(data.token, data.user)
        toast.success('Signed in successfully')
        navigate('/app/dashboard', { replace: true })
      })
      .catch((error: unknown) => {
        if (!active) return
        toast.error(getErrorMessage(error))
        navigate('/auth/login', { replace: true })
      })
    return () => { active = false }
  }, [navigate, params])

  return <div className="auth-page"><div className="auth-form-side"><div className="auth-form-wrap">Completing secure sign-in…</div></div></div>
}

export default function AuthPage() {
  const { kind = 'login' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetLink, setResetLink] = useState('')
  const isLogin = kind === 'login'
  const isRegister = kind === 'register'
  const isForgot = kind === 'forgot'
  const isReset = kind === 'reset'
  const resetToken = searchParams.get('token') || ''
  const oauthError = searchParams.get('oauth_error')
  useEffect(() => { if (oauthError) toast.error(oauthError) }, [oauthError])
  const title = isLogin ? 'Welcome back' : isRegister ? 'Create your account' : isForgot ? 'Reset your password' : 'Choose a new password'
  const subtitle = isLogin ? 'Sign in to continue to your workspace.' : isRegister ? 'Start improving your software quality today.' : isForgot ? 'Enter your email and we’ll send you a reset link.' : 'Create a strong password for your account.'

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isRegister && password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (isReset && !resetToken) {
      toast.error('Reset link is missing or invalid. Request a new password reset link.')
      return
    }
    setBusy(true)
    try {
      if (isLogin || isRegister) {
        const endpoint = isLogin ? '/auth/login' : '/auth/register'
        const payload = isLogin ? { email, password } : { name, email, password }
        const { data } = await api.post<AuthResponse>(endpoint, payload)
        saveSession(data.token, data.user)
        toast.success(isLogin ? 'Signed in successfully' : 'Account created successfully')
        const destination = (location.state as { from?: string } | null)?.from || '/app/dashboard'
        navigate(destination, { replace: true })
      } else if (isForgot) {
        const { data } = await api.post<MessageResponse>('/auth/forgot-password', { email })
        toast.success(data.message)
        if (data.devResetToken) {
          const link = `${window.location.origin}/auth/reset?token=${encodeURIComponent(data.devResetToken)}`
          setResetLink(link)
        }
      } else if (isReset) {
        await api.post('/auth/reset-password', { token: resetToken, password })
        toast.success('Password updated. Please sign in with your new password.')
        navigate('/auth/login', { replace: true })
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const connectSocial = async (provider: 'github' | 'google') => {
    setBusy(true)
    try {
      const { data } = await api.get<{ authorizationUrl: string }>(`/auth/oauth/${provider}`)
      window.location.assign(data.authorizationUrl)
    } catch (error) {
      toast.error(getErrorMessage(error))
      setBusy(false)
    }
  }

  return <div className="auth-page"><div className="auth-visual"><Link to="/" className="brand auth-brand"><div className="brand-mark"><ShieldCheck size={21}/></div><span>Gate<span className="brand-accent">Guard</span></span></Link><div className="auth-visual-content"><div className="auth-orb"><ShieldCheck size={54}/><Sparkles className="orb-spark" size={20}/></div><div className="eyebrow">QUALITY YOU CAN TRUST</div><h1>Ship better code.<br/><span>Every single time.</span></h1><p>One place to understand code quality, test coverage and security before your next release.</p><div className="auth-proof"><div className="proof-avatars"><i>D</i><i>Q</i><i>+</i></div><span>Built for teams who care about quality.</span></div></div><div className="auth-visual-foot">© 2026 GateGuard · DIU SQAT Summit</div></div><div className="auth-form-side"><div className="auth-form-wrap"><Link to="/" className="back-link"><ArrowLeft size={15}/> Back to home</Link><div className="auth-form-heading"><div className="eyebrow">YOUR WORKSPACE</div><h2>{title}</h2><p>{subtitle}</p></div><form onSubmit={submit} className="form-stack">
    {isRegister && <label className="field"><span>Full name</span><input autoComplete="name" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={80} placeholder="Your name"/></label>}
    {!isReset && <label className="field"><span>Email address</span><input autoComplete="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com"/></label>}
    {!isForgot && <label className="field"><span>Password</span><div className="password-wrap"><input autoComplete={isLogin ? 'current-password' : 'new-password'} type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} maxLength={72} placeholder="At least 8 characters"/><button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>}
    {(isRegister || isReset) && <label className="field"><span>Confirm password</span><input autoComplete="new-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} maxLength={72} placeholder="Repeat your password"/></label>}
    {isLogin && <div className="form-between"><span className="check-label">Secure account access</span><Link to="/auth/forgot">Forgot password?</Link></div>}
    <Button type="submit" size="lg" disabled={busy || (isReset && !resetToken)}>{busy ? 'Please wait…' : isLogin ? 'Sign in' : isRegister ? 'Create account' : isForgot ? 'Send reset link' : 'Reset password'} <ArrowRight size={17}/></Button>
  </form>
  {resetLink && <div className="security-note" role="status">Development reset link: <a href={resetLink}>Open password reset</a></div>}
  {(isLogin || isRegister) && <><div className="auth-divider"><span>or continue with</span></div><div className="social-login-actions"><Button variant="secondary" className="github-button" disabled={busy} onClick={() => connectSocial('github')}><Github size={17}/> Continue with GitHub</Button><Button variant="secondary" className="github-button google-button" disabled={busy} onClick={() => connectSocial('google')}><span className="google-g" aria-hidden="true">G</span> Continue with Google</Button></div></>}
  <div className="auth-switch">{isLogin ? <>Don’t have an account? <Link to="/auth/register">Create one</Link></> : isRegister ? <>Already have an account? <Link to="/auth/login">Sign in</Link></> : <Link to="/auth/login">Return to sign in</Link>}</div><div className="auth-safe"><ShieldCheck size={14}/> Your account security matters to us.</div></div></div></div>
}
