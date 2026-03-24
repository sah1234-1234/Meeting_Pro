import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Phone, Lock, ArrowRight, Loader2, AlertCircle, UserPlus, LogIn, Mail } from 'lucide-react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { PROPERTIES } from '../services/geminiService';

interface LoginProps {
  onLogin: (user: { phone: string; role: 'Owner' | 'Manager'; assignedProperty?: string; uid: string }) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loginMethod, setLoginMethod] = useState<'phone' | 'google'>('phone');
  const [isRegistering, setIsRegistering] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Owner' | 'Manager'>('Manager');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatEmail = (p: string) => `${p.replace(/\D/g, '')}@sukoon.com`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setIsLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        // Create Auth User
        let userCredential;
        try {
          userCredential = await createUserWithEmailAndPassword(auth, formatEmail(cleanPhone), password);
        } catch (authError: any) {
          if (authError.code === 'auth/email-already-in-use') {
            setError('This phone number is already registered. Please login instead.');
          } else {
            setError(authError.message);
          }
          setIsLoading(false);
          return;
        }

        const user = userCredential.user;

        // Assign property if Manager
        const assignedProperty = role === 'Manager' ? PROPERTIES[Math.floor(Math.random() * PROPERTIES.length)] : undefined;

        // Create Firestore Profile
        const userProfile = {
          uid: user.uid,
          phone: cleanPhone,
          role,
          assignedProperty: assignedProperty || null,
          createdAt: new Date().toISOString()
        };

        try {
          await setDoc(doc(db, 'users', user.uid), userProfile);
          onLogin({ uid: user.uid, phone: cleanPhone, role, assignedProperty });
        } catch (fsError: any) {
          console.error("Firestore Profile Error:", fsError);
          setError('Account created but profile setup failed. Please contact support.');
          setIsLoading(false);
        }
      } else {
        // Login
        try {
          const userCredential = await signInWithEmailAndPassword(auth, formatEmail(cleanPhone), password);
          const user = userCredential.user;

          // Fetch Firestore Profile
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data() as any;
            onLogin({ 
              uid: user.uid,
              phone: data.phone, 
              role: data.role, 
              assignedProperty: data.assignedProperty 
            });
          } else {
            setError('User profile not found. Please contact support.');
            setIsLoading(false);
          }
        } catch (authError: any) {
          if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
            setError('Invalid phone number or password.');
          } else {
            setError(authError.message);
          }
          setIsLoading(false);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user profile exists
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        onLogin({ 
          uid: user.uid,
          phone: data.phone || 'Google User', 
          role: data.role, 
          assignedProperty: data.assignedProperty 
        });
      } else {
        // Create a default profile for new Google users
        // For Google users, we might not have a phone initially
        const userProfile = {
          uid: user.uid,
          phone: user.phoneNumber || 'Google User',
          email: user.email,
          role: 'Manager', // Default role
          assignedProperty: PROPERTIES[Math.floor(Math.random() * PROPERTIES.length)],
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', user.uid), userProfile);
        onLogin({ 
          uid: user.uid, 
          phone: userProfile.phone, 
          role: userProfile.role as 'Manager', 
          assignedProperty: userProfile.assignedProperty 
        });
      }
    } catch (err: any) {
      console.error("Google Login Error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelled. Please try again.');
      } else {
        setError(err.message || 'Google login failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-bs-primary p-8 text-center">
            <div className="flex flex-col items-center">
              <div className="bg-white/20 p-2.5 rounded-lg backdrop-blur-sm mb-3 border border-white/30">
                <Building2 className="text-white w-6 h-6" />
              </div>
              <h1 className="text-white font-bold text-xl tracking-tight">Sukoon Admin Portal</h1>
              <p className="text-blue-100 text-[10px] uppercase tracking-widest mt-1">Authorized Personnel Only</p>
            </div>
          </div>

          {/* Form */}
          <div className="p-8 space-y-6">
            <div className="flex border-b border-slate-100">
              <button 
                onClick={() => setLoginMethod('phone')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${
                  loginMethod === 'phone' ? 'border-bs-primary text-bs-primary' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Phone Login
              </button>
              <button 
                onClick={() => setLoginMethod('google')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${
                  loginMethod === 'google' ? 'border-bs-primary text-bs-primary' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Google Login
              </button>
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">
                {loginMethod === 'google' ? 'Google Authentication' : (isRegistering ? 'Create Account' : 'Welcome Back')}
              </h2>
              <p className="text-xs text-slate-500">
                {loginMethod === 'google' ? 'Sign in with your corporate Gmail ID' : (isRegistering ? 'Register your phone number' : 'Login to access your dashboard')}
              </p>
            </div>

            {loginMethod === 'phone' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="bg-red-50 border border-red-100 p-3 rounded flex items-center gap-2 text-red-600 text-xs font-semibold"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-3">
                  {/* Role Selection (Only for Register) */}
                  {isRegistering && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Access Level</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRole('Owner')}
                          className={`py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all border ${
                            role === 'Owner' 
                              ? 'bg-bs-primary text-white border-bs-primary shadow-sm' 
                              : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Owner
                        </button>
                        <button
                          type="button"
                          onClick={() => setRole('Manager')}
                          className={`py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all border ${
                            role === 'Manager' 
                              ? 'bg-bs-primary text-white border-bs-primary shadow-sm' 
                              : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Manager
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Phone Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phone Number</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 text-slate-400 group-focus-within:text-bs-primary transition-colors" />
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="9876543210"
                        className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded text-sm font-medium placeholder:text-slate-400 focus:border-bs-primary focus:ring-1 focus:ring-bs-primary outline-none transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-bs-primary transition-colors" />
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded text-sm font-medium placeholder:text-slate-400 focus:border-bs-primary focus:ring-1 focus:ring-bs-primary outline-none transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`
                    w-full flex items-center justify-center gap-2 py-2.5 rounded font-bold text-sm uppercase tracking-widest shadow-sm transition-all
                    ${isLoading 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : 'bg-bs-primary text-white hover:bg-blue-700 active:scale-[0.98]'}
                  `}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isRegistering ? 'Creating Account' : 'Authenticating'}
                    </>
                  ) : (
                    <>
                      {isRegistering ? 'Register' : 'Sign In'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-6">
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="bg-red-50 border border-red-100 p-3 rounded flex items-center gap-2 text-red-600 text-xs font-semibold"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className={`
                    w-full flex items-center justify-center gap-3 py-4 rounded font-bold text-sm uppercase tracking-widest shadow-sm transition-all border border-slate-200
                    ${isLoading 
                      ? 'bg-slate-50 text-slate-400 cursor-not-allowed' 
                      : 'bg-white text-slate-700 hover:bg-slate-50 active:scale-[0.98]'}
                  `}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  <span>{isLoading ? 'Connecting...' : 'Continue with Google'}</span>
                </button>

                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <div className="flex gap-3">
                    <Mail className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">Corporate Access</h4>
                      <p className="text-[10px] text-indigo-700 leading-relaxed">
                        Use your @sukoon.com or verified corporate email for seamless access to property intelligence.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 text-center space-y-4">
              {loginMethod === 'phone' && (
                <button 
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError(null);
                  }}
                  className="text-[10px] font-bold text-bs-primary uppercase tracking-widest hover:text-blue-700 transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  {isRegistering ? (
                    <><LogIn className="w-3 h-3" /> Already have an account? Login</>
                  ) : (
                    <><UserPlus className="w-3 h-3" /> New here? Create an account</>
                  )}
                </button>
              )}
              
              <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-relaxed">
                Sukoon Infracon Limited Security Protocols
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
