import React from 'react';
import PropTypes from 'prop-types';
import { withStyles, withTheme } from '@mui/styles';
import GaugeChart from 'react-gauge-chart';
import Generic from './Generic';

const styles = () => ({

});

class ColorGauge extends Generic {
    constructor(props) {
        super(props);
        this.state.rxData = this.state.data;
    }

    static getWidgetInfo() {
        return {
            id: 'tplGauge2Color',
            visSet: 'vis-2-widgets-gauge',
            visWidgetLabel: 'vis-2-widgets-gauge',  // Label of widget
            visName: 'Color gauge',
            visAttrs: [{
                name: 'common',
                fields: [
                    {
                        name: 'name',
                        label: 'vis_2_widgets_gauge_name',
                    },
                    {
                        name: 'oid',
                        type: 'id',
                        label: 'vis_2_widgets_gauge_oid',
                    },
                    {
                        name: 'min',
                        type: 'number',
                        label: 'vis_2_widgets_gauge_min',
                    },
                    {
                        name: 'max',
                        type: 'number',
                        label: 'vis_2_widgets_gauge_max',
                    },
                    {
                        name: 'needleColor',
                        type: 'color',
                        label: 'vis_2_widgets_gauge_needle_color',
                    },
                    {
                        name: 'needleBaseColor',
                        type: 'color',
                        label: 'vis_2_widgets_gauge_needle_base_color',
                    },
                    {
                        name: 'levelsCount',
                        type: 'number',
                        label: 'vis_2_widgets_gauge_levels_count',
                    },
                ],
            }, {
                name: 'level',
                indexFrom: 1,
                indexTo: 'levelsCount',
                fields: [
                    {
                        name: 'color',
                        type: 'color',
                        label: 'vis_2_widgets_gauge_color',
                    },
                    {
                        name: 'range',
                        type: 'number',
                        label: 'vis_2_widgets_gauge_range',
                    },
                ],
            }],
            visDefaultStyle: {
                width: '100%',
                height: 120,
                position: 'relative',
            },
            visPrev: 'widgets/vis-2-widgets-material/img/prev_color_gauge.png',
        };
    }

    async propertiesUpdate() {
        if (this.state.data.oid && this.state.data.oid !== 'nothing_selected') {
            const obj = await this.props.socket.getObject(this.state.data.oid);
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

        if (!this.state.object) {
            return null;
        }

        const value = this.state.values[`${this.state.object._id}.val`];

        const colors = [];
        const ranges = [];

        const min = this.state.data.min || 0;
        const max = this.state.data.max || 100;

        for (let i = 1; i <= this.state.data.levelsCount; i++) {
            if (this.state.data[`color${i}`]) {
                colors.push(this.state.data[`color${i}`]);
            }
            if (this.state.data[`range${i}`]) {
                ranges.push((this.state.data[`range${i}`]) / (max - min));
            }
        }

        const content = <GaugeChart
            percent={(value - min) / (max - min)}
            nrOfLevels={this.state.data.levelsCount || undefined}
            colors={colors.length ? colors : undefined}
            arcsLength={ranges.length ? ranges : undefined}
            needleColor={this.state.data.needleColor || undefined}
            needleBaseColor={this.state.data.needleBaseColor || undefined}
            animate={false}
            textColor={this.props.theme.palette.text.primary}
        />;

        return this.wrapContent(content, this.state.data.name, { textAlign: 'center' });
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
