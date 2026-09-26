#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tsxBin = path.join(__dirname, 'node_modules', '.bin', 'tsx');

const child = spawn(process.platform === 'win32' ? `${tsxBin}.cmd` : tsxBin, ['server.ts'], {
  stdio: 'inherit',
  env: process.env,
  cwd: __dirname
});

child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
