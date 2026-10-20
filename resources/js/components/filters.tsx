import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { router, usePage } from '@inertiajs/react';
import { RotateCcw, Search } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Input, Select } from '@/components/ui';

export function useFilters(): {
    params: Record<string, string>;
    update: (patch: Record<string, string | number | null | undefined>) => void;
    clear: () => void;
} {
    const { url } = usePage();
    const [pathname, search = ''] = url.split('?');
    const params = useMemo(() => Object.fromEntries(new URLSearchParams(search)), [search]);

    const update = (patch: Record<string, string | number | null | undefined>) => {
        const next: Record<string, string | number | null | undefined> = { ...params, page: null, ...patch };
        router.get(pathname, next as never, { preserveState: true, preserveScroll: true, replace: true });
    };

    const clear = () => router.get(pathname, {}, { preserveState: true, preserveScroll: true, replace: true });

    return { params, update, clear };
}

export const PERIODS = [
    { key: 'today', label: 'period.today' },
    { key: 'yesterday', label: 'period.yesterday' },
    { key: 'week', label: 'period.week' },
    { key: 'month', label: 'period.month' },
    { key: 'last_month', label: 'period.last_month' },
    { key: 'year', label: 'period.year' },
    { key: 'last_year', label: 'period.last_year' },
    { key: 'custom', label: 'period.custom' },
];

export function PeriodSelect({ param = 'period', allowAll = false }: { param?: string; allowAll?: boolean }) {
    const { t } = useTranslation();
    const { params, update } = useFilters();
    const value = params[param] ?? (allowAll ? '' : 'month');

    return (
        <Select
            value={value}
            onChange={(e) => update({ [param]: e.target.value })}
            aria-label={t('filter.period')}
            className="w-auto min-w-[150px] py-2"
        >
            {allowAll && <option value="">{t('common.all')}</option>}
            {PERIODS.map((p) => (
                <option key={p.key} value={p.key}>
                    {t(p.label)}
                </option>
            ))}
        </Select>
    );
}

export function SearchField({ param = 'q', placeholder, className, width = 'w-full sm:w-72' }: { param?: string; placeholder?: string; className?: string; width?: string }) {
    const { t } = useTranslation();
    const { params, update } = useFilters();
    const [value, setValue] = useState(params[param] ?? '');

    useEffect(() => {
        setValue(params[param] ?? '');
    }, [params[param]]);

    useEffect(() => {
        if (value === (params[param] ?? '')) return;
        const timer = setTimeout(() => update({ [param]: value || null }), 400);
        return () => clearTimeout(timer);
    }, [value]);

    return (
        <div className={cn('relative', width, className)}>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder ?? t('filter.q_ph')}
                className="pl-9"
                aria-label={placeholder ?? t('common.search')}
            />
        </div>
    );
}

export function DateField({ param, label }: { param: string; label?: string }) {
    const { t } = useTranslation();
    const { params, update } = useFilters();
    return (
        <label className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-slate-500">
            <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide">{label ?? t(param === 'from' ? 'filter.from' : 'filter.to')}</span>
            <Input
                type="date"
                value={params[param] ?? ''}
                onChange={(e) => update({ [param]: e.target.value || null })}
                className="w-auto min-w-0 max-w-full py-2"
            />
        </label>
    );
}

export function SelectFilter({
    param,
    options,
    label,
    allowAll = true,
}: {
    param: string;
    options: { value: string; label: string }[];
    label?: string;
    allowAll?: boolean;
}) {
    const { t } = useTranslation();
    const { params, update } = useFilters();
    return (
        <label className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-slate-500">
            {label && <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide">{label}</span>}
            <Select value={params[param] ?? ''} onChange={(e) => update({ [param]: e.target.value || null })} className="w-auto min-w-0 max-w-full py-2" aria-label={label}>
                {allowAll && <option value="">{t('common.all')}</option>}
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </Select>
        </label>
    );
}

export function ResetButton() {
    const { t } = useTranslation();
    const { clear } = useFilters();
    return (
        <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
            <RotateCcw size={13} />
            {t('filter.reset')}
        </button>
    );
}

export function FilterBar({ children, right }: { children: ReactNode; right?: ReactNode }) {
    return (
        <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
            {children}
            <div className="ml-auto flex items-center gap-2">{right}</div>
        </div>
    );
}

export function ResultCount({ total }: { total: number }) {
    const { t } = useTranslation();
    return <span className="text-xs font-medium text-slate-400">{t('common.total_records', { count: total })}</span>;
}
