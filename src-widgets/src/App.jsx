import React from 'react';

import { Box } from '@mui/material';

import WidgetDemoApp from '@iobroker/vis-2-widgets-react-dev/widgetDemoApp';
import { I18n } from '@iobroker/adapter-react-v5';

import translations from './translations';

import ColorGauge from './ColorGauge';
import WaterGauge from './WaterGauge';
import BatteryGauge from './BatteryGauge';

const styles = {
    app: theme => ({
        backgroundColor: theme?.palette?.background.default,
        color: theme?.palette?.text.primary,
        height: '100%',
        width: '100%',
        overflow: 'auto',
        display: 'flex',
    }),
};

class App extends WidgetDemoApp {
    constructor(props) {
        super(props);

        // init translations
        I18n.extendTranslations(translations);

        this.socket.registerConnectionHandler(this.onConnectionChanged);
    }

    onConnectionChanged = isConnected => {
        if (isConnected) {
            this.socket.getSystemConfig()
                .then(systemConfig => this.setState({ systemConfig }));
        }
    };

    renderWidget() {
        return <Box sx={styles.app}>
            <ColorGauge
                themeType={this.state.themeType}
                style={{
                    width: 600,
                    height: 650,
                }}
                context={{
                    socket: this.socket,
                    theme: this.state.theme,
                }}
                systemConfig={this.state.systemConfig}
                data={{
                    name: 'Color gauge',
                    oid: 'javascript.0.thermostat.setPoint',
                    levelsCount: 3,
                    color1: 'rgba(155,211,134,1)',
                    range1: 10,
                    'g_level-1': true,
                    color2: 'rgba(30,24,68,1)',
                    range2: 2,
                    'g_level-2': true,
                    color3: 'rgba(199,194,220,1)',
                    range3: 6,
                    'g_level-3': true,
                    max: 30,
                    min: 12,
                }}
            />
            <WaterGauge
                socket={this.socket}
                themeType={this.state.themeType}
                style={{
                    width: 600,
                    height: 650,
                }}
                context={{
                    socket: this.socket,
                    theme: this.state.theme,
                }}
                systemConfig={this.state.systemConfig}
                data={{
                    name: 'Water gauge',
                    oid: 'Energiesparmodus',
                    levelsCount: 3,
                    color1: 'rgba(155,211,134,1)',
                    range1: 10,
                    'g_level-1': true,
                    color2: 'rgba(30,24,68,1)',
                    range2: 2,
                    'g_level-2': true,
                    color3: 'rgba(199,194,220,1)',
                    range3: 6,
                    'g_level-3': true,
                    max: 30,
                    min: 12,
                }}
            />
            <BatteryGauge
                socket={this.socket}
                themeType={this.state.themeType}
                style={{
                    width: 600,
                    height: 650,
                }}
                context={{
                    socket: this.socket,
                    theme: this.state.theme,
                }}
                systemConfig={this.state.systemConfig}
                data={{
                    widgetTitle: 'Battery gauge',
                    name: 'Battery gauge',
                    oid: 'Energiesparmodus',
                    levelsCount: 3,
                    color1: 'rgba(155,211,134,1)',
                    range1: 10,
                    'g_level-1': true,
                    color2: 'rgba(30,24,68,1)',
                    range2: 2,
                    'g_level-2': true,
                    color3: 'rgba(199,194,220,1)',
                    range3: 6,
                    'g_level-3': true,
                    max: 30,
                    min: 12,
                }}
            />
        </Box>;
    }
}

export default App;
