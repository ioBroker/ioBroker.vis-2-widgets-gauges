import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';

import Generic from './Generic';
import GaugeFrame, { fitFontSize, type GaugeTheme } from './Components/GaugeFrame';
import { polar, uniqueId } from './Components/geometry';
import { useAnimatedValue, useUnwrappedAngle } from './Components/hooks';
import { formatNumber, isTrue, num } from './Components/format';

interface CompassGaugeRxData {
    noCard?: boolean;
    widgetTitle?: string;
    oid?: string;
    offset?: number;
    invert?: boolean;
    showValue?: boolean;
    valueFormat?: 'both' | 'direction' | 'degrees';
    textColor?: string;
    speedOid?: string;
    speedUnit?: string;
    speedDigits?: number;
    rotateDial?: boolean;
    needleType?: 'arrow' | 'compass' | 'wind';
    needleColor?: string;
    dialColor?: string;
    scaleColor?: string;
    northColor?: string;
    showDegrees?: boolean;
    showIntercardinal?: boolean;
    bezel?: 'none' | 'thin' | 'metal';
    animate?: boolean;
    animateDuration?: number;
    animationEasing?: string;
}

/** The 16 directions, clockwise from north; translated as `dir_N`, `dir_NNE`, ... */
export const DIRECTIONS = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
];

/** Name of the direction (one of 16) an angle points to */
export function directionIndex(angle: number): number {
    const a = ((angle % 360) + 360) % 360;
    return Math.round(a / 22.5) % 16;
}

interface DrawingProps {
    direction: number | null;
    speedText: string | null;
    speedUnit: string;
    names: string[];
    showValue: boolean;
    valueFormat: 'both' | 'direction' | 'degrees';
    textColor: string;
    rotateDial: boolean;
    needleType: 'arrow' | 'compass' | 'wind';
    needleColor: string;
    dialColor: string;
    scaleColor: string;
    northColor: string;
    showDegrees: boolean;
    showIntercardinal: boolean;
    bezel: 'none' | 'thin' | 'metal';
    theme: GaugeTheme;
    animate: boolean;
    duration: number;
    easing: string;
}

function CompassNeedle(props: {
    type: DrawingProps['needleType'];
    face: number;
    color: string;
    theme: GaugeTheme;
}): React.JSX.Element {
    const f = props.face;
    if (props.type === 'compass') {
        const w = f * 0.09;
        const l = f * 0.62;
        return (
            <g>
                <path
                    d={`M 0 ${-l} L ${w} 0 L ${-w} 0 Z`}
                    fill={props.color}
                />
                <path
                    d={`M 0 ${l} L ${w} 0 L ${-w} 0 Z`}
                    fill={props.theme.dark ? '#bdbdbd' : '#9e9e9e'}
                />
            </g>
        );
    }
    if (props.type === 'wind') {
        // A marker on the ring of the ticks that points to the middle - where the wind comes from
        const w = f * 0.085;
        return (
            <path
                d={`M 0 ${-f * 0.79} L ${w} ${-f * 1.0} L 0 ${-f * 0.94} L ${-w} ${-f * 1.0} Z`}
                fill={props.color}
            />
        );
    }
    // arrow through the whole dial with a tail
    const l = f * 0.66;
    const head = f * 0.16;
    const w = f * 0.07;
    const shaft = Math.max(1.5, f * 0.018);
    return (
        <g fill={props.color}>
            <path
                d={`M 0 ${-l} L ${w} ${-l + head} L ${shaft} ${-l + head * 0.8} L ${shaft} ${l * 0.7} L ${-shaft} ${l * 0.7} L ${-shaft} ${-l + head * 0.8} L ${-w} ${-l + head} Z`}
            />
            <path
                d={`M ${-shaft} ${l * 0.62} L ${-w * 0.9} ${l * 0.95} L ${-shaft} ${l * 0.85} Z M ${shaft} ${l * 0.62} L ${w * 0.9} ${l * 0.95} L ${shaft} ${l * 0.85} Z`}
            />
        </g>
    );
}

