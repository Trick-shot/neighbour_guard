/** "21:14" for today, "Mon" this week, otherwise "12 Oct". */
export function shortTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    if (d.toDateString() === now.toDateString()) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const days = (now.getTime() - d.getTime()) / 86_400_000;
    if (days < 7) return d.toLocaleDateString(undefined, {weekday: 'short'});
    return d.toLocaleDateString(undefined, {day: 'numeric', month: 'short'});
}

export const clockTime = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
