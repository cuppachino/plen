import { bound } from '@/decorators/bound.js'
import type { Constructor } from '@/types/common/constructor.js'
import type { Nullable } from '@/types/common/nullable.js'

type MapToConstructor<C extends unknown[]> = {
  [I in keyof C]: Constructor<C[I]>
}

/// CORE - Entity
type Entity = number
/// CORE - Component
abstract class Component {}
/// CORE - System
type AnySystem = System<any, any>
class System<
  Fn extends (...query: [components: C, resources: R]) => void,
  const C extends Component[] = [],
  const R extends Component[] = []
> {
  public dependencies: Set<MapToConstructor<C>[number]> = new Set()
  public resources: Set<MapToConstructor<R>[number]> = new Set()
  constructor(
    public fn: Fn,
    components: [...MapToConstructor<C>],
    resources: [...MapToConstructor<R>]
  ) {
    this.dependencies = new Set(components)
    this.resources = new Set(resources)
  }
}

/** Create a new System */
function system<
  Fn extends (...query: [components: C, resources: R]) => void,
  const C extends Component[] = [],
  const R extends Component[] = []
>(fn: Fn, components?: [...MapToConstructor<C>], resources?: [...MapToConstructor<R>]) {
  return new System<typeof fn, C, R>(fn, components ?? ([] as any), resources ?? ([] as any))
}

/// INTERNAL
class ComponentMap {
  protected inner = new Map()

  @bound
  add(component: Constructor<Component>) {
    this.inner.set(component, new component())
    return this
  }

  @bound
  addBundle(components: Constructor<Component>[]) {
    for (const component of components) {
      this.add(component)
    }
  }

  @bound
  has(component: Constructor<Component>) {
    return this.inner.has(component)
  }
  @bound
  hasAll(components: Iterable<Constructor<Component>>) {
    for (const component of components) {
      if (!this.has(component)) {
        return false
      }
    }
    return true
  }
  @bound
  get<T extends Component>(component: T): T | undefined {
    return this.inner.get(component)
  }
  @bound
  delete(component: Component): boolean {
    return this.inner.delete(component)
  }
}

class EntityMap {
  private garbage: Entity[] = []
  private inner = new Map<Entity, ComponentMap>()
  private next = 0

  get entities(): IterableIterator<Entity> {
    return this.inner.keys()
  }

  get entries(): IterableIterator<[Entity, ComponentMap]> {
    return this.inner.entries()
  }

  @bound
  create(): Entity {
    const entity = this.next++
    this.inner.set(entity, new ComponentMap())
    return entity
  }

  @bound
  getComponents(entity: Entity): ComponentMap | undefined {
    return this.inner.get(entity)
  }

  @bound
  addComponent(entity: Entity, component: Constructor<Component>) {
    this.inner.get(entity)!.add(component)
    return this
  }

  @bound
  addComponentBundle(entity: Entity, bundle: Constructor<Component>[]) {
    this.inner.get(entity)!.addBundle(bundle)
    return this
  }

  @bound
  collect(...items: Entity[]): number {
    return this.garbage.push(...items)
  }

  @bound
  delete(entity: Entity): boolean {
    return this.inner.delete(entity)
  }

  @bound
  cleanup(fn: (entity: Entity) => void) {
    while (this.garbage.length) {
      const entity = this.garbage.pop()!
      this.delete(entity)
      fn(entity)
    }
  }
}

class SystemMap {
  protected inner = new Map<AnySystem, Set<Entity>>()

  get entries(): IterableIterator<[AnySystem, Set<Entity>]> {
    return this.inner.entries()
  }

  get systems(): IterableIterator<AnySystem> {
    return this.inner.keys()
  }

  get entities(): IterableIterator<Set<Entity>> {
    return this.inner.values()
  }

  @bound
  getSystem(key: AnySystem): Set<Entity> | undefined {
    return this.inner.get(key)
  }

  @bound
  addSystem(system: AnySystem) {
    if (!system.dependencies.size) {
      console.warn('System added with empty dependency list!')
    }
    this.inner.set(system, new Set())
  }

  @bound
  deleteSystem(system: AnySystem): boolean {
    return this.inner.delete(system)
  }

  @bound
  addEntity(system: AnySystem, entity: Entity) {
    this.inner.get(system)!.add(entity)
    return this
  }

  @bound
  deleteEntity(system: AnySystem, entity: Entity) {
    this.inner.get(system)!.delete(entity)
    return this
  }

  @bound
  cleanup(entity: Entity) {
    for (const entities of this.entities) {
      entities.delete(entity)
    }
  }
}

class Ecs<const Schedules extends readonly string[]> {
  protected entities = new EntityMap()
  protected systems = new SystemMap()
  protected schedules = new Map<Schedules[number], Set<System<any, any>>>()
  protected resources = new Map()

  constructor(schedules: Schedules) {
    for (const schedule of schedules) {
      this.schedules.set(schedule, new Set())
    }
  }

