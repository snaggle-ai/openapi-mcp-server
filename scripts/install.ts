import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'url'
import fs from 'node:fs'
import chalk from 'chalk'
import which from 'which'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const [_, __, claude_name, workers_url, ...rest] = process.argv

if (!claude_name || !workers_url || rest.length > 0) {
  console.error('usage: tsx ./scripts/install.ts <claude_name> <workers_url>')
  process.exit(1)
}

export function isDirectory(configPath: string) {
  try {
    return fs.statSync(configPath).isDirectory()
  } catch (error) {
    // ignore error
    return false
  }
}

const claudeConfigPath = path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
const mcpConfig = {
  command: (await which('node')).trim(),
  args: [path.resolve(__dirname, '../node_modules/tsx/dist/cli.mjs'), path.join(__dirname, 'local-proxy.ts'), claude_name, workers_url],
}

console.log(`Looking for existing config in: ${chalk.yellow(path.dirname(claudeConfigPath))}`)
const configDirExists = isDirectory(path.dirname(claudeConfigPath))
if (configDirExists) {
  const existingConfig = fs.existsSync(claudeConfigPath) ? JSON.parse(fs.readFileSync(claudeConfigPath, 'utf8')) : { mcpServers: {} }
  const newConfig = {
    ...existingConfig,
    mcpServers: {
      ...existingConfig.mcpServers,
      [claude_name]: mcpConfig,
    },
  }
  fs.writeFileSync(claudeConfigPath, JSON.stringify(newConfig, null, 2))

  console.log(`${chalk.yellow(claude_name)} configured & added to Claude Desktop!`)
  console.log(`Wrote config to ${chalk.yellow(claudeConfigPath)}:`)
  const redactedNewConfig = {
    ...Object.fromEntries(Object.keys(existingConfig).map((k) => [k, '...'])),
    mcpServers: {
      ...Object.fromEntries(Object.keys(existingConfig.mcpServers).map((k) => [k, '...'])),
      [claude_name]: mcpConfig,
    },
  }
  console.log(chalk.gray(JSON.stringify(redactedNewConfig, null, 2)))
} else {
  const fullConfig = { mcpServers: { [claude_name]: mcpConfig } }
  console.log(
    `Couldn't detect Claude Desktop config at ${claudeConfigPath}.\nTo add the Cloudflare MCP server manually, add the following config to your ${chalk.yellow('claude_desktop_configs.json')} file:\n\n${JSON.stringify(fullConfig, null, 2)}`,
  )
}
