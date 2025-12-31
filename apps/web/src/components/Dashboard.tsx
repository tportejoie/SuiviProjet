'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Project, Client, ProjectSituationSnapshot, ProjectType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '../utils';
import { getAllTimeEntries, getDeliverables, getProductionData } from '../lib/api';

interface DashboardProps {
  projects: Project[];
  clients: Client[];
  snapshots: ProjectSituationSnapshot[];
  isLoading?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ projects, clients, snapshots, isLoading }) => {
  const activeCount = projects.filter(p => p.status === 'EN_COURS').length;
  const atProjects = projects.filter(p => p.type === ProjectType.AT);
  const forfaitProjects = projects.filter(p => p.type === ProjectType.FORFAIT);
  const atCount = atProjects.length;
  const forfaitCount = forfaitProjects.length;
  const [progressByProject, setProgressByProject] = useState<Record<string, number>>({});
  const [isProgressLoading, setIsProgressLoading] = useState(false);
  const [productionData, setProductionData] = useState<{ at: number; forfait: number }[]>([]);
  const [isProductionLoading, setIsProductionLoading] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    let isMounted = true;
    const loadProduction = async () => {
      setIsProductionLoading(true);
      try {
        const data = await getProductionData(currentYear);
        if (isMounted) {
          setProductionData(data.data);
        }
      } catch {
        if (isMounted) {
          setProductionData(Array.from({ length: 12 }, () => ({ at: 0, forfait: 0 })));
        }
      } finally {
        if (isMounted) {
          setIsProductionLoading(false);
        }
      }
    };
    loadProduction();
    return () => {
      isMounted = false;
    };
  }, [currentYear]);

  const chartData = useMemo(() => {
    const labels = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
    return labels.map((label, index) => ({
      name: label,
      at: productionData[index]?.at ?? 0,
      forfait: productionData[index]?.forfait ?? 0
    }));
  }, [productionData]);

  useEffect(() => {
    let isMounted = true;
    const loadProgress = async () => {
      if (projects.length === 0) return;
      setIsProgressLoading(true);
      const results: Array<{ id: string; progress: number }> = [];

      await Promise.all([
        ...atProjects.map(async (project) => {
          try {
            const entries = await getAllTimeEntries(project.id);
            const totalHours = entries.reduce((acc, curr) => acc + curr.hours, 0);
            const soldDays = (project.atMetrics?.daysSoldBO || 0) + (project.atMetrics?.daysSoldSite || 0);
            const consumedDays = totalHours / 8;
            const progress = soldDays > 0 ? Math.min(1, consumedDays / soldDays) : 0;
            results.push({ id: project.id, progress });
          } catch {
            results.push({ id: project.id, progress: 0 });
          }
        }),
        ...forfaitProjects.map(async (project) => {
          try {
            const deliverables = await getDeliverables(project.id);
            const total = deliverables.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
            const completed = deliverables
              .filter(d => d.status !== 'NON_REMIS')
              .reduce((acc, curr) => acc + (curr.percentage || 0), 0);
            const progress = total > 0 ? Math.min(1, completed / total) : 0;
            results.push({ id: project.id, progress });
          } catch {
            results.push({ id: project.id, progress: 0 });
          }
        })
      ]);

      if (isMounted) {
        setProgressByProject(results.reduce((acc, item) => {
          acc[item.id] = item.progress;
          return acc;
        }, {} as Record<string, number>));
        setIsProgressLoading(false);
      }
    };

    loadProgress();
    return () => {
      isMounted = false;
    };
  }, [projects]);

  const alertBadge = (progress: number) => {
    if (progress >= 0.9) {
      return <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">Alerte 90%</span>;
    }
    if (progress >= 0.8) {
      return <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Alerte 80%</span>;
    }
    return null;
  };

  const renderProgressRow = (project: Project) => {
    const progress = progressByProject[project.id] ?? 0;
    const percent = Math.round(progress * 100);
    return (
      <div key={project.id} className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="font-semibold text-slate-800">{project.projectNumber} - {project.designation}</div>
          <div className="flex items-center gap-2">
            {alertBadge(progress)}
            <span className="text-xs font-bold text-slate-600">{percent}%</span>
          </div>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Projets Actifs</p>
          <p className="text-3xl font-bold text-slate-900">{activeCount}</p>
          <div className="mt-2 text-xs text-slate-400">
            {activeCount > 0 ? 'En cours de suivi' : 'Aucun projet actif'}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Missions AT</p>
          <p className="text-3xl font-bold text-amber-600">{atCount}</p>
          <div className="mt-2 text-xs text-slate-400">Suivi des imputations mensuelles</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Forfaits</p>
          <p className="text-3xl font-bold text-blue-600">{forfaitCount}</p>
          <div className="mt-2 text-xs text-slate-400">Suivi des livrables</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Clients</p>
          <p className="text-3xl font-bold text-slate-900">{clients.length}</p>
          <div className="mt-2 text-xs text-slate-400">Total base installee</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Projets AT - Avancement</h3>
            {isProgressLoading && <span className="text-xs text-slate-400">Chargement...</span>}
          </div>
          <div className="space-y-4">
            {atProjects.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Aucun projet AT.</p>
            ) : (
              atProjects.map(renderProgressRow)
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Projets Forfait - Avancement</h3>
            {isProgressLoading && <span className="text-xs text-slate-400">Chargement...</span>}
          </div>
          <div className="space-y-4">
            {forfaitProjects.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Aucun projet forfait.</p>
            ) : (
              forfaitProjects.map(renderProgressRow)
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[420px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Production Mensuelle {currentYear}</h3>
            {isProductionLoading && <span className="text-xs text-slate-400">Chargement...</span>}
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
              barCategoryGap={18}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickMargin={10} />
              <YAxis tickFormatter={(v) => `${v} EUR`} width={70} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend verticalAlign="top" align="right" height={24} />
              <Bar dataKey="at" name="Assistance Technique" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              <Bar dataKey="forfait" name="Forfait" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <h3 className="text-lg font-bold mb-4">Activites recentes</h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {isLoading ? (
              <p className="text-sm text-slate-400 italic">Chargement...</p>
            ) : snapshots.slice(0, 5).map((snap, index) => (
              <div key={snap.id} className="flex space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                  SNAP
                </div>
                <div>
                  <p className="text-sm font-semibold">Snapshot {snap.type} - {snap.projectId.slice(0, 6)}</p>
                  <p className="text-xs text-slate-400">{new Date(snap.computedAt).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
