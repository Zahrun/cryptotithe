# CryptoTithe - [![Build Status](https://travis-ci.org/starsoccer/cryptotithe.svg?branch=master)](https://travis-ci.org/starsoccer/cryptotithe) [![Coverage Status](https://coveralls.io/repos/github/starsoccer/cryptotithe/badge.svg?branch=master)](https://coveralls.io/github/starsoccer/cryptotithe?branch=master) [![Build Status](https://david-dm.org/starsoccer/cryptotithe.svg)](https://github.com/starsoccer/cryptotithe)

While you may be thinking this is just another crypto tax app, unlike all the crypto tax apps that currently exist, you do not upload any data to a centralized 3rd party. All your data is stored locally and no data is sent to any 3rd parties. 

In the desktop(electron) version, The only external requests made are to `cryptocompare.com` in order to get USD values for calculating gains.  In the future hopefully you will be able to just provide a file with the USD rate and no external requests will be needed.

In the web version linked below, besides for requests to `cryptocompare.com`, requests are also made to `unpkg.com` for some css and icons.

[Demo - Vercel](https://cryptotithe-master.vercel.app/)

Demo - ipfs(infura) - check latest build

## How to Get Started(desktop)
  1. Clone the repo or download as a zip
  2. Run `yarn`
  3. Run `yarn run build`
  4. Run `yarn run start`

## Utilisation
Cryptotithe welcomes the user with the choice of loading a existing data file from disk or to create a new empty data file to disk.
  1. The "Home" tab contains the portfolio with automatically calculated current holdings in all currencies.
  2. The "Trades" tab contains a history of all trades, which can be filtered by exchange and by currency in timeline format or in table format.
  3. The "Import" tab allows to import trades, transactions, and incomes from csv files, or to manually enter operation details. The added operations can then be saved to the data file to be taken into account.
     * Trades represent a trading operation of selling a currency to, in exchange, buy a different currency simulteanously.
     * Transactions happen when an amount of currency is sent from one exchange (withdrawal) to another exchange (deposit).
     * Incomes reflect cryptocurrency incomes such as mining, airdrops, stacking, cashback, etc.
  4. The "Gains" tab allows to configure the gains calculation method, calculate gains, and export tax declaration form 8949. This tab also has a trade simulator feature to calculate the change in gains if a defined trade was to happen.
  5. The "Income" tab allows to calculate the yearly incomes based on income operations.
  6. The "Utility" tab contains various utilities such as daily balance calculation, currency rename, and transaction fee.
  7. In the "Settings" overlay can be set the fiat rate calculation method (double average, hour average, etc.), the fiat currency to consider base, and the fiat gain calculation method (FIFO, LIFO, etc.). The data file can be saved to disk or refreshed from disk.
