import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';

import Generic from './Generic';
import GaugeFrame, { fitFontSize, type GaugeTheme } from './Components/GaugeFrame';
import { arcBounds, arcPath, clamp, polar, sectorPath } from './Components/geometry';
import { useAnimatedValue } from './Components/hooks';
import { formatNumber, isTrue, num } from './Components/format';
import { colorOfGradient, colorOfLevel, getLevels, type Level } from './Components/levels';

type ColorMode = 'fixed' | 'levels' | 'gradient';

interface ArcGaugeRxData {
    noCard?: boolean;
    widgetTitle?: string;
    oid?: string;
    min?: number;
    max?: number;
    unit?: string;
    digitsAfterComma?: number;
    angle?: number;
    rotate?: number;
    arcWidth?: number;
    roundedCaps?: boolean;
    trackColor?: string;
    segments?: number;
    segmentGap?: number;
    fromZero?: boolean;
    colorMode?: ColorMode;
    valueColor?: string;
    levelsCount?: number;
    showValue?: boolean;
    textColor?: string;
    valueSize?: number;
    subText?: string;
    showMinMax?: boolean;
    targetOid?: string;
    targetColor?: string;
    animate?: boolean;
    animateDuration?: number;
    animationEasing?: string;
    [key: `color${number}`]: string;
    [key: `levelThreshold${number}`]: number;
}

interface DrawingProps {
    value: number | null;
    target: number | null;
    min: number;
    max: number;
    valueText: string;
    unit: string;
    subText: string;
    minText: string | null;
    maxText: string | null;
    sweep: number;
    rotate: number;
    arcWidth: number;
    rounded: boolean;
    trackColor: string;
    segments: number;
    segmentGap: number;
    fromZero: boolean;
    colorMode: ColorMode;
    color: string;
    levels: Level[];
    showValue: boolean;
    textColor: string;
    valueSize: number;
    targetColor: string;
    theme: GaugeTheme;
    animate: boolean;
    duration: number;
    easing: string;
}

