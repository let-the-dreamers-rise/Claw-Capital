import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import apiRoutes from './src/routes/api.js';
import { initMoltbook } from './src/engine/moltbook.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static dashboard
app.use(express.static(join(__dirname, 'public')));

// API routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'operational',
        agent: 'Claw Capital',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, async () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════╗');
    console.log('  ║                                          ║');
    console.log('  ║      👑 CLAW CAPITAL — ONLINE            ║');
    console.log('  ║      Autonomous Capital Engine            ║');
    console.log('  ║                                          ║');
    console.log(`  ║      Dashboard: http://localhost:${PORT}     ║`);
    console.log(`  ║      API:       http://localhost:${PORT}/api ║`);
    console.log('  ║                                          ║');
    console.log('  ╚══════════════════════════════════════════╝');
    console.log('');

    // Initialize Moltbook (auto-register if no key)
    await initMoltbook();
});
