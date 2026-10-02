// TypeScript 7 (native) hat keine von typescript-eslint unterstützte JS-API.
// Der Typecheck (`tsc -b`) läuft mit TS 7, typescript-eslint bekommt hier
// eine eigene TS-6-Kopie statt der Peer-Dependency aus dem Projekt.
// Entfernen, sobald typescript-eslint TS 7 unterstützt.
const TS_FOR_ESLINT = '~6.0.3'

function readPackage(pkg) {
  if (
    (pkg.name === 'typescript-eslint' || pkg.name?.startsWith('@typescript-eslint/')) &&
    pkg.peerDependencies?.typescript
  ) {
    delete pkg.peerDependencies.typescript
    if (pkg.peerDependenciesMeta) delete pkg.peerDependenciesMeta.typescript
    pkg.dependencies = { ...pkg.dependencies, typescript: TS_FOR_ESLINT }
  }
  return pkg
}

module.exports = { hooks: { readPackage } }
