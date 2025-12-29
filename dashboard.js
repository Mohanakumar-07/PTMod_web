/**
 * PT Mod Dashboard
 * Discord OAuth2 Authentication and Server Management
 */

// Configuration
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const CONFIG = {
    CLIENT_ID: '1328624294628032523', // Your Discord Bot Client ID
    // Redirect URI dynamically set based on environment
    REDIRECT_URI: IS_LOCAL 
        ? 'http://127.0.0.1:10000/dashboard.html'
        : 'https://ptmod.mkhub.in/dashboard.html',
    // API Base - uses pt.gowshik.online for production, localhost for development
    API_BASE: IS_LOCAL 
        ? 'http://127.0.0.1:10000' 
        : 'https://pt.gowshik.online',
    SCOPES: 'identify guilds'
};

// State
let currentUser = null;
let userGuilds = [];
let selectedGuild = null;
let guildChannels = [];

/**
 * Ambient Background Animation (same as main site)
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
 * Discord OAuth2 Helper Functions
 */
function getOAuthURL() {
    const params = new URLSearchParams({
        client_id: CONFIG.CLIENT_ID,
        redirect_uri: CONFIG.REDIRECT_URI,
        response_type: 'token',
        scope: CONFIG.SCOPES
    });
    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

function parseHashParams() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return {
        access_token: params.get('access_token'),
        token_type: params.get('token_type'),
        expires_in: params.get('expires_in')
    };
}

function saveToken(token) {
    const expiry = Date.now() + (parseInt(token.expires_in) * 1000);
    localStorage.setItem('discord_token', JSON.stringify({
        access_token: token.access_token,
        token_type: token.token_type,
        expiry: expiry
    }));
}

function getToken() {
    const stored = localStorage.getItem('discord_token');
    if (!stored) return null;
    
    const token = JSON.parse(stored);
    if (Date.now() > token.expiry) {
        localStorage.removeItem('discord_token');
        return null;
    }
    return token;
}

function clearToken() {
    localStorage.removeItem('discord_token');
}

/**
 * Discord API Functions
 */
async function fetchDiscordUser(token) {
    const response = await fetch('https://discord.com/api/users/@me', {
        headers: {
            'Authorization': `${token.token_type} ${token.access_token}`
        }
    });
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
}

async function fetchUserGuilds(token) {
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: {
            'Authorization': `${token.token_type} ${token.access_token}`
        }
    });
    if (!response.ok) throw new Error('Failed to fetch guilds');
    return response.json();
}

/**
 * Backend API Functions
 */
async function fetchGuildChannels(guildId) {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/api/guild/${guildId}/channels`);
        if (!response.ok) {
            console.error('Failed to fetch channels');
            return [];
        }
        return response.json();
    } catch (error) {
        console.error('Error fetching channels:', error);
        return [];
    }
}

async function fetchGuildSettings(guildId) {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/api/guild/${guildId}/settings`);
        if (!response.ok) {
            return { welcome_channel: null, leave_channel: null };
        }
        return response.json();
    } catch (error) {
        console.error('Error fetching settings:', error);
        return { welcome_channel: null, leave_channel: null };
    }
}

async function saveGuildSettings(guildId, settings) {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/api/guild/${guildId}/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        return response.ok;
    } catch (error) {
        console.error('Error saving settings:', error);
        return false;
    }
}

/**
 * UI Functions
 */
function showLoginSection() {
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('loginBtn').style.display = 'inline-flex';
}

function showDashboardSection() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('loginBtn').style.display = 'none';
}

function updateUserUI(user) {
    const avatarUrl = user.avatar 
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`;
    
    document.getElementById('userAvatar').src = avatarUrl;
    document.getElementById('userName').textContent = user.global_name || user.username;
    document.getElementById('userTag').textContent = user.discriminator !== '0' 
        ? `#${user.discriminator}` 
        : `@${user.username}`;
}

