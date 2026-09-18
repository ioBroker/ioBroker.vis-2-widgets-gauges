/*
 * SVG geometry shared by the gauges.
 *
 * Angles are in degrees, measured clockwise from 12 o'clock: -90 is left, 0 is up, 90 is right, 180 is down. That
 * is how a gauge is described ("a sweep of 270 degrees, symmetric around the top"), and increasing angles run
 * clockwise on the screen, which is the positive sweep direction of an SVG arc.
 */

export interface Point {
    x: number;
    y: number;
}

const RAD = Math.PI / 180;

/** Point on a circle */
export function polar(cx: number, cy: number, r: number, angle: number): Point {
    const a = angle * RAD;
    return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}

function fmt(n: number): string {
    return (Math.round(n * 100) / 100).toString();
}

function pt(p: Point): string {
    return `${fmt(p.x)} ${fmt(p.y)}`;
}

/**
 * Path of a circular arc for `stroke` - the line itself, not a filled area.
 * A sweep of 360 degrees or more is drawn as a full circle.
 */
export function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
    if (to < from) {
        [from, to] = [to, from];
    }
    if (r <= 0 || to - from <= 0) {
        return '';
    }
    if (to - from >= 359.99) {
        const top = polar(cx, cy, r, from);
        const bottom = polar(cx, cy, r, from + 180);
        return `M ${pt(top)} A ${fmt(r)} ${fmt(r)} 0 1 1 ${pt(bottom)} A ${fmt(r)} ${fmt(r)} 0 1 1 ${pt(top)}`;
    }
    const start = polar(cx, cy, r, from);
    const end = polar(cx, cy, r, to);
    const large = to - from > 180 ? 1 : 0;
    return `M ${pt(start)} A ${fmt(r)} ${fmt(r)} 0 ${large} 1 ${pt(end)}`;
}

/**
 * Filled ring segment between two radii - with the rounded corners and the padding of `d3.arc()`, which the first
 * version of the color gauge used.
 *
 * @param cx center x
 * @param cy center y
 * @param outer outer radius
 * @param inner inner radius
 * @param from start angle
 * @param to end angle
 * @param cornerRadius radius of the four corners in px (clamped like d3 does)
 * @param padding width of the gap to the next segment in px, half of it is taken from each side
 */
