import fs from 'fs/promises'
import fetch from 'node-fetch'
import path from 'path'
import { parse, print } from 'recast'

const bundleUrl = 'https://earth.nullschool.net/bundle.a25d92.js.map'

async function extractApp() {
  const bundle = await fetch(bundleUrl)
  const data = await bundle.json()
  const promises = data.sources.map((sourceName, idx) => {
    return (async function () {
      if (sourceName.includes('lookup.js')) {
        console.log(sourceName)
      }
      if (!sourceName.startsWith('webpack://earth/./src')) return
      const fileName = `./app/${sourceName.slice(22)}`
      const contents = data.sourcesContent[idx]
      const dirName = path.dirname(fileName)
      await fs.mkdir(dirName, { recursive: true })
      await fs.writeFile(fileName, contents)
    })()
  })
  await Promise.all(promises)
}

async function fixApp() {
  // fix app/grid/regular.js
  const gridRegular = await fs.readFile('./app/grid/regular.js')
  const gridRegularAst = parse(gridRegular)
  const importRegularFrag = gridRegularAst.program.body[2]
  if (
    importRegularFrag.type === 'ImportDeclaration' &&
    importRegularFrag.source.value === './regular.frag'
  ) {
    delete gridRegularAst.program.body[2]
  }
  await fs.writeFile('./app/grid/regular.js', print(gridRegularAst).code)

  // fix app/interpolate/nearest.js
  const nearest = await fs.readFile('./app/interpolate/nearest.js')
  const nearestAst = parse(nearest)
  const importLookup = nearestAst.program.body[0]
  if (
    importLookup.type === 'ImportDeclaration' &&
    importLookup.source.value === './lookup.js'
  ) {
    delete nearestAst.program.body[0]
  }
  await fs.writeFile('./app/interpolate/nearest.js', print(nearestAst).code)

  // fix app/interpolate/nearest.js
  const bilinear = await fs.readFile('./app/interpolate/bilinear.js')
  const bilinearAst = parse(bilinear)
  const importLookup2 = bilinearAst.program.body[0]
  if (
    importLookup2.type === 'ImportDeclaration' &&
    importLookup2.source.value === './lookup.js'
  ) {
    delete bilinearAst.program.body[0]
  }
  await fs.writeFile('./app/interpolate/bilinear.js', print(bilinearAst).code)
}

async function main() {
  await extractApp()
  await fixApp()
}

main()
