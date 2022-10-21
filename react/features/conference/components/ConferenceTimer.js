// @flow

import { Component } from 'react';
import type { Dispatch } from 'redux';

import { renderConferenceTimer } from '../';
import { createToolbarEvent } from '../../analytics/AnalyticsEvents';
import { sendAnalytics } from '../../analytics/functions';
import { endConference } from '../../base/conference';
import { getConferenceTimestamp, getCountdownTimestamp } from '../../base/conference/functions';
import { disconnect } from '../../base/connection';
import { getLocalizedDurationFormatter } from '../../base/i18n';
import { connect } from '../../base/redux';
import {
    NOTIFICATION_TIMEOUT_TYPE,
    showNotification
} from '../../notifications';

/**
 * The type of the React {@code Component} props of {@link ConferenceTimer}.
 */
type Props = {

    /**
     * The UTC timestamp representing the time when first participant joined.
     */
    _startTimestamp: ?number,

    /**
     * The UTC timestamp representing the time when the moderator set the timer.
     */
     _endTimestamp: ?number,

    /**
     * Style to be applied to the rendered text.
     */
    textStyle: ?Object,

    /**
     * The redux {@code dispatch} function.
     */
    dispatch: Dispatch<any>
};

/**
 * The type of the React {@code Component} state of {@link ConferenceTimer}.
 */
type State = {

    /**
     * Value of current conference time.
     */
    timerValue: string,

    /**
     * Style of current conference time.
     */
    textStyle: Object

};

/**
 * ConferenceTimer react component.
 *
 * @class ConferenceTimer
 * @augments Component
 */
class ConferenceTimer extends Component<Props, State> {

    /**
     * Handle for setInterval timer.
     */
    _interval;

    /**
     * Handle for setInterval timer.
     */
    _countdownInterval;

    /**
     * Initializes a new {@code ConferenceTimer} instance.
     *
     * @param {Props} props - The read-only properties with which the new
     * instance is to be initialized.
     */
    constructor(props: Props) {
        super(props);

        this.state = {
            timerValue: getLocalizedDurationFormatter(0),
            textStyle: {}
        };
    }

    /**
     * Starts the conference timer when component will be
     * mounted.
     *
     * @inheritdoc
     */
    componentDidMount() {
        this._startTimer();
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props._endTimestamp && prevProps._endTimestamp !== this.props._endTimestamp) {
            this._stopTimer();
            this._startCountdown();
        }
    }

    /**
     * Stops the conference timer when component will be
     * unmounted.
     *
     * @inheritdoc
     */
    componentWillUnmount() {
        this._stopTimer();
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const { timerValue, textStyle } = this.state;
        const { _startTimestamp } = this.props;

        if (!_startTimestamp) {
            return null;
        }

        return renderConferenceTimer(timerValue, textStyle);
    }

    /**
     * Sets the current state values that will be used to render the timer.
     *
     * @param {number} refValueUTC - The initial UTC timestamp value.
     * @param {number} currentValueUTC - The current UTC timestamp value.
     *
     * @returns {void}
     */
    _setStateFromUTC(refValueUTC, currentValueUTC) {
        if (!refValueUTC || !currentValueUTC) {
            return;
        }

        if (currentValueUTC < refValueUTC) {
            return;
        }

        const timerMsValue = currentValueUTC - refValueUTC;

        const localizedTime = getLocalizedDurationFormatter(timerMsValue);

        this.setState({
            timerValue: localizedTime
        });
    }

    /**
     * Start conference timer.
     *
     * @returns {void}
     */
    _startTimer() {
        if (!this._interval) {
            this._setStateFromUTC(this.props._startTimestamp, new Date().getTime());

            this._interval = setInterval(() => {
                this._setStateFromUTC(this.props._startTimestamp, new Date().getTime());
            }, 1000);
        }
    }

    /**
     * Start conference timer.
     *
     * @returns {void}
     */
    _startCountdown() {
        const { dispatch } = this.props;

        if (!this._countdownInterval) {
            this._setStateFromUTC(new Date().getTime(), this.props._endTimestamp);

            this._countdownInterval = setInterval(() => {
                this._setStateFromUTC(new Date().getTime(), this.props._endTimestamp);
                if (this.state.timerValue === '00:30') {
                    this.setState({ textStyle: { 'color': 'red' } });
                    dispatch(showNotification({
                        titleArguments: {
                            period: '30',
                            periodType: 'seconds'
                        },
                        titleKey: 'notify.countdownNotice'
                    },
                    NOTIFICATION_TIMEOUT_TYPE.MEDIUM));
                }

                if (this.state.timerValue === '00:01') {
                    dispatch(endConference());

                    // sendAnalytics(createToolbarEvent('hangup'));
                    // dispatch(disconnect());
                    this._stopCountdownTimer();
                }

            }, 1000);
        }
    }

    /**
     * Stop conference timer.
     *
     * @returns {void}
     */
    _stopTimer() {
        if (this._interval) {
            clearInterval(this._interval);
        }
    }

    /**
     * Stop conference timer.
     *
     * @returns {void}
     */
    _stopCountdownTimer() {
        if (this._countdownInterval) {
            clearInterval(this._countdownInterval);
        }

        this.setState({
            timerValue: getLocalizedDurationFormatter(0)
        });
    }
}

/**
 * Maps (parts of) the Redux state to the associated
 * {@code ConferenceTimer}'s props.
 *
 * @param {Object} state - The Redux state.
 * @private
 * @returns {{
 *      _startTimestamp: number,
*       _endTimestamp: number
 * }}
 */
export function _mapStateToProps(state: Object) {

    return {
        _startTimestamp: getConferenceTimestamp(state),
        _endTimestamp: getCountdownTimestamp(state)
    };
}

export default connect(_mapStateToProps)(ConferenceTimer);
