/*
 * Development page for the gauges.
 *
 * It renders the widgets against a stub of the vis-2 `VisRxWidget` base class, so the whole set can be looked at
 * without a running ioBroker. The state values are editable on the left, every widget reacts to them live.
 *
 * Not part of the widget set - excluded from lint and never built into `widgets/`.
 * Start with `npm run preview` in the root.
 */
import React, { useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';

// puts the stub of `window.visRxWidget` in place - before the widgets are imported below
import { makeContext, withDefaults } from './stub';

const ERROR_STYLE =
    'margin:24px;padding:16px;background:#fde7e9;color:#8b1a1a;border-radius:8px;white-space:pre-wrap;font:13px/1.5 monospace';

/** Shows a message in the page instead of leaving a white screen behind */
function fail(what: string, error: unknown): never {
    const details = error instanceof Error ? [error.message, error.stack || ''].join('\n\n') : String(error);
    const root = document.getElementById('root');
    if (root) {
        root.innerHTML = '';
        const pre = document.createElement('pre');
        pre.style.cssText = ERROR_STYLE;
        pre.textContent = [what, details].join('\n\n');
        root.appendChild(pre);
    }
    console.error(what, error);
    throw error;
}

// The widgets extend `window.visRxWidget`, so they may only be imported after the stub is in place
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
]).catch(e => fail('The widgets could not be loaded.', e));

// ---------------------------------------------------------------------------------------------- fake states

type Values = Record<string, any>;

interface Control {
    id: string;
    label: string;
    min: number;
    max: number;
    step?: number;
    initial: number | boolean;
}

const CONTROLS: Control[] = [
    { id: 'test.0.percent', label: 'Percent', min: 0, max: 100, initial: 64 },
    { id: 'test.0.power', label: 'Power W', min: -3000, max: 6000, step: 10, initial: 2350 },
    { id: 'test.0.temperature', label: 'Temperature', min: -20, max: 40, step: 0.1, initial: 21.4 },
    { id: 'test.0.humidity', label: 'Humidity', min: 0, max: 100, initial: 47 },
    { id: 'test.0.battery', label: 'Battery', min: 0, max: 100, initial: 72 },
    { id: 'test.0.charging', label: 'Charging', min: 0, max: 1, initial: false },
    { id: 'test.0.windDirection', label: 'Wind dir.', min: 0, max: 359, initial: 225 },
    { id: 'test.0.windSpeed', label: 'Wind speed', min: 0, max: 80, step: 0.1, initial: 18.5 },
    { id: 'test.0.tank', label: 'Tank l', min: 0, max: 3000, step: 10, initial: 1850 },
    { id: 'test.0.setpoint', label: 'Setpoint', min: 0, max: 100, initial: 75 },
    { id: 'test.0.pv', label: 'PV kW', min: 0, max: 10, step: 0.1, initial: 6.3 },
    { id: 'test.0.house', label: 'House kW', min: 0, max: 10, step: 0.1, initial: 2.1 },
];

function initialValues(): Values {
    const values: Values = {};
    for (const c of CONTROLS) {
        values[`${c.id}.val`] = c.initial;
        values[`${c.id}.ack`] = true;
    }
    return values;
}

// ------------------------------------------------------------------------------------------------ widgets

interface Demo {
    title: string;
    type: any;
    data: Record<string, any>;
    w: number;
    h: number;
}

const DEMOS: Demo[] = [
    {
        title: 'Color gauge',
        type: ColorGauge,
        w: 240,
        h: 200,
        data: { oid: 'test.0.percent', min: 0, max: 100, unit: '%' },
    },
    {
        title: 'Water gauge',
        type: WaterGauge,
        w: 200,
        h: 200,
        data: { oid: 'test.0.humidity', min: 0, max: 100, unit: '%' },
    },
    {
        title: 'Battery gauge',
        type: BatteryGauge,
        w: 220,
        h: 140,
        data: { oid: 'test.0.battery', 'charging-oid': 'test.0.charging', min: 0, max: 100 },
    },
    {
        title: 'Radial gauge',
        type: RadialGauge,
        w: 240,
        h: 240,
        data: { oid: 'test.0.power', min: 0, max: 6000, unit: 'W', label: 'Power' },
    },
    {
        title: 'Arc gauge',
        type: ArcGauge,
        w: 240,
        h: 220,
        data: { oid: 'test.0.percent', min: 0, max: 100, unit: '%', targetOid: 'test.0.setpoint' },
    },
    {
        title: 'Linear gauge',
        type: LinearGauge,
        w: 320,
        h: 130,
        data: { oid: 'test.0.power', min: -3000, max: 6000, unit: 'W', fromZero: true },
    },
    {
        title: 'Thermometer',
        type: ThermometerGauge,
        w: 140,
        h: 300,
        data: { oid: 'test.0.temperature' },
    },
    {
        title: 'Compass',
        type: CompassGauge,
        w: 240,
        h: 240,
        data: { oid: 'test.0.windDirection', speedOid: 'test.0.windSpeed', speedUnit: 'km/h' },
    },
    {
        title: 'Tank',
        type: TankGauge,
        w: 200,
        h: 260,
        data: { oid: 'test.0.tank', min: 0, max: 3000, unit: 'l' },
    },
    {
        title: 'Rings',
        type: RingsGauge,
        w: 340,
        h: 240,
        data: {
            ringsCount: 3,
            oid1: 'test.0.pv',
            label1: 'PV',
            max1: 10,
            unit1: 'kW',
            oid2: 'test.0.house',
            label2: 'House',
            max2: 10,
            unit2: 'kW',
            oid3: 'test.0.battery',
            label3: 'Battery',
            unit3: '%',
        },
    },
];

