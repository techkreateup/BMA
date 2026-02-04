import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { COLORS } from '../constants';

const Login: React.FC = () => {
  const { login, register, isLoading, error, clearError } = useAuth();
  const { t, language, setLanguage } = useAppContext();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) {
      if (!name.trim()) { alert("Please enter your name"); return; }
      await register(email, password, name);
    } else {
      await login(email, password);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 max-w-md mx-auto shadow-xl text-slate-900">
      <div className="w-full text-center space-y-2 mb-8">
        <div 
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
          style={{ backgroundColor: COLORS.primary }}
        >
          <span className="text-white text-3xl font-black">BMA</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
          {isRegistering ? 'Create Account' : t('loginTitle')}
        </h1>
        <p className="text-slate-600 font-bold">{t('loginSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {isRegistering && (
          <div className="space-y-2 animate-in slide-in-from-top-2">
            <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest ml-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-[#0e3039] bg-white text-slate-900 font-bold"
              placeholder="Your Name"
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest ml-1">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-[#0e3039] bg-white text-slate-900 font-bold"
            placeholder="example@gmail.com"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest ml-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-[#0e3039] bg-white text-slate-900 font-bold"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-black uppercase text-center tracking-wider">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full text-white font-black py-5 rounded-xl shadow-2xl transition-all active:scale-95 disabled:opacity-50 uppercase tracking-[0.2em] mt-4"
          style={{ backgroundColor: COLORS.primary }}
        >
          {isLoading ? t('loading') : (isRegistering ? 'Sign Up' : 'Login')}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button 
          onClick={() => { setIsRegistering(!isRegistering); clearError(); }}
          className="text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-[#0e3039]"
        >
          {isRegistering ? 'Already have an account? Login' : 'New here? Create Account'}
        </button>
      </div>

      <div className="mt-12 flex gap-4">
        <button
          onClick={() => setLanguage('en')}
          className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 ${
            language === 'en' ? 'text-white border-transparent shadow-lg' : 'bg-slate-200 text-slate-600 border-transparent'
          }`}
          style={language === 'en' ? { backgroundColor: COLORS.secondary } : {}}
        >
          English
        </button>
        <button
          onClick={() => setLanguage('ta')}
          className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 ${
            language === 'ta' ? 'text-white border-transparent shadow-lg' : 'bg-slate-200 text-slate-600 border-transparent'
          }`}
          style={language === 'ta' ? { backgroundColor: COLORS.secondary } : {}}
        >
          தமிழ்
        </button>
      </div>
    </div>
  );
};

export default Login;