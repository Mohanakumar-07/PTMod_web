/**
 * PT Mod - Custom Ambient Background Animation
 * Animated particle network with connecting lines
 * Particles move slowly and bounce within screen bounds
 */

class AmbientBackground {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.nodeCount = 80; // Number of particles
        this.connectionDistance = 250; // Max distance for connections
        this.neonViolet = '#8b5cf6';
        this.neonVioletGlow = 'rgba(139, 92, 246, 0.6)';
        
        this.init();
        this.setupEventListeners();
        this.animate();
    }

    init() {
        this.resize();
        
        // Create particles (points/nodes)
        for (let i = 0; i < this.nodeCount; i++) {
            // Movement from right to left with slight vertical variation
            const horizontalSpeed = Math.random() * 0.4 + 0.15; // Speed between 0.15-0.55
            const verticalSpeed = (Math.random() - 0.5) * 0.2; // Small vertical variation
            
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: -horizontalSpeed, // Move left (negative X)
                vy: verticalSpeed, // Small vertical movement
                radius: Math.random() * 0.8 + 0.5, // Smaller particle size (0.5-1.3px)
                opacity: Math.random() * 0.4 + 0.3 // Subtle opacity (0.3-0.7)
            });
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.resize();
            // Adjust particle positions to stay within bounds
            this.particles.forEach(particle => {
                if (particle.x < particle.radius) particle.x = particle.radius;
                if (particle.x > this.canvas.width - particle.radius) particle.x = this.canvas.width - particle.radius;
                if (particle.y < particle.radius) particle.y = particle.radius;
                if (particle.y > this.canvas.height - particle.radius) particle.y = this.canvas.height - particle.radius;
            });
        });
    }

    updateParticles() {
        this.particles.forEach(particle => {
            // Update position based on velocity
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Wrap from left to right (continuous right-to-left movement)
            if (particle.x < -particle.radius) {
                particle.x = this.canvas.width + particle.radius;
            } else if (particle.x > this.canvas.width + particle.radius) {
                particle.x = -particle.radius;
            }

            // Bounce off top and bottom bounds
            if (particle.y < particle.radius) {
                particle.y = particle.radius;
                particle.vy = -particle.vy; // Reverse Y velocity
            } else if (particle.y > this.canvas.height - particle.radius) {
                particle.y = this.canvas.height - particle.radius;
                particle.vy = -particle.vy; // Reverse Y velocity
            }
        });
    }

    /**
     * Draw particles as simple glowing points
     */
    drawParticles() {
        this.particles.forEach(particle => {
            // Create radial gradient for glow effect
            const gradient = this.ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.radius * 3
            );
            gradient.addColorStop(0, `rgba(139, 92, 246, ${particle.opacity})`);
            gradient.addColorStop(0.5, `rgba(139, 92, 246, ${particle.opacity * 0.4})`);
            gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');

            // Draw outer glow
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius * 3, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw core particle
            this.ctx.fillStyle = `rgba(139, 92, 246, ${particle.opacity * 1.2})`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawConnections() {
        // Draw connecting lines between nearby particles
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const particleA = this.particles[i];
                const particleB = this.particles[j];

                const dx = particleB.x - particleA.x;
                const dy = particleB.y - particleA.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.connectionDistance) {
                    // Calculate opacity based on distance (closer = brighter, farther = dimmer)
                    // Opacity decreases as distance increases
                    const maxOpacity = 0.3; // Maximum opacity for closest particles
                    const opacity = maxOpacity * (1 - distance / this.connectionDistance);
                    
                    this.ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
                    this.ctx.lineWidth = 1.5; // Thicker lines
                    this.ctx.beginPath();
                    this.ctx.moveTo(particleA.x, particleA.y);
                    this.ctx.lineTo(particleB.x, particleB.y);
                    this.ctx.stroke();
                }
            }
        }
    }

    animate() {
        // Clear canvas with pure black
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Update particle positions
        this.updateParticles();

        // Draw connections first (behind particles)
        this.drawConnections();

        // Draw particles on top
        this.drawParticles();

        // Continue animation using requestAnimationFrame
        requestAnimationFrame(() => this.animate());
    }
}

