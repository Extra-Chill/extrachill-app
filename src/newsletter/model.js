function subscriptionState(subscribed) {
    return { subscribed, previous: subscribed, pending: false, error: '' };
}

function subscriptionReducer(state, action) {
    switch (action.type) {
        case 'toggle':
            if (state.pending) return state;
            return { subscribed: action.subscribed, previous: state.subscribed, pending: true, error: '' };
        case 'saved':
            if (!state.pending) return state;
            return subscriptionState(action.subscribed);
        case 'failed':
            if (!state.pending) return state;
            return { ...subscriptionState(state.previous), error: action.error };
        default:
            return state;
    }
}

module.exports = { subscriptionState, subscriptionReducer };
