import React from 'react';
import PropTypes from 'prop-types';
import { withStyles, withTheme } from '@mui/styles';
import LiquidFillGauge from 'react-liquid-gauge';
import Generic from './Generic';

const styles = () => ({

});

class WaterGauge extends Generic {
    constructor(props) {
        super(props);
        this.state.rxData = this.state.data;
    }

    static getWidgetInfo() {
        return {
            id: 'tplGauge2Water',
            visSet: 'vis-2-widgets-gauge',
            visWidgetLabel: 'vis-2-widgets-water',  // Label of widget
            visName: 'Water gauge',
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
        return WaterGauge.getWidgetInfo();
    }

    renderWidgetBody(props) {
        super.renderWidgetBody(props);

        const value = this.state.values[`${this.state.object?._id}.val`];

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

        const content = <LiquidFillGauge value={value} riseAnimation />;

        return this.wrapContent(content, this.state.data.name, { textAlign: 'center' });
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
