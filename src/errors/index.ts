export * from '@/errors/base-error.js'
export * from '@/errors/is-instance-of.js'

export type { ErrorKind } from '@/types/error-kind.js'

/* Default export the base error class. */
import LibError from '@/errors/base-error.js'
export default LibError
