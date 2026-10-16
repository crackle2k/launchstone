import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Box,
  Check,
  ChevronRight,
  Computer,
  HardDrive,
  Layers3,
  Mountain,
  Settings2,
  X,
} from 'lucide-react'
import type { DesktopInfo, WorldView } from '../shared/contracts'
import { errorMessage } from './lib/format'
import WorldDetail from './components/WorldDetail'
import CreateWorldDialog from './components/CreateWorldDialog'
import WorldLibrary from './components/WorldLibrary'
import LauncherSettings from './components/LauncherSettings'
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
  const contentRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 })
  }, [page, selected])
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
  const running = worlds.filter((world) => world.status === 'running').length
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <button
          className="brand-mark"
          aria-label="Launchstone home"
          onClick={() => {
            setPage('worlds')
            setSelected(null)
          }}
        >
          <Mountain size={28} strokeWidth={2.5} />
        </button>
        <div className="rail-divider" />
        <nav>
          <button
            className={page === 'worlds' ? 'active' : ''}
            aria-label="Your worlds"
            title="Your worlds"
            aria-current={page === 'worlds' ? 'page' : undefined}
            onClick={() => {
              setPage('worlds')
              setSelected(null)
            }}
          >
            <Layers3 size={23} />
            <span>Worlds</span>
          </button>
        </nav>
        <div className="rail-bottom">
          <button
            className={page === 'settings' ? 'active' : ''}
            aria-label="Settings"
            title="Settings"
            aria-current={page === 'settings' ? 'page' : undefined}
            onClick={() => setPage('settings')}
          >
            <Settings2 size={23} />
            <span>Settings</span>
          </button>
          <span className="rail-avatar" title="Local workspace">
            <Computer size={20} />
          </span>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="app-location">
            <span className="brand-word">LAUNCHSTONE</span>
            <span className="topbar-divider" />
            <span>{page === 'settings' ? 'Settings' : 'Worlds'}</span>
            {world && page === 'worlds' && (
              <>
                <ChevronRight size={13} />
                <strong>{world.name}</strong>
              </>
            )}
          </div>
          <div className="topbar-right">
            <span className={`running-status ${running ? 'is-running' : ''}`}>
              <i />
              {running ? `${running} world running` : 'No worlds running'}
            </span>
            <span className="topbar-divider" />
            <span className="local-identity">
              <Computer size={16} />
              This computer
            </span>
          </div>
        </header>
        <div className="content" ref={contentRef}>
          {error && !creating && (
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
            <LauncherSettings
              info={info}
              busy={busy}
              onSelectJava={() =>
                action(async () => {
                  const changed = await api.selectJava()
                  if (changed) setInfo(await api.info())
                  return changed
                }, 'Java runtime updated.')
              }
            />
          ) : world ? (
            <WorldDetail
              key={world.id}
              world={world}
              busy={busy}
              action={action}
              onBack={() => setSelected(null)}
            />
          ) : (
            <WorldLibrary
              worlds={worlds}
              loaded={loaded}
              busy={busy}
              info={info}
              onCreate={() => setCreating(true)}
              onSelect={setSelected}
              onSettings={() => setPage('settings')}
              onHost={(id) =>
                action(async () => {
                  await api.startServer(id)
                  setSelected(id)
                })
              }
            />
          )}
        </div>
        <footer className="app-statusbar">
          <span>
            <Box size={12} />
            Minecraft Java Edition<span className="statusbar-separator">/</span>
            Forge 1.20.1
          </span>
          <span>
            <HardDrive size={12} />
            Local storage<span className="statusbar-separator">·</span>
            Launchstone {info?.appVersion ?? '0.2.0'}
          </span>
        </footer>
      </main>
      {creating && (
        <CreateWorldDialog
          busy={busy}
          error={error}
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
