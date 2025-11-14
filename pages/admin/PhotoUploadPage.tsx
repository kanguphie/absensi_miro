
import React, { useState, useCallback, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Student } from '../../types';
import { FiUploadCloud, FiCheckCircle, FiXCircle, FiUpload, FiTrash2, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';

type PhotoStatus = 'matched' | 'unmatched' | 'uploading' | 'uploaded' | 'error';

interface PhotoFile {
  id: string; // Unique ID for key prop
  file: File;
  previewUrl: string;
  nis: string;
  student: Student | null; // Matched student
  status: PhotoStatus;
}

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const PhotoUploadPage: React.FC = () => {
    const { students, updateStudentPhoto, refetchData } = useData();
    const [photoFiles, setPhotoFiles] = useState<PhotoFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const handleFiles = useCallback((files: FileList | null) => {
        if (!files) return;
        const studentMapByNis = new Map(students.map(s => [s.nis, s]));
        const existingFilenames = new Set(photoFiles.map(pf => pf.file.name));

        const newPhotoFiles = Array.from(files)
            .filter(file => file.type.startsWith('image/') && !existingFilenames.has(file.name))
            .map((file, index) => {
                const nis = file.name.split('.').slice(0, -1).join('.');
                const student = studentMapByNis.get(nis) || null;
                return {
                    id: `${file.name}-${Date.now()}-${index}`,
                    file,
                    previewUrl: URL.createObjectURL(file),
                    nis,
                    student,
                    status: student ? 'matched' : 'unmatched',
                };
            });
        
        if (newPhotoFiles.length > 0) {
          setPhotoFiles(prev => [...prev, ...newPhotoFiles]);
        }
    }, [students, photoFiles]);

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    };

    const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    };
    
    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFiles(e.target.files);
        e.target.value = ''; // Reset input to allow re-uploading the same file
    };

    const handleUpload = async () => {
        const filesToUpload = photoFiles.filter(pf => pf.status === 'matched');
        if (filesToUpload.length === 0) {
            toast.error("Tidak ada foto yang valid untuk diunggah.");
            return;
        }

        setIsUploading(true);
        toast.loading(`Mengunggah ${filesToUpload.length} foto...`, { id: 'upload-toast' });

        const uploadPromises = filesToUpload.map(async (photoFile) => {
            setPhotoFiles(prev => prev.map(pf => pf.id === photoFile.id ? { ...pf, status: 'uploading' } : pf));
            try {
                const dataUrl = await readFileAsDataURL(photoFile.file);
                await updateStudentPhoto(photoFile.student!.id, dataUrl);
                setPhotoFiles(prev => prev.map(pf => pf.id === photoFile.id ? { ...pf, status: 'uploaded' } : pf));
                return { success: true };
            } catch (error) {
                console.error(`Gagal mengunggah foto untuk NIS ${photoFile.nis}:`, error);
                setPhotoFiles(prev => prev.map(pf => pf.id === photoFile.id ? { ...pf, status: 'error' } : pf));
                return { success: false, nis: photoFile.nis };
            }
        });

        const results = await Promise.all(uploadPromises);
        const successfulUploads = results.filter(r => r.success).length;
        
        await refetchData();
        
        setIsUploading(false);
        toast.dismiss('upload-toast');
        toast.success(`${successfulUploads} dari ${filesToUpload.length} foto berhasil diunggah!`);
    };

    const { matchedCount, unmatchedCount } = useMemo(() => ({
        matchedCount: photoFiles.filter(pf => pf.status === 'matched').length,
        unmatchedCount: photoFiles.filter(pf => pf.status === 'unmatched').length,
    }), [photoFiles]);

    const removePhoto = (id: string) => {
      const fileToRemove = photoFiles.find(pf => pf.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      setPhotoFiles(prev => prev.filter(pf => pf.id !== id));
    };

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Unggah Foto Massal</h1>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-6">
                <h2 className="text-xl font-bold text-slate-800 mb-2">Unggah Foto Siswa</h2>
                <p className="text-slate-600 mb-4">Seret file foto ke area di bawah, atau klik untuk memilih file. Pastikan nama file foto sama dengan NIS siswa (contoh: <strong>250101.jpg</strong>).</p>
                <div 
                    onDrop={handleDrop} 
                    onDragEnter={handleDragEvents}
                    onDragOver={handleDragEvents}
                    onDragLeave={handleDragEvents}
                    className={`relative flex justify-center items-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md transition-colors ${isDragging ? 'bg-indigo-50 border-indigo-400' : ''}`}
                >
                    <div className="space-y-1 text-center">
                        <FiUploadCloud className="mx-auto h-12 w-12 text-slate-400" />
                        <div className="flex text-sm text-slate-600">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                <span>Pilih file</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/*" onChange={handleFileInput} disabled={isUploading} />
                            </label>
                            <p className="pl-1">atau seret ke sini</p>
                        </div>
                        <p className="text-xs text-slate-500">Hanya file gambar (PNG, JPG, dll.)</p>
                    </div>
                </div>
            </div>

            {photoFiles.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Pratinjau Foto</h2>
                            <p className="text-slate-600">{photoFiles.length} file dipilih. <span className="text-green-600 font-semibold">{matchedCount} cocok</span>, <span className="text-red-600 font-semibold">{unmatchedCount} tidak cocok</span>.</p>
                        </div>
                        <button onClick={handleUpload} disabled={isUploading || matchedCount === 0} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed">
                            {isUploading ? <FiLoader className="animate-spin mr-2" /> : <FiUpload className="mr-2" />}
                            {isUploading ? 'Mengunggah...' : `Unggah ${matchedCount} Foto Cocok`}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-2">
                        {photoFiles.map(pf => (
                            <div key={pf.id} className={`relative group border rounded-lg overflow-hidden shadow-sm ${pf.status === 'unmatched' ? 'border-red-300' : 'border-slate-200'}`}>
                                <img src={pf.previewUrl} alt={`Pratinjau ${pf.file.name}`} className="h-40 w-full object-cover" />
                                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end">
                                    <div className="p-2 text-white w-full bg-gradient-to-t from-black/80 to-transparent">
                                        {pf.status === 'matched' && (
                                            <div className="flex items-center text-green-300 text-sm"><FiCheckCircle className="mr-1.5" /> Cocok</div>
                                        )}
                                        {pf.status === 'unmatched' && (
                                            <div className="flex items-center text-red-300 text-sm"><FiXCircle className="mr-1.5" /> NIS tidak ditemukan</div>
                                        )}
                                        {pf.status === 'uploading' && (
                                             <div className="flex items-center text-blue-300 text-sm"><FiLoader className="animate-spin mr-1.5" /> Mengunggah...</div>
                                        )}
                                        {pf.status === 'uploaded' && (
                                            <div className="flex items-center text-green-300 text-sm"><FiCheckCircle className="mr-1.5" /> Terunggah</div>
                                        )}
                                        {pf.status === 'error' && (
                                            <div className="flex items-center text-red-300 text-sm"><FiXCircle className="mr-1.5" /> Gagal</div>
                                        )}
                                        <p className="font-bold text-sm truncate" title={pf.student?.name}>{pf.student?.name || pf.file.name}</p>
                                        <p className="text-xs text-slate-300">NIS: {pf.nis}</p>
                                    </div>
                                </div>
                                {!isUploading && (
                                  <button onClick={() => removePhoto(pf.id)} className="absolute top-1 right-1 p-1.5 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                                      <FiTrash2 size={14} />
                                  </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PhotoUploadPage;
