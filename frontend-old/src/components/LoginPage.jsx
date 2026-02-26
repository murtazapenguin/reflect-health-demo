import { useState } from 'react'
import { EyeIcon, EyeSlashIcon, UserIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { api } from '../api'

const LoginPage = ({ onLogin }) => {
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState('admin@reflecthealth.com')
  const [password, setPassword] = useState('demo2026')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const data = await api.login(username, password)
      localStorage.setItem('authToken', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      onLogin(data.user)
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(335 100% 60%), hsl(20 90% 55%))' }}>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-32 right-16 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-white/8 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16 py-12 h-full">
          <div className="mb-12">
            <div className="bg-white rounded-xl px-4 py-2 inline-block">
              <img src="/reflect-health-logo.png" alt="Reflect Health" className="h-10 object-contain" />
            </div>
            <p className="text-white/70 text-sm mt-3 font-medium">AI Command Center</p>
          </div>

          <div className="flex-1 flex items-center">
            <div className="w-full">
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-10 border border-white/20">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-8">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 leading-tight">
                  Voice AI Call Deflection
                </h3>
                <p className="text-white/70 leading-relaxed text-base mb-6">
                  AI-powered phone agents handle eligibility verification and claims status inquiries automatically, reducing call center volume by 60-80%.
                </p>
                <div className="space-y-3">
                  {[
                    'Real-time provider authentication',
                    'Eligibility and claims data lookups',
                    'Warm transfers with full context',
                  ].map((text, i) => (
                    <div key={i} className="flex items-center text-white/80">
                      <svg className="w-5 h-5 mr-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {text}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mt-8 opacity-70">
                <img src="/penguin-icon.png" alt="PenguinAI" className="w-5 h-5" />
                <span className="text-xs text-white/60 font-medium">Powered by PenguinAI</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12 bg-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="lg:hidden mb-6">
              <img src="/reflect-health-logo.png" alt="Reflect Health" className="h-10 mx-auto object-contain" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-2">AI Command Center</h2>
            <p className="text-muted-foreground">Sign in to monitor voice AI performance</p>
          </div>

          <div className="bg-card rounded-2xl shadow-xl p-8 border border-border">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-secondary focus:bg-card text-foreground"
                    placeholder="Enter your email" required />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-secondary focus:bg-card text-foreground"
                    placeholder="Enter your password" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button type="submit" disabled={isLoading}
                className="w-full py-3 px-4 reflect-gradient hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:transform-none shadow-lg">
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Signing in...
                  </div>
                ) : 'Sign In'}
              </button>
            </form>

            <div className="mt-4 p-3 bg-primary/5 rounded-xl border border-primary/15">
              <p className="text-xs text-primary text-center font-medium">Demo: admin@reflecthealth.com / demo2026</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
