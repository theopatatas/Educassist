"use client";

import { ClipboardCheck, FileText, FileSpreadsheet } from "lucide-react";

const formCards = [
  {
    title: "Enrollment Forms",
    description: "Manage admission, student registration, and onboarding document templates.",
    icon: FileText,
  },
  {
    title: "Academic Forms",
    description: "Prepare request forms, grading forms, and internal academic workflow documents.",
    icon: FileSpreadsheet,
  },
  {
    title: "Approval Workflows",
    description: "Control form review, validation, and release flows across the platform.",
    icon: ClipboardCheck,
  },
];

export default function AdminFormsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <p className="text-sm text-slate-600">A centralized Super Admin workspace for form templates and platform workflows.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {formCards.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
                <Icon className="h-5 w-5 text-slate-700" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
