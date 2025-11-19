
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { SettingsProvider } from './contexts/SettingsContext';

import KioskPage from './pages/KioskPage';
import LoginPage from './pages/LoginPage';
import ManualAttendancePage from './pages/ManualAttendancePage';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SettingsProvider>
        <DataProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<KioskPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/manual" element={<ManualAttendancePage />} />
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </HashRouter>
        </DataProvider>
      </SettingsProvider>
    </AuthProvider>
  );
};

export default App;
