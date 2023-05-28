export type TaggedType<T, U = 'TaggedType'> = T & { __tag?: U }
