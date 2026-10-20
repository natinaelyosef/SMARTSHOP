import type { CSSProperties } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { formatCompact, formatMoney } from '@/lib/utils';

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#14b8a6', '#ec4899'];

const legendStyle: CSSProperties = { fontSize: 11, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 4 };

interface Point {
    label: string;
    [key: string]: string | number;
}

function ChartTooltip({ active, payload, label, symbol }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-xl">
            <p className="mb-1 font-semibold text-slate-700">{label}</p>
            {payload.map((entry: any, i: number) => (
                <p key={i} className="flex items-center gap-2 text-slate-600">
                    <span className="h-2 w-2 rounded-full" style={{ background: entry.color || entry.fill }} />
                    {entry.name}: {typeof entry.value === 'number' ? formatMoney(entry.value, symbol ?? 'Br') : entry.value}
                </p>
            ))}
        </div>
    );
}

export function TrendAreaChart({ data, dataKey = 'sales', label, symbol = 'Br', height = 260, color = '#4f46e5' }: { data: Point[]; dataKey?: string; label?: string; symbol?: string; height?: number; color?: string }) {
    return (
        <div style={{ height }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
                    <defs>
                        <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(Number(v))} />
                    <Tooltip content={<ChartTooltip symbol={symbol} />} cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }} />
                    <Area type="monotone" dataKey={dataKey} name={label ?? dataKey} stroke={color} strokeWidth={2.5} fill={`url(#grad-${dataKey})`} animationDuration={900} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

export function GroupedBarChart({ data, keys, names, height = 260, symbol = 'Br' }: { data: Point[]; keys: string[]; names?: string[]; height?: number; symbol?: string }) {
    return (
        <div style={{ height }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={16} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(Number(v))} />
                    <Tooltip content={<ChartTooltip symbol={symbol} />} cursor={{ fill: '#f1f5f9' }} />
                    <Legend wrapperStyle={legendStyle} />
                    {keys.map((key, i) => (
                        <Bar key={key} dataKey={key} name={names?.[i] ?? key} fill={COLORS[i % COLORS.length]} radius={[6, 6, 0, 0]} animationDuration={900} />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function ProfitTrendChart({ data, symbol = 'Br' }: { data: Point[]; symbol?: string }) {
    return (
        <div style={{ height: 280 }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={16} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(Number(v))} />
                    <Tooltip content={<ChartTooltip symbol={symbol} />} />
                    <Legend wrapperStyle={legendStyle} />
                    <Line type="monotone" dataKey="before_rent" name="Before rent" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} animationDuration={1000} />
                    <Line type="monotone" dataKey="after_rent" name="After rent" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} animationDuration={1000} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export function DonutChart({ data, height = 240, symbol = 'Br' }: { data: Point[]; height?: number; symbol?: string }) {
    return (
        <div style={{ height }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="label"
                        innerRadius="58%"
                        outerRadius="85%"
                        paddingAngle={3}
                        animationDuration={900}
                    >
                        {data.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip symbol={symbol} />} />
                    <Legend wrapperStyle={legendStyle} iconType="circle" />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export function HorizontalBarChart({ data, height = 240, color = '#0ea5e9', symbol = 'Br', yAxisWidth = 130 }: { data: Point[]; height?: number; color?: string; symbol?: string; yAxisWidth?: number }) {
    return (
        <div style={{ height }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(Number(v))} />
                    <YAxis type="category" dataKey="label" width={yAxisWidth} tick={{ fontSize: yAxisWidth < 120 ? 10 : 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip symbol={symbol} />} cursor={{ fill: '#f1f5f9' }} />
                    <Bar dataKey="value" name="Value" fill={color} radius={[0, 6, 6, 0]} animationDuration={900} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
