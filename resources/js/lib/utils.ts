export function cn(...classes: (string | false | null | undefined)[]): string {
    return classes.filter(Boolean).join(' ');
}

export function formatMoney(value: number | string | null | undefined, symbol = 'Br'): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num === null || num === undefined || Number.isNaN(num)) return `${symbol} 0`;
    const rounded = Math.abs(num) < 0.01 && num !== 0 ? num : num;
    return `${symbol} ${rounded.toLocaleString('en-US', {
        minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
        maximumFractionDigits: 2,
    })}`;
}

export function formatNumber(value: number | string | null | undefined): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num === null || num === undefined || Number.isNaN(num)) return '0';
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function formatCompact(value: number): string {
    if (Math.abs(value) >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
    if (Math.abs(value) >= 1_000) return (value / 1_000).toFixed(1) + 'k';
    return String(Math.round(value));
}

export function formatDate(value?: string | null, locale = 'en'): string {
    if (!value) return '—';
    const date = new Date(value.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(locale === 'am' ? 'am-ET' : 'en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export function formatDateTime(value?: string | null, locale = 'en'): string {
    if (!value) return '—';
    const date = new Date(value.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(locale === 'am' ? 'am-ET' : 'en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function statusColor(status: string): string {
    switch (status) {
        case 'paid':
        case 'active':
        case 'completed':
        case 'ok':
        case 'received':
            return 'bg-emerald-100 text-emerald-700';
        case 'partial':
        case 'low':
        case 'pending':
        case 'open':
            return 'bg-amber-100 text-amber-700';
        case 'unpaid':
        case 'out':
        case 'archived':
        case 'inactive':
        case 'expired':
            return 'bg-rose-100 text-rose-700';
        default:
            return 'bg-slate-100 text-slate-600';
    }
}
