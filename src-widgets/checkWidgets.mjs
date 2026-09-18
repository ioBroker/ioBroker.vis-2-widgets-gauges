/*
 * Checks the widget declarations.
 *
 * - Projects store the settings of a widget per attribute name. The first three gauges were rewritten without
 *   their libraries, and every attribute they ever offered must still exist - otherwise a widget of an existing
 *   project silently loses that setting. `LEGACY` below is the list of 2.0.x.
 * - Every widget has its own tpl id and belongs to the set `vis-2-widgets-gauges`.
 * - Every label, tooltip, help text and select option exists in `src/i18n/en.json`, and every language has
 *   exactly the keys of English.
 * - The widgets are exposed in `vite.config.ts`, listed in `io-package.json` and have their preview image.
 *
 * Run with `npm run check-widgets` in the root, or `node checkWidgets.mjs` in this folder.
 */
import { build } from 'vite';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'src');
const TMP = path.join(HERE, '.check');

const WIDGETS = [
    'ColorGauge',
    'WaterGauge',
    'BatteryGauge',
    'RadialGauge',
    'ArcGauge',
    'LinearGauge',
    'ThermometerGauge',
    'CompassGauge',
    'TankGauge',
    'RingsGauge',
];

/** The attributes of the gauges in version 2.0.3; `(i)` marks the attributes of an indexed group */
const LEGACY = {
    tplGauge2Color: [
        'noCard',
        'widgetTitle',
        'oid',
        'min',
        'max',
        'unit',
        'levelsCount',
        'digitsAfterComma',
        'needleColor',
        'needleBaseColor',
        'marginInPercent',
        'cornerRadius',
        'arcPadding',
        'arcWidth',
        'hideText',
        'needleScale',
        'animate',
        'animDelay',
        'animateDuration',
        'color(i)',
        'levelThreshold(i)',
    ],
    tplGauge2Water: [
        'noCard',
        'widgetTitle',
        'oid',
        'min',
        'max',
        'size',
        'unit',
        'textSize',
        'textOffsetX',
        'textOffsetY',
        'riseAnimation',
        'riseAnimationTime',
        'riseAnimationEasing',
        'waveAnimation',
        'waveAnimationTime',
        'waveAnimationEasing',
        'waveFrequency',
        'waveAmplitude',
        'innerRadius',
        'outerRadius',
        'margin',
        'textColor',
        'textWaveColor',
        'circleColor',
        'gradient',
        'levelsCount',
        'stopColor(i)',
        'stopOpacity(i)',
        'levelThreshold(i)',
    ],
    tplGauge2Battery: [
        'noCard',
        'widgetTitle',
        'oid',
        'charging-oid',
        'min',
        'max',
        'orientation',
        'padding',
        'size',
        'aspectRatio',
        'animated',
        'batteryBodyCornerRadius',
        'batteryBodyFill',
        'batteryBodyStrokeColor',
        'batteryCapFill',
        'batteryCapStrokeWidth',
        'batteryCapStrokeColor',
        'batteryCapCornerRadius',
        'batteryCapCapToBodyRatio',
        'batteryMeterFill',
        'batteryMeterLowBatteryValue',
        'batteryMeterLowBatteryFill',
        'batteryMeterOuterGap',
        'batteryMeterNoOfCells',
        'batteryMeterInterCellsGap',
        'readingTextLightContrastColor',
        'readingTextDarkContrastColor',
        'readingTextLowBatteryColor',
        'readingTextFontFamily',
        'readingTextFontSize',
        'chargingFlashScale',
        'chargingFlashFill',
        'chargingFlashAnimated',
        'chargingFlashAnimationDuration',
    ],
};

/** Keys the widgets translate at runtime with `t()`, not through a declaration */
const RUNTIME_KEYS = [
    'dir_N',
    'dir_NNE',
    'dir_NE',
    'dir_ENE',
    'dir_E',
    'dir_ESE',
    'dir_SE',
    'dir_SSE',
    'dir_S',
    'dir_SSW',
    'dir_SW',
    'dir_WSW',
    'dir_W',
    'dir_WNW',
    'dir_NW',
    'dir_NNW',
];

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const entry = path.join(TMP, 'entry.ts');
writeFileSync(
    entry,
    `${WIDGETS.map(w => `import ${w} from '${SRC.replace(/\\/g, '/')}/${w}';`).join('\n')}
export default { ${WIDGETS.join(', ')} };
`,
);

await build({
    configFile: false,
    logLevel: 'error',
    build: {
        lib: { entry, formats: ['cjs'], fileName: () => 'bundle.cjs' },
        outDir: TMP,
        emptyOutDir: false,
        minify: false,
        rollupOptions: { external: ['react', 'react-dom', 'react/jsx-runtime'] },
    },
});

