/*
 * Scenes for the screenshots of the documentation (`docs/img/*.png`) and for the previews in the widget palette
 * (`public/img/prev_*.png`).
 *
 * Every `<section data-shot="name">` becomes `docs/img/name.png`, every `<section data-prev="name">` (page
 * `shots.html?prev=1`) becomes `public/img/prev_name.png` with a transparent background. `screenshots.mjs` opens
 * the page in a headless Chrome and cuts the sections out. All values are fixed and the endless animations stand
 * still (`window.__visGaugesStill`), so the images only change when a widget changes.
 *
 * Not part of the widget set - excluded from lint and never built into `widgets/`.
 */
import React, { type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';

// puts the stub of `window.visRxWidget` in place - before the widgets are imported below
import { makeContext, states, withDefaults } from './stub';

(window as any).__visGaugesStill = true;

const [
    { default: ColorGauge },
    { default: WaterGauge },
    { default: BatteryGauge },
    { default: RadialGauge },
    { default: ArcGauge },
    { default: LinearGauge },
    { default: ThermometerGauge },
    { default: CompassGauge },
    { default: TankGauge },
    { default: RingsGauge },
] = await Promise.all([
    import('../src/ColorGauge'),
    import('../src/WaterGauge'),
    import('../src/BatteryGauge'),
    import('../src/RadialGauge'),
    import('../src/ArcGauge'),
    import('../src/LinearGauge'),
    import('../src/ThermometerGauge'),
    import('../src/CompassGauge'),
    import('../src/TankGauge'),
    import('../src/RingsGauge'),
]);

const PREV = new URLSearchParams(window.location.search).get('prev') === '1';

// ------------------------------------------------------------------------------------------------ helpers

type Values = Record<string, any>;

const CONTEXT = {
    light: makeContext('light'),
    dark: makeContext('dark'),
};

/** Dark theme of the current section */
const DarkTheme = React.createContext(false);

/** No animation in the images: every widget shows its final state at once */
const STILL = { animate: false, riseAnimation: false, waveAnimation: false };

/** One widget with the attributes the vis editor would store for it */
function W(props: { type: any; data: Record<string, any>; values?: Values; style?: Record<string, any> }): React.JSX.Element {
    const dark = React.useContext(DarkTheme);
    const Type = props.type;
    return (
        <Type
            context={dark ? CONTEXT.dark : CONTEXT.light}
            editMode={false}
            view="view"
            id="w1"
            refParent={{ current: null }}
            values={props.values || {}}
            rxStyle={props.style || {}}
            rxData={withDefaults(Type, { ...STILL, ...props.data })}
        />
    );
}

/** One screenshot */
function Shot(props: {
    name: string;
    dark?: boolean;
    style?: CSSProperties;
    children: React.ReactNode;
}): React.JSX.Element {
    return (
        <DarkTheme.Provider value={!!props.dark}>
            <section
                data-shot={props.name}
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                    gap: 16,
                    width: 'max-content',
                    maxWidth: 1500,
                    padding: 16,
                    boxSizing: 'border-box',
                    background: props.dark ? '#121212' : '#f0f0f0',
                    color: props.dark ? '#dfe3e8' : '#333',
                    ...props.style,
                }}
            >
                {props.children}
            </section>
        </DarkTheme.Provider>
    );
}

/** Room for one widget, with the settings that make the difference below it */
function Item(props: { w: number; h: number; caption?: string; children: React.ReactNode }): React.JSX.Element {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: props.w, height: props.h, position: 'relative' }}>{props.children}</div>
            {props.caption ? (
                <code
                    style={{
                        fontSize: 12,
                        opacity: 0.75,
                        marginTop: 6,
                        whiteSpace: 'pre',
                        textAlign: 'center',
                        maxWidth: props.w + 40,
                    }}
                >
                    {props.caption}
                </code>
            ) : null}
        </div>
    );
}

/** A palette preview: the bare gauge on a transparent background */
function Prev(props: { name: string; w: number; h: number; children: React.ReactNode }): React.JSX.Element {
    return (
        <section
            data-prev={props.name}
            style={{ width: props.w, height: props.h, position: 'relative', padding: 4 }}
        >
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>{props.children}</div>
        </section>
    );
}

// ------------------------------------------------------------------------------------------------ values

