
export enum BillStatus {
  NOT_PAID = 'NOT_PAID',
  PAID = 'PAID',
  CANCELED = 'CANCELED'
}

export interface Shop {
  id: string;
  name: string;
  createdAt: string;
}

export interface BillItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Bill {
  id: string;
  shopId: string;
  amount: number;
  items?: BillItem[]; // New optional field for line items
  status: BillStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string; // Added ID for User-based Tables
  email: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export type Language = 'en' | 'ta';
export type FontSize = 'small' | 'medium' | 'large';

export interface AppSettings {
  language: Language;
  fontSize: FontSize;
}

export interface DashboardStats {
  totalShops: number;
  totalPendingBills: number;
  totalAmountToCollect: number;
}
