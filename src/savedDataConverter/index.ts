import { ISavedData } from '../types';
import zeroTwoZeroConverter from './0.2.0';
import zeroThreeZeroConverter from './0.3.0';
import zeroFourZeroConverter from './0.4.0';
import zeroFiveZeroConverter from './0.5.0';

export default function onSaveDataLoaded(savedData: ISavedData): boolean {
    const version = parseInt(savedData.version, 10);
    const packageData = require('./package.json');
    const currentVersion = packageData.version;
    let changeMade = false;

    if (!version || version <= 0.2) {
        changeMade = zeroTwoZeroConverter(savedData);
    }
    if (!version || version <= 0.3) {
        changeMade = changeMade || zeroThreeZeroConverter(savedData);
    }

    if (!version || version <= 0.4) {
        changeMade = changeMade || zeroFourZeroConverter(savedData);
    }

    if (!version || version <= 0.5) {
        changeMade = changeMade || zeroFiveZeroConverter(savedData);
    }

    if (changeMade && version === 0 || version < currentVersion) {
        savedData.version = currentVersion;
    }

    return changeMade;
}