const V = states({
    'demo.0.percent': 64,
    'demo.0.power': 2350,
    'demo.0.grid': -1250,
    'demo.0.temperature': 21.4,
    'demo.0.outside': -4.5,
    'demo.0.humidity': 47,
    'demo.0.battery': 72,
    'demo.0.batteryLow': 11,
    'demo.0.batteryMedium': 34,
    'demo.0.charging': true,
    'demo.0.windDirection': 225,
    'demo.0.windSpeed': 18.5,
    'demo.0.heading': 305,
    'demo.0.tank': 1850,
    'demo.0.oil': 4200,
    'demo.0.cistern': 18,
    'demo.0.setpoint': 75,
    'demo.0.co2': 1150,
    'demo.0.pv': 6.3,
    'demo.0.house': 2.1,
    'demo.0.soc': 72,
    'demo.0.autarky': 88,
    'demo.0.text': 'offline',
});

const RINGS = {
    ringsCount: 3,
    oid1: 'demo.0.pv',
    label1: 'PV',
    max1: 10,
    unit1: 'kW',
    digits1: 1,
    oid2: 'demo.0.house',
    label2: 'House',
    max2: 10,
    unit2: 'kW',
    digits2: 1,
    oid3: 'demo.0.soc',
    label3: 'Battery',
    unit3: '%',
};

// ------------------------------------------------------------------------------------------------ scenes

function Overview(): React.JSX.Element {
    return (
        <Shot
            name="overview"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 230px)', gap: 12 }}
        >
            <Item w={230} h={190}>
                <W
                    type={ColorGauge}
                    values={V}
                    data={{ widgetTitle: 'Color', oid: 'demo.0.percent', unit: '%', digitsAfterComma: 0 }}
                />
            </Item>
            <Item w={230} h={190}>
                <W
                    type={WaterGauge}
                    values={V}
                    data={{ widgetTitle: 'Water', oid: 'demo.0.humidity', unit: '%' }}
                />
            </Item>
            <Item w={230} h={190}>
                <W
                    type={BatteryGauge}
                    values={V}
                    data={{ widgetTitle: 'Battery', oid: 'demo.0.battery' }}
                />
            </Item>
            <Item w={230} h={190}>
                <W
                    type={RadialGauge}
                    values={V}
                    data={{ widgetTitle: 'Radial', oid: 'demo.0.power', max: 6000, unit: 'W', majorTicks: 6 }}
                />
            </Item>
            <Item w={230} h={190}>
                <W
                    type={ArcGauge}
                    values={V}
                    data={{ widgetTitle: 'Arc', oid: 'demo.0.percent', unit: '%', targetOid: 'demo.0.setpoint' }}
                />
            </Item>
            <Item w={230} h={190}>
                <W
                    type={LinearGauge}
                    values={V}
                    data={{ widgetTitle: 'Linear', oid: 'demo.0.power', max: 6000, unit: 'W', majorTicks: 3 }}
                />
            </Item>
            <Item w={230} h={190}>
                <W
                    type={ThermometerGauge}
                    values={V}
                    data={{ widgetTitle: 'Thermometer', oid: 'demo.0.temperature', majorTicks: 3 }}
                />
            </Item>
            <Item w={230} h={190}>
                <W
                    type={CompassGauge}
                    values={V}
                    data={{
                        widgetTitle: 'Compass',
                        oid: 'demo.0.windDirection',
                        speedOid: 'demo.0.windSpeed',
                        speedUnit: 'km/h',
                        showDegrees: false,
                    }}
                />
            </Item>
            <Item w={230} h={190}>
                <W
                    type={TankGauge}
                    values={V}
                    data={{ widgetTitle: 'Tank', oid: 'demo.0.tank', max: 3000, unit: 'l', majorTicks: 3 }}
                />
            </Item>
            <Item w={230} h={190}>
                <W
                    type={RingsGauge}
                    values={V}
                    data={{ widgetTitle: 'Rings', ...RINGS }}
                />
            </Item>
        </Shot>
    );
}

