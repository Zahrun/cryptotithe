import axios from 'axios';
import { waitForRateLimit } from '../getFiatRate/utils';

export interface ICryptoComparePriceMultiFull {
    RAW: ICryptoCompareCurrencyPriceMultiFull;
    DISPLAY: ICryptoCompareCurrencyPriceMultiFull;
}

export interface ICryptoCompareCurrencyPriceMultiFull {
    [key: string]: {
        [key: string]: ICryptoComparePriceFull,
    };
}

export interface ICryptoComparePriceFull {
    TYPE: string;
    MARKET: string;
    FROMSYMBOL: string;
    TOSYMBOL: string;
    FLAGS: string;
    PRICE: number;
    LASTUPDATE: number;
    LASTVOLUME: number;
    LASTVOLUMETO: number;
    LASTTRADEID: string;
    VOLUMEDAY: number;
    VOLUMEDAYTO: number;
    VOLUME24HOUR: number;
    VOLUME24HOURTO: number;
    OPENDAY: number;
    HIGHDAY: number;
    LOWDAY: number;
    OPEN24HOUR: number;
    HIGH24HOUR: number;
    LOW24HOUR: number;
    LASTMARKET: string;
    CHANGE24HOUR: number;
    CHANGEPCT24HOUR: number;
    CHANGEDAY: number;
    CHANGEPCTDAY: number;
    SUPPLY: number;
    MKTCAP: number;
    TOTALVOLUME24H: number;
    TOTALVOLUME24HTO: number;
}

export default async function getCurrentRates(
    currencies: string[],
    fiatCurrency: string,
): Promise<ICryptoComparePriceMultiFull> {
    const response = await axios(`https://min-api.cryptocompare.com/data/pricemultifull`, {
        params: {
            tsyms: `BTC,${fiatCurrency}`,
            fsyms: currencies.join(','),
        }
    });

    try {
        if (response.status === 200) {
            const result = response.data;
            if ('RateLimit' in result && 'max_calls' in result.RateLimit) {
                await waitForRateLimit(result.RateLimit);
                return getCurrentRates(currencies, fiatCurrency);
            } else {
                return result;
            }
        } else {
            throw Error('Unknown Error');
        }
    } catch (ex) {
        if (typeof ex === 'string') {
            throw Error(ex);
        } else {
            throw Error('Unknown Error Occured');
        }
    }
}
