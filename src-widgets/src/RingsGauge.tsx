import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';

import Generic from './Generic';
import GaugeFrame, { fitFontSize, type GaugeTheme } from './Components/GaugeFrame';
import { arcPath, clamp } from './Components/geometry';
import { useAnimatedValue } from './Components/hooks';
import { formatNumber, isTrue, num, toNumber } from './Components/format';
import { withAlpha } from './Components/colors';

interface RingsGaugeRxData {
    noCard?: boolean;
    widgetTitle?: string;
    ringsCount?: number;
    angle?: number;
    rotate?: number;
    ringWidth?: number;
    ringGap?: number;
    roundedCaps?: boolean;
    trackOpacity?: number;
    legend?: 'gap' | 'side' | 'none';
    centerText?: string;
    textColor?: string;
    animate?: boolean;
    animateDuration?: number;
    animationEasing?: string;
    [key: `oid${number}`]: string;
    [key: `label${number}`]: string;
    [key: `min${number}`]: number;
    [key: `max${number}`]: number;
    [key: `unit${number}`]: string;
    [key: `digits${number}`]: number;
    [key: `color${number}`]: string;
}

/** Colours of the rings if none are set */
export const RING_COLORS = ['#e53935', '#43a047', '#1e88e5', '#fb8c00', '#8e24aa'];

interface Ring {
    fraction: number;
    label: string;
    valueText: string;
    unit: string;
    color: string;
}

interface DrawingProps {
    rings: Ring[];
    sweep: number;
    rotate: number;
    ringWidth: number;
    ringGap: number;
    rounded: boolean;
    trackOpacity: number;
    legend: 'gap' | 'side' | 'none';
    centerText: string;
    textColor: string;
    theme: GaugeTheme;
    animate: boolean;
    duration: number;
    easing: string;
}

function RingArc(props: {
    cx: number;
    cy: number;
    radius: number;
    width: number;
    start: number;
    sweep: number;
    fraction: number;
    color: string;
    trackOpacity: number;
    rounded: boolean;
    animate: boolean;
    duration: number;
    easing: string;
}): React.JSX.Element {
    const fraction = useAnimatedValue(clamp(props.fraction, 0, 1), {
        enabled: props.animate,
        duration: props.duration,
        easing: props.easing,
        initial: 0,
    });
    const cap = props.rounded ? 'round' : 'butt';
    return (
        <g
            fill="none"
            strokeWidth={props.width}
            strokeLinecap={cap}
        >
            <path
                d={arcPath(props.cx, props.cy, props.radius, props.start, props.start + props.sweep)}
                stroke={withAlpha(props.color, props.trackOpacity)}
            />
            {fraction * props.sweep > 0.5 ? (
                <path
                    d={arcPath(props.cx, props.cy, props.radius, props.start, props.start + fraction * props.sweep)}
                    stroke={props.color}
                />
            ) : null}
        </g>
    );
}

