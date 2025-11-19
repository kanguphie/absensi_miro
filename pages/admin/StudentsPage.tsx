
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Student } from '../../types';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiUpload, FiDownload, FiX, FiSave, FiAlertCircle, FiChevronUp, FiChevronDown, FiBarChart2 } from 'react-icons/fi';
import * as XLSX from 'xlsx';

declare const Swal: any;

// --- Student Modal Component (Add/Edit) ---
const StudentModal: React.FC<{
  student: Student | null;
  onClose: () => void;
  onSave: (studentData: Omit<Student, 'id' | 'photoUrl'>, id: string | null) => void;
}> = ({ student, onClose, onSave }) => {
  const { classes, students } = useData();
  const [formData, setFormData] = useState({
    nis: '',
    name: '',
    classId: '',
    rfidUid: '',
  });

  useEffect(() => {
    if (student) {
      setFormData({
        nis: student.nis,
        name: student.name,
        classId: student.classId,
        rfidUid: student.rfidUid || '',
      });
    } else {
      if (classes.length > 0) {
        setFormData(prev => ({ ...prev, classId: classes[0].id }));
      }
    }
  }, [student, classes]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { nis, name, classId } = formData;
    if (!nis.trim() || !name.trim() || !classId) {
      Swal.fire('Error', 'NIS, Nama, dan Kelas wajib diisi.', 'error');
      return;
    }

    const isDuplicateNis = students.some(s => s.nis === nis && s.id !== student?.id);
    if (isDuplicateNis) {
      Swal.fire('Error', 'NIS sudah digunakan oleh siswa lain.', 'error');
      return;
    }
    if (formData.rfidUid) {
      const isDuplicateRfid = students.some(s => s.rfidUid === formData.rfidUid && s.id !== student?.id);
      if (isDuplicateRfid) {
        Swal.fire('Error', 'RFID UID sudah digunakan oleh siswa lain.', 'error');
        return;
      }
    }
    
    onSave(formData, student?.id || null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 animate-fade-in p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <form onSubmit={handleSubmit}>
          <div className="flex justify-between items-center p-5 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">{student ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</h2>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><FiX /></button>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="nis" className="block text-sm font-medium text-slate-700 mb-1">NIS</label>
                    <input id="nis" name="nis" type="text" value={formData.nis} onChange={handleChange} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                </div>
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                    <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                </div>
            </div>
            <div>
              <label htmlFor="classId" className="block text-sm font-medium text-slate-700 mb-1">Kelas</label>
              <select id="classId" name="classId" value={formData.classId} onChange={handleChange} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
                <option value="" disabled>Pilih Kelas</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
                <label htmlFor="rfidUid" className="block text-sm font-medium text-slate-700 mb-1">RFID UID</label>
                <input id="rfidUid" name="rfidUid" type="text" value={formData.rfidUid} onChange={handleChange} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Opsional"/>
            </div>
          </div>
          <div className="flex justify-end space-x-3 p-5 border-t border-slate-200 bg-slate-50 rounded-b-lg">
            <button type="button" onClick={onClose} className="bg-white border border-slate-300 text-slate-800 font-bold py-2 px-4 rounded-lg hover:bg-slate-100 transition-colors">Batal</button>
            <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center transition-colors">
              <FiSave className="mr-2" /> Simpan Data
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

type StudentImportRow = {
  data: {
    nis: string;
    name: string;
    className: string;
    rfidUid: string;
  };
  isValid: boolean;
  errors: string[];
};

const ImportModal: React.FC<{ onClose: () => void; }> = ({ onClose }) => {
  const { classes, students, addStudentsBatch } = useData();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<StudentImportRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDownloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['nis', 'name', 'className', 'rfidUid']
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Siswa");
    
    // Set column widths for better readability
    worksheet['!cols'] = [
        { wch: 15 }, // nis
        { wch: 30 }, // name
        { wch: 15 }, // className
        { wch: 20 }  // rfidUid
    ];

    XLSX.writeFile(workbook, "template_import_siswa.xlsx");
  };

  const processFile = (data: ArrayBuffer) => {
    try {
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

      if (jsonData.length === 0) {
        Swal.fire('Error', "File Excel kosong atau tidak ada data.", 'error');
        return;
      }
      const header = Object.keys(jsonData[0]);
      const requiredHeaders = ['nis', 'name', 'className'];
      if (!requiredHeaders.every(h => header.includes(h))) {
          Swal.fire('Error', `Header Excel tidak valid. Pastikan ada kolom: ${requiredHeaders.join(', ')}`, 'error');
          return;
      }
      
      const classMap = new Map(classes.map(c => [c.name.toLowerCase(), c.id]));
      const existingNis = new Set(students.map(s => String(s.nis)));
      const existingRfid = new Set(students.map(s => s.rfidUid).filter(Boolean));

      const validatedData: StudentImportRow[] = jsonData.map(rowData => {
        const errors: string[] = [];
        const nis = String(rowData.nis || '').trim();
        const name = String(rowData.name || '').trim();
        const className = String(rowData.className || '').trim();
        const rfidUid = String(rowData.rfidUid || '').trim();

        if (!nis) errors.push("NIS wajib diisi.");
        if (!name) errors.push("Nama wajib diisi.");
        if (!className) errors.push("Nama Kelas wajib diisi.");
        if (nis && existingNis.has(nis)) errors.push("NIS sudah terdaftar.");
        if (rfidUid && existingRfid.has(rfidUid)) errors.push("RFID sudah terdaftar.");
        if (className && !classMap.has(className.toLowerCase())) errors.push("Kelas tidak ditemukan.");

        return {
          data: { nis, name, className, rfidUid },
          isValid: errors.length === 0,
          errors: errors,
        };
      });
      setParsedData(validatedData);
    } catch (error) {
      console.error("Error parsing Excel file:", error);
      Swal.fire('Error', "Gagal memproses file Excel. Pastikan formatnya benar.", 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        const allowedExtensions = ['.xls', '.xlsx'];
        const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
        
        if (!allowedExtensions.includes(fileExtension)) {
            Swal.fire('Error', "Hanya file .xls atau .xlsx yang diizinkan.", 'error');
            return;
        }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => { processFile(event.target?.result as ArrayBuffer); };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleImport = async () => {
      const validData = parsedData.filter(row => row.isValid);
      if (validData.length === 0) { Swal.fire('Info', "Tidak ada data valid untuk diimpor.", 'info'); return; }
      setIsProcessing(true);
      const classMap = new Map(classes.map(c => [c.name.toLowerCase(), c.id]));
      const newStudentsData: Omit<Student, 'id' | 'photoUrl'>[] = validData.map(row => ({
          nis: row.data.nis, name: row.data.name, classId: classMap.get(row.data.className.toLowerCase())!,
          rfidUid: row.data.rfidUid
      }));
      try { await addStudentsBatch(newStudentsData); onClose(); } catch (err) { Swal.fire('Error', "Terjadi kesalahan saat mengimpor.", 'error'); } finally { setIsProcessing(false); }
  };
  
  const validRowCount = parsedData.filter(row => row.isValid).length;
  const invalidRowCount = parsedData.length - validRowCount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 animate-fade-in p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 flex items-center"><FiUpload className="mr-3" /> Import Data Siswa</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><FiX /></button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <h3 className="font-semibold text-slate-700">Langkah 1: Unduh dan Isi Template</h3>
            <p className="text-sm text-slate-500 mt-1 mb-3">Unduh template, isi data siswa, lalu unggah file Excel (.xls, .xlsx) pada langkah 2. Pastikan nama kelas sesuai dengan yang ada di sistem.</p>
            <button onClick={handleDownloadTemplate} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-100 flex items-center transition-colors text-sm">
              <FiDownload className="mr-2" /> Unduh Template (XLSX)
            </button>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <h3 className="font-semibold text-slate-700">Langkah 2: Unggah File Template</h3>
            <div className="mt-2">
              <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                <div className="flex justify-center items-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <FiUpload className="mx-auto h-12 w-12 text-slate-400" />
                    <div className="flex text-sm text-slate-600"><p className="pl-1">{file ? file.name : 'Pilih file atau seret ke sini'}</p></div>
                    <p className="text-xs text-slate-500">Hanya file .XLS atau .XLSX</p>
                  </div>
                </div>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".xls,.xlsx" />
              </label>
            </div>
          </div>
          
          {parsedData.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-slate-700 mb-2">Langkah 3: Pratinjau dan Impor</h3>
              <div className="flex justify-between items-center p-3 bg-slate-100 rounded-t-lg text-sm">
                 <p>Ditemukan {parsedData.length} baris data.</p>
                 <div><span className="text-green-600 font-semibold">{validRowCount} valid</span>, <span className="text-red-600 font-semibold">{invalidRowCount} tidak valid</span>.</div>
              </div>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-b-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 sticky top-0"><tr><th className="p-2 font-semibold text-slate-600">NIS</th><th className="p-2 font-semibold text-slate-600">Nama</th><th className="p-2 font-semibold text-slate-600">Kelas</th><th className="p-2 font-semibold text-slate-600">Status</th></tr></thead>
                  <tbody>{parsedData.map((row, index) => (<tr key={index} className={!row.isValid ? 'bg-red-50' : ''}><td className="p-2 border-t">{row.data.nis}</td><td className="p-2 border-t">{row.data.name}</td><td className="p-2 border-t">{row.data.className}</td><td className="p-2 border-t">{row.isValid ? (<span className="text-green-600">Valid</span>) : (<span className="text-red-600" title={row.errors.join(', ')}>{row.errors[0]}</span>)}</td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end space-x-3 p-5 border-t border-slate-200 bg-slate-50 rounded-b-lg">
          <button type="button" onClick={onClose} className="bg-white border border-slate-300 text-slate-800 font-bold py-2 px-4 rounded-lg hover:bg-slate-100 transition-colors">Batal</button>
          <button type="button" onClick={handleImport} disabled={isProcessing || validRowCount === 0} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed">{isProcessing ? 'Memproses...' : `Impor ${validRowCount} Data Valid`}</button>
        </div>
      </div>
    </div>
  );
};

// --- Main Students Page Component ---
type SortableKeys = keyof Pick<Student, 'nis' | 'name' | 'rfidUid'> | 'className';

const StudentsPage: React.FC = () => {
  const { students, classes, loading, addStudent, updateStudent, deleteStudent, deleteStudentsBatch } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState('25');

  const getClassName = (classId: string) => { return classes.find(c => c.id === classId)?.name || 'N/A'; }

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || student.nis.includes(searchTerm);
      const matchesClass = filterClass ? student.classId === filterClass : true;
      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, filterClass]);

  const sortedStudents = useMemo(() => {
    let sortableItems = [...filteredStudents];
    if (sortConfig !== null) {
        sortableItems.sort((a, b) => {
            let aValue: string | number;
            let bValue: string | number;

            if (sortConfig.key === 'className') {
                aValue = getClassName(a.classId);
                bValue = getClassName(b.classId);
            } else {
                aValue = a[sortConfig.key] || ''; // Use empty string for null/undefined rfidUid
                bValue = b[sortConfig.key] || '';
            }

            const strA = String(aValue).toLowerCase();
            const strB = String(bValue).toLowerCase();

            if (strA < strB) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (strA > strB) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }
    return sortableItems;
  }, [filteredStudents, sortConfig, classes]);
  
  const paginatedStudents = useMemo(() => {
    if (rowsPerPage === 'all') {
        return sortedStudents;
    }
    const numRows = parseInt(rowsPerPage, 10);
    const startIndex = (currentPage - 1) * numRows;
    return sortedStudents.slice(startIndex, startIndex + numRows);
  }, [sortedStudents, currentPage, rowsPerPage]);

  const totalPages = useMemo(() => {
    if (rowsPerPage === 'all' || sortedStudents.length === 0) return 1;
    const numRows = parseInt(rowsPerPage, 10);
    return Math.ceil(sortedStudents.length / numRows);
  }, [sortedStudents.length, rowsPerPage]);

  useEffect(() => {
    setSelectedIds(new Set());
    setCurrentPage(1);
  }, [searchTerm, filterClass]);

  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const handleOpenStudentModal = (student: Student | null) => { setSelectedStudent(student); setIsStudentModalOpen(true); };
  const handleCloseStudentModal = () => { setSelectedStudent(null); setIsStudentModalOpen(false); };

  const handleSaveStudent = async (studentData: Omit<Student, 'id' | 'photoUrl'>, id: string | null) => {
    if (id) { await updateStudent(id, studentData); } else { await addStudent(studentData); }
    handleCloseStudentModal();
  };
  
  const handleDeleteStudent = (student: Student) => {
    Swal.fire({
        title: 'Apakah Anda yakin?',
        text: `Anda akan menghapus siswa "${student.name}". Aksi ini tidak dapat dibatalkan.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, hapus!',
        cancelButtonText: 'Batal'
    }).then(async (result: { isConfirmed: boolean }) => {
        if (result.isConfirmed) {
            try {
                await deleteStudent(student.id);
            } catch (error) {
                Swal.fire('Gagal!', 'Gagal menghapus siswa.', 'error');
                console.error("Error deleting student:", error);
            }
        }
    });
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
    if (selectedIds.size === sortedStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedStudents.map(s => s.id)));
    }
  };
  
  const handleDeleteSelected = () => {
    Swal.fire({
        title: 'Apakah Anda yakin?',
        text: `Anda akan menghapus ${selectedIds.size} siswa terpilih. Aksi ini tidak dapat dibatalkan.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, hapus!',
        cancelButtonText: 'Batal'
    }).then(async (result: { isConfirmed: boolean }) => {
        if (result.isConfirmed) {
            try {
                await deleteStudentsBatch(Array.from(selectedIds));
                setSelectedIds(new Set());
            } catch (error) {
                Swal.fire('Gagal!', 'Gagal menghapus siswa terpilih.', 'error');
                console.error("Error deleting students batch:", error);
            }
        }
    });
  };

  const handleExport = () => {
      if (sortedStudents.length === 0) {
          Swal.fire('Info', 'Tidak ada data siswa untuk diekspor.', 'info');
          return;
      }

      const dataToExport = sortedStudents.map(student => ({
          'NIS': student.nis,
          'Nama Lengkap': student.name,
          'Kelas': getClassName(student.classId),
          'RFID UID': student.rfidUid || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      
      // Set column widths
      worksheet['!cols'] = [
          { wch: 15 }, // NIS
          { wch: 30 }, // Nama
          { wch: 15 }, // Kelas
          { wch: 20 }  // RFID
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Siswa");
      
      const timestamp = new Date().toISOString().slice(0,10);
      XLSX.writeFile(workbook, `data_siswa_${timestamp}.xlsx`);
  };

  const isAllSelected = selectedIds.size > 0 && selectedIds.size === sortedStudents.length;

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
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Manajemen Siswa</h1>
        <div className="flex space-x-2">
            <button onClick={handleExport} className="bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 flex items-center transition-colors">
              <FiDownload className="mr-2" /> Export
            </button>
            <button onClick={() => setIsImportModalOpen(true)} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center transition-colors">
              <FiUpload className="mr-2" /> Import
            </button>
            <button onClick={() => handleOpenStudentModal(null)} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center transition-colors">
              <FiPlus className="mr-2" /> Tambah
            </button>
        </div>
      </div>
      
      {selectedIds.size > 0 && (
        <div className="bg-indigo-100 border border-indigo-300 rounded-lg p-3 mb-6 flex justify-between items-center animate-fade-in">
            <div className="flex items-center">
              <FiAlertCircle className="text-indigo-600 mr-3" />
              <p className="font-semibold text-indigo-800">{selectedIds.size} siswa terpilih</p>
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
        <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:flex-1">
                <FiSearch className="absolute top-1/2 -translate-y-1/2 left-4 text-slate-400" />
                <input
                  type="text" placeholder="Cari nama atau NIS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div className="w-full md:w-auto md:min-w-[180px]">
                <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
                  className="w-full py-2.5 px-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Semua Kelas</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
             <div className="flex items-center w-full md:w-auto">
                <label htmlFor="rowsPerPage" className="text-sm font-medium text-slate-700 mr-2 whitespace-nowrap">Baris:</label>
                <select
                    id="rowsPerPage"
                    value={rowsPerPage}
                    onChange={e => {
                        setRowsPerPage(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="w-full md:w-auto py-2.5 px-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="all">Semua</option>
                </select>
            </div>
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
                      ref={el => {
                        if (el) {
                          el.indeterminate = selectedIds.size > 0 && !isAllSelected;
                        }
                      }}
                      onChange={handleSelectAll}
                    />
                </th>
                <SortableHeader columnKey="name" title="Siswa" />
                <SortableHeader columnKey="nis" title="NIS" />
                <SortableHeader columnKey="className" title="Kelas" />
                <SortableHeader columnKey="rfidUid" title="RFID UID" />
                <th className="p-4 font-semibold text-slate-600 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center p-4">Memuat data...</td></tr>
              ) : paginatedStudents.length > 0 ? paginatedStudents.map(student => (
                <tr key={student.id} className={`border-b border-slate-100 ${selectedIds.has(student.id) ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                   <td className="p-4 text-center">
                    <input type="checkbox"
                      className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                      checked={selectedIds.has(student.id)}
                      onChange={() => handleSelectOne(student.id)}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <img src={student.photoUrl} alt={student.name} className="w-10 h-10 rounded-full object-cover" />
                      <span className="font-medium text-slate-800">{student.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-700">{student.nis}</td>
                  <td className="p-4 text-slate-700">{getClassName(student.classId)}</td>
                  <td className="p-4 text-slate-700 font-mono">{student.rfidUid || '-'}</td>
                  <td className="p-4">
                    <div className="flex space-x-2">
                      <button onClick={() => handleOpenStudentModal(student)} className="text-slate-500 hover:text-indigo-600 p-2 rounded-md hover:bg-slate-100"><FiEdit size={18} /></button>
                      <button onClick={() => handleDeleteStudent(student)} className="text-slate-500 hover:text-red-600 p-2 rounded-md hover:bg-slate-100"><FiTrash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                 <tr><td colSpan={6} className="text-center p-8 text-slate-500">Tidak ada data siswa yang cocok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-200 text-sm text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-4">
          {sortedStudents.length > 0 ? (
            <>
                <span className="text-sm text-slate-600">
                    Menampilkan <strong>{
                        rowsPerPage === 'all' ? 1 : (currentPage - 1) * parseInt(rowsPerPage, 10) + 1
                    } - {
                        rowsPerPage === 'all' ? sortedStudents.length : Math.min(currentPage * parseInt(rowsPerPage, 10), sortedStudents.length)
                    }</strong> dari <strong>{sortedStudents.length}</strong> siswa.
                </span>
                {totalPages > 1 && (
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border border-slate-300 rounded-md text-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Sebelumnya
                        </button>
                        <span className="font-medium">
                            Halaman {currentPage} dari {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 border border-slate-300 rounded-md text-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Berikutnya
                        </button>
                    </div>
                )}
            </>
          ) : (
            <span>
                Menampilkan <strong>0</strong> dari <strong>{students.length}</strong> total siswa.
            </span>
          )}
        </div>
      </div>
      {isImportModalOpen && <ImportModal onClose={() => setIsImportModalOpen(false)} />}
      {isStudentModalOpen && <StudentModal student={selectedStudent} onClose={handleCloseStudentModal} onSave={handleSaveStudent} />}
    </div>
  );
};

export default StudentsPage;