import clone from 'clone';
import {
    IHoldings,
    IIncomeWithFiatRate,
    ITradeWithCostBasis,
    ITradeWithFiatRate,
    ITradeWithGains,
    ITradeWithFrenchGain,
    METHOD,
} from '../../types';
import { processTrade, processTradeFrench } from '../ProcessTrade';
import { addToHoldings } from '../AddToHoldings';

export interface ICalculateGains {
    newHoldings: IHoldings;
    longTermGain: number;
    shortTermGain: number;
}

export function calculateGains(
    holdings: IHoldings,
    trades: ITradeWithFiatRate[],
    incomes: IIncomeWithFiatRate[],
    fiatCurrency: string,
    method: METHOD = METHOD.FIFO,
): ICalculateGains {
    let shortTermGain = 0;
    let longTermGain = 0;
    let newHoldings: IHoldings = holdings;
    const incomesToApply = clone(incomes);
    for (const trade of trades) {
        while (incomesToApply.length && trade.date > incomesToApply[0].date) {
            const income = incomesToApply[0];
            newHoldings = addToHoldings(newHoldings, income.currency, income.amount, income.fiatRate, income.date);
            incomesToApply.shift();
        }

        const result = processTrade(newHoldings, trade, fiatCurrency, method);
        shortTermGain += result.shortTermGain;
        longTermGain += result.longTermGain;
        newHoldings = result.holdings;
    }

    // apply any remaining incomes
    for (const income of incomesToApply) {
        newHoldings = addToHoldings(newHoldings, income.currency, income.amount, income.fiatRate, income.date);
    }

    return {
        newHoldings,
        longTermGain,
        shortTermGain,
    };
}

export interface ICalculateGainsFrench {
    newHoldings: IHoldings;
    allHoldingsValue: number;
    totalPurchasePrice: number;
}

export async function calculateGainsFrench(
    holdings: IHoldings,
    trades: ITradeWithFiatRate[],
    incomes: IIncomeWithFiatRate[],
    fiatCurrency: string,
    method: METHOD = METHOD.FIFO,
): Promise<ICalculateGainsFrench> {
    let newHoldings: IHoldings = holdings;
    let allHoldingsValue = 0;
    let totalPurchasePrice = 0;
    const incomesToApply = clone(incomes);
    for (const trade of trades) {
        while (incomesToApply.length && trade.date > incomesToApply[0].date) {
            const income = incomesToApply[0];
            newHoldings = addToHoldings(newHoldings, income.currency, income.amount, income.fiatRate, income.date);
            incomesToApply.shift();
        }

        if (trade.soldCurrency === fiatCurrency){
            totalPurchasePrice += trade.amountSold;
            if (trade.transactionFee && trade.transactionFeeCurrency === trade.soldCurrency) {
                totalPurchasePrice += trade.transactionFee;
            }
        }

        const result = await processTradeFrench(newHoldings, trade, fiatCurrency, method);
        newHoldings = result.holdings;
        allHoldingsValue = result.allHoldingsValue;
        totalPurchasePrice = totalPurchasePrice;
    }

    // apply any remaining incomes
    for (const income of incomesToApply) {
        newHoldings = addToHoldings(newHoldings, income.currency, income.amount, income.fiatRate, income.date);
    }

    return {
        newHoldings: newHoldings,
        allHoldingsValue: allHoldingsValue,
        totalPurchasePrice: totalPurchasePrice,
    };
}

export interface ICalculateGainsFrenchPerTrade {
    frenchTrades: ITradeWithFrenchGain[];
    gains: number;
    newHoldings: IHoldings;
}

export async function calculateGainsFrenchPerTrade(
    holdings: IHoldings,
    previousYearTrades: ITradeWithFrenchGain[],
    internalFormat: ITradeWithFiatRate[],
    incomes: IIncomeWithFiatRate[],
    fiatCurrency: string,
    method: METHOD,
): Promise<ICalculateGainsFrenchPerTrade> {
    let tempHoldings: IHoldings = clone(holdings);
    let totalPurchasePrice = 0;
    let initialCapitalRatio = 0;
    let gains = 0;
    let len = previousYearTrades.length
    if (len > 0) {
        totalPurchasePrice = previousYearTrades[len-1].totalPurchasePrice;
        initialCapitalRatio = previousYearTrades[len-1].initialCapitalRatio;
    }
    const frenchFormat: ITradeWithFrenchGain[] = [];
    const newIncomes = clone(incomes);
    for (const trade of internalFormat) {
        const incomesToUse: IIncomeWithFiatRate[] = []
        while (newIncomes.length && trade.date > newIncomes[0].date) {
            const income = newIncomes.shift() as IIncomeWithFiatRate;
            incomesToUse.push(income);
        }

        const result: ICalculateGainsFrench = await calculateGainsFrench(
            tempHoldings,
            [trade],
            incomesToUse,
            fiatCurrency,
            method,
        );

        tempHoldings = result.newHoldings;

        if (trade.soldCurrency === fiatCurrency){
            totalPurchasePrice += trade.amountSold;
            if (trade.transactionFee && trade.transactionFeeCurrency === trade.soldCurrency) {
                totalPurchasePrice += trade.transactionFee;
            }
        }
        let gain = 0;
        let prix = trade.amountSold / trade.rate;
        if (trade.boughtCurrency === fiatCurrency){
            gain = (prix - trade.transactionFee - 0) -
            (
                (totalPurchasePrice - initialCapitalRatio - 0) *
                (prix - 0) /
                result.allHoldingsValue
            )
            gains += Math.round(gain);
        }
        frenchFormat.push({
            ...trade,
            allHoldingsValue: result.allHoldingsValue,
            totalPurchasePrice: totalPurchasePrice,
            initialCapitalRatio: initialCapitalRatio,
            gain: gain,
        });
        if (trade.boughtCurrency === fiatCurrency){
            initialCapitalRatio +=
            (totalPurchasePrice - initialCapitalRatio - 0) *
            (prix - 0) /
            result.allHoldingsValue;
        }
    }


    const applyRemainingIncomes: ICalculateGains = calculateGains(
        tempHoldings,
        [],
        newIncomes,
        fiatCurrency,
        method
    );

    return {
        frenchTrades: frenchFormat,
        gains: gains,
        newHoldings: applyRemainingIncomes.newHoldings,
    };
}

