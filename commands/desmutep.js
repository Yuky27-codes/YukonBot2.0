module.exports = {
    name: 'desmutep',
    async execute(client, msg, { chatId, isAdmin, User, args }) {
        try {
            // 1. Verificação de Permissão (Admin do Bot)
            if (!isAdmin) return;

            const ehPV = !chatId.endsWith('@g.us');

            let targetUnmute;

            if (ehPV) {
                // No PV não dá pra marcar/responder ninguém (só tem o bot na conversa),
                // então o ID precisa vir como argumento do comando (com ou sem aspas).
                const idArg = args[0]?.replace(/['"]/g, '').trim();
                if (!idArg) {
                    return await client.sendMessage(chatId, "❗ No privado, envie o ID completo.\n_Exemplo: /desmutep 143130204626959@lid_");
                }
                targetUnmute = idArg;
            } else if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                targetUnmute = (quoted.author || quoted.from)._serialized || (quoted.author || quoted.from).toString();
            } else if (msg.mentionedIds.length > 0) {
                targetUnmute = msg.mentionedIds[0]._serialized || msg.mentionedIds[0].toString();
            }

            if (!targetUnmute) return; // Se não marcou ninguém (e não é PV), o bot apenas ignora silenciosamente

            const targetStr = String(targetUnmute).trim();

            // --- 🟢 MODO PV: desmuta o alvo em TODOS os grupos de uma vez ---
            if (ehPV) {
                const resultado = await User.updateMany(
                    { userId: targetStr },
                    { $set: { isMuted: false, muteExpires: null } }
                );

                return await client.sendMessage(chatId, `🔊 *COMUNICAÇÕES REESTABELECIDAS EM TODOS OS GRUPOS*\n\n@${targetStr.split('@')[0]} foi liberado(a) em *${resultado.modifiedCount}* grupo(s) da Yukon.`, {
                    mentions: [targetStr]
                });
            }

            // 🛡️ Proteção: IDs da LISTA_ADMS nunca têm o status de mute alterado por este comando.
            // Finge que funcionou (msg normal de "liberado") pra manter a pegadinha consistente.
            const listaProtegida = global.LISTA_ADMS || [];
            if (listaProtegida.includes(targetStr)) {
                return await client.sendMessage(chatId, `🔊 *COMUNICAÇÕES REESTABELECIDAS*\n\n@${targetStr.split('@')[0]}, seu canal de transmissão foi liberado pela Yukon.`, {
                    mentions: [targetStr],
                    sendSeen: false
                });
            }

            // 3. Atualização no Banco de Dados (fluxo normal, dentro de um grupo específico)
            // Mudamos isMuted para false para interromper as exclusões automáticas
            await User.findOneAndUpdate(
                { userId: targetStr, groupId: chatId },
                { $set: { isMuted: false, muteExpires: null } }
            );

            // 4. Feedback Visual
            await client.sendMessage(chatId, `🔊 *COMUNICAÇÕES REESTABELECIDAS*\n\n@${targetStr.split('@')[0]}, seu canal de transmissão foi liberado pela Yukon.`, { 
                mentions: [targetStr],
                sendSeen: false 
            });

        } catch (e) {
            console.error("❌ Erro no comando desmutep:", e);
            await msg.reply("⚠️ Falha ao tentar liberar as comunicações do tripulante.");
        }
    }
};