
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { FiChevronRight, FiHome } from 'react-icons/fi';

const breadcrumbNameMap: { [key: string]: string } = {
  '/admin': 'Admin',
  '/admin/dashboard': 'Dashboard',
  '/admin/students': 'Manajemen Siswa',
  '/admin/classes': 'Manajemen Kelas',
  '/admin/photo-upload': 'Unggah Foto Massal',
  '/admin/attendance-management': 'Manajemen Absensi',
  '/admin/reports': 'Laporan Bulanan',
  '/admin/daily-reports': 'Laporan Harian',
  '/admin/periodic-reports': 'Laporan Periodik',
  '/admin/settings': 'Pengaturan',
};

const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length === 0 || pathnames[0] !== 'admin') {
      return null;
  }
  
  // If we are at the root admin path, show 'Dashboard'
  if (pathnames.length === 1 && pathnames[0] === 'admin') {
    pathnames.push('dashboard');
  }

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-2">
        <li className="inline-flex items-center">
          <Link to="/admin" className="inline-flex items-center text-sm font-medium text-slate-700 hover:text-indigo-600">
            <FiHome className="w-4 h-4 mr-2.5" />
            Admin
          </Link>
        </li>
        {pathnames.slice(1).map((value, index) => {
          const last = index === pathnames.length - 2;
          const to = `/${pathnames.slice(0, index + 2).join('/')}`;
          const name = breadcrumbNameMap[to] || value.charAt(0).toUpperCase() + value.slice(1);

          return (
            <li key={to}>
              <div className="flex items-center">
                <FiChevronRight className="w-5 h-5 text-slate-400" />
                <Link
                  to={to}
                  className={`ml-1 text-sm font-medium ${
                    last ? 'text-slate-500 cursor-default' : 'text-slate-700 hover:text-indigo-600'
                  }`}
                  aria-current={last ? 'page' : undefined}
                >
                  {name}
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;