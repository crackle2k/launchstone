import { _electron as electron } from 'playwright'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const root = await mkdtemp(join(tmpdir(), 'launchstone-smoke-'))
const data = join(root, 'data')
const installation = join(root, 'forge-server')
const args = `libraries/net/minecraftforge/forge/1.20.1-47.4.0/${process.platform === 'win32' ? 'win' : 'unix'}_args.txt`
await mkdir(
  join(installation, 'libraries/net/minecraftforge/forge/1.20.1-47.4.0'),
  { recursive: true },
)
await writeFile(
  join(installation, args),
  '# Test fixture; not an executable Minecraft server.\n',
)
await mkdir(join(installation, 'world/region'), { recursive: true })
await writeFile(
  join(installation, 'world/region/r.0.0.mca'),
  'smoke-test chunk fixture',
)
await writeFile(join(installation, 'server.properties'), 'server-port=25565\n')
const env = { ...process.env, LAUNCHSTONE_DATA_DIR: data }
delete env.ELECTRON_RUN_AS_NODE
let desktop
const launch = () =>
  electron.launch({
    args: process.env.LAUNCHSTONE_EXECUTABLE ? [] : ['.'],
    ...(process.env.LAUNCHSTONE_EXECUTABLE
      ? { executablePath: process.env.LAUNCHSTONE_EXECUTABLE }
      : {}),
    env,
  })
try {
  desktop = await launch()
  let page = await desktop.firstWindow()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page
    .getByRole('heading', { name: 'Make room for a new world.' })
    .waitFor()
  await page.getByRole('button', { name: 'Create your first world' }).click()
  await page
    .getByRole('textbox', { name: 'World name' })
    .fill('The weekend world')
  await page.getByRole('button', { name: 'Create world profile' }).click()
  await page
    .getByRole('heading', { name: 'The weekend world', exact: true })
    .waitFor()
  const worldId = await page.evaluate(
    async () => (await window.launchstone.listWorlds())[0].id,
  )
  await desktop.evaluate(({ dialog }, installation) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [installation],
    })
  }, installation)
  await page.getByRole('button', { name: 'Import Forge server' }).click()
  await page.getByRole('button', { name: 'Start hosting' }).waitFor()
  await page.getByRole('button', { name: 'Checkpoints', exact: true }).click()
  await page.getByRole('button', { name: 'Save checkpoint' }).click()
  await page.getByText('Saved locally', { exact: true }).waitFor()
  const snapshot = await page.evaluate(
    async (id) => (await window.launchstone.listCheckpoints(id))[0],
    worldId,
  )
  assert.equal(snapshot.fileCount, 3)
  assert(snapshot.files.every((file) => /^[a-f0-9]{64}$/.test(file.sha256)))
  // Prove renderer IPC rejects invalid identifiers before touching the filesystem.
  const rejected = await page.evaluate(async () => {
    try {
      await window.launchstone.openWorldFolder('../../escape')
      return false
    } catch {
      return true
    }
  })
  assert(rejected)
  assert.deepEqual(errors, [])
  await desktop.close()
  desktop = await launch()
  page = await desktop.firstWindow()
  await page
    .getByRole('heading', { name: 'The weekend world', exact: true })
    .waitFor()
  assert.equal(
    await page.evaluate(
      async () => (await window.launchstone.listWorlds())[0].id,
    ),
    worldId,
  )
  if (process.env.LAUNCHSTONE_SCREENSHOT)
    await page.screenshot({
      path: process.env.LAUNCHSTONE_SCREENSHOT,
      fullPage: true,
    })
  console.log(
    'Electron smoke passed: create, import, checkpoint, IPC validation, and persistence across restart.',
  )
} finally {
  await desktop?.close()
  await rm(root, { recursive: true, force: true })
}
