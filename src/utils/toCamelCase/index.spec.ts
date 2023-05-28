import { toCamelCase } from './index'

describe('By call function toCamelCase with', () => {
    it.each([
        ['default_value', 'defaultValue'],
        ['value', 'value'],
        [' value  item', 'valueItem'],
        ['default-value', 'defaultValue'],
        ['default-value-item', 'defaultValueItem'],
    ])('args %s should be retured %s', (enter, result) => {
        expect(toCamelCase(enter)).toBe(result)
    })
})
