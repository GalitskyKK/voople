"use client";

import { useReportWebVitals } from "next/web-vitals";

import { reportClientMetric } from "@/lib/telemetry/client";

const reportWebVital: Parameters<typeof useReportWebVitals>[0] = (metric) => {
  reportClientMetric({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    navigationType: metric.navigationType,
  });
};

export function WebVitalsReporter() {
  useReportWebVitals(reportWebVital);
  return null;
}
