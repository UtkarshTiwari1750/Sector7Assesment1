#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting TriX Game Platform Services...\n');

// Start the backend API
console.log('📡 Starting Backend API...');
const api = spawn('node', ['api/index.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
});

// Start the leaderboard service
console.log('📊 Starting Leaderboard Service...');
const leaderboard = spawn('node', ['tools/leaderboard.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
});

// Start a simple HTTP server for the frontend
console.log('🌐 Starting Frontend Server...');
const frontend = spawn('npx', ['http-server', 'web', '-p', '8080', '--cors'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
});

console.log('\n✅ All services started!');
console.log('🔗 Frontend: http://localhost:8080');
console.log('📡 Backend API: http://localhost:3000');
console.log('📊 Leaderboard API: http://localhost:3001');
console.log('\nPress Ctrl+C to stop all services\n');

// Handle shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down all services...');
    api.kill('SIGINT');
    leaderboard.kill('SIGINT');
    frontend.kill('SIGINT');
    process.exit(0);
});

// Handle process exits
api.on('close', (code) => {
    console.log(`Backend API exited with code ${code}`);
});

leaderboard.on('close', (code) => {
    console.log(`Leaderboard service exited with code ${code}`);
});

frontend.on('close', (code) => {
    console.log(`Frontend server exited with code ${code}`);
});
