"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  
  const [isSignUp, setIsSignUp] = useState(false);
  
  // NOUVEAU : State pour le vrai prénom
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const calculatePasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score;
  };

  const passwordStrength = calculatePasswordStrength(password);
  const strengthColors = ["bg-slate-200", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-500"];
  const strengthLabels = ["", "Très faible", "Faible", "Moyen", "Fort !"];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isSignUp) {
      // NOUVEAU : On envoie le prénom dans les "options" de Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName.trim() // <-- C'est ici que la magie opère !
          }
        }
      });
      if (error) setError(`Erreur : ${error.message}`);
      else router.push("/");
      
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setError(`Erreur Supabase : ${error.message}`);
      else router.push("/");
    }
    
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-beige-300 flex items-center justify-center p-4">
      <div className="bg-white/80 p-8 rounded-2xl shadow-lg border border-pink-200 w-full max-w-md">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-pink-800 mb-2">Study Timeline 📚</h1>
          <p className="text-pink-500 font-medium">
            {isSignUp ? "Crée ton compte pour t'organiser" : "Bon retour parmi nous !"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          
          {/* NOUVEAU : Champ Prénom (visible uniquement à l'inscription) */}
          {isSignUp && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Prénom</label>
              <input 
                type="text" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-slate-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="Ex: Loan"
                required={isSignUp} // Requis seulement si on s'inscrit
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="etudiant@univ.fr"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Mot de passe</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="••••••••"
              required
            />
            
            {isSignUp && password.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden bg-slate-100">
                  {[1, 2, 3, 4].map((level) => (
                    <div key={level} className={`h-full flex-1 transition-all duration-300 ${passwordStrength >= level ? strengthColors[passwordStrength] : 'bg-transparent'}`}></div>
                  ))}
                </div>
                <p className={`text-xs mt-1 font-medium ${strengthColors[passwordStrength].replace('bg-', 'text-')}`}>
                  {strengthLabels[passwordStrength]}
                </p>
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-sm font-medium bg-red-50 p-2 rounded-md">{error}</p>}

          <button 
            type="submit" 
            disabled={loading || (isSignUp && passwordStrength < 3)} 
            className="w-full bg-pink-600 text-white font-bold py-3 rounded-lg hover:bg-pink-700 transition-colors mt-2 disabled:bg-slate-300"
          >
            {loading ? "Chargement..." : (isSignUp ? "S'inscrire" : "Se connecter")}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => { setIsSignUp(!isSignUp); setError(""); }} className="text-sm text-pink-600 hover:underline font-medium">
            {isSignUp ? "Déjà un compte ? Se connecter" : "Pas de compte ? S'inscrire"}
          </button>
        </div>

      </div>
    </main>
  );
}