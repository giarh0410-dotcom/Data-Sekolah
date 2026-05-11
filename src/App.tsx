import React, { useState, useEffect } from 'react';
import { auth, signIn, logOut, db } from './lib/firebase';
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  subscribeToCollection,
  addRecord,
  updateRecord,
  deleteRecord,
  deleteAllRecords,
  testConnection,
  subscribeToSettings,
  updateSettings,
  updateSecrets
} from './lib/firestore-service';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Users,
  GraduationCap,
  UserSquare2,
  Search,
  Plus,
  LogOut,
  LogIn,
  Edit2,
  Trash2,
  School,
  Eye,
  FileText,
  ExternalLink,
  FileDown,
  FileUp,
  Download,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  Filter,
  Settings as SettingsIcon,
  Upload,
  Image as ImageIcon,
  ChevronDown,
  Database,
  BookOpen,
  LayoutGrid,
  Menu,
  ChevronRight,
  TrendingUp,
  History,
  Clock,
  Scan,
  Smartphone,
  IdCard,
  Printer,
  FileSpreadsheet,
  User as UserIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { QRCodeSVG } from 'qrcode.react';
import { RecordForm } from './components/RecordForm';
import { AttendanceSystem } from './components/AttendanceSystem';
import { CbtPortal } from './components/CbtPortal';
import { exportToExcel } from './lib/export-service';
import { downloadElementAsPdf } from './lib/pdf-service';
import { importFromExcel } from './lib/import-service';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

