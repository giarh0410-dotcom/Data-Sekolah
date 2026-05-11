import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Smartphone, Clock, CheckCircle2, ChevronRight, ChevronLeft, Send, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { addRecord } from '../lib/firestore-service';

interface CbtPortalProps {
  user: any;
  sessions: any[];
  questions: any[];
  examSchedules: any[];
  rombels: any[];
}

export function CbtPortal({ user, sessions, questions, examSchedules, rombels }: CbtPortalProps) {
  const [token, setToken] = useState('');
  const [activeSession, setActiveSession] = useState<any>(null);
  const [examStarted, setExamStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examCompleted, setExamCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const filteredQuestions = activeSession 
    ? questions.filter(q => {
        const schedule = examSchedules.find(s => s.id === activeSession.examScheduleId);
        if (!schedule) return false;

        const matchesSubject = q.subjectId === schedule.subjectId;
        
        // Find class from rombelName
        const rombel = rombels.find(r => r.name === schedule.rombelName);
        const scheduleClass = rombel ? rombel.class : (['VII', 'VIII', 'IX'].includes(schedule.rombelName) ? schedule.rombelName : null);
        
        // Filter by class if defined in question
        const matchesClass = q.class ? (q.class === scheduleClass || schedule.rombelName === 'Semua') : true;
        
        return matchesSubject && matchesClass;
      })
    : [];

  useEffect(() => {
    let timer: any;
    if (examStarted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (examStarted && timeLeft === 0) {
      handleSubmitExam();
    }
    return () => clearInterval(timer);
  }, [examStarted, timeLeft]);

  const handleLogin = () => {
    const session = sessions.find(s => s.token === token.toUpperCase() && s.isActive);
    if (session) {
      setActiveSession(session);
      setTimeLeft(session.durationMinutes * 60);
      toast.success('Token valid. Selamat mengerjakan!');
    } else {
      toast.error('Token tidak valid atau sesi telah berakhir');
    }
  };

  const startExam = () => {
    if (filteredQuestions.length === 0) {
      toast.error('Ganjal: Pertanyaan tidak ditemukan untuk mata pelajaran ini.');
      return;
    }
    setExamStarted(true);
  };

  const handleAnswer = (questionId: string, optionIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleSubmitExam = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let correctCount = 0;
      filteredQuestions.forEach(q => {
        if (answers[q.id] === q.correctOption) {
          correctCount++;
        }
      });

      const score = Math.round((correctCount / filteredQuestions.length) * 100);
      setFinalScore(score);

      const result = {
        sessionId: activeSession.id,
        studentId: user?.uid || 'anonymous',
        studentName: user?.displayName || 'Siswa',
        score,
        answers,
        status: 'completed',
        startTime: new Date(Date.now() - (activeSession.durationMinutes * 60 - timeLeft) * 1000).toISOString(),
        finishTime: new Date().toISOString()
      };

      await addRecord('examResults', result);
      setExamCompleted(true);
      toast.success('Ujian berhasil dikirim!');
    } catch (error) {
      toast.error('Gagal mengirim jawaban. Silakan hubungi pengawas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (examCompleted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 space-y-6">
        <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-slate-900 uppercase">Ujian Selesai!</h2>
          <p className="text-slate-500">Terima kasih telah mengerjakan ujian dengan jujur.</p>
        </div>
        <Card className="w-full max-w-sm border-2 border-primary/20">
            <CardContent className="pt-6 text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Skor Akhir</p>
                <p className="text-6xl font-black text-primary">{finalScore}</p>
                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between text-xs">
                    <span className="text-slate-400">Total Soal: {filteredQuestions.length}</span>
                    <span className="text-slate-400">Terjawab: {Object.keys(answers).length}</span>
                </div>
            </CardContent>
        </Card>
        <Button variant="outline" onClick={() => window.location.reload()}>Kembali ke Dashboard</Button>
      </div>
    );
  }

  if (examStarted) {
    const currentQuestion = filteredQuestions[currentQuestionIndex];
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b p-4 rounded-xl flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
                {currentQuestionIndex + 1}
             </div>
             <div>
                <h3 className="font-bold text-slate-900 leading-none">{activeSession.subjectName}</h3>
                <p className="text-[10px] text-slate-500 font-medium uppercase mt-1">Siswa: {user?.displayName}</p>
             </div>
          </div>
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold text-lg",
            timeLeft < 300 ? "bg-red-50 text-red-600 animate-pulse" : "bg-slate-100 text-slate-600"
          )}>
            <Timer className="h-5 w-5" />
            {formatTime(timeLeft)}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Card className="border-2 border-slate-100 shadow-none">
              <CardContent className="pt-8 pb-12 space-y-6">
                <p className="text-xl font-medium leading-relaxed text-slate-800">
                    {currentQuestion.text}
                </p>
                <div className="space-y-3">
                    {currentQuestion.options?.map((option: string, idx: number) => (
                        <button
                            key={idx}
                            onClick={() => handleAnswer(currentQuestion.id, idx)}
                            className={cn(
                                "w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 group",
                                answers[currentQuestion.id] === idx
                                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                                    : "border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-600"
                            )}
                        >
                            <div className={cn(
                                "h-10 w-10 shrink-0 rounded-lg flex items-center justify-center font-bold text-lg border-2 transition-colors",
                                answers[currentQuestion.id] === idx
                                    ? "bg-primary border-primary text-white"
                                    : "bg-white border-slate-200 group-hover:border-slate-300 text-slate-400"
                            )}>
                                {String.fromCharCode(65 + idx)}
                            </div>
                            <span className="font-medium">{option}</span>
                        </button>
                    ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" /> Sebelumnya
              </Button>
              
              {currentQuestionIndex === filteredQuestions.length - 1 ? (
                <Button 
                    className="bg-green-600 hover:bg-green-700 gap-2 px-8"
                    onClick={() => {
                        if (confirm('Yakin ingin menyelesaikan ujian? Pastikan semua soal telah terjawab.')) {
                            handleSubmitExam();
                        }
                    }}
                    disabled={isSubmitting}
                >
                    <Send className="h-4 w-4" /> Selesai & Kirim
                </Button>
              ) : (
                <Button
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="gap-2"
                >
                    Selanjutnya <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4">
             <Card>
                <CardHeader className="p-4 border-b">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">Navigasi Soal</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="grid grid-cols-5 gap-2">
                        {filteredQuestions.map((q, idx) => (
                            <button
                                key={q.id}
                                onClick={() => setCurrentQuestionIndex(idx)}
                                className={cn(
                                    "h-10 w-full rounded-lg text-xs font-bold border-2 transition-all",
                                    currentQuestionIndex === idx ? "border-primary bg-primary text-white scale-110 z-10" :
                                    answers[q.id] !== undefined ? "border-green-200 bg-green-50 text-green-700" :
                                    "border-slate-100 bg-white text-slate-400"
                                )}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>
                    <div className="mt-6 pt-4 border-t space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                            <div className="h-3 w-3 rounded-full bg-green-500" />
                            Terjawab: {Object.keys(answers).length}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                            <div className="h-3 w-3 rounded-full bg-slate-200" />
                            Belum: {filteredQuestions.length - Object.keys(answers).length}
                        </div>
                    </div>
                </CardContent>
             </Card>
          </div>
        </div>
      </div>
    );
  }

  if (activeSession) {
    return (
      <div className="max-w-md mx-auto py-10 space-y-6">
        <Card className="border-2 border-primary/20 overflow-hidden">
            <div className="h-2 bg-primary w-full" />
            <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl font-black uppercase">{activeSession.subjectName}</CardTitle>
                <CardDescription>Konfirmasi Data Peserta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs text-slate-500 uppercase font-bold tracking-tight">Nama Peserta</span>
                        <span className="text-sm font-black">{user?.displayName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs text-slate-500 uppercase font-bold tracking-tight">Mata Pelajaran</span>
                        <span className="text-sm font-black">{activeSession.subjectName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs text-slate-500 uppercase font-bold tracking-tight">Durasi</span>
                        <span className="text-sm font-black">{activeSession.durationMinutes} Menit</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-xs text-slate-500 uppercase font-bold tracking-tight">Jumlah Soal</span>
                        <span className="text-sm font-black">{filteredQuestions.length} Butir</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-3">
                        <Smartphone className="h-5 w-5 text-amber-600 shrink-0" />
                        <p className="text-[10px] text-amber-800 leading-normal">
                            Pastikan koneksi internet stabil. Jangan menutup tab browser atau menekan tombol kembali saat ujian berlangsung.
                        </p>
                    </div>
                    <Button className="w-full h-12 text-lg font-bold" onClick={startExam}>
                        Mulai Mengerjakan
                    </Button>
                    <Button variant="ghost" className="w-full text-slate-400" onClick={() => setActiveSession(null)}>
                        Batal
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-20 px-4 space-y-8">
      <div className="text-center space-y-2">
        <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Smartphone className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase">Portal CBT Siswa</h2>
        <p className="text-slate-500 text-sm">Masukkan token ujian yang diberikan oleh pengawas untuk memulai.</p>
      </div>

      <Card className="shadow-2xl border-none">
        <CardContent className="pt-6 space-y-4">
            <div className="space-y-2 text-center">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Token Ujian</label>
                <Input 
                    value={token}
                    onChange={(e) => setToken(e.target.value.toUpperCase())}
                    className="text-center text-3xl font-black tracking-[0.3em] h-16 uppercase border-2 focus:border-primary transition-all"
                    placeholder="XXXXXX"
                    maxLength={6}
                />
            </div>
            <Button 
                className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/25" 
                size="lg" 
                onClick={handleLogin}
                disabled={token.length !== 6}
            >
                Masuk ke Ujian
            </Button>
        </CardContent>
      </Card>

      <div className="text-center">
         <p className="text-[10px] font-bold text-slate-400 uppercase">Siswa Terdeteksi</p>
         <div className="flex items-center justify-center gap-2 mt-2">
            <div className="h-6 w-6 rounded-full bg-slate-100 border overflow-hidden">
                {user?.photoURL ? <img src={user.photoURL} referrerPolicy="no-referrer" /> : <div className="h-full w-full flex items-center justify-center"><CheckCircle2 className="h-3 w-3 text-slate-300" /></div>}
            </div>
            <span className="text-xs font-bold text-slate-600">{user?.displayName || user?.email}</span>
         </div>
      </div>
    </div>
  );
}