function renderServerList(guilds) {
    const container = document.getElementById('serverList');
    
    // Filter guilds where user has admin permission (0x8 = Administrator)
    const adminGuilds = guilds.map(guild => ({
        ...guild,
        isAdmin: (parseInt(guild.permissions) & 0x8) === 0x8
    }));
    
    // Sort: admin guilds first
    adminGuilds.sort((a, b) => b.isAdmin - a.isAdmin);
    
    container.innerHTML = adminGuilds.map(guild => {
        const iconUrl = guild.icon 
            ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
            : null;
        
        const iconContent = iconUrl 
            ? `<img src="${iconUrl}" alt="${guild.name}" class="server-icon">`
            : `<div class="server-icon">${guild.name.charAt(0).toUpperCase()}</div>`;
        
        const roleClass = guild.isAdmin ? 'admin' : 'no-admin';
        const roleText = guild.isAdmin ? 'Admin' : 'No Admin Access';
        const cardClass = guild.isAdmin ? '' : 'disabled';
        
        return `
            <div class="server-card ${cardClass}" data-guild-id="${guild.id}" data-is-admin="${guild.isAdmin}">
                ${iconContent}
                <p class="server-name">${guild.name}</p>
                <p class="server-role ${roleClass}">${roleText}</p>
            </div>
        `;
    }).join('');
    
    // Add click handlers
    container.querySelectorAll('.server-card').forEach(card => {
        card.addEventListener('click', () => {
            if (card.dataset.isAdmin === 'true') {
                selectServer(card.dataset.guildId);
            }
        });
    });
}

async function selectServer(guildId) {
    selectedGuild = userGuilds.find(g => g.id === guildId);
    if (!selectedGuild) return;
    
    // Show settings section
    document.querySelector('.server-selection').style.display = 'none';
    document.getElementById('serverSettings').style.display = 'block';
    
    // Update server info
    const iconUrl = selectedGuild.icon 
        ? `https://cdn.discordapp.com/icons/${selectedGuild.id}/${selectedGuild.icon}.png?size=128`
        : '';
    
    const serverIcon = document.getElementById('selectedServerIcon');
    if (iconUrl) {
        serverIcon.src = iconUrl;
        serverIcon.style.display = 'block';
    } else {
        serverIcon.style.display = 'none';
    }
    
    document.getElementById('selectedServerName').textContent = selectedGuild.name;
    
    // Fetch channels and settings
    const [channels, settings] = await Promise.all([
        fetchGuildChannels(guildId),
        fetchGuildSettings(guildId)
    ]);
    
    guildChannels = channels;
    
    // Populate channel dropdowns
    populateChannelDropdowns(channels, settings);
}

function populateChannelDropdowns(channels, settings) {
    const welcomeSelect = document.getElementById('welcomeChannel');
    const leaveSelect = document.getElementById('leaveChannel');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const leaveMessage = document.getElementById('leaveMessage');
    
    // Filter text channels only (type 0)
    const textChannels = channels.filter(ch => ch.type === 0);
    
    const optionsHTML = '<option value="">-- Select Channel --</option>' + 
        textChannels.map(ch => `<option value="${ch.id}"># ${ch.name}</option>`).join('');
    
    welcomeSelect.innerHTML = optionsHTML;
    leaveSelect.innerHTML = optionsHTML;
    
    // Set current values
    if (settings.welcome_channel) {
        welcomeSelect.value = settings.welcome_channel;
        document.getElementById('welcomeStatus').textContent = 'Set';
        document.getElementById('welcomeStatus').classList.add('set');
    } else {
        document.getElementById('welcomeStatus').textContent = 'Not Set';
        document.getElementById('welcomeStatus').classList.remove('set');
    }
    
    if (settings.leave_channel) {
        leaveSelect.value = settings.leave_channel;
        document.getElementById('leaveStatus').textContent = 'Set';
        document.getElementById('leaveStatus').classList.add('set');
    } else {
        document.getElementById('leaveStatus').textContent = 'Not Set';
        document.getElementById('leaveStatus').classList.remove('set');
    }
    
    // Set custom messages
    welcomeMessage.value = settings.welcome_message || '';
    leaveMessage.value = settings.leave_message || '';
    
    // Update status on change
    welcomeSelect.addEventListener('change', () => {
        const status = document.getElementById('welcomeStatus');
        if (welcomeSelect.value) {
            status.textContent = 'Modified';
            status.classList.add('set');
        } else {
            status.textContent = 'Not Set';
            status.classList.remove('set');
        }
    });
    
    leaveSelect.addEventListener('change', () => {
        const status = document.getElementById('leaveStatus');
        if (leaveSelect.value) {
            status.textContent = 'Modified';
            status.classList.add('set');
        } else {
            status.textContent = 'Not Set';
            status.classList.remove('set');
        }
    });
}

