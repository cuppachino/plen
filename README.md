# Plen

ECS

## Example

### Components
```ts
class Position extends Component {
  public x = 0
  public y = 0
}

class Health extends Component {
  public hp = 4
  public hpMax = 20
  public hp5 = 2.5
}

class Timer extends Component {
  public previous = performance.now()
  public tick = 0
  public elapsed = 0
}
```

### Systems
```ts
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
  ([pos, health]) => {
    pos.x++
    pos.y++
  },
  [Position, Health]
)

const regenHealth = system(
  ([hp], [time]) => {
    if (hp.hp < hp.hpMax) {
      hp.hp = Math.min(hp.hp + (time.elapsed / 5000) * hp.hp5, hp.hpMax)
    }
  },
  [Health],
  [Timer]
)

const debug = system(
  ([health, pos], [timer]) => {
    logger.debug(JSON.stringify({ health, pos }))
  },
  [Health, Position],
  [Timer]
)
```

### Add Schedules, Components, and Systems

```ts
const app = new Ecs(['startup', 'update'])

// Timer (todo! plugins)
app.addComponent(Timer)
app.addSystem(timerSystem, 'update', 'startup')

// Things with health and position
app.addComponent([Position, Health])
app.addSystem(moveLivingThings, 'update') // order doesn't matter.
app.addSystem(regenHealth, 'update')

app.addSystem(debug, 'startup', 'update')
```

```ts
const sleep = (n: number) => new Promise((resolve) => setTimeout(resolve, n))
const loop = async (fn: () => void, max: number, ms = 1000) => {
  while (max-- > 0) {
    fn()
    await sleep(ms)
  }
  logger.info('all done')
}
```

#### Execute schedules

```ts
app.run('startup') // todo! schedule flow
loop(() => app.run('update'), 10, 1000)
```

```log
System added with empty dependency list!
[07:33:16.640] DEBUG (23028): linked an entity to a system
    entity: 1
[07:33:16.641] DEBUG (23028): linked an entity to a system
    entity: 1
[07:33:16.641] DEBUG (23028): linked an entity to a system
    entity: 1
[07:33:16.641] DEBUG (23028): linked an entity to a system
    entity: 1
[07:33:16.642] INFO (23028): {"hp":4,"hpMax":20,"hp5":2.5,"x":0,"y":0}
[07:33:16.642] INFO (23028): {"hp":4.000276950001717,"hpMax":20,"hp5":2.5,"x":1,"y":1}
[07:33:17.651] INFO (23028): {"hp":4.505154250010849,"hpMax":20,"hp5":2.5,"x":2,"y":2}
[07:33:18.662] INFO (23028): {"hp":5.515157400012017,"hpMax":20,"hp5":2.5,"x":3,"y":3}
[07:33:19.671] INFO (23028): {"hp":7.029820250019432,"hpMax":20,"hp5":2.5,"x":4,"y":4}
[07:33:20.683] INFO (23028): {"hp":9.050373100027443,"hpMax":20,"hp5":2.5,"x":5,"y":5}
[07:33:21.694] INFO (23028): {"hp":11.576526900023223,"hpMax":20,"hp5":2.5,"x":6,"y":6}
[07:33:22.701] INFO (23028): {"hp":14.606246100023391,"hpMax":20,"hp5":2.5,"x":7,"y":7}
[07:33:23.709] INFO (23028): {"hp":18.14019680002332,"hpMax":20,"hp5":2.5,"x":8,"y":8}
[07:33:24.720] INFO (23028): {"hp":20,"hpMax":20,"hp5":2.5,"x":9,"y":9}
[07:33:25.731] INFO (23028): {"hp":20,"hpMax":20,"hp5":2.5,"x":10,"y":10}
[07:33:26.740] INFO (23028): all done
```
