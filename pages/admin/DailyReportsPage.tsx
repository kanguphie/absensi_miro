
import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Student, AttendanceStatus } from '../../types';
import { FiClipboard, FiPrinter, FiUserCheck, FiClock, FiAlertCircle, FiHelpCircle, FiList } from 'react-icons/fi';

interface DailyReportData {
  date: string;
  className: string;
  present: Student[];
  late: Student[];
  sick: Student[];
  permit: Student[];
  absent: Student[];
}

const toLocalISOString = (date: Date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzoffset).toISOString().slice(0, 10);
    return localISOTime;
}

const StudentListItem: React.FC<{ student: Student }> = ({ student }) => (
    <div className="flex items-center p-2 border-b border-slate-100 last:border-b-0">
        <img src={student.photoUrl} alt={student.name} className="w-10 h-10 rounded-full object-cover mr-3" />
        <div>
            <p className="font-semibold text-slate-800 text-sm">{student.name}</p>
            <p className="text-xs text-slate-500">NIS: {student.nis}</p>
        </div>
    </div>
);

const StatusCard: React.FC<{ title: string; students: Student[]; icon: React.ReactElement; color: string; }> = ({ title, students, icon, color }) => (
    <div className={`bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col border-t-4 ${color}`}>
        <div className="flex items-center p-4">
            {icon}
            <h3 className="font-semibold ml-3 text-slate-700">{title}</h3>
            <span className="ml-auto font-bold text-lg text-slate-800">{students.length}</span>
        </div>
        <div className="p-2 space-y-1 overflow-y-auto max-h-80 flex-1 bg-slate-50/50">
            {students.length > 0 ? (
                students.map(s => <StudentListItem key={s.id} student={s} />)
            ) : (
                <div className="flex items-center justify-center h-full">
                    <p className="text-center text-slate-500 py-4 text-sm">Tidak ada data</p>
                </div>
            )}
        </div>
    </div>
);


