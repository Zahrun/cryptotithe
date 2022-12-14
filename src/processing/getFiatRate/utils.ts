import { ITrade } from '../../types';

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

export function sleep(ms: number, limit: string) {
    if (['hour', 'day', 'month'].includes(limit)) {
        throw new RateLimitError(`Rate limit exceeded for the ${limit}, would have to wait for the start of next ${limit}.\nPlease consider using an api key for cryptocompare.`);
    }
    console.warn(`Rate limit exceeded for the ${limit}, retrying at the start of next ${limit}, in ${ms} ms...`);
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function waitForRateLimit(rateLimit: any) {
    let now = new Date();
    let ms = 1000 - now.getMilliseconds();
    if (rateLimit.calls_made.second > rateLimit.max_calls.second) {
        return sleep (ms, 'second');
    }
    ms += (60 - now.getSeconds() - 1) * 1000;
    if (rateLimit.calls_made.minute > rateLimit.max_calls.minute) {
        return sleep (ms, 'minute');
    }
    ms += (60 - now.getMinutes() - 1) * 60 * 1000;
    if (rateLimit.calls_made.hour > rateLimit.max_calls.hour) {
        return sleep (ms, 'hour');
    }
    ms += (24 - now.getHours() - 1) * 60 * 60 * 1000;
    if (rateLimit.calls_made.day > rateLimit.max_calls.day) {
        return sleep (ms, 'day');
    }
    let numberOfDaysInTheMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    ms += (numberOfDaysInTheMonth - now.getDate() - 1) * 24 * 60 * 60 * 1000;
    if (rateLimit.calls_made.month > rateLimit.max_calls.month) {
        return sleep (ms, 'month');
    }
    return sleep (300, 'unknown');
}

export function roundHour(date: Date) {
    date.setUTCHours(date.getUTCHours() + Math.round(date.getUTCMinutes() / 60));
    date.setUTCMinutes(0);
    date.setUTCSeconds(0);
    return date.getTime();
}

export function isCurrencyTrade(trade: ITrade, currency: string): boolean {
    if (trade.boughtCurrency === currency || trade.soldCurrency === currency) {
        return true;
    } else {
        return false;
    }
}

export interface IHourlyPriceData {
    time: number;
    high: number;
    low: number;
    open: number;
    volumeFrom: number;
    volumeto: number;
    close: number;
}

export function calculateAvgerageHourPrice(data: IHourlyPriceData) {
    return (data.open + data.close + data.high + data.low) / 4;
}

export function calculateAverageFromArray(avgs: number[]) {
    return avgs.reduce((accumulator, currentValue) => accumulator + currentValue) / avgs.length;
}
