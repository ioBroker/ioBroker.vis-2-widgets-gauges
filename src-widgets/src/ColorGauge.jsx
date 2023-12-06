import React from 'react';
import PropTypes from 'prop-types';
import { withTheme } from '@mui/styles';
import GaugeChart from 'react-gauge-chart';

import Generic from './Generic';

class ColorGauge extends Generic {
    constructor(props) {
        super(props);
        this.refCardContent = React.createRef();
    }

    static getWidgetInfo() {
        return {
            id: 'tplGauge2Color',
            visSet: 'vis-2-widgets-gauges',
            visWidgetLabel: 'color',  // Label of widget
            visName: 'Color gauge',
            visAttrs: [{
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
            }],
            visDefaultStyle: {
                width: '100%',
                height: 182,
                position: 'relative',
            },
            visPrev: 'widgets/vis-2-widgets-gauges/img/prev_color_gauge.png',
        };
    }

    async propertiesUpdate() {
        if (this.state.rxData.oid &&
            this.state.rxData.oid !== 'nothing_selected' &&
            (!this.state.object || this.state.rxData.oid !== this.state.object._id)
        ) {
            const object = await this.props.context.socket.getObject(this.state.rxData.oid);
            this.setState({ object });
        }
    }

    componentDidMount() {
        super.componentDidMount();
        this.propertiesUpdate();
    }

    onRxDataChanged() {
        this.propertiesUpdate();
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo() {
        return ColorGauge.getWidgetInfo();
    }

    renderWidgetBody(props) {
        super.renderWidgetBody(props);

        const value = this.getValue();

        const colors = [];
        const ranges = [];

        const min = this.state.rxData.min || 0;
        const max = this.state.rxData.max || 100;

        let remaining = max - min;
        for (let i = 1; i <= this.state.rxData.levelsCount; i++) {
            if (this.state.rxData[`color${i}`]) {
                colors.push(this.state.rxData[`color${i}`]);
            }
            const levelThreshold = this.state.rxData[`levelThreshold${i}`]
                ? this.state.rxData[`levelThreshold${i}`] - (this.state.rxData[`levelThreshold${i - 1}`] || min)
                : (max - min) / (this.state.rxData.levelsCount);
            ranges.push((i === this.state.rxData.levelsCount ? remaining : levelThreshold) / (max - min));
            remaining -= levelThreshold;
        }

        let size;
        if (!this.refCardContent.current) {
            setTimeout(() => this.forceUpdate(), 50);
        } else {
            size = this.refCardContent.current.offsetWidth;
            if (size > (this.refCardContent.current.offsetHeight) * 2) {
                size = (this.refCardContent.current.offsetHeight) * 2;
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
        }

        const content = <div
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
            {size ? <GaugeChart
                percent={showValue}
                formatTextValue={() => showText || `${value}${this.state.rxData.unit || '%'}`}
                nrOfLevels={this.state.rxData.levelsCount || undefined}
                colors={colors.length ? colors : undefined}
                arcsLength={ranges.length ? ranges : undefined}
                hideText={!!this.state.rxData.hideText}
                needleColor={this.state.rxData.needleColor || this.props.theme.palette.text.primary}
                needleBaseColor={this.state.rxData.needleBaseColor || this.props.theme.palette.text.primary}
                animate={!!this.state.rxData.animate}
                needleScale={this.state.rxData.needleScale || undefined}
                marginInPercent={this.state.rxData.marginInPercent || undefined}
                cornerRadius={this.state.rxData.cornerRadius || undefined}
                arcPadding={this.state.rxData.arcPadding || undefined}
                arcWidth={this.state.rxData.arcWidth || undefined}
                animDelay={this.state.rxData.animDelay || undefined}
                animateDuration={this.state.rxData.animateDuration || undefined}
                textColor={this.state.rxStyle.color || this.props.theme.palette.text.primary}
                style={textStyle}
            /> : null}
        </div>;

        if (this.state.rxData.noCard || props.widget.usedInWidget) {
            return content;
        }

        return this.wrapContent(content, null, { textAlign: 'center' });
    }
}

ColorGauge.propTypes = {
    systemConfig: PropTypes.object,
    socket: PropTypes.object,
    themeType: PropTypes.string,
    style: PropTypes.object,
    data: PropTypes.object,
};

export default withTheme(ColorGauge);
