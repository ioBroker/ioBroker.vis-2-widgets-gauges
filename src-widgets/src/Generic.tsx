import React from 'react';

import type VisRxWidget from '@iobroker/types-vis-2/visRxWidget';
import type { VisRxWidgetState } from '@iobroker/types-vis-2';

export interface GaugesGenericState extends VisRxWidgetState {
    object?: ioBroker.Object | null;
}

export default class Generic<
    RxData extends Record<string, any>,
    State extends Partial<GaugesGenericState> = GaugesGenericState,
> extends (window.visRxWidget as typeof VisRxWidget)<RxData, State> {
    protected refCardContent: React.RefObject<HTMLDivElement | null> = React.createRef();

    formatValue(value: string | number, round?: number): string {
        if (typeof value === 'number') {
            if (round === 0) {
                value = Math.round(value);
            } else {
                value = Math.round(value * 100) / 100;
            }
            if (this.props.context.systemConfig?.common) {
                if (this.props.context.systemConfig.common.isFloatComma) {
                    value = value.toString().replace('.', ',');
                }
            }
        }

        return value === undefined || value === null ? '' : value.toString();
    }

    getFontSize(text: string): number {
        const width = this.getWidthOfText(text, 10);
        if (this.refCardContent.current) {
            let divWidth;
            const svg = this.refCardContent.current.querySelector('svg');
            if (svg) {
                divWidth = svg.clientWidth;
            } else {
                divWidth = this.refCardContent.current.offsetWidth;
            }
            return Math.floor((divWidth / width) * 10);
        }

        return 10;
    }

    renderCustomText(showText: string | null | undefined, marginRight?: number | string): React.JSX.Element | null {
        if (!showText) {
            return null;
        }

        const fontSize = this.getFontSize(showText);

        return (
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight,
                    fontSize,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}
            >
                {showText}
            </div>
        );
    }

    getValue(): number {
        // If a user enters some number or simple text, show it.
        let value;
        if (window.isFinite(this.state.rxData.oid)) {
            value = this.state.rxData.oid;
            value = parseFloat(value);
        } else if (this.state.rxData.oid && !this.state.rxData.oid.toString().includes('.')) {
            value = this.state.rxData.oid;
        } else {
            value = this.state.values[`${this.state.object?._id}.val`] || 0;
        }
        return value;
    }

    getWidthOfText(txt: string, fontSize: number): number {
        if (!this.refCardContent.current) {
            return txt.length * fontSize * 0.7;
        }
        const el = document.createElement('span');
        this.refCardContent.current.appendChild(el);
        if (el.style.fontSize !== fontSize.toString()) {
            el.style.fontSize = fontSize.toString();
        }

        el.innerText = txt;
        const width = el.offsetWidth;
        el.remove();
        return width;
    }

    async propertiesUpdate(): Promise<void> {
        if (
            this.state.rxData.oid &&
            this.state.rxData.oid !== 'nothing_selected' &&
            (!this.state.object || this.state.rxData.oid !== this.state.object._id)
        ) {
            const object = await this.props.context.socket.getObject(this.state.rxData.oid);
            this.setState({ object });
        }
    }

    async componentDidMount(): Promise<void> {
        super.componentDidMount();
        await this.propertiesUpdate();
    }

    async onRxDataChanged(): Promise<void> {
        await this.propertiesUpdate();
    }
}
