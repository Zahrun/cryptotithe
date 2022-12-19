import * as React from 'react';
import { ITradeWithGains } from '../../src/types';
import { Table } from '../Table';
import { TradeRate } from '../TradeRate';

export interface IGainsPerTradeTableProps {
    className?: string;
    trades: ITradeWithGains[];
    fiatCurrency: string;
}

export class GainsPerTradeTable extends React.PureComponent<IGainsPerTradeTableProps> {
    public render(): React.ReactNode {
        return (
            <Table
                headers={[
                    'Date',
                    'ID',
                    'Amount Sold',
                    'Sold Currency',
                    'Rate',
                    'Bought Currency',
                    'Amount Bought',
                    'Transaction Fee',
                    'Fiat Rate',
                    'Fiat Value',
                    'Short Term Gain',
                    'Long Term Gain',
                ]}
                rows={this.props.trades.map((trade) => [
                    <span>{new Date(trade.date).toUTCString()}</span>,
                    <span>{trade.exchangeID}</span>,
                    <span>{trade.amountSold.toFixed(8)}</span>,
                    <span>{trade.soldCurrency}</span>,
                    <TradeRate rate={trade.rate} amountSold={trade.amountSold}/>,
                    <span>{trade.boughtCurrency}</span>,
                    <span>{(trade.amountSold / trade.rate).toFixed(8)}</span>,
                    <span>{`${trade.transactionFee} ${trade.transactionFeeCurrency}`}</span>,
                    <span>{trade.fiatRate.toFixed(8)}</span>,
                    <span>{trade.soldCurrency === this.props.fiatCurrency ?
                        trade.amountSold :
                        (trade.amountSold * trade.fiatRate).toFixed(8)
                    }</span>,
                    <span>{trade.shortTerm.toFixed(2)}</span>,
                    <span>{trade.longTerm.toFixed(2)}</span>,
                ])}
            />
        );
    }
}
