import React from 'react';
// @ts-expect-error No types for react-liquid-gauge
import LiquidFillGauge from 'react-liquid-gauge';

import Generic from './Generic';
import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';

const ease = [
    'linear',
    'quadIn',
    'quadOut',
    'quadInOut',
    'cubicIn',
    'cubicOut',
    'cubicInOut',
    'polyIn',
    'polyOut',
    'polyInOut',
    'sinIn',
    'sinOut',
    'sinInOut',
    'expIn',
    'expOut',
    'expInOut',
    'circleIn',
    'circleOut',
    'circleInOut',
    'bounceIn',
    'bounceOut',
    'bounceInOut',
    'backIn',
    'backOut',
    'backInOut',
    'elasticIn',
    'elasticOut',
    'elasticInOut',
];

interface WaterGaugeRxData {
    oid?: string;
    noCard?: boolean;
    widgetTitle?: string;
    min?: number;
    max?: number;
    size?: number;
    unit?: string;
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
    gradient?: boolean;
    levelsCount: number;

    // Gradient levels
    [key: `levelThreshold${number}`]: number | null; // 0%
    [key: `stopColor${number}`]: string; // color
    [key: `stopOpacity${number}`]: number; // 0.5
}

export default class WaterGauge extends Generic<WaterGaugeRxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplGauge2Water',
            visSet: 'vis-2-widgets-gauges',
            visSetLabel: 'set_label',
            visSetColor: '#334455',
            visWidgetLabel: 'water', // Label of widget
            visName: 'Water gauge',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        {
                            name: 'noCard',
                            label: 'without_card',
                            type: 'checkbox',
                        },
                        {
                            name: 'widgetTitle',
                            label: 'name',
                            hidden: '!!data.noCard',
                        },
                        {
                            name: 'oid',
                            type: 'id',
                            label: 'oid',
                            onChange: async (field, data, changeData, socket) => {
                                const object = await socket.getObject(data.oid);
                                if (object && object.common) {
                                    data.min = object.common.min !== undefined ? object.common.min : 0;
                                    data.max = object.common.max !== undefined ? object.common.max : 100;
                                    data.unit = object.common.unit !== undefined ? object.common.unit : '';
                                    changeData(data);
                                }
                            },
                        },
                        {
                            name: 'min',
                            type: 'number',
                            label: 'min',
                        },
                        {
                            name: 'max',
                            type: 'number',
                            label: 'max',
                        },
                        {
                            name: 'size',
                            type: 'number',
                            label: 'size',
                        },
                        {
                            name: 'unit',
                            label: 'unit',
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
                        {
                            name: 'textOffsetX',
                            type: 'number',
                            label: 'text_offset_x',
                        },
                        {
                            name: 'textOffsetY',
                            type: 'number',
                            label: 'text_offset_y',
                        },
                        {
                            name: 'riseAnimation',
                            type: 'checkbox',
                            default: true,
                            label: 'rise_animation',
                        },
                        {
                            name: 'riseAnimationTime',
                            type: 'number',
                            label: 'rise_animation_time',
                            tooltip: 'rise_animation_time_tooltip',
                        },
                        {
                            name: 'riseAnimationEasing',
                            type: 'select',
                            options: ease,
                            noTranslation: true,
                            label: 'rise_animation_easing',
                        },
                        {
                            name: 'waveAnimation',
                            type: 'checkbox',
                            default: true,
                            label: 'wave_animation',
                        },
                        {
                            name: 'waveAnimationTime',
                            type: 'number',
                            label: 'wave_animation_time',
                            tooltip: 'wave_animation_time_tooltip',
                        },
                        {
                            name: 'waveAnimationEasing',
                            type: 'select',
                            options: ease,
                            noTranslation: true,
                            label: 'wave_animation_easing',
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
                            step: 0.1,
                            label: 'inner_radius',
                            tooltip: 'inner_radius_tooltip',
                        },
                        {
                            name: 'outerRadius',
                            type: 'slider',
                            min: 0.1,
                            max: 1,
                            step: 0.1,
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
                        {
                            name: 'textColor',
                            type: 'color',
                            label: 'text_color',
                        },
                        {
                            name: 'textWaveColor',
                            type: 'color',
                            label: 'text_overlapped_color',
                        },
                        {
                            name: 'circleColor',
                            type: 'color',
                            label: 'circle_color',
                        },
                        {
                            name: 'gradient',
                            type: 'checkbox',
                            label: 'gradient',
                        },
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
                        {
                            name: 'stopColor',
                            type: 'color',
                            label: 'level_stop_color',
                        },
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
                            hidden(data, index) {
                                return index === 1 || index === data.levelsCount;
                            },
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

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        const value = this.getValue();

        const gradientStops = [];

        const min = this.state.rxData.min || 0;
        const max = this.state.rxData.max || 100;

        for (let i = 1; i <= this.state.rxData.levelsCount; i++) {
            let threshold = this.state.rxData[`levelThreshold${i}`];
            threshold = threshold === null || threshold === undefined ? max : threshold;
            const levelThreshold = i === 1 ? 0 : Math.round(((threshold - min) / (max - min)) * 100);

            gradientStops.push({
                key: `${levelThreshold}%`,
                stopColor: this.state.rxData[`stopColor${i}`],
                stopOpacity: this.state.rxData[`stopOpacity${i}`],
                offset: `${levelThreshold}%`,
            });
        }

        let size = this.state.rxData.size;

        if (!size) {
            if (!this.refCardContent.current) {
                setTimeout(() => this.forceUpdate(), 50);
            } else {
                size = this.refCardContent.current.offsetWidth;
                if (size > this.refCardContent.current.offsetHeight) {
                    size = this.refCardContent.current.offsetHeight;
                }
            }
            if (size) {
                size -= 10;
            }
        }

        let showValue;
        let showText = null;
        const textStyle: React.CSSProperties = {
            fill:
                this.state.rxData.textColor ||
                this.state.rxStyle?.color ||
                this.props.context.theme.palette.text.primary,
        };
        const waveTextStyle: React.CSSProperties = {
            fill:
                this.state.rxData.textWaveColor ||
                this.state.rxStyle?.color ||
                this.props.context.theme.palette.primary.contrastText,
        };

        if (!window.isFinite(value)) {
            showValue = null;
            showText = value;
            textStyle.display = 'none';
            waveTextStyle.display = 'none';
        } else {
            showValue = ((value - min) / (max - min)) * 100;
        }

        const content = (
            <div
                ref={this.refCardContent}
                style={{
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    overflow: 'hidden',
                    position: 'relative',
                    height: this.state.rxData.noCard || props.widget.usedInWidget ? '100%' : undefined,
                }}
            >
                {this.renderCustomText(showText?.toString())}
                {size ? (
                    <LiquidFillGauge
                        value={showValue}
                        textRenderer={(textProps: {
                            height: number;
                            width: number;
                            textSize: number;
                            percent: number;
                        }) => {
                            const radius = Math.min(textProps.height / 2, textProps.width / 2);
                            const textPixels = (textProps.textSize * radius) / 2;
                            const valueStyle = {
                                fontSize: textPixels,
                            };
                            const percentStyle = {
                                fontSize: textPixels * 0.6,
                            };

                            return (
                                <tspan>
                                    <tspan
                                        className="value"
                                        style={valueStyle}
                                    >
                                        {value}
                                    </tspan>
                                    <tspan style={percentStyle}>{textProps.percent}</tspan>
                                </tspan>
                            );
                        }}
                        percent={this.state.rxData.unit || undefined}
                        width={size}
                        height={size}
                        textSize={this.state.rxData.textSize || undefined}
                        textOffsetX={this.state.rxData.textOffsetX || undefined}
                        textOffsetY={this.state.rxData.textOffsetY || Math.round(size / 15)}
                        riseAnimation={this.state.rxData.riseAnimation || undefined}
                        riseAnimationTime={this.state.rxData.riseAnimationTime || undefined}
                        riseAnimationEasing={this.state.rxData.riseAnimationEasing || undefined}
                        waveAnimation={this.state.rxData.waveAnimation || undefined}
                        waveFrequency={this.state.rxData.waveFrequency || undefined}
                        waveAmplitude={this.state.rxData.waveAmplitude || undefined}
                        waveAnimationTime={this.state.rxData.waveAnimationTime || undefined}
                        waveAnimationEasing={this.state.rxData.waveAnimationEasing || undefined}
                        innerRadius={this.state.rxData.innerRadius || undefined}
                        outerRadius={this.state.rxData.outerRadius || undefined}
                        margin={this.state.rxData.margin || undefined}
                        gradient={!!(this.state.rxData.gradient && gradientStops.length) || undefined}
                        gradientStops={gradientStops}
                        circleStyle={{ fill: this.state.rxData.circleColor || undefined }}
                        textStyle={textStyle}
                        waveTextStyle={waveTextStyle}
                    />
                ) : null}
            </div>
        );

        if (this.state.rxData.noCard || props.widget.usedInWidget) {
            return content;
        }

        return this.wrapContent(content, null, { textAlign: 'center' });
    }
}
