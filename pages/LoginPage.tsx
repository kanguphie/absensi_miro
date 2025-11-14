import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiLogIn, FiUser, FiLock, FiEye, FiEyeOff, FiHome } from 'react-icons/fi';

declare const Swal: any;

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) {
      navigate('/admin');
      Swal.fire({
        icon: 'success',
        title: 'Login berhasil!',
        showConfirmButton: false,
        timer: 1500
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Username atau password salah.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Kementerian_Agama_new_logo.png/535px-Kementerian_Agama_new_logo.png" alt="School Logo" className="w-20 h-20 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-800">Admin Login</h1>
            <p className="text-slate-500 mt-2">Sistem Absensi RFID</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
                <FiUser className="absolute top-1/2 -translate-y-1/2 left-4 text-slate-400" />
                <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                required
                />
            </div>
            <div className="relative">
                <FiLock className="absolute top-1/2 -translate-y-1/2 left-4 text-slate-400" />
                <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                required
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 -translate-y-1/2 right-4 text-slate-400 hover:text-slate-600"
                >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
            </div>
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 ease-in-out flex items-center justify-center disabled:bg-indigo-400"
            >
                {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                <>
                    <FiLogIn className="mr-2" />
                    Login
                </>
                )}
            </button>
            </form>
        </div>
        <div className="text-center mt-6">
            <Link to="/" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors flex items-center justify-center">
                <FiHome className="mr-2" />
                Kembali ke Beranda
            </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;