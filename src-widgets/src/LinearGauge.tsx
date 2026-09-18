import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';

import Generic from './Generic';
import GaugeFrame, { fitFontSize, type GaugeTheme } from './Components/GaugeFrame';
import { clamp, decimalsForStep, majorTickValues, uniqueId } from './Components/geometry';
import { useAnimatedValue } from './Components/hooks';
import { formatNumber, isTrue, num } from './Components/format';
import { colorOfLevel, getLevels, gradientStops, type Level } from './Components/levels';

type ColorMode = 'fixed' | 'levels' | 'gradient';

interface LinearGaugeRxData {
    noCard?: boolean;
    widgetTitle?: string;
    oid?: string;
    min?: number;
    max?: number;
    unit?: string;
    digitsAfterComma?: number;
    orientation?: 'horizontal' | 'vertical';
    displayMode?: 'bar' | 'pointer';
    barSize?: number;
    rounded?: boolean;
    trackColor?: string;
    fromZero?: boolean;
    showScale?: boolean;
    majorTicks?: number;
    minorTicks?: number;
    scaleColor?: string;
    colorMode?: ColorMode;
    valueColor?: string;
    levelsCount?: number;
    showValue?: boolean;
    textColor?: string;
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
    vertical: boolean;
    pointer: boolean;
    barSize: number;
    rounded: boolean;
    trackColor: string;
    fromZero: boolean;
    showScale: boolean;
    majorTicks: number;
    minorTicks: number;
    formatLabel: (v: number) => string;
    scaleColor: string;
    colorMode: ColorMode;
    color: string;
    levels: Level[];
    showValue: boolean;
    textColor: string;
    targetColor: string;
    theme: GaugeTheme;
    animate: boolean;
    duration: number;
    easing: string;
}

/** Height of the triangle of the pointer mode - big enough to be seen next to a thin bar */
function pointerSize(barThickness: number): number {
    return Math.max(8, barThickness * 0.8);
}

