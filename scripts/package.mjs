import { packager } from '@electron/packager'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const manifest = JSON.parse(await readFile('package.json', 'utf8'))
const outputs = await packager({
  dir: resolve('.'),
  name: 'Launchstone',
  appBundleId: 'dev.launchstone.desktop',
  appCategoryType: 'public.app-category.games',
  appVersion: manifest.version,
  out: resolve('release'),
  overwrite: true,
  asar: true,
  // Package only built sources, the manifest, and pruned runtime dependencies.
  ignore: (path) =>
    Boolean(path) &&
    !/^\/(?:out|node_modules|package\.json)(?:\/|$)/.test(path),
})
console.log(outputs.join('\n'))
