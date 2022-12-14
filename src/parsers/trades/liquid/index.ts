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

function groupByExecutionID(group: any, line: any) {
    group[line.execution_id] = group[line.execution_id] ?? [];
    group[line.execution_id].push(line);
    return group;
}

export default async function processData(importDetails: IImport): Promise<ITrade[]> {
    const data: ILiquid[] = await getCSVData(importDetails.data) as ILiquid[];
    const internalFormat: ITrade[] = [];
    const sorted = data.reduce(groupByExecutionID, {});
    for (const execution of Object.keys(sorted)) {
        const trades = sorted[execution];
        const tradeToAdd: IPartialTrade = {
            date : createDateAsUTC(new Date(trades[0].updated_at)).getTime(),
            exchange : EXCHANGES.Liquid,
            exchangeID : execution,
        };
        if (execution === '') {
            for (const line of trades){
                console.log(`Ignored ${tradeToAdd.exchange} trade of type ${line.transaction_type}`);
                continue;
            }
        }
        switch (trades[0].transaction_type) {
            case 'trade': {
                switch (trades.length) {
                    case 1: {
                        internalFormat.push(addSingleLineTrade(tradeToAdd, trades[0]));
                        break;
                    }
                    case 2: {
                        internalFormat.push(addTrade(tradeToAdd, trades[0], trades[1]));
                        break;
                    }
                    case 3: {
                        let feeTrade = tradeToAdd;
                        internalFormat.push(addTrade(tradeToAdd, trades[0], trades[1]));
                        internalFormat.push(addFeeTrade(feeTrade, trades[2]));
                        break;
                    }
                    case 4: {
                        let feeTrade = tradeToAdd;
                        internalFormat.push(addTrade(tradeToAdd, trades[0], trades[1]));
                        internalFormat.push(addFeeTrade(feeTrade, trades[2], trades[3]));
                        break;
                    }
                    case 6: {
                        internalFormat.push(addFeeTrade(tradeToAdd, trades[4], trades[5]));
                        break;
                    }
                    case 8: {
                        let secondTrade = tradeToAdd;
                        internalFormat.push(addFeeTrade(tradeToAdd, trades[4], trades[5]));
                        internalFormat.push(addFeeTrade(secondTrade, trades[6], trades[7]));
                        break;
                    }
                    default: {
                        console.warn(`Error parsing ${tradeToAdd.exchange} trade. It extends over ${trades.length} lines`);
                        console.info(trades);
                    }
                }
                break;
            }
            case 'rebate_trade_fee':
            case 'trade_fee': {
                console.error(`Error parsing ${tradeToAdd.exchange} trade. First line should not be of type ${trades[0].transaction_type}`);
                break;
            }
            default: {
                console.log(`Ignored ${tradeToAdd.exchange} trade of type ${trades[0].transaction_type}`);
            }
        }
    }
    return internalFormat;
}

function addSingleLineTrade(
    tradeToAdd: IPartialTrade,
    trade: ILiquid,
) : ITrade {
    if (trade.direction.toUpperCase() === LiquidOrderDirection.PAY) {
        tradeToAdd.boughtCurrency = 'USDT';
        tradeToAdd.soldCurrency = trade.currency;
        tradeToAdd.amountSold = parseFloat(trade.gross_amount);
        tradeToAdd.rate = parseFloat(trade.gross_amount) / 0;
    } else if (trade.direction.toUpperCase() === LiquidOrderDirection.RECEIVE) {
        tradeToAdd.soldCurrency = 'USDT';
        tradeToAdd.boughtCurrency = trade.currency;
        tradeToAdd.amountSold = 0;
        tradeToAdd.rate = 0 / parseFloat(trade.gross_amount);
        // This case here above does not work. We cannot, with current structure, create a trade with nothing sold but something bought. It should be an income (airdrop). Should we process the incomes here with the trades or import the same file again as income data file?
    }
    else {
        console.info(trade);
        throw new Error(`Error parsing ${tradeToAdd.exchange} trade.direction=${trade.direction}`);
    }
    tradeToAdd.ID = createID(tradeToAdd);
    return tradeToAdd as ITrade;
}

function addFeeTrade(
    tradeToAdd: IPartialTrade,
    feeTrade: ILiquid,
    rebateFeeTrade?: ILiquid,
) : ITrade {
    let amount = parseFloat(feeTrade.gross_amount);
    if (rebateFeeTrade !== undefined) {
        amount -= parseFloat(rebateFeeTrade.gross_amount);
    }
    tradeToAdd.boughtCurrency = 'USDT';
    tradeToAdd.soldCurrency = feeTrade.currency;
    tradeToAdd.amountSold = amount;
    tradeToAdd.rate = amount / 0;
    tradeToAdd.ID = createID(tradeToAdd);
    return tradeToAdd as ITrade;
}

function addTrade(
    tradeToAdd: IPartialTrade,
    firstHalf: ILiquid,
    secondHalf: ILiquid,
): ITrade {
    let firstHalfDirection = firstHalf.direction.toUpperCase();
    let secondHalfDirection = secondHalf.direction.toUpperCase();
    if (firstHalfDirection === LiquidOrderDirection.PAY && secondHalfDirection === LiquidOrderDirection.RECEIVE) {
        tradeToAdd.boughtCurrency = secondHalf.currency;
        tradeToAdd.soldCurrency = firstHalf.currency;
        tradeToAdd.amountSold = Math.abs(parseFloat(firstHalf.gross_amount));
        tradeToAdd.rate = Math.abs(parseFloat(firstHalf.gross_amount) / parseFloat(secondHalf.gross_amount));
    } else if (firstHalfDirection === LiquidOrderDirection.RECEIVE && secondHalfDirection === LiquidOrderDirection.PAY) {
        tradeToAdd.soldCurrency = secondHalf.currency;
        tradeToAdd.boughtCurrency = firstHalf.currency;
        tradeToAdd.amountSold = Math.abs(parseFloat(secondHalf.gross_amount));
        tradeToAdd.rate = Math.abs(parseFloat(secondHalf.gross_amount) / parseFloat(firstHalf.gross_amount));
    } else {
        console.info(firstHalf);
        console.info(secondHalf);
        throw new Error(`Error parsing ${tradeToAdd.exchange} firstHalf.direction=${firstHalf.direction} and secondHalf.direction=${secondHalf.direction}`);
    }
    tradeToAdd.ID = createID(tradeToAdd);
    return tradeToAdd as ITrade;
}
