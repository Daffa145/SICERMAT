import { CtdDossierInput, EvaluationFinding } from "./types";
import { REGULATORY_CONFIG } from "./config";

export function evaluateStability(d: CtdDossierInput): EvaluationFinding[] {
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

  const ltI = Array.isArray(d.ltI) ? d.ltI : [];
  const acI = Array.isArray(d.acI) ? d.acI : [];

  // Real-Time
  const t = Number(d.ltT) || 0;
  const h = Number(d.ltH) || 0;
  const okLT = Math.abs(t - 30) <= 2 && Math.abs(h - 75) <= 5;
  const zI = t <= 26 && h <= 65;
  const stLT: "S" | "K" | "T" = okLT
    ? "S"
    : zI && d.barrier === "1"
    ? "K"
    : "T";

  add(
    "Stabilitas real-time: kondisi",
    `${t}°C / ${h}% RH`,
    "30°C ± 2°C / 75% RH ± 5% RH (Zona IVb)",
    stLT,
    okLT
      ? "Memenuhi Zona IVb."
      : stLT === "K"
      ? "Zona I/II dengan studi ekstrapolasi/barrier; evaluasi validitas studi."
      : "Data Zona I/II tidak dapat diterima tanpa ekstrapolasi/barrier tervalidasi.",
    okLT
      ? ""
      : `Studi stabilitas real-time dilakukan pada ${t}°C / ${h}% RH, tidak sesuai Zona IVb (30°C ± 2°C / 75% RH ± 5% RH). Mohon sampaikan data pada kondisi Zona IVb atau studi ekstrapolasi/kemasan barrier tinggi yang tervalidasi.`
  );

  const mLT = Number(d.ltM) || 0;
  const missLT = [0, 3, 6, 9, 12].filter((v) => !ltI.includes(v));

  add(
    "Stabilitas real-time: data minimal",
    `${mLT} bulan`,
    "Minimal 12 bulan data real-time saat pengajuan",
    mLT >= 12 ? "S" : "T",
    mLT >= 12 ? "Memenuhi." : "Data belum mencapai 12 bulan.",
    `Data stabilitas real-time baru ${mLT} bulan; minimal 12 bulan pada kondisi Zona IVb saat pengajuan awal.`
  );

  add(
    "Stabilitas real-time: interval",
    ltI.join(", ") || "-",
    "0, 3, 6, 9, 12, 18, 24 bulan, lalu tahunan",
    missLT.length ? "T" : ltI.includes(18) && ltI.includes(24) ? "S" : "K",
    missLT.length
      ? `Interval ${missLT.join(", ")} bulan belum ada.`
      : ltI.includes(18) && ltI.includes(24)
      ? "Lengkap."
      : "Interval 18 dan 24 bulan belum tersedia; sertakan komitmen kelanjutan studi.",
    missLT.length
      ? `Interval pengujian real-time ${missLT.join(
          ", "
        )} bulan tidak tersedia; mohon lengkapi.`
      : `Mohon sampaikan komitmen dan jadwal kelanjutan pengujian real-time 18, 24 bulan dan seterusnya hingga shelf-life yang diajukan.`
  );

  // Accelerated
  const at = Number(d.acT) || 0;
  const ah = Number(d.acH) || 0;
  const okAC = Math.abs(at - 40) <= 2 && Math.abs(ah - 75) <= 5;

  add(
    "Stabilitas dipercepat: kondisi",
    `${at}°C / ${ah}% RH`,
    "40°C ± 2°C / 75% RH ± 5% RH",
    okAC ? "S" : "T",
    okAC ? "Memenuhi." : "Kondisi menyimpang.",
    `Kondisi uji dipercepat ${at}°C / ${ah}% RH tidak sesuai 40°C ± 2°C / 75% RH ± 5% RH; mohon lengkapi data pada kondisi yang sesuai.`
  );

  const AC = REGULATORY_CONFIG.stabilityAccelerated.standardIntervals;
  const missAC = AC.filter((v) => !acI.includes(v));
  const mAC = Number(d.acM) || 0;

  add(
    "Stabilitas dipercepat: durasi dan interval",
    `${mAC} bulan; interval ${acI.join(", ") || "-"}`,
    "Minimal 6 bulan; interval 0, 1, 3, 6",
    mAC >= 6 && !missAC.length ? "S" : "T",
    mAC < 6
      ? "Durasi kurang dari 6 bulan."
      : missAC.length
      ? `Interval ${missAC.join(", ")} bulan belum ada.`
      : "Memenuhi.",
    `Studi dipercepat harus berdurasi minimal 6 bulan dengan interval 0, 1, 3, 6 bulan${
      mAC < 6 ? ` (durasi saat ini ${mAC} bulan)` : ""
    }${missAC.length ? `; interval ${missAC.join(", ")} bulan belum tersedia` : ""}.`
  );

  return R;
}
