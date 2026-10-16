import { useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronRight,
  Cloud,
  Coffee,
  Computer,
  FolderOpen,
  Grid2X2,
  HardDrive,
  List,
  LoaderCircle,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  X,
} from 'lucide-react'
import type { DesktopInfo, WorldView } from '../../shared/contracts'
import { Badge, Landscape, WorldIcon } from './WorldArt'

type Filter = 'all' | 'ready' | 'running'
export default function WorldLibrary({
  worlds,
  loaded,
  busy,
  info,
  onCreate,
  onSelect,
  onSettings,
  onHost,
}: {
  worlds: WorldView[]
  loaded: boolean
  busy: boolean
  info: DesktopInfo | null
  onCreate: () => void
  onSelect: (id: string) => void
  onSettings: () => void
  onHost: (id: string) => Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const javaReady = !!info?.javaVersion?.match(/version "17\./)
  const visible = worlds.filter(
    (world) =>
      world.name.toLowerCase().includes(query.toLowerCase()) &&
      (filter === 'all' ||
        (filter === 'ready' ? world.configured : world.status === 'running')),
  )
  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All worlds', count: worlds.length },
    {
      id: 'ready',
      label: 'Ready to host',
      count: worlds.filter((world) => world.configured).length,
    },
    {
      id: 'running',
      label: 'Running',
      count: worlds.filter((world) => world.status === 'running').length,
    },
  ]
  return (
    <>
      <div className="page-heading library-heading">
        <div>
          <h1>
            Let’s play<span className="accent">.</span>
          </h1>
          <p>Your worlds. Your friends. Your next adventure.</p>
        </div>
        <span className="edition-label">
          <span className="edition-cube">
            <WorldIcon variant={0} />
          </span>
          JAVA EDITION<small>FORGE 1.20.1</small>
        </span>
      </div>
      <div className={`launcher-overview ${worlds.length ? 'has-worlds' : ''}`}>
        <section className="welcome-banner">
          <Landscape />
          <div className="welcome-content">
            <span className="eyebrow">
              <span className="online-dot" />
              THIS IS YOUR WORLD
            </span>
            <h2>
              Great adventures.
              <br />
              Even better company.
            </h2>
            <p>Give your next Minecraft world a place to call home.</p>
            <button className="button primary" onClick={onCreate}>
              <Plus size={17} />
              Create a world
              <ArrowRight size={16} />
            </button>
          </div>
          <span className="banner-caption">THE OVERWORLD · A FRESH START</span>
        </section>
        <aside className="setup-card">
          <div className="setup-card-title">
            <h2>Your setup</h2>
            <span className="outline-tag">LOCAL</span>
          </div>
          <div className="setup-item">
            <span className="setup-item-icon">
              <Coffee size={19} />
            </span>
            <div>
              <strong>Java runtime</strong>
              <small>
                {javaReady
                  ? 'Java 17 detected'
                  : info
                    ? 'Java 17 required'
                    : 'Checking runtime…'}
              </small>
            </div>
            <span className={javaReady ? 'setup-ready' : 'setup-attention'}>
              {javaReady ? <Check size={16} /> : <span>!</span>}
            </span>
          </div>
          <div className="setup-item">
            <span className="setup-item-icon">
              <HardDrive size={19} />
            </span>
            <div>
              <strong>World storage</strong>
              <small>Saved on this computer</small>
            </div>
            <span className="setup-ready">
              <Check size={16} />
            </span>
          </div>
          <button className="setup-settings" onClick={onSettings}>
            <Settings2 size={14} />
            Launcher settings
            <ChevronRight size={15} />
          </button>
          <div className="cloud-note">
            <Cloud size={17} />
            <span>
              Shared hosting is on the horizon.
              <small>Local hosting is available now.</small>
            </span>
          </div>
        </aside>
      </div>
      <section className="library-section" aria-label="World library">
        <div className="section-title">
          <h2>
            Your worlds<span className="count-pill">{worlds.length}</span>
          </h2>
          <button className="button secondary compact" onClick={onCreate}>
            <Plus size={15} />
            New world
          </button>
        </div>
        <div className="library-toolbar">
          <div className="filter-tabs" aria-label="Filter worlds">
            {filters.map((item) => (
              <button
                key={item.id}
                aria-pressed={filter === item.id}
                className={filter === item.id ? 'selected' : ''}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
                <span>{item.count}</span>
              </button>
            ))}
          </div>
          <div className="library-tools">
            <label className="search-field">
              <Search size={15} />
              <input
                aria-label="Search worlds"
                placeholder="Search worlds…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button aria-label="Clear search" onClick={() => setQuery('')}>
                  <X size={13} />
                </button>
              )}
            </label>
            <div className="view-switch">
              <button
                aria-label="Grid view"
                aria-pressed={layout === 'grid'}
                className={layout === 'grid' ? 'selected' : ''}
                onClick={() => setLayout('grid')}
              >
                <Grid2X2 size={16} />
              </button>
              <button
                aria-label="List view"
                aria-pressed={layout === 'list'}
                className={layout === 'list' ? 'selected' : ''}
                onClick={() => setLayout('list')}
              >
                <List size={17} />
              </button>
            </div>
          </div>
        </div>
        {!loaded ? (
          <div className="empty-state">
            <LoaderCircle className="spin" />
            <h3>Opening your worlds…</h3>
          </div>
        ) : worlds.length === 0 ? (
          <div className="empty-state">
            <div className="empty-world-icon">
              <WorldIcon />
            </div>
            <h3>Make room for a new world.</h3>
            <p>
              Your next adventure starts with a world profile.
              <br />
              Create one, then bring your Forge server along.
            </p>
            <button className="button primary" onClick={onCreate}>
              <Plus size={16} />
              Create your first world
            </button>
            <span className="empty-hint">
              <ShieldCheck size={13} />
              Your files stay on your computer.
            </span>
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state filtered-empty">
            <Search size={29} />
            <h3>No worlds found</h3>
            <p>Try another name or choose a different filter.</p>
            <button
              className="button secondary"
              onClick={() => {
                setQuery('')
                setFilter('all')
              }}
            >
              Show all worlds
            </button>
          </div>
        ) : (
          <div
            className={`world-grid ${layout === 'list' ? 'list-layout' : ''}`}
          >
            {visible.map((item) => {
              const index = worlds.findIndex((world) => world.id === item.id)
              const active = item.status !== 'offline'
              return (
                <article className="world-card" key={item.id}>
                  <button
                    className="card-main"
                    aria-label={`Open ${item.name}`}
                    onClick={() => onSelect(item.id)}
                  >
                    <div className="card-art">
                      <Landscape variant={index + 1} />
                      <Badge live={item.status === 'running'}>
                        {item.status}
                      </Badge>
                    </div>
                    <div className="card-identity">
                      <span className="world-icon">
                        <WorldIcon variant={index} />
                      </span>
                      <div>
                        <h3>{item.name}</h3>
                        <p>
                          <span className="loader-icon">F</span>Forge{' '}
                          {item.environment.minecraft}
                          <span>·</span>
                          {item.environment.mods.length} mods
                        </p>
                      </div>
                    </div>
                  </button>
                  <div className="card-footer">
                    <span>
                      <HardDrive size={12} />
                      {item.checkpointCount}{' '}
                      {item.checkpointCount === 1
                        ? 'checkpoint'
                        : 'checkpoints'}
                    </span>
                    <div>
                      <button
                        className="icon-button"
                        aria-label={`Manage ${item.name}`}
                        title="World settings"
                        onClick={() => onSelect(item.id)}
                      >
                        <Settings2 size={15} />
                      </button>
                      <button
                        className={`button ${item.configured && !active ? 'primary' : 'secondary'} compact`}
                        disabled={busy}
                        onClick={() =>
                          item.configured && !active
                            ? void onHost(item.id)
                            : onSelect(item.id)
                        }
                      >
                        {item.configured && !active ? (
                          <Play size={13} fill="currentColor" />
                        ) : (
                          <FolderOpen size={13} />
                        )}
                        {active
                          ? 'Manage'
                          : item.configured
                            ? 'Host'
                            : 'Set up'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
            <button className="new-world-card" onClick={onCreate}>
              <span>
                <Plus size={22} />
              </span>
              <strong>Add a world</strong>
              <small>A new place to play.</small>
            </button>
          </div>
        )}
      </section>
      <div className="library-bottom-note">
        <Computer size={15} />
        <span>Hosted by you. Saved for your next session.</span>
        <span>Made for Minecraft Java Edition</span>
      </div>
    </>
  )
}
