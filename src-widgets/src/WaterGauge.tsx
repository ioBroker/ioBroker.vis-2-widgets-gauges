import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';

import Generic from './Generic';
import GaugeFrame, { fitFontSize } from './Components/GaugeFrame';
import { EASING_NAMES, getEasing } from './Components/easing';
import { clamp, sectorPath, uniqueId } from './Components/geometry';
import { animationsFrozen, useAnimatedValue } from './Components/hooks';
import { formatNumber, isTrue, num, toNumber } from './Components/format';

interface WaterGaugeRxData {
    oid?: string;
    noCard?: boolean;
    widgetTitle?: string;
    min?: number;
    max?: number;
    size?: number;
    unit?: string;
    digitsAfterComma?: number;
    textSize?: number;
    textOffsetX?: number;
    textOffsetY?: number;
    riseAnimation?: boolean;
    riseAnimationTime?: number;
    riseAnimationEasing?: string;
    waveAnimation?: boolean;
    waveAnimationTime?: number;
    waveAnimationEasing?: string;
    waveFrequency?: number;
    waveAmplitude?: number;
    innerRadius?: number;
    outerRadius?: number;
    margin?: number;
    textColor?: string;
    textWaveColor?: string;
    circleColor?: string;
    waveColor?: string;
    gradient?: boolean;
    levelsCount: number;

    // Gradient levels
    [key: `levelThreshold${number}`]: number | null;
    [key: `stopColor${number}`]: string;
    [key: `stopOpacity${number}`]: number;
}

/** Colour of react-liquid-gauge */
const LIQUID_COLOR = 'rgb(23, 139, 202)';

interface GradientStop {
    offset: number;
    color: string;
    opacity: number;
}

interface DrawingProps {
    /** Filling in percent, 0..100 */
    percent: number;
    /** Turns an animated percent value back into the text of the value */
    formatValue: (percent: number) => string;
    unit: string;
    customText: string | null;
    diameter: number;
    textSize: number;
    textOffsetX: number;
    textOffsetY: number;
    riseAnimation: boolean;
    riseAnimationTime: number;
    riseAnimationEasing: string;
    waveAnimation: boolean;
    waveAnimationTime: number;
    waveAnimationEasing: string;
    waveFrequency: number;
    waveAmplitude: number;
    innerRadius: number;
    outerRadius: number;
    margin: number;
    textColor: string;
    waveTextColor: string;
    circleColor: string;
    waveColor: string;
    gradient: GradientStop[] | null;
}

