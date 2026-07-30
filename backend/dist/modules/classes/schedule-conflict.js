"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMeetingDays = parseMeetingDays;
exports.parseClassSchedule = parseClassSchedule;
exports.overlappingDays = overlappingDays;
exports.weekdayLabel = weekdayLabel;
const DAY_ALIASES = {
    mon: "Mon",
    monday: "Mon",
    tue: "Tue",
    tues: "Tue",
    tuesday: "Tue",
    wed: "Wed",
    wednesday: "Wed",
    thu: "Thu",
    thur: "Thu",
    thurs: "Thu",
    thursday: "Thu",
    fri: "Fri",
    friday: "Fri",
    sat: "Sat",
    saturday: "Sat",
    sun: "Sun",
    sunday: "Sun",
};
const DAY_LABELS = {
    Mon: "Monday",
    Tue: "Tuesday",
    Wed: "Wednesday",
    Thu: "Thursday",
    Fri: "Friday",
    Sat: "Saturday",
    Sun: "Sunday",
};
function parseTime(value) {
    const normalized = value.trim();
    const twelveHour = normalized.match(/^(\d{1,2}):(\d{2})\s*([AP])M?$/i);
    if (twelveHour) {
        let hours = Number(twelveHour[1]);
        const minutes = Number(twelveHour[2]);
        if (hours < 1 ||
            hours > 12 ||
            minutes < 0 ||
            minutes > 59)
            return null;
        const suffix = twelveHour[3].toUpperCase();
        if (suffix === "PM" || suffix === "P") {
            if (hours !== 12)
                hours += 12;
        }
        else if (hours === 12) {
            hours = 0;
        }
        return hours * 60 + minutes;
    }
    const twentyFourHour = normalized.match(/^(\d{1,2}):(\d{2})$/);
    if (!twentyFourHour)
        return null;
    const hours = Number(twentyFourHour[1]);
    const minutes = Number(twentyFourHour[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59)
        return null;
    return hours * 60 + minutes;
}
function timePart(value) {
    const raw = String(value ?? "").trim();
    if (!raw.includes("|"))
        return raw;
    const [first = "", second = ""] = raw.split("|", 2).map((part) => part.trim());
    const firstHasRange = first.includes("-");
    const secondHasRange = second.includes("-");
    if (firstHasRange && !secondHasRange)
        return first;
    if (!firstHasRange && secondHasRange)
        return second;
    return first;
}
function parseMeetingDays(value) {
    const days = String(value ?? "")
        .split(",")
        .map((day) => DAY_ALIASES[day.trim().toLowerCase()])
        .filter((day) => Boolean(day));
    return Array.from(new Set(days));
}
function parseClassSchedule(meetingDay, meetingTime) {
    const days = parseMeetingDays(meetingDay);
    const range = timePart(meetingTime);
    const [startText = "", endText = ""] = range
        .split(/\s*-\s*/, 2)
        .map((part) => part.trim());
    const startMinutes = parseTime(startText);
    const endMinutes = parseTime(endText);
    if (!days.length ||
        startMinutes === null ||
        endMinutes === null ||
        endMinutes <= startMinutes)
        return null;
    return { days, startMinutes, endMinutes, timeLabel: range };
}
function overlappingDays(candidate, existing) {
    if (candidate.startMinutes >= existing.endMinutes ||
        candidate.endMinutes <= existing.startMinutes)
        return [];
    const existingDays = new Set(existing.days);
    return candidate.days.filter((day) => existingDays.has(day));
}
function weekdayLabel(value) {
    return DAY_LABELS[value] ?? value;
}
