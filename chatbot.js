const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');


const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'chatbot-caio', 
    }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
});


client.on('qr', qr => {
    console.log('Escaneie o QR Code abaixo para conectar o WhatsApp:');
    qrcode.generate(qr, { small: true });
});


client.on('ready', () => {
    console.log('Tudo certo! Chatbot Caio Dourado do WhatsApp conectado.');
});


const delay = ms => new Promise(res => setTimeout(res, ms));


let initialMessageSent = new Set();


let lastMessageTime = new Map();


let followUpTimers = new Map();


if (fs.existsSync('initialMessageSent.json')) {
    const savedData = JSON.parse(fs.readFileSync('initialMessageSent.json'));
    initialMessageSent = new Set(savedData);
}


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


const saveInitialMessageSent = () => {
    fs.writeFileSync('initialMessageSent.json', JSON.stringify([...initialMessageSent]));
};


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


const scheduleFirstFollowUp = (from, timeRemaining = 59 * 60 * 1000) => {

    const timer = setTimeout(async () => {
        const contact = await msg.getContact();
        const name = contact.pushname || 'Cliente';

        await client.sendMessage(from, 'Tudo bem? Seu interesse em adquirir o veículo seria *a vista* ou *financiado*?');
       

        scheduleSecondFollowUp(from);
        followUpTimers.delete(from);
        saveFollowUpTimers();
        console.log('CLIENTE AINDA NAO RESPONDEU 1', name.split(" ")[0]);
    }, timeRemaining);

    followUpTimers.set(from, { timer, timeRemaining, followUpType: 'first' });
    saveFollowUpTimers();
};


const scheduleSecondFollowUp = (from, timeRemaining = 4 * 60 * 60 * 1000) => {
    const timer = setTimeout(async () => {
        const contact = await msg.getContact();
        const name = contact.pushname || 'Cliente';

        await client.sendMessage(from, 'Seu interesse em adquirir o veículo seria *a vista* ou *financiado*?');
        
        followUpTimers.delete(from);
        saveFollowUpTimers();
        console.log('CLIENTE AINDA NAO RESPONDEU 2', name.split(" ")[0]);
    }, timeRemaining);

    followUpTimers.set(from, { timer, timeRemaining, followUpType: 'second' });
    saveFollowUpTimers();
};


const cancelFollowUpTimers = (from) => {
    if (followUpTimers.has(from)) {
        clearTimeout(followUpTimers.get(from).timer);
        followUpTimers.delete(from);
        saveFollowUpTimers();
    }
};


client.on('message', async msg => {
    const now = Date.now();
    const lastSent = lastMessageTime.get(msg.from) || 0;
    const twentyFourHours = 24 * 60 * 60 * 1000;

    
    if (msg.body.match(/(Olá|olá|ola|Ola)/i) && msg.from.endsWith('@c.us')) {
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

           
            lastMessageTime.set(msg.from, now);

            
            scheduleFirstFollowUp(msg.from);

            console.log('Chat iniciado com', name.split(" ")[0]);
        }
    }

   
    const vistaPattern = /^(avista|a vista|a-vista|avsta|avista!|à vista)$/i;
    const financiadoPattern = /^(financiado|finaciado|finacimento|financiamento|finan|finan\.)$/i;
    
    if (msg.body && (msg.body.match(vistaPattern) || msg.body.match(financiadoPattern)) && msg.from.endsWith('@c.us')) {
      
        cancelFollowUpTimers(msg.from);

        const chat = await msg.getChat();
        await delay(1000);
        await chat.sendStateTyping();
        await delay(1000);

        if (msg.body.match(vistaPattern)) {
            await client.sendMessage(msg.from, 'Ótimo! Vamos prosseguir com as informações para pagamento à vista.');
        } else if (msg.body.match(financiadoPattern)) {
            const contact = await msg.getContact();
            const name = contact.pushname || 'Cliente';

            await client.sendMessage(
                msg.from,
                'Nosso financiamento é bancário, e pode ser feito em até 60 vezes. Independente de score ou renda.\n' +
                'Para fazer o financiamento preciso que me responda estas perguntas:\n\n' +
                '- Tem o nome limpo?\n' +
                '- Qual o valor você tem disponível para investir no seu financiamento?'
            );
            console.log('CLIENTE DECIDIU FINANCIAMENTO,', name.split(" ")[0]);
        }
    }
});


client.initialize();


client.on('disconnected', reason => {
    console.log('Cliente desconectado:', reason);
});