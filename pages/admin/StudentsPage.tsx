import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Student } from '../../types';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiUpload, FiDownload, FiX, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';

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
        rfidUid: student.rfidUid,
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
      toast.error('NIS, Nama, dan Kelas wajib diisi.');
      return;
    }

    const isDuplicateNis = students.some(s => s.nis === nis && s.id !== student?.id);
    if (isDuplicateNis) {
      toast.error('NIS sudah digunakan oleh siswa lain.');
      return;
    }
    if (formData.rfidUid) {
      const isDuplicateRfid = students.some(s => s.rfidUid === formData.rfidUid && s.id !== student?.id);
      if (isDuplicateRfid) {
        toast.error('RFID UID sudah digunakan oleh siswa lain.');
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
    const csvContent = "nis,name,className,rfidUid\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_import_siswa.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processFile = (content: string) => {
    const lines = content.replace(/\r/g, '').split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) {
      toast.error("File CSV kosong atau hanya berisi header.");
      return;
    }
    const header = lines[0].split(',').map(h => h.trim());
    const requiredHeaders = ['nis', 'name', 'className'];
    if (!requiredHeaders.every(h => header.includes(h))) {
        toast.error(`Header CSV tidak valid. Pastikan ada kolom: ${requiredHeaders.join(', ')}`);
        return;
    }

    const dataRows = lines.slice(1);
    const classMap = new Map(classes.map(c => [c.name.toLowerCase(), c.id]));
    const existingNis = new Set(students.map(s => s.nis));
    const existingRfid = new Set(students.map(s => s.rfidUid).filter(Boolean));

    const validatedData: StudentImportRow[] = dataRows.map(line => {
      const values = line.split(',');
      const rowData = header.reduce((obj, h, i) => {
        obj[h] = values[i] ? values[i].trim() : '';
        return obj;
      }, {} as any);

      const errors: string[] = [];
      if (!rowData.nis) errors.push("NIS wajib diisi.");
      if (!rowData.name) errors.push("Nama wajib diisi.");
      if (!rowData.className) errors.push("Nama Kelas wajib diisi.");
      if (rowData.nis && existingNis.has(rowData.nis)) errors.push("NIS sudah terdaftar.");
      if (rowData.rfidUid && existingRfid.has(rowData.rfidUid)) errors.push("RFID sudah terdaftar.");
      if (rowData.className && !classMap.has(rowData.className.toLowerCase())) errors.push("Kelas tidak ditemukan.");

      return {
        data: { nis: rowData.nis || '', name: rowData.name || '', className: rowData.className || '', rfidUid: rowData.rfidUid || '' },
        isValid: errors.length === 0,
        errors: errors,
      };
    });
    setParsedData(validatedData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
            toast.error("Hanya file .csv yang diizinkan."); return;
        }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => { processFile(event.target?.result as string); };
      reader.readAsText(selectedFile);
    }
  };

  const handleImport = async () => {
      const validData = parsedData.filter(row => row.isValid);
      if (validData.length === 0) { toast.error("Tidak ada data valid untuk diimpor."); return; }
      setIsProcessing(true);
      const classMap = new Map(classes.map(c => [c.name.toLowerCase(), c.id]));
      const newStudentsData: Omit<Student, 'id' | 'photoUrl'>[] = validData.map(row => ({
          nis: row.data.nis, name: row.data.name, classId: classMap.get(row.data.className.toLowerCase())!,
          rfidUid: row.data.rfidUid
      }));
      try { await addStudentsBatch(newStudentsData); onClose(); } catch (err) { toast.error("Terjadi kesalahan saat mengimpor."); } finally { setIsProcessing(false); }
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
            <p className="text-sm text-slate-500 mt-1 mb-3">Unduh template CSV, isi data siswa sesuai format, lalu unggah pada langkah 2. Pastikan nama kelas sesuai dengan yang ada di sistem.</p>
            <button onClick={handleDownloadTemplate} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-100 flex items-center transition-colors text-sm">
              <FiDownload className="mr-2" /> Unduh Template (.csv)
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
                    <p className="text-xs text-slate-500">Hanya file .CSV</p>
                  </div>
                </div>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".csv" />
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
const StudentsPage: React.FC = () => {
  const { students, classes, loading, addStudent, updateStudent, deleteStudent } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || student.nis.includes(searchTerm);
      const matchesClass = filterClass ? student.classId === filterClass : true;
      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, filterClass]);
  
  const getClassName = (classId: string) => { return classes.find(c => c.id === classId)?.name || 'N/A'; }
  
  const handleOpenStudentModal = (student: Student | null) => { setSelectedStudent(student); setIsStudentModalOpen(true); };
  const handleCloseStudentModal = () => { setSelectedStudent(null); setIsStudentModalOpen(false); };

  const handleSaveStudent = async (studentData: Omit<Student, 'id' | 'photoUrl'>, id: string | null) => {
    if (id) { await updateStudent(id, studentData); } else { await addStudent(studentData); }
    handleCloseStudentModal();
  };
  
  const handleDeleteStudent = (student: Student) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus siswa "${student.name}"?`)) { deleteStudent(student.id); }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Manajemen Siswa</h1>
        <div className="flex space-x-2">
            <button onClick={() => setIsImportModalOpen(true)} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center transition-colors">
              <FiUpload className="mr-2" /> Import
            </button>
            <button onClick={() => handleOpenStudentModal(null)} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center transition-colors">
              <FiPlus className="mr-2" /> Tambah Siswa
            </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <FiSearch className="absolute top-1/2 -translate-y-1/2 left-4 text-slate-400" />
            <input
              type="text" placeholder="Cari nama atau NIS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
              className="w-full py-2.5 px-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Kelas</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600 uppercase tracking-wider">Siswa</th>
                <th className="p-4 font-semibold text-slate-600 uppercase tracking-wider">NIS</th>
                <th className="p-4 font-semibold text-slate-600 uppercase tracking-wider">Kelas</th>
                <th className="p-4 font-semibold text-slate-600 uppercase tracking-wider">RFID UID</th>
                <th className="p-4 font-semibold text-slate-600 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center p-4">Memuat data...</td></tr>
              ) : filteredStudents.length > 0 ? filteredStudents.map(student => (
                <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50">
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
                 <tr><td colSpan={5} className="text-center p-8 text-slate-500">Tidak ada data siswa yang cocok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {isImportModalOpen && <ImportModal onClose={() => setIsImportModalOpen(false)} />}
      {isStudentModalOpen && <StudentModal student={selectedStudent} onClose={handleCloseStudentModal} onSave={handleSaveStudent} />}
    </div>
  );
};

export default StudentsPage;