export type CreateTuple<L extends number, T = never, A extends T[] = []> = A['length'] extends L
  ? A
  : CreateTuple<L, T, [...A, T]>
