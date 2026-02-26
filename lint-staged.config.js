const path = require('path')
const fs = require('fs')

/**
 * Get unique packages from staged files
 */
function getAffectedPackages(stagedFiles) {
  const packages = new Set()
  for (const file of stagedFiles) {
    const match = file.match(/packages\/([^/]+)\//)
    if (match) {
      packages.add(match[1])
    }
  }
  return [...packages]
}

/**
 * Find corresponding test files for the given staged files
 */
function findTestFiles(stagedFiles) {
  const testFiles = []

  for (const file of stagedFiles) {
    if (file.endsWith('.spec.ts') || file.endsWith('.spec.tsx')) {
      testFiles.push(file)
      continue
    }

    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) {
      continue
    }

    const ext = path.extname(file)
    const base = file.slice(0, -ext.length)
    const testFile = `${base}.spec${ext}`

    if (fs.existsSync(testFile)) {
      testFiles.push(testFile)
    }
  }

  return [...new Set(testFiles)]
}

module.exports = {
  '*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier --write'],

  '*.{json,md,yml,yaml}': ['prettier --write'],

  '*.{ts,tsx}': (stagedFiles) => {
    const packages = getAffectedPackages(stagedFiles)
    if (packages.length === 0) {
      return []
    }

    return packages.map((pkg) => `yarn workspace @ddd-ct/${pkg} typecheck`)
  },

  '**/*.{ts,tsx}': (stagedFiles) => {
    const testFiles = findTestFiles(stagedFiles)
    if (testFiles.length === 0) {
      return []
    }

    const testsByPackage = {}
    for (const testFile of testFiles) {
      const match = testFile.match(/packages\/([^/]+)\//)
      if (match) {
        const pkg = match[1]
        if (!testsByPackage[pkg]) {
          testsByPackage[pkg] = []
        }
        testsByPackage[pkg].push(testFile)
      }
    }

    const commands = []
    for (const [pkg, files] of Object.entries(testsByPackage)) {
      const pkgPath = `packages/${pkg}/`
      const relativeFiles = files.map((f) =>
        f.includes(pkgPath) ? f.substring(f.indexOf(pkgPath) + pkgPath.length) : f
      )

      commands.push(
        `yarn workspace @ddd-ct/${pkg} test --passWithNoTests --coverage=false --findRelatedTests ${relativeFiles.join(' ')}`
      )
    }

    return commands
  }
}
