module.exports = {
    name: 'upgrade',
    async execute(client, msg, { args }) {
        if (msg.from.endsWith('@g.us')) return msg.reply("❌ Use este comando no meu PV.");

        const novoPlano = parseInt(args[0]);
        if (!novoPlano || ![1, 2, 3].includes(novoPlano)) {
            return msg.reply("⚠️ Escolha o nível do upgrade: `/upgrade [1, 2 ou 3]`");
        }

        try {
            const mongoose = require('mongoose');
            const UserProfile = mongoose.model('UserProfile');

            const preco = novoPlano === 1 ? 10 : novoPlano === 2 ? 30 : 75;
            const limite = novoPlano === 1 ? 1 : novoPlano === 2 ? 2 : 3;

            await UserProfile.updateOne(
                { userId: msg.from },
                { $set: { planoPreco: preco } },
                { upsert: true }
            );

            return msg.reply(`⬆️ *UPGRADE SOLICITADO*
━━━━━━━━━━━━━━━━━━━━━
Nível selecionado: **${novoPlano}**
Novo limite: **${limite} grupo(s)**

Agora você pode usar o **/vincular** para adicionar os novos grupos e depois o **/pix**.`);
        } catch (err) {
            return msg.reply("⚠️ Erro ao processar upgrade.");
        }
    }
};