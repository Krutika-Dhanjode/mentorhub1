const fs = require('fs')
const path = require('path')
const ts = require('typescript')

const projectRoot = path.resolve(__dirname, '..')
const sourceRoots = ['app', 'components', 'hooks', 'lib']
const topLevelFiles = ['proxy.ts']
const skipDirNames = new Set(['node_modules', '.next', '.git'])

const converted = []
const removed = []

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (skipDirNames.has(entry.name)) continue
      walk(fullPath, out)
      continue
    }
    out.push(fullPath)
  }
}

function transpileFile(filePath) {
  if (filePath.endsWith('.d.ts')) return
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return

  const input = fs.readFileSync(filePath, 'utf8')
  const transpiled = ts.transpileModule(input, {
    fileName: filePath,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      resolveJsonModule: true,
      isolatedModules: true,
      skipLibCheck: true,
    },
  })

  const outPath = filePath.endsWith('.tsx')
    ? filePath.slice(0, -4) + '.jsx'
    : filePath.slice(0, -3) + '.js'

  fs.writeFileSync(outPath, transpiled.outputText, 'utf8')
  fs.unlinkSync(filePath)
  converted.push(path.relative(projectRoot, outPath))
  removed.push(path.relative(projectRoot, filePath))
}

function main() {
  const files = []

  for (const root of sourceRoots) {
    const abs = path.join(projectRoot, root)
    if (fs.existsSync(abs)) walk(abs, files)
  }

  for (const relFile of topLevelFiles) {
    const abs = path.join(projectRoot, relFile)
    if (fs.existsSync(abs)) files.push(abs)
  }

  files.sort()
  for (const filePath of files) transpileFile(filePath)

  const tsconfigPath = path.join(projectRoot, 'tsconfig.json')
  if (fs.existsSync(tsconfigPath)) {
    fs.unlinkSync(tsconfigPath)
    removed.push('tsconfig.json')
  }

  const tsBuildInfoPath = path.join(projectRoot, 'tsconfig.tsbuildinfo')
  if (fs.existsSync(tsBuildInfoPath)) {
    fs.unlinkSync(tsBuildInfoPath)
    removed.push('tsconfig.tsbuildinfo')
  }

  const nextEnvPath = path.join(projectRoot, 'next-env.d.ts')
  if (fs.existsSync(nextEnvPath)) {
    fs.unlinkSync(nextEnvPath)
    removed.push('next-env.d.ts')
  }

  const jsconfigPath = path.join(projectRoot, 'jsconfig.json')
  const jsconfig = {
    compilerOptions: {
      baseUrl: '.',
      paths: {
        '@/*': ['./*'],
      },
    },
    include: ['**/*.js', '**/*.jsx'],
    exclude: ['node_modules'],
  }
  fs.writeFileSync(jsconfigPath, JSON.stringify(jsconfig, null, 2) + '\n', 'utf8')

  console.log(`Converted ${converted.length} files.`)
}

main()
