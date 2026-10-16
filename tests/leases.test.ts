import { describe, expect, it } from 'vitest'
import { LeaseRegistry } from '../shared/leases'

describe('host lease fencing', () => {
  it('allows only one active host and rejects a disconnected host after takeover', () => {
    const registry = new LeaseRegistry()
    const first = registry.acquire('world', 'alice', 0, 100)
    expect(() => registry.acquire('world', 'bob', 50, 100)).toThrow(
      'already has a host',
    )
    const next = registry.acquire('world', 'bob', 101, 100)
    expect(next.token).toBeGreaterThan(first.token)
    expect(() =>
      registry.assertOwner('world', 'alice', first.token, 102),
    ).toThrow('stale')
    expect(() =>
      registry.renew('world', 'alice', first.token, 102, 100),
    ).toThrow('stale')
    expect(() =>
      registry.assertOwner('world', 'bob', next.token, 102),
    ).not.toThrow()
  })
  it('never reuses a fencing token after a voluntary release', () => {
    const registry = new LeaseRegistry()
    const first = registry.acquire('world', 'alice', 0, 100)
    registry.release('world', 'alice', first.token, 1)
    const next = registry.acquire('world', 'alice', 2, 100)
    expect(next.token).toBe(first.token + 1)
    expect(() =>
      registry.assertOwner('world', 'alice', first.token, 3),
    ).toThrow()
  })
  it('requires renewal before expiry and validates durations', () => {
    const registry = new LeaseRegistry()
    const lease = registry.acquire('world', 'alice', 0, 100)
    expect(
      registry.renew('world', 'alice', lease.token, 50, 100).expiresAt,
    ).toBe(150)
    expect(() =>
      registry.renew('world', 'alice', lease.token, 150, 100),
    ).toThrow()
    expect(() => registry.acquire('other', 'alice', 0, -1)).toThrow('Invalid')
  })
})
