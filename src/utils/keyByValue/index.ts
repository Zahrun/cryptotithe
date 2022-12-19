export default function keyByValue(value: unknown, object: Record<string, unknown>): undefined | string {
    const keys = Object.keys(object);
    for (const key of keys) {
        if (object[key] === value) {
            return key;
        }
    }
    return undefined;
}