function LinearDrawing(props: DrawingProps & { width: number; height: number }): React.JSX.Element {
    const ids = React.useMemo(() => ({ gradient: uniqueId('linear-gradient'), clip: uniqueId('linear-clip') }), []);
    const { min, max, width: w, height: h, vertical } = props;
    const shown = props.value === null ? min : clamp(props.value, min, max);
    const zero = props.fromZero ? clamp(0, min, max) : min;
    const value = useAnimatedValue(shown, {
        enabled: props.animate,
        duration: props.duration,
        easing: props.easing,
        initial: zero,
    });

    const pad = 4;
    const cross = vertical ? w : h;
    const along = vertical ? h : w;
    const fontSize = clamp(Math.min(cross * 0.16, along * 0.06), 9, 18);
    const valueFont = fontSize * 1.5;
    const majors = majorTickValues(min, max, props.majorTicks);
    const labels = majors.map(v => props.formatLabel(v));
    const labelWidth = Math.max(...labels.map(t => t.length)) * fontSize * 0.58;
    const tickLength = fontSize * 0.55;

    // Space around the bar: the value on top, the scale below (horizontal) or right of it (vertical)
    const valueSpace = props.showValue ? valueFont * 1.35 : 0;
    const scaleSpace = props.showScale ? tickLength + 3 + (vertical ? labelWidth + 2 : fontSize * 1.2) : 0;

    let barThickness: number;
    let x0: number;
    let x1: number;
    let barCross: number;
    if (vertical) {
        const free = w - 2 * pad - scaleSpace;
        barThickness = Math.max(4, Math.min(free, along * 0.35) * clamp(props.barSize, 0.05, 1));
        const groupWidth = barThickness + scaleSpace + (props.pointer ? pointerSize(barThickness) + 3 : 0);
        barCross = (w - groupWidth) / 2 + (props.pointer ? pointerSize(barThickness) + 3 : 0);
        x0 = h - pad - fontSize * 0.6; // bottom = min
        x1 = pad + valueSpace + fontSize * 0.6; // top = max
    } else {
        const free = h - 2 * pad - valueSpace - scaleSpace;
        barThickness = Math.max(6, Math.min(free, along * 0.15) * clamp(props.barSize, 0.05, 1));
        const pointerRoom = props.pointer ? pointerSize(barThickness) + 3 : 0;
        const groupHeight = pointerRoom + barThickness + scaleSpace;
        barCross = pad + valueSpace + (h - 2 * pad - valueSpace - groupHeight) / 2 + pointerRoom;
        const side = props.showScale ? labelWidth / 2 : 2;
        x0 = pad + side;
        x1 = w - pad - side;
    }

    /** Position of a value along the bar */
    const posOf = (v: number): number => x0 + ((clamp(v, min, max) - min) / (max - min)) * (x1 - x0);
    /** A rectangle between two positions along the bar */
    const rectAlong = (
        p0: number,
        p1: number,
        c0: number,
        thickness: number,
    ): { x: number; y: number; width: number; height: number } => {
        const a = Math.min(p0, p1);
        const b = Math.max(p0, p1);
        return vertical
            ? { x: c0, y: a, width: thickness, height: b - a }
            : { x: a, y: c0, width: b - a, height: thickness };
    };

    const radius = props.rounded ? barThickness / 2 : 0;
    const track = rectAlong(x0, x1, barCross, barThickness);
    const pZero = posOf(zero);
    const pValue = posOf(value);
    const fill = rectAlong(pZero, pValue, barCross, barThickness);

    let fillColor = props.color;
    if (props.colorMode === 'levels') {
        fillColor = colorOfLevel(props.levels, value, props.color);
    } else if (props.colorMode === 'gradient' && props.levels.length) {
        fillColor = `url(#${ids.gradient})`;
    }
    const stops = gradientStops(props.levels, min, max);

    const bar: React.JSX.Element[] = [];
    if (props.pointer) {
        // Pointer mode: the whole scale shows its levels, a triangle points at the value
        if (props.levels.length) {
            props.levels.forEach((level, i) => {
                bar.push(
                    <rect
                        key={i}
                        {...rectAlong(posOf(level.from), posOf(level.to), barCross, barThickness)}
                        fill={level.color}
                        clipPath={`url(#${ids.clip})`}
                    />,
                );
            });
        } else {
            bar.push(
                <rect
                    key="track"
                    {...track}
                    rx={radius}
                    fill={props.color}
                />,
            );
        }
        const t = pointerSize(barThickness);
        const tip = pValue;
        const d = vertical
            ? `M ${barCross - 2} ${tip} L ${barCross - 2 - t} ${tip - t * 0.6} L ${barCross - 2 - t} ${tip + t * 0.6} Z`
            : `M ${tip} ${barCross - 2} L ${tip - t * 0.6} ${barCross - 2 - t} L ${tip + t * 0.6} ${barCross - 2 - t} Z`;
        bar.push(
            <path
                key="pointer"
                d={d}
                fill={props.textColor}
            />,
        );
    } else {
        bar.push(
            <rect
                key="track"
                {...track}
                rx={radius}
                fill={props.trackColor}
            />,
        );
        if (Math.abs(pValue - pZero) > 0.5) {
            bar.push(
                <rect
                    key="fill"
                    {...fill}
                    fill={fillColor}
                    clipPath={`url(#${ids.clip})`}
                />,
            );
        }
    }

    // Scale: major ticks with labels and the minor ticks between them
    const scale: React.JSX.Element[] = [];
    if (props.showScale) {
        const base = barCross + barThickness + 3;
        majors.forEach((v, i) => {
            const p = posOf(v);
            scale.push(
                vertical ? (
                    <line
                        key={`M${i}`}
                        x1={base}
                        x2={base + tickLength}
                        y1={p}
                        y2={p}
                    />
                ) : (
                    <line
                        key={`M${i}`}
                        x1={p}
                        x2={p}
                        y1={base}
                        y2={base + tickLength}
                    />
                ),
            );
            scale.push(
                <text
                    key={`L${i}`}
                    x={vertical ? base + tickLength + 3 : p}
                    y={vertical ? p : base + tickLength + fontSize * 0.55}
                    textAnchor={vertical ? 'start' : 'middle'}
                    dominantBaseline={vertical ? 'central' : 'hanging'}
                    stroke="none"
                >
                    {labels[i]}
                </text>,
            );
            if (i < majors.length - 1 && props.minorTicks > 1) {
                for (let m = 1; m < props.minorTicks; m++) {
                    const q = posOf(v + ((majors[i + 1] - v) * m) / props.minorTicks);
                    scale.push(
                        vertical ? (
                            <line
                                key={`m${i}-${m}`}
                                x1={base}
                                x2={base + tickLength * 0.55}
                                y1={q}
                                y2={q}
                            />
                        ) : (
                            <line
                                key={`m${i}-${m}`}
                                x1={q}
                                x2={q}
                                y1={base}
                                y2={base + tickLength * 0.55}
                            />
                        ),
                    );
                }
            }
        });
    }

    let marker: React.JSX.Element | null = null;
    if (props.target !== null && Number.isFinite(props.target)) {
        const p = posOf(props.target);
        const ext = Math.max(3, barThickness * 0.25);
        marker = vertical ? (
            <line
                x1={barCross - ext}
                x2={barCross + barThickness + ext}
                y1={p}
                y2={p}
                stroke={props.targetColor}
                strokeWidth={Math.max(2, barThickness * 0.12)}
                strokeLinecap="round"
            />
        ) : (
            <line
                x1={p}
                x2={p}
                y1={barCross - ext}
                y2={barCross + barThickness + ext}
                stroke={props.targetColor}
                strokeWidth={Math.max(2, barThickness * 0.12)}
                strokeLinecap="round"
            />
        );
    }

    const valueFontFit = fitFontSize(`${props.valueText} ${props.unit}`, valueFont, vertical ? w - 2 * pad : w * 0.6);

    return (
        <g>
            <defs>
                <clipPath id={ids.clip}>
                    <rect
                        {...track}
                        rx={radius}
                    />
                </clipPath>
                {props.levels.length ? (
                    <linearGradient
                        id={ids.gradient}
                        gradientUnits="userSpaceOnUse"
                        x1={vertical ? 0 : x0}
                        x2={vertical ? 0 : x1}
                        y1={vertical ? x0 : 0}
                        y2={vertical ? x1 : 0}
                    >
                        {stops.map((s, i) => (
                            <stop
                                key={i}
                                offset={s.offset}
                                stopColor={s.color}
                            />
                        ))}
                    </linearGradient>
                ) : null}
            </defs>
            {bar}
            {marker}
            <g
                stroke={props.scaleColor}
                fill={props.scaleColor}
                fontSize={fontSize}
                strokeWidth={1}
            >
                {scale}
            </g>
            {props.showValue ? (
                <text
                    x={vertical ? w / 2 : x1}
                    y={pad + valueSpace * 0.5}
                    textAnchor={vertical ? 'middle' : 'end'}
                    dominantBaseline="central"
                    fontSize={valueFontFit}
                    fontWeight={500}
                    fill={props.textColor}
                >
                    {props.valueText}
                    {props.unit ? (
                        <tspan
                            fontSize={valueFontFit * 0.65}
                            fill={props.theme.secondary}
                            dx={valueFontFit * 0.15}
                        >
                            {props.unit}
                        </tspan>
                    ) : null}
                </text>
            ) : null}
        </g>
    );
}

