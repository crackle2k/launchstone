import { Cloud, Code2, FolderOpen, HardDrive, Settings2 } from 'lucide-react'
import type { DesktopInfo } from '../../shared/contracts'
import { Badge } from './WorldArt'

export default function LauncherSettings({
  info,
  busy,
  onSelectJava,
}: {
  info: DesktopInfo | null
  busy: boolean
  onSelectJava: () => Promise<void>
}) {
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">
          <Settings2 size={13} />
          LAUNCHER PREFERENCES
        </div>
        <h1>Settings</h1>
        <p>Everything you need to make yourself at home.</p>
      </div>
      <div className="settings-layout">
        <section className="panel settings-panel">
          <div className="settings-icon">
            <Code2 size={23} />
          </div>
          <div>
            <h2>Java runtime</h2>
            <p>
              Forge 1.20.1 uses Java 17. Choose the executable from your Java
              installation.
            </p>
            <code>{info?.javaVersion ?? 'Java was not found on PATH.'}</code>
            <button
              className="button secondary"
              disabled={busy}
              onClick={onSelectJava}
            >
              <FolderOpen size={16} />
              Choose Java executable
            </button>
          </div>
        </section>
        <section className="panel settings-panel">
          <div className="settings-icon">
            <HardDrive size={23} />
          </div>
          <div>
            <h2>Storage</h2>
            <p>Your world files and checkpoints are saved on this computer.</p>
            <code className="path">{info?.dataDirectory ?? 'Loading…'}</code>
            <span className="setting-caption">
              World profiles and saved checkpoints persist between sessions.
            </span>
          </div>
        </section>
        <section className="panel settings-panel">
          <div className="settings-icon">
            <Cloud size={23} />
          </div>
          <div>
            <div className="settings-title">
              <h2>Shared hosting</h2>
              <Badge>Coming later</Badge>
            </div>
            <p>
              Cloud storage and automatic host handoff are not connected yet.
              Your worlds and checkpoints stay local.
            </p>
          </div>
        </section>
      </div>
    </>
  )
}
