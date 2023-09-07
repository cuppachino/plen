import type { ErrorKind } from '@/types/errors/error-kind.js'
import { CustomError } from 'ts-custom-error'

/**
 * The base class for all errors used in {this library}.
 */
export default class LibError<Kind extends ErrorKind> extends CustomError {
  constructor(
    public kind: Kind,
    message?: string
  ) {
    super(message)
  }
}
