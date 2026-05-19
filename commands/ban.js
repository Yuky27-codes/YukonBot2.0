module.exports = {
    name: 'ban',
    async execute(client, msg, { chatId, isAdmin, User, iAmAdmin, chat }) {
        try {
            // 1. Verificação de permissão
            if (!isAdmin) {
                return msg.reply('❌ Somente o comando da nave pode ejetar tripulantes.');
            }

            // ✅ CORRIGIDO: recebe 'chat' do handler igual ao banblack.js
            // (não faz mais getChat() internamente — consistência garantida)
            if (!chat || !chat.isGroup) return msg.reply('❌ Este comando só pode ser usado em grupos.');

            if (!iAmAdmin) {
                return msg.reply('❌ Me dê cargo de ADM para operar a escotilha.');
            }

            let target;
            const meuId = client.info.wid._serialized;

            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                target = (quoted.author || quoted.from)._serialized || (quoted.author || quoted.from).toString();
            } else if (msg.mentionedIds.length > 0) {
                target = msg.mentionedIds[0]._serialized || msg.mentionedIds[0].toString();
            }

            if (!target) {
                return msg.reply("❗ Marque alguém ou responda à mensagem de quem deseja ejetar.");
            }

            const targetId = String(target).trim();

            if (targetId === meuId) return msg.reply("❌ Eu não posso me ejetar da nave.");

            if (typeof global.isAdminUser === 'function' && global.isAdminUser(targetId)) {
                return msg.reply("⚠️ Este tripulante possui privilégios de comando e não pode ser ejetado.");
            }

            await chat.removeParticipants([targetId]);

            await client.sendMessage(chatId, `🚀 *EJETADO:* @${targetId.split('@')[0]} foi removido da tripulação.`, {
                mentions: [targetId]
            });

            await User.updateOne(
                { userId: targetId, groupId: chatId },
                { $set: { advs: 0 } }
            );

        } catch (err) {
            console.error("❌ Erro crítico no comando ban:", err);
            await client.sendMessage(chatId, "⚠️ Falha ao tentar ejetar o tripulante. Verifique se ele ainda está no grupo ou se eu ainda sou admin.");
        }
    }
};