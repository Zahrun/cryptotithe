import { FiatRateMethod, ICurrencyHolding, IPartialSavedData, ITradeWithFiatRate } from '../../types';

export default function converter(savedData: IPartialSavedData): boolean {
    let changeMade = false;
    if (savedData.trades !== undefined && savedData.trades.length && 'USDRate' in savedData.trades[0]) {
        changeMade = true;
        for (const trade of savedData.trades) {
            const oldFormatTrade = trade as IOldTrade;
            trade.fiatRate = oldFormatTrade.USDRate;
            delete (oldFormatTrade as Partial<IOldTrade>).USDRate;
        }
    }

    if (savedData.holdings !== undefined && Object.keys(savedData.holdings).length) {
        const keys = Object.keys(savedData.holdings);
        if ('rateInUSD' in savedData.holdings[keys[0]][0]) {
            changeMade = true;
            for (const currency of keys) {
                for (const holding of savedData.holdings[currency]) {
                    const oldFormatHolding = holding as IOldHoldings;
                    holding.rateInFiat = oldFormatHolding.rateInUSD;
                    delete (oldFormatHolding as Partial<IOldHoldings>).rateInUSD;
                }
            }
        }
    }

    if ('settings' in savedData === false || savedData.settings === undefined) {
        savedData.settings = {};
    }

    if ('fiatCurrency' in savedData === false) {
        savedData.settings.fiatCurrency = 'USD';
    }

    if ('fiatRateMethod' in savedData === false) {
        // eslint-disable-next-line
        // @ts-ignore
        savedData.settings.fiatRateMethod = Object.keys(FiatRateMethod)[0] as keyof typeof FiatRateMethod;
    }

    return changeMade;
}

interface IOldTrade extends ITradeWithFiatRate {
    USDRate: number;
}

interface IOldHoldings extends ICurrencyHolding {
    rateInUSD: number;
}
