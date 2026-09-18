import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';

import Generic from './Generic';
import GaugeFrame, { fitFontSize, type GaugeTheme } from './Components/GaugeFrame';
import { clamp, decimalsForStep, majorTickValues, uniqueId } from './Components/geometry';
import { animationsFrozen, useAnimatedValue } from './Components/hooks';
import { formatNumber, isTrue, num } from './Components/format';
import { colorOfGradient, colorOfLevel, getLevels, type Level } from './Components/levels';
import { shade, withAlpha } from './Components/colors';

type ColorMode = 'fixed' | 'levels' | 'gradient';
type Shape = 'cylinder' | 'rect' | 'horizontal';

interface TankGaugeRxData {
    noCard?: boolean;
    widgetTitle?: string;
    oid?: string;
    min?: number;
    max?: number;
    unit?: string;
    digitsAfterComma?: number;
    shape?: Shape;
    tankColor?: string;
    waveAnimation?: boolean;
    colorMode?: ColorMode;
    valueColor?: string;
    levelsCount?: number;
    showScale?: boolean;
    majorTicks?: number;
    minorTicks?: number;
    scaleColor?: string;
    showValue?: boolean;
    showPercent?: boolean;
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
    percentText: string;
    unit: string;
    shape: Shape;
    tankColor: string;
    wave: boolean;
    colorMode: ColorMode;
    color: string;
    levels: Level[];
    showScale: boolean;
    majorTicks: number;
    minorTicks: number;
    formatLabel: (v: number) => string;
    scaleColor: string;
    showValue: boolean;
    textColor: string;
    theme: GaugeTheme;
    animate: boolean;
    duration: number;
    easing: string;
}