function CompassDrawing(props: DrawingProps & { width: number; height: number }): React.JSX.Element {
    const ids = React.useMemo(() => ({ bezel: uniqueId('compass-bezel') }), []);
    const unwrapped = useUnwrappedAngle(props.direction ?? 0);
    const angle = useAnimatedValue(unwrapped, {
        enabled: props.animate,
        duration: props.duration,
        easing: props.easing,
    });

    const cx = props.width / 2;
    const cy = props.height / 2;
    const outer = Math.max(1, Math.min(props.width, props.height) / 2 - 2);
    let bezelWidth = 0;
    if (props.bezel === 'metal') {
        bezelWidth = outer * 0.07;
    } else if (props.bezel === 'thin') {
        bezelWidth = Math.max(1.5, outer * 0.02);
    }
    const face = outer - bezelWidth;

    // Either the needle turns, or the dial turns and a fixed mark on top shows the direction
    const dialRotation = props.rotateDial ? -angle : 0;
    const needleRotation = props.rotateDial ? 0 : angle;

    const tickOuter = face * 0.95;
    const ticks: React.JSX.Element[] = [];
    for (let a = 0; a < 360; a += 5) {
        const major = a % 30 === 0;
        const medium = a % 15 === 0;
        let length = face * 0.035;
        if (major) {
            length = face * 0.09;
        } else if (medium) {
            length = face * 0.06;
        }
        const p1 = polar(cx, cy, tickOuter, a);
        const p2 = polar(cx, cy, tickOuter - length, a);
        ticks.push(
            <line
                key={a}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                strokeWidth={major ? Math.max(1.2, face * 0.012) : Math.max(0.7, face * 0.006)}
            />,
        );
    }

    const letterRadius = face * 0.7;
    const cardinalSize = face * 0.16;
    const interSize = face * 0.095;
    const degreeSize = face * 0.075;
    const letters: React.JSX.Element[] = [];
    for (let i = 0; i < 16; i += 2) {
        const a = i * 22.5;
        const cardinal = i % 4 === 0;
        if (!cardinal && !props.showIntercardinal) {
            continue;
        }
        const p = polar(cx, cy, letterRadius, a);
        letters.push(
            <text
                key={`d${i}`}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={cardinal ? cardinalSize : interSize}
                fontWeight={cardinal ? 700 : 500}
                fill={i === 0 ? props.northColor : props.scaleColor}
                transform={props.rotateDial ? `rotate(${a} ${p.x} ${p.y})` : undefined}
            >
                {props.names[i]}
            </text>,
        );
    }
    if (props.showDegrees) {
        for (let a = 30; a < 360; a += 30) {
            if (a % 90 === 0) {
                continue;
            }
            const p = polar(cx, cy, face * 0.76, a);
            letters.push(
                <text
                    key={`g${a}`}
                    x={p.x}
                    y={p.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={degreeSize}
                    fill={props.theme.secondary}
                    transform={props.rotateDial ? `rotate(${a} ${p.x} ${p.y})` : undefined}
                >
                    {a}
                </text>,
            );
        }
    }

    // The text in the middle: the speed, or the direction
    const heading = props.direction === null ? null : ((Math.round(props.direction) % 360) + 360) % 360;
    const dirName = heading === null ? '–' : props.names[directionIndex(heading)];
    const degrees = heading === null ? '' : `${heading}°`;
    let mainText = '';
    let subText = '';
    if (props.speedText !== null) {
        mainText = props.speedText;
        if (props.valueFormat === 'direction') {
            subText = dirName;
        } else if (props.valueFormat === 'degrees') {
            subText = degrees;
        } else {
            subText = `${dirName} ${degrees}`;
        }
    } else if (props.valueFormat === 'degrees') {
        mainText = degrees || '–';
    } else if (props.valueFormat === 'direction') {
        mainText = dirName;
    } else {
        mainText = dirName;
        subText = degrees;
    }
    const discRadius = face * 0.34;
    const mainSize = fitFontSize(
        `${mainText}${props.speedText !== null ? props.speedUnit : ''}`,
        face * 0.2,
        discRadius * 1.7,
    );
    const subSize = fitFontSize(subText, face * 0.1, discRadius * 1.6);

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
                        offset="0.5"
                        stopColor="#bdbdbd"
                    />
                    <stop
                        offset="1"
                        stopColor="#6f6f6f"
                    />
                </linearGradient>
            </defs>
            {props.bezel === 'metal' ? (
                <circle
                    cx={cx}
                    cy={cy}
                    r={outer}
                    fill={`url(#${ids.bezel})`}
                />
            ) : null}
            <circle
                cx={cx}
                cy={cy}
                r={face}
                fill={props.dialColor}
                stroke={props.bezel === 'thin' ? props.scaleColor : undefined}
                strokeWidth={props.bezel === 'thin' ? bezelWidth : undefined}
            />
            <g transform={`rotate(${dialRotation} ${cx} ${cy})`}>
                <g stroke={props.scaleColor}>{ticks}</g>
                {letters}
            </g>
            {props.rotateDial ? (
                // fixed mark on top: the direction the dial is turned to
                <path
                    d={`M ${cx} ${cy - face * 0.97} L ${cx + face * 0.07} ${cy - face * 1.12} L ${cx - face * 0.07} ${cy - face * 1.12} Z`}
                    transform={`translate(0 ${face * 0.18})`}
                    fill={props.needleColor}
                />
            ) : (
                <g transform={`translate(${cx} ${cy}) rotate(${needleRotation})`}>
                    <CompassNeedle
                        type={props.needleType}
                        face={face}
                        color={props.needleColor}
                        theme={props.theme}
                    />
                </g>
            )}
            {props.showValue ? (
                <g>
                    {props.needleType !== 'wind' || props.rotateDial ? (
                        <circle
                            cx={cx}
                            cy={cy}
                            r={discRadius}
                            fill={props.dialColor}
                            stroke={props.theme.track}
                            strokeWidth={Math.max(1, face * 0.01)}
                        />
                    ) : null}
                    <text
                        x={cx}
                        y={subText ? cy - mainSize * 0.2 : cy}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={mainSize}
                        fontWeight={500}
                        fill={props.textColor}
                    >
                        {mainText}
                        {props.speedText !== null && props.speedUnit ? (
                            <tspan
                                fontSize={mainSize * 0.55}
                                fill={props.theme.secondary}
                                dx={mainSize * 0.1}
                            >
                                {props.speedUnit}
                            </tspan>
                        ) : null}
                    </text>
                    {subText ? (
                        <text
                            x={cx}
                            y={cy + mainSize * 0.55 + subSize * 0.5}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={subSize}
                            fill={props.theme.secondary}
                        >
                            {subText}
                        </text>
                    ) : null}
                </g>
            ) : props.needleType !== 'wind' && !props.rotateDial ? (
                <circle
                    cx={cx}
                    cy={cy}
                    r={face * 0.05}
                    fill={props.theme.dark ? '#9e9e9e' : '#424242'}
                />
            ) : null}
        </g>
    );
}

