const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs-extra');
const path = require('path');
const mongoose = require('mongoose');
const ffmpeg = require('fluent-ffmpeg');
const { Groq } = require("groq-sdk");
const groq = new Groq("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");
const mongoURI = 'mongodb+srv://admin:teteu2025@cluster0.4wymucf.mongodb.net/?appName=Cluster0'; 

mongoose.connect(mongoURI)
    .then(async () => {
        console.log('✅ Conectado ao MongoDB!');
    })

const userSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    coins: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    roles: { type: Array, default: ["Tripulante"] },
    marriedWith: { type: String, default: null },
    friends: { type: Object, default: {} }
});
const User = mongoose.model('User', userSchema);

const ignorados = [
    '143130204626959@lid',
    '262534774927509@lid'
];

const dbPath = path.join(__dirname, 'database', 'advs.json');
const superUsersPath = path.join(__dirname, 'database', 'superusers.json');

fs.ensureDirSync(path.join(__dirname, 'database'));
if (!fs.existsSync(dbPath)) fs.writeJsonSync(dbPath, {});
if (!fs.existsSync(superUsersPath)) fs.writeJsonSync(superUsersPath, []);

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--no-zygote',
            '--single-process'
        ]
    },
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    }
});

let codigoSalvo = "Nenhuma sala aberta no momento.";

async function ejetarComImagem(chat, target) {
    try {
        const caminhoImagem = path.join(__dirname, 'ejetado.jpg');
        if (fs.existsSync(caminhoImagem)) {
            const media = MessageMedia.fromFilePath(caminhoImagem);
            await chat.sendMessage(media, { 
                caption: `🚫 @${target.split('@')[0]} foi ejetado da nave!`, 
                mentions: [target],
                sendSeen: false 
            });
        } else {
            await chat.sendMessage(`🚫 @${target.split('@')[0]} ejetado!`, { mentions: [target], sendSeen: false });
        }
        await chat.removeParticipants([target]);
    } catch (e) { console.log("Erro ao ejetar:", e); }
}

client.on('qr', qr => {
    console.log('ESCANEIE O QR CODE ABAIXO:');
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    if (!ignorados.includes(client.info.wid._serialized)) {
        ignorados.push(client.info.wid._serialized);
    }
    console.log('✅ YukonBot Online na Square Cloud!');
});

