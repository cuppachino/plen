/**
 * Bound decorator.
 * @description Binds a method to the instance of the class during initialization.
 */
export function bound(originalMethod: Function, context: ClassMethodDecoratorContext) {
  const methodName = context.name
  if (context.private) {
    throw new Error(`'bound' cannot decorate private properties like ${methodName as string}.`)
  }
  context.addInitializer(function () {
    ;(this as any)[methodName] = (this as any)[methodName].bind(this)
  })
}
