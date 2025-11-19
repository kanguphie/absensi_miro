
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { FiLogIn, FiUser, FiLock, FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi';

declare const Swal: any;

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) {
      navigate('/admin/dashboard');
      Swal.fire({
        icon: 'success',
        title: 'Selamat Datang!',
        text: 'Login berhasil.',
        showConfirmButton: false,
        timer: 1500,
        background: 'rgba(255, 255, 255, 0.9)',
        backdrop: `rgba(0,0,123,0.2) left top no-repeat`
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Akses Ditolak',
        text: 'Username atau password salah.',
        background: '#fff',
        confirmButtonColor: '#f43f5e'
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Animated Background Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

      <div className="w-full max-w-md z-10">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 md:p-10 animate-fade-in relative overflow-hidden">
          {/* Top Sheen Effect */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50"></div>

          <div className="text-center mb-10">
            <div className="relative inline-block group">
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-violet-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                <img 
                    src={settings?.schoolLogoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Kementerian_Agama_new_logo.png/535px-Kementerian_Agama_new_logo.png"} 
                    alt="School Logo" 
                    className="relative w-24 h-24 mx-auto rounded-full bg-white p-2 object-contain shadow-lg" 
                />
            </div>
            <h1 className="text-3xl font-extrabold text-white mt-6 tracking-tight">Admin Portal</h1>
            <p className="text-slate-300 mt-2 text-sm font-medium tracking-wide uppercase opacity-80">
              {settings?.schoolName || 'Sistem Absensi RFID'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="group">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 ml-1">Username</label>
                    <div className="relative transition-all duration-300 group-focus-within:scale-[1.02]">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <FiUser className="text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="block w-full pl-11 pr-4 py-3.5 bg-slate-800/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                            placeholder="Masukkan username admin"
                            required
                        />
                    </div>
                </div>

                <div className="group">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 ml-1">Password</label>
                    <div className="relative transition-all duration-300 group-focus-within:scale-[1.02]">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <FiLock className="text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                        </div>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full pl-11 pr-12 py-3.5 bg-slate-800/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                            placeholder="Masukkan password"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer focus:outline-none"
                        >
                            {showPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                    </div>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full relative overflow-hidden group bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                <span className="absolute inset-0 w-full h-full bg-white/20 group-hover:translate-x-full ease-out duration-500 transition-transform -translate-x-full skew-x-12"></span>
                <span className="relative flex items-center justify-center">
                    {loading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Memproses...
                        </>
                    ) : (
                        <>
                            <FiLogIn className="mr-2 text-xl" />
                            Masuk Dashboard
                        </>
                    )}
                </span>
            </button>
          </form>
        </div>

        <div className="text-center mt-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Link 
                to="/" 
                className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors group py-2 px-4 rounded-lg hover:bg-white/5"
            >
                <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
                Kembali ke Layar Kiosk
            </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