export function sectorPath(
    cx: number,
    cy: number,
    outer: number,
    inner: number,
    from: number,
    to: number,
    cornerRadius = 0,
    padding = 0,
): string {
    if (to < from) {
        [from, to] = [to, from];
    }
    inner = Math.max(0, inner);
    if (outer <= inner || to - from <= 0) {
        return '';
    }
    if (to - from >= 359.99 && !padding) {
        // A full ring: the outer circle clockwise, the inner one counterclockwise, so the non-zero rule cuts it out
        let d = `${arcPath(cx, cy, outer, 0, 360)} Z`;
        if (inner > 0) {
            const top = polar(cx, cy, inner, 0);
            const bottom = polar(cx, cy, inner, 180);
            const r = fmt(inner);
            d += ` M ${pt(top)} A ${r} ${r} 0 1 0 ${pt(bottom)} A ${r} ${r} 0 1 0 ${pt(top)} Z`;
        }
        return d;
    }

    const half = padding / 2;
    // Angle that the half padding takes on a given radius, so both edges of the gap run parallel
    const padAt = (r: number): number => (r > half ? Math.asin(half / r) / RAD : 90);

    const a0Outer = from + padAt(outer);
    const a1Outer = to - padAt(outer);
    if (a1Outer <= a0Outer) {
        return '';
    }
    const hasInner = inner > 0 && inner > half;
    const a0Inner = hasInner ? from + padAt(inner) : from;
    const a1Inner = hasInner ? to - padAt(inner) : to;

    // The corner radius must fit into the thickness and into the length of the segment
    let c = Math.min(cornerRadius, (outer - inner) / 2);
    const lengthOuter = ((a1Outer - a0Outer) * RAD * outer) / 2;
    c = Math.max(0, Math.min(c, lengthOuter));
    if (hasInner && a1Inner > a0Inner) {
        c = Math.min(c, ((a1Inner - a0Inner) * RAD * inner) / 2);
    }

    if (c < 0.5) {
        // plain segment without rounded corners
        const p1 = polar(cx, cy, outer, a0Outer);
        const p2 = polar(cx, cy, outer, a1Outer);
        const largeOuter = a1Outer - a0Outer > 180 ? 1 : 0;
        let d = `M ${pt(p1)} A ${fmt(outer)} ${fmt(outer)} 0 ${largeOuter} 1 ${pt(p2)}`;
        if (hasInner && a1Inner > a0Inner) {
            const p3 = polar(cx, cy, inner, a1Inner);
            const p4 = polar(cx, cy, inner, a0Inner);
            const largeInner = a1Inner - a0Inner > 180 ? 1 : 0;
            d += ` L ${pt(p3)} A ${fmt(inner)} ${fmt(inner)} 0 ${largeInner} 0 ${pt(p4)}`;
        } else {
            // the inner edge collapsed into the tip of the padding wedge
            const tip =
                half > 0 ? polar(cx, cy, half / Math.sin(((to - from) * RAD) / 2), (from + to) / 2) : { x: cx, y: cy };
            d += ` L ${pt(tip)}`;
        }
        return `${d} Z`;
    }

    // Rounded corners: every corner is a circle of radius `c`, tangent to the arc and to the (shifted) edge line.
    // For the edge at angle `a` the line is shifted by `half` towards the inside of the segment.
    const u = (a: number): Point => ({ x: Math.sin(a * RAD), y: -Math.cos(a * RAD) });
    const n = (a: number): Point => ({ x: Math.cos(a * RAD), y: Math.sin(a * RAD) });

    /** Corner at the edge `edge`: `dir` is +1 for the start edge, -1 for the end edge; `rc` = radius of the corner center */
    const corner = (edge: number, rc: number, dir: 1 | -1, arcRadius: number): { onArc: Point; onEdge: Point } => {
        const delta = Math.asin(Math.min(1, (half + c) / rc)) / RAD;
        const angle = edge + dir * delta;
        const onArc = polar(cx, cy, arcRadius, angle);
        const along = rc * Math.cos(delta * RAD);
        const ue = u(edge);
        const ne = n(edge);
        const onEdge = {
            x: cx + along * ue.x + dir * half * ne.x,
            y: cy + along * ue.y + dir * half * ne.y,
        };
        return { onArc, onEdge };
    };

    const os = corner(from, outer - c, 1, outer);
    const oe = corner(to, outer - c, -1, outer);
    const cr = fmt(c);

    const angleOs = Math.atan2(os.onArc.x - cx, cy - os.onArc.y) / RAD;
    let angleOe = Math.atan2(oe.onArc.x - cx, cy - oe.onArc.y) / RAD;
    while (angleOe < angleOs) {
        angleOe += 360;
    }
    const largeOuter = angleOe - angleOs > 180 ? 1 : 0;

    let d = `M ${pt(os.onEdge)} A ${cr} ${cr} 0 0 1 ${pt(os.onArc)}`;
    d += ` A ${fmt(outer)} ${fmt(outer)} 0 ${largeOuter} 1 ${pt(oe.onArc)}`;
    d += ` A ${cr} ${cr} 0 0 1 ${pt(oe.onEdge)}`;

    if (hasInner && inner + c > half + c) {
        const ie = corner(to, inner + c, -1, inner);
        const is = corner(from, inner + c, 1, inner);
        const angleIs = Math.atan2(is.onArc.x - cx, cy - is.onArc.y) / RAD;
        let angleIe = Math.atan2(ie.onArc.x - cx, cy - ie.onArc.y) / RAD;
        while (angleIe < angleIs) {
            angleIe += 360;
        }
        const largeInner = angleIe - angleIs > 180 ? 1 : 0;
        d += ` L ${pt(ie.onEdge)} A ${cr} ${cr} 0 0 1 ${pt(ie.onArc)}`;
        d += ` A ${fmt(inner)} ${fmt(inner)} 0 ${largeInner} 0 ${pt(is.onArc)}`;
        d += ` A ${cr} ${cr} 0 0 1 ${pt(is.onEdge)}`;
    } else {
        d += ` L ${fmt(cx)} ${fmt(cy)}`;
    }
    return `${d} Z`;
}

/** Bounding box of a ring segment of radius 1 around (0, 0), for fitting a gauge into its widget */
export function arcBounds(
    from: number,
    to: number,
    includeCenter = true,
): { x0: number; y0: number; x1: number; y1: number } {
    const points: Point[] = [polar(0, 0, 1, from), polar(0, 0, 1, to)];
    if (includeCenter) {
        points.push({ x: 0, y: 0 });
    }
    if (to - from >= 360) {
        return { x0: -1, y0: -1, x1: 1, y1: 1 };
    }
    // every quarter (up, right, down, left) that lies inside the sweep is an extreme point
    for (let a = Math.ceil(from / 90) * 90; a <= to; a += 90) {
        points.push(polar(0, 0, 1, a));
    }
    return {
        x0: Math.min(...points.map(p => p.x)),
        y0: Math.min(...points.map(p => p.y)),
        x1: Math.max(...points.map(p => p.x)),
        y1: Math.max(...points.map(p => p.y)),
    };
}

/** Values of the major ticks: `count` equal divisions between min and max */
export function majorTickValues(min: number, max: number, count: number): number[] {
    count = Math.max(1, Math.round(count));
    const result: number[] = [];
    for (let i = 0; i <= count; i++) {
        result.push(min + ((max - min) * i) / count);
    }
    return result;
}

/** Number of decimals that the labels of a scale need, so 0, 2.5, 5 is shown as "2.5" and not "2.4999" */
export function decimalsForStep(step: number): number {
    step = Math.abs(step);
    if (!step || !Number.isFinite(step)) {
        return 0;
    }
    for (let d = 0; d < 4; d++) {
        const scaled = step * Math.pow(10, d);
        if (Math.abs(scaled - Math.round(scaled)) < 1e-6) {
            return d;
        }
    }
    return 4;
}

/** Clamps a value into a range */
export function clamp(value: number, min: number, max: number): number {
    if (min > max) {
        [min, max] = [max, min];
    }
    return Math.min(max, Math.max(min, value));
}

let idCounter = 0;

/** Unique id for the `<defs>` of one widget instance (gradients, clip paths) */
export function uniqueId(prefix: string): string {
    idCounter++;
    return `${prefix}-${idCounter.toString(36)}`;
}
