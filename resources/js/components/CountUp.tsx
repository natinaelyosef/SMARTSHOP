import { useEffect, useRef, useState } from 'react';

export function CountUp({ value, duration = 900, decimals = 0 }: { value: number; duration?: number; decimals?: number }) {
    const [display, setDisplay] = useState(0);
    const previous = useRef(0);

    useEffect(() => {
        const from = previous.current;
        const to = value;
        if (from === to) return;

        let frame = 0;
        const total = Math.round(duration / 16);
        const step = () => {
            frame++;
            const progress = Math.min(frame / total, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = from + (to - from) * eased;
            setDisplay(current);
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                previous.current = to;
            }
        };
        requestAnimationFrame(step);
    }, [value, duration]);

    return <>{display.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: 0 })}</>;
}
