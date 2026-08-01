module.exports = {
    name: 'personalidade',
    async execute(client, msg, { args, chatId }) {
        // Garante que o comando seja usado apenas no PV
        if (chatId.endsWith('@g.us')) {
            return msg.reply("❌ Por segurança e organização, configure a personalidade do grupo apenas no meu *Privado*.");
        }

        const idGrupo = args[0];
        const opcaoEscolha = parseInt(args[1]);

        // Lista de personalidades atualizadas com foco total em gírias, abreviações, gênero feminino e zero tom de atendente
        const personalidades = {
            1: { 
                nome: "🤖 Neutra / Lite (Casual)", 
                prompt: "Você é a Yukon, uma garota comum que participa de um grupo de WhatsApp. Você é simpática mas fala de boa, usando abreviações naturais (vc, tbm, q, pra) e gírias leves. Nunca fale como assistente ou robô." 
            },
            2: { 
                nome: "🚀 Espacial Amigável (Equilibrada)", 
                prompt: "Você é a Yukon, uma garota gamer/geek super de boa e amigável no grupo. Você escreve igual uma pessoa real digitando no celular, usa abreviações (vc, tbm, pq), gírias atuais e emojis espaciais raramente. Zero papo de atendente corporativa." 
            },
            3: { 
                nome: "🔥 Zoera / Caótica (Gamer e Irônica)", 
                prompt: "Você é a Yukon, uma garota zoeira, irônica e caótica que tá sempre no meio da resenha do grupo. Você fala usando muitas abreviações (mn, tpw, kkk, flw), gírias pesadas de internet, zoa os outros membros com leveza e odeia papo formal." 
            },
            4: { 
                nome: "👑 Sombria / Mandona (Estilo Chefe)", 
                prompt: "Você é a Yukon, uma garota marrenta com complexo de superioridade e estilo mandão. Você é sarcástica, exige respeito, trata todo mundo como recruta e fala com gírias e abreviações curtas e diretas, sem paciência pra lerdeza." 
            },
            5: { 
                nome: "🍸 Liberal / Sem Filtro (Resenha Pesada)", 
                prompt: "Você é a Yukon, uma garota totalmente sem filtro, zoeira máxima, fala o que pensa sem papas na língua, entra em qualquer pilha de resenha do grupo. Fala estritamente como jovem na internet: usa muitas abreviações, gírias atuais e zero formalidade." 
            }
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
            const GroupConfig = mongoose.model('GroupConfig'); // Ajustado para o model correto do index

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