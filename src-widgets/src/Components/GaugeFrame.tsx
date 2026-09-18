/*
 * Drawing area of a gauge: measures the space it gets and renders an SVG of exactly that size.
 */
import React from 'react';

import { useElementSize, type Size } from './hooks';

/** Colours of the vis-2 theme, the fallback of every colour setting */
export interface GaugeTheme {
    dark: boolean;
    /** Text on the view / card */
    text: string;
    /** Less important text: min/max labels, units */
    secondary: string;
    /** Background of an arc or bar where no value is */
    track: string;
    /** Background of the card */
    paper: string;
    /** Accent colour of the theme */
    primary: string;
    fontFamily: string;
}

interface GaugeFrameProps {
    /** Draws the gauge for the measured size */
    children: (size: Size) => React.ReactNode;
    /** Draw with this size instead of the measured one (the "Size" setting of the older gauges) */
    fixedWidth?: number;
    fixedHeight?: number;
    fontFamily?: string;
    /** Shown instead of the value: a text value of the object, centered over the gauge */
    overlay?: React.ReactNode;
    onClick?: () => void;
}

export default function GaugeFrame(props: GaugeFrameProps): React.JSX.Element {
    const [ref, size] = useElementSize<HTMLDivElement>();
    const width = props.fixedWidth || size.width;
    const height = props.fixedHeight || size.height;

    return (
        <div
            ref={ref}
            style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                cursor: props.onClick ? 'pointer' : undefined,
            }}
            onClick={props.onClick}
        >
            {width > 0 && height > 0 ? (
                <svg
                    width={width}
                    height={height}
                    viewBox={`0 0 ${width} ${height}`}
                    style={{ display: 'block', overflow: 'visible', fontFamily: props.fontFamily }}
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {props.children({ width, height })}
                </svg>
            ) : null}
            {props.overlay}
        </div>
    );
}

/**
 * Font size so that `text` fits into `maxWidth`, estimated without measuring (the glyphs of the usual UI fonts
 * are about 0.58 em wide on average).
 */
export function fitFontSize(text: string, preferred: number, maxWidth: number, charWidth = 0.58): number {
    const length = Math.max(1, text.length);
    return Math.max(1, Math.min(preferred, maxWidth / (length * charWidth)));
}

/** A text value of the object, shown in the middle of the gauge instead of a number */
export function TextOverlay(props: { text: string; color: string; size: Size }): React.JSX.Element {
    const fontSize = fitFontSize(props.text, Math.min(props.size.height * 0.3, 48), props.size.width * 0.8);
    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize,
                color: props.color,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
            }}
        >
            {props.text}
        </div>
    );
}
