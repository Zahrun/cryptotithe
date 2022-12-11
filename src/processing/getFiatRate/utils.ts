import { AxiosResponse } from 'axios';
import { ITrade } from '../../types';
import { getDayAvg } from './getDayAvgCurrencyRate';

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function cryptocompareRateResponse(
    response: AxiosResponse,
    fiatCurrency: string,
    currency: string,
    date: number,
    type = 'HourVWAP',) {
    if ('data' in response) {
        try {
            const result = response.data;
            if ('RateLimit' in result && 'max_calls' in result.RateLimit) {
                    console.warn('Rate limit exceeded, retrying...');
                    await sleep(300);
                    return getDayAvg(fiatCurrency, currency, date, type);
            } else if (result[fiatCurrency] !== 0) {
                return result[fiatCurrency];
            } else {
                return false;
            }
        } catch (ex) {
            throw new Error('Error parsing JSON');
        }
    } else {
        throw new Error('Invalid Response');
    }
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
