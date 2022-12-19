import { getCSVData } from '../../';
import { EXCHANGES, IImport, IPartialTrade, ITrade } from '../../../types';
import { createDateAsUTC, createID } from '../../utils';
import clone from "clone";

interface IBinance2 {
    User_ID: string;
    UTC_Time: string;
    Account: string;
    Operation: string;
    Coin: string;
    Change: string;
    Remark: string;
}

interface IBinance2Group {
    [key: string]: IBinance2[];
}

function groupByTime(group: IBinance2Group, line: IBinance2) {
    group[line.UTC_Time] = group[line.UTC_Time] ?? [];
    group[line.UTC_Time].push(line);
    return group;
}

function groupByOperation(group: IBinance2Group, line: IBinance2) {
    group[line.Operation] = group[line.Operation] ?? [];
    group[line.Operation].push(line);
    return group;
}

function groupBySign(group: IBinance2Group, line: IBinance2) {
    const sign = (parseFloat(line.Change) > 0).toString();
    group[sign] = group[sign] ?? [];
    group[sign].push(line);
    return group;
}

export default async function processData(importDetails: IImport): Promise<ITrade[]> {
    const data: IBinance2[] = await getCSVData(importDetails.data) as IBinance2[];
    const internalFormat: ITrade[] = [];
    const grouped = data.reduce(groupByTime, {});
    let oneLineTrade: IBinance2 | undefined;
    for (const time in grouped) {
        let trades = grouped[time];
        const tradeToAdd: IPartialTrade = {
            date : createDateAsUTC(new Date(trades[0].UTC_Time)).getTime(),
            exchange : EXCHANGES.Binance2,
        };
        switch (trades[0].Operation) {
            case 'ETH 2.0 Staking':
            case 'Large OTC trading':
            case 'Broker Withdraw': {
                if (trades.length === 1 && oneLineTrade === undefined) {
                    oneLineTrade = trades[0];
                    continue;
                } else if (trades.length === 1 && oneLineTrade !== undefined) {
                    trades = trades.concat(oneLineTrade);
                }
                oneLineTrade = undefined;
                if (trades.length === 2) {
                    internalFormat.push(addTrade(tradeToAdd, trades[0], trades[1]));
                } else {
                    console.error(`Error parsing ${tradeToAdd.exchange} trade.
Wrong number of lines ${trades.length}`);
                }
                break;
            }
            case 'Small assets exchange BNB': {
                continue;
                const groupedTrades = trades.reduce(groupBySign, {});
                for (const trade of trades) {
                    if (trade.Operation !== 'Small assets exchange BNB') {
                        console.warn(`Among ${tradeToAdd.exchange} trades dated ${trades[0].UTC_Time}, \
line of type ${trade.Operation} was ignored`);
                        continue;
                    }
                }
                if (groupedTrades.true.length !== groupedTrades.false.length) {
                    console.warn(`In ${tradeToAdd.exchange} trades dated ${trades[0].UTC_Time}, \
not all groups have the same size.`);
                }
                for (let i = 0; i < groupedTrades.true.length; i++) {
                    const positiveTrade = groupedTrades.true[i];
                    const negativeTrade = groupedTrades.false[i];
                    internalFormat.push(addTrade(tradeToAdd, positiveTrade, negativeTrade));
                }
                break;
            }
            case 'Fee':
            case 'Buy':
            case 'Transaction Related': {
                continue;
                if (trades.length === 1 && oneLineTrade === undefined) {
                    oneLineTrade = trades[0];
                    continue;
                } else if (trades.length === 1 && oneLineTrade !== undefined) {
                    trades = trades.concat(oneLineTrade);
                }
                oneLineTrade = undefined;
                const groupedTrades = trades.reduce(groupByOperation, {});
                const keys = Object.keys(groupedTrades);
                const possibleKeys = ['Buy', 'Fee', 'Transaction Related'];
                let lengths: number[] = [];
                for (const key in groupedTrades) {
                    if (! possibleKeys.includes(key)) {
                        console.warn(`Among ${tradeToAdd.exchange} trades dated ${trades[0].UTC_Time}, \
lines of type ${key} were ignored`);
                        continue;
                    }
                    if (key !== 'Fee') {
                        lengths = lengths.concat(groupedTrades[key].length);
                    }
                }
                if (new Set(lengths).size > 1) {
                    console.warn(`In ${tradeToAdd.exchange} trades dated ${trades[0].UTC_Time}, \
not all groups have the same size.`);
                }
                if (keys.includes('Buy') && keys.includes('Fee') && keys.includes('Transaction Related')) {
                    for (let i = 0; i < groupedTrades.Buy.length; i++) {
                        const buyTrade = groupedTrades.Buy[i];
                        const transactionTrade = groupedTrades['Transaction Related'][i];
                        const feeTrade = groupedTrades.Fee[i];
                        internalFormat.push(addTrade(tradeToAdd, buyTrade, transactionTrade, feeTrade));
                    }
                } else if (keys.includes('Buy') && keys.includes('Transaction Related')) {
                    for (let i = 0; i < groupedTrades.Buy.length; i++) {
                        const buyTrade = groupedTrades.Buy[i];
                        const transactionTrade = groupedTrades['Transaction Related'][i];
                        internalFormat.push(addTrade(tradeToAdd, buyTrade, transactionTrade));
                    }
                } else if (keys.includes('Transaction Related')) {
                    for (let i = 0; i < groupedTrades['Transaction Related'].length; i++) {
                        const transactionTrade = groupedTrades['Transaction Related'][i];
                        const transactionTrade2 = groupedTrades['Transaction Related'][++i];
                        internalFormat.push(addTrade(tradeToAdd, transactionTrade, transactionTrade2));
                    }
                } else {
                    console.error(`Error parsing ${tradeToAdd.exchange} trade.
Wrong transaction types ${Object.keys(groupedTrades)}`);
                }
                break;
            }
            // TODO: Deposit, Withdraw, Distribution, ETH 2.0 Staking, ETH 2.0 Staking Rewards,
            // Launchpool Interest, P2P Trading, Savings distribution, Simple Earn Flexible Interest,
            // Simple Earn Flexible Redemption, Simple Earn Flexible Subscription
            default: {
                console.log(`Ignored ${tradeToAdd.exchange} trade operantion ${trades[0].Operation}`);
            }
        }
    }
    return internalFormat;
}

