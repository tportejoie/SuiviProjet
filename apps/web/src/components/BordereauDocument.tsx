'use client';

import React, { useEffect, useRef, useState } from "react";
import { BordereauComment, CompanySettings, ProjectType, DeliverableStatus } from "../types";
import Logo from "./Logo";
import { getMonthName } from "../utils";
import { computeBordereauScale } from "./BordereauScale";
import { getCompanySettings } from "../lib/api";

interface BordereauDocumentProps {
  project: {
    projectNumber: string;
    designation: string;
    orderNumber: string;
    quoteNumber: string;
    projectManager: string;
    type: ProjectType;
    atDaysSoldBO?: number | null;
    atDaysSoldSite?: number | null;
  };
  client: {
    name: string;
    address: string;
  };
  contact: {
    name: string;
    email: string;
  };
  timeEntries: { day: number; type: "BO" | "SITE"; hours: number }[];
  deliverables: { id: string; label: string; percentage: number; status: DeliverableStatus; submissionDate?: string | Date | null }[];
  periodYear: number;
  periodMonth: number;
  company?: CompanySettings | null;
  bordereauComments?: BordereauComment[];
  onCommentChange?: (day: number, type: "BO" | "SITE", comment: string) => void;
  onCommentCommit?: (day: number, type: "BO" | "SITE", comment: string) => void;
}

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("fr-FR");
};

