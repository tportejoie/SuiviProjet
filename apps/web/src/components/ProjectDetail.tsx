'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Project,
  Client,
  Contact,
  ProjectType,
  TimeEntry,
  Deliverable,
  DeliverableStatus,
  ProjectSituationSnapshot
} from '@/types';
import { deliverableStatusLabel, formatCurrency, projectStatusLabel } from '../utils';
import { getAllTimeEntries, getDeliverables, getSnapshots, updateDeliverableStatus } from '@/lib/api';
import {
  Info,
  Clock,
  CheckCircle,
  FileText,
  History,
  Edit3,
  Mail,
  Save
} from 'lucide-react';
import SnapshotTimeline from './SnapshotTimeline';
import BordereauGenerator from './BordereauGenerator';

interface ProjectDetailProps {
  project: Project;
  client: Client;
  contact: Contact;
  onUpdateProject: (updated: Project) => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project,
  client,
  contact,
  onUpdateProject
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'tracking' | 'timeline' | 'reports'>('general');
  const [isEditingPM, setIsEditingPM] = useState(false);
  const [pmName, setPmName] = useState(project.projectManager);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [snapshots, setSnapshots] = useState<ProjectSituationSnapshot[]>([]);
  const [timeEntriesAll, setTimeEntriesAll] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const tabs = [
    { id: 'general', label: 'General', icon: Info },
    {
      id: 'tracking',
      label: project.type === ProjectType.AT ? 'Consommation' : 'Livrables',
      icon: project.type === ProjectType.AT ? Clock : CheckCircle
    },
    { id: 'timeline', label: 'Situations & Historique', icon: History },
    { id: 'reports', label: 'Bordereaux (PDF)', icon: FileText }
  ];

  useEffect(() => {
    setPmName(project.projectManager);
  }, [project.projectManager]);

  const loadData = async () => {
    setIsLoading(true);
    const [deliverablesData, snapshotsData, allEntries] = await Promise.all([
      getDeliverables(project.id),
      getSnapshots(project.id),
      project.type === ProjectType.AT ? getAllTimeEntries(project.id) : Promise.resolve([])
    ]);
    setDeliverables(deliverablesData);
    setSnapshots(snapshotsData);
    setTimeEntriesAll(allEntries as TimeEntry[]);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [project.id, activeTab]);

  const handleUpdateDeliverableStatus = async (id: string, status: DeliverableStatus) => {
    const updated = await updateDeliverableStatus(id, status);
    setDeliverables(prev => prev.map(d => (d.id === id ? updated : d)));
  };

  const handleSavePM = () => {
    onUpdateProject({ ...project, projectManager: pmName });
    setIsEditingPM(false);
  };

  const totals = useMemo(() => {
    const totalHoursBO = timeEntriesAll.filter(e => e.type === 'BO').reduce((acc, curr) => acc + curr.hours, 0);
    const totalHoursSite = timeEntriesAll.filter(e => e.type === 'SITE').reduce((acc, curr) => acc + curr.hours, 0);
    const daysBO = totalHoursBO / 8;
    const daysSite = totalHoursSite / 8;
    return { daysBO, daysSite };
  }, [timeEntriesAll]);

