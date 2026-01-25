'use client';

import React, { useEffect, useState } from 'react';
import { Project, TimeEntry, PeriodLock, User, UserRole } from '@/types';
import { getDaysInMonth, getMonthName, calculateATMonthTotals } from '../utils';
import { closeMonth, getPeriodLock, getTimeEntries, unlockPeriod, upsertTimeEntry } from '@/lib/api';
import { Lock, FileCheck, ShieldAlert, CalendarClock } from 'lucide-react';

interface ImputationManagerProps {
  projects: Project[];
  currentUser: User;
}

const ImputationManager: React.FC<ImputationManagerProps> = ({ projects, currentUser }) => {
  if (projects.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-slate-500">
        Aucun projet AT disponible.
      </div>
    );
  }
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [lock, setLock] = useState<PeriodLock | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const currentProject = projects.find(p => p.id === selectedProjectId);
  const isLocked = Boolean(lock?.locked);

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [entriesData, lockData] = await Promise.all([
          getTimeEntries(selectedProjectId, selectedYear, selectedMonth),
          getPeriodLock(selectedProjectId, selectedYear, selectedMonth)
        ]);
        setTimeEntries(entriesData);
        setLock(lockData);
      } catch (err) {
        setError('Impossible de charger les imputations.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [selectedProjectId, selectedYear, selectedMonth]);

  const handleHourChange = async (day: number, type: 'BO' | 'SITE', value: string) => {
    if (isLocked || !selectedProjectId) return;
    const hours = Math.min(8, Math.max(0, parseFloat(value) || 0));
    const actorName = currentProject?.projectManager || currentUser.name || currentUser.email;

    try {
      const entry = await upsertTimeEntry({
        projectId: selectedProjectId,
        year: selectedYear,
        month: selectedMonth,
        day,
        type,
        hours,
        actorName
      });
      setTimeEntries(prev => {
        const filtered = prev.filter(
          e => !(e.projectId === selectedProjectId && e.year === selectedYear && e.month === selectedMonth && e.day === day && e.type === type)
        );
        if (hours > 0) {
          return [...filtered, entry];
        }
        return filtered;
      });
    } catch (err) {
      setError('Periode verrouillee.');
    }
  };

  const totalsBO = calculateATMonthTotals(timeEntries, 'BO');
  const totalsSite = calculateATMonthTotals(timeEntries, 'SITE');

  const handleCloseMonth = async () => {
    if (!currentProject) return;
    try {
      await closeMonth({
        projectId: currentProject.id,
        year: selectedYear,
        month: selectedMonth,
        actorName: currentProject.projectManager || currentUser.name || currentUser.email
      });
      const lockData = await getPeriodLock(currentProject.id, selectedYear, selectedMonth);
      setLock(lockData);
      alert('Mois cloture et verrouille. Snapshot genere.');
    } catch (err) {
      setError('Impossible de cloturer le mois.');
    }
  };

  const handleUnlock = async () => {
    if (!currentProject) return;
    try {
      await unlockPeriod({
        projectId: currentProject.id,
        year: selectedYear,
        month: selectedMonth,
        actorName: currentUser.name || currentUser.email
      });
      const lockData = await getPeriodLock(currentProject.id, selectedYear, selectedMonth);
      setLock(lockData);
      alert('Periode deverrouillee. Toute modification generera un rectificatif si un bordereau signe existe.');
    } catch {
      setError('Impossible de deverrouiller la periode.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="border border-slate-300 rounded-lg px-4 py-2 bg-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none w-full lg:w-auto"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.projectNumber} - {p.designation}</option>
            ))}
          </select>
          <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(m => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${selectedMonth === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {getMonthName(m).substring(0, 3).toUpperCase()}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={2000}
            max={2100}
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value) || new Date().getFullYear())}
            className="w-24 border border-slate-300 rounded-lg px-3 py-2 bg-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
            aria-label="Annee"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isLocked ? (
            <div className="flex items-center space-x-2 text-rose-600 bg-rose-50 px-4 py-2 rounded-lg border border-rose-100 font-bold text-sm">
              <Lock size={16} />
              <span>Periode Verrouillee</span>
            </div>
          ) : (
            <button
              onClick={handleCloseMonth}
              className="flex items-center space-x-2 bg-slate-900 text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors w-full sm:w-auto justify-center"
            >
              <FileCheck size={18} />
              <span>Cloturer le Mois</span>
            </button>
          )}
          {isLocked && currentUser.role === UserRole.ADMIN && (
            <button
              onClick={handleUnlock}
              className="flex items-center space-x-2 bg-white border border-rose-200 text-rose-700 px-4 py-2 rounded-lg font-bold text-xs hover:bg-rose-50 transition-colors w-full sm:w-auto justify-center"
            >
              <Lock size={14} />
              <span>Deverrouiller</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h4 className="font-bold flex items-center space-x-2">
            <CalendarClock className="text-amber-500" />
            <span>Saisie des heures - {getMonthName(selectedMonth)} {selectedYear}</span>
          </h4>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-400 font-bold">Total BO</span>
              <span className="font-bold text-slate-900">{totalsBO.days.toFixed(3)} j ({totalsBO.hours}h)</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-400 font-bold">Total SITE</span>
              <span className="font-bold text-slate-900">{totalsSite.days.toFixed(3)} j ({totalsSite.hours}h)</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="p-3 text-left w-24 border-b">Mode</th>
                {days.map(d => (
                <th key={d} className={`p-2 w-12 text-center border-b border-l ${[0, 6].includes(new Date(selectedYear, selectedMonth, d).getDay()) ? 'bg-slate-100' : ''}`}>
                  {d}
                </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['BO', 'SITE'].map((type) => (
                <tr key={type} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-600 border-b">{type}</td>
                  {days.map(d => {
                    const entry = timeEntries.find(e => e.day === d && e.type === type);
                    const isWeekend = [0, 6].includes(new Date(selectedYear, selectedMonth, d).getDay());
                    return (
                      <td key={d} className={`p-1 w-12 border-b border-l ${isWeekend ? 'bg-slate-50' : ''}`}>
                        <input
                          type="number"
                          min="0"
                          max="8"
                          step="1"
                          disabled={isLocked || isLoading}
                          value={entry?.hours || ''}
                          onChange={(e) => handleHourChange(d, type as 'BO' | 'SITE', e.target.value)}
                          className={`no-spin w-full text-center py-1.5 px-1.5 rounded transition-colors focus:ring-2 focus:ring-amber-400 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 ${entry ? 'bg-amber-50 font-bold text-amber-700' : 'bg-transparent text-slate-300'}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start space-x-3">
          <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900 text-sm">Periode cloturee</p>
            <p className="text-amber-700 text-xs">Cette periode est verrouillee. Toute modification necessite une action administrateur et generera un nouveau snapshot RECTIFICATIF.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImputationManager;
