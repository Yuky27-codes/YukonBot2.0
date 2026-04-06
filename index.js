require('dotenv').config();
const mongoose = require('mongoose');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs-extra');
const path = require('path');
const cron = require('node-cron');
const { Groq } = require('groq-sdk');
const partidasAtivas = {};
const groq = new Groq({
    apiKey: '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' 
});

const GroupMessageSchema = new mongoose.Schema({
    groupId: { type: String, required: true },
    senderName: { type: String },
    body: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GroupMessage', GroupMessageSchema);

// ===============================
// VARIÁVEIS GLOBAIS DE ESTADO
// ===============================
global.codigosPorGrupo = {};

const LISTA_ADMS = [
    '143130204626959@lid', '29790077755587@lid', '270978714218641@lid', '150328603320468@lid', '22385906442270@lid', '94386822062195@lid', '172606179270807@lid', '31443908599826@lid', '185165066305729@lid', '12060503109759@lid', '150152274780276@lid'
]; 

/**********************************************************
 * 2. CAMINHOS FIXOS
 **********************************************************/
const DATABASE_DIR = path.resolve(__dirname, 'database');
const SUPER_USERS_PATH = path.join(DATABASE_DIR, 'superusers.json');

// Garante pasta database
if (!fs.existsSync(DATABASE_DIR)) {
    fs.mkdirSync(DATABASE_DIR, { recursive: true });
}

// Garante arquivo superusers.json
if (!fs.existsSync(SUPER_USERS_PATH)) {
    fs.writeFileSync(SUPER_USERS_PATH, JSON.stringify([]));
}

/**********************************************************
 * 3. CONEXÃO COM MONGO
 **********************************************************/
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("❌ ERRO: MONGO_URI não definida");
    process.exit(1);
}

mongoose.set('strictQuery', true);

mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 50000,
})
.then(() => console.log("☁️ Yukon conectado ao MongoDB Atlas"))
.catch(err => {
    console.error("❌ ERRO AO CONECTAR NO MONGO:", err);
    process.exit(1);
});

/**********************************************************
 * 4. SCHEMAS (ATUALIZADO COM MUTE EXPIRES)
 **********************************************************/
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    groupId: { type: String, required: true },
    coins: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    roles: { type: Array, default: ["Tripulante"] },
    marriedWith: { type: String, default: null },
    friends: { type: Object, default: {} },
    inventory: { type: Object, default: {} },
    advs: { type: Number, default: 0 },
    isMuted: { type: Boolean, default: false },
    muteExpires: { type: Number, default: null }, // NOVO: Guarda o timestamp de soltura
    isBlacklisted: { type: Boolean, default: false },
    lastDaily: { type: Date },
    birthday: { type: String, default: null },
    amongStats: {
        partidasJogadas: { type: Number, default: 0 },
        vezesImpostor: { type: Number, default: 0 },
        vezesTripulante: { type: Number, default: 0 },
        totalFaturado: { type: Number, default: 0 },
        banPartidas: { type: Number, default: 0 }
    },
}, { timestamps: true });

userSchema.index({ userId: 1, groupId: 1 }, { unique: true });
const User = mongoose.model('User', userSchema);

const groupMessageSchema = new mongoose.Schema({
    groupId: { type: String, required: true },
    senderName: { type: String, default: 'Tripulante' },
    body: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const GroupMessage = mongoose.models.GroupMessage || mongoose.model('GroupMessage', groupMessageSchema);

/**********************************************************
 * 5. CLIENT WHATSAPP
 **********************************************************/
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "yukon_session_v1",
        dataPath: path.resolve(__dirname, '.wwebjs_auth')
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process'
        ]
    }
});

/**********************************************************
 * 6. FUNÇÕES AUXILIARES GLOBAIS
 * 👉 SE DER ERRO NO FUTURO, ADICIONE NOVAS FUNÇÕES AQUI
 **********************************************************/
function lerSuperUsers() {
    try {
        return JSON.parse(fs.readFileSync(SUPER_USERS_PATH, 'utf8'));
    } catch {
        return [];
    }
}

function isAdminUser(userId) {
    if (!userId) return false;
    
    // Converte para string e limpa espaços
    const idLimpo = userId.toString().trim();
    
    // Tenta ler do arquivo superusers.json (se existir)
    const listaSuper = lerSuperUsers(); 

    // Retorna true se estiver na nossa LISTA_ADMS ou no arquivo
    return LISTA_ADMS.includes(idLimpo) || listaSuper.includes(idLimpo);
}

