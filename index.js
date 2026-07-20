require('dotenv').config();
// FORÇAR VERSÃO NO CACHE INTERNO ANTES DE QUALQUER COISA
const fsPatch = require('fs');
const pathPatch = require('path');

const forceVersion = {
    "version": "2.3000.1018973687",
    "isResolved": true,
    "isStable": true
};

try {
    const cacheDir = pathPatch.resolve(__dirname, '.wwebjs_cache');
    // Cria a pasta caso ela não exista
    if (!fsPatch.existsSync(cacheDir)) {
        fsPatch.mkdirSync(cacheDir, { recursive: true });
    }
    // Salva o arquivo de cache forçando a versão correta
    fsPatch.writeFileSync(pathPatch.resolve(cacheDir, 'session.json'), JSON.stringify(forceVersion));
    console.log("✅ Patch de versão forçado com sucesso.");
} catch (e) {
    console.log("⚠️ Nota: Falha no patch de cache, prosseguindo...", e.message);
}
const mongoose = require('mongoose');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs-extra');
const path = require('path');
const cron = require('node-cron');
const { Groq } = require('groq-sdk');
const partidasAtivas = {};
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
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
    onlyAdms:    { type: Boolean, default: false },
    prefixo: { type: String, default: null },
    simbolo: { type: String, default: null },
    admLocked:   { type: Boolean, default: false },
    jogosLocked: { type: Boolean, default: false },
    ecoLocked:   { type: Boolean, default: false },
    iaLocked:    { type: Boolean, default: false },
    salaLocked:  { type: Boolean, default: false },
    socLocked:   { type: Boolean, default: false },
    utilLocked:  { type: Boolean, default: false },
    cachedAdmins: { type: Array, default: [] },
    cachedParticipants: { type: Array, default: [] },
});
const GroupConfig = mongoose.model('GroupConfig', groupConfigSchema);

// ===============================
// VARIÁVEIS GLOBAIS DE ESTADO
// ===============================
global.codigosPorGrupo = {};
global.modoCaosAtivo = {};
global.desafiosAtivos = {};
global.antiFlood = {};

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
    casinoCount: { type: Number, default: 0 },
    lastCasinoDate: { type: String, default: null },
    robberyCount: { type: Number, default: 0 },
    lastRobberyDate: { type: String, default: null },
    isMuted: { type: Boolean, default: false },
    isPassive: { type: Boolean, default: false },
    muteExpires: { type: Number, default: null }, 
    bankCoins: { type: Number, default: 0 }, // Saldo no banco do bot (total depositado via /depositar)
    lastModoCaosDate: { type: String, default: null },
    blacklistReason: { type: String, default: null },
    lastPousar: { type: Date, default: null },
    lastDesafio: { type: Date, default: null },
    bankDepositedToday: { type: Number, default: 0 },
    lastBankDepositDate: { type: String, default: null },
    lastBankRendimento: { type: Number, default: 0 },
    lastCaixaSurpresa: { type: Date, default: null },
    lastBankRendimentoDate: { type: String, default: null },
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
    configuracoes: { type: String, default: null },
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

// --- NOVO SCHEMA PARA ESTATÍSTICAS DIÁRIAS DE GRUPO ---
// Armazena contadores que resetam diariamente (fuso America/Sao_Paulo)
const groupDailyStatsSchema = new mongoose.Schema({
    groupId: { type: String, required: true },
    date: { type: String, required: true }, // Formato YYYY-MM-DD
    newMembers: { type: Number, default: 0 }, // Membros que entraram hoje
    leftMembers: { type: Number, default: 0 }, // Membros que saíram hoje
    coinsGenerated: { type: Number, default: 0 }, // Coins gerados hoje (recompensas, etc)
    coinsBet: { type: Number, default: 0 }, // Coins apostados no cassino hoje
    messagesCount: { type: Number, default: 0 }, // Mensagens enviadas hoje
    bansCount: { type: Number, default: 0 }, // Banimentos executados hoje
}, { timestamps: true });
const GroupDailyStats = mongoose.model('GroupDailyStats', groupDailyStatsSchema);

// --- NOVO SCHEMA PARA HISTÓRICO DE CHS POR COMUNIDADE ---
// Armazena snapshots diários do CHS para evolução 7/30/90 dias
const groupCHSHistorySchema = new mongoose.Schema({
    groupId: { type: String, required: true },
    date: { type: String, required: true }, // Formato YYYY-MM-DD
    chs: { type: Number, required: true }, // CHS do dia
    pillars: {
        activity: { type: Number, required: true }, // 0-100
        social: { type: Number, required: true }, // 0-100
        economy: { type: Number, default: null }, // 0-100 ou null
        retention: { type: Number, required: true }, // 0-100
        administration: { type: Number, default: null }, // 0-100 ou null
    }
}, { timestamps: true });
const GroupCHSHistory = mongoose.model('GroupCHSHistory', groupCHSHistorySchema);

