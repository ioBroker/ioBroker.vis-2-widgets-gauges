import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';

import Generic from './Generic';
import GaugeFrame, { fitFontSize, type GaugeTheme } from './Components/GaugeFrame';
import { clamp, sectorPath } from './Components/geometry';
import { useAnimatedValue } from './Components/hooks';
import { formatNumber, isTrue, num } from './Components/format';
import { getLevels } from './Components/levels';

interface ColorGaugeRxData {
    oid?: string;
    noCard?: boolean;
    widgetTitle?: string;
    min?: number;
    max?: number;
    unit?: string;
    levelsCount: number;
    digitsAfterComma?: number;
    needleColor?: string;
    needleBaseColor?: string;
    marginInPercent?: number;
    cornerRadius?: number;
    arcPadding?: number;
    arcWidth?: number;
    hideText?: boolean;
    needleScale?: number;
    textColor?: string;
    showMinMax?: boolean;
    animate?: boolean;
    animDelay?: number;
    animateDuration?: number;
    [key: `color${number}`]: string;
    [key: `levelThreshold${number}`]: number;
}

/** The colours react-gauge-chart used when none are set: from green to red */
const DEFAULT_COLORS = ['#00FF00', '#FF0000'];

interface Arc {
    share: number;
    color: string;
}

interface DrawingProps {
    percent: number;
    text: string;
    arcs: Arc[];
    margin: number;
    cornerRadius: number;
    /** Gap between the arcs, in radians like in react-gauge-chart */
    arcPadding: number;
    /** Thickness of the arc as part of the radius */
    arcWidth: number;
    needleColor: string;
    needleBaseColor: string;
    needleScale: number;
    hideText: boolean;
    textColor: string;
    minText: string | null;
    maxText: string | null;
    theme: GaugeTheme;
    animate: boolean;
    animDelay: number;
    animateDuration: number;
}

function ColorGaugeDrawing(props: DrawingProps & { width: number; height: number }): React.JSX.Element {
    const percent = useAnimatedValue(props.percent, {
        enabled: props.animate,
        duration: props.animateDuration,
        delay: props.animDelay,
        easing: 'elasticOut',
        initial: 0,
    });

    const { width, height } = props;
    const mx = width * props.margin;
    const my = height * props.margin;
    // The value stands below the axis of the needle, in one line with minimum and maximum
    const below = props.minText !== null || !props.hideText ? 0.34 : 0.06;
    const r = Math.max(1, Math.min((width - 2 * mx) / 2, (height - 2 * my) / (1 + below)));
    const cx = width / 2;
    const cy = (height - r * (1 + below)) / 2 + r;
    const inner = r * (1 - clamp(props.arcWidth, 0.01, 1));

    // The segments like d3.pie() lays them out: every one gets its share of the half circle plus the padding
    const count = props.arcs.length;
    const padDeg = Math.min(180 / count, (props.arcPadding * 180) / Math.PI);
    const padLinear = 2 * Math.sqrt(r * r + inner * inner) * Math.sin(((padDeg / 2) * Math.PI) / 180);
    const totalShare = props.arcs.reduce((sum, a) => sum + a.share, 0) || 1;
    const segments: React.JSX.Element[] = [];
    for (let i = 0, from = -90; i < count; i++) {
        const arc = props.arcs[i];
        const span = (arc.share / totalShare) * (180 - count * padDeg) + padDeg;
        segments.push(
            <path
                key={i}
                d={sectorPath(cx, cy, r, inner, from, from + span, props.cornerRadius, padLinear)}
                fill={arc.color}
            />,
        );
        from += span;
    }

    // Needle: a triangle from the base circle to the tip, as react-gauge-chart draws it
    const needleRadius = 0.06 * r;
    const length = r * props.needleScale;
    const theta = clamp(percent, 0, 1) * Math.PI;
    const baseX = cx;
    const baseY = cy - needleRadius / 2;
    const tip = [baseX - length * Math.cos(theta), baseY - length * Math.sin(theta)];
    const left = [
        baseX - needleRadius * Math.cos(theta - Math.PI / 2),
        baseY - needleRadius * Math.sin(theta - Math.PI / 2),
    ];
    const right = [
        baseX - needleRadius * Math.cos(theta + Math.PI / 2),
        baseY - needleRadius * Math.sin(theta + Math.PI / 2),
    ];

    const fontSize = fitFontSize(props.text, (2 * r) / 11, props.minText !== null ? 1.2 * r : 1.8 * r);
    const labelSize = Math.max(8, r * 0.11);
    const labelX = (r + inner) / 2;
    const textY = cy + r * 0.28;

    return (
        <g>
            {segments}
            <path
                d={`M ${left[0]} ${left[1]} L ${tip[0]} ${tip[1]} L ${right[0]} ${right[1]} Z`}
                fill={props.needleColor}
            />
            <circle
                cx={baseX}
                cy={baseY}
                r={needleRadius}
                fill={props.needleBaseColor}
            />
            {props.hideText ? null : (
                <text
                    x={cx}
                    y={textY}
                    textAnchor="middle"
                    fontSize={fontSize}
                    fill={props.textColor}
                >
                    {props.text}
                </text>
            )}
            {props.minText !== null ? (
                <g
                    fontSize={labelSize}
                    fill={props.theme.secondary}
                    textAnchor="middle"
                >
                    <text
                        x={cx - labelX}
                        y={textY}
                    >
                        {props.minText}
                    </text>
                    <text
                        x={cx + labelX}
                        y={textY}
                    >
                        {props.maxText}
                    </text>
                </g>
            ) : null}
        </g>
    );
}

