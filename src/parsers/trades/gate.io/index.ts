import { getCSVData } from '../../';
import { EXCHANGES, IImport, IPartialTrade, ITrade } from '../../../types';
import { createDateAsUTC, createID } from '../../utils';

interface IGateIO {
    No: string;
    'Account Type': string;
    Time: string;
    'Action type': string;
    Currency: string;
    'Order id': string;
    'Change amount': string;
    Amount: string;
    'Additional Info': string;
}

export default async function processData(importDetails: IImport): Promise<ITrade[]> {
    const data: IGateIO[] = await getCSVData(importDetails.data) as IGateIO[];
    const internalFormat: ITrade[] = [];
    if (data.length < 1) {
        return internalFormat;
    }
    let feeTrade = data[0];
    let filledTrade = data[0];
    let pointTrade = data[0];
    let lineContinuity = 0;
    for (const trade of data) {
        const tradeToAdd: IPartialTrade = {};
        tradeToAdd.date = createDateAsUTC(new Date(trade.Time)).getTime();
        tradeToAdd.exchange = EXCHANGES.GateIO;
        switch (trade['Action type']) {
            case 'Trading Fees': {
                lineContinuity = 1;
                feeTrade = trade;
                continue;
            }
            case 'Order Filled': {
                if (lineContinuity++ !== 1) {
                    console.error('Error parsing Gate.io trade lineContinuity++ !== 1 lineContinuity=${lineContinuity}');
                    lineContinuity = 0;
                    break;
                }
                filledTrade = trade;
                continue;
            }
            case 'Order Placed': {
                if (lineContinuity !== 2) {
                    console.error('Error parsing Gate.io trade lineContinuity !== 2 lineContinuity=${lineContinuity}');
                    lineContinuity = 0;
                    break;
                }
                lineContinuity = 0;
                tradeToAdd.boughtCurrency = filledTrade.Currency;
                tradeToAdd.soldCurrency = trade.Currency;
                tradeToAdd.amountSold = Math.abs(parseFloat(trade['Change amount']));
                tradeToAdd.rate = Math.abs(parseFloat(trade['Change amount']) / parseFloat(filledTrade['Change amount']));
                tradeToAdd.transactionFeeCurrency = feeTrade.Currency;
                tradeToAdd.transactionFee = Math.abs(parseFloat(feeTrade['Change amount']));
                break;
            }
            case 'Points Purchase': {
                switch (lineContinuity) {
                    case 0: {
                        pointTrade = trade;
                        lineContinuity = 1;
                        continue;
                    }
                    case 1: {
                        lineContinuity = 0;
                        tradeToAdd.boughtCurrency = pointTrade.Currency;
                        tradeToAdd.soldCurrency = trade.Currency;
                        tradeToAdd.amountSold = Math.abs(parseFloat(trade['Change amount']));
                        tradeToAdd.rate = Math.abs(parseFloat(trade['Change amount']) / parseFloat(pointTrade['Change amount']));
                        break;
                    }
                    default: {
                        console.error(`Error parsing Gate.io trade lineContinuity=${lineContinuity}`);
                        break;
                    }
                }
                break;
            }
            default: {
                console.log(`Ignored Gate.io trade of type ${trade['Action type']}`);
                continue;
            }
        }
        tradeToAdd.ID = createID(tradeToAdd);
        tradeToAdd.exchangeID = tradeToAdd.ID;
        internalFormat.push(tradeToAdd as ITrade);
    }
    return internalFormat;
}
