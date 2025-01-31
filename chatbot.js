const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');

// Inicializar o cliente com LocalAuth para salvar/restaurar sessão
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'chatbot-caio', // Identificador único para a instância
    }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
});

// Evento para exibir o QR Code no terminal
client.on('qr', qr => {
    console.log('Escaneie o QR Code abaixo para conectar o WhatsApp:');
    qrcode.generate(qr, { small: true });
});

// Evento disparado quando o cliente está pronto
client.on('ready', () => {
    console.log('Tudo certo! Chatbot Caio Dourado do WhatsApp conectado.');
});

// Função de delay para simular digitação
const delay = ms => new Promise(res => setTimeout(res, ms));

// Conjunto para armazenar números de clientes que já iniciaram uma conversa
let initialMessageSent = new Set();

// Mapa para rastrear o momento da última mensagem enviada para cada cliente
let lastMessageTime = new Map();

// Mapa para armazenar os timers de follow-up para cada cliente
let followUpTimers = new Map();

// Carregar histórico salvo
if (fs.existsSync('initialMessageSent.json')) {
    const savedData = JSON.parse(fs.readFileSync('initialMessageSent.json'));
    initialMessageSent = new Set(savedData);
}

// Carregar timers de follow-up salvos
if (fs.existsSync('followUpTimers.json')) {
    const savedTimers = JSON.parse(fs.readFileSync('followUpTimers.json'));
    for (const [from, timerData] of Object.entries(savedTimers)) {
        const { timeRemaining, followUpType } = timerData;
        if (followUpType === 'first') {
            scheduleFirstFollowUp(from, timeRemaining);
        } else if (followUpType === 'second') {
            scheduleSecondFollowUp(from, timeRemaining);
        }
    }
}

// Função para salvar histórico ao adicionar um novo número
const saveInitialMessageSent = () => {
    fs.writeFileSync('initialMessageSent.json', JSON.stringify([...initialMessageSent]));
};

// Função para salvar os timers de follow-up
const saveFollowUpTimers = () => {
    const timersToSave = {};
    followUpTimers.forEach((timerData, from) => {
        timersToSave[from] = {
            timeRemaining: timerData.timeRemaining,
            followUpType: timerData.followUpType,
        };
    });
    fs.writeFileSync('followUpTimers.json', JSON.stringify(timersToSave));
};

// Função para enviar a primeira mensagem de follow-up após 30 minutos
const scheduleFirstFollowUp = (from, timeRemaining = 30 * 60 * 1000) => {
    const timer = setTimeout(async () => {
        await client.sendMessage(from, 'Você ainda está disponível?');
        // Agendar a segunda mensagem de follow-up após 2 horas
        scheduleSecondFollowUp(from);
        followUpTimers.delete(from);
        saveFollowUpTimers();
    }, timeRemaining);

    followUpTimers.set(from, { timer, timeRemaining, followUpType: 'first' });
    saveFollowUpTimers();
};

// Função para enviar a segunda mensagem de follow-up após 2 horas
const scheduleSecondFollowUp = (from, timeRemaining = 2 * 60 * 60 * 1000) => {
    const timer = setTimeout(async () => {
        await client.sendMessage(from, 'Você ainda tem interesse em adquirir o veículo?');
        followUpTimers.delete(from);
        saveFollowUpTimers();
    }, timeRemaining);

    followUpTimers.set(from, { timer, timeRemaining, followUpType: 'second' });
    saveFollowUpTimers();
};

// Função para cancelar os timers de follow-up
const cancelFollowUpTimers = (from) => {
    if (followUpTimers.has(from)) {
        clearTimeout(followUpTimers.get(from).timer);
        followUpTimers.delete(from);
        saveFollowUpTimers();
    }
};

// Evento para tratar mensagens recebidas
client.on('message', async msg => {
    const now = Date.now();
    const lastSent = lastMessageTime.get(msg.from) || 0;
    const twentyFourHours = 24 * 60 * 60 * 1000;

    // Verificar se a mensagem é de um novo cliente e se contém palavras-chave
    if (msg.body.match(/(menu|Menu|dia|tarde|noite|oi|Oi|Olá|olá|ola|Ola)/i) && msg.from.endsWith('@c.us')) {
        if (!initialMessageSent.has(msg.from) || (now - lastSent > twentyFourHours)) {
            const chat = await msg.getChat();
            await delay(1000);
            await chat.sendStateTyping();
            await delay(1000);
            const contact = await msg.getContact();
            const name = contact.pushname || 'Cliente';

            await client.sendMessage(
                msg.from,
                `Olá\n` +
                'Seja bem-vindo à maior concessionária online do Brasil, *Líder Auto Veículos*.\n' +
                'Meu nome é *Caio Dourado*, e vou te atender.\n' +
                'Seu interesse em adquirir o veículo seria *à vista* ou *financiado*?'
            );
            initialMessageSent.add(msg.from);
            saveInitialMessageSent();

            // Atualizar o momento da última mensagem enviada
            lastMessageTime.set(msg.from, now);

            // Agendar a primeira mensagem de follow-up
            scheduleFirstFollowUp(msg.from);

            console.log('Chat iniciado com', name.split(" ")[0]);
        }
    }

    // Verificar se a mensagem é sobre pagamento à vista ou financiado
    const vistaPattern = /^(avista|a vista|a-vista|avsta|avista!|à vista)$/i;
    const financiadoPattern = /^(financiado|finaciado|finacimento|financiamento|finan|finan\.)$/i;
    
    if (msg.body && (msg.body.match(vistaPattern) || msg.body.match(financiadoPattern)) && msg.from.endsWith('@c.us')) {
        // Cancelar os timers de follow-up se o cliente responder
        cancelFollowUpTimers(msg.from);

        const chat = await msg.getChat();
        await delay(1000);
        await chat.sendStateTyping();
        await delay(1000);

        if (msg.body.match(vistaPattern)) {
            await client.sendMessage(msg.from, 'Ótimo! Vamos prosseguir com as informações para pagamento à vista.');
        } else if (msg.body.match(financiadoPattern)) {
            await client.sendMessage(
                msg.from,
                'Nosso financiamento é bancário, e pode ser feito em até 60 vezes. Independente de score ou renda.\n' +
                'Para fazer o financiamento preciso que me responda estas perguntas:\n\n' +
                '- Tem o nome limpo?\n' +
                '- Qual o valor você tem disponível para investir no seu financiamento?'
            );
        }
    }
});

// Inicializar o cliente
client.initialize();

// Evento para desconexão
client.on('disconnected', reason => {
    console.log('Cliente desconectado:', reason);
});