/** `tplGauge2Linear` - a horizontal or vertical bar with a scale */
export default class LinearGauge extends Generic<LinearGaugeRxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplGauge2Linear',
            visSet: 'vis-2-widgets-gauges',
            visSetLabel: 'set_label',
            visSetColor: '#334455',
            visWidgetLabel: 'linear',
            visName: 'Linear gauge',
            visHelp: 'help_linear',
            visOrder: 6,
            visAttrs: [
                Generic.commonGroup(),
                Generic.valueGroup(),
                {
                    name: 'layout',
                    label: 'group_layout',
                    fields: [
                        {
                            name: 'orientation',
                            type: 'select',
                            label: 'orientation',
                            options: [
                                { value: 'horizontal', label: 'horizontal' },
                                { value: 'vertical', label: 'vertical' },
                            ],
                            default: 'horizontal',
                        },
                        {
                            name: 'displayMode',
                            type: 'select',
                            label: 'display_mode',
                            tooltip: 'display_mode_tooltip',
                            options: [
                                { value: 'bar', label: 'display_bar' },
                                { value: 'pointer', label: 'display_pointer' },
                            ],
                            default: 'bar',
                        },
                        {
                            name: 'barSize',
                            type: 'slider',
                            label: 'bar_size',
                            tooltip: 'bar_size_tooltip',
                            min: 0.05,
                            max: 1,
                            step: 0.05,
                            default: 0.8,
                        },
                        { name: 'rounded', type: 'checkbox', label: 'rounded', default: true },
                        {
                            name: 'trackColor',
                            type: 'color',
                            label: 'track_color',
                            hidden: 'data.displayMode === "pointer"',
                        },
                        {
                            name: 'fromZero',
                            type: 'checkbox',
                            label: 'from_zero',
                            tooltip: 'from_zero_tooltip',
                            hidden: 'data.displayMode === "pointer"',
                        },
                    ],
                },
                {
                    name: 'scale',
                    label: 'group_scale',
                    fields: [
                        { name: 'showScale', type: 'checkbox', label: 'show_scale', default: true },
                        {
                            name: 'majorTicks',
                            type: 'number',
                            label: 'major_ticks',
                            tooltip: 'major_ticks_tooltip',
                            default: 5,
                            hidden: '!data.showScale',
                        },
                        {
                            name: 'minorTicks',
                            type: 'number',
                            label: 'minor_ticks',
                            tooltip: 'minor_ticks_tooltip',
                            default: 4,
                            hidden: '!data.showScale',
                        },
                        { name: 'scaleColor', type: 'color', label: 'scale_color', hidden: '!data.showScale' },
                    ],
                },
                ...Generic.colorGroups(['fixed', 'levels', 'gradient'], 'gradient', '#1976d2'),
                {
                    name: 'text',
                    label: 'group_text',
                    fields: [
                        { name: 'showValue', type: 'checkbox', label: 'show_value', default: true },
                        { name: 'textColor', type: 'color', label: 'text_color' },
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
                height: 120,
                position: 'relative',
                absoluteWidth: 320,
            },
            visPrev: 'widgets/vis-2-widgets-gauges/img/prev_linear_gauge.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return LinearGauge.getWidgetInfo();
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        const data = this.state.rxData;
        const theme = this.getGaugeTheme();
        const { min, max } = this.getRange();
        const { value, text } = this.getMainValue();
        const isFloatComma = this.isFloatComma();
        const majorTicks = Math.max(1, Math.round(num(data.majorTicks, 5)));
        const labelDigits = decimalsForStep((max - min) / majorTicks);

        let valueText: string;
        if (text !== null) {
            valueText = text;
        } else if (value === null) {
            valueText = '–';
        } else {
            valueText = formatNumber(value, this.getDigits(), isFloatComma);
        }

        const drawing: DrawingProps = {
            value,
            target: this.getNumberOf('targetOid'),
            min,
            max,
            valueText,
            unit: text === null ? data.unit || '' : '',
            vertical: data.orientation === 'vertical',
            pointer: data.displayMode === 'pointer',
            barSize: num(data.barSize, 0.8),
            rounded: data.rounded === undefined || isTrue(data.rounded),
            trackColor: data.trackColor || theme.track,
            fromZero: isTrue(data.fromZero),
            showScale: data.showScale === undefined || isTrue(data.showScale),
            majorTicks,
            minorTicks: Math.max(0, Math.round(num(data.minorTicks, 4))),
            formatLabel: v => formatNumber(v, labelDigits, isFloatComma),
            scaleColor: data.scaleColor || theme.secondary,
            colorMode: data.colorMode || 'gradient',
            color: data.valueColor || theme.primary,
            levels: getLevels(data, min, max),
            showValue: data.showValue === undefined || isTrue(data.showValue),
            textColor: data.textColor || theme.text,
            targetColor: data.targetColor || theme.text,
            theme,
            animate: isTrue(data.animate),
            duration: num(data.animateDuration, 800),
            easing: data.animationEasing || 'cubicOut',
        };

        return this.wrapGauge(
            <GaugeFrame fontFamily={theme.fontFamily}>
                {size => (
                    <LinearDrawing
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
