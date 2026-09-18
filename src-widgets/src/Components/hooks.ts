/*
 * React hooks of the gauges: the size of the drawing area and animated values.
 */
import React from 'react';

import { getEasing, type EasingFunction } from './easing';

/**
 * True on the screenshot page of the documentation: endless animations (waves, the charging battery) stand still
 * there, so every image shows the same picture.
 */
export function animationsFrozen(): boolean {
    return typeof window !== 'undefined' && !!(window as any).__visGaugesStill;
}

export interface Size {
    width: number;
    height: number;
}

/**
 * Size of an element, updated whenever it changes. The gauges draw in pixels of this size, so text offsets and
 * sizes given in px in the settings stay what they are.
 */
export function useElementSize<T extends HTMLElement>(): [React.RefObject<T | null>, Size] {
    const ref = React.useRef<T | null>(null);
    const [size, setSize] = React.useState<Size>({ width: 0, height: 0 });

    React.useLayoutEffect(() => {
        const el = ref.current;
        if (!el) {
            return undefined;
        }
        const measure = (): void => {
            const width = Math.floor(el.clientWidth);
            const height = Math.floor(el.clientHeight);
            setSize(prev => (prev.width === width && prev.height === height ? prev : { width, height }));
        };
        measure();
        if (typeof ResizeObserver === 'undefined') {
            return undefined;
        }
        const observer = new ResizeObserver(() => measure());
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return [ref, size];
}

export interface AnimationOptions {
    /** Without animation the value jumps */
    enabled: boolean;
    /** Duration in ms */
    duration: number;
    /** Wait before the animation starts, in ms */
    delay?: number;
    /** Name of the easing (see `easing.ts`) or the function itself */
    easing?: string | EasingFunction;
    /** Value to start from when the gauge appears. Without it the gauge shows its value at once. */
    initial?: number;
}

/**
 * A number that moves smoothly to its target.
 *
 * A new target while an animation runs starts from where the value is at that moment, so a gauge that gets values
 * quickly one after the other never jumps.
 */
export function useAnimatedValue(target: number, options: AnimationOptions): number {
    const { enabled, duration, delay = 0, easing, initial } = options;
    const start = enabled && initial !== undefined && Number.isFinite(initial) ? initial : target;
    const [value, setValue] = React.useState<number>(start);
    const current = React.useRef<number>(start);
    const frame = React.useRef<number | null>(null);
    const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        const stop = (): void => {
            if (frame.current !== null) {
                cancelAnimationFrame(frame.current);
                frame.current = null;
            }
            if (timer.current !== null) {
                clearTimeout(timer.current);
                timer.current = null;
            }
        };
        stop();

        if (!Number.isFinite(target)) {
            return stop;
        }
        const from = current.current;
        if (!enabled || duration <= 0 || !Number.isFinite(from) || from === target) {
            current.current = target;
            setValue(target);
            return stop;
        }

        const ease = typeof easing === 'function' ? easing : getEasing(easing, 'cubicInOut');
        const run = (): void => {
            timer.current = null;
            let startTime: number | null = null;
            const step = (now: number): void => {
                if (startTime === null) {
                    startTime = now;
                }
                const t = Math.min(1, (now - startTime) / duration);
                const v = from + (target - from) * ease(t);
                current.current = v;
                setValue(v);
                if (t < 1) {
                    frame.current = requestAnimationFrame(step);
                } else {
                    frame.current = null;
                    current.current = target;
                    setValue(target);
                }
            };
            frame.current = requestAnimationFrame(step);
        };

        if (delay > 0) {
            timer.current = setTimeout(run, delay);
        } else {
            run();
        }
        return stop;
    }, [target, enabled, duration, delay, easing]);

    return value;
}

/**
 * Turns an angle into one that is reached on the shortest way from the last one: going from 350 to 10 degrees
 * runs through north (360 + 10), not back through south.
 */
export function useUnwrappedAngle(angle: number): number {
    const [state, setState] = React.useState({ input: angle, unwrapped: Number.isFinite(angle) ? angle : 0 });
    if (Number.isFinite(angle) && angle !== state.input) {
        // Derived from the previous render, as React recommends it instead of an effect
        let delta = ((((angle - state.unwrapped) % 360) + 540) % 360) - 180;
        if (delta === -180) {
            delta = 180;
        }
        const next = { input: angle, unwrapped: state.unwrapped + delta };
        setState(next);
        return next.unwrapped;
    }
    return state.unwrapped;
}
