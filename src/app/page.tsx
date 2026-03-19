"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "./lib/supabase";

// Nos types pour TypeScript
type Subject = { id: string; name: string; };
type Task = { id: string; title: string; status: string; due_date: string | null; subject_id: string; };

export default function Home() {
  const [newSubject, setNewSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // States pour stocker TOUTES nos données
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(true);

  // La fonction qui va chercher les matières ET les tâches en même temps
  const fetchDashboardData = async () => {
    setIsFetchingData(true);
    
    // On utilise Promise.all pour faire les deux requêtes en parallèle (plus rapide !)
    const [subjectsResponse, tasksResponse] = await Promise.all([
      supabase.from('subjects').select('*').order('created_at', { ascending: true }),
      supabase.from('tasks').select('*')
    ]);

    if (subjectsResponse.data) setSubjects(subjectsResponse.data);
    if (tasksResponse.data) setAllTasks(tasksResponse.data);
    
    setIsFetchingData(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;

    setIsLoading(true);
    setMessage("");

    const { error } = await supabase.from('subjects').insert([{ name: newSubject.trim() }]);

    if (error) {
      if (error.code === '23505') setMessage("❌ Cette matière existe déjà !");
      else setMessage("❌ Une erreur est survenue.");
    } else {
      setMessage(`✅ "${newSubject}" ajouté avec succès !`);
      setNewSubject("");
      fetchDashboardData(); // On rafraîchit tout !
    }
    setIsLoading(false);
  };

  // --- CALCULS DU TABLEAU DE BORD ---
  
  // 1. Jauge globale
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(task => task.status === 'completed').length;
  const globalProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // 2. Tâches en cours (pour savoir quoi faire maintenant)
  const activeTasks = allTasks.filter(task => task.status === 'in_progress');

  return (
    <main className="min-h-screen bg-beige-300 p-8 text-slate-900">
      <div className="max-w-6xl mx-auto">
        
        {/* En-tête avec la JAUGE GLOBALE */}
        <header className="mb-10 bg-white/50 p-6 rounded-xl shadow-sm border border-pink-200">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-4">
            <div>
              <h1 className="text-4xl font-bold text-pink-800">Study Timeline 📚</h1>
              <p className="text-pink-500 mt-2">Vue d'ensemble de tes révisions.</p>
            </div>
            <div className="mt-4 md:mt-0 bg-pink-50 text-pink-500 px-4 py-2 rounded-lg font-bold border border-pink-100">
              Progression Globale : {globalProgress}%
            </div>
          </div>

          {/* Barre de progression globale */}
          <div className="w-full bg-slate-200 rounded-full h-4 mb-2 overflow-hidden">
            <div 
              className="bg-pink-800 h-4 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${globalProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-slate-500 text-right font-medium">
            {completedTasks} tâches terminées sur {totalTasks}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLONNE GAUCHE : Les tâches en cours */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-200 bg-amber-50/30 h-full">
              <h2 className="text-xl font-bold mb-4 text-amber-800 flex items-center gap-2">
                🔥 En cours ({activeTasks.length})
              </h2>
              
              {isFetchingData ? (
                <p className="text-slate-500 text-sm">Chargement...</p>
              ) : activeTasks.length === 0 ? (
                <p className="text-slate-500 text-sm italic">Aucune tâche en cours. Va dans tes matières pour commencer à réviser !</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {activeTasks.map(task => {
                    // On retrouve le nom de la matière associée à cette tâche
                    const subject = subjects.find(s => s.id === task.subject_id);
                    
                    return (
                      <li key={task.id} className="bg-white border border-amber-200 p-3 rounded-lg shadow-sm">
                        <p className="text-xs font-bold text-amber-600 uppercase mb-1">{subject?.name || "Matière inconnue"}</p>
                        <p className="font-semibold text-slate-800 text-sm">{task.title}</p>
                        <Link href={`/subject/${task.subject_id}`} className="text-xs text-pink-500 hover:underline mt-2 inline-block">
                          Aller à la matière →
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* COLONNE DROITE : Ajout et Liste des matières */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Formulaire d'ajout de matière */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-pink-100">
              <h2 className="text-xl font-bold mb-4 text-pink-800">Ajouter une matière</h2>
              <form onSubmit={handleAddSubject} className="flex gap-3">
                <input 
                  type="text" 
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Ex: Base de données..."
                  className="flex-1 border border-slate-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400"
                  disabled={isLoading}
                />
                <button 
                  type="submit" 
                  disabled={isLoading || !newSubject.trim()}
                  className="bg-pink-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-pink-700 disabled:bg-slate-300"
                >
                  Ajouter
                </button>
              </form>
              {message && <p className="mt-2 text-sm font-medium text-slate-600">{message}</p>}
            </div>

            {/* Liste des matières */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-pink-100">
              <h2 className="text-xl font-bold mb-4 text-pink-800">Mes Matières</h2>
              {isFetchingData ? (
                <p className="text-slate-500">Chargement...</p>
              ) : subjects.length === 0 ? (
                <p className="text-slate-500 italic">Aucune matière pour le moment.</p>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {subjects.map((subject) => {
                    // Petit bonus : On calcule combien de tâches contient cette matière
                    const subjectTasks = allTasks.filter(t => t.subject_id === subject.id);
                    
                    return (
                      <li key={subject.id}>
                        <Link 
                          href={`/subject/${subject.id}`}
                          className="block bg-pink-50 border border-pink-200 p-4 rounded-lg hover:border-pink-300 hover:bg-pink-150 transition-all cursor-pointer group"
                        >
                          <span className="font-semibold text-slate-700 group-hover:text-rose-800">
                            {subject.name}
                          </span>
                          <p className="text-xs text-slate-500 mt-1">
                            {subjectTasks.length} tâche(s)
                          </p>
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