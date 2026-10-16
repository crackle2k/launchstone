import { useEffect, useState, type ReactNode } from 'react'
import {
  ArrowDownToLine,
  ArrowLeft,
  Box,
  Check,
  Cpu,
  FolderOpen,
  Globe2,
  HardDrive,
  Layers3,
  Plus,
  Radio,
  ShieldCheck,
  Square,
  Terminal,
  Users,
  Cloud,
} from 'lucide-react'
import type {
  WorldView,
  Checkpoint,
  BridgeStatus,
} from '../../shared/contracts'
import { errorMessage, size, date } from '../lib/format'
import { Landscape, Badge } from './WorldArt'
const api = window.launchstone

export default function WorldDetail({
  world,
  busy,
  action,
  onBack,
}: {
  world: WorldView
  busy: boolean
  action: (task: () => Promise<unknown>, success?: string) => Promise<void>
  onBack: () => void
}) {
  const [tab, setTab] = useState<'overview' | 'console' | 'checkpoints'>(
    'overview',
  )
  const [logs, setLogs] = useState<string[]>([])
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [companion, setCompanion] = useState<BridgeStatus | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  useEffect(() => {
    let active = true,
      pending = false
    async function update() {
      if (pending) return
      pending = true
      try {
        const [logs, checkpoints, companion] = await Promise.all([
          api.serverLogs(world.id),
          api.listCheckpoints(world.id),
          api.companionStatus(world.id),
        ])
        if (active) {
          setLogs(logs)
          setCheckpoints(checkpoints)
          setCompanion(companion)
          setDetailError(null)
        }
      } catch (error) {
        if (active) setDetailError(errorMessage(error))
      } finally {
        pending = false
      }
    }
    void update()
    const timer = setInterval(update, 2000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [world.id])
  const offline = world.status === 'offline'
  return (
    <>
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={15} />
        All worlds
      </button>
      <div className="detail-hero">
        <Landscape />
        <div className="detail-hero-content">
          <Badge live={world.status === 'running'}>{world.status}</Badge>
          <h1>{world.name}</h1>
          <p>
            Forge {world.environment.loaderVersion} <span>·</span> Minecraft{' '}
            {world.environment.minecraft}
          </p>
        </div>
        <span className="hero-local">
          <HardDrive size={15} />
          Local world
        </span>
      </div>
      <div className="detail-actions">
        <span>
          <ShieldCheck size={16} />
          Environment locked <span className="muted">· Protocol v1</span>
        </span>
        <div>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => action(() => api.openWorldFolder(world.id))}
          >
            <FolderOpen size={16} />
            World files
          </button>
          {!world.configured ? (
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                action(
                  () => api.importServer(world.id),
                  'Server imported. Its mod checksums are now locked.',
                )
              }
            >
              <ArrowDownToLine size={16} />
              Import Forge server
            </button>
          ) : (
            <button
              className={`button ${offline ? 'primary' : 'secondary'}`}
              disabled={
                busy ||
                world.status === 'stopping' ||
                world.status === 'checkpointing'
              }
              onClick={() =>
                action(() =>
                  offline
                    ? api.startServer(world.id)
                    : api.stopServer(world.id),
                )
              }
            >
              {offline ? <Radio size={16} /> : <Square size={15} />}
              {offline
                ? 'Start hosting'
                : world.status === 'stopping'
                  ? 'Saving & stopping…'
                  : 'Stop server'}
            </button>
          )}
        </div>
      </div>
      <div className="tabs">
        {(['overview', 'console', 'checkpoints'] as const).map((value) => (
          <button
            key={value}
            className={tab === value ? 'selected' : ''}
            onClick={() => setTab(value)}
          >
            {value === 'overview' ? (
              <Layers3 size={16} />
            ) : value === 'console' ? (
              <Terminal size={16} />
            ) : (
              <HardDrive size={16} />
            )}
            {value[0].toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>
      {detailError && (
        <p role="alert" className="message error">
          {detailError}
        </p>
      )}
      {tab === 'overview' && (
        <>
          {!world.configured && (
            <section className="panel setup-panel">
              <span className="setup-number">01</span>
              <div>
                <h2>Bring your server along.</h2>
                <p>
                  Install Forge {world.environment.loaderVersion} for Minecraft{' '}
                  {world.environment.minecraft} in a separate folder, add the
                  Launchstone companion JAR to its mods folder, then import that
                  folder. Stop the source server before importing.
                </p>
                <p className="muted">
                  The import copies your installation. Java 17 and an accepted
                  Minecraft EULA are required to start it.
                </p>
              </div>
            </section>
          )}
          <div className="stats-grid">
            <Stat
              icon={<Cpu />}
              label="Memory budget"
              value={`${world.memoryMb / 1024} GB`}
            />
            <Stat
              icon={<Globe2 />}
              label="Server port"
              value={String(world.port)}
            />
            <Stat
              icon={<Box />}
              label="Locked mods"
              value={String(world.environment.mods.length)}
            />
            <Stat
              icon={<Users />}
              label="Players online"
              value={
                companion
                  ? `${companion.players} / ${companion.maxPlayers}`
                  : '—'
              }
            />
          </div>
          <div className="detail-grid">
            <section className="panel">
              <h2>
                <Radio size={18} />
                Companion connection
              </h2>
              <Badge live={!!companion}>
                {companion ? 'Connected' : 'Not connected'}
              </Badge>
              <p>
                {companion
                  ? `Java companion ${companion.companionVersion} is reporting server status over authenticated localhost HTTP.`
                  : 'The Forge companion connects when the server starts. Install its JAR before importing the server.'}
              </p>
            </section>
            <section className="panel">
              <h2>
                <Cloud size={18} />
                Shared storage
              </h2>
              <Badge>Not connected</Badge>
              <p>
                This world is stored locally. Remote syncing, invitations, and
                automatic host handoff are not available in this build.
              </p>
            </section>
          </div>
        </>
      )}
      {tab === 'console' && (
        <section className="console-panel">
          <div>
            <Terminal size={15} />
            Server output<span>Last 400 lines</span>
          </div>
          <pre aria-label="Server console">
            {logs.length
              ? logs.join('\n')
              : 'Server output will appear here when you start hosting.'}
          </pre>
        </section>
      )}
      {tab === 'checkpoints' && (
        <section className="panel">
          <div className="section-title">
            <div>
              <h2>World checkpoints</h2>
              <p>
                A complete local copy with SHA-256 checksums. Stop the server
                before creating one.
              </p>
            </div>
            <button
              className="button secondary"
              disabled={busy || !offline || !world.configured}
              onClick={() =>
                action(
                  () => api.createCheckpoint(world.id),
                  'Checkpoint saved and checksummed on this computer.',
                )
              }
            >
              <Plus size={16} />
              Save checkpoint
            </button>
          </div>
          {checkpoints.length ? (
            <div className="checkpoint-list">
              {checkpoints.map((item) => (
                <div key={item.id}>
                  <HardDrive size={20} />
                  <div>
                    <strong>{date(item.createdAt)}</strong>
                    <small>
                      {item.fileCount} files · {size(item.bytes)} ·{' '}
                      {item.environment.loader} {item.environment.minecraft}
                    </small>
                  </div>
                  <span className="outline-tag">
                    <Check size={13} />
                    Saved locally
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="checkpoint-empty">
              <HardDrive size={25} />
              <h3>No checkpoints yet</h3>
              <p>
                After your first session, stop the server and save a checkpoint.
              </p>
            </div>
          )}
        </section>
      )}
    </>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="stat">
      <span>
        {icon}
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  )
}
