import React from 'react';
import PropTypes from 'prop-types';
import { withStyles, withTheme } from '@mui/styles';
import ReactBatteryGauge from 'react-battery-gauge';
import Generic from './Generic';

const styles = () => ({

});

class BatteryGauge extends Generic {
    static getWidgetInfo() {
        return {
            id: 'tplGauge2Battery',
            visSet: 'vis-2-widgets-gauges',
            visWidgetLabel: 'vis_2_widgets_gauges_battery',  // Label of widget
            visName: 'Battery gauge',
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
                        name: 'orientation',
                        type: 'select',
                        options: ['horizontal', 'vertical'],
                        label: 'vis_2_widgets_gauges_orientation',
                    },
                    {
                        name: 'padding',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_padding',
                    },
                    {
                        name: 'size',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_size',
                    },
                    {
                        name: 'aspectRatio',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_aspect_ratio',
                    },
                    {
                        name: 'animated',
                        type: 'checkbox',
                        label: 'vis_2_widgets_gauges_animated',
                    },
                    {
                        name: 'charging',
                        type: 'checkbox',
                        label: 'vis_2_widgets_gauges_charging',
                    },
                ],
            },
            {
                name: 'batteryBody',
                label: 'vis_2_widgets_gauges_battery_body',
                fields: [
                    {
                        name: 'batteryBodyWidth',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_stroke_width',
                    },
                    {
                        name: 'batteryBodyCornerRadius',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_corner_radius',
                    },
                    {
                        name: 'batteryBodyFill',
                        type: 'color',
                        label: 'vis_2_widgets_gauges_fill',
                    },
                    {
                        name: 'batteryBodyStrokeColor',
                        type: 'color',
                        label: 'vis_2_widgets_gauges_stroke_color',
                    },
                ],
            },
            {
                name: 'batteryCap',
                label: 'vis_2_widgets_gauges_battery_cap',
                fields: [
                    {
                        name: 'batteryCapFill',
                        type: 'color',
                        label: 'vis_2_widgets_gauges_fill',
                    },
                    {
                        name: 'batteryCapStrokeWidth',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_stroke_width',
                    },
                    {
                        name: 'batteryCapStrokeColor',
                        type: 'color',
                        label: 'vis_2_widgets_gauges_stroke_color',
                    },
                    {
                        name: 'batteryCapCornerRadius',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_corner_radius',
                    },
                    {
                        name: 'batteryCapCapToBodyRatio',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_cap_to_body_ratio',
                    },
                ],
            },
            {
                name: 'batteryMeter',
                label: 'vis_2_widgets_gauges_battery_meter',
                fields: [
                    {
                        name: 'batteryMeterFill',
                        type: 'color',
                        label: 'vis_2_widgets_gauges_fill',
                    },
                    {
                        name: 'batteryMeterLowBatteryValue',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_low_battery_value',
                    },
                    {
                        name: 'batteryMeterLowBatteryFill',
                        type: 'color',
                        label: 'vis_2_widgets_gauges_low_battery_fill',
                    },
                    {
                        name: 'batteryMeterOuterGap',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_outer_gap',
                    },
                    {
                        name: 'batteryMeterNoOfCells',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_no_of_cells',
                    },
                    {
                        name: 'batteryMeterInterCellsGap',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_inter_cells_gap',
                    },
                ],
            },
            {
                name: 'readingText',
                label: 'vis_2_widgets_gauges_reading_text',
                fields: [
                    {
                        name: 'readingTextLightContrastColor',
                        type: 'color',
                        label: 'vis_2_widgets_gauges_light_contrast_color',
                    },
                    {
                        name: 'readingTextDarkContrastColor',
                        type: 'color',
                        label: 'vis_2_widgets_gauges_dark_contrast_color',
                    },
                    {
                        name: 'readingTextLowBatteryColor',
                        type: 'color',
                        label: 'vis_2_widgets_gauges_low_battery_color',
                    },
                    {
                        name: 'readingTextFontFamily',
                        label: 'vis_2_widgets_gauges_font_family',
                    },
                    {
                        name: 'readingTextFontSize',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_font_size',
                    },
                    {
                        name: 'readingTextShowPercentage',
                        type: 'checkbox',
                        label: 'vis_2_widgets_gauges_show_percentage',
                    },
                ],
            },
            {
                name: 'chargingFlash',
                label: 'vis_2_widgets_gauges_charging_flash',
                fields: [
                    {
                        name: 'chargingFlashScale',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_scale',
                    },
                    {
                        name: 'chargingFlashFill',
                        type: 'color',
                        label: 'vis_2_widgets_gauges_fill',
                    },
                    {
                        name: 'chargingFlashAnimated',
                        type: 'checkbox',
                        label: 'vis_2_widgets_gauges_animated',
                    },
                    {
                        name: 'chargingFlashAnimationDuration',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_animation_duration',
                    },
                ],
            }],
            visDefaultStyle: {
                width: '100%',
                height: 120,
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
        return BatteryGauge.getWidgetInfo();
    }

    renderWidgetBody(props) {
        super.renderWidgetBody(props);

        const value = this.state.values[`${this.state.object?._id}.val`] || 0;

        const min = this.state.rxData.min || 0;
        const max = this.state.rxData.max || 100;

        const customizationSource = {
            batteryBody: {
                strokeWidth: this.state.rxData.batteryBodyStrokeWidth || undefined,
                cornerRadius: this.state.rxData.batteryBodyCornerRadius || undefined,
                fill: this.state.rxData.batteryBodyFill || undefined,
                strokeColor: this.state.rxData.batteryBodyStrokeColor || undefined,
            },
            batteryCap: {
                fill: this.state.rxData.batteryCapFill || undefined,
                strokeWidth: this.state.rxData.batteryCapStrokeWidth || undefined,
                strokeColor: this.state.rxData.batteryCapStrokeColor || undefined,
                cornerRadius: this.state.rxData.batteryCapCornerRadius || undefined,
                capToBodyRatio: this.state.rxData.batteryCapCapToBodyRatio || undefined,
            },
            batteryMeter: {
                fill: this.state.rxData.batteryMeterFill || undefined,
                lowBatteryValue: this.state.rxData.batteryMeterLowBatteryValue || undefined,
                lowBatteryFill: this.state.rxData.batteryMeterLowBatteryFill || undefined,
                outerGap: this.state.rxData.batteryMeterOuterGap || undefined,
                noOfCells: this.state.rxData.batteryMeterNoOfCells || undefined,
                interCellsGap: this.state.rxData.batteryMeterInterCellsGap || undefined,
            },
            readingText: {
                lightContrastColor: this.state.rxData.readingTextLightContrastColor || undefined,
                darkContrastColor: this.state.rxData.readingTextDarkContrastColor || undefined,
                lowBatteryColor: this.state.rxData.readingTextLowBatteryColor || undefined,
                fontFamily: this.state.rxData.readingTextFontFamily || undefined,
                fontSize: this.state.rxData.readingTextFontSize || undefined,
                showPercentage: this.state.rxData.readingTextShowPercentage || undefined,
            },
            chargingFlash: {
                scale: this.state.rxData.chargingFlashScale || undefined,
                fill: this.state.rxData.chargingFlashFill || undefined,
                animated: this.state.rxData.chargingFlashAnimated || undefined,
                animationDuration: this.state.rxData.chargingFlashAnimationDuration || undefined,
            },
        };

        const customization = {};
        for (const key in customizationSource) {
            customization[key] = {};
            for (const subKey in customizationSource[key]) {
                if (customizationSource[key][subKey]) {
                    customization[key][subKey] = customizationSource[key][subKey];
                }
            }
        }

        const content = <ReactBatteryGauge
            value={((value - min) / (max - min)) * 100}
            orientation={this.state.rxData.orientation || undefined}
            padding={this.state.rxData.padding || undefined}
            size={this.state.rxData.size || undefined}
            aspectRatio={this.state.rxData.aspectRatio || undefined}
            animated={this.state.rxData.animated || undefined}
            charging={this.state.rxData.charging || undefined}
            customization={customization}
        />;

        return this.wrapContent(content, this.state.rxData.name, { textAlign: 'center' });
    }
}

BatteryGauge.propTypes = {
    systemConfig: PropTypes.object,
    socket: PropTypes.object,
    themeType: PropTypes.string,
    style: PropTypes.object,
    data: PropTypes.object,
};

export default withStyles(styles)(withTheme(BatteryGauge));
