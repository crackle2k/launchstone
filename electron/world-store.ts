import {
  mkdir,
  readFile,
  writeFile,
  rename,
  readdir,
  cp,
  lstat,
  rm,
} from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { randomUUID, createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import {
  CreateWorld,
  WorldManifest,
  WorldId,
  type Checkpoint,
} from '../shared/contracts'

export async function atomicJson(path: string, value: unknown) {
  const temporary = `${path}.${randomUUID()}.tmp`
  try {
    await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', {
      flag: 'wx',
      mode: 0o600,
    })
    await rename(temporary, path)
  } finally {
    await rm(temporary, { force: true })
  }
}

export async function hashFile(path: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

export class WorldStore {
  constructor(readonly root: string) {}
  worldPath(id: string) {
    return join(this.root, 'worlds', WorldId.parse(id))
  }
  serverPath(id: string) {
    return join(this.worldPath(id), 'server')
  }
  async get(id: string) {
    return WorldManifest.parse(
      JSON.parse(
        await readFile(join(this.worldPath(id), 'manifest.json'), 'utf8'),
      ),
    )
  }
  async list() {
    const root = join(this.root, 'worlds')
    await mkdir(root, { recursive: true })
    const worlds: WorldManifest[] = []
    for (const entry of await readdir(root, { withFileTypes: true })) {
      if (entry.isDirectory() && WorldId.safeParse(entry.name).success)
        worlds.push(await this.get(entry.name))
    }
    return worlds.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  async create(input: unknown) {
    const parsed = CreateWorld.parse(input)
    const now = new Date().toISOString()
    const world = WorldManifest.parse({
      ...parsed,
      id: randomUUID(),
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
    })
    await mkdir(this.serverPath(world.id), { recursive: true })
    await atomicJson(join(this.worldPath(world.id), 'manifest.json'), world)
    return world
  }
  async checkpoints(id: string): Promise<Checkpoint[]> {
    await this.get(id)
    const root = join(this.worldPath(id), 'checkpoints')
    await mkdir(root, { recursive: true })
    const result: Checkpoint[] = []
    for (const entry of await readdir(root, { withFileTypes: true })) {
      if (entry.isDirectory() && WorldId.safeParse(entry.name).success) {
        result.push(
          JSON.parse(
            await readFile(join(root, entry.name, 'checkpoint.json'), 'utf8'),
          ),
        )
      }
    }
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  // Caller holds the world's operation lock and has verified the server is stopped.
  async checkpoint(id: string): Promise<Checkpoint> {
    const world = await this.get(id)
    const checkpointId = randomUUID()
    const root = join(this.worldPath(id), 'checkpoints')
    const staging = join(root, `.${checkpointId}.partial`)
    const data = join(staging, 'server')
    const source = this.serverPath(id)
    await mkdir(data, { recursive: true })
    try {
      await cp(source, data, {
        recursive: true,
        filter: async (path) => {
          const rel = relative(source, path)
          const parts = rel.split(sep)
          if (
            parts.some((part) =>
              [
                'logs',
                'crash-reports',
                '.launchstone',
                'session.lock',
              ].includes(part),
            )
          )
            return false
          if ((await lstat(path)).isSymbolicLink())
            throw new Error('Checkpoints cannot contain symbolic links.')
          return true
        },
      })
      const files: Checkpoint['files'] = []
      async function walk(directory: string) {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
          const path = join(directory, entry.name)
          if (entry.isDirectory()) await walk(path)
          else if (entry.isFile())
            files.push({
              path: relative(data, path).split(sep).join('/'),
              sha256: await hashFile(path),
              bytes: (await lstat(path)).size,
            })
        }
      }
      await walk(data)
      files.sort((a, b) => a.path.localeCompare(b.path))
      const checkpoint: Checkpoint = {
        id: checkpointId,
        worldId: id,
        createdAt: new Date().toISOString(),
        fileCount: files.length,
        bytes: files.reduce((sum, file) => sum + file.bytes, 0),
        environment: world.environment,
        files,
      }
      await atomicJson(join(staging, 'checkpoint.json'), checkpoint)
      await rename(staging, join(root, checkpointId))
      return checkpoint
    } catch (error) {
      await rm(staging, { recursive: true, force: true })
      throw error
    }
  }
}
