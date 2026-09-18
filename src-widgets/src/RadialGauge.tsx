import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';

import Generic from './Generic';
import GaugeFrame, { fitFontSize, type GaugeTheme } from './Components/GaugeFrame';
import {
    arcBounds,
    arcPath,
    clamp,
    decimalsForStep,
    majorTickValues,
    polar,
    sectorPath,
    uniqueId,
} from './Components/geometry';
import { useAnimatedValue } from './Components/hooks';
import { formatNumber, isTrue, num } from './Components/format';
import { getLevels, type Level } from './Components/levels';
import { shade } from './Components/colors';

interface RadialGaugeRxData {
    noCard?: boolean;
    widgetTitle?: string;
    oid?: string;
    min?: number;
    max?: number;
    unit?: string;
    digitsAfterComma?: number;
    angle?: number;
    rotate?: number;
    majorTicks?: number;
    minorTicks?: number;
    showLabels?: boolean;
    scaleColor?: string;
    label?: string;
    dialColor?: string;
    bezel?: 'none' | 'thin' | 'metal';
    bezelColor?: string;
    needleType?: 'arrow' | 'line' | 'triangle';
    needleColor?: string;
    hubColor?: string;
    showValue?: boolean;
    textColor?: string;
    levelsCount?: number;
    bandWidth?: number;
    animate?: boolean;
    animateDuration?: number;
    animationEasing?: string;
    [key: `color${number}`]: string;
    [key: `levelThreshold${number}`]: number;
}

interface DrawingProps {
    value: number | null;
    min: number;
    max: number;
    valueText: string;
    unit: string;
    label: string;
    sweep: number;
    rotate: number;
    majorTicks: number;
    minorTicks: number;
    showLabels: boolean;
    formatLabel: (v: number) => string;
    scaleColor: string;
    dialColor: string;
    bezel: 'none' | 'thin' | 'metal';
    bezelColor: string;
    needleType: 'arrow' | 'line' | 'triangle';
    needleColor: string;
    hubColor: string;
    showValue: boolean;
    textColor: string;
    levels: Level[];
    bandWidth: number;
    theme: GaugeTheme;
    animate: boolean;
    duration: number;
    easing: string;
}

function Needle(props: {
    type: DrawingProps['needleType'];
    length: number;
    face: number;
    color: string;
}): React.JSX.Element {
    const { length: l, face: f } = props;
    if (props.type === 'line') {
        const w = Math.max(1.5, f * 0.016);
        return (
            <path
                d={`M ${-w / 2} ${f * 0.14} L ${-w / 2} ${-l} L ${w / 2} ${-l} L ${w / 2} ${f * 0.14} Z`}
                fill={props.color}
            />
        );
    }
    if (props.type === 'triangle') {
        const w = Math.max(3, f * 0.06);
        return (
            <path
                d={`M 0 ${-l} L ${w} 0 L ${-w} 0 Z`}
                fill={props.color}
            />
        );
    }
    // arrow: tapering needle with a short tail behind the hub
    const w = Math.max(2, f * 0.035);
    const tail = f * 0.18;
    return (
        <path
            d={`M 0 ${-l} L ${w} ${-l * 0.08} L ${w * 0.55} ${tail} L ${-w * 0.55} ${tail} L ${-w} ${-l * 0.08} Z`}
            fill={props.color}
        />
    );
}

