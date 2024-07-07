import React from 'react';
import PropTypes from 'prop-types';
import ReactBatteryGauge from 'react-battery-gauge';

import Generic from './Generic';

const styles = {
    root: {
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
    },
};

class BatteryGauge extends Generic {
    constructor(props) {
        super(props);
        this.refCardContent = React.createRef();
    }

    static getWidgetInfo() {
        return {
            id: 'tplGauge2Battery',
            visSet: 'vis-2-widgets-gauges',
            visWidgetLabel: 'battery',  // Label of widget
            visName: 'Battery gauge',
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
                        name: 'charging-oid',
                        type: 'id',
                        label: 'charging',
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
                        name: 'orientation',
                        type: 'select',
                        options: ['horizontal', 'vertical'],
                        label: 'orientation',
                    },
                    {
                        name: 'padding',
                        type: 'number',
                        label: 'padding',
                    },
                    {
                        name: 'size',
                        type: 'number',
                        label: 'size',
                    },
                    {
                        name: 'aspectRatio',
                        type: 'slider',
                        min: 0.1,
                        max: 2,
                        step: 0.05,
                        label: 'aspect_ratio',
                        tooltip: 'aspect_ratio_tooltip',
                    },
                    {
                        name: 'animated',
                        type: 'checkbox',
                        label: 'animated',
                    },
                ],
            },
            {
                name: 'batteryBody',
                label: 'battery_body',
                fields: [
                    {
                        name: 'batteryBodyCornerRadius',
                        type: 'number',
                        label: 'corner_radius',
                    },
                    {
                        name: 'batteryBodyFill',
                        type: 'color',
                        label: 'fill',
                    },
                    {
                        name: 'batteryBodyStrokeColor',
                        type: 'color',
                        label: 'stroke_color',
                    },
                ],
            },
            {
                name: 'batteryCap',
                label: 'battery_cap',
                fields: [
                    {
                        name: 'batteryCapFill',
                        type: 'color',
                        label: 'fill',
                    },
                    {
                        name: 'batteryCapStrokeWidth',
                        type: 'number',
                        label: 'stroke_width',
                    },
                    {
                        name: 'batteryCapStrokeColor',
                        type: 'color',
                        label: 'stroke_color',
                    },
                    {
                        name: 'batteryCapCornerRadius',
                        type: 'number',
                        label: 'corner_radius',
                    },
                    {
                        name: 'batteryCapCapToBodyRatio',
                        type: 'slider',
                        min: 0.1,
                        max: 1,
                        step: 0.05,
                        label: 'cap_to_body_ratio',
                    },
                ],
            },
            {
                name: 'batteryMeter',
                label: 'battery_meter',
                fields: [
                    {
                        name: 'batteryMeterFill',
                        type: 'color',
                        label: 'fill',
                    },
                    {
                        name: 'batteryMeterLowBatteryValue',
                        type: 'number',
                        label: 'low_battery_value',
                    },
                    {
                        name: 'batteryMeterLowBatteryFill',
                        type: 'color',
                        label: 'low_battery_fill',
                    },
                    {
                        name: 'batteryMeterOuterGap',
                        type: 'number',
                        label: 'outer_gap',
                    },
                    {
                        name: 'batteryMeterNoOfCells',
                        type: 'number',
                        label: 'no_of_cells',
                        tooltip: 'no_of_cells_tooltip',
                    },
                    {
                        name: 'batteryMeterInterCellsGap',
                        type: 'number',
                        label: 'inter_cells_gap',
                    },
                ],
            },
            {
                name: 'readingText',
                label: 'text',
                fields: [
                    {
                        name: 'readingTextLightContrastColor',
                        type: 'color',
                        label: 'light_contrast_color',
                    },
                    {
                        name: 'readingTextDarkContrastColor',
                        type: 'color',
                        label: 'dark_contrast_color',
                    },
                    {
                        name: 'readingTextLowBatteryColor',
                        type: 'color',
                        label: 'low_battery_color',
                    },
                    {
                        name: 'readingTextFontFamily',
                        label: 'font_family',
                    },
                    {
                        name: 'readingTextFontSize',
                        type: 'number',
                        label: 'font_size',
                    },
                    /*
                    {
                        name: 'readingTextShowPercentage',
                        type: 'checkbox',
                        label: 'show_percentage',
                    },
                    */
                ],
            },
            {
                name: 'chargingFlash',
                label: 'charging_flash',
                hidden: data => !data['charging-oid'],
                fields: [
                    {
                        name: 'chargingFlashScale',
                        type: 'slider',
                        min: 0.1,
                        max: 1,
                        step: 0.05,
                        label: 'scale',
                    },
                    {
                        name: 'chargingFlashFill',
                        type: 'color',
                        label: 'fill',
                    },
                    {
                        name: 'chargingFlashAnimated',
                        type: 'checkbox',
                        label: 'animated',
                    },
                    {
                        name: 'chargingFlashAnimationDuration',
                        type: 'number',
                        label: 'animation_duration',
                        tooltip: 'animation_duration_tooltip',
                        hidden: data => !data.chargingFlashAnimated,
                    },
                ],
            }],
            visDefaultStyle: {
                width: '100%',
                height: 120,
                position: 'relative',
                absoluteWidth: 120,
            },
            visPrev: 'widgets/vis-2-widgets-gauges/img/prev_battery_gauge.png',
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
        return BatteryGauge.getWidgetInfo();
    }

    renderWidgetBody(props) {
        super.renderWidgetBody(props);

        const value = this.getValue();

        const charging = !!this.state.values[`${this.state.data['charging-oid']}.val`];

        const min = this.state.rxData.min || 0;
        const max = this.state.rxData.max || 100;

        let size = this.state.rxData.size;

        const aspectRatio = this.state.rxData.aspectRatio || 0.52;

        if (!size) {
            if (!this.refCardContent.current) {
                setTimeout(() => this.forceUpdate(), 50);
            } else if (this.state.rxData.orientation === 'vertical') {
                size = this.refCardContent.current.offsetHeight;
                if (size * aspectRatio > this.refCardContent.current.offsetWidth) {
                    size = this.refCardContent.current.offsetWidth / aspectRatio;
                }
            } else {
                size = this.refCardContent.current.offsetWidth;
                if (size * aspectRatio > this.refCardContent.current.offsetHeight) {
                    size = this.refCardContent.current.offsetHeight / aspectRatio;
                }
            }

            if (size) {
                size -= 10;
            }
        }

        let batteryMeterLowBatteryValue;
        if (this.state.rxData.batteryMeterLowBatteryValue !== null && this.state.rxData.batteryMeterLowBatteryValue !== undefined) {
            batteryMeterLowBatteryValue = ((this.state.rxData.batteryMeterLowBatteryValue - min) / (max - min)) * 100;
        }

        const customizationSource = {
            batteryBody: {
                strokeWidth: this.state.rxData.batteryBodyStrokeWidth || undefined,
                cornerRadius: this.state.rxData.batteryBodyCornerRadius || undefined,
                fill: this.state.rxData.batteryBodyFill || undefined,
                strokeColor: this.state.rxData.batteryBodyStrokeColor || this.props.context.theme.palette.text.primary,
            },
            batteryCap: {
                fill: this.state.rxData.batteryCapFill || undefined,
                strokeWidth: this.state.rxData.batteryCapStrokeWidth || undefined,
                strokeColor: this.state.rxData.batteryCapStrokeColor || this.props.context.theme.palette.text.primary,
                cornerRadius: this.state.rxData.batteryCapCornerRadius || undefined,
                capToBodyRatio: this.state.rxData.batteryCapCapToBodyRatio || undefined,
            },
            batteryMeter: {
                fill: this.state.rxData.batteryMeterFill || undefined,
                lowBatteryValue: batteryMeterLowBatteryValue,
                lowBatteryFill: this.state.rxData.batteryMeterLowBatteryFill || undefined,
                outerGap: this.state.rxData.batteryMeterOuterGap || undefined,
                noOfCells: this.state.rxData.batteryMeterNoOfCells || undefined,
                interCellsGap: this.state.rxData.batteryMeterInterCellsGap || undefined,
            },
            readingText: {
                lightContrastColor: this.state.rxData.readingTextLightContrastColor || this.props.context.theme.palette.text.primary,
                darkContrastColor: this.state.rxData.readingTextDarkContrastColor || undefined,
                lowBatteryColor: this.state.rxData.readingTextLowBatteryColor || undefined,
                fontFamily: this.state.rxData.readingTextFontFamily || undefined,
                fontSize: this.state.rxData.readingTextFontSize === 0 ? 0 : (this.state.rxData.readingTextFontSize || undefined),
                showPercentage: this.state.rxData.readingTextShowPercentage || undefined,
            },
            chargingFlash: {
                scale: this.state.rxData.chargingFlashScale || undefined,
                fill: this.state.rxData.chargingFlashFill || undefined,
                animated: this.state.rxData.chargingFlashAnimated || undefined,
                animationDuration: this.state.rxData.chargingFlashAnimationDuration || undefined,
            },
        };

        // remove "undefined" from structure
        const customization = {};
        for (const key in customizationSource) {
            for (const subKey in customizationSource[key]) {
                if (customizationSource[key][subKey] !== undefined) {
                    customization[key] = customization[key] || {};
                    customization[key][subKey] = customizationSource[key][subKey];
                }
            }
        }

        let showValue;
        let showText = null;
        // eslint-disable-next-line no-restricted-properties
        if (!window.isFinite(value)) {
            showValue = null;
            showText = value;
            customization.readingText = {
                display: 'none',
            };
        } else {
            showValue = ((value - min) / (max - min)) * 100;
        }

        const content = <div
            ref={this.refCardContent}
            style={{ ...styles.root, height: this.state.rxData.noCard || props.widget.usedInWidget ? '100%' : undefined }}
        >
            {this.renderCustomText(showText, '10%')}
            {size ? <ReactBatteryGauge
                value={showValue || 0}
                orientation={this.state.rxData.orientation || undefined}
                padding={this.state.rxData.padding || undefined}
                size={size}
                aspectRatio={this.state.rxData.aspectRatio || undefined}
                animated={this.state.rxData.animated || undefined}
                charging={charging}
                customization={customization}
            /> : null}
        </div>;

        if (this.state.rxData.noCard || props.widget.usedInWidget) {
            return content;
        }

        return this.wrapContent(content, null, { textAlign: 'center' });
    }
}

BatteryGauge.propTypes = {
    systemConfig: PropTypes.object,
    socket: PropTypes.object,
    themeType: PropTypes.string,
    style: PropTypes.object,
    data: PropTypes.object,
};

export default BatteryGauge;
