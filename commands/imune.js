module.exports = {
    name: 'imune',
    async execute(client, msg, { chatId, senderRaw, User }) {
        // TRAVA DE SEGURANÇA: Bloqueia durante o Modo Caos
        if (global.modoCaosAtivo && global.modoCaosAtivo[chatId] > Date.now()) {
            return await msg.reply("🚫 *IMPOSSÍVEL!* O Modo Caos está ativo, as defesas estão offline.");
        }

        try {
            const senderId = senderRaw.toString();
            const player = await User.findOne({ userId: senderId, groupId: chatId });

            if (!player) return;

            const novoStatus = !player.isPassive;
            await User.updateOne({ userId: senderId, groupId: chatId }, { $set: { isPassive: novoStatus } });

            if (novoStatus) {
                return await client.sendMessage(chatId, `🛡️ *MODO PASSIVO ATIVADO* @${senderId.split('@')[0]}!\n\nVocê agora está imune a roubos, mas também não poderá assaltar ninguém ou participar de atividades agressivas até desativar o escudo.`, { mentions: [senderId] });
            } else {
                return await client.sendMessage(chatId, `⚠️ *MODO PASSIVO DESATIVADO* @${senderId.split('@')[0]}!\n\nSeu escudo foi desligado. Você já pode roubar e ser roubado novamente. Boa sorte na estação!`, { mentions: [senderId] });
            }

        } catch (e) { console.error(e); }
    }
};