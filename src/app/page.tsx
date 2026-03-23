"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; 
import Link from "next/link";
import { supabase } from "./lib/supabase";

type Subject = { id: string; name: string; };
type Task = { id: string; title: string; status: string; due_date: string | null; subject_id: string; };
type DateTab = 'today' | 'tomorrow' | 'dayAfter' | 'upcoming';

export default function Home() {
  const router = useRouter();
  
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [user, setUser] = useState<any>(null);

  // NOUVEAU : State pour le mode sombre
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [newSubject, setNewSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [activeDateTab, setActiveDateTab] = useState<DateTab>('today');

  // NOUVEAU : On applique la classe 'dark' sur tout le site quand on clique sur le bouton
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAuthStatus('unauthenticated');
      } else {
        setUser(session.user);
        setAuthStatus('authenticated');
        fetchDashboardData();
      }
    };
    checkUser();
  }, []);

  const fetchDashboardData = async () => {
    setIsFetchingData(true);
    const [subjectsResponse, tasksResponse] = await Promise.all([
      supabase.from('subjects').select('*').order('created_at', { ascending: true }),
      supabase.from('tasks').select('*')
    ]);
    if (subjectsResponse.data) setSubjects(subjectsResponse.data);
    if (tasksResponse.data) setAllTasks(tasksResponse.data);
    setIsFetchingData(false);
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    fetchDashboardData(); 
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !user) return;
    setIsLoading(true);
    setMessage("");

    const { error } = await supabase.from('subjects').insert([{ name: newSubject.trim(), user_id: user.id }]);
    if (error) {
      if (error.code === '23505') setMessage("❌ Cette matière existe déjà !");
      else setMessage("❌ Erreur lors de l'ajout.");
    } else {
      setMessage(`✅ Ajouté !`);
      setNewSubject("");
      fetchDashboardData(); 
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthStatus('unauthenticated');
    setUser(null);
  };

  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(task => task.status === 'completed').length;
  const globalProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const activeTasks = allTasks.filter(task => task.status === 'in_progress');

  const todayStr = new Date().toLocaleDateString('en-CA');
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString('en-CA');
  const dayAfter = new Date(); dayAfter.setDate(dayAfter.getDate() + 2);
  const dayAfterStr = dayAfter.toLocaleDateString('en-CA');
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  const plannedTasks = allTasks.filter(task => {
    if (!task.due_date) return false;
    if (task.status === 'completed' && task.due_date < todayStr) return false;
    if (activeDateTab === 'today') return task.due_date <= todayStr;
    if (activeDateTab === 'tomorrow') return task.due_date === tomorrowStr;
    if (activeDateTab === 'dayAfter') return task.due_date === dayAfterStr;
    if (activeDateTab === 'upcoming') return task.due_date > dayAfterStr;
    return false;
  }).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

  if (authStatus === 'loading') return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors"></div>;

  // --- ÉCRAN VISITEUR (Landing Page en Bleu) ---
  if (authStatus === 'unauthenticated') {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden transition-colors">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-200 dark:bg-blue-900 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-200 dark:bg-indigo-900 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
          <div className="text-8xl mb-6 shadow-2xl rounded-3xl bg-white dark:bg-slate-800 p-6 transform rotate-[-5deg] hover:rotate-0 transition-transform duration-300">📚</div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-blue-800 dark:text-blue-400 mb-6 tracking-tight">Study Timeline</h1>
          <p className="text-xl text-blue-600 dark:text-blue-300 mb-10 font-medium leading-relaxed max-w-lg">
            Organise tes révisions, valide tes objectifs et détruis la procrastination avec un planning conçu pour les étudiants.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <Link href="/login" className="bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-blue-700 hover:scale-105 transition-all w-full sm:w-auto">
              Commencer gratuitement
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // --- ÉCRAN CONNECTÉ (Dashboard Bleu & Mode Nuit) ---
  return (
    // NOUVEAU : dark:bg-slate-950 dark:text-slate-100 pour passer le fond en sombre et le texte en clair
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-blue-800 dark:text-blue-400 flex items-center gap-2">📚 Study Timeline</h2>
          
          <div className="flex items-center gap-3">
            {/* BOUTON MODE NUIT */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className="p-2 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title={isDarkMode ? "Passer au mode jour" : "Passer au mode nuit"}
            >
              {isDarkMode ? "☀️" : "🌙"}
            </button>
            
            <button onClick={handleLogout} className="text-sm font-semibold text-blue-600 dark:text-blue-400 bg-white/50 dark:bg-slate-800 px-4 py-2 rounded-lg border border-blue-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-colors">
              Déconnexion
            </button>
          </div>
        </div>

        <header className="mb-10 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-4">
            <div>
              <h1 className="text-4xl font-bold text-blue-800 dark:text-blue-400">
                Bonjour {user?.user_metadata?.first_name || "Étudiant"} 👋
              </h1>
              <p className="text-blue-600 dark:text-blue-300 mt-2 font-medium">Prêt(e) pour tes révisions du jour ?</p>
            </div>
            <div className="mt-4 md:mt-0 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-4 py-2 rounded-lg font-bold border border-blue-100 dark:border-blue-800">
              Progression Globale : {globalProgress}%
            </div>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-4 mb-2 overflow-hidden">
            <div className="bg-blue-600 dark:bg-blue-500 h-4 rounded-full transition-all duration-1000 ease-out" style={{ width: `${globalProgress}%` }}></div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-right font-medium">
            {completedTasks} tâches terminées sur {totalTasks}
          </p>
        </header>

        {/* WIDGET PLANNING */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-8 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-400 flex items-center gap-2">🗓️ Mon Planning</h2>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto">
              <button onClick={() => setActiveDateTab('today')} className={`whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeDateTab === 'today' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>Aujourd'hui 🚨</button>
              <button onClick={() => setActiveDateTab('tomorrow')} className={`whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeDateTab === 'tomorrow' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>Demain</button>
              <button onClick={() => setActiveDateTab('dayAfter')} className={`whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeDateTab === 'dayAfter' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>Après-demain</button>
              <button onClick={() => setActiveDateTab('upcoming')} className={`whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeDateTab === 'upcoming' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>À venir 🔜</button>
            </div>
          </div>
          
          {isFetchingData ? <p className="text-blue-400">Chargement...</p> : plannedTasks.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
              <p className="text-blue-600 dark:text-blue-400 font-medium">Aucune tâche prévue pour cette date ! 🎉</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plannedTasks.map((task) => {
                const subject = subjects.find(s => s.id === task.subject_id);
                const isOverdue = activeDateTab === 'today' && task.due_date! < todayStr && task.status !== 'completed';
                return (
                  <li key={task.id} className={`border p-4 rounded-lg flex flex-col justify-between gap-4 transition-all ${task.status === 'completed' ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60' : isOverdue ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm'}`}>
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 uppercase">{subject?.name || "Matière"}</span>
                        {isOverdue && <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded animate-pulse">EN RETARD</span>}
                        {activeDateTab === 'upcoming' && <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Le {formatDate(task.due_date!)}</span>}
                      </div>
                      <h3 className={`font-semibold ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>{task.title}</h3>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {task.status !== 'not_started' && <button onClick={() => updateTaskStatus(task.id, 'not_started')} className="text-xs font-medium px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">À faire</button>}
                      {task.status !== 'in_progress' && <button onClick={() => updateTaskStatus(task.id, 'in_progress')} className="text-xs font-medium px-3 py-1.5 rounded-md border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800">En cours</button>}
                      {task.status !== 'completed' && <button onClick={() => updateTaskStatus(task.id, 'completed')} className="text-xs font-medium px-3 py-1.5 rounded-md border border-green-300 dark:border-green-800 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-800 flex-1">✅ Terminer</button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-900/10 h-full">
              <h2 className="text-xl font-bold mb-4 text-amber-800 dark:text-amber-500 flex items-center gap-2">🔥 En cours ({activeTasks.length})</h2>
              {isFetchingData ? <p className="text-slate-500 text-sm">Chargement...</p> : activeTasks.length === 0 ? <p className="text-slate-500 text-sm italic">Aucune tâche en cours.</p> : (
                <ul className="flex flex-col gap-3">
                  {activeTasks.map(task => {
                    const subject = subjects.find(s => s.id === task.subject_id);
                    return (
                      <li key={task.id} className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 p-3 rounded-lg shadow-sm">
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase mb-1">{subject?.name}</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{task.title}</p>
                        <Link href={`/subject/${task.subject_id}`} className="text-xs text-blue-500 dark:text-blue-400 hover:underline mt-2 inline-block">Aller à la matière →</Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold mb-4 text-blue-800 dark:text-blue-400">Ajouter une matière</h2>
              <form onSubmit={handleAddSubject} className="flex flex-col sm:flex-row gap-3">
                <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Ex: Base de données..." className="flex-1 border border-slate-300 dark:border-slate-700 bg-transparent p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading} />
                <button type="submit" disabled={isLoading || !newSubject.trim()} className="bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 whitespace-nowrap">
                  Ajouter
                </button>
              </form>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold mb-4 text-blue-800 dark:text-blue-400">Mes Matières</h2>
              {isFetchingData ? <p className="text-slate-500">Chargement...</p> : subjects.length === 0 ? <p className="text-slate-500 italic">Aucune matière pour le moment.</p> : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {subjects.map((subject) => {
                    const subjectTasks = allTasks.filter(t => t.subject_id === subject.id);
                    return (
                      <li key={subject.id}>
                        <Link href={`/subject/${subject.id}`} className="block bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer group">
                          <span className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">{subject.name}</span>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subjectTasks.length} tâche(s)</p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}