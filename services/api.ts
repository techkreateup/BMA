
import { API_URL } from '../constants';
import { Shop, Bill, AuthUser } from '../types';

async function callApi(action: string, payload: any = {}) {
  try {
    if (payload.email) {
      payload.email = payload.email.trim().toLowerCase();
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action, ...payload }),
    });
    
    if (!response.ok) {
      throw new Error(`Server Error: ${response.status}`);
    }

    const responseText = await response.text();
    const trimmedResponse = responseText.trim();
    
    if (trimmedResponse.startsWith('<!DOCTYPE') || trimmedResponse.startsWith('<html')) {
      throw new Error('API Configuration Error: The script returned HTML. Check deployment settings.');
    }
    
    let result;
    try {
      result = JSON.parse(trimmedResponse);
    } catch (e) {
      throw new Error(`Failed to parse server response.`);
    }

    if (!result.success) {
      throw new Error(result.error || 'Request failed');
    }
    
    return result.data;
  } catch (error) {
    console.error(`[API ERROR - ${action}]:`, error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export const api = {
  // Updated: Register new user
  register: async (email: string, password: string, name: string): Promise<AuthUser> => {
    return await callApi('register', { email, password, name });
  },

  // Updated: Login with password
  login: async (email: string, password: string): Promise<AuthUser> => {
    return await callApi('login', { email, password });
  },

  // All data calls now require userId for table sharding logic
  getShops: async (userId: string): Promise<Shop[]> => {
    try {
      const data = await callApi('getShops', { userId });
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("Returning empty shops due to API error:", e);
      return [];
    }
  },

  saveShop: async (userId: string, shop: Shop): Promise<void> => {
    return await callApi('saveShop', { userId, shop });
  },

  deleteShop: async (userId: string, shopId: string): Promise<void> => {
    return await callApi('deleteShop', { userId, shopId });
  },

  getBills: async (userId: string): Promise<Bill[]> => {
    try {
      const data = await callApi('getBills', { userId });
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("Returning empty bills due to API error:", e);
      return [];
    }
  },

  saveBill: async (userId: string, bill: Bill): Promise<void> => {
    return await callApi('saveBill', { userId, bill });
  },

  deleteBill: async (userId: string, billId: string): Promise<void> => {
    return await callApi('deleteBill', { userId, billId });
  }
};
