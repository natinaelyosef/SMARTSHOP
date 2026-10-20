import { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Banknote, Check, ChevronRight, Cpu, CupSoda, History, Home, LayoutDashboard, Minus, Pencil,
    Plus, Printer, ScanBarcode, Search, Shapes, Shirt, ShoppingCart, Smartphone, Sparkles,
    Trash2, UtensilsCrossed, Wallet, X,
} from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from '@/components/motion';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, useToast, cn } from '@/components/ui';
import { CountUp } from '@/components/CountUp';
import { useTranslation } from '@/lib/i18n';
import { ThemeToggle } from '@/lib/theme';
import { formatMoney, formatNumber } from '@/lib/utils';
import type { SharedProps } from '@/types';

/* ---------------- Types ---------------- */

interface QuickVariant {
    id: number;
    product_id: number;
    product: string | null;
    name: string;
    sku: string;
    barcode: string | null;
    price: number;
    cost: number;
    stock: number;
    track_expiry: boolean;
    category_id: number | null;
    image: string | null;
    unit: string | null;
    allow_decimal: boolean;
    min_stock: number;
}

interface Category {
    id: number;
    name: string;
}

interface PosCustomer {
    id: number;
    name: string;
    phone: string | null;
    balance: number;
}

interface PosSettings {
    currency_symbol: string;
    default_payment_method: string;
    allow_negative_stock: boolean;
    tax_rate: number;
}

interface QuickSellProps {
    variants: QuickVariant[];
    categories: Category[];
    customers: PosCustomer[];
    shop: { name: string; address?: string | null; phone?: string | null };
    today: { count: number; revenue: number };
    next_sale_number: string;
    settings: PosSettings;
}

type PaymentMethod = 'cash' | 'bank' | 'mobile' | 'credit';

interface CartLine {
    variant: QuickVariant;
    qty: number;
}

interface ReceiptItem {
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

interface Receipt {
    id: number;
    sale_number: string;
    sold_at: string;
    cashier?: string | null;
    customer?: string | null;
    subtotal: number;
    discount: number;
    tax_amount: number;
    total: number;
    profit: number;
    paid_amount: number;
    remaining_amount: number;
    payment_method: string;
    payment_status: string;
    items: ReceiptItem[];
}

interface ProductGroup {
    product_id: number;
    name: string;
    image: string | null;
    category_id: number | null;
    variants: QuickVariant[];
}

const METHODS: { key: PaymentMethod; icon: React.ReactNode }[] = [
    { key: 'cash', icon: <Banknote size={17} /> },
    { key: 'bank', icon: <Wallet size={17} /> },
    { key: 'mobile', icon: <Smartphone size={17} /> },
    { key: 'credit', icon: <ShoppingCart size={17} /> },
];

const TILE_COLORS = [
    'bg-brand-50 text-brand-600 dark:bg-brand-600/20 dark:text-brand-300',
    'bg-sky-50 text-sky-600 dark:bg-sky-600/20 dark:text-sky-300',
    'bg-emerald-50 text-emerald-600 dark:bg-emerald-600/20 dark:text-emerald-300',
    'bg-amber-50 text-amber-600 dark:bg-amber-600/20 dark:text-amber-300',
    'bg-rose-50 text-rose-600 dark:bg-rose-600/20 dark:text-rose-300',
    'bg-violet-50 text-violet-600 dark:bg-violet-600/20 dark:text-violet-300',
];

const CAT_ICONS: Record<string, React.ReactNode> = {
    food: <UtensilsCrossed size={17} />,
    drinks: <CupSoda size={17} />,
    electronics: <Cpu size={17} />,
    clothing: <Shirt size={17} />,
    cosmetics: <Sparkles size={17} />,
    household: <Home size={17} />,
    stationery: <Pencil size={17} />,
    other: <Shapes size={17} />,
};

/* ---------------- Small pieces ---------------- */

function Clock() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(id);
    }, []);
    return (
        <span className="hidden tabular-nums text-xs font-semibold text-slate-500 md:block dark:text-slate-400">
            {now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ·{' '}
            {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
    );
}

function resolveImage(image: string | null): string | null {
    if (!image) return null;
    if (/^(https?:|data:)/.test(image)) return image;
    return `/storage/${image.replace(/^\/+/, '')}`;
}

function ProductThumb({ name, image, size = 'md' }: { name: string; image: string | null; size?: 'md' | 'lg' }) {
    const [failed, setFailed] = useState(false);
    const src = resolveImage(image);
    const initials = (name || '?').trim().charAt(0).toUpperCase();
    const dims = size === 'lg' ? 'h-16 w-16 rounded-2xl text-2xl' : 'h-12 w-12 rounded-xl text-lg';
    return (
        <span className={cn('relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-500 to-indigo-600 font-bold text-white', dims)}>
            {initials}
            {src && !failed && (
                <img
                    src={src}
                    alt={name}
                    loading="lazy"
                    onError={() => setFailed(true)}
                    className="absolute inset-0 h-full w-full object-cover"
                />
            )}
        </span>
    );
}

function QtyStepper({
    value, onChange, max, allowDecimal, small,
}: {
    value: number; onChange: (v: number) => void; max: number; allowDecimal: boolean; small?: boolean;
}) {
    const step = allowDecimal ? 0.5 : 1;
    const btn = small
        ? 'flex h-9 w-9 items-center justify-center rounded-xl text-base'
        : 'flex h-8 w-8 items-center justify-center rounded-lg';
    return (
        <div className="flex items-center gap-1.5">
            <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => onChange(Math.round((value - step) * 100) / 100)}
                className={cn(btn, 'border border-slate-200 bg-white font-bold text-slate-600 transition active:scale-90 hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300')}
            >
                <Minus size={small ? 17 : 13} />
            </button>
            <input
                type="number"
                aria-label="Quantity"
                min={0}
                step={allowDecimal ? 'any' : '1'}
                value={Number.isNaN(value) ? '' : value}
                onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                className={cn(
                    'rounded-lg border border-slate-200 bg-white text-center font-bold tabular-nums text-slate-800 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
                    small ? 'h-9 w-16 text-base' : 'h-8 w-14 text-sm',
                )}
            />
            <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => onChange(Math.round((value + step) * 100) / 100)}
                className={cn(btn, 'border border-brand-200 bg-brand-50 font-bold text-brand-700 transition active:scale-90 hover:bg-brand-100 dark:border-brand-500/40 dark:bg-brand-600/15 dark:text-brand-300')}
            >
                <Plus size={small ? 17 : 13} />
            </button>
            <span className="sr-only">max {max}</span>
        </div>
    );
}

