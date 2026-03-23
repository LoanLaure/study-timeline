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
  
  // NOUVEAU : On gère l'état global de l'authentification (chargement, connecté, ou visiteur)
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [user, setUser] = useState<any>(null);

  const [newSubject, setNewSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(true);

  const [activeDateTab, setActiveDateTab] = useState<DateTab>('today');

  // Le "Videur" intelligent
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Au lieu de te jeter vers /login, le videur dit : "Affiche la Landing Page !"
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
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    if (!error) fetchDashboardData(); 
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !user) return;
    setIsLoading(true);
    setMessage("");

    const { error } = await supabase.from('subjects').insert([{ 
      name: newSubject.trim(),
      user_id: user.id
    }]);

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

  // --- CALCULS DU DASHBOARD ---
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(task => task.status === 'completed').length;
  const globalProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const activeTasks = allTasks.filter(task => task.status === 'in_progress');

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA');
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString('en-CA');
  const dayAfter = new Date(today); dayAfter.setDate(dayAfter.getDate() + 2);
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

  // 1. ÉCRAN DE CHARGEMENT
  if (authStatus === 'loading') return <div className="min-h-screen bg-beige-300"></div>;

  // 2. ÉCRAN VISITEUR : LA LANDING PAGE MAGNIFIQUE
  if (authStatus === 'unauthenticated') {
    return (
      <main className="min-h-screen bg-beige-300 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        {/* Cercles décoratifs en arrière-plan */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
          <div className="text-8xl mb-6 shadow-2xl rounded-3xl bg-white p-6 transform rotate-[-5deg] hover:rotate-0 transition-transform duration-300">
            📚
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-pink-800 mb-6 tracking-tight">
            Study Timeline
          </h1>
          <p className="text-xl text-pink-600 mb-10 font-medium leading-relaxed max-w-lg">
            Organise tes révisions, valide tes objectifs et détruis la procrastination avec un planning conçu pour les étudiants.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <Link 
              href="/login" 
              className="bg-pink-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg shadow-pink-200 hover:bg-pink-700 hover:scale-105 transition-all w-full sm:w-auto"
            >
              Commencer gratuitement
            </Link>
            <Link 
              href="/login" 
              className="bg-white text-pink-600 px-8 py-4 rounded-full font-bold text-lg shadow-sm border border-pink-200 hover:bg-pink-50 transition-all w-full sm:w-auto"
            >
              J'ai déjà un compte
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
            <div className="bg-white/60 p-6 rounded-2xl border border-pink-100">
              <h3 className="font-bold text-pink-800 mb-2">📊 Progression</h3>
              <p className="text-sm text-pink-600">Visualise ton avancée matière par matière avec des jauges en temps réel.</p>
            </div>
            <div className="bg-white/60 p-6 rounded-2xl border border-pink-100">
              <h3 className="font-bold text-pink-800 mb-2">🗓️ Planning</h3>
              <p className="text-sm text-pink-600">Concentre-toi sur tes tâches du jour et celles en retard pour rester à flot.</p>
            </div>
            <div className="bg-white/60 p-6 rounded-2xl border border-pink-100">
              <h3 className="font-bold text-pink-800 mb-2">🎯 Objectifs</h3>
              <p className="text-sm text-pink-600">Sépare tes actions quotidiennes de tes compétences clés à valider.</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 3. ÉCRAN CONNECTÉ : TON DASHBOARD
  return (
    <main className="min-h-screen bg-beige-300 p-8 text-slate-900">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-pink-800 flex items-center gap-2">
            📚 Study Timeline
          </h2>
          <button onClick={handleLogout} className="text-sm font-semibold text-pink-600 bg-white/50 px-4 py-2 rounded-lg border border-pink-200 hover:bg-white transition-colors">
            Se déconnecter
          </button>
        </div>

        <header className="mb-10 bg-white/50 p-6 rounded-xl shadow-sm border border-pink-200">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-4">
            <div>
              <h1 className="text-4xl font-bold text-pink-800">
                Bonjour {user?.user_metadata?.first_name || "Étudiant"} 👋
              </h1>
              <p className="text-pink-500 mt-2 font-medium">Prêt(e) pour tes révisions du jour ?</p>
            </div>
            <div className="mt-4 md:mt-0 bg-pink-50 text-pink-500 px-4 py-2 rounded-lg font-bold border border-pink-100">
              Progression Globale : {globalProgress}%
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-4 mb-2 overflow-hidden">
            <div className="bg-pink-800 h-4 rounded-full transition-all duration-1000 ease-out" style={{ width: `${globalProgress}%` }}></div>
          </div>
          <p className="text-sm text-slate-500 text-right font-medium">
            {completedTasks} tâches terminées sur {totalTasks}
          </p>
        </header>

        {/* WIDGET PLANNING (Inchangé) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-pink-100 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <h2 className="text-2xl font-bold text-pink-800 flex items-center gap-2">🗓️ Mon Planning</h2>
            <div className="flex bg-pink-50/50 p-1 rounded-lg overflow-x-auto border border-pink-100">
              <button onClick={() => setActiveDateTab('today')} className={`whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeDateTab === 'today' ? 'bg-white text-pink-600 shadow-sm' : 'text-pink-400 hover:text-pink-600'}`}>Aujourd'hui 🚨</button>
              <button onClick={() => setActiveDateTab('tomorrow')} className={`whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeDateTab === 'tomorrow' ? 'bg-white text-pink-600 shadow-sm' : 'text-pink-400 hover:text-pink-600'}`}>Demain</button>
              <button onClick={() => setActiveDateTab('dayAfter')} className={`whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeDateTab === 'dayAfter' ? 'bg-white text-pink-600 shadow-sm' : 'text-pink-400 hover:text-pink-600'}`}>Après-demain</button>
              <button onClick={() => setActiveDateTab('upcoming')} className={`whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeDateTab === 'upcoming' ? 'bg-white text-pink-600 shadow-sm' : 'text-pink-400 hover:text-pink-600'}`}>À venir 🔜</button>
            </div>
          </div>
          {isFetchingData ? <p className="text-pink-400">Chargement de ton planning...</p> : plannedTasks.length === 0 ? (
            <div className="text-center py-8 bg-pink-50/50 rounded-lg border border-dashed border-pink-200">
              <p className="text-pink-600 font-medium">Aucune tâche prévue pour cette date ! 🎉</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plannedTasks.map((task) => {
                const subject = subjects.find(s => s.id === task.subject_id);
                const isOverdue = activeDateTab === 'today' && task.due_date! < todayStr && task.status !== 'completed';
                return (
                  <li key={task.id} className={`border p-4 rounded-lg flex flex-col justify-between gap-4 transition-all ${task.status === 'completed' ? 'bg-slate-50 border-slate-200 opacity-60' : isOverdue ? 'bg-red-50 border-red-200' : 'bg-white border-pink-100 shadow-sm'}`}>
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold px-2 py-1 rounded bg-pink-50 text-pink-600 uppercase">{subject?.name || "Matière"}</span>
                        {isOverdue && <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded animate-pulse">EN RETARD</span>}
                        {activeDateTab === 'upcoming' && <span className="text-xs font-medium text-pink-400">Le {formatDate(task.due_date!)}</span>}
                      </div>
                      <h3 className={`font-semibold ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-800'}`}>{task.title}</h3>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {task.status !== 'not_started' && <button onClick={() => updateTaskStatus(task.id, 'not_started')} className="text-xs font-medium px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100">À faire</button>}
                      {task.status !== 'in_progress' && <button onClick={() => updateTaskStatus(task.id, 'in_progress')} className="text-xs font-medium px-3 py-1.5 rounded-md border border-pink-300 text-pink-700 bg-pink-50 hover:bg-pink-100">En cours</button>}
                      {task.status !== 'completed' && <button onClick={() => updateTaskStatus(task.id, 'completed')} className="text-xs font-medium px-3 py-1.5 rounded-md border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 flex-1">✅ Terminer</button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-200 bg-amber-50/30 h-full">
              <h2 className="text-xl font-bold mb-4 text-amber-800 flex items-center gap-2">🔥 En cours ({activeTasks.length})</h2>
              {isFetchingData ? <p className="text-slate-500 text-sm">Chargement...</p> : activeTasks.length === 0 ? <p className="text-slate-500 text-sm italic">Aucune tâche en cours.</p> : (
                <ul className="flex flex-col gap-3">
                  {activeTasks.map(task => {
                    const subject = subjects.find(s => s.id === task.subject_id);
                    return (
                      <li key={task.id} className="bg-white border border-amber-200 p-3 rounded-lg shadow-sm">
                        <p className="text-xs font-bold text-amber-600 uppercase mb-1">{subject?.name}</p>
                        <p className="font-semibold text-slate-800 text-sm">{task.title}</p>
                        <Link href={`/subject/${task.subject_id}`} className="text-xs text-pink-500 hover:underline mt-2 inline-block">Aller à la matière →</Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-6">
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-pink-100">
              <h2 className="text-xl font-bold mb-4 text-pink-800">Ajouter une matière</h2>
              {/* NOUVEAU : Formulaire Responsive (flex-col sur mobile, flex-row sur PC) */}
              <form onSubmit={handleAddSubject} className="flex flex-col sm:flex-row gap-3">
                <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Ex: Base de données..." className="flex-1 border border-slate-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400" disabled={isLoading} />
                <button type="submit" disabled={isLoading || !newSubject.trim()} className="bg-pink-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-pink-700 disabled:bg-slate-300 whitespace-nowrap">
                  Ajouter
                </button>
              </form>
              {message && <p className="mt-2 text-sm font-medium text-slate-600">{message}</p>}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-pink-100">
              <h2 className="text-xl font-bold mb-4 text-pink-800">Mes Matières</h2>
              {isFetchingData ? <p className="text-slate-500">Chargement...</p> : subjects.length === 0 ? <p className="text-slate-500 italic">Aucune matière pour le moment.</p> : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {subjects.map((subject) => {
                    const subjectTasks = allTasks.filter(t => t.subject_id === subject.id);
                    return (
                      <li key={subject.id}>
                        <Link href={`/subject/${subject.id}`} className="block bg-pink-50 border border-pink-200 p-4 rounded-lg hover:border-pink-300 hover:bg-pink-150 transition-all cursor-pointer group">
                          <span className="font-semibold text-slate-700 group-hover:text-rose-800">{subject.name}</span>
                          <p className="text-xs text-slate-500 mt-1">{subjectTasks.length} tâche(s)</p>
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