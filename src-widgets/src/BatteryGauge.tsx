import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';

import Generic from './Generic';
import GaugeFrame, { fitFontSize } from './Components/GaugeFrame';
import { clamp, uniqueId } from './Components/geometry';
import { animationsFrozen, useAnimatedValue } from './Components/hooks';
import { isTrue, num, toNumber } from './Components/format';

interface BatteryGaugeRxData {
    noCard: boolean;
    widgetTitle: string;
    oid: string;
    'charging-oid': string;
    min: number;
    max: number;
    orientation: 'horizontal' | 'vertical';
    padding: number;
    size: number;
    aspectRatio: number;
    animated: boolean;
    batteryBodyCornerRadius: number;
    batteryBodyFill: string;
    batteryBodyStrokeColor: string;
    batteryBodyStrokeWidth: number;
    batteryCapFill: string;
    batteryCapStrokeWidth: number;
    batteryCapStrokeColor: string;
    batteryCapCornerRadius: number;
    batteryCapCapToBodyRatio: number;
    batteryMeterFill: string;
    batteryMeterLowBatteryValue: number;
    batteryMeterLowBatteryFill: string;
    batteryMeterMediumBatteryValue: number;
    batteryMeterMediumBatteryFill: string;
    batteryMeterOuterGap: number;
    batteryMeterNoOfCells: number;
    batteryMeterInterCellsGap: number;
    readingTextLightContrastColor: string;
    readingTextDarkContrastColor: string;
    readingTextLowBatteryColor: string;
    readingTextFontFamily: string;
    readingTextFontSize: number;
    readingTextShowPercentage: boolean;
    chargingFlashScale: number;
    chargingFlashFill: string;
    chargingFlashAnimated: boolean;
    chargingFlashAnimationDuration: number;
}

/** Width of the drawing in canvas units, as in react-battery-gauge. Every length setting is in these units. */
const CANVAS_WIDTH = 100;

/** The flash of react-battery-gauge: path and size in canvas units */
const FLASH_WIDTH = 16.8;
const FLASH_HEIGHT = 28.7;
const FLASH_PATH = 'l-13,16.8l7.4,0l-1.8,11.9l11.2,-16.8l-7.4,0l3.6,-11.9z';

interface DrawingProps {
    /** Charge in percent, 0..100 */
    percent: number;
    charging: boolean;
    animated: boolean;
    vertical: boolean;
    aspectRatio: number;
    padding: number;
    body: { strokeWidth: number; cornerRadius: number; fill: string; strokeColor: string };
    cap: { strokeWidth: number; cornerRadius: number; fill: string; strokeColor: string; ratio: number };
    meter: {
        fill: string;
        lowValue: number;
        lowFill: string;
        mediumValue: number | null;
        mediumFill: string;
        outerGap: number;
        cells: number;
        cellGap: number;
    };
    text: {
        lightColor: string;
        darkColor: string;
        lowColor: string;
        fontFamily: string;
        fontSize: number;
        showPercentage: boolean;
        custom: string | null;
    };
    flash: { scale: number; fill: string; animated: boolean; duration: number };
}

