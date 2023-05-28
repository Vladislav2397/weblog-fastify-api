import { TaggedType } from '../../../types'

type CamelCaseString = TaggedType<string>
export function toCamelCase(str: string): CamelCaseString {
    let words = str.trim().split(/[\s,_-]+/)
    let result = words[0]

    for (let i = 1; i < words.length; i++) {
        result += words[i].charAt(0).toUpperCase() + words[i].slice(1)
    }

    return result
}
