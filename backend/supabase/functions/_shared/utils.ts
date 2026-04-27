// used for improting these functions into the edge function and so Deno can generate a coverage report

export const TZ = "America/Los_Angeles";

export function parseTimestamp(isoString: string): Date {
    const normalized = isoString.replace(/([+-]\d{2})$/, "$1:00");
    return new Date(normalized);
}

export function formatDate(isoString: string): string {
    const date = parseTimestamp(isoString);
    return date.toLocaleDateString("en-US", {
        timeZone: TZ,
        month: "long",
        day: "2-digit",
        year: "numeric",
    });
}

export function formatTime(isoString: string): string {
    const time = parseTimestamp(isoString);
    return time.toLocaleTimeString("en-US", {
        timeZone: TZ,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}