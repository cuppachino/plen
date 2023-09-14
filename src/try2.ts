import type { UnionToIntersection } from '@cuppachino/type-space'
import type { KnownKeyParameters } from './types/common/known-key-parameters.js'
import invariant from 'tiny-invariant'

interface Hp {
  hp: number
}

interface Name {
  name: string
}

type Component<T extends object = Record<PropertyKey, any>> = T
type System<T extends Function = (...args: any[]) => void> = T

class Observable<T> {
  protected listeners = new Set<(value: T, previous: T) => void>()
  protected previous: T
  protected value: T
  constructor(value: T) {
    this.previous = value
    this.value = value
  }

  get = (): T => {
    return this.value
  }

  isEqual = (value: T, previous: T): boolean => {
    return value === previous
  }

  set = (value: T): void => {
    if (this.isEqual(value, this.value)) return
    this.value = value
    for (const listener of this.listeners) {
      listener(value, this.previous)
    }
  }

  subscribe = (listener: (value: T, previous: T) => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}

class World<const S extends readonly string[]> {
  protected stages: Map<S[number], Set<System>>
  constructor({ stages }: { readonly stages: S }) {
    this.stages = new Map(stages.map((stage) => [stage, new Set()]))
  }

  protected __version = new Observable(0)
  get version() {
    return this.__version.get()
  }
  set version(value: number) {
    this.__version.set(value)
  }
  protected entities = new Map<number, Record<PropertyKey, any>>()
  protected properties = new Map<PropertyKey, Set<number>>()
  protected linkProperties(id: number, keys: PropertyKey[]): void {
    for (const key of keys) {
      const set = this.properties.get(key) ?? new Set()
      set.add(id)
      this.properties.set(key, set)
    }
  }
  protected unlinkProperties(id: number, keys: PropertyKey[]): void {
    for (const key of keys) {
      const set = this.properties.get(key)
      if (set) {
        set.delete(id)
        this.properties.set(key, set)
      }
    }
  }
  protected getPropertiesFromKeys = (
    keys: PropertyKey[],
    all = true
  ): Set<number> => {
    if (all) {
      if (keys.length === 0) return new Set()
      const entities = this.properties.get(keys[0]!)
      if (!entities) return new Set()
      for (const key of keys) {
        const set = this.properties.get(key)
        if (!set) return new Set()
        for (const id of entities) {
          if (!set.has(id)) {
            entities.delete(id)
          }
        }
      }
      return entities
    } else {
      const ids = new Set<number>()
      for (const key of keys) {
        const entities = this.properties.get(key)
        if (!entities) continue
        for (const id of entities) {
          ids.add(id)
        }
      }
      return ids
    }
  }
  protected getComponentsFromIds = <T extends Component>(
    ids: Set<number>
  ): T[] => {
    const components: T[] = []
    for (const id of ids) {
      components.push(this.entities.get(id) as T)
    }
    return components
  }

  getComponentsFromPropertyKeys = <T extends Component>(
    keys: (keyof T)[],
    all = true
  ) => {
    const ids = this.getPropertiesFromKeys(keys, all)
    const components = this.getComponentsFromIds<T>(ids) satisfies Iterable<T>
    return components
  }

  addComponent<T extends Component>(component: T): number {
    const id = this.version++
    this.entities.set(id, component)
    this.linkProperties(id, Object.keys(component))
    return id
  }
  removeComponent(id: number): void {
    const component = this.entities.get(id)
    invariant(!!component, `Entity with id "${id}" does not exist!`)
    this.entities.delete(id)
    this.unlinkProperties(id, Object.keys(component))
  }

  addSystem<T extends readonly S[number][], Q extends object>(
    stages: [...T],
    system: () => void
  ) {
    // const systemId = this.systemVersion++
    for (const stage of stages) {
      const systems = this.stages.get(stage)
      invariant(!!systems, `Stage "${stage}" does not exist!`)
      systems.add(system)
      this.stages.set(stage, systems)
    }
    return this
  }

  fn(stage: S[number]): void {
    const systems = this.stages.get(stage)
    invariant(!!systems, `Stage "${stage}" does not exist!`)
    for (const system of systems) {
      system()
    }
  }

