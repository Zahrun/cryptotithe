import { getCSVData } from '../../';
import { EXCHANGES, IImport, IPartialTrade, ITrade } from '../../../types';
import { createDateAsUTC, createID } from '../../utils';

enum LiquidOrderDirection {
    PAY = 'PAY',
    RECEIVE = 'RECEIVE',
}

interface ILiquid {
    exchange: string;
    currency_type: string;
    direction: string;
    transaction_id: string;
    transaction_type: string;
    gross_amount: string;
    currency: string;
    execution_id: string;
    generated_for_type: string;
    generated_for_id: string;
    transaction_hash: string;
    from_address: string;
    to_address: string;
    state: string;
    created_at_jst: string;
    updated_at_jst: string;
    created_at_utc: string;
    updated_at: string;
    notes: string;
    used_id: string;
    account_id: string;
}

export default async function processData(importDetails: IImport): Promise<ITrade[]> {
    const data: ILiquid[] = await getCSVData(importDetails.data) as ILiquid[];
    const internalFormat: ITrade[] = [];
    if (data.length < 1) {
        return internalFormat;
    }
    let splitTrade = data[0];
    let lineContinuity = 0;
    for (const trade of data) {
        const tradeToAdd: IPartialTrade = {
            date : createDateAsUTC(new Date(trade.updated_at)).getTime(),
            exchange : EXCHANGES.Liquid,
            exchangeID : trade.execution_id,
        };
        switch (trade.transaction_type) {
            case 'rebate_trade_fee':
            case 'trade_fee':
            case 'quick_exchange':
            case 'trade': {
                switch (lineContinuity) {
                    case 0: {
                        splitTrade = trade;
                        lineContinuity = 1;
                        continue;
                    }
                    case 1: {
                        lineContinuity = 0;
                        if (trade.directiontoUpperCase() === LiquidOrderDirection.PAY && splitTrade.direction === LiquidOrderDirection.RECEIVE) {
                            tradeToAdd.boughtCurrency = splitTrade.currency;
                            tradeToAdd.soldCurrency = trade.currency;
                            tradeToAdd.amountSold = Math.abs(parseFloat(trade.gross_amount));
                            tradeToAdd.rate = Math.abs(parseFloat(trade.gross_amount) / parseFloat(splitTrade.gross_amount));
                        } else if (trade.direction === LiquidOrderDirection.RECEIVE && splitTrade.direction === LiquidOrderDirection.PAY) {
                            tradeToAdd.soldCurrency = splitTrade.currency;
                            tradeToAdd.boughtCurrency = trade.currency;
                            tradeToAdd.amountSold = Math.abs(parseFloat(splitTrade.gross_amount));
                            tradeToAdd.rate = Math.abs(parseFloat(splitTrade.gross_amount) / parseFloat(trade.gross_amount));
                        } else {
                            console.error(`Error parsing ${trade.exchange} trade splitTrade.direction=${splitTrade.direction} and trade.direction=${trade.direction}`);
                            break;
                        }
                        tradeToAdd.ID = createID(tradeToAdd);
                        internalFormat.push(tradeToAdd as ITrade);
                        continue;
                    }
                    default: {
                        console.error(`Error parsing ${trade.exchange} trade lineContinuity=${lineContinuity}`);
                        break;
                    }
                }
                break;
            }
            default: {
                console.log(`Ignored ${trade.exchange} trade of type ${trade.transaction_type}`);
                continue;
            }
        }
    }
    return internalFormat;
}