/** Phase of the surface wave, 0..1, running while `enabled` */
function useWavePhase(enabled: boolean, period = 2500): number {
    const [phase, setPhase] = React.useState(0);
    React.useEffect(() => {
        if (!enabled || animationsFrozen()) {
            return undefined;
        }
        let frame = 0;
        let start: number | null = null;
        let last = 0;
        const step = (now: number): void => {
            if (start === null) {
                start = now;
            }
            // 30 frames per second are plenty for a slow wave
            if (now - last > 33) {
                last = now;
                setPhase(((now - start) % period) / period);
            }
            frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [enabled, period]);
    return phase;
}

function TankDrawing(props: DrawingProps & { width: number; height: number }): React.JSX.Element {
    const ids = React.useMemo(
        () => ({ clip: uniqueId('tank-clip'), body: uniqueId('tank-body'), liquid: uniqueId('tank-liquid') }),
        [],
    );
    const { min, max, width: w, height: h } = props;
    const shown = props.value === null ? min : clamp(props.value, min, max);
    const value = useAnimatedValue(shown, {
        enabled: props.animate,
        duration: props.duration,
        easing: props.easing,
        initial: min,
    });
    const phase = useWavePhase(props.wave && props.shape !== 'cylinder');

    const pad = 4;
    const fontSize = clamp(Math.min(w, h) * 0.07, 9, 15);
    const majors = majorTickValues(min, max, props.majorTicks);
    const labels = majors.map(v => props.formatLabel(v));
    const labelWidth = Math.max(...labels.map(t => t.length)) * fontSize * 0.58;
    const tickLength = fontSize * 0.6;
    const scaleWidth = props.showScale ? tickLength + 6 + labelWidth : 0;

    const horizontal = props.shape === 'horizontal';
    let x0 = pad;
    let x1 = w - pad - scaleWidth;
    const y0 = pad + fontSize * 0.5;
    const y1 = h - pad - fontSize * 0.5;
    // keep a sensible shape: a standing tank is at most 1.1 times as wide as high, a lying one at most 3 times
    const bw = x1 - x0;
    const bh = y1 - y0;
    if (horizontal) {
        if (bw > bh * 3) {
            const shrink = (bw - bh * 3) / 2;
            x0 += shrink;
            x1 -= shrink;
        }
    } else if (bw > bh * 1.1) {
        const shrink = (bw - bh * 1.1) / 2;
        x0 += shrink;
        x1 -= shrink;
    }
    const width = x1 - x0;
    const height = y1 - y0;
    const cx = (x0 + x1) / 2;
    const stroke = Math.max(1.5, Math.min(width, height) * 0.012);

    // Where the liquid is at min and at max
    const ry = props.shape === 'cylinder' ? Math.min(width * 0.13, height * 0.12) : 0;
    const inset = stroke * 1.5;
    const levelBottom = props.shape === 'cylinder' ? y1 - ry : y1 - inset;
    const levelTop = props.shape === 'cylinder' ? y0 + ry : y0 + inset;
    const yOf = (v: number): number =>
        levelBottom - ((clamp(v, min, max) - min) / (max - min)) * (levelBottom - levelTop);
    const level = yOf(value);

    let color = props.color;
    if (props.colorMode === 'levels') {
        color = colorOfLevel(props.levels, value, props.color);
    } else if (props.colorMode === 'gradient') {
        color = colorOfGradient(props.levels, value, props.color);
    }

    // Outline of the tank and the area the liquid may fill
    let bodyPath: string;
    let innerPath: string;
    if (props.shape === 'cylinder') {
        const rx = width / 2;
        bodyPath =
            `M ${x0} ${y0 + ry} A ${rx} ${ry} 0 0 1 ${x1} ${y0 + ry} L ${x1} ${y1 - ry} ` +
            `A ${rx} ${ry} 0 0 1 ${x0} ${y1 - ry} Z`;
        const ix0 = x0 + inset;
        const ix1 = x1 - inset;
        const irx = (ix1 - ix0) / 2;
        const iry = ry * (irx / rx);
        innerPath =
            `M ${ix0} ${y0 + ry} L ${ix1} ${y0 + ry} L ${ix1} ${y1 - ry} ` +
            `A ${irx} ${iry} 0 0 1 ${ix0} ${y1 - ry} Z`;
    } else if (horizontal) {
        const rx = Math.min(height * 0.25, width * 0.2);
        const r2 = height / 2;
        bodyPath =
            `M ${x0 + rx} ${y0} L ${x1 - rx} ${y0} A ${rx} ${r2} 0 0 1 ${x1 - rx} ${y1} ` +
            `L ${x0 + rx} ${y1} A ${rx} ${r2} 0 0 1 ${x0 + rx} ${y0} Z`;
        const irx = Math.max(1, rx - inset);
        const ir2 = r2 - inset;
        innerPath =
            `M ${x0 + rx} ${y0 + inset} L ${x1 - rx} ${y0 + inset} A ${irx} ${ir2} 0 0 1 ${x1 - rx} ${y1 - inset} ` +
            `L ${x0 + rx} ${y1 - inset} A ${irx} ${ir2} 0 0 1 ${x0 + rx} ${y0 + inset} Z`;
    } else {
        const r = Math.min(width, height) * 0.08;
        bodyPath = `M ${x0 + r} ${y0} H ${x1 - r} A ${r} ${r} 0 0 1 ${x1} ${y0 + r} V ${y1 - r} A ${r} ${r} 0 0 1 ${x1 - r} ${y1} H ${x0 + r} A ${r} ${r} 0 0 1 ${x0} ${y1 - r} V ${y0 + r} A ${r} ${r} 0 0 1 ${x0 + r} ${y0} Z`;
        const ir = Math.max(0, r - inset);
        const a = x0 + inset;
        const b = x1 - inset;
        const c = y0 + inset;
        const d = y1 - inset;
        innerPath = `M ${a + ir} ${c} H ${b - ir} A ${ir} ${ir} 0 0 1 ${b} ${c + ir} V ${d - ir} A ${ir} ${ir} 0 0 1 ${b - ir} ${d} H ${a + ir} A ${ir} ${ir} 0 0 1 ${a} ${d - ir} V ${c + ir} A ${ir} ${ir} 0 0 1 ${a + ir} ${c} Z`;
    }

    // The liquid: everything below the level; a flat tank gets a moving wave on top, a cylinder its surface ellipse
    let liquidPath: string;
    const lx0 = x0 - 2;
    const lx1 = x1 + 2;
    if (props.wave && props.shape !== 'cylinder' && value > min && value < max) {
        const amplitude = Math.min(height * 0.012, 3);
        const length = Math.max(20, width / 2);
        let d = `M ${lx0} ${y1 + 2} L ${lx0} ${level}`;
        for (let x = lx0; x <= lx1 + 1; x += 4) {
            const y = level + amplitude * Math.sin(((x - x0) / length + phase) * Math.PI * 2);
            d += ` L ${x.toFixed(1)} ${y.toFixed(2)}`;
        }
        liquidPath = `${d} L ${lx1} ${y1 + 2} Z`;
    } else {
        liquidPath = `M ${lx0} ${level} H ${lx1} V ${y1 + 2} H ${lx0} Z`;
    }

    const surface =
        props.shape === 'cylinder' && value > min ? (
            <ellipse
                cx={cx}
                cy={level}
                rx={width / 2 - inset}
                ry={ry * ((width / 2 - inset) / (width / 2))}
                fill={shade(color, 0.3)}
            />
        ) : null;

    const ticks: React.JSX.Element[] = [];
    if (props.showScale) {
        const sx = x1 + 5;
        majors.forEach((v, i) => {
            const y = yOf(v);
            ticks.push(
                <line
                    key={`M${i}`}
                    x1={sx}
                    x2={sx + tickLength}
                    y1={y}
                    y2={y}
                    strokeWidth={1.2}
                />,
                <text
                    key={`L${i}`}
                    x={sx + tickLength + 3}
                    y={y}
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
                            key={`m${i}-${m}`}
                            x1={sx}
                            x2={sx + tickLength * 0.5}
                            y1={q}
                            y2={q}
                            strokeWidth={0.8}
                        />,
                    );
                }
            }
        });
    }

    const text = `${props.valueText}${props.unit ? ` ${props.unit}` : ''}`;
    const valueFont = fitFontSize(text, Math.min(width, height) * 0.2, width * 0.85);
    const percentFont = valueFont * 0.6;
    const textY = y0 + height * (horizontal ? 0.5 : 0.45);

    return (
        <g>
            <defs>
                <clipPath id={ids.clip}>
                    <path d={innerPath} />
                </clipPath>
                <linearGradient
                    id={ids.body}
                    x1="0"
                    x2="1"
                    y1="0"
                    y2="0"
                >
                    <stop
                        offset="0"
                        stopColor={withAlpha(props.tankColor, 0.2)}
                    />
                    <stop
                        offset="0.4"
                        stopColor={withAlpha(props.tankColor, 0.04)}
                    />
                    <stop
                        offset="1"
                        stopColor={withAlpha(props.tankColor, 0.16)}
                    />
                </linearGradient>
                <linearGradient
                    id={ids.liquid}
                    x1="0"
                    x2={horizontal ? '0' : '1'}
                    y1="0"
                    y2={horizontal ? '1' : '0'}
                >
                    <stop
                        offset="0"
                        stopColor={shade(color, -0.2)}
                    />
                    <stop
                        offset="0.4"
                        stopColor={shade(color, 0.12)}
                    />
                    <stop
                        offset="1"
                        stopColor={shade(color, -0.25)}
                    />
                </linearGradient>
            </defs>
            <path
                d={bodyPath}
                fill={`url(#${ids.body})`}
            />
            <g clipPath={`url(#${ids.clip})`}>
                {value > min ? (
                    <path
                        d={liquidPath}
                        fill={`url(#${ids.liquid})`}
                    />
                ) : null}
                {surface}
            </g>
            {props.shape === 'cylinder' ? (
                <ellipse
                    cx={cx}
                    cy={y0 + ry}
                    rx={width / 2}
                    ry={ry}
                    fill="none"
                    stroke={props.tankColor}
                    strokeWidth={stroke}
                />
            ) : null}
            <path
                d={bodyPath}
                fill="none"
                stroke={props.tankColor}
                strokeWidth={stroke}
            />
            <g
                stroke={props.scaleColor}
                fill={props.scaleColor}
                fontSize={fontSize}
            >
                {ticks}
            </g>
            {props.showValue ? (
                <g
                    textAnchor="middle"
                    fill={props.textColor}
                    stroke={props.theme.paper}
                    strokeWidth={Math.max(2, valueFont * 0.12)}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                >
                    <text
                        x={cx}
                        y={textY}
                        dominantBaseline="central"
                        fontSize={valueFont}
                        fontWeight={500}
                    >
                        {text}
                    </text>
                    {props.percentText ? (
                        <text
                            x={cx}
                            y={textY + valueFont * 0.6 + percentFont * 0.6}
                            dominantBaseline="central"
                            fontSize={percentFont}
                        >
                            {props.percentText}
                        </text>
                    ) : null}
                </g>
            ) : null}
        </g>
    );
}