function ColorScenes(): React.JSX.Element {
    return (
        <Shot name="color">
            <Item
                w={240}
                h={200}
                caption="defaults"
            >
                <W
                    type={ColorGauge}
                    values={V}
                    data={{ widgetTitle: 'Humidity', oid: 'demo.0.humidity', unit: '%', digitsAfterComma: 0 }}
                />
            </Item>
            <Item
                w={240}
                h={200}
                caption={'levelsCount = 4\ncolor1..4, levelThreshold1..3'}
            >
                <W
                    type={ColorGauge}
                    values={V}
                    data={{
                        widgetTitle: 'CO₂',
                        oid: 'demo.0.co2',
                        min: 400,
                        max: 2000,
                        unit: ' ppm',
                        digitsAfterComma: 0,
                        levelsCount: 4,
                        color1: '#43a047',
                        color2: '#c0ca33',
                        color3: '#fb8c00',
                        color4: '#e53935',
                        levelThreshold1: 800,
                        levelThreshold2: 1000,
                        levelThreshold3: 1400,
                    }}
                />
            </Item>
            <Item
                w={240}
                h={200}
                caption={'arcWidth = 0.35, arcPadding = 0\ncornerRadius = 1, levelsCount = 12'}
            >
                <W
                    type={ColorGauge}
                    values={V}
                    data={{
                        widgetTitle: 'Load',
                        oid: 'demo.0.percent',
                        unit: '%',
                        digitsAfterComma: 0,
                        arcWidth: 0.35,
                        arcPadding: 0,
                        cornerRadius: 1,
                        levelsCount: 12,
                        color1: '#1e88e5',
                        color12: '#8e24aa',
                        needleScale: 0.8,
                    }}
                />
            </Item>
            <Item
                w={240}
                h={200}
                caption={'noCard, showMinMax = false\nneedleColor, textColor'}
            >
                <W
                    type={ColorGauge}
                    values={V}
                    data={{
                        noCard: true,
                        oid: 'demo.0.percent',
                        unit: '%',
                        digitsAfterComma: 1,
                        showMinMax: false,
                        needleColor: '#1976d2',
                        needleBaseColor: '#1976d2',
                        textColor: '#1976d2',
                    }}
                />
            </Item>
        </Shot>
    );
}

function WaterScenes(): React.JSX.Element {
    return (
        <Shot name="water">
            <Item
                w={200}
                h={210}
                caption="defaults"
            >
                <W
                    type={WaterGauge}
                    values={V}
                    data={{ widgetTitle: 'Humidity', oid: 'demo.0.humidity', unit: '%' }}
                />
            </Item>
            <Item
                w={200}
                h={210}
                caption={'waveColor, circleColor\nwaveAmplitude = 4, waveFrequency = 3'}
            >
                <W
                    type={WaterGauge}
                    values={V}
                    data={{
                        widgetTitle: 'Cistern',
                        oid: 'demo.0.cistern',
                        unit: '%',
                        waveColor: '#26a69a',
                        circleColor: '#00897b',
                        waveAmplitude: 4,
                        waveFrequency: 3,
                    }}
                />
            </Item>
            <Item
                w={200}
                h={210}
                caption={'gradient, levelsCount = 3\nstopColor1..3, stopOpacity'}
            >
                <W
                    type={WaterGauge}
                    values={V}
                    data={{
                        widgetTitle: 'Battery',
                        oid: 'demo.0.battery',
                        unit: '%',
                        gradient: true,
                        levelsCount: 3,
                        stopColor1: '#e53935',
                        stopOpacity1: 1,
                        stopColor2: '#fdd835',
                        stopOpacity2: 1,
                        levelThreshold2: 50,
                        stopColor3: '#43a047',
                        stopOpacity3: 1,
                    }}
                />
            </Item>
            <Item
                w={200}
                h={210}
                caption={'noCard, innerRadius = 0.97\nmargin = 0.05, textSize = 0.8'}
            >
                <W
                    type={WaterGauge}
                    values={V}
                    data={{
                        noCard: true,
                        oid: 'demo.0.temperature',
                        min: 0,
                        max: 40,
                        unit: '°C',
                        digitsAfterComma: 1,
                        innerRadius: 0.97,
                        margin: 0.05,
                        textSize: 0.8,
                        circleColor: '#fb8c00',
                        waveColor: '#ffb74d',
                        textWaveColor: '#5d4037',
                    }}
                />
            </Item>
        </Shot>
    );
}

