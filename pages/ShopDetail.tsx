import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Shop, Bill, BillStatus, BillItem } from '../types';
import { ICONS, COLORS } from '../constants';
import { ItemTrie } from '../utils/trie';
import { Plus, Minus, Trash2, Save, X } from 'lucide-react';

type SortOption = 'status-first' | 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
type FilterStatus = 'ALL' | BillStatus;
type PriceFilter = 'ALL' | 'CUSTOM';
type DateFilter = 'ALL' | '7DAYS' | '30DAYS' | 'CUSTOM';

const ShopDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const observerTarget = useRef<HTMLDivElement>(null);

  const { shops, bills: allBills, updateBill, deleteBill, deleteShop, isLoading } = useData();
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  // Pagination State
  const [visibleCount, setVisibleCount] = useState(15);
  const BATCH_SIZE = 15;

  // Filter & Sort State
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('CUSTOM');
  const [customPriceMin, setCustomPriceMin] = useState('');
  const [customPriceMax, setCustomPriceMax] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('CUSTOM');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('status-first');

  // --- NEW BILL FORM STATE ---
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [status, setStatus] = useState<BillStatus>(BillStatus.NOT_PAID);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Autocomplete State
  const [suggestions, setSuggestions] = useState<{ [key: string]: string[] }>({});
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  const shop = useMemo(() => shops.find(s => String(s.id) === String(id)), [shops, id]);
  const bills = useMemo(() => allBills.filter(b => String(b.shopId) === String(id)), [allBills, id]);

  // Initialize Trie
  const itemTrie = useMemo(() => {
    const trie = new ItemTrie();
    // Feed the Trie with all historical items from all bills
    bills.forEach(bill => {
      if (bill.items && Array.isArray(bill.items)) {
        bill.items.forEach(item => trie.insert(item.name));
      }
    });
    // Add some default common shop items if trie is empty
    if (bills.length === 0) {
      ['Rice', 'Sugar', 'Oil', 'Milk', 'Dal', 'Soap', 'Tea'].forEach(w => trie.insert(w));
    }
    return trie;
  }, [bills]);

  useEffect(() => {
    if (!isLoading && !shop && id) {
      navigate('/shops');
    }
  }, [isLoading, shop, id, navigate]);

  const stats = useMemo(() => {
    const pending = bills.filter(b => b.status === BillStatus.NOT_PAID);
    const received = bills.filter(b => b.status === BillStatus.PAID);
    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0),
      receivedAmount: received.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
    };
  }, [bills]);

  // --- Bill Logic ---

  const calculateTotal = (items: BillItem[]) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleAddItem = () => {
    const newItem: BillItem = {
      id: Date.now().toString(),
      name: '',
      quantity: 1,
      price: 0
    };
    setBillItems([...billItems, newItem]);
  };

  const handleRemoveItem = (itemId: string) => {
    setBillItems(billItems.filter(item => item.id !== itemId));
  };

  const handleItemChange = (itemId: string, field: keyof BillItem, value: string | number) => {
    setBillItems(prevItems => prevItems.map(item => {
      if (item.id === itemId) {
        if (field === 'name') {
          // Trigger Autocomplete
          const valStr = value as string;
          if (valStr.length > 0) {
            setSuggestions(prev => ({ ...prev, [itemId]: itemTrie.search(valStr) }));
            setActiveRowId(itemId);
          } else {
            setSuggestions(prev => ({ ...prev, [itemId]: [] }));
          }
          return { ...item, name: valStr };
        }
        // Use type assertion for other fields
        return { ...item, [field]: value } as BillItem;
      }
      return item;
    }));
  };

  const selectSuggestion = (itemId: string, name: string) => {
    handleItemChange(itemId, 'name', name);
    setSuggestions(prev => ({ ...prev, [itemId]: [] })); // Clear suggestions
    setActiveRowId(null);
  };

  const openBillModal = (bill?: Bill) => {
    setFormError(null);
    if (bill) {
      setEditingBill(bill);
      // Ensure we have items. If legacy bill has no items, create one based on total amount
      if (bill.items && bill.items.length > 0) {
        setBillItems(bill.items);
      } else {
        setBillItems([{ id: '1', name: 'Legacy Bill Amount', quantity: 1, price: bill.amount }]);
      }
      setStatus(bill.status);
    } else {
      setEditingBill(null);
      setBillItems([{ id: Date.now().toString(), name: '', quantity: 1, price: 0 }]);
      setStatus(BillStatus.NOT_PAID);
    }
    setIsBillModalOpen(true);
  };

  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = calculateTotal(billItems);

    if (totalAmount <= 0) {
      setFormError('Total amount must be greater than 0');
      return;
    }

    // Validate items
    const hasEmptyNames = billItems.some(i => !i.name.trim());
    if (hasEmptyNames) {
      setFormError('Please enter names for all items');
      return;
    }

    setIsSubmitting(true);
    const billData: Bill = {
      id: editingBill?.id || Date.now().toString(),
      shopId: id || '',
      amount: totalAmount,
      items: billItems, // Store the structured items
      status: status,
      createdAt: editingBill?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    try {
      await updateBill(billData);
      setIsBillModalOpen(false);
    } catch (error: any) {
      setFormError(error.message || t('errorGeneral'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Rendering Helpers ---

  const getSessionInfo = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours();
    let session = t('night');
    if (hours >= 5 && hours < 12) session = t('morning');
    else if (hours >= 12 && hours < 17) session = t('afternoon');
    else if (hours >= 17 && hours < 21) session = t('evening');
    const formattedTime = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
    return { session, time: formattedTime };
  };

  const handleDeleteBill = async (billId: string) => {
    if (!user || !window.confirm(t('confirmDelete'))) return;
    try {
      await deleteBill(billId);
    } catch (error) {
      alert("Delete failed.");
    }
  };

  const handleDeleteShop = async () => {
    if (!user || !id || !window.confirm(t('confirmDelete'))) return;
    try {
      await deleteShop(id);
      navigate('/shops');
    } catch (error) {
      alert("Delete failed.");
    }
  };

  const getStatusConfig = (status: BillStatus) => {
    switch (status) {
      case BillStatus.PAID: return { bg: 'bg-[#15803d]', color: '#15803d', icon: ICONS.Paid, label: t('paid') };
      case BillStatus.CANCELED: return { bg: 'bg-[#b91c1c]', color: '#b91c1c', icon: ICONS.Canceled, label: t('canceled') };
      default: return { bg: 'bg-[#c2410c]', color: '#c2410c', icon: ICONS.Pending, label: t('notPaid') };
    }
  };

  // --- Processed Bills Logic ---
  const processedBills = useMemo(() => {
    let result = [...bills];
    if (filterStatus !== 'ALL') result = result.filter(b => b.status === filterStatus);
    if (priceFilter === 'CUSTOM') {
      if (customPriceMin !== '') result = result.filter(b => b.amount >= parseFloat(customPriceMin));
      if (customPriceMax !== '') result = result.filter(b => b.amount <= parseFloat(customPriceMax));
    }
    if (dateFilter === '7DAYS') {
      const limit = new Date(); limit.setDate(limit.getDate() - 7);
      result = result.filter(b => new Date(b.createdAt) >= limit);
    } else if (dateFilter === '30DAYS') {
      const limit = new Date(); limit.setDate(limit.getDate() - 30);
      result = result.filter(b => new Date(b.createdAt) >= limit);
    } else if (dateFilter === 'CUSTOM' && (customDateFrom || customDateTo)) {
      if (customDateFrom) {
        const from = new Date(customDateFrom); from.setHours(0, 0, 0, 0);
        result = result.filter(b => new Date(b.createdAt) >= from);
      }
      if (customDateTo) {
        const to = new Date(customDateTo); to.setHours(23, 59, 59, 999);
        result = result.filter(b => new Date(b.createdAt) <= to);
      }
    }

    result.sort((a, b) => {
      if (sortBy === 'status-first') {
        if (a.status === BillStatus.NOT_PAID && b.status !== BillStatus.NOT_PAID) return -1;
        if (a.status !== BillStatus.NOT_PAID && b.status === BillStatus.NOT_PAID) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'date-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'date-asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'amount-desc') return b.amount - a.amount;
      if (sortBy === 'amount-asc') return a.amount - b.amount;
      return 0;
    });
    return result;
  }, [bills, filterStatus, priceFilter, customPriceMin, customPriceMax, dateFilter, customDateFrom, customDateTo, sortBy]);

  const pagedBills = useMemo(() => processedBills.slice(0, visibleCount), [processedBills, visibleCount]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== 'ALL') count++;
    if (sortBy !== 'status-first') count++;
    if (customPriceMin !== '' || customPriceMax !== '') count++;
    if (customDateFrom !== '' || customDateTo !== '') count++;
    return count;
  }, [filterStatus, sortBy, customPriceMin, customPriceMax, customDateFrom, customDateTo]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && visibleCount < processedBills.length) {
      setVisibleCount(prev => prev + BATCH_SIZE);
    }
  }, [visibleCount, processedBills.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  if (isLoading) return (
    <Layout showBack>
      <div className="space-y-6">
        <div className="h-48 bg-white rounded-[2.5rem] animate-pulse"></div>
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-3xl animate-pulse"></div>)}
      </div>
    </Layout>
  );
  if (!shop) return null;

  return (
    <Layout title={shop.name} showBack>
      <div className="space-y-6 pb-20">
        {/* Shop Stats Header */}
        <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 p-7 shadow-sm space-y-5 relative overflow-hidden">
          <button onClick={handleDeleteShop} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-700">{ICONS.Trash}</button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 text-[#0e3039] rounded-2xl flex items-center justify-center border border-slate-200">{ICONS.Store}</div>
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-none">{shop.name}</h2>
              <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Since {new Date(shop.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-5 border-t border-slate-100">
            <div className="bg-orange-50/40 p-4 rounded-3xl border border-orange-100/30">
              <p className="text-[#c2410c] text-[9px] font-black uppercase tracking-wider">{t('pending')}</p>
              <p className="text-xl font-black text-slate-900 mt-1">₹{stats.pendingAmount.toLocaleString('en-IN')}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{stats.pendingCount} {t('count')}</p>
            </div>
            <div className="bg-green-50/40 p-4 rounded-3xl border border-green-100/30">
              <p className="text-[#15803d] text-[9px] font-black uppercase tracking-wider">{t('received')}</p>
              <p className="text-xl font-black text-slate-900 mt-1">₹{stats.receivedAmount.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Add Bill Button */}
        <button onClick={() => openBillModal()} className="w-full bg-[#0e3039] text-white py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 font-black text-base active:scale-95 transition-all ring-4 ring-slate-100">
          {ICONS.Plus} {t('addBill')}
        </button>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 px-1">
          {['ALL', BillStatus.NOT_PAID, BillStatus.PAID].map(tab => {
            const isActive = filterStatus === tab;
            const tabCfg = getStatusConfig(tab as BillStatus);
            return (
              <button
                key={tab}
                onClick={() => { setFilterStatus(tab as FilterStatus); setVisibleCount(BATCH_SIZE); }}
                className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border-2 ${isActive ? `bg-slate-900 text-white border-slate-900 shadow-md` : 'bg-white text-slate-500 border-slate-200'}`}
              >
                {tab === 'ALL' ? t('all') : tabCfg.label}
              </button>
            );
          })}
        </div>

        {/* Bill List */}
        <div className="space-y-3">
          {pagedBills.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-400 font-black uppercase text-[9px] tracking-widest">{t('noPendingBills')}</div>
          ) : (
            pagedBills.map(bill => {
              const cfg = getStatusConfig(bill.status);
              const created = getSessionInfo(bill.createdAt);
              // Provide default items array if undefined
              const displayItems = bill.items || [];

              return (
                <button
                  key={bill.id}
                  onClick={() => openBillModal(bill)}
                  className={`w-full ${cfg.bg} px-6 py-5 rounded-[2rem] shadow-md flex items-center justify-between group active:scale-[0.98] transition-all text-left relative overflow-hidden`}
                >
                  <div className="flex items-center gap-4 z-10 w-full">
                    <div className="flex flex-col flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-black text-white text-2xl tracking-tighter leading-none">₹{bill.amount.toLocaleString('en-IN')}</p>
                        <span className="text-[8px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider bg-black/20 text-white border border-white/10">{cfg.label}</span>
                      </div>

                      {/* Item Preview */}
                      <div className="mt-2 text-white/80 text-[10px] font-medium truncate max-w-[250px]">
                        {displayItems.length > 0
                          ? displayItems.map(i => `${i.quantity}x ${i.name}`).join(', ')
                          : 'Legacy Bill (No Item Details)'}
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <p className="text-[9px] text-white/80 font-bold uppercase tracking-widest">
                          {new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} • {created.time}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
          <div ref={observerTarget} className="h-10 w-full flex items-center justify-center">
            {visibleCount < processedBills.length && <div className="w-6 h-6 border-2 border-[#0e3039] border-t-transparent rounded-full animate-spin"></div>}
          </div>
        </div>
      </div>

      {/* --- ADD/EDIT BILL MODAL (LINE ITEM UI) --- */}
      {isBillModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 bg-black/70 backdrop-blur-md">
          <div className="bg-white w-full h-[95vh] sm:h-auto sm:max-w-2xl sm:max-h-[90vh] rounded-t-[3rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl animate-in slide-in-from-bottom-full duration-300 flex flex-col">

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{editingBill ? 'Edit Bill' : t('addBill')}</h2>
              {editingBill && <button onClick={() => handleDeleteBill(editingBill.id)} className="text-red-600 p-2 hover:bg-red-50 rounded-full">{ICONS.Trash}</button>}
            </div>

            {/* Scrollable Form Area */}
            <div className="flex-1 overflow-y-auto scrollbar-hide -mx-4 px-4 space-y-4">
              <form id="billForm" onSubmit={handleSaveBill} className="space-y-6">

                {/* Total Display */}
                <div className="bg-[#0e3039] p-6 rounded-3xl text-white flex justify-between items-center sticky top-0 z-20 shadow-lg">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Grand Total</p>
                    <p className="text-3xl font-black tracking-tighter">₹{calculateTotal(billItems).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Items</p>
                    <p className="text-xl font-bold">{billItems.length}</p>
                  </div>
                </div>

                {/* Line Items List */}
                <div className="space-y-3 pb-4">
                  {billItems.map((item, index) => (
                    <div key={item.id} className="bg-slate-50 p-4 rounded-3xl border border-slate-200 relative group">

                      {/* Top Row: Name & Delete */}
                      <div className="flex gap-3 mb-3">
                        <div className="flex-1 relative">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Item Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Rice, Oil"
                            value={item.name}
                            onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-[#0e3039]"
                            autoFocus={index === billItems.length - 1 && item.name === ''}
                          />
                          {/* Autocomplete Dropdown */}
                          {activeRowId === item.id && suggestions[item.id] && suggestions[item.id].length > 0 && (
                            <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl mt-1 z-30 max-h-40 overflow-y-auto">
                              {suggestions[item.id].map(sug => (
                                <button
                                  key={sug}
                                  type="button"
                                  onClick={() => selectSuggestion(item.id, sug)}
                                  className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                                >
                                  {sug}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="mt-6 p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all h-fit"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      {/* Bottom Row: Qty, Price, Total */}
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Qty</label>
                          <input
                            type="number"
                            value={item.quantity}
                            min="0.1"
                            step="any"
                            onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full bg-white px-3 py-3 rounded-xl border border-slate-200 font-bold text-slate-800 text-center focus:outline-none focus:border-[#0e3039]"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Price</label>
                          <input
                            type="number"
                            value={item.price}
                            min="0"
                            step="any"
                            onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                            className="w-full bg-white px-3 py-3 rounded-xl border border-slate-200 font-bold text-slate-800 text-center focus:outline-none focus:border-[#0e3039]"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Total</label>
                          <div className="w-full bg-slate-200 px-3 py-3 rounded-xl border border-transparent font-black text-slate-600 text-center">
                            {(item.quantity * item.price).toFixed(0)}
                          </div>
                        </div>
                      </div>

                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full py-4 border-2 border-dashed border-slate-300 text-slate-500 font-black uppercase text-xs rounded-2xl hover:border-[#0e3039] hover:text-[#0e3039] transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Add Item
                  </button>
                </div>

                {/* Status Selection */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-800 uppercase tracking-widest ml-1">{t('status')}</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[BillStatus.NOT_PAID, BillStatus.PAID, BillStatus.CANCELED].map(s => {
                      const cfg = getStatusConfig(s);
                      const isActive = status === s;
                      return (
                        <button key={s} type="button" onClick={() => setStatus(s)} className={`py-4 rounded-2xl text-[9px] font-black transition-all border-2 flex flex-col items-center gap-2 ${isActive ? 'bg-white shadow-xl scale-105 z-10 border-[#0e3039]' : 'bg-slate-50 border-transparent text-slate-400 opacity-60'}`}>
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {formError && <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-[11px] font-black uppercase flex items-center gap-3 border border-red-200">{ICONS.Error} {formError}</div>}
              </form>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-4 pt-4 mt-2 border-t border-slate-100 bg-white">
              <button type="button" onClick={() => setIsBillModalOpen(false)} className="flex-1 py-5 text-slate-900 font-black uppercase text-xs tracking-widest rounded-3xl hover:bg-slate-50 transition-colors">{t('cancel')}</button>
              <button form="billForm" type="submit" disabled={isSubmitting} className="flex-1 bg-[#0e3039] text-white py-5 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2">
                {isSubmitting ? t('loading') : <><Save size={16} /> {t('save')}</>}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FILTER MODAL (Keep Existing) */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 bg-black/70 backdrop-blur-md overflow-hidden">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-300 flex flex-col max-h-[90vh]">
            {/* Filter Content (Same as previous) */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{t('filters')}</h2>
              <button onClick={() => setIsFilterModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-600">{ICONS.Close}</button>
            </div>
            <div className="space-y-8 overflow-y-auto flex-1 scrollbar-hide pr-2">
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-800 uppercase tracking-widest ml-1">{t('sortBy')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'status-first', label: 'Pending First' },
                    { id: 'date-desc', label: t('dateNewest') },
                    { id: 'amount-desc', label: t('amtHigh') },
                    { id: 'amount-asc', label: t('amtLow') },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSortBy(opt.id as SortOption)}
                      className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wide border-2 transition-all ${sortBy === opt.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-500 border-transparent'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <button onClick={() => { setFilterStatus('ALL'); setSortBy('status-first'); setCustomPriceMin(''); setCustomPriceMax(''); setVisibleCount(BATCH_SIZE); setIsFilterModalOpen(false); }} className="w-full py-4 text-slate-900 font-black uppercase text-[10px] tracking-widest bg-slate-100 rounded-3xl">{t('clearAll')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default ShopDetail;