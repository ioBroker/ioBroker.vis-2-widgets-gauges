import React from 'react';

import type {
    RxRenderWidgetProps,
    RxWidgetInfoAttributesField,
    RxWidgetInfoGroup,
    VisRxWidgetState,
} from '@iobroker/types-vis-2';
import type VisRxWidget from '@iobroker/types-vis-2/visRxWidget';

import { EASING_NAMES } from './Components/easing';
import { asText, num, toNumber } from './Components/format';
import type { GaugeTheme } from './Components/GaugeFrame';

/** The main value of a gauge: a number, a text to show instead, or nothing yet */
export interface GaugeValue {
    value: number | null;
    text: string | null;
}

type Field = RxWidgetInfoAttributesField;

/**
 * Base class of every gauge.
 *
 * `window.visRxWidget` is provided by the vis-2 runtime, so the widget set is built against the react of the host
 * instead of shipping its own. The drawing itself happens in function components under `Components/` - the
 * classes here only read the settings and the states.
 */
export default class Generic<
    RxData extends Record<string, any>,
    State extends Partial<VisRxWidgetState> = VisRxWidgetState,
> extends (window.visRxWidget as typeof VisRxWidget)<RxData, State> {
    static getI18nPrefix(): string {
        return 'vis_2_widgets_gauges_';
    }

    /**
     * Value of the main object ID `oid`.
     *
     * Like the first version of the widgets, the field also takes a constant instead of an ID: a number is shown as
     * value, a word without a dot as text.
     */
    getMainValue(attr = 'oid'): GaugeValue {
        const oid: unknown = this.state.rxData[attr];
        if (oid === undefined || oid === null || oid === '' || oid === 'nothing_selected') {
            return { value: null, text: null };
        }
        if (typeof oid === 'number') {
            return { value: oid, text: null };
        }
        const oidText = asText(oid).trim();
        if (oidText !== '' && Number.isFinite(Number(oidText))) {
            return { value: Number(oidText), text: null };
        }
        if (!oidText.includes('.')) {
            return { value: null, text: oidText };
        }
        return this.stateToGaugeValue(this.state.values[`${oidText}.val`]);
    }

    /** A state value as gauge value: numbers (also as text) and booleans are numbers, everything else is text */
    // eslint-disable-next-line class-methods-use-this
    stateToGaugeValue(val: unknown): GaugeValue {
        if (val === undefined || val === null || val === '') {
            return { value: null, text: null };
        }
        const n = toNumber(val);
        if (n !== null && (typeof val !== 'string' || Number.isFinite(Number(val.replace(',', '.'))))) {
            return { value: n, text: null };
        }
        return { value: null, text: asText(val) };
    }

    /** Numeric value of the object ID in the attribute `attr`, `null` if there is none */
    getNumberOf(attr: string): number | null {
        const oid: unknown = this.state.rxData[attr];
        if (!oid || oid === 'nothing_selected') {
            return null;
        }
        if (typeof oid === 'number') {
            return oid;
        }
        const oidText = asText(oid);
        if (Number.isFinite(Number(oidText))) {
            return Number(oidText);
        }
        return this.stateToGaugeValue(this.state.values[`${oidText}.val`]).value;
    }

    isFloatComma(): boolean {
        return !!this.props.context.systemConfig?.common?.isFloatComma;
    }

    /** Colours of the vis-2 theme the gauges fall back to when a colour is not set */
    getGaugeTheme(): GaugeTheme {
        const theme: any = this.props.context.theme;
        const dark = this.props.context.themeType === 'dark' || theme?.palette?.mode === 'dark';
        const styleColor = (this.state.rxStyle as any)?.color as string | undefined;
        return {
            dark,
            text: styleColor || theme?.palette?.text?.primary || (dark ? '#ffffff' : 'rgba(0, 0, 0, 0.87)'),
            secondary: theme?.palette?.text?.secondary || (dark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'),
            track: dark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.09)',
            paper: theme?.palette?.background?.paper || (dark ? '#1e1e1e' : '#ffffff'),
            primary: theme?.palette?.primary?.main || '#1976d2',
            fontFamily: theme?.typography?.fontFamily || 'Roboto, Helvetica, Arial, sans-serif',
        };
    }

    /** Minimum and maximum of the scale; an empty field falls back to the defaults */
    getRange(defMin = 0, defMax = 100): { min: number; max: number } {
        let min = num(this.state.rxData.min, defMin);
        let max = num(this.state.rxData.max, defMax);
        if (min === max) {
            max = min + 1;
        }
        if (min > max) {
            [min, max] = [max, min];
        }
        return { min, max };
    }

    /** Digits after the comma, `null` if not set */
    getDigits(attr = 'digitsAfterComma'): number | null {
        const d = toNumber(this.state.rxData[attr]);
        return d === null ? null : Math.max(0, Math.min(10, Math.round(d)));
    }

    /**
     * Puts the gauge into the card of vis-2 unless "Without border" is set or the widget is shown inside another
     * widget. The content always gets the remaining height of the card.
     */
    wrapGauge(content: React.ReactNode, props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        const inCard = !this.state.rxData.noCard && !props.widget?.usedInWidget;
        const body = (
            <div
                className="vis-2-gauges"
                style={{
                    flex: 1,
                    width: '100%',
                    height: inCard ? undefined : '100%',
                    minHeight: 0,
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {content}
            </div>
        );
        if (!inCard) {
            return body;
        }
        return this.wrapContent(body, null, { textAlign: 'center' });
    }

    // --------------------------------------------------------------------------------- shared field definitions

    /**
     * The object ID field. Selecting an object takes over its unit and, if the object defines them, its minimum
     * and maximum. Inside an indexed group the attributes of the same index are filled.
     */
    static oidField(name = 'oid', label = 'oid', takeOver = true): Field {
        return {
            name,
            type: 'id',
            label,
            onChange: takeOver
                ? async (_field, data, changeData, socket, index): Promise<void> => {
                      const suffix = index === undefined ? '' : String(index);
                      const oid = data[`${name}${suffix}`];
                      if (!oid || oid === 'nothing_selected') {
                          return;
                      }
                      const object = await socket.getObject(oid);
                      if (object?.common) {
                          const common = object.common as ioBroker.StateCommon;
                          if (common.min !== undefined && common.min !== null) {
                              data[`min${suffix}`] = common.min;
                          }
                          if (common.max !== undefined && common.max !== null) {
                              data[`max${suffix}`] = common.max;
                          }
                          data[`unit${suffix}`] = common.unit || '';
                          changeData(data);
                      }
                  }
                : undefined,
        };
    }

    /** "Without border", the title of the card and the object ID */
    static commonGroup(extraFields: Field[] = [], takeOver = true): RxWidgetInfoGroup {
        return {
            name: 'common',
            fields: [
                { name: 'noCard', label: 'without_card', type: 'checkbox' },
                { name: 'widgetTitle', label: 'name', hidden: '!!data.noCard' },
                Generic.oidField('oid', 'oid', takeOver),
                ...extraFields,
            ],
        };
    }

    /** Minimum, maximum, unit and digits */
    static valueGroup(
        defaults: { min?: number; max?: number; unit?: string; digits?: number } = {},
    ): RxWidgetInfoGroup {
        return {
            name: 'value',
            label: 'group_value',
            fields: [
                { name: 'min', type: 'number', label: 'min', default: defaults.min ?? 0 },
                { name: 'max', type: 'number', label: 'max', default: defaults.max ?? 100 },
                { name: 'unit', label: 'unit', default: defaults.unit ?? '' },
                {
                    name: 'digitsAfterComma',
                    type: 'slider',
                    label: 'digits_after_comma',
                    tooltip: 'digits_after_comma_tooltip',
                    min: 0,
                    max: 4,
                    step: 1,
                    ...(defaults.digits !== undefined ? { default: defaults.digits } : {}),
                },
            ] as Field[],
        };
    }

    /**
     * How the value is coloured, and the levels.
     *
     * @param modes the colour modes the gauge offers
     * @param defaultMode mode of a new widget
     * @param defaultColor the fixed colour of a new widget
     */
    static colorGroups(
        modes: ('fixed' | 'levels' | 'gradient')[],
        defaultMode: 'fixed' | 'levels' | 'gradient',
        defaultColor: string,
        defaultLevels = 3,
    ): RxWidgetInfoGroup[] {
        return [
            {
                name: 'colors',
                label: 'group_colors',
                fields: [
                    {
                        name: 'colorMode',
                        type: 'select',
                        label: 'color_mode',
                        tooltip: 'color_mode_tooltip',
                        options: modes.map(m => ({ value: m, label: `color_mode_${m}` })),
                        default: defaultMode,
                    },
                    {
                        name: 'valueColor',
                        type: 'color',
                        label: 'value_color',
                        default: defaultColor,
                        hidden: (data: Record<string, any>) => (data.colorMode || defaultMode) !== 'fixed',
                    },
                    {
                        name: 'levelsCount',
                        type: 'number',
                        label: 'levels_count',
                        min: 1,
                        max: 10,
                        default: defaultLevels,
                    },
                ] as Field[],
            },
            Generic.levelGroup(),
        ];
    }

    /** The indexed group of the levels: colour and upper threshold */
    static levelGroup(): RxWidgetInfoGroup {
        return {
            name: 'level',
            label: 'group_level',
            indexFrom: 1,
            indexTo: 'levelsCount',
            fields: [
                { name: 'color', type: 'color', label: 'level_color', tooltip: 'level_color_tooltip' },
                {
                    name: 'levelThreshold',
                    type: 'number',
                    label: 'level_threshold',
                    tooltip: 'level_threshold_upper_tooltip',
                    hidden: (data: Record<string, any>, index?: number) => index === parseInt(data.levelsCount, 10),
                },
            ] as Field[],
        };
    }

    /** Animation on/off, duration and easing */
    static animationGroup(defaults: { duration: number; easing: string }): RxWidgetInfoGroup {
        return {
            name: 'animation',
            label: 'animation',
            fields: [
                { name: 'animate', type: 'checkbox', label: 'animate', default: true },
                {
                    name: 'animateDuration',
                    type: 'number',
                    label: 'animate_duration',
                    tooltip: 'animate_duration_tooltip',
                    default: defaults.duration,
                    hidden: '!data.animate',
                },
                {
                    name: 'animationEasing',
                    type: 'select',
                    label: 'animation_easing',
                    options: EASING_NAMES,
                    noTranslation: true,
                    default: defaults.easing,
                    hidden: '!data.animate',
                },
            ] as Field[],
        };
    }
}
