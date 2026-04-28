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

const GroupMessage = mongoose.models.GroupMessage || mongoose.model('GroupMessage', GroupMessageSchema);

// --- 🟢 ADIÇÃO: SCHEMA DE CONFIGURAÇÃO DO GRUPO (LOCK/UNLOCK) ---
const groupConfigSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    onlyAdms: { type: Boolean, default: false }
});
const GroupConfig = mongoose.model('GroupConfig', groupConfigSchema);

// ===============================
// VARIÁVEIS GLOBAIS DE ESTADO
// ===============================
global.codigosPorGrupo = {};

const LISTA_ADMS = [
    '143130204626959@lid'
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
 * 4. SCHEMAS (ATUALIZADO COM MODOS DE JOGO)
 **********************************************************/
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    groupId: { type: String, required: true },
    lastMessageAt: { type: Date, default: Date.now },
    isBotAdmin: { type: Boolean, default: false },
    coins: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    roles: { type: Array, default: ["Tripulante"] },
    marriedWith: { type: String, default: null },
    friends: { type: Object, default: {} },
    advs: { type: Number, default: 0 },
    inventory: { type: Array, default: [] },
    coins: { type: Number, default: 0 },
    isMuted: { type: Boolean, default: false },
    muteExpires: { type: Number, default: null }, 
    isBlacklisted: { type: Boolean, default: false },
    protectedUntil: { type: Number, default: null },
    lastDaily: { type: Date },
    loverWith: { type: String, default: null },
    birthday: { type: String, default: null },
    family: { type: Array, default: [] },
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

// --- NOVO SCHEMA PARA OS MODOS DE JOGO ---
const modoSchema = new mongoose.Schema({
    groupId: { type: String, required: true },
    nome: { type: String, required: true },
    descricao: { type: String, required: true },
    criadoPor: { type: String },
}, { timestamps: true });

const Modo = mongoose.model('Modo', modoSchema);

// --- NOVO SCHEMA PARA ESTATÍSTICAS DE FLUXO ---
const groupStatsSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    entradas: { type: Number, default: 0 },
    saidas: { type: Number, default: 0 }
});
const GroupStats = mongoose.model('GroupStats', groupStatsSchema);

// --- NOVO SCHEMA PARA AUTORIZAÇÃO
const authorizedGroupSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    isAuthorized: { type: Boolean, default: false },
    authorizedBy: { type: String }, // ID do seu usuário (Dono)
    createdAt: { type: Date, default: Date.now }
});
const AuthorizedGroup = mongoose.model('AuthorizedGroup', authorizedGroupSchema);

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
    const idLimpo = userId.toString().trim();
    const listaSuper = lerSuperUsers(); 
    return LISTA_ADMS.includes(idLimpo) || listaSuper.includes(idLimpo);
}