/**
 * `tplGauge2Color` - half circle out of coloured segments with a needle.
 *
 * The first version drew it with react-gauge-chart (d3). This one draws the same picture with plain SVG; the
 * settings, their names and their defaults are the same.
 */
export default class ColorGauge extends Generic<ColorGaugeRxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplGauge2Color',
            visSet: 'vis-2-widgets-gauges',
            visSetLabel: 'set_label',
            visSetColor: '#334455',
            visWidgetLabel: 'color',
            visName: 'Color gauge',
            visHelp: 'help_color',
            visOrder: 1,
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'noCard', label: 'without_card', type: 'checkbox' },
                        { name: 'widgetTitle', label: 'name', hidden: '!!data.noCard' },
                        Generic.oidField(),
                        { name: 'min', type: 'number', label: 'min' },
                        { name: 'max', type: 'number', label: 'max' },
                        { name: 'unit', label: 'unit', tooltip: 'unit_percent_tooltip' },
                        { name: 'levelsCount', type: 'number', label: 'levels_count', default: 3 },
                        {
                            name: 'digitsAfterComma',
                            type: 'slider',
                            label: 'digits_after_comma',
                            min: 0,
                            max: 10,
                            default: 2,
                        },
                    ],
                },
                {
                    name: 'visual',
                    label: 'visual',
                    fields: [
                        { name: 'needleColor', type: 'color', label: 'needle_color' },
                        { name: 'needleBaseColor', type: 'color', label: 'needle_base_color' },
                        {
                            name: 'needleScale',
                            type: 'slider',
                            min: 0.1,
                            max: 1,
                            step: 0.01,
                            label: 'needle_size',
                            tooltip: 'needle_size_tooltip',
                        },
                        {
                            name: 'marginInPercent',
                            type: 'slider',
                            min: 0,
                            max: 0.2,
                            step: 0.01,
                            label: 'margin_in_percent',
                            tooltip: 'margin_in_percent_tooltip',
                        },
                        { name: 'cornerRadius', type: 'number', label: 'corner_radius' },
                        {
                            name: 'arcPadding',
                            type: 'slider',
                            min: 0,
                            max: 0.2,
                            step: 0.01,
                            label: 'arc_padding',
                            tooltip: 'arc_padding_title',
                        },
                        {
                            name: 'arcWidth',
                            type: 'slider',
                            min: 0.01,
                            max: 1,
                            step: 0.01,
                            label: 'arc_width',
                            tooltip: 'arc_tooltip',
                        },
                        { name: 'hideText', type: 'checkbox', label: 'hide_value' },
                        { name: 'textColor', type: 'color', label: 'text_color', hidden: '!!data.hideText' },
                        { name: 'showMinMax', type: 'checkbox', label: 'show_min_max', default: true },
                    ],
                },
                {
                    name: 'animation',
                    label: 'animation',
                    fields: [
                        { name: 'animate', type: 'checkbox', default: true, label: 'animate' },
                        {
                            name: 'animDelay',
                            type: 'number',
                            label: 'anim_delay',
                            tooltip: 'anim_delay_tooltip',
                            hidden: '!data.animate',
                        },
                        {
                            name: 'animateDuration',
                            type: 'number',
                            label: 'animate_duration',
                            tooltip: 'animate_duration_tooltip',
                            hidden: '!data.animate',
                        },
                    ],
                },
                {
                    name: 'level',
                    label: 'level',
                    indexFrom: 1,
                    indexTo: 'levelsCount',
                    fields: [
                        { name: 'color', type: 'color', label: 'level_color', tooltip: 'level_color_tooltip' },
                        {
                            name: 'levelThreshold',
                            type: 'number',
                            label: 'level_threshold',
                            tooltip: 'level_threshold_upper_tooltip',
                            hidden: (data, index) => index === parseInt(data.levelsCount, 10),
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: '100%',
                height: 182,
                position: 'relative',
                absoluteWidth: 182,
            },
            visPrev: 'widgets/vis-2-widgets-gauges/img/prev_color_gauge.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return ColorGauge.getWidgetInfo();
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

        // Without a unit set at all the value is shown in percent, as the first version did
        const unit = data.unit === undefined || data.unit === null ? '%' : String(data.unit);
        let shown: string;
        if (text !== null) {
            shown = text;
        } else if (value === null) {
            shown = '–';
        } else {
            shown = `${formatNumber(value, digits, this.isFloatComma())}${unit}`;
        }

        const levelsCount = Math.max(1, Math.round(num(data.levelsCount, 3)));
        const levels = getLevels({ ...data, levelsCount }, min, max, DEFAULT_COLORS);
        const span = Math.abs(max - min);
        const arcs = levels.map(l => ({ share: (l.to - l.from) / span, color: l.color }));

        const showMinMax = isTrue(data.showMinMax);

        const drawing: DrawingProps = {
            percent: value === null ? 0 : (value - min) / (max - min),
            text: shown,
            arcs,
            // an empty field means the default, 0 really means 0 (the first version took 0 as "default" too)
            margin: num(data.marginInPercent, 0.05),
            cornerRadius: num(data.cornerRadius, 6),
            arcPadding: num(data.arcPadding, 0.05),
            arcWidth: num(data.arcWidth, 0) || 0.2,
            needleColor: data.needleColor || theme.text,
            needleBaseColor: data.needleBaseColor || theme.text,
            needleScale: num(data.needleScale, 0) || 0.55,
            hideText: isTrue(data.hideText),
            textColor: data.textColor || theme.text,
            minText: showMinMax ? formatNumber(min, null, this.isFloatComma()) : null,
            maxText: showMinMax ? formatNumber(max, null, this.isFloatComma()) : null,
            theme,
            animate: isTrue(data.animate),
            animDelay: num(data.animDelay, 0) || 500,
            animateDuration: num(data.animateDuration, 0) || 3000,
        };

        return this.wrapGauge(
            <GaugeFrame fontFamily={theme.fontFamily}>
                {size => (
                    <ColorGaugeDrawing
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