// The widgets extend `window.visRxWidget`, which the vis-2 runtime provides
globalThis.window = { visRxWidget: class VisRxWidgetStub {} };

const mod = await import(pathToFileURL(path.join(TMP, 'bundle.cjs')).href);
const widgets = mod.default.default || mod.default;

let problems = 0;
const error = text => {
    console.log(`ERROR ${text}`);
    problems++;
};

const i18nDir = path.join(SRC, 'i18n');
const en = JSON.parse(readFileSync(path.join(i18nDir, 'en.json'), 'utf8'));
const used = new Set(RUNTIME_KEYS);
const ids = new Set();

for (const name of WIDGETS) {
    const info = widgets[name].getWidgetInfo();
    const prefix = `${name} (${info.id})`;

    if (ids.has(info.id)) {
        error(`${prefix}: duplicate tpl id`);
    }
    ids.add(info.id);
    if (info.visSet !== 'vis-2-widgets-gauges') {
        error(`${prefix}: visSet is "${info.visSet}", must be "vis-2-widgets-gauges"`);
    }
    const prevFile = info.visPrev.replace('widgets/vis-2-widgets-gauges/', '');
    if (!existsSync(path.join(HERE, 'public', prevFile))) {
        error(`${prefix}: preview image public/${prevFile} is missing`);
    }

    [info.visWidgetLabel, info.visSetLabel, info.visHelp].filter(Boolean).forEach(key => used.add(key));

    const own = new Set();
    for (const group of info.visAttrs) {
        if (group.label) {
            used.add(group.label);
        }
        const indexed = group.indexFrom !== undefined;
        for (const field of group.fields) {
            if (!field.name) {
                error(`${prefix}: field without name in group ${group.name}`);
            }
            own.add(indexed ? `${field.name}(i)` : field.name);
            [field.label, field.tooltip].filter(Boolean).forEach(key => used.add(key));
            if (Array.isArray(field.options) && !field.noTranslation) {
                field.options.forEach(o => used.add(typeof o === 'string' ? o : o.label));
            }
        }
    }

    const legacy = LEGACY[info.id] || [];
    const missing = legacy.filter(a => !own.has(a));
    if (missing.length) {
        error(`${prefix}: attributes of version 2.0 are gone: ${missing.join(', ')}`);
    }
    const added = legacy.length ? [...own].filter(a => !legacy.includes(a)) : [];
    console.log(
        `OK    ${prefix}: ${info.visAttrs.length} groups, ${own.size} fields` +
            (added.length ? ` | new: ${added.join(', ')}` : ''),
    );
}

// '' is the "not set" entry of a select and needs no translation
const missingKeys = [...used].filter(key => key !== '' && !en[key]);
if (missingKeys.length) {
    error(`missing keys in i18n/en.json: ${missingKeys.join(', ')}`);
}
const unusedKeys = Object.keys(en).filter(key => !used.has(key));
if (unusedKeys.length) {
    console.log(`WARN  keys in i18n/en.json that no widget uses: ${unusedKeys.join(', ')}`);
}

for (const file of readdirSync(i18nDir).filter(f => f.endsWith('.json') && f !== 'en.json')) {
    const words = JSON.parse(readFileSync(path.join(i18nDir, file), 'utf8'));
    const lacking = Object.keys(en).filter(key => !words[key]);
    const extra = Object.keys(words).filter(key => !(key in en));
    if (lacking.length) {
        error(`i18n/${file} lacks: ${lacking.join(', ')}`);
    }
    if (extra.length) {
        error(`i18n/${file} has keys that en.json does not have: ${extra.join(', ')}`);
    }
}

// The widget list is repeated in vite.config.ts (exposes) and in io-package.json (components)
const viteConfig = readFileSync(path.join(HERE, 'vite.config.ts'), 'utf8');
for (const name of WIDGETS) {
    if (!viteConfig.includes(`'./${name}': './src/${name}'`)) {
        error(`${name} is not exposed in vite.config.ts`);
    }
}
const ioPackage = JSON.parse(readFileSync(path.join(HERE, '..', 'io-package.json'), 'utf8'));
const components = Object.values(ioPackage.common.visWidgets || {}).flatMap(set => set.components || []);
const notListed = WIDGETS.filter(w => !components.includes(w));
const unknown = components.filter(c => !WIDGETS.includes(c));
if (notListed.length) {
    error(`io-package.json does not list: ${notListed.join(', ')}`);
}
if (unknown.length) {
    error(`io-package.json lists unknown components: ${unknown.join(', ')}`);
}

rmSync(TMP, { recursive: true, force: true });
console.log(problems ? `\n${problems} problem(s)` : '\nall widget declarations fine');
if (process.argv.includes('--keys')) {
    console.log(JSON.stringify([...used].sort()));
}
process.exit(problems ? 1 : 0);