/* ---------------- Main page ---------------- */

export default function QuickSell({ variants, categories, customers, shop, today: todayInit, next_sale_number, settings }: QuickSellProps) {
    const { t, locale, setLocale } = useTranslation();
    const { push } = useToast();
    const { auth } = usePage<SharedProps>().props;
    const symbol = settings.currency_symbol;
    const allowNegative = settings.allow_negative_stock;

    const [query, setQuery] = useState('');
    const [cat, setCat] = useState<number | 'all'>('all');
    const [cart, setCart] = useState<CartLine[]>([]);
    const [discount, setDiscount] = useState('');
    const [method, setMethod] = useState<PaymentMethod>(
        (['cash', 'bank', 'mobile', 'credit'].includes(settings.default_payment_method)
            ? settings.default_payment_method
            : 'cash') as PaymentMethod,
    );
    const [customerId, setCustomerId] = useState('');
    const [tendered, setTendered] = useState('');
    const [paidNow, setPaidNow] = useState('');
    const [variantFor, setVariantFor] = useState<ProductGroup | null>(null);
    const [cartOpen, setCartOpen] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [receiptOpen, setReceiptOpen] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);
    const [today, setToday] = useState(todayInit);
    const [nextNo, setNextNo] = useState(next_sale_number);
    const [stockMap, setStockMap] = useState<Record<number, number>>({});
    const idemKey = useRef<string>(crypto.randomUUID());
    const lastWarn = useRef(0);

    const liveStock = (v: QuickVariant) => stockMap[v.id] ?? v.stock;

    const warnThrottled = (key: string, vars?: Record<string, string | number>) => {
        const now = Date.now();
        if (now - lastWarn.current < 1600) return;
        lastWarn.current = now;
        push(t(key, vars), 'info');
    };

    /* Group variants into products */
    const groups = useMemo(() => {
        const map = new Map<number, ProductGroup>();
        for (const v of variants) {
            const g = map.get(v.product_id) ?? {
                product_id: v.product_id,
                name: v.product?.split(' — ')[0] ?? v.product ?? v.name,
                image: v.image,
                category_id: v.category_id,
                variants: [],
            };
            g.variants.push(v);
            if (!g.image && v.image) g.image = v.image;
            map.set(v.product_id, g);
        }
        return [...map.values()];
    }, [variants]);

    const visibleGroups = useMemo(() => {
        return groups.filter((g) => (cat === 'all' ? true : g.category_id === cat));
    }, [groups, cat]);

    const searchResults = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return variants.filter(
            (v) =>
                v.name.toLowerCase().includes(q) ||
                (v.product ?? '').toLowerCase().includes(q) ||
                v.sku.toLowerCase().includes(q) ||
                (v.barcode ?? '').toLowerCase().includes(q),
        ).slice(0, 60);
    }, [query, variants]);

    const catLabel = (name: string) => {
        switch (name.trim().toLowerCase()) {
            case 'food': return t('sell.cat_food');
            case 'drinks': return t('sell.cat_drinks');
            case 'electronics': return t('sell.cat_electronics');
            case 'clothing': return t('sell.cat_clothing');
            case 'cosmetics': return t('sell.cat_cosmetics');
            case 'household': return t('sell.cat_household');
            case 'stationery': return t('sell.cat_stationery');
            case 'other': return t('sell.cat_other');
            default: return name;
        }
    };

    const catIcon = (name: string) => CAT_ICONS[name.trim().toLowerCase()] ?? <Shapes size={17} />;

    /* ---- Cart ops ---- */
    const clampQty = (v: QuickVariant, qty: number): number => {
        const min = v.allow_decimal ? 0.01 : 1;
        const q = Math.round(qty * 100) / 100;
        if (q <= 0) return 0;
        if (!allowNegative && q > liveStock(v)) {
            warnThrottled('sell.left_warn', { stock: formatNumber(liveStock(v)) });
            return liveStock(v);
        }
        if (q < min) return min;
        return q;
    };

    const addVariant = (v: QuickVariant, qty = 1) => {
        const stock = liveStock(v);
        if (!allowNegative && stock <= 0) {
            push(t('sell.stock_warn', { stock: formatNumber(0) }), 'error');
            return;
        }
        setCart((prev) => {
            const line = prev.find((l) => l.variant.id === v.id);
            if (line) {
                const next = clampQty(v, line.qty + qty);
                if (next <= 0) return prev.filter((l) => l.variant.id !== v.id);
                return prev.map((l) => (l.variant.id === v.id ? { ...l, qty: next } : l));
            }
            const first = clampQty(v, qty);
            if (first <= 0) return prev;
            return [...prev, { variant: v, qty: first }];
        });
    };

    const setQty = (id: number, qty: number) => {
        setCart((prev) =>
            prev.flatMap((l) => {
                if (l.variant.id !== id) return [l];
                const next = clampQty(l.variant, qty);
                if (next <= 0) return [];
                return [{ ...l, qty: next }];
            }),
        );
    };

    const pickProduct = (g: ProductGroup) => {
        if (g.variants.length === 1) addVariant(g.variants[0]);
        else setVariantFor(g);
    };

    const handleSearchEnter = () => {
        const q = query.trim().toLowerCase();
        if (!q) return;
        const exactBarcode = variants.find((v) => (v.barcode ?? '').toLowerCase() === q || v.sku.toLowerCase() === q);
        if (exactBarcode) {
            addVariant(exactBarcode);
            setQuery('');
            return;
        }
        if (searchResults.length === 1) {
            addVariant(searchResults[0]);
            setQuery('');
            return;
        }
        if (searchResults.length === 0) push(t('sell.no_match', { q: query.trim() }), 'error');
    };

    /* ---- Totals ---- */
    const subtotal = cart.reduce((s, l) => s + l.variant.price * l.qty, 0);
    const discountVal = Math.min(Math.max(0, Number(discount) || 0), subtotal);
    const taxable = Math.max(0, subtotal - discountVal);
    const taxRate = Math.max(0, settings.tax_rate);
    const taxAmount = (taxable * taxRate) / 100;
    const total = taxable + taxAmount;
    const itemCount = cart.reduce((s, l) => s + l.qty, 0);
    const paidNowVal = Math.min(Math.max(0, Number(paidNow) || 0), total);
    const remainingPreview = Math.max(0, total - (method === 'credit' ? paidNowVal : total));
    const tenderedVal = Math.max(0, Number(tendered) || 0);
    const changePreview = Math.max(0, tenderedVal - total);

    /* ---- Submit ---- */
    const submitSale = async () => {
        if (cart.length === 0) {
            push(t('sell.empty_warn'), 'error');
            return;
        }
        if (submitting) return;
        setSubmitting(true);
        setFormError(null);
        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
            const res = await fetch('/sales', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': token,
                },
                body: JSON.stringify({
                    items: cart.map((l) => ({
                        product_variant_id: l.variant.id,
                        quantity: l.qty,
                        unit_price: l.variant.price,
                    })),
                    customer_id: customerId ? Number(customerId) : null,
                    discount: discountVal,
                    tax_rate: taxRate,
                    payment_method: method,
                    paid_amount: method === 'credit' ? paidNowVal : total,
                    tendered_method: method === 'credit' ? 'cash' : method,
                    idempotency_key: idemKey.current,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg =
                    (data as { message?: string }).message ||
                    (data as { errors?: Record<string, string[]> }).errors?.items?.[0] ||
                    t('sell.failed');
                throw new Error(msg);
            }
            const sale = (data as { sale: Receipt }).sale;
            const stocks = (data as { stocks?: Record<number, number> }).stocks ?? {};
            setStockMap((prev) => ({ ...prev, ...stocks }));
            const fresh = (data as { today?: { count: number; revenue: number } }).today;
            if (fresh) setToday(fresh);
            setReceipt({ ...sale, paid_amount: sale.paid_amount });
            setReviewOpen(false);
            setCartOpen(false);
            setSuccessOpen(true);
            idemKey.current = crypto.randomUUID();
        } catch (e) {
            const msg = e instanceof Error ? e.message : t('sell.failed');
            setFormError(msg);
            push(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const newSale = () => {
        setCart([]);
        setDiscount('');
        setTendered('');
        setPaidNow('');
        setCustomerId('');
        setFormError(null);
        setReceipt(null);
        setSuccessOpen(false);
        setReceiptOpen(false);
        router.reload({ only: ['variants', 'today', 'next_sale_number', 'categories'] });
    };

    useEffect(() => {
        setNextNo(next_sale_number);
    }, [next_sale_number]);
    useEffect(() => {
        setToday(todayInit);
    }, [todayInit]);

    const cartPanel = (
        <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
                {cart.length === 0 ? (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700"
                    >
                        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50 text-brand-500 dark:bg-brand-600/15 dark:text-brand-300">
                            <ShoppingCart size={30} />
                        </span>
                        <p className="mt-4 text-base font-bold text-slate-800 dark:text-slate-100">{t('sell.cart_empty_t')}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('sell.cart_empty_s')}</p>
                    </motion.div>
                ) : (
                    <motion.ul key="lines" className="space-y-2" layout>
                        <AnimatePresence initial={false}>
                            {cart.map((l) => (
                                <motion.li
                                    key={l.variant.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, x: 40 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/60"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                                                {l.variant.product} <span className="font-medium text-slate-400">· {l.variant.name}</span>
                                            </p>
                                            <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                                                {formatMoney(l.variant.price, symbol)} {l.variant.unit ? `/ ${l.variant.unit}` : ''}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setCart((prev) => prev.filter((x) => x.variant.id !== l.variant.id))}
                                            aria-label={t('pos.remove')}
                                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 active:scale-90 dark:hover:bg-rose-500/10"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        <QtyStepper value={l.qty} max={allowNegative ? 999999 : Math.max(l.qty, liveStock(l.variant))} allowDecimal={l.variant.allow_decimal} onChange={(v) => setQty(l.variant.id, v)} />
                                        <motion.span
                                            key={l.qty * l.variant.price}
                                            initial={{ scale: 1.15 }}
                                            animate={{ scale: 1 }}
                                            className="text-sm font-bold tabular-nums text-slate-900 dark:text-white"
                                        >
                                            {formatMoney(l.variant.price * l.qty, symbol)}
                                        </motion.span>
                                    </div>
                                </motion.li>
                            ))}
                        </AnimatePresence>
                    </motion.ul>
                )}
            </AnimatePresence>

            {cart.length > 0 && (
                <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-900">
                    <Field label={t('sell.customer_opt')}>
                        <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                            <option value="">{t('pos.walk_in')}</option>
                            {customers.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>
                            ))}
                        </Select>
                    </Field>
                    <div className="flex items-center justify-between gap-2">
                        <label htmlFor="qs-discount" className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('common.discount')}</label>
                        <Input id="qs-discount" type="number" min={0} step="any" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" className="w-28 py-1.5 text-right" />
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                        <span>{t('pos.subtotal')}</span>
                        <span className="tabular-nums">{formatMoney(subtotal, symbol)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                        <span>{t('common.tax')} ({taxRate}%)</span>
                        <span className="tabular-nums">{formatMoney(taxAmount, symbol)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-2.5 dark:border-slate-700">
                        <span className="text-base font-bold text-slate-900 dark:text-white">{t('common.total')}</span>
                        <span className="text-2xl font-bold tabular-nums text-brand-700 dark:text-brand-300">
                            <span className="mr-1 text-sm font-semibold">{symbol}</span>
                            <CountUp value={total} decimals={2} />
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                        {METHODS.map((m) => (
                            <button
                                key={m.key}
                                type="button"
                                onClick={() => setMethod(m.key)}
                                aria-pressed={method === m.key}
                                className={cn(
                                    'flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[11px] font-bold transition active:scale-95',
                                    method === m.key
                                        ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm dark:border-brand-400 dark:bg-brand-600/15 dark:text-brand-200'
                                        : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400',
                                )}
                            >
                                {m.icon}
                                {t(`method.${m.key}`)}
                            </button>
                        ))}
                    </div>
                    {method === 'cash' && (
                        <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/70">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('pos.tendered')}</span>
                                <Input type="number" min={0} step="any" value={tendered} onChange={(e) => setTendered(e.target.value)} placeholder="0" className="w-32 py-1.5 text-right font-bold" />
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                <button type="button" onClick={() => setTendered(String(Math.round(total * 100) / 100))} className="rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-bold text-white transition active:scale-95">{t('sell.exact')}</button>
                                {[50, 100, 200, 500, 1000].filter((d) => d > total).slice(0, 3).map((d) => (
                                    <button key={d} type="button" onClick={() => setTendered(String(d))} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold tabular-nums text-slate-600 transition active:scale-95 hover:border-brand-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">{d}</button>
                                ))}
                            </div>
                            <div className="mt-1.5 flex items-center justify-between text-sm">
                                <span className="font-semibold text-slate-500 dark:text-slate-400">{t('pos.change')}</span>
                                <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatMoney(changePreview, symbol)}</span>
                            </div>
                        </div>
                    )}
                    {method === 'credit' && (
                        <div className="rounded-xl bg-amber-50 p-2.5 dark:bg-amber-500/10">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{t('pos.pay_now')}</span>
                                <Input type="number" min={0} step="any" value={paidNow} onChange={(e) => setPaidNow(e.target.value)} placeholder="0" className="w-32 py-1.5 text-right font-bold" />
                            </div>
                            <div className="mt-1.5 flex items-center justify-between text-sm">
                                <span className="font-semibold text-amber-700 dark:text-amber-300">{t('pos.remaining')}</span>
                                <span className="font-bold tabular-nums text-rose-600">{formatMoney(remainingPreview, symbol)}</span>
                            </div>
                        </div>
                    )}
                    {formError && (
                        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 animate-fade-in dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{formError}</p>
                    )}
                    <Button
                        type="button"
                        onClick={() => (cart.length === 0 ? push(t('sell.empty_warn'), 'error') : setReviewOpen(true))}
                        className="w-full py-4 text-base tracking-wide shadow-lg shadow-brand-600/25 transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                        {t('sell.complete')} · {formatMoney(total, symbol)}
                    </Button>
                </div>
            )}
        </div>
    );

    return (
        <MotionConfig reducedMotion="user">
            <div className="space-y-3 pb-20 lg:pb-6">
                <Head title={t('sell.title')} />

                {/* Compact header */}
                <div className="card flex flex-wrap items-center gap-x-3 gap-y-2 p-3 animate-fade-in">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white shadow-md shadow-brand-600/25">
                        {(shop.name || 'S').charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{shop.name}</p>
                        <Clock />
                    </div>
                    <div className="ml-auto flex flex-wrap items-center gap-1.5">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {t('sell.sale_no')} {nextNo}
                        </span>
                        <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold tabular-nums text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                            {t('sell.today_sales')}: {formatMoney(today.revenue, symbol)}
                        </span>
                        <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-[11px] font-bold dark:bg-slate-800">
                            <button type="button" onClick={() => setLocale('en')} aria-pressed={locale === 'en'} className={cn('rounded-md px-2 py-1 transition', locale === 'en' ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400')}>EN</button>
                            <button type="button" onClick={() => setLocale('am')} aria-pressed={locale === 'am'} className={cn('rounded-md px-2 py-1 transition', locale === 'am' ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400')}>አማ</button>
                        </div>
                        <ThemeToggle className="p-2" />
                        <Link href="/sales" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800" title={t('sell.history')} aria-label={t('sell.history')}>
                            <History size={19} />
                        </Link>
                        <Link href="/dashboard" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800" title={t('sell.manage')} aria-label={t('sell.manage')}>
                            <LayoutDashboard size={19} />
                        </Link>
                    </div>
                </div>

                {/* Category bar */}
                <div className="sticky top-16 z-10 -mx-1 px-1 py-1">
                    <div className="card flex gap-2 overflow-x-auto p-2 no-scrollbar" role="tablist" aria-label="Categories">
                        {[{ id: 'all' as const, name: t('sell.all') }, ...categories].map((c, i) => {
                            const active = cat === c.id;
                            const isAll = c.id === 'all';
                            return (
                                <button
                                    key={isAll ? 'all' : (c as Category).id}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => setCat(c.id)}
                                    className={cn(
                                        'relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition active:scale-95',
                                        active ? 'text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                                    )}
                                >
                                    {active && (
                                        <motion.span
                                            layoutId="cat-pill"
                                            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                            className="absolute inset-0 rounded-xl bg-brand-600 shadow-md shadow-brand-600/30"
                                        />
                                    )}
                                    <span className="relative flex items-center gap-2">
                                        <span className={cn(active ? 'text-white' : TILE_COLORS[i % TILE_COLORS.length].split(' ')[1])}>
                                            {isAll ? <Shapes size={17} /> : catIcon((c as Category).name)}
                                        </span>
                                        {isAll ? t('sell.all') : catLabel((c as Category).name)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid items-start gap-3 lg:grid-cols-[1fr_380px]">
                    {/* Products side */}
                    <div className="min-w-0 space-y-3">
                        <div className="relative">
                            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchEnter(); } }}
                                placeholder={t('pos.search_ph')}
                                aria-label={t('common.search')}
                                className="py-3 pl-11 text-[15px] shadow-sm"
                            />
                            {query ? (
                                <button type="button" onClick={() => setQuery('')} aria-label={t('common.close')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    <X size={16} />
                                </button>
                            ) : (
                                <ScanBarcode size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" />
                            )}
                        </div>

                        {query.trim() ? (
                            searchResults.length === 0 ? (
                                <EmptyState title={t('sell.no_match', { q: query.trim() })} />
                            ) : (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <AnimatePresence initial={false}>
                                        {searchResults.map((v) => (
                                            <SearchRow key={v.id} v={v} symbol={symbol} allowNegative={allowNegative} stock={liveStock(v)} onAdd={() => addVariant(v)} t={t} />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )
                        ) : visibleGroups.length === 0 ? (
                            <EmptyState title={t('products.empty')} />
                        ) : (
                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                                <AnimatePresence initial={false}>
                                    {visibleGroups.map((g, gi) => (
                                        <ProductCard key={g.product_id} g={g} index={gi} symbol={symbol} allowNegative={allowNegative} onPick={() => pickProduct(g)} t={t} liveStock={(v) => liveStock(v)} />
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Cart side (desktop) */}
                    <aside className="hidden lg:block lg:sticky lg:top-32">
                        <Card>
                            <div className="mb-3 flex items-center justify-between">
                                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    <ShoppingCart size={16} /> {t('pos.cart')}
                                    {cart.length > 0 && <Badge tone="bg-brand-600 text-white">{t('sell.items_count', { count: cart.length })}</Badge>}
                                </h2>
                                {cart.length > 0 && (
                                    <button type="button" onClick={() => setCart([])} className="text-xs font-bold text-slate-400 transition hover:text-rose-600">{t('sell.clear_cart')}</button>
                                )}
                            </div>
                            {cartPanel}
                        </Card>
                    </aside>
                </div>

                {/* Mobile sticky bar */}
                <div className="fixed inset-x-3 bottom-[72px] z-20 lg:hidden">
                    <AnimatePresence>
                        {cart.length > 0 && !cartOpen && (
                            <motion.button
                                key="bar"
                                type="button"
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 24 }}
                                onClick={() => setCartOpen(true)}
                                className="flex w-full items-center justify-between rounded-2xl bg-slate-900 px-5 py-3.5 text-white shadow-2xl transition active:scale-[0.98] dark:bg-brand-600"
                            >
                                <span className="flex items-center gap-2 text-sm font-bold">
                                    <ShoppingCart size={18} />
                                    {t('sell.view_cart')} · {cart.length}
                                </span>
                                <span className="text-lg font-bold tabular-nums"><CountUp value={total} decimals={2} /> {symbol}</span>
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                {/* Mobile cart sheet */}
                <AnimatePresence>
                    {cartOpen && (
                        <div className="fixed inset-0 z-50 lg:hidden">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
                            <motion.div
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', stiffness: 380, damping: 38 }}
                                className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-8 scrollbar-thin dark:bg-slate-950"
                            >
                                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
                                <div className="mb-3 flex items-center justify-between">
                                    <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                                        <ShoppingCart size={18} /> {t('pos.cart')}
                                    </h2>
                                    <button type="button" onClick={() => setCartOpen(false)} aria-label={t('common.close')} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                                        <X size={18} />
                                    </button>
                                </div>
                                {cartPanel}
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Variant sheet */}
                <Modal open={variantFor !== null} onClose={() => setVariantFor(null)} title={variantFor ? `${t('sell.pick_variant')} · ${variantFor.name}` : ''}>
                    {variantFor && (
                        <div className="space-y-2">
                            {variantFor.variants.map((v) => {
                                const stock = liveStock(v);
                                const gone = !allowNegative && stock <= 0;
                                const low = !gone && stock <= Math.max(v.min_stock, 10);
                                return (
                                    <div key={v.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                                        <ProductThumb name={v.name} image={variantFor.image} />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{v.name}{v.unit ? ` · ${v.unit}` : ''}</p>
                                            <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                                                {formatMoney(v.price, symbol)} · {gone ? t('sell.out') : t('sell.in_stock', { count: formatNumber(stock) })}
                                            </p>
                                        </div>
                                        <Button disabled={gone} onClick={() => { addVariant(v); }} className="shrink-0 px-4">
                                            {t('sell.add')}
                                        </Button>
                                        {low && <Badge className="shrink-0" tone="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">{t('sell.low')}</Badge>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Modal>

                {/* Review sheet */}
                <Modal
                    open={reviewOpen}
                    onClose={() => setReviewOpen(false)}
                    title={t('sell.review_t')}
                    footer={
                        <>
                            <Button variant="outline" onClick={() => setReviewOpen(false)}>{t('common.cancel')}</Button>
                            <Button loading={submitting} onClick={submitSale} className="px-6">
                                {t('sell.confirm')} · {formatMoney(total, symbol)}
                            </Button>
                        </>
                    }
                >
                    <div className="space-y-3">
                        <div className="rounded-2xl bg-slate-50 p-4 text-center dark:bg-slate-800/70">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t('common.total')}</p>
                            <p className="text-3xl font-bold tabular-nums text-slate-900 sm:text-4xl dark:text-white">
                                <span className="mr-1 text-lg">{symbol}</span><CountUp value={total} decimals={2} />
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {t(`method.${method}`)}{customerId ? ` · ${customers.find((c) => String(c.id) === customerId)?.name}` : ''}
                            </p>
                        </div>
                        <ul className="max-h-48 space-y-1.5 overflow-y-auto scrollbar-thin">
                            {cart.map((l) => (
                                <li key={l.variant.id} className="flex items-center justify-between gap-2 text-sm">
                                    <span className="truncate text-slate-600 dark:text-slate-300">{l.variant.product} · {l.variant.name} × {formatNumber(l.qty)}</span>
                                    <span className="shrink-0 font-bold tabular-nums text-slate-800 dark:text-slate-100">{formatMoney(l.variant.price * l.qty, symbol)}</span>
                                </li>
                            ))}
                        </ul>
                        {method === 'cash' && (
                            <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm dark:bg-emerald-500/10">
                                <span className="font-semibold text-emerald-700 dark:text-emerald-300">{t('pos.change')}</span>
                                <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{formatMoney(changePreview, symbol)}</span>
                            </div>
                        )}
                        {method === 'credit' && remainingPreview > 0 && (
                            <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm dark:bg-amber-500/10">
                                <span className="font-semibold text-amber-700 dark:text-amber-300">{t('pos.remaining')}</span>
                                <span className="font-bold tabular-nums text-amber-700 dark:text-amber-300">{formatMoney(remainingPreview, symbol)}</span>
                            </div>
                        )}
                    </div>
                </Modal>

                {/* Success overlay */}
                <AnimatePresence>
                    {successOpen && receipt && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 24 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                                className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-slate-900"
                            >
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/40"
                                >
                                    <Check size={40} strokeWidth={3} />
                                </motion.span>
                                <h2 className="mt-4 text-xl font-bold tracking-wide text-slate-900 dark:text-white">{t('sell.success_t')}</h2>
                                <p className="mt-1 font-mono text-xs font-bold text-slate-400">{receipt.sale_number}</p>
                                <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 sm:text-4xl dark:text-white">
                                    <span className="mr-1 text-lg">{symbol}</span><CountUp value={receipt.total} decimals={2} />
                                </p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    {t(`method.${receipt.payment_method}`)} · {t(`status.${receipt.payment_status}`)}
                                </p>
                                <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <Button variant="outline" onClick={() => { setSuccessOpen(false); setReceiptOpen(true); }} icon={<Printer size={16} />}>
                                        {t('sell.print_receipt')}
                                    </Button>
                                    <Button onClick={newSale} icon={<Plus size={16} />}>
                                        {t('sell.new_sale')}
                                    </Button>
                                </div>
                                <Link href={`/sales/${receipt.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline dark:text-brand-300">
                                    {t('sell.view_details')} <ChevronRight size={13} />
                                </Link>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Receipt */}
                <Modal
                    open={receiptOpen}
                    onClose={() => setReceiptOpen(false)}
                    title={t('sell.receipt_t')}
                    size="sm"
                    footer={
                        <>
                            <Button variant="outline" onClick={newSale}>{t('sell.new_sale')}</Button>
                            <Button onClick={() => window.print()} icon={<Printer size={16} />}>{t('common.print')}</Button>
                        </>
                    }
                >
                    {receipt && (
                        <div id="pos-receipt" className="mx-auto w-full max-w-[300px] bg-white font-mono text-[13px] leading-relaxed text-slate-900">
                            <div className="text-center">
                                <p className="font-sans text-base font-bold">{shop.name}</p>
                                {shop.address && <p className="text-xs">{shop.address}</p>}
                                {shop.phone && <p className="text-xs">{shop.phone}</p>}
                                <p className="mt-1 border-y border-dashed border-slate-300 py-1 text-xs">
                                    {t('sell.receipt_t')} {receipt.sale_number}<br />{receipt.sold_at}
                                </p>
                            </div>
                            <ul className="mt-2 space-y-1">
                                {receipt.items.map((it, i) => (
                                    <li key={i}>
                                        <p className="font-sans font-semibold">{it.name}</p>
                                        <p className="flex justify-between tabular-nums">
                                            <span>{formatNumber(it.quantity)} × {formatMoney(it.unit_price, symbol)}</span>
                                            <span>{formatMoney(it.total_price, symbol)}</span>
                                        </p>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-2 space-y-0.5 border-t border-dashed border-slate-300 pt-2 tabular-nums">
                                <p className="flex justify-between"><span>{t('pos.subtotal')}</span><span>{formatMoney(receipt.subtotal, symbol)}</span></p>
                                {receipt.discount > 0 && <p className="flex justify-between"><span>{t('common.discount')}</span><span>-{formatMoney(receipt.discount, symbol)}</span></p>}
                                {receipt.tax_amount > 0 && <p className="flex justify-between"><span>{t('common.tax')}</span><span>{formatMoney(receipt.tax_amount, symbol)}</span></p>}
                                <p className="flex justify-between font-sans text-base font-bold"><span>{t('common.total')}</span><span>{formatMoney(receipt.total, symbol)}</span></p>
                                <p className="flex justify-between"><span>{t('sell.paid')} ({t(`method.${receipt.payment_method}`)})</span><span>{formatMoney(receipt.paid_amount, symbol)}</span></p>
                                {receipt.remaining_amount > 0 && <p className="flex justify-between"><span>{t('pos.remaining')}</span><span>{formatMoney(receipt.remaining_amount, symbol)}</span></p>}
                            </div>
                            <p className="mt-2 border-t border-dashed border-slate-300 pt-2 text-center font-sans text-xs">
                                {t('sell.cashier')}: {receipt.cashier ?? auth.user?.name ?? '-'}<br />{t('sell.thank')}
                            </p>
                        </div>
                    )}
                </Modal>
            </div>
        </MotionConfig>
    );
}

function SearchRow({ v, symbol, allowNegative, stock, onAdd, t }: {
    v: QuickVariant; symbol: string; allowNegative: boolean; stock: number; onAdd: () => void; t: (k: string, v?: Record<string, string | number>) => string;
}) {
    const gone = !allowNegative && stock <= 0;
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
        >
            <ProductThumb name={`${v.product} ${v.name}`} image={v.image} />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{v.product} · {v.name}</p>
                <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {formatMoney(v.price, symbol)} · {gone ? t('sell.out') : t('sell.in_stock', { count: formatNumber(stock) })}
                </p>
            </div>
            <Button onClick={onAdd} disabled={gone} className="shrink-0 px-4 py-2">{t('sell.add')}</Button>
        </motion.div>
    );
}

function ProductCard({ g, index, symbol, allowNegative, onPick, t, liveStock }: {
    g: ProductGroup; index: number; symbol: string; allowNegative: boolean; onPick: () => void;
    t: (k: string, v?: Record<string, string | number>) => string; liveStock: (v: QuickVariant) => number;
}) {
    const prices = g.variants.map((v) => v.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const totalStock = g.variants.reduce((s, v) => s + liveStock(v), 0);
    const out = !allowNegative && totalStock <= 0;
    const lowThreshold = Math.max(...g.variants.map((v) => v.min_stock), 10);
    const low = !out && totalStock <= lowThreshold;
    const color = TILE_COLORS[index % TILE_COLORS.length];

    return (
        <motion.button
            layout
            type="button"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.3) }}
            onClick={onPick}
            disabled={out}
            whileTap={{ scale: 0.96 }}
            className={cn(
                'group flex flex-col rounded-2xl border bg-white p-3 text-left shadow-sm transition-all dark:bg-slate-900',
                out
                    ? 'cursor-not-allowed border-slate-200 opacity-55 dark:border-slate-800'
                    : 'border-slate-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg dark:border-slate-700 dark:hover:border-brand-500/50',
            )}
        >
            <div className="flex items-start gap-2.5">
                <ProductThumb name={g.name} image={g.image} />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold leading-tight text-slate-800 dark:text-slate-100">{g.name}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                        {g.variants.length > 1 ? t('sell.sizes', { count: g.variants.length }) : g.variants[0]?.name}
                    </p>
                </div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-end justify-between gap-x-2 gap-y-1">
                <p className="min-w-0 truncate text-[15px] font-bold tabular-nums text-brand-700 dark:text-brand-300">
                    {formatMoney(min, symbol)}{max > min && <span className="text-xs font-semibold text-slate-400"> – {formatMoney(max, symbol)}</span>}
                </p>
                <span className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums',
                    out ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                        : low ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
                )}>
                    {out ? t('sell.out') : low ? `${t('sell.low')} · ${formatNumber(totalStock)}` : formatNumber(totalStock)}
                </span>
            </div>
            {g.variants.length > 1 && !out && (
                <span className={cn('mt-2 flex items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-bold transition group-hover:text-white', color, 'group-hover:bg-brand-600')}>
                    <ChevronRight size={12} /> {t('sell.pick_variant')}
                </span>
            )}
        </motion.button>
    );
}
