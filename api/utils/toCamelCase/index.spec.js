"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
describe('By call function toCamelCase with', () => {
    it.each([
        ['default_value', 'defaultValue'],
        ['value', 'value'],
        [' value  item', 'valueItem'],
        ['default-value', 'defaultValue'],
        ['default-value-item', 'defaultValueItem'],
    ])('args %s should be retured %s', (enter, result) => {
        expect((0, index_1.toCamelCase)(enter)).toBe(result);
    });
});
