"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation"; 
import Link from "next/link";
import { supabase } from "../../lib/supabase"; 

type Task = {
  id: string;
  title: string;
  status: 'not_started' | 'in_progress' | 'completed';
  due_date: string | null;
  created_at: string; // NOUVEAU : On récupère la date de création pour le tri
};

// NOUVEAU : Le type pour nos objectifs
type Objective = {
  id: string;
  title: string;
  is_validated: boolean;
};

type FilterType = 'all' | 'not_started' | 'in_progress' | 'completed';
// NOUVEAU : Type pour le tri
type SortType = 'newest' | 'dueDate';

export default function SubjectPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.id as string;

  const [subjectName, setSubjectName] = useState("Chargement...");
  
  // States Tâches
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  
  // NOUVEAU : State pour le tri des tâches
  const [sortBy, setSortBy] = useState<SortType>('newest');

  // NOUVEAU : States Objectifs
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [newObjectiveTitle, setNewObjectiveTitle] = useState("");
  const [isAddingObjective, setIsAddingObjective] = useState(false);

  // --- RÉCUPÉRATION DES DONNÉES ---

  const fetchData = useCallback(async () => {
    setIsLoadingTasks(true);
    
    // On va chercher la matière, les tâches ET les objectifs en même temps !
    const [subjectRes, tasksRes, objectivesRes] = await Promise.all([
      supabase.from('subjects').select('name').eq('id', subjectId).single(),
      supabase.from('tasks').select('*').eq('subject_id', subjectId),
      supabase.from('objectives').select('*').eq('subject_id', subjectId).order('created_at', { ascending: true })
    ]);

    if (subjectRes.data) setSubjectName(subjectRes.data.name);
    if (tasksRes.data) setTasks(tasksRes.data);
    if (objectivesRes.data) setObjectives(objectivesRes.data);
    
    setIsLoadingTasks(false);
  }, [subjectId]);

  useEffect(() => {
    if (subjectId) fetchData();
  }, [subjectId, fetchData]);

  // --- ACTIONS OBJECTIFS (NOUVEAU) ---

  const handleAddObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjectiveTitle.trim()) return;
    setIsAddingObjective(true);
    
    const { error } = await supabase.from('objectives').insert([{ subject_id: subjectId, title: newObjectiveTitle.trim() }]);
    if (!error) {
      setNewObjectiveTitle("");
      fetchData();
    }
    setIsAddingObjective(false);
  };

  const toggleObjective = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('objectives').update({ is_validated: !currentStatus }).eq('id', id);
    if (!error) fetchData();
  };

  const handleDeleteObjective = async (id: string) => {
    if (!window.confirm("🗑️ Supprimer cet objectif ?")) return;
    const { error } = await supabase.from('objectives').delete().eq('id', id);
    if (!error) fetchData();
  };

  // --- ACTIONS MATIÈRE & TÂCHES (Inchangé) ---
  const handleEditSubject = async () => { /* ... */ };
  const handleDeleteSubject = async () => { /* ... */ };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setIsAddingTask(true);
    const { error } = await supabase.from('tasks').insert([{ subject_id: subjectId, title: newTaskTitle.trim(), due_date: newTaskDueDate || null, status: 'not_started' }]);
    if (!error) { setNewTaskTitle(""); setNewTaskDueDate(""); fetchData(); }
    setIsAddingTask(false);
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    fetchData();
  };
  const handleEditTask = async (taskId: string, currentTitle: string) => { /* ... */ };
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("🗑️ Supprimer ?")) return;
    await supabase.from('tasks').delete().eq('id', taskId);
    fetchData();
  };

  // --- NOUVEAU : LOGIQUE DE TRI ET DE FILTRE ---
  
  // 1. On filtre
  let processedTasks = tasks.filter(task => {
    if (activeFilter === 'all') return true;
    return task.status === activeFilter;
  });

  // 2. On trie
  processedTasks = processedTasks.sort((a, b) => {
    if (sortBy === 'dueDate') {
      // Si pas de date, on met à la fin
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    } else {
      // Tri par défaut : les plus récents en premier
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  // Calculs
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        
        <Link href="/" className="text-rose-600 hover:underline inline-block font-medium">← Retour à l'accueil</Link>

        {/* HEADER */}
        <header className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-3xl font-bold text-slate-800">{subjectName}</h1>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-4 mb-2 overflow-hidden">
            <div className="bg-rose-500 h-4 rounded-full transition-all duration-1000" style={{ width: `${progressPercentage}%` }}></div>
          </div>
          <p className="text-sm text-slate-500 text-right font-medium">{completedTasks} sur {totalTasks} tâches ({progressPercentage}%)</p>
        </header>

        {/* NOUVEAU : SECTION OBJECTIFS / COMPÉTENCES */}
        <div className="bg-rose-50 p-6 rounded-xl shadow-sm border border-rose-100">
          <h2 className="text-xl font-bold mb-4 text-rose-800 flex items-center gap-2">🎯 Compétences à valider</h2>
          
          <ul className="flex flex-col gap-2 mb-4">
            {objectives.map(obj => (
              <li key={obj.id} className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-rose-50">
                <button onClick={() => toggleObjective(obj.id, obj.is_validated)} className="text-2xl hover:scale-110 transition-transform">
                  {obj.is_validated ? '✅' : '⬜'}
                </button>
                <span className={`flex-1 font-medium ${obj.is_validated ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                  {obj.title}
                </span>
                <button onClick={() => handleDeleteObjective(obj.id)} className="text-xs text-slate-300 hover:text-red-500">🗑️</button>
              </li>
            ))}
          </ul>

          <form onSubmit={handleAddObjective} className="flex gap-2">
            <input 
              type="text" value={newObjectiveTitle} onChange={(e) => setNewObjectiveTitle(e.target.value)} 
              placeholder="Ex: Comprendre le théorème de Pythagore..." 
              className="flex-1 border border-rose-200 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 text-sm" 
            />
            <button type="submit" disabled={isAddingObjective || !newObjectiveTitle.trim()} className="bg-rose-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-rose-700 text-sm">
              Ajouter
            </button>
          </form>
        </div>

        {/* SECTION AJOUT TÂCHE */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4 text-slate-800">Ajouter une tâche d'action</h2>
          <form onSubmit={handleAddTask} className="flex flex-col md:flex-row gap-3">
            <input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Ex: Faire les exos 1 à 5..." className="flex-1 border border-slate-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400" />
            <input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} className="border border-slate-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400" />
            <button type="submit" disabled={isAddingTask || !newTaskTitle.trim()} className="bg-slate-800 text-white px-6 py-3 rounded-lg font-bold hover:bg-slate-900">Ajouter</button>
          </form>
        </div>

        {/* SECTION TÂCHES avec Filtres et Tri */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
            <h2 className="text-xl font-bold text-slate-800">Tâches</h2>
            
            <div className="flex flex-wrap items-center gap-4">
              {/* NOUVEAU : Sélecteur de Tri */}
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="bg-slate-50 border border-slate-200 text-sm text-slate-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                <option value="newest">🕒 Plus récentes</option>
                <option value="dueDate">📅 Date limite</option>
              </select>

              {/* Filtres d'onglets (Inchangé) */}
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setActiveFilter('all')} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${activeFilter === 'all' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>Toutes</button>
                <button onClick={() => setActiveFilter('not_started')} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${activeFilter === 'not_started' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>À faire</button>
                <button onClick={() => setActiveFilter('in_progress')} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${activeFilter === 'in_progress' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>En cours</button>
                <button onClick={() => setActiveFilter('completed')} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${activeFilter === 'completed' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>Terminées</button>
              </div>
            </div>
          </div>
          
          {isLoadingTasks ? ( <p className="text-slate-500">Chargement...</p> ) : processedTasks.length === 0 ? ( <p className="text-slate-500 italic">Aucune tâche ici.</p> ) : (
            <ul className="flex flex-col gap-3">
              {processedTasks.map((task) => (
                <li key={task.id} className={`border p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${task.status === 'completed' ? 'bg-slate-50 border-slate-200 opacity-60' : task.status === 'in_progress' ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-800'}`}>{task.title}</h3>
                      <button onClick={() => handleDeleteTask(task.id)} className="text-xs text-slate-400 hover:text-red-600">🗑️</button>
                    </div>
                    {task.due_date && <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md mt-2 inline-block">📅 À finir pour le {formatDate(task.due_date)}</span>}
                  </div>
                  <div className="flex gap-2">
                    {task.status !== 'not_started' && <button onClick={() => updateTaskStatus(task.id, 'not_started')} className="text-xs font-medium px-3 py-1 rounded-full border border-slate-300 text-slate-600">À faire</button>}
                    {task.status !== 'in_progress' && <button onClick={() => updateTaskStatus(task.id, 'in_progress')} className="text-xs font-medium px-3 py-1 rounded-full border border-rose-300 text-rose-700 bg-rose-100">En cours</button>}
                    {task.status !== 'completed' && <button onClick={() => updateTaskStatus(task.id, 'completed')} className="text-xs font-medium px-3 py-1 rounded-full border border-green-300 text-green-700 bg-green-100">Terminé</button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </main>
  );
}