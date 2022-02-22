import { decodeEpak } from '../src/codec/decoder.js'
import { scalarProduct } from '../src/product/scalarProduct.js'
import { buildGFSWind } from '../src/product/gfs/gfs-wind.js'
import { length, mulvec2 } from '../src/util/math.js'
import { createUnitDescriptors } from '../src/util/units.js'
import fetch from 'node-fetch'
import { addHours, format } from 'date-fns'

const beginDate = new Date('2016-03-03 01:00:00')

const tempUnitDescriptors = createUnitDescriptors({
  '°C': { convert: (x) => x - 273.15, precision: 1 },
  '°F': { convert: (x) => (x * 9) / 5 - 459.67, precision: 1 },
  K: { convert: (x) => x, precision: 1 },
})

const windUnitDescriptors = createUnitDescriptors({
  'km/h': {
    convert: (uv) => mulvec2(uv, 3.6),
    scalarize: length,
    precision: 0,
    convention: 'into',
  },
  'm/s': { scalarize: length, precision: 1, convention: 'into' },
  kn: {
    convert: (uv) => mulvec2(uv, 1.943844),
    scalarize: length,
    precision: 0,
    convention: 'into',
  },
  mph: {
    convert: (uv) => mulvec2(uv, 2.236936),
    scalarize: length,
    precision: 0,
    convention: 'into',
  },
})

function getDateTimeString(dt) {
  const tmp = addHours(dt, -7)
  const date = format(tmp, 'yyyy/MM/dd')
  const time = format(tmp, 'HHmm')
  return { date, time }
}

async function readTemp(date, time) {
  const url = `https://gaia.nullschool.net/data/gfs/${date}/${time}-temp-surface-level-gfs-0.5.epak`
  const response = await fetch(url)
  const epakData = await response.arrayBuffer()
  const data = decodeEpak(epakData)
  const temp = scalarProduct(data, /Temperature/, {
    hasMissing: false,
    legacyName: 'Temperature',
  })
  return temp
}

async function readWind(date, time) {
  const url = `https://gaia.nullschool.net/data/gfs/${date}/${time}-wind-isobaric-850hPa-gfs-0.5.epak`
  const response = await fetch(url)
  const epakData = await response.arrayBuffer()
  const data = decodeEpak(epakData)
  const wind = buildGFSWind(data)
  return wind
}

async function getDataForDateTime(dateTime) {
  const { date, time } = getDateTimeString(dateTime)
  const promises = [readTemp(date, time), readWind(date, time)]
  const [temp, wind] = await Promise.all(promises)
  return { dateTime, temp, wind }
}

async function* generateData() {
  let currentDate = beginDate
  const step = 3
  const batchSize = 16
  while (true) {
    const promises = []
    for (let i = 0; i < batchSize; i++) {
      const tmpDate = addHours(currentDate, i * step)
      promises.push(getDataForDateTime(tmpDate))
    }
    const data = await Promise.all(promises)
    for (const row of data) {
      yield row
    }
    currentDate = addHours(currentDate, step * batchSize)
  }
}

async function main() {
  const [lat, long] = [13.754, 100.5014]
  for await (const { dateTime, temp, wind } of generateData()) {
    const tempVal = temp.field().bilinear(long, lat)
    const windVal = wind.field().bilinear(long, lat)
    const tempFormatted = tempUnitDescriptors['°C'].format(tempVal).formattedVal
    const windFormatted =
      windUnitDescriptors['km/h'].format(windVal).formattedVal
    console.log(dateTime, tempFormatted, windFormatted)
  }
}

main()