function ArcDrawing(props: DrawingProps & { width: number; height: number }): React.JSX.Element {
    const { min, max } = props;
    const shown = props.value === null ? min : clamp(props.value, min, max);
    const value = useAnimatedValue(shown, {
        enabled: props.animate,
        duration: props.duration,
        easing: props.easing,
        initial: props.fromZero ? clamp(0, min, max) : min,
    });

    const start = -props.sweep / 2 + props.rotate;
    const end = start + props.sweep;
    const angleOf = (v: number): number => start + ((clamp(v, min, max) - min) / (max - min)) * props.sweep;

    // Fit the arc (and the text in its middle) into the widget
    const flat = props.sweep <= 200 && Math.abs(props.rotate) < 30;
    const widthPart = clamp(props.arcWidth, 0.02, 0.8);
    const b = arcBounds(start, end);
    let bottom = b.y1;
    if (flat) {
        // the value stands on the line through the center, the text below it needs room
        bottom = Math.max(bottom, props.subText ? 0.32 : 0.08);
    }
    if (props.minText !== null && props.sweep < 359) {
        const endY = Math.max(polar(0, 0, 1 - widthPart / 2, start).y, polar(0, 0, 1 - widthPart / 2, end).y);
        bottom = Math.max(bottom, endY + widthPart / 2 + 0.2);
    }
    const top = Math.min(b.y0, -0.35);
    // room for the round caps and for the triangle of the target marker
    const extra = props.target !== null ? 0.14 : 0.04;
    const boxW = b.x1 - b.x0 + 2 * extra;
    const boxH = bottom - top + 2 * extra;
    const r = Math.max(1, Math.min(props.width / boxW, props.height / boxH));
    const cx = props.width / 2 - ((b.x0 + b.x1) / 2) * r;
    const cy = props.height / 2 - ((top + bottom) / 2) * r;

    const band = r * widthPart;
    const mid = r - band / 2;
    const zero = props.fromZero ? clamp(0, min, max) : min;

    const colorAt = (v: number): string => {
        if (props.colorMode === 'levels') {
            return colorOfLevel(props.levels, v, props.color);
        }
        if (props.colorMode === 'gradient') {
            return colorOfGradient(props.levels, v, props.color);
        }
        return props.color;
    };

    const parts: React.JSX.Element[] = [];
    const lo = Math.min(zero, value);
    const hi = Math.max(zero, value);

    if (props.segments > 0) {
        // LED look: single segments, every one lit in the colour of its own place on the scale
        const n = Math.round(props.segments);
        const gap = clamp(props.segmentGap, 0, props.sweep / n / 2);
        const span = props.sweep / n;
        for (let i = 0; i < n; i++) {
            const from = start + i * span + gap / 2;
            const to = start + (i + 1) * span - gap / 2;
            const centerValue = min + ((i + 0.5) / n) * (max - min);
            const lit = centerValue >= lo && centerValue <= hi && hi > lo;
            parts.push(
                <path
                    key={i}
                    d={sectorPath(cx, cy, r, r - band, from, to, props.rounded ? band * 0.15 : 0)}
                    fill={lit ? colorAt(centerValue) : props.trackColor}
                />,
            );
        }
    } else {
        const cap = props.rounded ? 'round' : 'butt';
        parts.push(
            <path
                key="track"
                d={arcPath(cx, cy, mid, start, end)}
                fill="none"
                stroke={props.trackColor}
                strokeWidth={band}
                strokeLinecap={cap}
            />,
        );
        const a0 = angleOf(lo);
        const a1 = angleOf(hi);
        if (a1 - a0 > 0.3) {
            if (props.colorMode === 'gradient' && props.levels.length > 1) {
                // A gradient along the arc: short pieces in their own colour, the caps as dots at both ends
                const steps = Math.max(2, Math.ceil((a1 - a0) / 3));
                for (let i = 0; i < steps; i++) {
                    const from = a0 + ((a1 - a0) * i) / steps;
                    const to = a0 + ((a1 - a0) * (i + 1)) / steps;
                    const v = lo + ((hi - lo) * (i + 0.5)) / steps;
                    parts.push(
                        <path
                            key={`g${i}`}
                            d={arcPath(cx, cy, mid, from, Math.min(a1, to + 0.4))}
                            fill="none"
                            stroke={colorAt(v)}
                            strokeWidth={band}
                        />,
                    );
                }
                if (props.rounded) {
                    const p0 = polar(cx, cy, mid, a0);
                    const p1 = polar(cx, cy, mid, a1);
                    parts.push(
                        <circle
                            key="c0"
                            cx={p0.x}
                            cy={p0.y}
                            r={band / 2}
                            fill={colorAt(lo)}
                        />,
                        <circle
                            key="c1"
                            cx={p1.x}
                            cy={p1.y}
                            r={band / 2}
                            fill={colorAt(hi)}
                        />,
                    );
                }
            } else {
                parts.push(
                    <path
                        key="value"
                        d={arcPath(cx, cy, mid, a0, a1)}
                        fill="none"
                        stroke={colorAt(value)}
                        strokeWidth={band}
                        strokeLinecap={cap}
                    />,
                );
            }
        }
    }

    // Marker of the target value: a line across the arc with a small triangle outside of it
    let marker: React.JSX.Element | null = null;
    if (props.target !== null && Number.isFinite(props.target)) {
        const a = angleOf(props.target);
        const p1 = polar(cx, cy, r + band * 0.15, a);
        const p2 = polar(cx, cy, r - band * 1.15, a);
        const t = Math.max(3, band * 0.35);
        const tip = polar(cx, cy, r + band * 0.2, a);
        const l = polar(cx, cy, r + band * 0.2 + t * 1.2, a - (t / r) * 57.3 * 0.7);
        const rr = polar(cx, cy, r + band * 0.2 + t * 1.2, a + (t / r) * 57.3 * 0.7);
        marker = (
            <g>
                <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={props.targetColor}
                    strokeWidth={Math.max(2, band * 0.12)}
                    strokeLinecap="round"
                />
                <path
                    d={`M ${tip.x} ${tip.y} L ${l.x} ${l.y} L ${rr.x} ${rr.y} Z`}
                    fill={props.targetColor}
                />
            </g>
        );
    }

    const inner = r - band;
    const valueFont = fitFontSize(
        `${props.valueText}${props.unit ? ` ${props.unit}` : ''}`,
        r * props.valueSize,
        inner * 1.6,
    );
    const subFont = fitFontSize(props.subText, r * 0.12, inner * 1.5);
    const valueY = flat ? cy - valueFont * 0.1 : cy + (props.subText ? -subFont * 0.4 : 0);
    const labelFont = Math.max(8, r * 0.1);
    const endLabel = (a: number, text: string, key: string): React.JSX.Element => {
        const p = polar(cx, cy, mid, a);
        return (
            <text
                key={key}
                x={p.x}
                y={p.y + band / 2 + labelFont * 0.9}
                textAnchor="middle"
                dominantBaseline="central"
            >
                {text}
            </text>
        );
    };

    return (
        <g>
            {parts}
            {marker}
            {props.showValue ? (
                <text
                    x={cx}
                    y={valueY}
                    textAnchor="middle"
                    dominantBaseline={flat ? 'alphabetic' : 'central'}
                    fontSize={valueFont}
                    fontWeight={500}
                    fill={props.textColor}
                >
                    {props.valueText}
                    {props.unit ? (
                        <tspan
                            fontSize={valueFont * 0.5}
                            fill={props.theme.secondary}
                            dx={valueFont * 0.08}
                        >
                            {props.unit}
                        </tspan>
                    ) : null}
                </text>
            ) : null}
            {props.subText ? (
                <text
                    x={cx}
                    y={flat ? cy + subFont * 1.2 : valueY + valueFont * 0.55 + subFont * 0.6}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={subFont}
                    fill={props.theme.secondary}
                >
                    {props.subText}
                </text>
            ) : null}
            {props.minText !== null && props.sweep < 359 ? (
                <g
                    fontSize={labelFont}
                    fill={props.theme.secondary}
                >
                    {endLabel(start, props.minText, 'min')}
                    {endLabel(end, props.maxText || '', 'max')}
                </g>
            ) : null}
        </g>
    );
}

