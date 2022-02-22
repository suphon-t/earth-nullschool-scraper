import fs from 'fs/promises'
import path from 'path'

async function main() {
  const json = await fs.readFile('./bundle.json')
  const data = JSON.parse(json)
  const promises = data.sources.map((sourceName, idx) => {
    return (async function () {
      if (sourceName.includes('lookup.js')) {
        console.log(sourceName)
      }
      if (!sourceName.startsWith('webpack://earth/./src')) return
      const fileName = sourceName.slice(16)
      const contents = data.sourcesContent[idx]
      const dirName = path.dirname(fileName)
      await fs.mkdir(dirName, { recursive: true })
      await fs.writeFile(fileName, contents)
    })()
  })
  await Promise.all(promises)
}

main()
