import axios from 'axios';
import { ITrade } from '../../../types';
import { waitForRateLimit, RateLimitError } from '../utils';

export async function getDayAvg(
    fiatCurrency: string,
    currency: string,
    date: number,
    type = 'HourVWAP',
): Promise<number> {
    const tradeTime = parseInt((new Date(date).getTime() / 1000).toFixed(0), 10);
    const response = await axios('https://min-api.cryptocompare.com/data/dayAvg', {
        params: {
            fsym: currency,
            tsym: fiatCurrency,
            sign: false,
            toTs: tradeTime,
            extraParams: 'cryptotithe',
            avgType: type,
        }
    });
    let rate = 0;
    if ('data' in response) {
        try {
            const result = response.data;
            if ('RateLimit' in result && 'max_calls' in result.RateLimit) {
                    await waitForRateLimit(result.RateLimit);
                    getDayAvg(fiatCurrency, currency, date, type).then(
                        function(value) {
                            rate = value;
                        },
                    ).catch(e => console.log('Error: ', e));
            } else if (result[fiatCurrency] !== 0) {
                rate = result[fiatCurrency];
            }
        } catch (ex) {
            if (ex instanceof RateLimitError) {
                throw ex;
            }
            throw new Error('Error parsing JSON');
        }
    } else {
        throw new Error('Invalid Response');
    }
    return rate;
}

export async function getDayAvgTradeRate(
    trade: ITrade,
    fiatCurrency: string,
    type = 'HourVWAP',
): Promise<number> {
    const rate = getDayAvg(fiatCurrency, trade.soldCurrency, trade.date, type);
    if (rate) {
        return rate;
    } else {
        const backupRate = getDayAvg(fiatCurrency, trade.boughtCurrency, trade.date, type);
        if (backupRate) {
            return backupRate;
        } else {
            throw new Error('Cant get any fiat Rate for trade ' + trade.ID);
        }
    }
}
