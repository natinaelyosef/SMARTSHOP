import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { Button, Card, CardHeader, EmptyState, PageHeader, cn } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';

interface BackupFile {
    name: string;
    size: string;
    created_at: string;
}

interface BackupProps {
    backups: BackupFile[];
    lastBackup: string | null;
}

export default function SettingsBackup({ backups, lastBackup }: BackupProps) {
    const { t } = useTranslation();
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    const create = () => {
        setCreating(true);
        router.post('/settings/backup', {}, { preserveScroll: true, onFinish: () => setCreating(false) });
    };

    const remove = (name: string) => {
        if (!window.confirm(t('settings.backup_delete_confirm'))) return;
        setDeleting(name);
        router.delete(`/settings/backup/${encodeURIComponent(name)}`, {
            preserveScroll: true,
            onFinish: () => setDeleting(null),
        });
    };

    return (
        <div className="space-y-5">
            <PageHeader
                title={t('settings.backup')}
                subtitle={`${t('settings.last_backup')}: ${lastBackup ?? '—'}`}
                actions={
                    <Button icon={<Plus size={16} />} loading={creating} onClick={create}>
                        {t('settings.create_backup')}
                    </Button>
                }
            />

            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-800">
                {t('settings.backup_create_hint')}
            </div>

            <Card className="animate-slide-up">
                <CardHeader title={t('settings.backup')} subtitle={t('common.total_records', { count: backups.length })} />
                {backups.length === 0 ? (
                    <EmptyState title={t('settings.no_backups')} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="pb-2 pr-3 font-semibold">{t('settings.file')}</th>
                                    <th className="pb-2 pr-3 text-right font-semibold">{t('settings.size')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('common.date')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {backups.map((backup) => (
                                    <tr key={backup.name} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                        <td className="py-2.5 pr-3 font-mono text-xs text-slate-700">{backup.name}</td>
                                        <td className="py-2.5 pr-3 text-right tabular-nums text-slate-500">{backup.size}</td>
                                        <td className="py-2.5 pr-3 text-slate-500">{backup.created_at}</td>
                                        <td className="py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <a
                                                    href={`/settings/backup/${encodeURIComponent(backup.name)}/download`}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
                                                >
                                                    <Download size={13} />
                                                    {t('common.download')}
                                                </a>
                                                <Button
                                                    variant="danger"
                                                    className={cn('px-2.5 py-1.5 text-xs')}
                                                    loading={deleting === backup.name}
                                                    icon={<Trash2 size={13} />}
                                                    onClick={() => remove(backup.name)}
                                                >
                                                    {t('common.delete')}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
