import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { Bell, CheckCheck } from 'lucide-react';
import { Badge, Button, EmptyState, PageHeader, Pagination, Tabs, cn } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
import type { Paginated } from '@/types';

interface NotificationRow {
    id: number;
    type: string;
    level: 'danger' | 'warning' | 'info';
    title: string;
    message: string | null;
    link: string | null;
    read_at: string | null;
    created_at: string;
}

interface NotificationsProps {
    notifications: Paginated<NotificationRow>;
    counts: { danger: number; warning: number; info: number; total: number };
}

const LEVEL_DOTS: Record<NotificationRow['level'], string> = {
    danger: 'bg-rose-500',
    warning: 'bg-amber-500',
    info: 'bg-sky-500',
};

export default function NotificationsIndex({ notifications, counts }: NotificationsProps) {
    const { t } = useTranslation();
    const [tab, setTab] = useState('all');
    const [busy, setBusy] = useState(false);

    const rows = tab === 'unread' ? notifications.data.filter((item) => !item.read_at) : notifications.data;

    const markAll = () => {
        setBusy(true);
        router.post('/notifications/read-all', {}, { preserveScroll: true, onFinish: () => setBusy(false) });
    };

    const markOne = (id: number) => {
        router.post(`/notifications/${id}/read`, {}, { preserveScroll: true });
    };

    return (
        <div className="space-y-5">
            <PageHeader
                title={t('notifications.title')}
                actions={
                    <Button variant="outline" icon={<CheckCheck size={16} />} loading={busy} onClick={markAll}>
                        {t('notifications.mark_all')}
                    </Button>
                }
            />

            <div className="flex flex-wrap items-center gap-2">
                <Badge tone="bg-rose-100 text-rose-700">
                    {t('common.danger')}: {counts.danger}
                </Badge>
                <Badge tone="bg-amber-100 text-amber-700">
                    {t('common.warning')}: {counts.warning}
                </Badge>
                <Badge tone="bg-sky-100 text-sky-700">
                    {t('common.info')}: {counts.info}
                </Badge>
                <Badge tone="bg-slate-200 text-slate-700">
                    {t('common.total')}: {counts.total}
                </Badge>
            </div>

            <Tabs
                tabs={[
                    { key: 'all', label: t('common.all') },
                    { key: 'unread', label: t('notifications.unread') },
                ]}
                active={tab}
                onChange={setTab}
            />

            {rows.length === 0 ? (
                <EmptyState title={t('notifications.empty')} />
            ) : (
                <div className="space-y-2.5">
                    {rows.map((item) => (
                        <div
                            key={item.id}
                            className={cn(
                                'flex items-start gap-3 rounded-2xl border p-4 transition animate-slide-up',
                                item.read_at ? 'border-slate-100 bg-slate-50/70' : 'border-slate-200 bg-white shadow-sm hover:border-brand-200',
                            )}
                        >
                            <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', LEVEL_DOTS[item.level])} aria-hidden />
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                                    {item.link ? (
                                        <Link href={item.link} className={cn('text-sm font-semibold hover:underline', item.read_at ? 'text-slate-500' : 'text-slate-800')}>
                                            {item.title}
                                        </Link>
                                    ) : (
                                        <p className={cn('text-sm font-semibold', item.read_at ? 'text-slate-500' : 'text-slate-800')}>{item.title}</p>
                                    )}
                                    <span className="shrink-0 text-xs text-slate-400">{item.created_at}</span>
                                </div>
                                {item.message && <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.message}</p>}
                                {!item.read_at && (
                                    <div className="mt-2.5">
                                        <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={() => markOne(item.id)}>
                                            {t('notifications.mark_read_one')}
                                        </Button>
                                    </div>
                                )}
                            </div>
                            {item.read_at && <Bell size={15} className="mt-1 shrink-0 text-slate-300" />}
                        </div>
                    ))}
                </div>
            )}

            <Pagination links={notifications.links} />
        </div>
    );
}
