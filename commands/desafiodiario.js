// Sessões de desafio ativo por usuário: { "autorId:chatId": { comando, timer } }
if (!global.desafiosAtivos) global.desafiosAtivos = {};

const DESAFIOS = [
    { texto: "Use o */cassino apostar* para testar a sorte!", comando: "cassino" },
    { texto: "Dê um */abracar* em alguém do grupo!", comando: "abracar" },
    { texto: "Use o */roubar* e tente roubar alguém!", comando: "roubar" },
    { texto: "Use o */missao* para coletar suas moedas diárias!", comando: "missao" },
    { texto: "Faça um */pousar* e explore o universo!", comando: "pousar" },
    { texto: "Dê um */tapa* em alguém do grupo!", comando: "tapa" },
    { texto: "Use o */quiz geral* e teste seus conhecimentos!", comando: "quiz" },
    { texto: "Doe moedas para alguém com */doar*!", comando: "doar" },
    { texto: "Use o */humor* para animar o grupo!", comando: "humor" },
    { texto: "Abra uma */caixasurpresa* e teste a sorte!", comando: "caixasurpresa" },
    { texto: "Use o */ship* com alguém do grupo!", comando: "ship" },
    { texto: "Verifique seu */perfil* na estação!", comando: "perfil" },
    { texto: "Use o */curiosidades* e aprenda algo novo!", comando: "curiosidades" },
    { texto: "Dê um */beijar* em alguém!", comando: "beijar" },
    { texto: "Interaja com seu pet usando */pet carinho*!", comando: "pet" },
    { texto: "Use o */cantadas* para conquistar alguém!", comando: "cantadas" },
    { texto: "Verifique seu */inventario*!", comando: "inventario" },
    { texto: "Use o */frasemotivacional* para inspirar o grupo!", comando: "frasemotivacional" },
    { texto: "Use o */encontro* com dois membros do grupo!", comando: "encontro" },
    { texto: "Dê um */dar_flores* para alguém especial!", comando: "dar_flores" },
];

module.exports = {
    name: 'desafiodiario',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const autorId = String(senderRaw).trim();
            const chave = `${autorId}:${chatId}`;

            // Verifica se já tem desafio ativo
            if (global.desafiosAtivos[chave]) {
                const desafio = global.desafiosAtivos[chave];
                return await client.sendMessage(chatId, `⚠️ Você já tem um desafio ativo!\n\n🎯 *${desafio.texto}*\n\n⏳ Complete em até 5 minutos!`);
            }

            // Verifica cooldown de 24h
            const user = await User.findOne({ userId: autorId, groupId: chatId });
            const agora = new Date();
            const tempoEspera = 24 * 60 * 60 * 1000;

            if (user?.lastDesafio && (agora - new Date(user.lastDesafio) < tempoEspera)) {
                const restante = tempoEspera - (agora - new Date(user.lastDesafio));
                const horas = Math.floor(restante / (1000 * 60 * 60));
                const minutos = Math.floor((restante % (1000 * 60 * 60)) / (1000 * 60));
                return await client.sendMessage(chatId, `⏳ Você já completou seu desafio hoje!\n\nPróximo desafio em: *${horas}h ${minutos}min*`);
            }

            // Sorteia desafio
            const desafio = DESAFIOS[Math.floor(Math.random() * DESAFIOS.length)];

            // Timer de 5 minutos
            const timer = setTimeout(async () => {
                if (global.desafiosAtivos[chave]) {
                    delete global.desafiosAtivos[chave];
                    await client.sendMessage(chatId, `⏰ @${autorId.split('@')[0]}, seu desafio expirou!\nUse */desafiodiario* para tentar novamente amanhã.`, { mentions: [autorId] });
                }
            }, 5 * 60 * 1000);

            global.desafiosAtivos[chave] = { ...desafio, timer, autorId, chatId };

            await client.sendMessage(chatId, `🎯 *DESAFIO DIÁRIO — YUKON*
━━━━━━━━━━━━━━━━━━━━━
@${autorId.split('@')[0]}, seu desafio de hoje é:

📋 *${desafio.texto}*

⏳ Você tem *5 minutos* para completar!
💰 *Recompensa:* 1.000 YC
━━━━━━━━━━━━━━━━━━━━━`, { mentions: [autorId] });

        } catch (e) {
            console.error("❌ Erro no /desafiodiario:", e);
            await client.sendMessage(chatId, "⚠️ Erro ao gerar desafio.");
        }
    }
};