import PropTypes from 'prop-types';

import { VisRxWidget } from '@iobroker/vis-2-widgets-react-dev';
import React from "react";

class Generic extends (window.visRxWidget || VisRxWidget) {
    // eslint-disable-next-line class-methods-use-this
    formatValue(value, round) {
        if (typeof value === 'number') {
            if (round === 0) {
                value = Math.round(value);
            } else {
                value = Math.round(value * 100) / 100;
            }
            if (this.props.systemConfig?.common) {
                if (this.props.systemConfig.common.isFloatComma) {
                    value = value.toString().replace('.', ',');
                }
            }
        }

        return value === undefined || value === null ? '' : value.toString();
    }

    getFontSize(text) {
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

    renderCustomText(showText, marginRight) {
        if (!showText) {
            return null;
        }

        const fontSize = this.getFontSize(showText);

        return <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: marginRight,
                fontSize,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            }}
        >
            {showText}
        </div>;
    }

    getValue() {
        // If a user enters some number or simple text, show it.
        let value;
        // eslint-disable-next-line no-restricted-properties
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

    getWidthOfText(txt, fontsize) {
        if (!this.refCardContent.current) {
            return txt.length * fontsize * 0.7;
        }
        const el = document.createElement('span');
        this.refCardContent.current.appendChild(el);
        if (el.style.fontSize !== fontsize) {
            el.style.fontSize = fontsize;
        }

        el.innerText = txt;
        const width = el.offsetWidth;
        el.remove();
        return width;
    }
}

Generic.propTypes = {
    systemConfig: PropTypes.object,
    socket: PropTypes.object,
    themeType: PropTypes.string,
    style: PropTypes.object,
    data: PropTypes.object,
};

export default Generic;
