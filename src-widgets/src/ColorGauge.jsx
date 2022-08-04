import React from 'react';
import PropTypes from 'prop-types';
import { withStyles, withTheme } from '@mui/styles';
import GaugeChart from 'react-gauge-chart';
import Generic from './Generic';

const styles = () => ({

});

class ColorGauge extends Generic {
    static getWidgetInfo() {
        return {
            id: 'tplGauge2Color',
            visSet: 'vis-2-widgets-gauges',
            visWidgetLabel: 'vis_2_widgets_gauges_color',  // Label of widget
            visName: 'Color gauge',
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
                        name: 'unit',
                        label: 'vis_2_widgets_gauges_unit',
                    },
                    {
                        name: 'levelsCount',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_levels_count',
                    },
                ],
            },
            {
                name: 'visual',
                label: 'vis_2_widgets_gauges_visual',
                fields: [
                    {
                        name: 'needleColor',
                        type: 'color',
                        label: 'vis_2_widgets_gauges_needle_color',
                    },
                    {
                        name: 'needleBaseColor',
                        type: 'color',
                        label: 'vis_2_widgets_gauges_needle_base_color',
                    },
                    {
                        name: 'marginInPercent',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_margin_in_percent',
                    },
                    {
                        name: 'cornerRadius',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_corner_radius',
                    },
                    {
                        name: 'arcPadding',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_arc_padding',
                        title: 'vis_2_widgets_gauges_arc_padding_title',
                    },
                    {
                        name: 'arcWidth',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_arc_width',
                    },
                ],
            },
            {
                name: 'anumation',
                label: 'vis_2_widgets_gauges_animation',
                fields: [
                    {
                        name: 'animate',
                        type: 'checkbox',
                        default: true,
                        label: 'vis_2_widgets_gauges_animate',
                    },
                    {
                        name: 'animDelay',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_anim_delay',
                    },
                    {
                        name: 'animateDuration',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_animate_duration',
                    },
                ],
            },
            {
                name: 'level',
                label: 'vis_2_widgets_gauges_level',
                indexFrom: 1,
                indexTo: 'levelsCount',
                fields: [
                    {
                        name: 'color',
                        type: 'color',
                        label: 'vis_2_widgets_gauges_color',
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
                height: 182,
                position: 'relative',
            },
            visPrev: 'widgets/vis-2-widgets-gauges/img/prev_color_gauge.png',
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
        return ColorGauge.getWidgetInfo();
    }

    renderWidgetBody(props) {
        super.renderWidgetBody(props);

        const value = this.state.values[`${this.state.object?._id}.val`] || 0;

        const colors = [];
        const ranges = [];

        const min = this.state.rxData.min || 0;
        const max = this.state.rxData.max || 100;

        for (let i = 1; i <= this.state.rxData.levelsCount; i++) {
            if (this.state.rxData[`color${i}`]) {
                colors.push(this.state.rxData[`color${i}`]);
            }
            ranges.push(this.state.rxData[`range${i}`] || (max - min / this.state.rxData.levelsCount) / (max - min));
        }

        const content = <GaugeChart
            percent={(value - min) / (max - min)}
            formatTextValue={() => `${value}${this.state.rxData.unit || '%'}`}
            nrOfLevels={this.state.rxData.levelsCount || undefined}
            colors={colors.length ? colors : undefined}
            arcsLength={ranges.length ? ranges : undefined}
            needleColor={this.state.rxData.needleColor || undefined}
            needleBaseColor={this.state.rxData.needleBaseColor || undefined}
            animate={!!this.state.rxData.animate}
            marginInPercent={this.state.rxData.marginInPercent || undefined}
            cornerRadius={this.state.rxData.cornerRadius || undefined}
            arcPadding={this.state.rxData.arcPadding || undefined}
            arcWidth={this.state.rxData.arcWidth || undefined}
            animDelay={this.state.rxData.animDelay || undefined}
            animateDuration={this.state.rxData.animateDuration || undefined}
            textColor={this.props.theme.palette.text.primary}
        />;

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

export default withStyles(styles)(withTheme(ColorGauge));