  const remainingDaysBO = Math.max(0, (project.atMetrics?.daysSoldBO || 0) - totals.daysBO);
  const remainingDaysSite = Math.max(0, (project.atMetrics?.daysSoldSite || 0) - totals.daysSite);

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden no-print">
        <div className="flex border-b border-slate-100 bg-slate-50/30">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-4 text-sm font-bold transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-8">
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <section className="space-y-8">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="w-4 h-px bg-slate-200"></span> Informations Projet
                  </h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">No Projet</p>
                      <p className="font-black text-lg text-slate-900">{project.projectNumber}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Statut</p>
                      <span className="inline-flex px-3 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-tighter">
                        {projectStatusLabel(project.status)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Designation</p>
                      <p className="font-bold text-slate-900 leading-tight">{project.designation}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="w-4 h-px bg-slate-200"></span> Pilotage
                  </h4>
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 group">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] text-amber-700 font-black uppercase mb-1">Chef de projet</p>
                        {isEditingPM ? (
                          <div className="flex gap-2 mt-2">
                            <input
                              value={pmName}
                              onChange={(e) => setPmName(e.target.value)}
                              className="bg-white border border-amber-200 rounded-lg px-3 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                            <button onClick={handleSavePM} className="bg-amber-600 text-white p-1 rounded-lg shadow-sm">
                              <Save size={16} />
                            </button>
                          </div>
                        ) : (
                          <p className="font-black text-lg text-amber-900 flex items-center gap-2">
                            {project.projectManager}
                            <button
                              onClick={() => setIsEditingPM(true)}
                              className="text-amber-400 hover:text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Edit3 size={16} />
                            </button>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="w-4 h-px bg-slate-200"></span> Client & Signataire
                  </h4>
                  <div className="space-y-6">
                    <div>
                      <p className="text-xl font-black text-slate-900">{client.name}</p>
                      <p className="text-sm text-slate-500 mt-1 whitespace-pre-line leading-relaxed">{client.address}</p>
                    </div>
                    <div className="flex items-start space-x-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center font-black text-white shadow-lg">
                        {contact.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="text-sm">
                        <p className="font-black text-slate-900 text-base">{contact.name}</p>
                        <p className="text-xs text-slate-500 font-medium">{contact.role}</p>
                        <a href={`mailto:${contact.email}`} className="text-xs text-amber-600 font-bold hover:underline flex items-center mt-2">
                          <Mail size={12} className="mr-1" /> {contact.email}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'tracking' && project.type === ProjectType.AT && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                  <h5 className="font-black mb-6 text-slate-700 uppercase tracking-tighter text-sm">Budget Vendu (AT)</h5>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Back Office (BO)</span>
                      <span className="font-black text-slate-900">{project.atMetrics?.daysSoldBO} jours @ {formatCurrency(project.atMetrics?.dailyRateBO || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Sur Site (SITE)</span>
                      <span className="font-black text-slate-900">{project.atMetrics?.daysSoldSite} jours @ {formatCurrency(project.atMetrics?.dailyRateSite || 0)}</span>
                    </div>
                    <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-xl font-black text-amber-600">
                      <span>Total Enveloppe</span>
                      <span>{formatCurrency((project.atMetrics?.daysSoldBO || 0) * (project.atMetrics?.dailyRateBO || 0) + (project.atMetrics?.daysSoldSite || 0) * (project.atMetrics?.dailyRateSite || 0))}</span>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-white rounded-3xl border-2 border-amber-100 shadow-xl shadow-amber-500/5">
                  <div className="flex items-center justify-between mb-6">
                    <h5 className="font-black text-amber-900 uppercase tracking-tighter text-sm">Consommation Reelle</h5>
                    <button
                      type="button"
                      onClick={loadData}
                      className="text-[10px] font-bold uppercase text-amber-600 hover:text-amber-700"
                    >
                      Rafraichir
                    </button>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-slate-500 font-medium">BO Consomme</span>
                        <span className="font-black text-amber-700">{totals.daysBO.toFixed(3)} j / {project.atMetrics?.daysSoldBO} j</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
                        <span>Restant a consommer</span>
                        <span className="font-bold text-slate-700">{remainingDaysBO.toFixed(3)} j</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${project.atMetrics?.daysSoldBO ? Math.min(100, (totals.daysBO / project.atMetrics.daysSoldBO) * 100) : 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-slate-500 font-medium">SITE Consomme</span>
                        <span className="font-black text-amber-700">{totals.daysSite.toFixed(3)} j / {project.atMetrics?.daysSoldSite} j</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
                        <span>Restant a consommer</span>
                        <span className="font-bold text-slate-700">{remainingDaysSite.toFixed(3)} j</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-amber-600 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${project.atMetrics?.daysSoldSite ? Math.min(100, (totals.daysSite / project.atMetrics.daysSoldSite) * 100) : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tracking' && project.type === ProjectType.FORFAIT && (
            <div className="space-y-4">
              <h5 className="font-black text-slate-800 uppercase tracking-tighter text-sm mb-4">Echeancier & Livrables</h5>
              <div className="overflow-hidden border border-slate-200 rounded-2xl shadow-sm bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left font-black uppercase text-[10px]">Libelle Livrable</th>
                      <th className="px-6 py-4 text-center font-black uppercase text-[10px]">Echeance (%)</th>
                      <th className="px-6 py-4 text-center font-black uppercase text-[10px]">Date Cible</th>
                      <th className="px-6 py-4 text-center font-black uppercase text-[10px]">Statut</th>
                      <th className="px-6 py-4 text-right font-black uppercase text-[10px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deliverables.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-medium">Aucun livrable defini pour ce projet.</td></tr>
                    ) : (
                      deliverables.map(d => (
                        <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">{d.label}</td>
                          <td className="px-6 py-4 text-center font-black text-slate-600">{d.percentage}%</td>
                          <td className="px-6 py-4 text-center text-slate-500 font-medium">{formatDate(d.targetDate)}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                              d.status === DeliverableStatus.VALIDE ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                              d.status === DeliverableStatus.REMIS ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {deliverableStatusLabel(d.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            {d.status === DeliverableStatus.NON_REMIS && (
                              <button onClick={() => handleUpdateDeliverableStatus(d.id, DeliverableStatus.REMIS)} className="text-[10px] font-black uppercase bg-amber-500 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-amber-600 transition-colors">Remettre</button>
                            )}
                            {d.status === DeliverableStatus.REMIS && (
                              <button onClick={() => handleUpdateDeliverableStatus(d.id, DeliverableStatus.VALIDE)} className="text-[10px] font-black uppercase bg-emerald-500 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-emerald-600 transition-colors">Valider</button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <SnapshotTimeline snapshots={snapshots} isLoading={isLoading} projectId={project.id} />
          )}

          {activeTab === 'reports' && (
            <BordereauGenerator project={project} client={client} contact={contact} deliverables={deliverables} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
