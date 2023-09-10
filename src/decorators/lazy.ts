/**
 * Lazy decorator.
 * @description Caches the result of a getter and returns it on subsequent calls.
 */
export function lazy(value: Function, { kind, name }: ClassGetterDecoratorContext) {
  return function (this: any) {
    const result = value.call(this)
    Object.defineProperty(this, name, {
      value: result,
      writable: false
    })
    return result
  }
}
