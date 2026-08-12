export const REPORT_REASON_CODES = [
  "spam",
  "harassment",
  "hate",
  "violence",
  "sexual",
  "fraud",
  "personal_data",
  "other",
] as const;

export type ReportReasonCode = (typeof REPORT_REASON_CODES)[number];
export type ReportSubjectType = "post" | "message" | "profile" | "group";

export const REPORT_REASON_LABELS: Record<ReportReasonCode, string> = {
  spam: "Спам",
  harassment: "Травля или угрозы",
  hate: "Ненависть и дискриминация",
  violence: "Насилие",
  sexual: "Сексуальный контент",
  fraud: "Мошенничество",
  personal_data: "Публикация личных данных",
  other: "Другая причина",
};
