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

interface IGateIOGroup {
    [key: string]: IGateIO[];
}

function groupByOrderID(group: IGateIOGroup, line: IGateIO) {
    group[line['Order id']] = group[line['Order id']] ?? [];
    group[line['Order id']].push(line);
    return group;
}

export default async function processData(importDetails: IImport): Promise<ITrade[]> {
    const data: IGateIO[] = await getCSVData(importDetails.data) as IGateIO[];
    const internalFormat: ITrade[] = [];
    const grouped = data.reduce(groupByOrderID, {});
    for (const order in grouped) {
        const trades = grouped[order];
        const tradeToAdd: IPartialTrade = {
            date : createDateAsUTC(new Date(trades[0].Time)).getTime(),
            exchangeID : order,
            exchange : EXCHANGES.GateIO,
        };
        switch (trades[0]['Action type']) {
            case 'Trading Fees': {
                if (trades[1]['Action type'] !== 'Order Filled' || trades[2]['Action type'] !== 'Order Placed') {
                        console.error(`Error parsing ${tradeToAdd.exchange} trade
                            trades[1]['Action type'] = ${trades[1]['Action type']}
                            trades[2]['Action type'] = ${trades[2]['Action type']}`);
                }
                tradeToAdd.boughtCurrency = trades[1].Currency;
                tradeToAdd.soldCurrency = trades[2].Currency;
                tradeToAdd.amountSold = Math.abs(parseFloat(trades[2]['Change amount']));
                tradeToAdd.rate = Math.abs(parseFloat(trades[2]['Change amount']) / parseFloat(trades[1]['Change amount']));
                tradeToAdd.transactionFeeCurrency = trades[0].Currency;
                tradeToAdd.transactionFee = Math.abs(parseFloat(trades[0]['Change amount']));
                break;
            }
            case 'Points Purchase': {
                if (trades[1]['Action type'] !== 'Points Purchase') {
                        console.error(`Error parsing ${tradeToAdd.exchange} points purchase
                            trades[1]['Action type'] = ${trades[1]['Action type']}`);
                }
                tradeToAdd.boughtCurrency = trades[0].Currency;
                tradeToAdd.soldCurrency = trades[1].Currency;
                tradeToAdd.amountSold = Math.abs(parseFloat(trades[1]['Change amount']));
                tradeToAdd.rate = Math.abs(parseFloat(trades[1]['Change amount']) /
                parseFloat(trades[0]['Change amount']));
                break;
            }
            // TODO: Deposits, Airdrop, Withdrawals, Points With Expiration, Quant- Transferred In, Quant- Transferred Out
            default: {
                console.log(`Ignored Gate.io trade of type ${trades[0]['Action type']}`);
                continue;
            }
        }
        tradeToAdd.ID = createID(tradeToAdd);
        internalFormat.push(tradeToAdd as ITrade);
    }
    return internalFormat;
}
