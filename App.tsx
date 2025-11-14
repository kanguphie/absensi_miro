
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';

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
import PeriodicReportsPage from './pages/admin/PeriodicReportsPage';
import PhotoUploadPage from './pages/admin/PhotoUploadPage';
import AttendanceManagementPage from './pages/admin/AttendanceManagementPage';

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
                <Route path="photo-upload" element={<PhotoUploadPage />} />
                <Route path="attendance-management" element={<AttendanceManagementPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="daily-reports" element={<DailyReportsPage />} />
                <Route path="periodic-reports" element={<PeriodicReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </HashRouter>
        </DataProvider>
      </SettingsProvider>
    </AuthProvider>
  );
};

export default App;