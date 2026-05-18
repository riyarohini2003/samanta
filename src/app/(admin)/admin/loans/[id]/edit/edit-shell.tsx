"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "@/lib/dayjs";
import LoanEditForm, { type LoanEditValues } from "./loan-edit-form";
import ScheduleEditor, { type ScheduleRowValues } from "./schedule-editor";

type LoanType = LoanEditValues["loanType"];

function addUnits(d: dayjs.Dayjs, type: LoanType, n: number) {
  switch (type) {
    case "DAILY":
      return d.add(n, "day");
    case "WEEKLY":
      return d.add(n, "week");
    case "MONTHLY":
      return d.add(n, "month");
  }
}

const toDateInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : dayjs.utc(d).format("YYYY-MM-DD");
};

export default function EditLoanShell({
  loan,
  branches,
  employees,
  initialSchedule,
}: {
  loan: LoanEditValues;
  branches: { id: string; code: string; name: string }[];
  employees: { id: string; name: string; employeeCode: string }[];
  initialSchedule: ScheduleRowValues[];
}) {
  const [startDate, setStartDate] = useState<string>(toDateInput(loan.startDate));
  const [loanType, setLoanType] = useState<LoanType>(loan.loanType);
  const [maturityDate, setMaturityDate] = useState<string>(toDateInput(loan.maturityDate));
  const [syncedDueDates, setSyncedDueDates] = useState<Record<string, string> | undefined>(undefined);

  const orderedSchedule = useMemo(
    () => [...initialSchedule].sort((a, b) => a.installmentNo - b.installmentNo),
    [initialSchedule],
  );
  const emiCount = orderedSchedule.length;

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!startDate) return;
    const start = dayjs.utc(startDate).startOf("day");

    const next: Record<string, string> = {};
    orderedSchedule.forEach((row, idx) => {
      next[row.id] = addUnits(start, loanType, idx).format("YYYY-MM-DD");
    });
    setSyncedDueDates(next);

    if (emiCount > 0) {
      setMaturityDate(addUnits(start, loanType, emiCount - 1).format("YYYY-MM-DD"));
    }
  }, [startDate, loanType, orderedSchedule, emiCount]);

  return (
    <div className="space-y-6">
      <LoanEditForm
        loan={loan}
        branches={branches}
        employees={employees}
        onStartDateChange={setStartDate}
        onLoanTypeChange={setLoanType}
        externalMaturityDate={maturityDate}
        emiCount={emiCount}
      />
      <ScheduleEditor
        loanAccountId={loan.id}
        initial={initialSchedule}
        syncedDueDates={syncedDueDates}
      />
    </div>
  );
}
