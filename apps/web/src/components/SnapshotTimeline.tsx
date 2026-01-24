'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ProjectSituationSnapshot, SnapshotType } from '@/types';
import { getBordereaux } from '@/lib/api';
import { History, FileCheck, CheckCircle2, AlertTriangle, User } from 'lucide-react';

interface SnapshotTimelineProps {
  snapshots: ProjectSituationSnapshot[];
  isLoading?: boolean;
  projectId: string;
}

const SnapshotTimeline: React.FC<SnapshotTimelineProps> = ({ snapshots, isLoading, projectId }) => {
  const [bordereaux, setBordereaux] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoadingFiles(true);
      try {
        const data = await getBordereaux(projectId);
        setBordereaux(data);
      } finally {
        setIsLoadingFiles(false);
      }
    };
    load();
  }, [projectId]);

  const snapshotFiles = useMemo(() => {
    const map = new Map<string, { fileId: string; fileName: string; auditFileId?: string | null }>();
    bordereaux.forEach((bordereau: any) => {
      (bordereau.versions || []).forEach((version: any) => {
        if (version.snapshotId && version.file?.id) {
          if (!map.has(version.snapshotId)) {
            map.set(version.snapshotId, {
              fileId: version.file.id,
              fileName: version.file.fileName,
              auditFileId: bordereau.agreement?.auditFileId ?? null
            });
          }
        }
      });
    });
    return map;
  }, [bordereaux]);
  const sortedSnapshots = [...snapshots].sort(
    (a, b) => new Date(b.computedAt).getTime() - new Date(a.computedAt).getTime()
  );

  const getIcon = (type: SnapshotType) => {
    switch (type) {
      case SnapshotType.MONTH_END:
        return <CheckCircle2 className="text-emerald-500" />;
      case SnapshotType.BORDEREAU_GENERATED:
        return <FileCheck className="text-amber-500" />;
      case SnapshotType.BORDEREAU_SIGNED:
        return <CheckCircle2 className="text-blue-500" />;
      case SnapshotType.RECTIFICATIF:
        return <AlertTriangle className="text-rose-500" />;
      default:
        return <History className="text-slate-400" />;
    }
  };

  const getLabel = (type: SnapshotType) => {
    switch (type) {
      case SnapshotType.MONTH_END:
        return 'Mois Cloture';
      case SnapshotType.BORDEREAU_GENERATED:
        return 'Bordereau Genere';
      case SnapshotType.BORDEREAU_SIGNED:
        return 'Bordereau Signe (Final)';
      case SnapshotType.RECTIFICATIF:
        return "Rectificatif de situation";
      default:
        return 'Snapshot Manuel';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-4">
        <h5 className="font-bold text-slate-800">Timeline des situations (Snapshots)</h5>
        <div className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full font-bold">
          DONNEES IMMUABLES - HISTORIQUE D'AUDIT
        </div>
      </div>

      <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
        {isLoading ? (
          <p className="text-slate-400 italic text-sm">Chargement des snapshots...</p>
        ) : sortedSnapshots.length === 0 ? (
          <p className="text-slate-400 italic text-sm">Aucun evenement historise pour ce projet.</p>
        ) : (
          sortedSnapshots.map((snap) => (
            <div key={snap.id} className="relative group">
              <div className="absolute -left-8 top-1 bg-white p-1 rounded-full border border-slate-200 z-10">
                {getIcon(snap.type)}
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm group-hover:border-slate-300 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h6 className="font-bold text-slate-900">{getLabel(snap.type)}</h6>
                      {snap.type === SnapshotType.BORDEREAU_SIGNED && (
                        <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                          PDF signe
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{new Date(snap.computedAt).toLocaleString('fr-FR')}</p>
                  </div>
                  {snap.month !== undefined && snap.year !== undefined && (
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded font-bold text-xs">
                      Periode: {snap.month + 1}/{snap.year}
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-600 overflow-hidden text-ellipsis mb-4">
                  ID: {snap.id} | Ver: {snap.computedAt.split('T')[0]} | Status: LOCKED
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-xs text-slate-400">
                    <User size={12} className="mr-1" /> Par {snap.computedBy}
                  </div>
                  {(() => {
                    const file = snapshotFiles.get(snap.id);
                    if (!file) {
                      return (
                        <span className="text-xs font-bold text-slate-300">
                          {isLoadingFiles ? 'Chargement...' : 'Aucun bordereau'}
                        </span>
                      );
                    }
                    return (
                      <div className="flex items-center gap-3">
                        <a
                          href={`/api/files/${file.fileId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-amber-600 hover:text-amber-700"
                        >
                          Consultation bordereau
                        </a>
                        <a
                          href={`/api/files/${file.fileId}?download=1`}
                          className="text-xs font-bold text-slate-500 hover:text-slate-700"
                        >
                          Telecharger
                        </a>
                        {snap.type === SnapshotType.BORDEREAU_SIGNED && file.auditFileId && (
                          <a
                            href={`/api/files/${file.auditFileId}?download=1`}
                            className="text-xs font-bold text-slate-500 hover:text-slate-700"
                          >
                            Audit
                          </a>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SnapshotTimeline;
