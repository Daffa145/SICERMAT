import { CtdDossierInput, EvaluationFinding } from "./types";
import { REGULATORY_CONFIG } from "./config";

export function evaluateVma(d: CtdDossierInput): EvaluationFinding[] {
  const R: EvaluationFinding[] = [];
  const add = (
    p: string,
    f: string,
    s: string,
    st: "S" | "K" | "T",
    n: string,
    q: string
  ) => {
    R.push({ p, f, s, st, n, q });
  };

  const vproc = (d.vproc || "assay") as "assay" | "impq" | "impl" | "ident";
  const proj = [...REGULATORY_CONFIG.vma.projectMandatory];
  const MX = REGULATORY_CONFIG.vma.ichQ2Matrix;
  const q2 = d.vmode === "q2";
  const req = q2 ? MX[vproc] || [] : proj;
  const PN =
    REGULATORY_CONFIG.vma.procedureNames[vproc] || "assay (kadar)";

  const src = q2
    ? `ICH Q2(R1), tabel karakteristik untuk ${PN}`
    : "Kriteria proyek: parameter wajib VMA";

  const vmaList = Array.isArray(d.vma) ? d.vma : [];

  REGULATORY_CONFIG.vma.parameters.forEach(([k, n]) => {
    const has = vmaList.includes(k);
    const need = req.includes(k);
    if (!need && !(q2 && k === "rob")) return;
    const soft = !need;
    const st: "S" | "K" | "T" = has ? "S" : soft ? "K" : "T";
    const extra =
      !q2 && !has && !MX[vproc]?.includes(k) && k !== "rob"
        ? ` Catatan: ICH Q2(R1) tidak umum mengevaluasi parameter ini untuk ${PN}.`
        : "";

    add(
      "VMA: " + n,
      has ? "Tersedia" : "Tidak ditemukan",
      soft
        ? "ICH Q2(R1): robustness dipertimbangkan pada tahap pengembangan prosedur"
        : src,
      st,
      (has
        ? "Memenuhi."
        : soft
        ? "Data robustness belum ada."
        : "Parameter wajib belum divalidasi.") + extra,
      `Hasil validasi metode analisis untuk parameter ${n} tidak ditemukan; mohon lengkapi data dan kriteria penerimaan.`
    );
  });

  const Q = "ICH Q2(R1) ";
  const V = vmaList;

  if (V.includes("lin")) {
    const vlinN = Number(d.vlinN) || 0;
    add(
      "VMA: linearitas, jumlah konsentrasi",
      `${d.vlinN} konsentrasi`,
      Q + "Part II 2: minimal 5 konsentrasi",
      vlinN >= 5 ? "S" : "T",
      vlinN >= 5 ? "Memenuhi." : "Jumlah konsentrasi kurang.",
      `Linearitas hanya menggunakan ${d.vlinN} konsentrasi; mohon lengkapi minimal 5 konsentrasi beserta koefisien korelasi, y-intercept, slope, dan residual sum of squares serta plot data.`
    );
  }

  const vaccN = Number(d.vaccN) || 0;
  const vaccL = Number(d.vaccL) || 0;
  const accOk = vaccN >= 9 && vaccL >= 3;
  if (V.includes("acc")) {
    add(
      "VMA: akurasi, jumlah determinasi",
      `${d.vaccN} determinasi / ${d.vaccL} level`,
      Q + "Part II 4.3: minimal 9 determinasi pada minimal 3 level",
      accOk ? "S" : "T",
      accOk ? "Memenuhi." : "Data akurasi kurang dari rekomendasi.",
      `Data akurasi (${d.vaccN} determinasi pada ${d.vaccL} level) belum memenuhi minimal 9 determinasi pada minimal 3 level konsentrasi yang mencakup range; mohon lengkapi dengan persen recovery dan confidence interval.`
    );
  }

  if (V.includes("rep")) {
    const repMap: Record<string, string> = {
      "9": "9 determinasi (3x3)",
      "6": "6 determinasi pada 100%",
      "0": "Kurang dari minimal",
    };
    const repKey = String(d.vrepC ?? "9");
    add(
      "VMA: repeatability, jumlah determinasi",
      repMap[repKey] || "Kurang dari minimal",
      Q +
        "Part II 5.1: minimal 9 determinasi (3x3) atau 6 determinasi pada 100% konsentrasi uji",
      d.vrepC === "0" ? "T" : "S",
      d.vrepC === "0" ? "Jumlah determinasi kurang." : "Memenuhi.",
      `Jumlah determinasi repeatability belum memenuhi minimal 9 determinasi (3 konsentrasi x 3 replikasi) atau 6 determinasi pada 100% konsentrasi uji; mohon sertakan SD, RSD, dan confidence interval.`
    );
  }

  if (V.includes("range") && vproc === "assay") {
    const vlo = Number(d.vlo) || 0;
    const vhi = Number(d.vhi) || 0;
    const ok = vlo <= 80 && vhi >= 120;
    add(
      "VMA: range assay",
      `${d.vlo}-${d.vhi}%`,
      Q + "Part II 3: assay minimal 80-120% konsentrasi uji",
      ok ? "S" : "T",
      ok ? "Memenuhi." : "Range lebih sempit dari minimal.",
      `Range tervalidasi (${d.vlo}-${d.vhi}%) lebih sempit dari minimal 80-120% konsentrasi uji untuk assay; mohon lengkapi data linearitas, akurasi, dan presisi pada range tersebut.`
    );
  }

  return R;
}
