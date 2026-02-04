import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { Shop, Bill, BillStatus } from '../types';
import { useAuth } from './AuthContext';

interface ShopStats extends Shop {
  pendingCount: number;
  totalPending: number;
  totalReceived: number;
}

interface DataContextType {
  shops: Shop[];
  bills: Bill[];
  shopStats: ShopStats[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  updateShop: (shop: Shop) => Promise<void>;
  deleteShop: (shopId: string) => Promise<void>;
  updateBill: (bill: Bill) => Promise<void>;
  deleteBill: (billId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [shops, setShops] = useState<Shop[]>(() => {
    const saved = localStorage.getItem('bma_cache_shops');
    return saved ? JSON.parse(saved) : [];
  });
  const [bills, setBills] = useState<Bill[]>(() => {
    const saved = localStorage.getItem('bma_cache_bills');
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setIsLoading(true);
    
    try {
      const [fetchedShops, fetchedBills] = await Promise.all([
        api.getShops(user.id),
        api.getBills(user.id)
      ]);
      
      const updatedShops = fetchedShops || [];
      const updatedBills = (fetchedBills || []).map(b => ({
        ...b,
        items: typeof b.items === 'string' ? JSON.parse(b.items) : b.items
      }));

      setShops(updatedShops);
      setBills(updatedBills);

      localStorage.setItem('bma_cache_shops', JSON.stringify(updatedShops));
      localStorage.setItem('bma_cache_bills', JSON.stringify(updatedBills));
    } catch (error) {
      console.error("Data Refresh Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData(shops.length === 0);
    }
  }, [user, fetchData]);

  const shopStats = useMemo(() => {
    return shops.map(shop => {
      const shopBills = bills.filter(b => b.shopId === shop.id);
      const pendingBills = shopBills.filter(b => b.status === BillStatus.NOT_PAID);
      const paidBills = shopBills.filter(b => b.status === BillStatus.PAID);
      
      const totalPending = pendingBills.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      const totalReceived = paidBills.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      
      return {
        ...shop,
        pendingCount: pendingBills.length,
        totalPending,
        totalReceived
      };
    });
  }, [shops, bills]);

  const updateShop = async (shop: Shop) => {
    if (!user) return;
    await api.saveShop(user.id, shop);
    fetchData(false);
  };

  const deleteShop = async (shopId: string) => {
    if (!user) return;
    await api.deleteShop(user.id, shopId);
    fetchData(false);
  };

  const updateBill = async (bill: Bill) => {
    if (!user) return;
    await api.saveBill(user.id, bill);
    fetchData(false);
  };

  const deleteBill = async (billId: string) => {
    if (!user) return;
    await api.deleteBill(user.id, billId);
    fetchData(false);
  };

  const value = {
    shops,
    bills,
    shopStats,
    isLoading,
    refreshData: () => fetchData(true),
    updateShop,
    deleteShop,
    updateBill,
    deleteBill
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
