"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CtdDossierInput } from "@/lib/ctd-rules";
import { createCaseAction, updateCaseAction, analyzeCaseAction } from "@/server/actions/cases";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Save,
  PlayCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface CaseFormProps {
  initialData?: CtdDossierInput;
  caseId?: string;
  isEditMode?: boolean;
}

const LT_INTERVALS = [0, 3, 6, 9, 12, 18, 24];
const AC_INTERVALS = [0, 1, 3, 6];
const VMA_PARAMS: [string, string][] = [
  ["acc", "Akurasi"],
  ["rep", "Presisi: repeatability"],
  ["ip", "Presisi: intermediate precision"],
  ["spec", "Spesifisitas"],
  ["lod", "LOD/LOQ"],
  ["lin", "Linearitas"],
  ["range", "Range"],
  ["rob", "Robustness"],
];

const DEFAULT_FORM_DATA: CtdDossierInput = {
  produk: "",
  api: "",
  pemohon: "",
  noreg: "",
  tgl: "",
  batas: "30 hari kerja",
  nbatch: 3,
  skala: "Komersial",
  std: "USP",
  terdaftar: "1",
  urut: "1",
  ltT: 30,
  ltH: 75,
  ltM: 12,
  barrier: "0",
  ltI: [0, 3, 6, 9, 12],
  acT: 40,
  acH: 75,
  acM: 6,
  acI: [0, 1, 3, 6],
  vproc: "assay",
  vmode: "proj",
  vma: ["acc", "rep", "ip", "spec", "lod", "lin", "rob"],
  vlinN: 5,
  vaccN: 9,
  vaccL: 3,
  vrepC: "9",
  vlo: 80,
  vhi: 120,
  jalur: "",
  qos: "1",
  hewan: "1",
  dmf: "1",
  eqv: "1",
  refc: "",
  ref5: "1",
  ar: "1",
  pern: "1",
  kate: "0",
  ident: "1",
  cat: "",
};

