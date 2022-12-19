import { createEmptySavedData } from '../../mock';
import integrityCheck from './';

describe('Integrity Check', () => {
    test('Basic check', () => {
        const savedData = createEmptySavedData();
        savedData.savedDate = new Date(0);

        expect(integrityCheck(savedData)).toBe('b04cafb5e83eabe4a85182fb41b3ccc7741ad49b9cd3974f5bd3ac84bd3ffd65');
    });
});
