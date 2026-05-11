import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Upload, CheckCircle2, Camera, User, Trash2, SwitchCamera } from 'lucide-react';
import Webcam from 'react-webcam';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RecordFormProps {
  type: 'students' | 'teachers' | 'staff' | 'rombels' | 'subjects' | 'examSchedules' | 'questions' | 'examRooms';
  initialData?: any;
  teachers?: any[];
  rombels?: any[];
  subjects?: any[];
  students?: any[];
  examRooms?: any[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function RecordForm({ type, initialData, teachers = [], rombels = [], subjects = [], students = [], examRooms = [], onSubmit, onCancel }: RecordFormProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [selectedStudents, setSelectedStudents] = useState<any[]>(initialData?.studentsInRoom || []);
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedRombel, setSelectedRombel] = useState('all');
  const webcamRef = React.useRef<Webcam>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (initialData?.studentsInRoom?.length) {
      const normalized = initialData.studentsInRoom.map((student: any) => {
        const matched = students.find((s) => String(s.id) === String(student.id));
        return matched || student;
      });
      setSelectedStudents(normalized);
    }
  }, [initialData?.studentsInRoom, students]);

  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: initialData || {
      gender: 'Male',
      options: ['', '', '', ''],
      correctOption: 0
    }
  });

  const gender = watch('gender');
  const levelValue = watch('jenjang');
  const classValue = watch('class');
  const homeroomTeacherId = watch('homeroomTeacherId');
  const rombelValue = watch('rombel');
  const photoUrl = watch('photoUrl');
  const subjectId = watch('subjectId');
  const proctorId = watch('proctorId');
  const correctOption = watch('correctOption');
  const options = watch('options');

  const isStudentType = type === 'students';
  const isPersonRecord = ['students', 'teachers', 'staff'].includes(type);
  
  // Filter rombels based on selected class for exam schedules
  const filteredRombels = React.useMemo(() => {
    if (!classValue || classValue === 'Semua') return rombels;
    return rombels.filter(r => r.class === classValue);
  }, [rombels, classValue]);

  const availableClasses = React.useMemo(() => {
    const classes = Array.from(new Set([
      ...students.map(s => s.class),
      ...rombels.map(r => r.class)
    ].filter(Boolean)));
    return classes.sort();
  }, [students, rombels]);

  const availableRombels = React.useMemo(() => {
    const rombelList = students
      .filter((student) => selectedClass === 'all' || student.class === selectedClass)
      .map((student) => student.rombel)
      .filter(Boolean);
    return Array.from(new Set(rombelList)).sort();
  }, [students, selectedClass]);

  const selectedStudentIds = React.useMemo(() => new Set(selectedStudents.map((s) => String(s.id))), [selectedStudents]);

  const allAssignedStudentIds = React.useMemo(() => {
    const ids = new Set<string>();
    if (examRooms) {
      examRooms.forEach((room: any) => {
        if (room.id !== initialData?.id && room.studentsInRoom && Array.isArray(room.studentsInRoom)) {
          room.studentsInRoom.forEach((s: any) => ids.add(String(s.id)));
        }
      });
    }
    return ids;
  }, [examRooms, initialData?.id]);

  const filteredStudentOptions = React.useMemo(() => {
    return students
      .filter((student) => !selectedStudentIds.has(String(student.id)))
      .filter((student) => !allAssignedStudentIds.has(String(student.id)))
      .filter((student) => selectedClass === 'all' || student.class === selectedClass)
      .filter((student) => selectedRombel === 'all' || student.rombel === selectedRombel);
  }, [students, selectedStudentIds, allAssignedStudentIds, selectedClass, selectedRombel]);

  const scans = {
    scanKK: watch('scanKK'),
    scanAkte: watch('scanAkte'),
    scanKTPParent: watch('scanKTPParent'),
    scanRaport: watch('scanRaport'),
    scanIjasah: watch('scanIjasah'),
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(fieldName);
    try {
      const storageRef = ref(storage, `scans/${type}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setValue(fieldName, url);
      if (fieldName === 'photoUrl') {
        toast.success('Foto berhasil diunggah');
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(null);
    }
  };

  const capturePhoto = React.useCallback(async () => {
    if (!webcamRef.current) {
      toast.error('Kamera tidak siap');
      return;
    }
    
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        toast.error('Gagal mengambil screenshot dari kamera');
        return;
      }

      setUploading('photoUrl');
      
      // Extract base64 and mime type accurately
      const matches = imageSrc.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!matches) {
        throw new Error('Invalid image format');
      }
      
      const mimeType = matches[1];
      const base64Data = matches[2];
      
      // Convert base64 to blob manually for maximum compatibility
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      
      const fileName = `photos/${type}/${Date.now()}_face.jpg`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, blob, { 
        contentType: mimeType,
        customMetadata: {
          'type': type,
          'capturedAt': new Date().toISOString()
        }
      });
      
      const url = await getDownloadURL(storageRef);
      
      setValue('photoUrl', url);
      setShowCamera(false);
      toast.success('Foto berhasil direkam dan disimpan sementara. Jangan lupa klik "Simpan Data" di bawah untuk menyimpan permanen.');
    } catch (error) {
      console.error('Photo capture error:', error);
      toast.error('Gagal menyimpan foto: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setUploading(null);
    }
  }, [webcamRef, type, setValue]);

  const handleFormSubmit = (data: any) => {
    if (type === 'examRooms') {
      data.studentsInRoom = selectedStudents;
    }
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col h-full max-h-[90vh]">
      <div className="p-6 border-b bg-slate-50/50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <div className="h-8 w-1 bg-primary rounded-full" />
            {initialData ? 'Edit Data' : 'Tambah Data'} {
              type === 'students' ? 'Siswa' :
              type === 'teachers' ? 'Guru' : 
              type === 'rombels' ? 'Rombel' : 
              type === 'subjects' ? 'Mata Pelajaran' :
              type === 'examSchedules' ? 'Jadwal Ujian' :
              type === 'questions' ? 'Soal' : 
              type === 'examRooms' ? 'Ruang Ujian' : 'Staf'
            }
          </DialogTitle>
        </DialogHeader>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* SECTION: FOTO WAJAH */}
        {isPersonRecord && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">A</div>
              <h3 className="text-sm font-bold tracking-wide text-slate-900 uppercase">Input Foto Wajah (Absensi)</h3>
            </div>
            <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="h-40 w-40 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                  {showCamera ? (
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: cameraFacingMode }}
                      className="h-full w-full object-cover"
                      mirrored={cameraFacingMode === 'user'}
                      imageSmoothing={true}
                      forceScreenshotSourceSize={false}
                      disablePictureInPicture={true}
                      onUserMedia={() => {}}
                      onUserMediaError={() => {}}
                      screenshotQuality={0.92}
                    />
                  ) : photoUrl ? (
                    <img src={photoUrl} alt="Face" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <User className="h-12 w-12 opacity-20" />
                      <span className="text-[10px] uppercase font-bold tracking-widest mt-2">Belum ada foto</span>
                    </div>
                  )}
                  
                  {uploading === 'photoUrl' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                    </div>
                  )}
                </div>

                {!showCamera && photoUrl && (
                  <Button 
                    type="button"
                    variant="destructive" 
                    size="icon" 
                    className="absolute -top-2 -right-2 h-8 w-8 rounded-full shadow-lg z-10 hover:scale-110 transition-transform"
                    onClick={(e) => {
                      e.preventDefault();
                      setValue('photoUrl', '');
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {showCamera ? (
                  <>
                    <Button type="button" variant="outline" onClick={() => setShowCamera(false)}>Batal</Button>
                    <Button type="button" variant="outline" onClick={() => setCameraFacingMode(prev => prev === 'user' ? 'environment' : 'user')}>
                      <SwitchCamera className="mr-2 h-4 w-4" /> Ganti Kamera
                    </Button>
                    <Button type="button" onClick={capturePhoto} disabled={!!uploading}>
                      <Camera className="mr-2 h-4 w-4" /> Ambil Foto
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button type="button" variant="outline" className="border-primary/20 text-primary hover:bg-primary/5" onClick={() => setShowCamera(true)}>
                      <Camera className="mr-2 h-4 w-4" /> {photoUrl ? 'Ulangi Foto' : 'Mulai Rekam Wajah'}
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'photoUrl')}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="border-slate-200 text-slate-600 hover:bg-slate-50" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!!uploading}
                    >
                      <Upload className="mr-2 h-4 w-4" /> Unggah Foto
                    </Button>
                    {photoUrl && (
                      <Button type="button" variant="outline" className="border-destructive/20 text-destructive hover:bg-destructive/5" onClick={() => setValue('photoUrl', '')}>
                        <Trash2 className="mr-2 h-4 w-4" /> Hapus Foto
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-500 italic text-center leading-relaxed max-w-[250px]">
                Pastikan wajah terlihat jelas dan tegak lurus ke arah kamera untuk akurasi presensi.
              </p>
            </div>
          </div>
        )}

        {/* SECTION: DATA PRIBADI */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">1</div>
            <h3 className="text-sm font-bold tracking-wide text-slate-900 uppercase">Informasi Pribadi</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-slate-100 shadow-sm relative pt-10">
            <div className="absolute top-4 right-4 z-10 w-32">
                <Label htmlFor="jenjang" className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Jenjang</Label>
                <Select onValueChange={(v) => setValue('jenjang', v)} value={levelValue || ""}>
                  <SelectTrigger className="h-8 text-xs font-bold border-primary/20 bg-primary/5 text-primary">
                    <SelectValue placeholder="Pilih Jenjang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SD">SD</SelectItem>
                    <SelectItem value="SMP">SMP</SelectItem>
                  </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-2">
            {type === 'rombels' ? (
              <>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name" className="text-xs font-semibold text-slate-500 uppercase">Nama Rombel</Label>
                  <Input id="name" {...register('name', { required: true })} placeholder="Contoh: VII-A, VIII-B" className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class" className="text-xs font-semibold text-slate-500 uppercase">Tingkat Kelas</Label>
                  <Select onValueChange={(v) => setValue('class', v)} value={classValue || ""}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Pilih Kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VII">Kelas VII</SelectItem>
                      <SelectItem value="VIII">Kelas VIII</SelectItem>
                      <SelectItem value="IX">Kelas IX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="academicYear" className="text-xs font-semibold text-slate-500 uppercase">Tahun Ajaran</Label>
                  <Input id="academicYear" {...register('academicYear')} placeholder="Contoh: 2023/2024" className="h-10" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Wali Kelas</Label>
                  <Select 
                    onValueChange={(v) => {
                      const teacher = teachers.find(t => t.id === v);
                      setValue('homeroomTeacherId', v);
                      setValue('homeroomTeacherName', teacher?.name || '');
                    }} 
                    value={homeroomTeacherId || ""}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Pilih Wali Kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : type === 'subjects' ? (
              <>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name" className="text-xs font-semibold text-slate-500 uppercase">Nama Mata Pelajaran</Label>
                  <Input id="name" {...register('name', { required: true })} placeholder="Contoh: Matematika" className="h-10" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="code" className="text-xs font-semibold text-slate-500 uppercase">Kode Mapel</Label>
                  <Input id="code" {...register('code', { required: true })} placeholder="Contoh: MTK01" className="h-10" />
                </div>
              </>
            ) : type === 'examSchedules' ? (
              <>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Mata Pelajaran</Label>
                  <Select 
                    onValueChange={(v) => {
                      const s = subjects.find(x => x.id === v);
                      setValue('subjectId', v);
                      setValue('subjectName', s?.name || '');
                    }} 
                    value={subjectId || ""}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Pilih Mata Pelajaran" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} <span className="text-[10px] text-slate-400 ml-1">({s.code})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Tingkat Kelas</Label>
                  <Select 
                    onValueChange={(v) => setValue('class', v)} 
                    value={watch('class') || ""}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Pilih Kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Semua">Semua Kelas</SelectItem>
                      <SelectItem value="VII">Kelas VII</SelectItem>
                      <SelectItem value="VIII">Kelas VIII</SelectItem>
                      <SelectItem value="IX">Kelas IX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Rombongan Belajar (Rombel)</Label>
                  <Select 
                    onValueChange={(v) => {
                      const r = rombels.find(x => x.name === v);
                      setValue('rombelName', v);
                      if (r && r.class) {
                        setValue('class', r.class);
                      }
                    }} 
                    value={watch('rombelName') || ""}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Pilih Rombel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Semua">Semua Rombel</SelectItem>
                      {filteredRombels.map((r) => (
                        <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="date" className="text-xs font-semibold text-slate-500 uppercase">Tanggal</Label>
                    <Input id="date" type="date" {...register('date', { required: true })} className="h-10" />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500 uppercase">Ruangan</Label>
                    <Select onValueChange={(v) => setValue('room', v)} value={watch('room') || ""}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Pilih Ruang" />
                      </SelectTrigger>
                      <SelectContent>
                        {examRooms.map((room) => (
                          <SelectItem key={room.id} value={room.name}>{room.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="startTime" className="text-xs font-semibold text-slate-500 uppercase">Jam Mulai</Label>
                    <Input id="startTime" type="time" {...register('startTime')} className="h-10" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="endTime" className="text-xs font-semibold text-slate-500 uppercase">Jam Selesai</Label>
                    <Input id="endTime" type="time" {...register('endTime')} className="h-10" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Pengawas</Label>
                  <Select 
                    onValueChange={(v) => {
                      const t = teachers.find(x => x.id === v);
                      setValue('proctorId', v);
                      setValue('proctorName', t?.name || '');
                    }} 
                    value={proctorId || ""}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Pilih Pengawas" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} <span className="text-[10px] text-slate-400 ml-1">({t.subject})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : type === 'questions' ? (
              <>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Mata Pelajaran</Label>
                  <Select onValueChange={(v) => setValue('subjectId', v)} value={subjectId || ""}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Pilih Mata Pelajaran" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} <span className="text-[10px] text-slate-400 ml-1">({s.code})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Tingkat Kelas</Label>
                  <Select onValueChange={(v) => setValue('class', v)} value={classValue || ""}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Pilih Tingkat Kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VII">Kelas VII</SelectItem>
                      <SelectItem value="VIII">Kelas VIII</SelectItem>
                      <SelectItem value="IX">Kelas IX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="text" className="text-xs font-semibold text-slate-500 uppercase">Pertanyaan</Label>
                  <textarea 
                    id="text" 
                    {...register('text', { required: true })} 
                    rows={4} 
                    className="w-full rounded-md border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Masukkan teks soal di sini..."
                  />
                </div>
                <div className="space-y-4 sm:col-span-2 mt-4">
                   <Label className="text-xs font-bold text-slate-900 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">Opsi Jawaban</Label>
                   {[0, 1, 2, 3].map((idx) => (
                     <div key={idx} className="flex items-center gap-3">
                        <div 
                          onClick={() => setValue('correctOption', idx)}
                          className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center cursor-pointer border-2 transition-all font-bold text-xs shrink-0",
                            correctOption === idx 
                              ? "bg-green-500 border-green-600 text-white shadow-md scale-110" 
                              : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                          )}
                        >
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <Input 
                          placeholder={`Pilihan ${String.fromCharCode(65 + idx)}`}
                          value={options[idx]}
                          onChange={(e) => {
                            const newOptions = [...options];
                            newOptions[idx] = e.target.value;
                            setValue('options', newOptions);
                          }}
                          className={cn("h-10", correctOption === idx && "border-green-300 bg-green-50/30")}
                        />
                     </div>
                   ))}
                </div>
              </>
            ) : type === 'examRooms' ? (
              <>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name" className="text-xs font-semibold text-slate-500 uppercase">Nama Ruangan</Label>
                  <Input id="name" {...register('name', { required: true })} placeholder="Contoh: Ruang 01, R-A1" className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity" className="text-xs font-semibold text-slate-500 uppercase">Kapasitas Siswa</Label>
                  <Input id="capacity" type="number" {...register('capacity', { valueAsNumber: true })} placeholder="Contoh: 20" className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-xs font-semibold text-slate-500 uppercase">Lokasi / Gedung</Label>
                  <Input id="location" {...register('location')} placeholder="Gedung A Lantai 2" className="h-10" />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name" className="text-xs font-semibold text-slate-500 uppercase">Nama Lengkap</Label>
                  <Input id="name" {...register('name', { required: true })} placeholder="Masukkan nama lengkap sesuai ijazah" className="h-10" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="idNumber" className="text-xs font-semibold text-slate-500 uppercase">
                    {isStudentType ? 'NIS' : 'NIP/ID Pegawai'}
                  </Label>
                  <Input 
                    id="idNumber" 
                    {...register(isStudentType ? 'nis' : 'employeeId', { required: true })} 
                    placeholder={isStudentType ? 'Nomor Induk Siswa' : 'NIP atau ID Pegawai'} 
                    className="h-10"
                  />
                </div>

                {isStudentType && (
                  <div className="space-y-2">
                    <Label htmlFor="nisn" className="text-xs font-semibold text-slate-500 uppercase">NISN</Label>
                    <Input 
                      id="nisn" 
                      {...register('nisn')} 
                      placeholder="Nomor Induk Siswa Nasional" 
                      className="h-10"
                    />
                  </div>
                )}

                {isStudentType && (
                  <div className="space-y-2">
                    <Label htmlFor="participantNumber" className="text-xs font-semibold text-slate-500 uppercase">No. Peserta</Label>
                    <Input 
                      id="participantNumber" 
                      {...register('participantNumber')} 
                      placeholder="Nomor Peserta Ujian" 
                      className="h-10"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Jenis Kelamin</Label>
                  <Select onValueChange={(v) => setValue('gender', v)} value={gender || ""}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Pilih Jenis Kelamin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">L</SelectItem>
                      <SelectItem value="Female">P</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pob" className="text-xs font-semibold text-slate-500 uppercase">Tempat Lahir</Label>
                  <Input id="pob" {...register('pob')} placeholder="Kota Lahir" className="h-10" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob" className="text-xs font-semibold text-slate-500 uppercase">Tanggal Lahir</Label>
                  <Input id="dob" type="date" {...register('dob')} className="h-10" />
                </div>

                {isStudentType ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="class" className="text-xs font-semibold text-slate-500 uppercase">Kelas</Label>
                      <Select onValueChange={(v) => setValue('class', v)} value={classValue || ''}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Pilih Kelas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Pilih Kelas</SelectItem>
                          {availableClasses.map((cls) => (
                            <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-500 uppercase">Rombel</Label>
                      <Select 
                        onValueChange={(v) => {
                          const rombel = rombels.find(r => r.name === v);
                          setValue('rombel', v);
                          if (rombel) {
                            setValue('class', rombel.class);
                          }
                        }} 
                        value={rombelValue || ""}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Pilih Rombongan Belajar" />
                        </SelectTrigger>
                        <SelectContent>
                          {rombels.map((rombel) => (
                            <SelectItem key={rombel.id} value={rombel.name}>{rombel.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor={type === 'teachers' ? 'subject' : 'position'} className="text-xs font-semibold text-slate-500 uppercase">
                      {type === 'teachers' ? 'Mata Pelajaran' : 'Jabatan'}
                    </Label>
                    <Input
                      id={type === 'teachers' ? 'subject' : 'position'}
                      {...register(type === 'teachers' ? 'subject' : 'position', { required: true })}
                      placeholder={type === 'teachers' ? 'Contoh: Matematika' : 'Contoh: Bendahara'}
                      className="h-10"
                    />
                  </div>
                )}

                {type === 'teachers' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="nuptk" className="text-xs font-semibold text-slate-500 uppercase">NUPTK</Label>
                      <Input 
                        id="nuptk" 
                        {...register('nuptk')} 
                        placeholder="Nomor Unik Pendidik & Tenaga Kependidikan" 
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position" className="text-xs font-semibold text-slate-500 uppercase">Jabatan</Label>
                      <Input 
                        id="position" 
                        {...register('position')} 
                        placeholder="Contoh: Wali Kelas, Pembina OSIS, dll" 
                        className="h-10"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

        {/* SECTION: KONTAK & ALAMAT */}
        {['students', 'teachers', 'staff'].includes(type) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">2</div>
              <h3 className="text-sm font-bold tracking-wide text-slate-900 uppercase">Kontak & Alamat</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-semibold text-slate-500 uppercase">No. Telepon/HP</Label>
                <Input id="phone" {...register('phone')} placeholder="0812..." className="h-10" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-500 uppercase">Email</Label>
                <Input id="email" type="email" {...register('email')} placeholder="email@example.com" className="h-10" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address" className="text-xs font-semibold text-slate-500 uppercase">Alamat Domisili</Label>
                <Input id="address" {...register('address')} placeholder="Alamat Lengkap Saat Ini" className="h-10" />
              </div>
            </div>
          </div>
        )}

        {type === 'students' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">3</div>
              <h3 className="text-sm font-bold tracking-wide text-slate-900 uppercase">Data Orang Tua</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
              <div className="space-y-2">
                <Label htmlFor="fatherName" className="text-xs font-semibold text-slate-500 uppercase">Nama Ayah</Label>
                <Input id="fatherName" {...register('fatherName')} placeholder="Nama Ayah" className="h-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fatherPhone" className="text-xs font-semibold text-slate-500 uppercase">No. Telp Ayah</Label>
                <Input id="fatherPhone" {...register('fatherPhone')} placeholder="0812..." className="h-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="motherName" className="text-xs font-semibold text-slate-500 uppercase">Nama Ibu</Label>
                <Input id="motherName" {...register('motherName')} placeholder="Nama Ibu" className="h-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="motherPhone" className="text-xs font-semibold text-slate-500 uppercase">No. Telp Ibu</Label>
                <Input id="motherPhone" {...register('motherPhone')} placeholder="0812..." className="h-10" />
              </div>
            </div>
          </div>
        )}

        {/* SECTION: MANAJEMEN SISWA DI RUANGAN */}
        {type === 'examRooms' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">3</div>
              <h3 className="text-sm font-bold tracking-wide text-slate-900 uppercase">Manajemen Peserta Ujian</h3>
            </div>
            
            {/* Student Selection */}
            <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm space-y-4">
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-500 uppercase">Pilih Kelas</Label>
                      <Select value={selectedClass} onValueChange={(value) => {
                        setSelectedClass(value);
                        setSelectedRombel('all');
                      }}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Semua Kelas" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64 w-full min-w-[220px]">
                          <SelectItem value="all">Semua Kelas</SelectItem>
                          {availableClasses.map((kelas) => (
                            <SelectItem key={kelas} value={kelas}>{kelas}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-500 uppercase">Pilih Rombel</Label>
                      <Select value={selectedRombel} onValueChange={setSelectedRombel}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Semua Rombel" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64 w-full min-w-[220px]">
                          <SelectItem value="all">Semua Rombel</SelectItem>
                          {availableRombels.map((rombel) => (
                            <SelectItem key={rombel} value={rombel}>{rombel}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500 uppercase">Pilih Siswa Peserta Ujian</Label>
                    <Select 
                      value=""
                      onValueChange={(studentId) => {
                        const student = students.find(s => s.id === studentId);
                        if (student && !selectedStudents.some(ss => ss.id === studentId)) {
                          setSelectedStudents([...selectedStudents, student]);
                        }
                      }}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Pilih siswa dari daftar..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-64 w-full min-w-[400px]">
                        {filteredStudentOptions.map((student) => (
                          <SelectItem key={student.id} value={student.id} className="cursor-pointer whitespace-nowrap">
                            {student.name} • {student.nis} • Kelas {student.class} {student.rombel}
                          </SelectItem>
                        ))}
                        {filteredStudentOptions.length === 0 && (
                          <div className="px-4 py-2 text-sm text-slate-500 text-center">Tidak ada siswa sesuai filter</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

              {/* Selected Students List */}
              {selectedStudents.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">
                    Peserta Ujian Terdaftar ({selectedStudents.length}/{students.length})
                  </Label>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedStudents.map((student) => (
                      <div key={student.id} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100 hover:border-blue-200 transition-colors">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{student.name}</div>
                          <div className="text-xs text-slate-500">{student.nis} • Kelas {student.class} {student.rombel}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedStudents(selectedStudents.filter(s => s.id !== student.id))}
                          className="text-red-600 hover:bg-red-100 p-2 rounded transition-colors flex-shrink-0 ml-2"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedStudents.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-sm bg-slate-50/50 rounded border border-dashed border-slate-200">
                  Belum ada siswa yang ditambahkan ke ruangan ini
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t bg-slate-50/50">
        <DialogFooter className="flex flex-row gap-3 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel} className="flex-1 sm:flex-none">Batal</Button>
          <Button type="submit" className="flex-1 sm:flex-none px-8 shadow-md">Simpan Data</Button>
        </DialogFooter>
      </div>
    </form>
  );
}
