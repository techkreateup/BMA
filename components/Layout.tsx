
import React from 'react';
// Corrected: importing from 'react-router' as the module exports for 'react-router-dom' were missing.
import { useLocation, useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { ICONS, COLORS } from '../constants';

const Layout: React.FC<{ children: React.ReactNode; title?: string; showBack?: boolean; hideBottomNav?: boolean }> = ({ 
  children, 
  title, 
  showBack = false,
  hideBottomNav = false
}) => {
  const { t } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', label: t('dashboard'), icon: ICONS.Dashboard },
    { path: '/shops', label: t('shops'), icon: ICONS.Store },
    { path: '/settings', label: t('settings'), icon: ICONS.Settings },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 max-w-md mx-auto relative shadow-xl overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button 
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              {ICONS.Back}
            </button>
          )}
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">
            {title || t('appName')}
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className={`flex-1 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ${hideBottomNav ? 'pb-32' : 'pb-24'}`}>
        {children}
      </main>

      {/* Bottom Nav - Conditionally Rendered */}
      {!hideBottomNav && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 transition-all ${
                  isActive ? 'text-[#0e3039]' : 'text-slate-400'
                }`}
              >
                <div className={`p-1 rounded-lg ${isActive ? 'bg-slate-100' : ''}`}>
                  {item.icon}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};

export default Layout;
