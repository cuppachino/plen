import type { UnionToTuple } from '@cuppachino/type-space'
import type { Permutation } from '@/types/common/permutation.js'

export type KnownKeyParameters<T> = Permutation<UnionToTuple<T>>
