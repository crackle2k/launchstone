import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  readdir,
  symlink,
  rm,
  chmod,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { WorldStore } from '../electron/world-store'
import { ServerManager } from '../electron/server-manager'
import { DEFAULT_ENVIRONMENT } from '../shared/contracts'

let directory: string
let store: WorldStore
const input = () => ({
  name: 'Weekend world',
  environment: DEFAULT_ENVIRONMENT,
  memoryMb: 4096,
  port: 25565,
})
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'launchstone-test-'))
  store = new WorldStore(directory)
})
afterEach(async () => {
  await rm(directory, { recursive: true, force: true })
})

describe('world storage', () => {
  it('persists a version-locked manifest across application restarts', async () => {
    const world = await store.create(input())
    expect(await new WorldStore(directory).get(world.id)).toEqual(world)
    expect((await store.list()).map((item) => item.id)).toEqual([world.id])
    expect(world.environment).toEqual(DEFAULT_ENVIRONMENT)
  })
  it('rejects traversal, invalid ports, and invalid protocol versions', async () => {
    expect(() => store.worldPath('../../outside')).toThrow()
    await expect(store.create({ ...input(), port: 70000 })).rejects.toThrow()
    await expect(
      store.create({
        ...input(),
        environment: {
          ...DEFAULT_ENVIRONMENT,
          loaderVersion: '../../../../outside',
        },
      }),
    ).rejects.toThrow()
    await expect(
      store.create({
        ...input(),
        environment: { ...DEFAULT_ENVIRONMENT, protocolVersion: 2 },
      }),
    ).rejects.toThrow()
  })
  it('copies and hashes nested world data, excludes transient bridge credentials, and keeps snapshots immutable', async () => {
    const world = await store.create(input())
    const source = store.serverPath(world.id)
    await mkdir(join(source, 'world', 'region'), { recursive: true })
    await mkdir(join(source, '.launchstone'), { recursive: true })
    await writeFile(
      join(source, 'world', 'region', 'r.0.0.mca'),
      'original chunk data',
    )
    await writeFile(join(source, '.launchstone', 'bridge.json'), 'SECRET')
    await writeFile(join(source, 'world', 'session.lock'), 'LOCK')
    const checkpoint = await store.checkpoint(world.id)
    expect(checkpoint.fileCount).toBe(1)
    expect(checkpoint.files[0].sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(checkpoint.files[0].path).toBe('world/region/r.0.0.mca')
    await writeFile(
      join(source, 'world', 'region', 'r.0.0.mca'),
      'updated data',
    )
    expect(
      await readFile(
        join(
          store.worldPath(world.id),
          'checkpoints',
          checkpoint.id,
          'server',
          'world',
          'region',
          'r.0.0.mca',
        ),
        'utf8',
      ),
    ).toBe('original chunk data')
    expect(await store.checkpoints(world.id)).toEqual([checkpoint])
  })
  it('rejects symlinks without publishing incomplete checkpoints', async () => {
    const world = await store.create(input())
    await symlink(directory, join(store.serverPath(world.id), 'escape'))
    await expect(store.checkpoint(world.id)).rejects.toThrow('symbolic links')
    expect(
      await readdir(join(store.worldPath(world.id), 'checkpoints')),
    ).toEqual([])
  })
})

describe('server installation', () => {
  it('refuses to checkpoint or restart a server process orphaned by an app crash', async () => {
    const world = await store.create(input())
    // Use this test runner's live PID as an orphan marker; never signal it except kill(pid, 0).
    await writeFile(
      join(store.worldPath(world.id), 'runtime.json'),
      JSON.stringify({ pid: process.pid }),
    )
    const manager = new ServerManager(store)
    await expect(manager.checkpoint(world.id)).rejects.toThrow(
      'previous server process',
    )
    await expect(manager.start(world.id)).rejects.toThrow(
      'previous server process',
    )
  })
  it.skipIf(process.platform === 'win32')(
    'controls a child process and blocks checkpoints until it has exited',
    async () => {
      const world = await store.create(input())
      const source = join(directory, 'fixture-server')
      await mkdir(
        join(source, 'libraries/net/minecraftforge/forge/1.20.1-47.4.0'),
        { recursive: true },
      )
      await writeFile(
        join(
          source,
          'libraries/net/minecraftforge/forge/1.20.1-47.4.0/unix_args.txt',
        ),
        '# fixture',
      )
      // This is a stand-in child process, not Minecraft and not acceptance of its EULA.
      await writeFile(join(source, 'eula.txt'), 'eula=true\n')
      const executable = join(directory, 'java-fixture.mjs')
      await writeFile(
        executable,
        `#!/usr/bin/env node
if (process.argv.includes('-version')) { console.error('openjdk version "17.0.0"'); process.exit(0) }
console.log('Done (1.00s)! For help, type "help"');
process.stdin.setEncoding('utf8');
process.stdin.on('data', text => { if (text.includes('stop')) { console.log('Saving world'); process.exit(0) } });
`,
      )
      await chmod(executable, 0o755)
      const manager = new ServerManager(store)
      await manager.importServer(world.id, source)
      await manager.setJava(executable)
      async function waitFor(status: string) {
        for (let attempts = 0; attempts < 200; attempts++) {
          if (manager.status(world.id) === status) return
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
        throw new Error(`Server did not enter ${status}`)
      }
      try {
        await manager.start(world.id)
        await waitFor('running')
        await expect(manager.checkpoint(world.id)).rejects.toThrow(
          'Stop the server',
        )
        await expect(manager.start(world.id)).rejects.toThrow('already active')
        await manager.stop(world.id)
        await waitFor('offline')
        expect(manager.serverLogs(world.id).join('\n')).toContain(
          'Saving world',
        )
        expect((await manager.checkpoint(world.id)).fileCount).toBe(2)
        expect(manager.hasActiveServers()).toBe(false)
      } finally {
        if (manager.hasActiveServers()) {
          await manager.stop(world.id)
          await waitFor('offline')
        }
      }
    },
  )
  it('imports a matching Forge installation, locks mod hashes, and prevents replacement', async () => {
    const world = await store.create(input())
    const source = join(directory, 'external-server')
    await mkdir(
      join(source, 'libraries/net/minecraftforge/forge/1.20.1-47.4.0'),
      { recursive: true },
    )
    await writeFile(
      join(
        source,
        `libraries/net/minecraftforge/forge/1.20.1-47.4.0/${process.platform === 'win32' ? 'win' : 'unix'}_args.txt`,
      ),
      'arguments',
    )
    await mkdir(join(source, 'mods'))
    await writeFile(join(source, 'mods', 'companion.jar'), 'jar content')
    const manager = new ServerManager(store)
    await manager.importServer(world.id, source)
    expect((await manager.view(world.id)).configured).toBe(true)
    expect((await store.get(world.id)).environment.mods).toEqual([
      {
        name: 'companion.jar',
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
    ])
    await expect(manager.importServer(world.id, source)).rejects.toThrow(
      'already contains files',
    )
    expect((await manager.checkpoint(world.id)).fileCount).toBe(2)
  })
  it('rejects an incompatible installation without copying files', async () => {
    const world = await store.create(input())
    const source = join(directory, 'wrong-version')
    await mkdir(source)
    await expect(
      new ServerManager(store).importServer(world.id, source),
    ).rejects.toThrow()
    expect(await readdir(store.serverPath(world.id))).toEqual([])
  })
})
