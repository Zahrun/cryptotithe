import * as classnames from 'classnames';
import * as React from 'react';
import { calculateGains } from '../src/processing/CalculateGains';
import save from '../src/save';
import savedDataConverter from '../src/savedDataConverter';
import {
    IPartialSavedData,
    ISavedData,
    ITradeWithDuplicateProbability,
} from '../src/types';
import Button from './Button';
import { FileBrowse } from './FileBrowse';
import { FileDownload, IFileDownloadProps } from './FileDownload';
import Popup from './Popup';
import { AddTradesTab } from './Tabs/AddTradesTab';
import { CalculateGainsTab } from './Tabs/CalculateGainsTab';
import { PortfolioTab } from './Tabs/PortfolioTab';
import { Settings } from './Tabs/Settings';
import { UtilityTab } from './Tabs/UtilityTab';
import { ViewTradesTab } from './Tabs/ViewTradesTab';

export interface IAppProps {
    savedData: ISavedData;
    browser: boolean;
}

enum TABS {
    HOME = 'Home',
    VIEW_TRADES = 'View Trades',
    ADD_TRADES = 'Add Trades',
    CALCULATE_GAINS = 'Calculate Gains',
    UTILITY = 'Utility',
}

interface IAppState {
    savedData: ISavedData;
    savedDataUpdated: boolean;
    processing: boolean;
    duplicateTrades: ITradeWithDuplicateProbability[];
    currentTab: TABS;
    loadDataPopup: boolean;
    fileBrowseOpen: boolean;
    downloadProps: IFileDownloadProps;
    settingsPopup: boolean;
}

export class rootElement extends React.Component<IAppProps, IAppState> {
    public constructor(props: IAppProps) {
        super(props);

        const savedData = this.props.savedData;
        let savedDataUpdated = false;
        const savedDataLoaded = savedData.trades.length + Object.keys(savedData.holdings).length !== 0;
        if (savedDataLoaded) {
            const shouldSave = savedDataConverter(savedData);
            if (shouldSave) {
                savedData.holdings = calculateGains(
                    {},
                    this.props.savedData.trades,
                    this.props.savedData.settings.fiatCurrency,
                    this.props.savedData.settings.gainCalculationMethod,
                ).newHoldings;
                savedDataUpdated = true;
            }
        }

        this.state = {
            processing: false,
            duplicateTrades: [],
            currentTab: TABS.HOME,
            fileBrowseOpen: false,
            loadDataPopup: props.browser || props.savedData.trades.length +
                Object.keys(props.savedData.holdings).length === 0,
            downloadProps: {
                data: '',
                fileName: 'data.json',
                download: false,
            },
            settingsPopup: false,
            savedData,
            savedDataUpdated,
        };
    }

    public componentDidMount() {
        if (this.state.savedDataUpdated) {
            this.saveData(this.state.savedData);
            this.setState({savedDataUpdated: false});
        }
    }

    public saveData = async (data: IPartialSavedData): Promise<boolean> => {
        const savedData = save(data, this.state.savedData);
        try {
            this.setState({
                downloadProps: {
                    data: JSON.stringify(savedData),
                    fileName: 'data.json',
                    download: true,
                },
                savedData,
            });
            return true;
        } catch (err) {
            alert(err);
            return false;
        }
    }

    public componentDidUpdate() {
        if (this.state.downloadProps.download) {
            this.setState({
                downloadProps: {
                    data: '',
                    fileName: 'data.json',
                    download: false,
                },
            });
        }
    }

    public showCurrentTab = (currentTab: TABS) => {
        switch (currentTab) {
            case TABS.ADD_TRADES:
                return <AddTradesTab
                    savedData={this.state.savedData}
                    save={this.saveData}
                />;
            case TABS.VIEW_TRADES:
                return <ViewTradesTab savedData={this.state.savedData} save={this.saveData}/>;
            case TABS.CALCULATE_GAINS:
                return <CalculateGainsTab savedData={this.state.savedData}/>;
            case TABS.UTILITY:
                return <UtilityTab savedData={this.state.savedData} save={this.saveData}/>;
            case TABS.HOME:
            default:
                return <PortfolioTab savedData={this.state.savedData} save={this.saveData}/>;
        }
    }

    public updateTab = (newTab: TABS) => () => {
        this.setState({currentTab: newTab});
    }

    public changePopupState = () => {
        this.setState({loadDataPopup: !this.state.loadDataPopup});
    }

    public loadData = (data: string) => {
        this.setState({fileBrowseOpen: false});
        if (data !== '') {
            try {
                const parsedData: ISavedData = JSON.parse(data);
                const shouldSave = savedDataConverter(parsedData);
                if (shouldSave) {
                    this.saveData(parsedData);
                }
                this.setState({
                    savedData: parsedData,
                    loadDataPopup: false,
                });
            } catch (ex) {
                alert('Unable to parse saved data');
            }
        }
    }

    public openFileBrowse = () => {
        this.setState({fileBrowseOpen: true});
    }

    public settingsPopup = () => {
        this.setState({settingsPopup: !this.state.settingsPopup});
    }

    public render() {
        return (
            <div className='app'>
                {this.state.loadDataPopup &&
                    <Popup onClose={this.changePopupState}>
                        <div>
                            <h1>Welcome to CryptoTithe</h1>
                            <h5>Great Description to be put here</h5>
                            <Button label='Load Existing Data' onClick={this.openFileBrowse}/>
                            <FileBrowse
                                onLoaded={this.loadData}
                                browse={this.state.fileBrowseOpen}
                            />
                        </div>
                    </Popup>
                }
                { this.state.downloadProps &&
                    <FileDownload
                        data={this.state.downloadProps.data}
                        fileName={this.state.downloadProps.fileName}
                        download={this.state.downloadProps.download}
                    />
                }
                { this.state.settingsPopup &&
                    <Settings
                        settings={this.state.savedData.settings}
                        onSettingsSave={this.saveData}
                        onClose={this.settingsPopup}
                    />
                }
                <link rel='stylesheet' type='text/css' href='./components/index.css' />
                <i className='fa fa-cog fa-2x moon-gray fr pr1 bg-dark-gray' onClick={this.settingsPopup}/>
                <div className='flex bg-dark-gray h2'>
                    {Object.keys(TABS).map((key: string) => <h3
                        key={key}
                        className={classnames('pr2 pl2 ml2 mr2 moon-gray grow mt1 mb0', {
                            'bg-dark-gray': TABS[key] !== this.state.currentTab,
                            'bg-navy': TABS[key] === this.state.currentTab,
                        })}
                        onClick={this.updateTab(TABS[key])}
                    >{TABS[key]}</h3>)}
                </div>
                {!this.state.loadDataPopup &&
                    <div className='openTab'>
                        {this.showCurrentTab(this.state.currentTab)}
                    </div>
                }
            </div>
        );
    }
}
