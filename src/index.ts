import Err, { isInstanceOf } from '@/errors'
import { pino } from 'pino'

const log = pino()

try {
  throw new Err('not-implemented')
} catch (err) {
  if (isInstanceOf(err)) {
    log.error(err, typeof err)
  }
}