function RingsDrawing(props: DrawingProps & { width: number; height: number }): React.JSX.Element {
    const { width: w, height: h, rings } = props;
    const count = rings.length;
    const start = -props.sweep / 2 + props.rotate;
    const startNormalized = ((start % 360) + 360) % 360;

    // Labels in the free quarter work only if the rings start at the top and leave the upper left free
    let legend = props.legend;
    if (legend === 'gap' && !(Math.abs(startNormalized) < 1 || Math.abs(startNormalized - 360) < 1)) {
        legend = 'side';
    }
    if (legend === 'gap' && props.sweep > 300) {
        legend = 'side';
    }

    const fontSize = clamp(Math.min(w, h) * 0.065, 9, 16);
    const legendRight = legend === 'side' && w >= h * 1.25;
    const legendBottom = legend === 'side' && !legendRight;
    const legendWidth = legendRight ? Math.min(w * 0.45, fontSize * 12) : 0;
    const legendHeight = legendBottom ? count * fontSize * 1.5 + 4 : 0;

    const areaW = w - legendWidth;
    const areaH = h - legendHeight;
    const outer = Math.max(4, Math.min(areaW, areaH) / 2 - 2);
    const cx = legendRight ? areaW / 2 : w / 2;
    const cy = areaH / 2;

    const ringWidth = outer * clamp(props.ringWidth, 0.02, 0.5);
    const gap = outer * clamp(props.ringGap, 0, 0.3);
    const rounded = props.rounded;

    const arcs = rings.map((ring, i) => {
        const radius = outer - ringWidth / 2 - i * (ringWidth + gap);
        return radius > ringWidth / 2 ? (
            <RingArc
                key={i}
                cx={cx}
                cy={cy}
                radius={radius}
                width={ringWidth}
                start={start}
                sweep={props.sweep}
                fraction={ring.fraction}
                color={ring.color}
                trackOpacity={props.trackOpacity}
                rounded={rounded}
                animate={props.animate}
                duration={props.duration}
                easing={props.easing}
            />
        ) : null;
    });

    const labels: React.JSX.Element[] = [];
    if (legend === 'gap') {
        // right-aligned in front of the start of every ring
        const size = Math.min(ringWidth * 0.8, fontSize * 1.2);
        rings.forEach((ring, i) => {
            const radius = outer - ringWidth / 2 - i * (ringWidth + gap);
            const text = `${ring.label ? `${ring.label}  ` : ''}${ring.valueText}${ring.unit ? ` ${ring.unit}` : ''}`;
            labels.push(
                <text
                    key={i}
                    x={cx - ringWidth * (rounded ? 0.7 : 0.25)}
                    y={cy - radius}
                    textAnchor="end"
                    dominantBaseline="central"
                    fontSize={fitFontSize(text, size, outer * 0.95)}
                    fill={props.textColor}
                >
                    {ring.label ? <tspan fill={props.theme.secondary}>{ring.label} </tspan> : null}
                    <tspan
                        fontWeight={600}
                        fill={ring.color}
                    >
                        {ring.valueText}
                    </tspan>
                    {ring.unit ? <tspan fill={props.theme.secondary}> {ring.unit}</tspan> : null}
                </text>,
            );
        });
    } else if (legend === 'side') {
        const x = legendRight ? areaW + 4 : fontSize;
        const lineHeight = fontSize * 1.5;
        const top = legendRight ? cy - (count * lineHeight) / 2 + lineHeight / 2 : areaH + lineHeight / 2 + 2;
        const maxWidth = legendRight ? legendWidth - 8 : w - 2 * fontSize;
        rings.forEach((ring, i) => {
            const y = top + i * lineHeight;
            const text = `${ring.label} ${ring.valueText} ${ring.unit}`;
            const size = fitFontSize(text, fontSize, maxWidth - fontSize * 1.2);
            labels.push(
                <g key={i}>
                    <circle
                        cx={x + fontSize * 0.4}
                        cy={y}
                        r={fontSize * 0.38}
                        fill={ring.color}
                    />
                    <text
                        x={x + fontSize * 1.2}
                        y={y}
                        dominantBaseline="central"
                        fontSize={size}
                        fill={props.theme.secondary}
                    >
                        {ring.label ? `${ring.label} ` : ''}
                        <tspan
                            fontWeight={600}
                            fill={props.textColor}
                        >
                            {ring.valueText}
                        </tspan>
                        {ring.unit ? ` ${ring.unit}` : ''}
                    </text>
                </g>,
            );
        });
    }

    const innerRadius = outer - count * (ringWidth + gap) + gap;
    const center = props.centerText ? (
        <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={fitFontSize(props.centerText, innerRadius * 0.45, innerRadius * 1.6)}
            fontWeight={500}
            fill={props.textColor}
        >
            {props.centerText}
        </text>
    ) : null;

    return (
        <g>
            {arcs}
            {labels}
            {center}
        </g>
    );
}

/** `tplGauge2Rings` - up to five values as concentric rings, like activity rings */
export default class RingsGauge extends Generic<RingsGaugeRxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplGauge2Rings',
            visSet: 'vis-2-widgets-gauges',
            visSetLabel: 'set_label',
            visSetColor: '#334455',
            visWidgetLabel: 'rings',
            visName: 'Rings',
            visHelp: 'help_rings',
            visOrder: 10,
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'noCard', label: 'without_card', type: 'checkbox' },
                        { name: 'widgetTitle', label: 'name', hidden: '!!data.noCard' },
                        {
                            name: 'ringsCount',
                            type: 'slider',
                            label: 'rings_count',
                            min: 1,
                            max: 5,
                            step: 1,
                            default: 3,
                        },
                    ],
                },
                {
                    name: 'rings',
                    label: 'group_rings',
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
                            default: 135,
                        },
                        {
                            name: 'ringWidth',
                            type: 'slider',
                            label: 'ring_width',
                            tooltip: 'ring_width_tooltip',
                            min: 0.03,
                            max: 0.4,
                            step: 0.01,
                            default: 0.14,
                        },
                        {
                            name: 'ringGap',
                            type: 'slider',
                            label: 'ring_gap',
                            tooltip: 'ring_gap_tooltip',
                            min: 0,
                            max: 0.2,
                            step: 0.01,
                            default: 0.04,
                        },
                        { name: 'roundedCaps', type: 'checkbox', label: 'rounded_caps', default: true },
                        {
                            name: 'trackOpacity',
                            type: 'slider',
                            label: 'track_opacity',
                            tooltip: 'track_opacity_tooltip',
                            min: 0,
                            max: 1,
                            step: 0.05,
                            default: 0.18,
                        },
                        {
                            name: 'legend',
                            type: 'select',
                            label: 'legend',
                            tooltip: 'legend_tooltip',
                            options: [
                                { value: 'gap', label: 'legend_gap' },
                                { value: 'side', label: 'legend_side' },
                                { value: 'none', label: 'legend_none' },
                            ],
                            default: 'gap',
                        },
                        { name: 'centerText', label: 'center_text' },
                        { name: 'textColor', type: 'color', label: 'text_color' },
                    ],
                },
                {
                    name: 'ring',
                    label: 'group_ring',
                    indexFrom: 1,
                    indexTo: 'ringsCount',
                    fields: [
                        Generic.oidField('oid', 'oid'),
                        { name: 'label', label: 'ring_label' },
                        { name: 'min', type: 'number', label: 'min', default: 0 },
                        { name: 'max', type: 'number', label: 'max', default: 100 },
                        { name: 'unit', label: 'unit' },
                        {
                            name: 'digits',
                            type: 'slider',
                            label: 'digits_after_comma',
                            tooltip: 'digits_after_comma_tooltip',
                            min: 0,
                            max: 4,
                            step: 1,
                        },
                        { name: 'color', type: 'color', label: 'ring_color', tooltip: 'ring_color_tooltip' },
                    ],
                },
                Generic.animationGroup({ duration: 1000, easing: 'cubicOut' }),
            ],
            visDefaultStyle: {
                width: '100%',
                height: 240,
                position: 'relative',
                absoluteWidth: 240,
            },
            visPrev: 'widgets/vis-2-widgets-gauges/img/prev_rings_gauge.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return RingsGauge.getWidgetInfo();
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        const data = this.state.rxData;
        const theme = this.getGaugeTheme();
        const isFloatComma = this.isFloatComma();
        const count = clamp(Math.round(num(data.ringsCount, 3)), 1, 5);

        const rings: Ring[] = [];
        for (let i = 1; i <= count; i++) {
            const { value, text } = this.getMainValue(`oid${i}`);
            let min = num(data[`min${i}`], 0);
            let max = num(data[`max${i}`], 100);
            if (min === max) {
                max = min + 1;
            }
            if (min > max) {
                [min, max] = [max, min];
            }
            const digits = toNumber(data[`digits${i}`]);
            let valueText = '–';
            if (text !== null) {
                valueText = text;
            } else if (value !== null) {
                valueText = formatNumber(value, digits, isFloatComma);
            }
            rings.push({
                fraction: value === null ? 0 : (value - min) / (max - min),
                label: data[`label${i}`] || '',
                valueText,
                unit: text === null ? data[`unit${i}`] || '' : '',
                color: data[`color${i}`] || RING_COLORS[(i - 1) % RING_COLORS.length],
            });
        }

        const drawing: DrawingProps = {
            rings,
            sweep: clamp(num(data.angle, 270), 10, 360),
            rotate: num(data.rotate, 135),
            ringWidth: num(data.ringWidth, 0.14),
            ringGap: num(data.ringGap, 0.04),
            rounded: data.roundedCaps === undefined || isTrue(data.roundedCaps),
            trackOpacity: num(data.trackOpacity, 0.18),
            legend: data.legend || 'gap',
            centerText: data.centerText || '',
            textColor: data.textColor || theme.text,
            theme,
            animate: isTrue(data.animate),
            duration: num(data.animateDuration, 1000),
            easing: data.animationEasing || 'cubicOut',
        };

        return this.wrapGauge(
            <GaugeFrame fontFamily={theme.fontFamily}>
                {size => (
                    <RingsDrawing
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
