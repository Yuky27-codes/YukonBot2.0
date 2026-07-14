module.exports = {
    name: 'protecao',
    async execute(client, msg, { chatId, senderRaw, User }) {
        // TRAVA DE SEGURANÇA: Bloqueia durante o Modo Caos
        if (global.modoCaosAtivo && global.modoCaosAtivo[chatId] > Date.now()) {
            return await msg.reply("🚫 *IMPOSSÍVEL!* O Modo Caos está ativo, as defesas estão offline.");
        }

        const CUSTO_PROTECAO = 500; // Valor para ativar o escudo
        const DURACAO_HORAS = 5;

        try {
            const user = await User.findOne({ userId: senderRaw, groupId: chatId });

            if (!user || user.coins < CUSTO_PROTECAO) {
                return await msg.reply(`❌ *YUKON:* Você precisa de pelo menos *${CUSTO_PROTECAO} YukonCoins* para ativar o Escudo de Plasma.`);
            }

            const agora = Date.now();
            const cincoHorasEmMs = DURACAO_HORAS * 60 * 60 * 1000;
            const expiraEm = agora + cincoHorasEmMs;

            await User.updateOne(
                { userId: senderRaw, groupId: chatId },
                { 
                    $inc: { coins: -CUSTO_PROTECAO },
                    $set: { protectedUntil: expiraEm }
                }
            );

            await msg.reply(`🛡️ *ESCUDO ATIVADO!* \n━━━━━━━━━━━━━━━━━━━━━\nSeus créditos estão protegidos contra roubos pelas próximas *5 horas*.\n💰 Taxa de manutenção: *${CUSTO_PROTECAO} YC*`);

        } catch (e) {
            console.error(e);
        }
    }
};