export interface ICalculateGainsPerTrade {
    trades: ITradeWithGains[];
    holdings: IHoldings;
    shortTerm: number;
    longTerm: number;
}

export function calculateGainPerTrade(
    holdings: IHoldings,
    internalFormat: ITradeWithFiatRate[],
    incomes: IIncomeWithFiatRate[],
    fiatCurrency: string,
    method: METHOD,
): ICalculateGainsPerTrade {
    let tempHoldings: IHoldings = clone(holdings);
    let shortTerm = 0;
    let longTerm = 0;
    const finalFormat: ITradeWithGains[] = [];
    const newIncomes = clone(incomes);
    for (const trade of internalFormat) {
        const incomesToUse: IIncomeWithFiatRate[] = []
        while (newIncomes.length && trade.date > newIncomes[0].date) {
            const income = newIncomes.shift() as IIncomeWithFiatRate;
            incomesToUse.push(income); 
        }

        const result: ICalculateGains = calculateGains(
            tempHoldings,
            [trade],
            incomesToUse,
            fiatCurrency,
            method
        );

        tempHoldings = result.newHoldings;
        shortTerm += result.shortTermGain;
        longTerm += result.longTermGain;
        finalFormat.push({
            ...trade,
            shortTerm: result.shortTermGain,
            longTerm: result.longTermGain,
        });
    }


    const applyRemainingIncomes: ICalculateGains = calculateGains(
        tempHoldings,
        [],
        newIncomes,
        fiatCurrency,
        method
    );

    return {
        trades: finalFormat,
        holdings: applyRemainingIncomes.newHoldings,
        shortTerm,
        longTerm,
    };
}

export interface ICalculateGainsPerHoldings {
    shortTermTrades: ITradeWithCostBasis[];
    longTermTrades: ITradeWithCostBasis[];
    longTermGain: number;
    longTermProceeds: number;
    longTermCostBasis: number;
    shortTermGain: number;
    shortTermProceeds: number;
    shortTermCostBasis: number;
    holdings: IHoldings;
}

export function calculateGainsPerHoldings(
    holdings: IHoldings,
    trades: ITradeWithFiatRate[],
    incomes: IIncomeWithFiatRate[],
    fiatCurrency: string,
    method: METHOD,
): ICalculateGainsPerHoldings {
    let newHoldings: IHoldings = holdings;
    let shortTermGain = 0;
    let shortTermProceeds = 0;
    let shortTermCostBasis = 0;
    let longTermGain = 0;
    let longTermProceeds = 0;
    let longTermCostBasis = 0;
    const shortTermTrades: ITradeWithCostBasis[] = [];
    const longTermTrades: ITradeWithCostBasis[] = [];
    const incomesToApply = clone(incomes);

    for (const trade of trades) {
        while (incomesToApply.length && trade.date > incomesToApply[0].date) {
            const income = incomesToApply[0];
            newHoldings = addToHoldings(newHoldings, income.currency, income.amount, income.fiatRate, income.date);
            incomesToApply.shift();
        }

        const result = processTrade(newHoldings, trade, fiatCurrency, method);
        shortTermGain += result.shortTermGain;
        longTermGain += result.longTermGain;
        longTermProceeds += result.longTermProceeds;
        longTermCostBasis += result.longTermCostBasis;
        shortTermProceeds += result.shortTermProceeds;
        shortTermCostBasis += result.shortTermCostBasis;
        newHoldings = result.holdings;

        result.costBasisTrades.forEach((costBasisTrade) => {
            if (costBasisTrade.longtermTrade) {
                longTermTrades.push(costBasisTrade);
            } else {
                shortTermTrades.push(costBasisTrade);
            }
        });
    }
    return {
        shortTermTrades,
        longTermTrades,
        shortTermGain,
        longTermGain,
        shortTermProceeds,
        longTermProceeds,
        shortTermCostBasis,
        longTermCostBasis,
        holdings: newHoldings,
    };
}
