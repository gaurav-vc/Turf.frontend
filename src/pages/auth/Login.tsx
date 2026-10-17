import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/useAuthStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient } from '@/api/apiClient'
import { ArrowRight, Mail, Lock, User, Phone, KeyRound, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore(state => state.login)
  
  const [isLogin, setIsLogin] = useState(true)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleRealSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (isForgotPassword) {
        if (!otpSent) {
          await apiClient.post('/v1/accounts/forgot-password/', { email })
          setOtpSent(true)
          setError('')
        } else {
          await apiClient.post('/v1/accounts/reset-password/', {
            email,
            otp,
            new_password: password
          })
          alert('Password reset successful! Please login with your new password.')
          setIsForgotPassword(false)
          setIsLogin(true)
          setOtpSent(false)
          setOtp('')
          setPassword('')
        }
      } else if (isLogin) {
        // Login Flow
        const response = await apiClient.post('/token/', {
          email, 
          password
        })
        localStorage.setItem('access_token', response.data.access)
        localStorage.setItem('refresh_token', response.data.refresh)
        
        // Fetch User Profile
        const userRes = await apiClient.get('/v1/accounts/users/me/', {
          headers: { Authorization: `Bearer ${response.data.access}` }
        })
        
        login(userRes.data)
        
        if (userRes.data.is_superuser) {
          navigate('/admin')
        } else if (userRes.data.user_type === 'MANAGER') {
          navigate('/manager')
        } else {
          navigate('/')
        }
      } else {
        // Registration Flow
        if (!otpSent) {
          // Send OTP
          await apiClient.post('/v1/accounts/register/send-otp/', { email })
          setOtpSent(true)
          setError('')
        } else {
          // Verify OTP and Register
          try {
            await apiClient.post('/v1/accounts/register/', {
              email,
              password,
              full_name: fullName,
              phone,
              otp
            })
            // Auto login after registration
            const response = await apiClient.post('/token/', {
              email, 
              password
            })
            localStorage.setItem('access_token', response.data.access)
            localStorage.setItem('refresh_token', response.data.refresh)
            
            // Fetch User Profile
            const userRes = await apiClient.get('/v1/accounts/users/me/', {
              headers: { Authorization: `Bearer ${response.data.access}` }
            })
            
            login(userRes.data)
            navigate('/')
          } catch (otpErr: any) {
            if (otpErr.response?.data?.otp) {
               setError(otpErr.response.data.otp[0] || 'Wrong OTP')
            } else {
               setError('Registration failed. Please check your details.')
            }
          }
        }
      }
    } catch (err: any) {
      if (isForgotPassword) {
        if (!otpSent) {
          setError(err.response?.data?.email?.[0] || 'No account found with this email.')
        } else {
          setError(err.response?.data?.otp?.[0] || 'Invalid OTP.')
        }
      } else if (isLogin) {
        setError('Invalid credentials.')
      } else if (!otpSent) {
        setError(err.response?.data?.email?.[0] || 'Registration failed. Email might already exist.')
      } else {
        setError('An error occurred during registration.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-white">
      {/* Turf Background with Bright Daytime Lighting */}
      <motion.img 
        src="/turf-bg.jpg"
        alt="Turf Stadium Arena"
        initial={{ scale: 1.03 }}
        animate={{ scale: [1.03, 1.08, 1.03] }}
        transition={{ duration: 25, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-45"
      />
      
      {/* Crisp White Dynamic Overlay (Keeps UI White & Fresh) */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-white/75 via-white/55 to-white/80 backdrop-blur-[0.5px]" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(255,255,255,0.7)_100%)] pointer-events-none" />

      {/* Subtle Fresh Ambient Glow */}
      <motion.div 
        animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.15, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-400/15 rounded-full blur-[110px] z-0 pointer-events-none"
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10 p-6 perspective-1000"
      >
        <Card className="bg-white/95 backdrop-blur-2xl border border-white/80 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)] text-zinc-900">
          <CardHeader className="text-center pt-9 pb-5 relative">
            {/* Elegant Modern Xrena.99 Heading */}
            <div className="relative inline-flex flex-col items-center justify-center mx-auto my-1">
              {/* Soft Ambient Animated Glow */}
              <motion.div
                animate={{
                  opacity: [0.35, 0.7, 0.35],
                  scale: [0.95, 1.08, 0.95]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute -inset-4 bg-gradient-to-r from-emerald-400/25 via-white/80 to-teal-400/25 rounded-full blur-2xl pointer-events-none"
              />

              <motion.h1
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="relative z-10 text-5xl font-black tracking-tighter text-zinc-900 select-none flex items-center justify-center drop-shadow-sm"
              >
                <span>Xrena</span>
                <motion.span 
                  animate={{
                    textShadow: [
                      "0 0 10px rgba(16,185,129,0.3)",
                      "0 0 25px rgba(16,185,129,0.7), 0 0 40px rgba(16,185,129,0.4)",
                      "0 0 10px rgba(16,185,129,0.3)"
                    ]
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="text-brand drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                >
                  .99
                </motion.span>
              </motion.h1>
            </div>

            <p className="text-zinc-500 mt-3 text-sm font-medium px-4">
              {isForgotPassword ? 'Securely reset your password and get back in the game.' : isLogin ? 'Sign in to orchestrate your next match.' : 'Create your account to join the arena.'}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6 px-8 pb-10">
            <form onSubmit={handleRealSubmit} className="space-y-5">
              <AnimatePresence mode="popLayout">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, scale: 0.9 }}
                    className="overflow-hidden"
                  >
                    <p className="text-red-500 text-xs text-center font-bold bg-red-50 border border-red-200 py-2 px-3 rounded-lg shadow-inner">
                      {error}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <AnimatePresence mode="popLayout">
                {!isLogin && !isForgotPassword && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
                    exit={{ opacity: 0, height: 0, filter: 'blur(10px)' }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5 overflow-hidden"
                  >
                    <div className="space-y-2 group">
                      <Label htmlFor="fullName" className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold ml-1 group-focus-within:text-brand transition-colors flex items-center gap-2">
                        <User className="w-3 h-3" /> Full Name
                      </Label>
                      <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} required={!isLogin && !isForgotPassword} disabled={otpSent} className="bg-zinc-50 border-zinc-200 text-zinc-900 focus-visible:ring-brand focus-visible:border-brand h-12 rounded-xl transition-all shadow-inner" placeholder="Your Full Name" />
                    </div>
                    <div className="space-y-2 group">
                      <Label htmlFor="phone" className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold ml-1 group-focus-within:text-brand transition-colors flex items-center gap-2">
                        <Phone className="w-3 h-3" /> Phone Number
                      </Label>
                      <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} required={!isLogin && !isForgotPassword} disabled={otpSent} className="bg-zinc-50 border-zinc-200 text-zinc-900 focus-visible:ring-brand focus-visible:border-brand h-12 rounded-xl transition-all shadow-inner" placeholder="10-digit phone" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2 group">
                <Label htmlFor="email" className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold ml-1 group-focus-within:text-brand transition-colors flex items-center gap-2">
                  <Mail className="w-3 h-3" /> Email Address
                </Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={(!isLogin || isForgotPassword) && otpSent} className="bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-brand focus-visible:border-brand h-12 rounded-xl transition-all shadow-inner" placeholder="player@turf.com" />
              </div>
              
              <AnimatePresence mode="popLayout">
                {(!isForgotPassword || (isForgotPassword && otpSent)) && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
                    exit={{ opacity: 0, height: 0, filter: 'blur(10px)' }}
                    className="space-y-2 overflow-hidden group"
                  >
                    <Label htmlFor="password" className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold ml-1 group-focus-within:text-brand transition-colors flex items-center gap-2">
                      <Lock className="w-3 h-3" /> {isForgotPassword ? 'New Password' : 'Password'}
                    </Label>
                    <div className="relative">
                      <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required disabled={!isLogin && !isForgotPassword && otpSent} className="bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-brand focus-visible:border-brand h-12 rounded-xl transition-all shadow-inner pr-12" placeholder="••••••••" />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* OTP Field */}
              <AnimatePresence mode="popLayout">
                {((!isLogin && otpSent) || (isForgotPassword && otpSent)) && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    className="space-y-2 overflow-hidden mt-6 group"
                  >
                    <Label htmlFor="otp" className="text-[10px] text-brand uppercase tracking-[0.2em] font-bold ml-1 flex items-center gap-2">
                      <KeyRound className="w-3 h-3" /> Verification Code (OTP)
                    </Label>
                    <Input id="otp" type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" required={(!isLogin || isForgotPassword) && otpSent} className="bg-brand/10 border-brand/40 text-brand placeholder:text-brand/30 focus-visible:ring-brand h-14 text-center tracking-[0.5em] text-2xl font-black rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)]" />
                  </motion.div>
                )}
              </AnimatePresence>
              
              <AnimatePresence mode="popLayout">
                {isLogin && !isForgotPassword && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-right mt-1"
                  >
                      <button type="button" onClick={() => { setIsForgotPassword(true); setIsLogin(false); setOtpSent(false); setOtp(''); setError(''); }} className="text-[11px] text-zinc-500 hover:text-brand transition-colors font-medium hover:underline underline-offset-4">Forgot Password?</button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-2">
                <Button type="submit" disabled={loading} className="w-full bg-brand text-white hover:bg-brand-hover font-bold h-12 rounded-xl text-md transition-all shadow-[0_4px_20px_rgba(16,185,129,0.25)] hover:shadow-[0_6px_25px_rgba(16,185,129,0.35)] active:scale-[0.98] group relative overflow-hidden">
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? 'Processing...' : isForgotPassword ? (otpSent ? 'Reset Password' : 'Send Reset Code') : isLogin ? 'Sign In' : (!isLogin && !otpSent) ? 'Send OTP' : 'Verify & Register'}
                    {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                  </span>
                  {/* Button shine effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
                </Button>
              </div>
            </form>

            <div className="text-center text-[13px] font-medium mt-8 border-t border-zinc-100 pt-6">
              <span className="text-zinc-500">
                {isForgotPassword ? "Remembered your password? " : isLogin ? "Don't have an account? " : "Already have an account? "}
              </span>
              <button type="button" onClick={() => { setIsForgotPassword(false); setIsLogin(!isLogin && !isForgotPassword); setError(''); setOtpSent(false); setOtp(''); }} className="text-zinc-900 hover:text-brand ml-1 transition-colors hover:underline underline-offset-4 font-bold">
                {isForgotPassword ? 'Sign in' : isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
