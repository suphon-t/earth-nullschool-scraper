import { decodeEpak } from '../src/codec/decoder.js'
import { scalarProduct } from '../src/product/scalarProduct.js'
import { buildGFSWind } from '../src/product/gfs/gfs-wind.js'
import { length, mulvec2 } from '../src/util/math.js'
import { createUnitDescriptors } from '../src/util/units.js'
import fetch from 'node-fetch'
import { addHours, format } from 'date-fns'
import prisma from '@prisma/client'

const { PrismaClient } = prisma

const db = new PrismaClient()

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

async function getBeginDate() {
  const maxDateTime = await db.dataPoint.groupBy({
    by: ['location'],
    _max: {
      datetime: true,
    },
  })
  if (maxDateTime.length === 0) {
    return beginDate
  }
  const minDate = new Date(maxDateTime[0]._max.datetime)
  const maxDtMap = {}
  for (const row of maxDateTime) {
    maxDtMap[row.location] = new Date(row._max.datetime)
  }
  for (const [location] of locations) {
    const locationDt = maxDtMap[location]
    if (!locationDt) return beginDate
    if (locationDt < minDate) {
      minDate = locationDt
    }
  }
  return minDate
}

async function* generateData(beginDate) {
  let currentDate = beginDate
  const step = 3
  const batchSize = 16
  while (true) {
    const nextDate = addHours(currentDate, step * batchSize)
    if (nextDate > new Date()) return
    const promises = []
    for (let i = 0; i < batchSize; i++) {
      const tmpDate = addHours(currentDate, i * step)
      promises.push(getDataForDateTime(tmpDate))
    }
    const data = await Promise.all(promises)
    for (const row of data) {
      yield row
    }
    currentDate = nextDate
  }
}

const locations = [
  ['Bangkok', 13.754, 100.5014],
  ['Chanthaburi', 12.6096, 102.1045],
  ['Chiang Mai', 18.7904, 98.9847],
  ['Kanchanaburi', 14.0041, 99.5483],
  ['Khon Kaen', 16.4467, 102.833],
  ['Songkhla', 7.1988, 100.5951],
]

async function main() {
  const beginDate = await getBeginDate()
  for await (const { dateTime, temp, wind } of generateData(beginDate)) {
    for (const [name, lat, long] of locations) {
      const tempVal = temp.field().bilinear(long, lat)
      const windVal = wind.field().bilinear(long, lat)
      const tempFormatted =
        tempUnitDescriptors['°C'].format(tempVal).formattedVal
      const windFormatted =
        windUnitDescriptors['km/h'].format(windVal).formattedVal
      const dt = format(dateTime, 'yyyy-MM-dd HH:mm:ss')
      const [windDirection, windSpeed] = windFormatted.split('° @ ')
      console.log(name, dt, tempFormatted, windDirection, windSpeed)
      const data = {
        lat,
        long,
        temp: parseFloat(tempFormatted),
        windDir: parseInt(windDirection),
        windSpeed: parseInt(windSpeed),
      }
      await db.dataPoint.upsert({
        where: {
          datetime_location: {
            datetime: dt,
            location: name,
          },
        },
        create: {
          datetime: dt,
          location: name,
          ...data,
        },
        update: data,
      })
    }
  }
}

main()
