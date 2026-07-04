// =============================================================================
// Pizza Planet Production Acceptance Framework V2 — Artifact Validator
// Verifies physical file integrity before referencing evidence in engineering reports.
// =============================================================================

import fs from 'fs'
import path from 'path'
import { type ArtifactValidationResult } from './types'

const PNG_MAGIC_HEADER = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])

export class ArtifactValidator {
  private checkedArtifacts: Map<string, ArtifactValidationResult> = new Map()

  public validateArtifact(filePath: string): ArtifactValidationResult {
    const absPath = path.resolve(filePath)
    
    if (this.checkedArtifacts.has(absPath)) {
      return this.checkedArtifacts.get(absPath)!
    }

    const result: ArtifactValidationResult = {
      path: absPath,
      exists: false,
      sizeBytes: 0,
      readable: false,
      isValidMediaOrJson: false
    }

    try {
      if (!fs.existsSync(absPath)) {
        result.validationError = 'File does not exist on filesystem'
        this.checkedArtifacts.set(absPath, result)
        return result
      }

      const stats = fs.statSync(absPath)
      result.exists = true
      result.sizeBytes = stats.size

      if (stats.size === 0) {
        result.validationError = 'File size is zero bytes'
        this.checkedArtifacts.set(absPath, result)
        return result
      }

      // Try reading first chunk to check readability
      const fd = fs.openSync(absPath, 'r')
      const buffer = Buffer.alloc(Math.min(stats.size, 1024))
      fs.readSync(fd, buffer, 0, buffer.length, 0)
      fs.closeSync(fd)
      result.readable = true

      const ext = path.extname(absPath).toLowerCase()
      if (ext === '.png') {
        if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_MAGIC_HEADER)) {
          result.isValidMediaOrJson = true
        } else {
          result.validationError = 'Corrupted PNG: missing standard magic header'
        }
      } else if (ext === '.json') {
        try {
          const fullContent = fs.readFileSync(absPath, 'utf-8')
          JSON.parse(fullContent)
          result.isValidMediaOrJson = true
        } catch (err: any) {
          result.validationError = `Invalid JSON syntax: ${err.message}`
        }
      } else if (ext === '.md' || ext === '.txt' || ext === '.log') {
        result.isValidMediaOrJson = buffer.length > 0
      } else {
        // Generic binary / text file
        result.isValidMediaOrJson = true
      }
    } catch (err: any) {
      result.validationError = `Validation exception: ${err.message}`
    }

    this.checkedArtifacts.set(absPath, result)
    return result
  }

  public getSummary() {
    const all = Array.from(this.checkedArtifacts.values())
    const valid = all.filter(a => a.exists && a.sizeBytes > 0 && a.readable && a.isValidMediaOrJson)
    const invalid = all.filter(a => !a.exists || a.sizeBytes === 0 || !a.readable || !a.isValidMediaOrJson)

    return {
      totalChecked: all.length,
      validCount: valid.length,
      invalidCount: invalid.length,
      invalidArtifacts: invalid
    }
  }
}
