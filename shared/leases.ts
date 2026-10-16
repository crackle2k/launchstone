// Coordination-domain primitive, not a deployed coordination service.
// Fencing tokens must be durable and checked on EVERY checkpoint publication.
export interface Lease {
  holder: string
  token: number
  expiresAt: number
}
export class LeaseRegistry {
  private records = new Map<string, { counter: number; lease: Lease | null }>()
  acquire(world: string, holder: string, now: number, ttl: number): Lease {
    if (!Number.isFinite(ttl) || ttl <= 0)
      throw new Error('Invalid lease duration')
    const record = this.records.get(world) ?? { counter: 0, lease: null }
    if (record.lease && record.lease.expiresAt > now)
      throw new Error('World already has a host')
    const lease = { holder, token: ++record.counter, expiresAt: now + ttl }
    record.lease = lease
    this.records.set(world, record)
    return { ...lease }
  }
  assertOwner(world: string, holder: string, token: number, now: number) {
    const lease = this.records.get(world)?.lease
    if (
      !lease ||
      lease.holder !== holder ||
      lease.token !== token ||
      lease.expiresAt <= now
    )
      throw new Error('Hosting lease is stale')
  }
  renew(
    world: string,
    holder: string,
    token: number,
    now: number,
    ttl: number,
  ) {
    if (!Number.isFinite(ttl) || ttl <= 0)
      throw new Error('Invalid lease duration')
    this.assertOwner(world, holder, token, now)
    const lease = this.records.get(world)!.lease!
    lease.expiresAt = now + ttl
    return { ...lease }
  }
  release(world: string, holder: string, token: number, now: number) {
    this.assertOwner(world, holder, token, now)
    this.records.get(world)!.lease = null
  }
}
