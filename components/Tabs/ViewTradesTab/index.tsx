import * as React from 'react';
import { addFiatRateToTrades } from '../../../src/processing/getFiatRate';
import sortTrades from '../../../src/processing/SortTrades';
import { FiatRateMethod, IPartialSavedData, ISavedData, ITrade, ITradeWithFiatRate } from '../../../src/types';
import Button from '../../Button';
import { Loader } from '../../Loader';
import { TradesTable } from '../../TradesTable';
import { Timeline } from '../../Timeline';

export interface IViewTradesTabProp {
    savedData: ISavedData;
    save(data: IPartialSavedData): Promise<boolean>;
}

export interface IViewTradesTabState {
    processing: boolean;
    tradeTable: boolean;
}


export class ViewTradesTab extends React.Component<IViewTradesTabProp, IViewTradesTabState> {

    public constructor(props: IViewTradesTabProp) {
        super(props);
        this.state = {
            processing: false,
            tradeTable: false,
        };
    }

    public save = (trades: ITrade[] | ITradeWithFiatRate[]) =>
        this.props.save({trades: trades as ITradeWithFiatRate[]})

    public refetchFiatRate = async () => {
        this.setState({processing: true});
        const newTrades: ITradeWithFiatRate[] = await addFiatRateToTrades(
            this.props.savedData.trades,
            this.props.savedData.settings.fiatCurrency,
            FiatRateMethod[this.props.savedData.settings.fiatRateMethod],
        );
        const sortedTrades: ITradeWithFiatRate[] = sortTrades(newTrades) as ITradeWithFiatRate[];
        this.props.save({trades: sortedTrades});
        this.setState({processing: false});
    }

    public tradeTable = () => {
        this.setState({
            tradeTable: !this.state.tradeTable,
        });
    }

    public render() {
        return (
            <div className='viewTrades'>
                <h3 className='tc'>Trades</h3>
                <hr className='center w-50' />
                <div className='tc center pb2'>
                    <Button label='Refresh Trade Data' onClick={this.refetchFiatRate}/>
                    <Button label='Trade Table' onClick={this.tradeTable}/>
                </div>
                <div className="tc center">
                    {this.state.processing ?
                        <Loader />
                    :
                        this.state.tradeTable ?
                            this.props.savedData.trades.length > 0 ?
                                <TradesTable
                                    trades={this.props.savedData.trades}
                                    save={this.save}
                                />
                            :
                                <h3 className='tc'>No Trades <i className='fa fa-frown-o'></i></h3>
                        :
                            <Timeline trades={this.props.savedData.trades.reverse()}/>
                    }
                </div>
            </div>
        );
    }
}
