const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'chatbot-caio' }),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', qr => {
    console.log('Escaneie o QR Code abaixo para conectar o WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => console.log('Tudo certo! Chatbot conectado.'));

// Função de Delay Aleatório
const randomDelay = (min, max) => new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

// Mensagens com variações
const welcomeMessages = [
    "Olá! Seja bem-vindo à *Líder Auto Veículos*. Como posso te ajudar?",
    "Oi! Aqui é a *Líder Auto Veículos*. Você busca um carro *à vista* ou *financiado*?",
    "Bem-vindo à *Líder Auto Veículos*! Queremos te ajudar a encontrar o carro ideal. Qual sua preferência?",
    "Olá! Sou *Caio Dourado*, da Líder Auto Veículos. Podemos conversar sobre financiamento ou compra à vista?"
];

const followUpMessages = [
    "Oi, tudo bem? Ainda tem interesse no veículo?",
    "Passando para saber se posso te ajudar com mais informações sobre o veículo.",
    "Só confirmando, você quer financiar ou pagar à vista?",
    "Oi, vi que não respondeu ainda. Posso esclarecer alguma dúvida sobre o carro?"
];

const secondFollowUpMessages = [
    "Lembrando que temos ótimas condições! Quer saber mais?",
    "Ainda posso te ajudar com a compra do seu carro?",
    "Se precisar de mais detalhes sobre o veículo, estou à disposição!",
    "Caso tenha alguma dúvida sobre financiamento, me avise!"
];

// Função para escolher uma variação de mensagem
const getRandomMessage = (messages) => messages[Math.floor(Math.random() * messages.length)];

// Função de envio de mensagem humanizada
const sendHumanMessage = async (chat, messageList) => {
    await chat.sendStateTyping();
    await randomDelay(1500, 3000); // Simular digitação
    await client.sendMessage(chat.id._serialized, getRandomMessage(messageList));
};

// Lógica de Resposta
client.on('message', async msg => {
    const chat = await msg.getChat();

    if (msg.body.match(/(Olá|olá|ola|Ola)/i) && msg.from.endsWith('@c.us')) {
        await sendHumanMessage(chat, welcomeMessages);
    }

    if (msg.body.match(/(avista|a vista|à vista)/i)) {
        await sendHumanMessage(chat, ["Ótimo! Vamos prosseguir com as informações para pagamento à vista."]);
    }

    if (msg.body.match(/(financiado|financiamento)/i)) {
        await sendHumanMessage(chat, [
            "Nosso financiamento é bancário e pode ser feito em até 60 vezes.",
            "Podemos financiar seu carro com condições especiais! Quer saber mais?"
        ]);
    }
});

client.initialize();
