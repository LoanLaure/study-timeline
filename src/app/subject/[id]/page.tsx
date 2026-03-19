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
};

// On définit les filtres possibles
type FilterType = 'all' | 'not_started' | 'in_progress' | 'completed';

export default function SubjectPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.id as string;

  const [subjectName, setSubjectName] = useState("Chargement...");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskMessage, setTaskMessage] = useState("");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  
  // NOUVEAU : Le State pour notre filtre actuel (par défaut : on voit tout)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const fetchSubjectDetails = useCallback(async () => {
    const { data } = await supabase.from('subjects').select('name').eq('id', subjectId).single();
    if (data) setSubjectName(data.name);
  }, [subjectId]);

  const fetchTasks = useCallback(async () => {
    setIsLoadingTasks(true);
    const { data } = await supabase.from('tasks').select('*').eq('subject_id', subjectId).order('created_at', { ascending: false });
    if (data) setTasks(data);
    setIsLoadingTasks(false);
  }, [subjectId]);

  useEffect(() => {
    if (subjectId) { fetchSubjectDetails(); fetchTasks(); }
  }, [subjectId, fetchSubjectDetails, fetchTasks]);

  // Actions Matière
  const handleEditSubject = async () => {
    const newName = window.prompt("Modifier le nom :", subjectName);
    if (!newName || newName.trim() === "" || newName === subjectName) return;
    const { error } = await supabase.from('subjects').update({ name: newName.trim() }).eq('id', subjectId);
    if (!error) setSubjectName(newName.trim());
  };

  const handleDeleteSubject = async () => {
    if (!window.confirm(`⚠️ Supprimer "${subjectName}" et toutes ses tâches ?`)) return;
    const { error } = await supabase.from('subjects').delete().eq('id', subjectId);
    if (!error) router.push('/');
  };

  // Actions Tâches
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setIsAddingTask(true);
    const { error } = await supabase.from('tasks').insert([{ subject_id: subjectId, title: newTaskTitle.trim(), due_date: newTaskDueDate || null, status: 'not_started' }]);
    if (!error) { setTaskMessage(`✅ Ajouté !`); setNewTaskTitle(""); setNewTaskDueDate(""); fetchTasks(); }
    setIsAddingTask(false);
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    if (!error) fetchTasks();
  };

  const handleEditTask = async (taskId: string, currentTitle: string) => {
    const newTitle = window.prompt("Modifier la tâche :", currentTitle);
    if (!newTitle || newTitle.trim() === "" || newTitle === currentTitle) return;
    const { error } = await supabase.from('tasks').update({ title: newTitle.trim() }).eq('id', taskId);
    if (!error) fetchTasks();
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("🗑️ Supprimer ?")) return;
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (!error) fetchTasks();
  };

  // NOUVEAU : La magie du filtre ! On crée une liste filtrée à partir de la vraie liste
  const filteredTasks = tasks.filter(task => {
    if (activeFilter === 'all') return true;
    return task.status === activeFilter;
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  return (
    <main className="min-h-screen bg-pink-50 p-8 text-slate-900">
      <div className="max-w-4xl mx-auto">
        
        {/* Changement de couleur : hover:text-rose-600 */}
        <Link href="/" className="text-pink-500 hover:underline mb-6 inline-block font-medium">
          ← Retour à l'accueil
        </Link>

        <header className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-pink-200">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-3xl font-bold text-pink-800">{subjectName}</h1>
            <div className="flex gap-2">
              <button onClick={handleEditSubject} className="text-slate-400 hover:text-rose-600 p-2 rounded">✏️</button>
              <button onClick={handleDeleteSubject} className="text-slate-400 hover:text-red-600 p-2 rounded">🗑️</button>
            </div>
          </div>
          
          <div className="w-full bg-slate-200 rounded-full h-4 mb-2 overflow-hidden">
            {/* Changement de couleur : bg-rose-500 */}
            <div className="bg-pink-800 h-4 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercentage}%` }}></div>
          </div>
          <p className="text-sm text-slate-500 text-right font-medium">
            {completedTasks} sur {totalTasks} tâches ({progressPercentage}%)
          </p>
        </header>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-pink-200 mb-6">
          <h2 className="text-xl font-bold mb-4 text-pink-800">Ajouter une tâche</h2>
          <form onSubmit={handleAddTask} className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-3">
              <input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Ex: Lire le chapitre 1..." className="flex-1 border border-slate-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400" disabled={isAddingTask} />
              <input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} className="border border-slate-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 text-slate-600" disabled={isAddingTask} />
              <button type="submit" disabled={isAddingTask || !newTaskTitle.trim()} className="bg-pink-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-pink-700 disabled:bg-slate-300 whitespace-nowrap">
                {isAddingTask ? "Ajout..." : "Ajouter"}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <h2 className="text-xl font-bold text-pink-800">Tâches</h2>
            
            {/* NOUVEAU : Le système d'onglets (Filtres) */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setActiveFilter('all')} 
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeFilter === 'all' ? 'bg-white text-pink-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Toutes
              </button>
              <button 
                onClick={() => setActiveFilter('not_started')} 
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeFilter === 'not_started' ? 'bg-white text-pink-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                À faire
              </button>
              <button 
                onClick={() => setActiveFilter('in_progress')} 
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeFilter === 'in_progress' ? 'bg-white text-pink-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                En cours
              </button>
              <button 
                onClick={() => setActiveFilter('completed')} 
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeFilter === 'completed' ? 'bg-white text-pink-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Terminées 🎉
              </button>
            </div>
          </div>
          
          {isLoadingTasks ? (
            <p className="text-slate-500">Chargement...</p>
          ) : filteredTasks.length === 0 ? (
            <p className="text-slate-500 italic">Aucune tâche dans cette catégorie.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {/* On map maintenant sur `filteredTasks` et plus sur `tasks` */}
              {filteredTasks.map((task) => (
                <li key={task.id} className={`border p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${task.status === 'completed' ? 'bg-slate-50 border-slate-200 opacity-60' : task.status === 'in_progress' ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                        {task.title}
                      </h3>
                      <button onClick={() => handleEditTask(task.id, task.title)} className="text-xs text-slate-400 hover:text-rose-600">✏️</button>
                      <button onClick={() => handleDeleteTask(task.id)} className="text-xs text-slate-400 hover:text-red-600">🗑️</button>
                    </div>
                    {task.due_date && <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md mt-2 inline-block">📅 À finir pour le {formatDate(task.due_date)}</span>}
                  </div>

                  <div className="flex gap-2">
                    {task.status !== 'not_started' && <button onClick={() => updateTaskStatus(task.id, 'not_started')} className="text-xs font-medium px-3 py-1 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100">À faire</button>}
                    {task.status !== 'in_progress' && <button onClick={() => updateTaskStatus(task.id, 'in_progress')} className="text-xs font-medium px-3 py-1 rounded-full border border-rose-300 text-rose-700 bg-rose-100 hover:bg-rose-200">En cours</button>}
                    {task.status !== 'completed' && <button onClick={() => updateTaskStatus(task.id, 'completed')} className="text-xs font-medium px-3 py-1 rounded-full border border-green-300 text-green-700 bg-green-100 hover:bg-green-200">Terminé</button>}
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