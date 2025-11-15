import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Student, AttendanceStatus } from '../../types';
import { FiCalendar, FiUserX, FiCheckSquare, FiFilter } from 'react-icons/fi';

declare const Swal: any;

const toLocalISOString = (date: Date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzoffset).toISOString().slice(0, 10);
    return localISOTime;
}

const AttendanceManagementPage: React.FC = () => {
    const { students, classes, attendanceLogs, markAttendance, loading } = useData();
    const [date, setDate] = useState(toLocalISOString(new Date()));
    const [classFilter, setClassFilter] = useState('');

    const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || 'N/A';

    const absentStudents = useMemo(() => {
        if (loading) return [];

        const studentsInClass = classFilter
            ? students.filter(student => student.classId === classFilter)
            : students;

        const logsForDay = attendanceLogs.filter(log => toLocalISOString(new Date(log.timestamp)) === date);
        const presentStudentIds = new Set(logsForDay.map(log => log.studentId));
        
        return studentsInClass.filter(student => !presentStudentIds.has(student.id));
    }, [date, students, attendanceLogs, loading, classFilter]);

    const handleMarkStatus = (student: Student, status: AttendanceStatus) => {
        Swal.fire({
            title: 'Konfirmasi Perubahan',
            html: `Anda akan menandai <strong>${student.name}</strong> sebagai <strong>${status}</strong> untuk tanggal ${new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}. Lanjutkan?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ya, Lanjutkan',
            cancelButtonText: 'Batal'
        }).then((result: { isConfirmed: boolean }) => {
            if (result.isConfirmed) {
                markAttendance(student.id, status, date);
            }
        });
    };

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Manajemen Absensi Manual</h1>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-4">
                        <FiCalendar className="text-2xl text-slate-500" />
                        <div>
                            <label htmlFor="attendance-date" className="block text-sm font-medium text-slate-700 mb-1">Pilih Tanggal</label>
                            <input
                                id="attendance-date"
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                     <div className="flex items-center gap-4">
                        <FiFilter className="text-2xl text-slate-500" />
                        <div>
                            <label htmlFor="class-filter" className="block text-sm font-medium text-slate-700 mb-1">Filter Kelas</label>
                            <select
                                id="class-filter"
                                value={classFilter}
                                onChange={e => setClassFilter(e.target.value)}
                                className="w-full md:w-64 py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Semua Kelas</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">Siswa Belum Hadir</h2>
                    <p className="text-slate-500 text-sm mt-1">
                        Ditemukan {absentStudents.length} siswa yang belum memiliki catatan kehadiran pada tanggal {new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.
                    </p>
                </div>
                {loading ? (
                    <div className="text-center p-8 text-slate-500">Memuat data siswa...</div>
                ) : absentStudents.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="p-4 font-semibold text-slate-600">Siswa</th>
                                    <th className="p-4 font-semibold text-slate-600">Kelas</th>
                                    <th className="p-4 font-semibold text-slate-600 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {absentStudents.map(student => (
                                    <tr key={student.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                                        <td className="p-4">
                                            <div className="flex items-center space-x-3">
                                                <img src={student.photoUrl} alt={student.name} className="w-10 h-10 rounded-full object-cover" />
                                                <div>
                                                    <p className="font-medium text-slate-800">{student.name}</p>
                                                    <p className="text-slate-500 text-xs">NIS: {student.nis}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-700">{getClassName(student.classId)}</td>
                                        <td className="p-4">
                                            <div className="flex justify-center items-center space-x-2">
                                                <button onClick={() => handleMarkStatus(student, AttendanceStatus.SICK)} className="bg-blue-100 text-blue-700 font-semibold py-1 px-3 rounded-md hover:bg-blue-200 transition-colors text-xs">Sakit</button>
                                                <button onClick={() => handleMarkStatus(student, AttendanceStatus.PERMIT)} className="bg-indigo-100 text-indigo-700 font-semibold py-1 px-3 rounded-md hover:bg-indigo-200 transition-colors text-xs">Izin</button>
                                                <button onClick={() => handleMarkStatus(student, AttendanceStatus.ABSENT)} className="bg-red-100 text-red-700 font-semibold py-1 px-3 rounded-md hover:bg-red-200 transition-colors text-xs">Alfa</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center p-12">
                        <FiCheckSquare className="mx-auto text-5xl text-green-400" />
                        <h3 className="mt-4 text-lg font-semibold text-slate-700">Semua Siswa Hadir</h3>
                        <p className="text-slate-500 mt-1">Tidak ada siswa yang absen pada tanggal yang dipilih.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceManagementPage;