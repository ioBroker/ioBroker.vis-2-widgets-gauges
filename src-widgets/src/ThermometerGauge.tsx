import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';

import Generic from './Generic';
import GaugeFrame, { fitFontSize, type GaugeTheme } from './Components/GaugeFrame';
import { clamp, decimalsForStep, majorTickValues, uniqueId } from './Components/geometry';
import { useAnimatedValue } from './Components/hooks';
import { formatNumber, isTrue, num } from './Components/format';
import { colorOfGradient, colorOfLevel, getLevels, type Level } from './Components/levels';
import { shade, withAlpha } from './Components/colors';

type ColorMode = 'fixed' | 'levels' | 'gradient';

interface ThermometerGaugeRxData {
    noCard?: boolean;
    widgetTitle?: string;
    oid?: string;
    min?: number;
    max?: number;
    unit?: string;
    digitsAfterComma?: number;
    colorMode?: ColorMode;
    valueColor?: string;
    levelsCount?: number;
    tubeColor?: string;
    scaleColor?: string;
    scaleSide?: 'left' | 'right' | 'both';
    majorTicks?: number;
    minorTicks?: number;
    showValue?: boolean;
    textColor?: string;
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
    colorMode: ColorMode;
    color: string;
    levels: Level[];
    tubeColor: string;
    scaleColor: string;
    scaleSide: 'left' | 'right' | 'both';
    majorTicks: number;
    minorTicks: number;
    formatLabel: (v: number) => string;
    showValue: boolean;
    textColor: string;
    theme: GaugeTheme;
    animate: boolean;
    duration: number;
    easing: string;
}

function ThermometerDrawing(props: DrawingProps & { width: number; height: number }): React.JSX.Element {
    const ids = React.useMemo(() => ({ shine: uniqueId('thermo-shine') }), []);
    const { min, max, width: w, height: h } = props;
    const shown = props.value === null ? min : clamp(props.value, min, max);
    const value = useAnimatedValue(shown, {
        enabled: props.animate,
        duration: props.duration,
        easing: props.easing,
        initial: min,
    });

    const pad = 4;
    const fontSize = clamp(Math.min(w * 0.1, h * 0.05), 9, 16);
    const valueFont = fontSize * 1.7;
    const valueSpace = props.showValue ? valueFont * 1.4 : 0;

    const majors = majorTickValues(min, max, props.majorTicks);
    const labels = majors.map(v => props.formatLabel(v));
    const labelWidth = Math.max(...labels.map(t => t.length)) * fontSize * 0.58;
    const tickLength = fontSize * 0.7;
    const left = props.scaleSide === 'left' || props.scaleSide === 'both';
    const right = props.scaleSide === 'right' || props.scaleSide === 'both';
    const scaleWidth = tickLength + 4 + labelWidth;

    // Bulb at the bottom, the glass tube above it
    const available = h - 2 * pad - valueSpace;
    const bulb = Math.max(
        4,
        Math.min(available * 0.11, (w - 2 * pad - (left ? scaleWidth : 0) - (right ? scaleWidth : 0)) * 0.42),
    );
    const glass = bulb * 0.52; // half width of the tube
    const liquid = glass * 0.55; // half width of the column
    const bulbInner = bulb * 0.74;

    const groupWidth = 2 * bulb + (left ? scaleWidth : 0) + (right ? scaleWidth : 0);
    const cx = (w - groupWidth) / 2 + (left ? scaleWidth : 0) + bulb;
    const by = h - pad - bulb;
    const tubeTop = pad + valueSpace + glass;

    // The scale runs from just above the bulb up to just below the rounded top of the tube
    const yMin = by - bulb - fontSize * 0.2;
    const yMax = tubeTop + glass * 0.6;
    const yOf = (v: number): number => yMin - ((clamp(v, min, max) - min) / (max - min)) * (yMin - yMax);

    let color = props.color;
    if (props.colorMode === 'levels') {
        color = colorOfLevel(props.levels, value, props.color);
    } else if (props.colorMode === 'gradient') {
        color = colorOfGradient(props.levels, value, props.color);
    }

    // Outline of the glass: tube with a round top, running into the bulb
    const joinY = by - Math.sqrt(Math.max(0, bulb * bulb - glass * glass));
    const glassPath =
        `M ${cx - glass} ${tubeTop} A ${glass} ${glass} 0 0 1 ${cx + glass} ${tubeTop} ` +
        `L ${cx + glass} ${joinY} A ${bulb} ${bulb} 0 1 1 ${cx - glass} ${joinY} Z`;

    const level = yOf(value);
    const columnTop = Math.min(level, by);

    const ticks: React.JSX.Element[] = [];
    const sides: { x: number; dir: 1 | -1 }[] = [];
    if (right) {
        sides.push({ x: cx + glass + 3, dir: 1 });
    }
    if (left) {
        sides.push({ x: cx - glass - 3, dir: -1 });
    }
    for (const side of sides) {
        majors.forEach((v, i) => {
            const y = yOf(v);
            ticks.push(
                <line
                    key={`M${side.dir}${i}`}
                    x1={side.x}
                    x2={side.x + side.dir * tickLength}
                    y1={y}
                    y2={y}
                    strokeWidth={1.2}
                />,
                <text
                    key={`L${side.dir}${i}`}
                    x={side.x + side.dir * (tickLength + 3)}
                    y={y}
                    textAnchor={side.dir > 0 ? 'start' : 'end'}
                    dominantBaseline="central"
                    stroke="none"
                >
                    {labels[i]}
                </text>,
            );
            if (i < majors.length - 1 && props.minorTicks > 1) {
                for (let m = 1; m < props.minorTicks; m++) {
                    const q = yOf(v + ((majors[i + 1] - v) * m) / props.minorTicks);
                    ticks.push(
                        <line
                            key={`m${side.dir}${i}-${m}`}
                            x1={side.x}
                            x2={side.x + side.dir * tickLength * 0.5}
                            y1={q}
                            y2={q}
                            strokeWidth={0.8}
                        />,
                    );
                }
            }
        });
    }

    const valueFit = fitFontSize(`${props.valueText}${props.unit}`, valueFont, w - 2 * pad);

    return (
        <g>
            <defs>
                <linearGradient
                    id={ids.shine}
                    x1="0"
                    x2="1"
                    y1="0"
                    y2="0"
                >
                    <stop
                        offset="0"
                        stopColor={shade(color, -0.25)}
                    />
                    <stop
                        offset="0.35"
                        stopColor={shade(color, 0.25)}
                    />
                    <stop
                        offset="1"
                        stopColor={shade(color, -0.15)}
                    />
                </linearGradient>
            </defs>
            <path
                d={glassPath}
                fill={withAlpha(props.tubeColor, 0.08)}
                stroke={props.tubeColor}
                strokeWidth={Math.max(1.2, glass * 0.12)}
            />
            <rect
                x={cx - liquid}
                y={columnTop}
                width={liquid * 2}
                height={Math.max(0, by - columnTop)}
                rx={value > min ? liquid * 0.3 : 0}
                fill={`url(#${ids.shine})`}
            />
            <circle
                cx={cx}
                cy={by}
                r={bulbInner}
                fill={`url(#${ids.shine})`}
            />
            <circle
                cx={cx - bulbInner * 0.35}
                cy={by - bulbInner * 0.35}
                r={bulbInner * 0.22}
                fill="#ffffff"
                opacity={0.35}
            />
            <g
                stroke={props.scaleColor}
                fill={props.scaleColor}
                fontSize={fontSize}
            >
                {ticks}
            </g>
            {props.showValue ? (
                <text
                    x={w / 2}
                    y={pad + valueSpace * 0.45}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={valueFit}
                    fontWeight={500}
                    fill={props.textColor}
                >
                    {props.valueText}
                    {props.unit ? (
                        <tspan
                            fontSize={valueFit * 0.6}
                            fill={props.theme.secondary}
                            dx={valueFit * 0.08}
                        >
                            {props.unit}
                        </tspan>
                    ) : null}
                </text>
            ) : null}
        </g>
    );
}

/** `tplGauge2Thermometer` - a glass thermometer with a scale */
export default class ThermometerGauge extends Generic<ThermometerGaugeRxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplGauge2Thermometer',
            visSet: 'vis-2-widgets-gauges',
            visSetLabel: 'set_label',
            visSetColor: '#334455',
            visWidgetLabel: 'thermometer',
            visName: 'Thermometer',
            visHelp: 'help_thermometer',
            visOrder: 7,
            visAttrs: [
                Generic.commonGroup(),
                Generic.valueGroup({ min: -20, max: 40, unit: '°C', digits: 1 }),
                {
                    name: 'scale',
                    label: 'group_scale',
                    fields: [
                        {
                            name: 'scaleSide',
                            type: 'select',
                            label: 'scale_side',
                            options: [
                                { value: 'left', label: 'side_left' },
                                { value: 'right', label: 'side_right' },
                                { value: 'both', label: 'side_both' },
                            ],
                            default: 'right',
                        },
                        {
                            name: 'majorTicks',
                            type: 'number',
                            label: 'major_ticks',
                            tooltip: 'major_ticks_tooltip',
                            default: 6,
                        },
                        {
                            name: 'minorTicks',
                            type: 'number',
                            label: 'minor_ticks',
                            tooltip: 'minor_ticks_tooltip',
                            default: 5,
                        },
                        { name: 'scaleColor', type: 'color', label: 'scale_color' },
                        { name: 'tubeColor', type: 'color', label: 'tube_color' },
                    ],
                },
                ...Generic.colorGroups(['fixed', 'levels', 'gradient'], 'fixed', '#e53935'),
                {
                    name: 'text',
                    label: 'group_text',
                    fields: [
                        { name: 'showValue', type: 'checkbox', label: 'show_value', default: true },
                        { name: 'textColor', type: 'color', label: 'text_color', hidden: '!data.showValue' },
                    ],
                },
                Generic.animationGroup({ duration: 1000, easing: 'cubicInOut' }),
            ],
            visDefaultStyle: {
                width: '100%',
                height: 300,
                position: 'relative',
                absoluteWidth: 140,
            },
            visPrev: 'widgets/vis-2-widgets-gauges/img/prev_thermometer_gauge.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return ThermometerGauge.getWidgetInfo();
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        const data = this.state.rxData;
        const theme = this.getGaugeTheme();
        const { min, max } = this.getRange(-20, 40);
        const { value, text } = this.getMainValue();
        const isFloatComma = this.isFloatComma();
        const majorTicks = Math.max(1, Math.round(num(data.majorTicks, 6)));
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
            min,
            max,
            valueText,
            unit: text === null ? (data.unit ?? '°C') : '',
            colorMode: data.colorMode || 'fixed',
            color: data.valueColor || '#e53935',
            levels: getLevels(data, min, max, ['#1e88e5', '#e53935']),
            tubeColor: data.tubeColor || theme.secondary,
            scaleColor: data.scaleColor || theme.secondary,
            scaleSide: data.scaleSide || 'right',
            majorTicks,
            minorTicks: Math.max(0, Math.round(num(data.minorTicks, 5))),
            formatLabel: v => formatNumber(v, labelDigits, isFloatComma),
            showValue: data.showValue === undefined || isTrue(data.showValue),
            textColor: data.textColor || theme.text,
            theme,
            animate: isTrue(data.animate),
            duration: num(data.animateDuration, 1000),
            easing: data.animationEasing || 'cubicInOut',
        };

        return this.wrapGauge(
            <GaugeFrame fontFamily={theme.fontFamily}>
                {size => (
                    <ThermometerDrawing
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
