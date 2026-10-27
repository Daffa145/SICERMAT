export const REGULATORY_CONFIG = {
  // Stabilitas Real-Time (Zona IVb)
  stabilityRealTime: {
    targetTemp: 30,
    tempTolerance: 2,
    targetHumidity: 75,
    humidityTolerance: 5,
    minDurationMonths: 12,
    standardIntervals: [0, 3, 6, 9, 12, 18, 24],
    requiredInitialIntervals: [0, 3, 6, 9, 12],
    extendedIntervals: [18, 24],
    zone1_2TempMax: 26,
    zone1_2HumidityMax: 65,
  },

  // Stabilitas Dipercepat (Accelerated)
  stabilityAccelerated: {
    targetTemp: 40,
    tempTolerance: 2,
    targetHumidity: 75,
    humidityTolerance: 5,
    minDurationMonths: 6,
    standardIntervals: [0, 1, 3, 6],
  },

  // Validasi Metode Analisis (ICH Q2(R1))
  vma: {
    parameters: [
      ["acc", "Akurasi"],
      ["rep", "Presisi: repeatability"],
      ["ip", "Presisi: intermediate precision"],
      ["spec", "Spesifisitas"],
      ["lod", "LOD/LOQ"],
      ["lin", "Linearitas"],
      ["range", "Range"],
      ["rob", "Robustness"],
    ] as const,

    projectMandatory: [
      "acc",
      "rep",
      "ip",
      "spec",
      "lod",
      "lin",
      "rob",
    ] as const,

    ichQ2Matrix: {
      ident: ["spec"],
      impq: ["acc", "rep", "ip", "spec", "lod", "lin", "range"],
      impl: ["spec", "lod"],
      assay: ["acc", "rep", "ip", "spec", "lin", "range"],
    } as Record<string, string[]>,

    procedureNames: {
      ident: "uji identifikasi",
      impq: "uji impuritas kuantitatif",
      impl: "uji batas impuritas",
      assay: "assay (kadar)",
    } as Record<string, string>,

    linearityMinConcentrations: 5,
    accuracyMinDeterminations: 9,
    accuracyMinLevels: 3,
    assayRangeMinLow: 80,
    assayRangeMinHigh: 120,
  },

  // Jalur 90 Hari (PerBPOM 23/2025)
  route90: {
    recognizedReferenceCountries: [
      "Uni Eropa",
      "Amerika Serikat",
      "Australia",
      "Kanada",
      "Inggris",
      "Jepang",
      "Swiss",
    ] as const,
  },

  // Label Status
  statusLabels: {
    S: "Sesuai",
    K: "Perlu Klarifikasi",
    T: "Tidak Sesuai",
  } as const,
};
