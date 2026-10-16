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
  await page.evaluate(() => document.fonts.ready)
  assert(
    await page.evaluate(() => document.fonts.check('13px "Inter Variable"')),
  )
  if (process.env.LAUNCHSTONE_SCREENSHOT)
    await page.screenshot({
      path: process.env.LAUNCHSTONE_SCREENSHOT.replace('.png', '-empty.png'),
    })
  await page.getByRole('button', { name: 'Create your first world' }).click()
  if (process.env.LAUNCHSTONE_SCREENSHOT)
    await page.screenshot({
      path: process.env.LAUNCHSTONE_SCREENSHOT.replace('.png', '-dialog.png'),
    })
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
  if (process.env.LAUNCHSTONE_SCREENSHOT)
    await page.screenshot({
      path: process.env.LAUNCHSTONE_SCREENSHOT.replace('.png', '-detail.png'),
    })
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
  await page.getByRole('button', { name: 'All worlds', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Search worlds' })
    .fill('no matching world')
  await page
    .getByRole('heading', { name: 'No worlds found', exact: true })
    .waitFor()
  await page.getByRole('button', { name: 'Clear search' }).click()
  await page.getByRole('button', { name: 'Running 0', exact: true }).click()
  await page
    .getByRole('heading', { name: 'No worlds found', exact: true })
    .waitFor()
  await page.getByRole('button', { name: 'Show all worlds' }).click()
  await page.getByRole('button', { name: 'List view', exact: true }).click()
  assert.equal(
    await page
      .getByRole('button', { name: 'List view', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  )
  await page
    .getByRole('button', { name: 'Open The weekend world', exact: true })
    .waitFor()
  if (process.env.LAUNCHSTONE_SCREENSHOT)
    await page.screenshot({
      path: process.env.LAUNCHSTONE_SCREENSHOT.replace('.png', '-list.png'),
    })
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page
    .getByRole('heading', { name: 'Java runtime', exact: true })
    .waitFor()
  if (process.env.LAUNCHSTONE_SCREENSHOT)
    await page.screenshot({
      path: process.env.LAUNCHSTONE_SCREENSHOT.replace('.png', '-settings.png'),
    })
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
  await page.setViewportSize({ width: 1000, height: 700 })
  assert(
    await page.evaluate(() => {
      const content = document.querySelector('.content')
      return content && content.scrollWidth <= content.clientWidth
    }),
    'The world library must fit the smallest supported window width',
  )
  await page
    .getByRole('button', { name: 'Create a world', exact: true })
    .click()
  const dialog = await page.getByRole('dialog').boundingBox()
  assert(
    dialog &&
      dialog.x >= 0 &&
      dialog.y >= 0 &&
      dialog.x + dialog.width <= 1000 &&
      dialog.y + dialog.height <= 700,
  )
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  console.log(
    'Electron smoke passed: create, import, checkpoint, IPC validation, search, filters, list view, settings, bundled font, and persistence across restart.',
  )
} finally {
  await desktop?.close()
  await rm(root, { recursive: true, force: true })
}
