/**
 * Gemini Assistant Component
 * Modular floating assistant for Holcim portal or any web project.
 * Features: Floating button, Chat window, Minimize/Close, API/Demo mode.
 */

(function () {
    // Configuration
    const CONFIG = {
        title: "Gemini AI Assistant",
        welcomeMessage: "¡Hola! Soy tu asistente de IA para el portal Holcim. ¿En qué puedo ayudarte hoy?",
        apiKey: "", // Add API key here or use it from environment
        model: "gemini-1.5-flash",
        isDemo: true // Set to false to use real API calls
    };

    let chatHistory = [];
    let isOpen = false;
    let isMinimized = false;

    // --- UI GENERATION ---
    function initUI() {
        // Create FAB
        const fab = document.createElement('button');
        fab.className = 'gemini-fab';
        fab.id = 'gemini-fab';
        fab.innerHTML = '<i class="fas fa-robot"></i>';
        fab.title = "Abrir Asistente AI";
        document.body.appendChild(fab);

        // Create Chat Container
        const container = document.createElement('div');
        container.className = 'gemini-chat-container';
        container.id = 'gemini-chat-container';
        container.innerHTML = `
            <div class="gemini-header" id="gemini-header">
                <div class="gemini-header-title">
                    <i class="fas fa-sparkles"></i>
                    <span>${CONFIG.title}</span>
                </div>
                <div class="gemini-header-actions">
                    <i class="fas fa-minus" id="gemini-minimize" title="Minimizar"></i>
                    <i class="fas fa-times" id="gemini-close" title="Cerrar"></i>
                </div>
            </div>
            <div class="gemini-body" id="gemini-chat-body">
                <!-- Messages will appear here -->
            </div>
            <div class="gemini-footer">
                <textarea class="gemini-input" id="gemini-input" placeholder="Escribe tu mensaje..." rows="1"></textarea>
                <button class="gemini-send-btn" id="gemini-send" title="Enviar">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        `;
        document.body.appendChild(container);

        // Add Welcome Message
        addMessage('ai', CONFIG.welcomeMessage);

        // --- EVENT LISTENERS ---
        fab.addEventListener('click', toggleChat);
        document.getElementById('gemini-minimize').addEventListener('click', minimizeChat);
        document.getElementById('gemini-close').addEventListener('click', closeChat);
        document.getElementById('gemini-header').addEventListener('click', (e) => {
            if (e.target.id === 'gemini-header' || e.target.parentElement.id === 'gemini-header') {
                if (isMinimized) minimizeChat();
            }
        });

        const input = document.getElementById('gemini-input');
        const sendBtn = document.getElementById('gemini-send');

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });

        sendBtn.addEventListener('click', handleSendMessage);
    }

    // --- LOGIC ---
    function toggleChat() {
        const container = document.getElementById('gemini-chat-container');
        const fab = document.getElementById('gemini-fab');

        isOpen = !isOpen;
        if (isOpen) {
            container.classList.add('open');
            fab.classList.add('active');
            fab.innerHTML = '<i class="fas fa-times"></i>';
            if (isMinimized) minimizeChat();
            setTimeout(() => document.getElementById('gemini-input').focus(), 300);
        } else {
            closeChat();
        }
    }

    function minimizeChat() {
        const container = document.getElementById('gemini-chat-container');
        isMinimized = !isMinimized;
        container.classList.toggle('minimized', isMinimized);
    }

    function closeChat() {
        const container = document.getElementById('gemini-chat-container');
        const fab = document.getElementById('gemini-fab');
        isOpen = false;
        container.classList.remove('open');
        fab.classList.remove('active');
        fab.innerHTML = '<i class="fas fa-robot"></i>';
    }

    function addMessage(role, text) {
        const body = document.getElementById('gemini-chat-body');
        const msgDiv = document.createElement('div');
        msgDiv.className = `gemini-message ${role}`;
        msgDiv.innerText = text;
        body.appendChild(msgDiv);
        body.scrollTop = body.scrollHeight;

        // Save to context
        chatHistory.push({ role: role === 'ai' ? 'model' : 'user', parts: [{ text: text }] });
    }

    function showTyping(show) {
        const body = document.getElementById('gemini-chat-body');
        const existing = document.getElementById('gemini-typing');

        if (show && !existing) {
            const typing = document.createElement('div');
            typing.id = 'gemini-typing';
            typing.className = 'gemini-typing';
            typing.innerHTML = '<span></span><span></span><span></span>';
            body.appendChild(typing);
            body.scrollTop = body.scrollHeight;
        } else if (!show && existing) {
            existing.remove();
        }
    }

    async function handleSendMessage() {
        const input = document.getElementById('gemini-input');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        input.style.height = 'auto';
        addMessage('user', text);

        showTyping(true);

        try {
            let responseText = "";
            if (CONFIG.isDemo || !CONFIG.apiKey) {
                responseText = await getDemoResponse(text);
            } else {
                responseText = await callGeminiAPI(text);
            }
            addMessage('ai', responseText);
        } catch (error) {
            console.error("Gemini Error:", error);
            addMessage('ai', "Lo siento, hubo un error al procesar tu solicitud. Por favor intenta de nuevo.");
        } finally {
            showTyping(false);
        }
    }

    // --- API INTEGRATION ---
    async function callGeminiAPI(userInput) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.model}:generateContent?key=${CONFIG.apiKey}`;

        const payload = {
            contents: chatHistory
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            return data.candidates[0].content.parts[0].text;
        }
        throw new Error("Invalid API response format");
    }

    // --- DEMO MODE (For testing without key) ---
    async function getDemoResponse(userInput) {
        return new Promise(resolve => {
            setTimeout(() => {
                const lowerInput = userInput.toLowerCase();
                if (lowerInput.includes('hola') || lowerInput.includes('buenos')) {
                    resolve("¡Hola! Soy el asistente de Gemini en modo demostración. ¿Puedo ayudarte con información sobre el portal Holcim?");
                } else if (lowerInput.includes('acceso') || lowerInput.includes('ingreso')) {
                    resolve("Para registrar un ingreso, ve a la sección 'Control de Acceso' en el menú lateral. Ahí podrás ingresar el número de cédula y los datos del visitante.");
                } else if (lowerInput.includes('estadística') || lowerInput.includes('reporte')) {
                    resolve("Puedes ver las estadísticas generales haciendo clic en 'Estadísticas' o generar reportes detallados desde la pestaña 'Histórico y Reportes'.");
                } else {
                    resolve("Entendido. Estoy funcionando en modo demo para que pruebes mi interfaz. Si necesitas respuestas reales, asegúrate de configurar mi API Key.");
                }
            }, 1000);
        });
    }

    // Auto-adjust textarea height
    document.addEventListener('input', (e) => {
        if (e.target.id === 'gemini-input') {
            e.target.style.height = 'auto';
            e.target.style.height = (e.target.scrollHeight) + 'px';
        }
    });

    // --- INITIALIZE ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUI);
    } else {
        initUI();
    }

})();
