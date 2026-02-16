require('dotenv').config();
const mongoose = require('mongoose');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs-extra');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const Groq = require("groq-sdk");

// --- 1. CONFIGURAÇÃO DO BANCO (UNIFICADA) ---
const linkBanco = "mongodb+srv://admin:QxnFzNxmqxkLqV3@cluster0.4wymucf.mongodb.net/test?retryWrites=true&w=majority";

mongoose.set('bufferCommands', false);

// --- 2. CONEXÃO COM O MONGODB E START ---
mongoose.connect(linkBanco, {
    serverSelectionTimeoutMS: 15000
}).then(() => {
    console.log("☁️ Yukon usando Banco ONLINE (Atlas)");
    console.log("🚀 Iniciando YukonBot...");
    
    // SÓ CHAMA O INITIALIZE AQUI DENTRO!
    client.initialize().catch(err => console.error("❌ Erro ao iniciar Puppeteer:", err.message));

}).catch(err => {
    console.error("❌ ERRO CRÍTICO DE CONEXÃO NO BANCO:", err.message);
});

// --- 3. SCHEMAS ---
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
});
userSchema.index({ userId: 1, groupId: 1 }, { unique: true });
const User = mongoose.model('User', userSchema);

const messageSchema = new mongoose.Schema({
    groupId: { type: String, required: true },
    senderName: { type: String, default: 'Tripulante' },
    body: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});
const GroupMessage = mongoose.model('GroupMessage', messageSchema);

// --- 4. CONFIGURAÇÃO DO CLIENTE WHATSAPP ---
const client = new Client({
    authStrategy: new LocalAuth({ 
        clientId: "yukon_v100", // Mudei o ID para garantir que ele ignore pastas velhas
        dataPath: path.join(__dirname, '.wwebjs_auth') 
    }),
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version-historical/plugin/sample/6.2.0.html'
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

// --- 5. EVENTOS DO CLIENTE ---
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log("📸 Escaneie o QR Code acima!");
});

client.on('ready', () => {
    console.log('✅ YukonBot está online e operante!');
});

// --- 6. FUNÇÕES AUXILIARES ---
const enviarMenuComFoto = async (msg, nomeArquivo, texto) => {
    const caminho = path.join(__dirname, nomeArquivo);
    try {
        if (fs.existsSync(caminho)) {
            const media = MessageMedia.fromFilePath(caminho);
            await client.sendMessage(msg.from, media, { caption: texto, sendSeen: false });
        } else {
            await client.sendMessage(msg.from, texto, { sendSeen: false });
        }
    } catch (e) {
        await client.sendMessage(msg.from, texto, { sendSeen: false });
    }
};

async function ejetarComImagem(chatId, target) {
    try {
        const finalChatId = typeof chatId === 'object' ? (chatId._serialized || chatId.id?._serialized) : chatId;
        const targetId = typeof target === 'object' ? (target._serialized || target.id?._serialized) : target;
        if (typeof finalChatId !== 'string' || !finalChatId.includes('@')) return;

        const caminhoImagem = path.join(__dirname, 'banido.jpg');
        const mensionId = targetId.toString();

        if (fs.existsSync(caminhoImagem)) {
            const media = MessageMedia.fromFilePath(caminhoImagem);
            await client.sendMessage(finalChatId, media, { 
                caption: `🚫 @${mensionId.split('@')[0]} foi ejetado da nave!`, 
                mentions: [mensionId],
                sendSeen: false 
            });
        }
        const chat = await client.getChatById(finalChatId);
        await chat.removeParticipants([mensionId]);
    } catch (e) { console.log("❌ Erro ao ejetar:", e.message); }
}

// 4. Inicialização (DEVE SER A ÚLTIMA LINHA)
client.initialize();

// --- CONFIGURAÇÃO DE ARQUIVOS (ADICIONE ISSO) ---
const superUsersPath = path.join(__dirname, 'database', 'superusers.json');
fs.ensureDirSync(path.join(__dirname, 'database'));
if (!fs.existsSync(superUsersPath)) fs.writeJsonSync(superUsersPath, []);

