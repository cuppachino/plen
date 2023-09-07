import LibError from '@/errors'
import type { Constructor } from '@/types/common/constructor.js'

export const isInstanceOf = <T extends Constructor = typeof LibError>(
  error: unknown,
  Err: T = LibError as any as T
) => {
  if (error instanceof Err) {
    return error as InstanceType<T>
  }
}
