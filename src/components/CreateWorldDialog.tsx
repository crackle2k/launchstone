import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Box, X, ShieldCheck, LoaderCircle, Plus } from 'lucide-react'
import { DEFAULT_ENVIRONMENT, type CreateWorld } from '../../shared/contracts'

export default function CreateWorldDialog({
  busy,
  onClose,
  onCreate,
}: {
  busy: boolean
  onClose: () => void
  onCreate: (input: CreateWorld) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [loader, setLoader] = useState(DEFAULT_ENVIRONMENT.loaderVersion)
  const [memory, setMemory] = useState(4096)
  const [port, setPort] = useState(25565)
  const nameRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    nameRef.current?.focus()
  }, [])
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [busy, onClose])
  async function submit(event: FormEvent) {
    event.preventDefault()
    await onCreate({
      name,
      environment: { ...DEFAULT_ENVIRONMENT, loaderVersion: loader },
      memoryMb: memory,
      port,
    })
  }
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-title"
      >
        <button
          className="modal-close"
          aria-label="Close dialog"
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <span className="modal-icon">
          <Box size={26} />
        </span>
        <div className="eyebrow">EVERY ADVENTURE NEEDS A HOME</div>
        <h2 id="create-title">Create your world</h2>
        <p>Start with a profile. Bring your server files next.</p>
        <form onSubmit={submit}>
          <label>
            World name
            <input
              ref={nameRef}
              placeholder="The weekend world"
              value={name}
              required
              maxLength={64}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <div className="form-grid">
            <label>
              Minecraft version
              <input value="1.20.1" readOnly />
            </label>
            <label>
              Mod loader
              <input value="Forge" readOnly />
            </label>
          </div>
          <label>
            Forge version
            <input
              value={loader}
              required
              pattern="47\.[0-9]+\.[0-9]+"
              title="Forge 1.20.1 version, for example 47.4.0"
              onChange={(event) => setLoader(event.target.value)}
            />
            <small>Must match the Forge server folder you import.</small>
          </label>
          <div className="form-grid">
            <label>
              Memory
              <select
                value={memory}
                onChange={(event) => setMemory(Number(event.target.value))}
              >
                {[2048, 4096, 6144, 8192, 12288, 16384].map((value) => (
                  <option key={value} value={value}>
                    {value / 1024} GB
                  </option>
                ))}
              </select>
            </label>
            <label>
              Port
              <input
                type="number"
                min={1024}
                max={65535}
                value={port}
                required
                onChange={(event) => setPort(Number(event.target.value))}
              />
            </label>
          </div>
          <div className="form-note">
            <ShieldCheck size={17} />
            <span>
              We lock the environment so future hosts can run the same world
              consistently.
            </span>
          </div>
          <button
            className="button primary full"
            disabled={busy || !name.trim()}
          >
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Plus size={17} />
            )}
            Create world profile
          </button>
        </form>
      </section>
    </div>
  )
}
