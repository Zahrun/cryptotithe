import { saveAs } from 'file-saver';

const downloadFile = (fileData: string, fileName: string): void => (
    saveAs(new File([fileData], fileName, {type: "text/plain;charset=utf-8"}))
);

export default downloadFile;