
import React from 'react';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { ICONS } from '../constants';

const Settings: React.FC = () => {
  const { t, language, setLanguage, fontSize, setFontSize } = useAppContext();
  const { user, logout } = useAuth();

  return (
    <Layout>
      <div className="space-y-8">
        {/* User Info */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 bg-[#7a51a0] rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">{user?.name}</h3>
            <p className="text-sm text-slate-400">{user?.email}</p>
          </div>
        </div>

        {/* App Settings */}
        <div className="space-y-4">
          <h4 className="font-bold text-slate-800 px-1">{t('settings')}</h4>
          
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Language */}
            <div className="p-4 border-b border-slate-50 space-y-3">
              <div className="flex items-center gap-3 text-slate-600">
                {ICONS.Languages}
                <span className="font-bold text-sm">{t('language')}</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setLanguage('en')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                    language === 'en' ? 'bg-[#0e3039] text-white' : 'bg-slate-50 text-slate-400'
                  }`}
                >
                  English 🇬🇧
                </button>
                <button 
                  onClick={() => setLanguage('ta')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                    language === 'ta' ? 'bg-[#0e3039] text-white' : 'bg-slate-50 text-slate-400'
                  }`}
                >
                  தமிழ் 🇮🇳
                </button>
              </div>
            </div>

            {/* Font Size */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3 text-slate-600">
                {ICONS.FontSize}
                <span className="font-bold text-sm">{t('fontSize')}</span>
              </div>
              <div className="flex gap-2">
                {(['small', 'medium', 'large'] as const).map(size => (
                  <button 
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${
                      fontSize === size ? 'bg-[#7a51a0] text-white shadow-md shadow-purple-200' : 'bg-slate-50 text-slate-400'
                    }`}
                  >
                    {t(size)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button 
          onClick={logout}
          className="w-full bg-red-50 text-red-600 font-bold py-4 rounded-2xl hover:bg-red-100 active:scale-95 transition-all"
        >
          {t('logout')}
        </button>

        <div className="text-center pt-10">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            BMA v1.0.0 • Made with ❤️ in India
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
