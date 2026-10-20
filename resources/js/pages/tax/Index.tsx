import { Fragment, useState, type FormEvent } from 'react';
import { usePage, useForm } from '@inertiajs/react';
import { AlertTriangle, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import {
    Badge,
    Button,
    Card,
    CardHeader,
    Checkbox,
    EmptyState,
    Field,
    Input,
    Modal,
    PageHeader,
    Select,
    StatusBadge,
    Tabs,
    Textarea,
    cn,
} from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
import { formatMoney } from '@/lib/utils';
import type { SharedProps } from '@/types';

interface TaxRule {
    id: number;
    name: string;
    type: 'sales' | 'purchase';
    rate: number;
    effective_from: string;
    effective_to: string | null;
    is_active: boolean;
    is_estimate: boolean;
    notes: string | null;
}

interface TaxPayment {
    id: number;
    amount: number;
    paid_at: string;
    reference: string | null;
    user: string | null;
    notes: string | null;
}

interface TaxPeriod {
    id: number;
    name: string;
    period_type: 'monthly' | 'quarterly' | 'yearly';
    start_date: string;
    end_date: string;
    taxable_amount: number;
    tax_amount: number;
    paid_amount: number;
    remaining_amount: number;
    status: 'paid' | 'open';
    tax_rate: number;
    payments: TaxPayment[];
}

interface TaxSummary {
    active_rule: { name: string; rate: number; is_estimate: boolean; effective_from: string } | null;
    year_taxable: number;
    year_estimate: number;
    year_paid: number;
    year_remaining: number;
}

interface TaxProps {
    rules: TaxRule[];
    periods: TaxPeriod[];
    summary: TaxSummary;
}

export default function TaxIndex({ rules, periods, summary }: TaxProps) {
    const { t } = useTranslation();
    const { shop } = usePage<SharedProps>().props;
    const symbol = shop.currency_symbol;

    const [tab, setTab] = useState('rules');
    const [ruleOpen, setRuleOpen] = useState(false);
    const [periodOpen, setPeriodOpen] = useState(false);
    const [expanded, setExpanded] = useState<number | null>(null);
    const [paying, setPaying] = useState<TaxPeriod | null>(null);

    const ruleForm = useForm({
        name: '',
        type: 'sales',
        rate: '',
        effective_from: '',
        effective_to: '',
        is_estimate: true,
        notes: '',
        verified_official_rules: false,
    });

    const periodForm = useForm({
        name: '',
        start_date: '',
        end_date: '',
        period_type: 'monthly',
    });

    const payForm = useForm({
        amount: '',
        paid_at: new Date().toISOString().slice(0, 10),
        reference: '',
        notes: '',
    });

    const submitRule = () => {
        ruleForm.post('/tax/rules', {
            preserveScroll: true,
            onSuccess: () => {
                setRuleOpen(false);
                ruleForm.reset();
            },
        });
    };

    const submitPeriod = () => {
        periodForm.post('/tax/periods', {
            preserveScroll: true,
            onSuccess: () => {
                setPeriodOpen(false);
                periodForm.reset();
            },
        });
    };

    const submitPayment = () => {
        if (!paying) return;
        payForm.post(`/tax/periods/${paying.id}/pay`, {
            preserveScroll: true,
            onSuccess: () => {
                setPaying(null);
                payForm.reset();
            },
        });
    };

    const openPay = (period: TaxPeriod) => {
        payForm.reset();
        payForm.clearErrors();
        setPaying(period);
    };

    const activeRule = summary.active_rule;
    const showEstimate = !activeRule || activeRule.is_estimate;

    const summaryCards = [
        { key: 'taxable', label: t('tax.taxable_amount'), value: summary.year_taxable },
        { key: 'estimate', label: t('tax.estimated'), value: summary.year_estimate },
        { key: 'paid', label: t('tax.paid'), value: summary.year_paid },
        { key: 'remaining', label: t('tax.remaining'), value: summary.year_remaining },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('tax.title')}
                actions={
                    <>
                        <Button variant="outline" icon={<Plus size={16} />} onClick={() => setPeriodOpen(true)}>
                            {t('tax.create_period')}
                        </Button>
                        <Button icon={<Plus size={16} />} onClick={() => setRuleOpen(true)}>
                            {t('tax.new_rule')}
                        </Button>
                    </>
                }
            />

            {showEstimate ? (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-800 animate-fade-in">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
                    <div>
                        <p className="font-semibold">{t('tax.estimate_note')}</p>
                        {activeRule && (
                            <p className="mt-1 text-xs text-amber-700">
                                {activeRule.name} · {activeRule.rate}% · {activeRule.effective_from}
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                activeRule && (
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        <Badge tone="bg-emerald-600 text-white">{t('tax.official')}</Badge>
                        <span className="font-semibold">{activeRule.name}</span>
                        <span className="tabular-nums">{activeRule.rate}%</span>
                        <span className="text-xs text-emerald-600">{activeRule.effective_from}</span>
                    </div>
                )
            )}

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {summaryCards.map((card) => (
                    <div key={card.key} className="card min-w-0 p-3 sm:p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{card.label}</p>
                        <p className={cn('mt-2 break-words text-base font-bold tabular-nums sm:text-lg xl:text-xl', card.key === 'remaining' && card.value > 0 ? 'text-amber-600' : 'text-slate-900')}>
                            {formatMoney(card.value, symbol)}
                        </p>
                    </div>
                ))}
            </div>

            <Tabs
                tabs={[
                    { key: 'rules', label: t('tax.rules') },
                    { key: 'periods', label: t('tax.periods') },
                ]}
                active={tab}
                onChange={setTab}
            />

            {tab === 'rules' && (
                <Card className="animate-slide-up">
                    <CardHeader title={t('tax.rules')} subtitle={t('common.total_records', { count: rules.length })} />
                    {rules.length === 0 ? (
                        <EmptyState
                            title={t('tax.rules')}
                            action={<Button onClick={() => setRuleOpen(true)}>{t('tax.new_rule')}</Button>}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[780px] text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                        <th className="pb-2 pr-3 font-semibold">{t('tax.name')}</th>
                                        <th className="pb-2 pr-3 font-semibold">{t('tax.type')}</th>
                                        <th className="pb-2 pr-3 text-right font-semibold">{t('tax.rate')}</th>
                                        <th className="pb-2 pr-3 font-semibold">{t('tax.effective_from')}</th>
                                        <th className="pb-2 pr-3 font-semibold">{t('tax.effective_to')}</th>
                                        <th className="pb-2 text-right font-semibold">{t('common.status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rules.map((rule) => (
                                        <tr key={rule.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                            <td className="py-2.5 pr-3">
                                                <p className="font-semibold text-slate-800">{rule.name}</p>
                                                {rule.notes && <p className="mt-0.5 text-xs text-slate-400">{rule.notes}</p>}
                                            </td>
                                            <td className="py-2.5 pr-3">
                                                <Badge tone={rule.type === 'sales' ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}>
                                                    {t(`tax.${rule.type}`)}
                                                </Badge>
                                            </td>
                                            <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-slate-800">{rule.rate}%</td>
                                            <td className="py-2.5 pr-3 text-slate-500">{rule.effective_from}</td>
                                            <td className="py-2.5 pr-3 text-slate-500">{rule.effective_to ?? '—'}</td>
                                            <td className="py-2.5 text-right">
                                                <div className="flex flex-wrap justify-end gap-1.5">
                                                    <Badge tone={rule.is_estimate ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}>
                                                        {rule.is_estimate ? t('tax.is_estimate') : t('tax.official')}
                                                    </Badge>
                                                    <Badge tone={rule.is_active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'}>
                                                        {rule.is_active ? t('status.active') : t('common.none')}
                                                    </Badge>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            {tab === 'periods' && (
                <Card className="animate-slide-up">
                    <CardHeader
                        title={t('tax.periods')}
                        subtitle={t('common.total_records', { count: periods.length })}
                        action={<Button variant="outline" icon={<Plus size={15} />} onClick={() => setPeriodOpen(true)}>{t('tax.create_period')}</Button>}
                    />
                    {periods.length === 0 ? (
                        <EmptyState
                            title={t('tax.periods')}
                            action={<Button onClick={() => setPeriodOpen(true)}>{t('tax.create_period')}</Button>}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[960px] text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                        <th className="pb-2 pr-3 font-semibold">{t('tax.name')}</th>
                                        <th className="pb-2 pr-3 font-semibold">{t('tax.period_type')}</th>
                                        <th className="pb-2 pr-3 font-semibold">{t('rent.period')}</th>
                                        <th className="pb-2 pr-3 text-right font-semibold">{t('tax.taxable_amount')}</th>
                                        <th className="pb-2 pr-3 text-right font-semibold">{t('tax.estimated')}</th>
                                        <th className="pb-2 pr-3 text-right font-semibold">{t('tax.paid_amount')}</th>
                                        <th className="pb-2 pr-3 text-right font-semibold">{t('tax.remaining_amount')}</th>
                                        <th className="pb-2 pr-3 font-semibold">{t('common.status')}</th>
                                        <th className="pb-2 text-right font-semibold">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {periods.map((period) => (
                                        <Fragment key={period.id}>
                                            <tr className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                                <td className="py-2.5 pr-3 font-semibold text-slate-800">{period.name}</td>
                                                <td className="py-2.5 pr-3 text-slate-600">{t(`tax.${period.period_type}`)}</td>
                                                <td className="py-2.5 pr-3 text-slate-500">
                                                    {period.start_date} – {period.end_date}
                                                </td>
                                                <td className="py-2.5 pr-3 text-right tabular-nums text-slate-700">
                                                    {formatMoney(period.taxable_amount, symbol)}
                                                </td>
                                                <td className="py-2.5 pr-3 text-right tabular-nums text-slate-800">
                                                    {formatMoney(period.tax_amount, symbol)}
                                                </td>
                                                <td className="py-2.5 pr-3 text-right tabular-nums text-emerald-600">
                                                    {formatMoney(period.paid_amount, symbol)}
                                                </td>
                                                <td className={cn('py-2.5 pr-3 text-right tabular-nums', period.remaining_amount > 0 ? 'text-rose-600' : 'text-slate-400')}>
                                                    {formatMoney(period.remaining_amount, symbol)}
                                                </td>
                                                <td className="py-2.5 pr-3">
                                                    <StatusBadge status={period.status} label={t(`status.${period.status}`)} />
                                                </td>
                                                <td className="py-2.5 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {period.remaining_amount > 0 && (
                                                            <Button variant="success" className="px-3 py-1.5 text-xs" onClick={() => openPay(period)}>
                                                                {t('tax.pay')}
                                                            </Button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => setExpanded(expanded === period.id ? null : period.id)}
                                                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
                                                            aria-label={t('tax.payments')}
                                                        >
                                                            {t('tax.payments')}
                                                            {expanded === period.id ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {expanded === period.id && (
                                                <tr className="border-b border-slate-100 bg-slate-50/70">
                                                    <td colSpan={9} className="px-3 py-3">
                                                        {period.payments.length === 0 ? (
                                                            <p className="text-xs text-slate-400">{t('common.none')}</p>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                                                    {t('tax.payments')}
                                                                </p>
                                                                {period.payments.map((payment) => (
                                                                    <div
                                                                        key={payment.id}
                                                                        className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                                                                    >
                                                                        <span className="font-semibold tabular-nums text-slate-800">
                                                                            {formatMoney(payment.amount, symbol)}
                                                                        </span>
                                                                        <span className="text-slate-500">{payment.paid_at}</span>
                                                                        <span className="text-slate-500">
                                                                            {t('inv.reference')}: {payment.reference ?? '—'}
                                                                        </span>
                                                                        <span className="text-slate-500">
                                                                            {t('common.user')}: {payment.user ?? '—'}
                                                                        </span>
                                                                        {payment.notes && <span className="text-slate-400">{payment.notes}</span>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            <Modal
                open={ruleOpen}
                onClose={() => setRuleOpen(false)}
                title={t('tax.new_rule')}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setRuleOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button loading={ruleForm.processing} onClick={submitRule}>
                            {t('common.save')}
                        </Button>
                    </>
                }
            >
                <form onSubmit={(e: FormEvent) => { e.preventDefault(); submitRule(); }} className="space-y-4">
                    <Field label={t('tax.name')} error={ruleForm.errors.name} required>
                        <Input value={ruleForm.data.name} onChange={(e) => ruleForm.setData('name', e.target.value)} required />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('tax.type')} error={ruleForm.errors.type} required>
                            <Select value={ruleForm.data.type} onChange={(e) => ruleForm.setData('type', e.target.value)}>
                                <option value="sales">{t('tax.sales')}</option>
                                <option value="purchase">{t('tax.purchase')}</option>
                            </Select>
                        </Field>
                        <Field label={t('tax.rate')} error={ruleForm.errors.rate} required hint="%">
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={ruleForm.data.rate}
                                onChange={(e) => ruleForm.setData('rate', e.target.value)}
                                required
                            />
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('tax.effective_from')} error={ruleForm.errors.effective_from} required>
                            <Input
                                type="date"
                                value={ruleForm.data.effective_from}
                                onChange={(e) => ruleForm.setData('effective_from', e.target.value)}
                                required
                            />
                        </Field>
                        <Field label={t('tax.effective_to')} error={ruleForm.errors.effective_to}>
                            <Input type="date" value={ruleForm.data.effective_to} onChange={(e) => ruleForm.setData('effective_to', e.target.value)} />
                        </Field>
                    </div>

                    <div className="space-y-2">
                        <Checkbox
                            checked={ruleForm.data.is_estimate}
                            onChange={(e) => ruleForm.setData('is_estimate', e.target.checked)}
                            label={t('tax.is_estimate')}
                        />
                        {!ruleForm.data.is_estimate && (
                            <Checkbox
                                checked={ruleForm.data.verified_official_rules}
                                onChange={(e) => ruleForm.setData('verified_official_rules', e.target.checked)}
                                label={t('tax.verified')}
                            />
                        )}
                        {ruleForm.errors.is_estimate && (
                            <p className="text-xs font-medium text-rose-600 animate-fade-in">{ruleForm.errors.is_estimate}</p>
                        )}
                    </div>

                    <Field label={t('common.notes')} error={ruleForm.errors.notes}>
                        <Textarea value={ruleForm.data.notes} onChange={(e) => ruleForm.setData('notes', e.target.value)} />
                    </Field>

                    <button type="submit" className="hidden" aria-hidden />
                </form>
            </Modal>

            <Modal
                open={periodOpen}
                onClose={() => setPeriodOpen(false)}
                title={t('tax.create_period')}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setPeriodOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button loading={periodForm.processing} onClick={submitPeriod}>
                            {t('common.create')}
                        </Button>
                    </>
                }
            >
                <form onSubmit={(e: FormEvent) => { e.preventDefault(); submitPeriod(); }} className="space-y-4">
                    <Field label={t('tax.name')} error={periodForm.errors.name} required>
                        <Input value={periodForm.data.name} onChange={(e) => periodForm.setData('name', e.target.value)} required />
                    </Field>

                    <Field label={t('tax.period_type')} error={periodForm.errors.period_type} required>
                        <Select value={periodForm.data.period_type} onChange={(e) => periodForm.setData('period_type', e.target.value)}>
                            <option value="monthly">{t('tax.monthly')}</option>
                            <option value="quarterly">{t('tax.quarterly')}</option>
                            <option value="yearly">{t('tax.yearly')}</option>
                        </Select>
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('tax.start_date')} error={periodForm.errors.start_date} required>
                            <Input
                                type="date"
                                value={periodForm.data.start_date}
                                onChange={(e) => periodForm.setData('start_date', e.target.value)}
                                required
                            />
                        </Field>
                        <Field label={t('tax.end_date')} error={periodForm.errors.end_date} required>
                            <Input type="date" value={periodForm.data.end_date} onChange={(e) => periodForm.setData('end_date', e.target.value)} required />
                        </Field>
                    </div>

                    <button type="submit" className="hidden" aria-hidden />
                </form>
            </Modal>

            <Modal
                open={paying !== null}
                onClose={() => setPaying(null)}
                title={t('tax.pay')}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setPaying(null)}>
                            {t('common.cancel')}
                        </Button>
                        <Button variant="success" loading={payForm.processing} onClick={submitPayment}>
                            {t('common.save')}
                        </Button>
                    </>
                }
            >
                <form onSubmit={(e: FormEvent) => { e.preventDefault(); submitPayment(); }} className="space-y-4">
                    {paying && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm">
                            <p className="font-semibold text-slate-800">{paying.name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                                {t('tax.remaining')}: <span className="font-semibold text-rose-600">{formatMoney(paying.remaining_amount, symbol)}</span>
                            </p>
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('common.amount')} error={payForm.errors.amount} required>
                            <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={payForm.data.amount}
                                onChange={(e) => payForm.setData('amount', e.target.value)}
                                required
                            />
                        </Field>
                        <Field label={t('common.date')} error={payForm.errors.paid_at} required>
                            <Input type="date" value={payForm.data.paid_at} onChange={(e) => payForm.setData('paid_at', e.target.value)} required />
                        </Field>
                    </div>

                    <Field label={t('inv.reference')} error={payForm.errors.reference}>
                        <Input value={payForm.data.reference} onChange={(e) => payForm.setData('reference', e.target.value)} />
                    </Field>

                    <Field label={t('common.notes')} error={payForm.errors.notes}>
                        <Textarea value={payForm.data.notes} onChange={(e) => payForm.setData('notes', e.target.value)} />
                    </Field>

                    <button type="submit" className="hidden" aria-hidden />
                </form>
            </Modal>
        </div>
    );
}
