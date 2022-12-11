import { getCSVData } from '../../';
import { EXCHANGES, IImport, IPartialTrade, ITrade } from '../../../types';
import { createID } from '../../utils';

interface ICoinList {
    Date: string;
    Description: string;
    Asset: string;
    Amount: string;
    Balance: string;
}

export default async function processData(importDetails: IImport): Promise<ITrade[]> {
    const data: ICoinList[] = await getCSVData(importDetails.data) as ICoinList[];
    const internalFormat: ITrade[] = [];
    if (data.length < 1) {
        return internalFormat;
    }
    let splitTrade = data[0];
    let lineContinuity = 0;
    for (const trade of data) {
        console.log(trade);
        const tradeToAdd: IPartialTrade = {
            date : new Date(trade.Date).getTime(),
            exchange : EXCHANGES.CoinList,
        };
        let descriptionSplit = trade.Description.split(' ');
        let type = descriptionSplit[0];
        if (type === 'Sold' || type === 'Bought') {
            switch (lineContinuity) {
                case 0: {
                    splitTrade = trade;
                    lineContinuity = 1;
                    continue;
                }
                case 1: {
                    lineContinuity = 0;
                    tradeToAdd.boughtCurrency = splitTrade.Asset;
                    tradeToAdd.soldCurrency = trade.Asset;
                    tradeToAdd.amountSold = Math.abs(parseFloat(trade.Amount));
                    tradeToAdd.rate = Math.abs(parseFloat(trade.Amount) / parseFloat(splitTrade.Amount));
                    tradeToAdd.ID = createID(tradeToAdd);
                    internalFormat.push(tradeToAdd as ITrade);
                    continue;
                }
                default: {
                    console.error(`Error parsing CoinList trade lineContinuity=${lineContinuity}`);
                    break;
                }
            }
            break;
        } else {
            console.log(`Ignored CoinList trade of type ${type}`);
            continue;
        }
    }
    return internalFormat;
}
