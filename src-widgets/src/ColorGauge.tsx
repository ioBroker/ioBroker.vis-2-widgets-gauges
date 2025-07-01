import React from 'react';
import GaugeChart from 'react-gauge-chart';

import Generic from './Generic';
import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';

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
    animate?: boolean;
    animDelay?: number;
    animateDuration?: number;
    [key: `color${number}`]: string;
    [key: `levelThreshold${number}`]: number;
}

class ColorGauge extends Generic<ColorGaugeRxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplGauge2Color',
            visSet: 'vis-2-widgets-gauges',
            visWidgetLabel: 'color', // Label of widget
            visName: 'Color gauge',
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
                            name: 'unit',
                            label: 'unit',
                        },
                        {
                            name: 'levelsCount',
                            type: 'number',
                            label: 'levels_count',
                        },
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
                        {
                            name: 'needleColor',
                            type: 'color',
                            label: 'needle_color',
                        },
                        {
                            name: 'needleBaseColor',
                            type: 'color',
                            label: 'needle_base_color',
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
                        {
                            name: 'cornerRadius',
                            type: 'number',
                            label: 'corner_radius',
                        },
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
                        {
                            name: 'hideText',
                            type: 'checkbox',
                            label: 'hide_value',
                        },
                        {
                            name: 'needleScale',
                            type: 'slider',
                            min: 0.01,
                            max: 1,
                            step: 0.01,
                            label: 'needle_size',
                            hidden: 'true', // does not work
                        },
                    ],
                },
                {
                    name: 'animation',
                    label: 'animation',
                    fields: [
                        {
                            name: 'animate',
                            type: 'checkbox',
                            default: true,
                            label: 'animate',
                        },
                        {
                            name: 'animDelay',
                            type: 'number',
                            label: 'anim_delay',
                            tooltip: 'anim_delay_tooltip',
                        },
                        {
                            name: 'animateDuration',
                            type: 'number',
                            label: 'animate_duration',
                            tooltip: 'animate_duration_tooltip',
                        },
                    ],
                },
                {
                    name: 'level',
                    label: 'level',
                    indexFrom: 1,
                    indexTo: 'levelsCount',
                    fields: [
                        {
                            name: 'color',
                            type: 'color',
                            label: 'color',
                        },
                        {
                            name: 'levelThreshold',
                            type: 'number',
                            label: 'level_threshold',
                            hidden: (data, index) => index === data.levelsCount,
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

        let value = this.getValue();

        const colors = [];
        const ranges = [];

        const min = this.state.rxData.min || 0;
        const max = this.state.rxData.max || 100;

        let remaining = max - min;
        for (let i = 1; i <= this.state.rxData.levelsCount; i++) {
            if (this.state.rxData[`color${i}`]) {
                colors.push(this.state.rxData[`color${i}`]);
            }
            const levelThresholdNow = this.state.rxData[`levelThreshold${i}`];
            const levelThresholdPrev = this.state.rxData[`levelThreshold${i - 1}`];
            const levelThreshold = levelThresholdNow
                ? levelThresholdNow - (levelThresholdPrev || min)
                : (max - min) / this.state.rxData.levelsCount;
            ranges.push((i === this.state.rxData.levelsCount ? remaining : levelThreshold) / (max - min));
            remaining -= levelThreshold;
        }

        let size;
        if (!this.refCardContent.current) {
            setTimeout(() => this.forceUpdate(), 50);
        } else {
            size = this.refCardContent.current.offsetWidth;
            if (size > this.refCardContent.current.offsetHeight * 2) {
                size = this.refCardContent.current.offsetHeight * 2;
            }
        }

        let showValue;
        let showText = null;
        const textStyle = {
            width: `${size}px`,
        };

        // eslint-disable-next-line no-restricted-properties
        if (!window.isFinite(value)) {
            showValue = null;
            showText = value;
        } else {
            showValue = (value - min) / (max - min);
            if (this.state.rxData.digitsAfterComma !== null && this.state.rxData.digitsAfterComma !== undefined) {
                const p = 10 ** this.state.rxData.digitsAfterComma;
                value = Math.round(value * p) / p;
            }
        }

        const defaultProps = {
            animDelay: 500,
            animate: true,
            animateDuration: 3000,
            arcPadding: 0.05,
            arcWidth: 0.2,
            arcsLength: undefined,
            colors: ['#00FF00', '#FF0000'],
            cornerRadius: 6,
            customNeedleComponent: null,
            fontSize: null,
            formatTextValue: null,
            hideText: false,
            marginInPercent: 0.05,
            needleBaseColor: '#464A4F',
            needleColor: '#464A4F',
            needleScale: 0.55,
            nrOfLevels: 3,
            percent: 0.4,
            textColor: '#fff',
            textComponent: undefined,
        };

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
                    height: this.state.rxData.noCard || props.widget.usedInWidget ? '100%' : undefined,
                }}
            >
                {size ? (
                    <GaugeChart
                        percent={showValue === null ? undefined : showValue}
                        formatTextValue={() =>
                            showText !== null ? showText.toString() : `${value}${this.state.rxData.unit || '%'}`
                        }
                        nrOfLevels={this.state.rxData.levelsCount || defaultProps.nrOfLevels}
                        colors={colors.length ? colors : defaultProps.colors}
                        arcsLength={ranges.length ? ranges : defaultProps.arcsLength}
                        hideText={!!this.state.rxData.hideText}
                        needleColor={
                            this.state.rxData.needleColor ||
                            this.props.context.theme.palette.text.primary ||
                            defaultProps.needleColor
                        }
                        needleBaseColor={
                            this.state.rxData.needleBaseColor ||
                            this.props.context.theme.palette.text.primary ||
                            defaultProps.needleBaseColor
                        }
                        animate={!!this.state.rxData.animate}
                        // @ts-expect-error Wrong types in GaugeChart
                        needleScale={this.state.rxData.needleScale || defaultProps.needleScale}
                        marginInPercent={this.state.rxData.marginInPercent || defaultProps.marginInPercent}
                        cornerRadius={this.state.rxData.cornerRadius || defaultProps.cornerRadius}
                        arcPadding={this.state.rxData.arcPadding || defaultProps.arcPadding}
                        arcWidth={this.state.rxData.arcWidth || defaultProps.arcWidth}
                        animDelay={this.state.rxData.animDelay || defaultProps.animDelay}
                        animateDuration={this.state.rxData.animateDuration || defaultProps.animateDuration}
                        textColor={
                            this.state.rxStyle?.color ||
                            this.props.context.theme.palette.text.primary ||
                            defaultProps.textColor
                        }
                        style={textStyle}
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

export default ColorGauge;
