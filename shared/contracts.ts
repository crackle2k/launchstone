import { z } from 'zod'

export const PROTOCOL_VERSION = 1 as const
export const WorldId = z.uuid()
export const Environment = z
  .object({
    minecraft: z.string().regex(/^[0-9]+\.[0-9]+(?:\.[0-9]+)?$/),
    loader: z.enum(['forge', 'fabric', 'neoforge']),
    loaderVersion: z
      .string()
      .trim()
      .max(80)
      .regex(/^[0-9]+(?:\.[0-9]+){1,3}(?:[-+][a-zA-Z0-9._-]+)?$/),
    javaMajor: z.number().int().min(17).max(99),
    companionVersion: z.literal('0.1.0'),
    protocolVersion: z.literal(PROTOCOL_VERSION),
    mods: z.array(
      z.object({
        name: z.string(),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
      }),
    ),
  })
  .strict()
export const CreateWorld = z
  .object({
    name: z.string().trim().min(1).max(64),
    environment: Environment,
    memoryMb: z.number().int().min(1024).max(32768),
    port: z.number().int().min(1024).max(65535),
  })
  .strict()
export const WorldManifest = CreateWorld.extend({
  schemaVersion: z.literal(1),
  id: WorldId,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type WorldManifest = z.infer<typeof WorldManifest>
export type CreateWorld = z.infer<typeof CreateWorld>
export type ServerStatus =
  'offline' | 'starting' | 'running' | 'stopping' | 'checkpointing'
export interface WorldView extends WorldManifest {
  status: ServerStatus
  configured: boolean
  checkpointCount: number
}
export interface Checkpoint {
  id: string
  worldId: string
  createdAt: string
  fileCount: number
  bytes: number
  environment: WorldManifest['environment']
  files: { path: string; sha256: string; bytes: number }[]
}
export const BridgeStatus = z.object({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  companionVersion: z.literal('0.1.0'),
  minecraft: z.string(),
  loader: z.literal('forge'),
  loaderVersion: z.string(),
  players: z.number().int().nonnegative(),
  maxPlayers: z.number().int().positive(),
})
export type BridgeStatus = z.infer<typeof BridgeStatus>
export interface DesktopInfo {
  dataDirectory: string
  appVersion: string
  javaVersion: string | null
}
export interface DesktopApi {
  info(): Promise<DesktopInfo>
  selectJava(): Promise<boolean>
  listWorlds(): Promise<WorldView[]>
  createWorld(input: CreateWorld): Promise<WorldView>
  importServer(id: string): Promise<boolean>
  startServer(id: string): Promise<void>
  stopServer(id: string): Promise<void>
  serverLogs(id: string): Promise<string[]>
  companionStatus(id: string): Promise<BridgeStatus | null>
  createCheckpoint(id: string): Promise<Checkpoint>
  listCheckpoints(id: string): Promise<Checkpoint[]>
  openWorldFolder(id: string): Promise<void>
}

export const DEFAULT_ENVIRONMENT: WorldManifest['environment'] = {
  minecraft: '1.20.1',
  loader: 'forge',
  loaderVersion: '47.4.0',
  javaMajor: 17,
  companionVersion: '0.1.0',
  protocolVersion: PROTOCOL_VERSION,
  mods: [],
}
