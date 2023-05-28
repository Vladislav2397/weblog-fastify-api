"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCamelCase = void 0;
function toCamelCase(str) {
    let words = str.trim().split(/[\s,_-]+/);
    let result = words[0];
    for (let i = 1; i < words.length; i++) {
        result += words[i].charAt(0).toUpperCase() + words[i].slice(1);
    }
    return result;
}
exports.toCamelCase = toCamelCase;
