import { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { Badge, Card, EmptyState, Modal, PageHeader, Pagination, cn } from '@/components/ui';
import { DateField, FilterBar, ResetButton, SearchField, SelectFilter } from '@/components/filters';
import { useTranslation } from '@/lib/i18n';
import { formatDateTime } from '@/lib/utils';
import type { Paginated } from '@/types';

interface AuditLogRow {
    id: number;
    user_id: number | null;
    action: string;
    model_type: string;
    model_id: number | null;
    description: string | null;
    previous_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    reason: string | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
    updated_at: string;
    user: { id: number; name: string; email: string } | null;
}

interface AuditProps {
    logs: Paginated<AuditLogRow>;
    actions: string[];
    filters: { q?: string; action?: string; user?: string; from?: string; to?: string };
}

export default function AuditIndex({ logs, actions }: AuditProps) {
    const { t, locale } = useTranslation();
    const [detail, setDetail] = useState<AuditLogRow | null>(null);

    const actionTone = (action: string) =>
        action.includes('deleted') || action.includes('removed')
            ? 'bg-rose-100 text-rose-700'
            : action.includes('created')
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-sky-100 text-sky-700';

    const countKeys = (values: Record<string, unknown> | null) => Object.keys(values ?? {}).length;

    return (
        <div className="space-y-5">
            <PageHeader title={t('audit.title')} subtitle={t('common.total_records', { count: logs.total })} />

            <FilterBar right={<ResetButton />}>
                <SearchField placeholder={t('filter.q_ph')} />
                <SelectFilter param="action" label={t('audit.action')} options={actions.map((action) => ({ value: action, label: action }))} />
                <DateField param="from" />
                <DateField param="to" />
            </FilterBar>

            <Card className="animate-slide-up">
                {logs.data.length === 0 ? (
                    <EmptyState title={t('audit.empty')} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[860px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="pb-2 pr-3 font-semibold">{t('common.date')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('audit.user')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('audit.action')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('audit.description')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('audit.changes')}</th>
                                    <th className="pb-2 font-semibold">{t('audit.ip')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.data.map((log) => (
                                    <tr key={log.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                        <td className="py-2.5 pr-3 whitespace-nowrap text-slate-500">{formatDateTime(log.created_at, locale)}</td>
                                        <td className="py-2.5 pr-3">
                                            {log.user ? (
                                                <>
                                                    <p className="font-medium text-slate-700">{log.user.name}</p>
                                                    <p className="text-xs text-slate-400">{log.user.email}</p>
                                                </>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <Badge tone={actionTone(log.action)}>{log.action}</Badge>
                                        </td>
                                        <td className="max-w-[280px] py-2.5 pr-3 text-slate-600">
                                            <span className="line-clamp-2">{log.description ?? '—'}</span>
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <button
                                                type="button"
                                                onClick={() => setDetail(log)}
                                                className={cn(
                                                    'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition',
                                                    'hover:border-brand-300 hover:text-brand-700',
                                                )}
                                            >
                                                <span className="text-rose-500">{countKeys(log.previous_values)}</span>
                                                <span className="text-slate-300">→</span>
                                                <span className="text-emerald-600">{countKeys(log.new_values)}</span>
                                            </button>
                                        </td>
                                        <td className="py-2.5 font-mono text-xs text-slate-400">{log.ip_address ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Pagination links={logs.links} />

            <Modal open={detail !== null} onClose={() => setDetail(null)} title={t('audit.changes')} size="xl">
                {detail && (
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="min-w-0">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('audit.previous')}</p>
                            <pre className="max-h-[60vh] overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-3 text-xs leading-relaxed text-slate-100">
                                {JSON.stringify(detail.previous_values ?? {}, null, 2)}
                            </pre>
                        </div>
                        <div className="min-w-0">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('audit.new')}</p>
                            <pre className="max-h-[60vh] overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-3 text-xs leading-relaxed text-slate-100">
                                {JSON.stringify(detail.new_values ?? {}, null, 2)}
                            </pre>
                        </div>
                        {detail.reason && (
                            <p className="md:col-span-2 text-xs text-slate-500">
                                {t('common.reason')}: {detail.reason}
                            </p>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