  query<T extends Component>(
    ...keys: KnownKeyParameters<keyof T> extends infer U extends (keyof T)[]
      ? U
      : never
  ): Query<T> {
    const getComponents = () => {
      console.count('getComponentsFromPropertyKeys')
      return this.getComponentsFromPropertyKeys<T>(keys)
    }
    return new Query<T>(keys as (keyof T)[], getComponents, this.__version)
  }
}

import type { Flat } from '@cuppachino/type-space'

export type QueryType<T extends Query<any>> = T extends Query<infer U>
  ? U
  : never

class Query<T> implements Iterable<T> {
  protected __version = new Observable(0)
  get version() {
    return this.__version.get()
  }
  set version(value: number) {
    this.__version.set(value)
  }
  protected needsUpdate = (version: number): boolean => {
    return this.version !== version
  }
  protected cache: T[] = [];
  [Symbol.iterator](): Iterator<T> {
    return this.cache[Symbol.iterator]()
  }
  constructor(
    protected keys: (keyof T)[],
    protected update: () => T[],
    parentVersion: Observable<number>
  ) {
    this.version = parentVersion.get()
    this.cache = this.update()
    parentVersion.subscribe((version) => {
      if (this.needsUpdate(version)) {
        this.cache = this.update()
      }
    })
  }

  and<U extends Query<any>[]>(...queries: U): QueryChain<[Query<T>, ...U]> {
    return new QueryChain([this, ...queries])
  }
}

type ExtractQueries<T extends Query<any>[]> = {
  [K in keyof T]: T[K] extends Query<infer U> ? U : never
}

class QueryChain<T extends Query<any>[]> implements Iterable<T[number]> {
  constructor(protected _queries: T) {}

  // with<U extends object>(query: Query<U>)

  and<U extends object>(query: Query<U>): QueryChain<[...T, Query<U>]> {
    return new QueryChain([...this._queries, query])
  }

  queries(): T {
    return this._queries as T
  }

  [Symbol.iterator](): Iterator<T[number], any, undefined> {
    return this._queries[Symbol.iterator]()
  }
}

const world = new World({ stages: ['Startup', 'Update'] })

interface Position {
  x: number
  y: number
}
interface Dimension {
  width: number
  height: number
}
interface Box extends Position, Dimension {}

const Common = {
  velocity: ['vx', 'vy'] as const,
  position: ['x', 'y'] as const,
  dimension: ['width', 'height'] as const,
  box: ['x', 'y', 'width', 'height'] as const
} as const

interface Damage {
  dmg: number
}

interface Velocity {
  vx: number
  vy: number
}

type ProjectileKind = 'bullet' | 'rocket'

const Names = world.query<Name>('name')
const Hps = world.query<Hp>('hp')

const Players = world.query<
  { readonly playerId: number } & Position & Hp & Name
>('playerId', 'hp', 'name', 'x', 'y')

const Projectiles = world.query<
  { projectile: ProjectileKind } & Damage & Position & Velocity
>('x', 'y', 'vx', 'vy', 'projectile', 'dmg')

const PlayersAndProjectiles = Players.and(Projectiles)

world.addSystem(['Update'], () => {
  const [players, bullets] = PlayersAndProjectiles.queries()
  for (const { x, y, projectile, dmg } of bullets) {
    for (const player of players) {
      if (player.x === x && player.y === y) {
        console.log(player.name, 'was hit by', projectile, 'at', x, y)
        player.hp -= dmg
      }
    }
  }
})

world.addSystem(['Update'], () => {
  for (const projectile of Projectiles) {
    projectile.x += projectile.vx
    projectile.y += projectile.vy
  }
})

world.addComponent<QueryType<typeof Players>>({
  playerId: 420,
  name: 'hyomoto',
  hp: 100,
  x: 10,
  y: 10
})

world.addComponent<QueryType<typeof Projectiles>>({
  projectile: 'bullet',
  dmg: 10,
  x: 0,
  y: 10,
  vx: 1,
  vy: 0
})

world.addSystem(['Startup', 'Update'], () => {
  // console.log(Players.update(['name', 'hp', 'x', 'y']))
  for (const player of Players) {
    console.log(player.name, 'has', player.hp, 'hp')
  }

  for (const projectile of Projectiles) {
    console.log(
      projectile.projectile,
      'projectile at',
      projectile.x,
      projectile.y
    )
  }
})

world.fn('Startup')
world.fn('Update')