function BatteryScenes(): React.JSX.Element {
    return (
        <Shot name="battery">
            <Item
                w={220}
                h={150}
                caption="defaults"
            >
                <W
                    type={BatteryGauge}
                    values={V}
                    data={{ widgetTitle: 'Phone', oid: 'demo.0.battery' }}
                />
            </Item>
            <Item
                w={220}
                h={150}
                caption={'below batteryMeterLowBatteryValue'}
            >
                <W
                    type={BatteryGauge}
                    values={V}
                    data={{ widgetTitle: 'Sensor', oid: 'demo.0.batteryLow', batteryMeterLowBatteryValue: 20 }}
                />
            </Item>
            <Item
                w={220}
                h={150}
                caption={'batteryMeterMediumBatteryValue = 40'}
            >
                <W
                    type={BatteryGauge}
                    values={V}
                    data={{
                        widgetTitle: 'Car',
                        oid: 'demo.0.batteryMedium',
                        batteryMeterLowBatteryValue: 20,
                        batteryMeterMediumBatteryValue: 40,
                    }}
                />
            </Item>
            <Item
                w={220}
                h={150}
                caption={'batteryMeterNoOfCells = 5\nbatteryMeterInterCellsGap = 2'}
            >
                <W
                    type={BatteryGauge}
                    values={V}
                    data={{
                        widgetTitle: 'Storage',
                        oid: 'demo.0.battery',
                        batteryMeterNoOfCells: 5,
                        batteryMeterInterCellsGap: 2,
                        batteryMeterFill: '#43a047',
                        batteryBodyCornerRadius: 4,
                    }}
                />
            </Item>
            <Item
                w={120}
                h={220}
                caption={'orientation = vertical'}
            >
                <W
                    type={BatteryGauge}
                    values={V}
                    data={{ noCard: true, oid: 'demo.0.battery', orientation: 'vertical' }}
                />
            </Item>
            <Item
                w={220}
                h={150}
                caption={'charging-oid is true'}
            >
                <W
                    type={BatteryGauge}
                    values={V}
                    data={{ widgetTitle: 'Charging', oid: 'demo.0.battery', 'charging-oid': 'demo.0.charging' }}
                />
            </Item>
        </Shot>
    );
}

function RadialScenes(): React.JSX.Element {
    return (
        <Shot name="radial">
            <Item
                w={250}
                h={280}
                caption="defaults, label = Power"
            >
                <W
                    type={RadialGauge}
                    values={V}
                    data={{
                        widgetTitle: 'PV',
                        oid: 'demo.0.power',
                        max: 6000,
                        unit: 'W',
                        majorTicks: 6,
                        label: 'Power',
                    }}
                />
            </Item>
            <Item
                w={250}
                h={280}
                caption={'bezel = thin, needleType = line\nlevels: blue, green, red'}
            >
                <W
                    type={RadialGauge}
                    values={V}
                    data={{
                        widgetTitle: 'Living room',
                        oid: 'demo.0.temperature',
                        min: 10,
                        max: 30,
                        unit: '°C',
                        digitsAfterComma: 1,
                        majorTicks: 4,
                        minorTicks: 5,
                        bezel: 'thin',
                        needleType: 'line',
                        levelsCount: 3,
                        color1: '#1e88e5',
                        color2: '#43a047',
                        color3: '#e53935',
                        levelThreshold1: 19,
                        levelThreshold2: 24,
                        bandWidth: 0.1,
                    }}
                />
            </Item>
            <Item
                w={250}
                h={280}
                caption={'angle = 180, bezel = none\nneedleType = triangle, levelsCount = 0'}
            >
                <W
                    type={RadialGauge}
                    values={V}
                    data={{
                        widgetTitle: 'Humidity',
                        oid: 'demo.0.humidity',
                        unit: '%',
                        angle: 180,
                        bezel: 'none',
                        needleType: 'triangle',
                        levelsCount: 0,
                        majorTicks: 5,
                        needleColor: '#1976d2',
                    }}
                />
            </Item>
            <Item
                w={250}
                h={280}
                caption={'dark theme: dial and scale follow'}
            >
                <DarkTheme.Provider value>
                    <W
                        type={RadialGauge}
                        values={V}
                        data={{
                            widgetTitle: 'CO₂',
                            oid: 'demo.0.co2',
                            min: 400,
                            max: 2000,
                            unit: 'ppm',
                            majorTicks: 8,
                            minorTicks: 2,
                            levelsCount: 3,
                            levelThreshold1: 1000,
                            levelThreshold2: 1400,
                        }}
                    />
                </DarkTheme.Provider>
            </Item>
        </Shot>
    );
}

