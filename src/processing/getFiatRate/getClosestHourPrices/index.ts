import * as got from 'got';
import { ITrade } from '../../../types';
import { roundHour, IHourlyPriceData } from '../utils';

export async function getClosestHourPrices(trade: ITrade, limit: number, fiatCurrency: string): Promise<IHourlyPriceData> {
    const tradeTime = parseInt((roundHour(new Date(trade.date)) / 1000).toFixed(0), 10);
    const data = [
        `fsym=${trade.soldCurrency}`,
        `tsym=${fiatCurrency}`,
        `limit=${limit}`,
        `toTs=${tradeTime}`,
    ];
    const response: got.Response<any> = await got(
        'https://min-api.cryptocompare.com/data/histohour?' + data.join('&'),
    );
    if ('body' in response) {
        try {
            const result: any = JSON.parse(response.body);
            if ('Data' in result) {
                for (const hourData of result.Data as IHourlyPriceData[]) {
                    if (hourData.time <= tradeTime && tradeTime >= hourData.time + 3600) {
                        return hourData;
                    }
                }
            }
            throw new Error('Unknown Response Type');
        } catch (ex) {
            throw new Error('Error parsing JSON');
        }
    } else {
        throw new Error('Invalid Response');
    }
}