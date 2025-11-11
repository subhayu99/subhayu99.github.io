#!/usr/bin/env node

// Simple script to start the frontend-only Vite dev server
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const viteProcess = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '5173'], {
  cwd: path.join(__dirname, 'client'),
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

viteProcess.on('error', (error) => {
  console.error('Failed to start Vite dev server:', error);
  process.exit(1);
});

viteProcess.on('exit', (code) => {
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  viteProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  viteProcess.kill('SIGTERM');
});