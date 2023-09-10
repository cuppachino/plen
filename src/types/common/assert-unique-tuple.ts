/**
 * Type-check a tuple to ensure that it contains no duplicate types.
 */
export type AssertUniqueTuple<T> = T extends readonly [infer X, ...infer Rest]
  ? InArray<Rest, X> extends true
    ? [{ 'Invalid (duplicate) type in tuple': X }, X]
    : readonly [X, ...AssertUniqueTuple<Rest>]
  : T

type InArray<T, X> = T extends readonly [X, ...infer _Rest]
  ? true
  : T extends readonly [X]
  ? true
  : T extends readonly [infer _, ...infer Rest]
  ? InArray<Rest, X>
  : false
