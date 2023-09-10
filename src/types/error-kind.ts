import type { UnionLiteral } from '@/types/common/union-literal.js'

export type ErrorKind = UnionLiteral<'unknown' | 'not-implemented', string>
