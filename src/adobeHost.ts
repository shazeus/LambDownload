import type { ImportResult, ImportTarget } from './types'

declare global {
  interface Window {
    __adobeHost?: {
      importAsset?: (path: string, target: ImportTarget) => Promise<ImportResult>
    }
    CSInterface?: new () => {
      evalScript: (script: string, callback: (result: string) => void) => void
    }
  }
}

export async function importWithAdobeHost(path: string, target: ImportTarget): Promise<ImportResult | null> {
  if (window.__adobeHost?.importAsset) {
    return window.__adobeHost.importAsset(path, target)
  }

  if (window.CSInterface) {
    const csInterface = new window.CSInterface()
    const escapedPath = path.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const script = `LambDownload.importAsset("${escapedPath}", "${target}")`

    return new Promise((resolve, reject) => {
      csInterface.evalScript(script, (result) => {
        try {
          resolve(JSON.parse(result) as ImportResult)
        } catch {
          reject(new Error(result || 'Adobe host import failed'))
        }
      })
    })
  }

  return null
}
