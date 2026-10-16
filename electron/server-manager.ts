import {
  spawn,
  execFile,
  type ChildProcessWithoutNullStreams,
} from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, readdir, cp, lstat, access, rm } from 'node:fs/promises'
import { join, resolve, relative, sep, isAbsolute } from 'node:path'
import { z } from 'zod'
import { writeFileSync, rmSync } from 'node:fs'
import {
  BridgeStatus,
  type ServerStatus,
  type WorldView,
} from '../shared/contracts'
import { WorldStore, atomicJson, hashFile } from './world-store'

const run = promisify(execFile)
const Descriptor = z.object({
  port: z.number().int().min(1).max(65535),
  token: z.string().regex(/^[a-f0-9]{64}$/),
  protocolVersion: z.literal(1),
})
export class ServerManager {
  private processes = new Map<string, ChildProcessWithoutNullStreams>()
  private states = new Map<string, ServerStatus>()
  private logs = new Map<string, string[]>()
  private busy = new Set<string>()
  private launching = false
  private java = 'java'
  constructor(readonly store: WorldStore) {}
  async initialize() {
    try {
      this.java = z
        .object({ java: z.string().min(1) })
        .parse(
          JSON.parse(
            await readFile(join(this.store.root, 'settings.json'), 'utf8'),
          ),
        ).java
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
  async setJava(path: string) {
    await run(path, ['-version'], { timeout: 10000 })
    await atomicJson(join(this.store.root, 'settings.json'), { java: path })
    this.java = path
  }
  async javaVersion() {
    try {
      const result = await run(this.java, ['-version'], { timeout: 10000 })
      return (result.stderr || result.stdout).split('\n')[0]
    } catch {
      return null
    }
  }
  status(id: string): ServerStatus {
    return this.states.get(id) ?? 'offline'
  }
  serverLogs(id: string) {
    this.store.worldPath(id)
    return [...(this.logs.get(id) ?? [])]
  }
  private log(id: string, message: string) {
    const lines = this.logs.get(id) ?? []
    lines.push(...message.split(/\r?\n/).filter(Boolean))
    this.logs.set(id, lines.slice(-400))
  }
  private async exclusive<T>(id: string, action: () => Promise<T>): Promise<T> {
    this.store.worldPath(id)
    if (this.busy.has(id))
      throw new Error('Another operation is in progress for this world.')
    this.busy.add(id)
    try {
      return await action()
    } finally {
      this.busy.delete(id)
    }
  }
  private async argsPath(id: string) {
    const world = await this.store.get(id)
    if (world.environment.loader !== 'forge')
      throw new Error('This milestone supports Forge servers only.')
    const platform = process.platform === 'win32' ? 'win' : 'unix'
    return join(
      'libraries',
      'net',
      'minecraftforge',
      'forge',
      `${world.environment.minecraft}-${world.environment.loaderVersion}`,
      `${platform}_args.txt`,
    )
  }
  private runtimePath(id: string) {
    return join(this.store.worldPath(id), 'runtime.json')
  }
  private async assertNoOrphan(id: string) {
    let pid: number
    try {
      pid = z
        .object({ pid: z.number().int().positive() })
        .parse(JSON.parse(await readFile(this.runtimePath(id), 'utf8'))).pid
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
      throw error
    }
    let alive = true
    try {
      process.kill(pid, 0)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') alive = false
      else throw error
    }
    if (alive)
      throw new Error(
        `A previous server process (PID ${pid}) is still running. Stop it before hosting or checkpointing this world.`,
      )
    await rm(this.runtimePath(id), { force: true })
  }
  async view(id: string): Promise<WorldView> {
    const world = await this.store.get(id)
    let configured = false
    try {
      await access(join(this.store.serverPath(id), await this.argsPath(id)))
      configured = true
    } catch {}
    return {
      ...world,
      status: this.status(id),
      configured,
      checkpointCount: (await this.store.checkpoints(id)).length,
    }
  }
  async list() {
    return Promise.all(
      (await this.store.list()).map((world) => this.view(world.id)),
    )
  }
  async importServer(id: string, directory: string) {
    return this.exclusive(id, async () => {
      if (this.status(id) !== 'offline')
        throw new Error('Stop the server before importing.')
      const destination = this.store.serverPath(id)
      // Imports are intentionally one-time so a different installation cannot overwrite world progress.
      if ((await readdir(destination)).length)
        throw new Error(
          'This profile already contains files. Create a new profile to import another server.',
        )
      const from = resolve(directory),
        to = resolve(destination)
      for (const [parent, child] of [
        [from, to],
        [to, from],
      ]) {
        const rel = relative(parent, child)
        if (
          !rel ||
          (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))
        )
          throw new Error('Choose an external server installation.')
      }
      const args = await this.argsPath(id)
      await access(join(from, args))
      const staging = join(this.store.worldPath(id), 'import.partial')
      await rm(staging, { recursive: true, force: true })
      try {
        await cp(from, staging, {
          recursive: true,
          filter: async (path) => {
            if ((await lstat(path)).isSymbolicLink())
              throw new Error('Server imports cannot contain symbolic links.')
            return !relative(from, path)
              .split(sep)
              .some((part) =>
                ['logs', 'crash-reports', '.launchstone'].includes(part),
              )
          },
        })
        const mods = []
        let entries: string[] = []
        try {
          entries = await readdir(join(staging, 'mods'))
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        }
        for (const name of entries.sort())
          if (name.endsWith('.jar'))
            mods.push({
              name,
              sha256: await hashFile(join(staging, 'mods', name)),
            })
        const world = await this.store.get(id)
        // Directory is empty; commit the copied installation only after validation completes.
        const { rename } = await import('node:fs/promises')
        await rm(destination, { recursive: true })
        await rename(staging, destination)
        await atomicJson(join(this.store.worldPath(id), 'manifest.json'), {
          ...world,
          updatedAt: new Date().toISOString(),
          environment: { ...world.environment, mods },
        })
      } finally {
        await rm(staging, { recursive: true, force: true })
      }
    })
  }
  async start(id: string) {
    if (this.launching) throw new Error('Another server is being started.')
    this.launching = true
    try {
      return await this.exclusive(id, async () => {
        if (this.status(id) !== 'offline')
          throw new Error('This world is already active.')
        await this.assertNoOrphan(id)
        const world = await this.store.get(id)
        if (
          [...this.processes.keys()].some(
            (other) => other !== id && this.status(other) !== 'offline',
          )
        )
          throw new Error(
            'Only one local server can run in this first version.',
          )
        const directory = this.store.serverPath(id)
        const args = await this.argsPath(id)
        await access(join(directory, args))
        const version = await this.javaVersion()
        const major = version?.match(/version "(\d+)/)?.[1]
        if (Number(major) !== world.environment.javaMajor)
          throw new Error(
            `This profile requires Java ${world.environment.javaMajor}. Select that Java executable in Settings.`,
          )
        const eula = await readFile(join(directory, 'eula.txt'), 'utf8').catch(
          () => '',
        )
        if (!/^\s*eula\s*=\s*true\s*$/m.test(eula))
          throw new Error(
            'Accept the Minecraft EULA in this server’s eula.txt before hosting.',
          )
        const expectedMods = world.environment.mods
        let actualMods: string[] = []
        try {
          actualMods = (await readdir(join(directory, 'mods')))
            .filter((name) => name.endsWith('.jar'))
            .sort()
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        }
        if (
          actualMods.join('\n') !==
          expectedMods
            .map((mod) => mod.name)
            .sort()
            .join('\n')
        )
          throw new Error(
            'The mod list has changed since import. Create a new profile with the updated environment.',
          )
        for (const mod of expectedMods)
          if (
            (await hashFile(join(directory, 'mods', mod.name))) !== mod.sha256
          )
            throw new Error(`Mod checksum changed: ${mod.name}`)
        const properties = await readFile(
          join(directory, 'server.properties'),
          'utf8',
        ).catch(() => '')
        const port =
          properties.match(/^\s*server-port\s*=\s*(\d+)\s*$/m)?.[1] ?? '25565'
        if (Number(port) !== world.port)
          throw new Error(
            `server.properties uses port ${port}; this profile is locked to ${world.port}.`,
          )
        this.logs.set(id, [])
        this.states.set(id, 'starting')
        await rm(join(directory, '.launchstone', 'bridge.json'), {
          force: true,
        })
        const child = spawn(
          this.java,
          [`-Xms512M`, `-Xmx${world.memoryMb}M`, `@${args}`, 'nogui'],
          { cwd: directory, windowsHide: true, stdio: 'pipe' },
        )
        // Record the child PID synchronously before yielding, so a desktop restart
        // cannot mistake an orphaned Java server for a stopped world.
        if (child.pid) {
          try {
            writeFileSync(
              this.runtimePath(id),
              JSON.stringify({ pid: child.pid }),
              { mode: 0o600 },
            )
          } catch (error) {
            child.kill()
            this.states.set(id, 'offline')
            throw error
          }
        }
        this.processes.set(id, child)
        child.stdin.on('error', (error) =>
          this.log(id, `Server input closed: ${error.message}`),
        )
        let pending = ''
        child.stdout.on('data', (chunk: Buffer) => {
          const output = chunk.toString()
          this.log(id, output)
          pending = (pending + output).slice(-4096)
          if (
            /Done \([\d.,]+s\)!/.test(pending) &&
            this.status(id) === 'starting'
          )
            this.states.set(id, 'running')
        })
        child.stderr.on('data', (chunk: Buffer) =>
          this.log(id, chunk.toString()),
        )
        child.on('error', (error) =>
          this.log(id, `Unable to launch Java: ${error.message}`),
        )
        child.on('close', (code) => {
          rmSync(this.runtimePath(id), { force: true })
          this.processes.delete(id)
          this.states.set(id, 'offline')
          this.log(id, `Server stopped (exit ${code ?? 'signal'}).`)
        })
        await new Promise<void>((resolve, reject) => {
          child.once('spawn', resolve)
          child.once('error', reject)
        }).catch((error) => {
          this.processes.delete(id)
          this.states.set(id, 'offline')
          throw error
        })
      })
    } finally {
      this.launching = false
    }
  }
  async stop(id: string) {
    return this.exclusive(id, async () => {
      const child = this.processes.get(id)
      if (!child) throw new Error('This server is not running.')
      this.states.set(id, 'stopping')
      child.stdin.write('stop\n')
    })
  }
  async checkpoint(id: string) {
    return this.exclusive(id, async () => {
      if (this.status(id) !== 'offline')
        throw new Error(
          'Stop the server before creating a consistent checkpoint.',
        )
      await this.assertNoOrphan(id)
      if (!(await this.view(id)).configured)
        throw new Error('Import a server installation first.')
      this.states.set(id, 'checkpointing')
      try {
        return await this.store.checkpoint(id)
      } finally {
        this.states.set(id, 'offline')
      }
    })
  }
  async companion(id: string): Promise<BridgeStatus | null> {
    if (!this.processes.has(id)) return null
    try {
      const descriptor = Descriptor.parse(
        JSON.parse(
          await readFile(
            join(this.store.serverPath(id), '.launchstone', 'bridge.json'),
            'utf8',
          ),
        ),
      )
      const response = await fetch(
        `http://127.0.0.1:${descriptor.port}/v1/status`,
        {
          headers: { Authorization: `Bearer ${descriptor.token}` },
          signal: AbortSignal.timeout(2000),
          redirect: 'error',
        },
      )
      if (!response.ok) return null
      const result = BridgeStatus.parse(await response.json())
      const world = await this.store.get(id)
      if (
        result.minecraft !== world.environment.minecraft ||
        result.loaderVersion !== world.environment.loaderVersion
      )
        throw new Error(
          'Companion environment does not match the world manifest.',
        )
      return result
    } catch (error) {
      if (
        error instanceof Error &&
        error.message ===
          'Companion environment does not match the world manifest.'
      )
        throw error
      return null
    }
  }
  hasActiveServers() {
    return this.processes.size > 0
  }
}
