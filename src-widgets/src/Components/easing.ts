/*
 * Easing functions with the names and the curves of d3-ease.
 *
 * The first versions of the widgets used d3 (via react-gauge-chart and react-liquid-gauge), and the projects store
 * these names in `riseAnimationEasing` / `waveAnimationEasing`. So the names must stay, and so should the curves.
 */

export type EasingFunction = (t: number) => number;

const HALF_PI = Math.PI / 2;
const TAU = 2 * Math.PI;

/** 2^(-10 * x) scaled so that tpmt(0) === 1 and tpmt(1) === 0 */
function tpmt(x: number): number {
    return (Math.pow(2, -10 * x) - 0.0009765625) * 1.0009775171065494;
}

const B1 = 4 / 11;
const B2 = 6 / 11;
const B3 = 8 / 11;
const B4 = 3 / 4;
const B5 = 9 / 11;
const B6 = 10 / 11;
const B7 = 15 / 16;
const B8 = 21 / 22;
const B9 = 63 / 64;
const B0 = 1 / B1 / B1;

function bounceOut(t: number): number {
    if (t < B1) {
        return B0 * t * t;
    }
    if (t < B3) {
        t -= B2;
        return B0 * t * t + B4;
    }
    if (t < B6) {
        t -= B5;
        return B0 * t * t + B7;
    }
    t -= B8;
    return B0 * t * t + B9;
}

/** Overshoot of the "back" easings, as in d3 */
const BACK = 1.70158;

/** Amplitude and period of the "elastic" easings, as in d3 */
const ELASTIC_PERIOD = 0.3 / TAU;
const ELASTIC_SHIFT = Math.asin(1) * ELASTIC_PERIOD;

export const EASINGS: Record<string, EasingFunction> = {
    linear: t => t,

    quadIn: t => t * t,
    quadOut: t => t * (2 - t),
    quadInOut: t => ((t *= 2) <= 1 ? t * t : --t * (2 - t) + 1) / 2,

    cubicIn: t => t * t * t,
    cubicOut: t => --t * t * t + 1,
    cubicInOut: t => ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2,

    polyIn: t => Math.pow(t, 3),
    polyOut: t => 1 - Math.pow(1 - t, 3),
    polyInOut: t => ((t *= 2) <= 1 ? Math.pow(t, 3) : 2 - Math.pow(2 - t, 3)) / 2,

    sinIn: t => (t === 1 ? 1 : 1 - Math.cos(t * HALF_PI)),
    sinOut: t => Math.sin(t * HALF_PI),
    sinInOut: t => (1 - Math.cos(Math.PI * t)) / 2,

    expIn: t => tpmt(1 - t),
    expOut: t => 1 - tpmt(t),
    expInOut: t => ((t *= 2) <= 1 ? tpmt(1 - t) : 2 - tpmt(t - 1)) / 2,

    circleIn: t => 1 - Math.sqrt(1 - t * t),
    circleOut: t => Math.sqrt(1 - --t * t),
    circleInOut: t => ((t *= 2) <= 1 ? 1 - Math.sqrt(1 - t * t) : Math.sqrt(1 - (t -= 2) * t) + 1) / 2,

    bounceIn: t => 1 - bounceOut(1 - t),
    bounceOut,
    bounceInOut: t => ((t *= 2) <= 1 ? 1 - bounceOut(1 - t) : bounceOut(t - 1) + 1) / 2,

    backIn: t => t * t * (BACK * (t - 1) + t),
    backOut: t => --t * t * ((t + 1) * BACK + t) + 1,
    backInOut: t => ((t *= 2) < 1 ? t * t * ((BACK + 1) * t - BACK) : (t -= 2) * t * ((BACK + 1) * t + BACK) + 2) / 2,

    elasticIn: t => tpmt(-(--t)) * Math.sin((ELASTIC_SHIFT - t) / ELASTIC_PERIOD),
    elasticOut: t => 1 - tpmt(t) * Math.sin((t + ELASTIC_SHIFT) / ELASTIC_PERIOD),
    elasticInOut: t =>
        ((t = t * 2 - 1) < 0
            ? tpmt(-t) * Math.sin((ELASTIC_SHIFT - t) / ELASTIC_PERIOD)
            : 2 - tpmt(t) * Math.sin((ELASTIC_SHIFT + t) / ELASTIC_PERIOD)) / 2,
};

/** The names offered in the widget settings, in the order of d3-ease */
export const EASING_NAMES: string[] = Object.keys(EASINGS);

/** Easing by its name; unknown names fall back to `fallback` like d3 did */
export function getEasing(name: string | undefined | null, fallback = 'cubicInOut'): EasingFunction {
    return (name && EASINGS[name]) || EASINGS[fallback] || EASINGS.linear;
}
