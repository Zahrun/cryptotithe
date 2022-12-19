import { IImport, IIncome, IIncomeWithDuplicateProbability, ImportType, ISavedData, ITrade, ITradeWithDuplicateProbability, ITransaction, ITransactionWithDuplicateProbability } from '../../types';
import DuplicateTradeCheck from './DuplicateTradeCheck';
import DuplicateTransactionCheck from './DuplicateTransactionCheck';
import DuplicateIncomeCheck from './DuplicateIncomeCheck';

export type DuplicateDataTypes = Array<ITransactionWithDuplicateProbability | ITradeWithDuplicateProbability |IIncomeWithDuplicateProbability>

export default function duplicateCheck(importDetails: IImport, savedData: ISavedData, data: ITrade[] | ITransaction[] | IIncome[]): DuplicateDataTypes {
    switch (importDetails.type) {
        case ImportType.TRADES:
            return DuplicateTradeCheck(savedData.trades, data as ITrade[]);
        case ImportType.TRANSACTION:
            return DuplicateTransactionCheck(savedData.transactions, data as ITransaction[]);
        case ImportType.INCOME:
            return DuplicateIncomeCheck(savedData.incomes, data as IIncome[]);
        default:
            throw new Error(`Unknown Import Type - ${importDetails.type}`);
    }
}