function addTrade(
    tradeToAdd: IPartialTrade,
    firstHalf: IBinance2,
    secondHalf: IBinance2,
    feeTrade?: IBinance2,
): ITrade {
    const newTradeToAdd: IPartialTrade = clone(tradeToAdd);
    const firstHalfDirection = parseFloat(firstHalf.Change) > 0;
    const secondHalfDirection = parseFloat(secondHalf.Change) > 0;
    if (firstHalfDirection && !secondHalfDirection) {
        newTradeToAdd.boughtCurrency = firstHalf.Coin;
        newTradeToAdd.soldCurrency = secondHalf.Coin;
        newTradeToAdd.amountSold = Math.abs(parseFloat(secondHalf.Change));
        newTradeToAdd.rate = Math.abs(parseFloat(secondHalf.Change) / parseFloat(firstHalf.Change));
    } else if (!firstHalfDirection && secondHalfDirection) {
        newTradeToAdd.soldCurrency = firstHalf.Coin;
        newTradeToAdd.boughtCurrency = secondHalf.Coin;
        newTradeToAdd.amountSold = Math.abs(parseFloat(firstHalf.Change));
        newTradeToAdd.rate = Math.abs(parseFloat(firstHalf.Change) / parseFloat(secondHalf.Change));
    } else {
        console.info(firstHalf);
        console.info(secondHalf);
        throw new Error(`Error parsing ${newTradeToAdd.exchange} firstHalf.direction=${firstHalfDirection}
            and secondHalf.direction=${secondHalfDirection}`);
    }
    if (feeTrade !== undefined) {
        newTradeToAdd.tradeFee = Math.abs(parseFloat(feeTrade.Change));
        newTradeToAdd.tradeFeeCurrency = feeTrade.Coin;
    }
    newTradeToAdd.ID = createID(newTradeToAdd);
    newTradeToAdd.exchangeID = newTradeToAdd.ID;
    return newTradeToAdd as ITrade;
}
