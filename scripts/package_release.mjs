#!/usr/bin/env node
import { createWriteStream } from 'node:fs'
import { mkdir, readFile, readdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import yazl from 'yazl'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const releaseRoot = path.join(projectRoot, 'release')
const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'))
const version = packageJson.version

function zipPath(filePath) {
  return filePath.split(path.sep).join('/')
}

async function addToArchive(zipfile, sourcePath, archivePath) {
  const info = await stat(sourcePath)
  if (info.isDirectory()) {
    const entries = await readdir(sourcePath, { withFileTypes: true })
    for (const entry of entries) {
      await addToArchive(
        zipfile,
        path.join(sourcePath, entry.name),
        archivePath ? path.posix.join(archivePath, entry.name) : entry.name,
      )
    }
    return
  }

  if (info.isFile()) {
    zipfile.addFile(sourcePath, zipPath(archivePath), { mtime: info.mtime })
  }
}

function writeZip(zipfile, archivePath) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(archivePath)
    output.on('close', resolve)
    output.on('error', reject)
    zipfile.outputStream.on('error', reject)
    zipfile.outputStream.pipe(output)
    zipfile.end()
  })
}

await rm(releaseRoot, { recursive: true, force: true })
await mkdir(releaseRoot, { recursive: true })

const commonFiles = [
  'adobe',
  'dist',
  'installers',
  'scripts',
  'server',
  'src',
  'public',
  '.github',
  'eslint.config.js',
  'index.html',
  'package.json',
  'package-lock.json',
  'requirements.txt',
  'README.md',
  'tsconfig.app.json',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'LICENSE',
]

async function createArchive(name) {
  const archivePath = path.join(releaseRoot, name)
  const zipfile = new yazl.ZipFile()
  for (const file of commonFiles) {
    await addToArchive(zipfile, path.join(projectRoot, file), file)
  }
  await writeZip(zipfile, archivePath)
  console.log(`Created ${archivePath}`)
}

await createArchive('lambdownload-release.zip')
await createArchive(`lambdownload-v${version}-macos-linux.zip`)
await createArchive(`lambdownload-v${version}-windows.zip`)
