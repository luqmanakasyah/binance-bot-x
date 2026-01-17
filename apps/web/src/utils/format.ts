
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

export function formatTimeAgo(ms: number | undefined): string {
    if (!ms) return "";
    const seconds = Math.floor((Date.now() - ms) / 1000);

    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
