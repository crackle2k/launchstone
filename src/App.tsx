import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowRight,
  Box,
  Check,
  ChevronRight,
  Cloud,
  Code2,
  FolderOpen,
  HardDrive,
  Layers3,
  Leaf,
  LoaderCircle,
  Mountain,
  Plus,
  Radio,
  Settings2,
  Users,
  X,
} from 'lucide-react'
import type { DesktopInfo, WorldView } from '../shared/contracts'
import { errorMessage } from './lib/format'
import { Landscape, Badge } from './components/WorldArt'
import WorldDetail from './components/WorldDetail'
import CreateWorldDialog from './components/CreateWorldDialog'
const api = window.launchstone

export default function App() {
  const [worlds, setWorlds] = useState<WorldView[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [page, setPage] = useState<'worlds' | 'settings'>('worlds')
  const [info, setInfo] = useState<DesktopInfo | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const world = worlds.find((item) => item.id === selected)
  const refreshing = useRef(false)
  const refresh = useCallback(async () => {
    if (refreshing.current) return
    refreshing.current = true
    try {
      setWorlds(await api.listWorlds())
      setLoaded(true)
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      refreshing.current = false
    }
  }, [])
  useEffect(() => {
    void refresh()
    api
      .info()
      .then(setInfo)
      .catch((error) => setError(errorMessage(error)))
    const timer = setInterval(refresh, 2000)
    return () => clearInterval(timer)
  }, [refresh])
  async function action(task: () => Promise<unknown>, success?: string) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const result = await task()
      if (success && result !== false) setNotice(success)
      await refresh()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Mountain size={23} strokeWidth={1.8} />
          </div>
          <span>
            launchstone<span className="brand-dot">.</span>
          </span>
        </div>
        <div className="workspace">
          <span className="avatar">L</span>
          <div>
            Personal workspace<small>Local development</small>
          </div>
          <span className="workspace-chevron">⌄</span>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          <button
            className={page === 'worlds' ? 'active' : ''}
            onClick={() => {
              setPage('worlds')
              setSelected(null)
            }}
          >
            <Layers3 size={18} />
            Your worlds<span className="nav-count">{worlds.length}</span>
          </button>
          <button
            className={page === 'settings' ? 'active' : ''}
            onClick={() => setPage('settings')}
          >
            <Settings2 size={18} />
            Settings
          </button>
        </nav>
        <div className="sidebar-note">
          <Cloud size={20} />
          <strong>A world worth sharing.</strong>
          <p>
            Your machine hosts the adventure. Shared storage and host handoff
            are coming next.
          </p>
          <span className="small-label">FOUNDATION BUILD</span>
        </div>
        <div className="sidebar-bottom">
          <span className="avatar small">D</span>
          <div>
            This computer<small>Local host</small>
          </div>
          <span className="online-dot" />
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {page === 'settings'
                ? 'Settings'
                : world
                  ? world.name
                  : 'Your worlds'}
            </strong>
          </div>
          <span className="build-tag">
            v{info?.appVersion ?? '0.2.0'} <span>EARLY ACCESS</span>
          </span>
        </header>
        <div className="content">
          {error && (
            <div role="alert" className="message error">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError(null)}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="message success">
              <Check size={16} />
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice(null)}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {page === 'settings' ? (
            <>
              <div className="page-heading">
                <div className="eyebrow">MAKE YOURSELF AT HOME</div>
                <h1>Settings</h1>
                <p>Your runtime, your files, your computer.</p>
              </div>
              <section className="panel settings-panel">
                <h2>
                  <Code2 size={18} />
                  Java runtime
                </h2>
                <p>
                  Forge 1.20.1 profiles require Java 17. Select the Java
                  executable from your Java 17 installation.
                </p>
                <code>
                  {info?.javaVersion ?? 'Java was not found on PATH.'}
                </code>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    action(async () => {
                      const changed = await api.selectJava()
                      if (changed) setInfo(await api.info())
                      return changed
                    }, 'Java runtime updated.')
                  }
                >
                  <FolderOpen size={16} />
                  Choose Java executable
                </button>
              </section>
              <section className="panel settings-panel">
                <h2>
                  <HardDrive size={18} />
                  Local storage
                </h2>
                <p>
                  World manifests, imported server files, and verified
                  checkpoints live here.
                </p>
                <code className="path">
                  {info?.dataDirectory ?? 'Loading…'}
                </code>
              </section>
              <section className="panel settings-panel">
                <h2>
                  <Cloud size={18} />
                  Shared hosting
                </h2>
                <p>
                  No coordination or cloud storage service is connected in this
                  build. Worlds and checkpoints stay on this computer.
                </p>
                <Badge>Not connected</Badge>
              </section>
            </>
          ) : world ? (
            <WorldDetail
              world={world}
              busy={busy}
              action={action}
              onBack={() => setSelected(null)}
            />
          ) : (
            <>
              <div className="page-heading heading-row">
                <div>
                  <div className="eyebrow">
                    GOOD WORLDS BRING PEOPLE TOGETHER
                  </div>
                  <h1>
                    Your next adventure
                    <br />
                    starts here<span className="accent">.</span>
                  </h1>
                  <p>A home for your Minecraft worlds. Built to be shared.</p>
                </div>
                <button
                  className="button primary"
                  onClick={() => setCreating(true)}
                >
                  <Plus size={18} />
                  Create a world
                </button>
              </div>
              <section className="intro-banner">
                <div className="banner-icon">
                  <Leaf size={25} />
                </div>
                <div>
                  <strong>Your world. Your people. Your hardware.</strong>
                  <p>
                    Set up a version-locked world and host it on this computer.
                  </p>
                </div>
                <span className="outline-tag">
                  <Radio size={13} />
                  Local hosting ready
                </span>
              </section>
              <div className="section-title">
                <h2>
                  Your worlds <span>{worlds.length}</span>
                </h2>
                <span className="muted">
                  {worlds.filter((world) => world.status === 'running').length}{' '}
                  running on this computer
                </span>
              </div>
              {!loaded ? (
                <div className="empty-state">
                  <LoaderCircle className="spin" />
                  <h3>Opening your workspace…</h3>
                </div>
              ) : worlds.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-illustration">
                    <Landscape />
                    <div className="empty-cube">
                      <Box size={31} />
                    </div>
                  </div>
                  <span className="small-label">A FRESH START</span>
                  <h3>Make room for a new world.</h3>
                  <p>
                    Create your first profile, import a Forge server,
                    <br />
                    and give your next adventure a place to live.
                  </p>
                  <button
                    className="button secondary"
                    onClick={() => setCreating(true)}
                  >
                    <Plus size={16} />
                    Create your first world
                  </button>
                </div>
              ) : (
                <div className="world-grid">
                  {worlds.map((item, i) => (
                    <button
                      className="world-card"
                      key={item.id}
                      onClick={() => setSelected(item.id)}
                    >
                      <div className="card-art">
                        <Landscape variant={i} />
                        <Badge live={item.status === 'running'}>
                          {item.status}
                        </Badge>
                        <span className="card-symbol">
                          <Box size={21} />
                        </span>
                      </div>
                      <div className="card-body">
                        <div className="card-title">
                          <h3>{item.name}</h3>
                          <ArrowRight size={17} />
                        </div>
                        <p>
                          <span className="loader-icon">F</span>Forge{' '}
                          <span>·</span> {item.environment.minecraft}
                        </p>
                        <div className="card-footer">
                          <span>
                            <HardDrive size={13} />
                            {item.checkpointCount} checkpoints
                          </span>
                          <span>
                            {item.configured ? 'Ready to host' : 'Setup needed'}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                  <button
                    className="new-world-card"
                    onClick={() => setCreating(true)}
                  >
                    <span>
                      <Plus size={24} />
                    </span>
                    <strong>Another adventure?</strong>
                    <small>Create a new world</small>
                  </button>
                </div>
              )}
              <div className="section-title roadmap-title">
                <h2>The path to shared worlds</h2>
                <span className="muted">What we're building</span>
              </div>
              <div className="feature-grid">
                <Feature
                  icon={<HardDrive />}
                  title="A solid foundation"
                  text="Version-locked profiles, local hosting, and checkpoints with file checksums."
                  current
                />
                <Feature
                  icon={<Cloud />}
                  title="Pick up where you left off"
                  text="Versioned shared storage, so the next host starts from the latest checkpoint."
                />
                <Feature
                  icon={<Users />}
                  title="Pass the world around"
                  text="One active host, coordinated handoffs, and automatic reconnect through the mod."
                />
              </div>
            </>
          )}
          <footer>
            <span>
              <Mountain size={14} />
              Made for the worlds you come back to.
            </span>
            <span>Forge 1.20.1 · Companion protocol v1</span>
          </footer>
        </div>
      </main>
      {creating && (
        <CreateWorldDialog
          busy={busy}
          onClose={() => setCreating(false)}
          onCreate={(input) =>
            action(async () => {
              const world = await api.createWorld(input)
              setSelected(world.id)
              setCreating(false)
            })
          }
        />
      )}
    </div>
  )
}

function Feature({
  icon,
  title,
  text,
  current = false,
}: {
  icon: ReactNode
  title: string
  text: string
  current?: boolean
}) {
  return (
    <div className="feature">
      <div className="feature-top">
        <span>{icon}</span>
        <span className={`small-label ${current ? 'accent' : ''}`}>
          {current ? 'AVAILABLE NOW' : 'UP NEXT'}
        </span>
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}