const formatDateIndo = (dateStr: string) => {
  if (!dateStr) return '-';
  try {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    // Pastikan format YYYY-MM-DD (format standar input date HTML)
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]).toString(); // Hilangkan leading zero jika ada
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${day} ${months[monthIndex]} ${year}`;
      }
    }
    return dateStr; 
  } catch (e) {
    return dateStr;
  }
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [rombels, setRombels] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [examSchedules, setExamSchedules] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [examRooms, setExamRooms] = useState<any[]>([]);
  const [cbtSessions, setCbtSessions] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('students');
  const [isDataManagementOpen, setIsDataManagementOpen] = useState(true);
  const [isAttendanceMenuOpen, setIsAttendanceMenuOpen] = useState(true);
  const [isExamMenuOpen, setIsExamMenuOpen] = useState(false);
  const [isHistoryMenuOpen, setIsHistoryMenuOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);

  useEffect(() => {
    const examTabs = [
      'exam-cbt',
      'exam-schedule',
      'exam-rooms',
      'exam-proctors',
      'exam-subjects',
      'exam-questions',
      'exam-cards',
      'exam-settings',
    ];

    if (examTabs.includes(activeTab)) {
      setIsExamMenuOpen(true);
    }
  }, [activeTab]);
  const [activeExamCardId, setActiveExamCardId] = useState<string | null>(null);
  const [reviewingStudent, setReviewingStudent] = useState<any>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedPersonForCard, setSelectedPersonForCard] = useState<any>(null);
  const [personTypeForCard, setPersonTypeForCard] = useState<'students' | 'teachers' | 'staff'>('students');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [viewingRecord, setViewingRecord] = useState<any>(null);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [isStartSessionDialogOpen, setIsStartSessionDialogOpen] = useState(false);
  const [selectedScheduleForCbt, setSelectedScheduleForCbt] = useState<string>('');
  const [selectedClassForCbt, setSelectedClassForCbt] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedRombel, setSelectedRombel] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [selectedJenjang, setSelectedJenjang] = useState<string>('all');
  const [settings, setSettings] = useState<any>({
    logoUrl: '/logo.png',
    schoolName: 'SMP Islam Modern Al Fakhir',
    principalSignatureUrl: '',
    fonnteToken: '',
    examName: 'Ujian Tengah Semester',
    academicYear: '2023/2024',
    semester: 'Ganjil',
    principalName: '',
    cardWidth: 95,
    cardHeight: 60,
    paperSize: 'A4',
    marginTop: 10,
    marginRight: 0.5,
    marginBottom: 10,
    marginLeft: 0.5
  });
  const [settingsForm, setSettingsForm] = useState<any>({
    logoUrl: '',
    schoolName: '',
    principalSignatureUrl: '',
    fonnteToken: '',
    examName: '',
    academicYear: '',
    semester: '',
    principalName: '',
    cardWidth: 95,
    cardHeight: 60,
    paperSize: 'A4',
    marginTop: 10,
    marginRight: 0.5,
    marginBottom: 10,
    marginLeft: 0.5
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const logoFileInputRef = React.useRef<HTMLInputElement>(null);

  const isAdmin = userProfile?.role === 'admin';

  const cardDimensionStyle = {
    width: settings.cardWidth ? `${settings.cardWidth}mm` : undefined,
    height: settings.cardHeight ? `${settings.cardHeight}mm` : undefined,
    maxWidth: '100%',
  };

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      // Check for redirect result on load
      getRedirectResult(auth).catch((error) => {
        console.error("Redirect result error:", error);
        if (error.code === 'auth/unauthorized-domain') {
          alert(`Domain ini (${window.location.hostname}) belum diizinkan di Firebase Console.`);
        }
      });

      if (u) {
        console.log("Logged in as:", u.email);
        try {
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (!userDoc.exists()) {
            const newProfile = {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName,
              role: u.email === 'smpialfakhir@gmail.com' ? 'admin' : 'viewer',
              createdAt: serverTimestamp()
            };
            await setDoc(doc(db, 'users', u.uid), newProfile);
            setUserProfile(newProfile);
          } else {
            const data = userDoc.data();
            if (u.email === 'smpialfakhir@gmail.com' && data.role !== 'admin') {
              await setDoc(doc(db, 'users', u.uid), { role: 'admin' }, { merge: true });
              data.role = 'admin';
            }
            setUserProfile(data);
          }
        } catch (err: any) {
          console.error("Firestore error during login profile check:", err);
          toast.error("Gagal memuat profil: " + (err.message || "Error database"));
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubSettings = subscribeToSettings((data) => {
      setSettings(prev => ({ ...prev, ...data }));
      // Only update form if it's not open to avoid overwriting user input
      if (!isSettingsOpen) {
        setSettingsForm(prev => ({
          ...prev,
          logoUrl: data.logoUrl || '',
          schoolName: data.schoolName || '',
          examName: data.examName || '',
          academicYear: data.academicYear || '',
          semester: data.semester || '',
          principalName: data.principalName || '',
          principalSignatureUrl: data.principalSignatureUrl || '',
          cardWidth: data.cardWidth || 85,
          cardHeight: data.cardHeight || 54,
          paperSize: data.paperSize || 'A4',
          marginTop: data.marginTop || 15,
          marginRight: data.marginRight || 15,
          marginBottom: data.marginBottom || 15,
          marginLeft: data.marginLeft || 15
        }));
      }
    });

    // Fetch secrets if possibly admin (initial check)
    if (user && isAdmin) {
      getDoc(doc(db, 'settings', 'secrets')).then(snap => {
        if (snap.exists()) {
          const secretData = snap.data();
          setSettings(prev => ({ ...prev, fonnteToken: secretData.fonnteToken }));
          if (!isSettingsOpen) {
            setSettingsForm(prev => ({ ...prev, fonnteToken: secretData.fonnteToken }));
          }
        }
      });
    }

    return () => unsubSettings();
  }, [isSettingsOpen, user, isAdmin]);

  // Sync form when dialog opens
  useEffect(() => {
    if (isSettingsOpen) {
      setSettingsForm({
        logoUrl: settings.logoUrl || '',
        schoolName: settings.schoolName || '',
        principalSignatureUrl: settings.principalSignatureUrl || '',
        fonnteToken: settings.fonnteToken || '',
        examName: settings.examName || '',
        academicYear: settings.academicYear || '',
        semester: settings.semester || '',
        principalName: settings.principalName || '',
        cardWidth: settings.cardWidth || 85,
        cardHeight: settings.cardHeight || 54,
        paperSize: settings.paperSize || 'A4',
        marginTop: settings.marginTop || 15,
        marginRight: settings.marginRight || 15,
        marginBottom: settings.marginBottom || 15,
        marginLeft: settings.marginLeft || 15
      });
    }
  }, [isSettingsOpen, settings]);

  // Auto-deduplicate students by NIS on the fly
  useEffect(() => {
    if (!user || students.length === 0) return;

    const nisMap = new Map<string, any[]>();
    students.forEach(s => {
      if (s.nis) {
        if (!nisMap.has(s.nis)) nisMap.set(s.nis, []);
        nisMap.get(s.nis)!.push(s);
      }
    });

    const toDelete: any[] = [];
    nisMap.forEach((docs) => {
      if (docs.length > 1) {
        docs.sort((a, b) => {
          const aHasNum = (a.participantNumber && a.participantNumber !== "-") ? 1 : 0;
          const bHasNum = (b.participantNumber && b.participantNumber !== "-") ? 1 : 0;
          return bHasNum - aHasNum;
        });
        for (let i = 1; i < docs.length; i++) {
          toDelete.push(docs[i]);
        }
      }
    });

    if (toDelete.length > 0) {
      toDelete.forEach(s => {
        deleteRecord('students', s.id).catch(console.error);
      });
    }
  }, [user, students]);

  useEffect(() => {
    if (user) {
      const unsubStudents = subscribeToCollection('students', setStudents, sortBy, sortOrder);
      const unsubTeachers = subscribeToCollection('teachers', setTeachers, sortBy, sortOrder);
      const unsubStaff = subscribeToCollection('staff', setStaff, sortBy, sortOrder);
      const unsubRombels = subscribeToCollection('rombels', setRombels, 'name', 'asc');
      const unsubAttendance = subscribeToCollection('attendance', setAttendance, 'timestamp', 'desc');
      const unsubSubjects = subscribeToCollection('subjects', setSubjects, 'name', 'asc');
      const unsubExamSchedules = subscribeToCollection('examSchedules', setExamSchedules, 'date', 'asc');
      const unsubQuestions = subscribeToCollection('questions', setQuestions, 'subjectId', 'asc');
      const unsubExamRooms = subscribeToCollection('examRooms', setExamRooms, 'name', 'asc');
      const unsubCbtSessions = subscribeToCollection('cbtSessions', setCbtSessions, 'startedAt', 'desc');
      const unsubExamResults = subscribeToCollection('examResults', setExamResults, 'finishTime', 'desc');
      return () => {
        unsubStudents();
        unsubTeachers();
        unsubStaff();
        unsubRombels();
        unsubAttendance();
        unsubSubjects();
        unsubExamSchedules();
        unsubQuestions();
        unsubExamRooms();
        unsubCbtSessions();
        unsubExamResults();
      };
    }
  }, [user, sortBy, sortOrder]);

  const activeData = activeTab === 'students' ? students :
    activeTab === 'teachers' ? teachers :
      activeTab === 'rombels' ? rombels :
        activeTab === 'staff' ? staff :
          activeTab === 'exam-subjects' ? subjects :
            activeTab === 'exam-schedule' ? examSchedules :
              activeTab === 'exam-questions' ? questions :
                activeTab === 'exam-rooms' ? examRooms :
                  activeTab === 'exam-cbt' ? cbtSessions :
                    activeTab === 'attendance-history-students' ? attendance.filter(a => a.role === 'student') :
                      activeTab === 'attendance-history-teachers' ? attendance.filter(a => a.role === 'teacher') :
                        activeTab === 'attendance-history-staff' ? attendance.filter(a => a.role === 'staff') :
                          activeTab === 'attendance' || activeTab === 'attendance-scan' || activeTab === 'attendance-history' ? attendance : [];
  const maleCount = (activeTab === 'dashboard' ? students : activeData).filter(item => item.gender === 'Male').length;
  const femaleCount = (activeTab === 'dashboard' ? students : activeData).filter(item => item.gender === 'Female').length;

  const getCollectionPath = (tab: string) => {
    if (tab.startsWith('attendance-history') || tab === 'attendance-scan') {
      return 'attendance';
    }
    if (tab === 'exam-subjects') return 'subjects';
    if (tab === 'exam-schedule' || tab === 'exam-schedule-card') return 'examSchedules';
    if (tab === 'exam-questions') return 'questions';
    if (tab === 'exam-rooms') return 'examRooms';
    if (tab === 'exam-cbt') return 'cbtSessions';
    return tab;
  };

  const getPrintPageSize = (paperSize: string) => {
    switch (paperSize) {
      case 'F4':
        return '210mm 330mm';
      case 'A4':
      default:
        return 'A4';
    }
  };

  const createPrintNode = (source: HTMLElement, id: string, cardWidth?: string, cardHeight?: string, marginTop?: string, marginRight?: string, marginBottom?: string, marginLeft?: string) => {
    const clone = source.cloneNode(true) as HTMLElement;
    const wrapper = document.createElement('div');
    wrapper.id = id;
    wrapper.style.position = 'fixed';
    wrapper.style.top = '0';
    wrapper.style.left = '0';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.zIndex = '999999';
    wrapper.style.background = '#fff';
    wrapper.style.padding = '0';
    wrapper.style.margin = '0';
    wrapper.style.overflow = 'visible';
    if (cardWidth) wrapper.style.setProperty('--print-card-width', cardWidth);
    if (cardHeight) wrapper.style.setProperty('--print-card-height', cardHeight);
    if (marginTop) wrapper.style.setProperty('--print-margin-top', marginTop);
    if (marginRight) wrapper.style.setProperty('--print-margin-right', marginRight);
    if (marginBottom) wrapper.style.setProperty('--print-margin-bottom', marginBottom);
    if (marginLeft) wrapper.style.setProperty('--print-margin-left', marginLeft);
    clone.style.width = '100%';
    clone.style.maxWidth = '100%';
    clone.style.boxSizing = 'border-box';
    wrapper.appendChild(clone);
    return wrapper;
  };

  const printElement = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const printNode = createPrintNode(
      element,
      'print-card-wrapper',
      settings.cardWidth ? `${settings.cardWidth}mm` : undefined,
      settings.cardHeight ? `${settings.cardHeight}mm` : undefined,
      settings.marginTop ? `${settings.marginTop}mm` : undefined,
      settings.marginRight ? `${settings.marginRight}mm` : undefined,
      settings.marginBottom ? `${settings.marginBottom}mm` : undefined,
      settings.marginLeft ? `${settings.marginLeft}mm` : undefined
    );
    const style = document.createElement('style');
    style.id = 'print-card-style';
    style.textContent = `
      @page { size: ${getPrintPageSize(settings.paperSize || 'A4')}; margin: 0; }
      @media print {
        body > *:not(#print-card-wrapper) { display: none !important; }
        #print-card-wrapper { 
          position: static !important; 
          width: 100% !important; 
          height: auto !important; 
          box-sizing: border-box !important;
          padding-top: var(--print-margin-top, 10mm) !important;
          padding-right: var(--print-margin-right, 0.5mm) !important;
          padding-bottom: var(--print-margin-bottom, 10mm) !important;
          padding-left: var(--print-margin-left, 0.5mm) !important;
        }
        #print-card-wrapper * { visibility: visible !important; }
      }
    `;

    document.body.appendChild(printNode);
    document.head.appendChild(style);

    window.print();

    setTimeout(() => {
      if (style.parentNode) style.parentNode.removeChild(style);
      if (printNode.parentNode) printNode.parentNode.removeChild(printNode);
    }, 500);
  };

  const printAllCards = () => {
    const container = document.getElementById('exam-cards-container');
    if (!container) return;

    const printNode = createPrintNode(
      container,
      'print-card-wrapper',
      settings.cardWidth ? `${settings.cardWidth}mm` : undefined,
      settings.cardHeight ? `${settings.cardHeight}mm` : undefined,
      settings.marginTop ? `${settings.marginTop}mm` : undefined,
      settings.marginRight ? `${settings.marginRight}mm` : undefined,
      settings.marginBottom ? `${settings.marginBottom}mm` : undefined,
      settings.marginLeft ? `${settings.marginLeft}mm` : undefined
    );
    const style = document.createElement('style');
    style.id = 'print-card-style-all';
    style.textContent = `
      @page { size: ${getPrintPageSize(settings.paperSize || 'A4')}; margin: 0; }
      @media print {
        body > *:not(#print-card-wrapper) { display: none !important; }
        #print-card-wrapper { 
          position: static !important; 
          width: 100% !important; 
          height: auto !important; 
          box-sizing: border-box !important;
          padding-top: var(--print-margin-top, 10mm) !important;
          padding-right: var(--print-margin-right, 0.5mm) !important;
          padding-bottom: var(--print-margin-bottom, 10mm) !important;
          padding-left: var(--print-margin-left, 0.5mm) !important;
        }
        #print-card-wrapper * { visibility: visible !important; }
        #exam-cards-container {
          display: flex !important;
          flex-wrap: wrap !important;
          justify-content: flex-start !important;
          gap: 1mm !important;
        }
      }
    `;

    document.body.appendChild(printNode);
    document.head.appendChild(style);

    window.print();

    setTimeout(() => {
      if (style.parentNode) style.parentNode.removeChild(style);
      if (printNode.parentNode) printNode.parentNode.removeChild(printNode);
    }, 500);
  };

  const handleAddOrUpdate = async (data: any) => {
    const path = getCollectionPath(activeTab);
    try {
      // Remove undefined values which crash Firebase
      const cleanData = JSON.parse(JSON.stringify(data));

      if (editingRecord) {
        await updateRecord(path, editingRecord.id, cleanData);
        toast.success('Data berhasil diperbarui');
      } else {
        // Prevent accidental duplicates based on NIS, NIP/ID for students/teachers
        if (activeTab === 'students' && cleanData.nis && students.some(s => s.nis === cleanData.nis)) {
          toast.error('Siswa dengan NIS ini sudah terdaftar!');
          return;
        }
        if (activeTab === 'teachers' && cleanData.employeeId && teachers.some(t => t.employeeId === cleanData.employeeId)) {
          toast.error('Guru dengan NIP/ID ini sudah terdaftar!');
          return;
        }

        await addRecord(path, cleanData);
        toast.success('Data berhasil ditambahkan');
      }
      setIsDialogOpen(false);
      setEditingRecord(null);
    } catch (error: any) {
      console.error("Save Error:", error);
      toast.error(`Gagal menyimpan data: ${error?.message || ''}`);
    }
  };

  const handleStartCbtSession = async () => {
    if (!selectedScheduleForCbt) {
      toast.error('Pilih jadwal ujian terlebih dahulu');
      return;
    }

    const schedule = examSchedules.find(s => s.id === selectedScheduleForCbt);
    if (!schedule) return;

    const token = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Filter students by rombel name if defined in schedule
    const isGeneralExam = !schedule.rombelName || schedule.rombelName === 'Semua' || schedule.rombelName === 'Umum';

    const targetStudents = isGeneralExam
      ? students
      : students.filter(s => s.rombel === schedule.rombelName || s.class === schedule.rombelName);

    const newSession = {
      examScheduleId: schedule.id,
      subjectName: schedule.subjectName,
      rombelName: schedule.rombelName || 'Umum',
      token,
      isActive: true,
      startedAt: new Date().toISOString(),
      durationMinutes: 90,
      studentCount: targetStudents.length,
      completedCount: 0
    };

    try {
      await addRecord('cbtSessions', newSession);
      toast.success('Sesi CBT berhasil dimulai. Token: ' + token);
      setIsStartSessionDialogOpen(false);
      setSelectedScheduleForCbt('');
    } catch (error) {
      toast.error('Gagal memulai sesi CBT');
    }
  };

  const handleStopCbtSession = async (sessionId: string) => {
    try {
      await updateRecord('cbtSessions', sessionId, {
        isActive: false,
        endedAt: new Date().toISOString()
      });
      toast.success('Sesi CBT telah dihentikan');
    } catch (error) {
      toast.error('Gagal menghentikan sesi');
    }
  };

  const handleAttendanceAdded = async (record: any) => {
    try {
      const docRef = await addRecord('attendance', record);
      return docRef;
    } catch (error) {
      console.error("Error saving attendance record:", error);
      return null;
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const appData: any = {
      schoolName: settingsForm.schoolName,
    };

    const secretData: any = {
      fonnteToken: settingsForm.fonnteToken,
    };

    if (logoPreview) {
      appData.logoUrl = logoPreview;
    } else {
      appData.logoUrl = settingsForm.logoUrl;
    }

    try {
      await updateSettings(appData);
      // Save secrets using upsert-capable updateSecrets
      await updateSecrets(secretData);

      toast.success('Pengaturan berhasil diperbarui');
      setIsSettingsOpen(false);
      setLogoPreview(null);
    } catch (error) {
      toast.error('Gagal memperbarui pengaturan');
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit for base64
        toast.error('Ukuran file terlalu besar (maksimal 500KB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = (id: string) => {
    setIdToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!idToDelete) return;
    const path = getCollectionPath(activeTab);
    try {
      await deleteRecord(path, idToDelete);
      toast.success('Data berhasil dihapus');
      setIsDeleteConfirmOpen(false);
      setIdToDelete(null);
    } catch (error) {
      toast.error('Gagal menghapus data');
    }
  };

  const confirmDeleteAll = async () => {
    const path = getCollectionPath(activeTab);
    const loadingToast = toast.loading(`Menghapus semua data ${activeTab}...`);
    try {
      await deleteAllRecords(path);
      toast.success(`Semua data ${activeTab} berhasil dihapus`);
      setIsDeleteAllConfirmOpen(false);
    } catch (error) {
      toast.error('Gagal menghapus semua data');
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const normalize = (value: any) => {
    if (value === null || value === undefined) return '';
    return String(value).trim().toLowerCase();
  };

  const filterData = (data: any[]) => {
    return data.filter(item => {
      const matchesSearch =
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.subjectName?.toLowerCase().includes(search.toLowerCase()) ||
        item.rombelName?.toLowerCase().includes(search.toLowerCase()) ||
        item.rombel?.toLowerCase().includes(search.toLowerCase()) ||
        item.proctorName?.toLowerCase().includes(search.toLowerCase()) ||
        item.studentId?.toLowerCase().includes(search.toLowerCase()) ||
        item.nis?.toLowerCase().includes(search.toLowerCase()) ||
        item.nisn?.toLowerCase().includes(search.toLowerCase()) ||
        item.employeeId?.toLowerCase().includes(search.toLowerCase()) ||
        item.homeroomTeacherName?.toLowerCase().includes(search.toLowerCase());

      const matchesClass = (activeTab === 'students' || activeTab === 'rombels' || activeTab === 'exam-schedule' || activeTab === 'exam-questions' || activeTab === 'exam-cards')
        ? (selectedClass === 'all' || normalize(item.class) === normalize(selectedClass))
        : true;

      const matchesRombel = activeTab === 'students' || activeTab === 'exam-cards'
        ? (selectedRombel === 'all' || normalize(item.rombel) === normalize(selectedRombel))
        : activeTab === 'rombels'
          ? (selectedRombel === 'all' || normalize(item.name) === normalize(selectedRombel))
          : true;

      const matchesGender = activeTab === 'rombels'
        ? true
        : (selectedGender === 'all' || item.gender === selectedGender);

      const matchesJenjang = selectedJenjang === 'all' || item.jenjang === selectedJenjang;

      return matchesSearch && matchesClass && matchesRombel && matchesGender && matchesJenjang;
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const loadingToast = toast.loading(`Mengimpor data ${activeTab}...`);
    try {
      const importType = activeTab;
      const importedData = await importFromExcel(file, importType);

      if (importedData.length === 0) {
        toast.error('Tidak ada data yang ditemukan dalam file atau format tidak sesuai.');
        return;
      }

      let successCount = 0;
      for (const item of importedData) {
        try {
          await addRecord(activeTab, item);
          successCount++;
        } catch (err) {
          console.error('Gagal mengimpor baris:', item.name, err);
        }
      }

      toast.success(`Berhasil mengimpor ${successCount} data ${activeTab}.`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Gagal membaca file Excel. Pastikan format sesuai template.');
    } finally {
      toast.dismiss(loadingToast);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <School className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="mt-4 text-slate-600">Memuat aplikasi...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="border-none shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-white p-1 shadow-sm border border-slate-100 overflow-hidden">
                <img
                  src={settings.logoUrl || "/logo.png"}
                  alt={`Logo ${settings.schoolName}`}
                  className="h-full w-full object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                  }}
                />
                <School className="fallback-icon hidden h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold text-teal-600">{settings.schoolName}</CardTitle>
              <CardDescription>Sistem Informasi Database Sekolah</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={async () => {
                  try {
                    await signIn();
                  } catch (error: any) {
                    console.error("Sign-in error:", error);
                    let msg = error.message || "Error tidak diketahui";
                    if (error.code === 'auth/unauthorized-domain') {
                      msg = `Domain (${window.location.hostname}) belum diizinkan di Firebase Console.`;
                    }
                    alert("Gagal Masuk: " + msg);
                  }
                }} 
                className="w-full py-6 text-lg" 
                size="lg"
              >
                <LogIn className="mr-2 h-5 w-5" />
                Masuk dengan Google
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const uniqueClasses = Array.from(
    new Map(
      [...students.map(s => s.class), ...rombels.map(r => r.class)]
        .filter(Boolean)
        .map((value) => [String(value).trim().toLowerCase(), String(value).trim()])
    ).values()
  ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const uniqueRombels = Array.from(
    new Map(
      [...students.map(s => s.rombel), ...rombels.map(r => r.name)]
        .filter(Boolean)
        .map((value) => [String(value).trim().toLowerCase(), String(value).trim()])
    ).values()
  ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-2xl bg-white p-1.5 shadow-md border border-slate-100 flex items-center justify-center">
            <img
              src={settings.logoUrl || "/logo.png"}
              alt="Logo"
              className="max-h-full max-w-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black leading-none tracking-tighter text-teal-600 uppercase">
              {settings.schoolName.split(' ').slice(-2).join(' ')}
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Database System</span>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 space-y-6 overflow-y-auto pt-4">
        <div className="h-px bg-slate-100 mb-6 mx-2" />
        
        <div className="mt-2">
          <button
            onClick={() => setIsDataManagementOpen(!isDataManagementOpen)}
            className="w-full flex items-center justify-between px-2 mb-2 text-[13px] font-black text-slate-500 uppercase tracking-widest hover:text-primary transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>Manajemen Data</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", !isDataManagementOpen && "-rotate-90")} />
          </button>

          <AnimatePresence initial={false}>
            {isDataManagementOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="space-y-1 overflow-hidden"
              >
                <button
                  onClick={() => setActiveTab('students')}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group ml-2",
                    activeTab === 'students'
                      ? "bg-primary/10 text-primary"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Users className={cn("h-4 w-4", activeTab === 'students' ? "text-primary" : "text-slate-400 group-hover:text-slate-600")} />
                  Data Siswa
                  {activeTab === 'students' && <ChevronRight className="ml-auto h-3 w-3" />}
                </button>
                <button
                  onClick={() => setActiveTab('teachers')}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group ml-2",
                    activeTab === 'teachers'
                      ? "bg-primary/10 text-primary"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <GraduationCap className={cn("h-4 w-4", activeTab === 'teachers' ? "text-primary" : "text-slate-400 group-hover:text-slate-600")} />
                  Data Guru
                  {activeTab === 'teachers' && <ChevronRight className="ml-auto h-3 w-3" />}
                </button>
                <button
                  onClick={() => setActiveTab('staff')}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group ml-2",
                    activeTab === 'staff'
                      ? "bg-primary/10 text-primary"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <UserSquare2 className={cn("h-4 w-4", activeTab === 'staff' ? "text-primary" : "text-slate-400 group-hover:text-slate-600")} />
                  Data Staf
                  {activeTab === 'staff' && <ChevronRight className="ml-auto h-3 w-3" />}
                </button>
                <button
                  onClick={() => setActiveTab('rombels')}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group ml-2",
                    activeTab === 'rombels'
                      ? "bg-primary/10 text-primary"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <BookOpen className={cn("h-4 w-4", activeTab === 'rombels' ? "text-primary" : "text-slate-400 group-hover:text-slate-600")} />
                  Data Rombel
                  {activeTab === 'rombels' && <ChevronRight className="ml-auto h-3 w-3" />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="h-px bg-slate-100 my-4 mx-2" />

          <div className="mt-4">
            <button
              onClick={() => setIsAttendanceMenuOpen(!isAttendanceMenuOpen)}
              className="w-full flex items-center justify-between px-2 mb-2 text-[13px] font-black text-slate-500 uppercase tracking-widest hover:text-primary transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Menu Absensi</span>
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", !isAttendanceMenuOpen && "-rotate-90")} />
            </button>
            <AnimatePresence initial={false}>
              {isAttendanceMenuOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="space-y-1 overflow-hidden"
                >
                  <button
                    onClick={() => setActiveTab('attendance-scan')}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group ml-2",
                      activeTab === 'attendance-scan'
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <Scan className={cn("h-4 w-4", activeTab === 'attendance-scan' ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
                    Terminal Scan
                    {activeTab === 'attendance-scan' && <ChevronRight className="ml-auto h-3 w-3" />}
                  </button>
                  <button
                    onClick={() => setIsHistoryMenuOpen(!isHistoryMenuOpen)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all group ml-2",
                      activeTab.startsWith('attendance-history-')
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <History className={cn("h-4 w-4", activeTab.startsWith('attendance-history-') ? "text-primary" : "text-slate-400 group-hover:text-slate-600")} />
                      <span>Riwayat Absensi</span>
                    </div>
                    <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", isHistoryMenuOpen && "rotate-180")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isHistoryMenuOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-8 space-y-1 mt-1 border-l-2 border-slate-100 pl-2"
                      >
                        <button
                          onClick={() => setActiveTab('attendance-history-students')}
                          className={cn(
                            "w-full py-1.5 px-3 flex items-center gap-2 text-xs rounded-md transition-all",
                            activeTab === 'attendance-history-students' ? "text-primary font-bold bg-blue-50" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                          )}
                        >
                          Riwayat Siswa
                        </button>
                        <button
                          onClick={() => setActiveTab('attendance-history-teachers')}
                          className={cn(
                            "w-full py-1.5 px-3 flex items-center gap-2 text-xs rounded-md transition-all",
                            activeTab === 'attendance-history-teachers' ? "text-primary font-bold bg-blue-50" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                          )}
                        >
                          Riwayat Guru
                        </button>
                        <button
                          onClick={() => setActiveTab('attendance-history-staff')}
                          className={cn(
                            "w-full py-1.5 px-3 flex items-center gap-2 text-xs rounded-md transition-all",
                            activeTab === 'attendance-history-staff' ? "text-primary font-bold bg-blue-50" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                          )}
                        >
                          Riwayat Staf
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-px bg-slate-100 my-4 mx-2" />

          <div className="mt-4">
            <button
              onClick={() => setIsExamMenuOpen(!isExamMenuOpen)}
              className="w-full flex items-center justify-between px-2 mb-2 text-[13px] font-black text-slate-500 uppercase tracking-widest hover:text-primary transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Menu Ujian</span>
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", !isExamMenuOpen && "-rotate-90")} />
            </button>
            <AnimatePresence initial={false}>
              {isExamMenuOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="space-y-1 overflow-hidden pl-2"
                >
                  <button
                    onClick={() => setActiveTab('exam-cbt')}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                      activeTab === 'exam-cbt' ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <Smartphone className="h-4 w-4" />
                    Portal Peserta / CBT
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => setActiveTab('exam-schedule')}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                          activeTab === 'exam-schedule' ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        <Clock className="h-4 w-4" />
                        Jadwal Ujian
                      </button>
                      <button
                        onClick={() => setActiveTab('exam-rooms')}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                          activeTab === 'exam-rooms' ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        <School className="h-4 w-4" />
                        Ruang Ujian
                      </button>
                      <button
                        onClick={() => setActiveTab('exam-proctors')}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                          activeTab === 'exam-proctors' ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        <UserSquare2 className="h-4 w-4" />
                        Daftar Pengawas
                      </button>
                      <button
                        onClick={() => setActiveTab('exam-subjects')}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                          activeTab === 'exam-subjects' ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        <BookOpen className="h-4 w-4" />
                        Mata Pelajaran
                      </button>
                      <button
                        onClick={() => setActiveTab('exam-questions')}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                          activeTab === 'exam-questions' ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        <FileText className="h-4 w-4" />
                        Input Soal
                      </button>
                      <button
                        onClick={() => setActiveTab('exam-cards')}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                          activeTab === 'exam-cards' ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        <IdCard className="h-4 w-4" />
                        Kartu Peserta
                      </button>
                      <button
                        onClick={() => setActiveTab('exam-schedule-card')}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                          activeTab === 'exam-schedule-card' ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Kartu Jadwal
                      </button>
                      <button
                        onClick={() => setActiveTab('exam-settings')}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                          activeTab === 'exam-settings' ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        <SettingsIcon className="h-4 w-4" />
                        Pengaturan Ujian
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Informasi summary removed */}
      </div>

      <div className="p-4 mt-auto border-t border-slate-100 space-y-4">
        <div className="flex items-center gap-3 px-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
            {user.displayName?.charAt(0)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-slate-900 truncate">{user.displayName}</span>
            <span className="text-[10px] text-slate-500 uppercase font-medium">{userProfile?.role || 'Viewer'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="h-9 gap-2 text-xs border-slate-200"
            >
              <SettingsIcon className="h-3.5 w-3.5" />
              Settings
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={logOut}
            className={cn("h-9 gap-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50", !isAdmin && "col-span-2")}
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-72 flex-col fixed inset-y-0 border-r bg-white shadow-sm z-20">
        <SidebarContent />
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col lg:pl-72">
        <nav className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger className="flex items-center justify-center h-9 w-9 rounded-md hover:bg-slate-100 cursor-pointer text-slate-500 transition-colors border-none bg-transparent outline-none">
                  <Menu className="h-5 w-5" />
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                  <SidebarContent />
                </SheetContent>
              </Sheet>

              <div className="flex items-center gap-2">
                <div className="h-10 w-10 overflow-hidden rounded-lg bg-white p-0.5 shadow-sm border border-slate-100 flex items-center justify-center">
                  <img src={settings.logoUrl || "/logo.png"} alt="Logo" className="max-h-full max-w-full object-contain" />
                </div>
                <span className="text-sm font-bold text-slate-900 uppercase tracking-tight truncate max-w-[120px]">
                  {settings.schoolName.split(' ').slice(-1)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="h-8 w-8 text-slate-500">
                  <SettingsIcon className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={logOut} className="h-8 w-8 text-slate-500 hover:text-red-600">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </nav>

        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4">
              <div className="space-y-0.5 sm:space-y-1 text-center md:text-left">
                <h1 className={cn(
                  "text-lg sm:text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter transition-all duration-500",
                  activeTab === 'attendance-scan' && "text-primary"
                )}>
                  {activeTab === 'attendance' ? 'Sistem Absensi' :
                    activeTab === 'attendance-scan' ? 'Terminal Presensi' :
                      activeTab === 'attendance-history' ? 'Semua Riwayat Absensi' :
                        activeTab === 'attendance-history-students' ? 'Riwayat Absensi Siswa' :
                          activeTab === 'attendance-history-teachers' ? 'Riwayat Absensi Guru' :
                            activeTab === 'attendance-history-staff' ? 'Riwayat Absensi Staf' :
                              activeTab === 'students' ? 'Manajemen Kesiswaan' :
                                activeTab === 'teachers' ? 'Manajemen Guru' :
                                  activeTab === 'staff' ? 'Manajemen Staf' :
                                    activeTab === 'exam-subjects' ? 'Manajemen Mata Pelajaran' :
                                      activeTab === 'exam-schedule' ? 'Jadwal Pelaksanaan Ujian' :
                                        activeTab === 'exam-rooms' ? 'Manajemen Ruang Ujian' :
                                          activeTab === 'exam-questions' ? 'Bank Soal Ujian' :
                                            activeTab === 'exam-proctors' ? 'Manajemen Pengawas' :
                                              activeTab === 'exam-cards' ? 'Kartu Peserta Ujian' :
                                                activeTab === 'exam-schedule-card' ? 'Kartu Jadwal Ujian' :
                                                  activeTab === 'exam-settings' ? 'Pengaturan Ujian' :
                                                  activeTab === 'exam-cbt' ? 'Computer Based Test' : 'Manajemen Rombongan Belajar'}
                </h1>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  {activeTab === 'attendance-scan' && <div className="h-3 w-[2px] bg-primary/30" />}
                  <p className={cn(
                    "text-[10px] sm:text-xs md:text-sm text-slate-500 uppercase font-bold tracking-widest",
                    activeTab === 'attendance-scan' && "text-slate-400"
                  )}>{settings.schoolName}</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 bg-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-md group mx-auto md:mx-0">
                <div className="relative">
                  <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-green-500 group-hover:scale-110 transition-transform" />
                  <div className="absolute inset-0 h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-green-400 animate-ping" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none translate-y-[1px]">Sistem Terhubung</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Filter Jenjang:</span>
                  <Select onValueChange={setSelectedJenjang} value={selectedJenjang}>
                    <SelectTrigger className="h-7 w-[100px] text-[10px] font-bold border-none bg-transparent hover:bg-slate-50 transition-colors uppercase tracking-widest">
                      <SelectValue placeholder="Semua" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">SEMUA</SelectItem>
                      <SelectItem value="SD">SD</SelectItem>
                      <SelectItem value="SMP">SMP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </header>
            {activeTab === 'attendance-scan' ? (
              <div className="space-y-8">
                <AttendanceSystem
                  students={students}
                  teachers={teachers}
                  staff={staff}
                  onAttendanceAdded={handleAttendanceAdded}
                  isAdmin={isAdmin}
                />
              </div>
            ) : (activeTab === 'attendance-history' || activeTab.startsWith('attendance-history-')) ? (
              <div className="space-y-8">
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-white border-b flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold">
                        {activeTab === 'attendance-history-students' ? 'Riwayat Absensi Siswa' :
                          activeTab === 'attendance-history-teachers' ? 'Riwayat Absensi Guru' :
                            activeTab === 'attendance-history-staff' ? 'Riwayat Absensi Staf' : 'Riwayat Absensi Lengkap'}
                      </CardTitle>
                      <CardDescription>Daftar hadir harian otomatis</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => exportToExcel(activeData, 'attendance')}>
                      <FileDown className="mr-2 h-4 w-4" /> Export Excel
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <DataTable
                      data={activeData}
                      students={students}
                      type="attendance"
                      isAdmin={isAdmin}
                      onEdit={(r: any) => { setEditingRecord(r); setIsDialogOpen(true); }}
                      onDelete={handleDelete}
                      onAdd={() => { setEditingRecord(null); setIsDialogOpen(true); }}
                      onView={(r: any) => { setViewingRecord(r); setIsDetailOpen(true); }}
                    />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-8">
                {!activeTab.startsWith('exam-') && (
                  <div className="mb-8 grid gap-4 md:grid-cols-4">
                    <div className="md:col-span-3 grid gap-3 grid-cols-1 sm:grid-cols-3">
                      <Card className="border-none shadow-sm bg-white">
                        <CardContent className="flex items-center gap-3 p-4 sm:p-6">
                          <div className="rounded-full bg-blue-100 p-2 sm:p-3 text-blue-600">
                            <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-slate-500">Total Siswa</p>
                            <p className="text-xl sm:text-2xl font-bold">{students.length}</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-none shadow-sm bg-white">
                        <CardContent className="flex items-center gap-3 p-4 sm:p-6">
                          <div className="rounded-full bg-green-100 p-2 sm:p-3 text-green-600">
                            <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-slate-500">Total Guru</p>
                            <p className="text-xl sm:text-2xl font-bold">{teachers.length}</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-none shadow-sm bg-white">
                        <CardContent className="flex items-center justify-between p-4 sm:p-6">
                          <div className="flex items-center gap-3">
                            <div className="rounded-full bg-orange-100 p-2 sm:p-3 text-orange-600">
                              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm font-medium text-slate-500">Rasio JK ({activeTab === 'students' ? 'Siswa' : activeTab === 'teachers' ? 'Guru' : 'Staf'})</p>
                              <div className="flex items-baseline gap-2">
                                <p className="text-xl sm:text-2xl font-bold">{maleCount}</p>
                                <span className="text-[10px] font-bold text-blue-500 uppercase">L</span>
                                <span className="text-slate-300">/</span>
                                <p className="text-xl sm:text-2xl font-bold">{femaleCount}</p>
                                <span className="text-[10px] font-bold text-pink-500 uppercase">P</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="border-none shadow-sm bg-gradient-to-br from-primary to-primary/90 text-primary-foreground">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-70">Aksi Cepat</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 grid grid-cols-1 gap-2">
                        {isAdmin ? (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="w-full justify-start bg-white/10 hover:bg-white/20 border-none text-white transition-all hover:translate-x-1"
                              onClick={() => { setActiveTab('students'); setEditingRecord(null); setIsDialogOpen(true); }}
                            >
                              <Plus className="mr-2 h-4 w-4" /> Input Siswa
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="w-full justify-start bg-white/10 hover:bg-white/20 border-none text-white transition-all hover:translate-x-1"
                              onClick={() => { setActiveTab('teachers'); setEditingRecord(null); setIsDialogOpen(true); }}
                            >
                              <Plus className="mr-2 h-4 w-4" /> Input Guru
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="w-full justify-start bg-white/10 hover:bg-white/20 border-none text-white transition-all hover:translate-x-1"
                              onClick={() => { setActiveTab('staff'); setEditingRecord(null); setIsDialogOpen(true); }}
                            >
                              <Plus className="mr-2 h-4 w-4" /> Input Staf
                            </Button>
                          </>
                        ) : (
                          <p className="text-[10px] opacity-70 italic p-2 leading-tight">Hanya admin yang dapat menambah data baru.</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                <Card className={cn(
                  "border-none shadow-sm overflow-hidden",
                  activeTab === 'exam-cbt' && "bg-transparent shadow-none"
                )}>
                  {activeTab !== 'exam-cbt' && (
                    <CardHeader className="bg-white border-b pb-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <CardTitle className="text-xl font-bold text-slate-900">
                            {activeTab === 'students' ? 'Database Siswa' :
                              activeTab === 'teachers' ? 'Database Guru' :
                                activeTab === 'staff' ? 'Database Staf' :
                                  activeTab === 'rombels' ? 'Data Rombongan Belajar' :
                                    activeTab === 'exam-schedule' ? 'Manajemen Jadwal Ujian' :
                                      activeTab === 'exam-rooms' ? 'Daftar Ruang Ujian' :
                                        activeTab === 'exam-subjects' ? 'Daftar Mata Pelajaran' :
                                          activeTab === 'exam-questions' ? 'Bank Soal Ujian' :
                                            activeTab === 'exam-proctors' ? 'Daftar Pengawas Ujian' :
                                              activeTab === 'exam-cards' ? 'Pencetakan Kartu Ujian' :
                                                activeTab === 'exam-schedule-card' ? 'Kartu Jadwal Ujian' :
                                                  activeTab === 'exam-settings' ? 'Konfigurasi Sistem Ujian' : 'Database Sekolah'}
                          </CardTitle>
                          <CardDescription>
                            {activeTab === 'students' ? 'Kelola semua data siswa aktif' :
                              activeTab === 'teachers' ? 'Kelola data tenaga pendidik' :
                                activeTab === 'staff' ? 'Kelola data staf kependidikan' :
                                  activeTab.startsWith('exam-') ? 'Sistem Manajemen Ujian Terpadu' : 'Kelola data operasional sekolah'}
                          </CardDescription>
                        </div>

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          {/* SEARCH & SORT GROUP */}
                          <div className="flex flex-1 items-center gap-2">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <Input
                                placeholder="Cari data..."
                                className="pl-10 w-full lg:w-64 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                              />
                            </div>
                          </div>

                          {activeTab !== 'exam-schedule' && activeTab !== 'exam-questions' && activeTab !== 'exam-cards' && activeTab !== 'exam-settings' && (
                            <>
                              {(activeTab === 'students' || activeTab === 'rombels') && (
                                <div className="flex items-center gap-2">
                                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                                    <SelectTrigger className="w-full sm:w-[140px] h-10 bg-slate-50 border-slate-200">
                                      <SelectValue placeholder="Semua Kelas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">Semua Kelas</SelectItem>
                                      {uniqueClasses.map((grade) => (
                                        <SelectItem key={grade} value={grade}>Kelas {grade}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              {activeTab === 'students' && (
                                <div className="flex items-center gap-2">
                                  <Select value={selectedRombel} onValueChange={setSelectedRombel}>
                                    <SelectTrigger className="w-full sm:w-[160px] h-10 bg-slate-50 border-slate-200">
                                      <SelectValue placeholder="Semua Rombel" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">Semua Rombel</SelectItem>
                                      {uniqueRombels.map((rombel) => (
                                        <SelectItem key={rombel} value={rombel}>{rombel}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Select value={selectedGender} onValueChange={setSelectedGender}>
                                  <SelectTrigger className="w-full sm:w-[120px] h-10 bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="Gender" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Semua JK</SelectItem>
                                    <SelectItem value="Male">L</SelectItem>
                                    <SelectItem value="Female">P</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* ADMIN ACTIONS BAR */}
                      {isAdmin && activeTab !== 'exam-proctors' && activeTab !== 'exam-cards' && activeTab !== 'exam-settings' && (
                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1 bg-blue-50/50 p-1 rounded-md border border-blue-100">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => exportToExcel([], activeTab, true)}
                                className="text-blue-700 hover:bg-white hover:text-blue-800 h-8 px-3"
                              >
                                <Download className="mr-2 h-3.5 w-3.5" />
                                Template
                              </Button>
                              <div className="w-px h-4 bg-blue-200 mx-1" />
                              <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImport}
                                accept=".xlsx, .xls"
                                className="hidden"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-blue-700 hover:bg-white hover:text-blue-800 h-8 px-3"
                              >
                                <FileUp className="mr-2 h-3.5 w-3.5" />
                                Import
                              </Button>
                              <div className="w-px h-4 bg-blue-200 mx-1" />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  let exportData = activeData;
                                  if (activeTab === 'exam-rooms') {
                                    exportData = activeData.map((r: any) => ({
                                      ...r,
                                      studentsInRoom: (r.studentsInRoom || []).map((s: any) => students.find((st: any) => st.id === s.id) || s)
                                    }));
                                  }
                                  exportToExcel(exportData, activeTab);
                                }}
                                className="text-blue-700 hover:bg-white hover:text-blue-800 h-8 px-3"
                              >
                                <FileDown className="mr-2 h-3.5 w-3.5" />
                                Export
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsDeleteAllConfirmOpen(true)}
                              className="text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700 h-9 px-4"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Hapus Semua
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => { setEditingRecord(null); setIsDialogOpen(true); }}
                              className="bg-primary hover:bg-primary/90 shadow-md h-9 px-4"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Tambah Data
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardHeader>
                  )}
                  <CardContent className={cn(activeTab === 'exam-cbt' && "p-0")}>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeTab}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <TabsContent value="students" className="mt-0">
                            <DataTable
                              data={filterData(students)}
                              students={students}
                              type="students"
                              isAdmin={isAdmin}
                              onEdit={(r) => { setEditingRecord(r); setIsDialogOpen(true); }}
                              onDelete={handleDelete}
                              onAdd={() => { setEditingRecord(null); setIsDialogOpen(true); }}
                              onView={(r) => { setViewingRecord(r); setIsDetailOpen(true); }}
                              onPrintCard={(r) => { setSelectedPersonForCard(r); setPersonTypeForCard('students'); setIsCardDialogOpen(true); }}
                            />
                          </TabsContent>
                          <TabsContent value="teachers" className="mt-0">
                            <DataTable
                              data={filterData(teachers)}
                              students={students}
                              type="teachers"
                              isAdmin={isAdmin}
                              onEdit={(r) => { setEditingRecord(r); setIsDialogOpen(true); }}
                              onDelete={handleDelete}
                              onAdd={() => { setEditingRecord(null); setIsDialogOpen(true); }}
                              onView={(r) => { setViewingRecord(r); setIsDetailOpen(true); }}
                              onPrintCard={(r) => { setSelectedPersonForCard(r); setPersonTypeForCard('teachers'); setIsCardDialogOpen(true); }}
                            />
                          </TabsContent>
                          <TabsContent value="staff" className="mt-0">
                            <DataTable
                              data={filterData(staff)}
                              students={students}
                              type="staff"
                              isAdmin={isAdmin}
                              onEdit={(r) => { setEditingRecord(r); setIsDialogOpen(true); }}
                              onDelete={handleDelete}
                              onAdd={() => { setEditingRecord(null); setIsDialogOpen(true); }}
                              onView={(r) => { setViewingRecord(r); setIsDetailOpen(true); }}
                              onPrintCard={(r) => { setSelectedPersonForCard(r); setPersonTypeForCard('staff'); setIsCardDialogOpen(true); }}
                            />
                          </TabsContent>
                          <TabsContent value="rombels" className="mt-0">
                            <DataTable
                              data={filterData(rombels)}
                              students={students}
                              type="rombels"
                              isAdmin={isAdmin}
                              onEdit={(r) => { setEditingRecord(r); setIsDialogOpen(true); }}
                              onDelete={handleDelete}
                              onAdd={() => { setEditingRecord(null); setIsDialogOpen(true); }}
                              onView={(r) => { setViewingRecord(r); setIsDetailOpen(true); }}
                            />
                          </TabsContent>
                          <TabsContent value="exam-subjects" className="mt-0">
                            <DataTable
                              data={subjects}
                              students={students}
                              type="subjects"
                              isAdmin={isAdmin}
                              onEdit={(r) => { setEditingRecord(r); setIsDialogOpen(true); }}
                              onDelete={(id) => { setIdToDelete(id); setIsDeleteConfirmOpen(true); }}
                              onAdd={() => { setEditingRecord(null); setIsDialogOpen(true); }}
                            />
                          </TabsContent>
                          <TabsContent value="exam-schedule" className="mt-0">
                            <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center">
                              <div className="w-full sm:w-48">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Filter Kelas</Label>
                                <Select onValueChange={setSelectedClass} value={selectedClass}>
                                  <SelectTrigger className="h-10 bg-white">
                                    <SelectValue placeholder="Semua Tingkat" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Semua Tingkat</SelectItem>
                                    <SelectItem value="VII">Kelas VII</SelectItem>
                                    <SelectItem value="VIII">Kelas VIII</SelectItem>
                                    <SelectItem value="IX">Kelas IX</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DataTable
                              data={filterData(examSchedules)}
                              students={students}
                              type="examSchedules"
                              isAdmin={isAdmin}
                              onEdit={(r) => { setEditingRecord(r); setIsDialogOpen(true); }}
                              onDelete={(id) => { setIdToDelete(id); setIsDeleteConfirmOpen(true); }}
                              onAdd={() => { setEditingRecord(null); setIsDialogOpen(true); }}
                            />
                          </TabsContent>
                          <TabsContent value="exam-rooms" className="mt-0">
                            <DataTable
                              data={examRooms}
                              students={students}
                              type="examRooms"
                              isAdmin={isAdmin}
                              onEdit={(r) => { setEditingRecord(r); setIsDialogOpen(true); }}
                              onDelete={(id) => { setIdToDelete(id); setIsDeleteConfirmOpen(true); }}
                              onAdd={() => { setEditingRecord(null); setIsDialogOpen(true); }}
                            />
                          </TabsContent>
                          <TabsContent value="exam-proctors" className="mt-0">
                            <DataTable
                              data={teachers}
                              students={students}
                              type="teachers"
                              isAdmin={isAdmin}
                              onView={(r) => { setViewingRecord(r); setIsDetailOpen(true); }}
                            />
                          </TabsContent>
                          <TabsContent value="exam-questions" className="mt-0">
                            <DataTable
                              data={questions}
                              students={students}
                              type="questions"
                              isAdmin={isAdmin}
                              onEdit={(r) => { setEditingRecord(r); setIsDialogOpen(true); }}
                              onDelete={(id) => { setIdToDelete(id); setIsDeleteConfirmOpen(true); }}
                              onAdd={() => { setEditingRecord(null); setIsDialogOpen(true); }}
                            />
                          </TabsContent>
                          <TabsContent value="exam-cards" className="mt-0">
                            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 no-print">
                              <div>
                                <h3 className="text-lg font-bold">Kartu Peserta Ujian</h3>
                                <p className="text-sm text-slate-500">Dihasilkan otomatis untuk semua siswa yang terdaftar</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="w-40">
                                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Filter Kelas</Label>
                                  <Select onValueChange={setSelectedClass} value={selectedClass}>
                                    <SelectTrigger className="h-9 bg-white text-xs">
                                      <SelectValue placeholder="Semua Kelas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">Semua Kelas</SelectItem>
                                      {uniqueClasses.map((grade) => (
                                        <SelectItem key={grade} value={grade}>Kelas {grade}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="w-40">
                                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Filter Rombel</Label>
                                  <Select onValueChange={setSelectedRombel} value={selectedRombel}>
                                    <SelectTrigger className="h-9 bg-white text-xs">
                                      <SelectValue placeholder="Semua Rombel" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">Semua Rombel</SelectItem>
                                      {uniqueRombels.map((rombel) => (
                                        <SelectItem key={rombel} value={rombel}>{rombel}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button
                                  onClick={printAllCards}
                                  className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 px-4 shadow-md transition-all active:scale-95"
                                >
                                  <Printer className="mr-2 h-4 w-4" /> Cetak Semua
                                </Button>
                              </div>
                            </div>
                            <div id="exam-cards-container" className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20 print:gap-4 print:p-0">
                              {filterData(students).map(student => (
                                <div
                                  key={student.id}
                                  id={`exam-card-${student.id}`}
                                  className={cn(
                                    "exam-card-print relative w-full aspect-[1.58/1] bg-white border-[6px] border-double border-black overflow-hidden flex flex-col p-4 print:shadow-none print:m-0 print:break-inside-avoid group",
                                    activeExamCardId === student.id ? "active-print" : ""
                                  )}
                                  style={cardDimensionStyle}
                                >
                                  {/* Individual Download Button - Hidden on Print/Export */}
                                  <div className="absolute top-2 right-2 flex gap-1 no-print no-export opacity-0 group-hover:opacity-100 transition-opacity z-10 transition-all duration-200">
                                    <Button
                                      size="icon"
                                      variant="secondary"
                                      className="h-7 w-7 bg-white shadow-sm border hover:bg-slate-50"
                                      onClick={() => { setReviewingStudent(student); setIsReviewDialogOpen(true); }}
                                      title="Review / Preview"
                                    >
                                      <Eye className="h-4 w-4 text-primary" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="secondary"
                                      className="h-7 w-7 bg-white shadow-sm border hover:bg-slate-50"
                                      onClick={() => printElement(`exam-card-${student.id}`)}
                                      title="Cetak Kartu"
                                    >
                                      <Printer className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </div>

                                  <header className="flex items-start gap-5 border-b-2 border-slate-400 pb-4 mb-4 bg-white">
                                    <div className="w-20 h-20 flex items-center justify-center bg-white shrink-0 rounded-xl border border-slate-200">
                                      <img src={settings.logoUrl || "/logo.png"} alt="Logo" className="max-h-full max-w-full object-contain" />
                                    </div>
                                    <div className="min-w-0 flex-1 flex flex-col justify-center bg-white pt-1">
                                      <h4 className="text-lg sm:text-xl md:text-[22px] font-black uppercase text-teal-600 leading-tight truncate tracking-tight mb-1">{settings.schoolName}</h4>
                                      <h3 className="text-sm sm:text-base font-bold uppercase tracking-[0.2em] text-slate-600 leading-tight truncate mb-1">{settings.examName || 'KARTU PESERTA UJIAN'}</h3>
                                      <p className="text-[12px] sm:text-[14px] font-bold text-slate-500 uppercase leading-tight">T.A {settings.academicYear || '-'} | Semester {settings.semester || '-'}</p>
                                    </div>
                                  </header>
                                  <main className="grid grid-cols-[110px_minmax(0,1fr)] gap-5 bg-white pb-2">
                                    <div className="rounded-2xl overflow-hidden border border-slate-200 h-[140px] w-[110px] flex items-center justify-center bg-slate-50">
                                      {student.photoUrl ? (
                                        <img src={student.photoUrl} className="h-full w-full object-cover" referrerPolicy="no-referrer" alt="Foto peserta" />
                                      ) : (
                                        <UserIcon className="h-8 w-8 text-slate-300" />
                                      )}
                                    </div>
                                    <div className="flex flex-col justify-between min-w-0 bg-white">
                                      <div className="space-y-2.5 text-[12px] leading-snug">
                                        <div className="flex gap-2 items-start">
                                          <div className="w-[145px] text-[13px] font-bold uppercase text-slate-600 shrink-0">Nama Peserta</div>
                                          <div className="flex-1 text-[17px] font-black text-slate-900 uppercase leading-snug">{student.name}</div>
                                        </div>
                                        <div className="flex gap-2 items-start">
                                          <div className="w-[145px] text-[13px] font-bold uppercase text-slate-600 shrink-0">No. Peserta</div>
                                          <div className="flex-1 text-[15px] font-bold text-slate-800">{student.participantNumber || settings.participantNumber?.[student.class] || student.nis || student.nisn || '-'}</div>
                                        </div>
                                        <div className="flex gap-2 items-start">
                                          <div className="w-[145px] text-[13px] font-bold uppercase text-slate-600 shrink-0">NISN</div>
                                          <div className="flex-1 text-[15px] font-bold text-slate-800">{student.nisn || '-'}</div>
                                        </div>
                                        <div className="flex gap-2 items-start">
                                          <div className="w-[145px] text-[13px] font-bold uppercase text-slate-600 shrink-0">Tempat, Tgl Lahir</div>
                                          <div className="flex-1 text-[14px] font-bold text-slate-800">{student.pob || '-'}{student.dob ? `, ${formatDateIndo(student.dob)}` : ''}</div>
                                        </div>
                                        <div className="flex gap-2 items-start">
                                          <div className="w-[145px] text-[13px] font-bold uppercase text-slate-600 shrink-0">Ruang / Kelas</div>
                                          <div className="flex-1 text-[14px] font-bold text-slate-800">{student.class} / {student.rombel}</div>
                                        </div>
                                      </div>
                                    </div>
                                  </main>
                                  <footer className="mt-auto pt-2 border-t-2 border-slate-400 flex flex-col sm:flex-row justify-between items-end gap-2 bg-white">
                                    <div className="text-[10px] font-medium text-slate-400 italic bg-white pb-0.5">
                                      * Kartu ini wajib dibawa saat ujian berlangsung.
                                    </div>
                                    <div className="flex flex-col items-center min-w-[160px] bg-white relative">
                                      <p className="text-[11px] font-bold uppercase text-slate-400 mb-10 z-10 tracking-widest">KEPALA SEKOLAH</p>
                                      {settings.principalSignatureUrl && (
                                        <div className="absolute top-1 w-32 h-20 flex items-center justify-center pointer-events-none z-0">
                                          <img
                                            src={settings.principalSignatureUrl}
                                            className="max-h-full max-w-full object-contain opacity-100 scale-110 -translate-x-2 mix-blend-multiply"
                                            alt="Signature"
                                          />
                                        </div>
                                      )}
                                      <p className="text-[13px] font-black underline text-slate-900 z-10 truncate max-w-[160px] decoration-1 underline-offset-2">
                                        {settings.principalName || '................................'}
                                      </p>
                                    </div>
                                  </footer>
                                </div>
                              ))}
                            </div>
                          </TabsContent>
                          <TabsContent value="exam-schedule-card" className="mt-0">
                            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 no-print">
                              <div>
                                <h3 className="text-lg font-bold">Kartu Jadwal Ujian</h3>
                                <p className="text-sm text-slate-500">Cetak jadwal ujian per rombel atau kelas</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="w-48">
                                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Filter Kelas / Rombel</Label>
                                  <Select onValueChange={setSelectedRombel} value={selectedRombel}>
                                    <SelectTrigger className="h-9 bg-white text-xs">
                                      <SelectValue placeholder="Pilih Rombel" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">Semua Rombel</SelectItem>
                                      {uniqueRombels.map((rombel) => (
                                        <SelectItem key={rombel} value={rombel}>{rombel}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button
                                  onClick={() => {
                                    setEditingRecord(null);
                                    setIsDialogOpen(true);
                                  }}
                                  className="bg-primary hover:bg-primary/90 text-white font-bold h-10 px-4 shadow-md transition-all active:scale-95"
                                >
                                  <Plus className="mr-2 h-4 w-4" /> Tambah Jadwal
                                </Button>
                                <Button
                                  onClick={() => printElement('exam-schedule-print-container')}
                                  className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 px-4 shadow-md transition-all active:scale-95"
                                  disabled={selectedRombel === 'all'}
                                >
                                  <Printer className="mr-2 h-4 w-4" /> Cetak Tunggal
                                </Button>
                                <Button
                                  onClick={() => printElement('exam-schedule-multi-print')}
                                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold h-10 px-4 shadow-md transition-all active:scale-95"
                                  disabled={selectedRombel === 'all'}
                                >
                                  <LayoutGrid className="mr-2 h-4 w-4" /> Cetak Masal (8 Kartu)
                                </Button>
                              </div>
                            </div>

                            {/* Hidden Multi-Print Container */}
                            <div id="exam-schedule-multi-print" className="hidden print:grid grid-cols-2 gap-2 p-2">
                                {Array(8).fill(0).map((_, i) => (
                                    <div key={i} className="exam-card-print bg-white border-[6px] border-double border-black overflow-hidden flex flex-col p-4" style={cardDimensionStyle}>
                                        <div className="text-center mb-0.5 bg-white">
                                            <h2 className="text-[14px] font-black uppercase text-slate-900 tracking-tight leading-none">Jadwal Ujian Sekolah</h2>
                                            <p className="text-[12px] font-bold text-teal-600 uppercase tracking-wider mt-0.5 leading-none">{settings.schoolName}</p>
                                        </div>

                                        <div className="border border-black overflow-hidden rounded-sm flex-1 bg-white">
                                            <table className="w-full border-collapse h-full">
                                                <thead>
                                                    <tr className="bg-[#e2efda] border-b border-black">
                                                        <th className="border-r border-black p-0 text-[10px] font-black uppercase text-slate-800 w-[22%]">Hari / Tanggal</th>
                                                        <th className="border-r border-black p-0 text-[10px] font-black uppercase text-slate-800 w-[23%]">Waktu</th>
                                                        <th className="p-0 text-[10px] font-black uppercase text-slate-800">Mata Pelajaran</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Object.entries(
                                                        examSchedules
                                                            .filter(s => selectedRombel === 'all' || s.rombelName === selectedRombel || s.rombelName === 'Semua')
                                                            .reduce((acc: any, s: any) => {
                                                                const dateStr = new Date(s.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                                                                if (!acc[dateStr]) acc[dateStr] = { date: new Date(s.date), label: dateStr, sessions: [] };
                                                                acc[dateStr].sessions.push(s);
                                                                return acc;
                                                            }, {})
                                                    )
                                                    .sort(([, a]: any, [, b]: any) => a.date.getTime() - b.date.getTime())
                                                    .map(([dateStr, data]: any) => (
                                                        <React.Fragment key={dateStr}>
                                                            {data.sessions
                                                                .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime))
                                                                .map((session: any, sessionIdx: number) => (
                                                                    <tr key={session.id} className="border-b border-black last:border-0">
                                                                        {sessionIdx === 0 && (
                                                                            <td className="border-r border-black p-0 text-[10px] font-bold text-slate-800 align-middle text-center bg-white" rowSpan={data.sessions.length}>
                                                                                {dateStr.split(',').map((part: string, i: number) => (
                                                                                    <div key={i} className={i === 0 ? "text-[11px] font-black leading-none" : "text-[10px] text-slate-700 font-bold leading-none mt-0.5"}>
                                                                                        {part.trim()}{i === 0 ? ',' : ''}
                                                                                    </div>
                                                                                ))}
                                                                            </td>
                                                                        )}
                                                                        <td className="border-r border-black p-0 text-[9px] font-bold text-slate-700 text-center align-middle leading-none">
                                                                            {session.startTime} - {session.endTime}
                                                                        </td>
                                                                        <td className="p-0 text-[10px] font-black text-slate-900 align-middle text-center truncate leading-none">
                                                                            {session.subjectName}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                        </React.Fragment>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                              {/* Left Column: Management List */}
                              <div className="xl:col-span-1 space-y-4 no-print">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                      <Menu className="h-4 w-4 text-primary" />
                                      Daftar Jadwal ({selectedRombel === 'all' ? 'Semua' : selectedRombel})
                                    </h4>
                                  </div>
                                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                    {examSchedules
                                      .filter(s => selectedRombel === 'all' || s.rombelName === selectedRombel || s.rombelName === 'Semua')
                                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                      .map((s) => (
                                        <div key={s.id} className="group p-3 rounded-lg border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all">
                                          <div className="flex justify-between items-start gap-2">
                                            <div className="min-w-0">
                                              <p className="text-xs font-black text-slate-900 truncate">{s.subjectName}</p>
                                              <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                                                {new Date(s.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })} | {s.startTime}-{s.endTime}
                                              </p>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                onClick={() => {
                                                  setEditingRecord(s);
                                                  setIsDialogOpen(true);
                                                }}
                                              >
                                                <Edit2 className="h-3.5 w-3.5" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDelete(s.id)}
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    {examSchedules.filter(s => selectedRombel === 'all' || s.rombelName === selectedRombel || s.rombelName === 'Semua').length === 0 && (
                                      <div className="text-center py-8 text-slate-400">
                                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        <p className="text-xs">Belum ada jadwal</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right Column: Preview */}
                              <div className="xl:col-span-2">
                                <div id="exam-schedule-print-container" className="bg-white border-[6px] border-double border-black overflow-hidden flex flex-col p-2 shadow-sm print:shadow-none print:m-0" style={cardDimensionStyle}>
                                <div className="text-center mb-0.5 bg-white">
                                  <h2 className="text-[14px] font-black uppercase text-slate-900 tracking-tight leading-none">Jadwal Ujian Sekolah</h2>
                                  <p className="text-[12px] font-bold text-teal-600 uppercase tracking-wider mt-0.5 leading-none">{settings.schoolName}</p>
                                </div>

                                <div className="border border-black overflow-hidden rounded-sm flex-1 bg-white">
                                  <table className="w-full border-collapse h-full">
                                    <thead>
                                      <tr className="bg-[#e2efda] border-b border-black">
                                        <th className="border-r border-black p-0 text-[10px] font-black uppercase text-slate-800 w-[22%]">Hari / Tanggal</th>
                                        <th className="border-r border-black p-0 text-[10px] font-black uppercase text-slate-800 w-[23%]">Waktu</th>
                                        <th className="p-0 text-[10px] font-black uppercase text-slate-800">Mata Pelajaran</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {Object.entries(
                                        examSchedules
                                          .filter(s => selectedRombel === 'all' || s.rombelName === selectedRombel || s.rombelName === 'Semua')
                                          .reduce((acc: any, s: any) => {
                                            const dateStr = new Date(s.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                                            if (!acc[dateStr]) acc[dateStr] = { date: new Date(s.date), label: dateStr, sessions: [] };
                                            acc[dateStr].sessions.push(s);
                                            return acc;
                                          }, {})
                                      )
                                      .sort(([, a]: any, [, b]: any) => a.date.getTime() - b.date.getTime())
                                      .map(([dateStr, data]: any) => (
                                        <React.Fragment key={dateStr}>
                                          {data.sessions
                                            .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime))
                                            .map((session: any, sessionIdx: number) => (
                                              <tr key={session.id} className="border-b border-black last:border-0">
                                                {sessionIdx === 0 && (
                                                  <td className="border-r border-black p-0 text-[10px] font-bold text-slate-800 align-middle text-center bg-white" rowSpan={data.sessions.length}>
                                                    {dateStr.split(',').map((part: string, i: number) => (
                                                      <div key={i} className={i === 0 ? "text-[11px] font-black leading-none" : "text-[10px] text-slate-700 font-bold leading-none mt-0.5"}>
                                                        {part.trim()}{i === 0 ? ',' : ''}
                                                      </div>
                                                    ))}
                                                  </td>
                                                )}
                                                <td className="border-r border-black p-0 text-[9px] font-bold text-slate-700 text-center align-middle leading-none">
                                                  {session.startTime} - {session.endTime}
                                                </td>
                                                <td className="p-0 text-[10px] font-black text-slate-900 align-middle text-center truncate leading-none">
                                                  {session.subjectName}
                                                </td>
                                              </tr>
                                            ))}
                                        </React.Fragment>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>


                                </div>
                              </div>
                            </div>
                          </TabsContent>
                          <TabsContent value="exam-settings" className="mt-0">
                            <Card className="border-none shadow-sm">
                              <CardHeader>
                                <CardTitle className="text-lg font-bold">Informasi Ujian Utama</CardTitle>
                                <CardDescription>Atur identitas ujian yang akan ditampilkan di seluruh sistem</CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                    <Label>Nama Ujian (Contoh: UAS, UTS, dll)</Label>
                                    <Input
                                      value={settingsForm.examName}
                                      onChange={(e) => setSettingsForm({ ...settingsForm, examName: e.target.value })}
                                      placeholder="Masukkan nama ujian"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Tahun Ajaran</Label>
                                    <Input
                                      value={settingsForm.academicYear}
                                      onChange={(e) => setSettingsForm({ ...settingsForm, academicYear: e.target.value })}
                                      placeholder="Contoh: 2023/2024"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Semester</Label>
                                    <Select
                                      value={settingsForm.semester}
                                      onValueChange={(val) => setSettingsForm({ ...settingsForm, semester: val })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Pilih Semester" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Ganjil">Ganjil</SelectItem>
                                        <SelectItem value="Genap">Genap</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Nama Kepala Sekolah</Label>
                                    <Input
                                      value={settingsForm.principalName}
                                      onChange={(e) => setSettingsForm({ ...settingsForm, principalName: e.target.value })}
                                      placeholder="Masukkan nama kepala sekolah"
                                    />
                                  </div>
                                  <div className="space-y-2 col-span-1 md:col-span-2">
                                    <Label>Tanda Tangan Kepala Sekolah (PNG Transparan Disarankan)</Label>
                                    <div className="flex items-center gap-4 mt-1">
                                      <div className="h-20 w-32 border rounded-md overflow-hidden bg-slate-50 flex items-center justify-center relative group">
                                        {settingsForm.principalSignatureUrl ? (
                                          <img src={settingsForm.principalSignatureUrl} className="h-full w-full object-contain" alt="Signature Preview" />
                                        ) : (
                                          <div className="text-[10px] text-slate-400">Belum ada TTD</div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <Button
                                            size="sm"
                                            variant="secondary"
                                            className="h-7 text-[10px]"
                                            onClick={() => {
                                              const input = document.createElement('input');
                                              input.type = 'file';
                                              input.accept = 'image/*';
                                              input.onchange = async (e: any) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                  const reader = new FileReader();
                                                  reader.onload = (ev) => {
                                                    setSettingsForm({ ...settingsForm, principalSignatureUrl: ev.target?.result as string });
                                                  };
                                                  reader.readAsDataURL(file);
                                                }
                                              };
                                              input.click();
                                            }}
                                          >
                                            Upload TTD
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="text-[10px] text-slate-500 max-w-[200px]">
                                        Unggah gambar tanda tangan digital. Disarankan menggunakan format PNG transparan agar terlihat rapi di atas kartu.
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="pt-4 flex justify-end">
                                  <Button
                                    onClick={async () => {
                                      try {
                                        await updateSettings({
                                          ...settings,
                                          examName: settingsForm.examName,
                                          academicYear: settingsForm.academicYear,
                                          semester: settingsForm.semester,
                                          principalName: settingsForm.principalName,
                                          principalSignatureUrl: settingsForm.principalSignatureUrl,
                                          cardWidth: Number(settingsForm.cardWidth) || 85,
                                          cardHeight: Number(settingsForm.cardHeight) || 54,
                                          paperSize: settingsForm.paperSize || 'A4',
                                          marginTop: Number(settingsForm.marginTop) || 15,
                                          marginRight: Number(settingsForm.marginRight) || 15,
                                          marginBottom: Number(settingsForm.marginBottom) || 15,
                                          marginLeft: Number(settingsForm.marginLeft) || 15
                                        });
                                        toast.success('Pengaturan ujian berhasil disimpan');
                                      } catch (error) {
                                        toast.error('Gagal menyimpan pengaturan');
                                      }
                                    }}
                                  >
                                    Simpan Pengaturan Ujian
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </TabsContent>
                          <TabsContent value="exam-cbt" className="mt-0">
                            {isAdmin ? (
                              <>
                                <div className="flex justify-between items-center mb-6">
                                  <div>
                                    <h3 className="text-xl font-bold text-slate-900">Portal CBT (Computer Based Test)</h3>
                                    <p className="text-sm text-slate-500">Kelola sesi ujian aktif dan pantau progres peserta secara real-time</p>
                                  </div>
                                  <Button onClick={() => setIsStartSessionDialogOpen(true)} className="bg-primary hover:bg-primary/90">
                                    <Plus className="mr-2 h-4 w-4" /> Mulai Sesi Baru
                                  </Button>
                                </div>

                                {cbtSessions.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
                                    <Smartphone className="h-12 w-12 text-slate-200 mb-4" />
                                    <h3 className="text-lg font-bold text-slate-900">Belum Ada Sesi CBT</h3>
                                    <p className="text-slate-500 max-w-md text-center mt-2 px-4 italic">
                                      Mulai sesi ujian baru untuk mengaktifkan portal bagi siswa.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {cbtSessions.map((session) => {
                                      const currentCompletedCount = examResults.filter(r => r.sessionId === session.id).length;
                                      const progress = Math.round((currentCompletedCount / session.studentCount) * 100 || 0);

                                      return (
                                        <Card key={session.id} className={cn(
                                          "overflow-hidden border-2 transition-all hover:shadow-md",
                                          session.isActive ? "border-primary/20 bg-white" : "border-slate-100 bg-slate-50/50"
                                        )}>
                                          <CardHeader className="pb-3 border-b border-slate-50">
                                            <div className="flex justify-between items-start">
                                              <Badge variant={session.isActive ? "default" : "outline"} className={cn(
                                                "text-[10px] font-bold uppercase",
                                                session.isActive ? "bg-green-500 hover:bg-green-600" : "text-slate-400"
                                              )}>
                                                {session.isActive ? 'Aktif' : 'Selesai'}
                                              </Badge>
                                              <span className="text-[10px] font-mono text-slate-400">{new Date(session.startedAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-2">
                                              <CardTitle className="text-lg font-black uppercase">{session.subjectName}</CardTitle>
                                              <Badge variant="secondary" className="text-[9px] font-bold">{session.rombelName || 'Umum'}</Badge>
                                            </div>
                                            <CardDescription className="text-xs">ID Sesi: {session.id.substring(0, 8)}</CardDescription>
                                          </CardHeader>
                                          <CardContent className="pt-4 space-y-4">
                                            <div className="bg-slate-900 rounded-lg p-4 text-center">
                                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Token Ujian</p>
                                              <h4 className="text-3xl font-black text-white tracking-[0.2em]">{session.token}</h4>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                              <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Peserta</p>
                                                <p className="text-sm font-black">{session.studentCount} Siswa</p>
                                              </div>
                                              <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Selesai</p>
                                                <p className="text-sm font-black text-green-600">{currentCompletedCount} Siswa</p>
                                              </div>
                                            </div>

                                            {session.isActive && (
                                              <div className="space-y-1.5 pt-2">
                                                <div className="flex justify-between text-[10px] font-bold uppercase">
                                                  <span className="text-slate-400">Progres</span>
                                                  <span className="text-primary">{progress}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                  <div
                                                    className="h-full bg-primary transition-all duration-1000"
                                                    style={{ width: `${progress}%` }}
                                                  />
                                                </div>
                                              </div>
                                            )}

                                            <div className="flex gap-2 pt-2">
                                              {session.isActive && isAdmin ? (
                                                <Button
                                                  variant="outline"
                                                  className="flex-1 h-9 gap-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                                  onClick={() => handleStopCbtSession(session.id)}
                                                >
                                                  <Clock className="h-3.5 w-3.5" /> Hentikan Sesi
                                                </Button>
                                              ) : (
                                                <Button
                                                  variant="secondary"
                                                  className="flex-1 h-9 gap-2 text-xs"
                                                  onClick={() => {
                                                    toast.info('Fitur ekspor hasil sedang dikembangkan');
                                                  }}
                                                >
                                                  <Download className="h-3.5 w-3.5" /> Unduh Hasil
                                                </Button>
                                              )}
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 shrink-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => {
                                                  setIdToDelete(session.id);
                                                  setIsDeleteConfirmOpen(true);
                                                }}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            ) : (
                              <CbtPortal
                                user={user}
                                sessions={cbtSessions}
                                questions={questions}
                                examSchedules={examSchedules}
                                rombels={rombels}
                              />
                            )}
                          </TabsContent>
                        </motion.div>
                      </AnimatePresence>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-[95vw] sm:max-w-[600px] p-0 overflow-hidden">
            <RecordForm
              type={getCollectionPath(activeTab) as any}
              initialData={editingRecord}
              teachers={teachers}
              rombels={rombels}
              subjects={subjects}
              students={students}
              examRooms={examRooms}
              onSubmit={handleAddOrUpdate}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-6">
            {viewingRecord && (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle>Detail {
                    activeTab === 'students' ? 'Siswa' :
                      activeTab === 'teachers' ? 'Guru' :
                        activeTab === 'rombels' ? 'Rombel' : 'Staf'
                  }</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 text-sm">
                  {activeTab === 'rombels' ? (
                    <>
                      <div className="space-y-3">
                        <h3 className="font-bold text-primary border-b pb-1">INFORMASI ROMBEL</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">Nama Rombel</div>
                            <div className="font-medium text-lg">{viewingRecord.name}</div>
                          </div>
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">Tingkat Kelas</div>
                            <div><Badge variant="outline" className="bg-slate-50">Kelas {viewingRecord.class}</Badge></div>
                          </div>
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">Tahun Ajaran</div>
                            <div className="font-medium">{viewingRecord.academicYear || '-'}</div>
                          </div>
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">Wali Kelas</div>
                            <div className="font-medium text-primary">{viewingRecord.homeroomTeacherName || '-'}</div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3 pt-4">
                        <h3 className="font-bold text-primary border-b pb-1">DAFTAR SISWA ({students.filter(s => s.rombel === viewingRecord.name).length})</h3>
                        <div className="rounded-md border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-50/50">
                                <TableHead className="w-[50px] py-2">No</TableHead>
                                <TableHead className="py-2">Nama Siswa</TableHead>
                                <TableHead className="py-2">NIS</TableHead>
                                <TableHead className="py-2">JK</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {students.filter(s => s.rombel === viewingRecord.name).length > 0 ? (
                                students.filter(s => s.rombel === viewingRecord.name).map((student, idx) => (
                                  <TableRow key={student.id} className="hover:bg-slate-50/50">
                                    <TableCell className="py-2 text-xs text-slate-500 font-mono">{idx + 1}</TableCell>
                                    <TableCell className="py-2 font-medium">
                                      <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shadow-sm shrink-0">
                                          {student.photoUrl ? (
                                            <img src={student.photoUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                          ) : (
                                            <UserIcon className="h-3 w-3 text-slate-300" />
                                          )}
                                        </div>
                                        {student.name}
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-2 text-xs">{student.nis}</TableCell>
                                    <TableCell className="py-2">
                                      {student.gender === 'Male' ? 'L' : 'P'}
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center py-4 text-slate-400 italic">
                                    Belum ada siswa di rombel ini
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row gap-6 items-start">
                        {/* PROFILE PHOTO IN DETAIL */}
                        <div className="shrink-0 mx-auto sm:mx-0">
                          <div className="h-32 w-32 rounded-2xl bg-slate-100 border-4 border-white shadow-lg overflow-hidden relative group">
                            {viewingRecord.photoUrl ? (
                              <img
                                src={viewingRecord.photoUrl}
                                alt={viewingRecord.name}
                                className="h-full w-full object-cover transition-transform group-hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="h-full w-full flex flex-col items-center justify-center text-slate-300">
                                <UserSquare2 className="h-12 w-12 opacity-20" />
                                <span className="text-[10px] uppercase font-bold tracking-widest mt-2">No Photo</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 space-y-3">
                          <h3 className="font-bold text-primary border-b pb-1">DATA PRIBADI</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                            <div className="flex flex-col sm:contents">
                              <div className="text-slate-500">Nama Lengkap</div>
                              <div className="font-medium">{viewingRecord.name}</div>
                            </div>

                            <div className="flex flex-col sm:contents">
                              <div className="text-slate-500">{activeTab === 'students' ? 'NIS' : 'NIP/ID'}</div>
                              <div className="font-medium">{activeTab === 'students' ? viewingRecord.nis : viewingRecord.employeeId}</div>
                            </div>

                            {activeTab === 'students' && (
                              <>
                                <div className="flex flex-col sm:contents">
                                  <div className="text-slate-500">NISN</div>
                                  <div className="font-medium">{viewingRecord.nisn || '-'}</div>
                                </div>
                                <div className="flex flex-col sm:contents">
                                  <div className="text-slate-500">No. Peserta</div>
                                  <div className="font-medium">{viewingRecord.participantNumber || '-'}</div>
                                </div>
                                <div className="flex flex-col sm:contents">
                                  <div className="text-slate-500">NIK Siswa</div>
                                  <div className="font-medium">{viewingRecord.nik || '-'}</div>
                                </div>
                              </>
                            )}

                            <div className="flex flex-col sm:contents">
                              <div className="text-slate-500">{activeTab === 'students' ? 'Kelas' : activeTab === 'teachers' ? 'Mapel' : 'Jabatan'}</div>
                              <div><Badge variant="outline">{activeTab === 'students' ? viewingRecord.class : activeTab === 'teachers' ? viewingRecord.subject : viewingRecord.position}</Badge></div>
                            </div>

                            {activeTab === 'students' && (
                              <div className="flex flex-col sm:contents">
                                <div className="text-slate-500">Rombel</div>
                                <div className="font-medium">{viewingRecord.rombel || '-'}</div>
                              </div>
                            )}

                            <div className="flex flex-col sm:contents">
                              <div className="text-slate-500">Jenis Kelamin</div>
                              <div className="font-medium">
                                {viewingRecord.gender === 'Male' ? (
                                  <span className="flex items-center gap-1.5 text-blue-600">
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                    L
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-rose-600">
                                    <div className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                                    P
                                  </span>
                                )}
                              </div>
                            </div>

                            {activeTab === 'students' && (
                              <>
                                <div className="flex flex-col sm:contents">
                                  <div className="text-slate-500">Tempat, Tgl Lahir</div>
                                  <div>{viewingRecord.pob || '-'}{viewingRecord.dob ? `, ${viewingRecord.dob}` : ''}</div>
                                </div>
                                <div className="flex flex-col sm:contents">
                                  <div className="text-slate-500">No. Reg. Akte Lahir</div>
                                  <div>{viewingRecord.akteRegNo || '-'}</div>
                                </div>
                                <div className="flex flex-col sm:contents">
                                  <div className="text-slate-500">Agama</div>
                                  <div>{viewingRecord.religion || '-'}</div>
                                </div>
                                <div className="flex flex-col sm:contents">
                                  <div className="text-slate-500">No. KK</div>
                                  <div>{viewingRecord.noKK || '-'}</div>
                                </div>
                                <div className="flex flex-col sm:contents">
                                  <div className="text-slate-500">Asal Sekolah</div>
                                  <div>{viewingRecord.previousSchool || '-'}</div>
                                </div>
                                <div className="flex flex-col sm:contents">
                                  <div className="text-slate-500">Anak Ke-</div>
                                  <div>{viewingRecord.childOrder || '-'}</div>
                                </div>
                                <div className="flex flex-col sm:contents">
                                  <div className="text-slate-500">Jml Saudara Kandung</div>
                                  <div>{viewingRecord.siblingsCount || '-'}</div>
                                </div>
                                <div className="flex flex-col sm:contents">
                                  <div className="text-slate-500">Tinggi / Berat</div>
                                  <div>{viewingRecord.height ? `${viewingRecord.height} cm` : '-'} / {viewingRecord.weight ? `${viewingRecord.weight} kg` : '-'}</div>
                                </div>
                              </>
                            )}

                            <div className="flex flex-col sm:contents">
                              <div className="text-slate-500">Telepon/HP</div>
                              <div>{viewingRecord.phone || '-'}</div>
                            </div>

                            <div className="flex flex-col sm:contents">
                              <div className="text-slate-500">Email</div>
                              <div className="truncate">{viewingRecord.email || '-'}</div>
                            </div>

                            {(activeTab === 'teachers' || activeTab === 'staff') && (
                              <>
                                <div className="text-slate-500 col-span-full mt-2 border-t pt-2 font-semibold">Informasi Kepegawaian</div>
                                <div className="flex flex-col sm:contents">
                                  <div className="text-slate-500">NUPTK</div>
                                  <div>{viewingRecord.nuptk || '-'}</div>
                                </div>
                                <div className="flex flex-col sm:contents">
                                  <div className="text-slate-500">No. SK Yayasan</div>
                                  <div>{viewingRecord.skYayasan || '-'}</div>
                                </div>
                                {activeTab === 'teachers' && (
                                  <>
                                    <div className="flex flex-col sm:contents">
                                      <div className="text-slate-500">Jabatan</div>
                                      <div>{viewingRecord.position || '-'}</div>
                                    </div>
                                    <div className="flex flex-col sm:contents">
                                      <div className="text-slate-500">No. SK Mengajar</div>
                                      <div>{viewingRecord.skMengajar || '-'}</div>
                                    </div>
                                  </>
                                )}
                                <div className="flex flex-col sm:contents">
                                  <div className="text-slate-500">Pendidikan</div>
                                  <div>{viewingRecord.education || '-'}</div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 mt-2">
                        <div className="text-slate-500 font-semibold">Alamat Domisili</div>
                        <div className="text-slate-600">{viewingRecord.address || '-'}</div>
                      </div>
                      {activeTab === 'students' && (
                        <div className="space-y-1 mt-2">
                          <div className="text-slate-500 font-semibold">Alamat Sesuai KK</div>
                          <div className="text-slate-600">{viewingRecord.kkAddress || '-'}</div>
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === 'students' && (
                    <>
                      {/* DATA AYAH */}
                      <div className="space-y-3 pt-2">
                        <h3 className="font-bold text-primary border-b pb-1">DATA AYAH KANDUNG</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">Nama Ayah</div>
                            <div className="font-medium">{viewingRecord.fatherName || '-'}</div>
                          </div>
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">NIK Ayah</div>
                            <div>{viewingRecord.fatherNik || '-'}</div>
                          </div>
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">Tempat, Tgl Lahir</div>
                            <div>{viewingRecord.fatherPob || '-'}{viewingRecord.fatherDob ? `, ${viewingRecord.fatherDob}` : ''}</div>
                          </div>
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">Pendidikan</div>
                            <div>{viewingRecord.fatherEducation || '-'}</div>
                          </div>
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">Pekerjaan</div>
                            <div>{viewingRecord.fatherOccupation || '-'}</div>
                          </div>
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">Penghasilan</div>
                            <div>{viewingRecord.fatherIncome || '-'}</div>
                          </div>
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">Telepon Ayah</div>
                            <div className="font-medium text-blue-600">{viewingRecord.fatherPhone || '-'}</div>
                          </div>
                        </div>
                      </div>

                      {/* DATA IBU */}
                      <div className="space-y-3 pt-2">
                        <h3 className="font-bold text-primary border-b pb-1">DATA IBU KANDUNG</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">Nama Ibu</div>
                            <div className="font-medium">{viewingRecord.motherName || '-'}</div>
                          </div>
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">NIK Ibu</div>
                            <div>{viewingRecord.motherNik || '-'}</div>
                          </div>
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">Tempat, Tgl Lahir</div>
                            <div>{viewingRecord.motherPob || '-'}{viewingRecord.motherDob ? `, ${viewingRecord.motherDob}` : ''}</div>
                          </div>
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">Pendidikan</div>
                            <div>{viewingRecord.motherEducation || '-'}</div>
                          </div>
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">Pekerjaan</div>
                            <div>{viewingRecord.motherOccupation || '-'}</div>
                          </div>
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">Penghasilan</div>
                            <div>{viewingRecord.motherIncome || '-'}</div>
                          </div>
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">Telepon Ibu</div>
                            <div className="font-medium text-blue-600">{viewingRecord.motherPhone || '-'}</div>
                          </div>
                        </div>
                      </div>

                      {/* DATA WALI */}
                      <div className="space-y-3 pt-2">
                        <h3 className="font-bold text-primary border-b pb-1">DATA WALI</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">Nama Wali</div>
                            <div className="font-medium">{viewingRecord.guardianName || '-'}</div>
                          </div>
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">NIK Wali</div>
                            <div>{viewingRecord.guardianNik || '-'}</div>
                          </div>
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">Tempat, Tgl Lahir</div>
                            <div>{viewingRecord.guardianPob || '-'}{viewingRecord.guardianDob ? `, ${viewingRecord.guardianDob}` : ''}</div>
                          </div>
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">Pendidikan</div>
                            <div>{viewingRecord.guardianEducation || '-'}</div>
                          </div>
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">Pekerjaan</div>
                            <div>{viewingRecord.guardianOccupation || '-'}</div>
                          </div>
                          <div className="flex flex-col sm:contents">
                            <div className="text-slate-500">Penghasilan</div>
                            <div>{viewingRecord.guardianIncome || '-'}</div>
                          </div>
                        </div>
                      </div>

                      {/* DOKUMEN */}
                      <div className="space-y-3 pt-2">
                        <h3 className="font-bold text-primary border-b pb-1">DOKUMEN SCAN</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'scanKK', label: 'KK' },
                            { id: 'scanAkte', label: 'Akte' },
                            { id: 'scanKTPParent', label: 'KTP Ortu' },
                            { id: 'scanRaport', label: 'Raport' },
                            { id: 'scanIjasah', label: 'Ijasah' },
                          ].map((doc) => (
                            viewingRecord[doc.id] && (
                              <a
                                key={doc.id}
                                href={viewingRecord[doc.id]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 rounded border hover:bg-slate-50 transition-colors"
                              >
                                <FileText className="h-4 w-4 text-primary" />
                                <span className="text-xs font-medium">{doc.label}</span>
                                <ExternalLink className="h-3 w-3 ml-auto text-slate-400" />
                              </a>
                            )
                          ))}
                          {!['scanKK', 'scanAkte', 'scanKTPParent', 'scanRaport', 'scanIjasah'].some(k => viewingRecord[k]) && (
                            <p className="text-xs text-slate-400 italic col-span-2">Belum ada dokumen yang diunggah.</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* DELETE CONFIRMATION DIALOG */}
        <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Konfirmasi Hapus</DialogTitle>
            </DialogHeader>
            <div className="py-6">
              <p className="text-slate-600">Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Batal</Button>
              <Button variant="destructive" onClick={confirmDelete}>Hapus</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* DELETE ALL CONFIRMATION DIALOG */}
        <Dialog open={isDeleteAllConfirmOpen} onOpenChange={setIsDeleteAllConfirmOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-red-600">Hapus Semua Data {activeTab === 'students' ? 'Siswa' : activeTab === 'teachers' ? 'Guru' : 'Staf'}</DialogTitle>
            </DialogHeader>
            <div className="py-6">
              <p className="text-slate-600 font-medium">PERINGATAN KRITIKAL!</p>
              <p className="text-slate-600 mt-2">
                Apakah Anda yakin ingin menghapus **SELURUH** data {activeTab === 'students' ? 'siswa' : activeTab === 'teachers' ? 'guru' : 'staf'}?
                Tindakan ini akan menghapus semua catatan secara permanen dan tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDeleteAllConfirmOpen(false)}>Batal</Button>
              <Button variant="destructive" onClick={confirmDeleteAll}>Ya, Hapus Semua</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* SETTINGS DIALOG */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Pengaturan Aplikasi</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateSettings} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="schoolName">Nama Sekolah</Label>
                <Input
                  id="schoolName"
                  name="schoolName"
                  value={settingsForm.schoolName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, schoolName: e.target.value })}
                  placeholder="Contoh: SMP Islam Modern Al Fakhir"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fonnteToken">Fonnte WhatsApp Token</Label>
                <Input
                  id="fonnteToken"
                  name="fonnteToken"
                  type="password"
                  value={settingsForm.fonnteToken}
                  onChange={(e) => setSettingsForm({ ...settingsForm, fonnteToken: e.target.value })}
                  placeholder="Masukkan Token Fonnte Anda"
                />
                <p className="text-[10px] text-slate-500 italic">
                  Dapatkan token di fonnte.com untuk mengaktifkan notifikasi WhatsApp.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Logo Sekolah</Label>
                <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-slate-200 p-4 bg-slate-50/50">
                  <div className="relative h-20 w-20 overflow-hidden rounded-full border bg-white shadow-sm">
                    <img
                      src={logoPreview || settings.logoUrl || "/logo.png"}
                      alt="Preview Logo"
                      className="h-full w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex w-full gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => logoFileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-3 w-3" />
                      Upload Gambar
                    </Button>
                    {logoPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setLogoPreview(null)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        Batal
                      </Button>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={logoFileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleLogoChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoUrl">Atau Gunakan URL Gambar</Label>
                <Input
                  id="logoUrl"
                  name="logoUrl"
                  value={settingsForm.logoUrl}
                  onChange={(e) => setSettingsForm({ ...settingsForm, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  disabled={!!logoPreview}
                />
                <p className="text-[10px] text-slate-500 italic">
                  {logoPreview
                    ? "Gambar yang diunggah akan digunakan sebagai prioritas."
                    : "Gunakan URL gambar publik atau biarkan /logo.png jika sudah ada di folder public."}
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsSettingsOpen(false);
                  setLogoPreview(null);
                }}>Batal</Button>
                <Button type="submit">Simpan Perubahan</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isCardDialogOpen} onOpenChange={setIsCardDialogOpen}>
          <DialogContent className="sm:max-w-md bg-slate-50">
            <DialogHeader>
              <DialogTitle>
                Kartu Identitas {personTypeForCard === 'students' ? 'Siswa' : personTypeForCard === 'teachers' ? 'Guru' : 'Staf'}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-6 py-6 font-sans">
              <div id="id-card" className="relative w-[350px] h-[220px] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col print:shadow-none print:border-slate-300">
                {/* Card Header */}
                <div className="bg-primary h-14 flex items-center px-4 gap-3">
                  <div className="h-10 w-10 bg-white rounded-md flex items-center justify-center p-1">
                    <img src={settings.logoUrl || "/logo.png"} alt="Logo" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs sm:text-sm font-black text-white leading-tight uppercase truncate">{settings.schoolName}</span>
                    <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest leading-none">
                      {personTypeForCard === 'students' ? 'Student ID Card' : personTypeForCard === 'teachers' ? 'Teacher ID Card' : 'Staff ID Card'}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex-1 flex p-4 gap-4 overflow-hidden">
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="h-28 w-24 bg-slate-100 rounded-md border-2 border-slate-50 flex items-center justify-center overflow-hidden">
                      {selectedPersonForCard?.photoUrl ? (
                        <img src={selectedPersonForCard.photoUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <UserIcon className="h-10 w-10 text-slate-300" />
                      )}
                    </div>
                    <Badge variant="outline" className="text-[9px] font-bold py-0 h-4 uppercase">
                      {personTypeForCard === 'students' ? 'SISWA' : personTypeForCard === 'teachers' ? 'GURU' : 'STAF'}
                    </Badge>
                  </div>

                  <div className="flex-1 flex flex-col justify-between pt-1 min-w-0">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Nama Lengkap</p>
                      <p className="text-sm font-black text-slate-900 leading-tight break-words">{selectedPersonForCard?.name}</p>
                    </div>

                    <div className="flex justify-between items-end">
                      <div className="flex flex-col gap-2">
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                            {personTypeForCard === 'students' ? 'NISN' : 'NIP / ID'}
                          </p>
                          <p className="text-sm font-bold text-slate-700 truncate">
                            {personTypeForCard === 'students' ? (selectedPersonForCard?.nisn || '-') : (selectedPersonForCard?.employeeId || '-')}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                            {personTypeForCard === 'students' ? 'Kelas / Rombel' : 'Jabatan'}
                          </p>
                          <p className="text-sm font-bold text-slate-700 rotate-0 truncate">
                            {personTypeForCard === 'students'
                              ? `${selectedPersonForCard?.class || '-'} / ${selectedPersonForCard?.rombel || '-'}`
                              : (selectedPersonForCard?.position || '-')}
                          </p>
                        </div>
                      </div>

                      <div className="bg-white p-1 rounded-sm border border-slate-100 shadow-sm mb-1 mr-1">
                        <QRCodeSVG
                          value={selectedPersonForCard?.id || ''}
                          size={45}
                          level="H"
                          includeMargin={false}
                        />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Card Footer Decor */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-blue-400 to-primary" />
              </div>

              <div className="flex flex-wrap gap-2 w-full">
                <Button variant="outline" className="flex-1 min-w-[100px]" onClick={() => setIsCardDialogOpen(false)}>Tutup</Button>
                <Button
                  variant="secondary"
                  className="flex-1 min-w-[100px] font-bold"
                  onClick={() => window.print()}
                >
                  <Printer className="mr-2 h-4 w-4" /> Cetak
                </Button>
                <Button
                  className="flex-1 min-w-[120px] bg-red-600 hover:bg-red-700 font-bold"
                  onClick={() => downloadElementAsPdf('id-card', `ID_Card_${selectedPersonForCard?.name.replace(/\s+/g, '_')}`)}
                >
                  <FileDown className="mr-2 h-4 w-4" /> Download PDF
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent className="sm:max-w-5xl bg-white p-0 overflow-hidden border-none shadow-2xl">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-white text-lg">Review Kartu Ujian</DialogTitle>
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest leading-none mt-1">Verifikasi Data Sebelum Export</p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 flex flex-col md:flex-row gap-8">
              {/* Preview Card */}
              <div className="flex flex-col items-center gap-4">
                <div className="p-2 bg-white rounded-2xl shadow-xl border border-slate-200">
                  <div
                    id={`review-exam-card-${reviewingStudent?.id}`}
                    className="bg-white overflow-hidden flex flex-col p-4 border-[6px] border-double border-black"
                    style={cardDimensionStyle}
                  >
                    <header className="flex items-center gap-5 border-b-2 border-slate-400 pb-3 mb-3 bg-white" style={{ height: '90px' }}>
                      <div className="w-22 h-22 flex items-center justify-center bg-white shrink-0">
                        <img src={settings.logoUrl || "/logo.png"} alt="Logo" className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col justify-center bg-white text-left">
                        <h4 className="text-[22px] font-black uppercase text-slate-800 leading-tight tracking-tight mb-1">{settings.schoolName}</h4>
                        <h3 className="text-[14px] font-bold uppercase tracking-widest text-slate-600 leading-tight truncate mb-1">{settings.examName || 'KARTU PESERTA UJIAN'}</h3>
                        <p className="text-[12px] font-bold text-slate-500 uppercase leading-none whitespace-nowrap">T.A {settings.academicYear || '-'} | Semester {settings.semester || '-'}</p>
                      </div>
                    </header>
                    <main className="flex gap-4 bg-white" style={{ height: '110px' }}>
                      <div className="h-[95px] w-[76px] bg-white border border-slate-400 flex items-center justify-center shrink-0 overflow-hidden self-center">
                        {reviewingStudent?.photoUrl ? (
                          <img src={reviewingStudent.photoUrl} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <UserIcon className="h-10 w-10 text-slate-200" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 bg-white flex flex-col justify-center text-left">
                        <table className="w-full border-collapse bg-white">
                          <tbody className="bg-white">
                            <tr className="bg-white">
                              <td className="w-[145px] text-[13px] font-bold text-slate-800 uppercase py-0.5 align-top bg-white">NAMA PESERTA</td>
                              <td className="w-2.5 text-[13px] font-bold text-slate-400 py-0.5 align-top bg-white">:</td>
                              <td className="text-[17px] font-black text-slate-900 uppercase py-0.5 align-top truncate bg-white">{reviewingStudent?.name}</td>
                            </tr>
                            <tr className="bg-white">
                              <td className="w-[145px] text-[13px] font-bold text-slate-800 uppercase py-0.5 align-top bg-white">NO. PESERTA</td>
                              <td className="w-2.5 text-[13px] font-bold text-slate-400 py-0.5 align-top bg-white">:</td>
                              <td className="text-[15px] font-bold text-slate-800 py-0.5 align-top bg-white">{reviewingStudent?.participantNumber || settings.participantNumber?.[reviewingStudent?.class] || reviewingStudent?.nis || reviewingStudent?.nisn || '-'}</td>
                            </tr>
                            <tr className="bg-white">
                              <td className="w-[145px] text-[13px] font-bold text-slate-800 uppercase py-0.5 align-top bg-white">NISN</td>
                              <td className="w-2.5 text-[13px] font-bold text-slate-400 py-0.5 align-top bg-white">:</td>
                              <td className="text-[15px] font-bold text-slate-800 py-0.5 align-top bg-white">{reviewingStudent?.nisn || '-'}</td>
                            </tr>
                            <tr className="bg-white">
                              <td className="w-[145px] text-[13px] font-bold text-slate-800 uppercase py-0.5 align-top bg-white leading-tight">TEMPAT, TGL LAHIR</td>
                              <td className="w-2.5 text-[13px] font-bold text-slate-400 py-0.5 align-top bg-white">:</td>
                              <td className="text-[14px] font-bold text-slate-800 py-0.5 align-top break-words bg-white">{reviewingStudent?.pob || '-'}{reviewingStudent?.dob ? `, ${formatDateIndo(reviewingStudent?.dob)}` : ''}</td>
                            </tr>
                            <tr className="bg-white">
                              <td className="w-[145px] text-[13px] font-bold text-slate-800 uppercase py-0.5 align-top bg-white leading-tight">RUANG / KELAS</td>
                              <td className="w-2.5 text-[13px] font-bold text-slate-400 py-0.5 align-top bg-white">:</td>
                              <td className="text-[14px] font-bold text-slate-800 py-0.5 align-top bg-white">{reviewingStudent?.class} / {reviewingStudent?.rombel}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </main>
                    <footer className="mt-auto pt-1 border-t-2 border-slate-400 flex justify-between items-end bg-white" style={{ minHeight: '55px' }}>
                      <div className="text-[8px] font-medium text-slate-400 italic bg-white pb-0.5">
                        * Kartu ini wajib dibawa saat ujian berlangsung.
                      </div>
                      <div className="flex flex-col items-center min-w-[180px] bg-white relative">
                        <p className="text-[11px] font-bold uppercase text-slate-400 mb-12 z-10 tracking-widest">KEPALA SEKOLAH</p>
                        {settings.principalSignatureUrl && (
                          <div className="absolute top-1 w-36 h-24 flex items-center justify-center pointer-events-none z-0">
                            <img
                              src={settings.principalSignatureUrl}
                              className="max-h-full max-w-full object-contain opacity-100 scale-125 -translate-x-2 mix-blend-multiply"
                              alt="Signature"
                            />
                          </div>
                        )}
                        <p className="text-[14px] font-black underline text-slate-900 z-10 truncate max-w-[180px] decoration-1 underline-offset-2">
                          {settings.principalName || '................................'}
                        </p>
                      </div>
                    </footer>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 font-medium italic">Tampilan kartu saat diekspor ke PDF</p>
              </div>

              {/* Checklist / Info */}
              <div className="flex-1 space-y-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    Detail Peserta
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">NAMA LENGKAP</p>
                      <p className="font-bold text-slate-900">{reviewingStudent?.name}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">NISN / NOMOR IDENTITAS</p>
                      <p className="font-bold text-slate-900">{reviewingStudent?.nisn || '-'}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">KELAS & ROMBEL</p>
                      <p className="font-bold text-slate-900">{reviewingStudent?.class} - {reviewingStudent?.rombel}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50/50 border border-slate-100/50 rounded-2xl">
                  <div className="flex gap-4">
                    <div className="h-10 w-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                      <LayoutGrid className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tighter mb-2">Kelengkapan Data</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-medium">
                          <span className="text-slate-500">Foto Profil:</span>
                          <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase", reviewingStudent?.photoUrl ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                            {reviewingStudent?.photoUrl ? '✓ Lengkap' : '× Belum Ada'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-medium">
                          <span className="text-slate-500">Tempat Lahir:</span>
                          <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase", reviewingStudent?.pob ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700")}>
                            {reviewingStudent?.pob ? '✓ Lengkap' : '× Kosong'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-8 py-6 border-t border-slate-200 flex justify-end gap-3">
              <Button variant="outline" className="h-11 px-6 font-bold" onClick={() => setIsReviewDialogOpen(false)}>Tutup</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 h-11 px-6 font-bold"
                onClick={async () => {
                  await downloadElementAsPdf(`review-exam-card-${reviewingStudent?.id}`, `Kartu_Ujian_${reviewingStudent?.name.replace(/\s+/g, '_')}`);
                  setIsReviewDialogOpen(false);
                }}
              >
                <FileDown className="mr-2 h-4 w-4" /> Download Sekarang
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isStartSessionDialogOpen} onOpenChange={setIsStartSessionDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Mulai Sesi Ujian Baru</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pilih Kelas / Rombel</Label>
                <Select
                  onValueChange={(v) => {
                    setSelectedClassForCbt(v);
                    setSelectedScheduleForCbt(''); // Reset mapel when class changes
                  }}
                  value={selectedClassForCbt}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Semua Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {/* Grade Levels */}
                    {['VII', 'VIII', 'IX'].map(grade => (
                      <SelectItem key={grade} value={grade}>Kelas {grade}</SelectItem>
                    ))}
                    <div className="h-px bg-slate-100 my-1" />
                    {/* Individual Rombels */}
                    {Array.from(new Set(examSchedules.map(s => s.rombelName).filter(r => r && !['VII', 'VIII', 'IX', 'Semua'].includes(r)))).sort().map(rombel => (
                      <SelectItem key={rombel} value={rombel}>{rombel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pilih Jadwal Ujian</Label>
                <Select onValueChange={setSelectedScheduleForCbt} value={selectedScheduleForCbt}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Pilih Mata Pelajaran" />
                  </SelectTrigger>
                  <SelectContent>
                    {examSchedules
                      .filter(s => {
                        if (selectedClassForCbt === 'all') return true;

                        const scheduleRombel = s.rombelName || 'Umum';
                        // Exact match
                        if (scheduleRombel === selectedClassForCbt) return true;
                        // "Semua" match
                        if (scheduleRombel === 'Semua' || scheduleRombel === 'Umum') return true;

                        // Check if schedule's rombel belongs to selected class (grade)
                        const rombelObj = rombels.find(r => r.name === s.rombelName);
                        if (rombelObj && rombelObj.class === selectedClassForCbt) return true;

                        // Heuristic: If rombel name starts with grade (e.g. "VII-A" starts with "VII")
                        if (['VII', 'VIII', 'IX'].includes(selectedClassForCbt) &&
                          s.rombelName?.startsWith(selectedClassForCbt)) return true;

                        return false;
                      })
                      .map((schedule) => (
                        <SelectItem key={schedule.id} value={schedule.id}>
                          <div className="flex flex-col items-start gap-0.5 w-full py-1">
                            <div className="flex justify-between items-center w-full gap-4">
                              <span className="font-medium text-slate-700">{schedule.subjectName}</span>
                              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-semibold bg-slate-100 text-slate-600 border-none">
                                {schedule.rombelName || 'Umum'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-[9px] text-slate-400">
                              <span>{new Date(schedule.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                              <span>•</span>
                              <span>{schedule.startTime} - {schedule.endTime}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-500 italic leading-relaxed">
                  Sesi yang dimulai akan menghasilkan token unik yang dapat digunakan siswa untuk masuk ke portal ujian.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsStartSessionDialogOpen(false)}>Batal</Button>
              <Button onClick={handleStartCbtSession} disabled={!selectedScheduleForCbt}>Mulai Sesi</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Toaster position="top-center" richColors />
        <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          /* Hide all main UI elements except the print helper wrapper */
          body > div:not(#exam-cards-container):not(.active-print):not(#print-card-wrapper):not(#exam-schedule-multi-print) {
            display: none !important;
          }
          /* Ensure our containers are at the top */
          #exam-cards-container,
          #print-card-wrapper,
          #exam-schedule-multi-print {
            display: grid !important;
            grid-template-columns: repeat(2, var(--print-card-width, 95mm)) !important;
            justify-content: start !important;
            gap: 5px !important;
            padding: var(--print-margin-top, 10mm) var(--print-margin-right, 0.5mm) var(--print-margin-bottom, 10mm) var(--print-margin-left, 0.5mm) !important;
            margin: 0 !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            min-height: 100% !important;
            z-index: 10000 !important;
            background: white !important;
          }
          .exam-card-print {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 6px double black !important;
            border-radius: 0 !important;
            width: var(--print-card-width, 100%) !important;
            height: var(--print-card-height, auto) !important;
            aspect-ratio: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
          }
          .active-print {
            display: flex !important;
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: var(--print-card-width, 450px) !important;
            height: var(--print-card-height, auto) !important;
            aspect-ratio: auto !important;
            z-index: 10002 !important;
            background: white !important;
            border: 6px double black !important;
            border-radius: 0 !important;
            visibility: visible !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
      </div>
    </div>
  );
}

function DataTable({ data, type, isAdmin, onEdit, onDelete, onAdd, onView, onPrintCard, students }: any) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="mb-4 rounded-full bg-slate-100 p-6">
          <Search className="h-12 w-12 opacity-20" />
        </div>
        <p className="text-lg font-medium text-slate-600">Belum ada data {
          type === 'students' ? 'peserta ujian' :
            type === 'teachers' ? 'guru' :
              type === 'rombels' ? 'rombel' :
                type === 'attendance' ? 'absensi' :
                  type === 'examRooms' ? 'ruang ujian' : 'staf'
        }</p>
        <p className="mb-6 text-sm">Mulai dengan menambahkan data baru ke sistem.</p>
        {isAdmin && type !== 'attendance' && (
          <Button onClick={onAdd} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Tambah {
              type === 'students' ? 'Peserta Ujian' :
                type === 'teachers' ? 'Guru' :
                  type === 'rombels' ? 'Rombel' :
                    type === 'examRooms' ? 'Ruang Ujian' : 'Staf'
            } Baru
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50">
            <TableHead className="w-[50px]">No</TableHead>
            <TableHead>{type === 'rombels' ? 'Nama Rombel' : type === 'subjects' ? 'Mata Pelajaran' : type === 'examSchedules' ? 'Mata Pelajaran' : type === 'questions' ? 'Pertanyaan' : type === 'examRooms' ? 'Nama Ruangan' : 'Nama'}</TableHead>
            {type === 'attendance' && <TableHead>Role</TableHead>}
            {type === 'attendance' && <TableHead>Metode</TableHead>}
            {type === 'subjects' && <TableHead>Kode Mapel</TableHead>}
            {type === 'examSchedules' && <TableHead>Tanggal</TableHead>}
            {type === 'examSchedules' && <TableHead>Waktu</TableHead>}
            {type === 'examSchedules' && <TableHead>Ruangan</TableHead>}
            {type === 'examRooms' && <TableHead>Kapasitas</TableHead>}
            {type === 'examRooms' && <TableHead>Lokasi</TableHead>}
            {type === 'examRooms' && <TableHead>Jumlah Peserta</TableHead>}
            {type === 'questions' && <TableHead>Opsi Jawaban</TableHead>}
            {['students', 'teachers', 'staff'].includes(type) && <TableHead>{type === 'students' ? 'NIS' : 'NIP/ID'}</TableHead>}
            {type === 'students' && <TableHead className="hidden lg:table-cell">NISN</TableHead>}
            {type === 'students' && <TableHead className="hidden lg:table-cell">No. Peserta</TableHead>}
            {type === 'teachers' && <TableHead className="hidden lg:table-cell">NUPTK</TableHead>}
            {['students', 'teachers', 'rombels', 'staff', 'examSchedules', 'questions'].includes(type) && (
              <TableHead>
                {type === 'students' ? 'Kelas / Rombel' :
                  type === 'teachers' ? 'Mapel / Jabatan' :
                    type === 'rombels' ? 'Wali Kelas' :
                      type === 'examSchedules' ? 'Rombel' :
                        type === 'questions' ? 'Kelas' : 'Jabatan'}
              </TableHead>
            )}
            {type === 'examSchedules' && <TableHead>Pengawas</TableHead>}
            {type === 'attendance' && <TableHead>Status</TableHead>}
            {type === 'rombels' && <TableHead>Tingkat</TableHead>}
            <TableHead>Jenjang</TableHead>
            {['students', 'teachers', 'staff'].includes(type) && <TableHead className="hidden md:table-cell">Gender</TableHead>}
            {type === 'attendance' && <TableHead>Waktu</TableHead>}
            {type === 'attendance' && <TableHead>WA Notif</TableHead>}
            {['students', 'teachers', 'staff'].includes(type) && <TableHead className="hidden md:table-cell">Telepon</TableHead>}
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item: any, index: number) => (
            <TableRow key={item.id} className="hover:bg-slate-50/50">
              <TableCell className="text-slate-500 font-mono text-xs">{index + 1}</TableCell>
              <TableCell className="font-medium p-2">
                <div className="flex items-center gap-3">
                  {['students', 'teachers', 'staff'].includes(type) && (
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0 shadow-sm">
                      {item.photoUrl ? (
                        <img src={item.photoUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <UserIcon className="h-4 w-4 text-slate-300" />
                      )}
                    </div>
                  )}
                  <span className="truncate max-w-[150px] sm:max-w-none">
                    {type === 'examSchedules' ? item.subjectName : type === 'questions' ? item.text : item.name}
                  </span>
                </div>
              </TableCell>
              {type === 'attendance' && (
                <TableCell>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase">{item.role}</Badge>
                </TableCell>
              )}
              {type === 'attendance' && (
                <TableCell>
                  <span className="text-xs">{item.method}</span>
                </TableCell>
              )}
              {type === 'subjects' && <TableCell>{item.code}</TableCell>}
              {type === 'examRooms' && <TableCell>{item.capacity} Siswa</TableCell>}
              {type === 'examRooms' && <TableCell>{item.location || '-'}</TableCell>}
              {type === 'examRooms' && <TableCell>{Array.isArray(item.studentsInRoom) ? item.studentsInRoom.length : 0} Siswa</TableCell>}
              {type === 'examSchedules' && <TableCell>{item.date}</TableCell>}
              {type === 'examSchedules' && <TableCell>{item.startTime} - {item.endTime}</TableCell>}
              {type === 'examSchedules' && <TableCell>{item.room}</TableCell>}
              {type === 'questions' && (
                <TableCell>
                  <div className="flex gap-1">
                    {item.options?.map((o: string, idx: number) => (
                      <div key={idx} className={cn(
                        "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold border",
                        item.correctOption === idx ? "bg-green-500 border-green-600 text-white" : "bg-slate-100 text-slate-400"
                      )}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                    ))}
                  </div>
                </TableCell>
              )}
              {['students', 'teachers', 'staff'].includes(type) && <TableCell>{type === 'students' ? item.nis : item.employeeId}</TableCell>}
              {type === 'students' && <TableCell className="hidden lg:table-cell">{item.nisn || '-'}</TableCell>}
              {type === 'students' && <TableCell className="hidden lg:table-cell">{item.participantNumber || '-'}</TableCell>}
              {type === 'teachers' && <TableCell className="hidden lg:table-cell">{item.nuptk || '-'}</TableCell>}
              {type === 'rombels' && <TableCell className="font-semibold text-slate-700">{item.class}</TableCell>}
              {['students', 'teachers', 'rombels', 'staff', 'examSchedules', 'questions'].includes(type) && (
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {type === 'rombels' ? (
                      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-slate-50 border border-slate-100 w-fit">
                        <UserIcon className="h-3 w-3 text-slate-400" />
                        <span className="text-xs font-bold text-slate-600">{item.homeroomTeacherName || 'Belum Ditentukan'}</span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="font-normal w-fit">
                        {type === 'students' ? item.class :
                          type === 'teachers' ? item.subject :
                            type === 'examSchedules' ? item.rombelName :
                              type === 'questions' ? item.class : item.position}
                      </Badge>
                    )}
                    {type === 'students' && item.rombel && (
                      <span className="text-[10px] text-slate-400 font-medium px-1 leading-none">{item.rombel}</span>
                    )}
                    {type === 'examSchedules' && item.class && (
                      <span className="text-[10px] text-slate-400 font-medium px-1 leading-none">Kelas {item.class}</span>
                    )}
                    {type === 'teachers' && item.position && (
                      <span className="text-[10px] text-slate-400 font-medium px-1 leading-none">{item.position}</span>
                    )}
                  </div>
                </TableCell>
              )}
              {type === 'examSchedules' && (
                <TableCell>
                  <span className="text-xs font-medium">{item.proctorName || '-'}</span>
                </TableCell>
              )}
              {type === 'attendance' && (
                <TableCell>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Hadir</Badge>
                </TableCell>
              )}
              {type === 'rombels' && (
                <TableCell>
                  <Badge 
                    className={cn(
                      "font-black text-[10px] px-2 py-0.5 border-none",
                      item.class === 'VII' ? "bg-blue-100 text-blue-700" :
                      item.class === 'VIII' ? "bg-amber-100 text-amber-700" :
                      item.class === 'IX' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                    )}
                  >
                    KLS {item.class}
                  </Badge>
                </TableCell>
              )}
              <TableCell>
                <Badge 
                  className={cn(
                    "font-black text-[10px] px-2 py-0.5 border-none",
                    item.jenjang === 'SD' ? "bg-orange-100 text-orange-700" :
                    item.jenjang === 'SMP' ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-400"
                  )}
                >
                  {item.jenjang || 'N/A'}
                </Badge>
              </TableCell>
              {['students', 'teachers', 'staff'].includes(type) && (
                <TableCell className="hidden md:table-cell">
                  {item.gender === 'Male' ? (
                    <Badge className="bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-50">L</Badge>
                  ) : (
                    <Badge className="bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-50">P</Badge>
                  )}
                </TableCell>
              )}
              {type === 'attendance' && (
                <TableCell className="text-xs whitespace-nowrap">
                  {new Date(item.timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                </TableCell>
              )}
              {type === 'attendance' && (
                <TableCell>
                  {item.notified ? (
                    <Badge className="bg-green-50 text-green-600 border-green-100 font-bold text-[10px]"><Smartphone className="h-3 w-3 mr-1" /> TERKIRIM</Badge>
                  ) : item.waStatus === 'Failed' ? (
                    <Badge className="bg-red-50 text-red-600 border-red-100 font-bold text-[10px]">GAGAL</Badge>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Pending/N/A</span>
                  )}
                </TableCell>
              )}
              {['students', 'teachers', 'staff'].includes(type) && <TableCell className="hidden md:table-cell text-slate-500">{item.phone || '-'}</TableCell>}
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {type !== 'attendance' && (
                    <Button variant="ghost" size="icon" onClick={() => onView(item)} className="h-8 w-8 text-slate-400 hover:text-primary">
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {type !== 'attendance' && type !== 'examRooms' && (
                    <Button variant="ghost" size="icon" onClick={() => onPrintCard(item)} className="h-8 w-8 text-slate-400 hover:text-orange-600">
                      <IdCard className="h-4 w-4" />
                    </Button>
                  )}
                  {type === 'examRooms' && (
                    <Button variant="ghost" size="icon" onClick={() => {
                      const freshItem = {
                        ...item,
                        studentsInRoom: (item.studentsInRoom || []).map((s: any) => students.find((st: any) => st.id === s.id) || s)
                      };
                      exportToExcel([freshItem], 'examRooms');
                    }} className="h-8 w-8 text-slate-400 hover:text-emerald-600" title="Export Peserta Ruang Ini">
                      <FileSpreadsheet className="h-4 w-4" />
                    </Button>
                  )}
                  {isAdmin && (
                    <>
                      {type !== 'attendance' && (
                        <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="h-8 w-8 text-slate-400 hover:text-blue-600">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} className="h-8 w-8 text-slate-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