/** `tplGauge2Tank` - fill level of a tank or a cistern */
export default class TankGauge extends Generic<TankGaugeRxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplGauge2Tank',
            visSet: 'vis-2-widgets-gauges',
            visSetLabel: 'set_label',
            visSetColor: '#334455',
            visWidgetLabel: 'tank',
            visName: 'Tank',
            visHelp: 'help_tank',
            visOrder: 9,
            visAttrs: [
                Generic.commonGroup(),
                Generic.valueGroup({ digits: 0 }),
                {
                    name: 'tank',
                    label: 'group_tank',
                    fields: [
                        {
                            name: 'shape',
                            type: 'select',
                            label: 'shape',
                            options: [
                                { value: 'cylinder', label: 'shape_cylinder' },
                                { value: 'rect', label: 'shape_rect' },
                                { value: 'horizontal', label: 'shape_horizontal' },
                            ],
                            default: 'cylinder',
                        },
                        { name: 'tankColor', type: 'color', label: 'tank_color' },
                        {
                            name: 'waveAnimation',
                            type: 'checkbox',
                            label: 'wave_animation',
                            default: true,
                            hidden: 'data.shape === "cylinder" || !data.shape',
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
                            default: 4,
                            hidden: '!data.showScale',
                        },
                        {
                            name: 'minorTicks',
                            type: 'number',
                            label: 'minor_ticks',
                            tooltip: 'minor_ticks_tooltip',
                            default: 5,
                            hidden: '!data.showScale',
                        },
                        { name: 'scaleColor', type: 'color', label: 'scale_color', hidden: '!data.showScale' },
                    ],
                },
                ...Generic.colorGroups(['fixed', 'levels', 'gradient'], 'fixed', '#1e88e5'),
                {
                    name: 'text',
                    label: 'group_text',
                    fields: [
                        { name: 'showValue', type: 'checkbox', label: 'show_value', default: true },
                        {
                            name: 'showPercent',
                            type: 'checkbox',
                            label: 'show_percent',
                            tooltip: 'show_percent_tooltip',
                            hidden: '!data.showValue',
                        },
                        { name: 'textColor', type: 'color', label: 'text_color', hidden: '!data.showValue' },
                    ],
                },
                Generic.animationGroup({ duration: 1200, easing: 'cubicInOut' }),
            ],
            visDefaultStyle: {
                width: '100%',
                height: 260,
                position: 'relative',
                absoluteWidth: 200,
            },
            visPrev: 'widgets/vis-2-widgets-gauges/img/prev_tank_gauge.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return TankGauge.getWidgetInfo();
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        const data = this.state.rxData;
        const theme = this.getGaugeTheme();
        const { min, max } = this.getRange();
        const { value, text } = this.getMainValue();
        const isFloatComma = this.isFloatComma();
        const majorTicks = Math.max(1, Math.round(num(data.majorTicks, 4)));
        const labelDigits = decimalsForStep((max - min) / majorTicks);

        let valueText: string;
        if (text !== null) {
            valueText = text;
        } else if (value === null) {
            valueText = '–';
        } else {
            valueText = formatNumber(value, this.getDigits(), isFloatComma);
        }
        let percentText = '';
        if (isTrue(data.showPercent) && value !== null && text === null) {
            percentText = `${formatNumber(((clamp(value, min, max) - min) / (max - min)) * 100, 0, isFloatComma)} %`;
        }

        const drawing: DrawingProps = {
            value,
            min,
            max,
            valueText,
            percentText,
            unit: text === null ? data.unit || '' : '',
            shape: data.shape || 'cylinder',
            tankColor: data.tankColor || theme.secondary,
            wave: data.waveAnimation === undefined || isTrue(data.waveAnimation),
            colorMode: data.colorMode || 'fixed',
            color: data.valueColor || '#1e88e5',
            levels: getLevels(data, min, max, ['#e53935', '#43a047']),
            showScale: data.showScale === undefined || isTrue(data.showScale),
            majorTicks,
            minorTicks: Math.max(0, Math.round(num(data.minorTicks, 5))),
            formatLabel: v => formatNumber(v, labelDigits, isFloatComma),
            scaleColor: data.scaleColor || theme.secondary,
            showValue: data.showValue === undefined || isTrue(data.showValue),
            textColor: data.textColor || theme.text,
            theme,
            animate: isTrue(data.animate),
            duration: num(data.animateDuration, 1200),
            easing: data.animationEasing || 'cubicInOut',
        };

        return this.wrapGauge(
            <GaugeFrame fontFamily={theme.fontFamily}>
                {size => (
                    <TankDrawing
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
