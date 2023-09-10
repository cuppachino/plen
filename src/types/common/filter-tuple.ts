export type FilterTuple<T extends any[], U extends any[], R = never> = {
  [K in keyof T]: T[K] extends U[number] ? R : T[K]
}
