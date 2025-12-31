
'use client';

import React, { useState } from 'react';
import { Client } from '../types';
import { Plus, Search, MoreHorizontal, Building2, Pencil } from 'lucide-react';
import { createClient, parseClientOrder, updateClient } from '../lib/api';

interface ClientListProps {
  clients: Client[];
  contacts: { clientId: string; active: boolean }[];
  onCreated: (client: Client) => void;
}

const ClientList: React.FC<ClientListProps> = ({ clients, contacts, onCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    address: '',
    siren: '',
    siret: '',
    tvaIntra: '',
    notes: ''
  });

  const updateField = (key: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm({
      name: '',
      address: '',
      siren: '',
      siret: '',
      tvaIntra: '',
      notes: ''
    });
    setIsParsing(false);
    setParseWarnings([]);
    setError(null);
  };

  const startEdit = (client: Client) => {
    setForm({
      name: client.name,
      address: client.address,
      siren: client.siren || '',
      siret: client.siret,
      tvaIntra: client.tvaIntra || '',
      notes: client.notes || ''
    });
    setEditingClientId(client.id);
    setIsEditing(true);
    setIsOpen(true);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.name || !form.address) {
      setError('Merci de renseigner tous les champs obligatoires.');
      return;
    }
    if (form.siret && !/^\d{14}$/.test(form.siret)) {
      setError('Le SIRET doit contenir exactement 14 chiffres.');
      return;
    }
    setIsSaving(true);
    try {
      if (isEditing && editingClientId) {
        const updated = await updateClient(editingClientId, {
          name: form.name,
          address: form.address,
          siren: form.siren || undefined,
          siret: form.siret || "",
          tvaIntra: form.tvaIntra || undefined,
          notes: form.notes || undefined
        });
        onCreated(updated);
      } else {
        const created = await createClient({
          name: form.name,
          address: form.address,
          siren: form.siren || undefined,
          siret: form.siret || "",
          tvaIntra: form.tvaIntra || undefined,
          notes: form.notes || undefined
        });
        onCreated(created);
      }
      resetForm();
      setIsOpen(false);
      setIsEditing(false);
      setEditingClientId(null);
    } catch (err) {
      setError(isEditing ? 'Impossible de mettre a jour le client.' : 'Impossible de creer le client.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleParseOrder = async (file: File) => {
    setIsParsing(true);
    setParseWarnings([]);
    setError(null);
    try {
      const response = await parseClientOrder(file);
      if (!response.ok) {
        let message = '';
        try {
          const data = await response.json();
          message = data?.error || '';
        } catch {
          message = await response.text();
        }
        if (message.includes('Missing OPENAI_API_KEY')) {
          throw new Error('Cle OpenAI manquante. Renseigne OPENAI_API_KEY dans .env.');
        }
        if (message.includes('Missing Azure OCR settings')) {
          throw new Error('Configuration Azure OCR manquante. Renseigne AZURE_DOCINT_ENDPOINT et AZURE_DOCINT_KEY dans .env.');
        }
        if (message.includes('OCR/LLM disabled')) {
          throw new Error('OCR/LLM desactive. Mets OCR_LLM_ENABLED=true dans .env.');
        }
        throw new Error(message || 'Parse failed');
      }
      const data = await response.json();
      setForm(prev => ({
        ...prev,
        name: data.name || prev.name,
        address: data.address || prev.address,
        siren: data.siren || prev.siren,
        siret: data.siret || prev.siret,
        tvaIntra: data.tvaIntra || prev.tvaIntra,
        notes: data.notes || prev.notes
      }));
      if (Array.isArray(data.warnings)) {
        setParseWarnings(data.warnings);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Impossible d\'analyser la commande.';
      setError(errorMessage);
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Base Clients</h2>
        <button
          onClick={() => {
            resetForm();
            setIsEditing(false);
            setEditingClientId(null);
            setIsOpen(true);
          }}
          className="flex items-center space-x-2 bg-amber-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20"
        >
          <Plus size={20} />
          <span>Nouveau Client</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher un client, SIREN..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 font-bold bg-slate-50/50">
              <th className="px-6 py-4 text-left">Raison Sociale</th>
              <th className="px-6 py-4 text-left">SIREN / SIRET</th>
              <th className="px-6 py-4 text-left">Adresse</th>
              <th className="px-6 py-4 text-center">Contacts</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map(client => (
              <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                      <Building2 size={20} />
                    </div>
                    <span className="font-bold text-slate-900">{client.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-slate-900 font-medium">{client.siren}</p>
                  <p className="text-xs text-slate-400">{client.siret}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-slate-500 line-clamp-1 max-w-[200px]">{client.address}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">
                    {contacts.filter(c => c.clientId === client.id && c.active).length} actifs
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => startEdit(client)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <Pencil size={14} />
                    Modifier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">{isEditing ? 'Modifier le client' : 'Nouveau client'}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                Fermer
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isEditing && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500 uppercase">Importer depuis une commande</p>
                    <span className="text-[10px] text-slate-400">OCR/LLM</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleParseOrder(file);
                    }}
                  />
                  {isParsing && <p className="text-xs text-slate-400">Analyse en cours...</p>}
                  {parseWarnings.length > 0 && (
                    <div className="text-xs text-amber-700">
                      <p className="font-bold">Champs a verifier :</p>
                      <ul className="list-disc pl-5">
                        {parseWarnings.map((warning, idx) => (
                          <li key={`${warning}-${idx}`}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Raison sociale *</label>
                <input
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Adresse *</label>
                <textarea
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SIREN</label>
                <input
                  value={form.siren}
                  onChange={(e) => updateField('siren', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SIRET</label>
                <input
                  inputMode="numeric"
                  pattern="\d{14}"
                  value={form.siret}
                  onChange={(e) => updateField('siret', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">TVA intracom</label>
                <input
                  value={form.tvaIntra}
                  onChange={(e) => updateField('tvaIntra', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              {error && (
                <div className="text-sm text-rose-600">{error}</div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-bold bg-amber-500 text-white rounded-lg disabled:opacity-60"
                >
                  {isSaving ? (isEditing ? 'Mise a jour...' : 'Creation...') : (isEditing ? 'Mettre a jour' : 'Creer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientList;
