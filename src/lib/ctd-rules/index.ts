import { CtdDossierInput, EvaluationFinding, AnalysisSummary } from "./types";
import { evaluateCoa } from "./coa";
import { evaluateStability } from "./stability";
import { evaluateVma } from "./vma";
import { evaluatePreregistration } from "./preregistration";
import { evaluateRoute90 } from "./route90";

export * from "./types";
export * from "./config";
export * from "./coa";
export * from "./stability";
export * from "./vma";
export * from "./preregistration";
export * from "./route90";
export * from "./letter";

/**
 * Main analyze function identical to tes.html analyze()
 */
export function analyze(d: CtdDossierInput): EvaluationFinding[] {
  const R: EvaluationFinding[] = [
    ...evaluateCoa(d),
    ...evaluateStability(d),
    ...evaluateVma(d),
    ...evaluatePreregistration(d),
    ...evaluateRoute90(d),
  ];
  return R;
}

/**
 * Calculate verdict and status metrics
 */
export function getSummary(findings: EvaluationFinding[]): AnalysisSummary {
  const counts = { S: 0, K: 0, T: 0, total: findings.length };
  findings.forEach((r) => {
    if (r.st in counts) {
      counts[r.st]++;
    }
  });

  let verdict = "Dossier dinyatakan memenuhi seluruh parameter yang ditelaah.";
  if (counts.T > 0) {
    verdict =
      "Dossier belum memenuhi ketentuan regulasi: perlu penerbitan Deficiency Letter.";
  } else if (counts.K > 0) {
    verdict =
      "Dossier secara umum memenuhi ketentuan, dengan catatan klarifikasi teknis.";
  }

  return {
    verdict,
    counts,
    deficiencyCount: counts.K + counts.T,
    isCompliant: counts.T === 0 && counts.K === 0,
  };
}
