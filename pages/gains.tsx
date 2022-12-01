import { useContext, useState } from 'react';
import SavedDataContext from '@contexts/savedData';
import generateFormulaire2086 from '../src/output/Formulaire2086';
import generateForm8949 from '../src/output/Form8949';
import { calculateGainPerTrade, calculateGains, calculateGainsFrenchPerTrade } from '../src/processing/CalculateGains';
import { addFiatRateToTrades } from '../src/processing/getFiatRate';
import getYears from '../src/utils/getYears';
import { GainsPerTradeTable } from '@components/GainsPerTradeTable';
import TradeDetails from '@components/TradeDetails';
import { Customize, IYearCalculationMethod } from '@components/Tabs/CalculateGainsTab/Customize.component';
import { IHoldings, ISavedData, ITrade, ITradeWithGains, ITradeWithFiatRate, ITradeWithFrenchGain, IIncomeWithFiatRate, METHOD } from '@types';
import { Button, Dialog, Divider, Intent } from '@blueprintjs/core';
import downloadFile from '@utils/downloadFile';

async function recalculate(
    trades: ITradeWithFiatRate[],
    incomes: IIncomeWithFiatRate[],
    fiatCurrnecy: string,
    yearCalculationMethod: IYearCalculationMethod,
    french: boolean = false,
) {
    const years = Object.keys(yearCalculationMethod);
    let newHoldings = {};
    let previousYearTrades: ITradeWithFrenchGain[] = [];
    if (years.length !== 1) {
        for (let index = 0; index < years.length - 1; index++) {
            const pastTrades = trades.filter(
                (trade) => new Date(trade.date).getFullYear() === parseInt(years[index], 10),
            );
            const pastIncomes = incomes.filter(
                (income) => new Date(income.date).getFullYear() === parseInt(years[index], 10),
            );
            let result;
            if (french) {
                result = await calculateGainsFrenchPerTrade(newHoldings, previousYearTrades, pastTrades, pastIncomes, fiatCurrnecy, yearCalculationMethod[years[index]]);
                previousYearTrades = result.frenchTrades;
            } else {
                result = calculateGains(newHoldings, pastTrades, pastIncomes, fiatCurrnecy, yearCalculationMethod[years[index]]);
            }
            newHoldings = result.newHoldings;
        }
    }

    const lastYear = years[years.length - 1];
    let newTrades = trades;
    let newIncomes = incomes;
    if (lastYear !== '----' && lastYear !== '0') {
        newTrades = trades.filter(
            (trade) => new Date(trade.date).getFullYear().toString() === lastYear,
        );
        newIncomes = incomes.filter(
            (income) => new Date(income.date).getFullYear().toString() === lastYear,
        );
    }
    return {
        incomes: newIncomes,
        holdings: newHoldings,
        trades: newTrades,
        gainCalculationMethod: yearCalculationMethod[lastYear],
        previousYearTrades: previousYearTrades,
    };
}

const Gains = () => {
    const {savedData} = useContext(SavedDataContext);
    const [filteredTradesWithGains, setFilteredTradesWithGains] = useState<ITradeWithGains[]>([]);
    const [holdings, setHoldings] = useState<IHoldings>(savedData.holdings);
    const [longTermGains, setLongTermGain] = useState<number>(0);
    const [shortTermGains, setShortTermGain] = useState<number>(0);
    const [years] = useState<string[]>(getYears(savedData.trades));
    const [yearCalculationMethod, setYearCalculationMethod] = useState<IYearCalculationMethod>({});
    const [whatIfTrade, setWhatIfTrade] = useState<ITradeWithGains | undefined>(undefined);
    const [showWhatIfTrade, setShowWhatIfTrade] = useState(false);
    const [showCustomizeModal, setShowCustomizeModal] = useState(false);
    const [, setCurrentYear] = useState(0);
    const [processing, setProcessing] = useState(false);

    const onChange = (key: string, extra?: string) => (e: React.ChangeEvent<HTMLSelectElement>) => {
        switch (key) {
            case 'year':
                setCurrentYear(parseInt(e.currentTarget.value, 10));
                break;
            case 'yearGainCalculationMethod':
                if (extra !== undefined) {
                    const currentYearCalculationMethod = yearCalculationMethod;
                    currentYearCalculationMethod[extra] = e.currentTarget.value as METHOD;
                    setYearCalculationMethod(currentYearCalculationMethod);
                }
                break;
        }
    }

    return (
        <div className='calculategains'>
            <div className='pt2 w5 center flex justify-around'>
                <Button
                    onClick={() => setShowCustomizeModal(!showCustomizeModal)}
                    intent={Intent.PRIMARY}
                    icon="cog"
                >
                    Customize
                </Button>
                <Button
                    intent={Intent.PRIMARY}
                    icon="predictive-analysis"
                    onClick={() => setShowWhatIfTrade(!showWhatIfTrade)}
                >
                    What If Trade
                </Button>
            </div>

            <Dialog
                isOpen={showWhatIfTrade}
                onClose={() => setShowWhatIfTrade(false)}
                title="Trade Simulator"
                icon="manually-entered-data"
            >
                <div>
                    <TradeDetails
                        onSubmit={(trade) => calculateWhatIfTrade(trade, savedData, holdings, yearCalculationMethod, years, setWhatIfTrade)}
                        settings={savedData.settings}
                    />
                    <Divider />
                    { whatIfTrade &&
                        <div className='tc'>
                            <h3>Short Term: {whatIfTrade.shortTerm}</h3>
                            <h3>Long Term: {whatIfTrade.longTerm}</h3>
                        </div>
                    }
                </div>
            </Dialog>
            
            { filteredTradesWithGains !== undefined && filteredTradesWithGains.length > 0 &&
                <div>
                    <div className='flex justify-center'>
                        <h3 className='pa2'>Short Term Gains: {shortTermGains}</h3>
                        <h3 className='pa2'>Long Term Gains: {longTermGains}</h3>
                    </div>
                    <hr className='pa1 ma1'/>
                    <GainsPerTradeTable
                        fiatCurrency={savedData.settings.fiatCurrency}
                        trades={filteredTradesWithGains}
                    />
                </div>
            }
            {showCustomizeModal &&
                <Customize
                    onClose={() => setShowCustomizeModal(false)}
                    onChange={onChange}
                    onGenerate={(newYearCalculation: IYearCalculationMethod) => {
                        calculateGainsForTable(
                            savedData,
                            newYearCalculation,
                            setFilteredTradesWithGains,
                            setShortTermGain,
                            setLongTermGain,
                            setHoldings,
                            setShowCustomizeModal,
                            setYearCalculationMethod,
                        )
                    }}
                    onFormulaire2086Export={() => download2086Output(savedData, yearCalculationMethod, setProcessing)}
                    onForm8949Export={() => download8949Output(savedData, yearCalculationMethod, setProcessing)}
                    years={years}
                    yearCalculationMethod={yearCalculationMethod}
                    processing={processing}
                />
            }
        </div>
    );
}

