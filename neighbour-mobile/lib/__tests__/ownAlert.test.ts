import {pinAutoSubmits, routeForAlert, splitLiveAlerts} from '@/features/alerts';

const mine = {id: 10, sender_id: 1};
const theirs = {id: 11, sender_id: 2};

describe('a sender never sees their own live alert as a neighbour\'s', () => {
    test('splitLiveAlerts puts my alert aside and keeps the others in order', () => {
        expect(splitLiveAlerts([theirs, mine], 1)).toEqual({mine, others: [theirs]});
        expect(splitLiveAlerts([theirs, mine], 2)).toEqual({mine: theirs, others: [mine]});
        expect(splitLiveAlerts([theirs, mine], null)).toEqual({mine: null, others: [theirs, mine]});
    });

    test('tapping my own alert opens my live screen; a neighbour\'s opens the alarm', () => {
        expect(routeForAlert(mine, 1)).toBe('/sos/live?id=10');
        expect(routeForAlert(theirs, 1)).toBe('/alert/11');
        expect(routeForAlert(mine, undefined)).toBe('/alert/10');
    });
});

describe('the safety PIN sheet', () => {
    test('a complete 4-digit PIN submits itself, anything else waits for the button', () => {
        expect(pinAutoSubmits('1234', true)).toBe(true);
        expect(pinAutoSubmits('123', true)).toBe(false);
        expect(pinAutoSubmits('12345', true)).toBe(false);
        expect(pinAutoSubmits('1234', false)).toBe(false);
    });
});
