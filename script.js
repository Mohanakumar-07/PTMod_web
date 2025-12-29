/**
 * PT Mod - Custom Ambient Background Animation
 * Animated particle network with connecting lines
 */

class AmbientBackground {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.nodeCount = 80;
        this.connectionDistance = 250;

        this.init();
        this.setupEventListeners();
        this.animate();
    }

    init() {
        this.resize();

        for (let i = 0; i < this.nodeCount; i++) {
            const horizontalSpeed = Math.random() * 0.4 + 0.15;
            const verticalSpeed = (Math.random() - 0.5) * 0.2;

            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: -horizontalSpeed,
                vy: verticalSpeed,
                radius: Math.random() * 0.8 + 0.5,
                opacity: Math.random() * 0.4 + 0.3
            });
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resize());
    }

    updateParticles() {
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < -p.radius) p.x = this.canvas.width + p.radius;
            if (p.y < p.radius || p.y > this.canvas.height - p.radius) {
                p.vy *= -1;
            }
        });
    }

    drawParticles() {
        this.particles.forEach(p => {
            const g = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
            g.addColorStop(0, `rgba(139,92,246,${p.opacity})`);
            g.addColorStop(1, 'rgba(139,92,246,0)');
            this.ctx.fillStyle = g;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawConnections() {
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const a = this.particles[i];
                const b = this.particles[j];
                const d = Math.hypot(a.x - b.x, a.y - b.y);

                if (d < this.connectionDistance) {
                    this.ctx.strokeStyle = `rgba(139,92,246,${0.3 * (1 - d / this.connectionDistance)})`;
                    this.ctx.beginPath();
                    this.ctx.moveTo(a.x, a.y);
                    this.ctx.lineTo(b.x, b.y);
                    this.ctx.stroke();
                }
            }
        }
    }

    animate() {
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.updateParticles();
        this.drawConnections();
        this.drawParticles();
        requestAnimationFrame(() => this.animate());
    }
}

/**
 * Bot Data Manager (LIVE every 1 second)
 */

// API Configuration
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = IS_LOCAL ? 'http://127.0.0.1:10000' : 'https://pt.gowshik.online';

class BotDataManager {
    constructor() {
        this.apiEndpoint = `${API_BASE}/api/bot-stats`;
        this.updateInterval = 1000; 
        this.updateTimer = null;
        this.isFetching = false;
    }

    formatNumber(n) {
        return isNaN(n) ? "-" : n.toLocaleString();
    }

    formatLatency(ms) {
        return isNaN(ms) ? "-" : `${ms} ms`;
    }

    formatUptime(sec) {
        if (!sec) return "-";
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}m ${s}s`;
    }

    updateStatus(status) {
        const dot = document.getElementById("statusDot");
        const text = document.getElementById("statusText");
        if (!dot || !text) return;

        dot.className = "status-dot " + (status === "online" ? "online" : "offline");
        text.textContent = status === "online" ? "Online" : "Offline";
    }

    updateUI(d) {
        this.updateStatus(d.status);

        document.getElementById("serverCount").textContent = this.formatNumber(d.servers);
        document.getElementById("userCount").textContent = this.formatNumber(d.users);
        document.getElementById("latency").textContent = this.formatLatency(d.latency);

        document.getElementById("statServers").textContent = this.formatNumber(d.servers);
        document.getElementById("statLatency").textContent = this.formatLatency(d.latency);
        document.getElementById("statUptime").textContent = this.formatUptime(d.uptime);
    }

    async fetchBotStats() {
        if (this.isFetching) return;
        this.isFetching = true;

        try {
            const res = await fetch(this.apiEndpoint, { cache: "no-store" });
            if (!res.ok) throw new Error("API error");
            const data = await res.json();
            this.updateUI(data);
        } catch {
            this.updateStatus("offline");
        } finally {
            this.isFetching = false;
        }
    }

    start() {
        this.fetchBotStats(); // instant
        this.updateTimer = setInterval(() => this.fetchBotStats(), this.updateInterval);
    }

    stop() {
        clearInterval(this.updateTimer);
        this.updateTimer = null;
    }
}

/**
 * Icon Animator
 */

class IconAnimator {
    constructor() {
        ["iconServers", "iconLatency", "iconUptime", "iconFeatures"].forEach((id, i) => {
            const el = document.getElementById(id);
            if (el) {
                el.style.animation = "iconPulse 3s infinite";
                el.style.animationDelay = `${i * 0.4}s`;
            }
        });
    }
}

/**
 * Init
 */

let botDataManager;

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("backgroundCanvas");
    if (canvas) new AmbientBackground(canvas);

    botDataManager = new BotDataManager();
    botDataManager.start();

    new IconAnimator();
});

/**
 * Pause updates when tab inactive
 */
document.addEventListener("visibilitychange", () => {
    if (!botDataManager) return;
    document.hidden ? botDataManager.stop() : botDataManager.start();
});