function ArcScenes(): React.JSX.Element {
    return (
        <Shot name="arc">
            <Item
                w={230}
                h={220}
                caption={'defaults (colorMode = levels)\ntargetOid'}
            >
                <W
                    type={ArcGauge}
                    values={V}
                    data={{
                        widgetTitle: 'Humidity',
                        oid: 'demo.0.humidity',
                        unit: '%',
                        targetOid: 'demo.0.setpoint',
                        subText: 'Bathroom',
                    }}
                />
            </Item>
            <Item
                w={230}
                h={220}
                caption={'colorMode = gradient\nlevelsCount = 3'}
            >
                <W
                    type={ArcGauge}
                    values={V}
                    data={{
                        widgetTitle: 'Autarky',
                        oid: 'demo.0.autarky',
                        unit: '%',
                        colorMode: 'gradient',
                        color1: '#e53935',
                        color3: '#43a047',
                    }}
                />
            </Item>
            <Item
                w={230}
                h={220}
                caption={'segments = 24, segmentGap = 2\nroundedCaps = false'}
            >
                <W
                    type={ArcGauge}
                    values={V}
                    data={{
                        widgetTitle: 'CO₂',
                        oid: 'demo.0.co2',
                        min: 400,
                        max: 2000,
                        unit: 'ppm',
                        segments: 24,
                        roundedCaps: false,
                        levelThreshold1: 1000,
                        levelThreshold2: 1400,
                    }}
                />
            </Item>
            <Item
                w={230}
                h={220}
                caption={'angle = 180, fromZero\ncolorMode = fixed'}
            >
                <W
                    type={ArcGauge}
                    values={V}
                    data={{
                        widgetTitle: 'Grid',
                        oid: 'demo.0.grid',
                        min: -5000,
                        max: 5000,
                        unit: 'W',
                        angle: 180,
                        fromZero: true,
                        colorMode: 'fixed',
                        valueColor: '#43a047',
                        subText: 'feed-in',
                        arcWidth: 0.22,
                    }}
                />
            </Item>
            <Item
                w={230}
                h={220}
                caption={'angle = 360, showMinMax = false\narcWidth = 0.1'}
            >
                <W
                    type={ArcGauge}
                    values={V}
                    data={{
                        widgetTitle: 'Progress',
                        oid: 'demo.0.percent',
                        unit: '%',
                        angle: 360,
                        arcWidth: 0.1,
                        showMinMax: false,
                        colorMode: 'fixed',
                        valueColor: '#8e24aa',
                    }}
                />
            </Item>
        </Shot>
    );
}

