/*
 * Colour helpers: parse the colours the vis editor stores (hex, rgb(a), hsl(a), names) and mix them.
 */

export interface RGBA {
    r: number;
    g: number;
    b: number;
    a: number;
}

const NAMED: Record<string, string> = {
    black: '#000000',
    white: '#ffffff',
    red: '#ff0000',
    green: '#008000',
    lime: '#00ff00',
    blue: '#0000ff',
    yellow: '#ffff00',
    orange: '#ffa500',
    gray: '#808080',
    grey: '#808080',
    silver: '#c0c0c0',
    transparent: 'rgba(0,0,0,0)',
};

const cache: Record<string, RGBA | null> = {};

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h = (((h % 360) + 360) % 360) / 360;
    if (!s) {
        return [l * 255, l * 255, l * 255];
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue = (t: number): number => {
        if (t < 0) {
            t += 1;
        }
        if (t > 1) {
            t -= 1;
        }
        if (t < 1 / 6) {
            return p + (q - p) * 6 * t;
        }
        if (t < 1 / 2) {
            return q;
        }
        if (t < 2 / 3) {
            return p + (q - p) * (2 / 3 - t) * 6;
        }
        return p;
    };
    return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
}

function rgbToHsl(c: RGBA): [number, number, number] {
    const r = c.r / 255;
    const g = c.g / 255;
    const b = c.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) {
        return [NaN, 0, l];
    }
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h: number;
    if (max === r) {
        h = (g - b) / d + (g < b ? 6 : 0);
    } else if (max === g) {
        h = (b - r) / d + 2;
    } else {
        h = (r - g) / d + 4;
    }
    return [h * 60, s, l];
}

/** Parses a CSS colour, `null` if it cannot be understood */
export function parseColor(color: string | undefined | null): RGBA | null {
    if (!color || typeof color !== 'string') {
        return null;
    }
    const key = color.trim().toLowerCase();
    if (key in cache) {
        return cache[key];
    }
    let text = NAMED[key] || key;
    let result: RGBA | null = null;

    let m = text.match(/^#([0-9a-f]{3,8})$/);
    if (m) {
        let hex = m[1];
        if (hex.length === 3 || hex.length === 4) {
            hex = hex
                .split('')
                .map(ch => ch + ch)
                .join('');
        }
        if (hex.length === 6 || hex.length === 8) {
            result = {
                r: parseInt(hex.substring(0, 2), 16),
                g: parseInt(hex.substring(2, 4), 16),
                b: parseInt(hex.substring(4, 6), 16),
                a: hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1,
            };
        }
    } else if ((m = text.match(/^rgba?\(([^)]+)\)$/))) {
        const parts = m[1].split(/[\s,/]+/).filter(Boolean);
        if (parts.length >= 3) {
            const channel = (v: string): number => (v.endsWith('%') ? (parseFloat(v) * 255) / 100 : parseFloat(v));
            result = {
                r: channel(parts[0]),
                g: channel(parts[1]),
                b: channel(parts[2]),
                a:
                    parts[3] !== undefined
                        ? parts[3].endsWith('%')
                            ? parseFloat(parts[3]) / 100
                            : parseFloat(parts[3])
                        : 1,
            };
        }
    } else if ((m = text.match(/^hsla?\(([^)]+)\)$/))) {
        const parts = m[1].split(/[\s,/]+/).filter(Boolean);
        if (parts.length >= 3) {
            const [r, g, b] = hslToRgb(parseFloat(parts[0]), parseFloat(parts[1]) / 100, parseFloat(parts[2]) / 100);
            result = {
                r,
                g,
                b,
                a:
                    parts[3] !== undefined
                        ? parts[3].endsWith('%')
                            ? parseFloat(parts[3]) / 100
                            : parseFloat(parts[3])
                        : 1,
            };
        }
    } else if (typeof document !== 'undefined') {
        // any other CSS colour name: let the browser translate it
        try {
            const ctx = document.createElement('canvas').getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#010203';
                ctx.fillStyle = text;
                text = ctx.fillStyle;
                if (text !== '#010203' || key === '#010203') {
                    result = parseColor(text);
                }
            }
        } catch {
            // no canvas
        }
    }

    if (result && [result.r, result.g, result.b, result.a].some(v => Number.isNaN(v))) {
        result = null;
    }
    cache[key] = result;
    return result;
}

export function toCss(c: RGBA): string {
    const r = Math.round(Math.min(255, Math.max(0, c.r)));
    const g = Math.round(Math.min(255, Math.max(0, c.g)));
    const b = Math.round(Math.min(255, Math.max(0, c.b)));
    const a = Math.min(1, Math.max(0, c.a));
    return a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${Math.round(a * 1000) / 1000})`;
}

/** Linear mix in RGB, t = 0 gives `c1`, t = 1 gives `c2` */
export function mixRgb(c1: string, c2: string, t: number): string {
    const a = parseColor(c1);
    const b = parseColor(c2);
    if (!a || !b) {
        return t < 0.5 ? c1 : c2;
    }
    return toCss({
        r: a.r + (b.r - a.r) * t,
        g: a.g + (b.g - a.g) * t,
        b: a.b + (b.b - a.b) * t,
        a: a.a + (b.a - a.a) * t,
    });
}

/** Mix along the hue circle, like `d3.interpolateHsl` */
export function mixHsl(c1: string, c2: string, t: number): string {
    const a = parseColor(c1);
    const b = parseColor(c2);
    if (!a || !b) {
        return t < 0.5 ? c1 : c2;
    }
    const hsl1 = rgbToHsl(a);
    const hsl2 = rgbToHsl(b);
    let [h1, s1] = hsl1;
    let [h2, s2] = hsl2;
    const l1 = hsl1[2];
    const l2 = hsl2[2];
    // a grey has no hue - take the one of the other colour, as d3 does
    if (Number.isNaN(h1)) {
        h1 = Number.isNaN(h2) ? 0 : h2;
        s1 = Number.isNaN(h2) ? s1 : s2;
    }
    if (Number.isNaN(h2)) {
        h2 = h1;
        s2 = s1;
    }
    let dh = h2 - h1;
    if (dh > 180) {
        dh -= 360;
    } else if (dh < -180) {
        dh += 360;
    }
    const [r, g, bl] = hslToRgb(h1 + dh * t, s1 + (s2 - s1) * t, l1 + (l2 - l1) * t);
    return toCss({ r, g, b: bl, a: a.a + (b.a - a.a) * t });
}

/** The colour with another opacity */
export function withAlpha(color: string, alpha: number): string {
    const c = parseColor(color);
    if (!c) {
        return color;
    }
    return toCss({ ...c, a: c.a * alpha });
}

/** Lighter (amount > 0) or darker (amount < 0) variant of a colour */
export function shade(color: string, amount: number): string {
    const c = parseColor(color);
    if (!c) {
        return color;
    }
    const target = amount > 0 ? 255 : 0;
    const t = Math.min(1, Math.abs(amount));
    return toCss({
        r: c.r + (target - c.r) * t,
        g: c.g + (target - c.g) * t,
        b: c.b + (target - c.b) * t,
        a: c.a,
    });
}

/** Relative luminance 0..1 - to pick a readable text colour on top of a colour */
export function luminance(color: string): number {
    const c = parseColor(color);
    if (!c) {
        return 1;
    }
    const lin = (v: number): number => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}
