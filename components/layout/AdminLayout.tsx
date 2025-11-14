
import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
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
} from 'react-icons/fi';
import Breadcrumb from './Breadcrumb';

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>(['Manajemen Data', 'Laporan']);
  const { logout, user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: FiGrid },
    {
      name: 'Manajemen Data',
      icon: FiDatabase,
      children: [
        { name: 'Manajemen Siswa', path: '/admin/students', icon: FiUsers },
        { name: 'Manajemen Kelas', path: '/admin/classes', icon: FiArchive },
        { name: 'Unggah Foto', path: '/admin/photo-upload', icon: FiImage },
        { name: 'Manajemen Absensi', path: '/admin/attendance-management', icon: FiUserX },
      ],
    },
    { 
      name: 'Laporan', 
      icon: FiFileText,
      children: [
          { name: 'Laporan Harian', path: '/admin/daily-reports', icon: FiClipboard },
          { name: 'Laporan Periodik', path: '/admin/periodic-reports', icon: FiActivity },
          { name: 'Laporan Bulanan', path: '/admin/reports', icon: FiCalendar },
      ]
    },
    { name: 'Pengaturan', path: '/admin/settings', icon: FiSettings },
  ];

  const handleMenuToggle = (name: string) => {
    setOpenMenus(prev => 
        prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]
    );
  }
  
  const NavItem: React.FC<{ item: typeof navItems[0]; closeSidebar?: () => void; }> = ({ item, closeSidebar }) => {
    const { pathname } = useLocation();
    const isParentActive = item.children?.some(child => pathname.startsWith(child.path ?? ''));

    if (item.children) {
      const isOpen = openMenus.includes(item.name);
      return (
        <div>
          <button
            onClick={() => handleMenuToggle(item.name)}
            className={`flex items-center justify-between w-full py-2.5 px-4 rounded-lg transition-colors duration-200 ${
              isParentActive ? 'text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <div className="flex items-center">
              <item.icon size={20} />
              <span className="ml-3 font-medium">{item.name}</span>
            </div>
            {isOpen ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          {isOpen && (
            <div className="pl-8 py-1">
              {item.children.map(child => (
                <NavLink
                  key={child.name}
                  to={child.path!}
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    `flex items-center py-2 px-2 my-1 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`
                  }
                >
                  <child.icon size={16} className="mr-3" />
                  {child.name}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      );
    }
  
    return (
      <NavLink
        to={item.path!}
        onClick={closeSidebar}
        className={({ isActive }) =>
          `flex items-center py-2.5 px-4 rounded-lg transition-colors duration-200 ${
            isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
          }`
        }
      >
        <item.icon size={20} />
        <span className="ml-3 font-medium">{item.name}</span>
      </NavLink>
    );
  };

  const SidebarContent = () => (
    <>
       <div className="flex items-center justify-center h-20 border-b border-slate-700">
            <img src={settings?.schoolLogoUrl} alt="Logo" className="h-10 w-10 mr-3 bg-white p-1 rounded-full" />
            <span className="font-bold text-lg text-white">Admin Panel</span>
        </div>
        <div className="flex-1 overflow-y-auto">
            <nav className="p-4 space-y-2">
                {navItems.map((item) => <NavItem key={item.name} item={item} />)}
            </nav>
        </div>
        <div className="p-4 border-t border-slate-700">
             <div className="flex items-center p-2 rounded-lg bg-slate-700/50">
                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white mr-3">
                    {user?.username.charAt(0).toUpperCase()}
                </div>
                <div>
                    <p className="font-semibold text-white text-sm">{user?.username}</p>
                    <p className="text-xs text-slate-400">{user?.role}</p>
                </div>
             </div>
        </div>
    </>
  )

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity lg:hidden no-print ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)}></div>
      <div className={`fixed inset-y-0 left-0 w-64 bg-slate-800 text-white transform transition-transform z-40 lg:hidden no-print ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="flex items-center justify-end p-4 lg:hidden">
          <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
            <FiX size={24} />
          </button>
        </div>
        <SidebarContent />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0 no-print">
        <div className="flex flex-col w-64 bg-slate-800 text-white">
          <SidebarContent />
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between p-4 bg-white border-b border-slate-200 no-print">
          <div className="flex items-center">
            <button className="text-slate-500 focus:outline-none lg:hidden mr-4" onClick={() => setSidebarOpen(true)}>
              <FiMenu size={24} />
            </button>
            <Breadcrumb />
          </div>
          <div className="flex items-center">
            <button onClick={handleLogout} className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors font-medium">
              <FiLogOut className="mr-2" /> Logout
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;