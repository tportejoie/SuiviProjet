'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BordereauComment, Project, Client, Contact, ProjectType, TimeEntry, Deliverable } from '@/types';
import { Download, Printer, Send, RefreshCw } from 'lucide-react';
import { generateBordereau, getBordereauComments, getBordereaux, getTimeEntries, remindBordereau, upsertBordereauComment } from '@/lib/api';
import { getMonthName } from '../utils';
import BordereauDocument from './BordereauDocument';

interface BordereauGeneratorProps {
  project: Project;
  client: Client;
  contact: Contact;
  deliverables: Deliverable[];
}

const BordereauGenerator: React.FC<BordereauGeneratorProps> = ({
  project,
  client,
  contact,
  deliverables
}) => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [comments, setComments] = useState<BordereauComment[]>([]);
  const [bordereaux, setBordereaux] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReminding, setIsReminding] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const [entries, commentData, bordereauData] = await Promise.all([
          getTimeEntries(project.id, selectedYear, selectedMonth),
          project.type === ProjectType.AT
            ? getBordereauComments(project.id, selectedYear, selectedMonth)
            : Promise.resolve([]),
          getBordereaux(project.id)
        ]);
        if (isMounted) {
          setTimeEntries(entries);
          setComments(commentData as BordereauComment[]);
          setBordereaux(bordereauData);
        }
      } catch {
        if (isMounted) {
          setTimeEntries([]);
          setComments([]);
          setBordereaux([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [project.id, selectedMonth, selectedYear]);

  const commentMap = useMemo(() => {
    return new Map(comments.map(c => [`${c.day}-${c.type}`, c]));
  }, [comments]);

  const handleCommentChange = (day: number, type: "BO" | "SITE", value: string) => {
    const existing = commentMap.get(`${day}-${type}`);
    const updated: BordereauComment = existing
      ? { ...existing, comment: value }
      : {
          id: `${day}-${type}`,
          projectId: project.id,
          year: selectedYear,
          month: selectedMonth,
          day,
          type,
          comment: value
        };
    setComments(prev => {
      const filtered = prev.filter(item => !(item.day === day && item.type === type));
      return [...filtered, updated];
    });
  };

  const handleCommentBlur = async (day: number, type: "BO" | "SITE", value: string) => {
    try {
      const saved = await upsertBordereauComment({
        projectId: project.id,
        year: selectedYear,
        month: selectedMonth,
        day,
        type,
        comment: value
      });
      setComments(prev => {
        const filtered = prev.filter(item => !(item.day === day && item.type === type));
        return [...filtered, saved];
      });
    } catch {
      setGeneratedMessage('Erreur lors de l\'enregistrement du commentaire.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    setGeneratedMessage(null);
    try {
      await generateBordereau({
        projectId: project.id,
        type: project.type === ProjectType.AT ? 'BA' : 'BL',
        periodYear: selectedYear,
        periodMonth: selectedMonth,
        actorName: project.projectManager
      });
      setGeneratedMessage('Bordereau genere et versionne.');
    } catch (error) {
      setGeneratedMessage('Erreur lors de la generation du PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const currentBordereau = useMemo(() => {
    return bordereaux.find(bordereau =>
      bordereau.periodYear === selectedYear &&
      bordereau.periodMonth === selectedMonth &&
      (project.type === ProjectType.AT ? bordereau.type === 'BA' : bordereau.type === 'BL')
    );
  }, [bordereaux, project.type, selectedMonth, selectedYear]);

  const canRemind =
    currentBordereau?.agreement?.status === 'SENT' &&
    currentBordereau?.status !== 'SIGNED';

  const handleRemind = async () => {
    if (!currentBordereau) {
      setGeneratedMessage('Aucun bordereau a relancer pour cette periode.');
      return;
    }
    setIsReminding(true);
    setGeneratedMessage(null);
    try {
      await remindBordereau(currentBordereau.id);
      setGeneratedMessage('Relance envoyee au signataire.');
    } catch {
      setGeneratedMessage('Erreur lors de la relance Adobe Sign.');
    } finally {
      setIsReminding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 flex items-center justify-between no-print">
        <div className="flex items-center space-x-6">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <Printer size={32} className="text-amber-600" />
          </div>
          <div>
            <h5 className="font-black text-lg text-slate-900">Edition de Bordereau</h5>
            <p className="text-sm text-slate-500 font-medium tracking-tight">Version immuable prete pour validation client</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-100 rounded-lg px-3 py-2">
            <span className="text-[10px] font-black uppercase text-slate-500">Periode</span>
            <div className="flex bg-white border border-slate-200 rounded-md overflow-hidden">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMonth(m)}
                  className={`px-2 py-1 text-[10px] font-black uppercase ${
                    selectedMonth === m ? 'bg-amber-500 text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {getMonthName(m).substring(0, 3)}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-20 bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-bold text-slate-700"
            />
          </div>
          <div className="flex space-x-3">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-black uppercase text-xs hover:bg-slate-800 transition-all shadow-lg"
          >
            <Download size={18} />
            <span>Imprimer / PDF</span>
          </button>
          <button
            onClick={handleGeneratePdf}
            disabled={isGenerating}
            className="flex items-center space-x-2 bg-amber-500 text-white px-6 py-3 rounded-xl font-black uppercase text-xs hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-60"
          >
            <Send size={18} />
            <span>{isGenerating ? 'Generation...' : 'Generer PDF'}</span>
          </button>
          {process.env.NEXT_PUBLIC_ADOBE_SIGN_ENABLED === 'true' && (
            <button
              onClick={handleRemind}
              disabled={!canRemind || isReminding}
              className="flex items-center space-x-2 bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-black uppercase text-xs hover:bg-slate-300 transition-all shadow-lg disabled:opacity-60"
            >
              <RefreshCw size={18} />
              <span>{isReminding ? 'Relance...' : 'Relancer signature'}</span>
            </button>
          )}
          </div>
        </div>
      </div>

      {generatedMessage && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          {generatedMessage}
        </div>
      )}

      <div className="flex flex-col items-center bg-slate-100 p-12 no-print min-h-[1000px] rounded-3xl overflow-hidden gap-4">
        <BordereauDocument
          project={{
            ...project,
            atDaysSoldBO: project.atMetrics?.daysSoldBO ?? null,
            atDaysSoldSite: project.atMetrics?.daysSoldSite ?? null
          }}
          client={client}
          contact={contact}
          timeEntries={timeEntries}
          deliverables={deliverables}
          periodYear={selectedYear}
          periodMonth={selectedMonth}
          bordereauComments={comments}
          onCommentChange={handleCommentChange}
          onCommentCommit={handleCommentBlur}
        />
        {isLoading && (
          <div className="text-xs text-slate-500">Chargement des imputations...</div>
        )}
      </div>
    </div>
  );
};

export default BordereauGenerator;