const BordereauDocument: React.FC<BordereauDocumentProps> = ({
  project,
  client,
  contact,
  timeEntries,
  deliverables,
  periodYear,
  periodMonth,
  company: companyProp,
  bordereauComments,
  onCommentChange,
  onCommentCommit
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [company, setCompany] = useState<CompanySettings | null>(companyProp ?? null);
  const totalBOHours = timeEntries.filter(e => e.type === "BO").reduce((acc, curr) => acc + curr.hours, 0);
  const totalSiteHours = timeEntries.filter(e => e.type === "SITE").reduce((acc, curr) => acc + curr.hours, 0);
  const totalBODays = totalBOHours / 8;
  const totalSiteDays = totalSiteHours / 8;
  const remainingBODays = Math.max(0, (project.atDaysSoldBO ?? 0) - totalBODays);
  const remainingSiteDays = Math.max(0, (project.atDaysSoldSite ?? 0) - totalSiteDays);

  useEffect(() => {
    if (companyProp) {
      setCompany(companyProp);
      return;
    }
    let isMounted = true;
    const load = async () => {
      try {
        const data = await getCompanySettings();
        if (isMounted) {
          setCompany(data);
        }
      } catch {
        if (isMounted) {
          setCompany(null);
        }
      }
    };
    load();
    const handler = () => {
      load();
    };
    window.addEventListener("company-settings-updated", handler);
    return () => {
      isMounted = false;
      window.removeEventListener("company-settings-updated", handler);
    };
  }, [companyProp]);

  useEffect(() => {
    if (!containerRef.current) return;
    const pageHeight = 297 * 3.78;
    const contentHeight = containerRef.current.scrollHeight;
    const computed = computeBordereauScale(contentHeight, pageHeight);
    setScale(computed);
  }, [deliverables.length]);

  const companyDisplayName = company
    ? [company.legalForm, company.name].filter(Boolean).join(' ')
    : "EURL JAMAE";

  const headquartersLines = company?.headquarters
    ? company.headquarters.split("\n")
    : ["250 rue Raymond Durand", "38110 ST CLAIR DE LA TOUR"];

  const phoneLine = company?.phone ? `Tel.: ${company.phone}` : "Tel.: +33 675 36 71 16";
  const emailLine = company?.email ? `Contact: ${company.email}` : "Contact: tportejoie@myjamae.com";

  const footerLine1 = company?.headquarters
    ? `${companyDisplayName} - Siege social : ${company.headquarters}`
    : "EURL JAMAE - Siege social : 250 rue Raymond Durand 38110 ST CLAIR DE LA TOUR";
  const footerLine2 = `${phoneLine} - ${emailLine}`;
  const footerLine3 = [
    company?.capital ? `Capital : ${company.capital}` : "Capital : 1 500 EUR",
    company?.rcs ? company.rcs : "RCS Vienne 845 021 690 00043",
    company?.tvaNumber ? `TVA : ${company.tvaNumber}` : "TVA : FR55845021690"
  ].join(" - ");

  const commentMap = new Map(
    (bordereauComments || []).map(item => [`${item.day}-${item.type}`, item.comment])
  );

  const entriesByType = {
    BO: Array.from(new Set(timeEntries.filter(e => e.type === "BO").map(e => e.day))).sort((a, b) => a - b),
    SITE: Array.from(new Set(timeEntries.filter(e => e.type === "SITE").map(e => e.day))).sort((a, b) => a - b)
  };

  const formatDay = (day: number) => {
    const date = new Date(periodYear, periodMonth, day);
    return date.toLocaleDateString("fr-FR");
  };

  return (
    <div className="bordereau-print">
      <div className="bordereau-scale" style={{ ["--bordereau-scale" as any]: scale }}>
        <div ref={containerRef} className="bordereau-page bg-white shadow-2xl text-[10px] leading-relaxed relative">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-4">
          <Logo className="h-9" showText={false} />
          <h1 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none mt-2">
            {project.type === ProjectType.AT ? "Bordereau d'Avancement" : "Bordereau de Livraison"}
          </h1>
          <div className="h-0.5 w-16 bg-slate-300"></div>
        </div>
        <div className="text-right">
          <p className="font-black text-base text-slate-900 tracking-tighter uppercase">{project.projectNumber}</p>
          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest mt-1">
            Genere le: {new Date().toLocaleDateString("fr-FR")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-10 mb-6">
        <div>
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b pb-1">Emetteur</h3>
          <p className="text-slate-600">{companyDisplayName}</p>
          {headquartersLines.map((line, index) => (
            <p key={`${line}-${index}`} className="text-slate-600">{line}</p>
          ))}
          <p className="text-slate-600">{phoneLine}</p>
          <p className="text-slate-600">{emailLine}</p>
          <div className="mt-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#C49A4C]"></div>
            <p className="font-black text-[#8E652C] uppercase text-[9px]">Chef de Projet: {project.projectManager}</p>
          </div>
        </div>
        <div>
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b pb-1">Client</h3>
          <p className="font-black text-slate-900 text-sm">{client.name}</p>
          <p className="text-slate-600 whitespace-pre-line">{client.address}</p>
          <div className="mt-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
            <p className="text-slate-500 font-bold uppercase text-[9px]">Contact Signataire: {contact.name}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-4 rounded-2xl mb-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-5">
          <Logo className="h-14" showText={false} light />
        </div>
        <div className="flex justify-between items-center mb-4 relative z-10">
          <h4 className="text-[10px] font-black uppercase tracking-widest border-l-4 border-[#C49A4C] pl-2">Details Contractuels</h4>
          <span className="text-[9px] font-black text-white uppercase tracking-widest bg-[#C49A4C] px-2 py-0.5 rounded">
            Periode: {getMonthName(periodMonth)} {periodYear}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-8 relative z-10">
          <div>
            <p className="text-slate-500 uppercase text-[8px] font-black tracking-widest mb-1">Designation</p>
            <p className="font-bold text-[11px] leading-tight">{project.designation}</p>
          </div>
          <div>
            <p className="text-slate-500 uppercase text-[8px] font-black tracking-widest mb-1">No Commande</p>
            <p className="font-bold text-[11px]">{project.orderNumber}</p>
          </div>
          <div>
            <p className="text-slate-500 uppercase text-[8px] font-black tracking-widest mb-1">No Devis</p>
            <p className="font-bold text-[11px]">{project.quoteNumber}</p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h4 className="text-[10px] font-black mb-4 uppercase tracking-widest text-slate-400 flex items-center gap-3">
          Prestations Realisees <span className="h-px flex-1 bg-slate-100"></span>
        </h4>
        <table className="w-full border-collapse">
          <thead>
            {project.type === ProjectType.AT ? (
              <tr className="bg-slate-50 text-slate-400">
                <th className="p-2 text-left font-black uppercase text-[9px] tracking-widest">Designation de la prestation</th>
                <th className="p-2 text-center w-24 font-black uppercase text-[9px] tracking-widest">Unite</th>
                <th className="p-2 text-right w-24 font-black uppercase text-[9px] tracking-widest">Quantite</th>
              </tr>
            ) : (
              <tr className="bg-slate-50 text-slate-400">
                <th className="p-3 text-left font-black uppercase text-[9px] tracking-widest">Livrable</th>
                <th className="p-3 text-center w-28 font-black uppercase text-[9px] tracking-widest">Echeance (%)</th>
                <th className="p-3 text-center w-28 font-black uppercase text-[9px] tracking-widest">Date remise</th>
                <th className="p-3 text-right w-24 font-black uppercase text-[9px] tracking-widest">Quantite</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100 border-b border-slate-100">
            {project.type === ProjectType.AT ? (
              <>
                <tr>
                  <td className="p-3 py-3 font-bold text-slate-800 text-[11px]">Assistance Technique - Back Office (BO)</td>
                  <td className="p-3 text-center font-bold text-slate-500">Jours</td>
                  <td className="p-3 text-right font-black text-[12px] text-slate-900">{totalBODays.toFixed(3)}</td>
                </tr>
                <tr>
                  <td className="p-2 text-[9px] text-slate-500">Reste a consommer (BO)</td>
                  <td className="p-2 text-center text-[9px] text-slate-400">Jours</td>
                  <td className="p-2 text-right text-[9px] font-bold text-slate-700">{remainingBODays.toFixed(3)}</td>
                </tr>
                {entriesByType.BO.map(day => (
                  <tr key={`bo-${day}`} className="bg-slate-50/40">
                    <td className="p-1 text-[9px] text-slate-500">
                      {formatDay(day)}
                    </td>
                    <td className="p-1 text-[9px] text-slate-700" colSpan={2}>
                      {onCommentChange ? (
                        <textarea
                          value={commentMap.get(`${day}-BO`) || ""}
                          onChange={(e) => onCommentChange(day, "BO", e.target.value)}
                          onBlur={(e) => onCommentCommit?.(day, "BO", e.target.value)}
                          onInput={(e) => {
                            const target = e.currentTarget;
                            target.style.height = "auto";
                            target.style.height = `${target.scrollHeight}px`;
                          }}
                          className="w-full border border-slate-200 rounded-md px-2 py-1 text-[9px] bg-white resize-none"
                          rows={1}
                          style={{ minHeight: "20px" }}
                        />
                      ) : (
                        <span className="whitespace-pre-wrap">{commentMap.get(`${day}-BO`) || "-"}</span>
                      )}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="p-3 py-3 font-bold text-slate-800 text-[11px]">Assistance Technique - Sur Site (SITE)</td>
                  <td className="p-3 text-center font-bold text-slate-500">Jours</td>
                  <td className="p-3 text-right font-black text-[12px] text-slate-900">{totalSiteDays.toFixed(3)}</td>
                </tr>
                <tr>
                  <td className="p-2 text-[9px] text-slate-500">Reste a consommer (SITE)</td>
                  <td className="p-2 text-center text-[9px] text-slate-400">Jours</td>
                  <td className="p-2 text-right text-[9px] font-bold text-slate-700">{remainingSiteDays.toFixed(3)}</td>
                </tr>
                {entriesByType.SITE.map(day => (
                  <tr key={`site-${day}`} className="bg-slate-50/40">
                    <td className="p-1 text-[9px] text-slate-500">
                      {formatDay(day)}
                    </td>
                    <td className="p-1 text-[9px] text-slate-700" colSpan={2}>
                      {onCommentChange ? (
                        <textarea
                          value={commentMap.get(`${day}-SITE`) || ""}
                          onChange={(e) => onCommentChange(day, "SITE", e.target.value)}
                          onBlur={(e) => onCommentCommit?.(day, "SITE", e.target.value)}
                          onInput={(e) => {
                            const target = e.currentTarget;
                            target.style.height = "auto";
                            target.style.height = `${target.scrollHeight}px`;
                          }}
                          className="w-full border border-slate-200 rounded-md px-2 py-1 text-[9px] bg-white resize-none"
                          rows={1}
                          style={{ minHeight: "20px" }}
                        />
                      ) : (
                        <span className="whitespace-pre-wrap">{commentMap.get(`${day}-SITE`) || "-"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </>
            ) : (
              deliverables
                .filter(d => d.status === DeliverableStatus.VALIDE || d.status === DeliverableStatus.REMIS)
                .map(d => (
                  <tr key={d.id}>
                    <td className="p-3 py-4 font-bold text-slate-800 text-[11px]">{d.label}</td>
                    <td className="p-3 text-center font-bold text-slate-500">{d.percentage}%</td>
                    <td className="p-3 text-center font-bold text-slate-500">{formatDate(d.submissionDate)}</td>
                    <td className="p-3 text-right font-black text-[12px] text-slate-900">1.0</td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-10 pt-6">
        <div className="space-y-4">
          <p className="font-black text-slate-400 text-[9px] uppercase tracking-widest mb-3">Pour {companyDisplayName}</p>
          <div className="h-24 w-full border border-slate-100 bg-slate-50/50 rounded-xl italic flex flex-col items-center justify-center text-slate-300 relative">
            <p className="text-[8px] uppercase font-black absolute top-3 left-3">Cachet Societe</p>
            <div className="opacity-10 scale-50">
              <Logo showText={false} />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <p className="font-black text-slate-400 text-[9px] uppercase tracking-widest mb-3">Bon pour accord client</p>
          <div className="border-2 border-dashed border-amber-200 rounded-xl p-4 h-28 relative bg-amber-50/20">
            <p className="text-[8px] text-[#C49A4C] font-black uppercase mb-1">Signataire autorise:</p>
            <p className="font-black text-slate-900 text-[11px] leading-none mb-1">{contact.name}</p>
            <p className="text-[9px] text-slate-400 font-bold mb-6">{contact.email}</p>
            <div className="absolute bottom-4 right-5 text-[8px] text-slate-300 font-black uppercase tracking-widest">Signature & Date</div>
          </div>
        </div>
      </div>

      <footer className="mt-12 pt-4 border-t border-slate-100 text-center text-[8px] text-slate-400 space-y-1 uppercase tracking-tighter">
        <p className="font-black text-slate-500 text-[9px]">{footerLine1}</p>
        <p className="font-bold text-[8px]">{footerLine2}</p>
        <p className="font-bold text-[8px]">{footerLine3}</p>
        <p className="text-[#C49A4C] font-black tracking-widest text-[8px] mt-3">Document immuable genere par {companyDisplayName}</p>
      </footer>
    </div>
      </div>
    </div>
  );
};

export default BordereauDocument;
