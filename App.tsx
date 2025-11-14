
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { SettingsProvider } from './contexts/SettingsContext';

import KioskPage from './pages/KioskPage';
import LoginPage from './pages/LoginPage';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import DashboardPage from './pages/admin/DashboardPage';
import StudentsPage from './pages/admin/StudentsPage';
import ClassesPage from './pages/admin/ClassesPage';
import ReportsPage from './pages/admin/ReportsPage';
import DailyReportsPage from './pages/admin/DailyReportsPage';
import SettingsPage from './pages/admin/SettingsPage';
import ManualAttendancePage from './pages/ManualAttendancePage';

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
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="students" element={<StudentsPage />} />
                <Route path="classes" element={<ClassesPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="daily-reports" element={<DailyReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </HashRouter>
          <Toaster
            position="top-right"
            reverseOrder={false}
            toastOptions={{
              duration: 5000,
              style: {
                background: '#333',
                color: '#fff',
              },
            }}
          />
        </DataProvider>
      </SettingsProvider>
    </AuthProvider>
  );
};

export default App;