// --- NOVO SCHEMA PARA AUTORIZAÇÃO
const authorizedGroupSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    isAuthorized: { type: Boolean, default: false },
    authorizedBy: { type: String },
    expiresAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
});
const AuthorizedGroup = mongoose.model('AuthorizedGroup', authorizedGroupSchema);

// --- SISTEMA DE PAGAMENTO
const couponSchema = new mongoose.Schema({
    code: { type: String, unique: true },
    discountPercent: { type: Number, default: 0 },
    expiresAt: { type: Date },
    isUsed: { type: Boolean, default: false },
    usedByGroup: { type: String },
    referrerGroupId: { type: String }
});
const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);

// --- SISTEMA DE CUPOM

const inviteSchema = new mongoose.Schema({
    referrerGroupId: { type: String, required: true }, // Grupo que indicou
    invitedGroupId: { type: String, unique: true },    // Grupo que foi indicado
    status: { type: String, default: 'pending' },      // pending, completed
    createdAt: { type: Date, default: Date.now }
});
const Invite = mongoose.models.Invite || mongoose.model('Invite', inviteSchema);

// --- SISTEMA DE PERFIL 
const userProfileSchema = new mongoose.Schema({
    userId: { type: String, unique: true }, // WhatsApp do Dono
    planoPreco: { type: Number }, // 10, 30 ou 75
    gruposVinculados: [{ type: String }], // Array com os IDs (@g.us)
    createdAt: { type: Date, default: Date.now }
});

mongoose.model('UserProfile', userProfileSchema);

// --- SISTEMA DOS PETS

const petSchema = new mongoose.Schema({
    ownerId:       { type: String, required: true },
    groupId:       { type: String, required: true },
    nome:          { type: String, required: true },
    tipo:          { type: String, required: true },
    exp:           { type: Number, default: 0 },
    estagio:       { type: Number, default: 1 },
    status:        { type: String, default: 'vivo' }, 
    ultimaRefeicao: { type: Date, default: Date.now },
    diedAt:        { type: Date, default: null },
    cooldowns: {
        alimentar: { type: Date, default: null },
        carinho:   { type: Date, default: null },
        brincar:   { type: Date, default: null }
    }
}, { timestamps: true });
 
const Pet = mongoose.model('Pet', petSchema);

// --- SISTEMA DE CÓDIGOS DE VINCULAÇÃO (BOT -> SAAS) ---
const linkCodeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    groupId: { type: String, required: true },
    groupName: { type: String, default: 'Grupo sem nome' },
    memberCount: { type: Number, default: 0 },
    platform: { type: String, default: 'whatsapp' },
    createdBy: { type: String, required: true },
    hasActiveSubscription: { type: Boolean, default: false },
    subscriptionExpiresAt: { type: Date, default: null },
    used: { type: Boolean, default: false },
    usedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
}, { timestamps: true });

const LinkCode = mongoose.models.LinkCode || mongoose.model('LinkCode', linkCodeSchema);

// --- SCHEMA PARA MÉTRICAS DE GRUPO (CHS, SOCIAL LOCK-IN, GROWTH) ---
const groupMetricsSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    members: { type: Number, default: 0 },
    activeMembers: { type: Number, default: 0 },
    chs: { type: Number, default: 50 },
    growth: { type: String, default: '—' },
    socialLockin: { type: Number, default: 0 },
    tier: { type: String, default: 'standard' },
    calculatedAt: { type: Date, default: Date.now }
}, { timestamps: true });
const GroupMetrics = mongoose.model('GroupMetrics', groupMetricsSchema);

/**********************************************************
 * 5. CLIENT WHATSAPP - ESTRUTURA BLINDADA (ATUALIZADA)
 **********************************************************/
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "yukon_session_v1",
        dataPath: path.resolve(__dirname, '.wwebjs_auth')
    }),
    webVersionCache: {
        type: 'none'
    },
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

// PATCH DE RESILIÊNCIA PARA MENSAGENS CITADAS
// Isso intercepta erros do 'getQuotedMessage' antes que eles derrubem o bot
client.on('ready', async () => {
    console.log("✅ YukonBot Conectado. Aplicando correções de DOM...");
});