client.on('message_create', async msg => {
    const chat = await msg.getChat();
    const body = msg.body || '';
    const command = body.split(' ')[0].toLowerCase();
    const args = body.split(' ').slice(1);
    const senderRaw = msg.author || msg.from || "";
    const senderNumber = senderRaw.replace(/\D/g, ''); 

    if (chat.isGroup) {
        try {
            await User.findOneAndUpdate(
                { userId: senderRaw },
                { $setOnInsert: { userId: senderRaw } },
                { upsert: true }
            );
        } catch (e) { console.log("Erro ao salvar user no banco"); }
    }

    const groupAdmins = chat.isGroup ? chat.participants
        .filter(p => p.isAdmin || p.isSuperAdmin)
        .map(p => p.id.user.replace(/\D/g, '')) : [];
    
    const savedSuperUsers = fs.readJsonSync(superUsersPath);
    const fixedOwners = ['29790077755587', '5524988268426', '94386822062195', '12060503109759', '143130204626959'];

    const isAdmin = groupAdmins.includes(senderNumber) || 
                    savedSuperUsers.includes(senderNumber) || 
                    fixedOwners.some(id => senderNumber.includes(id));

    const iAmAdmin = chat.isGroup ? groupAdmins.includes(client.info.wid.user.replace(/\D/g, '')) : false;

    if (chat.isGroup && !msg.fromMe) {
        const gain = Math.floor(Math.random() * 10) + 1; 
        await User.findOneAndUpdate(
            { userId: senderRaw },
            { $inc: { coins: gain, xp: 5 } }, 
            { upsert: true }
        );
    }

    if (msg.hasQuotedMsg) {
        const quoted = await msg.getQuotedMessage();
        const userA = senderRaw;
        const userB = quoted.author || quoted.from;
        if (userA !== userB) {
            const update = {};
            update[`friends.${userB.replace(/\./g, '_')}`] = 1; 
            await User.findOneAndUpdate({ userId: userA }, { $inc: update }, { upsert: true });
        }
    }

    switch(command) {
        case '/sala':
            try {
                await chat.sendMessage(`${codigoSalvo}`, { sendSeen: false });
                
                // Força o carregamento dos participantes para não vir vazio
                const participantesSala = chat.participants || await chat.groupMetadata.participants;
                let mencoesGeral = [];
                let textoMencao = "📢 *CHAMANDO TODOS PARA A SALA:* ";

                for (let p of participantesSala) {
                    mencoesGeral.push(p.id._serialized);
                    textoMencao += `@${p.id.user} `;
                }

                await chat.sendMessage(textoMencao, { 
                    mentions: mencoesGeral, 
                    sendSeen: false 
                });
            } catch (e) {
                console.log("Erro no comando /sala:", e);
                msg.reply("❌ Erro ao buscar tripulantes. Tente novamente.", null, { sendSeen: false });
            }
            break;

        case '/addsala':
            const novoCodigo = args[0];
            if (!novoCodigo) return msg.reply("❌ Digite o código! Ex: /addsala ABCDEF", null, { sendSeen: false });
            codigoSalvo = novoCodigo.toUpperCase();
            msg.reply(`📍Sala *${codigoSalvo}* definida com sucesso!`, null, { sendSeen: false });
            break;

        case '/adv':
            if (!isAdmin) return msg.reply('❌ Comando apenas para ADMs.', null, { sendSeen: false });
            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                const target = quoted.author || quoted.from;
                let advs = fs.readJsonSync(dbPath);
                advs[target] = (advs[target] || 0) + 1;
                fs.writeJsonSync(dbPath, advs);
                await chat.sendMessage(`⚠️ @${target.split('@')[0]} recebeu uma advertência! Total: *${advs[target]}/3*`, {
                    mentions: [target],
                    sendSeen: false
                });
                if (advs[target] >= 3 && iAmAdmin) {
                    await ejetarComImagem(chat, target);
                    delete advs[target];
                    fs.writeJsonSync(dbPath, advs);
                }
            } else {
                msg.reply("❗ Responda a uma mensagem para dar ADV.", null, { sendSeen: false });
            }
            break;

        case '/listaadv':
            let data = fs.readJsonSync(dbPath);
            let listaMsg = "📋 *Lista de ADVs:*\n\n";
            let targets = [];
            for (let id in data) {
                if (data[id] > 0 && !ignorados.includes(id)) {
                    listaMsg += `• @${id.split('@')[0]}: ${data[id]}\n`;
                    targets.push(id);
                }
            }
            if (targets.length === 0) return msg.reply("✅ Ninguém com advertências.", null, { sendSeen: false });
            chat.sendMessage(listaMsg, { mentions: targets, sendSeen: false });
            break;

        case '/todos':
            try {
                // Força o carregamento dos participantes
                const todosParticipantes = chat.participants || await chat.groupMetadata.participants;
                let mentais = [];
                let texto = "📢 *ATENÇÃO TRIPULAÇÃO:*\n\n";

                for (let p of todosParticipantes) {
                    mentais.push(p.id._serialized);
                    texto += `@${p.id.user} `;
                }

                await chat.sendMessage(texto, { 
                    mentions: mentais, 
                    sendSeen: false 
                });
            } catch (e) {
                console.log("Erro no comando /todos:", e);
                msg.reply("❌ Não consegui marcar todo mundo. Verifique se sou admin.", null, { sendSeen: false });
            }
            break;
            
        case '/ban':
            if (!isAdmin) return msg.reply('❌ Só admins podem usar isso.', null, { sendSeen: false });
            if (!iAmAdmin) return msg.reply('❌ Preciso ser admin para banir.', null, { sendSeen: false });
            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                const target = quoted.author || quoted.from;
                await ejetarComImagem(chat, target);
            } else {
                msg.reply("❗ Responda a mensagem de quem quer banir.", null, { sendSeen: false });
            }
            break;

        case '/mute':
            if (!isAdmin) return;
            if (!iAmAdmin) return msg.reply('❌ Preciso ser admin.', null, { sendSeen: false });
            await chat.setMessagesAdminsOnly(true);
            msg.reply('🔇 Grupo mutado.', null, { sendSeen: false });
            break;

        case '/desmute':
            if (!isAdmin) return;
            if (!iAmAdmin) return msg.reply('❌ Preciso ser admin.', null, { sendSeen: false });
            await chat.setMessagesAdminsOnly(false);
            msg.reply('🔊 Grupo aberto.', null, { sendSeen: false });
            break;

        case '/rmvadv':
            if (!isAdmin) return;
            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                const target = quoted.author || quoted.from;
                let advs = fs.readJsonSync(dbPath);
                if (advs[target] && advs[target] > 0) {
                    advs[target] -= 1;
                    fs.writeJsonSync(dbPath, advs);
                    msg.reply(`✅ Uma advertência foi removida! Agora: *${advs[target]}/3*`, null, { sendSeen: false });
                } else {
                    msg.reply('💡 Sem advertências.', null, { sendSeen: false });
                }
            }
            break;

        case '/promover':
            if (!isAdmin) return msg.reply('❌ Só admins.', null, { sendSeen: false });
            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                const targetRaw = quoted.author || quoted.from;
                const targetNumber = targetRaw.replace(/\D/g, '');
                try {
                    if (iAmAdmin) await chat.promoteParticipants([targetRaw]);
                    let supers = fs.readJsonSync(superUsersPath);
                    if (!supers.includes(targetNumber)) {
                        supers.push(targetNumber);
                        fs.writeJsonSync(superUsersPath, supers);
                    }
                    msg.reply('⭐ Usuário promovido e adicionado à lista de Super Admins!', null, { sendSeen: false });
                } catch (e) { msg.reply('❌ Erro ao promover.', null, { sendSeen: false }); }
            }
            break;

        case '/rebaixar':
            if (!isAdmin) return msg.reply('❌ Só admins.', null, { sendSeen: false });
            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                const targetRaw = quoted.author || quoted.from;
                const targetNumber = targetRaw.replace(/\D/g, '');
                try {
                    if (iAmAdmin) await chat.demoteParticipants([targetRaw]);
                    let supers = fs.readJsonSync(superUsersPath);
                    const index = supers.indexOf(targetNumber);
                    if (index > -1) {
                        supers.splice(index, 1);
                        fs.writeJsonSync(superUsersPath, supers);
                    }
                    msg.reply('👎 Usuário rebaixado e removido da lista de Super Admins.', null, { sendSeen: false });
                } catch (e) { msg.reply('❌ Erro ao rebaixar.', null, { sendSeen: false }); }
            }
            break;

        case '/painel':
            try {
                const caminhoMenu = path.join(__dirname, 'menu.jpg');
                const menuTexto = `
🚀 YUKONBOT — PAINEL DE CONTROLE 🚀
━━━━━━━━━━━━━━━━━━━━━━

🎮 GERENCIAMENTO DE SALA
🆔 /addsala [CÓDIGO] — Definir código da sala
👁️ /sala — Mostrar sala atual

━━━━━━━━━━━━━━━━━━━━━━

🤖 INTELIGÊNCIA ARTIFICIAL
💬 /ia ou /bot [pergunta] — Converse com a inteligência da YukonBot

━━━━━━━━━━━━━━━━━━━━━━

💰 ECONOMIA & RANKING
👤 /perfil — Ver moedas, nível e status
🏆 /rank — Top 10 usuários com mais moedas
🛒 /yukonshop — Loja de cargos e itens
🛍️ /comprar — Compra o cargo desejado 

━━━━━━━━━━━━━━━━━━━━━━

🎰 APOSTAS & ENTRETENIMENTO
🖼️ /f ou /figu — Cria figurinhas enviando o comando junto com a imagem
🎲 /cassino — Abrir menu de informações
💸 /apostar [valor] [x] — Apostar moedas YukonCoins

━━━━━━━━━━━━━━━━━━━━━━

💘 SOCIAL & RELACIONAMENTOS
🤝 /amizade @user — Nível de amizade (sobe ao conversar)
💖 /ship @user — Chance de romance
💍 /casar @user — Pedido de casamento
✅ /aceitarpedido — Aceitar casamento
📜 /listacasal ou /casais  — Lista de casais do grupo
📃 /listasolteiros ou /solteiros — Lista de solteiros do grupo
💔 /divorciar — Separação do cônjuge
🖊️ /aceitardivorcio — Aceitar o divorcio 

━━━━━━━━━━━━━━━━━━━━━━

🛡️ MODERAÇÃO & ADMINISTRAÇÃO
⬆️ /promover — Dar ADM + Super Poder
⬇️ /rebaixar — Remover ADM + Super Poder
⚠️ /adv (respondendo) — Advertir jogador (3 = ban)
♻️ /rmvadv (respondendo) — Remover advertência
🔇 /mute — Silenciar o grupo
🔊 /desmute — Liberar o grupo
⛔ /ban (respondendo) — Banir jogador (com imagem)
📋 /listaadv — Lista de jogadores advertidos
📣 /todos — Marcar todos os tripulantes

━━━━━━━━━━━━━━━━━━━━━━

📖 UTILIDADES
▶️ iniciar — Inicia a YukonBot
❓ help — Ajuda e esclarecimento de dúvidas
📊 painel — Exibe a lista de comandos da YukonBot

━━━━━━━━━━━━━━━━━━━━━━

⚠️ STATUS: v2.0
🛠️ SUPORTE: Bugs ou sugestões?
💬 Discord: yukydev

━━━━━━━━━━━━━━━━━━━━━━`;
                if (fs.existsSync(caminhoMenu)) {
                    const media = MessageMedia.fromFilePath(caminhoMenu);
                    await chat.sendMessage(media, { caption: menuTexto, sendSeen: false });
                } else {
                    await chat.sendMessage(menuTexto, { sendSeen: false });
                }
            } catch (e) { console.log("Erro ao enviar menu:", e); }
            break;

        case '/help':
            msg.reply(`🛠️ *YUKON BOT — SUPORTE* ❄️
Precisa de ajuda ou tem sugestões de novos comandos?

Entre em contato diretamente com o desenvolvedor da Yukon BOT.
👤 *Desenvolvedor:* yukyDev

💬 *Contato:* Discord
Sua ideia pode fazer parte das próximas atualizações!`, null, { sendSeen: false });
            break;

        case '/iniciar':
            msg.reply(`👽❄️ *YUKON BOT ATIVADO* ❄️👽
Olá, tripulantes!

Eu sou o *Yukon BOT* e agora estou ativo neste grupo 🛰️
Estou aqui para ajudar na organização e na experiência de Among Us.

Use *(/painel)* para ver as opções disponíveis ou *(/help)* para obter ajuda.`, null, { sendSeen: false });
            break;

        case '/f':
        case '/figu':
            if (msg.hasMedia || (msg.hasQuotedMsg && (await msg.getQuotedMessage()).hasMedia)) {
                try {
                    const messageWithMedia = msg.hasMedia ? msg : await msg.getQuotedMessage();
                    const media = await messageWithMedia.downloadMedia();
                    if (media) {
                        await chat.sendMessage(media, {
                            sendMediaAsSticker: true,
                            stickerName: "YukonBot ❄️",
                            stickerAuthor: "yukyDev",
                            sendSeen: false
                        });
                    }
                } catch (e) { msg.reply("❌ Erro ao processar a figurinha. Tente novamente!", null, { sendSeen: false }); }
            } else {
                msg.reply("❗ Envie ou responda uma imagem com o comando */f ou /figu*", null, { sendSeen: false });
            }
            break;

        case '/perfil':
            const userProfile = await User.findOne({ userId: senderRaw });
            const pushName = msg._data.notifyName || "Tripulante";
            let statusCivil = "❤️ Solteiro(a)";
            let mentaisPerfil = [senderRaw];
            if (userProfile.marriedWith) {
                try {
                    const conjugeContat = await client.getContactById(userProfile.marriedWith);
                    const nomeConjuge = conjugeContat.pushname || conjugeContat.name || userProfile.marriedWith.split('@')[0];
                    statusCivil = `💍 Casado(a) com: *${nomeConjuge}*`;
                    mentaisPerfil.push(userProfile.marriedWith);
                } catch (e) {
                    statusCivil = `💍 Casado(a) com: *${userProfile.marriedWith.split('@')[0]}*`;
                }
            }
            const perfilMsg = `👤 *PERFIL YUKON* ❄️\n\n` +
                              `🛸 *Usuário:* ${pushName}\n` +
                              `💰 *YukonCoins:* ${userProfile.coins || 0}\n` +
                              `🆙 *Nível:* ${userProfile.level || 1}\n` +
                              `📜 *Status:* ${statusCivil}\n` +
                              `🏅 *Cargos:* ${userProfile.roles.length > 0 ? userProfile.roles.join(', ') : 'Nenhum'}`;
            await chat.sendMessage(perfilMsg, { mentions: mentaisPerfil, sendSeen: false });
            break;

        case '/yukonshop':
            const shopMsg = `🛒 *YUKON SHOP* ❄️\n` +
                            `Compre cargos estéticos para seu perfil!\n\n` +
                            `1️⃣ *Impostor* - 💰 500\n` +
                            `2️⃣ *Cientista* - 💰 1000\n` +
                            `3️⃣ *Capitão* - 💰 5000\n\n` +
                            `Use */comprar [numero]* para adquirir!`;
            msg.reply(shopMsg, null, { sendSeen: false });
            break;

        case '/comprar':
            const item = args[0];
            const user = await User.findOne({ userId: senderRaw });
            const produtos = {
                '1': { nome: 'Impostor', preco: 500 },
                '2': { nome: 'Cientista', preco: 1000 },
                '3': { nome: 'Capitão', preco: 5000 }
            };
            if (!item || !produtos[item]) {
                return msg.reply("❗ Escolha um item válido do shop. Ex: */comprar 1*", null, { sendSeen: false });
            }
            const escolha = produtos[item];
            if (user.roles.includes(escolha.nome)) {
                return msg.reply("🏅 Você já possui este cargo!", null, { sendSeen: false });
            }
            if (user.coins >= escolha.preco) {
                await User.findOneAndUpdate(
                    { userId: senderRaw },
                    { $inc: { coins: -escolha.preco }, $push: { roles: escolha.nome } }
                );
                msg.reply(`✅ Compra realizada! Você agora é um **${escolha.nome}**.\n💰 Saldo restante: ${user.coins - escolha.preco}`, null, { sendSeen: false });
            } else {
                msg.reply(`❌ Saldo insuficiente! Você precisa de mais ${escolha.preco - user.coins} YukonCoins.`, null, { sendSeen: false });
            }
            break;

        case '/rank':
            try {
                const topUsers = await User.find({ userId: { $nin: ignorados } }).sort({ coins: -1 }).limit(10);
                if (topUsers.length === 0) return msg.reply("✅ Ninguém no rank ainda.", null, { sendSeen: false });
                let rankMsg = `🏆 *TOP 10 - YUKONCOINS* 🏆\n\n`;
                let mentaisRank = [];
                for (let i = 0; i < topUsers.length; i++) {
                    const userDb = topUsers[i];
                    let nomeExibicao;
                    try {
                        const contato = await client.getContactById(userDb.userId);
                        nomeExibicao = contato.pushname || contato.name || userDb.userId.split('@')[0];
                    } catch (err) { nomeExibicao = userDb.userId.split('@')[0]; }
                    rankMsg += `${i + 1}º - *${nomeExibicao}*\n💰 YukonCoins: ${userDb.coins}\n\n`;
                    mentaisRank.push(userDb.userId);
                }
                await chat.sendMessage(rankMsg, { mentions: mentaisRank, sendSeen: false });
            } catch (e) { msg.reply("❌ Erro ao carregar o rank.", null, { sendSeen: false }); }
            break;

        case '/ia':
        case '/bot':
            if (args.length === 0) return msg.reply("🤖 Digite algo! EX: /bot ou /ia quem é você?", null, { sendSeen: false });
            try {
                await chat.sendStateTyping();
                const completion = await groq.chat.completions.create({
                    messages: [
                        { role: "system", content: "Você é a YukonBot, assistente amigável que tem 1 ano de idade, seu desenvolvedor é o YukyDev e tudo que alguém perguntar a você, você vai responter de forma engraçada, mas com a informação correta." },
                        { role: "user", content: args.join(' ') }
                    ],
                    model: "llama-3.3-70b-versatile", 
                });
                const respostaIA = completion.choices[0]?.message?.content;
                if (respostaIA) {
                    msg.reply(`🤖 *Yukon IA:* \n\n${respostaIA}`, null, { sendSeen: false });
                }
            } catch (e) { 
                console.log(">>>> ERRO REAL DA IA:", e.message); 
                msg.reply("⚠️ Minha inteligência ainda está em manutenção!", null, { sendSeen: false }); 
            }
            break;

        case '/amizade':
            if (!msg.mentionedIds[0]) return msg.reply("❗ Marque alguém para ver a amizade!", null, { sendSeen: false });
            const targetAmigo = msg.mentionedIds[0]._serialized || msg.mentionedIds[0];
            const dataUser = await User.findOne({ userId: senderRaw });
            const chaveAmigo = targetAmigo.toString().replace(/\./g, '_');
            const porcentagem = (dataUser.friends && dataUser.friends[chaveAmigo]) ? dataUser.friends[chaveAmigo] : 0;
            await chat.sendMessage(`👥 *NÍVEL DE AMIZADE* 👥\n\n@${senderRaw.split('@')[0]} + @${targetAmigo.split('@')[0]}\n📊 Amizade: *${Math.min(porcentagem, 100)}%*\n\n_Conversem mais para subir este nível!_`, { 
                mentions: [senderRaw, targetAmigo],
                sendSeen: false 
            });
            break;

        case '/ship':
            if (!msg.mentionedIds[0]) return msg.reply("❗ Marque alguém para shippar!", null, { sendSeen: false });
            const loveTarget = msg.mentionedIds[0]._serialized || msg.mentionedIds[0];
            const loveChance = Math.floor(Math.random() * 101);
            let loveMsg = loveChance > 70 ? "🔥 QUE CASAL!" : loveChance > 40 ? "👀 Tem chance..." : "❄️ Amizade gelada.";
            await chat.sendMessage(`💘 *YUKON SHIP* 💘\n\n@${senderRaw.split('@')[0]} ❤️ @${loveTarget.split('@')[0]}\n✨ Chance: *${loveChance}%*\n\n${loveMsg}`, { 
                mentions: [senderRaw, loveTarget],
                sendSeen: false 
            });
            break;

        case '/casar':
            if (!msg.mentionedIds[0]) return msg.reply("❗ Marque quem você quer pedir em casamento!", null, { sendSeen: false });
            const pretendente = msg.mentionedIds[0]._serialized || msg.mentionedIds[0];
            if (pretendente === senderRaw) return msg.reply("😂 Você não pode casar com você mesmo!", null, { sendSeen: false });
            const autor = await User.findOne({ userId: senderRaw });
            const alvo = await User.findOne({ userId: pretendente });
            if (autor && autor.marriedWith) return msg.reply("Tripulante, você já está casado 💍.Tentativa de novo pedido detectada… isso tá com cara de SUS 👀", null, { sendSeen: false });
            if (alvo && alvo.marriedWith) return msg.reply("👀 Suspeito detectado… Tentativa de casamento com tripulante já casado.", null, { sendSeen: false });
            await chat.sendMessage(`💍 @${senderRaw.split('@')[0]} pediu @${pretendente.split('@')[0]} em casamento!\n\nPara aceitar, a pessoa deve responder esta mensagem com */aceitarpedido*`, { 
                mentions: [senderRaw, pretendente],
                sendSeen: false 
            });
            break;

        case '/aceitarpedido':
            if (!msg.hasQuotedMsg) return msg.reply("❗ Responda ao pedido de casamento!", null, { sendSeen: false });
            const quotedMsg = await msg.getQuotedMessage();
            const quemPediu = (quotedMsg.author || quotedMsg.from).toString();
            if (quemPediu === senderRaw) return msg.reply("🤔 Você não pode aceitar seu próprio pedido.", null, { sendSeen: false });
            await User.findOneAndUpdate({ userId: senderRaw }, { marriedWith: quemPediu }, { upsert: true });
            await User.findOneAndUpdate({ userId: quemPediu }, { marriedWith: senderRaw }, { upsert: true });
            await chat.sendMessage(`🎊 *PARABÉNS AOS NOIVOS!* 🎊\n\n@${senderRaw.split('@')[0]} e @${quemPediu.split('@')[0]} agora estão oficialmente casados! 💍✨`, { 
                mentions: [senderRaw, quemPediu],
                sendSeen: false 
            });
            break;

        case '/cassino':
            msg.reply(`🎰 *YUKON CASSINO* 🎰\n\nEscolha seu multiplicador e boa sorte!\n\n*Uso:* apostar [valor] [multiplicador]\n*Ex:* /apostar 100 2\n\n⚠️ Quanto maior o multiplicador (2x até 10x), menor a chance de ganhar!`, null, { sendSeen: false });
            break;

        case '/apostar':
            const valorAposta = parseInt(args[0]);
            const mult = parseInt(args[1]) || 2;
            const player = await User.findOne({ userId: senderRaw });
            if (!valorAposta || valorAposta <= 0 || !player || player.coins < valorAposta) return msg.reply("❌ Saldo insuficiente ou valor inválido!", null, { sendSeen: false });
            if (mult < 2 || mult > 10) return msg.reply("❌ Escolha um multiplicador entre 2 e 10.", null, { sendSeen: false });
            const chanceDeGanhar = Math.floor(100 / mult) - 5;
            const sorteio = Math.floor(Math.random() * 100);
            if (sorteio <= chanceDeGanhar) {
                const ganho = valorAposta * mult;
                await User.findOneAndUpdate({ userId: senderRaw }, { $inc: { coins: (ganho - valorAposta) } });
                msg.reply(`🎉 *VOCÊ GANHOU!* 🎉\nSorteio: ${sorteio}% (Precisava de menos de ${chanceDeGanhar}%)\n💰 Ganhou: *${ganho} YukonCoins*!`, null, { sendSeen: false });
            } else {
                await User.findOneAndUpdate({ userId: senderRaw }, { $inc: { coins: -valorAposta } });
                msg.reply(`💸 *PERDEU!* 💸\nSorteio: ${sorteio}%\nO multiplicador ${mult}x era difícil! Você perdeu ${valorAposta} moedas.`, null, { sendSeen: false });
            } break;

        case '/divorciar':
            const userDivorcio = await User.findOne({ userId: senderRaw });
            if (!userDivorcio || !userDivorcio.marriedWith) return msg.reply("🤔 Você nem casado é!", null, { sendSeen: false });
            await chat.sendMessage(`💔 @${senderRaw.split('@')[0]} pediu o divórcio de @${userDivorcio.marriedWith.split('@')[0]}!\n\nResponda com */aceitardivorcio*`, { mentions: [senderRaw, userDivorcio.marriedWith], sendSeen: false });
            break;

        case '/aceitardivorcio':
            if (!msg.hasQuotedMsg) return msg.reply("❗ Responda ao pedido!", null, { sendSeen: false });
            const quotedDiv = await msg.getQuotedMessage();
            const quemPediuDiv = (quotedDiv.author || quotedDiv.from).toString();
            const userAcc = await User.findOne({ userId: senderRaw });
            if (!userAcc || userAcc.marriedWith !== quemPediuDiv) return msg.reply("🚫 Não é seu cônjuge!", null, { sendSeen: false });
            await User.findOneAndUpdate({ userId: senderRaw }, { marriedWith: null });
            await User.findOneAndUpdate({ userId: quemPediuDiv }, { marriedWith: null });
            await chat.sendMessage(`📜 *DIVÓRCIO CONCLUÍDO* 📜\n\n@${senderRaw.split('@')[0]} e @${quemPediuDiv.split('@')[0]} solteiros.`, { mentions: [senderRaw, quemPediuDiv], sendSeen: false });
            break;

        case '/casais':
        case '/listacasal':
            try {
                const casaisDb = await User.find({ marriedWith: { $ne: null } });
                if (casaisDb.length === 0) return msg.reply("💔 Nenhum casal formado ainda.", null, { sendSeen: false });
                let msgCasais = `💍 *ESTADO CIVIL DO GRUPO* 💍\n\n`;
                let processados = new Set();
                let mentaisCasais = [];
                let encontrouCasal = false;
                for (const user of casaisDb) {
                    if (processados.has(user.userId) || ignorados.includes(user.userId) || ignorados.includes(user.marriedWith)) continue;
                    processados.add(user.marriedWith);
                    processados.add(user.userId);
                    msgCasais += `👩‍❤️‍👨 @${user.userId.split('@')[0]} & @${user.marriedWith.split('@')[0]}\n`;
                    mentaisCasais.push(user.userId, user.marriedWith);
                    encontrouCasal = true;
                }
                if (!encontrouCasal) return msg.reply("💔 Nenhum casal visível no momento.", null, { sendSeen: false });
                await chat.sendMessage(msgCasais, { mentions: mentaisCasais, sendSeen: false });
            } catch (e) { msg.reply("❌ Erro ao buscar a lista de casais.", null, { sendSeen: false }); }
            break;

        case '/solteiros':
        case '/listasolteiros':
            try {
                const solteirosDb = await User.find({ marriedWith: null, userId: { $nin: ignorados } });
                if (solteirosDb.length === 0) return msg.reply("❄️ Nenhum solteiro visível.", null, { sendSeen: false });
                let msgSolteiros = `🧊 *LISTA DE SOLTEIROS YUKON* 🧊\n\n`;
                let mentaisSolteiros = [];
                for (const user of solteirosDb.slice(0, 20)) {
                    msgSolteiros += `👤 @${user.userId.split('@')[0]}\n`;
                    mentaisSolteiros.push(user.userId);
                }
                await chat.sendMessage(msgSolteiros, { mentions: mentaisSolteiros, sendSeen: false });
            } catch (e) { msg.reply("❌ Erro ao buscar solteiros.", null, { sendSeen: false }); }
            break;
    }
});

process.on('uncaughtException', (err) => {
    console.error('ERRO EVITADO:', err.message);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('REJEIÇÃO EVITADA:', reason);
});

client.initialize();