/** Runs the meter from empty to full again and again while the battery is charging */
function useChargingSweep(enabled: boolean): number {
    const [value, setValue] = React.useState(animationsFrozen() ? 70 : 1);
    React.useEffect(() => {
        if (!enabled || animationsFrozen()) {
            return undefined;
        }
        let frame = 0;
        let start: number | null = null;
        const duration = 2000;
        const pause = duration / 5;
        const step = (now: number): void => {
            if (start === null) {
                start = now;
            }
            const t = (now - start) % (duration + pause);
            setValue(1 + Math.min(1, t / duration) * 99);
            frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [enabled]);
    return value;
}

function BatteryDrawing(props: DrawingProps & { length: number }): React.JSX.Element {
    const ids = React.useMemo(
        () => ({
            cap: uniqueId('battery-cap'),
            meter: uniqueId('battery-meter'),
            filled: uniqueId('battery-filled'),
            empty: uniqueId('battery-empty'),
        }),
        [],
    );
    const animatedValue = useAnimatedValue(props.percent, {
        enabled: props.animated,
        duration: 1000,
        easing: 'linear',
        initial: 0,
    });
    const sweep = useChargingSweep(props.charging);
    const value = clamp(props.charging ? sweep : animatedValue, 0, 100);

    const H = Math.round(CANVAS_WIDTH * props.aspectRatio);
    const { body, cap, meter, text } = props;
    const pad = body.strokeWidth / 2 + props.padding;

    // Body, cap and the area of the meter, exactly as react-battery-gauge computes them
    const bodyHeight = H - 2 * pad;
    const capHeight = bodyHeight * cap.ratio;
    const capWidth = capHeight / 2;
    const bodyWidth = CANVAS_WIDTH - capWidth - 2 * pad;
    const mx = pad + body.strokeWidth / 2 + meter.outerGap;
    const my = mx;
    const mw = bodyWidth - body.strokeWidth - 2 * meter.outerGap;
    const mh = bodyHeight - body.strokeWidth - 2 * meter.outerGap;
    const meterRadius = Math.max(0, body.cornerRadius - body.strokeWidth / 2 - meter.outerGap);

    // While charging the low colour is not used - the battery is getting full
    let fill = meter.fill;
    if (!props.charging) {
        if (value < meter.lowValue) {
            fill = meter.lowFill;
        } else if (meter.mediumValue !== null && value < meter.mediumValue) {
            fill = meter.mediumFill;
        }
    }
    const low = !props.charging && value < meter.lowValue;

    const cells = Math.max(1, Math.round(meter.cells));
    let visibleCells = Math.floor((value / 100) * cells);
    if (visibleCells === 0 && value > 0) {
        visibleCells = 1;
    }
    const filledWidth = Math.max(0, cells > 1 ? (mw / cells) * visibleCells - meter.cellGap / 2 : (mw * value) / 100);

    let meterShapes: React.JSX.Element[];
    if (cells > 1) {
        meterShapes = [];
        for (let i = 0; i < visibleCells; i++) {
            meterShapes.push(
                <rect
                    key={i}
                    x={mx + ((mw + meter.cellGap) / cells) * i}
                    y={my}
                    width={Math.max(0, mw / cells - meter.cellGap)}
                    height={mh}
                    fill={fill}
                    clipPath={`url(#${ids.meter})`}
                />,
            );
        }
    } else {
        meterShapes = [
            <rect
                key="meter"
                x={mx}
                y={my}
                width={(mw * value) / 100}
                height={mh}
                fill={fill}
                clipPath={`url(#${ids.meter})`}
            />,
        ];
    }

    // In the vertical battery the text stays horizontal: it is turned back around the middle of the meter
    const textX = mx + mw / 2;
    const textY = my + mh / 2;
    const textRotate = props.vertical ? `rotate(90 ${textX} ${textY})` : undefined;
    const label = `${Math.round(value)}${text.showPercentage ? '%' : ''}`;
    const readingText = (color: string, clip: string): React.JSX.Element => (
        <g clipPath={`url(#${clip})`}>
            <text
                x={textX}
                y={textY}
                transform={textRotate}
                dominantBaseline="central"
                textAnchor="middle"
                fill={low ? text.lowColor : color}
                fontFamily={text.fontFamily}
                fontWeight="bold"
                fontSize={text.fontSize}
            >
                {label}
            </text>
        </g>
    );

    const flashScale = props.flash.scale || 1;

    // Everything is drawn horizontally (cap on the right) in canvas units and then fitted into the widget;
    // the vertical battery is the same drawing turned by -90 degrees, with the cap on top
    const viewBox = props.vertical ? `0 0 ${H} ${CANVAS_WIDTH}` : `0 0 ${CANVAS_WIDTH} ${H}`;
    const thickness = props.length * (H / CANVAS_WIDTH);

    return (
        <svg
            width={props.vertical ? thickness : props.length}
            height={props.vertical ? props.length : thickness}
            viewBox={viewBox}
            overflow="visible"
        >
            <g transform={props.vertical ? `translate(0 ${CANVAS_WIDTH}) rotate(-90)` : undefined}>
                <defs>
                    <clipPath id={ids.cap}>
                        <rect
                            x={CANVAS_WIDTH - pad - capWidth}
                            y={(H - capHeight - cap.strokeWidth) / 2}
                            width={capWidth}
                            height={capHeight + cap.strokeWidth}
                        />
                    </clipPath>
                    <clipPath id={ids.meter}>
                        <rect
                            x={mx}
                            y={my}
                            rx={meterRadius}
                            ry={meterRadius}
                            width={Math.max(0, mw)}
                            height={Math.max(0, mh)}
                        />
                    </clipPath>
                    <clipPath id={ids.filled}>
                        <rect
                            x={mx}
                            y={my}
                            width={filledWidth}
                            height={Math.max(0, mh)}
                        />
                    </clipPath>
                    <clipPath id={ids.empty}>
                        <rect
                            x={mx + filledWidth}
                            y={my}
                            width={Math.max(0, mw - filledWidth)}
                            height={Math.max(0, mh)}
                        />
                    </clipPath>
                </defs>
                <rect
                    x={pad}
                    y={pad}
                    rx={body.cornerRadius}
                    ry={body.cornerRadius}
                    width={Math.max(0, bodyWidth)}
                    height={Math.max(0, bodyHeight)}
                    strokeWidth={body.strokeWidth}
                    fill={body.fill}
                    stroke={body.strokeColor}
                />
                <rect
                    clipPath={`url(#${ids.cap})`}
                    x={CANVAS_WIDTH - pad - capWidth - cap.cornerRadius}
                    y={(H - capHeight) / 2}
                    rx={cap.cornerRadius}
                    ry={cap.cornerRadius}
                    width={capWidth}
                    height={capHeight}
                    strokeWidth={cap.strokeWidth}
                    fill={cap.fill}
                    stroke={cap.strokeColor}
                />
                {meterShapes}
                {props.charging ? (
                    <g
                        transform={`translate(${textX} ${textY}) ${props.vertical ? 'rotate(90)' : ''} scale(${flashScale})`}
                    >
                        <path
                            d={`M${FLASH_WIDTH / 2},${-FLASH_HEIGHT / 2}${FLASH_PATH}`}
                            fill={props.flash.fill}
                        >
                            {props.flash.animated && !animationsFrozen() ? (
                                <animate
                                    attributeName="opacity"
                                    values="0.2;1;0.2"
                                    dur={`${Math.max(0.1, (2 * props.flash.duration) / 1000)}s`}
                                    repeatCount="indefinite"
                                />
                            ) : null}
                        </path>
                    </g>
                ) : text.custom === null && text.fontSize > 0 ? (
                    <>
                        {readingText(text.darkColor, ids.filled)}
                        {readingText(text.lightColor, ids.empty)}
                    </>
                ) : null}
            </g>
            {text.custom !== null ? (
                <text
                    x={(props.vertical ? H : CANVAS_WIDTH) / 2}
                    y={(props.vertical ? CANVAS_WIDTH : H) / 2}
                    dominantBaseline="central"
                    textAnchor="middle"
                    fill={text.lightColor}
                    fontFamily={text.fontFamily}
                    fontSize={fitFontSize(text.custom, H * 0.4, (props.vertical ? H : CANVAS_WIDTH) * 0.8)}
                >
                    {text.custom}
                </text>
            ) : null}
        </svg>
    );
}

/**
 * `tplGauge2Battery` - a battery with its charge.
 *
 * The first version drew it with react-battery-gauge. This one draws the same picture with plain SVG; the
 * settings, their names and their defaults are the same. All lengths are in the units of the drawing, which is
 * 100 wide.
 */
export default class BatteryGauge extends Generic<BatteryGaugeRxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplGauge2Battery',
            visSet: 'vis-2-widgets-gauges',
            visSetLabel: 'set_label',
            visSetColor: '#334455',
            visWidgetLabel: 'battery',
            visName: 'Battery gauge',
            visHelp: 'help_battery',
            visOrder: 3,
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'noCard', label: 'without_card', type: 'checkbox' },
                        { name: 'widgetTitle', label: 'name', hidden: '!!data.noCard' },
                        Generic.oidField(),
                        {
                            name: 'charging-oid',
                            type: 'id',
                            label: 'charging',
                            tooltip: 'charging_tooltip',
                        },
                        { name: 'min', type: 'number', label: 'min' },
                        { name: 'max', type: 'number', label: 'max' },
                        {
                            name: 'orientation',
                            type: 'select',
                            options: [
                                { value: 'horizontal', label: 'horizontal' },
                                { value: 'vertical', label: 'vertical' },
                            ],
                            label: 'orientation',
                        },
                        { name: 'padding', type: 'number', label: 'padding', tooltip: 'canvas_units_tooltip' },
                        { name: 'size', type: 'number', label: 'size', tooltip: 'battery_size_tooltip' },
                        {
                            name: 'aspectRatio',
                            type: 'slider',
                            min: 0.1,
                            max: 2,
                            step: 0.05,
                            label: 'aspect_ratio',
                            tooltip: 'aspect_ratio_tooltip',
                        },
                        { name: 'animated', type: 'checkbox', label: 'animated' },
                    ],
                },
                {
                    name: 'batteryBody',
                    label: 'battery_body',
                    fields: [
                        { name: 'batteryBodyCornerRadius', type: 'number', label: 'corner_radius' },
                        { name: 'batteryBodyFill', type: 'color', label: 'fill' },
                        { name: 'batteryBodyStrokeColor', type: 'color', label: 'stroke_color' },
                        {
                            name: 'batteryBodyStrokeWidth',
                            type: 'number',
                            label: 'stroke_width',
                            tooltip: 'canvas_units_tooltip',
                        },
                    ],
                },
                {
                    name: 'batteryCap',
                    label: 'battery_cap',
                    fields: [
                        { name: 'batteryCapFill', type: 'color', label: 'fill' },
                        {
                            name: 'batteryCapStrokeWidth',
                            type: 'number',
                            label: 'stroke_width',
                            tooltip: 'canvas_units_tooltip',
                        },
                        { name: 'batteryCapStrokeColor', type: 'color', label: 'stroke_color' },
                        { name: 'batteryCapCornerRadius', type: 'number', label: 'corner_radius' },
                        {
                            name: 'batteryCapCapToBodyRatio',
                            type: 'slider',
                            min: 0.1,
                            max: 1,
                            step: 0.05,
                            label: 'cap_to_body_ratio',
                        },
                    ],
                },
                {
                    name: 'batteryMeter',
                    label: 'battery_meter',
                    fields: [
                        { name: 'batteryMeterFill', type: 'color', label: 'fill' },
                        {
                            name: 'batteryMeterLowBatteryValue',
                            type: 'number',
                            label: 'low_battery_value',
                            tooltip: 'low_battery_value_tooltip',
                        },
                        { name: 'batteryMeterLowBatteryFill', type: 'color', label: 'low_battery_fill' },
                        {
                            name: 'batteryMeterMediumBatteryValue',
                            type: 'number',
                            label: 'medium_battery_value',
                            tooltip: 'medium_battery_value_tooltip',
                        },
                        {
                            name: 'batteryMeterMediumBatteryFill',
                            type: 'color',
                            label: 'medium_battery_fill',
                            hidden: 'data.batteryMeterMediumBatteryValue === undefined || data.batteryMeterMediumBatteryValue === null || data.batteryMeterMediumBatteryValue === ""',
                        },
                        { name: 'batteryMeterOuterGap', type: 'number', label: 'outer_gap' },
                        {
                            name: 'batteryMeterNoOfCells',
                            type: 'number',
                            label: 'no_of_cells',
                            tooltip: 'no_of_cells_tooltip',
                        },
                        { name: 'batteryMeterInterCellsGap', type: 'number', label: 'inter_cells_gap' },
                    ],
                },
                {
                    name: 'readingText',
                    label: 'text',
                    fields: [
                        { name: 'readingTextLightContrastColor', type: 'color', label: 'light_contrast_color' },
                        { name: 'readingTextDarkContrastColor', type: 'color', label: 'dark_contrast_color' },
                        { name: 'readingTextLowBatteryColor', type: 'color', label: 'low_battery_color' },
                        { name: 'readingTextFontFamily', label: 'font_family' },
                        {
                            name: 'readingTextFontSize',
                            type: 'number',
                            label: 'font_size',
                            tooltip: 'battery_font_size_tooltip',
                        },
                        {
                            name: 'readingTextShowPercentage',
                            type: 'checkbox',
                            label: 'show_percentage',
                            default: true,
                        },
                    ],
                },
                {
                    name: 'chargingFlash',
                    label: 'charging_flash',
                    hidden: '!data["charging-oid"] || data["charging-oid"] === "nothing_selected"',
                    fields: [
                        {
                            name: 'chargingFlashScale',
                            type: 'slider',
                            min: 0.1,
                            max: 1,
                            step: 0.05,
                            label: 'scale',
                        },
                        { name: 'chargingFlashFill', type: 'color', label: 'fill' },
                        { name: 'chargingFlashAnimated', type: 'checkbox', label: 'animated' },
                        {
                            name: 'chargingFlashAnimationDuration',
                            type: 'number',
                            label: 'animation_duration',
                            tooltip: 'animation_duration_tooltip',
                            hidden: '!data.chargingFlashAnimated',
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
            visPrev: 'widgets/vis-2-widgets-gauges/img/prev_battery_gauge.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return BatteryGauge.getWidgetInfo();
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
        const toPercent = (v: number): number => ((v - min) / (max - min)) * 100;

        const chargingOid = data['charging-oid'];
        const charging =
            !!chargingOid && chargingOid !== 'nothing_selected' && isTrue(this.state.values[`${chargingOid}.val`]);

        const lowValue = toNumber(data.batteryMeterLowBatteryValue);
        const mediumValue = toNumber(data.batteryMeterMediumBatteryValue);
        const vertical = data.orientation === 'vertical';
        const aspectRatio = num(data.aspectRatio, 0) || 0.52;
        const fontSize = toNumber(data.readingTextFontSize);

        const drawing: DrawingProps = {
            percent: value === null ? 0 : toPercent(value),
            charging,
            animated: isTrue(data.animated),
            vertical,
            aspectRatio,
            padding: num(data.padding, 0),
            body: {
                strokeWidth: num(data.batteryBodyStrokeWidth, 0) || 4,
                cornerRadius: num(data.batteryBodyCornerRadius, 0) || 6,
                fill: data.batteryBodyFill || 'none',
                strokeColor: data.batteryBodyStrokeColor || theme.text,
            },
            cap: {
                strokeWidth: num(data.batteryCapStrokeWidth, 0) || 4,
                cornerRadius: num(data.batteryCapCornerRadius, 0) || 2,
                fill: data.batteryCapFill || 'none',
                strokeColor: data.batteryCapStrokeColor || theme.text,
                ratio: num(data.batteryCapCapToBodyRatio, 0) || 0.4,
            },
            meter: {
                fill: data.batteryMeterFill || 'green',
                lowValue: lowValue === null ? 15 : toPercent(lowValue),
                lowFill: data.batteryMeterLowBatteryFill || 'red',
                mediumValue: mediumValue === null ? null : toPercent(mediumValue),
                mediumFill: data.batteryMeterMediumBatteryFill || 'orange',
                outerGap: num(data.batteryMeterOuterGap, 0) || 1,
                cells: num(data.batteryMeterNoOfCells, 0) || 1,
                cellGap: num(data.batteryMeterInterCellsGap, 0) || 1,
            },
            text: {
                lightColor: data.readingTextLightContrastColor || theme.text,
                darkColor: data.readingTextDarkContrastColor || '#fff',
                lowColor: data.readingTextLowBatteryColor || 'red',
                fontFamily: data.readingTextFontFamily || 'Helvetica',
                fontSize: fontSize === null ? 14 : fontSize,
                // the first version never offered this setting and always showed the sign
                showPercentage: data.readingTextShowPercentage === undefined || isTrue(data.readingTextShowPercentage),
                custom: text,
            },
            flash: {
                scale: num(data.chargingFlashScale, 0),
                fill: data.chargingFlashFill || 'orange',
                // react-battery-gauge blinks by default, the setting could only turn it on
                animated: data.chargingFlashAnimated === undefined || isTrue(data.chargingFlashAnimated),
                duration: num(data.chargingFlashAnimationDuration, 0) || 1000,
            },
        };
        const fixedSize = num(data.size, 0);

        return this.wrapGauge(
            <GaugeFrame fontFamily={theme.fontFamily}>
                {size => {
                    // "Size" is the length of the battery, the other side follows from the aspect ratio
                    let length = fixedSize;
                    if (!length) {
                        if (vertical) {
                            length = size.height;
                            if (length * aspectRatio > size.width) {
                                length = size.width / aspectRatio;
                            }
                        } else {
                            length = size.width;
                            if (length * aspectRatio > size.height) {
                                length = size.height / aspectRatio;
                            }
                        }
                        length -= 10;
                    }
                    length = Math.max(1, length);
                    const thickness = (length * Math.round(CANVAS_WIDTH * aspectRatio)) / CANVAS_WIDTH;
                    const w = vertical ? thickness : length;
                    const h = vertical ? length : thickness;
                    return (
                        <g transform={`translate(${(size.width - w) / 2} ${(size.height - h) / 2})`}>
                            <BatteryDrawing
                                {...drawing}
                                length={length}
                            />
                        </g>
                    );
                }}
            </GaugeFrame>,
            props,
        );
    }
}