function RadialDrawing(props: DrawingProps & { width: number; height: number }): React.JSX.Element {
    const ids = React.useMemo(() => ({ bezel: uniqueId('radial-bezel'), shadow: uniqueId('radial-shadow') }), []);
    const { min, max } = props;
    const target = props.value === null ? min : clamp(props.value, min, max);
    const value = useAnimatedValue(target, {
        enabled: props.animate,
        duration: props.duration,
        easing: props.easing,
        initial: min,
    });

    const start = -props.sweep / 2 + props.rotate;

    // For a scale that is open at the bottom the value sits in the gap, for a flat one just below the axis
    const openBottom = props.sweep <= 300 && Math.abs(props.rotate) < 45;
    const flat = props.sweep <= 200 && Math.abs(props.rotate) < 30;
    let valueOffset = 0.4;
    if (flat) {
        valueOffset = 0.3;
    } else if (openBottom) {
        valueOffset = 0.52;
    }

    let cx = props.width / 2;
    let cy = props.height / 2;
    let outer = Math.max(1, Math.min(props.width, props.height) / 2 - 2);
    if (props.bezel === 'none') {
        // Without a bezel there is no round dial to show: only the scale and the value are fitted into the widget
        const b = arcBounds(start, start + props.sweep);
        const bottom = Math.max(b.y1, props.showValue ? valueOffset + 0.12 : 0.1);
        const top = Math.min(b.y0, -0.1);
        const r = Math.max(1, Math.min((props.width - 4) / (b.x1 - b.x0), (props.height - 4) / (bottom - top)));
        outer = r;
        cx = props.width / 2 - ((b.x0 + b.x1) / 2) * r;
        cy = props.height / 2 - ((top + bottom) / 2) * r;
    }
    let bezelWidth = 0;
    if (props.bezel === 'metal') {
        bezelWidth = outer * 0.07;
    } else if (props.bezel === 'thin') {
        bezelWidth = Math.max(1.5, outer * 0.02);
    }
    const face = outer - bezelWidth;

    const angleOf = (v: number): number => start + ((v - min) / (max - min)) * props.sweep;

    const scaleRadius = face * 0.92;
    const band = face * props.bandWidth;
    const majorLength = face * 0.12;
    const minorLength = face * 0.06;

    const majors = majorTickValues(min, max, props.majorTicks);
    const ticks: React.JSX.Element[] = [];
    const labels: React.JSX.Element[] = [];
    const full = props.sweep >= 359.99;
    const labelTexts = majors.map(v => props.formatLabel(v));
    const longest = Math.max(...labelTexts.map(t => t.length));
    const labelSize = fitFontSize('0'.repeat(longest), face * 0.11, face * 0.36);
    /** Labels sit inside the ticks; how far in depends on how wide the text is in that direction */
    const labelRadius = (a: number, text: string): number => {
        const halfW = (text.length * labelSize * 0.58) / 2;
        const halfH = labelSize * 0.42;
        const sin = Math.abs(Math.sin((a * Math.PI) / 180));
        const cos = Math.abs(Math.cos((a * Math.PI) / 180));
        const extent = Math.min(sin > 0.001 ? halfW / sin : Infinity, cos > 0.001 ? halfH / cos : Infinity);
        return scaleRadius - majorLength - face * 0.03 - extent;
    };

    majors.forEach((v, i) => {
        const a = angleOf(v);
        const p1 = polar(cx, cy, scaleRadius, a);
        const p2 = polar(cx, cy, scaleRadius - majorLength, a);
        ticks.push(
            <line
                key={`M${i}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                strokeWidth={Math.max(1.2, face * 0.014)}
            />,
        );
        if (props.showLabels && !(full && i === majors.length - 1)) {
            const p = polar(cx, cy, labelRadius(a, labelTexts[i]), a);
            labels.push(
                <text
                    key={`L${i}`}
                    x={p.x}
                    y={p.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                >
                    {labelTexts[i]}
                </text>,
            );
        }
        if (i < majors.length - 1 && props.minorTicks > 1) {
            for (let m = 1; m < props.minorTicks; m++) {
                const mv = v + ((majors[i + 1] - v) * m) / props.minorTicks;
                const q1 = polar(cx, cy, scaleRadius, angleOf(mv));
                const q2 = polar(cx, cy, scaleRadius - minorLength, angleOf(mv));
                ticks.push(
                    <line
                        key={`m${i}-${m}`}
                        x1={q1.x}
                        y1={q1.y}
                        x2={q2.x}
                        y2={q2.y}
                        strokeWidth={Math.max(0.8, face * 0.007)}
                    />,
                );
            }
        }
    });

    const needleLength = scaleRadius - face * 0.03;
    const hub = face * 0.075;
    const valueSize = fitFontSize(`${props.valueText}${props.unit}`, face * 0.17, face * 0.95);

    const valueY = cy + face * valueOffset;

    return (
        <g>
            <defs>
                <linearGradient
                    id={ids.bezel}
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                >
                    <stop
                        offset="0"
                        stopColor="#fafafa"
                    />
                    <stop
                        offset="0.45"
                        stopColor="#c9c9c9"
                    />
                    <stop
                        offset="0.55"
                        stopColor="#b3b3b3"
                    />
                    <stop
                        offset="1"
                        stopColor="#6f6f6f"
                    />
                </linearGradient>
                <filter
                    id={ids.shadow}
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                >
                    <feDropShadow
                        dx={face * 0.012}
                        dy={face * 0.02}
                        stdDeviation={face * 0.015}
                        floodOpacity="0.35"
                    />
                </filter>
            </defs>

            {props.bezel === 'metal' ? (
                <>
                    <circle
                        cx={cx}
                        cy={cy}
                        r={outer}
                        fill={`url(#${ids.bezel})`}
                    />
                    <circle
                        cx={cx}
                        cy={cy}
                        r={face + bezelWidth * 0.25}
                        fill="none"
                        stroke="#777"
                        strokeWidth={bezelWidth * 0.2}
                        opacity={0.6}
                    />
                </>
            ) : null}
            <circle
                cx={cx}
                cy={cy}
                r={face}
                fill={props.dialColor}
                stroke={props.bezel === 'thin' ? props.bezelColor : undefined}
                strokeWidth={props.bezel === 'thin' ? bezelWidth : undefined}
            />

            {props.levels.map((level, i) => (
                <path
                    key={i}
                    d={sectorPath(cx, cy, scaleRadius, scaleRadius - band, angleOf(level.from), angleOf(level.to))}
                    fill={level.color}
                />
            ))}

            <g
                stroke={props.scaleColor}
                strokeLinecap="butt"
            >
                {!props.levels.length ? (
                    <path
                        d={arcPath(cx, cy, scaleRadius, start, start + props.sweep)}
                        fill="none"
                        strokeWidth={Math.max(1, face * 0.008)}
                    />
                ) : null}
                {ticks}
            </g>
            <g
                fill={props.scaleColor}
                fontSize={labelSize}
            >
                {labels}
            </g>

            {props.label ? (
                <text
                    x={cx}
                    y={cy - face * 0.34}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={fitFontSize(props.label, face * 0.1, face * 0.8)}
                    fill={props.theme.secondary}
                >
                    {props.label}
                </text>
            ) : null}

            {props.showValue ? (
                <text
                    x={cx}
                    y={valueY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={valueSize}
                    fill={props.textColor}
                    fontWeight={500}
                >
                    {props.valueText}
                    {props.unit ? (
                        <tspan
                            fontSize={valueSize * 0.6}
                            fill={props.theme.secondary}
                            dx={valueSize * 0.12}
                        >
                            {props.unit}
                        </tspan>
                    ) : null}
                </text>
            ) : null}

            <g
                transform={`translate(${cx} ${cy}) rotate(${angleOf(value)})`}
                filter={`url(#${ids.shadow})`}
            >
                <Needle
                    type={props.needleType}
                    length={needleLength}
                    face={face}
                    color={props.needleColor}
                />
                <circle
                    r={hub}
                    fill={props.hubColor}
                />
                <circle
                    r={hub * 0.4}
                    fill={shade(props.hubColor, 0.35)}
                />
            </g>
        </g>
    );
}

/** `tplGauge2Radial` - the classic round instrument with a scale, colour bands and a needle */
export default class RadialGauge extends Generic<RadialGaugeRxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplGauge2Radial',
            visSet: 'vis-2-widgets-gauges',
            visSetLabel: 'set_label',
            visSetColor: '#334455',
            visWidgetLabel: 'radial',
            visName: 'Radial gauge',
            visHelp: 'help_radial',
            visOrder: 4,
            visAttrs: [
                Generic.commonGroup(),
                Generic.valueGroup(),
                {
                    name: 'scale',
                    label: 'group_scale',
                    fields: [
                        {
                            name: 'angle',
                            type: 'slider',
                            label: 'sweep_angle',
                            tooltip: 'sweep_angle_tooltip',
                            min: 90,
                            max: 360,
                            step: 5,
                            default: 270,
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
                            name: 'majorTicks',
                            type: 'number',
                            label: 'major_ticks',
                            tooltip: 'major_ticks_tooltip',
                            default: 10,
                        },
                        {
                            name: 'minorTicks',
                            type: 'number',
                            label: 'minor_ticks',
                            tooltip: 'minor_ticks_tooltip',
                            default: 5,
                        },
                        { name: 'showLabels', type: 'checkbox', label: 'show_labels', default: true },
                        { name: 'scaleColor', type: 'color', label: 'scale_color' },
                        { name: 'label', label: 'dial_label', tooltip: 'dial_label_tooltip' },
                    ],
                },
                {
                    name: 'dial',
                    label: 'group_dial',
                    fields: [
                        { name: 'dialColor', type: 'color', label: 'dial_color' },
                        {
                            name: 'bezel',
                            type: 'select',
                            label: 'bezel',
                            options: [
                                { value: 'none', label: 'bezel_none' },
                                { value: 'thin', label: 'bezel_thin' },
                                { value: 'metal', label: 'bezel_metal' },
                            ],
                            default: 'metal',
                        },
                        { name: 'bezelColor', type: 'color', label: 'bezel_color', hidden: 'data.bezel !== "thin"' },
                    ],
                },
                {
                    name: 'needle',
                    label: 'group_needle',
                    fields: [
                        {
                            name: 'needleType',
                            type: 'select',
                            label: 'needle_type',
                            options: [
                                { value: 'arrow', label: 'needle_arrow' },
                                { value: 'line', label: 'needle_line' },
                                { value: 'triangle', label: 'needle_triangle' },
                            ],
                            default: 'arrow',
                        },
                        { name: 'needleColor', type: 'color', label: 'needle_color', default: '#d32f2f' },
                        { name: 'hubColor', type: 'color', label: 'hub_color' },
                        { name: 'showValue', type: 'checkbox', label: 'show_value', default: true },
                        { name: 'textColor', type: 'color', label: 'text_color', hidden: '!data.showValue' },
                    ],
                },
                {
                    name: 'colors',
                    label: 'group_colors',
                    fields: [
                        {
                            name: 'levelsCount',
                            type: 'number',
                            label: 'levels_count',
                            tooltip: 'levels_count_zero_tooltip',
                            min: 0,
                            max: 10,
                            default: 3,
                        },
                        {
                            name: 'bandWidth',
                            type: 'slider',
                            label: 'band_width',
                            min: 0.01,
                            max: 0.3,
                            step: 0.01,
                            default: 0.06,
                            hidden: '!data.levelsCount',
                        },
                    ],
                },
                Generic.levelGroup(),
                Generic.animationGroup({ duration: 1000, easing: 'backOut' }),
            ],
            visDefaultStyle: {
                width: '100%',
                height: 240,
                position: 'relative',
                absoluteWidth: 240,
            },
            visPrev: 'widgets/vis-2-widgets-gauges/img/prev_radial_gauge.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return RadialGauge.getWidgetInfo();
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        const data = this.state.rxData;
        const theme = this.getGaugeTheme();
        const { min, max } = this.getRange();
        const { value, text } = this.getMainValue();
        const digits = this.getDigits();
        const isFloatComma = this.isFloatComma();
        const majorTicks = Math.max(1, Math.round(num(data.majorTicks, 10)));
        const labelDigits = decimalsForStep((max - min) / majorTicks);

        let valueText: string;
        if (text !== null) {
            valueText = text;
        } else if (value === null) {
            valueText = '–';
        } else {
            valueText = formatNumber(value, digits, isFloatComma);
        }

        const drawing: DrawingProps = {
            value,
            min,
            max,
            valueText,
            unit: text === null ? data.unit || '' : '',
            label: data.label || '',
            sweep: clamp(num(data.angle, 270), 10, 360),
            rotate: num(data.rotate, 0),
            majorTicks,
            minorTicks: Math.max(0, Math.round(num(data.minorTicks, 5))),
            showLabels: data.showLabels === undefined || isTrue(data.showLabels),
            formatLabel: v => formatNumber(v, labelDigits, isFloatComma),
            scaleColor: data.scaleColor || theme.text,
            // without a bezel the dial has no own background unless a colour is set
            dialColor: data.dialColor || (data.bezel === 'none' ? 'transparent' : theme.dark ? '#1b1b1b' : '#ffffff'),
            bezel: data.bezel || 'metal',
            bezelColor: data.bezelColor || theme.secondary,
            needleType: data.needleType || 'arrow',
            needleColor: data.needleColor || '#d32f2f',
            hubColor: data.hubColor || (theme.dark ? '#9e9e9e' : '#424242'),
            showValue: data.showValue === undefined || isTrue(data.showValue),
            textColor: data.textColor || theme.text,
            levels: getLevels(data, min, max),
            bandWidth: num(data.bandWidth, 0.06),
            theme,
            animate: isTrue(data.animate),
            duration: num(data.animateDuration, 1000),
            easing: data.animationEasing || 'backOut',
        };

        return this.wrapGauge(
            <GaugeFrame fontFamily={theme.fontFamily}>
                {size => (
                    <RadialDrawing
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
