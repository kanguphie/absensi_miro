import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Student, AttendanceLog, AttendanceStatus } from '../../types';
import { FiSearch, FiDownload, FiBarChart2, FiChevronUp, FiChevronDown, FiTrash2, FiAlertCircle, FiPrinter } from 'react-icons/fi';
import * as XLSX from 'xlsx';

declare const Swal: any;

const toLocalISOString = (date: Date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzoffset).toISOString().slice(0, 10);
    return localISOTime;
}

const statusColors: { [key in AttendanceStatus]: string } = {
    [AttendanceStatus.PRESENT]: 'bg-green-100 text-green-800',
    [AttendanceStatus.LATE]: 'bg-yellow-100 text-yellow-800',
    [AttendanceStatus.SICK]: 'bg-blue-100 text-blue-800',
    [AttendanceStatus.PERMIT]: 'bg-indigo-100 text-indigo-800',
    [AttendanceStatus.ABSENT]: 'bg-red-100 text-red-800',
    [AttendanceStatus.LEAVE_EARLY]: 'bg-purple-100 text-purple-800',
    [AttendanceStatus.NO_CHECKOUT]: 'bg-orange-100 text-orange-800',
};

type EnrichedLog = AttendanceLog & { student?: Student };
type SortableKeys = 'studentName' | 'nis' | 'className' | 'timestamp';

