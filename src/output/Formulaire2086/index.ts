import { calculateGainsFrenchPerTrade, ICalculateGainsFrenchPerTrade } from '../../processing/CalculateGains';
import { IHoldings, IIncomeWithFiatRate, ITradeWithFrenchGain, ITradeWithFiatRate, METHOD } from '../../types';

const headers = [
    '',
    '211 Date de la cession',
    '212 Valeur globale du portefeuille au moment de la cession',
    'Détermination du prix de cession',
    '213 Prix de cession',
    '214 Frais de cession',
    '215 Prix de cession net des frais (213 - 214)',
    '216 Soulte reçue ou versée lors de la cession',
    '217 Prix de cession net des soultes : lignes (213 - 216) ou lignes (213 + 216)',
    '218 Prix de cession net des frais et soultes : lignes (213 - 214 - 216) ou lignes (213 - 214 + 216)',
    'Détermination du prix total d’acquisition du portefeuille d’actifs numériques',
    '220 Prix total d’acquisition',
    '221 Fractions de capital initial contenues dans le prix total d’acquisition',
    '222 Soultes reçues en cas d’échanges antérieurs à la cession',
    '223 Prix total d’acquisition net : lignes (220 - 221 - 222)',
    'Plus-values et moins-values : ligne 218 - [(ligne 223) x (ligne 217) / (ligne 212)] précédé du signe + ou -',
].join(',');

export default async function outputFormulaire2086(
    holdings: IHoldings,
    previousYearTrades: ITradeWithFrenchGain[],
    trades: ITradeWithFiatRate[],
    incomes: IIncomeWithFiatRate[],
    fiatCurrency: string,
    method: METHOD,
) {
    displayInputs(holdings, trades, incomes, fiatCurrency, method);
    const result = await calculateGainsFrenchPerTrade(holdings, previousYearTrades, trades, incomes, fiatCurrency, method);
    displayResult(result);
    let csvData: any[] = [];
    csvData = csvData.concat(headers);
    csvData = csvData.concat(addTrades(result.frenchTrades, fiatCurrency));

    return 'Formulaire 2089\n21 DECLARANT 1\n'.concat(
        transpose(csvData).join('\n').concat(
            '\n',[
            '224 Plus-value ou moins-value globale du déclarant 1',
            result.gains,
            ].join(',')
        )
    );
}

function transpose(data: string[]) {
    let table: string[][] = [];
    for (const row of data){
        table.push(row.split(','));
    }
    let maxCol = table.reduce((acc, cols) => Math.max(acc, cols.length), 0)
    let transposed: string[][] = [];
    for (let i = 0; i < maxCol; i++) {
        let temp: string[] = []
        table.forEach(cols => temp.push(cols[i]))
        transposed.push(temp)
    }
    let result: string[] = [];
    for (const row of transposed){
        result.push(row.join(','));
    }
    return result;
}

function addTrades(trades: ITradeWithFrenchGain[], fiatCurrency: string) {
    let temp: any[] = [];
    let sales = 0;
    for (const trade of trades) {
        if (trade.boughtCurrency !== fiatCurrency){
            continue;
        }
        sales++;
        let formatedGain = '';
        if (trade.gain < 0) {
            formatedGain = formatedGain.concat('-');
        } else {
            formatedGain = formatedGain.concat('+');
        }
        let prix = trade.amountSold / trade.rate;
        temp = temp.concat([
            'Cession '.concat(sales.toString()),
            new Date(trade.date).toLocaleDateString('fr-FR'),
            Math.round(trade.allHoldingsValue),
            '',
            Math.round(prix),
            Math.round(trade.transactionFee),
            Math.round(prix - trade.transactionFee),
            0,
            Math.round(prix - 0),
            Math.round(prix - trade.transactionFee - 0),
            '',
            trade.totalPurchasePrice,
            trade.initialCapitalRatio,
            0,
            Math.round(trade.totalPurchasePrice - trade.initialCapitalRatio - 0),
            formatedGain.concat(Math.round(trade.gain).toString()),
        ].join(',')
        );
    }

    return temp;
}

function displayInputs(
    holdings: IHoldings,
    trades: ITradeWithFiatRate[],
    incomes: IIncomeWithFiatRate[],
    fiatCurrency: string,
    method: METHOD,
) {
    let output: any[] = [
        '### outputFormulaire2086 inputs',
    ];
    output = output.concat(`## Trades (size ${trades.length})`);
    /*for (const trade of trades) {
        output = output.concat(`${trade.boughtCurrency}; ${trade.soldCurrency}; ${trade.amountSold}; ${trade.rate}; ${new Date(trade.date).toUTCString()}; trade.exchangeID; ${trade.exchange}; trade.ID; ${trade.transactionFee}; ${trade.transactionFeeCurrency}; ${trade.fiatRate}`);
    }*/
    output = output.concat(`## Holdings (size ${holdings.length})`, holdings);
    for (const currency of Object.keys(holdings)) {
        output = output.concat(`# ${currency} holdings (size ${holdings[currency].length})`);
        for (const holding of holdings[currency]) {
            output = output.concat(`${holding.amount}; ${holding.rateInFiat}; ${new Date(holding.date).toUTCString()}; ${holding.location}`);
        }
    }
    output = output.concat("## Incomes");
    for (const income of incomes) {
        output = output.concat(income.amount);
    }
    output = output.concat("## fiatCurrency", fiatCurrency);
    output = output.concat("## method", method);
    for (const line of output) {
        console.log(line);
    }
    //console.log(output.join('\n'));
}

function displayResult(result: ICalculateGainsFrenchPerTrade) {
    let output: any[] = [
        '### calculateGainsFrench results',
    ];
    output = output.concat(result);
    output = output.concat(`## Trades (size ${result.frenchTrades.length})`);
    output = output.concat(`## Holdings (size ${result.newHoldings.length})`, result.newHoldings);
    for (const currency of Object.keys(result.newHoldings)) {
        output = output.concat(`# ${currency} holdings (size ${result.newHoldings[currency].length})`);
        for (const holding of result.newHoldings[currency]) {
            output = output.concat(`${holding.amount}; ${holding.rateInFiat}; ${new Date(holding.date).toUTCString()}; ${holding.location}`);
        }
    }
    output = output.concat(result.newHoldings);
    output = output.concat("## gains", result.gains);
    output = output.concat(`## French sales trades (size ${result.frenchTrades.length})`);
    /*for (const trade of result.frenchTrades) {
        output = output.concat(`${trade.boughtCurrency}; ${trade.soldCurrency}; ${trade.amountSold}; ${trade.rate}; ${new Date(trade.date).toUTCString()}; trade.exchangeID; ${trade.exchange}; trade.ID; ${trade.transactionFee}; ${trade.transactionFeeCurrency}; ${trade.fiatRate};;; ${trade.allHoldingsValue}; ${trade.totalPurchasePrice}; ${trade.initialCapitalRatio}; ${trade.gain}`);
    }*/
    for (const line of output) {
        console.log(line);
    }
}