  @bound
  run<S extends Schedules[number]>(schedule: S) {
    for (const system of this.schedules.get(schedule)!) {
      for (const entity of this.systems.getSystem(system)!) {
        const dependencies = system.dependencies
        const allComponents = this.entities.getComponents(entity)!
        const requiredComponents: any[] = []
        for (const dep of dependencies) {
          const requiredComponent = allComponents.get(dep)!
          requiredComponents.push(requiredComponent)
        }

        const resources = system.resources
        const requiredResources: any[] = []
        for (const resource of resources) {
          const requiredResource = this.resources.get(resource)!
          requiredResources.push(requiredResource)
        }
        // console.debug(requiredComponents, requiredResources)
        system.fn(requiredComponents, requiredResources)
      }
    }
    // todo! could be put into a separate schedule, but schedules are user defined... thinking on it.
    this.cleanup()
  }

  get newEntity(): () => Entity {
    return this.entities.create
  }

  get deleteEntity(): (...entities: Entity[]) => number {
    return this.entities.collect
  }

  @bound
  protected cleanup() {
    this.entities.cleanup(this.systems.cleanup)
  }

  addComponent(component: Constructor<Component>): void
  addComponent(bundle: Constructor<Component>[]): void
  @bound
  addComponent(bundle: Constructor<Component> | Constructor<Component>[]) {
    const entity = this.newEntity()
    if (Array.isArray(bundle)) {
      this.entities.addComponentBundle(entity, bundle)
    } else {
      this.entities.addComponent(entity, bundle)
    }
    this.linkDependencies(entity)
  }

  @bound
  removeComponent(entity: Entity, component: Constructor<Component>) {
    this.entities.delete(entity)
    this.linkDependencies(entity)
  }

  @bound
  addSystem<
    Fn extends (...query: [components: C, resources: R]) => void,
    const C extends Component[],
    const R extends Component[]
  >(system: System<Fn, C, R>, ...schedules: Schedules[number][]) {
    for (const schedule of new Set(schedules)) {
      if (!this.schedules.has(schedule)) {
        throw new Error(`Unknown schedule label "${schedule}"`)
      }
      this.schedules.get(schedule)!.add(system as any as AnySystem)
    }
    for (const resource of system.resources) {
      this.resources.set(resource, new resource())
    }
    this.systems.addSystem(system as any as AnySystem)
    this.linkDependencies(null, system as any as AnySystem)
  }

  get deleteSystem(): (system: System<any, any>) => boolean {
    return this.systems.deleteSystem
  }

  protected linkDependencies(entity: Entity, system: System<any, any>): void
  protected linkDependencies(entity: Entity, system?: System<any, any>): void
  protected linkDependencies(entity: Nullable<Entity>, system: System<any, any>): void
  @bound
  protected linkDependencies(entity: Nullable<Entity>, system?: Nullable<System<any, any>>): void {
    if (!system) {
      for (const system of this.systems.systems) {
        this.linkDependencies(entity, system)
      }
      return
    }
    if (entity === null || entity === undefined) {
      for (const entity of this.entities.entities) {
        this.linkDependencies(entity, system)
      }
      return
    }
    if (entity) {
      console.count(`running for ${entity}`)
      const components = this.entities.getComponents(entity)!
      const dependencies = system.dependencies
      if (components.hasAll(dependencies)) {
        this.systems.addEntity(system, entity)
        console.debug('adding', entity, 'linked to a system')
      } else {
        this.systems.deleteEntity(system, entity)
      }
    }
  }
}

/// ---- Example ----
const ecs = new Ecs(['startup', 'update'])

/// Components
class Position extends Component {
  public x = 0
  public y = 0
}

class Health extends Component {
  public hp5 = 2.5
  public hp = 4
  public max = 20
}

class Timer extends Component {
  public previous = performance.now()
  public tick = 0
  public elapsed = 0
}

/// Systems
const timerSystem = system(
  (_, [timer]) => {
    const prev = timer.previous
    const now = performance.now()
    const elapsed = now - prev
    timer.elapsed = elapsed
    timer.tick = timer.tick + elapsed
    timer.previous = prev
  },
  [],
  [Timer]
)

const moveLivingThings = system(
  ([pos, hp]) => {
    pos.x++
    pos.y++
  },
  [Position, Health]
)

const regenHealth = system(
  ([hp], [time]) => {
    if (hp.hp < hp.max) {
      hp.hp = Math.min(hp.hp + (time.elapsed / 5000) * hp.hp5, hp.max)
    }
  },
  [Health],
  [Timer]
)

class Bird extends Component {
  public name = 'bird'
}

const debug = system(
  ([bird, health, pos], [timer]) => {
    console.log(bird, health, pos)
    // console.debug(timer);
  },
  [Bird, Health, Position],
  [Timer]
)

const doBirdLife = system(
  ([_, pos, hp]) => {
    pos.x = pos.x + 20
    pos.y = pos.y + 40
    hp.hp = hp.hp - 1
  },
  [Bird, Position, Health]
)

ecs.addComponent(Timer)
ecs.addSystem(timerSystem, 'update', 'startup')

ecs.addComponent([Position, Health])
ecs.addSystem(moveLivingThings, 'update') // order doesn't matter.
ecs.addSystem(regenHealth, 'update')

ecs.addComponent([Bird, Position, Health])
ecs.addSystem(doBirdLife, 'update')

ecs.addSystem(debug, 'startup', 'update')

const sleep = (n: number) => new Promise((resolve) => setTimeout(resolve, n))
const loop = async (fn: () => void, max: number, ms = 1000) => {
  while (max-- > 0) {
    fn()
    await sleep(ms)
  }
  console.log('all done')
}

ecs.run('startup') // todo! schedule flow
loop(() => ecs.run('update'), 5, 1000)
