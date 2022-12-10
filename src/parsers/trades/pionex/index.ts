import { getCSVData } from '../../';
import { EXCHANGES, IImport, IPartialTrade, ITrade } from '../../../types';
import { createDateAsUTC, createID } from '../../utils';

interface IPionex {
    'date(UTC+0)': string;
    amount: string;
    price: string;
    order_price: string;
    side: string;
    symbol: string;
    state: string;
    fee: string;
    strategy_type: string;
}

export async function pionexParser(importDetails: IImport): Promise<ITrade[]> {
    const data: IPionex[] = await getCSVData(importDetails.data) as IPionex[];
    const internalFormat: ITrade[] = [];
    for (const trade of data) {
        const tradeToAdd: IPartialTrade = {};
        tradeToAdd.date = createDateAsUTC(new Date(trade['date(UTC+0)'])).getTime();
        tradeToAdd.exchange = EXCHANGES.Pionex;
        if (trade.side === 'BUY') {
            tradeToAdd.boughtCurrency = trade.symbol.substr(0,trade.symbol.lastIndexOf('_'));
            tradeToAdd.soldCurrency = trade.symbol.substr(trade.symbol.lastIndexOf('_') + 1);
            tradeToAdd.amountSold = parseFloat(trade.amount);
            tradeToAdd.rate = parseFloat(trade.price);
        } else if (trade.side === 'SELL') {
            tradeToAdd.soldCurrency = trade.symbol.substr(0,trade.symbol.lastIndexOf('_'));
            tradeToAdd.boughtCurrency = trade.symbol.substr(trade.symbol.lastIndexOf('_') + 1);
            tradeToAdd.amountSold = parseFloat(trade.amount) / parseFloat(trade.price);
            tradeToAdd.rate = 1 / parseFloat(trade.price);
        } else {
            console.error('Trade side unknown');
            continue;
        }
        tradeToAdd.ID = createID(tradeToAdd);
        tradeToAdd.exchangeID = tradeToAdd.ID;
        tradeToAdd.transactionFeeCurrency = tradeToAdd.boughtCurrency;
        tradeToAdd.transactionFee = parseFloat(trade.fee);
        internalFormat.push(tradeToAdd as ITrade);
    }
    return internalFormat;
}


interface IPionexDust {
    'date(UTC+0)': string;
    amount: string;
    coin: string;
    price: string;
    swap_value: string;
}

export async function pionexDustParser(importDetails: IImport): Promise<ITrade[]> {
    const data: IPionexDust[] = await getCSVData(importDetails.data) as IPionexDust[];
    const internalFormat: ITrade[] = [];
    for (const trade of data) {
        const tradeToAdd: IPartialTrade = {};
        tradeToAdd.date = createDateAsUTC(new Date(trade['date(UTC+0)'])).getTime();
        tradeToAdd.exchange = EXCHANGES['Pionex dust collector'];
        tradeToAdd.boughtCurrency = 'USDT';
        tradeToAdd.soldCurrency = trade.coin;
        tradeToAdd.amountSold = parseFloat(trade.amount);
        tradeToAdd.rate = 1 / parseFloat(trade.price);
        tradeToAdd.ID = createID(tradeToAdd);
        tradeToAdd.exchangeID = tradeToAdd.ID;
        tradeToAdd.transactionFeeCurrency = tradeToAdd.boughtCurrency;
        tradeToAdd.transactionFee = 0;
        internalFormat.push(tradeToAdd as ITrade);
    }
    return internalFormat;
}
