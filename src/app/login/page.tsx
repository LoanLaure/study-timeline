"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  
  // Nos variables d'état (mémoire locale)
  const [isSignUp, setIsSignUp] = useState(false); // Faux = Mode Connexion, Vrai = Mode Inscription
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fonction pour évaluer la force du mot de passe (0 à 4)
  const calculatePasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score += 1; // Au moins 8 caractères
    if (/[A-Z]/.test(pwd)) score += 1; // Au moins une majuscule
    if (/[0-9]/.test(pwd)) score += 1; // Au moins un chiffre
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1; // Au moins un caractère spécial
    return score;
  };

  const passwordStrength = calculatePasswordStrength(password);

  // Couleurs dynamiques pour la jauge de sécurité
  const strengthColors = ["bg-slate-200", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-500"];
  const strengthLabels = ["", "Très faible", "Faible", "Moyen", "Fort !"];

  // Fonction principale déclenchée au clic sur le bouton
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isSignUp) {
      // 1. TENTATIVE D'INSCRIPTION
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) setError(error.message);
      else router.push("/"); // Succès : on renvoie vers l'accueil !
      
    } else {
      // 2. TENTATIVE DE CONNEXION
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setError(`Erreur Supabase : ${error.message}`);
      else router.push("/"); // Succès : on renvoie vers l'accueil !
    }
    
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-beige-300 flex items-center justify-center p-4">
      <div className="bg-white/80 p-8 rounded-2xl shadow-lg border border-pink-200 w-full max-w-md">
        
        {/* En-tête de la page */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-pink-800 mb-2">Study Timeline 📚</h1>
          <p className="text-pink-500 font-medium">
            {isSignUp ? "Crée ton compte pour t'organiser" : "Bon retour parmi nous !"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          
          {/* Champ Email */}
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

          {/* Champ Mot de passe */}
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
            
            {/* Jauge de force du mot de passe (Uniquement visible si on s'inscrit et qu'on tape un MDP) */}
            {isSignUp && password.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden bg-slate-100">
                  {/* On crée 4 petites barres qui se colorent selon le score */}
                  {[1, 2, 3, 4].map((level) => (
                    <div 
                      key={level} 
                      className={`h-full flex-1 transition-all duration-300 ${passwordStrength >= level ? strengthColors[passwordStrength] : 'bg-transparent'}`}
                    ></div>
                  ))}
                </div>
                <p className={`text-xs mt-1 font-medium ${strengthColors[passwordStrength].replace('bg-', 'text-')}`}>
                  {strengthLabels[passwordStrength]}
                </p>
              </div>
            )}
          </div>

          {/* Affichage des erreurs éventuelles */}
          {error && <p className="text-red-500 text-sm font-medium bg-red-50 p-2 rounded-md">{error}</p>}

          {/* Bouton de validation */}
          <button 
            type="submit" 
            disabled={loading || (isSignUp && passwordStrength < 3)} // On force un MDP fort !
            className="w-full bg-pink-600 text-white font-bold py-3 rounded-lg hover:bg-pink-700 transition-colors mt-2 disabled:bg-slate-300"
          >
            {loading ? "Chargement..." : (isSignUp ? "S'inscrire" : "Se connecter")}
          </button>
        </form>

        {/* Bouton pour basculer entre Connexion et Inscription */}
        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
            className="text-sm text-pink-600 hover:underline font-medium"
          >
            {isSignUp ? "Déjà un compte ? Se connecter" : "Pas de compte ? S'inscrire"}
          </button>
        </div>

      </div>
    </main>
  );
}