const download2086Output = (savedData: ISavedData, yearCalculationMethod: IYearCalculationMethod, setProcessing: (processing: boolean) => void) => {
    setProcessing(true);
    recalculate(
        savedData.trades,
        savedData.incomes,
        savedData.settings.fiatCurrency,
        yearCalculationMethod,
        true,
    ).then(
        function(result) {
            generateFormulaire2086(
            result.holdings,
            result.previousYearTrades,
            result.trades,
            result.incomes,
            savedData.settings.fiatCurrency,
            result.gainCalculationMethod,
        ).then(
            function(value) {
                setProcessing(false);
                downloadFile(value, 'Formulaire2086.csv');
            },
        ).catch(e => console.log('Error: ', e));
        },
    ).catch(e => console.log('Error: ', e));
}

const download8949Output = (savedData: ISavedData, yearCalculationMethod: IYearCalculationMethod, setProcessing: (processing: boolean) => void) => {
    setProcessing(true);
    recalculate(
        savedData.trades,
        savedData.incomes,
        savedData.settings.fiatCurrency,
        yearCalculationMethod,
    ).then(
        function(result) {
            const data = generateForm8949(
            result.holdings,
            result.trades,
            result.incomes,
            savedData.settings.fiatCurrency,
            result.gainCalculationMethod,
            );
            setProcessing(false);
            downloadFile(data, 'Form8949.csv');
        },
    ).catch(e => console.log('Error: ', e));

}

const calculateWhatIfTrade = async (
    trade: ITrade,
    savedData: ISavedData,
    holdings: IHoldings,
    yearCalculationMethod: IYearCalculationMethod,
    years: string[],
    setWhatIfTrade: (trade: ITradeWithGains) => void,
) => {
    const tradeWithFiatRate = await addFiatRateToTrades(
        [trade],
        savedData.settings.fiatCurrency,
        savedData.settings.fiatRateMethod,
    );

    const data = calculateGainPerTrade(
        holdings,
        tradeWithFiatRate,
        [],
        savedData.settings.fiatCurrency,
        yearCalculationMethod[years[years.length - 1]],
    );

    setWhatIfTrade(data.trades[0]);
}

const calculateGainsForTable = async (
    savedData: ISavedData,
    yearCalculationMethod: IYearCalculationMethod,
    setFilteredTradesWithGains: (trades: ITradeWithGains[]) => void,
    setShortTermGain: (gain: number) => void,
    setLongTermGain: (gain: number) => void,
    setHoldings: (holdings: IHoldings) => void,
    setShowCustomizeModal: (showCustomizeModal: boolean) => void,
    setYearCalculationMethod: (yearCalculationMethod: IYearCalculationMethod) => void,
) => {
    const result = await recalculate(
        savedData.trades,
        savedData.incomes,
        savedData.settings.fiatCurrency,
        yearCalculationMethod,
    );

    const data = calculateGainPerTrade(
        result.holdings,
        result.trades,
        result.incomes,
        savedData.settings.fiatCurrency,
        result.gainCalculationMethod,
    );

    await setFilteredTradesWithGains(data.trades);
    await setLongTermGain(data.longTerm);
    await setShortTermGain(data.shortTerm);
    await setHoldings(data.holdings);
    await setShowCustomizeModal(false);
    await setYearCalculationMethod(yearCalculationMethod);
}

export default Gains;
