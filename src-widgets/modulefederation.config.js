const makeFederation = require('@iobroker/vis-2-widgets-react-dev/modulefederation.config');

module.exports = makeFederation(
    'vis2gaugeWidgets',
    {
        './ColorGauge': './src/ColorGauge',
        './WaterGauge': './src/WaterGauge',
        './BatteryGauge': './src/BatteryGauge'
    }
);