// --- EXECUÇÃO DE MENSAGENS ---
client.on('message_create', async msg => {
    // 1. REMOVEMOS o !msg.body daqui para que mídias também passem pelo filtro
    if (!msg) return;

    try {
        const groupId = msg.from.toString();
        const isGroup = groupId.endsWith('@g.us');
        const senderRaw = (msg.author || msg.from || "").toString();

        // 2. BUSCA O USUÁRIO NO BANCO LOGO NO INÍCIO
        let userDb = await User.findOne({ userId: senderRaw, groupId: groupId });

        // 3. MONITOR DE MUTE PESSOAL (Agora pega mídias também!)
        if (isGroup && userDb && userDb.isMuted && !msg.fromMe) {
            try {
                // Tentativa direta de deletar sem precisar carregar o chat inteiro (mais rápido)
                await msg.delete(true);
                return; // Bloqueia o processamento de qualquer outra coisa
            } catch (err) {
                console.error("Erro ao deletar mídia/msg de mutado:", err.message);
            }
        }

        // 4. AGORA SIM, SE NÃO TIVER BODY E NÃO FOR MUTADO, PODEMOS PARAR
        if (!msg.body) return;

        // --- ABAIXO SEGUE O RESTO DO SEU CÓDIGO ORIGINAL ---
        let chat;
        let retries = 2; // Reduzi para 2 para ser mais ágil
        while (retries > 0) {
            try {
                chat = await msg.getChat();
                if (chat) break;
            } catch (e) {
                retries--;
                await new Promise(res => setTimeout(res, 300));
            }
        }
        if (!chat) return;

        const body = msg.body || '';
        const command = body.split(' ')[0].toLowerCase();
        const args = body.split(' ').slice(1);
        const senderNumber = senderRaw.replace(/\D/g, ''); 

        // --- GRAVADOR DE MENSAGENS PARA O RESUMO ---
        if (isGroup && !msg.fromMe && !body.startsWith('/') && body.length > 5) {
            await GroupMessage.create({
                groupId: groupId,
                senderName: msg._data.notifyName || 'Tripulante',
                body: body
            }).catch(e => console.log("Erro ao salvar para resumo"));
        }
        // 1. CARREGA OU CRIA USUÁRIO
        if (!userDb && isGroup) {
            userDb = await User.create({ userId: senderRaw, groupId: groupId });
        }
        if (!userDb) return;

        // 2. MONITOR DE MUTE PESSOAL (Auto-Delete)
        if (isGroup && userDb.isMuted) {
            // Pegamos o ID do bot de forma limpa
            const botIdStr = client.info.wid._serialized; 
            
            // Verificamos se o bot é admin no cache do chat atual
            const iAmAdminCheck = chat.participants.some(p => 
                p.id._serialized === botIdStr && (p.isAdmin || p.isSuperAdmin)
            );

            if (iAmAdminCheck) {
                try {
                    await msg.delete(true);
                    return; // Interrompe aqui para não processar comandos nem dar coins
                } catch (err) {
                    console.error("Erro ao deletar mensagem de mutado:", err.message);
                }
            }
        }

        // 3. LOGICA DE ADMINS
        const groupAdmins = isGroup ? chat.participants
            .filter(p => p.isAdmin || p.isSuperAdmin)
            .map(p => p.id.user.replace(/\D/g, '')) : [];
        
        const savedSuperUsers = fs.readJsonSync(superUsersPath);
        const fixedOwners = ['29790077755587', '5524988268426', '94386822062195', '12060503109759', '143130204626959', '266533322399806', '185165066305729', '94386822062195', '31443908599826', '172606179270807', '22385906442270', '150152274780276' ];

        const isSuperAdmin = userDb.roles && userDb.roles.includes("Super Admin");
        const isAdmin = groupAdmins.includes(senderNumber) || 
                        savedSuperUsers.includes(senderNumber) || 
                        fixedOwners.some(id => senderNumber.includes(id)) ||
                        isSuperAdmin;

        const iAmAdmin = isGroup ? groupAdmins.includes(client.info.wid.user.replace(/\D/g, '')) : false;

        // 4. GANHO POR INTERAÇÃO (Moedas e XP base)
      if (isGroup && !msg.fromMe) {
    const gainCoins = Math.floor(Math.random() * 10) + 1;
    const gainXp = 5;

    await User.findOneAndUpdate(
        { userId: senderRaw, groupId: groupId },
        { $inc: { coins: gainCoins, xp: gainXp } },
        { upsert: true }
    );

    // Se o XP passar de 100, sobe de nível e reseta o XP
    await User.updateOne(
        { userId: senderRaw, groupId: groupId, xp: { $gte: 100 } },
        { $inc: { level: 1 }, $set: { xp: 0 } }
    );
}

        // 5. SISTEMA DE AMIZADE
        if (msg.hasQuotedMsg) {
            const quoted = await msg.getQuotedMessage();
            const userBRaw = (quoted.author || quoted.from).toString();
            if (senderRaw !== userBRaw && isGroup) {
                const update = {};
                const chaveAmigo = userBRaw.replace(/\D/g, ''); 
                update[`friends.${chaveAmigo}`] = 1; 
                await User.findOneAndUpdate(
                    { userId: senderRaw, groupId: groupId }, 
                    { $inc: update }
                );
            }
        }
        client.on('group_join', async (notification) => {
    const chatId = notification.chatId;
    const participantId = notification.recipientIds[0].toString(); // Quem acabou de entrar

    try {
        // Busca se o usuário que entrou está na blacklist DESTE grupo
        const user = await User.findOne({ 
            userId: participantId, 
            groupId: chatId, 
            isBlacklisted: true 
        });

        if (user) {
            const chat = await notification.getChat();
            
            // Verifica se o bot é admin para poder expulsar
            const botId = client.info.wid._serialized;
            const iAmAdmin = chat.participants.some(p => 
                p.id._serialized === botId && (p.isAdmin || p.isSuperAdmin)
            );

            if (iAmAdmin) {
                await chat.removeParticipants([participantId]);
                await chat.sendMessage(`⚠️ *Sistema de Segurança:* O usuário @${participantId.split('@')[0]} tentou entrar, mas está na *Blacklist* e foi removido automaticamente.`, {
                    mentions: [participantId]
                });
            }
        }
    } catch (err) {
        console.error("Erro no monitor de blacklist:", err);
    }
});
const cron = require('node-cron');

// Limpa as mensagens de todos os grupos todo dia às 04:00 da manhã
cron.schedule('0 4 * * *', async () => {
    try {
        await GroupMessage.deleteMany({});
        console.log("🧹 Faxina da YukonBot: Memória de mensagens limpa!");
    } catch (e) {
        console.error("Erro na faxina:", e);
    }
});

        // --- COMANDOS ---
        switch(command) {

            case '/sala':
            try {
                const chatId = msg.from.toString();
                // O objeto 'chat' precisa ser obtido de forma segura
                const chat = await msg.getChat();
                
                const codigoDesteGrupo = codigosPorGrupo[groupId] || "Nenhuma sala aberta neste grupo.";
                
                // Enviando o código da sala
                await client.sendMessage(chatId, `${codigoDesteGrupo}`, { sendSeen: false });

                // Lógica de menção geral
                const listaGeral = chat.participants;
                let mencoesGeral = [];
                let textoMencao = "📢 *CHAMANDO TODOS:* ";

                for (let p of listaGeral) {
                    mencoesGeral.push(p.id._serialized);
                    textoMencao += `@${p.id.user} `;
                }

                await client.sendMessage(chatId, textoMencao, { 
                    mentions: mencoesGeral, 
                    sendSeen: false 
                });
            } catch (err) {
                console.error("❌ Erro no comando sala:", err);
            }
            break;

        case '/addsala':
            try {
                const chatId = msg.from.toString();
                const novoCodigo = args[0];

                if (!novoCodigo) {
                    return client.sendMessage(chatId, "❌ Digite o código!", { sendSeen: false });
                }

                // Salva na sua variável original
                codigosPorGrupo[groupId] = novoCodigo.toUpperCase();

                await client.sendMessage(chatId, `✅ Sala *${novoCodigo.toUpperCase()}* definida com sucesso!`, { sendSeen: false });
            } catch (err) {
                console.error("❌ Erro no comando addsala:", err);
            }
            break;

            case '/adv':
            if (!isAdmin) return;
            
            try {
                let targetAdv;
                // Pega o ID de forma ultra segura
                if (msg.hasQuotedMsg) {
                    const quoted = await msg.getQuotedMessage();
                    targetAdv = (quoted.author || quoted.from).toString();
                } else if (msg.mentionedIds.length > 0) {
                    targetAdv = msg.mentionedIds[0].toString();
                }

                if (!targetAdv) return msg.reply("❗ Marque ou responda alguém.", { sendSeen: false });

                // Força o ID a ser apenas a string limpa
                const targetStr = targetAdv.includes('@') ? targetAdv : `${targetAdv}@c.us`;

                const userDb = await User.findOneAndUpdate(
                    { userId: targetStr, groupId: groupId.toString() },
                    { $inc: { advs: 1 } },
                    { upsert: true, new: true }
                );

                if (userDb.advs >= 3) {
                    // Envio de mensagem com menção tratada e correção sendSeen
                    await chat.sendMessage(`🚫 @${targetStr.split('@')[0]} atingiu 3 advertências e será ejetado!`, { 
                        mentions: [targetStr],
                        sendSeen: false 
                    });
                    
                    if (iAmAdmin) {
                        // O erro 't.replace' costuma dar AQUI. Passando targetStr garantimos a correção.
                        await chat.removeParticipants([targetStr]);
                    }

                    await User.findOneAndUpdate(
                        { userId: targetStr, groupId: groupId.toString() },
                        { $set: { advs: 0 } }
                    );
                } else {
                    await chat.sendMessage(`⚠️ @${targetStr.split('@')[0]} recebeu uma advertência! (${userDb.advs}/3)`, { 
                        mentions: [targetStr],
                        sendSeen: false
                    });
                }

            } catch (err) {
                console.error("❌ ERRO NO ADV:", err);
            }
            break;

           case '/listaadv':
    try {
        const advertidos = await User.find({ 
            groupId: groupId, 
            advs: { $gt: 0 }, 
            userId: { $nin: ignorados } 
        });

        if (advertidos.length === 0) {
            return client.sendMessage(msg.from, "✅ Ninguém com advertências neste grupo.", { sendSeen: false });
        }

        let listaMsg = "📋 *LISTA DE ADVs DESTE SETOR:*\n\n";
        let targets = [];

        for (const u of advertidos) {
            // FORÇANDO A CONVERSÃO PARA STRING (O PULO DO GATO)
            const userIdStr = String(u.userId); 
            
            listaMsg += `• @${userIdStr.split('@')[0]}: ${u.advs}/3\n`;
            targets.push(userIdStr);
        }

        // SEMPRE use client.sendMessage com msg.from para evitar erros de contexto
        await client.sendMessage(msg.from, listaMsg, { 
            mentions: targets, 
            sendSeen: false 
        });

    } catch (error) {
        console.error("❌ ERRO NO LISTAADV:", error);
        // Não usamos msg.reply aqui para evitar que o erro se repita na resposta
        client.sendMessage(msg.from, "⚠️ Erro interno ao processar a lista.");
    }
    break;

            case '/todos':
            if (!isAdmin) return msg.reply('❌ Somente cargos de comando (ADMs) podem usar este sinal.', { sendSeen: false });
            
            let mentais = [];
            let texto = "📢 *ATENÇÃO TRIPULAÇÃO:*\n\n";
            
            for (let p of chat.participants) {
                mentais.push(p.id._serialized);
                texto += `@${p.id.user} `;
            }
            
            await chat.sendMessage(texto, { 
                mentions: mentais, 
                sendSeen: false 
            });
            break;

           case '/ban':
            try {
                const chatId = msg.from.toString();
                
                // Verificações de ADM (Usando client.sendMessage para evitar erro de reply)
                if (!isAdmin) return client.sendMessage(chatId, '❌ Somente o comando da nave pode ejetar tripulantes.', { sendSeen: false });
                if (!iAmAdmin) return client.sendMessage(chatId, '❌ Me dê cargo de ADM para operar a escotilha.', { sendSeen: false });

                let target;

                // 1. Lógica para Banir por Menção (@usuario)
                const mentions = await msg.getMentions();
                if (mentions.length > 0) {
                    target = mentions[0].id._serialized;
                } 
                // 2. Lógica para Banir por Resposta (Quoted Message)
                else if (msg.hasQuotedMsg) {
                    const quoted = await msg.getQuotedMessage();
                    target = quoted.author || quoted.from;
                }

                // Validação se encontrou um alvo
                if (!target) {
                    return client.sendMessage(chatId, "❗ Marque alguém ou responda à mensagem de quem deseja ejetar.", { sendSeen: false });
                }

                // Converter target para string pura
                const targetId = target.toString();

                // Verificar se é alguém protegido
                if (ignorados.includes(targetId)) {
                    return client.sendMessage(chatId, "⚠️ Tripulante protegido pela diretriz Yukon.", { sendSeen: false });
                }

                // 3. Execução do Banimento
                // Passamos o chatId como string e o targetId
                await ejetarComImagem(chatId, targetId);

                // Reset de advertências no MongoDB
                await User.findOneAndUpdate(
                    { userId: targetId, groupId: chatId }, 
                    { $set: { advs: 0 } }
                );

            } catch (err) {
                console.error("❌ Erro crítico no comando ban:", err);
            }
            break;

           case '/mute':
            try {
                const chatId = msg.from.toString();
                if (!isAdmin || !iAmAdmin) return;

                // Obtemos o chat de forma segura pelo ID
                const currentChat = await client.getChatById(chatId);
                
                // Fecha o grupo para apenas ADMs
                await currentChat.setMessagesAdminsOnly(true);

                // Resposta usando o client direto
                await client.sendMessage(chatId, '🔇 *COMUNICAÇÕES BLOQUEADAS*\n\n', { sendSeen: false });
            } catch (err) {
                console.error("❌ Erro ao fechar grupo:", err);
            }
            break;

        case '/desmute':
            try {
                const chatId = msg.from.toString();
                if (!isAdmin || !iAmAdmin) return;

                // Obtemos o chat de forma segura pelo ID
                const currentChat = await client.getChatById(chatId);
                
                // Abre o grupo para todos
                await currentChat.setMessagesAdminsOnly(false);

                // Resposta usando o client direto
                await client.sendMessage(chatId, '🔊 *COMUNICAÇÕES LIBERADAS*\n\n', { sendSeen: false });
            } catch (err) {
                console.error("❌ Erro ao abrir grupo:", err);
            }
            break;

           case '/mutep':
            try {
                const chatId = msg.from.toString();
                if (!isAdmin) return;
                
                // Verificação de ADM do Bot
                if (!iAmAdmin) {
                    return client.sendMessage(chatId, "❌ Eu preciso ser adm para operar os sistemas de silenciamento.", { sendSeen: false });
                }

                let targetMute;
                if (msg.hasQuotedMsg) {
                    const quoted = await msg.getQuotedMessage();
                    targetMute = (quoted.author || quoted.from).toString();
                } else if (msg.mentionedIds.length > 0) {
                    targetMute = msg.mentionedIds[0].toString();
                }

                if (!targetMute) {
                    return client.sendMessage(chatId, "❗ Marque ou responda alguém para mutar.", { sendSeen: false });
                }

                const targetStr = targetMute.toString();

                // Atualização no Banco de Dados
                await User.findOneAndUpdate(
                    { userId: targetStr, groupId: chatId },
                    { $set: { isMuted: true } },
                    { upsert: true }
                );

                await client.sendMessage(chatId, `🔇 O tripulante @${targetStr.split('@')[0]} foi mutado e terá suas mensagens apagadas automaticamente.`, { 
                    mentions: [targetStr],
                    sendSeen: false 
                });

            } catch (e) {
                console.error("❌ Erro no mutep:", e);
            }
            break;

        case '/desmutep':
            try {
                const chatId = msg.from.toString();
                if (!isAdmin) return;
                
                let targetUnmute;
                if (msg.hasQuotedMsg) {
                    const quoted = await msg.getQuotedMessage();
                    targetUnmute = (quoted.author || quoted.from).toString();
                } else if (msg.mentionedIds.length > 0) {
                    targetUnmute = msg.mentionedIds[0].toString();
                }

                if (!targetUnmute) return;

                const targetStr = targetUnmute.toString();

                await User.findOneAndUpdate(
                    { userId: targetStr, groupId: chatId },
                    { $set: { isMuted: false } }
                );

                await client.sendMessage(chatId, `🔊 O tripulante @${targetStr.split('@')[0]} foi desmutado e pode voltar a transmitir.`, { 
                    mentions: [targetStr],
                    sendSeen: false 
                });

            } catch (e) {
                console.error("❌ Erro no desmutep:", e);
            }
            break;

            case '/rmvadv':
            if (!isAdmin) return; // Apenas ADMs podem remover
            
            try {
                let targetRmv;
                // Identifica o alvo de forma segura (igual no /adv)
                if (msg.hasQuotedMsg) {
                    const quoted = await msg.getQuotedMessage();
                    targetRmv = (quoted.author || quoted.from).toString();
                } else if (msg.mentionedIds.length > 0) {
                    targetRmv = msg.mentionedIds[0].toString();
                }

                if (!targetRmv) return msg.reply("❗ Marque ou responda alguém para remover uma advertência.", { sendSeen: false });

                const targetStr = targetRmv.toString();

                // Busca o usuário para ver se ele tem advertências
                const userDb = await User.findOne({ userId: targetStr, groupId: groupId.toString() });

                if (!userDb || userDb.advs <= 0) {
                    return msg.reply("✅ Este tripulante não possui advertências para remover.", { sendSeen: false });
                }

                // Remove APENAS 1 advertência (-1 no incremento)
                const updatedUser = await User.findOneAndUpdate(
                    { userId: targetStr, groupId: groupId.toString() },
                    { $inc: { advs: -1 } },
                    { new: true } // Para pegar o valor atualizado
                );

                await chat.sendMessage(`📉 Uma advertência de @${targetStr.split('@')[0]} foi removida!\nTotal atual: *${updatedUser.advs}/3*`, { 
                    mentions: [targetStr],
                    sendSeen: false 
                });

            } catch (err) {
                console.error("❌ ERRO NO RMVADV:", err);
                msg.reply("❌ Erro ao remover advertência.", { sendSeen: false });
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
📃 */solteiros* — Disponíveis
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
            // 1. Captura o ID imediatamente para evitar o erro t.replace
            const iaChatId = msg.from.toString();
            
            if (args.length === 0) {
                return client.sendMessage(iaChatId, "🤖 *YUKON IA:* Digite algo para conversar! \nEx: */ia ou /bot quem é você?*", { sendSeen: false });
            }

            try {
                // 2. Não usamos chat.sendStateTyping() pois ele costuma causar crash no Node v24
                // Se quiser indicar que está lendo, use o console ou uma msg rápida.

                const completion = await groq.chat.completions.create({
                    messages: [
                        { 
                            role: "system", 
                            content: "Você é a YukonBot, a assistente oficial. Desenvolvida pelo seu Dev (YukyDev). Suas respostas devem ser curtas, claras, amigáveis e com um toque divertido." 
                        },
                        { role: "user", content: args.join(' ') }
                    ],
                    model: "llama-3.3-70b-versatile",
                });

                const respostaIA = completion.choices[0]?.message?.content;
                
                if (!respostaIA) {
                    throw new Error("Resposta da IA veio vazia");
                }

                // 3. Resposta segura usando o client.sendMessage
                await client.sendMessage(iaChatId, `🤖 *Yukon IA:* \n\n${respostaIA}`, { sendSeen: false });

            } catch (e) { 
                console.error("❌ ERRO NA IA (GROQ):", e.message);
                
                // Resposta de erro sem msg.reply
                client.sendMessage(iaChatId, "⚠️ Minha inteligência está passando por uma instabilidade galáctica. Tente novamente em alguns segundos!", { sendSeen: false }); 
            }
            break;

        case '/amizade':
            try {
                const chatId = msg.from.toString();
                
                // Verifica se alguém foi mencionado
                if (!msg.mentionedIds || msg.mentionedIds.length === 0) {
                    return client.sendMessage(chatId, "❗ *RADAR:* Marque um tripulante para medir a sincronia de amizade!", { sendSeen: false });
                }

                const targetAmigo = msg.mentionedIds[0].toString();
                const senderId = senderRaw.toString();

                const dataUser = await User.findOne({ userId: senderId, groupId: chatId });
                
                if (!dataUser) {
                    return client.sendMessage(chatId, "❌ Seu registro de tripulante não foi encontrado.", { sendSeen: false });
                }

                // Limpa o ID para buscar no objeto de amigos (apenas números)
                const chaveAmigo = targetAmigo.replace(/\D/g, '');
                const porcentagem = (dataUser.friends && dataUser.friends[chaveAmigo]) ? dataUser.friends[chaveAmigo] : 0;
                const nivelFinal = Math.min(porcentagem, 100);

                // Criando a barra de progresso visual
                const totalBarras = 10;
                const completas = Math.round(nivelFinal / 10);
                const vazias = totalBarras - completas;
                const barraVisual = "🟦".repeat(completas) + "⬜".repeat(vazias);

                // Definindo um status baseado na porcentagem
                let statusAmizade = "Desconhecidos 👤";
                if (nivelFinal > 20) statusAmizade = "Colegas de Cabine 🤝";
                if (nivelFinal > 50) statusAmizade = "Parceiros de Missão 🚀";
                if (nivelFinal > 80) statusAmizade = "Irmãos Estelares 💎";
                if (nivelFinal === 100) statusAmizade = "Sincronia Total 🌌";

                const msgAmizade = `👥 *SINCRONIA DE AMIZADE* 👥\n` +
                                 `━━━━━━━━━━━━━━━━━━\n` +
                                 `👤 @${senderId.split('@')[0]}\n` +
                                 `🤝 @${targetAmigo.split('@')[0]}\n\n` +
                                 `📊 *Nível:* ${nivelFinal}%\n` +
                                 `[${barraVisual}]\n\n` +
                                 `🛰️ *Status:* ${statusAmizade}\n` +
                                 `━━━━━━━━━━━━━━━━━━`;
                
                await client.sendMessage(chatId, msgAmizade, { 
                    mentions: [senderId, targetAmigo],
                    sendSeen: false 
                });

            } catch (e) {
                console.error("❌ ERRO NO COMANDO AMIZADE:", e.message);
                const safeId = msg.from.toString();
                client.sendMessage(safeId, "⚠️ Erro ao acessar o banco de dados de amizades.", { sendSeen: false });
            }
            break;

       case '/ship':
            try {
                const chatId = msg.from.toString();
                
                if (!msg.mentionedIds || msg.mentionedIds.length === 0) {
                    return client.sendMessage(chatId, "❗ *RADAR:* Marque alguém para calcular a compatibilidade estelar!", { sendSeen: false });
                }

                const loveTarget = msg.mentionedIds[0].toString();
                const senderId = senderRaw.toString();

                // Autocuidado é tudo, mas o comando é para casais!
                if (loveTarget === senderId) {
                    return client.sendMessage(chatId, "🚀 *SISTEMA:* Você tem 100% de amor próprio! Isso é essencial para um tripulante.", { sendSeen: false });
                }

                // Lógica da Semente (Seed) - Mantém o resultado fixo por dia
                const hoje = new Date().toDateString(); 
                const seed = senderId + loveTarget + hoje + chatId; 
                let loveChance = 0;
                for (let i = 0; i < seed.length; i++) {
                    loveChance = (loveChance + seed.charCodeAt(i)) % 101;
                }

                // Barra de progresso com corações
                const totalCoracoes = 10;
                const cheios = Math.round(loveChance / 10);
                const vazios = totalCoracoes - cheios;
                const barraAmor = "❤️".repeat(cheios) + "🖤".repeat(vazios);

                // Vereditos baseados na chance
                let veredito = "❄️ *ZERO ABSOLUTO*";
                let comentario = "Melhor ficarem em cabines separadas...";

                if (loveChance > 20) {
                    veredito = "☁️ *PEQUENA ATRAÇÃO*";
                    comentario = "Talvez um café na cantina da nave?";
                }
                if (loveChance > 50) {
                    veredito = "👀 *CLIMA QUENTE*";
                    comentario = "Há uma tensão nos circuitos aqui!";
                }
                if (loveChance > 85) {
                    veredito = "🔥 *CONEXÃO ABSOLUTA*";
                    comentario = "O destino escreveu o nome de vocês nas estrelas!";
                }
                if (loveChance === 100) {
                    veredito = "👑 *ALMAS GÊMEAS*";
                    comentario = "Podem preparar o casamento no setor 7!";
                }

                const textoShip = `💘 *YUKON SHIP* 💘\n` +
                                 `━━━━━━━━━━━━━━━━━━\n` +
                                 `👤 @${senderId.split('@')[0]}\n` +
                                 `❤️ @${loveTarget.split('@')[0]}\n\n` +
                                 `✨ *Chance:* ${loveChance}%\n` +
                                 `[${barraAmor}]\n\n` +
                                 `📡 *Veredito:* ${veredito}\n` +
                                 `💬 ${comentario}\n` +
                                 `━━━━━━━━━━━━━━━━━━`;
                
                await client.sendMessage(chatId, textoShip, { 
                    mentions: [senderId, loveTarget],
                    sendSeen: false 
                });

            } catch (e) {
                console.error("❌ ERRO NO SHIP:", e.message);
                const safeId = msg.from.toString();
                client.sendMessage(safeId, "⚠️ Erro no sensor de batimentos cardíacos.", { sendSeen: false });
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

                const msgPedido = `💍 *PEDIDO DE UNIÃO* 💍\n\n` +
                                 `🚀 @${autor.split('@')[0]} pediu @${pretendente.split('@')[0]} em casamento!\n\n` +
                                 `⚠️ @${pretendente.split('@')[0]}, *RESPONDA* esta mensagem com *$$aceitarpedido* para confirmar!`;
                
                await client.sendMessage(chatId, msgPedido, { 
                    mentions: [autor, pretendente], 
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
                
                // 1. Extração ultra-segura do ID do autor do pedido (quem a Yukon marcou primeiro)
                // Usamos optional chaining e garantimos que seja string
                let autorDoPedidoId = quotedMsg.mentionedIds[0] ? 
                    (quotedMsg.mentionedIds[0]._serialized || quotedMsg.mentionedIds[0]).toString() : 
                    null;

                const aceitanteId = senderRaw.toString();

                if (!autorDoPedidoId) {
                    return client.sendMessage(chatId, "❌ Não identifiquei quem fez o pedido original.", { sendSeen: false });
                }

                // 2. Trava de segurança: IDs limpos para o banco e para as menções
                const autorFinal = autorDoPedidoId.trim();
                const aceitanteFinal = aceitanteId.trim();

                // 3. Atualização no Banco de Dados
                await User.updateOne({ userId: aceitanteFinal, groupId: chatId }, { $set: { marriedWith: autorFinal } });
                await User.updateOne({ userId: autorFinal, groupId: chatId }, { $set: { marriedWith: aceitanteFinal } });

                const msgSucesso = `🎊 *UNIÃO REGISTRADA!* 🎊\n\n` +
                                 `💍 @${autorFinal.split('@')[0]} e @${aceitanteFinal.split('@')[0]}\n\n` +
                                 `Felicidades aos novos parceiros da Yukon Station! 🥂`;

                // 4. O ENVIO CRÍTICO: Garantimos que 'mentions' receba apenas strings puras
                await client.sendMessage(chatId, msgSucesso, { 
                    mentions: [String(autorFinal), String(aceitanteFinal)], 
                    sendSeen: false 
                });

            } catch (err) {
                console.error("❌ ERRO CRÍTICO NO ACEITE:", err);
                // Envio de erro sem menções para evitar novo crash
                client.sendMessage(msg.from.toString(), "⚠️ Erro no sistema de registro. Certifique-se de estar respondendo ao pedido corretamente.", { sendSeen: false });
            }
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
                                   `*$$aceitard*\n` +
                                   `━━━━━━━━━━━━━━━━━━`;

                // Forçamos String() nas mentions para evitar o erro 't: t'
                await client.sendMessage(chatId, msgDivorcio, { 
                    mentions: [String(senderId), String(conjuge)],
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
                
                // 2. Extrai quem pediu o divórcio das menções da mensagem citada
                // Geralmente o primeiro mencionado na mensagem de divórcio é quem pediu
                let quemPediuDiv = quotedMsg.mentionedIds[0] ? 
                    (quotedMsg.mentionedIds[0]._serialized || quotedMsg.mentionedIds[0]).toString() : null;

                if (!quemPediuDiv) {
                    return client.sendMessage(chatId, "❌ Não consegui identificar quem solicitou o divórcio.", { sendSeen: false });
                }

                // 3. Validação: O aceitante realmente é casado com quem pediu?
                const dadosAceitante = await User.findOne({ userId: aceitanteId, groupId: chatId });
                if (dadosAceitante?.marriedWith !== quemPediuDiv) {
                    return client.sendMessage(chatId, "🚫 Você não está casado com essa pessoa.", { sendSeen: false });
                }

                // 4. Limpa o vínculo de AMBOS no banco de dados
                await User.updateOne({ userId: aceitanteId, groupId: chatId }, { $set: { marriedWith: null } });
                await User.updateOne({ userId: quemPediuDiv, groupId: chatId }, { $set: { marriedWith: null } });

                const msgFim = `📜 *DIVÓRCIO CONCLUÍDO* 📜\n` +
                              `━━━━━━━━━━━━━━━━━━\n` +
                              `O contrato de união entre @${aceitanteId.split('@')[0]} e @${quemPediuDiv.split('@')[0]} foi dissolvido.\n\n` +
                              `🛰️ Status: Solteiros.\n` +
                              `━━━━━━━━━━━━━━━━━━`;

                await client.sendMessage(chatId, msgFim, { 
                    mentions: [String(aceitanteId), String(quemPediuDiv)],
                    sendSeen: false 
                });

            } catch (e) {
                console.error("❌ ERRO AO ACEITAR DIVORCIO:", e);
                client.sendMessage(msg.from.toString(), "⚠️ Erro ao processar divórcio.", { sendSeen: false });
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

        case '/solteiros':
            try {
                const chatId = msg.from.toString();

                // 1. Busca otimizada: usuários do grupo que NÃO têm cônjuge
                // Usamos .lean() para carregar os dados mais rápido
                const solteiros = await User.find({ 
                    groupId: chatId, 
                    $or: [
                        { marriedWith: null },
                        { marriedWith: "" },
                        { marriedWith: { $exists: false } } // Garante que pegue quem nem tem o campo
                    ]
                })
                .limit(20)
                .lean();

                if (!solteiros || solteiros.length === 0) {
                    return client.sendMessage(chatId, "😔 *RADAR:* Não há tripulantes solteiros disponíveis neste setor.", { sendSeen: false });
                }

                let lista = `🛸 *LISTA DE SOLTEIROS - YUKON* 🛸\n`;
                lista += `━━━━━━━━━━━━━━━━━━━━\n\n`;
                
                let mentions = [];

                solteiros.forEach((u, index) => {
                    // Verifica se o userId é válido antes de processar
                    if (u.userId) {
                        const jid = u.userId.toString();
                        const numero = jid.split('@')[0];
                        
                        lista += `${index + 1}º | 🛰️ @${numero}\n`;
                        mentions.push(jid);
                    }
                });

                lista += `\n━━━━━━━━━━━━━━━━━━━━\n`;
                lista += `💡 *Dica:* Use $$ship @alguém para ver sua chance com alguém👀!`;

                // 2. ENVIO BLINDADO: Usando client.sendMessage para evitar o erro t.replace
                await client.sendMessage(chatId, lista, { 
                    mentions, 
                    sendSeen: false 
                });

            } catch (err) {
                console.error("❌ ERRO NO SOLTEIROS:", err);
                // Resposta de erro segura
                const safeId = msg.from.toString();
                client.sendMessage(safeId, "⚠️ Erro nos sensores de tripulação solitária.", { sendSeen: false });
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
            if (!isGroup) return; // Silencioso se não for grupo

            try {
                const chatId = msg.from.toString();
                
                // 1. Busca otimizada das mensagens
                const msgsGravadas = await GroupMessage.find({ groupId: chatId })
                    .sort({ timestamp: -1 })
                    .limit(50)
                    .lean();

                if (!msgsGravadas || msgsGravadas.length < 5) {
                    return client.sendMessage(chatId, "🛰️ *SISTEMA:* Memória insuficiente. Preciso de pelo menos 5 transmissões para gerar um relatório.", { sendSeen: false });
                }

                // Indica que o bot está "escrevendo" de forma segura
                // Nota: Em algumas versões do WWebJS, isso pode falhar, então envolvemos em try/catch simples
                try { await chat.sendStateTyping(); } catch (e) {}

                // 2. Prepara o histórico (do mais antigo para o mais novo)
                const historico = msgsGravadas.reverse()
                    .map(m => `${m.senderName || 'Tripulante'}: ${m.body}`)
                    .join('\n');

                // 3. Chamada da IA (Groq)
                const completion = await groq.chat.completions.create({
                    messages: [
                        { 
                            role: "system", 
                            content: "Você é a YukonBot. Receba o log de conversas de um grupo e faça um resumo curto, engraçado e organizado dos assuntos e piadas. Use emojis espaciais." 
                        },
                        { 
                            role: "user", 
                            content: `Resuma estas mensagens:\n\n${historico}` 
                        }
                    ],
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.7, // Adiciona um pouco de criatividade no resumo
                });

                const respostaIA = completion.choices[0]?.message?.content;

                if (!respostaIA) {
                    return client.sendMessage(chatId, "⚠️ *ERRO:* Falha na decodificação dos dados da IA.", { sendSeen: false });
                }

                // 4. ENVIO BLINDADO
                const header = `🛸 *RELATÓRIO DE MISSÃO (RESUMO)* 🛸\n`;
                const footer = `\n\n━━━━━━━━━━━━━━━━━━━━\n❄️ *Yukon Intelligence Service*`;
                
                await client.sendMessage(chatId, header + respostaIA + footer, { sendSeen: false });

            } catch (err) {
                console.error("❌ ERRO NO RESUMO:", err.message);
                const safeId = msg.from.toString();
                client.sendMessage(safeId, "⚠️ *INTERFERÊNCIA:* Não foi possível processar o resumo devido a uma tempestade solar.", { sendSeen: false });
            }
            break;

        case '/chutar':
        case '/tapa':
        case '/abraçar':
            try {
                const chatId = msg.from.toString();
                const mencoes = msg.mentionedIds;
                
                // 1. Extração Ultra-Segura do ID do Alvo
                const alvoRaw = mencoes.length > 0 ? (mencoes[0]._serialized || mencoes[0]) : null;

                if (!alvoRaw) {
                    return client.sendMessage(chatId, "👤 *SISTEMA:* Você precisa mencionar um tripulante para realizar essa ação!", { sendSeen: false });
                }
                
                const autorId = String(senderRaw).trim();
                const alvoId = String(alvoRaw).trim();

                if (alvoId === autorId) {
                    return client.sendMessage(chatId, "❓ *SISTEMA:* Protocolo inválido. Você não pode realizar essa ação contra si mesmo!", { sendSeen: false });
                }

                // 2. Mapeamento de Ações (Ajustado para aceitar o comando com ou sem $$)
                const acoes = {
                    '/chutar': { emoji: '👟', frase: 'deu um chute em' },
                    '/tapa': { emoji: '🖐️', frase: 'deu um tapa em' },
                    '/abraçar': { emoji: '🫂', frase: 'deu um abraço apertado em' },
                };

                // Pega a configuração baseada no comando disparado
                const acaoRealizada = acoes[command]; 
                
                if (!acaoRealizada) return; // Segurança caso o comando mude

                const nomeAutor = autorId.split('@')[0];
                const nomeAlvo = alvoId.split('@')[0];

                const textoAcao = `${acaoRealizada.emoji} | @${nomeAutor} ${acaoRealizada.frase} @${nomeAlvo}!`;

                // 3. ENVIO BLINDADO
                // Forçamos String() em cada item do array de mentions para evitar o crash no Puppeteer
                await client.sendMessage(chatId, textoAcao, { 
                    mentions: [String(autorId), String(alvoId)],
                    sendSeen: false
                });

            } catch (e) {
                console.error("❌ ERRO NA AÇÃO SOCIAL:", e.message);
                const safeId = msg.from.toString();
                client.sendMessage(safeId, "⚠️ Erro nos sensores de interação social.", { sendSeen: false });
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

                // 5. SUCESSO
                let textoBeijo = `💋 | @${autorId.split('@')[0]} deu um beijão em @${alvoId.split('@')[0]}!`;
                
                if (String(conjugeAutor) === alvoId) {
                    textoBeijo = `❤️ | O casal nota 10 @${autorId.split('@')[0]} e @${alvoId.split('@')[0]} se deu um beijão apaixonado!`;
                }

                await client.sendMessage(chatId, textoBeijo, { 
                    mentions: [String(autorId), String(alvoId)],
                    sendSeen: false
                });

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
            
   } // Fim do switch(command) ou switch(jogo)
        } catch (e) {
            console.error(e);
        }
    }); // Fim do client.on('message')