import React from 'react';
import PropTypes from 'prop-types';
import { withStyles, withTheme } from '@mui/styles';
import LiquidFillGauge from 'react-liquid-gauge';
import Generic from './Generic';

const styles = () => ({

});

class WaterGauge extends Generic {
    static getWidgetInfo() {
        return {
            id: 'tplGauge2Water',
            visSet: 'vis-2-widgets-gauges',
            visSetLabel: 'vis_2_widgets_gauges_set_label',
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
                        name: 'width',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_width',
                    },
                    {
                        name: 'height',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_height',
                    },
                    {
                        name: 'unit',
                        label: 'vis_2_widgets_gauges_unit',
                    },
                    {
                        name: 'textSize',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_text_size',
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
                        name: 'waveAnimation',
                        type: 'checkbox',
                        default: true,
                        label: 'vis_2_widgets_gauges_wave_animation',
                    },
                    {
                        name: 'waveFrequency',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_wave_frequency',
                    },
                    {
                        name: 'waveAmplitude',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_wave_amplitude',
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
                        name: 'percentThreshold',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_percent_threshold',
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
            gradientStops.push({
                key: `${this.state.rxData[`percentThreshold${i}`]}%`,
                stopColor: this.state.rxData[`stopColor${i}`],
                stopOpacity: this.state.rxData[`stopOpacity${i}`],
                offset: `${this.state.rxData[`percentThreshold${i}`]}%`,
            });
        }

        const content = <LiquidFillGauge
            value={((value - min) / (max - min)) * 100}
            percent={this.state.rxData.unit || undefined}
            width={this.state.rxData.width || undefined}
            height={this.state.rxData.height || undefined}
            textSize={this.state.rxData.textSize || undefined}
            textOffsetX={this.state.rxData.textOffsetX || undefined}
            textOffsetY={this.state.rxData.textOffsetY || undefined}
            riseAnimation={this.state.rxData.riseAnimation || undefined}
            waveAnimation={this.state.rxData.waveAnimation || undefined}
            waveFrequency={this.state.rxData.waveFrequency || undefined}
            waveAmplitude={this.state.rxData.waveAmplitude || undefined}
            gradient={this.state.rxData.gradient || undefined}
            gradientStops={gradientStops}
            textStyle={{ fill: this.props.theme.palette.text.primary }}
            waveTextStyle={{ fill: this.props.theme.palette.primary.contrastText }}
        />;

        return this.wrapContent(content, this.state.rxData.name, { textAlign: 'center' });
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