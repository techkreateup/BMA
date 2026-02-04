
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Shop, Bill, BillStatus } from '../types';
import { ICONS, COLORS } from '../constants';
import { Receipt } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { t } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { shopStats, bills, isLoading } = useData();

  const stats = useMemo(() => {
    const pendingBills = bills.filter(b => b.status === BillStatus.NOT_PAID);
    const totalAmount = pendingBills.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    return {
      totalShops: shopStats.length,
      totalPendingBills: pendingBills.length,
      totalAmountToCollect: totalAmount
    };
  }, [shopStats, bills]);

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6 animate-pulse p-4">
          <div className="h-8 w-48 bg-slate-200 rounded-lg"></div>
          <div className="h-40 w-full bg-slate-200 rounded-3xl"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-28 bg-slate-200 rounded-3xl"></div>
            <div className="h-28 bg-slate-200 rounded-3xl"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="space-y-1">
          <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">{t('today')}</p>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Hi, {user?.name}! 👋</h2>
        </div>

        {/* Main Stats Card */}
        <div className="bg-[#0e3039] p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden border border-white/10">
          <div className="relative z-10">
            <p className="text-white/80 text-xs font-black uppercase tracking-widest mb-2">{t('amountToCollect')}</p>
            <h3 className="text-4xl font-black tracking-tighter">₹{stats.totalAmountToCollect.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            <div className="mt-4 flex items-center gap-2">
              <span className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-white/20 backdrop-blur-sm">
                {stats.totalPendingBills} {t('pendingBills')}
              </span>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 p-6 text-white/5 rotate-12">
            <Receipt size={120} strokeWidth={1} />
          </div>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/shops')}
            className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 shadow-sm flex flex-col items-start gap-3 hover:border-[#0e3039] transition-all text-left active:scale-[0.98]"
          >
            <div className="w-12 h-12 bg-slate-50 text-[#0e3039] rounded-2xl flex items-center justify-center border border-slate-100">
              {ICONS.Store}
            </div>
            <div>
              <p className="text-slate-700 text-[10px] font-black uppercase tracking-wider">{t('totalShops')}</p>
              <p className="text-2xl font-black text-slate-900 leading-none">{stats.totalShops}</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/shops')}
            className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 shadow-sm flex flex-col items-start gap-3 hover:border-[#c2410c] transition-all text-left active:scale-[0.98]"
          >
            <div className="w-12 h-12 bg-orange-50 text-[#c2410c] rounded-2xl flex items-center justify-center border border-orange-100">
              {ICONS.Pending}
            </div>
            <div>
              <p className="text-slate-700 text-[10px] font-black uppercase tracking-wider">{t('pendingBills')}</p>
              <p className="text-2xl font-black text-slate-900 leading-none">{stats.totalPendingBills}</p>
            </div>
          </button>
        </div>

        {/* Recent Shops List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">{t('shops')}</h4>
            <button onClick={() => navigate('/shops')} className="text-xs font-black text-[#0e3039] bg-slate-200 px-5 py-2.5 rounded-full hover:bg-slate-300 transition-colors">
              View All
            </button>
          </div>

          {shopStats.length === 0 ? (
            <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-300 p-12 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                {ICONS.Store}
              </div>
              <p className="text-slate-700 font-bold text-sm uppercase tracking-widest">{t('noShops')}</p>
              <button
                onClick={() => navigate('/shops')}
                className="bg-[#0e3039] text-white px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest shadow-lg"
              >
                {t('addShop')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {shopStats
                .sort((a, b) => b.totalPending - a.totalPending) // Consistent sorting: High pending first
                .slice(0, 5)
                .map(shop => {
                  return (
                    <button
                      key={shop.id}
                      onClick={() => navigate(`/shops/${shop.id}`)}
                      className="w-full bg-white px-7 py-7 rounded-[2.5rem] border-2 border-slate-200 shadow-sm flex justify-between items-center group active:scale-[0.98] transition-all cursor-pointer hover:border-[#0e3039] text-left overflow-hidden relative"
                    >
                      <div className="flex flex-col flex-1 min-w-0 pr-4">
                        <h5 className="font-black text-slate-900 text-xl leading-tight tracking-tight mb-2 break-words">
                          {shop.name}
                        </h5>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${shop.totalPending > 0 ? 'bg-[#c2410c]' : 'bg-[#15803d]'}`}></span>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            {shop.pendingCount} {t('pendingBills')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="font-black text-[#c2410c] text-2xl tracking-tighter leading-none">
                            ₹{shop.totalPending.toLocaleString('en-IN')}
                          </p>
                          <span className="text-[9px] text-[#c2410c] font-black uppercase tracking-widest mt-1.5 inline-block">
                            {t('pending')}
                          </span>
                        </div>
                        <div className="text-slate-300 group-hover:text-[#0e3039] transition-colors ml-1">
                          {ICONS.Chevron}
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
