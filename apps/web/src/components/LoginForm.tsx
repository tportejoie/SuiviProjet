'use client';

import React, { useState } from 'react';
import { login, registerUser } from '../lib/api';
import Logo from './Logo';

const LoginForm: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (mode === 'login') {
        await login({ email, password });
        window.location.href = '/';
      } else {
        if (password !== passwordConfirm) {
          setError('Les mots de passe ne correspondent pas.');
          setIsLoading(false);
          return;
        }
        await registerUser({ name, email, password });
        await login({ email, password });
        window.location.href = '/';
      }
    } catch {
      setError(mode === 'login' ? 'Identifiants invalides.' : 'Impossible de creer le compte.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-8">
        <div className="flex items-center justify-center mb-6">
          <Logo className="h-10" showText />
        </div>
        <h1 className="text-xl font-black text-slate-900 text-center mb-2">
          {mode === 'login' ? 'Connexion' : 'Inscription'}
        </h1>
        <p className="text-sm text-slate-500 text-center mb-6">
          {mode === 'login' ? 'Acces reserve aux chefs de projet' : 'Creer votre identifiant chef de projet'}
        </p>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirmer le mot de passe</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-60"
          >
            {isLoading ? 'Traitement...' : mode === 'login' ? 'Se connecter' : 'Creer le compte'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          {mode === 'login' ? (
            <button type="button" onClick={() => setMode('register')} className="font-bold text-amber-600 hover:text-amber-700">
              Creer un compte
            </button>
          ) : (
            <button type="button" onClick={() => setMode('login')} className="font-bold text-amber-600 hover:text-amber-700">
              Retour a la connexion
            </button>
          )}
        </div>
        {mode === 'login' && (
          <p className="text-xs text-slate-400 text-center mt-4">
            Premier acces admin : utiliser `ADMIN_EMAIL` et `ADMIN_PASSWORD` dans `.env`.
          </p>
        )}
      </div>
    </div>
  );
};

export default LoginForm;
