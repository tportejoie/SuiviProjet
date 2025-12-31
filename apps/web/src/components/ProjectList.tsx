'use client';

import React, { useMemo, useState } from 'react';
import { Client, Contact, Project, ProjectStatus, ProjectType, User, UserRole } from '../types';
import { Plus, Search, Filter, ArrowRight, Pencil, Trash2, Download } from 'lucide-react';
import { createContact, createProject, deleteProject, getNextProjectNumber, updateProject } from '../lib/api';

interface ProjectListProps {
  projects: Project[];
  clients: Client[];
  contacts: Contact[];
  currentUser: User;
  onSelect: (id: string) => void;
  onCreated: (project: Project) => void;
  onUpdated: (project: Project) => void;
  onDeleted: (projectId: string) => void;
  onContactCreated: (contact: Contact) => void;
}

type DeliverableForm = {
  label: string;
  percentage: string;
  targetDate: string;
};

const ProjectList: React.FC<ProjectListProps> = ({ projects, clients, contacts, currentUser, onSelect, onCreated, onUpdated, onDeleted, onContactCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [autoNumber, setAutoNumber] = useState(true);
  const [nextNumber, setNextNumber] = useState<string>('');
  const [useNewContact, setUseNewContact] = useState(false);
  const [deliverables, setDeliverables] = useState<DeliverableForm[]>([]);
  const [form, setForm] = useState({
    projectNumber: '',
    orderNumber: '',
    orderDate: '',
    orderAmount: '',
    quoteNumber: '',
    quoteDate: '',
    clientId: '',
    contactId: '',
    designation: '',
    projectManager: '',
    projectManagerEmail: '',
    type: ProjectType.AT as ProjectType,
    status: ProjectStatus.PREVU as ProjectStatus,
    atDaysSoldBO: '',
    atDaysSoldSite: '',
    atDailyRateBO: '',
    atDailyRateSite: '',
    contactFirstName: '',
    contactLastName: '',
    contactRole: '',
    contactEmail: ''
  });
  const totalAtAmount =
    Number(form.atDaysSoldBO || 0) * Number(form.atDailyRateBO || 0) +
    Number(form.atDaysSoldSite || 0) * Number(form.atDailyRateSite || 0);

  const clientContacts = useMemo(
    () => contacts.filter(c => c.clientId === form.clientId),
    [contacts, form.clientId]
  );

  const updateField = (key: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm({
      projectNumber: '',
      orderNumber: '',
      orderDate: '',
      orderAmount: '',
      quoteNumber: '',
      quoteDate: '',
      clientId: '',
      contactId: '',
      designation: '',
      projectManager: '',
      projectManagerEmail: '',
      type: ProjectType.AT,
      status: ProjectStatus.PREVU,
      atDaysSoldBO: '',
      atDaysSoldSite: '',
      atDailyRateBO: '',
      atDailyRateSite: '',
      contactFirstName: '',
      contactLastName: '',
      contactRole: '',
      contactEmail: ''
    });
    setAutoNumber(true);
    setNextNumber('');
    setUseNewContact(false);
    setDeliverables([]);
    setError(null);
  };

  const openCreate = async () => {
    resetForm();
    if (currentUser.role !== UserRole.ADMIN) {
      setForm(prev => ({
        ...prev,
        projectManager: currentUser.name || currentUser.email,
        projectManagerEmail: currentUser.email
      }));
    }
    setIsEditing(false);
    setEditingId(null);
    setIsOpen(true);
    try {
      const { next } = await getNextProjectNumber(new Date().getFullYear());
      setNextNumber(next);
    } catch (err) {
      setNextNumber('');
    }
  };

  const openEdit = (project: Project) => {
    setForm({
      projectNumber: project.projectNumber,
      orderNumber: project.orderNumber,
      orderDate: project.orderDate?.slice(0, 10) ?? '',
      orderAmount: project.orderAmount?.toString() ?? '',
      quoteNumber: project.quoteNumber,
      quoteDate: project.quoteDate?.slice(0, 10) ?? '',
      clientId: project.clientId,
      contactId: project.contactId,
      designation: project.designation,
      projectManager: project.projectManager,
      projectManagerEmail: project.projectManagerEmail ?? '',
      type: project.type,
      status: project.status,
      atDaysSoldBO: project.atMetrics?.daysSoldBO?.toString() ?? '',
      atDaysSoldSite: project.atMetrics?.daysSoldSite?.toString() ?? '',
      atDailyRateBO: project.atMetrics?.dailyRateBO?.toString() ?? '',
      atDailyRateSite: project.atMetrics?.dailyRateSite?.toString() ?? '',
      contactFirstName: '',
      contactLastName: '',
      contactRole: '',
      contactEmail: ''
    });
    setAutoNumber(false);
    setUseNewContact(false);
    setDeliverables([]);
    setIsEditing(true);
    setEditingId(project.id);
    setIsOpen(true);
  };

  const handleDelete = async (project: Project) => {
    const confirmed = window.confirm(`Supprimer le projet ${project.projectNumber} - ${project.designation} ?`);
    if (!confirmed) return;
    try {
      await deleteProject(project.id);
      onDeleted(project.id);
    } catch (err) {
      setError('Impossible de supprimer le projet car des donnees sont deja liees (imputations, livrables, snapshots ou bordereaux).');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/projects/export');
      if (!response.ok) {
        throw new Error('Export failed');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `projets-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Impossible de generer l\'export Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  const addDeliverable = () => {
    setDeliverables(prev => [...prev, { label: '', percentage: '', targetDate: '' }]);
  };

  const updateDeliverable = (index: number, key: keyof DeliverableForm, value: string) => {
    setDeliverables(prev => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const removeDeliverable = (index: number) => {
    setDeliverables(prev => prev.filter((_, i) => i !== index));
  };

  const validateForfait = () => {
    if (!form.orderAmount && !isEditing) {
      setError('Le montant de commande est obligatoire pour un projet forfait.');
      return false;
    }
    if (deliverables.length === 0 && !isEditing) {
      setError('Merci d\'ajouter au moins un livrable pour un projet forfait.');
      return false;
    }
    const totalPercentage = deliverables.reduce((acc, deliverable) => acc + Number(deliverable.percentage || 0), 0);
    if (deliverables.length > 0 && Math.round(totalPercentage * 100) !== 10000) {
      setError('La somme des pourcentages doit etre egale a 100%.');
      return false;
    }
    for (const deliverable of deliverables) {
      if (!deliverable.label || !deliverable.targetDate) {
        setError('Chaque livrable doit avoir un libelle et une date cible.');
        return false;
      }
      if (!deliverable.percentage) {
        setError('Chaque livrable doit avoir un pourcentage.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.orderNumber || !form.orderDate || !form.quoteNumber || !form.quoteDate || !form.clientId || !form.designation || !form.projectManager || !form.projectManagerEmail) {
      setError('Merci de renseigner tous les champs obligatoires.');
      return;
    }

    if (useNewContact) {
      if (!form.contactFirstName || !form.contactLastName || !form.contactRole || !form.contactEmail) {
        setError('Merci de renseigner le contact (nom, prenom, fonction, email).');
        return;
      }
    } else if (!form.contactId) {
      setError('Merci de selectionner un contact.');
      return;
    }

    if (!autoNumber && !form.projectNumber) {
      setError('Le numero de projet est obligatoire si la numerotation automatique est desactivee.');
      return;
    }

    if (form.type === ProjectType.FORFAIT && !validateForfait()) {
      return;
    }

    setIsSaving(true);
    try {
      let contactId = form.contactId;
      if (useNewContact) {
        const createdContact = await createContact({
          clientId: form.clientId,
          firstName: form.contactFirstName,
          lastName: form.contactLastName,
          role: form.contactRole,
          email: form.contactEmail
        });
        contactId = createdContact.id;
        onContactCreated(createdContact);
      }

      const payload = {
        projectNumber: autoNumber ? undefined : form.projectNumber,
        orderNumber: form.orderNumber,
        orderDate: form.orderDate,
        orderAmount: form.type === ProjectType.AT
          ? totalAtAmount
          : form.orderAmount ? Number(form.orderAmount) : undefined,
        quoteNumber: form.quoteNumber,
        quoteDate: form.quoteDate,
        clientId: form.clientId,
        contactId,
        designation: form.designation,
        projectManager: form.projectManager,
        projectManagerEmail: form.projectManagerEmail,
        type: form.type,
        status: form.status,
        atMetrics: form.type === ProjectType.AT ? {
          daysSoldBO: Number(form.atDaysSoldBO || 0),
          daysSoldSite: Number(form.atDaysSoldSite || 0),
          dailyRateBO: Number(form.atDailyRateBO || 0),
          dailyRateSite: Number(form.atDailyRateSite || 0)
        } : undefined,
        deliverables: form.type === ProjectType.FORFAIT
          ? deliverables.map(d => ({
              label: d.label,
              percentage: d.percentage ? Number(d.percentage) : undefined,
              amount: form.orderAmount && d.percentage
                ? (Number(form.orderAmount) * Number(d.percentage)) / 100
                : undefined,
              targetDate: d.targetDate
            }))
          : undefined
      };

      if (isEditing && editingId) {
        const updated = await updateProject(editingId, {
          ...payload,
          projectNumber: form.projectNumber
        });
        onUpdated(updated);
      } else {
        const created = await createProject(payload);
        onCreated(created);
      }
      resetForm();
      setIsOpen(false);
      setIsEditing(false);
      setEditingId(null);
    } catch (err) {
      setError(isEditing ? 'Impossible de mettre a jour le projet.' : 'Impossible de creer le projet.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Base Projets</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            <Download size={18} />
            <span>{isExporting ? 'Export...' : 'Exporter Excel'}</span>
          </button>
          <button
            onClick={openCreate}
            className="flex items-center space-x-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-lg"
          >
            <Plus size={20} />
            <span>Nouveau Projet</span>
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher un projet, client, no commande..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>
        <button className="flex items-center space-x-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
          <Filter size={18} />
          <span>Filtres</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-sm text-rose-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => {
          const client = clients.find(c => c.id === project.clientId);
          const hasData =
            (project as any).timeEntriesCount > 0 ||
            (project as any).snapshotsCount > 0 ||
            (project as any).deliverablesCount > 0 ||
            (project as any).bordereauxCount > 0;
          return (
            <div
              key={project.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/5 transition-all flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${project.type === ProjectType.AT ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {project.type}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">{project.projectNumber}</span>
                  <button onClick={() => openEdit(project)} className="text-slate-400 hover:text-slate-600">
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(project)}
                    disabled={hasData}
                    title={hasData ? 'Suppression impossible: donnees liees' : 'Supprimer'}
                    className="text-rose-400 hover:text-rose-600 disabled:text-slate-300 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <button onClick={() => onSelect(project.id)} className="text-left">
                <h3 className="font-bold text-lg text-slate-900 mb-1 group-hover:text-amber-600 transition-colors leading-tight">
                  {project.designation}
                </h3>
                <p className="text-sm text-slate-500 mb-6">{client?.name}</p>
              </button>

              <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Chef de projet</span>
                  <span className="text-sm font-bold text-slate-700">{project.projectManager}</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                  <ArrowRight size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">{isEditing ? 'Modifier le projet' : 'Nouveau projet'}</h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">Fermer</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">No Projet {autoNumber ? '(Auto)' : '*'}</label>
                    {!isEditing && (
                      <label className="text-xs font-medium text-slate-500 flex items-center gap-2">
                        <input type="checkbox" checked={autoNumber} onChange={(e) => setAutoNumber(e.target.checked)} />
                        Auto
                      </label>
                    )}
                  </div>
                  <input
                    value={form.projectNumber}
                    onChange={(e) => updateField('projectNumber', e.target.value)}
                    disabled={!isEditing && autoNumber}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:bg-slate-100"
                    placeholder={autoNumber ? (nextNumber || 'Auto') : ''}
                  />
                  {!isEditing && autoNumber && nextNumber && (
                    <p className="text-xs text-slate-400 mt-1">Prochain numero: {nextNumber}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Statut *</label>
                  <select value={form.status} onChange={(e) => updateField('status', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    <option value={ProjectStatus.PREVU}>PREVU</option>
                    <option value={ProjectStatus.EN_COURS}>EN_COURS</option>
                    <option value={ProjectStatus.CLOS}>CLOS</option>
                    <option value={ProjectStatus.ARCHIVE}>ARCHIVE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">No Commande *</label>
                  <input value={form.orderNumber} onChange={(e) => updateField('orderNumber', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date Commande *</label>
                  <input type="date" value={form.orderDate} onChange={(e) => updateField('orderDate', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              {form.type === ProjectType.FORFAIT && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Montant de commande *</label>
                  <input value={form.orderAmount} onChange={(e) => updateField('orderAmount', e.target.value)} type="number" step="0.01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">No Devis *</label>
                  <input value={form.quoteNumber} onChange={(e) => updateField('quoteNumber', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date Devis *</label>
                  <input type="date" value={form.quoteDate} onChange={(e) => updateField('quoteDate', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Designation *</label>
                <input value={form.designation} onChange={(e) => updateField('designation', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client *</label>
                  <select
                    value={form.clientId}
                    onChange={(e) => {
                      updateField('clientId', e.target.value);
                      updateField('contactId', '');
                    }}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Selectionner</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contact *</label>
                  <select
                    value={form.contactId}
                    onChange={(e) => updateField('contactId', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    disabled={!form.clientId || useNewContact}
                  >
                    <option value="">Selectionner</option>
                    {clientContacts.map(contact => (
                      <option key={contact.id} value={contact.id}>{contact.name}</option>
                    ))}
                  </select>
                  <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={useNewContact}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseNewContact(checked);
                        if (checked) {
                          updateField('contactId', '');
                        }
                      }}
                    />
                    Creer un nouveau contact
                  </label>
                </div>
              </div>

              {useNewContact && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prenom *</label>
                    <input value={form.contactFirstName} onChange={(e) => updateField('contactFirstName', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom *</label>
                    <input value={form.contactLastName} onChange={(e) => updateField('contactLastName', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fonction *</label>
                    <input value={form.contactRole} onChange={(e) => updateField('contactRole', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email *</label>
                    <input type="email" value={form.contactEmail} onChange={(e) => updateField('contactEmail', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chef de projet *</label>
                  <input
                    value={form.projectManager}
                    onChange={(e) => updateField('projectManager', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    disabled={currentUser.role !== UserRole.ADMIN}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email chef de projet *</label>
                  <input
                    type="email"
                    value={form.projectManagerEmail}
                    onChange={(e) => updateField('projectManagerEmail', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    disabled={currentUser.role !== UserRole.ADMIN}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type *</label>
                  <select value={form.type} onChange={(e) => updateField('type', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    <option value={ProjectType.AT}>AT</option>
                    <option value={ProjectType.FORFAIT}>FORFAIT</option>
                  </select>
                </div>
              </div>

              {form.type === ProjectType.AT && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jours vendus BO</label>
                    <input value={form.atDaysSoldBO} onChange={(e) => updateField('atDaysSoldBO', e.target.value)} type="number" step="0.1" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jours vendus SITE</label>
                    <input value={form.atDaysSoldSite} onChange={(e) => updateField('atDaysSoldSite', e.target.value)} type="number" step="0.1" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">TJ BO</label>
                    <input value={form.atDailyRateBO} onChange={(e) => updateField('atDailyRateBO', e.target.value)} type="number" step="0.1" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">TJ SITE</label>
                    <input value={form.atDailyRateSite} onChange={(e) => updateField('atDailyRateSite', e.target.value)} type="number" step="0.1" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Montant total commande (AT)</label>
                    <input
                      value={totalAtAmount.toFixed(2)}
                      readOnly
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50"
                    />
                  </div>
                </div>
              )}

              {form.type === ProjectType.FORFAIT && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-700">Livrables & echeances</h4>
                    <button type="button" onClick={addDeliverable} className="text-xs font-bold text-amber-600">Ajouter un livrable</button>
                  </div>
                  {deliverables.length === 0 && (
                    <div className="text-xs text-slate-400">Aucun livrable ajoute.</div>
                  )}
                  {deliverables.map((deliverable, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-3 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <input
                        placeholder="Libelle"
                        value={deliverable.label}
                        onChange={(e) => updateDeliverable(index, 'label', e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-1 text-sm"
                      />
                      <input
                        placeholder="%"
                        value={deliverable.percentage}
                        onChange={(e) => updateDeliverable(index, 'percentage', e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-1 text-sm"
                      />
                      <input
                        placeholder="Montant calcule"
                        value={
                          form.orderAmount && deliverable.percentage
                            ? ((Number(form.orderAmount) * Number(deliverable.percentage)) / 100).toFixed(2)
                            : ''
                        }
                        readOnly
                        className="border border-slate-200 rounded-lg px-2 py-1 text-sm bg-slate-50"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={deliverable.targetDate}
                          onChange={(e) => updateDeliverable(index, 'targetDate', e.target.value)}
                          className="border border-slate-200 rounded-lg px-2 py-1 text-sm w-full"
                        />
                        <button type="button" onClick={() => removeDeliverable(index)} className="text-xs text-rose-600">X</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && <div className="text-sm text-rose-600">{error}</div>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600">Annuler</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-bold bg-slate-900 text-white rounded-lg disabled:opacity-60">
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

export default ProjectList;
