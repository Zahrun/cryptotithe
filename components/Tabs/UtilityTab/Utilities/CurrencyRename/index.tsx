import { Button, Intent, Spinner } from '@blueprintjs/core';
import * as React from 'react';
import { IPartialSavedData, ISavedData } from '../../../../../src/types';
import { ALL_EXCHANGES, getCurrenciesByExchange, ITradeFilterOptions, TradeFilter } from '../../../../TradeFilter';

export interface ICurrencyRenameProp {
    savedData: ISavedData;
    save: (data: IPartialSavedData) => Promise<boolean>;
}

interface ICurrencyRenameState {
    loading: boolean;
    options: ITradeFilterOptions;
    newCurrency: string;
    changesMade: number;
}

export default class CurrencyRename extends React.Component<ICurrencyRenameProp, ICurrencyRenameState> {
    public constructor(props: ICurrencyRenameProp) {
        super(props);
        this.state = {
            loading: false,
            changesMade: 0,
            options: {
                exchange: ALL_EXCHANGES,
                currency:  getCurrenciesByExchange(this.props.savedData.trades, ALL_EXCHANGES)[0],
            },
            newCurrency: '',
        };
    }

    public onChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({newCurrency: e.currentTarget.value});
    }

    public onOptionsChange = (options: ITradeFilterOptions): void => {
        this.setState({options});
    }

    public rename = (): void => {
        this.setState({loading: true});
        const trades = this.props.savedData.trades;
        let hits = 0;
        for (const trade of trades) {
            if (
                this.state.options.exchange === ALL_EXCHANGES ||
                trade.exchange === this.state.options.exchange
            ) {
                if (trade.boughtCurrency === this.state.options.currency) {
                    trade.boughtCurrency = this.state.newCurrency;
                    hits++;
                } else if (trade.soldCurrency === this.state.options.currency) {
                    trade.soldCurrency = this.state.newCurrency;
                    hits++;
                }
            }
        }
        this.props.save({
            trades,
        });
        this.setState({
            loading: false,
            changesMade: hits,
        });
    }

    public render() : React.ReactNode {
        return (
            <div className='CurrencyRename'>
                <div className='center tc mt2'>
                    <TradeFilter
                        trades={this.props.savedData.trades}
                        onChange={this.onOptionsChange}
                        options={this.state.options}
                        inline={true}
                    />
                    <br />
                    <label htmlFor='type' className='pr2 pt2 pb2'>New Currency Name</label>
                    <input onChange={this.onChange}/>
                    <hr className='w-50' />
                    <Button
                        intent={Intent.WARNING}
                        icon="edit"
                        onClick={this.rename}
                    >
                        Rename
                    </Button>
                    {this.state.newCurrency !== '' && this.state.changesMade > 0 &&
                        <h5>{this.state.changesMade} changes made</h5>
                    }
                    {this.state.loading &&
                        <Spinner/>
                    }
                </div>
                {this.state.loading &&
                    <Spinner/>
                }
            </div>
        );
    }
}