function LinearScenes(): React.JSX.Element {
    return (
        <Shot
            name="linear"
            style={{ alignItems: 'flex-end' }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Item
                    w={340}
                    h={130}
                    caption={'defaults (colorMode = gradient)'}
                >
                    <W
                        type={LinearGauge}
                        values={V}
                        data={{ widgetTitle: 'PV', oid: 'demo.0.power', max: 6000, unit: 'W', majorTicks: 6 }}
                    />
                </Item>
                <Item
                    w={340}
                    h={130}
                    caption={'fromZero, colorMode = fixed'}
                >
                    <W
                        type={LinearGauge}
                        values={V}
                        data={{
                            widgetTitle: 'Grid',
                            oid: 'demo.0.grid',
                            min: -3000,
                            max: 6000,
                            unit: 'W',
                            majorTicks: 3,
                            fromZero: true,
                            colorMode: 'fixed',
                            valueColor: '#43a047',
                        }}
                    />
                </Item>
                <Item
                    w={340}
                    h={130}
                    caption={'displayMode = pointer, levelsCount = 4'}
                >
                    <W
                        type={LinearGauge}
                        values={V}
                        data={{
                            widgetTitle: 'CO₂',
                            oid: 'demo.0.co2',
                            min: 400,
                            max: 2000,
                            unit: 'ppm',
                            majorTicks: 4,
                            displayMode: 'pointer',
                            levelsCount: 4,
                            levelThreshold1: 800,
                            levelThreshold2: 1000,
                            levelThreshold3: 1400,
                            barSize: 0.5,
                            rounded: false,
                        }}
                    />
                </Item>
            </div>
            <Item
                w={130}
                h={300}
                caption={'orientation = vertical\ncolorMode = levels'}
            >
                <W
                    type={LinearGauge}
                    values={V}
                    data={{
                        widgetTitle: 'Level',
                        oid: 'demo.0.percent',
                        unit: '%',
                        orientation: 'vertical',
                        colorMode: 'levels',
                        barSize: 0.5,
                    }}
                />
            </Item>
            <Item
                w={130}
                h={300}
                caption={'vertical, targetOid\nshowScale = false'}
            >
                <W
                    type={LinearGauge}
                    values={V}
                    data={{
                        noCard: true,
                        oid: 'demo.0.humidity',
                        unit: '%',
                        orientation: 'vertical',
                        colorMode: 'fixed',
                        valueColor: '#1e88e5',
                        showScale: false,
                        targetOid: 'demo.0.setpoint',
                        barSize: 0.35,
                    }}
                />
            </Item>
        </Shot>
    );
}

function ThermometerScenes(): React.JSX.Element {
    return (
        <Shot name="thermometer">
            <Item
                w={140}
                h={300}
                caption="defaults"
            >
                <W
                    type={ThermometerGauge}
                    values={V}
                    data={{ widgetTitle: 'Inside', oid: 'demo.0.temperature' }}
                />
            </Item>
            <Item
                w={140}
                h={300}
                caption={'colorMode = gradient\nlevelsCount = 3'}
            >
                <W
                    type={ThermometerGauge}
                    values={V}
                    data={{
                        widgetTitle: 'Outside',
                        oid: 'demo.0.outside',
                        colorMode: 'gradient',
                        color1: '#1e88e5',
                        color2: '#43a047',
                        color3: '#e53935',
                    }}
                />
            </Item>
            <Item
                w={170}
                h={300}
                caption={'scaleSide = both\nmin = 0, max = 100'}
            >
                <W
                    type={ThermometerGauge}
                    values={V}
                    data={{
                        widgetTitle: 'Boiler',
                        oid: 'demo.0.cistern',
                        min: 0,
                        max: 100,
                        unit: '°C',
                        digitsAfterComma: 0,
                        scaleSide: 'both',
                        majorTicks: 5,
                        colorMode: 'levels',
                        levelsCount: 2,
                        color1: '#1e88e5',
                        color2: '#e53935',
                        levelThreshold1: 40,
                    }}
                />
            </Item>
            <Item
                w={140}
                h={300}
                caption={'dark theme'}
            >
                <DarkTheme.Provider value>
                    <W
                        type={ThermometerGauge}
                        values={V}
                        data={{ widgetTitle: 'Garage', oid: 'demo.0.temperature', valueColor: '#fb8c00' }}
                    />
                </DarkTheme.Provider>
            </Item>
        </Shot>
    );
}

function CompassScenes(): React.JSX.Element {
    return (
        <Shot name="compass">
            <Item
                w={240}
                h={270}
                caption={'needleType = arrow\nspeedOid, speedUnit'}
            >
                <W
                    type={CompassGauge}
                    values={V}
                    data={{
                        widgetTitle: 'Wind',
                        oid: 'demo.0.windDirection',
                        speedOid: 'demo.0.windSpeed',
                        speedUnit: 'km/h',
                    }}
                />
            </Item>
            <Item
                w={240}
                h={270}
                caption={'needleType = compass\nbezel = metal, showValue = false'}
            >
                <W
                    type={CompassGauge}
                    values={V}
                    data={{
                        widgetTitle: 'Heading',
                        oid: 'demo.0.heading',
                        needleType: 'compass',
                        bezel: 'metal',
                        showValue: false,
                    }}
                />
            </Item>
            <Item
                w={240}
                h={270}
                caption={'needleType = wind\nvalueFormat = direction'}
            >
                <W
                    type={CompassGauge}
                    values={V}
                    data={{
                        widgetTitle: 'Wind',
                        oid: 'demo.0.windDirection',
                        needleType: 'wind',
                        valueFormat: 'direction',
                        showDegrees: false,
                        needleColor: '#1976d2',
                    }}
                />
            </Item>
            <Item
                w={240}
                h={270}
                caption={'rotateDial'}
            >
                <W
                    type={CompassGauge}
                    values={V}
                    data={{ widgetTitle: 'Heading', oid: 'demo.0.heading', rotateDial: true, showIntercardinal: true }}
                />
            </Item>
        </Shot>
    );
}

function TankScenes(): React.JSX.Element {
    return (
        <Shot name="tank">
            <Item
                w={200}
                h={260}
                caption="shape = cylinder"
            >
                <W
                    type={TankGauge}
                    values={V}
                    data={{ widgetTitle: 'Water', oid: 'demo.0.tank', max: 3000, unit: 'l' }}
                />
            </Item>
            <Item
                w={200}
                h={260}
                caption={'shape = rect, colorMode = levels\nlevelsCount = 3'}
            >
                <W
                    type={TankGauge}
                    values={V}
                    data={{
                        widgetTitle: 'Cistern',
                        oid: 'demo.0.cistern',
                        max: 100,
                        unit: '%',
                        shape: 'rect',
                        colorMode: 'levels',
                        levelsCount: 3,
                        levelThreshold1: 20,
                        levelThreshold2: 50,
                    }}
                />
            </Item>
            <Item
                w={340}
                h={200}
                caption={'shape = horizontal, showPercent\nvalueColor'}
            >
                <W
                    type={TankGauge}
                    values={V}
                    data={{
                        widgetTitle: 'Heating oil',
                        oid: 'demo.0.oil',
                        max: 6000,
                        unit: 'l',
                        shape: 'horizontal',
                        showPercent: true,
                        valueColor: '#8d6e63',
                        majorTicks: 3,
                    }}
                />
            </Item>
        </Shot>
    );
}

function RingsScenes(): React.JSX.Element {
    return (
        <Shot name="rings">
            <Item
                w={260}
                h={260}
                caption={'defaults: legend = gap'}
            >
                <W
                    type={RingsGauge}
                    values={V}
                    data={{ widgetTitle: 'Energy', ...RINGS }}
                />
            </Item>
            <Item
                w={360}
                h={260}
                caption={'angle = 360, legend = side\ncenterText'}
            >
                <W
                    type={RingsGauge}
                    values={V}
                    data={{
                        widgetTitle: 'Energy',
                        ...RINGS,
                        ringsCount: 4,
                        oid4: 'demo.0.autarky',
                        label4: 'Autarky',
                        unit4: '%',
                        angle: 360,
                        rotate: 0,
                        legend: 'side',
                        centerText: '☀',
                        ringWidth: 0.11,
                    }}
                />
            </Item>
            <Item
                w={260}
                h={260}
                caption={'dark theme, roundedCaps = false'}
            >
                <DarkTheme.Provider value>
                    <W
                        type={RingsGauge}
                        values={V}
                        data={{ widgetTitle: 'Energy', ...RINGS, roundedCaps: false, trackOpacity: 0.25 }}
                    />
                </DarkTheme.Provider>
            </Item>
        </Shot>
    );
}

function Levels(): React.JSX.Element {
    const data = {
        noCard: true,
        oid: 'demo.0.co2',
        min: 400,
        max: 2000,
        unit: 'ppm',
        levelsCount: 4,
        color1: '#43a047',
        color2: '#c0ca33',
        color3: '#fb8c00',
        color4: '#e53935',
        levelThreshold1: 800,
        levelThreshold2: 1000,
        levelThreshold3: 1400,
    };
    return (
        <Shot name="levels">
            <Item
                w={200}
                h={180}
                caption="colorMode = levels"
            >
                <W
                    type={ArcGauge}
                    values={V}
                    data={{ ...data, colorMode: 'levels' }}
                />
            </Item>
            <Item
                w={200}
                h={180}
                caption="colorMode = gradient"
            >
                <W
                    type={ArcGauge}
                    values={V}
                    data={{ ...data, colorMode: 'gradient' }}
                />
            </Item>
            <Item
                w={200}
                h={180}
                caption="segments = 16"
            >
                <W
                    type={ArcGauge}
                    values={V}
                    data={{ ...data, segments: 16 }}
                />
            </Item>
            <Item
                w={200}
                h={180}
                caption="radial: color bands"
            >
                <W
                    type={RadialGauge}
                    values={V}
                    data={{ ...data, majorTicks: 4, minorTicks: 4, bezel: 'thin', bandWidth: 0.1 }}
                />
            </Item>
        </Shot>
    );
}

function DarkScene(): React.JSX.Element {
    return (
        <Shot
            name="dark-theme"
            dark
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 220px)', gap: 12 }}
        >
            <Item w={220} h={190}>
                <W
                    type={ColorGauge}
                    values={V}
                    data={{ widgetTitle: 'Humidity', oid: 'demo.0.humidity', unit: '%', digitsAfterComma: 0 }}
                />
            </Item>
            <Item w={220} h={190}>
                <W
                    type={ArcGauge}
                    values={V}
                    data={{ widgetTitle: 'Arc', oid: 'demo.0.percent', unit: '%', segments: 20 }}
                />
            </Item>
            <Item w={220} h={190}>
                <W
                    type={CompassGauge}
                    values={V}
                    data={{
                        widgetTitle: 'Wind',
                        oid: 'demo.0.windDirection',
                        speedOid: 'demo.0.windSpeed',
                        speedUnit: 'km/h',
                        showDegrees: false,
                    }}
                />
            </Item>
            <Item w={220} h={190}>
                <W
                    type={TankGauge}
                    values={V}
                    data={{ widgetTitle: 'Tank', oid: 'demo.0.tank', max: 3000, unit: 'l', majorTicks: 3 }}
                />
            </Item>
        </Shot>
    );
}