global.enviarMenuComFoto = async (msg, fotoNome, texto, mencoes = []) => {
    try {
        const chatId = msg.from.toString();
        const caminhoImagem = path.resolve(__dirname, 'assets', fotoNome); 

        if (fs.existsSync(caminhoImagem)) {
            const media = MessageMedia.fromFilePath(caminhoImagem);
            await client.sendMessage(chatId, media, {
                caption: texto,
                mentions: mencoes,
                sendSeen: false
            });
        } else {
            console.error(`⚠️ Imagem não encontrada: ${caminhoImagem}`);
            await client.sendMessage(chatId, texto, { 
                mentions: mencoes, 
                sendSeen: false 
            });
        }
    } catch (err) {
        console.error("❌ ERRO enviarMenuComFoto:", err.message);
        try {
            await client.sendMessage(msg.from.toString(), texto, { 
                mentions: mencoes, 
                sendSeen: false 
            });
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

    // --- 🟢 0. DEFINIÇÕES INICIAIS (MOVIDAS PARA O TOPO PARA EVITAR ERROS) ---
    const chatId = msg.from._serialized || msg.from.toString();
    const senderRaw = (msg.author || msg.from)._serialized || (msg.author || msg.from).toString();
    const groupId = chatId;
    const prefix = '/';
    const body = msg.body ? msg.body.trim() : "";

    try {
        // --- 🟢 BUSCA DE DADOS INICIAIS ---
        const userData = await User.findOne({ userId: senderRaw, groupId: groupId });
        const isAdmin = isAdminUser(senderRaw) || (userData ? userData.isBotAdmin : false);

        // --- 🟢 1. CARCEREIRA DA YUKON ---
        if (chatId.endsWith('@g.us')) {
            if (userData && userData.isMuted) {
                const agora = Date.now();
                if (userData.muteExpires && agora > userData.muteExpires) {
                    await User.updateOne(
                        { userId: senderRaw, groupId: groupId },
                        { $set: { isMuted: false, muteExpires: null } }
                    );
                } else {
                    try {
                        await msg.delete(true);
                        return; 
                    } catch (e) {}
                }
            }
        }

        // --- 🟢 A BARREIRA MESTRA (LICENCIAMENTO) ---
if (body.startsWith(prefix) && chatId.endsWith('@g.us')) {
    const groupAuth = await AuthorizedGroup.findOne({ groupId: chatId }).lean();

    // Aqui verificamos se o seu ID atual está na lista fixa de ADMs
    // Use a mesma função que você já tem no bot para checar a lista
    const ehDonoReal = isAdminUser(senderRaw); 

    if ((!groupAuth || groupAuth.isAuthorized === false) && !ehDonoReal) {
        return await client.sendMessage(chatId, `🚫 *ACESSO NEGADO - YUKON STATION*
━━━━━━━━━━━━━━━━━━━━━
Esta estação não possui uma assinatura ativa para operar neste setor.

🆔 *ID DESTA ESTAÇÃO:* \`${chatId}\`

Para ativar as funções de economia e proteção, entre em contato com o desenvolvedor.`);
    }
}
    
        // --- 🟢 3. FILTRO DE MODO LOCK (APENAS ADMS) ---
        if (chatId.endsWith('@g.us')) {
            const config = await GroupConfig.findOne({ groupId: chatId }).lean();
            if (config && config.onlyAdms && !isAdmin) {
                if (body.startsWith(prefix)) return; 
            }
        }

        // --- 🟢 4. GRAVADOR DE MEMÓRIA E SISTEMA DE XP ---
        if (chatId.endsWith('@g.us')) {
            const mensagemTexto = body;
            
            if (mensagemTexto && !mensagemTexto.startsWith(prefix)) {
                try {
                    await GroupMessage.create({
                        groupId: chatId,
                        senderName: msg._data?.notifyName || msg.author?.split('@')[0] || 'Tripulante',
                        body: mensagemTexto,
                        timestamp: new Date()
                    });

                    const xpGanho = 1; 
                    const userUpdate = await User.findOneAndUpdate(
                        { userId: senderRaw, groupId: groupId },
                        { 
                            $inc: { xp: xpGanho },
                            $set: { lastMessageAt: new Date() },
                            $setOnInsert: { level: 1, coins: 0, roles: ["Tripulante"] } 
                        },
                        { upsert: true, returnDocument: 'after' }
                    ).lean();

                    if (userUpdate.xp >= 100) {
                        await User.updateOne(
                            { userId: senderRaw, groupId: groupId },
                            { 
                                $set: { level: userUpdate.level + 1, xp: 0 }, 
                                $inc: { coins: 150 } 
                            }
                        );

                        await client.sendMessage(chatId, `🆙 *LEVEL UP - YUKON*\n\n@${senderRaw.split('@')[0]}, você enviou mais 100 mensagens e subiu para o **Nível ${userUpdate.level + 1}**!\n💰 Bônus: *150 YukonCoins*`, {
                            mentions: [senderRaw]
                        });
                    }
                } catch (e) {
                    console.error("❌ Erro ao gravar mensagem/XP:", e.message);
                }
            }
        }

        // --- 🟢 5. LÓGICA DE AFINIDADE POR RESPOSTA ---
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

        // --- 🟢 6. PARSER DE COMANDO (EXECUÇÃO FINAL) ---
        if (!body.startsWith(prefix)) return;

        const args = body.slice(prefix.length).trim().split(/\s+/);
        const commandName = args.shift().toLowerCase();

        const chat = await msg.getChat();
        let iAmAdmin = false;
        let isGroupAdmins = false;

        if (chat.isGroup) {
            const meuId = client.info.wid._serialized;
            const botNoGrupo = chat.participants.find(p => p.id._serialized === meuId);
            iAmAdmin = botNoGrupo ? botNoGrupo.isAdmin : false;

            const autorNoGrupo = chat.participants.find(p => p.id._serialized === senderRaw);
            isGroupAdmins = autorNoGrupo ? (autorNoGrupo.isAdmin || autorNoGrupo.isSuperAdmin) : false;
        }

        if (isAdmin) isGroupAdmins = true;

        const commandPath = path.join(__dirname, 'commands', `${commandName}.js`);
        
        if (fs.existsSync(commandPath)) {
            try {
                const commandFile = require(commandPath);
                await commandFile.execute(client, msg, {
                    args,
                    chatId,
                    senderRaw,
                    isAdmin,
                    isGroupAdmins, 
                    groupId,
                    Modo,
                    User,
                    GroupConfig,
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

/**********************************************************
 * 10. SISTEMA DE ANIVERSÁRIO (CRON JOB)
 **********************************************************/
cron.schedule('01 00 * * *', async () => {
    console.log("🎂 Checando aniversariantes do dia...");
    const hoje = new Date();
    const diaMesHoje = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    const dia01 = hoje.getDate() === 1;

    try {
        const usuariosAniversariantes = await User.find({ birthday: diaMesHoje });
        const grupos = {};
        usuariosAniversariantes.forEach(u => {
            if (!grupos[u.groupId]) grupos[u.groupId] = [];
            grupos[u.groupId].push(u.userId);
        });

        for (const groupId in grupos) {
            const listaMencoes = grupos[groupId];
            const nomes = listaMencoes.map(id => `@${id.split('@')[0]}`).join(', ');

            await User.updateMany(
                { userId: { $in: listaMencoes }, groupId: groupId },
                { $inc: { coins: 5000 } }
            );

            const msgAniver = `🎉 *COMEMORAÇÃO ESTELAR!* 🎉\n━━━━━━━━━━━━━━━━━━━━━\nHoje o dia é especial para: ${nomes}!\n\n🎈 A Yukon Station deseja um feliz aniversário! \n🎁 Presente enviado: *5.000 YukonCoins*!\n━━━━━━━━━━━━━━━━━━━━━`;
            await client.sendMessage(groupId, msgAniver, { mentions: listaMencoes });
        }

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
/**********************************************************
 * 11. BOAS-VINDAS DINÂMICO COM FOTO - YUKON STATION
 **********************************************************/
client.on('group_join', async (notification) => {
    try {
        const chatId = notification.chatId;
        const participantId = notification.recipientIds[0];

        // 🟢 ADIÇÃO: Incrementa o contador de entradas no banco de dados
        const GroupStats = mongoose.model('GroupStats');
        await GroupStats.updateOne(
            { groupId: chatId },
            { $inc: { entradas: 1 } },
            { upsert: true }
        );
        
        // --- TODO O SEU CÓDIGO ORIGINAL COMEÇA AQUI ---
        const chat = await client.getChatById(chatId);
        const nomeDoGrupo = chat.name || "Estação Desconhecida";
        
        const mencaoTexto = `@${participantId.split('@')[0]}`;

        const mensagemBoasVindas = `
🚀 *BEM-VINDO À ${nomeDoGrupo.toUpperCase()}!* 🚀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Olá, ${mencaoTexto}! Um novo tripulante acaba de acoplar na nossa base.

🛰️ *DIRETRIZES DA MISSÃO:*
1. Explore os comandos usando */ajuda*.
2. Verifique sua ficha técnica em */perfil*.
3. Registre seu ciclo em */meu_aniver* para bônus.

⚠️ *AVISO CRÍTICO:*
Para uma melhor experiência de todos na estação, pedimos que siga as **REGRAS** do grupo. A Carcereira da Yukon está sempre de vigia e infrações podem resultar em confinamento (mute) ou perda de créditos!

Que sua estadia em *${nomeDoGrupo}* seja de muita prosperidade e XP!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();

        await global.enviarMenuComFoto({ from: chatId }, 'welcome.jpg', mensagemBoasVindas, [participantId]);

        console.log(`✨ [BOAS-VINDAS] Foto e texto enviados para ${participantId} no grupo: ${nomeDoGrupo}`);

    } catch (err) {
        console.error("❌ Erro ao enviar boas-vindas com foto:", err.message);
        
        try {
            const chatId = notification.chatId;
            const participantId = notification.recipientIds[0];
            await client.sendMessage(chatId, "🚀 Bem-vindo à estação!", { mentions: [participantId] });
        } catch {}
    }
});

// --- MONITORAMENTO DE SAÍDA DE TRIPULANTES ---
client.on('group_leave', async (notification) => {
    try {
        const chatId = notification.chatId;
        
        // 🔴 INCREMENTA O CONTADOR DE SAÍDAS NO BANCO
        const GroupStats = mongoose.model('GroupStats');
        await GroupStats.updateOne(
            { groupId: chatId },
            { $inc: { saidas: 1 } },
            { upsert: true }
        );

        const participantId = notification.recipientIds[0];
        console.log(`📉 [LOG] Tripulante ${participantId} deixou a estação no grupo ${chatId}`);

    } catch (err) {
        console.error("❌ Erro ao registrar saída no banco:", err.message);
    }
});