const DailyReportsPage: React.FC = () => {
  const { students, classes, attendanceLogs } = useData();
  const { settings } = useSettings();
  const [date, setDate] = useState(toLocalISOString(new Date()));
  const [classFilter, setClassFilter] = useState('');
  const [reportData, setReportData] = useState<DailyReportData | null>(null);

  const handleGenerateReport = () => {
    const selectedDate = new Date(date + 'T00:00:00');
    const selectedDateString = toLocalISOString(selectedDate).slice(0,10);

    const filteredStudents = students.filter(s => !classFilter || s.classId === classFilter);
    const filteredStudentIds = new Set(filteredStudents.map(s => s.id));

    const logsForDay = attendanceLogs.filter(log => {
        const logDateString = toLocalISOString(new Date(log.timestamp)).slice(0, 10);
        return logDateString === selectedDateString && filteredStudentIds.has(log.studentId);
    });

    const presentIds = new Set<string>();
    const lateIds = new Set<string>();
    const sickIds = new Set<string>();
    const permitIds = new Set<string>();

    logsForDay.forEach(log => {
      // Only count 'in' logs for status categorization to avoid double counting 'out' logs
      if (log.type === 'in') {
          if (log.status === AttendanceStatus.SICK) sickIds.add(log.studentId);
          else if (log.status === AttendanceStatus.PERMIT) permitIds.add(log.studentId);
          else if (log.status === AttendanceStatus.LATE) lateIds.add(log.studentId);
          else presentIds.add(log.studentId);
      }
    });

    const allAttendedIds = new Set([...presentIds, ...lateIds, ...sickIds, ...permitIds]);
    const findStudentsByIds = (ids: Set<string>) => Array.from(ids).map(id => students.find(s => s.id === id)).filter((s): s is Student => !!s);

    setReportData({
      date: selectedDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      className: classFilter ? classes.find(c => c.id === classFilter)?.name || 'Semua Kelas' : 'Semua Kelas',
      present: findStudentsByIds(presentIds), late: findStudentsByIds(lateIds),
      sick: findStudentsByIds(sickIds), permit: findStudentsByIds(permitIds),
      absent: filteredStudents.filter(s => !allAttendedIds.has(s.id)),
    });
  };

  // Calculate Class Recapitulation Table Data
  const classRecap = useMemo(() => {
      if (!reportData) return [];
      const selectedDateStr = date; // YYYY-MM-DD from state

      // Pre-filter logs for the day to optimize
      const dayLogs = attendanceLogs.filter(l => 
          toLocalISOString(new Date(l.timestamp)).startsWith(selectedDateStr) && 
          l.type === 'in'
      );

      const recap = classes.map(cls => {
          const classStudents = students.filter(s => s.classId === cls.id);
          let h = 0, s = 0, i = 0, a = 0;

          classStudents.forEach(student => {
              const log = dayLogs.find(l => l.studentId === student.id);
              if (log) {
                  if (log.status === AttendanceStatus.SICK) s++;
                  else if (log.status === AttendanceStatus.PERMIT) i++;
                  else if (log.status === AttendanceStatus.ABSENT) a++; // If explicitly marked as Alfa
                  else h++; // Present, Late, Leave Early -> All count as 'Hadir'
              } else {
                  a++; // No log -> Alfa
              }
          });

          return {
              id: cls.id,
              name: cls.name,
              h, s, i, a,
              total: classStudents.length
          };
      });

      // Sort by class name
      recap.sort((a, b) => a.name.localeCompare(b.name));
      return recap;
  }, [reportData, classes, students, attendanceLogs, date]);

  const recapTotals = useMemo(() => {
      return classRecap.reduce((acc, curr) => ({
          h: acc.h + curr.h,
          s: acc.s + curr.s,
          i: acc.i + curr.i,
          a: acc.a + curr.a,
          total: acc.total + curr.total
      }), { h: 0, s: 0, i: 0, a: 0, total: 0 });
  }, [classRecap]);
  
  const handlePrint = () => {
    if (!reportData) return;
    const { date, className, present, late, sick, permit, absent } = reportData;
    const { late: lateStudents, absent: absentStudents, sick: sickStudents, permit: permitStudents } = { late, absent, sick, permit };
    const studentGroupsToPrint = { late: lateStudents, absent: absentStudents, sick: sickStudents, permit: permitStudents };

    const groupDetails = { late: { title: "Terlambat", class: "status-late" }, absent: { title: "Belum Hadir / Alfa", class: "status-absent" }, sick: { title: "Sakit", class: "status-sick" }, permit: { title: "Izin", class: "status-permit" } };
    
    // Generate Recap Table HTML
    const recapRows = classRecap.map((row, index) => `
        <tr>
            <td>${index + 1}</td>
            <td style="text-align: left;">${row.name}</td>
            <td>${row.h}</td>
            <td>${row.a}</td>
            <td>${row.i}</td>
            <td>${row.s}</td>
            <td><strong>${row.total}</strong></td>
        </tr>
    `).join('');

    const recapTotalRow = `
        <tr style="background-color: #f0f0f0; font-weight: bold;">
            <td colspan="2" style="text-align: center;">JUMLAH TOTAL</td>
            <td>${recapTotals.h}</td>
            <td>${recapTotals.a}</td>
            <td>${recapTotals.i}</td>
            <td>${recapTotals.s}</td>
            <td>${recapTotals.total}</td>
        </tr>
    `;

    const printHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <title>Laporan Harian - ${date}</title>
        <style>
            body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; margin: 0; font-size: 10pt; background-color: #fff; color: #333; }
            .page-container { padding: 1.5cm; }
            .header { display: flex; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .header img { height: 60px; width: 60px; object-fit: contain; margin-right: 20px; }
            .header-text { flex-grow: 1; }
            .header-text h1 { margin: 0; font-size: 18pt; font-weight: 600; }
            .header-text h2 { margin: 0; font-size: 12pt; font-weight: 400; color: #555; }
            .report-info { text-align: right; font-size: 10pt; }
            
            .recap-section { margin-bottom: 30px; }
            .recap-section h3 { margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            table.recap-table { width: 100%; border-collapse: collapse; font-size: 9pt; text-align: center; }
            .recap-table th { background-color: #f2f2f2; padding: 8px; border: 1px solid #ccc; font-weight: bold; }
            .recap-table td { padding: 6px; border: 1px solid #ccc; }

            .summary-grid { display: flex; justify-content: space-around; text-align: center; margin: 25px 0; padding: 15px; background-color: #f9f9f9; border-radius: 8px; border: 1px solid #eee; }
            .summary-item .count { font-size: 20pt; font-weight: bold; }
            .summary-item .label { font-size: 9pt; color: #666; }
            
            .content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; page-break-before: auto; }
            .status-section { border: 1px solid #ddd; border-radius: 8px; page-break-inside: avoid; overflow: hidden; margin-bottom: 10px; }
            .status-section h3 { margin: 0; padding: 10px 15px; font-size: 11pt; border-bottom: 1px solid #ddd; }
            .status-late h3 { background-color: #fef3c7; border-left: 5px solid #f59e0b; }
            .status-absent h3 { background-color: #fee2e2; border-left: 5px solid #ef4444; }
            .status-sick h3 { background-color: #dbeafe; border-left: 5px solid #3b82f6; }
            .status-permit h3 { background-color: #e0e7ff; border-left: 5px solid #6366f1; }
            
            table.student-list { width: 100%; border-collapse: collapse; }
            .student-list th { text-align: left; padding: 8px 15px; background-color: #f7f7f7; font-weight: 600; }
            .student-list td { padding: 8px 15px; border-top: 1px solid #eee; }
            .student-list .nis { font-family: 'Courier New', Courier, monospace; color: #555; }
            .no-data { padding: 20px; text-align: center; color: #888; }
            
            .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 8pt; color: #777; text-align: center; }
            @media print { @page { size: A4 portrait; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
    </head>
    <body>
        <div class="page-container">
            <div class="header">
                ${settings?.schoolLogoUrl ? `<img src="${settings.schoolLogoUrl}" alt="Logo">` : ''}
                <div class="header-text">
                    <h1>Laporan Kehadiran Harian</h1>
                    <h2>${settings?.schoolName || 'Sistem Absensi RFID'}</h2>
                </div>
                <div class="report-info">
                    <strong>Tanggal:</strong><br>${date}<br>
                    <strong>Kelas:</strong> ${className}
                </div>
            </div>

            <div class="recap-section">
                <h3>Rekapitulasi Absensi Per Kelas</h3>
                <table class="recap-table">
                    <thead>
                        <tr>
                            <th style="width: 40px;">NO</th>
                            <th>KELAS</th>
                            <th>HADIR</th>
                            <th>TIDAK HADIR</th>
                            <th>IZIN</th>
                            <th>SAKIT</th>
                            <th>TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${recapRows}
                    </tbody>
                    <tfoot>
                        ${recapTotalRow}
                    </tfoot>
                </table>
            </div>

            <div class="summary-grid">
                <div class="summary-item"><div class="count">${present.length + late.length}</div><div class="label">Total Hadir</div></div>
                <div class="summary-item"><div class="count">${present.length}</div><div class="label">Tepat Waktu</div></div>
                <div class="summary-item"><div class="count">${late.length}</div><div class="label">Terlambat</div></div>
                <div class="summary-item"><div class="count">${absent.length}</div><div class="label">Belum Hadir</div></div>
                <div class="summary-item"><div class="count">${sick.length + permit.length}</div><div class="label">Izin/Sakit</div></div>
            </div>

            <div class="content-grid">
                ${Object.entries(studentGroupsToPrint).map(([status, studentList]) => { 
                    const detail = groupDetails[status as keyof typeof groupDetails]; 
                    return `
                        <div class="status-section ${detail.class}">
                            <h3>${detail.title} (${studentList.length})</h3>
                            ${studentList.length > 0 ? `
                                <table class="student-list">
                                    <thead><tr><th>Nama Siswa</th><th>NIS</th></tr></thead>
                                    <tbody>${studentList.map(s => `<tr><td>${s.name}</td><td class="nis">${s.nis}</td></tr>`).join('')}</tbody>
                                </table>
                            ` : `<p class="no-data">Tidak ada data</p>`}
                        </div>` 
                }).join('')}
            </div>

            <div class="footer">Dicetak pada: ${new Date().toLocaleString('id-ID')}</div>
        </div>
    </body>
    </html>`;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) { printWindow.document.write(printHtml); printWindow.document.close(); printWindow.focus(); setTimeout(() => { printWindow.print(); }, 250); }
  }

  return (
    <div className="animate-fade-in">
        <h1 className="text-3xl font-bold text-slate-800 mb-6">Laporan Harian</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-6 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Tanggal</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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
            <FiClipboard className="mx-auto text-5xl text-slate-300" />
            <p className="mt-4 text-slate-500">Silakan pilih tanggal dan kelas, lalu klik "Tampilkan Laporan".</p>
        </div>
      ) : (
        <div className="printable-area">
          <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Laporan Kehadiran</h2>
                <p className="text-slate-600">{reportData.date} - Kelas: {reportData.className}</p>
              </div>
              <button onClick={handlePrint} className="bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-slate-800 flex items-center no-print transition-colors"><FiPrinter className="mr-2"/>Cetak Laporan</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
            <StatusCard title="Hadir Tepat Waktu" students={reportData.present} icon={<FiUserCheck size={20} className="text-green-600"/>} color="border-green-500"/>
            <StatusCard title="Terlambat" students={reportData.late} icon={<FiClock size={20} className="text-yellow-600"/>} color="border-yellow-500"/>
            <StatusCard title="Belum Hadir" students={reportData.absent} icon={<FiAlertCircle size={20} className="text-red-600"/>} color="border-red-500"/>
            <StatusCard title="Sakit" students={reportData.sick} icon={<FiHelpCircle size={20} className="text-blue-600"/>} color="border-blue-500"/>
            <StatusCard title="Izin" students={reportData.permit} icon={<FiHelpCircle size={20} className="text-indigo-600"/>} color="border-indigo-500"/>
          </div>
          
          {/* Recap Table Section */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8">
              <div className="flex items-center mb-4">
                  <FiList className="text-indigo-600 mr-2 text-xl" />
                  <h3 className="text-lg font-bold text-slate-800">Rekapitulasi Absensi Per Kelas</h3>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-center border-collapse border border-slate-200">
                      <thead className="bg-slate-50 text-slate-700 uppercase font-semibold">
                          <tr>
                              <th className="border border-slate-200 p-3 w-16">No</th>
                              <th className="border border-slate-200 p-3 text-left">Kelas</th>
                              <th className="border border-slate-200 p-3 bg-green-50 text-green-800">Hadir</th>
                              <th className="border border-slate-200 p-3 bg-red-50 text-red-800">Tidak Hadir</th>
                              <th className="border border-slate-200 p-3 bg-indigo-50 text-indigo-800">Izin</th>
                              <th className="border border-slate-200 p-3 bg-blue-50 text-blue-800">Sakit</th>
                              <th className="border border-slate-200 p-3 font-bold bg-slate-100">Jumlah Total</th>
                          </tr>
                      </thead>
                      <tbody>
                          {classRecap.map((row, idx) => (
                              <tr key={row.id} className="hover:bg-slate-50">
                                  <td className="border border-slate-200 p-2">{idx + 1}</td>
                                  <td className="border border-slate-200 p-2 text-left font-medium">{row.name}</td>
                                  <td className="border border-slate-200 p-2">{row.h}</td>
                                  <td className="border border-slate-200 p-2">{row.a}</td>
                                  <td className="border border-slate-200 p-2">{row.i}</td>
                                  <td className="border border-slate-200 p-2">{row.s}</td>
                                  <td className="border border-slate-200 p-2 font-bold">{row.total}</td>
                              </tr>
                          ))}
                      </tbody>
                      <tfoot className="bg-slate-100 font-bold text-slate-800">
                          <tr>
                              <td colSpan={2} className="border border-slate-200 p-3 text-center">JUMLAH TOTAL</td>
                              <td className="border border-slate-200 p-3">{recapTotals.h}</td>
                              <td className="border border-slate-200 p-3">{recapTotals.a}</td>
                              <td className="border border-slate-200 p-3">{recapTotals.i}</td>
                              <td className="border border-slate-200 p-3">{recapTotals.s}</td>
                              <td className="border border-slate-200 p-3">{recapTotals.total}</td>
                          </tr>
                      </tfoot>
                  </table>
              </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default DailyReportsPage;
