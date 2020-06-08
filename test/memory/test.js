import puppeteer from 'puppeteer'
import prettyBytes from 'pretty-bytes'
import table from 'markdown-table'
import fetch from 'node-fetch'

const scenarios = [
  'blank',
  'picker',
  'compact',
  'full'
]

async function measureMemory (scenario) {
  const browser = await puppeteer.launch({
    headless: false, // required for performance.measureMemory()
    args: [
      '-enable-experimental-web-platform-features' // required for performance.measureMemory()
    ]
  })
  const page = await browser.newPage()
  await page.goto(`http://localhost:3000?${scenario}=1`, {
    waitUntil: 'networkidle0'
  })
  await new Promise(resolve => setTimeout(resolve, 2000))
  const bytes = await page.evaluate(async () => (await performance.measureMemory()).bytes)
  await browser.close()
  return bytes
}

function printBytes (bytes) {
  return `${prettyBytes(bytes)} (${bytes})`
}

async function main () {
  while (true) {
    const resp = await fetch('http://localhost:3000')
    if (resp.status === 200) {
      break
    } else {
      console.log('Waiting for localhost:3000 to be availble')
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  const results = []
  for (const scenario of scenarios) {
    const bytes = await measureMemory(scenario)
    const relativeBytes = results.length ? (bytes - results[0].bytes) : 0
    results.push({
      scenario,
      bytes,
      relativeBytes
    })
  }
  console.log(table([
    ['Scenario', 'Bytes', 'Relative to blank page'],
    ...results.map(({ scenario, bytes, relativeBytes }) => (
      [scenario, printBytes(bytes), printBytes(relativeBytes)]
    ))
  ]))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})