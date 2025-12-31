"use client";

import React, { useEffect, useState } from "react";
import { CompanySettings } from "../types";
import { getCompanySettings, updateCompanySettings, uploadCompanyLogo } from "../lib/api";

const emptySettings: CompanySettings = {
  id: "default",
  name: "",
  legalForm: "",
  headquarters: "",
  siren: "",
  siret: "",
  tvaNumber: "",
  capital: "",
  rcs: "",
  phone: "",
  email: "",
  website: "",
  logoUrl: null
};

const CompanySettingsForm: React.FC = () => {
  const [form, setForm] = useState<CompanySettings>(emptySettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCompanySettings();
      setForm({ ...data });
    } catch {
      setError("Impossible de charger les parametres.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (key: keyof CompanySettings, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!form.name) {
      setError("Le nom de l'entreprise est obligatoire.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: form.name,
        legalForm: form.legalForm || "",
        headquarters: form.headquarters || "",
        siren: form.siren || "",
        siret: form.siret || "",
        tvaNumber: form.tvaNumber || "",
        capital: form.capital || "",
        rcs: form.rcs || "",
        phone: form.phone || "",
        email: form.email || "",
        website: form.website || ""
      };
      const updated = await updateCompanySettings(payload);
      setForm(prev => ({ ...prev, ...updated }));
      setSuccess("Parametres enregistres.");
      window.dispatchEvent(new Event("company-settings-updated"));
    } catch {
      setError("Impossible d'enregistrer les parametres.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(null);
    try {
      const response = await uploadCompanyLogo(file);
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      await load();
      setSuccess("Logo mis a jour.");
      window.dispatchEvent(new Event("company-settings-updated"));
    } catch {
      setError("Impossible de telecharger le logo.");
    }
  };

  if (isLoading) {
    return <div className="text-sm text-slate-400">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Parametres entreprise</h2>
        <p className="text-sm text-slate-500">Ces informations apparaissent sur les bordereaux et dans l'application.</p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-sm text-rose-600">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Logo</label>
          <div className="flex items-center gap-6">
            <div className="h-16 w-44 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Logo" className="h-12 w-auto object-contain" />
              ) : (
                <span className="text-xs text-slate-400">Aucun logo</span>
              )}
            </div>
            <input type="file" accept="image/*" onChange={handleLogoUpload} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom *</label>
              <input value={form.name} onChange={(e) => handleChange("name", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Forme juridique</label>
              <input value={form.legalForm || ""} onChange={(e) => handleChange("legalForm", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Siege social</label>
            <textarea value={form.headquarters || ""} onChange={(e) => handleChange("headquarters", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[80px]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SIREN</label>
              <input value={form.siren || ""} onChange={(e) => handleChange("siren", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SIRET</label>
              <input value={form.siret || ""} onChange={(e) => handleChange("siret", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">TVA</label>
              <input value={form.tvaNumber || ""} onChange={(e) => handleChange("tvaNumber", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Capital</label>
              <input value={form.capital || ""} onChange={(e) => handleChange("capital", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">RCS / Registre</label>
            <input value={form.rcs || ""} onChange={(e) => handleChange("rcs", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telephone</label>
              <input value={form.phone || ""} onChange={(e) => handleChange("phone", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
              <input value={form.email || ""} onChange={(e) => handleChange("email", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Site web</label>
            <input value={form.website || ""} onChange={(e) => handleChange("website", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm disabled:opacity-60"
            >
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanySettingsForm;
