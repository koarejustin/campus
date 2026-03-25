// ================================================================
// NOTIFICATIONS - VERSION FINALE (AUTO SON + REDIRECTION)
// ================================================================

console.log('🔔 Chargement des notifications...');

// Créer un élément audio préchargé (contourne les restrictions)
const notificationAudio = new Audio();
// Son court en base64 (bip simple)
notificationAudio.src = 'data:audio/wav;base64,U3RlYWQgbm90aWZpY2F0aW9uIHNvdW5k';
notificationAudio.volume = 0.6;
notificationAudio.load();

// Jouer le son immédiatement sans attendre l'interaction
function playSound() {
    try {
        notificationAudio.currentTime = 0;
        notificationAudio.play().catch(e => {
            // Fallback si le son ne marche pas
            console.log('Fallback son');
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.value = 880;
            gain.gain.value = 0.2;
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.2);
            osc.stop(audioCtx.currentTime + 0.2);
            if (audioCtx.state === 'suspended') audioCtx.resume();
        });
    } catch (e) { }
}

// Fonction de redirection
function redirectTo(notif) {
    console.log('🔀 Redirection:', notif.type, notif.lien);

    if (notif.lien && notif.lien !== '#') {
        window.location.href = notif.lien;
        return;
    }

    const type = (notif.type || '').toUpperCase();
    const pages = {
        'NOTE': '/eleve.html?page=bulletin',
        'RESSOURCE': '/eleve.html?page=ressources',
        'ORIENTATION': '/eleve.html?page=orientation',
        'ABSENCE': '/eleve.html?page=absences',
        'CONVOCATION': '/eleve.html?page=convocations'
    };

    if (pages[type]) {
        window.location.href = pages[type];
    } else {
        document.getElementById('notif-btn')?.click();
    }
}