// Captura erros de injeção que ocorrem no Puppeteer e evita que o bot pare
client.on('error', (err) => {
    if (err.message.includes('ExecutionContext') || err.message.includes('Evaluation failed')) {
        console.warn("⚠️ Aviso: Erro de injeção detectado e contornado.");
        return;
    }
    console.error("❌ ERRO CRÍTICO:", err);
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

    const chatId = msg.from._serialized || msg.from.toString();
    const senderRaw = (msg.author || msg.from)._serialized || (msg.author || msg.from).toString();
    const groupId = chatId;
    const prefix = '/';
    const body = msg.body ? msg.body.trim() : "";

    try {
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
        // No seu index.js, dentro do evento de mensagem
if (!msg.from.endsWith('@g.us')) { // Se for PV
    const corpo = msg.body.toLowerCase();
    
    if (corpo.includes('start') || corpo === 'oi' || corpo === 'olá') {
        return msg.reply(`🛰️ *BEM-VINDO À CENTRAL YUKON*
━━━━━━━━━━━━━━━━━━━━━
Olá! Eu sou a inteligência da YukonBot. Aqui você gerencia suas assinaturas e grupos de forma automática.

🚀 *Para começar:*
Digite **/menu_cliente** para ver todos os meus comandos e como funcionam as assinaturas.

🔧 *Dica:* Se você quer vincular um grupo, use **/id_grupo** dentro do seu grupo e depois venha aqui no PV.`);
    }
}

        // No seu arquivo principal, onde você lê as mensagens:
if (msg.body.startsWith('/start_')) {
    const partes = msg.body.split('_');
    const codigo = partes[1];
    
    return msg.reply(`🛰️ *BEM-VINDO À CENTRAL YUKON*
━━━━━━━━━━━━━━━━━━━━━
Você recebeu um convite especial!

🎟️ Cupom: \`${codigo}\`
🎁 Vantagem: **10% OFF + 5 Dias Grátis** na 1ª compra.

*Passo a passo:*
1. Copie o ID do grupo que você quer ativar.
2. Digite aqui no PV: \`/cupomp ${codigo} [ID_DO_GRUPO]\``);
}

        // --- 🟢 RECEPTOR DE COMPROVANTES (VERSÃO PERFIL) ---
if (msg.hasMedia && msg.type === 'image' && !msg.from.endsWith('@g.us')) {
    const caption = msg.body ? msg.body.toLowerCase() : "";
    
    if (caption.includes("comprovante")) {
        try {
            const mongoose = require('mongoose');
            const UserProfile = mongoose.model('UserProfile');
            const meuNumero = "5524988268426@c.us"; 

            // Busca os dados do cliente que enviou a foto
            const perfil = await UserProfile.findOne({ userId: msg.from });
            
            if (!perfil || perfil.gruposVinculados.length === 0) {
                return msg.reply("⚠️ *ERRO:* Você não vinculou nenhum grupo ao seu perfil antes de enviar o comprovante. Use /vincular [ID].");
            }

            // Encaminha a foto para você
            await msg.forward(meuNumero);
            
            // Formata a lista de IDs para você apenas copiar e colar
            let listaIds = perfil.gruposVinculados.map(id => `\`/confirmar ${id}\``).join('\n');

            await client.sendMessage(meuNumero, `💳 *PAGAMENTO DE CLIENTE*
━━━━━━━━━━━━━━━━━━━━━
👤 Dono: @${msg.from.split('@')[0]}
📦 Plano: ${perfil.planoPreco === 10 ? 'Recruta' : perfil.planoPreco === 30 ? 'Astronauta' : 'Intergaláctico'}
📍 Grupos Vinculados (${perfil.gruposVinculados.length}):

${listaIds}

_Clique em um comando acima para ativar o grupo correspondente._`, { mentions: [msg.from] });

            return msg.reply("✅ *RECEBIDO!* Seu comprovante e os grupos vinculados foram enviados para análise. Aguarde a ativação.");

        } catch (err) {
            console.error(err);
            return msg.reply("⚠️ Erro ao processar comprovante.");
        }
    }
}

       // --- 🟢 A BARREIRA MESTRA (LICENCIAMENTO AUTOMATIZADO) ---
const configBarreira = chatId.endsWith('@g.us') ? await GroupConfig.findOne({ groupId: chatId }).lean() : null;
const prefixoCustom = configBarreira?.prefixo || null;
const usouQualquerPrefixo = body.startsWith(prefix) || (prefixoCustom && body.startsWith(prefixoCustom));

if (usouQualquerPrefixo && chatId.endsWith('@g.us') && !body.startsWith('/id_grupo')) {
    const groupAuth = await AuthorizedGroup.findOne({ groupId: chatId }).lean();
    const ehDonoReal = isAdminUser(senderRaw); 

    if (!ehDonoReal) {
        const agora = Date.now();
        const expiraMs = groupAuth?.expiresAt ? new Date(groupAuth.expiresAt).getTime() : 0;
        
        // Se não tem cadastro, ou foi desativado manual, ou a data de expiração já passou
        const bloqueadoManual = !groupAuth || groupAuth.isAuthorized === false;
        const expirado = expiraMs > 0 && agora > expiraMs;

        if (bloqueadoManual || expirado) {
            // Se expirou agora, aproveitamos para atualizar o banco e economizar processamento depois
            if (expirado && groupAuth.isAuthorized !== false) {
                await AuthorizedGroup.updateOne({ groupId: chatId }, { $set: { isAuthorized: false } });
            }

            return await client.sendMessage(chatId, `🚫 *ESTAÇÃO BLOQUEADA*
━━━━━━━━━━━━━━━━━━━━━
O acesso aos comandos da Yukon foi interrompido.

⚠️ Motivo: **Licença Inativa ou Expirada.**
🗓️ Vencimento: ${expiraMs > 0 ? new Date(expiraMs).toLocaleString('pt-BR') : 'Sem registro'}

Para reativar a licença, fale com o suporte.`);
        }
    }
}

        // --- 🟢 3. FILTRO DE MODO LOCK (APENAS ADMS DO GRUPO) ---
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

                    // --- CAPTURA DE MENSAGENS DIÁRIAS ---
                    const today = getCurrentDateSP();
                    await GroupDailyStats.findOneAndUpdate(
                        { groupId: chatId, date: today },
                        { $inc: { messagesCount: 1 } },
                        { upsert: true }
                    );

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
            try {
                // 🔧 Usamos msg._data.quotedParticipant (já vem serializado com a mensagem)
                // em vez de msg.getQuotedMessage(), que hoje quebra com "Evaluation failed: r"
                // por causa de uma incompatibilidade atual do whatsapp-web.js com o WhatsApp Web.
                let autorOriginalRaw = msg._data?.quotedParticipant || msg._data?.quotedMsg?.from;

                // Fallback: se não veio no _data, tenta o método antigo (caso volte a funcionar)
                if (!autorOriginalRaw) {
                    const quotedMsg = await msg.getQuotedMessage();
                    autorOriginalRaw = quotedMsg.author || quotedMsg.from;
                }

                if (autorOriginalRaw) {
                    const autorOriginal = autorOriginalRaw.split('@')[0] + '@lid';
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
            } catch (e) {
                console.warn("⚠️ Não foi possível processar mensagem citada:", e.message);
            }
        }

        // --- 🟢 6. PARSER DE COMANDO (CORRIGIDO) ---
const prefixoCustomFinal = chatId.endsWith('@g.us') 
    ? (configBarreira?.prefixo || null) 
    : null;

const prefixoUsado = (prefixoCustomFinal && body.startsWith(prefixoCustomFinal) && !body.startsWith(prefix))
    ? prefixoCustomFinal
    : prefix;

if (!body.startsWith(prefix) && !(prefixoCustomFinal && body.startsWith(prefixoCustomFinal))) return;

const args = body.slice(prefixoUsado.length).trim().split(/\s+/);
const commandName = args.shift()?.toLowerCase(); // Adicionamos ? para evitar erro se args estiver vazio

// VALIDAÇÃO DE SEGURANÇA
if (!commandName || commandName === "") return;

// Verifica desafio diário ativo
if (global.desafiosAtivos) {
    const chave = `${senderRaw}:${chatId}`;
    const desafioAtivo = global.desafiosAtivos[chave];
    if (desafioAtivo && commandName === desafioAtivo.comando) {
        clearTimeout(desafioAtivo.timer);
        delete global.desafiosAtivos[chave];
        await User.updateOne(
            { userId: senderRaw, groupId: chatId },
            { $inc: { coins: 1000 }, $set: { lastDesafio: new Date() } }
        );
        await client.sendMessage(chatId, `✅ *DESAFIO CONCLUÍDO!*\n\n🎉 @${senderRaw.split('@')[0]} completou o desafio!\n💰 *+1.000 YC* adicionados!`, { mentions: [senderRaw] });
    }
}
// ADICIONE ENTRE A LINHA 520 E 522:

// --- SISTEMA ANTI-FLOOD ---
if (chatId.endsWith('@g.us') && !isAdmin) {
    const chaveFlood = `${senderRaw}:${chatId}`;
    const agoraFlood = Date.now();
    const JANELA_MS = 10000; // 10 segundos
    const LIMITE = 5;        // máximo de comandos na janela

    if (!global.antiFlood[chaveFlood]) {
        global.antiFlood[chaveFlood] = { count: 0, inicio: agoraFlood };
    }

    const flood = global.antiFlood[chaveFlood];

    if (agoraFlood - flood.inicio > JANELA_MS) {
        flood.count = 0;
        flood.inicio = agoraFlood;
    }

    flood.count++;

    if (flood.count > LIMITE) {
        if (flood.count === LIMITE + 1) {
            await client.sendMessage(chatId, `⚠️ @${senderRaw.split('@')[0]}, devagar! Você está enviando comandos muito rápido. Aguarde alguns segundos.`, { mentions: [senderRaw] });
        }
        return;
    }
}

let chat = null;
        let iAmAdmin = false;
        let isGroupAdmins = false;

        try {
    chat = await msg.getChat();

    if (chat.isGroup) {
        const meuId = client.info.wid._serialized;
        const botNoGrupo = chat.participants.find(p => p.id._serialized === meuId);
        iAmAdmin = botNoGrupo ? botNoGrupo.isAdmin : false;

        const autorNoGrupo = chat.participants.find(p => p.id._serialized === senderRaw);
        isGroupAdmins = autorNoGrupo ? (autorNoGrupo.isAdmin || autorNoGrupo.isSuperAdmin) : false;

        // ✅ Deu certo: salva cache de admins E de todos os participantes
        // (usado como fallback por outros comandos, ex: /sala, quando a busca falhar)
        const listaAdmins = chat.participants
            .filter(p => p.isAdmin || p.isSuperAdmin)
            .map(p => p.id._serialized);
        const listaParticipantes = chat.participants.map(p => p.id._serialized);

        await GroupConfig.updateOne(
            { groupId: chatId },
            { $set: {
                cachedAdmins: listaAdmins,
                cachedParticipants: listaParticipantes,
                cachedAt: new Date()
            } },
            { upsert: true }
        );
    }
} catch (e) {
    console.warn("⚠️ Não foi possível obter dados do chat/participantes (usando cache):", e.message);

    const configGrupo = await GroupConfig.findOne({ groupId: chatId }).lean();
    if (configGrupo?.cachedAdmins?.includes(senderRaw)) {
        isGroupAdmins = true;
    }
}
        if (isAdmin) isGroupAdmins = true;

// Adicione esta constante logo após suas definições de Schemas
const MAPA_BLOQUEIOS = {
    admLocked: ['adv', 'listaadv', 'rmadv', 'ban', 'banblack', 'unbanblack', 'blacklist', 'mute', 'desmute', 'mutep', 'desmutep', 'promover', 'rebaixar', 'todos', 'id', 'addcoins', 'rmvcoins', 'lock', 'unlock', 'addmodo', 'editmodo', 'delmodo', 'confmodos', 'monitorar', 'checar'],
    jogosLocked: ['cassino', 'apostar', 'roleta', '21', 'corrida', 'f', 'modo', 'modos', 'humor', 'cantadas', 'frasemotivacional', 'curiosidades', 'matar', 'encontro', 'adotarpet', 'pet', 'jogovelha', 'quiz', 'resp', 'quemsoueu', 'perg', 'forca', 'palpite', 'adivinhar', 'desafiodiario'],
    ecoLocked: ['perfil', 'inventario', 'rank', 'rankglobal', 'missão', 'yukonshop', 'doar', 'protecao', 'roubar', 'banco', 'modocaos', 'caixasurpresa', 'pousar', 'imune', 'assinatura'],
    iaLocked: ['ia', 'resumir'],
    salaLocked: ['addsala', 'sala'],
    socLocked: ['ship', 'amizade', 'casar', 'casais', 'divorciar', 'beijar', 'tapa', 'chutar', 'abraçar', 'criar_familia', 'adotar', 'parentesco', 'heranca', 'mesada', 'deserdar', 'amante', 'meu_amante', 'dar_flores', 'meu_aniver', 'aceitarp', 'aceitard', 'lista_aniver'],
    utilLocked: ['iniciar', 'painel', 'id_grupo', 'prefixo', 'simbolo']
};

// --- 🟢 BARREIRA DE SEGURANÇA INTEGRADA ---
const configGrupo = await GroupConfig.findOne({ groupId: chatId }).lean();
// Verifique se o 'commandName' realmente está batendo com os nomes no MAPA_BLOQUEIOS
if (chatId.endsWith('@g.us') && !isAdmin) {
    const configGrupo = await GroupConfig.findOne({ groupId: chatId }).lean();
    
    if (configGrupo) {
        // Log de debug para ver se o comando está chegando aqui
        // console.log("Verificando comando:", commandName); 

        for (const [campo, listaComandos] of Object.entries(MAPA_BLOQUEIOS)) {
            // AQUI ESTÁ O PULO DO GATO: Se o campo for undefined, ele ignora
            if (configGrupo[campo] === true && listaComandos.includes(commandName)) {
                return await client.sendMessage(chatId, `🔒 *SISTEMA:* Comando bloqueado.`);
            }
        }
    }
}

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
                    chat,
                    Pet,
                    command: `/${commandName}`
                });
            } catch (error) {
                console.error(`❌ Erro no comando ${commandName}:`, error.message, error.stack);
            }
        }

    } catch (e) {
        console.error("❌ ERRO GERAL NO INDEX:", e && e.stack ? e.stack : e);
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
 * 11. BOAS-VINDAS DINÂMICO COM FOTO - YUKON STATION (E AUTO-BAN)
 **********************************************************/
client.on('group_join', async (notification) => {
    try {
        const chatId = notification.chatId;
        const participantId = notification.recipientIds[0];

        // 🚨 --- MECANISMO DE AUTO-BAN (ANTI-RETORNO DA BLACKLIST) ---
        // Busca se o número que entrou está marcado com isBlacklisted: true NESTE grupo específico
        const banidoData = await User.findOne({ 
            userId: participantId, 
            groupId: chatId, 
            isBlacklisted: true 
        });

        if (banidoData) {
            const chat = await client.getChatById(chatId);
            
            // 1. Expulsa o intruso imediatamente
            await chat.removeParticipants([participantId]);

            // 2. Envia o aviso de barramento no grupo e interrompe o resto do código de boas-vindas
            const motivo = banidoData.blacklistReason || "Violação de perímetro";
            const avisoInvasao = `🚨 *SISTEMA DE DEFESA YUKON* 🚨
━━━━━━━━━━━━━━━━━━━━━
O sistema detectou a entrada do número banido: @${participantId.split('@')[0]}.
📝 *Motivo do Bloqueio:* _${motivo}_

⚡ *Ação:* Intruso removido com sucesso de forma automática.
━━━━━━━━━━━━━━━━━━━━━`;

            return await client.sendMessage(chatId, avisoInvasao, { mentions: [participantId] });
        }
        // -------------------------------------------------------------

        // 🟢 Incrementa o contador de entradas no banco de dados (Código Original)
        const GroupStats = mongoose.model('GroupStats');
        await GroupStats.updateOne(
            { groupId: chatId },
            { $inc: { entradas: 1 } },
            { upsert: true }
        );

        // --- CAPTURA DE MEMBROS NOVOS DIÁRIOS ---
        const today = getCurrentDateSP();
        await GroupDailyStats.findOneAndUpdate(
            { groupId: chatId, date: today },
            { $inc: { newMembers: 1 } },
            { upsert: true }
        );
        
        // --- TODO O SEU CÓDIGO ORIGINAL DE BOAS-VINDAS ---
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

        // --- CAPTURA DE MEMBROS QUE SAÍRAM DIÁRIOS ---
        const today = getCurrentDateSP();
        await GroupDailyStats.findOneAndUpdate(
            { groupId: chatId, date: today },
            { $inc: { leftMembers: 1 } },
            { upsert: true }
        );

        const participantId = notification.recipientIds[0];
        console.log(`📉 [LOG] Tripulante ${participantId} deixou a estação no grupo ${chatId}`);

    } catch (err) {
        console.error("❌ Erro ao registrar saída no banco:", err.message);
    }
});

// ============================================================
// SISTEMA DOS PETS
// ============================================================
 
cron.schedule('0 * * * *', async () => {
    try {
        const limite48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const petsMorrendo = await Pet.find({
            status: 'vivo',
            ultimaRefeicao: { $lte: limite48h }
        });
 
        for (const pet of petsMorrendo) {
            await Pet.updateOne(
                { _id: pet._id },
                { $set: { status: 'morto', diedAt: new Date() } }
            );
 
            try {
                await client.sendMessage(
                    pet.groupId,
                    `😢 *PET FALECEU*\n\n*${pet.nome}* (${pet.tipo}) de @${pet.ownerId.split('@')[0]} morreu de fome após 48h sem se alimentar.\n\n_Você poderá adotar um novo pet em 14 dias._`,
                    { mentions: [pet.ownerId] }
                );
            } catch {}
        }
 
        if (petsMorrendo.length > 0) {
            console.log(`🐾 [CRON] ${petsMorrendo.length} pet(s) morreram de fome.`);
        }
    } catch (e) {
        console.error("❌ Erro no cron de pets:", e);
    }
});

// ============================================================
// SISTEMA DO BANCO
// ============================================================
 
cron.schedule('0 0 * * *', async () => {
    console.log("🏦 Processando rendimentos bancários...");
    try {
        // Busca todos usuários com saldo no banco
        const usuariosComSaldo = await User.find({ bankCoins: { $gt: 0 } });
 
        const hoje = new Date().toLocaleDateString('pt-BR');
        let totalProcessados = 0;
 
        for (const user of usuariosComSaldo) {
            // Rendimento aleatório entre 1% e 3%
            const percentual = (Math.random() * 2 + 1).toFixed(2); // 1.00 a 3.00
            const rendimento = Math.floor(user.bankCoins * (percentual / 100));
 
            if (rendimento <= 0) continue;
 
            await User.updateOne(
                { _id: user._id },
                {
                    $inc: { bankCoins: rendimento },
                    $set: {
                        lastBankRendimento: rendimento,
                        lastBankRendimentoDate: hoje
                    }
                }
            );
 
            totalProcessados++;
        }
 
        console.log(`🏦 Rendimentos aplicados: ${totalProcessados} usuários processados.`);
    } catch (e) {
        console.error("❌ Erro no cron do banco:", e);
    }
});

// ============================================================
// SISTEMA DE MÉTRICAS DE GRUPO (CHS, SOCIAL LOCK-IN, GROWTH)
// ============================================================

cron.schedule('0 2 * * *', async () => {
    console.log("📊 Calculando métricas de grupos...");
    try {
        const authorizedGroups = await AuthorizedGroup.find({ isAuthorized: true });
        
        for (const authGroup of authorizedGroups) {
            const groupId = authGroup.groupId;
            
            // 1. Obter memberCount atual do cache
            const groupConfig = await GroupConfig.findOne({ groupId }).lean();
            const members = groupConfig?.cachedParticipants?.length || 0;
            
            // 2. Calcular activeMembers (usuários com mensagem nos últimos 7 dias)
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const activeMembers = await User.countDocuments({
                groupId: groupId,
                lastMessageAt: { $gte: sevenDaysAgo }
            });
            
            // 3. Calcular socialLockin (% de usuários com interações sociais)
            const users = await User.find({ groupId: groupId }).lean();
            let usersWithSocialInteraction = 0;
            
            for (const user of users) {
                const friendCount = Object.keys(user.friends || {}).length;
                if (friendCount > 0) {
                    usersWithSocialInteraction++;
                }
            }
            
            const socialLockin = users.length > 0 
                ? Math.round((usersWithSocialInteraction / users.length) * 100) 
                : 0;
            
            // 4. Calcular growth (variação de membros nos últimos 7 dias)
            const previousMetrics = await GroupMetrics.findOne({ groupId }).lean();
            let growth = '—';
            
            if (previousMetrics) {
                const memberDiff = members - previousMetrics.members;
                const growthPercent = previousMetrics.members > 0 
                    ? Math.round((memberDiff / previousMetrics.members) * 100) 
                    : 0;
                
                if (growthPercent > 0) {
                    growth = `+${growthPercent}%`;
                } else if (growthPercent < 0) {
                    growth = `${growthPercent}%`;
                } else {
                    growth = '0%';
                }
            }
            
            // 5. Calcular CHS (Community Health Score)
            // Fórmula: 40% engajamento (activeMembers/members) + 30% socialLockin + 30% estabilidade
            const engagementScore = members > 0 ? (activeMembers / members) * 40 : 0;
            const socialScore = (socialLockin / 100) * 30;
            const stabilityScore = 30; // Base estável se grupo está autorizado
            const chs = Math.round(engagementScore + socialScore + stabilityScore);
            
            // 6. Determinar tier baseado no CHS
            let tier = 'hibernating';
            if (chs >= 80) tier = 'premium';
            else if (chs >= 50) tier = 'standard';
            
            // Salvar métricas
            await GroupMetrics.findOneAndUpdate(
                { groupId },
                {
                    members,
                    activeMembers,
                    chs,
                    growth,
                    socialLockin,
                    tier,
                    calculatedAt: new Date()
                },
                { upsert: true }
            );
            
            console.log(`📊 Grupo ${groupId}: CHS=${chs}, Tier=${tier}, Members=${members}, Active=${activeMembers}`);
        }
        
        console.log("✅ Métricas de grupos calculadas com sucesso.");
    } catch (e) {
        console.error("❌ Erro no cron de métricas:", e);
    }
});

// ============================================================
// SISTEMA DE RESET DIÁRIO E HISTÓRICO DE 7 DIAS
// ============================================================

// Função auxiliar para obter data atual no fuso America/Sao_Paulo
function getCurrentDateSP() {
    const now = new Date();
    const options = { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' };
    const dateStr = now.toLocaleDateString('en-CA', options); // Formato YYYY-MM-DD
    return dateStr;
}

// Cron job às 00:00 (fuso America/Sao_Paulo) para reset diário e histórico
cron.schedule('0 0 * * *', async () => {
    console.log("🔄 Processando reset diário de estatísticas e snapshot de CHS...");
    try {
        const today = getCurrentDateSP();
        
        // Buscar todos os grupos com estatísticas diárias
        const allDailyStats = await GroupDailyStats.find({ date: today });
        
        for (const stat of allDailyStats) {
            const groupId = stat.groupId;
            
            // Calcular pilares do CHS para o snapshot
            const yukonUsers = await User.find({ groupId });
            const totalMembers = yukonUsers.length;
            const now = new Date();
            const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
            const activeMembers = yukonUsers.filter(user => 
                user.lastMessageAt && user.lastMessageAt > thirtyMinutesAgo
            ).length;
            
            // Atividade: activeMembers / members * 100
            const activityPillar = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;
            
            // Social: buscar socialLockin das métricas
            const groupMetrics = await GroupMetrics.findOne({ groupId });
            const socialPillar = groupMetrics?.socialLockin ?? 0;
            
            // Retenção: 100 - (saídas do dia / (membros atuais + saídas do dia) * 100)
            const leftMembersToday = stat.leftMembers || 0;
            const retentionPillar = totalMembers > 0 
                ? Math.round(100 - (leftMembersToday / (totalMembers + leftMembersToday) * 100))
                : 100;
            
            // Economia: calibrado baseado no valor econômico total
            // Fórmula: Comparar com média histórica (30 dias) - se não tiver histórico, usar baseline
            let economyPillar = null;
            try {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                
                const historyEconomy = await GroupCHSHistory.find({
                    groupId,
                    date: { $gte: thirtyDaysAgo.toLocaleDateString('en-CA') }
                });
                
                // Buscar total de coins do grupo
                const totalCoinsResult = await User.aggregate([
                    { $match: { groupId } },
                    { $group: { _id: null, total: { $sum: '$coins' } } }
                ]);
                const totalCoins = totalCoinsResult[0]?.total || 0;
                
                if (historyEconomy.length > 0) {
                    const avgEconomy = historyEconomy.reduce((sum, h) => sum + (h.pillars.economy || 0), 0) / historyEconomy.length;
                    
                    if (avgEconomy > 0) {
                        economyPillar = Math.min(100, Math.round((totalCoins / (avgEconomy * totalMembers)) * 100));
                    } else {
                        const coinsPerMember = totalMembers > 0 ? totalCoins / totalMembers : 0;
                        economyPillar = Math.min(100, Math.round(coinsPerMember * 2));
                    }
                } else {
                    const coinsPerMember = totalMembers > 0 ? totalCoins / totalMembers : 0;
                    economyPillar = Math.min(100, Math.round(coinsPerMember * 2));
                }
            } catch (error) {
                console.warn('[cron] Economy pillar calculation error:', error);
                economyPillar = null;
            }
            
            // Administração: calibrado baseado em taxa de advertências por membro
            let administrationPillar = null;
            try {
                const totalAdvsResult = await User.aggregate([
                    { $match: { groupId } },
                    { $group: { _id: null, total: { $sum: '$advs' } } }
                ]);
                const totalAdvs = totalAdvsResult[0]?.total || 0;
                const advsPerMember = totalMembers > 0 ? totalAdvs / totalMembers : 0;
                
                if (advsPerMember <= 0.1) {
                    administrationPillar = 100;
                } else if (advsPerMember <= 0.5) {
                    administrationPillar = 80;
                } else if (advsPerMember <= 1.0) {
                    administrationPillar = 50;
                } else if (advsPerMember <= 2.0) {
                    administrationPillar = 30;
                } else {
                    administrationPillar = 10;
                }
            } catch (error) {
                console.warn('[cron] Administration pillar calculation error:', error);
                administrationPillar = null;
            }
            
            // Calcular CHS completo (todos os 5 pilares)
            const availableWeight = economyPillar !== null && administrationPillar !== null 
                ? 1.0 // Todos os pilares disponíveis
                : 0.70; // Só 3 pilares disponíveis
            
            let chs;
            if (availableWeight === 1.0) {
                chs = Math.round(
                    activityPillar * 0.30 + 
                    socialPillar * 0.25 + 
                    economyPillar * 0.20 + 
                    retentionPillar * 0.15 + 
                    administrationPillar * 0.10
                );
            } else {
                chs = Math.round(
                    (activityPillar * 0.30 + socialPillar * 0.25 + retentionPillar * 0.15) / 0.70
                );
            }
            
            // Salvar snapshot do CHS no histórico
            await GroupCHSHistory.findOneAndUpdate(
                { groupId, date: today },
                {
                    chs,
                    pillars: {
                        activity: activityPillar,
                        social: socialPillar,
                        economy: economyPillar,
                        retention: retentionPillar,
                        administration: administrationPillar
                    }
                },
                { upsert: true }
            );
            
            // Resetar contadores para o novo dia
            await GroupDailyStats.updateOne(
                { _id: stat._id },
                {
                    $set: {
                        newMembers: 0,
                        leftMembers: 0,
                        coinsGenerated: 0,
                        coinsBet: 0,
                        messagesCount: 0,
                        bansCount: 0
                    }
                }
            );
        }
        
        // Limpar registros de GroupDailyStats com mais de 7 dias
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        await GroupDailyStats.deleteMany({ createdAt: { $lt: sevenDaysAgo } });
        
        // Limpar registros de GroupCHSHistory com mais de 90 dias
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        await GroupCHSHistory.deleteMany({ createdAt: { $lt: ninetyDaysAgo } });
        
        console.log("✅ Reset diário e snapshot de CHS concluídos. Histórico mantido (7 dias diários, 90 dias CHS).");
    } catch (e) {
        console.error("❌ Erro no cron de reset diário:", e);
    }
});