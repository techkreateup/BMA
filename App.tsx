
import React from 'react';
// Corrected: importing from 'react-router' to resolve missing export member errors in react-router-dom.
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router';
import { AppProvider, useAppContext } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

// Pages
import Dashboard from './pages/Dashboard';
import Shops from './pages/Shops';
import ShopDetail from './pages/ShopDetail';
import AddEditBill from './pages/AddEditBill'; // New Import
import Settings from './pages/Settings';
import Login from './pages/Login';

const AppRoutes = () => {
  const { user, isLoading } = useAuth();
  const { t } = useAppContext();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#0e3039] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-[#0e3039] font-bold">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
      <Route path="/shops" element={user ? <Shops /> : <Navigate to="/login" />} />
      <Route path="/shops/:id" element={user ? <ShopDetail /> : <Navigate to="/login" />} />

      {/* New Routes for Bill Management */}
      <Route path="/shops/:shopId/bill/new" element={user ? <AddEditBill /> : <Navigate to="/login" />} />
      <Route path="/shops/:shopId/bill/:billId/edit" element={user ? <AddEditBill /> : <Navigate to="/login" />} />

      <Route path="/settings" element={user ? <Settings /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AuthProvider>
        <DataProvider>
          <Router>
            <AppRoutes />
          </Router>
        </DataProvider>
      </AuthProvider>
    </AppProvider>
  );
};

export default App;
