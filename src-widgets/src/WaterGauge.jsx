import React from 'react';
import PropTypes from 'prop-types';
import { withStyles, withTheme } from '@mui/styles';
import LiquidFillGauge from 'react-liquid-gauge';
import Generic from './Generic';

const ease = ['linear',
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
    'elasticInOut'];

const styles = () => ({

});

class WaterGauge extends Generic {
    constructor(props) {
        super(props);
        this.refCardContent = React.createRef();
    }

    static getWidgetInfo() {
        return {
            id: 'tplGauge2Water',
            visSet: 'vis-2-widgets-gauges',
            visSetLabel: 'vis_2_widgets_gauges_set_label',
            visSetColor: '#334455',
            visWidgetLabel: 'vis_2_widgets_gauges_water',  // Label of widget
            visName: 'Water gauge',
            visAttrs: [{
                name: 'common',
                fields: [
                    {
                        name: 'name',
                        label: 'vis_2_widgets_gauges_name',
                    },
                    {
                        name: 'oid',
                        type: 'id',
                        label: 'vis_2_widgets_gauges_oid',
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
                        label: 'vis_2_widgets_gauges_min',
                    },
                    {
                        name: 'max',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_max',
                    },
                    {
                        name: 'size',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_size',
                    },
                    {
                        name: 'unit',
                        label: 'vis_2_widgets_gauges_unit',
                    },
                    {
                        name: 'textSize',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_text_size',
                        tooltip: 'vis_2_widgets_gauges_text_size_tooltip',
                    },
                    {
                        name: 'textOffsetX',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_text_offset_x',
                    },
                    {
                        name: 'textOffsetY',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_text_offset_y',
                    },
                    {
                        name: 'riseAnimation',
                        type: 'checkbox',
                        default: true,
                        label: 'vis_2_widgets_gauges_rise_animation',
                    },
                    {
                        name: 'riseAnimationTime',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_rise_animation_time',
                        tooltip: 'vis_2_widgets_gauges_rise_animation_time_tooltip',
                    },
                    {
                        name: 'riseAnimationEasing',
                        type: 'select',
                        options: ease,
                        label: 'vis_2_widgets_gauges_rise_animation_easing',
                    },
                    {
                        name: 'waveAnimation',
                        type: 'checkbox',
                        default: true,
                        label: 'vis_2_widgets_gauges_wave_animation',
                    },
                    {
                        name: 'waveAnimationTime',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_wave_animation_time',
                        tooltip: 'vis_2_widgets_gauges_wave_animation_time_tooltip',
                    },
                    {
                        name: 'waveAnimationEasing',
                        type: 'select',
                        options: ease,
                        label: 'vis_2_widgets_gauges_wave_animation_easing',
                    },
                    {
                        name: 'waveFrequency',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_wave_frequency',
                        tooltip: 'vis_2_widgets_gauges_wave_frequency_tooltip',
                    },
                    {
                        name: 'waveAmplitude',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_wave_amplitude',
                        tooltip: 'vis_2_widgets_gauges_wave_amplitude_tooltip',
                    },
                    {
                        name: 'innerRadius',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_inner_radius',
                        tooltip: 'vis_2_widgets_gauges_inner_radius_tooltip',
                    },
                    {
                        name: 'outerRadius',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_outer_radius',
                        tooltip: 'vis_2_widgets_gauges_outer_radius_tooltip',
                    },
                    {
                        name: 'margin',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_margin',
                        tooltip: 'vis_2_widgets_gauges_margin_tooltip',
                    },
                    {
                        name: 'gradient',
                        type: 'checkbox',
                        label: 'vis_2_widgets_gauges_gradient',
                    },
                    {
                        name: 'levelsCount',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_levels_count',
                    },
                ],
            }, {
                name: 'level',
                indexFrom: 1,
                indexTo: 'levelsCount',
                fields: [
                    {
                        name: 'stopColor',
                        type: 'color',
                        label: 'vis_2_widgets_gauges_level_stop_color',
                    },
                    {
                        name: 'stopOpacity',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_level_stop_opacity',
                    },
                    {
                        name: 'levelThreshold',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_level_threshold',
                        hidden(data, index) {
                            return index === data.levelsCount;
                        },
                    },
                ],
            }],
            visDefaultStyle: {
                width: '100%',
                height: 120,
                position: 'relative',
            },
            visPrev: 'widgets/vis-2-widgets-gauges/img/prev_water_gauge.png',
        };
    }

    async propertiesUpdate() {
        if (this.state.rxData.oid && this.state.rxData.oid !== 'nothing_selected') {
            const obj = await this.props.socket.getObject(this.state.rxData.oid);
            this.setState({ object: obj });
        }
    }

    componentDidMount() {
        super.componentDidMount();
        this.propertiesUpdate();
    }

    onPropertiesUpdated() {
        super.onPropertiesUpdated();
        this.propertiesUpdate();
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo() {
        return WaterGauge.getWidgetInfo();
    }

    renderWidgetBody(props) {
        super.renderWidgetBody(props);

        const value = this.state.values[`${this.state.object?._id}.val`];

        const gradientStops = [];

        const min = this.state.rxData.min || 0;
        const max = this.state.rxData.max || 100;

        for (let i = 1; i <= this.state.rxData.levelsCount; i++) {
            const levelThreshold = i === 0
                ? 0
                : Math.round((this.state.rxData[`levelThreshold${i - 1}`] - min) / (max - min) * 100);
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
                if (size > this.refCardContent.current.offsetHeight - 20) {
                    size = this.refCardContent.current.offsetHeight - 20;
                }
            }
        }

        const content = <div ref={this.refCardContent} style={{ width: '100%', height: '100%' }}>
            {size ? <LiquidFillGauge
                value={((value - min) / (max - min)) * 100}
                textRenderer={textProps => {
                    const radius = Math.min(textProps.height / 2, textProps.width / 2);
                    const textPixels = (textProps.textSize * radius / 2);
                    const valueStyle = {
                        fontSize: textPixels,
                    };
                    const percentStyle = {
                        fontSize: textPixels * 0.6,
                    };

                    return (
                        <tspan>
                            <tspan className="value" style={valueStyle}>{value}</tspan>
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
                gradient={this.state.rxData.gradient || undefined}
                gradientStops={gradientStops}
                textStyle={{ fill: this.props.theme.palette.text.primary }}
                waveTextStyle={{ fill: this.props.theme.palette.primary.contrastText }}
            /> : null}
        </div>;

        return this.wrapContent(content, null, { textAlign: 'center' });
    }
}

WaterGauge.propTypes = {
    systemConfig: PropTypes.object,
    socket: PropTypes.object,
    themeType: PropTypes.string,
    style: PropTypes.object,
    data: PropTypes.object,
};

export default withStyles(styles)(withTheme(WaterGauge));
