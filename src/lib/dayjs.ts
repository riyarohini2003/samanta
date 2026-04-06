import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import customParseFormat from "dayjs/plugin/customParseFormat";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(utc);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(customParseFormat);
dayjs.extend(relativeTime);

export default dayjs;

/** Normalize a Date/string to UTC midnight (used for RepaymentSchedule.dueDate @db.Date) */
export function toDateOnly(d: Date | string): Date {
  return dayjs.utc(d).startOf("day").toDate();
}

export function fmtDate(d: Date | string | null | undefined, fallback = "—") {
  if (!d) return fallback;
  return dayjs(d).format("DD MMM YYYY");
}

export function fmtDateTime(d: Date | string | null | undefined, fallback = "—") {
  if (!d) return fallback;
  return dayjs(d).format("DD MMM YYYY, HH:mm");
}
