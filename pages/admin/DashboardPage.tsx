import React, { useMemo } from 'react';
import { FiUsers, FiClock, FiAlertTriangle, FiUserCheck, FiTrendingUp } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useData } from '../../contexts/DataContext';
import { AttendanceLog, AttendanceStatus } from '../../types';

const StatCard: React.FC<{ icon: React.ReactElement; title: string; value: string | number; gradientColor: string; }> = ({ icon, title, value, gradientColor }) => (
  <div className={`relative overflow-hidden text-white p-5 rounded-xl shadow-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-2xl ${gradientColor}`}>
    <div className="absolute -right-4 -top-4 text-white/20">
      {React.cloneElement(icon, { size: 80 })}
    </div>
    <p className="text-4xl font-bold">{value}</p>
    <p className="text-sm font-medium mt-1 tracking-wider">{title}</p>
  </div>
);


const DashboardPage: React.FC = () => {
    const { students, attendanceLogs } = useData();

    const todayStats = useMemo(() => {
        const today = new Date().toDateString();
        const todayLogs = attendanceLogs.filter(log => new Date(log.timestamp).toDateString() === today);
        
        const presentStudents = new Set(todayLogs.filter(log => log.type === 'in').map(log => log.studentId));
        const lateStudents = new Set(todayLogs.filter(log => log.status === AttendanceStatus.LATE).map(log => log.studentId));
        const absentCount = students.length - presentStudents.size;
        
        return {
            total: students.length,
            present: presentStudents.size,
            late: lateStudents.size,
            absent: absentCount
        };
    }, [students, attendanceLogs]);
    
    const chartData = useMemo(() => {
      const last7Days = Array.from({length: 7}, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d;
      }).reverse();

      return last7Days.map(date => {
          const dateString = date.toDateString();
          const logsForDay = attendanceLogs.filter(log => new Date(log.timestamp).toDateString() === dateString);
          const present = new Set(logsForDay.filter(log => log.type === 'in').map(log => log.studentId)).size;
          const late = new Set(logsForDay.filter(log => log.status === AttendanceStatus.LATE).map(log => log.studentId)).size;
          return {
              name: date.toLocaleDateString('id-ID', { weekday: 'short'}),
              Hadir: present - late,
              Terlambat: late,
          };
      });
  }, [attendanceLogs]);


  const recentLogs = attendanceLogs.slice(0, 5);

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard icon={<FiUsers />} title="Total Siswa" value={todayStats.total} gradientColor="bg-gradient-to-br from-indigo-500 to-blue-500" />
        <StatCard icon={<FiUserCheck />} title="Hadir Hari Ini" value={todayStats.present} gradientColor="bg-gradient-to-br from-green-500 to-emerald-500" />
        <StatCard icon={<FiClock />} title="Terlambat Hari Ini" value={todayStats.late} gradientColor="bg-gradient-to-br from-yellow-500 to-amber-500" />
        <StatCard icon={<FiAlertTriangle />} title="Belum Hadir" value={todayStats.absent} gradientColor="bg-gradient-to-br from-red-500 to-rose-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><FiTrendingUp className="mr-2" /> Tren Kehadiran</h2>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }} stackOffset="sign">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd' }} />
                    <Legend />
                    <Bar dataKey="Hadir" fill="#10b981" stackId="a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Terlambat" fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Aktivitas Terbaru</h2>
            <div className="space-y-4">
                {recentLogs.map(log => (
                    <div key={log.id} className="flex items-center p-2 rounded-md hover:bg-slate-50 transition-colors">
                        <img src={log.studentPhotoUrl} alt={log.studentName} className="w-10 h-10 rounded-full mr-4" />
                        <div>
                            <p className="font-semibold text-slate-700 text-sm">{log.studentName}</p>
                            <p className="text-xs text-slate-500">{log.className} - {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;