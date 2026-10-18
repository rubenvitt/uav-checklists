import { describe, expect, it } from 'vitest'
import { parseCoordinates } from './coordinateParser'

// Referenzpunkt Hannover-Ahlem: 52°23'24"N 9°41'48"E = 52.39 / 9.69667
const LAT = 52.39
const LON = 9 + 41.8 / 60

function expectAt(input: string, format: string, lat = LAT, lon = LON) {
  const result = parseCoordinates(input)
  expect(result, input).not.toBeNull()
  expect(result!.format, input).toBe(format)
  expect(result!.latitude, input).toBeCloseTo(lat, 6)
  expect(result!.longitude, input).toBeCloseTo(lon, 6)
  return result!
}

describe('Dezimalgrad', () => {
  it.each([
    '52.39, 9.696667',
    '52.39 9.696667',
    '52,39 9,696667',
    '52.39; 9.696667',
    '52.39,9.696667',
    '52.39°N 9.696667°E',
    'N52.39 E9.696667',
    '52.39° 9.696667°',
  ])('%s', (input) => {
    const result = expectAt(input, 'decimal', LAT, 9.696667)
    expect(result.formatLabel).toBe('Dezimalkoordinaten')
  })

  it('negative Werte und Süd/West', () => {
    expectAt('-33.868, -151.209', 'decimal', -33.868, -151.209)
    expectAt('33.868S 151.209W', 'decimal', -33.868, -151.209)
  })

  it('formatiert die Anzeige', () => {
    expect(parseCoordinates('52.39, 9.696667')!.display).toBe('52.3900°N, 9.6967°E')
  })
})

describe('Grad/Minuten/Sekunden', () => {
  it.each([
    `52°23'24"N 9°41'48"E`,
    `52°23'24"N 9°41'48"O`,
    `52°23′24″N 9°41′48″E`,
    `52°23’24”N 9°41’48”E`,
    `52°23'24''N 9°41'48''E`,
    `52 23 24 N 9 41 48 E`,
    `52°23'24,0"N, 9°41'48,0"E`,
    `N52°23'24" E9°41'48"`,
    `N 52 23 24 E 9 41 48`,
    `9°41'48"E 52°23'24"N`,
    `52°23'24" 9°41'48"`,
  ])('%s', (input) => {
    const result = expectAt(input, 'dms')
    expect(result.formatLabel).toBe('Grad/Min./Sek.')
  })

  it('formatiert die Anzeige', () => {
    expect(parseCoordinates(`52°23'24"N 9°41'48"E`)!.display).toBe('52°23′24.0″N, 9°41′48.0″E')
  })

  it('rundet 59.96″ nicht auf 60.0″', () => {
    expect(parseCoordinates(`52°23'59.96"N 9°41'59.96"E`)!.display).toBe('52°24′0.0″N, 9°42′0.0″E')
  })
})

describe('Grad/Dezimalminuten', () => {
  it.each([
    `52°23.4'N 9°41.8'E`,
    `52°23,4'N 9°41,8'E`,
    `52°23.4′N 9°41.8′O`,
    `52°23.4’N 9°41.8’E`,
    `52 23.4 N 9 41.8 E`,
    `52 23,4N 9 41,8E`,
    `52°23.4'N, 9°41.8'E`,
    `52°23.4' 9°41.8'`,
    `n52°23.4' e9°41.8'`,
    `N52°23.4' E9°41.8'`,
    `N 52° 23.4' E 009° 41.8'`,
    `N52 23.4 E9 41.8`,
    `E9°41.8' N52°23.4'`,
  ])('%s', (input) => {
    const result = expectAt(input, 'dm')
    expect(result.formatLabel).toBe('Grad/Dezimalminuten')
  })

  it('ganze Minuten', () => {
    expectAt(`52°23'N 9°41'E`, 'dm', 52 + 23 / 60, 9 + 41 / 60)
  })

  it('Süd/West und Vorzeichen', () => {
    expectAt(`33°52.1'S 151°12.5'W`, 'dm', -(33 + 52.1 / 60), -(151 + 12.5 / 60))
    expectAt(`-33°52.1' 151°12.5'`, 'dm', -(33 + 52.1 / 60), 151 + 12.5 / 60)
  })

  it('formatiert die Anzeige', () => {
    expect(parseCoordinates(`52°23.4'N 9°41.8'E`)!.display).toBe('52°23.400′N, 9°41.800′E')
  })

  it('wird nie als Dezimalgrad gelesen (Regression)', () => {
    const result = parseCoordinates(`52°23.4'N 9°41.8'E`)!
    expect(result.latitude).not.toBe(52)
    expect(result.longitude).not.toBe(9)
  })
})

