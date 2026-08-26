'use client';

import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Lock,
  ShieldCheck,
  TriangleAlert
} from 'lucide-react';
import Logo from '@/components/Logo';
import { getPeriodLock, getProjects, getTimeEntries } from '@/lib/api';
import { prepareMobileTimeEntrySimulation } from '@/lib/mobileTimeEntrySimulation';
import {
  PeriodLock,
  Project,
  ProjectStatus,
  ProjectType,
  TimeEntry,
  User
} from '@/types';

interface MobileTimeEntrySimulatorProps {
  currentUser: User;
}

type SimulationResult = ReturnType<typeof prepareMobileTimeEntrySimulation>;

const formatToday = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseCivilDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]) - 1,
    day: Number(match[3])
  };
};

const formatCivilDate = (value: string) => {
  const parsed = parseCivilDate(value);
  if (!parsed) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(parsed.year, parsed.month, parsed.day)));
};

const MobileTimeEntrySimulator: React.FC<MobileTimeEntrySimulatorProps> = ({ currentUser }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(formatToday);
  const [type, setType] = useState<'BO' | 'SITE'>('BO');
  const [hours, setHours] = useState(8);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [periodLock, setPeriodLock] = useState<PeriodLock | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isCheckingPeriod, setIsCheckingPeriod] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);

  const eligibleProjects = useMemo(
    () => projects.filter(
      (project) => project.type === ProjectType.AT && project.status === ProjectStatus.EN_COURS
    ),
    [projects]
  );

  const selectedProject = eligibleProjects.find((project) => project.id === projectId) ?? null;

  useEffect(() => {
    let active = true;
    const loadProjects = async () => {
      try {
        const data = await getProjects();
        if (!active) return;
        setProjects(data);
      } catch {
        if (active) setError('Impossible de charger les projets accessibles.');
      } finally {
        if (active) setIsLoadingProjects(false);
      }
    };
    loadProjects();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!projectId && eligibleProjects.length > 0) {
      setProjectId(eligibleProjects[0].id);
    }
  }, [eligibleProjects, projectId]);

  useEffect(() => {
    const parsedDate = parseCivilDate(date);
    if (!projectId || !parsedDate) {
      setEntries([]);
      setPeriodLock(null);
      return;
    }

    let active = true;
    const loadPeriod = async () => {
      setIsCheckingPeriod(true);
      setError(null);
      setSimulation(null);
      try {
        const [periodEntries, lock] = await Promise.all([
          getTimeEntries(projectId, parsedDate.year, parsedDate.month),
          getPeriodLock(projectId, parsedDate.year, parsedDate.month)
        ]);
        if (!active) return;
        setEntries(periodEntries);
        setPeriodLock(lock);
      } catch {
        if (active) setError('Impossible de vérifier les imputations et le verrouillage.');
      } finally {
        if (active) setIsCheckingPeriod(false);
      }
    };
    loadPeriod();
    return () => {
      active = false;
    };
  }, [date, projectId]);

  const resetSimulation = () => setSimulation(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const result = prepareMobileTimeEntrySimulation({
      input: { projectId, date, type, hours },
      projects: eligibleProjects,
      entries,
      lock: periodLock
    });
    setSimulation(result);
  };

  const validationError = simulation && !simulation.ok ? simulation.errors[0] : null;
  const validSimulation = simulation?.ok ? simulation : null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-950">
      <div className="mx-auto min-h-screen max-w-lg bg-slate-50 shadow-2xl">
        <header className="bg-slate-950 px-5 pb-7 pt-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Logo className="h-9" showText={false} />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-400">Jamaé Project</p>
                <h1 className="text-xl font-black">Imputation mobile</h1>
              </div>
            </div>
            <Link
              href="/"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 text-slate-300 transition hover:border-slate-500 hover:text-white"
              aria-label="Retour à l’application"
            >
              <ArrowLeft size={19} />
            </Link>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
            <Eye className="mt-0.5 shrink-0 text-amber-400" size={21} />
            <div>
              <p className="font-black text-amber-300">Simulation uniquement</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">
                Aucune donnée ne sera enregistrée. Cette version vérifie seulement la saisie.
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-5 px-5 py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Connecté en tant que</p>
              <p className="font-bold text-slate-800">{currentUser.name || currentUser.email}</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
              <ShieldCheck size={15} /> Session active
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="mobile-project" className="mb-2 block text-sm font-black text-slate-700">
                Projet actif
              </label>
              <select
                id="mobile-project"
                value={projectId}
                onChange={(event) => {
                  setProjectId(event.target.value);
                  resetSimulation();
                }}
                disabled={isLoadingProjects}
                className="min-h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100 disabled:bg-slate-100"
              >
                <option value="">{isLoadingProjects ? 'Chargement…' : 'Sélectionner un projet'}</option>
                {eligibleProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectNumber} — {project.designation}
                  </option>
                ))}
              </select>
              {!isLoadingProjects && eligibleProjects.length === 0 && (
                <p className="mt-2 text-sm font-medium text-rose-600">Aucun projet AT en cours n’est accessible.</p>
              )}
            </div>

            <div>
              <label htmlFor="mobile-date" className="mb-2 block text-sm font-black text-slate-700">
                Date de l’activité
              </label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  id="mobile-date"
                  type="date"
                  value={date}
                  onChange={(event) => {
                    setDate(event.target.value);
                    resetSimulation();
                  }}
                  className="min-h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base font-semibold shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                />
              </div>
            </div>

            <fieldset>
              <legend className="mb-2 block text-sm font-black text-slate-700">Type d’activité</legend>
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-100 p-1.5">
                {(['BO', 'SITE'] as const).map((activityType) => (
                  <button
                    key={activityType}
                    type="button"
                    onClick={() => {
                      setType(activityType);
                      resetSimulation();
                    }}
                    className={`min-h-12 rounded-xl text-sm font-black transition ${
                      type === activityType
                        ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-500'
                    }`}
                    aria-pressed={type === activityType}
                  >
                    {activityType === 'BO' ? 'Bureau (BO)' : 'Sur site'}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 block text-sm font-black text-slate-700">Durée</legend>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setHours(value);
                      resetSimulation();
                    }}
                    className={`min-h-12 rounded-xl font-black transition ${
                      hours === value
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                        : 'border border-slate-200 bg-white text-slate-600'
                    }`}
                    aria-pressed={hours === value}
                  >
                    {value} h
                  </button>
                ))}
              </div>
            </fieldset>

            <div className={`flex items-center gap-3 rounded-2xl border p-4 ${
              periodLock?.locked
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}>
              {periodLock?.locked ? <Lock size={20} /> : <CheckCircle2 size={20} />}
              <div>
                <p className="text-sm font-black">
                  {isCheckingPeriod
                    ? 'Vérification de la période…'
                    : periodLock?.locked
                      ? 'Période verrouillée'
                      : 'Période disponible'}
                </p>
                <p className="text-xs opacity-80">
                  {periodLock?.locked
                    ? 'La simulation signalera le blocage et aucune écriture ne sera possible.'
                    : 'Les imputations existantes sont vérifiées avant la prévisualisation.'}
                </p>
              </div>
            </div>

            {(error || validationError) && (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800" role="alert">
                <TriangleAlert className="mt-0.5 shrink-0" size={20} />
                <p className="text-sm font-semibold">{error || validationError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedProject || isLoadingProjects || isCheckingPeriod}
              className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-slate-950 px-5 text-base font-black text-white shadow-xl transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Eye size={20} /> Prévisualiser la simulation
            </button>
          </form>

          {validSimulation && (
            <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-xl shadow-emerald-900/5">
              <div className="bg-emerald-600 px-5 py-4 text-white">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={24} />
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-100">Simulation validée</p>
                    <h2 className="text-lg font-black">Prête pour confirmation</h2>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                {validSimulation.existingEntry && (
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                    <TriangleAlert className="mt-0.5 shrink-0" size={20} />
                    <p className="text-sm font-semibold">
                      Une imputation de {validSimulation.existingEntry.hours} h existe déjà. Une future validation la remplacerait.
                    </p>
                  </div>
                )}

                <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50 px-4">
                  <div className="py-3">
                    <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Projet</dt>
                    <dd className="mt-1 font-black text-slate-800">
                      {validSimulation.project.projectNumber} — {validSimulation.project.designation}
                    </dd>
                  </div>
                  <div className="grid grid-cols-2 gap-4 py-3">
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Date</dt>
                      <dd className="mt-1 text-sm font-black capitalize text-slate-800">{formatCivilDate(date)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Activité</dt>
                      <dd className="mt-1 text-sm font-black text-slate-800">{type}</dd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Durée</dt>
                      <dd className="mt-1 text-2xl font-black text-slate-950">{hours} heures</dd>
                    </div>
                    <Clock3 className="text-amber-500" size={28} />
                  </div>
                </dl>

                <div className="rounded-2xl bg-slate-950 p-4 text-center text-sm font-bold text-slate-300">
                  Aucune requête d’écriture n’a été envoyée.
                </div>
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
};

export default MobileTimeEntrySimulator;
