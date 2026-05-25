module.exports = {
    name: 'grupos',
    async execute(client, msg, { isAdmin }) {
        if (!isAdmin) return;

        try {
            const mongoose = require('mongoose');
            const AuthorizedGroup = mongoose.model('AuthorizedGroup');

            const chats = await client.getChats();
            const grupos = chats.filter(chat => chat.isGroup);

            if (grupos.length === 0) {
                return client.sendMessage(msg.from, "⚠️ Nenhum grupo encontrado.");
            }

            // Filtra grupos que foram removidos via /sairgrupo (licença com expiresAt = 0)
            const removidos = await AuthorizedGroup.find({
                isAuthorized: false,
                expiresAt: new Date(0)
            }).lean();
            const idsRemovidos = new Set(removidos.map(r => r.groupId));

            const gruposFiltrados = grupos.filter(g => !idsRemovidos.has(g.id._serialized));

            let lista = `🛰️ *ESTAÇÕES CONECTADAS (${gruposFiltrados.length} grupos)*\n━━━━━━━━━━━━━━━━━━━━━\n`;

            gruposFiltrados.forEach((g, index) => {
                lista += `${index + 1}. *${g.name}*\n🆔 \`${g.id._serialized}\`\n\n`;
            });

            await client.sendMessage(msg.from, lista);

        } catch (err) {
            console.error("❌ Erro no /grupos:", err);
            await client.sendMessage(msg.from, "⚠️ Erro ao listar grupos.");
        }
    }
};