/**
 * PT Mod - API Integration
 * Fetches bot statistics from backend and updates UI
 */

class BotDataManager {
    constructor() {
        this.apiEndpoint = '/api/bot-stats';
        this.updateInterval = 5000; // Update every 5 seconds
        this.updateTimer = null;
    }

    /**
     * Format number with commas
     */
    formatNumber(num) {
        if (num === null || num === undefined || isNaN(num)) return '-';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * Format uptime from seconds to readable string
     */
    formatUptime(seconds) {
        if (!seconds || isNaN(seconds)) return '-';
        
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    /**
     * Format latency with unit
     */
    formatLatency(latency) {
        if (latency === null || latency === undefined || isNaN(latency)) return '-';
        return `${latency}ms`;
    }

    /**
     * Update status indicator
     */
    updateStatus(status) {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');

        if (!statusDot || !statusText) return;

        const isOnline = status === 'online';
        
        // Update classes
        statusDot.className = 'status-dot';
        if (isOnline) {
            statusDot.classList.add('online');
            statusText.textContent = 'Online';
        } else {
            statusDot.classList.add('offline');
            statusText.textContent = 'Offline';
        }
    }

    /**
     * Update all UI elements with bot data
     */
    updateUI(data) {
        // Update status
        this.updateStatus(data.status);

        // Update profile stats
        const serverCountEl = document.getElementById('serverCount');
        const userCountEl = document.getElementById('userCount');
        const latencyEl = document.getElementById('latency');

        if (serverCountEl) {
            serverCountEl.textContent = this.formatNumber(data.servers);
        }
        if (userCountEl) {
            userCountEl.textContent = this.formatNumber(data.users);
        }
        if (latencyEl) {
            latencyEl.textContent = this.formatLatency(data.latency);
        }

        // Update dashboard stats
        const statServersEl = document.getElementById('statServers');
        const statLatencyEl = document.getElementById('statLatency');
        const statUptimeEl = document.getElementById('statUptime');

        if (statServersEl) {
            statServersEl.textContent = this.formatNumber(data.servers);
        }
        if (statLatencyEl) {
            statLatencyEl.textContent = this.formatLatency(data.latency);
        }
        if (statUptimeEl) {
            statUptimeEl.textContent = this.formatUptime(data.uptime);
        }
    }

    /**
     * Fetch bot stats from API
     */
    async fetchBotStats() {
        try {
            const response = await fetch(this.apiEndpoint);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.updateUI(data);
        } catch (error) {
            console.error('Error fetching bot stats:', error);
            // Update status to show error/offline
            this.updateStatus('offline');
        }
    }

    /**
     * Start periodic updates
     */
    start() {
        // Fetch immediately
        this.fetchBotStats();
        
        // Then fetch periodically
        this.updateTimer = setInterval(() => {
            this.fetchBotStats();
        }, this.updateInterval);
    }

    /**
     * Stop periodic updates
     */
    stop() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }
}

/**
 * Icon Animation Manager
 * Adds dynamic animations to stat icons
 */
class IconAnimator {
    constructor() {
        this.icons = ['iconServers', 'iconLatency', 'iconUptime', 'iconFeatures'];
        this.init();
    }

    init() {
        this.icons.forEach((iconId, index) => {
            const icon = document.getElementById(iconId);
            if (icon) {
                // Add pulsing animation with staggered delays
                icon.style.animation = `iconPulse 3s ease-in-out infinite`;
                icon.style.animationDelay = `${index * 0.5}s`;
            }
        });
    }
}

// Initialize animation and data manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize background animation
    const canvas = document.getElementById('backgroundCanvas');
    if (canvas) {
        new AmbientBackground(canvas);
    }

    // Initialize bot data manager
    const botDataManager = new BotDataManager();
    botDataManager.start();

    // Initialize icon animations
    new IconAnimator();
});

