import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { SchoolClass } from '../../types';
import { FiPlus, FiEdit, FiTrash2, FiX, FiArchive, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';

const ClassModal: React.FC<{
  classData: SchoolClass | null;
  onClose: () => void;
  onSave: (id: string | null, name: string) => void;
}> = ({ classData, onClose, onSave }) => {
  const [name, setName] = useState(classData?.name || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(classData?.id || null, name.trim());
    } else {
      toast.error('Nama kelas tidak boleh kosong.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 animate-fade-in p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <form onSubmit={handleSubmit}>
            <div className="flex justify-between items-center p-5 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-800">{classData ? 'Edit Kelas' : 'Tambah Kelas Baru'}</h2>
                <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><FiX /></button>
            </div>
            <div className="p-6">
                <label htmlFor="className" className="block text-sm font-medium text-slate-700 mb-1">Nama Kelas</label>
                <input
                    id="className"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Contoh: Kelas 1A"
                    autoFocus
                />
            </div>
            <div className="flex justify-end space-x-3 p-5 border-t border-slate-200 bg-slate-50 rounded-b-lg">
                <button type="button" onClick={onClose} className="bg-white border border-slate-300 text-slate-800 font-bold py-2 px-4 rounded-lg hover:bg-slate-100 transition-colors">Batal</button>
                <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center transition-colors">
                    <FiSave className="mr-2" /> Simpan
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

const ClassesPage: React.FC = () => {
  const { classes, loading, addClass, updateClass, deleteClass } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);

  const handleOpenModal = (classData: SchoolClass | null = null) => {
    setSelectedClass(classData);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClass(null);
  };

  const handleSaveClass = async (id: string | null, name: string) => {
    if (id) {
      await updateClass(id, name);
    } else {
      await addClass(name);
    }
    handleCloseModal();
  };

  const handleDeleteClass = (classData: SchoolClass) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus kelas "${classData.name}"?`)) {
      deleteClass(classData.id);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Manajemen Kelas</h1>
        <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center transition-colors">
          <FiPlus className="mr-2" /> Tambah Kelas
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600 uppercase tracking-wider">Nama Kelas / Rombel</th>
                <th className="p-4 font-semibold text-slate-600 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={2} className="text-center p-4">Memuat data...</td></tr>
              ) : classes.length > 0 ? classes.map(cls => (
                <tr key={cls.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-800 flex items-center">
                    <FiArchive className="mr-3 text-slate-400" />
                    {cls.name}
                  </td>
                  <td className="p-4">
                    <div className="flex space-x-2">
                      <button onClick={() => handleOpenModal(cls)} className="text-slate-500 hover:text-indigo-600 p-2 rounded-md hover:bg-slate-100"><FiEdit size={18} /></button>
                      <button onClick={() => handleDeleteClass(cls)} className="text-slate-500 hover:text-red-600 p-2 rounded-md hover:bg-slate-100"><FiTrash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={2} className="text-center p-8 text-slate-500">Belum ada data kelas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && <ClassModal classData={selectedClass} onClose={handleCloseModal} onSave={handleSaveClass} />}
    </div>
  );
};

export default ClassesPage;