function goBackToServerList() {
    document.querySelector('.server-selection').style.display = 'block';
    document.getElementById('serverSettings').style.display = 'none';
    selectedGuild = null;
    document.getElementById('saveMessage').textContent = '';
}

async function handleSaveSettings() {
    if (!selectedGuild) return;
    
    const welcomeChannel = document.getElementById('welcomeChannel').value;
    const leaveChannel = document.getElementById('leaveChannel').value;
    const welcomeMessage = document.getElementById('welcomeMessage').value.trim();
    const leaveMessage = document.getElementById('leaveMessage').value.trim();
    
    const saveBtn = document.getElementById('saveSettings');
    const saveMsg = document.getElementById('saveMessage');
    
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    const success = await saveGuildSettings(selectedGuild.id, {
        welcome_channel: welcomeChannel || null,
        leave_channel: leaveChannel || null,
        welcome_message: welcomeMessage || null,
        leave_message: leaveMessage || null
    });
    
    saveBtn.disabled = false;
    saveBtn.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
        </svg>
        Save Settings
    `;
    
    if (success) {
        saveMsg.textContent = '✓ Settings saved successfully!';
        saveMsg.className = 'save-message success';
        
        // Update status badges
        const welcomeStatus = document.getElementById('welcomeStatus');
        const leaveStatus = document.getElementById('leaveStatus');
        
        if (welcomeChannel) {
            welcomeStatus.textContent = 'Set';
            welcomeStatus.classList.add('set');
        } else {
            welcomeStatus.textContent = 'Not Set';
            welcomeStatus.classList.remove('set');
        }
        
        if (leaveChannel) {
            leaveStatus.textContent = 'Set';
            leaveStatus.classList.add('set');
        } else {
            leaveStatus.textContent = 'Not Set';
            leaveStatus.classList.remove('set');
        }
    } else {
        saveMsg.textContent = '✗ Failed to save settings. Make sure the bot is in this server.';
        saveMsg.className = 'save-message error';
    }
}

function handleLogin() {
    window.location.href = getOAuthURL();
}

function handleLogout() {
    clearToken();
    currentUser = null;
    userGuilds = [];
    selectedGuild = null;
    showLoginSection();
    // Clear hash from URL
    history.replaceState(null, '', window.location.pathname);
}

/**
 * Initialize Dashboard
 */
async function initDashboard() {
    // Initialize background animation
    const canvas = document.getElementById('backgroundCanvas');
    if (canvas) new AmbientBackground(canvas);
    
    // Setup event listeners
    document.getElementById('loginBtn').addEventListener('click', (e) => {
        e.preventDefault();
        handleLogin();
    });
    
    document.getElementById('loginBtnMain').addEventListener('click', (e) => {
        e.preventDefault();
        handleLogin();
    });
    
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('backBtn').addEventListener('click', goBackToServerList);
    document.getElementById('saveSettings').addEventListener('click', handleSaveSettings);
    
    // Check for OAuth callback
    const hashParams = parseHashParams();
    if (hashParams.access_token) {
        saveToken(hashParams);
        // Clear hash from URL
        history.replaceState(null, '', window.location.pathname);
    }
    
    // Check for existing token
    const token = getToken();
    if (token) {
        try {
            // Fetch user data
            currentUser = await fetchDiscordUser(token);
            userGuilds = await fetchUserGuilds(token);
            
            // Update UI
            updateUserUI(currentUser);
            renderServerList(userGuilds);
            showDashboardSection();
        } catch (error) {
            console.error('Error loading user data:', error);
            clearToken();
            showLoginSection();
        }
    } else {
        showLoginSection();
    }
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', initDashboard);
