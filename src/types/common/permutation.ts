export type Permutation<T extends unknown[], Prev extends unknown[] = []> = T extends [
  infer First,
  ...infer Rest
]
  ?
      | [First, ...Permutation<[...Prev, ...Rest]>]
      | (Rest extends [] ? never : Permutation<Rest, [...Prev, First]>)
  : []
