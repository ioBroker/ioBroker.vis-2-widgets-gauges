/*
 * Number formatting and value coercion.
 *
 * Attribute values of the vis editor may arrive as strings ("12", "0.5", "true") - the helpers here accept both.
 */

/** Text of an attribute or state value; objects (which a state may hold) as JSON */
export function asText(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        return value.toString();
    }
    return JSON.stringify(value) ?? '';
}

/** A number from an attribute or a state value, `null` if there is none */
export function toNumber(value: unknown): number | null {
    if (value === '' || value === null || value === undefined) {
        return null;
    }
    if (typeof value === 'boolean') {
        return value ? 1 : 0;
    }
    const n = typeof value === 'number' ? value : parseFloat(asText(value).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
}

/** A number from an attribute, `fallback` if it is empty or not a number */
export function num(value: unknown, fallback: number): number {
    const n = toNumber(value);
    return n === null ? fallback : n;
}

/** An attribute that is used as a flag: `true`, `'true'`, `1` */
export function isTrue(value: unknown): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
}

/**
 * Formats a number for display.
 *
 * @param value the number
 * @param digits digits after the decimal point; `null` means "as many as needed, at most two"
 * @param isFloatComma use a comma as decimal separator (system setting of ioBroker)
 */
export function formatNumber(value: number, digits: number | null, isFloatComma?: boolean): string {
    if (!Number.isFinite(value)) {
        return '';
    }
    let text: string;
    if (digits === null || digits < 0) {
        text = (Math.round(value * 100) / 100).toString();
    } else {
        text = value.toFixed(Math.min(20, Math.round(digits)));
    }
    if (text === '-0' || /^-0[.,]0*$/.test(text)) {
        text = text.substring(1);
    }
    return isFloatComma ? text.replace('.', ',') : text;
}
