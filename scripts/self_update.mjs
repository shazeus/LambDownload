#!/usr/bin/env node
import extract from 'extract-zip'
import { spawn } from 'node:child_process'
import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const repoArgIndex = process.argv.indexOf('--repo')
const repo = repoArgIndex >= 0 ? process.argv[repoArgIndex + 1] : 'shazeus/LambDownload'

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command} ${args.join(' ')} exited with ${code}`))
    })
  })
}

async function download(url, destination) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'LambDownload',
    },
  })

  if (!response.ok) {
    throw new Error(`Could not download update: ${response.status}`)
  }

  await writeFile(destination, Buffer.from(await response.arrayBuffer()))
}

async function latestRelease() {
  const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'LambDownload',
    },
  })

  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status}`)
  }

  return response.json()
}

async function main() {
  const release = await latestRelease()
  const updateRoot = path.join(tmpdir(), `lambdownload-update-${Date.now()}`)
  const zipPath = path.join(updateRoot, 'source.zip')
  const extractRoot = path.join(updateRoot, 'source')

  await mkdir(extractRoot, { recursive: true })
  await download(release.zipball_url, zipPath)
  await extract(zipPath, { dir: extractRoot })

  const [sourceFolder] = await readdir(extractRoot)
  if (!sourceFolder) {
    throw new Error('Release archive was empty')
  }

  await cp(path.join(extractRoot, sourceFolder), projectRoot, {
    recursive: true,
    force: true,
    filter: (source) => {
      const relative = path.relative(path.join(extractRoot, sourceFolder), source)
      return !relative.startsWith('.git') && !relative.startsWith('node_modules')
    },
  })

  await run('npm', ['install'])
  await run('python3', ['-m', 'pip', 'install', '-r', 'requirements.txt'])
  await run('npm', ['run', 'build'])
  await rm(updateRoot, { recursive: true, force: true })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
