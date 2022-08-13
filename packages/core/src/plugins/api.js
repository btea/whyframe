import { createHash } from 'node:crypto'
import path from 'node:path'
import { templateDefaultId } from './template.js'

/**
 * @param {import('..').Options} [options]
 * @returns {import('vite').Plugin}
 */
export function apiPlugin(options) {
  /** @type {Map<string, string>} */
  const virtualIdToCode = new Map()

  // secondary map to track stale virtual ids on hot update
  /** @type {Map<string, string>} */
  const originalIdToVirtualIds = new Map()

  /** @type {boolean} */
  let isBuild

  // template url to record of hash to id, used for final import map
  // generation of `whyframe:app-${templateName}`
  /** @type {Map<string, Record<string, string>>} */
  const templateUrlToEntryIds = new Map()

  return {
    name: 'whyframe:api',
    config(_, { command }) {
      isBuild = command === 'build'
    },
    /** @type {import('..').Api} */
    api: {
      _getEntryIds(templateName) {
        const templateUrl =
          options?.template?.[templateName || 'default'] || templateDefaultId
        return templateUrlToEntryIds.get(templateUrl) || {}
      },
      getHash(text) {
        return createHash('sha256').update(text).digest('hex').substring(0, 8)
      },
      getMainIframeAttrs(entryId, hash, templateName, isComponent) {
        /** @type {import('..').Attr[]} */
        const attrs = []
        const templateUrl =
          options?.template?.[templateName || 'default'] || templateDefaultId
        attrs.push({
          type: 'static',
          name: isComponent ? 'whyframeSrc' : 'src',
          value: templateUrl
        })
        if (isBuild) {
          if (!templateUrlToEntryIds.has(templateUrl)) {
            templateUrlToEntryIds.set(templateUrl, {})
          }
          templateUrlToEntryIds.get(templateUrl)[hash] = entryId
          attrs.push({
            type: 'static',
            name: isComponent ? 'whyframeHash' : 'data-whyframe-app-hash',
            value: hash
          })
        } else {
          attrs.push({
            type: 'static',
            name: isComponent ? 'whyframeUrl' : 'data-whyframe-app-url',
            value: `/@id/__${entryId}`
          })
        }
        return attrs
      },
      getProxyIframeAttrs() {
        /** @type {import('..').Attr[]} */
        const attrs = []
        attrs.push({ type: 'dynamic', name: 'src', value: 'whyframeSrc' })
        if (isBuild) {
          attrs.push({
            type: 'dynamic',
            name: 'data-whyframe-app-hash',
            value: 'whyframeHash'
          })
        } else {
          attrs.push({
            type: 'dynamic',
            name: 'data-whyframe-app-url',
            value: 'whyframeUrl'
          })
        }
        return attrs
      },
      getProxyPropNames() {
        return ['whyframeSrc', 'whyframeHash', 'whyframeUrl']
      },
      createEntry(originalId, hash, ext, code) {
        // example: whyframe:entry-123456.jsx
        const entryId = `whyframe:entry-${hash}${ext}`
        virtualIdToCode.set(entryId, code)
        // original id tracking is only needed in dev for hot reloads
        if (!isBuild) {
          originalIdToVirtualIds.set(originalId, entryId)
        }
        return entryId
      },
      createEntryComponent(originalId, hash, ext, code) {
        // example: /User/bjorn/foo/bar/App.svelte__whyframe-123456.svelte
        const entryComponentId = `${originalId}__whyframe-${hash}${ext}`
        virtualIdToCode.set(entryComponentId, code)
        // original id tracking is only needed in dev for hot reloads
        if (!isBuild) {
          originalIdToVirtualIds.set(originalId, entryComponentId)
        }
        return entryComponentId
      }
    },
    resolveId(id) {
      // see createEntry for id signature
      if (id.startsWith('whyframe:entry')) {
        return '__' + id
      }
      // see createEntryComponent for id signature
      if (id.includes('__whyframe-')) {
        // NOTE: this gets double resolved for some reason
        if (id.startsWith(process.cwd())) {
          return id
        } else {
          return path.join(process.cwd(), id)
        }
      }
    },
    load(id) {
      let virtualId
      // see createEntry for id signature
      if (id.startsWith('__whyframe:entry')) {
        virtualId = id.slice(2)
      }
      // see createEntryComponent for id signature
      if (id.includes('__whyframe-')) {
        virtualId = id
      }
      if (virtualId) {
        const code = virtualIdToCode.get(virtualId)
        if (typeof code === 'string') {
          return { code, map: { mappings: '' } }
        } else {
          return code
        }
      }
    },
    handleHotUpdate({ file }) {
      // remove stale virtual ids
      // NOTE: hot update always come first before transform
      if (originalIdToVirtualIds.has(file)) {
        const staleVirtualIds = originalIdToVirtualIds.get(file)
        for (const id of staleVirtualIds) {
          virtualIdToCode.delete(id)
        }
      }
    }
  }
}
