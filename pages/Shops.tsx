
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useDebounce } from '../utils/debounce';
import { Shop, Bill, BillStatus } from '../types';
import { ICONS, COLORS } from '../constants';

type ShopSortOption = 'name-asc' | 'name-desc' | 'amount-desc' | 'amount-asc' | 'received-desc' | 'date-desc';
type ShopStatusFilter = 'ALL' | 'PENDING' | 'CLEAR';

const Shops: React.FC = () => {
  const { t } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { shopStats, updateShop, isLoading: isInitialLoading } = useData();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<ShopStatusFilter>('ALL');
  const [sortBy, setSortBy] = useState<ShopSortOption>('amount-desc');

  const [newShopName, setNewShopName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const processedShops = useMemo(() => {
    let result = [...shopStats];

    if (debouncedSearch.trim()) {
      result = result.filter(s => s.name.toLowerCase().includes(debouncedSearch.toLowerCase()));
    }

    if (statusFilter === 'PENDING') {
      result = result.filter(s => s.totalPending > 0);
    } else if (statusFilter === 'CLEAR') {
      result = result.filter(s => s.totalPending === 0);
    }

    result.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'amount-desc') return b.totalPending - a.totalPending;
      if (sortBy === 'amount-asc') return a.totalPending - b.totalPending;
      if (sortBy === 'received-desc') return b.totalReceived - a.totalReceived;
      if (sortBy === 'date-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });

    return result;
  }, [shopStats, debouncedSearch, statusFilter, sortBy]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'ALL') count++;
    if (sortBy !== 'amount-desc') count++; // Relative to default
    return count;
  }, [statusFilter, sortBy]);

  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim() || !user) return;
    setIsSubmitting(true);
    const newShop: Shop = { id: Date.now().toString(), name: newShopName.trim(), createdAt: new Date().toISOString() };
    try {
      await updateShop(newShop);
      setNewShopName('');
      setIsAddModalOpen(false);
    } catch (error) {
      alert("Failed to save shop.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFilters = () => {
    setStatusFilter('ALL');
    setSortBy('amount-desc');
    setSearch('');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">{ICONS.Search}</span>
              <input
                type="text"
                placeholder={t('searchShops')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border-2 border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0e3039] focus:border-transparent text-slate-900 font-bold placeholder:text-slate-400"
              />
            </div>
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className={`p-4 rounded-2xl border-2 transition-all relative flex items-center justify-center ${activeFilterCount > 0 ? 'bg-[#0e3039] border-[#0e3039] text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600'}`}
            >
              {ICONS.Filter}
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#58327d] text-white rounded-full flex items-center justify-center text-[10px] border-2 border-white font-black shadow-sm">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="w-full bg-[#0e3039] text-white py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 font-black active:scale-95 transition-all ring-4 ring-slate-100">
            {ICONS.Plus} {t('addShop')}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {isInitialLoading ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 h-32 animate-pulse"></div>
            ))
          ) : processedShops.length === 0 ? (
            <div className="text-center py-24 text-slate-400 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-300">
              <p className="font-black uppercase text-[10px] tracking-widest">{t('noShops')}</p>
            </div>
          ) : (
            processedShops.map(shop => (
              <button
                key={shop.id}
                onClick={() => navigate(`/shops/${shop.id}`)}
                className="w-full bg-white px-7 py-7 rounded-[2.5rem] border-2 border-slate-200 shadow-sm flex justify-between items-center group active:scale-[0.98] transition-all cursor-pointer hover:border-[#0e3039] text-left overflow-hidden"
              >
                <div className="flex flex-col flex-1 min-w-0 pr-4">
                  <h3 className="font-black text-slate-900 text-xl leading-tight tracking-tight mb-2 break-words">{shop.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${shop.totalPending > 0 ? 'bg-[#c2410c]' : 'bg-[#15803d]'}`}></span>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{shop.pendingCount} {t('pendingBills')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-black text-[#c2410c] text-2xl tracking-tighter leading-none">₹{shop.totalPending.toLocaleString('en-IN')}</p>
                    <span className="text-[9px] text-[#c2410c] font-black uppercase tracking-widest mt-1.5 inline-block">{t('pending')}</span>
                  </div>
                  <div className="text-slate-300 group-hover:text-[#0e3039] transition-colors ml-1">{ICONS.Chevron}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* FILTER MODAL */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 bg-black/70 backdrop-blur-md overflow-hidden">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-300 flex flex-col max-h-[95vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{t('filters')}</h2>
              <button onClick={() => setIsFilterModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-600">{ICONS.Close}</button>
            </div>
            <div className="space-y-8 overflow-y-auto flex-1 scrollbar-hide pr-2">
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-800 uppercase tracking-widest ml-1">{t('sortBy')}</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'amount-desc', label: 'Pending Amount (High to Low)' },
                    { id: 'amount-asc', label: 'Pending Amount (Low to High)' },
                    { id: 'name-asc', label: 'Name (A to Z)' },
                    { id: 'name-desc', label: 'Name (Z to A)' },
                    { id: 'received-desc', label: 'Highest Received' },
                    { id: 'date-desc', label: 'Recently Added' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSortBy(opt.id as ShopSortOption)}
                      className={`px-6 py-5 rounded-2xl text-[11px] font-black uppercase tracking-wider border-2 text-left transition-all ${sortBy === opt.id ? 'bg-[#0e3039] text-white border-[#0e3039] shadow-md' : 'bg-slate-50 text-slate-600 border-transparent hover:border-slate-300'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-800 uppercase tracking-widest ml-1">Shop Status</label>
                <div className="flex flex-wrap gap-2">
                  {['ALL', 'PENDING', 'CLEAR'].map(id => (
                    <button
                      key={id}
                      onClick={() => setStatusFilter(id as ShopStatusFilter)}
                      className={`px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2 ${statusFilter === id ? 'bg-[#0e3039] text-white border-[#0e3039] shadow-md' : 'bg-white text-slate-700 border-slate-300'}`}
                    >
                      {id === 'ALL' ? 'All' : id === 'PENDING' ? 'With Pending' : 'Cleared'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-4 pt-8 mt-4 border-t border-slate-200">
              <button onClick={resetFilters} className="flex-1 py-5 text-slate-900 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-3xl transition-colors">{t('clearAll')}</button>
              <button onClick={() => setIsFilterModalOpen(false)} className="flex-1 bg-[#0e3039] text-white py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">{t('apply')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Shop Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-10 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <h2 className="text-3xl font-black text-slate-900 mb-8 tracking-tighter">{t('addShop')}</h2>
            <form onSubmit={handleAddShop} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-800 uppercase tracking-widest ml-1">{t('shopName')}</label>
                <input type="text" autoFocus required value={newShopName} onChange={(e) => setNewShopName(e.target.value)} className="w-full px-6 py-6 rounded-3xl bg-slate-50 border-2 border-slate-200 focus:bg-white focus:border-[#0e3039] focus:outline-none text-2xl font-bold text-slate-900 transition-all" placeholder="e.g. Senthil Traders" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-6 text-slate-900 font-black uppercase text-xs tracking-widest rounded-3xl hover:bg-slate-50 transition-colors">{t('cancel')}</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-[#0e3039] text-white py-6 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl disabled:opacity-50 active:scale-95 transition-all">{isSubmitting ? t('loading') : t('save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Shops;
