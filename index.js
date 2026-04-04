/**********************************************************
 * 1. DEPENDÊNCIAS
 **********************************************************/
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

async function enviarMenuComFoto(msg, caminhoImagem, texto) {
    try {
        const chatId = msg.from.toString();

        if (caminhoImagem && fs.existsSync(caminhoImagem)) {
            const media = MessageMedia.fromFilePath(caminhoImagem);
            await client.sendMessage(chatId, media, {
                caption: texto,
                sendSeen: false
            });
        } else {
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
                    iAmAdmin
                });
                return; // Para aqui, não entra no switch antigo
            } catch (error) {
                console.error(`❌ Erro ao executar comando ${command}:`, error);
                return msg.reply("⚠️ Erro interno ao processar este comando.");
            }
        }

        switch (command) {
 
        
          case '/listaadv':
    try {
        const idDoGrupo = msg.from._serialized || msg.from.toString();

        // 1. Busca os usuários que têm mais de 0 ADVs no grupo atual
        const advertidos = await User.find({ 
            groupId: idDoGrupo, 
            advs: { $gt: 0 } 
        });

        if (!advertidos || advertidos.length === 0) {
            return client.sendMessage(idDoGrupo, "✅ Ninguém com advertências neste grupo.", { sendSeen: false });
        }

        let listaMsg = "📋 *LISTA DE ADVERTÊNCIAS:*\n\n";
        let targets = [];

        // 2. Monta a lista e o array de menções
        for (const u of advertidos) {
            const userIdStr = String(u.userId).trim(); 
            
            // Extrai o número antes do @ (seja @c.us ou @lid)
            const numeroExibicao = userIdStr.split('@')[0];
            
            listaMsg += `• @${numeroExibicao}: *${u.advs}/3*\n`;
            targets.push(userIdStr);
        }

        // 3. Envio usando client.sendMessage (mais estável para t.replace)
        await client.sendMessage(idDoGrupo, listaMsg, { 
            mentions: targets, 
            sendSeen: false 
        });

    } catch (error) {
        console.error("❌ ERRO NO LISTAADV:", error);
        const idDoGrupo = msg.from._serialized || msg.from.toString();
        client.sendMessage(idDoGrupo, "⚠️ Erro interno ao processar a lista.");
    }
    break;

           case '/todos':
    // 1. Verificação de permissão (usando sua LISTA_ADMS + superusers)
    if (!isAdmin) return msg.reply('❌ Somente cargos de comando (ADMs) podem usar este sinal.', { sendSeen: false });
    
    try {
        const chat = await msg.getChat(); // Garante que temos o objeto do chat
        const idDoGrupo = msg.from._serialized || msg.from.toString();

        if (!chat.isGroup) return msg.reply('❌ Este comando só pode ser usado em grupos.');

        let mentais = [];
        let texto = "📢 *ATENÇÃO TRIPULAÇÃO:*\n\n";
        
        // Pega o texto extra se você digitar por exemplo: /todos Reunião agora
        const msgExtra = msg.body.split(/\s+/).slice(1).join(' ');
        if (msgExtra) {
            texto += `📝 *Aviso:* ${msgExtra}\n\n`;
        }

        for (let p of chat.participants) {
            mentais.push(p.id._serialized);
            // Ocultamos a menção visual para não poluir, o zap marca do mesmo jeito
            texto += ``; 
        }

        // 2. Usamos o client.sendMessage para blindar contra o erro t.replace
        await client.sendMessage(idDoGrupo, texto, { 
            mentions: mentais, 
            sendSeen: false 
        });

    } catch (err) {
        console.error("❌ ERRO NO TODOS:", err);
        msg.reply("❌ Erro ao tentar marcar todos.");
    }
    break;
           case '/ban':
    try {
        const chatId = msg.from._serialized || msg.from.toString();
        const chat = await msg.getChat();

        // 1. Verificação de ADM do Bot (Sua LISTA_ADMS)
        if (!isAdmin) {
            return client.sendMessage(chatId, '❌ Somente o comando da nave pode ejetar tripulantes.', { sendSeen: false });
        }

        // 2. Verificação se o BOT é adm do grupo (Dinâmica)
        const meuId = client.info.wid._serialized;
        const botNoGrupo = chat.participants.find(p => p.id._serialized === meuId);
        const botIsAdmin = botNoGrupo ? botNoGrupo.isAdmin : false;

        if (!botIsAdmin) {
            return client.sendMessage(chatId, '❌ Me dê cargo de ADM para operar a escotilha.', { sendSeen: false });
        }

        let target;

        // 3. Lógica para identificar o alvo (Menção ou Resposta)
        if (msg.hasQuotedMsg) {
            const quoted = await msg.getQuotedMessage();
            target = (quoted.author || quoted.from)._serialized || (quoted.author || quoted.from).toString();
        } else if (msg.mentionedIds.length > 0) {
            target = msg.mentionedIds[0]._serialized || msg.mentionedIds[0].toString();
        }

        if (!target) {
            return client.sendMessage(chatId, "❗ Marque alguém ou responda à mensagem de quem deseja ejetar.", { sendSeen: false });
        }

        const targetId = String(target).trim();

        // 4. Proteções (Dono, Bot e Lista de Ignorados)
        if (targetId === meuId) return msg.reply("❌ Eu não posso me ejetar da nave.");
        
        // Verifica se 'ignorados' existe e se o alvo está nela
        if (typeof ignorados !== 'undefined' && ignorados.includes(targetId)) {
            return client.sendMessage(chatId, "⚠️ Tripulante protegido pela diretriz Yukon.", { sendSeen: false });
        }

        // 5. Execução do Banimento
        // Remove do grupo oficialmente
        await chat.removeParticipants([targetId]);

        // Executa sua função visual (se ela existir)
        if (typeof ejetarComImagem === 'function') {
            await ejetarComImagem(chatId, targetId);
        } else {
            await client.sendMessage(chatId, `🚀 @${targetId.split('@')[0]} foi ejetado com sucesso.`, { mentions: [targetId] });
        }

        // 6. Reset de advertências no MongoDB
        await User.findOneAndUpdate(
            { userId: targetId, groupId: chatId }, 
            { $set: { advs: 0 } }
        );

    } catch (err) {
        console.error("❌ Erro crítico no comando ban:", err);
        const chatId = msg.from._serialized || msg.from.toString();
        client.sendMessage(chatId, "⚠️ Falha ao tentar ejetar o tripulante. Verifique se ele ainda está no grupo ou se eu sou admin.");
    }
    break;

           case '/mute':
    try {
        // 1. Verificação de permissão (Sua lista de adms)
        if (!isAdmin) return msg.reply('❌ Apenas o comando da tripulação pode silenciar o setor.', { sendSeen: false });

        const chat = await msg.getChat();
        if (!chat.isGroup) return msg.reply('❌ Este comando só funciona em grupos.');

        // 2. Verifica se o bot é admin para poder fechar o grupo
        const meuId = client.info.wid._serialized;
        const iAmAdmin = chat.participants.find(p => p.id._serialized === meuId)?.isAdmin;

        if (!iAmAdmin) return msg.reply('⚠️ Eu preciso ser Admin para fechar o grupo.');

        // 3. Fecha o grupo (true = apenas admins falam)
        await chat.setMessagesAdminsOnly(true);
        
        await client.sendMessage(msg.from, "🔇 *SETOR SILENCIADO*\n\nApenas a administração pode enviar mensagens agora.", { sendSeen: false });

    } catch (err) {
        console.error("❌ ERRO NO MUTE:", err);
        msg.reply("❌ Não consegui silenciar o grupo.");
    }
    break;

case '/desmute':
    try {
        // 1. Verificação de permissão
        if (!isAdmin) return msg.reply('❌ Você não tem autorização para liberar o setor.', { sendSeen: false });

        const chat = await msg.getChat();
        if (!chat.isGroup) return msg.reply('❌ Este comando só funciona em grupos.');

        const meuId = client.info.wid._serialized;
        const iAmAdmin = chat.participants.find(p => p.id._serialized === meuId)?.isAdmin;

        if (!iAmAdmin) return msg.reply('⚠️ Eu preciso ser Admin para abrir o grupo.');

        // 2. Abre o grupo (false = todos falam)
        await chat.setMessagesAdminsOnly(false);
        
        await client.sendMessage(msg.from, "🔊 *SETOR LIBERADO*\n\nA tripulação já pode enviar mensagens.", { sendSeen: false });

    } catch (err) {
        console.error("❌ ERRO NO DESMUTE:", err);
        msg.reply("❌ Não consegui liberar o grupo.");
    }
    break;

           case '/mutep':
    try {
        const idDoGrupo = msg.from._serialized || msg.from.toString();
        if (!isAdmin) return;

        // Checagem dinâmica de Admin
        const chat = await msg.getChat();
        const meuId = client.info.wid._serialized;
        const botIsAdmin = chat.participants.find(p => p.id._serialized === meuId)?.isAdmin;

        if (!botIsAdmin) {
            return client.sendMessage(idDoGrupo, "❌ Eu preciso ser adm para apagar mensagens de tripulantes mutados.", { sendSeen: false });
        }

        let targetMute;
        if (msg.hasQuotedMsg) {
            const quoted = await msg.getQuotedMessage();
            targetMute = (quoted.author || quoted.from)._serialized || (quoted.author || quoted.from).toString();
        } else if (msg.mentionedIds.length > 0) {
            targetMute = msg.mentionedIds[0]._serialized || msg.mentionedIds[0].toString();
        }

        if (!targetMute) {
            return client.sendMessage(idDoGrupo, "❗ Marque ou responda alguém para mutar.", { sendSeen: false });
        }

        const targetStr = String(targetMute).trim();

        await User.findOneAndUpdate(
            { userId: targetStr, groupId: idDoGrupo },
            { $set: { isMuted: true } },
            { upsert: true }
        );

        await client.sendMessage(idDoGrupo, `🔇 @${targetStr.split('@')[0]} foi mutado. Todas as suas transmissões serão interceptadas e apagadas.`, { 
            mentions: [targetStr],
            sendSeen: false 
        });

    } catch (e) {
        console.error("❌ Erro no mutep:", e);
    }
    break;

case '/desmutep':
    try {
        const idDoGrupo = msg.from._serialized || msg.from.toString();
        if (!isAdmin) return;
        
        let targetUnmute;
        if (msg.hasQuotedMsg) {
            const quoted = await msg.getQuotedMessage();
            targetUnmute = (quoted.author || quoted.from)._serialized || (quoted.author || quoted.from).toString();
        } else if (msg.mentionedIds.length > 0) {
            targetUnmute = msg.mentionedIds[0]._serialized || msg.mentionedIds[0].toString();
        }

        if (!targetUnmute) return;

        const targetStr = String(targetUnmute).trim();

        await User.findOneAndUpdate(
            { userId: targetStr, groupId: idDoGrupo },
            { $set: { isMuted: false } }
        );

        await client.sendMessage(idDoGrupo, `🔊 @${targetStr.split('@')[0]} foi desmutado. Canal de comunicação restabelecido.`, { 
            mentions: [targetStr],
            sendSeen: false 
        });

    } catch (e) {
        console.error("❌ Erro no desmutep:", e);
    }
    break;

            case '/rmvadv':
    if (!isAdmin) return;

    try {
        const idDoGrupo = msg.from._serialized || msg.from.toString();
        let targets = [];

        // 1. Captura os alvos (pode ser por citação OU por várias menções)
        if (msg.hasQuotedMsg) {
            const quoted = await msg.getQuotedMessage();
            targets.push((quoted.author || quoted.from)._serialized || (quoted.author || quoted.from).toString());
        } 
        
        if (msg.mentionedIds.length > 0) {
            msg.mentionedIds.forEach(id => {
                const idStr = id._serialized || id.toString();
                if (!targets.includes(idStr)) targets.push(idStr);
            });
        }

        if (targets.length === 0) {
            return msg.reply("❗ Marque ou responda alguém (ou vários) para remover advertências.", { sendSeen: false });
        }

        let relatorio = "📉 *RELATÓRIO DE REMOÇÃO:*\n\n";

        // 2. Loop para processar cada usuário mencionado
        for (const targetStr of targets) {
            const userDb = await User.findOne({ userId: targetStr, groupId: idDoGrupo });

            if (userDb && userDb.advs > 0) {
                const updatedUser = await User.findOneAndUpdate(
                    { userId: targetStr, groupId: idDoGrupo },
                    { $inc: { advs: -1 } },
                    { new: true }
                );
                relatorio += `• @${targetStr.split('@')[0]}: *${updatedUser.advs}/3*\n`;
            } else {
                relatorio += `• @${targetStr.split('@')[0]}: já estava limpo.\n`;
            }
        }

        // 3. Envia o relatório final mencionando todo mundo
        await client.sendMessage(idDoGrupo, relatorio, { 
            mentions: targets,
            sendSeen: false 
        });

    } catch (err) {
        console.error("❌ ERRO NO RMVADV MULTI:", err);
        msg.reply("❌ Erro ao remover advertências.");
    }
    break;

        case '/promover':
            try {
                const chatId = msg.from.toString();
                
                // Verificações de segurança
                if (!isAdmin) return; 
                if (!iAmAdmin) return client.sendMessage(chatId, "❌ Eu preciso ser ADM para promover alguém.", { sendSeen: false });

                let targetPromote;

                // 1. Identifica o alvo por Menção ou Resposta
                const mentions = await msg.getMentions();
                if (mentions.length > 0) {
                    targetPromote = mentions[0].id._serialized;
                } else if (msg.hasQuotedMsg) {
                    const quoted = await msg.getQuotedMessage();
                    targetPromote = (quoted.author || quoted.from).toString();
                }

                if (!targetPromote) {
                    return client.sendMessage(chatId, "❗ Marque o tripulante ou responda à mensagem dele.", { sendSeen: false });
                }

                const targetStr = targetPromote.toString();

                // 2. Executa a promoção no WhatsApp
                const chat = await client.getChatById(chatId);
                await chat.promoteParticipants([targetStr]);

                // 3. Resposta de confirmação (sem usar msg.reply para não crashar)
                await client.sendMessage(chatId, `🎖️ *PROMOÇÃO DE CARGO* \n\nO tripulante @${targetStr.split('@')[0]} agora faz parte do alto comando da nave!`, {
                    mentions: [targetStr],
                    sendSeen: false
                });

            } catch (err) {
                console.error("❌ Erro ao promover:", err);
            }
            break;

        case '/rebaixa':
            try {
                const chatId = msg.from.toString(); // Força o ID do grupo a ser string pura
                
                if (!isAdmin) return; 
                if (!iAmAdmin) return client.sendMessage(chatId, "❌ Eu preciso ser ADM para rebaixar alguém.", { sendSeen: false });

                let targetDemote;

                // 1. Identifica o alvo por Menção ou Resposta
                const mentions = await msg.getMentions();
                if (mentions.length > 0) {
                    targetDemote = mentions[0].id._serialized;
                } else if (msg.hasQuotedMsg) {
                    const quoted = await msg.getQuotedMessage();
                    targetDemote = (quoted.author || quoted.from).toString();
                }

                if (!targetDemote) {
                    return client.sendMessage(chatId, "❗ Marque o tripulante ou responda à mensagem dele.", { sendSeen: false });
                }

                const targetStr = targetDemote.toString();

                // 2. Executa o rebaixamento no WhatsApp usando o ID estável
                const chat = await client.getChatById(chatId);
                await chat.demoteParticipants([targetStr]);

                // 3. Resposta de confirmação segura
                await client.sendMessage(chatId, `📉 *REBAIXAMENTO DE CARGO* \n\nO tripulante @${targetStr.split('@')[0]} foi removido do alto comando e agora é parte da tripulação comum.`, {
                    mentions: [targetStr],
                    sendSeen: false
                });

            } catch (err) {
                console.error("❌ Erro ao rebaixar:", err);
            }
            break;

            // --- MENU PRINCIPAL (O GUIA) ---
      case '/painel':
            const menuPrincipal = `🚀 *YUKONBOT — CENTRAL DE COMANDO* 🚀
━━━━━━━━━━━━━━━━━━━━━━

Olá tripulante! Escolha um setor para navegar:

🛡️ */menu_adm* — Segurança e Moderação
🧪 */menu_ia* — Laboratório de I.A.
💰 */menu_economia* — Mineração e Ranking
🎰 */menu_diversao* — Cassino e Jogos
💘 */menu_social* — Relacionamentos
🎮 */menu_sala* — Gerenciamento de Sala
📖 */menu_util* — Utilidades Gerais

━━━━━━━━━━━━━━━━━━━━━━`;
            await enviarMenuComFoto(msg, 'painel.jpg', menuPrincipal);
            break;

        case '/menu_adm':
            const txtAdm = `🛡️ *SETOR DE SEGURANÇA*
━━━━━━━━━━━━━━━━━━━━━━
⚠️ */adv* — Advertir
📋 */listaadv* — Ver Lista de Avisos
❌ */rmadv* — Remover Advertência
⛔ */ban* — Banir
🚫 */banblack* — Blacklist Permanente
🔓 */unbanblack* — Remover Blacklist
📋 */blacklist* — Ver Inimigos
🔇 */mute / desmute* — Silenciar Chat
🤐 */mutep / desmutep* — Mute no Banco
🔼 */promover* — Tornar Administrador
🔽 */rebaixar* — Remover Administração
📣 */todos* — Marcar Todos
🆔 */id* — Ver Dados Técnicos
━━━━━━━━━━━━━━━━━━━━━━`;
            await enviarMenuComFoto(msg, 'menu_adm.jpg', txtAdm);
            break;

        case '/menu_ia':
            const txtIA = `🧪 *LABORATÓRIO DE I.A.*
━━━━━━━━━━━━━━━━━━━━━━
💬 */ia* ou */bot* — Chat com a Yukon
✨ */resumir* — Resumo do Chat
━━━━━━━━━━━━━━━━━━━━━━`;
            await enviarMenuComFoto(msg, 'menu_ia.jpg', txtIA);
            break;

        case '/menu_economia':
            const txtEco = `💰 *ECONOMIA E STATUS*
━━━━━━━━━━━━━━━━━━━━━━
👤 */perfil* — Seus Dados
🏆 */rank* — Ricos do Grupo
🌎 */rankglobal* — Ricos de Yukon
📅 */missão* — Coleta Diária
🛒 */yukonshop* — Loja
━━━━━━━━━━━━━━━━━━━━━━`;
            await enviarMenuComFoto(msg, 'menu_economia.jpg', txtEco);
            break;

        case '/menu_social':
            const txtSoc = `💘 *MÓDULO SOCIAL*
━━━━━━━━━━━━━━━━━━━━━━
💖 */ship* — Romance
😊 */amizade* - Ver pontos de amizade 
💍 */casar* — Casamento
📜 */casais* — Lista de Casados
💔 */divorciar* — Separação
💋 */beijar* — Beijo
👊 */tapa / chutar / abraçar*
━━━━━━━━━━━━━━━━━━━━━━`;
            await enviarMenuComFoto(msg, 'menu_social.jpg', txtSoc);
            break;

        case '/menu_diversao':
            const txtDiv = `🎰 *CASSINO E ENTRETENIMENTO*
━━━━━━━━━━━━━━━━━━━━━━
🎲 */cassino* — Menu de Jogos
💸 */apostar* — Multiplicar Coins
🖼️ */f* — Figurinhas
🎰 */roleta / 21 / corrida*
━━━━━━━━━━━━━━━━━━━━━━`;
            await enviarMenuComFoto(msg, 'menu_diversao.jpg', txtDiv);
            break;

        case '/menu_sala':
            const txtSala = `🎮 *GERENCIAMENTO DE SALA*
━━━━━━━━━━━━━━━━━━━━━━
🆔 */addsala* — Definir Código
👁️ */sala* — Ver Sala Atual
━━━━━━━━━━━━━━━━━━━━━━`;
            await enviarMenuComFoto(msg, 'menu_sala.jpg', txtSala);
            break;

        case '/menu_util':
            const txtUtil = `📖 *SISTEMA CENTRAL*
━━━━━━━━━━━━━━━━━━━━━━
▶️ */iniciar* — Iniciar Bot
📊 */painel* — Menu Principal
📣 */todos* — Alerta Geral
━━━━━━━━━━━━━━━━━━━━━━`;
            await enviarMenuComFoto(msg, 'menu_util.jpg', txtUtil);
            break;


       case '/help':
            try {
                const chatId = msg.from.toString(); // Higieniza o ID do chat

                const textoHelp = `🛠️ *YUKON BOT — SUPORTE* ❄️
Precisa de ajuda ou tem sugestões de novos comandos?

Entre em contato diretamente com o desenvolvedor da Yukon BOT.
👤 *Desenvolvedor:* yukyDev

💬 *Contato:* Discord
Sua ideia pode fazer parte das próximas atualizações!`;

                // Enviamos via client para evitar o erro t.replace do msg.reply
                await client.sendMessage(chatId, textoHelp, { sendSeen: false });

            } catch (err) {
                console.error("❌ Erro ao executar help:", err);
            }
            break;

        case '/iniciar':
            try {
                // Forçamos o ID a ser uma string pura para evitar o erro t.replace
                const chatId = msg.from.toString();
                
                // Em vez de buscar o objeto chat completo (que está dando erro),
                // vamos enviar a mensagem diretamente para o ID verificado
                const textoBoasVindas = `🚀 *SISTEMA YUKON ATIVADO!* \n\n` +
                    `Este setor agora está sob monitoramento oficial.\n\n` +
                    `Use */painel* para ver os comandos disponíveis.`;

                await client.sendMessage(chatId, textoBoasVindas, { sendSeen: false });

            } catch (err) {
                console.error("❌ Erro crítico no comando iniciar:", err);
            }
            break;

        case '/f':
        case '/figu':
            try {
                const chatId = msg.from.toString();
                let messageWithMedia = null;

                if (msg.hasMedia) {
                    messageWithMedia = msg;
                } else if (msg.hasQuotedMsg) {
                    const quoted = await msg.getQuotedMessage();
                    if (quoted.hasMedia) messageWithMedia = quoted;
                }

                if (!messageWithMedia) {
                    return client.sendMessage(chatId, "❗ Envie ou responda uma imagem/vídeo.", { sendSeen: false });
                }

               // Download da mídia
                const media = await messageWithMedia.downloadMedia();
                if (!media) return;

                // Tenta enviar com um objeto de mídia reconstruído
                await client.sendMessage(chatId, media, {
                    sendMediaAsSticker: true,
                    stickerName: "YukonBot ❄️",
                    stickerAuthor: "yukyDev",
                    sendSeen: false,
                    unsafe_ignore_parameters: true // Algumas versões precisam disso para ignorar metadados corrompidos
                }).catch(async (err) => {
                    console.error("⚠️ Falha na conversão:", err.message);
                    // Fallback: Avisa o usuário de forma amigável
                    await client.sendMessage(chatId, "❄️ *SISTEMA YUKON:* O setor de figurinhas está instável. Tente enviar a imagem novamente ou use uma imagem menor.", { sendSeen: false });
                });
            } catch (e) {
                console.error("❌ Erro Sticker:", e.message);
            }
            break;

        case '/perfil':
            try {
                const chatId = msg.from.toString();
                const senderId = senderRaw.toString();
                const userProfile = await User.findOne({ userId: senderId, groupId: chatId });

                if (!userProfile) return client.sendMessage(chatId, "❌ Registro não encontrado nos arquivos da Yukon.", { sendSeen: false });

                // --- LÓGICA DE PATENTES ---
                let patente = "❄️ Recruta do Gelo";
                const lvl = userProfile.level || 1;
                if (lvl >= 5) patente = "🏹 Explorador Ártico";
                if (lvl >= 15) patente = "🛡️ Veterano de Yukon";
                if (lvl >= 30) patente = "👨‍✈️ Comandante Glacial";
                if (lvl >= 50) patente = "👑 Lenda de Yukon";

                // --- BARRA DE PROGRESSO ---
                const xpAtual = userProfile.xp || 0;
                const xpNecessario = 100; 
                let calculoProgresso = Math.floor((xpAtual / xpNecessario) * 10);
                let progresso = Math.max(0, Math.min(10, calculoProgresso)); 
                const barra = "▓".repeat(progresso) + "░".repeat(10 - progresso);

                // --- STATUS CIVIL (Com Menção) ---
                let statusCivil = "🤍 Solteiro(a)";
                let mentions = [senderId];
                
                if (userProfile.marriedWith) {
                    const conjugeId = userProfile.marriedWith.toString();
                    statusCivil = `💍 Casado(a) com @${conjugeId.split('@')[0]}`;
                    mentions.push(conjugeId); // Adiciona o cônjuge nas menções para o @ funcionar
                }

                const perfilCustom = `
❄️ *ID DE ACESSO — YUKON STATION* ❄️
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃👤 *NOME:* ${msg._data.notifyName || "Tripulante"}
┃🎖️ *PATENTE:* ${patente}
┃🆙 *NÍVEL:* ${lvl}
┃💰 *CRÉDITOS:* ${Number(userProfile.coins || 0).toLocaleString('pt-BR')} YC
┠━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃📊 *XP:* [${barra}] ${xpAtual}%
┃📜 *STATUS:* ${statusCivil}
┠━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏅 *CARGOS:* ${userProfile.roles && userProfile.roles.length > 0 ? userProfile.roles.join(' | ') : 'Tripulante'}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();

                // Se futuramente você tiver userProfile.avatarUrl, 
                // aqui usaríamos MessageMedia.fromUrl(userProfile.avatarUrl)
                await client.sendMessage(chatId, perfilCustom, { 
                    mentions, 
                    sendSeen: false 
                });

            } catch (err) {
                console.error("Erro no perfil:", err.message);
                client.sendMessage(msg.from.toString(), "❌ Erro ao acessar o banco de dados de tripulantes.", { sendSeen: false });
            }
            break;

      case '/yukonshop':
        case '/loja':
            try {
                // Forçamos o ID do chat para string para evitar o erro interno da biblioteca
                const chatId = msg.from.toString();

                const shopMsg = `🛒 *YUKON SHOP - PATENTES* ❄️\n` +
                                `Suba na hierarquia da nave agora!\n\n` +
                                `1️⃣ *Impostor* - 💰 500\n` +
                                `2️⃣ *Cientista* - 💰 1.000\n` +
                                `3️⃣ *Capitão* - 💰 5.000\n` +
                                `4️⃣ *Especialista* - 💰 10.000\n` +
                                `5️⃣ *Veterano* - 💰 25.000\n` +
                                `6️⃣ *Comandante* - 💰 50.000\n` +
                                `7️⃣ *Elite Galáctica* - 💰 80.000\n` +
                                `8️⃣ *Guardião Estelar* - 💰 120.000\n` +
                                `9️⃣ *Viajante Dimensional* - 💰 180.000\n` +
                                `🔟 *Lorde das Estrelas* - 💰 250.000\n` +
                                `1️⃣1️⃣ *Almirante de Frota* - 💰 320.000\n` +
                                `1️⃣2️⃣ *Governador Planetário* - 💰 400.000\n` +
                                `1️⃣3️⃣ *Lenda Estelar* - 💰 500.000\n\n` +
                                `Use */comprar [numero]* para adquirir!`;

                // Usamos client.sendMessage em vez de msg.reply
                await client.sendMessage(chatId, shopMsg, { sendSeen: false });

            } catch (err) {
                console.error("❌ Erro ao abrir a loja:", err);
            }
            break;

        case '/comprar':
            try {
                const chatId = msg.from.toString(); // Higieniza o ID
                const item = args[0];
                const produtos = {
                    '1': { nome: 'Impostor', preco: 500 },
                    '2': { nome: 'Cientista', preco: 1000 },
                    '3': { nome: 'Capitão', preco: 5000 },
                    '4': { nome: 'Especialista', preco: 10000 },
                    '5': { nome: 'Veterano', preco: 25000 },
                    '6': { nome: 'Comandante', preco: 50000 },
                    '7': { nome: 'Elite Galáctica', preco: 80000 },
                    '8': { nome: 'Guardião Estelar', preco: 120000 },
                    '9': { nome: 'Viajante Dimensional', preco: 180000 },
                    '10': { nome: 'Lorde das Estrelas', preco: 250000 },
                    '11': { nome: 'Almirante de Frota', preco: 320000 },
                    '12': { nome: 'Governador Planetário', preco: 400000 },
                    '13': { nome: 'Lenda Estelar', preco: 500000 }
                };

                const produto = produtos[item];
                if (!produto) {
                    return client.sendMessage(chatId, "❗ *SETOR DE VENDAS:* Item inválido! Use um número de 1 a 13.\nExemplo: *$$comprar 1*", { sendSeen: false });
                }

                const userComprador = await User.findOne({ userId: senderRaw, groupId: chatId });
                
                if (!userComprador) {
                    return client.sendMessage(chatId, "❌ Perfil não encontrado no banco de dados.", { sendSeen: false });
                }

                // Verifica se tem dinheiro
                if (userComprador.coins < produto.preco) {
                    const falta = produto.preco - userComprador.coins;
                    return client.sendMessage(chatId, `❌ *SALDO INSUFICIENTE*\n\nVocê precisa de mais *${falta.toLocaleString('pt-BR')}* YukonCoins para este cargo.`, { sendSeen: false });
                }

                // Verifica se já tem o cargo
                if (userComprador.roles && userComprador.roles.includes(produto.nome)) {
                    return client.sendMessage(chatId, "🏅 Você já possui este cargo em sua ficha de tripulante!", { sendSeen: false });
                }

                // Executa a transação no banco
                const finalUser = await User.findOneAndUpdate(
                    { userId: senderRaw, groupId: chatId },
                    { 
                        $inc: { coins: -produto.preco },
                        $push: { roles: produto.nome } 
                    },
                    { new: true }
                );

                // Mensagem de sucesso estilizada
                const msgSucesso = `🎊 *AQUISIÇÃO DE PATENTE* 🎊\n` +
                                 `━━━━━━━━━━━━━━━━━━\n` +
                                 `🚀 *Nova Patente:* ${produto.nome}\n` +
                                 `💰 *Investimento:* ${produto.preco.toLocaleString('pt-BR')} YC\n` +
                                 `📉 *Saldo Atual:* ${finalUser.coins.toLocaleString('pt-BR')} YC\n` +
                                 `━━━━━━━━━━━━━━━━━━\n` +
                                 `Sua nova patente já foi registrada no seu /perfil!`;

                await client.sendMessage(chatId, msgSucesso, { sendSeen: false });

            } catch (e) {
                console.error("Erro na compra:", e.message);
                client.sendMessage(msg.from.toString(), "⚠️ Ocorreu um erro técnico ao processar sua compra. Tente novamente.", { sendSeen: false });
            }
            break;

        case '/rank':
        case '/top':
            try {
                const chatId = msg.from.toString();
                
                // 1. Busca os 10 melhores EXCLUSIVAMENTE deste grupo
                const rawTopUsers = await User.find({ 
                    groupId: chatId, 
                    userId: { $ne: null } 
                })
                .sort({ level: -1, xp: -1 })
                .limit(10);

                const topUsers = rawTopUsers.filter(u => u && u.userId);

                if (topUsers.length === 0) {
                    return client.sendMessage(chatId, "🚀 Setor vazio. Nenhuma atividade registrada nesta nave.", { sendSeen: false });
                }

                // Tabela de referência para definir qual cargo é mais "caro"
                const ordemCargos = [
                    'Lenda Estelar', 'Governador Planetário', 'Almirante de Frota', 
                    'Lorde das Estrelas', 'Viajante Dimensional', 'Guardião Estelar', 
                    'Elite Galáctica', 'Comandante', 'Veterano', 'Especialista', 
                    'Capitão', 'Cientista', 'Impostor'
                ];

                const groupChat = await client.getChatById(chatId);
                let rankMsg = `🏆 *RANKING DO SETOR* 🏆\n`;
                rankMsg += `🛰️ *Nave:* ${groupChat.name || "Yukon Station"}\n`;
                rankMsg += `━━━━━━━━━━━━━━━━━━\n\n`;
                
                let mentions = [];

                topUsers.forEach((u, index) => {
                    const jid = u.userId.toString();
                    const numero = jid.split('@')[0];
                    
                    let posicao = `${index + 1}º`;
                    if (index === 0) posicao = "🥇";
                    if (index === 1) posicao = "🥈";
                    if (index === 2) posicao = "🥉";

                    // --- LÓGICA DO CARGO MAIS CARO ---
                    // Filtra os cargos que o usuário tem e que estão na nossa lista da loja
                    // O .find() vai pegar o primeiro da lista 'ordemCargos' que o usuário possuir
                    let cargoElite = u.roles.find(r => ordemCargos.includes(r)) || "Tripulante";

                    const moedas = (u.coins || 0).toLocaleString('pt-BR');

                    rankMsg += `${posicao} | @${numero}\n`;
                    rankMsg += `╰ ⭐ *Lvl:* ${u.level || 0} | 🎖️ *${cargoElite}*\n`;
                    rankMsg += `╰ 💰 *Créditos:* ${moedas} YC\n\n`;
                    
                    mentions.push(jid);
                });

                rankMsg += `━━━━━━━━━━━━━━━━━━\n❄️ *Ranking exclusivo deste setor*`;

                await client.sendMessage(chatId, rankMsg, { 
                    mentions, 
                    sendSeen: false 
                });

            } catch (err) {
                console.error("❌ ERRO NO RANK:", err);
                client.sendMessage(msg.from.toString(), "⚠️ Falha ao acessar banco de dados do setor.", { sendSeen: false });
            }
            break;

        case '/rankglobal':
        case '/topglobal':
            try {
                const chatId = msg.from.toString();

                // 1. Busca os TOP 10 globais (ordenado por coins)
                // Usamos .lean() para performance, já que é uma consulta grande
                const topGeral = await User.find({ userId: { $ne: null } })
                    .sort({ coins: -1 })
                    .limit(10)
                    .lean();

                if (!topGeral || topGeral.length === 0) {
                    return client.sendMessage(chatId, "🌌 O universo Yukon ainda está deserto...", { sendSeen: false });
                }

                // Hierarquia de prestígio (do mais caro/difícil para o mais simples)
                const ordemCargos = [
                    'Lenda Estelar', 'Governador Planetário', 'Almirante de Frota', 
                    'Lorde das Estrelas', 'Viajante Dimensional', 'Guardião Estelar', 
                    'Elite Galáctica', 'Comandante', 'Veterano', 'Especialista', 
                    'Capitão', 'Cientista', 'Impostor'
                ];

                let rankMsg = `🌌 *RANKING GLOBAL YUKON* 🌌\n`;
                rankMsg += `_Os 10 usuários mais poderosos do universo_\n`;
                rankMsg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

                let mentions = [];

                topGeral.forEach((u, i) => {
                    const jid = u.userId.toString();
                    const medalha = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🎖️";
                    
                    // Lógica inteligente de Patente: busca o cargo de maior prestígio no array roles
                    let maiorCargo = "Tripulante";
                    if (u.roles && Array.isArray(u.roles)) {
                        maiorCargo = ordemCargos.find(cargo => u.roles.includes(cargo)) || "Tripulante";
                    }

                    rankMsg += `${medalha} *${i + 1}º* | @${jid.split('@')[0]}\n`;
                    rankMsg += `╰ 💰 *Coins:* ${Number(u.coins || 0).toLocaleString('pt-BR')} YC\n`;
                    rankMsg += `╰ 🆙 *Level:* ${u.level || 0} | 🎖️ *${maiorCargo}*\n`;
                    rankMsg += `⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n`;

                    mentions.push(jid);
                });

                rankMsg += `🛰️ *Yukon Station — Central Intergaláctica*`;

                // Envio seguro usando o CLIENT
                await client.sendMessage(chatId, rankMsg, { 
                    mentions, 
                    sendSeen: false 
                });

            } catch (e) {
                console.error("❌ ERRO NO RANK GLOBAL:", e);
                const safeId = msg.from.toString();
                client.sendMessage(safeId, "⚠️ Erro ao sintonizar o ranking galáctico.", { sendSeen: false });
            }
            break;
        case '/ia':
case '/bot':
    // 1. Captura de ID ultra segura
    const iaChatId = msg.from._serialized || msg.from.toString();
    const pergunta = args.join(' ');

    if (!pergunta) {
        return client.sendMessage(iaChatId, "🤖 *YUKON IA:* O setor de comunicação está aberto. O que deseja perguntar? \n\nEx: */ia como funciona um buraco negro?*", { sendSeen: false });
    }

    try {
        // 2. Feedback Visual: Reage com um emoji de engrenagem para mostrar que está "pensando"
        // Isso substitui o typing indicator que estava dando crash
        await msg.react('⚙️');

        const completion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: "Você é a YukonBot, a inteligência artificial de bordo da Estação Yukon. Desenvolvida pelo seu Dev (YukyDev). Suas respostas devem ser curtas, diretas, inteligentes e manter o tema espacial/tecnológico. Use emojis de forma moderada." 
                },
                { role: "user", content: pergunta }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7, // Um toque de criatividade
        });

        const respostaIA = completion.choices[0]?.message?.content;
        
        if (!respostaIA) throw new Error("Resposta nula");

        // 3. Envio da resposta formatada
        await client.sendMessage(iaChatId, `🤖 *YUKON IA*\n\n${respostaIA}`, { sendSeen: false });

        // Remove a reação de engrenagem e coloca um check
        await msg.react('✅');

    } catch (e) { 
        console.error("❌ ERRO NA IA (GROQ):", e.message);
        await msg.react('❌');
        client.sendMessage(iaChatId, "⚠️ *COMUNICAÇÃO INTERROMPIDA:* Tive um problema ao processar sua consulta nos servidores da Groq. Tente novamente.", { sendSeen: false }); 
    }
    break;

        case '/amizade':
    try {
        const chatId = msg.from.toString();
        
        if (!msg.mentionedIds || msg.mentionedIds.length === 0) {
            return client.sendMessage(chatId, "❗ *RADAR:* Marque um tripulante para medir a sincronia!", { sendSeen: false });
        }

        // Padroniza para @lid para buscar no banco
        const targetRaw = msg.mentionedIds[0]._serialized || msg.mentionedIds[0];
        const targetAmigo = targetRaw.split('@')[0] + '@lid';
        const senderId = senderRaw.split('@')[0] + '@lid';

        if (targetAmigo === senderId) {
            return client.sendMessage(chatId, "🎡 *SISTEMA:* Sua amizade própria é de 100%, mas tente marcar outra pessoa!", { sendSeen: false });
        }

        const dataUser = await User.findOne({ userId: senderId, groupId: chatId });
        
        // Pega a porcentagem ou 0 se nunca conversaram
        const chaveAmigo = targetAmigo.replace(/\D/g, '');
        let porcentagem = (dataUser && dataUser.friends && dataUser.friends[chaveAmigo]) ? dataUser.friends[chaveAmigo] : 0;
        
        // Limita em 100%
        const nivelFinal = Math.min(Math.floor(porcentagem), 100);

        // Barra de progresso
        const completas = Math.round(nivelFinal / 10);
        const barraVisual = "🟦".repeat(completas) + "⬜".repeat(10 - completas);

        let statusAmizade = "Desconhecidos 👤";
        if (nivelFinal > 10) statusAmizade = "Conversa Casual 💬";
        if (nivelFinal > 30) statusAmizade = "Colegas de Cabine 🤝";
        if (nivelFinal > 60) statusAmizade = "Parceiros de Missão 🚀";
        if (nivelFinal > 90) statusAmizade = "Irmãos Estelares 💎";
        if (nivelFinal === 100) statusAmizade = "Sincronia Total 🌌";

        const msgAmizade = `👥 *SINCRONIA DE AMIZADE* 👥\n` +
                         `━━━━━━━━━━━━━━━━━━\n` +
                         `👤 @${senderId.split('@')[0]}\n` +
                         `🤝 @${targetAmigo.split('@')[0]}\n\n` +
                         `📊 *Nível:* ${nivelFinal}%\n` +
                         `[${barraVisual}]\n\n` +
                         `🛰️ *Status:* ${statusAmizade}\n` +
                         `━━━━━━━━━━━━━━━━━━\n` +
                         `_Dica: Responda as mensagens um do outro para aumentar este nível!_`;
        
        // Converte para @c.us apenas para a menção do zap não bugar
        const m1 = senderId.split('@')[0] + '@c.us';
        const m2 = targetAmigo.split('@')[0] + '@c.us';

        await client.sendMessage(chatId, msgAmizade, { 
            mentions: [m1, m2],
            sendSeen: false 
        });

    } catch (e) {
        console.error("❌ ERRO NO AMIZADE:", e);
        client.sendMessage(msg.from, "⚠️ Erro nos sensores de afinidade.");
    }
    break;

      case '/ship':
    try {
        const chatId = msg.from.toString();
        
        if (!msg.mentionedIds || msg.mentionedIds.length === 0) {
            return client.sendMessage(chatId, "❗ *RADAR:* Marque alguém para calcular a compatibilidade estelar!", { sendSeen: false });
        }

        // Padronização para @lid (Busca no banco) e @c.us (Menções no Zap)
        const targetRaw = msg.mentionedIds[0]._serialized || msg.mentionedIds[0];
        const loveTargetLid = targetRaw.split('@')[0] + '@lid';
        const senderLid = senderRaw.split('@')[0] + '@lid';

        if (loveTargetLid === senderLid) {
            return client.sendMessage(chatId, "🚀 *SISTEMA:* Você tem 100% de amor próprio! Continue assim.", { sendSeen: false });
        }

        // 1. Lógica da Semente (Base fixa por dia para o casal)
        const hoje = new Date().toDateString(); 
        const seed = senderLid + loveTargetLid + hoje; 
        let baseChance = 0;
        for (let i = 0; i < seed.length; i++) {
            baseChance = (baseChance + seed.charCodeAt(i)) % 101;
        }

        // 2. Busca o bônus de interação no banco (mesmo campo do /amizade)
        const dataUser = await User.findOne({ userId: senderLid, groupId: chatId });
        const chaveParceiro = loveTargetLid.replace(/\D/g, '');
        
        // Pegamos o valor de amizade/interação e dividimos por 2 para ser o "bônus de ship"
        const bonusInteracao = (dataUser && dataUser.friends && dataUser.friends[chaveParceiro]) 
            ? Math.floor(dataUser.friends[chaveParceiro] / 2) 
            : 0;

        // Chance Final = Base + Bônus (Máximo 100%)
        const loveChance = Math.min(baseChance + bonusInteracao, 100);

        // Barra de progresso com corações
        const cheios = Math.round(loveChance / 10);
        const barraAmor = "❤️".repeat(cheios) + "🖤".repeat(10 - cheios);

        // Vereditos
        let veredito = "❄️ *ZERO ABSOLUTO*";
        let comentario = "Melhor ficarem em cabines separadas...";

        if (loveChance > 20) { veredito = "☁️ *PEQUENA ATRAÇÃO*"; comentario = "Talvez um café na cantina da nave?"; }
        if (loveChance > 50) { veredito = "👀 *CLIMA QUENTE*"; comentario = "Há uma tensão nos circuitos aqui!"; }
        if (loveChance > 85) { veredito = "🔥 *CONEXÃO ABSOLUTA*"; comentario = "O destino escreveu o nome de vocês nas estrelas!"; }
        if (loveChance === 100) { veredito = "👑 *ALMAS GÊMEAS*"; comentario = "Já podem usar o comando /casar!"; }

        const textoShip = `💘 *YUKON SHIP* 💘\n` +
                         `━━━━━━━━━━━━━━━━━━\n` +
                         `👤 @${senderLid.split('@')[0]}\n` +
                         `❤️ @${loveTargetLid.split('@')[0]}\n\n` +
                         `✨ *Chance:* ${loveChance}% \n` +
                         `_(${baseChance}% base + ${bonusInteracao}% bônus de conversa)_\n\n` +
                         `[${barraAmor}]\n\n` +
                         `📡 *Veredito:* ${veredito}\n` +
                         `💬 ${comentario}\n` +
                         `━━━━━━━━━━━━━━━━━━`;
        
        // Conversão para menção segura (@c.us)
        const m1 = senderLid.split('@')[0] + '@c.us';
        const m2 = loveTargetLid.split('@')[0] + '@c.us';

        await client.sendMessage(chatId, textoShip, { 
            mentions: [m1, m2],
            sendSeen: false 
        });

    } catch (e) {
        console.error("❌ ERRO NO SHIP:", e);
        client.sendMessage(msg.from.toString(), "⚠️ Erro no sensor de batimentos cardíacos.");
    }
    break;
            
      case '/casar':
            try {
                const chatId = msg.from.toString();
                if (!msg.mentionedIds[0]) {
                    return client.sendMessage(chatId, "❗ Marque quem você quer pedir em casamento!", { sendSeen: false });
                }

                const pretendente = msg.mentionedIds[0].toString();
                const autor = senderRaw.toString();

                if (pretendente === autor) return client.sendMessage(chatId, "😂 Não pode casar consigo mesmo!", { sendSeen: false });

                // Verificação: Ver se algum dos dois já é casado
                const dadosAutor = await User.findOne({ userId: autor, groupId: chatId });
                const dadosPretendente = await User.findOne({ userId: pretendente, groupId: chatId });

                if (dadosAutor?.marriedWith) return client.sendMessage(chatId, "⚠️ Você já é casado!");
                if (dadosPretendente?.marriedWith) return client.sendMessage(chatId, "⚠️ Essa pessoa já é casada!");

                const msgPedido = `💍 *PEDIDO DE UNIÃO* 💍\n\n` +
                                 `🚀 @${autor.split('@')[0]} pediu @${pretendente.split('@')[0]} em casamento!\n\n` +
                                 `⚠️ @${pretendente.split('@')[0]}, *RESPONDA* esta mensagem com */aceitarp* para confirmar!`;
                
                await client.sendMessage(chatId, msgPedido, { 
                    // IMPORTANTE: O pretendente deve ser o primeiro da lista de mentions [0]
                    mentions: [pretendente, autor], 
                    sendSeen: false 
                });
            } catch (e) { console.error(e); }
            break;

        case '/aceitarp':
            try {
                const chatId = msg.from.toString();
                if (!msg.hasQuotedMsg) {
                    return client.sendMessage(chatId, "❌ Você precisa *RESPONDER* à mensagem do pedido!", { sendSeen: false });
                }

                const quotedMsg = await msg.getQuotedMessage();
                const aceitanteId = senderRaw.toString();

                // 1. Pega quem foi o alvo do pedido (quem a Yukon marcou primeiro no /casar)
                let pretendenteOriginalId = quotedMsg.mentionedIds[0] ? 
                    (quotedMsg.mentionedIds[0]._serialized || quotedMsg.mentionedIds[0]).toString() : null;

                // 2. Pega quem fez o pedido (o segundo marcado)
                let autorDoPedidoId = quotedMsg.mentionedIds[1] ? 
                    (quotedMsg.mentionedIds[1]._serialized || quotedMsg.mentionedIds[1]).toString() : null;

                // 🛑 TRAVA DE IDENTIDADE:
                if (aceitanteId !== pretendenteOriginalId) {
                    return client.sendMessage(chatId, `✋ @${aceitanteId.split('@')[0]}, você não pode aceitar um pedido que não foi para você! Apenas @${pretendenteOriginalId.split('@')[0]} pode aceitar.`, {
                        mentions: [aceitanteId, pretendenteOriginalId]
                    });
                }

                if (!autorDoPedidoId) return client.sendMessage(chatId, "❌ Erro: Não encontrei o autor do pedido.");

                // 3. Atualização no Banco
                await User.updateOne({ userId: aceitanteId, groupId: chatId }, { $set: { marriedWith: autorDoPedidoId } });
                await User.updateOne({ userId: autorDoPedidoId, groupId: chatId }, { $set: { marriedWith: aceitanteId } });

                const msgSucesso = `🎊 *UNIÃO REGISTRADA!* 🎊\n\n💍 @${autorDoPedidoId.split('@')[0]} e @${aceitanteId.split('@')[0]}\n\nFelicidades aos novos parceiros da Yukon Station! 🥂`;

                await client.sendMessage(chatId, msgSucesso, { 
                    mentions: [autorDoPedidoId, aceitanteId], 
                    sendSeen: false 
                });

            } catch (err) { console.error(err); }
            break;
        
        case '/cassino':
            try {
                const chatId = msg.from.toString();
                const senderId = senderRaw.toString();
                
                // Pegamos os argumentos corretamente
                const jogo = args[0] ? args[0].toLowerCase() : null;
                const valorAp = parseInt(args[1]);
                const parametroExtra = args[2];

                // Menu Inicial
                if (!jogo) {
                    const menuCassino = `🎰 *CENTRAL DE APOSTAS YUKON* 🎰\n\n` +
                                      `🚀 */cassino apostar [valor] [mult]*\n` +
                                      `💀 */cassino roleta [valor]*\n` +
                                      `🃏 */cassino 21 [valor] [2 a 21]*\n` +
                                      `🛸 */cassino corrida [valor]*`;
                    return client.sendMessage(chatId, menuCassino, { sendSeen: false });
                }

                // Busca o jogador
                const player = await User.findOne({ userId: senderId, groupId: chatId });

                // Validação de Saldo
                if (!player || isNaN(valorAp) || valorAp <= 0 || player.coins < valorAp) {
                    return client.sendMessage(chatId, "❌ *CASSINO:* Saldo insuficiente ou valor de aposta inválido!", { sendSeen: false });
                }

                switch (jogo) {
                    case 'apostar':
                        const mult = parseInt(parametroExtra) || 2;
                        if (mult < 2 || mult > 10) {
                            return client.sendMessage(chatId, "❌ Multiplicador deve ser entre 2x e 10x.", { sendSeen: false });
                        }
                        
                        const winApostar = Math.floor(Math.random() * 100) <= (Math.floor(100 / mult) - 5);
                        
                        if (winApostar) {
                            const lucro = (valorAp * mult) - valorAp;
                            await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: lucro } });
                            client.sendMessage(chatId, `🎉 *GANHOU!* @${senderId.split('@')[0]} lucrou: ${lucro.toLocaleString()} YC!`, { mentions: [senderId], sendSeen: false });
                        } else {
                            await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: -valorAp } });
                            client.sendMessage(chatId, `💸 *PERDEU!* @${senderId.split('@')[0]} perdeu ${valorAp.toLocaleString()} YC.`, { mentions: [senderId], sendSeen: false });
                        }
                        break;

                    case 'roleta':
                        if (Math.floor(Math.random() * 6) === 0) {
                            const perdaFatal = Math.floor(player.coins * 0.8);
                            await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: -perdaFatal } });
                            client.sendMessage(chatId, `💀 *POW!* @${senderId.split('@')[0]} perdeu 80% do saldo: -${perdaFatal.toLocaleString()} YC.`, { mentions: [senderId], sendSeen: false });
                        } else {
                            const lucroR = Math.floor(valorAp * 0.5);
                            await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: lucroR } });
                            client.sendMessage(chatId, `🔫 *CLACK!* @${senderId.split('@')[0]} sobreviveu e ganhou ${lucroR.toLocaleString()} YC!`, { mentions: [senderId], sendSeen: false });
                        }
                        break;

                    case '21':
                        const alvo = parseInt(parametroExtra);
                        if (isNaN(alvo) || alvo < 2 || alvo > 21) {
                            return client.sendMessage(chatId, "🃏 Escolha um alvo entre 2 e 21!\nEx: *$$cassino 21 100 18*", { sendSeen: false });
                        }
                        
                        const mult21 = (1 + (alvo / 21) * 4).toFixed(1);
                        const seuPonto = (Math.floor(Math.random() * 11) + 1) + (Math.floor(Math.random() * 11) + 1);
                        
                        if (seuPonto === alvo) {
                            const premioMax = Math.floor(valorAp * mult21);
                            await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: premioMax } });
                            client.sendMessage(chatId, `🃏 *NA MOSCA!* Tirou ${seuPonto}. Prêmio: +${premioMax.toLocaleString()} YC!`, { sendSeen: false });
                        } else if (seuPonto < alvo && seuPonto > (alvo - 3)) {
                            const premioPerto = Math.floor(valorAp * 0.5);
                            await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: premioPerto } });
                            client.sendMessage(chatId, `🃏 *QUASE!* Tirou ${seuPonto}. Ganhou: +${premioPerto.toLocaleString()} YC.`, { sendSeen: false });
                        } else {
                            await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: -valorAp } });
                            client.sendMessage(chatId, `🃏 *PERDEU!* Tirou ${seuPonto}. -${valorAp.toLocaleString()} YC.`, { sendSeen: false });
                        }
                        break;

                    case 'corrida':
                        const naves = ["🚀", "🛸", "🛰️", "✈️"];
                        const minhaNave = naves[Math.floor(Math.random() * naves.length)];
                        client.sendMessage(chatId, `🏁 Sua nave ${minhaNave} entrou na pista! Aguarde o resultado...`, { sendSeen: false });
                        
                        setTimeout(async () => {
                            const podio = [...naves].sort(() => Math.random() - 0.5);
                            let textoFinal = `🏁 *RESULTADO DA CORRIDA* 🏁\n🥇 1º: ${podio[0]}\n🥈 2º: ${podio[1]}\n🥉 3º: ${podio[2]}\n━━━━━━━━━━━━━━━\n`;
                            
                            if (minhaNave === podio[0]) {
                                const win = valorAp * 3;
                                await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: win } });
                                textoFinal += `🏆 @${senderId.split('@')[0]} Ganhou: +${win.toLocaleString()} YC!`;
                            } else if (minhaNave === podio[1]) {
                                const win2 = Math.floor(valorAp * 0.5);
                                await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: win2 } });
                                textoFinal += `🥈 @${senderId.split('@')[0]} Ganhou: +${win2.toLocaleString()} YC.`;
                            } else {
                                await User.updateOne({ userId: senderId, groupId: chatId }, { $inc: { coins: -valorAp } });
                                textoFinal += `❌ @${senderId.split('@')[0]} Perdeu: -${valorAp.toLocaleString()} YC.`;
                            }
                            client.sendMessage(chatId, textoFinal, { mentions: [senderId], sendSeen: false });
                        }, 5000);
                        break;

                    default:
                        client.sendMessage(chatId, "❓ Jogo não encontrado no Cassino Yukon.", { sendSeen: false });
                }
            } catch (e) {
                console.error("❌ ERRO NO CASSINO:", e);
                client.sendMessage(msg.from.toString(), "⚠️ Erro no processador de apostas.", { sendSeen: false });
            }
            break;
            
        case '/divorciar':
    try {
        const chatId = msg.from.toString();
        const senderId = senderRaw.toString();

        const userDiv = await User.findOne({ userId: senderId, groupId: chatId });

        if (!userDiv?.marriedWith) {
            return client.sendMessage(chatId, "🤔 Você não possui um registro de união para dissolver.", { sendSeen: false });
        }

        const conjuge = userDiv.marriedWith.toString();

        const msgDivorcio = `💔 *PEDIDO DE DIVÓRCIO* 💔\n` +
                            `━━━━━━━━━━━━━━━━━━\n` +
                            `⚠️ @${senderId.split('@')[0]} solicitou a separação.\n\n` +
                            `Para confirmar, @${conjuge.split('@')[0]} deve *RESPONDER* esta mensagem com:\n` +
                            `*/aceitard*\n` +
                            `━━━━━━━━━━━━━━━━━━`;

        // 🔥 AJUSTE AQUI: Inverti a ordem das mentions!
        // O conjuge fica em [0] para o /aceitard identificar que SÓ ELE pode aceitar.
        await client.sendMessage(chatId, msgDivorcio, { 
            mentions: [String(conjuge), String(senderId)],
            sendSeen: false 
        });

    } catch (e) {
        console.error("❌ ERRO NO DIVORCIO:", e);
        client.sendMessage(msg.from.toString(), "⚠️ Erro nos sensores judiciários.", { sendSeen: false });
    }
    break;

        case '/aceitard':
    try {
        const chatId = msg.from.toString();
        const aceitanteId = senderRaw.toString();

        // 1. Verifica se está respondendo à mensagem do pedido
        if (!msg.hasQuotedMsg) {
            return client.sendMessage(chatId, "❌ Você precisa *RESPONDER* à mensagem do pedido de divórcio!", { sendSeen: false });
        }

        const quotedMsg = await msg.getQuotedMessage();
        
        // 2. Extração Identitária (Quem foi marcado na mensagem do pedido)
        // No comando de pedido de divórcio, supomos que:
        // Mentions[0] = O parceiro que precisa aceitar
        // Mentions[1] = Quem pediu o divórcio
        let parceiroAlvoId = quotedMsg.mentionedIds[0] ? 
            (quotedMsg.mentionedIds[0]._serialized || quotedMsg.mentionedIds[0]).toString() : null;
        
        let solicitanteId = quotedMsg.mentionedIds[1] ? 
            (quotedMsg.mentionedIds[1]._serialized || quotedMsg.mentionedIds[1]).toString() : null;

        // 🛑 TRAVA 1: Só o parceiro marcado pode aceitar
        if (aceitanteId !== parceiroAlvoId) {
            return client.sendMessage(chatId, `✋ @${aceitanteId.split('@')[0]}, você não pode assinar um divórcio que não é seu! Apenas @${parceiroAlvoId?.split('@')[0]} pode aceitar.`, {
                mentions: [aceitanteId, parceiroAlvoId]
            });
        }

        // 3. Validação de Banco: Eles ainda estão casados um com o outro?
        const dadosAceitante = await User.findOne({ userId: aceitanteId, groupId: chatId });
        
        if (!dadosAceitante || dadosAceitante.marriedWith !== solicitanteId) {
            return client.sendMessage(chatId, "🚫 Registro inválido: Você não possui um vínculo matrimonial ativo com essa pessoa no banco de dados da Yukon.", { sendSeen: false });
        }

        // 4. Limpeza Atômica de AMBOS
        await User.updateOne({ userId: aceitanteId, groupId: chatId }, { $set: { marriedWith: null } });
        await User.updateOne({ userId: solicitanteId, groupId: chatId }, { $set: { marriedWith: null } });

        const msgFim = `📜 *DIVÓRCIO CONCLUÍDO* 📜\n` +
                      `━━━━━━━━━━━━━━━━━━\n` +
                      `O contrato de união entre @${aceitanteId.split('@')[0]} e @${solicitanteId.split('@')[0]} foi dissolvido oficialmente.\n\n` +
                      `🛰️ Status: Ambos agora estão livres para novas missões.\n` +
                      `━━━━━━━━━━━━━━━━━━`;

        await client.sendMessage(chatId, msgFim, { 
            mentions: [String(aceitanteId), String(solicitanteId)],
            sendSeen: false 
        });

    } catch (e) {
        console.error("❌ ERRO AO ACEITAR DIVORCIO:", e);
        client.sendMessage(msg.from.toString(), "⚠️ Erro crítico ao processar divórcio. Verifique os logs.", { sendSeen: false });
    }
    break;

      case '/casais':
        case '/listacasal':
            try {
                const chatId = msg.from.toString();

                // 1. Busca usuários casados e ordenamos (opcionalmente) por algum critério
                const casaisDb = await User.find({ 
                    groupId: chatId, 
                    marriedWith: { $ne: null } 
                }).lean();

                if (casaisDb.length === 0) {
                    return client.sendMessage(chatId, "💔 *SISTEMA:* Nenhum registro de união encontrado neste setor.", { sendSeen: false });
                }

                let mCasais = `💍 *ALMANAQUE DE CASAIS - YUKON* 💍\n`;
                mCasais += `_Registro oficial de uniões da estação_\n`;
                mCasais += `━━━━━━━━━━━━━━━━━━━━\n\n`;

                let vis = new Set();
                let mntsCas = [];
                let contador = 0;

                for (const u of casaisDb) {
                    // Limite de 10 casais para manter a scannability e evitar spam
                    if (contador >= 10) break;

                    const userJid = u.userId.toString();
                    const conjugeJid = u.marriedWith.toString();

                    if (!vis.has(userJid)) {
                        mCasais += `${contador + 1}º | 👩‍❤️‍👨 @${userJid.split('@')[0]}\n`;
                        mCasais += `╰┈ ✨ ❤️ ✨ @${conjugeJid.split('@')[0]}\n\n`;
                        
                        // Marca ambos como "vistos" para não repetir o par
                        vis.add(userJid); 
                        vis.add(conjugeJid);
                        
                        mntsCas.push(userJid, conjugeJid);
                        contador++;
                    }
                }

                mCasais += `━━━━━━━━━━━━━━━━━━━━\n❄️ *Total de casais registrados:* ${Math.floor(casaisDb.length / 2)}`;

                // Envio seguro via Client
                await client.sendMessage(chatId, mCasais, { 
                    mentions: mntsCas, 
                    sendSeen: false 
                });

            } catch (e) {
                console.error("❌ ERRO NO LISTA CASAIS:", e);
                const safeId = msg.from.toString();
                client.sendMessage(safeId, "⚠️ Erro ao acessar os arquivos do cartório.", { sendSeen: false });
            }
            break;
            
         case '/banblack':
            // 1. Checagens de Segurança
            if (!isAdmin) return; 
            const chatId = msg.from.toString();
            
            if (!iAmAdmin) {
                return client.sendMessage(chatId, "❌ *SISTEMA:* Eu preciso ser Administrador para gerenciar a Blacklist.", { sendSeen: false });
            }

            try {
                let targetBan;

                // Identifica o alvo (Resposta ou Menção)
                if (msg.hasQuotedMsg) {
                    const quoted = await msg.getQuotedMessage();
                    targetBan = (quoted.author || quoted.from).toString();
                } else if (msg.mentionedIds && msg.mentionedIds.length > 0) {
                    targetBan = (msg.mentionedIds[0]._serialized || msg.mentionedIds[0]).toString();
                }

                if (!targetBan) {
                    return client.sendMessage(chatId, "❗ Marque ou responda quem deseja banir permanentemente.", { sendSeen: false });
                }

                // Limpeza absoluta do ID para evitar erro 't: t'
                const targetStr = String(targetBan).trim();

                // 2. Registro no Banco de Dados (Blacklist Global ou do Grupo)
                await User.findOneAndUpdate(
                    { userId: targetStr, groupId: chatId },
                    { $set: { isBlacklisted: true } },
                    { upsert: true }
                );

                // 3. Execução do Banimento
                // No Node v24/Puppeteer, garantimos que seja um Array de Strings puras
                await chat.removeParticipants([targetStr]);

                // 4. Confirmação Visual
                const msgFeedback = `🚫 *PROTOCOLO DE EXCLUSÃO* 🚫\n\n` +
                                   `O tripulante @${targetStr.split('@')[0]} foi banido e inserido na *Blacklist*.\n\n` +
                                   `⚠️ Acesso permanentemente bloqueado nesta estação.`;

                await client.sendMessage(chatId, msgFeedback, {
                    mentions: [targetStr],
                    sendSeen: false
                });

            } catch (e) {
                console.error("❌ ERRO NO BANBLACK:", e);
                client.sendMessage(chatId, "⚠️ Erro ao processar banimento permanente. Verifique se o usuário ainda está no grupo.", { sendSeen: false });
            }
            break;

        case '/unbanblack':
            if (!isAdmin) return;

            try {
                const chatId = msg.from.toString();
                let targetUnban;

                // 1. Identificação do alvo (Resposta, Menção ou Número digitado)
                if (msg.hasQuotedMsg) {
                    const quoted = await msg.getQuotedMessage();
                    targetUnban = (quoted.author || quoted.from).toString();
                } else if (msg.mentionedIds && msg.mentionedIds.length > 0) {
                    targetUnban = (msg.mentionedIds[0]._serialized || msg.mentionedIds[0]).toString();
                } else if (args.length > 0) {
                    const cleanNum = args[0].replace(/\D/g, '');
                    if (cleanNum.length >= 8) { // Validação mínima de dígitos
                        targetUnban = `${cleanNum}@c.us`;
                    }
                }

                if (!targetUnban) {
                    return client.sendMessage(chatId, "❗ Forneça o alvo: mencione, responda ou digite o número com DDD.", { sendSeen: false });
                }

                const targetStr = String(targetUnban).trim();

                // 2. Atualiza no banco: isBlacklisted vira false
                const update = await User.findOneAndUpdate(
                    { userId: targetStr, groupId: chatId },
                    { $set: { isBlacklisted: false } },
                    { new: true }
                );

                if (update) {
                    const msgSucesso = `✅ *PERDÃO CONCEDIDO* ✅\n\n` +
                                     `O tripulante @${targetStr.split('@')[0]} foi removido da Blacklist e agora pode retornar à Yukon Station.`;

                    await client.sendMessage(chatId, msgSucesso, {
                        mentions: [targetStr],
                        sendSeen: false
                    });
                } else {
                    await client.sendMessage(chatId, "⚠️ Usuário não encontrado no banco de dados ou não possui restrições.", { sendSeen: false });
                }

            } catch (e) {
                console.error("❌ ERRO NO UNBANBLACK:", e);
                const safeId = msg.from.toString();
                client.sendMessage(safeId, "❌ Erro ao processar o perdão judicial.", { sendSeen: false });
            }
            break;

           case '/blacklist':
            if (!isAdmin) return;

            try {
                const chatId = msg.from.toString();

                // 1. Busca otimizada usando .lean() para performance
                const banidos = await User.find({ 
                    groupId: chatId, 
                    isBlacklisted: true 
                }).lean();

                if (banidos.length === 0) {
                    return client.sendMessage(chatId, "✅ A *Blacklist* deste setor está vazia. Nenhum tripulante banido permanentemente.", { sendSeen: false });
                }

                let listaMsg = `🚫 *REGISTRO DE EXCLUSÕES - YUKON* 🚫\n`;
                listaMsg += `_Tripulantes permanentemente bloqueados_\n`;
                listaMsg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
                
                let mentions = [];

                banidos.forEach((u, index) => {
                    if (u.userId) {
                        const jid = u.userId.toString();
                        const numero = jid.split('@')[0];
                        
                        listaMsg += `${index + 1}º | 💀 @${numero}\n`;
                        mentions.push(String(jid)); // Garantimos que seja string pura
                    }
                });

                listaMsg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
                listaMsg += `💡 *Dica:* Use $$unbanblack @usuario para perdoar.`;

                // 2. Envio seguro via Client
                await client.sendMessage(chatId, listaMsg, { 
                    mentions, 
                    sendSeen: false 
                });

            } catch (err) {
                console.error("❌ ERRO AO LISTAR BLACKLIST:", err);
                const safeId = msg.from.toString();
                client.sendMessage(safeId, "⚠️ Erro ao carregar os arquivos de exclusão.", { sendSeen: false });
            }
            break;

        case '/resumir':
    if (!msg.from.endsWith('@g.us')) return;

    try {
        await msg.react('📑');

        const chatIdResumo = msg.from.toString(); // ✅ FIX

        const msgsGravadas = await GroupMessage.find({ groupId: chatIdResumo })
            .sort({ timestamp: -1 })
            .limit(50)
            .lean();

        if (!msgsGravadas || msgsGravadas.length < 5) {
            await msg.react('⚠️');
            await client.sendMessage(
                chatIdResumo,
                "🛰️ *SISTEMA:* Memória insuficiente para gerar um resumo.",
                { sendSeen: false }
            );
            return;
        }

        const historico = msgsGravadas
            .reverse()
            .map(m => `${m.senderName}: ${m.body}`)
            .join('\n');

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "Você é a YukonBot. Resuma de forma engraçada e organizada."
                },
                {
                    role: "user",
                    content: `Resuma as mensagens abaixo:\n\n${historico}`
                }
            ],
            model: "llama-3.3-70b-versatile",
        });

        let respostaIA = completion.choices?.[0]?.message?.content;

        if (!respostaIA || typeof respostaIA !== 'string') {
            respostaIA = "❄️ Erro ao interpretar os dados da missão.";
        }

        // 🔒 Proteção contra mensagem gigante
        if (respostaIA.length > 3500) {
            respostaIA = respostaIA.slice(0, 3500) + "\n\n⚠️ Resumo encurtado.";
        }

        const relatorioFinal =
            `🛸 *RELATÓRIO DE MISSÃO*\n\n${respostaIA}\n\n❄️ *Yukon Intelligence Service*`;

        await client.sendMessage(chatIdResumo, relatorioFinal, {
            sendSeen: false
        });

        await msg.react('✅');

    } catch (err) {
        console.error("❌ ERRO NO RESUMO:", err);
        try { await msg.react('❌'); } catch {}
    }
    break;

        case '/chutar':
case '/tapa':
case '/abraçar':
    try {
        const chatId = msg.from.toString();
        const mencoes = msg.mentionedIds;
        
        // 1. Extração do ID do Alvo
        const alvoRaw = mencoes.length > 0 ? (mencoes[0]._serialized || mencoes[0]) : null;

        if (!alvoRaw) {
            return client.sendMessage(chatId, "👤 *SISTEMA:* Você precisa mencionar um tripulante para realizar essa ação!", { sendSeen: false });
        }
        
        const autorId = String(senderRaw).trim();
        const alvoId = String(alvoRaw).trim();

        if (alvoId === autorId) {
            return client.sendMessage(chatId, "❓ *SISTEMA:* Você não pode realizar essa ação contra si mesmo!", { sendSeen: false });
        }

        // 2. Mapeamento de Ações com Arquivos Locais
        // Verifique se os nomes dos arquivos abaixo batem EXATAMENTE com os do VS Code
        const acoes = {
            '/chutar': { emoji: '👟', frase: 'deu um chute em', arquivo: 'chute.mp4' },
            '/tapa': { emoji: '🖐️', frase: 'deu um tapa em', arquivo: 'tapa.mp4' },
            '/abraçar': { emoji: '🫂', frase: 'deu um abraço apertado em', arquivo: 'mds.mp4' }, // Atenção ao 'ç' no nome do arquivo
        };

        const acaoRealizada = acoes[command]; 
        if (!acaoRealizada) return;

        const nomeAutor = autorId.split('@')[0];
        const nomeAlvo = alvoId.split('@')[0];
        const textoAcao = `${acaoRealizada.emoji} | @${nomeAutor} ${acaoRealizada.frase} @${nomeAlvo}!`;

        // 3. CARREGAMENTO DO GIF LOCAL
        // Supõe-se que os GIFs estão na mesma pasta do index.js
        const caminhoArquivo = path.join(__dirname, acaoRealizada.arquivo);

        if (fs.existsSync(caminhoArquivo)) {
            const media = MessageMedia.fromFilePath(caminhoArquivo);
            
            await client.sendMessage(chatId, media, {
                caption: textoAcao,
                mentions: [String(autorId), String(alvoId)],
                sendVideoAsGif: true // Transforma em GIF no WhatsApp
            });
        } else {
            // Se o arquivo não for encontrado, manda só o texto para não quebrar o comando
            console.error(`❌ Arquivo não encontrado: ${acaoRealizada.arquivo}`);
            await client.sendMessage(chatId, textoAcao, { 
                mentions: [String(autorId), String(alvoId)] 
            });
        }

    } catch (e) {
        console.error("❌ ERRO NA AÇÃO SOCIAL:", e.message);
        const safeId = msg.from.toString();
        client.sendMessage(safeId, "⚠️ Erro nos sensores de imagem.", { sendSeen: false });
    }
    break;

           case '/beijar':
    try {
        const chatId = msg.from.toString();
        const mencoes = msg.mentionedIds;
        
        // 1. Identificação do Alvo
        const alvoRaw = mencoes.length > 0 ? (mencoes[0]._serialized || mencoes[0]) : null;

        if (!alvoRaw) {
            return client.sendMessage(chatId, "👤 *SISTEMA:* Você precisa mencionar alguém para beijar!", { sendSeen: false });
        }
        
        const autorId = String(senderRaw).trim();
        const alvoId = String(alvoRaw).trim();

        if (alvoId === autorId) {
            return client.sendMessage(chatId, "❓ *SISTEMA:* Beijar a si mesmo? A Yukon acha que você precisa de companhia...", { sendSeen: false });
        }

        // 2. Busca de dados (Usando lean para performance)
        const userAutor = await User.findOne({ userId: autorId, groupId: chatId }).lean();
        const userAlvo = await User.findOne({ userId: alvoId, groupId: chatId }).lean();

        const conjugeAutor = userAutor?.marriedWith || null; 
        const conjugeAlvo = userAlvo?.marriedWith || null;

        // 3. REGRA: Traição (Autor casado beijando outro)
        if (conjugeAutor && String(conjugeAutor) !== alvoId) {
            const msgTraicao = `🚫 *TRAIÇÃO DETECTADA!* 🚫\n\nA Yukon não apoia traição, @${autorId.split('@')[0]}. Você é casado(a) com @${String(conjugeAutor).split('@')[0]}!`;
            return client.sendMessage(chatId, msgTraicao, {
                mentions: [String(autorId), String(conjugeAutor)],
                sendSeen: false
            });
        }

        // 4. REGRA: Respeito (Alvo casado)
        if (!conjugeAutor && conjugeAlvo) {
            const msgRespeito = `⚠️ Opa! @${alvoId.split('@')[0]} já tem um compromisso sério com @${String(conjugeAlvo).split('@')[0]}. Respeite o casal!`;
            return client.sendMessage(chatId, msgRespeito, {
                mentions: [String(alvoId), String(conjugeAlvo)],
                sendSeen: false
            });
        }

        // 5. SUCESSO (Adicionado o GIF mantendo sua lógica de texto)
        let textoBeijo = `💋 | @${autorId.split('@')[0]} deu um beijão em @${alvoId.split('@')[0]}!`;
        
        if (String(conjugeAutor) === alvoId) {
            textoBeijo = `❤️ | O casal nota 10 @${autorId.split('@')[0]} e @${alvoId.split('@')[0]} se deu um beijão apaixonado!`;
        }

        // Caminho do seu arquivo local
        const caminhoBeijo = path.join(__dirname, 'beijos.mp4');

        if (fs.existsSync(caminhoBeijo)) {
            const media = MessageMedia.fromFilePath(caminhoBeijo);
            await client.sendMessage(chatId, media, {
                caption: textoBeijo,
                mentions: [String(autorId), String(alvoId)],
                sendVideoAsGif: true // Envia o mp4 como GIF
            });
        } else {
            // Caso o arquivo suma, ainda envia o texto para não falhar
            await client.sendMessage(chatId, textoBeijo, { 
                mentions: [String(autorId), String(alvoId)],
                sendSeen: false 
            });
        }

    } catch (e) {
        console.error("❌ ERRO NO BEIJO:", e.message);
        client.sendMessage(msg.from.toString(), "⚠️ O clima esfriou... erro ao processar o beijo.", { sendSeen: false });
    }
    break;

            case '/missão':
            try {
                const chatId = msg.from.toString();
                const autorId = String(senderRaw).trim();

                // 1. Busca ou Cria o usuário (upsert: true garante que ele sempre existirá)
                let userD = await User.findOne({ userId: autorId, groupId: chatId });

                if (!userD) {
                    userD = await User.create({ 
                        userId: autorId, 
                        groupId: chatId, 
                        coins: 0, 
                        lastDaily: null 
                    });
                }

                const agora = new Date();
                const tempoEspera = 24 * 60 * 60 * 1000; // 24 horas em milissegundos

                // 2. Verificação de Cooldown (Tempo de Espera)
                if (userD.lastDaily && (agora - new Date(userD.lastDaily) < tempoEspera)) {
                    const restante = tempoEspera - (agora - new Date(userD.lastDaily));
                    const horas = Math.floor(restante / (1000 * 60 * 60));
                    const minutos = Math.floor((restante % (1000 * 60 * 60)) / (1000 * 60));
                    
                    return client.sendMessage(chatId, `⏳ *SISTEMA:* Você já coletou suas moedas hoje, @${autorId.split('@')[0]}!\n\nRetorne em: *${horas}h ${minutos}min*.`, { 
                        mentions: [autorId],
                        sendSeen: false 
                    });
                }

                // 3. Cálculo de Recompensa
                const ganho = Math.floor(Math.random() * (500 - 200 + 1)) + 200; // 200 a 500 moedas

                // 4. Atualização Atômica (Evita bugs de duplicar moedas se clicar rápido)
                await User.updateOne(
                    { userId: autorId, groupId: chatId },
                    { 
                        $inc: { coins: ganho },
                        $set: { lastDaily: agora } 
                    }
                );

                // 5. Envio de Sucesso Blindado
                const msgSucesso = `💰 *RECOMPENSA DE MISSÃO* 💰\n\n` +
                                 `Excelente trabalho, @${autorId.split('@')[0]}!\n` +
                                 `Você recebeu: *${ganho}* YukonCoins.\n\n` +
                                 `🛰️ Continue mantendo a nave em órbita!`;

                await client.sendMessage(chatId, msgSucesso, { 
                    mentions: [autorId],
                    sendSeen: false 
                });

            } catch (e) {
                console.error("❌ ERRO NA MISSÃO DIÁRIA:", e.message);
                const safeId = msg.from.toString();
                client.sendMessage(safeId, "⚠️ *SISTEMA:* Falha ao processar bônus diário. Tente novamente em instantes.", { sendSeen: false });
            }
            break;
    
case '$$dupla':
    try {
        const usuario = await User.findOne({ id: msg.from });

        if (!usuario || !usuario.casadoCom) {
            // Enviamos apenas texto primeiro para testar
            await client.sendMessage(msg.from, "❌ Você ainda não tem uma dupla.");
            return; 
        }

        const parceiro = await User.findOne({ id: usuario.casadoCom });
        const nomeParceiro = parceiro ? (parceiro.nome || "Tripulante") : "Desconhecido";

        const textoDupla = `👩‍❤️‍👨 *PERFIL DE CASAL — YUKON ROMANCE* 💘\n\n👤 *Tripulante 1:* ${msg.pushname}\n👤 *Tripulante 2:* ${nomeParceiro}\n\n💍 *Status:* Casados oficialmente`;

        const imgDupla = path.join(__dirname, 'foto_casal.jpg');

        if (fs.existsSync(imgDupla)) {
            const media = MessageMedia.fromFilePath(imgDupla);
            
            // O PULO DO GATO:
            // Não usamos msg.reply nem nada relacionado a 'msg'
            // Usamos o ID direto e passamos o sendSeen como false explicitamente aqui
            await client.sendMessage(msg.from, media, { 
                caption: textoDupla,
                sendSeen: false 
            });
        } else {
            await client.sendMessage(msg.from, textoDupla);
        }

    } catch (err) {
        console.error("Erro silenciado no /dupla:", err.message);
    }
    break;

             case '/id':
    try {
        const chatId = msg.from.toString();
        let targetId;

        if (msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();
            targetId = (quotedMsg.author || quotedMsg.from).toString(); // Força string
        } else if (msg.mentionedIds.length > 0) {
            // Pega o ID limpo da menção
            targetId = (msg.mentionedIds[0]._serialized || msg.mentionedIds[0]).toString();
        } else {
            return client.sendMessage(chatId, "❓ *ERRO:* Marque alguém ou responda a uma mensagem.");
        }

        const targetData = await User.findOne({ userId: targetId, groupId: chatId });

        if (!targetData) {
            return client.sendMessage(chatId, `⚠️ Usuário não encontrado no banco.`, { mentions: [targetId] });
        }

        const infoMsg = `🆔 *INFORMAÇÕES DO USUÁRIO*\n\n` +
                        `👤 *User ID:* \`${targetData.userId}\`\n` +
                        `💍 *Casado com:* ${targetData.marriedWith ? `\`${targetData.marriedWith}\`` : "_Ninguém_"}`;

        await client.sendMessage(chatId, infoMsg, { mentions: [targetId] });
    } catch (e) {
        console.error("❌ ERRO NO ID:", e);
    }
    break;

           case '/resetar':
            if (!isAdmin) return;

            const idDoChat = msg.from._serialized || msg.from.toString();

            try {
                let alvoIdLimpo = null;

                // 1. Tenta por Resposta (Quoted)
                if (msg.hasQuotedMsg) {
                    alvoIdLimpo = (msg._data.quotedMsg.author || msg._data.quotedMsg.from).toString();
                } 
                // 2. Tenta por Marcação (@)
                else if (msg.mentionedIds && msg.mentionedIds.length > 0) {
                    alvoIdLimpo = msg.mentionedIds[0].toString();
                }
                // 3. Tenta por Número Digitado (Ex: /resetar 5521999999999 moedas)
                else if (args.length >= 2) {
                    const possivelNumero = args[0].replace(/\D/g, ''); 
                    if (possivelNumero.length >= 10) {
                        alvoIdLimpo = `${possivelNumero}@c.us`;
                    }
                }

                // Se não achou ninguém, mostra o menu de ajuda
                if (!alvoIdLimpo || args.length < 1) {
                    const menuAjuda = [
                        "⚙️ *CENTRAL DE RESET YUKON*",
                        "Use: */resetar @pessoa [opção]*",
                        "Ou: */resetar 5521999999999 [opção]*",
                        "",
                        "🔹 *civil* | *moedas* | *nivel* | *cargos* | *tudo*"
                    ].join("\n");
                    return client.sendMessage(idDoChat, menuAjuda);
                }

                // Pega a escolha (sempre o último argumento)
                const escolhaReset = args[args.length - 1].toLowerCase();

                let queryUpdate = {};
                let textoSucesso = "";

                switch (escolhaReset) {
                    case 'civil':
                        const userCiv = await User.findOne({ userId: alvoIdLimpo, groupId: idDoChat });
                        if (userCiv && userCiv.marriedWith) {
                            await User.updateOne({ userId: userCiv.marriedWith, groupId: idDoChat }, { $set: { marriedWith: null } });
                        }
                        queryUpdate = { marriedWith: null };
                        textoSucesso = "💔 Status Civil resetado (Ambos os lados).";
                        break;
                    case 'moedas':
                        queryUpdate = { coins: 0 };
                        textoSucesso = "💰 Moedas zeradas.";
                        break;
                    case 'nivel':
                        queryUpdate = { xp: 0, level: 1 };
                        textoSucesso = "📉 Nível e XP resetados (Voltou ao 1).";
                        break;
                    case 'cargos':
                        queryUpdate = { roles: ["Tripulante"] };
                        textoSucesso = "📜 Cargos resetados para 'Tripulante'.";
                        break;
                    case 'tudo':
                        const uTudo = await User.findOne({ userId: alvoIdLimpo, groupId: idDoChat });
                        if (uTudo && uTudo.marriedWith) {
                            await User.updateOne({ userId: uTudo.marriedWith, groupId: idDoChat }, { $set: { marriedWith: null } });
                        }
                        queryUpdate = { coins: 0, xp: 0, level: 1, roles: ["Tripulante"], marriedWith: null, advs: 0 };
                        textoSucesso = "🧹 Reset TOTAL aplicado com sucesso.";
                        break;
                    default:
                        return client.sendMessage(idDoChat, "⚠️ Opção inválida! Escolha: civil, moedas, nivel, cargos ou tudo.");
                }

                await User.updateOne({ userId: alvoIdLimpo, groupId: idDoChat }, { $set: queryUpdate }, { upsert: true });
                await client.sendMessage(idDoChat, `✅ *SUCESSO:* ${textoSucesso}`, { mentions: [alvoIdLimpo] });

            } catch (err) {
                console.error("❌ ERRO NO RESET:", err.message);
            }
            break;

        case '/perfilv':
            if (!isAdmin) return;

            const chatIDV = msg.from._serialized || msg.from.toString();

            try {
                let idAlvoV = null;

                // Lógica de busca idêntica ao reset (Resposta, Menção ou Número)
                if (msg.hasQuotedMsg) {
                    idAlvoV = (msg._data.quotedMsg.author || msg._data.quotedMsg.from).toString();
                } else if (msg.mentionedIds && msg.mentionedIds.length > 0) {
                    idAlvoV = msg.mentionedIds[0].toString();
                } else if (args.length >= 1) {
                    const numDig = args[0].replace(/\D/g, '');
                    if (numDig.length >= 10) idAlvoV = `${numDig}@c.us`;
                }

                if (!idAlvoV) return client.sendMessage(chatIDV, "🛰️ *SISTEMA:* Marque alguém, responda ou digite o número.");

                const dadosV = await User.findOne({ userId: idAlvoV, groupId: chatIDV });

                if (!dadosV) return client.sendMessage(chatIDV, "⚠️ *ERRO:* Nenhum registro encontrado para este ID.");

                const statusCivil = dadosV.marriedWith ? `@${dadosV.marriedWith.split('@')[0]}` : "Solteiro(a)";

                let msgV = `📡 *RELATÓRIO DE MONITORAMENTO*\n`;
                msgV += `━━━━━━━━━━━━━━━━━━\n`;
                msgV += `👤 *Tripulante:* @${idAlvoV.split('@')[0]}\n`;
                msgV += `🎖️ *Nível:* ${dadosV.level}\n`;
                msgV += `📊 *XP:* [${dadosV.xp}/100]\n`;
                msgV += `💰 *Moedas:* ${dadosV.coins} YC\n`;
                msgV += `🎭 *Cargos:* ${dadosV.roles.join(', ')}\n`;
                msgV += `💍 *União:* ${statusCivil}\n`;
                msgV += `⚠️ *ADVs:* ${dadosV.advs || 0}\n`;
                msgV += `🔇 *Mutado:* ${dadosV.isMuted ? 'Sim' : 'Não'}\n`;
                msgV += `🚫 *Ban:* ${dadosV.isBlacklisted ? 'Sim' : 'Não'}\n`;
                msgV += `━━━━━━━━━━━━━━━━━━\n`;
                msgV += `❄️ *Yukon Intelligence Service*`;

                await client.sendMessage(chatIDV, msgV, { mentions: [idAlvoV, dadosV.marriedWith].filter(Boolean) });

            } catch (err) {
                console.error("❌ ERRO NO PERFILV:", err.message);
            }
            break;
            
case '%%rmvmoedas':
    if (!isAdmin) return;

    try {
        const chatSetorRmv = msg.from._serialized;
        
        // 1. Identificar Alvo e Valor
        let alvoRmv = null;
        if (msg.hasQuotedMsg) {
            alvoRmv = msg._data.quotedMsg.author || msg._data.quotedMsg.from;
        } else if (msg.mentionedIds && msg.mentionedIds.length > 0) {
            alvoRmv = msg.mentionedIds[0];
        }

        const valorRmv = parseInt(args[args.length - 1]);

        if (!alvoRmv || isNaN(valorRmv)) {
            return client.sendMessage(chatSetorRmv, "⚠️ *ERRO:* Use: `/rmvmoedas @pessoa 100`.");
        }

        const idAlvoRmv = typeof alvoRmv === 'object' ? alvoRmv._serialized : alvoRmv.toString();

        // 2. Atualizar no Banco (Decrementar)
        // Usamos um pequeno truque para as moedas não ficarem negativas se você quiser
        await User.updateOne(
            { userId: idAlvoRmv, groupId: chatSetorRmv },
            { $inc: { coins: -valorRmv } },
            { upsert: true }
        );

        const numRmv = idAlvoRmv.split('@')[0];
        await client.sendMessage(chatSetorRmv, `💸 *RECOLHIMENTO DE FUNDOS*\n\n👤 *Tripulante:* ${numRmv}\n📉 *Valor:* -${valorRmv} YC\n🛰️ _Moedas removidas dos registros._`);

    } catch (err) {
        console.error("❌ ERRO NO RMVMOEDAS:", err.message);
    }
    break;

            case '%%resetarcasais':
    if (!isAdmin) return;

    try {
        const idGrupoPânico = msg.from._serialized;

        // 1. O Pulo do Gato: Atualiza TODOS os usuários do grupo de uma vez
        // Define 'marriedWith' como null para todos os registros desse groupId
        const resultado = await User.updateMany(
            { groupId: idGrupoPânico }, 
            { $set: { marriedWith: null } }
        );

        console.log(`🔥 RESET TOTAL: ${resultado.modifiedCount} usuários foram divorciados.`);

        // 2. Resposta simples para não dar erro de replace
        await client.sendMessage(idGrupoPânico, `⚠️ *RESET TOTAL DE CASAIS* ⚠️\n\nTodos os vínculos civis do grupo foram deletados.\n\n✅ Registros limpos: ${resultado.modifiedCount}\n🛰️ A lista de casais agora está vazia.`);

    } catch (err) {
        console.error("❌ ERRO NO RESET TOTAL:", err.message);
        // Se o sendMessage der erro de replace, pelo menos o log acima confirmará se funcionou
    }
    break;

            case '/addcoins':
    try {
        // 1. Trava de segurança: Só você ou admins podem gerar dinheiro
        if (!isAdmin) return;

        const chatId = msg.from.toString();
        let targetId = null;
        let quantidade = 0;

        // 2. Lógica para identificar o alvo e a quantidade
        if (msg.hasQuotedMsg) {
            // Se responder a uma mensagem: %addcoins 100
            const quoted = await msg.getQuotedMessage();
            targetId = (quoted.author || quoted.from).split('@')[0] + '@lid';
            quantidade = parseInt(args[0]);
        } else if (msg.mentionedIds.length > 0) {
            // Se marcar alguém: %addcoins @usuario 100
            targetId = msg.mentionedIds[0].split('@')[0] + '@lid';
            quantidade = parseInt(args[1]);
        } else if (args.length >= 2) {
            // Se digitar o número: %addcoins 552199999999 100
            const numLimpo = args[0].replace(/\D/g, '');
            targetId = numLimpo + '@lid';
            quantidade = parseInt(args[1]);
        }

        // 3. Validações básicas
        if (!targetId || isNaN(quantidade)) {
            return client.sendMessage(chatId, "⚠️ *ERRO DE FORMATO*\n\nUse:\n- `%addcoins 100` (respondendo alguém)\n- `%addcoins @user 100`\n- `%addcoins 55... 100`", { sendSeen: false });
        }

        // 4. Atualiza no MongoDB
        // O { upsert: true } cria o usuário caso ele ainda não exista no banco
        const userUpdate = await User.findOneAndUpdate(
            { userId: targetId, groupId: chatId },
            { $inc: { coins: quantidade } }, // $inc soma ao valor atual
            { upsert: true, returnDocument: 'after' }
        );

        // 5. Feedback visual
        const mentionId = targetId.split('@')[0] + '@c.us';
        await client.sendMessage(chatId, `💰 *TESOURARIA YUKON*\n\n💵 Foram adicionadas *${quantidade}* coins para @${targetId.split('@')[0]}.\n\nNovo saldo: *${userUpdate.coins}* coins.`, { 
            mentions: [mentionId],
            sendSeen: false 
        });

    } catch (e) {
        console.error("❌ ERRO NO ADDCOINS:", e);
        client.sendMessage(msg.from, "⚠️ Erro ao acessar o cofre da estação.");
    }
    break;

   } // Fim do switch(command) ou switch(jogo)
        } catch (e) {
            console.error(e);
        }
    }); // Fim do client.on('message')