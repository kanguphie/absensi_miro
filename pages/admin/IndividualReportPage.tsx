
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useSettings } from '../../contexts/SettingsContext';
import { AttendanceStatus, Student } from '../../types';
import { FiPrinter, FiDownload, FiUser, FiCalendar, FiList, FiSearch } from 'react-icons/fi';
import * as XLSX from 'xlsx';

const toLocalISOString = (date: Date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzoffset).toISOString().slice(0, 10);
    return localISOTime;
}

interface DayReportRow {
    date: number;
    dateString: string;
    dayName: string;
    inTime: string;
    outTime: string;
    status: string;
    isHoliday: boolean;
    isWeekend: boolean;
}

const IndividualReportPage: React.FC = () => {
    const { students, classes, attendanceLogs } = useData();
    const { settings } = useSettings();
    
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');

    // Reset selected student when class changes
    useEffect(() => {
        setSelectedStudentId('');
    }, [selectedClassId]);

    // Filter students based on class
    const availableStudents = useMemo(() => {
        if (!selectedClassId) return [];
        return students.filter(s => s.classId === selectedClassId).sort((a,b) => a.name.localeCompare(b.name));
    }, [students, selectedClassId]);

    // Selected Student Object
    const selectedStudent = useMemo(() => {
        return students.find(s => s.id === selectedStudentId);
    }, [students, selectedStudentId]);

    // Generate Report Data
    const reportData = useMemo(() => {
        if (!selectedStudent || !month) return null;

        const [year, monthNum] = month.split('-').map(Number);
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        
        const rows: DayReportRow[] = [];
        const stats = { H: 0, T: 0, S: 0, I: 0, A: 0, NC: 0, PC: 0 };

        const holidays = new Set(settings?.holidays || []);

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, monthNum - 1, day);
            const dateStr = toLocalISOString(date);
            
            // Format Day Name (e.g. "Senin")
            const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' });
            const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat

            // Check Holiday / Weekend
            const isHoliday = holidays.has(dateStr);
            let isWeekend = false;
            
            const dayGroup = (dayOfWeek >= 1 && dayOfWeek <= 4) ? 'mon-thu' : (dayOfWeek === 5) ? 'fri' : (dayOfWeek === 6) ? 'sat' : null;
            const opHours = settings?.operatingHours.find(h => h.dayGroup === dayGroup);
            
            if (!dayGroup || !opHours || !opHours.enabled) {
                isWeekend = true;
            }

            // Find Logs
            const logs = attendanceLogs.filter(l => 
                l.studentId === selectedStudentId && 
                toLocalISOString(new Date(l.timestamp)) === dateStr
            );

            const inLog = logs.find(l => l.type === 'in' || l.status === AttendanceStatus.SICK || l.status === AttendanceStatus.PERMIT);
            const outLog = logs.find(l => l.type === 'out'); // Can be normal OUT or NO_CHECKOUT

            let status = '-';
            let inTime = '-';
            let outTime = '-';

            if (inLog) {
                if (inLog.type === 'in') {
                    inTime = new Date(inLog.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                }
                // If status is Sick/Permit, the log type might be 'in' but represent S/I
                if (inLog.status === AttendanceStatus.SICK) { status = 'Sakit'; stats.S++; }
                else if (inLog.status === AttendanceStatus.PERMIT) { status = 'Izin'; stats.I++; }
                else if (inLog.status === AttendanceStatus.ABSENT) { status = 'Alfa'; stats.A++; }
                else {
                    // Present or Late
                    if (inLog.status === AttendanceStatus.LATE) {
                         status = 'Terlambat'; stats.T++; 
                    } else {
                         status = 'Hadir'; stats.H++;
                    }
                }
            }

            if (outLog) {
                if (outLog.status === AttendanceStatus.NO_CHECKOUT) {
                    status = 'Tidak Scan Pulang';
                    stats.NC++;
                    outTime = '-'; // No time for no checkout
                } else {
                    outTime = new Date(outLog.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    if (outLog.status === AttendanceStatus.LEAVE_EARLY) {
                        // If user was present but left early, we might want to flag it
                        status += ' (Plg Cepat)';
                    }
                }
            }

            // Determine Alfa logic: School day, not holiday, no IN log
            if (!inLog && !isHoliday && !isWeekend && new Date() > date) {
                status = 'Alfa';
                stats.A++;
            }
            
            if (isHoliday) status = 'Libur Nasional';
            if (isWeekend) status = 'Libur Akhir Pekan';

            rows.push({
                date: day,
                dateString: dateStr,
                dayName,
                inTime,
                outTime,
                status,
                isHoliday,
                isWeekend
            });
        }

        return { rows, stats, period: `${new Date(year, monthNum - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}` };

    }, [selectedStudentId, month, attendanceLogs, settings]);

    const handlePrint = () => {
        if (!reportData || !selectedStudent) return;
        
        const className = classes.find(c => c.id === selectedStudent.classId)?.name;
        const { rows, stats, period } = reportData;

        let htmlContent = `
            <!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Laporan Individu - ${selectedStudent.name}</title><style>body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; margin: 0; font-size: 10pt; color: #333; } .page-container { padding: 1.5cm; } .header { display: flex; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; } .header img { height: 60px; width: 60px; object-fit: contain; margin-right: 20px; } .header-text { flex-grow: 1; } .header-text h1 { margin: 0; font-size: 16pt; font-weight: 600; } .header-text h2 { margin: 0; font-size: 11pt; font-weight: 400; color: #555; } .biodata-table { width: 100%; margin-bottom: 20px; border: none; } .biodata-table td { padding: 4px; border: none; font-size: 10pt; } .main-table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 20px; } .main-table th, .main-table td { border: 1px solid #ccc; padding: 6px; text-align: center; } .main-table th { background-color: #f2f2f2; } .text-left { text-align: left !important; } .bg-red { background-color: #fee2e2; } .bg-gray { background-color: #f3f4f6; } .summary-box { display: flex; justify-content: space-between; border: 1px solid #ccc; padding: 10px; margin-bottom: 30px; background: #f9f9f9; } .summary-item { text-align: center; } .summary-val { font-weight: bold; font-size: 12pt; } .footer { display: flex; justify-content: space-between; margin-top: 50px; } .signature { text-align: center; width: 200px; } .signature p { margin: 5px 0; } .line { border-bottom: 1px solid black; width: 100%; margin-top: 50px; } @media print { @page { size: A4 portrait; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }</style></head><body>
            <div class="page-container">
                <div class="header">
                    ${settings?.schoolLogoUrl ? `<img src="${settings.schoolLogoUrl}" alt="Logo">` : ''}
                    <div class="header-text">
                        <h1>Laporan Absensi Individu</h1>
                        <h2>${settings?.schoolName || 'Sistem Absensi Sekolah'}</h2>
                    </div>
                </div>
                
                <table class="biodata-table">
                    <tr><td width="100"><strong>Nama</strong></td><td width="10">:</td><td>${selectedStudent.name}</td><td width="100"><strong>Periode</strong></td><td width="10">:</td><td>${period}</td></tr>
                    <tr><td><strong>NIS</strong></td><td>:</td><td>${selectedStudent.nis}</td><td><strong>Kelas</strong></td><td>:</td><td>${className}</td></tr>
                </table>

                <table class="main-table">
                    <thead>
                        <tr>
                            <th width="120">Tanggal</th>
                            <th width="80">Hari</th>
                            <th width="100">scan Jam Masuk</th>
                            <th width="100">scan Jam Pulang</th>
                            <th>Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map((row, i) => `
                            <tr class="${row.isHoliday || row.isWeekend ? 'bg-red' : ''}">
                                <td>${new Date(row.dateString).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}</td>
                                <td>${row.dayName}</td>
                                <td>${row.inTime}</td>
                                <td>${row.outTime}</td>
                                <td class="text-left">${row.status}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="summary-box">
                    <div class="summary-item"><div class="summary-val">${stats.H}</div><div>Hadir</div></div>
                    <div class="summary-item"><div class="summary-val">${stats.T}</div><div>Terlambat</div></div>
                    <div class="summary-item"><div class="summary-val">${stats.S}</div><div>Sakit</div></div>
                    <div class="summary-item"><div class="summary-val">${stats.I}</div><div>Izin</div></div>
                    <div class="summary-item"><div class="summary-val">${stats.A}</div><div>Alfa</div></div>
                    <div class="summary-item"><div class="summary-val" style="color: #c2410c;">${stats.NC}</div><div>Tdk Scan Plg</div></div>
                </div>

                <div class="footer">
                    <div class="signature">
                        <p>Mengetahui,</p>
                        <p>Orang Tua / Wali</p>
                        <div class="line"></div>
                    </div>
                    <div class="signature">
                        <p>Rowosari, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric'})}</p>
                        <p>Kepala Madrasah</p>
                        <div class="line"></div>
                    </div>
                </div>
            </div>
            </body></html>
        `;
        
        const printWindow = window.open('', '_blank');
        if (printWindow) { printWindow.document.write(htmlContent); printWindow.document.close(); setTimeout(() => { printWindow.print(); }, 250); }
    };

    const handleExport = () => {
        if (!reportData || !selectedStudent) return;
        
        const className = classes.find(c => c.id === selectedStudent.classId)?.name;
        const { rows, stats, period } = reportData;

        const exportData = rows.map((row, index) => ({
            "Tanggal": new Date(row.dateString).toLocaleDateString('id-ID'),
            "Hari": row.dayName,
            "scan Jam Masuk": row.inTime,
            "scan Jam Pulang": row.outTime,
            "Keterangan": row.status
        }));

        // Add Summary Rows
        exportData.push({} as any); // Spacer
        exportData.push({ "Tanggal": "REKAP", "Hari": "", "scan Jam Masuk": "", "scan Jam Pulang": "", "Keterangan": "" } as any);
        exportData.push({ "Tanggal": "Hadir", "Hari": stats.H, "scan Jam Masuk": "", "scan Jam Pulang": "", "Keterangan": "" } as any);
        exportData.push({ "Tanggal": "Terlambat", "Hari": stats.T, "scan Jam Masuk": "", "scan Jam Pulang": "", "Keterangan": "" } as any);
        exportData.push({ "Tanggal": "Sakit", "Hari": stats.S, "scan Jam Masuk": "", "scan Jam Pulang": "", "Keterangan": "" } as any);
        exportData.push({ "Tanggal": "Izin", "Hari": stats.I, "scan Jam Masuk": "", "scan Jam Pulang": "", "Keterangan": "" } as any);
        exportData.push({ "Tanggal": "Alfa", "Hari": stats.A, "scan Jam Masuk": "", "scan Jam Pulang": "", "Keterangan": "" } as any);
        exportData.push({ "Tanggal": "Tidak Scan Pulang", "Hari": stats.NC, "scan Jam Masuk": "", "scan Jam Pulang": "", "Keterangan": "" } as any);

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Individu");
        
        // Adjust widths
        worksheet['!cols'] = [{wch: 15}, {wch: 10}, {wch: 15}, {wch: 15}, {wch: 25}];

        XLSX.writeFile(workbook, `Laporan_Individu_${selectedStudent.name}_${month}.xlsx`);
    };

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Laporan Individu Siswa</h1>

            {/* Filter Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-6 no-print">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Bulan</label>
                        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Kelas</label>
                        <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="w-full py-2.5 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">-- Pilih Kelas --</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Siswa</label>
                        <select 
                            value={selectedStudentId} 
                            onChange={e => setSelectedStudentId(e.target.value)} 
                            className="w-full py-2.5 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={!selectedClassId}
                        >
                            <option value="">-- Pilih Siswa --</option>
                            {availableStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Report Content */}
            {!selectedStudent || !reportData ? (
                 <div className="text-center py-10 bg-white rounded-lg shadow-sm border border-slate-200">
                    <FiUser className="mx-auto text-5xl text-slate-300" />
                    <p className="mt-4 text-slate-500">Silakan pilih Kelas dan Siswa untuk menampilkan laporan.</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div className="flex items-center">
                             <img src={selectedStudent.photoUrl} alt={selectedStudent.name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 mr-4" />
                             <div>
                                 <h2 className="text-2xl font-bold text-slate-800">{selectedStudent.name}</h2>
                                 <p className="text-slate-600 text-sm">NIS: {selectedStudent.nis} | Kelas: {classes.find(c => c.id === selectedStudent.classId)?.name}</p>
                                 <p className="text-slate-500 text-xs mt-1 font-medium bg-slate-100 px-2 py-0.5 rounded inline-block">Periode: {reportData.period}</p>
                             </div>
                        </div>
                        <div className="flex space-x-2">
                             <button onClick={handlePrint} className="bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-slate-800 flex items-center transition-colors"><FiPrinter className="mr-2"/>Cetak</button>
                             <button onClick={handleExport} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center transition-colors"><FiDownload className="mr-2"/>Excel</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6 text-center">
                        <div className="bg-green-50 p-2 rounded border border-green-100"><div className="text-xl font-bold text-green-700">{reportData.stats.H}</div><div className="text-xs text-green-600">Hadir</div></div>
                        <div className="bg-yellow-50 p-2 rounded border border-yellow-100"><div className="text-xl font-bold text-yellow-700">{reportData.stats.T}</div><div className="text-xs text-yellow-600">Terlambat</div></div>
                        <div className="bg-blue-50 p-2 rounded border border-blue-100"><div className="text-xl font-bold text-blue-700">{reportData.stats.S}</div><div className="text-xs text-blue-600">Sakit</div></div>
                        <div className="bg-indigo-50 p-2 rounded border border-indigo-100"><div className="text-xl font-bold text-indigo-700">{reportData.stats.I}</div><div className="text-xs text-indigo-600">Izin</div></div>
                        <div className="bg-red-50 p-2 rounded border border-red-100"><div className="text-xl font-bold text-red-700">{reportData.stats.A}</div><div className="text-xs text-red-600">Alfa</div></div>
                        <div className="bg-orange-50 p-2 rounded border border-orange-100"><div className="text-xl font-bold text-orange-700">{reportData.stats.NC}</div><div className="text-xs text-orange-600">No Scan Plg</div></div>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 w-16 text-center">Tanggal</th>
                                    <th className="px-4 py-3 w-32">Hari</th>
                                    <th className="px-4 py-3 text-center">scan Jam Masuk</th>
                                    <th className="px-4 py-3 text-center">scan Jam Pulang</th>
                                    <th className="px-4 py-3">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {reportData.rows.map(row => (
                                    <tr key={row.date} className={row.isHoliday || row.isWeekend ? 'bg-slate-50' : 'hover:bg-indigo-50/30'}>
                                        <td className="px-4 py-3 text-center font-mono text-slate-500">{row.date}</td>
                                        <td className="px-4 py-3 font-medium text-slate-700">{row.dayName}</td>
                                        <td className={`px-4 py-3 text-center font-mono ${row.status === 'Terlambat' ? 'text-yellow-600 font-bold' : ''}`}>{row.inTime}</td>
                                        <td className="px-4 py-3 text-center font-mono">{row.outTime}</td>
                                        <td className="px-4 py-3">
                                            <span className={`
                                                px-2 py-1 rounded text-xs font-semibold
                                                ${row.status === 'Hadir' ? 'bg-green-100 text-green-700' : ''}
                                                ${row.status === 'Terlambat' ? 'bg-yellow-100 text-yellow-700' : ''}
                                                ${row.status === 'Sakit' ? 'bg-blue-100 text-blue-700' : ''}
                                                ${row.status === 'Izin' ? 'bg-indigo-100 text-indigo-700' : ''}
                                                ${row.status === 'Alfa' ? 'bg-red-100 text-red-700' : ''}
                                                ${row.status === 'Tidak Scan Pulang' ? 'bg-orange-100 text-orange-700' : ''}
                                                ${row.status.includes('Libur') ? 'bg-slate-200 text-slate-500' : ''}
                                            `}>
                                                {row.status}
                                            </span>
                                        </td>
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

export default IndividualReportPage;
