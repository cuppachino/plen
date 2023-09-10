export type Combination<
  T extends readonly any[] | any[],
  A = T[number],
  U = A
> = U extends infer I extends any ? [I] | [I, ...Combination<[], Exclude<A, I>>] : never
