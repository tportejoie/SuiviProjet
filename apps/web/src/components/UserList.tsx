'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { User, UserRole } from '@/types';
import { createUser, deleteUser, getUsers, updateUser } from '@/lib/api';

interface UserListProps {
  currentUser: User;
}

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: UserRole.USER as UserRole,
  active: true
};

const UserList: React.FC<UserListProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch {
      setError('Impossible de charger les utilisateurs.');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreate = () => {
    setForm({ ...emptyForm });
    setIsEditing(false);
    setEditingId(null);
    setIsOpen(true);
  };

  const openEdit = (user: User) => {
    setForm({
      name: user.name ?? '',
      email: user.email,
      password: '',
      role: user.role,
      active: user.active
    });
    setIsEditing(true);
    setEditingId(user.id);
    setIsOpen(true);
  };

  const handleDelete = async (user: User) => {
    const confirmed = window.confirm(`Supprimer l'utilisateur ${user.email} ?`);
    if (!confirmed) return;
    try {
      await deleteUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch {
      setError('Impossible de supprimer l\'utilisateur.');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.email) {
      setError('Email obligatoire.');
      return;
    }
    if (!isEditing && !form.password) {
      setError('Mot de passe obligatoire.');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing && editingId) {
        const updated = await updateUser(editingId, {
          name: form.name,
          email: form.email,
          password: form.password || undefined,
          role: form.role,
          active: form.active
        });
        setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
      } else {
        const created = await createUser({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          active: form.active
        });
        setUsers(prev => [created, ...prev]);
      }
      setIsOpen(false);
      setIsEditing(false);
      setEditingId(null);
    } catch {
      setError(isEditing ? 'Impossible de mettre a jour l\'utilisateur.' : 'Impossible de creer l\'utilisateur.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Utilisateurs</h2>
        <button
          onClick={openCreate}
          className="flex items-center space-x-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-lg"
        >
          <Plus size={20} />
          <span>Nouvel utilisateur</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-sm text-rose-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left font-black uppercase text-[10px]">Nom</th>
                <th className="px-6 py-4 text-left font-black uppercase text-[10px]">Email</th>
                <th className="px-6 py-4 text-center font-black uppercase text-[10px]">Role</th>
                <th className="px-6 py-4 text-center font-black uppercase text-[10px]">Actif</th>
                <th className="px-6 py-4 text-right font-black uppercase text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 font-semibold text-slate-900">{user.name || '-'}</td>
                  <td className="px-6 py-4 text-slate-600">{user.email}</td>
                  <td className="px-6 py-4 text-center text-slate-600 font-bold">{user.role}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                      user.active ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {user.active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openEdit(user)} className="text-slate-400 hover:text-slate-600">
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={user.id === currentUser.id}
                        title={user.id === currentUser.id ? 'Suppression impossible' : 'Supprimer'}
                        className="text-rose-400 hover:text-rose-600 disabled:text-slate-300 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">
                    Aucun utilisateur.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">{isEditing ? 'Modifier utilisateur' : 'Nouvel utilisateur'}</h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">Fermer</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom</label>
                <input value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{isEditing ? 'Nouveau mot de passe' : 'Mot de passe *'}</label>
                <input type="password" value={form.password} onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                  <select value={form.role} onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value as UserRole }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    <option value={UserRole.USER}>Utilisateur</option>
                    <option value={UserRole.ADMIN}>Admin</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" checked={form.active} onChange={(e) => setForm(prev => ({ ...prev, active: e.target.checked }))} />
                  <span className="text-sm text-slate-600">Actif</span>
                </div>
              </div>
              {error && <div className="text-sm text-rose-600">{error}</div>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600">Annuler</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-bold bg-slate-900 text-white rounded-lg disabled:opacity-60">
                  {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;
