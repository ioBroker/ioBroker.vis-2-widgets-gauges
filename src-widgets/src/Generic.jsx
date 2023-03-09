import PropTypes from 'prop-types';

import {
    Card, CardContent,
} from '@mui/material';

import { VisRxWidget } from '@iobroker/vis-2-widgets-react-dev';

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

    wrapContent(content, addToHeader, cardContentStyle, headerStyle, onCardClick) {
        return super.wrapContent(content, addToHeader, cardContentStyle, headerStyle, onCardClick, { Card, CardContent });
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