function WaterDrawing(props: DrawingProps & { width: number; height: number }): React.JSX.Element {
    const ids = React.useMemo(() => ({ clip: uniqueId('water-clip'), gradient: uniqueId('water-gradient') }), []);
    const wavePath = React.useRef<SVGPathElement | null>(null);

    const value = useAnimatedValue(props.percent, {
        enabled: props.riseAnimation,
        duration: props.riseAnimationTime,
        easing: getEasing(props.riseAnimationEasing, 'cubicInOut'),
        initial: 0,
    });

    const radius = props.diameter / 2;
    const fillRadius = radius * (props.innerRadius - props.margin);

    // The wave scrolls one width of the filling per cycle - that is a whole number of wave lengths, so the loop
    // has no visible seam
    React.useEffect(() => {
        const path = wavePath.current;
        if (!path) {
            return undefined;
        }
        if (!props.waveAnimation || props.waveAnimationTime <= 0 || animationsFrozen()) {
            path.removeAttribute('transform');
            return undefined;
        }
        const ease = getEasing(props.waveAnimationEasing, 'linear');
        let frame = 0;
        let start: number | null = null;
        const step = (now: number): void => {
            if (start === null) {
                start = now;
            }
            const t = ((now - start) % props.waveAnimationTime) / props.waveAnimationTime;
            path.setAttribute('transform', `translate(${-fillRadius + 2 * fillRadius * ease(t)}, 0)`);
            frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [props.waveAnimation, props.waveAnimationTime, props.waveAnimationEasing, fillRadius]);

    // The area under the wave, twice as wide as the filling so it can scroll
    const samples = Math.max(2, Math.round(40 * props.waveFrequency));
    const waveHeight = props.waveAmplitude * (1 - Math.abs(clamp(value, 0, 100) - 50) / 50);
    const level = (v: number): number => fillRadius - (v / 100) * 2 * fillRadius;
    let d = '';
    for (let i = 0; i <= samples; i++) {
        const x = -2 * fillRadius + (4 * fillRadius * i) / samples;
        const radians = Math.PI * 2 * ((i / 40) * 2);
        const y = level(waveHeight * Math.sin(radians) + value);
        d += `${i ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)} `;
    }
    d += `L ${(2 * fillRadius).toFixed(2)} ${radius} L ${(-2 * fillRadius).toFixed(2)} ${radius} Z`;

    const textPixels = (props.textSize * radius) / 2;
    const text =
        props.customText === null ? (
            <>
                <tspan fontSize={textPixels}>{props.formatValue(value)}</tspan>
                {props.unit ? <tspan fontSize={textPixels * 0.6}>{props.unit}</tspan> : null}
            </>
        ) : null;
    const textTransform = `translate(${props.textOffsetX}, ${props.textOffsetY})`;

    return (
        <g transform={`translate(${props.width / 2}, ${props.height / 2})`}>
            <defs>
                <clipPath id={ids.clip}>
                    <path
                        ref={wavePath}
                        d={d}
                    />
                </clipPath>
                {props.gradient ? (
                    <linearGradient
                        id={ids.gradient}
                        x1="0%"
                        x2="0%"
                        y1="100%"
                        y2="0%"
                    >
                        {props.gradient.map((stop, i) => (
                            <stop
                                key={i}
                                offset={`${stop.offset}%`}
                                stopColor={stop.color}
                                stopOpacity={stop.opacity}
                            />
                        ))}
                    </linearGradient>
                ) : null}
            </defs>
            <text
                textAnchor="middle"
                transform={textTransform}
                fill={props.textColor}
            >
                {text}
            </text>
            <g clipPath={`url(#${ids.clip})`}>
                <circle
                    r={fillRadius}
                    fill={props.gradient ? `url(#${ids.gradient})` : props.waveColor}
                />
                <text
                    textAnchor="middle"
                    transform={textTransform}
                    fill={props.waveTextColor}
                >
                    {text}
                </text>
            </g>
            <path
                d={sectorPath(0, 0, props.outerRadius * radius, props.innerRadius * radius, 0, 360)}
                fill={props.circleColor}
            />
            {props.customText !== null ? (
                <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={fitFontSize(props.customText, radius * 0.5, fillRadius * 1.8)}
                    fill={props.textColor}
                >
                    {props.customText}
                </text>
            ) : null}
        </g>
    );
}

/**
 * `tplGauge2Water` - a circle that fills with a wavy liquid.
 *
 * The first version drew it with react-liquid-gauge (d3). This one draws the same picture with plain SVG and its
 * own animation; the settings, their names and their defaults are the same.
 */
export default class WaterGauge extends Generic<WaterGaugeRxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplGauge2Water',
            visSet: 'vis-2-widgets-gauges',
            visSetLabel: 'set_label',
            visSetColor: '#334455',
            visWidgetLabel: 'water',
            visName: 'Water gauge',
            visHelp: 'help_water',
            visOrder: 2,
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'noCard', label: 'without_card', type: 'checkbox' },
                        { name: 'widgetTitle', label: 'name', hidden: '!!data.noCard' },
                        Generic.oidField(),
                        { name: 'min', type: 'number', label: 'min' },
                        { name: 'max', type: 'number', label: 'max' },
                        { name: 'size', type: 'number', label: 'size', tooltip: 'size_tooltip' },
                        { name: 'unit', label: 'unit' },
                        {
                            name: 'digitsAfterComma',
                            type: 'slider',
                            label: 'digits_after_comma',
                            tooltip: 'digits_after_comma_tooltip',
                            min: 0,
                            max: 4,
                            step: 1,
                        },
                        {
                            name: 'textSize',
                            type: 'slider',
                            min: 0,
                            max: 2,
                            step: 0.1,
                            label: 'text_size',
                            tooltip: 'text_size_tooltip',
                        },
                        { name: 'textOffsetX', type: 'number', label: 'text_offset_x' },
                        { name: 'textOffsetY', type: 'number', label: 'text_offset_y' },
                        { name: 'riseAnimation', type: 'checkbox', default: true, label: 'rise_animation' },
                        {
                            name: 'riseAnimationTime',
                            type: 'number',
                            label: 'rise_animation_time',
                            tooltip: 'rise_animation_time_tooltip',
                            hidden: '!data.riseAnimation',
                        },
                        {
                            name: 'riseAnimationEasing',
                            type: 'select',
                            options: EASING_NAMES,
                            noTranslation: true,
                            label: 'rise_animation_easing',
                            hidden: '!data.riseAnimation',
                        },
                        { name: 'waveAnimation', type: 'checkbox', default: true, label: 'wave_animation' },
                        {
                            name: 'waveAnimationTime',
                            type: 'number',
                            label: 'wave_animation_time',
                            tooltip: 'wave_animation_time_tooltip',
                            hidden: '!data.waveAnimation',
                        },
                        {
                            name: 'waveAnimationEasing',
                            type: 'select',
                            options: EASING_NAMES,
                            noTranslation: true,
                            label: 'wave_animation_easing',
                            hidden: '!data.waveAnimation',
                        },
                        {
                            name: 'waveFrequency',
                            type: 'number',
                            label: 'wave_frequency',
                            tooltip: 'wave_frequency_tooltip',
                        },
                        {
                            name: 'waveAmplitude',
                            type: 'number',
                            label: 'wave_amplitude',
                            tooltip: 'wave_amplitude_tooltip',
                        },
                        {
                            name: 'innerRadius',
                            type: 'slider',
                            min: 0.1,
                            max: 1,
                            step: 0.01,
                            label: 'inner_radius',
                            tooltip: 'inner_radius_tooltip',
                        },
                        {
                            name: 'outerRadius',
                            type: 'slider',
                            min: 0.1,
                            max: 1,
                            step: 0.01,
                            label: 'outer_radius',
                            tooltip: 'outer_radius_tooltip',
                        },
                        {
                            name: 'margin',
                            type: 'slider',
                            min: 0,
                            max: 0.5,
                            step: 0.005,
                            label: 'margin',
                            tooltip: 'margin_tooltip',
                        },
                        { name: 'textColor', type: 'color', label: 'text_color' },
                        { name: 'textWaveColor', type: 'color', label: 'text_overlapped_color' },
                        { name: 'circleColor', type: 'color', label: 'circle_color' },
                        {
                            name: 'waveColor',
                            type: 'color',
                            label: 'wave_color',
                            hidden: '!!data.gradient && data.levelsCount > 0',
                        },
                        { name: 'gradient', type: 'checkbox', label: 'gradient', tooltip: 'gradient_tooltip' },
                        {
                            name: 'levelsCount',
                            type: 'number',
                            label: 'levels_count',
                            hidden: '!data.gradient',
                        },
                    ],
                },
                {
                    name: 'level',
                    label: 'group_level',
                    indexFrom: 1,
                    indexTo: 'levelsCount',
                    hidden: '!data.gradient',
                    fields: [
                        { name: 'stopColor', type: 'color', label: 'level_stop_color' },
                        {
                            name: 'stopOpacity',
                            type: 'slider',
                            min: 0,
                            max: 1,
                            step: 0.05,
                            label: 'level_stop_opacity',
                            tooltip: 'level_stop_opacity_tooltip',
                        },
                        {
                            name: 'levelThreshold',
                            type: 'number',
                            label: 'level_threshold',
                            tooltip: 'level_threshold_tooltip',
                            hidden: (data, index) => index === 1 || index === parseInt(data.levelsCount, 10),
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: '100%',
                height: 120,
                position: 'relative',
                absoluteWidth: 120,
            },
            visPrev: 'widgets/vis-2-widgets-gauges/img/prev_water_gauge.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return WaterGauge.getWidgetInfo();
    }

    /** Stops of the gradient: the first level at the bottom, the last at the top, the others at their threshold */
    getGradient(min: number, max: number): GradientStop[] | null {
        const data = this.state.rxData;
        const count = Math.round(num(data.levelsCount, 0));
        if (!isTrue(data.gradient) || count < 1) {
            return null;
        }
        const stops: GradientStop[] = [];
        for (let i = 1; i <= count; i++) {
            const threshold = toNumber(data[`levelThreshold${i}`]) ?? max;
            stops.push({
                offset: i === 1 ? 0 : Math.round(((threshold - min) / (max - min)) * 100),
                color: data[`stopColor${i}`] || LIQUID_COLOR,
                opacity: num(data[`stopOpacity${i}`], 1),
            });
        }
        return stops;
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        const data = this.state.rxData;
        const theme = this.getGaugeTheme();
        const min = num(data.min, 0);
        let max = num(data.max, 100);
        if (max === min) {
            max = min + 1;
        }
        const { value, text } = this.getMainValue();
        const digits = this.getDigits();
        const isFloatComma = this.isFloatComma();
        const contrast: string = (this.props.context.theme as any)?.palette?.primary?.contrastText || '#ffffff';

        const drawing: Omit<DrawingProps, 'diameter' | 'textOffsetY'> = {
            percent: value === null ? 0 : ((value - min) / (max - min)) * 100,
            formatValue: (percent: number): string =>
                value === null ? '–' : formatNumber(min + (percent / 100) * (max - min), digits, isFloatComma),
            unit: data.unit || '',
            customText: text,
            textSize: num(data.textSize, 0) || 1,
            textOffsetX: num(data.textOffsetX, 0),
            riseAnimation: isTrue(data.riseAnimation),
            riseAnimationTime: num(data.riseAnimationTime, 0) || 2000,
            riseAnimationEasing: data.riseAnimationEasing || 'cubicInOut',
            waveAnimation: isTrue(data.waveAnimation),
            waveAnimationTime: num(data.waveAnimationTime, 0) || 2000,
            waveAnimationEasing: data.waveAnimationEasing || 'linear',
            waveFrequency: num(data.waveFrequency, 0) || 2,
            waveAmplitude: num(data.waveAmplitude, 0) || 1,
            innerRadius: num(data.innerRadius, 0) || 0.9,
            outerRadius: num(data.outerRadius, 0) || 1,
            margin: num(data.margin, 0) || 0.025,
            textColor: data.textColor || theme.text,
            waveTextColor: data.textWaveColor || (this.state.rxStyle as any)?.color || contrast,
            circleColor: data.circleColor || LIQUID_COLOR,
            waveColor: data.waveColor || LIQUID_COLOR,
            gradient: this.getGradient(min, max),
        };
        const fixedSize = num(data.size, 0);
        const offsetY = num(data.textOffsetY, 0);

        return this.wrapGauge(
            <GaugeFrame fontFamily={theme.fontFamily}>
                {size => {
                    const diameter = Math.max(1, fixedSize || Math.min(size.width, size.height) - 10);
                    return (
                        <WaterDrawing
                            {...drawing}
                            diameter={diameter}
                            textOffsetY={offsetY || Math.round(diameter / 15)}
                            width={size.width}
                            height={size.height}
                        />
                    );
                }}
            </GaugeFrame>,
            props,
        );
    }
}
