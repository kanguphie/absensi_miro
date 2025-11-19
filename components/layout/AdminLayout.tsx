
import React, { useState } from 'react';
import { Link, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import {
  FiGrid,
  FiUsers,
  FiFileText,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiDatabase,
  FiArchive,
  FiChevronDown,
  FiChevronUp,
  FiClipboard,
  FiCalendar,
  FiActivity,
  FiImage,
  FiUserX,
  FiClock,
  FiCpu
} from 'react-icons/fi';
import Breadcrumb from './Breadcrumb';

// Import Admin Pages for nested routing
import DashboardPage from '../../pages/admin/DashboardPage';
import StudentsPage from '../../pages/admin/StudentsPage';
import ClassesPage from '../../pages/admin/ClassesPage';
import PhotoUploadPage from '../../pages/admin/PhotoUploadPage';
import AttendanceManagementPage from '../../pages/admin/AttendanceManagementPage';
import ReportsPage from '../../pages/admin/ReportsPage';
import DailyReportsPage from '../../pages/admin/DailyReportsPage';
import PeriodicReportsPage from '../../pages/admin/PeriodicReportsPage';
import AttendanceHistoryPage from '../../pages/admin/AttendanceHistoryPage';
import SettingsPage from '../../pages/admin/SettingsPage';
import AIRecapPage from '../../pages/admin/AIRecapPage';

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>(['Manajemen Data', 'Laporan']);
  const { logout, user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: FiGrid },
    {
      name: 'Manajemen Data',
      icon: FiDatabase,
      subItems: [
        { name: 'Siswa', path: '/admin/students', icon: FiUsers },
        { name: 'Kelas', path: '/admin/classes', icon: FiArchive },
        { name: 'Unggah Foto', path: '/admin/photo-upload', icon: FiImage },
        { name: 'Absensi Manual', path: '/admin/attendance-management', icon: FiUserX },
        { name: 'Riwayat Absensi', path: '/admin/attendance-history', icon: FiClock },
      ]
    },
    {
      name: 'Laporan',
      icon: FiFileText,
      subItems: [
        { name: 'Laporan Harian', path: '/admin/daily-reports', icon: FiClipboard },
        { name: 'Laporan Bulanan', path: '/admin/reports', icon: FiCalendar },
        { name: 'Laporan Periodik', path: '/admin/periodic-reports', icon: FiActivity },
      ]
    },
    { name: 'AI Recap', path: '/admin/ai-recap', icon: FiCpu },
    { name: 'Pengaturan', path: '/admin/settings', icon: FiSettings },
  ];

  const toggleMenu = (menuName: string) => {
    if (openMenus.includes(menuName)) {
      setOpenMenus(openMenus.filter(name => name !== menuName));
    } else {
      setOpenMenus([...openMenus, menuName]);
    }
  };

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:transform-none flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
                <img src={settings?.schoolLogoUrl} alt="Logo" className="h-8 w-8 object-contain" />
                <span className="font-bold text-xl text-slate-800 tracking-tight">Admin Panel</span>
            </div>
            <button className="ml-auto lg:hidden text-slate-500" onClick={() => setSidebarOpen(false)}>
                <FiX size={24} />
            </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {navItems.map((item) => (
            <div key={item.name}>
              {item.subItems ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      openMenus.includes(item.name) 
                        ? 'bg-indigo-50 text-indigo-700' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center">
                      <item.icon className={`w-5 h-5 mr-3 ${openMenus.includes(item.name) ? 'text-indigo-600' : 'text-slate-400'}`} />
                      {item.name}
                    </div>
                    {openMenus.includes(item.name) ? <FiChevronUp /> : <FiChevronDown />}
                  </button>
                  {openMenus.includes(item.name) && (
                    <div className="mt-1 ml-4 space-y-1 border-l-2 border-slate-100 pl-2">
                      {item.subItems.map((subItem) => (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            isActive(subItem.path)
                              ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <subItem.icon className={`w-4 h-4 mr-3 ${isActive(subItem.path) ? 'text-indigo-600' : 'text-slate-400'}`} />
                          {subItem.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive(item.path)
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-3 ${isActive(item.path) ? 'text-indigo-200' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                        {user?.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                        <p className="font-bold text-sm text-slate-800 truncate">{user?.username}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.role}</p>
                    </div>
                </div>
            </div>
            <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
            >
                <FiLogOut className="w-4 h-4 mr-2" />
                Keluar
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:hidden flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-500 hover:text-slate-700">
            <FiMenu size={24} />
          </button>
          <span className="ml-4 font-bold text-lg text-slate-800">Admin Panel</span>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-6 md:p-10 overflow-y-auto">
            <Breadcrumb />
            <div className="animate-fade-in">
                <Routes>
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="students" element={<StudentsPage />} />
                    <Route path="classes" element={<ClassesPage />} />
                    <Route path="photo-upload" element={<PhotoUploadPage />} />
                    <Route path="attendance-management" element={<AttendanceManagementPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="daily-reports" element={<DailyReportsPage />} />
                    <Route path="periodic-reports" element={<PeriodicReportsPage />} />
                    <Route path="attendance-history" element={<AttendanceHistoryPage />} />
                    <Route path="ai-recap" element={<AIRecapPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
            </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
