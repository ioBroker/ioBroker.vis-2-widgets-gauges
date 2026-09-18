/*
 * Colour levels ("zones") of a scale.
 *
 * All gauges describe them the same way, which is how the color gauge always stored them:
 *
 * - `levelsCount` - number of levels
 * - `color1` ... `colorN` - colour of each level
 * - `levelThreshold1` ... `levelThreshold(N-1)` - where a level ends, as an absolute value. The last level always
 *   ends at the maximum. A missing threshold shares the rest of the scale equally.
 */
import { mixHsl, mixRgb } from './colors';
import { toNumber } from './format';

export interface Level {
    from: number;
    to: number;
    color: string;
}

/** Palette of the new gauges: from green over yellow to red */
export const DEFAULT_LEVEL_COLORS = ['#43a047', '#e53935'];

/**
 * Colours for `count` levels. If every level has its own colour they are used as they are, otherwise the colours
 * run from the first to the last defined one (or through `fallback`) - exactly what react-gauge-chart did.
 */
export function levelColors(defined: (string | undefined)[], count: number, fallback = DEFAULT_LEVEL_COLORS): string[] {
    const given = defined.filter((c): c is string => !!c);
    if (given.length === count) {
        return given;
    }
    const first = given.length ? given[0] : fallback[0];
    const last = given.length ? given[given.length - 1] : fallback[fallback.length - 1];
    if (count === 1) {
        return [first];
    }
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
        result.push(mixHsl(first, last, i / (count - 1)));
    }
    return result;
}

/**
 * Reads the levels of a widget.
 *
 * @param data rxData of the widget
 * @param min minimum of the scale
 * @param max maximum of the scale
 * @param fallback colours if the levels have none
 * @param colorAttr name of the colour attribute without the index
 */
export function getLevels(
    data: Record<string, any>,
    min: number,
    max: number,
    fallback = DEFAULT_LEVEL_COLORS,
    colorAttr = 'color',
): Level[] {
    const count = Math.max(0, Math.round(toNumber(data.levelsCount) || 0));
    if (!count) {
        return [];
    }
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    const colors = levelColors(
        Array.from({ length: count }, (_, i) => data[`${colorAttr}${i + 1}`] as string | undefined),
        count,
        fallback,
    );

    const levels: Level[] = [];
    let from = lo;
    for (let i = 1; i <= count; i++) {
        let to: number;
        const threshold = i < count ? toNumber(data[`levelThreshold${i}`]) : null;
        if (i === count) {
            to = hi;
        } else if (threshold !== null && threshold > lo) {
            to = Math.min(hi, Math.max(from, threshold));
        } else {
            // share what is left equally among this and the following levels
            to = from + (hi - from) / (count - i + 1);
        }
        levels.push({ from, to, color: colors[i - 1] });
        from = to;
    }
    return levels;
}

/** Colour of the level a value lies in */
export function colorOfLevel(levels: Level[], value: number, fallback: string): string {
    if (!levels.length || !Number.isFinite(value)) {
        return fallback;
    }
    for (const level of levels) {
        if (value < level.to) {
            return level.color;
        }
    }
    return levels[levels.length - 1].color;
}

/**
 * Colour of a value in a smooth gradient through the levels. Each colour sits in the middle of its level, below
 * the first and above the last middle the colour stays.
 */
export function colorOfGradient(levels: Level[], value: number, fallback: string): string {
    if (!levels.length || !Number.isFinite(value)) {
        return fallback;
    }
    if (levels.length === 1) {
        return levels[0].color;
    }
    const centers = levels.map(l => (l.from + l.to) / 2);
    if (value <= centers[0]) {
        return levels[0].color;
    }
    for (let i = 1; i < levels.length; i++) {
        if (value <= centers[i]) {
            const t = (value - centers[i - 1]) / (centers[i] - centers[i - 1] || 1);
            return mixRgb(levels[i - 1].color, levels[i].color, t);
        }
    }
    return levels[levels.length - 1].color;
}

/** Gradient stops (0..1 along the scale) for an SVG `linearGradient` */
export function gradientStops(levels: Level[], min: number, max: number): { offset: number; color: string }[] {
    const span = max - min || 1;
    if (levels.length === 1) {
        return [
            { offset: 0, color: levels[0].color },
            { offset: 1, color: levels[0].color },
        ];
    }
    return levels.map(l => ({
        offset: Math.min(1, Math.max(0, ((l.from + l.to) / 2 - min) / span)),
        color: l.color,
    }));
}
