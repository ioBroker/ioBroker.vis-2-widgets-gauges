import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@mui/styles';

const styles = () => ({
   
});

class ColorGauge extends Generic {
    constructor(props) {
        super(props);
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
                        label: 'vis_2_widgets_material_name',
                    },
                    {
                        name: 'oid-temp-set',
                        type: 'id',
                        label: 'vis_2_widgets_material_temperature_oid',
                    },
                    {
                        name: 'oid-temp-actual',
                        type: 'id',
                        label: 'vis_2_widgets_material_actual_oid',
                    },
                    {
                        name: 'oid-power',
                        type: 'id',
                        label: 'vis_2_widgets_material_power_oid',
                    },
                    {
                        name: 'oid-mode',
                        type: 'id',
                        label: 'vis_2_widgets_material_mode_oid',
                    },
                    {
                        name: 'oid-step',
                        type: 'select',
                        disabled: '!data["oid-temp-set"]',
                        label: 'vis_2_widgets_material_step',
                        options: ['0.5', '1'],
                        default: '1',
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
        const newState = {};

        if (this.state.rxData['oid-mode'] && this.state.rxData['oid-mode'] !== 'nothing_selected') {
            const modeObj = await this.props.socket.getObject(this.state.rxData['oid-mode']);
            newState.modes = modeObj?.common?.states;
            newState.modeObject = { common: modeObj.common, _id: modeObj._id };
            if (Array.isArray(newState.modes)) {
                const result = {};
                newState.modes.forEach(m => result[m] = m);
                newState.modes = result;
            }
        } else {
            newState.modes = null;
            newState.mode = null;
        }

        if (this.state.rxData['oid-temp-set'] && this.state.rxData['oid-temp-set'] !== 'nothing_selected') {
            const tempObj = await this.props.socket.getObject(this.state.rxData['oid-temp-set']);
            newState.min = tempObj?.common?.min === undefined ? 12 : tempObj.common.min;
            newState.max = tempObj?.common?.max === undefined ? 30 : tempObj.common.max;
            newState.tempObject = { common: tempObj.common, _id: tempObj._id };
        } else {
            newState.tempObject = null;
            newState.temp = null;
            newState.max = null;
            newState.min = null;
        }

        if (this.state.rxData['oid-temp-actual'] && this.state.rxData['oid-temp-actual'] !== 'nothing_selected') {
            const tempStateObj = await this.props.socket.getObject(this.state.rxData['oid-temp-actual']);
            newState.tempStateObject = { common: tempStateObj.common, _id: tempStateObj._id };
        } else {
            newState.tempStateObject = null;
        }

        newState.isChart = (newState.tempObject?.common?.custom && newState.tempObject.common.custom[this.props.systemConfig.common.defaultHistory]) ||
            (newState.tempStateObject?.common?.custom && newState.tempStateObject.common.custom[this.props.systemConfig.common.defaultHistory]);

        Object.keys(newState).find(key => JSON.stringify(this.state[key]) !== JSON.stringify(newState[key])) && this.setState(newState);
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

    formatValue(value, round) {
        if (typeof value === 'number') {
            if (round === 0) {
                value = Math.round(value);
            } else {
                value = Math.round(value * 100) / 100;
            }
            if (this.props.systemConfig?.common) {
                if (this.props.systemConfig.common.isFloatComma) {
                    value = value.toString().replace('.', ',');
                }
            }
        }

        return value === undefined || value === null ? '' : value.toString();
    }


    renderWidgetBody(props) {
        super.renderWidgetBody(props);

        return this.wrapContent(null, this.state.rxData.name ? chartButton : null, { textAlign: 'center' });
    }
}

ColorGauge.propTypes = {
    systemConfig: PropTypes.object,
    socket: PropTypes.object,
    themeType: PropTypes.string,
    style: PropTypes.object,
    data: PropTypes.object,
};

export default withStyles(styles)(ColorGauge);
