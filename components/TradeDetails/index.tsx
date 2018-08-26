import * as crypto from 'crypto';
import * as React from 'react';
import * as validator from 'validator';
import { createDateAsUTC } from '../../src/parsers/utils';
import { EXCHANGES, IPartialTrade, ITrade } from '../../src/types';
import Button from '../Button';

export interface ITradeDetailsProps {
    className?: string;
    trade?: ITrade;
    onSubmit(trade: ITrade): void;
}

export interface ITradeDetailsState {
    boughtCurrency: string;
    soldCurrency: string;
    amountBought: string;
    amountSold: string;
    rate: string;
    date: Date;
    exchange: EXCHANGES | string;
    id: string;
    exchangeID: string;
    [key: string]: string | EXCHANGES | Date;
}

export default class TradeDetails extends React.Component<ITradeDetailsProps, ITradeDetailsState> {
    public constructor(props: ITradeDetailsProps) {
        super(props);
        if ('trade' in props && props.trade !== undefined) {
            this.state = {
                boughtCurrency: props.trade.boughtCurrency,
                soldCurrency: props.trade.soldCurrency,
                amountBought: (props.trade.amountSold / props.trade.rate).toString(),
                amountSold: props.trade.amountSold.toString(),
                rate: props.trade.rate.toString(),
                date: new Date(props.trade.date),
                exchange: props.trade.exchange,
                id: props.trade.ID,
                exchangeID: props.trade.exchangeID,
            };
        } else {
            this.state = {
                boughtCurrency: '',
                soldCurrency: '',
                amountSold: '',
                amountBought: '',
                rate: '',
                date: new Date(),
                exchange: '',
                id: '',
                exchangeID: '',
            };
        }
    }

    public onChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ [key]: e.currentTarget.value });
    }

    public onSubmit = () => {
        const errors = [];
        const keys = Object.keys(this.state);
        for (const key of keys) {
            switch (key) {
                case 'boughtCurrency':
                case 'soldCurrency':
                    if (!validator.isAlpha(this.state[key])) {
                        errors.push(`${key} must consist of only english letters`);
                        break;
                    }
                    if (!validator.isLength(this.state[key], {min: 3, max: 5})) {
                        errors.push(`${key} must be 3 to 5 characters long`);
                        break;
                    }
                    break;
                case 'amountBought':
                case 'amountSold':
                    if (!validator.isNumeric(this.state[key].toString())) {
                        errors.push(`${key} must be numerical`);
                        break;
                    }
                    if (!validator.isFloat(this.state[key].toString(), {min: 0.00000001})) {
                        errors.push(`${key} must be greater then 0.00000001`);
                        break;
                    }
                    break;
                case 'date':
                    if (!validator.isAfter(this.state[key].toString(), '1/1/2010')) {
                        errors.push(`${key} must be a date after 2010`);
                        break;
                    }
                    if (!validator.isBefore(this.state[key].toString())) {
                        errors.push(`${key} must be a date in the present or past not future`);
                        break;
                    }
                    break;
            }
        }
        if (errors.length) {
            alert(errors.join('\n'));
        } else {
            const trade: IPartialTrade = {
                date: createDateAsUTC(new Date(this.state.date)).getTime(),
                amountSold: parseFloat(this.state.amountSold),
                boughtCurrency: this.state.boughtCurrency.toUpperCase(),
                soldCurrency: this.state.soldCurrency.toUpperCase(),
                rate: parseFloat(this.state.rate),
                exchange: this.state.exchange as EXCHANGES,
            };
            if (this.state.id === '') {
                trade.ID = crypto.createHash('sha256').update(
                    JSON.stringify(trade) + new Date().getTime(),
                ).digest('hex');
            } else {
                trade.ID = this.state.id;
            }
            if (this.state.exchangeID === '') {
                trade.exchangeID = trade.ID;
            } else {
                trade.exchangeID = this.state.exchangeID;
            }
            this.props.onSubmit(trade as ITrade);
        }
    }

    public calculateRate = (boughtTimesSold: boolean) => {
        if (this.state.amountBought && this.state.amountSold && this.state.amountBought !== '0' && this.state.amountSold !== '0') {
            if (boughtTimesSold) {
                return (parseFloat(this.state.amountSold) / parseFloat(this.state.amountBought)).toString();
            } else {
                return (parseFloat(this.state.amountBought) / parseFloat(this.state.amountSold)).toString();
            }
        } else {
            return 0;
        }
    }

    public render() {
        return (
            <div className={`TradeDetails w-70 center tc ${this.props.className}`}>
                <div className='w-100 pa1'>
                    <h4 className='pb0 mb0 pt0 mt0 tc'>Exchange</h4>
                    <input
                        className='w-100 tc'
                        value={this.state.exchange}
                        onChange={this.onChange('exchange')}
                    />
                </div>
                <div className='w-100 pa1'>
                    <h4 className='pb0 mb0 pt0 mt0 tc'>ID</h4>
                    <input
                        className='w-100 tc'
                        value={this.state.id}
                        disabled
                    />
                </div>
                <div className='w-100 pa1'>
                    <h4 className='pb0 mb0 pt0 mt0 tc'>Exchange ID</h4>
                    <input
                        className='w-100 tc'
                        value={this.state.exchangeID}
                        onChange={this.onChange('exchangeID')}
                    />
                </div>
                <div className='w-100 pa1'>
                    <h4 className='pb0 mb0 pt0 mt0 tc'>Date</h4>
                    <input
                        className='w-100 tc'
                        value={this.state.date.toString()}
                        onChange={this.onChange('date')}
                    />
                </div>
                <div className='flex w-100 pa1'>
                    <div className="w-50 pa1">
                        <h4 className='pb0 mb0 pt0 mt0 tc'>Bought Currency</h4>
                        <input
                            className='w-100 tc'
                            value={this.state.boughtCurrency}
                            onChange={this.onChange('boughtCurrency')}
                        />
                    </div>
                    <div className="w-50 pa1">
                        <h4 className='pb0 mb0 pt0 mt0 tc'>Sold Currency</h4>
                        <input
                            className='w-100 tc'
                            value={this.state.soldCurrency}
                            onChange={this.onChange('soldCurrency')}
                        />
                    </div>
                </div>
                <div className='flex w-100 pa1'>
                    <div className="w-third pa1 pt3 mt1">
                        <h4 className='pb0 mb0 pt0 mt0 tc'>Bought Amount</h4>
                        <input
                            className='w-100 tc'
                            value={this.state.amountBought}
                            onChange={this.onChange('amountBought')}
                        />
                    </div>
                    <div className='w-third pa1'>
                        <h4 className='pb0 mb0 pt0 mt0 tc'>Rate</h4>
                        <input
                            className='w-100 tc mv1'
                            value={this.calculateRate(true)}
                            readOnly={true}
                        />
                        <input
                            className='w-100 tc mv1'
                            value={this.calculateRate(false)}
                            readOnly={true}
                        />
                    </div>
                    <div className='w-third pa1 pt3 mt1'>
                        <h4 className='pb0 mb0 pt0 mt0 tc'>Sold Amount</h4>
                        <input
                            className='w-100 tc'
                            value={this.state.amountSold}
                            onChange={this.onChange('amountSold')}
                        />
                    </div>
                </div>
                <div className='fl w-100'>
                    <Button className='center' label='Add Trade' onClick={this.onSubmit}/>
                </div>
            </div>
        );
    }
}