// ------------------------------------------------------------------------------------------------ previews

function Previews(): React.JSX.Element {
    const noCard = { noCard: true };
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, padding: 20 }}>
            <Prev
                name="color_gauge"
                w={220}
                h={140}
            >
                <W
                    type={ColorGauge}
                    values={V}
                    data={{ ...noCard, oid: 'demo.0.percent', unit: '%', digitsAfterComma: 0, showMinMax: false }}
                />
            </Prev>
            <Prev
                name="water_gauge"
                w={160}
                h={160}
            >
                <W
                    type={WaterGauge}
                    values={V}
                    data={{ ...noCard, oid: 'demo.0.humidity', unit: '%' }}
                />
            </Prev>
            <Prev
                name="battery_gauge"
                w={200}
                h={120}
            >
                <W
                    type={BatteryGauge}
                    values={V}
                    data={{ ...noCard, oid: 'demo.0.battery' }}
                />
            </Prev>
            <Prev
                name="radial_gauge"
                w={170}
                h={170}
            >
                <W
                    type={RadialGauge}
                    values={V}
                    data={{ ...noCard, oid: 'demo.0.power', max: 6000, unit: 'W', majorTicks: 6 }}
                />
            </Prev>
            <Prev
                name="arc_gauge"
                w={170}
                h={160}
            >
                <W
                    type={ArcGauge}
                    values={V}
                    data={{ ...noCard, oid: 'demo.0.percent', unit: '%', showMinMax: false }}
                />
            </Prev>
            <Prev
                name="linear_gauge"
                w={220}
                h={90}
            >
                <W
                    type={LinearGauge}
                    values={V}
                    data={{ ...noCard, oid: 'demo.0.power', max: 6000, unit: 'W', majorTicks: 3 }}
                />
            </Prev>
            <Prev
                name="thermometer_gauge"
                w={90}
                h={180}
            >
                <W
                    type={ThermometerGauge}
                    values={V}
                    data={{ ...noCard, oid: 'demo.0.temperature', majorTicks: 3 }}
                />
            </Prev>
            <Prev
                name="compass_gauge"
                w={170}
                h={170}
            >
                <W
                    type={CompassGauge}
                    values={V}
                    data={{ ...noCard, oid: 'demo.0.windDirection', showDegrees: false, showValue: false }}
                />
            </Prev>
            <Prev
                name="tank_gauge"
                w={130}
                h={170}
            >
                <W
                    type={TankGauge}
                    values={V}
                    data={{ ...noCard, oid: 'demo.0.tank', max: 3000, unit: 'l', showScale: false }}
                />
            </Prev>
            <Prev
                name="rings_gauge"
                w={170}
                h={170}
            >
                <W
                    type={RingsGauge}
                    values={V}
                    data={{ ...noCard, ...RINGS, legend: 'none' }}
                />
            </Prev>
        </div>
    );
}

function App(): React.JSX.Element {
    React.useEffect(() => {
        // Ready once the widgets measured themselves and rendered with their size
        const timer = setTimeout(() => {
            (window as any).__shotsReady = true;
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    if (PREV) {
        document.body.style.background = 'transparent';
        return <Previews />;
    }

    return (
        <div
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                gap: 24,
                padding: 24,
                width: 1800,
            }}
        >
            <Overview />
            <ColorScenes />
            <WaterScenes />
            <BatteryScenes />
            <RadialScenes />
            <ArcScenes />
            <LinearScenes />
            <ThermometerScenes />
            <CompassScenes />
            <TankScenes />
            <RingsScenes />
            <Levels />
            <DarkScene />
        </div>
    );
}

createRoot(document.getElementById('root')!).render(<App />);
