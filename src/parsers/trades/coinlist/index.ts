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
    for (let i = 0; i < data.length; i++) {
        const trade = data[i];
        const tradeToAdd: IPartialTrade = {
            date : new Date(trade.Date).getTime(),
            exchange : EXCHANGES.CoinList,
        };
        let descriptionSplit = trade.Description.split(' ');
        let type = descriptionSplit[0];
        switch (type) {
            case 'Sold':
            case 'Bought': {
                i++;
                tradeToAdd.boughtCurrency = trade.Asset;
                tradeToAdd.soldCurrency = data[i].Asset;
                tradeToAdd.amountSold = Math.abs(parseFloat(data[i].Amount));
                tradeToAdd.rate = Math.abs(parseFloat(data[i].Amount) / parseFloat(trade.Amount));
                tradeToAdd.ID = createID(tradeToAdd);
                internalFormat.push(tradeToAdd as ITrade);
                continue;
            }
            // TODO: Withdrawal, Distribution, Deposit, Hold
            default: {
                console.log(`Ignored CoinList trade of type ${type}`);
                break;
            }
        }
    }
    return internalFormat;
}