/** `tplGauge2Arc` - a modern arc with the value in its middle, optional in single segments like LEDs */
export default class ArcGauge extends Generic<ArcGaugeRxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplGauge2Arc',
            visSet: 'vis-2-widgets-gauges',
            visSetLabel: 'set_label',
            visSetColor: '#334455',
            visWidgetLabel: 'arc',
            visName: 'Arc gauge',
            visHelp: 'help_arc',
            visOrder: 5,
            visAttrs: [
                Generic.commonGroup(),
                Generic.valueGroup(),
                {
                    name: 'arc',
                    label: 'group_arc',
                    fields: [
                        {
                            name: 'angle',
                            type: 'slider',
                            label: 'sweep_angle',
                            tooltip: 'sweep_angle_tooltip',
                            min: 90,
                            max: 360,
                            step: 5,
                            default: 240,
                        },
                        {
                            name: 'rotate',
                            type: 'slider',
                            label: 'rotate',
                            tooltip: 'rotate_tooltip',
                            min: -180,
                            max: 180,
                            step: 5,
                            default: 0,
                        },
                        {
                            name: 'arcWidth',
                            type: 'slider',
                            label: 'arc_width',
                            tooltip: 'arc_width_tooltip',
                            min: 0.02,
                            max: 0.6,
                            step: 0.01,
                            default: 0.16,
                        },
                        { name: 'roundedCaps', type: 'checkbox', label: 'rounded_caps', default: true },
                        { name: 'trackColor', type: 'color', label: 'track_color' },
                        {
                            name: 'segments',
                            type: 'number',
                            label: 'segments',
                            tooltip: 'segments_tooltip',
                            min: 0,
                            max: 100,
                            default: 0,
                        },
                        {
                            name: 'segmentGap',
                            type: 'slider',
                            label: 'segment_gap',
                            tooltip: 'segment_gap_tooltip',
                            min: 0,
                            max: 10,
                            step: 0.5,
                            default: 2,
                            hidden: '!data.segments',
                        },
                        { name: 'fromZero', type: 'checkbox', label: 'from_zero', tooltip: 'from_zero_tooltip' },
                    ],
                },
                ...Generic.colorGroups(['fixed', 'levels', 'gradient'], 'levels', '#1976d2'),
                {
                    name: 'text',
                    label: 'group_text',
                    fields: [
                        { name: 'showValue', type: 'checkbox', label: 'show_value', default: true },
                        { name: 'textColor', type: 'color', label: 'text_color', hidden: '!data.showValue' },
                        {
                            name: 'valueSize',
                            type: 'slider',
                            label: 'value_size',
                            tooltip: 'value_size_tooltip',
                            min: 0.1,
                            max: 0.8,
                            step: 0.01,
                            default: 0.36,
                            hidden: '!data.showValue',
                        },
                        { name: 'subText', label: 'sub_text', tooltip: 'sub_text_tooltip' },
                        { name: 'showMinMax', type: 'checkbox', label: 'show_min_max', default: true },
                    ],
                },
                {
                    name: 'target',
                    label: 'group_target',
                    fields: [
                        { name: 'targetOid', type: 'id', label: 'target_oid', tooltip: 'target_oid_tooltip' },
                        { name: 'targetColor', type: 'color', label: 'target_color' },
                    ],
                },
                Generic.animationGroup({ duration: 800, easing: 'cubicOut' }),
            ],
            visDefaultStyle: {
                width: '100%',
                height: 220,
                position: 'relative',
                absoluteWidth: 240,
            },
            visPrev: 'widgets/vis-2-widgets-gauges/img/prev_arc_gauge.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return ArcGauge.getWidgetInfo();
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        const data = this.state.rxData;
        const theme = this.getGaugeTheme();
        const { min, max } = this.getRange();
        const { value, text } = this.getMainValue();
        const isFloatComma = this.isFloatComma();

        let valueText: string;
        if (text !== null) {
            valueText = text;
        } else if (value === null) {
            valueText = '–';
        } else {
            valueText = formatNumber(value, this.getDigits(), isFloatComma);
        }
        const showMinMax = data.showMinMax === undefined || isTrue(data.showMinMax);

        const drawing: DrawingProps = {
            value,
            target: this.getNumberOf('targetOid'),
            min,
            max,
            valueText,
            unit: text === null ? data.unit || '' : '',
            subText: data.subText || '',
            minText: showMinMax ? formatNumber(min, null, isFloatComma) : null,
            maxText: showMinMax ? formatNumber(max, null, isFloatComma) : null,
            sweep: clamp(num(data.angle, 240), 10, 360),
            rotate: num(data.rotate, 0),
            arcWidth: num(data.arcWidth, 0.16),
            rounded: data.roundedCaps === undefined || isTrue(data.roundedCaps),
            trackColor: data.trackColor || theme.track,
            segments: Math.max(0, Math.round(num(data.segments, 0))),
            segmentGap: num(data.segmentGap, 2),
            fromZero: isTrue(data.fromZero),
            colorMode: data.colorMode || 'levels',
            color: data.valueColor || theme.primary,
            levels: getLevels(data, min, max),
            showValue: data.showValue === undefined || isTrue(data.showValue),
            textColor: data.textColor || theme.text,
            valueSize: num(data.valueSize, 0.36),
            targetColor: data.targetColor || theme.text,
            theme,
            animate: isTrue(data.animate),
            duration: num(data.animateDuration, 800),
            easing: data.animationEasing || 'cubicOut',
        };

        return this.wrapGauge(
            <GaugeFrame fontFamily={theme.fontFamily}>
                {size => (
                    <ArcDrawing
                        {...drawing}
                        width={size.width}
                        height={size.height}
                    />
                )}
            </GaugeFrame>,
            props,
        );
    }
}
