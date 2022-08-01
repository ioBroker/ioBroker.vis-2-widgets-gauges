const makeFederation = require('@iobroker/vis-widgets-react-dev/modulefederation.config');

module.exports = makeFederation(
    'vis2materialWidgets',
    {
        './ColorGauge': './src/ColorGauge',
        './WaterGauge': './src/ColorGauge',
        './BatteryGauge': './src/ColorGauge'
    }
);