// ------------------------------------------------------------------------------------------------- controls

function Slider(props: { control: Control; value: any; onChange: (value: any) => void }): React.JSX.Element {
    const c = props.control;
    const isBool = typeof c.initial === 'boolean';
    return (
        <label style={{ display: 'grid', gridTemplateColumns: '90px 1fr 56px', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>{c.label}</span>
            {isBool ? (
                <input
                    type="checkbox"
                    checked={!!props.value}
                    onChange={e => props.onChange(e.target.checked)}
                    style={{ justifySelf: 'start' }}
                />
            ) : (
                <input
                    type="range"
                    min={c.min}
                    max={c.max}
                    step={c.step || 1}
                    value={props.value}
                    onChange={e => props.onChange(parseFloat(e.target.value))}
                />
            )}
            <span style={{ fontSize: 12, textAlign: 'right' }}>{isBool ? '' : props.value}</span>
        </label>
    );
}

/** `?dark=1&nocard=1&size=1.5&only=Compass` - handy to open the page in a certain state */
const QUERY = new URLSearchParams(window.location.search);

function App(): React.JSX.Element {
    const [values, setValues] = useState<Values>(initialValues);
    const [dark, setDark] = useState(QUERY.get('dark') === '1');
    const [noCard, setNoCard] = useState(QUERY.get('nocard') === '1');
    const [size, setSize] = useState(parseFloat(QUERY.get('size') || '1') || 1);
    const only = QUERY.get('only');

    const context = React.useMemo(() => makeContext(dark ? 'dark' : 'light'), [dark]);

    const setValue = (id: string, val: any): void =>
        setValues(prev => ({ ...prev, [`${id}.val`]: val, [`${id}.ack`]: true }));

    const page: CSSProperties = {
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        minHeight: '100vh',
        background: dark ? '#121212' : '#f0f0f0',
        color: dark ? '#eee' : '#222',
    };

    return (
        <div style={page}>
            <div
                style={{
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    borderRight: '1px solid rgba(128,128,128,0.3)',
                }}
            >
                <b>States</b>
                {CONTROLS.map(c => (
                    <Slider
                        key={c.id}
                        control={c}
                        value={values[`${c.id}.val`]}
                        onChange={v => setValue(c.id, v)}
                    />
                ))}
                <b style={{ marginTop: 12 }}>View</b>
                <label>
                    <input
                        type="checkbox"
                        checked={dark}
                        onChange={e => setDark(e.target.checked)}
                    />{' '}
                    Dark theme
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={noCard}
                        onChange={e => setNoCard(e.target.checked)}
                    />{' '}
                    Without card
                </label>
                <label style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8 }}>
                    <span style={{ fontSize: 12 }}>Size</span>
                    <input
                        type="range"
                        min={0.5}
                        max={2}
                        step={0.05}
                        value={size}
                        onChange={e => setSize(parseFloat(e.target.value))}
                    />
                </label>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, padding: 16, alignContent: 'flex-start' }}>
                {DEMOS.filter(demo => !only || only.split(',').includes(demo.title)).map(demo => {
                    const Type = demo.type;
                    return (
                        <div key={demo.title}>
                            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{demo.title}</div>
                            <div
                                style={{
                                    width: demo.w * size,
                                    height: demo.h * size,
                                    position: 'relative',
                                    outline: '1px dashed rgba(128,128,128,0.4)',
                                }}
                            >
                                <Type
                                    context={context}
                                    editMode={false}
                                    view="view"
                                    id={demo.title}
                                    values={values}
                                    rxStyle={{}}
                                    rxData={withDefaults(Type, { ...demo.data, noCard, widgetTitle: demo.title })}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

createRoot(document.getElementById('root')!).render(<App />);