export function CaseForm({ initialData, caseId, isEditMode: _isEditMode }: CaseFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CtdDossierInput>(
    initialData ? { ...DEFAULT_FORM_DATA, ...initialData } : DEFAULT_FORM_DATA
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>("Draft tersimpan");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeCaseIdRef = useRef<string | undefined>(caseId);

  // Auto-save debounced
  useEffect(() => {
    setAutoSaveStatus("Menyimpan...");
    const timer = setTimeout(async () => {
      try {
        if (activeCaseIdRef.current) {
          const res = await updateCaseAction(activeCaseIdRef.current, formData);
          if (!res.success) {
            setAutoSaveStatus(res.message || "Gagal menyimpan otomatis");
            return;
          }
        }
        setAutoSaveStatus("Draft tersimpan otomatis");
      } catch (err: any) {
        setAutoSaveStatus(err?.message || "Gagal menyimpan otomatis");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [formData]);

  const handleChange = (
    field: keyof CtdDossierInput,
    value: any
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (
    field: "ltI" | "acI" | "vma",
    item: any
  ) => {
    setFormData((prev) => {
      const arr = (prev[field] as any[]) || [];
      const exists = arr.includes(item);
      const updated = exists ? arr.filter((x) => x !== item) : [...arr, item];
      return { ...prev, [field]: updated };
    });
  };

  const validateStep = (step: number): boolean => {
    setErrorMessage(null);
    if (step === 1) {
      if (!formData.produk?.trim()) {
        setErrorMessage("Nama produk wajib diisi");
        return false;
      }
      if (!formData.api?.trim()) {
        setErrorMessage("Bahan aktif (API) wajib diisi");
        return false;
      }
      if (!formData.pemohon?.trim()) {
        setErrorMessage("Nama pemohon registrasi wajib diisi");
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => Math.min(5, s + 1));
    }
  };

  const prevStep = () => {
    setCurrentStep((s) => Math.max(1, s - 1));
  };

  const handleManualSave = async () => {
    if (!validateStep(1)) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (activeCaseIdRef.current) {
        const res = await updateCaseAction(activeCaseIdRef.current, formData);
        if (!res.success) throw new Error(res.message);
        router.push(`/cases/${activeCaseIdRef.current}`);
      } else {
        const res = await createCaseAction(formData);
        if (!res.success || !res.data) throw new Error(res.message);
        activeCaseIdRef.current = res.data.id;
        router.push(`/cases/${res.data.id}`);
      }
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menyimpan dossier.");
      setIsSaving(false);
    }
  };

  const handleSaveAndAnalyze = async () => {
    if (!validateStep(1)) return;
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      let targetId = activeCaseIdRef.current;
      if (!targetId) {
        const createRes = await createCaseAction(formData);
        if (!createRes.success || !createRes.data) {
          throw new Error(createRes.message);
        }
        targetId = createRes.data.id;
        activeCaseIdRef.current = targetId;
      } else {
        await updateCaseAction(targetId, formData);
      }

      const analyzeRes = await analyzeCaseAction(targetId, formData);
      if (!analyzeRes.success) throw new Error(analyzeRes.message);

      router.push(`/cases/${targetId}`);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menjalankan analisis.");
      setIsAnalyzing(false);
    }
  };

  const steps = [
    { num: 1, title: "Identitas Dossier" },
    { num: 2, title: "Mutu Bahan Aktif" },
    { num: 3, title: "Stabilitas Obat Jadi" },
    { num: 4, title: "Validasi Metode (VMA)" },
    { num: 5, title: "Praregistrasi & Jalur" },
  ];

  return (
    <div className="space-y-6">
      {/* Step Indicators */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
        <div className="flex items-center justify-between">
          {steps.map((st, i) => {
            const isPassed = currentStep > st.num;
            const isCurrent = currentStep === st.num;
            return (
              <React.Fragment key={st.num}>
                <button
                  type="button"
                  onClick={() => {
                    if (st.num < currentStep || validateStep(currentStep)) {
                      setCurrentStep(st.num);
                    }
                  }}
                  className="flex items-center gap-2 group focus:outline-none"
                >
                  <div
                    className={`w-7 h-7 rounded flex items-center justify-center font-mono text-xs font-bold transition ${
                      isCurrent
                        ? "bg-blue-800 text-white"
                        : isPassed
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {isPassed ? <Check className="w-3.5 h-3.5" /> : st.num}
                  </div>
                  <span
                    className={`text-xs font-medium hidden md:inline ${
                      isCurrent
                        ? "text-slate-900 dark:text-slate-100 font-semibold"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {st.title}
                  </span>
                </button>

                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition ${
                      currentStep > st.num
                        ? "bg-emerald-600"
                        : "bg-slate-200 dark:bg-slate-800"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-center gap-2.5 text-xs text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step Contents */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs">
        {/* Step 1: Identitas Dossier */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                01. Identitas Dossier Registrasi
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Data umum produk, bahan aktif, dan pemohon registrasi
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nama Produk & Kekuatan Sediaan *
                </label>
                <input
                  type="text"
                  value={formData.produk || ""}
                  onChange={(e) => handleChange("produk", e.target.value)}
                  placeholder="mis. Amoxicillin Kapsul 500 mg"
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Bahan Aktif (API) *
                </label>
                <input
                  type="text"
                  value={formData.api || ""}
                  onChange={(e) => handleChange("api", e.target.value)}
                  placeholder="mis. Amoxicillin Trihydrate"
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nama Pemohon Registrasi *
                </label>
                <input
                  type="text"
                  value={formData.pemohon || ""}
                  onChange={(e) => handleChange("pemohon", e.target.value)}
                  placeholder="mis. PT Industri Farmasi Indonesia"
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  No. Registrasi / Referensi
                </label>
                <input
                  type="text"
                  value={formData.noreg || ""}
                  onChange={(e) => handleChange("noreg", e.target.value)}
                  placeholder="mis. REG-2026-0012"
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Surat Evaluasi
                </label>
                <input
                  type="text"
                  value={formData.tgl || ""}
                  onChange={(e) => handleChange("tgl", e.target.value)}
                  placeholder="mis. 26 Oktober 2026"
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Batas Waktu Tanggapan Pemohon
                </label>
                <input
                  type="text"
                  value={formData.batas || ""}
                  onChange={(e) => handleChange("batas", e.target.value)}
                  placeholder="mis. 30 hari kerja"
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Mutu Bahan Aktif (CoA API) */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                02. Mutu Bahan Aktif (CoA API)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kriteria CoA zat aktif sesuai PerKa BPOM No. 24/2017
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Jumlah Batch pada CoA
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.nbatch ?? 3}
                  onChange={(e) => handleChange("nbatch", parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Ketentuan: Minimal 3 batch berurutan
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Skala Batch
                </label>
                <select
                  value={formData.skala || "Komersial"}
                  onChange={(e) => handleChange("skala", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                >
                  <option value="Komersial">Komersial</option>
                  <option value="Pilot">Pilot</option>
                  <option value="Laboratorium">Laboratorium</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Standar Spesifikasi
                </label>
                <select
                  value={formData.std ?? "USP"}
                  onChange={(e) => handleChange("std", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                >
                  <option value="USP">USP</option>
                  <option value="BP">BP</option>
                  <option value="Ph.Eur">Ph.Eur</option>
                  <option value="FI">FI (Farmakope Indonesia)</option>
                  <option value="In-House">In-House</option>
                  <option value="">Tidak dinyatakan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Produsen API Terdaftar?
                </label>
                <select
                  value={formData.terdaftar ?? "1"}
                  onChange={(e) => handleChange("terdaftar", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                >
                  <option value="1">Ya (Terdaftar di BPOM)</option>
                  <option value="0">Tidak Terdaftar</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Pernyataan Batch Berurutan?
                </label>
                <select
                  value={formData.urut ?? "1"}
                  onChange={(e) => handleChange("urut", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                >
                  <option value="1">Ya, 3 batch berurutan</option>
                  <option value="0">Tidak / tidak dinyatakan</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Stabilitas Obat Jadi */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                03. Stabilitas Obat Jadi (Zona IVb & Accelerated)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ASEAN Stability Guideline: Kondisi Zona IVb (30°C ± 2°C / 75% RH ± 5% RH)
              </p>
            </div>

            {/* Sub-A: Real-Time */}
            <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400 block">
                A. Real-Time (Long-Term)
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Suhu Real-Time (°C)
                  </label>
                  <input
                    type="number"
                    value={formData.ltT ?? 30}
                    onChange={(e) => handleChange("ltT", Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Kelembaban Real-Time (% RH)
                  </label>
                  <input
                    type="number"
                    value={formData.ltH ?? 75}
                    onChange={(e) => handleChange("ltH", Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Interval Pengujian Real-Time Tersedia (bulan)
                </label>
                <div className="flex flex-wrap gap-2">
                  {LT_INTERVALS.map((m) => {
                    const checked = (formData.ltI || []).includes(m);
                    return (
                      <button
                        type="button"
                        key={m}
                        onClick={() => toggleArrayItem("ltI", m)}
                        className={`px-3 py-1 text-xs rounded border transition flex items-center gap-1.5 ${
                          checked
                            ? "bg-blue-100 dark:bg-blue-900/50 border-blue-400 text-blue-800 dark:text-blue-300 font-semibold"
                            : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${checked ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"}`} />
                        <span>{m} bln</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Durasi Data Terlama (bulan)
                  </label>
                  <input
                    type="number"
                    value={formData.ltM ?? 12}
                    onChange={(e) => handleChange("ltM", Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Studi Barrier / Ekstrapolasi?
                  </label>
                  <select
                    value={formData.barrier ?? "0"}
                    onChange={(e) => handleChange("barrier", e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="0">Tidak ada</option>
                    <option value="1">Ada & tervalidasi</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Sub-B: Accelerated */}
            <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400 block">
                B. Accelerated (Dipercepat)
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Suhu Accelerated (°C)
                  </label>
                  <input
                    type="number"
                    value={formData.acT ?? 40}
                    onChange={(e) => handleChange("acT", Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Kelembaban Accelerated (% RH)
                  </label>
                  <input
                    type="number"
                    value={formData.acH ?? 75}
                    onChange={(e) => handleChange("acH", Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Interval Pengujian Accelerated Tersedia (bulan)
                </label>
                <div className="flex flex-wrap gap-2">
                  {AC_INTERVALS.map((m) => {
                    const checked = (formData.acI || []).includes(m);
                    return (
                      <button
                        type="button"
                        key={m}
                        onClick={() => toggleArrayItem("acI", m)}
                        className={`px-3 py-1 text-xs rounded border transition flex items-center gap-1.5 ${
                          checked
                            ? "bg-blue-100 dark:bg-blue-900/50 border-blue-400 text-blue-800 dark:text-blue-300 font-semibold"
                            : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${checked ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"}`} />
                        <span>{m} bln</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Durasi Pengujian Accelerated (bulan)
                </label>
                <input
                  type="number"
                  value={formData.acM ?? 6}
                  onChange={(e) => handleChange("acM", Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Validasi Metode Analisis (VMA) */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                04. Validasi Metode Analisis (ICH Q2(R1))
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Karakteristik validasi prosedur analitik obat jadi
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Jenis Prosedur Analisis
                </label>
                <select
                  value={formData.vproc || "assay"}
                  onChange={(e) => handleChange("vproc", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                >
                  <option value="assay">Assay (kadar zat aktif)</option>
                  <option value="impq">Impuritas kuantitatif</option>
                  <option value="impl">Uji batas impuritas</option>
                  <option value="ident">Identifikasi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Kriteria Penilaian Parameter
                </label>
                <select
                  value={formData.vmode || "proj"}
                  onChange={(e) => handleChange("vmode", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                >
                  <option value="proj">Kriteria proyek (7 parameter wajib)</option>
                  <option value="q2">ICH Q2(R1) sesuai jenis prosedur</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                Parameter yang Telah Divalidasi
              </label>
              <div className="flex flex-wrap gap-2">
                {VMA_PARAMS.map(([k, label]) => {
                  const checked = (formData.vma || []).includes(k);
                  return (
                    <button
                      type="button"
                      key={k}
                      onClick={() => toggleArrayItem("vma", k)}
                      className={`px-3 py-1.5 text-xs rounded border transition flex items-center gap-1.5 ${
                        checked
                          ? "bg-blue-100 dark:bg-blue-900/50 border-blue-400 text-blue-800 dark:text-blue-300 font-semibold"
                          : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${checked ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"}`} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Konsentrasi Linearitas (n)
                </label>
                <input
                  type="number"
                  value={formData.vlinN ?? 5}
                  onChange={(e) => handleChange("vlinN", Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Determinasi Akurasi (n)
                </label>
                <input
                  type="number"
                  value={formData.vaccN ?? 9}
                  onChange={(e) => handleChange("vaccN", Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Level Konsentrasi Akurasi
                </label>
                <input
                  type="number"
                  value={formData.vaccL ?? 3}
                  onChange={(e) => handleChange("vaccL", Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Repeatability
                </label>
                <select
                  value={formData.vrepC ?? "9"}
                  onChange={(e) => handleChange("vrepC", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="9">9 determinasi (3 level × 3)</option>
                  <option value="6">6 determinasi pada 100%</option>
                  <option value="0">Kurang dari minimal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Rentang Bawah Assay (% uji)
                </label>
                <input
                  type="number"
                  value={formData.vlo ?? 80}
                  onChange={(e) => handleChange("vlo", Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Rentang Atas Assay (% uji)
                </label>
                <input
                  type="number"
                  value={formData.vhi ?? 120}
                  onChange={(e) => handleChange("vhi", Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Catatan Reviewer / Catatan Teknis (opsional)
              </label>
              <textarea
                rows={2}
                value={formData.cat || ""}
                onChange={(e) => handleChange("cat", e.target.value)}
                placeholder="Catatan tambahan mengenai metode..."
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Step 5: Praregistrasi & Ketentuan Khusus Jalur 90 Hari */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                05. Praregistrasi & Jalur Evaluasi
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelengkapan dokumen praregistrasi (PerKa BPOM 24/2017 jo. PerBPOM 23/2025)
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Jalur Evaluasi yang Diajukan
              </label>
              <select
                value={formData.jalur || ""}
                onChange={(e) => handleChange("jalur", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
              >
                <option value="">Tidak diperiksa</option>
                <option value="90">90 hari (referensi negara dikenal baik)</option>
                <option value="100">100 hari</option>
                <option value="150">150 hari (generik / generik bermerek)</option>
                <option value="300">300 hari</option>
                <option value="lain">Jalur lain</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Ringkasan Mutu (QOS)
                </label>
                <select
                  value={formData.qos ?? "1"}
                  onChange={(e) => handleChange("qos", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="1">Ada</option>
                  <option value="0">Tidak ada</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Informasi Bahan Asal Hewan
                </label>
                <select
                  value={formData.hewan ?? "1"}
                  onChange={(e) => handleChange("hewan", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="1">Ada / pernyataan bebas</option>
                  <option value="0">Tidak ada</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  DMF Zat Aktif
                </label>
                <select
                  value={formData.dmf ?? "1"}
                  onChange={(e) => handleChange("dmf", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="1">Ada</option>
                  <option value="2">Tidak perlu (API izin edar RI)</option>
                  <option value="0">Diperlukan, tidak ada</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Data Ekivalensi
                </label>
                <select
                  value={formData.eqv ?? "1"}
                  onChange={(e) => handleChange("eqv", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="1">Ringkasan / protokol ada</option>
                  <option value="2">Justifikasi tidak perlu uji</option>
                  <option value="0">Tidak ada</option>
                </select>
              </div>
            </div>

            {/* Khusus Jalur 90 Hari */}
            {formData.jalur === "90" && (
              <div className="mt-4 p-4 rounded border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 block">
                  Ketentuan Khusus Jalur 90 Hari (PerBPOM 23/2025)
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Negara Referensi
                    </label>
                    <select
                      value={formData.refc || ""}
                      onChange={(e) => handleChange("refc", e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="">Belum dipilih</option>
                      <option>Uni Eropa</option>
                      <option>Amerika Serikat</option>
                      <option>Australia</option>
                      <option>Kanada</option>
                      <option>Inggris</option>
                      <option>Jepang</option>
                      <option>Swiss</option>
                      <option>Lainnya</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Persetujuan ≤ 5 Tahun?
                    </label>
                    <select
                      value={formData.ref5 ?? "1"}
                      onChange={(e) => handleChange("ref5", e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="1">Ya (Dalam 5 tahun)</option>
                      <option value="0">Tidak (Lebih dari 5 tahun)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Assessment Report (AR) Lengkap (Inggris)
                    </label>
                    <select
                      value={formData.ar ?? "1"}
                      onChange={(e) => handleChange("ar", e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="1">Ada</option>
                      <option value="0">Tidak ada</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Matriks & Surat Mutu Sama
                    </label>
                    <select
                      value={formData.pern ?? "1"}
                      onChange={(e) => handleChange("pern", e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="1">Ada</option>
                      <option value="0">Tidak ada</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Antiinfeksi / HCV / HIV / TB?
                    </label>
                    <select
                      value={formData.kate ?? "0"}
                      onChange={(e) => handleChange("kate", e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="0">Bukan (Kategori Umum)</option>
                      <option value="1">Ya (Kategori Khusus)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Aspek Mutu Identik dengan Referensi?
                    </label>
                    <select
                      value={formData.ident ?? "1"}
                      onChange={(e) => handleChange("ident", e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="1">Ya, identik</option>
                      <option value="0">Ada perbedaan</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions & Step Navigation */}
        <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono">
              {autoSaveStatus}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-3 py-2 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-4 py-2 text-xs font-medium rounded bg-blue-800 hover:bg-blue-900 text-white transition flex items-center gap-1 shadow-xs"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleManualSave}
              disabled={isSaving || isAnalyzing}
              className="px-3.5 py-2 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Simpan Draft</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndAnalyze}
              disabled={isSaving || isAnalyzing}
              className="px-4 py-2 text-xs font-semibold rounded bg-blue-900 hover:bg-blue-800 text-white transition flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menganalisis...</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4" />
                  <span>Analisis Dossier</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
