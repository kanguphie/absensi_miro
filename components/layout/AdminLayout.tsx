
import React, { useState, useEffect } from 'react';
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
  FiCpu,
  FiUser
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
import IndividualReportPage from '../../pages/admin/IndividualReportPage';

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Changed from array to single string to support Accordion behavior (one open at a time)
  // Default is null (all collapsed)
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  
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
        { name: 'Laporan Individu', path: '/admin/individual-report', icon: FiUser },
        { name: 'Laporan Periodik', path: '/admin/periodic-reports', icon: FiActivity },
      ]
    },
    { name: 'AI Recap', path: '/admin/ai-recap', icon: FiCpu },
    { name: 'Pengaturan', path: '/admin/settings', icon: FiSettings },
  ];

  // Effect to auto-expand the menu that contains the current active route
  useEffect(() => {
    const activeItem = navItems.find(item => 
      item.subItems?.some(sub => pathname.startsWith(sub.path))
    );
    
    if (activeItem) {
      setActiveMenu(activeItem.name);
    } else {
      // If on a page with no submenu (like Dashboard), collapse all
      setActiveMenu(null);
    }
  }, [pathname]);

  const toggleMenu = (menuName: string) => {
    // Accordion logic: If clicking the open one, close it. If clicking a new one, open it (and close others implicitly).
    setActiveMenu(prev => (prev === menuName ? null : menuName));
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
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 text-slate-300 transform transition-transform duration-300 ease-in-out lg:transform-none flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
                <div className="bg-white p-1 rounded-full">
                  <img src={settings?.schoolLogoUrl} alt="Logo" className="h-6 w-6 object-contain" />
                </div>
                <span className="font-bold text-xl text-white tracking-tight">Admin Panel</span>
            </div>
            <button className="ml-auto lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
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
                      activeMenu === item.name 
                        ? 'bg-white/10 text-white' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center">
                      <item.icon className={`w-5 h-5 mr-3 ${activeMenu === item.name ? 'text-indigo-400' : 'text-slate-500'}`} />
                      {item.name}
                    </div>
                    {activeMenu === item.name ? <FiChevronUp /> : <FiChevronDown />}
                  </button>
                  {activeMenu === item.name && (
                    <div className="mt-1 ml-4 space-y-1 border-l-2 border-slate-700 pl-2 animate-fade-in">
                      {item.subItems.map((subItem) => (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            isActive(subItem.path)
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <subItem.icon className={`w-4 h-4 mr-3 ${isActive(subItem.path) ? 'text-indigo-200' : 'text-slate-500'}`} />
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
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-900/50'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-3 ${isActive(item.path) ? 'text-indigo-200' : 'text-slate-500'}`} />
                  {item.name}
                </Link>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
            <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                        {user?.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                        <p className="font-bold text-sm text-white truncate">{user?.username}</p>
                        <p className="text-xs text-slate-400 truncate">{user?.role}</p>
                    </div>
                </div>
            </div>
            <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium text-red-300 bg-red-500/10 hover:bg-red-600 hover:text-white transition-colors"
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
                    <Route path="individual-report" element={<IndividualReportPage />} />
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
