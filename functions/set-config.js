const fs = require('fs')
const env = process.argv[2]

const configPath = `./configs/config.${env}.json`

if (!(configPath && fs.existsSync(configPath))) {
  return
}

const collectConfigLines = (o, propPath, configLines) => {
  propPath = propPath || ''
  configLines = configLines || []
  for (const key of Object.keys(o)) {
    const newPropPath = propPath + key
    if (typeof o[key] === 'object') {
      collectConfigLines(o[key], newPropPath + '.', configLines)
    } else if (o[key] != null && o[key] !== '') {
      configLines.push(`${newPropPath}=${JSON.stringify(o[key])}`)
    }
  }
}

const config = require(configPath)
const configLines = []
collectConfigLines(config, '', configLines)

const cp = require('child_process')

try {
  cp.execSync(`firebase -P ${env} functions:config:set ${configLines.join(' ')}`)
} catch (e) {
  console.log(e)
}