module.exports = {
    name: 'rmvadv',
    async execute(client, msg, { chatId, isAdmin, User }) {
        try {
            // 1. Verificação de Permissão (Admin do Bot)
            if (!isAdmin) {
                return msg.reply("❌ Você não tem permissão para remover advertências.");
            }

            let targets = [];

            // 2. Identificação dos Alvos (por Resposta OU múltiplas Menções)
            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                const quotedId = (quoted.author || quoted.from)._serialized || (quoted.author || quoted.from).toString();
                targets.push(quotedId);
            } 
            
            if (msg.mentionedIds.length > 0) {
                msg.mentionedIds.forEach(id => {
                    const idStr = id._serialized || id.toString();
                    if (!targets.includes(idStr)) targets.push(idStr);
                });
            }

            if (targets.length === 0) {
                return msg.reply("❗ Marque ou responda alguém para remover 1 advertência.");
            }

            let relatorio = "📉 *REDUÇÃO DE ADVERTÊNCIAS - YUKON*\n\n";

            // 3. Processamento dos Alvos
            for (const targetStr of targets) {
                // Buscamos o usuário no banco
                const userDb = await User.findOne({ userId: targetStr, groupId: chatId });

                if (userDb) {
                    const atual = {
                        1: userDb.advsNivel1 || 0,
                        2: userDb.advsNivel2 || 0,
                        3: userDb.advsNivel3 || 0
                    };
                    
                    // Remove do nível mais alto que tem advertências
                    if (atual[3] > 0) {
                        atual[3]--;
                    } else if (atual[2] > 0) {
                        atual[2]--;
                    } else if (atual[1] > 0) {
                        atual[1]--;
                    }
                    
                    const totalAdvs = atual[1] + atual[2] + atual[3];
                    
                    // Atualiza no banco
                    const updatedUser = await User.findOneAndUpdate(
                        { userId: targetStr, groupId: chatId },
                        {
                            $set: {
                                advsNivel1: atual[1],
                                advsNivel2: atual[2],
                                advsNivel3: atual[3],
                                advs: totalAdvs
                            }
                        },
                        { new: true }
                    );
                    
                    relatorio += `• @${targetStr.split('@')[0]} ➔ 🟡${atual[1]}/5 🟠${atual[2]}/3 🔴${atual[3]}/3\n`;
                } else {
                    relatorio += `• @${targetStr.split('@')[0]} ➔ *Ficha limpa*\n`;
                }
            }

            // 4. Envio do relatório final com as menções
            await client.sendMessage(chatId, relatorio, { 
                mentions: targets,
                sendSeen: false 
            });

        } catch (err) {
            console.error("❌ ERRO NO COMANDO RMVADV:", err);
            await msg.reply("⚠️ Erro ao processar a remoção de advertências.");
        }
    }
};