const AttendanceHistoryPage: React.FC = () => {
    const { attendanceLogs, students, classes, loading, deleteAttendanceLogsBatch } = useData();
    const { settings } = useSettings();
    const today = toLocalISOString(new Date());

    const [dateRange, setDateRange] = useState({ start: today, end: today });
    const [searchTerm, setSearchTerm] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'timestamp', direction: 'descending' });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState('25');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const studentMap = useMemo(() => new Map(students.map(s => [s.id, s])), [students]);
    
    const enrichedLogs = useMemo(() => 
        attendanceLogs.map(log => ({ ...log, student: studentMap.get(log.studentId) }))
    , [attendanceLogs, studentMap]);

    const filteredLogs = useMemo(() => {
        return enrichedLogs.filter(log => {
            const logDate = new Date(log.timestamp);
            const startDate = new Date(dateRange.start + 'T00:00:00');
            const endDate = new Date(dateRange.end + 'T23:59:59');

            if (logDate < startDate || logDate > endDate) return false;
            if (classFilter && log.className !== classes.find(c => c.id === classFilter)?.name) return false;
            if (statusFilter && log.status !== statusFilter) return false;
            if (typeFilter && log.type !== typeFilter) return false;
            if (searchTerm && !(
                log.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.student?.nis.includes(searchTerm)
            )) return false;

            return true;
        });
    }, [enrichedLogs, dateRange, classFilter, statusFilter, typeFilter, searchTerm, classes]);

    const sortedLogs = useMemo(() => {
        let sortableItems = [...filteredLogs];
        sortableItems.sort((a, b) => {
            let aValue, bValue;
            switch(sortConfig.key) {
                case 'nis':
                    aValue = a.student?.nis || '';
                    bValue = b.student?.nis || '';
                    break;
                case 'timestamp':
                    aValue = new Date(a.timestamp).getTime();
                    bValue = new Date(b.timestamp).getTime();
                    break;
                default:
                    aValue = a[sortConfig.key] || '';
                    bValue = b[sortConfig.key] || '';
            }

            const strA = String(aValue).toLowerCase();
            const strB = String(bValue).toLowerCase();

            if (strA < strB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (strA > strB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [filteredLogs, sortConfig]);

    const paginatedLogs = useMemo(() => {
        if (rowsPerPage === 'all') return sortedLogs;
        const numRows = parseInt(rowsPerPage, 10);
        const startIndex = (currentPage - 1) * numRows;
        return sortedLogs.slice(startIndex, startIndex + numRows);
    }, [sortedLogs, currentPage, rowsPerPage]);

    const totalPages = useMemo(() => {
        if (rowsPerPage === 'all' || sortedLogs.length === 0) return 1;
        const numRows = parseInt(rowsPerPage, 10);
        return Math.ceil(sortedLogs.length / numRows);
    }, [sortedLogs.length, rowsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds(new Set());
    }, [dateRange, searchTerm, classFilter, statusFilter, typeFilter, rowsPerPage]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleExport = () => {
        const dataToExport = sortedLogs.map(log => ({
            'Nama Siswa': log.studentName,
            'NIS': log.student?.nis || 'N/A',
            'Kelas': log.className,
            'Tanggal': new Date(log.timestamp).toLocaleDateString('id-ID'),
            'Waktu': new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit'}),
            'Tipe': log.type === 'in' ? 'Masuk' : 'Pulang',
            'Status': log.status
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        worksheet['!cols'] = [{wch: 25}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 10}, {wch: 15}];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Absensi');
        XLSX.writeFile(workbook, `riwayat_absensi_${dateRange.start}_sd_${dateRange.end}.xlsx`);
    };

    const handlePrint = () => {
        if (sortedLogs.length === 0) {
            Swal.fire('Info', 'Tidak ada data untuk dicetak.', 'info');
            return;
        }

        const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

        let htmlContent = `
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <title>Laporan Riwayat Absensi</title>
                <style>
                    body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; margin: 0; font-size: 10pt; color: #333; }
                    .page-container { padding: 1.5cm; }
                    .header { display: flex; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
                    .header img { height: 60px; width: 60px; object-fit: contain; margin-right: 20px; }
                    .header-text { flex-grow: 1; }
                    .header-text h1 { margin: 0; font-size: 16pt; font-weight: 600; }
                    .header-text h2 { margin: 0; font-size: 11pt; font-weight: 400; color: #555; }
                    .report-info { text-align: right; font-size: 9pt; }
                    
                    table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 15px; }
                    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: middle; }
                    thead th { background-color: #f0f0f0; font-weight: 600; text-transform: uppercase; font-size: 8pt; }
                    .text-center { text-align: center; }
                    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8pt; font-weight: bold; }
                    
                    .footer { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 8pt; color: #777; text-align: right; }
                    
                    @media print { 
                        @page { size: A4 portrait; margin: 0; } 
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="page-container">
                    <div class="header">
                        ${settings?.schoolLogoUrl ? `<img src="${settings.schoolLogoUrl}" alt="Logo">` : ''}
                        <div class="header-text">
                            <h1>Laporan Riwayat Absensi</h1>
                            <h2>${settings?.schoolName || 'Sistem Absensi RFID'}</h2>
                        </div>
                        <div class="report-info">
                            <strong>Periode:</strong><br>
                            ${formatDate(dateRange.start)} s/d ${formatDate(dateRange.end)}
                        </div>
                    </div>

                    <div style="margin-bottom: 10px; font-size: 10pt;">
                        <strong>Filter Aktif:</strong> 
                        ${classFilter ? `Kelas ${classes.find(c => c.id === classFilter)?.name}` : 'Semua Kelas'} 
                        ${statusFilter ? `| Status: ${statusFilter}` : ''}
                        ${typeFilter ? `| Tipe: ${typeFilter === 'in' ? 'Masuk' : 'Pulang'}` : ''}
                        | Total Data: ${sortedLogs.length}
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th class="text-center" style="width: 40px;">No</th>
                                <th style="width: 120px;">Waktu</th>
                                <th>Nama Siswa</th>
                                <th style="width: 80px;">NIS</th>
                                <th style="width: 60px;">Kelas</th>
                                <th class="text-center" style="width: 80px;">Tipe</th>
                                <th class="text-center" style="width: 100px;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedLogs.map((log, index) => `
                                <tr>
                                    <td class="text-center">${index + 1}</td>
                                    <td>
                                        ${new Date(log.timestamp).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})}
                                        <br/>
                                        <small>${new Date(log.timestamp).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</small>
                                    </td>
                                    <td>${log.studentName}</td>
                                    <td>${log.student?.nis || '-'}</td>
                                    <td>${log.className}</td>
                                    <td class="text-center">
                                        <span style="color: ${log.type === 'in' ? '#047857' : '#4338ca'}; font-weight:bold;">
                                            ${log.type === 'in' ? 'MASUK' : 'PULANG'}
                                        </span>
                                    </td>
                                    <td class="text-center">${log.status}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="footer">
                        Dicetak pada: ${new Date().toLocaleString('id-ID')}
                    </div>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            setTimeout(() => { printWindow.print(); }, 500);
        } else {
            Swal.fire('Error', 'Gagal membuka tab baru. Mohon izinkan pop-up.', 'error');
        }
    };

    const handleSelectOne = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.size === sortedLogs.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(sortedLogs.map(s => s.id)));
        }
    };
    
    const isAllSelected = selectedIds.size > 0 && selectedIds.size === sortedLogs.length;

    const handleDeleteSelected = () => {
        Swal.fire({
            title: 'Apakah Anda yakin?',
            text: `Anda akan menghapus ${selectedIds.size} riwayat absensi terpilih. Aksi ini tidak dapat dibatalkan.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, hapus!',
            cancelButtonText: 'Batal'
        }).then(async (result: { isConfirmed: boolean }) => {
            if (result.isConfirmed) {
                await deleteAttendanceLogsBatch(Array.from(selectedIds));
                setSelectedIds(new Set());
            }
        });
    };
    
    const handleDeleteSingle = (log: EnrichedLog) => {
        Swal.fire({
           title: 'Hapus Riwayat Tunggal?',
           text: `Anda akan menghapus riwayat absensi untuk ${log.studentName} pada ${new Date(log.timestamp).toLocaleString('id-ID')}.`,
           icon: 'warning',
           showCancelButton: true,
           confirmButtonColor: '#d33',
           cancelButtonColor: '#3085d6',
           confirmButtonText: 'Ya, hapus!',
           cancelButtonText: 'Batal'
       }).then(async (result: { isConfirmed: boolean }) => {
           if (result.isConfirmed) {
               await deleteAttendanceLogsBatch([log.id]);
               setSelectedIds(prev => {
                   const newSet = new Set(prev);
                   newSet.delete(log.id);
                   return newSet;
               });
           }
       });
   }
    
    const SortableHeader: React.FC<{ columnKey: SortableKeys, title: string }> = ({ columnKey, title }) => {
        const isSorted = sortConfig?.key === columnKey;
        return (
          <th className="p-4 font-semibold text-slate-600 uppercase tracking-wider">
            <button onClick={() => requestSort(columnKey)} className="flex items-center gap-2 group transition-colors hover:text-indigo-600">
              <span>{title}</span>
              {isSorted ? (
                sortConfig.direction === 'ascending' ? 
                <FiChevronUp size={16} className="text-indigo-600" /> : 
                <FiChevronDown size={16} className="text-indigo-600" />
              ) : (
                <FiBarChart2 size={16} className="text-slate-400 opacity-0 group-hover:opacity-100" />
              )}
            </button>
          </th>
        );
      };

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-slate-800">Riwayat Absensi</h1>
                <div className="flex gap-2">
                    <button onClick={handlePrint} className="bg-slate-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-800 flex items-center transition-colors">
                        <FiPrinter className="mr-2" /> Cetak
                    </button>
                    <button onClick={handleExport} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center transition-colors">
                        <FiDownload className="mr-2" /> Export Excel
                    </button>
                </div>
            </div>
            
            {selectedIds.size > 0 && (
                <div className="bg-indigo-100 border border-indigo-300 rounded-lg p-3 mb-6 flex justify-between items-center animate-fade-in">
                    <div className="flex items-center">
                        <FiAlertCircle className="text-indigo-600 mr-3" />
                        <p className="font-semibold text-indigo-800">{selectedIds.size} riwayat terpilih</p>
                    </div>
                    <button
                        onClick={handleDeleteSelected}
                        className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 flex items-center transition-colors text-sm"
                    >
                        <FiTrash2 className="mr-2" /> Hapus Terpilih
                    </button>
                </div>
            )}

            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <div className="relative col-span-1 xl:col-span-1">
                        <FiSearch className="absolute top-1/2 -translate-y-1/2 left-4 text-slate-400" />
                        <input type="text" placeholder="Cari nama atau NIS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">Semua Kelas</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">Semua Tipe</option>
                        <option value="in">Masuk</option>
                        <option value="out">Pulang</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-4 w-12 text-center">
                                    <input type="checkbox"
                                        className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                        checked={isAllSelected}
                                        ref={el => { if (el) { el.indeterminate = selectedIds.size > 0 && !isAllSelected; } }}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <SortableHeader columnKey="studentName" title="Siswa" />
                                <SortableHeader columnKey="nis" title="NIS" />
                                <SortableHeader columnKey="className" title="Kelas" />
                                <SortableHeader columnKey="timestamp" title="Waktu" />
                                <th className="p-4 font-semibold text-slate-600 uppercase tracking-wider">Tipe</th>
                                <th className="p-4 font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                <th className="p-4 font-semibold text-slate-600 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} className="text-center p-4">Memuat data...</td></tr>
                            ) : paginatedLogs.length > 0 ? paginatedLogs.map(log => (
                                <tr key={log.id} className={`border-b border-slate-100 ${selectedIds.has(log.id) ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                                    <td className="p-4 text-center">
                                        <input type="checkbox"
                                            className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                            checked={selectedIds.has(log.id)}
                                            onChange={() => handleSelectOne(log.id)}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center space-x-3">
                                            <img src={log.studentPhotoUrl} alt={log.studentName} className="w-10 h-10 rounded-full object-cover" />
                                            <span className="font-medium text-slate-800">{log.studentName}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-700">{log.student?.nis || 'N/A'}</td>
                                    <td className="p-4 text-slate-700">{log.className}</td>
                                    <td className="p-4 text-slate-700">
                                        <div>{new Date(log.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric'})}</div>
                                        <div className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit'})}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${log.type === 'in' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}`}>
                                            {log.type === 'in' ? 'Masuk' : 'Pulang'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[log.status] || 'bg-slate-100 text-slate-800'}`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <button onClick={() => handleDeleteSingle(log)} className="text-slate-500 hover:text-red-600 p-2 rounded-md hover:bg-slate-100">
                                            <FiTrash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={8} className="text-center p-8 text-slate-500">Tidak ada riwayat absensi yang cocok dengan filter.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-slate-200 text-sm text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-4">
                    {sortedLogs.length > 0 ? (
                        <>
                            <span className="text-sm text-slate-600">Menampilkan <strong>{paginatedLogs.length}</strong> dari <strong>{sortedLogs.length}</strong> log.</span>
                            {totalPages > 1 && (
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-3 py-1 border border-slate-300 rounded-md text-sm hover:bg-slate-100 disabled:opacity-50">Sebelumnya</button>
                                    <span className="font-medium">Halaman {currentPage} dari {totalPages}</span>
                                    <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1 border border-slate-300 rounded-md text-sm hover:bg-slate-100 disabled:opacity-50">Berikutnya</button>
                                </div>
                            )}
                        </>
                    ) : (<span>Menampilkan <strong>0</strong> log.</span>)}
                </div>
            </div>
        </div>
    );
};

export default AttendanceHistoryPage;