
export function formatDate(ms: number | string | Date): string {
    const d = new Date(ms);
    if (isNaN(d.getTime())) return "-";
    // Format: DD-MMM-YYYY (UTC)
    return d.toUTCString().split(' ').slice(1, 4).join('-');
}

export function formatDateTime(ms: number | string | Date): string {
    const d = new Date(ms);
    if (isNaN(d.getTime())) return "-";
    // Format: DD-MMM-YYYY HH:mm (UTC)
    const datePart = formatDate(d);
    const hour = d.getUTCHours().toString().padStart(2, '0');
    const min = d.getUTCMinutes().toString().padStart(2, '0');
    return `${datePart} ${hour}:${min}`;
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
