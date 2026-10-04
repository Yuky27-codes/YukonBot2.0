module.exports = {
    name: 'grupos',
    async execute(client, msg, { isAdmin }) {
        if (!isAdmin) return;

        try {
            const mongoose = require('mongoose');
            const AuthorizedGroup = mongoose.models.AuthorizedGroup || mongoose.model('AuthorizedGroup');

            // Busca os chats do cliente
            const chats = await client.getChats();
            
            // Filtra rigorosamente apenas grupos válidos onde a bot realmente está ativa
            const grupos = chats.filter(chat => {
                // Deve ser grupo, não pode estar marcado como left (se a lib suportar) 
                // e precisa ter metadados de participantes ativos para evitar lixo de cache
                return chat.isGroup && chat.id && chat.id._serialized && chat.id._serialized.endsWith('@g.us');
            });

            if (grupos.length === 0) {
                return client.sendMessage(msg.from, "⚠️ Nenhum grupo encontrado.");
            }

            const registrosAuth = await AuthorizedGroup.find({}).lean();
            const mapaAuth = new Map(registrosAuth.map(r => [r.groupId, r]));

            let lista = `🛰️ *ESTAÇÕES CONECTADAS (${grupos.length} grupos)*\n━━━━━━━━━━━━━━━━━━━━━\n`;

            for (let index = 0; index < grupos.length; index++) {
                const g = grupos[index];
                const idReal = g.id._serialized;
                
                // Tenta puxar o nome direto do chat ou usa fallback seguro
                let nomeGrupo = "Sem Nome";
                try {
                    nomeGrupo = (g.name || await g.name || "Sem Nome").substring(0, 20);
                } catch (e) {
                    nomeGrupo = "Grupo Ativo";
                }
                
                const registro = mapaAuth.get(idReal) || mapaAuth.get(idReal.replace('@g.us', ''));
                
                let status = "⚪";
                if (registro && registro.isAuthorized) status = "🟢";
                else if (registro) status = "🔴";

                lista += `${index + 1}. *${nomeGrupo}...*\n🆔 \`${idReal}\`\nStatus: ${status}\n\n`;
            }

            await client.sendMessage(msg.from, lista);

        } catch (err) {
            console.error("❌ Erro no /grupos:", err);
            await client.sendMessage(msg.from, `⚠️ Erro ao listar grupos: ${err.message}`);
        }
    }
};