global.enviarMenuComFoto = async (msg, fotoNome, texto) => {
    try {
        const chatId = msg.from.toString();
        
        // Esta linha garante que ele ache a pasta assets na raiz do projeto,
        // não importa de onde a função seja chamada.
        const caminhoImagem = path.resolve(__dirname, 'assets', fotoNome); 

        if (fs.existsSync(caminhoImagem)) {
            const media = MessageMedia.fromFilePath(caminhoImagem);
            await client.sendMessage(chatId, media, {
                caption: texto,
                sendSeen: false
            });
        } else {
            // Se a imagem não for encontrada, ele envia pelo menos o texto
            console.error(`⚠️ Imagem não encontrada: ${caminhoImagem}`);
            await client.sendMessage(chatId, texto, { sendSeen: false });
        }
    } catch (err) {
        console.error("❌ ERRO enviarMenuComFoto:", err.message);
        try {
            await client.sendMessage(msg.from.toString(), texto, { sendSeen: false });
        } catch {}
    }
}

/**********************************************************
 * 7. EVENTOS BÁSICOS
 **********************************************************/
client.on('qr', qr => {
    console.log("📸 Escaneie o QR Code:");
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log("✅ YukonBot está online e operante!");
});

/**********************************************************
 * 8. INICIALIZAÇÃO
 **********************************************************/
console.log("🚀 Iniciando YukonBot...");
client.initialize();

/**********************************************************
 * 9. EVENTO DE MENSAGEM - COM CARCEREIRA E XP
 **********************************************************/