describe('UTM', () => {
  it.each(['32U 547390 5805000', '32 U 547390 5805000', '32U 547390/5805000', 'UTM 32U 547390 5805000'])(
    '%s',
    (input) => {
      const result = expectAt(input, 'utm', 52.393194, 9.696430)
      expect(result.formatLabel).toBe('UTM Zone 32U')
    },
  )
})

describe('UTM-Ref (MGRS)', () => {
  it.each([
    '32UND 47390 05000',
    '32U ND 47390 05000',
    '32UND4739005000',
    '32 U ND 47390 05000',
    'MGRS 32UND4739005000',
    'UTM-Ref 32UND 47390 05000',
  ])('%s', (input) => {
    const result = expectAt(input, 'mgrs', 52.393194, 9.696430)
    expect(result.formatLabel).toBe('UTM-Ref (MGRS)')
    expect(result.display).toBe('32U ND 47390 05000')
  })

  it('geringere Genauigkeit', () => {
    const result = parseCoordinates('32U ND 4739 0500')!
    expect(result.format).toBe('mgrs')
    expect(result.display).toBe('32U ND 4739 0500')
  })
})

describe('ungültige oder mehrdeutige Eingaben', () => {
  it.each([
    ['', 'leer'],
    ['52', 'nur eine Zahl'],
    ['Hannover', 'Ortsname'],
    ['Nesse', 'Ortsname aus Himmelsrichtungs-Buchstaben'],
    ['Nordstraße 5, Hannover', 'Adresse'],
    ['52 23.4 9 41.8', 'vier Zahlen ohne Zeichen und Richtung'],
    ['52 23 24 9 41 48', 'sechs Zahlen ohne Zeichen und Richtung'],
    [`52°23'24"N 9°41.8'E`, 'gemischte Formate'],
    [`52°23.4'N`, 'nur Breite'],
    [`52°23.4'N 9°41.8'N`, 'zweimal Nord'],
    [`52°23.4'E 9°41.8'E`, 'zweimal Ost'],
    [`N52°23.4' 9°41.8'E`, 'Richtung einmal vorn, einmal hinten'],
    [`52°60'N 9°41'E`, 'Minuten ≥ 60'],
    [`52°23'60"N 9°41'48"E`, 'Sekunden ≥ 60'],
    [`52.5°23'N 9°41'E`, 'Grad mit Nachkommastellen und Minuten'],
    [`52°23.4'24"N 9°41.8'48"E`, 'Minuten mit Nachkommastellen und Sekunden'],
    [`52'23°N 9'41°E`, 'Zeichen in falscher Reihenfolge'],
    [`-52°23.4'N 9°41.8'E`, 'Vorzeichen und Richtung'],
    [`91°0'N 9°41'E`, 'Breite > 90'],
    [`52°0'N 181°0'E`, 'Länge > 180'],
    [`52°23.4'N 9°41.8'E 10°`, 'überzählige Werte'],
    [`52.52° 13.4`, 'nur ein Gradzeichen'],
    ['52.52 13.4 7', 'drei Dezimalzahlen'],
    ['52,5,13,4', 'Komma als Dezimal- und Trennzeichen'],
    ['91, 9', 'Breite > 90 (dezimal)'],
    ['52, 181', 'Länge > 180 (dezimal)'],
    ['52.5abc, 13.4', 'Text hinter der Zahl'],
    ['32UND 4739 05000', 'MGRS mit ungleicher Stellenzahl'],
    ['61U 547390 5805000', 'UTM-Zone > 60'],
    ['32I 547390 5805000', 'ungültiges UTM-Band'],
  ])('%s (%s)', (input) => {
    expect(parseCoordinates(input)).toBeNull()
  })
})
