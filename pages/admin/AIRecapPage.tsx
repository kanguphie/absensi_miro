
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useData } from '../../contexts/DataContext';
import { useSettings } from '../../contexts/SettingsContext';
import { AttendanceStatus } from '../../types';
import { FiCpu, FiFileText, FiLoader, FiAlertTriangle } from 'react-icons/fi';

declare const Swal: any;

const toLocalISOString = (date: Date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzoffset).toISOString().slice(0, 10);
    return localISOTime;
}

const statusMap: { [key in AttendanceStatus]: { key: string } } = {
  [AttendanceStatus.PRESENT]: { key: 'Hadir' },
  [AttendanceStatus.LATE]: { key: 'Terlambat' },
  [AttendanceStatus.SICK]: { key: 'Sakit' },
  [AttendanceStatus.PERMIT]: { key: 'Izin' },
  [AttendanceStatus.ABSENT]: { key: 'Alfa' },
  [AttendanceStatus.LEAVE_EARLY]: { key: 'Hadir' }, // Counted as present
};

const AIRecapPage: React.FC = () => {
    const { students, classes, attendanceLogs } = useData();
    const { settings } = useSettings();
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [classFilter, setClassFilter] = useState('');
    const [recapResult, setRecapResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerateRecap = async () => {
        if (!classFilter) {
            Swal.fire('Info', 'Silakan pilih kelas terlebih dahulu.', 'info');
            return;
        }

        setIsLoading(true);
        setRecapResult('');
        setError('');

        try {
            const [year, monthNum] = month.split('-').map(Number);
            const startDate = new Date(year, monthNum - 1, 1);
            const endDate = new Date(year, monthNum, 0);

            const filteredStudents = students.filter(s => s.classId === classFilter);
            if (filteredStudents.length === 0) {
              throw new Error("Tidak ada siswa di kelas yang dipilih.");
            }

            // FIX: The AttendanceLog type does not have a 'classId'. Filter logs by checking
            // if the log's 'studentId' belongs to a student in the filtered class.
            const studentIdsInClass = new Set(filteredStudents.map(s => s.id));
            const logsInRange = attendanceLogs.filter(log => {
                const logDate = new Date(log.timestamp);
                return studentIdsInClass.has(log.studentId) && logDate >= startDate && logDate <= endDate;
            });
            
            const holidays = new Set(settings?.holidays || []);
            const workingDaysInMonth = Array.from({ length: endDate.getDate() }, (_, i) => i + 1)
              .map(day => new Date(year, monthNum - 1, day))
              .filter(date => {
                const dayOfWeek = date.getDay();
                if (dayOfWeek === 0 || holidays.has(toLocalISOString(date))) return false;
                
                const dayGroup = (dayOfWeek >= 1 && dayOfWeek <= 4) ? 'mon-thu' : (dayOfWeek === 5) ? 'fri' : (dayOfWeek === 6) ? 'sat' : null;
                const opHours = settings?.operatingHours.find(h => h.dayGroup === dayGroup);
                return opHours?.enabled ?? false;
              }).length;


            const studentSummary = filteredStudents.map(student => {
                const summary = { Hadir: 0, Terlambat: 0, Sakit: 0, Izin: 0, Alfa: 0 };
                const studentLogs = logsInRange.filter(log => log.studentId === student.id);
                const attendedDays = new Set(studentLogs.map(l => toLocalISOString(new Date(l.timestamp))));

                attendedDays.forEach(dateStr => {
                  const dayLogs = studentLogs.filter(l => toLocalISOString(new Date(l.timestamp)) === dateStr);
                  const checkInLog = dayLogs.find(l => l.type === 'in');
                  if(checkInLog) {
                    const statusKey = statusMap[checkInLog.status].key as keyof typeof summary;
                    if(summary[statusKey] !== undefined) summary[statusKey]++;
                  }
                });

                summary.Alfa = workingDaysInMonth - (summary.Hadir + summary.Terlambat + summary.Sakit + summary.Izin);
                return `- ${student.name}: Hadir: ${summary.Hadir}, Terlambat: ${summary.Terlambat}, Sakit: ${summary.Sakit}, Izin: ${summary.Izin}, Alfa: ${summary.Alfa}`;
            }).join('\n');
            
            const className = classes.find(c => c.id === classFilter)?.name || '';
            const period = new Date(year, monthNum - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric'});

            const prompt = `
Anda adalah asisten kepala sekolah yang ahli dalam analisis data absensi.
Tugas Anda adalah membuat rekapitulasi dan analisis absensi untuk kelas **${className}** selama bulan **${period}**. Total hari efektif belajar adalah ${workingDaysInMonth} hari.

Berikut adalah data absensi siswa:
${studentSummary}

Berdasarkan data di atas, buatlah laporan dalam format Markdown dengan struktur berikut (gunakan Bahasa Indonesia yang baik dan formal):

### Ringkasan Umum
Analisis singkat mengenai tingkat kehadiran, keterlambatan, dan absensi secara keseluruhan di kelas ini. Berikan persentase kehadiran rata-rata jika memungkinkan.

### Siswa Teladan (Kehadiran Terbaik)
Sebutkan nama-nama siswa yang tidak pernah Alfa atau Terlambat. Berikan apresiasi singkat. Jika tidak ada, sebutkan bahwa semua siswa perlu meningkatkan kedisiplinan.

### Perlu Perhatian Khusus
Identifikasi 3 siswa teratas (jika ada) dengan jumlah Alfa atau Terlambat tertinggi. Sebutkan nama dan jumlah ketidakhadirannya (Alfa + Terlambat).

### Analisis & Rekomendasi
Berikan analisis singkat mengenai kemungkinan pola absensi dan berikan 2-3 rekomendasi konkret dan praktis untuk wali kelas atau sekolah guna meningkatkan kedisiplinan dan kehadiran di kelas ini.
            `;
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt
            });

            setRecapResult(response.text);

        } catch (err: any) {
            console.error("Error generating AI recap:", err);
            setError(`Gagal menghasilkan rekapitulasi. Pastikan API Key valid dan coba lagi. Detail: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Rekapitulasi Absensi AI</h1>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Bulan</label>
                        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Kelas</label>
                        <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-full py-2.5 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="" disabled>-- Pilih Kelas --</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <button onClick={handleGenerateRecap} disabled={isLoading} className="bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-700 h-11 transition-colors flex items-center justify-center disabled:bg-indigo-400">
                        {isLoading ? <FiLoader className="animate-spin mr-2" /> : <FiCpu className="mr-2" />}
                        {isLoading ? 'Menganalisis...' : 'Buat Rekap AI'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 min-h-[300px]">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center h-full p-10">
                        <FiLoader className="text-4xl text-indigo-500 animate-spin" />
                        <p className="mt-4 text-slate-600 font-semibold">Gemini sedang menganalisis data...</p>
                        <p className="text-slate-500 text-sm">Proses ini mungkin memerlukan beberapa saat.</p>
                    </div>
                )}
                {error && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                        <FiAlertTriangle className="text-4xl text-red-500" />
                        <p className="mt-4 text-slate-700 font-semibold">Terjadi Kesalahan</p>
                        <p className="text-slate-500 text-sm max-w-md">{error}</p>
                    </div>
                )}
                {!isLoading && !error && recapResult && (
                    <div className="p-6 prose max-w-none">
                       <div 
                         className="whitespace-pre-wrap text-slate-700" 
                         dangerouslySetInnerHTML={{
                           __html: recapResult
                             .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-slate-700 mb-2 mt-4">$1</h3>')
                             .replace(/^\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                             .replace(/^\* (.*$)/gim, '<li class="ml-5 list-disc">$1</li>')
                         }}
                       />
                    </div>
                )}
                {!isLoading && !error && !recapResult && (
                     <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                        <FiFileText className="text-5xl text-slate-300" />
                        <p className="mt-4 text-slate-500">Hasil rekapitulasi AI akan ditampilkan di sini.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIRecapPage;