client.on('message_create', async (msg) => {
    if (!msg || !msg.from) return;

    const chatId = msg.from._serialized || msg.from.toString();
    const senderRaw = (msg.author || msg.from)._serialized || (msg.author || msg.from).toString();
    const groupId = chatId;

    try {
        // --- 🟢 1. CARCEREIRA DA YUKON (SISTEMA DE PRISÃO/ROUBAR) ---
        if (chatId.endsWith('@g.us')) {
            const userData = await User.findOne({ userId: senderRaw, groupId: groupId });

            if (userData && userData.isMuted) {
                const agora = Date.now();

                // Verifica se o tempo de prisão acabou
                if (userData.muteExpires && agora > userData.muteExpires) {
                    // SOLTURA AUTOMÁTICA
                    await User.updateOne(
                        { userId: senderRaw, groupId: groupId },
                        { $set: { isMuted: false, muteExpires: null } }
                    );
                    console.log(`🔓 Tripulante ${senderRaw} cumpriu a pena e foi solto.`);
                } else {
                    // MENSAGEM APAGADA ENQUANTO PRESO
                    try {
                        await msg.delete(true);
                        return; // Interrompe tudo aqui (não ganha XP nem executa comando)
                    } catch (e) {
                        console.error("❌ Erro ao apagar mensagem de preso. O bot é admin?");
                    }
                }
            }
        }

        // --- 🟢 2. GRAVADOR DE MEMÓRIA E SISTEMA DE XP ---
        if (chatId.endsWith('@g.us')) {
            const mensagemTexto = msg.body || msg._data?.body || "";
            
            if (mensagemTexto && !mensagemTexto.startsWith('/')) {
                try {
                    // Grava a mensagem para o resumo
                    await GroupMessage.create({
                        groupId: chatId,
                        senderName: msg._data?.notifyName || msg.author?.split('@')[0] || 'Tripulante',
                        body: mensagemTexto,
                        timestamp: new Date()
                    });

                    // Ganho de XP e Level Up
                    const xpGanho = 1; 
                    const userUpdate = await User.findOneAndUpdate(
                        { userId: senderRaw, groupId: groupId },
                        { 
                            $inc: { xp: xpGanho },
                            $setOnInsert: { level: 1, coins: 0, roles: ["Tripulante"] } 
                        },
                        { upsert: true, returnDocument: 'after' }
                    ).lean();

                    let xpNoBanco = userUpdate.xp;
                    let levelNoBanco = userUpdate.level;

                    if (xpNoBanco >= 100) {
                        await User.updateOne(
                            { userId: senderRaw, groupId: groupId },
                            { 
                                $set: { level: levelNoBanco + 1, xp: 0 }, 
                                $inc: { coins: 150 } 
                            }
                        );

                        await client.sendMessage(chatId, `🆙 *LEVEL UP - YUKON*\n\n@${senderRaw.split('@')[0]}, você enviou mais 100 mensagens e subiu para o **Nível ${levelNoBanco + 1}**!\n💰 Bônus: *150 YukonCoins*`, {
                            mentions: [senderRaw]
                        });
                    }
                } catch (e) {
                    console.error("❌ Erro ao gravar mensagem/XP:", e.message);
                }
            }
        }

        // --- 🟢 3. LÓGICA DE AFINIDADE POR RESPOSTA ---
        if (msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();
            const autorOriginal = (quotedMsg.author || quotedMsg.from).split('@')[0] + '@lid';
            const quemRespondeu = senderRaw.split('@')[0] + '@lid';

            if (autorOriginal !== quemRespondeu) {
                const campoAmigo = `friends.${autorOriginal.replace(/\D/g, '')}`;
                await User.updateOne(
                    { userId: quemRespondeu, groupId: chatId },
                    { $inc: { [campoAmigo]: 0.5 } },
                    { upsert: true }
                );
            }
        }

        // --- 🟢 4. PARSER DE COMANDO ---
        const prefix = '/';
        const body = msg.body ? msg.body.trim() : "";
        if (!body.startsWith(prefix)) return;

        const args = body.slice(prefix.length).trim().split(/\s+/);
        const commandName = args.shift().toLowerCase();
        const isAdmin = isAdminUser(senderRaw);

        // Checa se o bot é admin no grupo
        const chat = await msg.getChat();
        let iAmAdmin = false;
        if (chat.isGroup) {
            const meuId = client.info.wid._serialized;
            const botNoGrupo = chat.participants.find(p => p.id._serialized === meuId);
            iAmAdmin = botNoGrupo ? botNoGrupo.isAdmin : false;
        }

        // HANDLER DE COMANDOS DINÂMICOS
        const commandPath = path.join(__dirname, 'commands', `${commandName}.js`);
        
        if (fs.existsSync(commandPath)) {
            try {
                const commandFile = require(commandPath);
                await commandFile.execute(client, msg, {
                    args,
                    chatId,
                    senderRaw,
                    isAdmin,
                    groupId,
                    User,
                    MessageMedia,
                    iAmAdmin,
                    groq,
                    command: `/${commandName}`
                });
            } catch (error) {
                console.error(`❌ Erro no comando ${commandName}:`, error.message);
            }
        }

    } catch (e) {
        console.error("❌ ERRO GERAL NO INDEX:", e.message);
    }
});
cron.schedule('01 00 * * *', async () => {
    console.log("🎂 Checando aniversariantes do dia...");
    const hoje = new Date();
    const diaMesHoje = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    const dia01 = hoje.getDate() === 1;

    try {
        // Busca todos os usuários de todos os grupos que têm aniversário
        const usuariosAniversariantes = await User.find({ birthday: diaMesHoje });
        
        // Agrupar por grupo para mandar uma mensagem só por chat
        const grupos = {};
        usuariosAniversariantes.forEach(u => {
            if (!grupos[u.groupId]) grupos[u.groupId] = [];
            grupos[u.groupId].push(u.userId);
        });

        for (const groupId in grupos) {
            const listaMencoes = grupos[groupId];
            const nomes = listaMencoes.map(id => `@${id.split('@')[0]}`).join(', ');

            // 1. Dá os 5.000 coins para todos os aniversariantes do dia naquele grupo
            await User.updateMany(
                { userId: { $in: listaMencoes }, groupId: groupId },
                { $inc: { coins: 5000 } }
            );

            // 2. Manda a mensagem de parabéns
            const msgAniver = `🎉 *COMEMORAÇÃO ESTELAR!* 🎉\n━━━━━━━━━━━━━━━━━━━━━\nHoje o dia é especial para: ${nomes}!\n\n🎈 A Yukon Station deseja um feliz aniversário! \n🎁 Presente enviado: *5.000 YukonCoins*!\n━━━━━━━━━━━━━━━━━━━━━`;
            await client.sendMessage(groupId, msgAniver, { mentions: listaMencoes });
        }

        // --- MENSAGEM DO DIA 01 (Aniversariantes do Mês) ---
        if (dia01) {
            const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
            const todosAniversariantes = await User.find({ birthday: { $regex: `.*/${mesAtual}$` } });
            
            const gruposMes = {};
            todosAniversariantes.forEach(u => {
                if (!gruposMes[u.groupId]) gruposMes[u.groupId] = [];
                gruposMes[u.groupId].push(u);
            });

            for (const groupId in gruposMes) {
                let msgMes = `📅 *ANIVERSARIANTES DESTE MÊS*\n━━━━━━━━━━━━━━━━━━━━━\n`;
                const users = gruposMes[groupId];
                users.forEach(u => msgMes += `• ${u.birthday} - @${u.userId.split('@')[0]}\n`);
                
                await client.sendMessage(groupId, msgMes, { mentions: users.map(u => u.userId) });
            }
        }
    } catch (e) {
        console.error("Erro no Cron de Aniversário:", e);
    }
});