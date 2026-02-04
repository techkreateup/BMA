
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Shop, Bill, BillStatus, BillItem } from '../types';
import { ICONS, COLORS } from '../constants';
import { ItemTrie } from '../utils/trie';
import { Plus, Trash2, Save, Check, XCircle, Clock } from 'lucide-react';

const AddEditBill: React.FC = () => {
  const { shopId, billId } = useParams<{ shopId: string; billId?: string }>();
  const { t } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [shop, setShop] = useState<Shop | null>(null);
  const [allBills, setAllBills] = useState<Bill[]>([]); // For Trie construction

  // Form State
  const [billItems, setBillItems] = useState<BillItem[]>([
    { id: Date.now().toString(), name: '', quantity: 1, price: 0 }
  ]);
  const [status, setStatus] = useState<BillStatus>(BillStatus.NOT_PAID);
  const [createdAt, setCreatedAt] = useState<string>(new Date().toISOString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // UI State
  const [suggestions, setSuggestions] = useState<{ [key: string]: string[] }>({});
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  
  // Refs
  const qtyInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // 1. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !shopId) return;
      setIsLoading(true);
      try {
        const [fetchedShops, fetchedBills] = await Promise.all([
          api.getShops(user.id),
          api.getBills(user.id)
        ]);

        const currentShop = fetchedShops.find(s => String(s.id) === String(shopId));
        if (!currentShop) {
          navigate('/shops');
          return;
        }
        setShop(currentShop);

        const parsedBills = fetchedBills.map(b => ({
            ...b,
            items: typeof b.items === 'string' ? JSON.parse(b.items) : b.items
        }));
        setAllBills(parsedBills);

        // If Editing, populate form
        if (billId) {
          const currentBill = parsedBills.find(b => String(b.id) === String(billId));
          if (currentBill) {
            if (currentBill.items && currentBill.items.length > 0) {
              setBillItems(currentBill.items);
            } else {
              setBillItems([{ id: '1', name: 'Legacy Bill Amount', quantity: 1, price: currentBill.amount }]);
            }
            setStatus(currentBill.status);
            setCreatedAt(currentBill.createdAt);
          }
        }
      } catch (error) {
        console.error("Error loading bill data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user, shopId, billId]);

  // 2. Build Autocomplete Trie
  const itemTrie = useMemo(() => {
    const trie = new ItemTrie();
    allBills.forEach(bill => {
      if (bill.items && Array.isArray(bill.items)) {
        bill.items.forEach(item => trie.insert(item.name));
      }
    });
    if (allBills.length === 0) {
      ['Rice (1kg)', 'Rice (5kg)', 'Sugar (1kg)', 'Oil (1L)', 'Dal (1kg)', 'Soap', 'Tea'].forEach(w => trie.insert(w));
    }
    return trie;
  }, [allBills]);

  // 3. Form Logic
  const calculateTotal = (items: BillItem[]) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleAddItem = () => {
    setBillItems([...billItems, { id: Date.now().toString(), name: '', quantity: 1, price: 0 }]);
  };

  const handleRemoveItem = (itemId: string) => {
    if (billItems.length > 1) {
      setBillItems(billItems.filter(item => item.id !== itemId));
    } else {
        setBillItems([{ id: Date.now().toString(), name: '', quantity: 1, price: 0 }]);
    }
  };

  const handleItemChange = (itemId: string, field: keyof BillItem, value: string | number) => {
    setBillItems(prevItems => prevItems.map(item => {
      if (item.id === itemId) {
        if (field === 'name') {
           const valStr = value as string;
           if (valStr.length > 0) {
             setSuggestions(prev => ({ ...prev, [itemId]: itemTrie.search(valStr) }));
             setActiveRowId(itemId);
           } else {
             setSuggestions(prev => ({ ...prev, [itemId]: [] }));
           }
           return { ...item, name: valStr };
        }
        return { ...item, [field]: value } as BillItem;
      }
      return item;
    }));
  };

  const selectSuggestion = (itemId: string, name: string) => {
    setBillItems(prevItems => prevItems.map(item => 
      item.id === itemId ? { ...item, name: name } : item
    ));
    setSuggestions(prev => ({ ...prev, [itemId]: [] }));
    setActiveRowId(null);
    setTimeout(() => {
        qtyInputRefs.current[itemId]?.focus();
    }, 50);
  };

  const closeSuggestions = () => {
    setActiveRowId(null);
  };

  const handleDeleteBill = async () => {
     if (!billId || !user) return;
     // Prevent accidental double clicks
     if (isSubmitting) return;

     if (window.confirm(t('confirmDelete'))) {
         try {
             setIsSubmitting(true);
             await api.deleteBill(user.id, billId);
             // Explicit navigation ensures we don't get stuck
             navigate(`/shops/${shopId}`, { replace: true });
         } catch (e) {
             alert("Error deleting bill");
             setIsSubmitting(false);
         }
     }
  };

  const handleCancel = () => {
    // Explicitly navigate to shop page to avoid history stack issues
    navigate(`/shops/${shopId}`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const totalAmount = calculateTotal(billItems);
    if (totalAmount <= 0) {
      setFormError('Total amount must be greater than 0'); 
      return;
    }
    
    if (billItems.some(i => !i.name.trim())) {
      setFormError('Please enter names for all items');
      return;
    }

    if (!user || !shopId) return;

    setIsSubmitting(true);
    const billData: Bill = {
      id: billId || Date.now().toString(),
      shopId: shopId,
      amount: totalAmount,
      items: billItems,
      status: status,
      createdAt: createdAt,
      updatedAt: new Date().toISOString()
    };

    try {
      await api.saveBill(user.id, billData);
      navigate(`/shops/${shopId}`);
    } catch (error: any) {
      setFormError(error.message || t('errorGeneral'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
      return (
          <Layout showBack hideBottomNav>
              <div className="flex items-center justify-center h-[60vh]">
                  <div className="w-10 h-10 border-4 border-[#0e3039] border-t-transparent rounded-full animate-spin"></div>
              </div>
          </Layout>
      );
  }

  return (
    <Layout title={billId ? 'Edit Bill' : t('addBill')} showBack hideBottomNav>
        {activeRowId && <div className="fixed inset-0 z-40 bg-transparent" onClick={closeSuggestions}></div>}

        <form id="billForm" onSubmit={handleSave} className="space-y-6 relative z-10">
            
            {/* Header / Total Card */}
            <div className="bg-[#0e3039] p-6 rounded-[2rem] text-white flex justify-between items-center shadow-xl sticky top-0 z-30 ring-4 ring-slate-50/50">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Grand Total</p>
                    <p className="text-4xl font-black tracking-tighter">₹{calculateTotal(billItems).toLocaleString('en-IN')}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Items</p>
                    <p className="text-2xl font-bold">{billItems.length}</p>
                </div>
            </div>

            {/* Status Selector */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-3 gap-1">
                    {[BillStatus.NOT_PAID, BillStatus.PAID, BillStatus.CANCELED].map(s => {
                    const isActive = status === s;
                    let activeClass = '';
                    let icon = <Clock size={14} />;
                    let label = t('notPaid');

                    if (s === BillStatus.PAID) {
                        activeClass = 'bg-[#15803d] text-white shadow-md';
                        icon = <Check size={14} strokeWidth={3} />;
                        label = t('paid');
                    } else if (s === BillStatus.CANCELED) {
                        activeClass = 'bg-[#b91c1c] text-white shadow-md';
                        icon = <XCircle size={14} strokeWidth={2.5} />;
                        label = t('canceled');
                    } else {
                        activeClass = 'bg-[#c2410c] text-white shadow-md';
                    }

                    return (
                        <button 
                        key={s} 
                        type="button" 
                        onClick={() => setStatus(s)} 
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${isActive ? activeClass : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                        >
                        {icon} {label}
                        </button>
                    );
                    })}
                </div>
            </div>

            {/* Items Section */}
            <div className="space-y-4">
                 <div className="px-4 flex justify-between items-center text-slate-400">
                     <span className="text-[10px] font-black uppercase tracking-widest">Item Details</span>
                 </div>

                 <div className="space-y-4">
                    {billItems.map((item, index) => (
                        <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative transition-all focus-within:ring-2 focus-within:ring-[#0e3039]/20 focus-within:border-[#0e3039]">
                            
                            {/* Autocomplete Dropdown */}
                            {activeRowId === item.id && suggestions[item.id] && suggestions[item.id].length > 0 && (
                                <div className="absolute top-20 left-4 right-4 z-50">
                                    <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-h-40 overflow-y-auto ring-4 ring-slate-100">
                                        {suggestions[item.id].map(sug => (
                                            <button 
                                                key={sug}
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); selectSuggestion(item.id, sug); }}
                                                className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                                            >
                                                {sug}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Row 1: Item Name */}
                            <div className="mb-4">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Item Name</label>
                                <input 
                                    type="text"
                                    value={item.name}
                                    placeholder="e.g. Rice"
                                    onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                                    className="w-full text-lg font-bold text-slate-900 placeholder:text-slate-300 bg-slate-50 px-4 py-3 rounded-xl focus:bg-white border border-transparent focus:border-slate-200 focus:outline-none transition-all"
                                    autoFocus={index === billItems.length - 1 && item.name === ''}
                                />
                            </div>

                            {/* Row 2: Metrics Stacked Vertically */}
                            <div className="flex flex-col gap-3">
                                <div className="bg-slate-50 rounded-xl px-4 py-3 flex flex-col border border-slate-100 focus-within:bg-white focus-within:border-[#0e3039] transition-all">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Quantity</label>
                                    <input 
                                        ref={(el) => { qtyInputRefs.current[item.id] = el; }}
                                        type="number"
                                        min="0.1"
                                        step="any"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-transparent font-black text-2xl text-slate-900 focus:outline-none"
                                    />
                                </div>
                                <div className="bg-slate-50 rounded-xl px-4 py-3 flex flex-col border border-slate-100 focus-within:bg-white focus-within:border-[#0e3039] transition-all">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Price</label>
                                    <input 
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={item.price}
                                        onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-transparent font-black text-2xl text-slate-900 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Row 3: Total & Delete */}
                            <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Line Total</p>
                                    <p className="text-xl font-black text-slate-900">₹{(item.quantity * item.price).toFixed(0)}</p>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="p-3 text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-600 rounded-xl transition-all"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                 </div>

                 {/* Add Item Button */}
                 <button 
                    type="button" 
                    onClick={handleAddItem}
                    className="w-full py-5 bg-white border-2 border-dashed border-slate-300 text-slate-400 hover:text-[#0e3039] hover:border-[#0e3039] hover:bg-slate-50 rounded-[2rem] font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2"
                 >
                    <Plus size={16} strokeWidth={3} /> Add Item
                 </button>
            </div>

            {formError && (
                <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-[11px] font-black uppercase flex items-center justify-center gap-3 border border-red-200">
                    {ICONS.Error} {formError}
                </div>
            )}

            {/* Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex gap-4 z-50 max-w-md mx-auto shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                {billId ? (
                     <button type="button" onClick={handleDeleteBill} className="p-5 text-red-600 bg-red-50 hover:bg-red-100 rounded-3xl transition-colors">
                        <Trash2 size={20} />
                     </button>
                ) : null}
                
                <button 
                    type="button" 
                    onClick={handleCancel} 
                    className="flex-1 py-5 text-slate-900 font-black uppercase text-xs tracking-widest rounded-3xl bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                    {t('cancel')}
                </button>
                
                <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="flex-[2] bg-[#0e3039] text-white py-5 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    {isSubmitting ? t('loading') : <><Save size={18} /> {t('save')}</>}
                </button>
            </div>
        </form>
    </Layout>
  );
};

export default AddEditBill;
