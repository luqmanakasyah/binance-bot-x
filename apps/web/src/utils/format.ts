
export function formatDate(ms: number | string | Date): string {
    const d = new Date(ms);
    if (isNaN(d.getTime())) return "-";
    // Format: DD-MMM-YYYY (e.g., 17-Jan-2026)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
}

export function formatDateTime(ms: number | string | Date): string {
    const d = new Date(ms);
    if (isNaN(d.getTime())) return "-";
    // Format: DD-MMM-YYYY HH:mm
    const datePart = formatDate(d);
    const timePart = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${datePart} ${timePart}`;
}
