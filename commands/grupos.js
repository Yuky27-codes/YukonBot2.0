module.exports = {
    name: 'grupos',
    async execute(client, msg, { isAdmin }) {
        if (!isAdmin) return;

        try {
            const mongoose = require('mongoose');
            const AuthorizedGroup = mongoose.models.AuthorizedGroup || mongoose.model('AuthorizedGroup');

            const chats = await client.getChats();
            const grupos = chats.filter(chat => chat.isGroup);

            if (grupos.length === 0) {
                return client.sendMessage(msg.from, "⚠️ Nenhum grupo encontrado.");
            }

            const registrosAuth = await AuthorizedGroup.find({}).lean();
            const mapaAuth = new Map(registrosAuth.map(r => [r.groupId, r]));

            let lista = `🛰️ *ESTAÇÕES CONECTADAS (${grupos.length} grupos)*\n━━━━━━━━━━━━━━━━━━━━━\n`;

            grupos.forEach((g, index) => {
                // Segurança: Caso o ID seja um objeto ou string
                const idReal = (g.id && typeof g.id === 'object') ? g.id._serialized : (g.id || "");
                
                // Segurança: Caso o nome seja nulo ou undefined
                const nomeGrupo = (g.name || "Sem Nome").substring(0, 20);
                
                const registro = mapaAuth.get(idReal) || mapaAuth.get(idReal.replace('@g.us', ''));
                
                let status = "⚪";
                if (registro && registro.isAuthorized) status = "🟢";
                else if (registro) status = "🔴";

                lista += `${index + 1}. *${nomeGrupo}...*\n🆔 \`${idReal}\`\nStatus: ${status}\n\n`;
            });

            await client.sendMessage(msg.from, lista);

        } catch (err) {
            console.error("❌ Erro no /grupos:", err);
            await client.sendMessage(msg.from, `⚠️ Erro ao listar grupos: ${err.message}`);
        }
    }
};