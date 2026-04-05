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
 * 4. SCHEMAS
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
    isBlacklisted: { type: Boolean, default: false },
    lastDaily: { type: Date },
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
 * 9. EVENTO DE MENSAGEM - ATUALIZADO E BLINDADO
 **********************************************************/
client.on('message_create', async (msg) => {
    if (!msg || !msg.from) return;

    const chatId = msg.from._serialized || msg.from.toString();
    const senderRaw = (msg.author || msg.from)._serialized || (msg.author || msg.from).toString();
    const isAdmin = isAdminUser(senderRaw);
    const groupId = chatId;

    // --- 🟢 GRAVADOR DE MEMÓRIA E SISTEMA DE XP ---
    if (chatId.endsWith('@g.us')) {
        const mensagemTexto = msg.body || msg._data?.body || "";
        
        if (mensagemTexto && !mensagemTexto.startsWith('/')) {
            try {
                // 1. Grava a mensagem para o resumo
                await GroupMessage.create({
                    groupId: chatId,
                    senderName: msg._data?.notifyName || msg.author?.split('@')[0] || 'Tripulante',
                    body: mensagemTexto,
                    timestamp: new Date()
                });

                // 1. Ganho de XP Fixo (1 por mensagem)
                const xpGanho = 1; 

                // 2. Atualiza o XP do usuário no banco (CORRIGIDO: senderRaw e returnDocument)
                const userUpdate = await User.findOneAndUpdate(
                    { userId: senderRaw, groupId: groupId }, // Aqui estava 'serendRaw', mudei para senderRaw
                    { 
                        $inc: { xp: xpGanho },
                        $setOnInsert: { level: 1, coins: 0, roles: ["Tripulante"] } 
                    },
                    { upsert: true, returnDocument: 'after' } // Aqui remove o aviso do Mongoose
                ).lean();

                // 3. LOGICA DE LEVEL UP (FIXO: 100 XP POR NÍVEL)
                let xpNoBanco = userUpdate.xp;
                let levelNoBanco = userUpdate.level;
                let subiu = false;

                // Se o XP atingir 100, sobe o nível e reseta o contador de XP
                if (xpNoBanco >= 100) {
                    xpNoBanco = 0; 
                    levelNoBanco += 1;
                    subiu = true;
                }

                if (subiu) {
                    await User.updateOne(
                        { userId: senderRaw, groupId: groupId },
                        { 
                            $set: { level: levelNoBanco, xp: xpNoBanco }, 
                            $inc: { coins: 150 } 
                        }
                    );

                    await client.sendMessage(chatId, `🆙 *LEVEL UP - YUKON*\n\n@${senderRaw.split('@')[0]}, você enviou mais 100 mensagens e subiu para o **Nível ${levelNoBanco}**!\n💰 Bônus: *150 YukonCoins*`, {
                        mentions: [senderRaw]
                    });
                }
              
            } catch (e) {
                console.error("❌ Erro ao gravar mensagem/XP:", e.message);
            }
        }
    }

    try {
        // --- 🟢 VIGIA DO /MUTEP ---
        if (chatId.includes('@g.us')) {
            const userStatus = await User.findOne({ userId: senderRaw, groupId: groupId }).lean();
            if (userStatus && userStatus.isMuted) {
                try { await msg.delete(true); return; } catch (e) {}
            }
        }
      
      // --- LÓGICA DE AFINIDADE POR RESPOSTA ---
if (msg.hasQuotedMsg) {
    const chatId = msg.from.toString();
    const quotedMsg = await msg.getQuotedMessage();
    const autorOriginal = (quotedMsg.author || quotedMsg.from).split('@')[0] + '@lid';
    const quemRespondeu = senderRaw.split('@')[0] + '@lid';

    // Impede que a pessoa ganhe amizade respondendo a si mesma
    if (autorOriginal !== quemRespondeu) {
        const campoAmigo = `friends.${autorOriginal.replace(/\D/g, '')}`;
        
        await User.updateOne(
            { userId: quemRespondeu, groupId: msg.from.toString() },
            { $inc: { [campoAmigo]: 0.5 } }, // Aumenta 0.5% por resposta
            { upsert: true }
        );
    }
}

        // --- PARSER DE COMANDO ---
        const prefix = '/';
        const body = msg.body ? msg.body.trim() : "";
        if (!body.startsWith(prefix)) return;

        const args = body.slice(prefix.length).trim().split(/\s+/);
        const command = `/${args.shift().toLowerCase()}`;

        const chat = await msg.getChat();
        let iAmAdmin = false;
        if (chat.isGroup) {
            const meuId = client.info.wid._serialized;
            const botNoGrupo = chat.participants.find(p => p.id._serialized === meuId);
            iAmAdmin = botNoGrupo ? botNoGrupo.isAdmin : false;
        }
      // --- NOVO HANDLER DE COMANDOS (YUKON V2) ---
        const commandPath = path.join(__dirname, 'commands', `${command.replace('/', '')}.js`);
        
        if (fs.existsSync(commandPath)) {
            try {
                // Importa o comando dinamicamente
                const commandFile = require(commandPath);
                
                // Executa o comando passando as variáveis que ele precisa
                await commandFile.execute(client, msg, {
                    args,
                    chatId,
                    senderRaw,
                    isAdmin,
                    groupId,
                    User, // Passamos o Model do Banco para o comando usar
                    MessageMedia,
                    iAmAdmin,
                    groq,
                });
                return; // Para aqui, não entra no switch antigo
            } catch (error) {
                console.error(`❌ Erro ao executar comando ${command}:`, error);
                return msg.reply("⚠️ Erro interno ao processar este comando.");
            }
        }

        } catch (e) {
            console.error(e);
        }
    });