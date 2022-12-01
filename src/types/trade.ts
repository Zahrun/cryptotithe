import { IDuplicate, Location } from './';

export type IPartialTrade = Partial<ITrade>;

export interface ITrade {
    boughtCurrency: string;
    soldCurrency: string;
    amountSold: number;
    rate: number;
    date: number;
    exchangeID: string;
    exchange: Location;
    ID: string;
    transactionFee: number;
    transactionFeeCurrency: string;
}

export interface ITradeWithFiatRate extends ITrade {
    // fiatRate represents the rate of the crypto in fiat
    fiatRate: number;
}

export interface ITradeWithFrenchGain extends ITradeWithFiatRate {
    allHoldingsValue: number;
    totalPurchasePrice: number;
    initialCapitalRatio: number;
    gain: number;
}

export interface ITradeWithGains extends ITradeWithFiatRate {
    shortTerm: number;
    longTerm: number;
}

export interface ITradeWithCostBasis extends ITradeWithGains {
    dateAcquired: number;
    costBasis: number;
    longtermTrade: boolean;
}

export interface ITradeWithDuplicateProbability extends ITrade, IDuplicate {}
