import React, { useState } from 'react';
import { FiPrinter, FiDownload, FiCheck, FiX, FiClock, FiHelpCircle, FiActivity } from 'react-icons/fi';
import { useData } from '../../contexts/DataContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Student, AttendanceStatus } from '../../types';
import * as XLSX from 'xlsx';

declare const Swal: any;

// Type definitions specific to this report
type StatusKey = 'H' | 'T' | 'S' | 'I' | 'A';

interface StudentReportRow {
  student: Student;
  summary: Record<StatusKey, number>;
}

interface GeneratedReport {
  studentData: StudentReportRow[];
  overallSummary: { Hadir: number; Terlambat: number; Sakit: number; Izin: number; Alfa: number; };
  period: string;
}

// Helper functions for date manipulation
const toLocalISOString = (date: Date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzoffset).toISOString().slice(0, 10);
    return localISOTime;
}

const getDatesInRange = (start: Date, end: Date): Date[] => {
    const dates = [];
    let currentDate = new Date(start);
    currentDate.setHours(0, 0, 0, 0);
    const finalDate = new Date(end);
    finalDate.setHours(0, 0, 0, 0);

    while (currentDate <= finalDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
};

// Status mapping from existing report pages
const statusMap: { [key in AttendanceStatus]: { key: StatusKey, text: string, color: string, bgColor: string, icon: React.ReactElement } } = {
  [AttendanceStatus.PRESENT]: { key: 'H', text: 'Hadir', color: 'text-green-700', bgColor: 'bg-green-100', icon: <FiCheck/> },
  [AttendanceStatus.LATE]: { key: 'T', text: 'Terlambat', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: <FiClock/> },
  [AttendanceStatus.SICK]: { key: 'S', text: 'Sakit', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: <FiHelpCircle/> },
  [AttendanceStatus.PERMIT]: { key: 'I', text: 'Izin', color: 'text-indigo-700', bgColor: 'bg-indigo-100', icon: <FiHelpCircle/> },
  [AttendanceStatus.ABSENT]: { key: 'A', text: 'Alfa', color: 'text-red-700', bgColor: 'bg-red-100', icon: <FiX/> },
  [AttendanceStatus.LEAVE_EARLY]: { key: 'H', text: 'Hadir', color: 'text-green-700', bgColor: 'bg-green-100', icon: <FiCheck/> },
};

// SummaryCard component from existing report pages
const SummaryCard: React.FC<{ title: string; value: number; color: string; }> = ({ title, value, color }) => (
    <div className={`bg-white p-4 rounded-lg shadow-sm border border-slate-200 border-t-4 ${color}`}>
        <p className="text-3xl font-bold text-slate-800">{value}</p>
        <p className="text-sm font-medium text-slate-500 mt-1">{title}</p>
    </div>
);

// Main Component
const PeriodicReportsPage: React.FC = () => {
    const { students, classes, attendanceLogs } = useData();
    const { settings } = useSettings();
    
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [startDate, setStartDate] = useState(toLocalISOString(firstDayOfMonth));
    const [endDate, setEndDate] = useState(toLocalISOString(today));
    const [classFilter, setClassFilter] = useState('');
    const [reportData, setReportData] = useState<GeneratedReport | null>(null);

    const handleGenerateReport = () => {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            Swal.fire('Error', "Tanggal mulai tidak boleh setelah tanggal selesai.", 'error');
            return;
        }

        const datesInRange = getDatesInRange(start, end);
        const periodString = start.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) + ' - ' + end.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

        const filteredStudents = students.filter(s => !classFilter || s.classId === classFilter);
        const logsInRange = attendanceLogs.filter(log => {
            const logDate = new Date(log.timestamp);
            return logDate >= start && logDate <= new Date(end.getTime() + 24 * 60 * 60 * 1000 - 1);
        });

        const holidays = new Set(settings?.holidays || []);
        
        const studentData: StudentReportRow[] = filteredStudents.map(student => {
            const summary: Record<StatusKey, number> = { H: 0, T: 0, S: 0, I: 0, A: 0 };
            
            datesInRange.forEach(date => {
                const dateStr = toLocalISOString(date);
                
                const dayLogs = logsInRange.filter(log => log.studentId === student.id && toLocalISOString(new Date(log.timestamp)) === dateStr);
                const checkInLog = dayLogs.find(l => l.type === 'in');
                
                if (checkInLog) {
                    const statusInfo = statusMap[checkInLog.status];
                    if (summary[statusInfo.key] !== undefined) { summary[statusInfo.key]++; }
                } else {
                    if (holidays.has(dateStr)) return; // Skip holidays

                    const dayOfWeek = date.getDay();
                    const dayGroup = (dayOfWeek >= 1 && dayOfWeek <= 4) ? 'mon-thu' : (dayOfWeek === 5) ? 'fri' : (dayOfWeek === 6) ? 'sat' : null;
                    const opHours = settings?.operatingHours.find(h => h.dayGroup === dayGroup);

                    if (dayOfWeek !== 0 && opHours && opHours.enabled) {
                        summary['A']++;
                    }
                }
            });
            return { student, summary };
        });

        const overallSummary = studentData.reduce((acc, row) => {
            acc.Hadir += row.summary.H; acc.Terlambat += row.summary.T; acc.Sakit += row.summary.S;
            acc.Izin += row.summary.I; acc.Alfa += row.summary.A; return acc;
        }, { Hadir: 0, Terlambat: 0, Sakit: 0, Izin: 0, Alfa: 0 });

        setReportData({ studentData, overallSummary, period: periodString });
    };

    const handlePrint = () => {
        if (!reportData) return;
        const { studentData, period } = reportData;
        const className = classFilter ? classes.find(c => c.id === classFilter)?.name : 'Semua Kelas';
        let htmlContent = `
            <!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Laporan Rekap Absensi - ${period}</title><style>body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; margin: 0; font-size: 10pt; background-color: #fff; color: #333; } .page-container { padding: 1.5cm; } .header { display: flex; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; } .header img { height: 60px; width: 60px; object-fit: contain; margin-right: 20px; } .header-text { flex-grow: 1; } .header-text h1 { margin: 0; font-size: 18pt; font-weight: 600; } .header-text h2 { margin: 0; font-size: 12pt; font-weight: 400; color: #555; } .report-info { text-align: right; font-size: 10pt; } table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 20px; } th, td { border: 1px solid #ddd; padding: 8px; text-align: center; vertical-align: middle; } thead th { background-color: #f2f2f2; color: #333; font-weight: 600; } .col-student { text-align: left; white-space: nowrap; width: 40%; } .col-nis { white-space: nowrap; font-family: 'Courier New', Courier, monospace; width: 15%; } tbody tr:nth-child(even) { background-color: #f9f9f9; } .summary-col { font-weight: bold; } .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 8pt; color: #777; display: flex; justify-content: space-between; } .signature-block { margin-top: 50px; text-align: right; } .signature-block .location-date { margin-bottom: 5px; } .signature-block .role { margin-bottom: 60px; } .signature-block .name { font-weight: bold; text-decoration: underline; } @media print { @page { size: A4 portrait; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }</style></head><body><div class="page-container"><div class="header">${settings?.schoolLogoUrl ? `<img src="${settings.schoolLogoUrl}" alt="Logo">` : ''}<div class="header-text"><h1>Laporan Rekapitulasi Absensi</h1><h2>${settings?.schoolName || 'Sistem Absensi RFID'}</h2></div><div class="report-info"><strong>Periode:</strong><br>${period}<br><strong>Kelas:</strong> ${className}</div></div><table><thead><tr><th class="col-student">NAMA SISWA</th><th class="col-nis">NIS</th><th class="summary-col">Hadir</th> <th class="summary-col">Terlambat</th><th class="summary-col">Sakit</th> <th class="summary-col">Izin</th><th class="summary-col">Alfa</th></tr></thead><tbody>${studentData.map(row => `<tr><td class="col-student">${row.student.name}</td><td class="col-nis">${row.student.nis}</td><td>${row.summary.H || 0}</td><td>${row.summary.T || 0}</td><td>${row.summary.S || 0}</td><td>${row.summary.I || 0}</td><td>${row.summary.A || 0}</td></tr>`).join('')}</tbody></table><div class="signature-block"><p class="location-date">Rowosari, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p><p class="role">Kepala Sekolah,</p><p class="name">_________________________</p></div><div class="footer"><span>Dicetak pada: ${new Date().toLocaleString('id-ID')}</span><span>Laporan ini dibuat oleh Sistem Absensi RFID</span></div></div></body></html>`;
        const printWindow = window.open('', '_blank');
        if (printWindow) { printWindow.document.open(); printWindow.document.write(htmlContent); printWindow.document.close(); setTimeout(() => { printWindow.print(); }, 250); } else { alert('Gagal membuka tab baru. Mohon izinkan pop-up untuk situs ini.'); }
    };

    const handleExport = () => {
        if (!reportData) return;

        const { studentData, period } = reportData;
        const className = classFilter ? classes.find(c => c.id === classFilter)?.name : 'Semua Kelas';

        const jsonData = studentData.map(row => ({
            "Nama Siswa": row.student.name,
            "NIS": row.student.nis,
            "Hadir": row.summary.H,
            "Terlambat": row.summary.T,
            "Sakit": row.summary.S,
            "Izin": row.summary.I,
            "Alfa": row.summary.A,
        }));
        
        const title = `Laporan Rekapitulasi Absensi Periodik - ${className}`;
        const periodInfo = `Periode: ${period}`;

        const worksheet = XLSX.utils.json_to_sheet(jsonData, { origin: 'A4' });
        
        XLSX.utils.sheet_add_aoa(worksheet, [[title], [periodInfo], []], { origin: 'A1' });
        
        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }
        ];

        worksheet['!cols'] = [
            { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 10 },
            { wch: 10 }, { wch: 10 }, { wch: 10 },
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap Absensi`);
        
        const fileName = `rekap_absensi_${startDate}_sd_${endDate}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    }

  return (
    <div className="animate-fade-in">
        <h1 className="text-3xl font-bold text-slate-800 mb-6">Laporan Periodik</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-6 no-print">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Mulai</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
             <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Selesai</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kelas</label>
                <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-full py-2.5 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Semua Kelas</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            <button onClick={handleGenerateReport} className="bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-700 h-11 transition-colors">
                Tampilkan Laporan
            </button>
        </div>
      </div>
      
      {!reportData ? (
        <div className="text-center py-10 bg-white rounded-lg shadow-sm border border-slate-200">
            <FiActivity className="mx-auto text-5xl text-slate-300" />
            <p className="mt-4 text-slate-500">Silakan pilih rentang tanggal dan kelas, lalu klik "Tampilkan Laporan".</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 printable-area">
            <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Rekapitulasi Absensi Periodik</h2>
                  <p className="text-slate-600">Periode: {reportData.period}</p>
                </div>
                <div className="flex space-x-2 no-print">
                    <button onClick={handlePrint} className="bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-slate-800 flex items-center transition-colors"><FiPrinter className="mr-2"/>Cetak</button>
                    <button onClick={handleExport} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center transition-colors"><FiDownload className="mr-2"/>Excel</button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <SummaryCard title="Total Hadir" value={reportData.overallSummary.Hadir} color="border-green-400" />
                <SummaryCard title="Total Terlambat" value={reportData.overallSummary.Terlambat} color="border-yellow-400" />
                <SummaryCard title="Total Sakit" value={reportData.overallSummary.Sakit} color="border-blue-400" />
                <SummaryCard title="Total Izin" value={reportData.overallSummary.Izin} color="border-indigo-400" />
                <SummaryCard title="Total Alfa" value={reportData.overallSummary.Alfa} color="border-red-400" />
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-slate-200">
                    <thead className="bg-slate-100">
                        <tr>
                            <th className="p-3 border border-slate-200 font-semibold text-slate-600 text-left">NAMA SISWA</th>
                            <th className="p-3 border border-slate-200 font-semibold text-slate-600 text-left">NIS</th>
                            <th className="p-3 border border-slate-200 text-center font-semibold text-green-600 bg-green-50">Hadir</th>
                            <th className="p-3 border border-slate-200 text-center font-semibold text-yellow-600 bg-yellow-50">Terlambat</th>
                            <th className="p-3 border border-slate-200 text-center font-semibold text-blue-600 bg-blue-50">Sakit</th>
                            <th className="p-3 border border-slate-200 text-center font-semibold text-indigo-600 bg-indigo-50">Izin</th>
                            <th className="p-3 border border-slate-200 text-center font-semibold text-red-600 bg-red-50">Alfa</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.studentData.map(row => (
                            <tr key={row.student.id} className="hover:bg-slate-50">
                                <td className="p-2 border border-slate-200 font-medium text-slate-800 text-left">{row.student.name}</td>
                                <td className="p-2 border border-slate-200 text-slate-600 text-left">{row.student.nis}</td>
                                <td className="p-2 border border-slate-200 text-center font-bold">{row.summary.H || 0}</td>
                                <td className="p-2 border border-slate-200 text-center font-bold">{row.summary.T || 0}</td>
                                <td className="p-2 border border-slate-200 text-center font-bold">{row.summary.S || 0}</td>
                                <td className="p-2 border border-slate-200 text-center font-bold">{row.summary.I || 0}</td>
                                <td className="p-2 border border-slate-200 text-center font-bold">{row.summary.A || 0}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
};

export default PeriodicReportsPage;