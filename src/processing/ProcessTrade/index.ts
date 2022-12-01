import { addToHoldings } from '../AddToHoldings';
import clone from 'clone';
import holdingSelection from '../HoldingSelection';
import { IHoldings, ITradeWithCostBasis, ITradeWithFiatRate, METHOD } from './../../types';
import { calculateAvgerageHourPrice } from '../getFiatRate/utils';
import { getClosestHourPrice } from '../getFiatRate/getClosestHourPrice';

const FULL_YEAR_IN_MILLISECONDS = 31536000000;
var sales = 0;

export interface IProcessTrade {
    holdings: IHoldings;
    costBasisTrades: ITradeWithCostBasis[];
    shortTermGain: number;
    longTermGain: number;
    shortTermCostBasis: number;
    longTermCostBasis: number;
    shortTermProceeds: number;
    longTermProceeds: number;
}

export function processTrade(
    holdings: IHoldings,
    trade: ITradeWithFiatRate,
    fiatCurrency: string,
    method: METHOD = METHOD.FIFO,
): IProcessTrade {
    let shortTermGain = 0;
    let shortTermProceeds = 0;
    let shortTermCostBasis = 0;
    let longTermGain = 0;
    let longTermProceeds = 0;
    let longTermCostBasis = 0;
    const tradesWithCostBasis = [];
    let newHoldings: IHoldings = clone(holdings); // to avoid a change effecting state holdings

    const result = holdingSelection(
        newHoldings, trade, fiatCurrency, method,
    );
    newHoldings = result.newHoldings;

    if (trade.soldCurrency === fiatCurrency) {
        // fiat current so add new holdings
        newHoldings = addToHoldings(
            newHoldings,
            trade.boughtCurrency,
            trade.amountSold / trade.rate,
            trade.fiatRate,
            trade.date,
            trade.exchange,
        );
    } else {
        let feeFiatCost = 0;
        let amountToAdd = trade.amountSold / trade.rate;

        if (trade.transactionFee) {
            switch (trade.transactionFeeCurrency) {
                case trade.boughtCurrency:
                    feeFiatCost += trade.transactionFee * trade.rate * trade.fiatRate;
                    amountToAdd -= trade.transactionFee;
                    break;
                case trade.soldCurrency:
                    feeFiatCost += trade.transactionFee * trade.fiatRate;
                    amountToAdd -= trade.transactionFee / trade.rate;
                    break;
                case fiatCurrency:
                    feeFiatCost += trade.transactionFee;
                    amountToAdd -= trade.transactionFee / trade.fiatRate;
                    break;
                default:
            }
        }

        if (amountToAdd > 0.000000001) {
            newHoldings = addToHoldings(
                newHoldings,
                trade.boughtCurrency,
                amountToAdd,
                trade.fiatRate * trade.rate,
                trade.date,
                trade.exchange,
            );
        }

        for (const holding of result.deductedHoldings) {
            let gain = (trade.fiatRate - holding.rateInFiat) * holding.amount;

            if (feeFiatCost) {
                const feeCost = holding.amount / trade.amountSold * feeFiatCost;
                gain -= feeCost;
            }

            const tradeToAdd: ITradeWithCostBasis = {
                fiatRate: trade.fiatRate,
                boughtCurrency: trade.boughtCurrency,
                soldCurrency: trade.soldCurrency,
                amountSold: holding.amount,
                rate: trade.rate,
                date: trade.date,
                ID: trade.ID,
                exchangeID: trade.exchangeID,
                exchange: trade.exchange,
                transactionFee: trade.transactionFee,
                transactionFeeCurrency: trade.transactionFeeCurrency,
                shortTerm: 0,
                longTerm: 0,
                dateAcquired: holding.date,
                costBasis: holding.rateInFiat * holding.amount,
                longtermTrade: false,
            };

            if (trade.date - holding.date > FULL_YEAR_IN_MILLISECONDS) {
                tradeToAdd.longtermTrade = true;
                longTermGain += gain;
                longTermProceeds += tradeToAdd.fiatRate * tradeToAdd.amountSold;
                longTermCostBasis += tradeToAdd.costBasis;
                tradeToAdd.longTerm = gain;
            } else {
                shortTermGain += gain;
                shortTermProceeds += tradeToAdd.fiatRate * tradeToAdd.amountSold;
                shortTermCostBasis += tradeToAdd.costBasis;
                tradeToAdd.shortTerm = gain;
            }

            tradesWithCostBasis.push(tradeToAdd);
        }
    }
    return {
        holdings: newHoldings,
        costBasisTrades: tradesWithCostBasis,
        shortTermGain,
        longTermGain,
        shortTermCostBasis,
        longTermCostBasis,
        shortTermProceeds,
        longTermProceeds,
    };
}

export interface IProcessTradeFrench {
    holdings: IHoldings;
    allHoldingsValue: number;
}

export async function processTradeFrench(
    holdings: IHoldings,
    trade: ITradeWithFiatRate,
    fiatCurrency: string,
    method: METHOD = METHOD.FIFO,
): Promise<IProcessTradeFrench> {
    let newHoldings: IHoldings = clone(holdings); // to avoid a change effecting state holdings
    let allHoldingsValue = 0;
    let totalPurchasePrice = 0;

    if (trade.boughtCurrency === fiatCurrency) {
        sales++;
        for (const currency of Object.keys(newHoldings)){
            if (currency === fiatCurrency) {
                continue;
            }
            let currencyHolding = 0;
            for (const holding of newHoldings[currency]){
                currencyHolding += holding.amount;
            }
            const rate = await getClosestHourPrice(currency, fiatCurrency, trade.date);
            let value = calculateAvgerageHourPrice(rate) * currencyHolding;
            console.debug(`${currency} holdings: ${currencyHolding} of value ${value}`);
            allHoldingsValue += value;
        }
        console.info(`Sales ${sales} on ${new Date(trade.date).toLocaleDateString('fr-FR')} allHoldingsValue: ${allHoldingsValue}`);
    } else {
        console.info(`not a sale trade`);
    }

    const result = holdingSelection(
        newHoldings, trade, fiatCurrency, method,
    );
    newHoldings = result.newHoldings;

    if (trade.soldCurrency === fiatCurrency) {
        // fiat current so add new holdings
        newHoldings = addToHoldings(
            newHoldings,
            trade.boughtCurrency,
            trade.amountSold / trade.rate,
            trade.fiatRate,
            trade.date,
            trade.exchange,
        );
    }

    return {
        holdings: newHoldings,
        allHoldingsValue: allHoldingsValue,
        totalPurchasePrice: totalPurchasePrice,
    };
}
