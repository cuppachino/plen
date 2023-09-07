import type { Primitive } from '@/types/common/primitive.js'

export type UnionLiteral<LiteralType, BaseType extends Primitive> =
  | LiteralType
  | (BaseType & Record<never, never>)
