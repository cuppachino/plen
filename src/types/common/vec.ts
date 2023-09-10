import type { CreateTuple } from '@/types/common/create-tuple.js'

/**
 * Create a tuple type or an array type.
 * @param T The type of the elements.
 * @param N The length of the tuple. If not provided, the type will be an array.
 */
export type Vec<T = any, N extends number | undefined = undefined> = N extends number
  ? CreateTuple<N, T>
  : T[]
