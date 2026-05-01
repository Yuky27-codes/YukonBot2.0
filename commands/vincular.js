module.exports = {
    name: 'vincular',
    async execute(client, msg, { args, chatId }) {
        if (chatId.endsWith('@g.us')) return msg.reply("❌ Use este comando no meu PV.");

        const idGrupo = args[0];
        if (!idGrupo || !idGrupo.includes('@g.us')) return msg.reply("⚠️ Use: `/vincular [ID_DO_GRUPO]`");

        try {
            const mongoose = require('mongoose');
            const UserProfile = mongoose.model('UserProfile'); // Você precisará criar este Model

            let perfil = await UserProfile.findOne({ userId: msg.from });

            if (!perfil) return msg.reply("⚠️ Você precisa escolher um plano primeiro! Use **/assinatura**.");

            // Definição de limites baseada nos seus planos
            let limite = 1; // Plano de 10 reais
            if (perfil.planoPreco === 30) limite = 2;
            if (perfil.planoPreco === 75) limite = 3;

            if (perfil.gruposVinculados.length >= limite) {
                return msg.reply(`🚫 *LIMITE ATINGIDO*\nSeu plano atual permite vincular apenas ${limite} grupo(s).`);
            }

            if (perfil.gruposVinculados.includes(idGrupo)) {
                return msg.reply("⚠️ Este grupo já está vinculado ao seu perfil.");
            }

            perfil.gruposVinculados.push(idGrupo);
            await perfil.save();

            return msg.reply(`✅ *GRUPO VINCULADO!*
━━━━━━━━━━━━━━━━━━━━━
📍 ID: \`${idGrupo}\`
📊 Vagas: ${perfil.gruposVinculados.length}/${limite}

Agora você pode prosseguir para o pagamento com **/pix**.`);

        } catch (err) {
            return msg.reply("⚠️ Erro ao vincular grupo.");
        }
    }
};