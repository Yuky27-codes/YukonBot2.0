module.exports = {
    name: 'personalidade',
    async execute(client, msg, { args, chatId }) {
        // Garante que o comando seja usado apenas no PV
        if (chatId.endsWith('@g.us')) {
            return msg.reply("❌ Por segurança e organização, configure a personalidade do grupo apenas no meu *Privado*.");
        }

        const idGrupo = args[0];
        const opcaoEscolha = parseInt(args[1]);

        // Lista de personalidades disponíveis (da Lite até a Liberal/Caótica)
        const personalidades = {
            1: { nome: "🤖 Neutra / Lite (Assistente Padrão)", prompt: "Você é a Yukon, uma assistente virtual prestativa, educada e simpática. Responde de forma direta, útil e sem exageros." },
            2: { nome: "🚀 Espacial Amigável (Equilibrada)", prompt: "Você é a Yukon, uma inteligência artificial espacial, amigável e descolada. Responde de forma natural, curta, informal e usando emojis espaciais (🚀, 🛰️)." },
            3: { nome: "🔥 Zoera / Caótica (Gamer e Irônica)", prompt: "Você é a Yukon, uma bot gamer altamente zoeira, irônica e cheia de gírias de internet. Você adora uma resenha, provoca os membros com leveza e usa muita gíria de chat." },
            4: { nome: "👑 Sombria / Mandona (Estilo Chefe)", prompt: "Você é a Yukon, uma IA com complexo de superioridade e estilo comandante implacável. Você é sarcástica, exige respeito e trata todo mundo como recruta." },
            5: { nome: "🍸 Liberal / Sem Filtro (Resenha Pesada)", prompt: "Você é a Yukon, uma IA totalmente sem filtro, zoeira máxima, fala o que pensa sem papas na língua, entra em qualquer pilha de resenha do grupo e não tem limites para brincadeiras." }
        };

        // Se o usuário não passou o ID do grupo ou passou inválido
        if (!idGrupo || !idGrupo.includes('@g.us')) {
            return msg.reply(`⚠️ *COMO USAR:*
Use: \`/personalidade [ID_DO_GRUPO] [número]\`

Exemplo: \`/personalidade 12036304@g.us 3\`

📜 *OPÇÕES DE PERSONALIDADE DISPONÍVEIS:*
1️⃣ ${personalidades[1].nome}
2️⃣ ${personalidades[2].nome}
3️⃣ ${personalidades[3].nome}
4️⃣ ${personalidades[4].nome}
5️⃣ ${personalidades[5].nome}`);
        }

        // Se passou o ID mas não escolheu o número, mostra os detalhes
        if (!opcaoEscolha || !personalidades[opcaoEscolha]) {
            let textoOpcoes = `📜 *ESCOLHA A PERSONALIDADE PARA O GRUPO*\n` + `📍 Grupo: \`${idGrupo}\`\n\n`;
            for (const [key, val] of Object.entries(personalidades)) {
                textoOpcoes += `${key}️⃣ *${val.nome}*\n`;
            }
            textoOpcoes += `\n*Como aplicar:* Digite \`/personalidade ${idGrupo} [1-5]\``;
            return msg.reply(textoOpcoes);
        }

        try {
            const mongoose = require('mongoose');
            // Ajuste para o nome do seu Model que gerencia os dados/configurações do grupo
            const GroupConfig = mongoose.model('AuthorizedGroup'); // ou o model correspondente

            const escolhaObj = personalidades[opcaoEscolha];

            // Salva a personalidade escolhida no banco vinculada ao ID do grupo
            await GroupConfig.updateOne(
                { groupId: idGrupo },
                { $set: { personalidade: escolhaObj.prompt } },
                { upsert: true }
            );

            return msg.reply(`✅ *PERSONALIDADE ATUALIZADA COM SUCESSO!*
━━━━━━━━━━━━━━━━━━━━━
📍 Grupo: \`${idGrupo}\`
🎭 Nova Personalidade: *${escolhaObj.nome}*

A Yukon já absorveu os novos parâmetros de comportamento para esse grupo! 🚀`);

        } catch (err) {
            console.error("❌ Erro ao salvar personalidade:", err);
            return msg.reply("❌ Erro ao salvar a personalidade no banco de dados.");
        }
    }
};