function initNotifications() {
    console.log('🔔 initNotifications appelée');

    // Trouver ou créer le conteneur
    let topbar = document.querySelector('.topbar, .pg-hd, header, nav');
    if (!topbar) {
        const container = document.createElement('div');
        container.className = 'topbar';
        container.style.cssText = 'display:flex; justify-content:flex-end; align-items:center; padding:10px 20px;';
        document.body.insertBefore(container, document.body.firstChild);
        topbar = container;
    }

    if (document.getElementById('notif-btn')) return;

    // Créer l'interface
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.display = 'inline-block';
    container.style.marginLeft = 'auto';
    container.innerHTML = `
        <button id="notif-btn" style="position:relative; background:none; border:none; cursor:pointer; padding:8px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span id="notif-badge" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border-radius:50%; padding:2px 5px; font-size:10px; display:none;">0</span>
        </button>
        <div id="notif-dropdown" style="position:absolute; right:0; top:40px; width:320px; background:white; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.15); display:none; z-index:1000; border:1px solid #e5e7eb;">
            <div style="padding:12px 16px; border-bottom:1px solid #e5e7eb; font-weight:bold; color:#1f2937;">🔔 Notifications</div>
            <div id="notif-list" style="max-height:400px; overflow-y:auto;">
                <div style="padding:20px; text-align:center; color:#9ca3af;">📭 Aucune notification</div>
            </div>
            <div style="padding:10px; text-align:center; border-top:1px solid #e5e7eb;">
                <button id="mark-all-read" style="background:none; border:none; color:#4F46E5; cursor:pointer; font-size:13px;">Tout marquer comme lu</button>
            </div>
        </div>
    `;

    topbar.appendChild(container);

    const btn = document.getElementById('notif-btn');
    const dropdown = document.getElementById('notif-dropdown');

    btn.onclick = (e) => {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        chargerNotifications();
    };

    document.onclick = () => dropdown.style.display = 'none';
    dropdown.onclick = (e) => e.stopPropagation();

    function chargerNotifications() {
        const token = localStorage.getItem('token');
        if (!token) return;

        fetch('/api/notifications/unread', {
            headers: { 'Authorization': 'Bearer ' + token }
        })
            .then(r => r.json())
            .then(data => {
                const list = document.getElementById('notif-list');
                const badge = document.getElementById('notif-badge');
                const notifs = data.notifications || [];

                if (notifs.length === 0) {
                    list.innerHTML = '<div style="padding:20px; text-align:center; color:#9ca3af;">📭 Aucune notification</div>';
                    badge.style.display = 'none';
                } else {
                    list.innerHTML = notifs.map(n => `
                    <div class="notif-item" data-id="${n.id_notification}" data-type="${n.type}" data-lien="${n.lien || ''}" style="padding:12px 16px; border-bottom:1px solid #f3f4f6; cursor:pointer; transition:background 0.2s;">
                        <div style="font-weight:bold; color:#1f2937;">${escapeHtml(n.titre || n.type)}</div>
                        <div style="font-size:13px; color:#6b7280; margin-top:2px;">${escapeHtml(n.contenu || '')}</div>
                        <div style="font-size:11px; color:#9ca3af; margin-top:4px;">${formatDate(n.created_at)}</div>
                    </div>
                `).join('');

                    badge.textContent = notifs.length;
                    badge.style.display = 'inline-block';

                    document.querySelectorAll('.notif-item').forEach(item => {
                        item.onclick = (e) => {
                            e.stopPropagation();
                            const id = item.dataset.id;
                            const type = item.dataset.type;
                            const lien = item.dataset.lien;

                            fetch(`/api/notifications/${id}/read`, {
                                method: 'PUT',
                                headers: { 'Authorization': 'Bearer ' + token }
                            }).finally(() => {
                                if (lien && lien !== '#') {
                                    window.location.href = lien;
                                } else if (type === 'NOTE') {
                                    window.location.href = '/eleve.html?page=bulletin';
                                } else if (type === 'RESSOURCE') {
                                    window.location.href = '/eleve.html?page=ressources';
                                } else if (type === 'ORIENTATION') {
                                    window.location.href = '/eleve.html?page=orientation';
                                } else if (type === 'ABSENCE') {
                                    window.location.href = '/eleve.html?page=absences';
                                } else if (type === 'CONVOCATION') {
                                    window.location.href = '/eleve.html?page=convocations';
                                } else {
                                    dropdown.style.display = 'none';
                                    chargerNotifications();
                                }
                            });
                        };
                        item.onmouseenter = () => item.style.backgroundColor = '#f9fafb';
                        item.onmouseleave = () => item.style.backgroundColor = 'transparent';
                    });
                }
            })
            .catch(e => console.error('Erreur:', e));
    }

    document.getElementById('mark-all-read').onclick = () => {
        const token = localStorage.getItem('token');
        fetch('/api/notifications/read-all', {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token }
        }).then(() => {
            chargerNotifications();
            document.getElementById('notif-badge').style.display = 'none';
        });
    };

    chargerNotifications();
    setInterval(chargerNotifications, 5000);

    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        if (diff < 10) return 'à l\'instant';
        if (diff < 60) return `il y a ${diff} sec`;
        if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }

    // Socket.io pour notifications instantanées
    if (typeof io !== 'undefined') {
        const socket = io();
        socket.on('connect', () => {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user_session') || '{}');
            socket.emit('auth', { token, code: user.code_unique });
            console.log('🔌 Socket connecté');
        });

        socket.on('new-notification', (notif) => {
            console.log('🔔 Notification reçue!', notif);

            // JOUER LE SON AUTOMATIQUEMENT
            playSound();

            // Animer la cloche
            const btnNotif = document.getElementById('notif-btn');
            if (btnNotif) {
                btnNotif.style.transform = 'scale(1.2)';
                setTimeout(() => btnNotif.style.transform = '', 300);
            }

            // Recharger les notifications
            chargerNotifications();

            // Afficher un toast
            const toast = document.createElement('div');
            toast.innerHTML = `
                <div style="background:#4F46E5; color:white; padding:12px 18px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.2); cursor:pointer;">
                    <div style="font-weight:bold;">🔔 ${escapeHtml(notif.titre || 'Notification')}</div>
                    <div style="font-size:12px; margin-top:4px;">${escapeHtml(notif.contenu || '')}</div>
                </div>
            `;
            toast.style.cssText = 'position:fixed; bottom:20px; right:20px; z-index:10000; animation: slideIn 0.3s ease-out;';

            if (!document.getElementById('notif-animation')) {
                const style = document.createElement('style');
                style.id = 'notif-animation';
                style.textContent = `@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`;
                document.head.appendChild(style);
            }

            document.body.appendChild(toast);

            toast.onclick = () => {
                if (notif.lien && notif.lien !== '#') {
                    window.location.href = notif.lien;
                } else {
                    const type = notif.type || '';
                    if (type === 'NOTE') window.location.href = '/eleve.html?page=bulletin';
                    else if (type === 'RESSOURCE') window.location.href = '/eleve.html?page=ressources';
                    else if (type === 'ORIENTATION') window.location.href = '/eleve.html?page=orientation';
                    else if (type === 'ABSENCE') window.location.href = '/eleve.html?page=absences';
                    else if (type === 'CONVOCATION') window.location.href = '/eleve.html?page=convocations';
                    else document.getElementById('notif-btn').click();
                }
            };

            setTimeout(() => {
                if (toast && toast.parentElement) {
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateX(100%)';
                    toast.style.transition = 'all 0.3s';
                    setTimeout(() => toast.remove(), 300);
                }
            }, 5000);
        });
    }
}

// Démarrer
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotifications);
} else {
    initNotifications();
}