/** `tplGauge2Compass` - compass rose for a direction, e.g. of the wind, with its speed in the middle */
export default class CompassGauge extends Generic<CompassGaugeRxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplGauge2Compass',
            visSet: 'vis-2-widgets-gauges',
            visSetLabel: 'set_label',
            visSetColor: '#334455',
            visWidgetLabel: 'compass',
            visName: 'Compass',
            visHelp: 'help_compass',
            visOrder: 8,
            visAttrs: [
                Generic.commonGroup(
                    [
                        {
                            name: 'offset',
                            type: 'number',
                            label: 'north_offset',
                            tooltip: 'north_offset_tooltip',
                            default: 0,
                        },
                        {
                            name: 'invert',
                            type: 'checkbox',
                            label: 'invert_direction',
                            tooltip: 'invert_direction_tooltip',
                        },
                    ],
                    false,
                ),
                {
                    name: 'speed',
                    label: 'group_speed',
                    fields: [
                        {
                            name: 'speedOid',
                            type: 'id',
                            label: 'speed_oid',
                            tooltip: 'speed_oid_tooltip',
                            onChange: async (_field, data, changeData, socket): Promise<void> => {
                                if (!data.speedOid || data.speedOid === 'nothing_selected') {
                                    return;
                                }
                                const object = await socket.getObject(data.speedOid);
                                if (object?.common) {
                                    data.speedUnit = (object.common as ioBroker.StateCommon).unit || '';
                                    changeData(data);
                                }
                            },
                        },
                        { name: 'speedUnit', label: 'unit' },
                        {
                            name: 'speedDigits',
                            type: 'slider',
                            label: 'digits_after_comma',
                            min: 0,
                            max: 3,
                            step: 1,
                            default: 1,
                        },
                    ],
                },
                {
                    name: 'dial',
                    label: 'group_dial',
                    fields: [
                        {
                            name: 'needleType',
                            type: 'select',
                            label: 'needle_type',
                            options: [
                                { value: 'arrow', label: 'needle_arrow' },
                                { value: 'compass', label: 'needle_compass' },
                                { value: 'wind', label: 'needle_wind' },
                            ],
                            default: 'arrow',
                            hidden: '!!data.rotateDial',
                        },
                        { name: 'rotateDial', type: 'checkbox', label: 'rotate_dial', tooltip: 'rotate_dial_tooltip' },
                        { name: 'needleColor', type: 'color', label: 'needle_color', default: '#d32f2f' },
                        { name: 'northColor', type: 'color', label: 'north_color', default: '#d32f2f' },
                        { name: 'dialColor', type: 'color', label: 'dial_color' },
                        { name: 'scaleColor', type: 'color', label: 'scale_color' },
                        { name: 'showIntercardinal', type: 'checkbox', label: 'show_intercardinal', default: true },
                        { name: 'showDegrees', type: 'checkbox', label: 'show_degrees', default: true },
                        {
                            name: 'bezel',
                            type: 'select',
                            label: 'bezel',
                            options: [
                                { value: 'none', label: 'bezel_none' },
                                { value: 'thin', label: 'bezel_thin' },
                                { value: 'metal', label: 'bezel_metal' },
                            ],
                            default: 'thin',
                        },
                    ],
                },
                {
                    name: 'text',
                    label: 'group_text',
                    fields: [
                        { name: 'showValue', type: 'checkbox', label: 'show_value', default: true },
                        {
                            name: 'valueFormat',
                            type: 'select',
                            label: 'value_format',
                            options: [
                                { value: 'both', label: 'format_both' },
                                { value: 'direction', label: 'format_direction' },
                                { value: 'degrees', label: 'format_degrees' },
                            ],
                            default: 'both',
                            hidden: '!data.showValue',
                        },
                        { name: 'textColor', type: 'color', label: 'text_color', hidden: '!data.showValue' },
                    ],
                },
                Generic.animationGroup({ duration: 1000, easing: 'cubicInOut' }),
            ],
            visDefaultStyle: {
                width: '100%',
                height: 240,
                position: 'relative',
                absoluteWidth: 240,
            },
            visPrev: 'widgets/vis-2-widgets-gauges/img/prev_compass_gauge.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return CompassGauge.getWidgetInfo();
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        const data = this.state.rxData;
        const theme = this.getGaugeTheme();
        const { value } = this.getMainValue();
        let direction: number | null = null;
        if (value !== null) {
            direction = value + num(data.offset, 0) + (isTrue(data.invert) ? 180 : 0);
            direction = ((direction % 360) + 360) % 360;
        }
        const speed = data.speedOid && data.speedOid !== 'nothing_selected' ? this.getNumberOf('speedOid') : null;
        const speedDigits = num(data.speedDigits, 1);
        const hasSpeed = !!data.speedOid && data.speedOid !== 'nothing_selected';

        const drawing: DrawingProps = {
            direction,
            speedText: hasSpeed ? (speed === null ? '–' : formatNumber(speed, speedDigits, this.isFloatComma())) : null,
            speedUnit: data.speedUnit || '',
            names: DIRECTIONS.map(d => CompassGauge.t(`dir_${d}`)),
            showValue: data.showValue === undefined || isTrue(data.showValue),
            valueFormat: data.valueFormat || 'both',
            textColor: data.textColor || theme.text,
            rotateDial: isTrue(data.rotateDial),
            needleType: data.needleType || 'arrow',
            needleColor: data.needleColor || '#d32f2f',
            dialColor: data.dialColor || (theme.dark ? '#1b1b1b' : '#ffffff'),
            scaleColor: data.scaleColor || theme.text,
            northColor: data.northColor || '#d32f2f',
            showDegrees: data.showDegrees === undefined || isTrue(data.showDegrees),
            showIntercardinal: data.showIntercardinal === undefined || isTrue(data.showIntercardinal),
            bezel: data.bezel || 'thin',
            theme,
            animate: isTrue(data.animate),
            duration: num(data.animateDuration, 1000),
            easing: data.animationEasing || 'cubicInOut',
        };

        return this.wrapGauge(
            <GaugeFrame fontFamily={theme.fontFamily}>
                {size => (
                    <CompassDrawing
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
