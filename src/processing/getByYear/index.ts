export interface IItem {
    date: number;
}

const getByYear = <T extends IItem>(items: T[], year: number): T[] => {
    return items.filter((item) => new Date(item.date).getFullYear() === year);
}

export default getByYear;