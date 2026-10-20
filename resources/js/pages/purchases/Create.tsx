import { useMemo, useState, type FormEvent } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { Plus, Search, Trash2, Truck } from 'lucide-react';
import { Button, Card, CardHeader, Field, Input, PageHeader, Select, cn } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
import { formatMoney } from '@/lib/utils';
import type { SharedProps } from '@/types';

interface Supplier {
    id: number;
    name: string;
    phone: string | null;
    balance: number;
}

interface PurchaseVariant {
    id: number;
    label: string;
    sku: string;
    barcode: string | null;
    current_cost: number;
    stock: number;
}

interface PurchasesCreateProps {
    suppliers: Supplier[];
    variants: PurchaseVariant[];
}

interface Line {
    key: number;
    product_variant_id: number | '';
    quantity: string;
    unit_cost: string;
    batch_number: string;
    expires_at: string;
    manufactured_at: string;
}

const PAYMENT_METHODS = ['cash', 'bank', 'mobile'] as const;

function todayIso(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export default function PurchasesCreate({ suppliers, variants }: PurchasesCreateProps) {
    const { t } = useTranslation();
    const { shop } = usePage<SharedProps>().props;
    const symbol = shop.currency_symbol;
    const [variantQuery, setVariantQuery] = useState('');
    const [lines, setLines] = useState<Line[]>([
        { key: 1, product_variant_id: '', quantity: '1', unit_cost: '', batch_number: '', expires_at: '', manufactured_at: '' },
    ]);

    const { data, setData, post, processing, errors, transform } = useForm({
        supplier_id: '',
        purchased_at: todayIso(),
        invoice_number: '',
        discount: '',
        tax_amount: '',
        paid_amount: '',
        payment_method: 'cash' as string,
        payment_reference: '',
        notes: '',
    });

    const formErrors = errors as unknown as Record<string, string | undefined>;

    const filteredVariants = useMemo(() => {
        const q = variantQuery.trim().toLowerCase();
        if (!q) return variants;
        return variants.filter(
            (v) => v.label.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q) || (v.barcode ?? '').toLowerCase().includes(q),
        );
    }, [variantQuery, variants]);

    const subtotal = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_cost) || 0), 0);
    const discount = Math.max(0, Number(data.discount) || 0);
    const taxAmount = Math.max(0, Number(data.tax_amount) || 0);
    const total = Math.max(0, subtotal - discount) + taxAmount;
    const paidAmount = Math.max(0, Number(data.paid_amount) || 0);
    const remaining = Math.max(0, total - paidAmount);

    const updateLine = (key: number, patch: Partial<Line>) => {
        setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
    };

    const selectVariant = (key: number, value: string) => {
        const variant = variants.find((v) => String(v.id) === value);
        updateLine(key, {
            product_variant_id: variant ? variant.id : '',
            unit_cost: variant ? String(variant.current_cost) : '',
        });
    };

    const addLine = () => {
        setLines((prev) => [
            ...prev,
            { key: (prev.at(-1)?.key ?? 0) + 1, product_variant_id: '', quantity: '1', unit_cost: '', batch_number: '', expires_at: '', manufactured_at: '' },
        ]);
    };

    const removeLine = (key: number) => setLines((prev) => (prev.length > 1 ? prev.filter((line) => line.key !== key) : prev));

    const submit = (e: FormEvent) => {
        e.preventDefault();
        transform((d) => ({
            supplier_id: d.supplier_id ? Number(d.supplier_id) : null,
            purchased_at: d.purchased_at,
            invoice_number: d.invoice_number.trim() ? d.invoice_number.trim() : null,
            discount: Math.max(0, Number(d.discount) || 0),
            tax_amount: Math.max(0, Number(d.tax_amount) || 0),
            paid_amount: Math.max(0, Number(d.paid_amount) || 0),
            payment_method: d.payment_method,
            payment_reference: d.payment_reference.trim() ? d.payment_reference.trim() : null,
            notes: d.notes.trim() ? d.notes.trim() : null,
            items: lines
                .filter((line) => line.product_variant_id !== '' && (Number(line.quantity) || 0) > 0)
                .map((line) => ({
                    product_variant_id: Number(line.product_variant_id),
                    quantity: Number(line.quantity),
                    unit_cost: Number(line.unit_cost) || 0,
                    batch_number: line.batch_number.trim() ? line.batch_number.trim() : null,
                    expires_at: line.expires_at || null,
                    manufactured_at: line.manufactured_at || null,
                })),
        }));
        post('/purchases');
    };

    return (
        <div className="space-y-4">
            <PageHeader title={t('purchases.new')} subtitle={t('purchases.receive_stock')} />

            <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="animate-slide-up lg:col-span-2">
                        <CardHeader title={t('common.summary')} />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label={t('purchases.supplier')} error={formErrors.supplier_id} required>
                                <Select value={data.supplier_id} onChange={(e) => setData('supplier_id', e.target.value)} required>
                                    <option value="">{t('common.select')}</option>
                                    {suppliers.map((supplier) => (
                                        <option key={supplier.id} value={supplier.id}>
                                            {supplier.name}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label={t('common.date')} error={formErrors.purchased_at} required>
                                <Input type="date" value={data.purchased_at} onChange={(e) => setData('purchased_at', e.target.value)} required />
                            </Field>
                            <Field label={t('purchases.invoice')} error={formErrors.invoice_number}>
                                <Input
                                    value={data.invoice_number}
                                    onChange={(e) => setData('invoice_number', e.target.value)}
                                    placeholder={t('purchases.invoice')}
                                />
                            </Field>
                            <Field label={t('common.notes')} error={formErrors.notes}>
                                <Input value={data.notes} onChange={(e) => setData('notes', e.target.value)} placeholder={t('purchases.notes_ph')} />
                            </Field>
                        </div>
                    </Card>

                    <Card className="animate-slide-up">
                        <CardHeader title={t('common.total')} />
                        <div className="space-y-2.5 text-sm">
                            <div className="flex items-center justify-between gap-3 text-slate-500">
                                <span>{t('common.subtotal')}</span>
                                <span className="font-semibold tabular-nums text-slate-800">{formatMoney(subtotal, symbol)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <label htmlFor="purchase-discount" className="text-slate-500">
                                    {t('common.discount')}
                                </label>
                                <Input
                                    id="purchase-discount"
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={data.discount}
                                    onChange={(e) => setData('discount', e.target.value)}
                                    className="w-28 py-1.5 text-right"
                                />
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <label htmlFor="purchase-tax" className="text-slate-500">
                                    {t('common.tax')}
                                </label>
                                <Input
                                    id="purchase-tax"
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={data.tax_amount}
                                    onChange={(e) => setData('tax_amount', e.target.value)}
                                    className="w-28 py-1.5 text-right"
                                />
                            </div>
                                <div className="flex items-center justify-between gap-3 border-t border-dashed border-slate-200 pt-2.5">
                                <span className="font-semibold text-slate-800">{t('common.total')}</span>
                                <span className="text-base font-bold tabular-nums text-slate-900">{formatMoney(total, symbol)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <label htmlFor="purchase-paid" className="text-slate-500">
                                    {t('purchases.paid_amount')}
                                </label>
                                <Input
                                    id="purchase-paid"
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={data.paid_amount}
                                    onChange={(e) => setData('paid_amount', e.target.value)}
                                    className="w-28 py-1.5 text-right"
                                />
                            </div>
                            <div className="flex items-center justify-between gap-3 text-slate-500">
                                <span>{t('purchases.remaining')}</span>
                                <span className={cn('font-semibold tabular-nums', remaining > 0 ? 'text-rose-600' : 'text-emerald-600')}>
                                    {formatMoney(remaining, symbol)}
                                </span>
                            </div>
                        </div>
                    </Card>
                </div>

                <Card className="animate-slide-up">
                    <CardHeader
                        title={t('purchases.items')}
                        action={
                            <Button type="button" variant="outline" icon={<Plus size={15} />} onClick={addLine} className="px-3 py-1.5 text-xs">
                                {t('purchases.add_item')}
                            </Button>
                        }
                    />

                    <div className="relative mb-4">
                        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={variantQuery}
                            onChange={(e) => setVariantQuery(e.target.value)}
                            placeholder={t('common.search')}
                            aria-label={t('common.search')}
                            className="pl-9"
                        />
                    </div>

                    {formErrors.items && (
                        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 animate-fade-in">
                            {formErrors.items}
                        </div>
                    )}

                    <div className="space-y-4">
                        {lines.map((line, index) => {
                            const lineTotal = (Number(line.quantity) || 0) * (Number(line.unit_cost) || 0);
                            return (
                                <div key={line.key} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            {t('purchases.line_total')} {index + 1}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeLine(line.key)}
                                            aria-label={t('common.remove')}
                                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        <Field label={t('purchases.product')} className="sm:col-span-2 lg:col-span-1" required>
                                            <Select
                                                value={String(line.product_variant_id)}
                                                onChange={(e) => selectVariant(line.key, e.target.value)}
                                                aria-label={t('purchases.select_product')}
                                            >
                                                <option value="">{t('purchases.select_product')}</option>
                                                {filteredVariants.map((variant) => (
                                                    <option key={variant.id} value={variant.id}>
                                                        {variant.label}
                                                    </option>
                                                ))}
                                            </Select>
                                        </Field>
                                        <Field label={t('common.quantity')} required>
                                            <Input
                                                type="number"
                                                min={0.01}
                                                step="any"
                                                value={line.quantity}
                                                onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                                                className="text-right"
                                            />
                                        </Field>
                                        <Field label={t('purchases.unit_cost')} required>
                                            <Input
                                                type="number"
                                                min={0}
                                                step="any"
                                                value={line.unit_cost}
                                                onChange={(e) => updateLine(line.key, { unit_cost: e.target.value })}
                                                className="text-right"
                                            />
                                        </Field>
                                        <Field label={t('purchases.batch_number')}>
                                            <Input
                                                value={line.batch_number}
                                                onChange={(e) => updateLine(line.key, { batch_number: e.target.value })}
                                                placeholder={t('purchases.batch_number')}
                                            />
                                        </Field>
                                        <Field label={t('purchases.expires_at')}>
                                            <Input
                                                type="date"
                                                value={line.expires_at}
                                                onChange={(e) => updateLine(line.key, { expires_at: e.target.value })}
                                            />
                                        </Field>
                                        <Field label={t('purchases.manufactured_at')}>
                                            <Input
                                                type="date"
                                                value={line.manufactured_at}
                                                onChange={(e) => updateLine(line.key, { manufactured_at: e.target.value })}
                                            />
                                        </Field>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-sm">
                                        <span className="text-slate-500">{t('purchases.line_total')}</span>
                                        <span className="font-bold tabular-nums text-slate-900">{formatMoney(lineTotal, symbol)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                <Card className="animate-slide-up">
                    <CardHeader title={t('common.payment_method')} />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <fieldset className="sm:col-span-2">
                            <legend className="mb-1.5 text-sm font-medium text-slate-700">{t('common.payment_method')}</legend>
                            <div className="flex flex-wrap gap-2">
                                {PAYMENT_METHODS.map((method) => (
                                    <label
                                        key={method}
                                        className={cn(
                                            'flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition',
                                            data.payment_method === method
                                                ? 'border-brand-500 bg-brand-50 text-brand-700'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="payment_method"
                                            value={method}
                                            checked={data.payment_method === method}
                                            onChange={() => setData('payment_method', method)}
                                            className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
                                        />
                                        {t(`method.${method}`)}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                        <Field label={t('expenses.reference')} error={formErrors.payment_reference}>
                            <Input
                                value={data.payment_reference}
                                onChange={(e) => setData('payment_reference', e.target.value)}
                                placeholder={t('expenses.reference')}
                            />
                        </Field>
                    </div>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" loading={processing} icon={<Truck size={16} />} className="w-full py-3 sm:w-auto">
                        {t('purchases.receive_stock')}
                    </Button>
                </div>
            </form>
        </div>
    );
}
