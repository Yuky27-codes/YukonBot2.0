module.exports = {
    name: 'casais',
    aliases: ['listacasal'],
    async execute(client, msg, { chatId, User }) {
        try {
            // 1. Busca usuários casados no grupo atual
            const casaisDb = await User.find({ 
                groupId: chatId, 
                marriedWith: { $ne: null } 
            }).lean();

            if (!casaisDb || casaisDb.length === 0) {
                return await client.sendMessage(chatId, "💔 *SISTEMA:* Nenhum registro de união encontrado neste setor.", { sendSeen: false });
            }

            let mCasais = `💍 *ALMANAQUE DE CASAIS - YUKON* 💍\n`;
            mCasais += `_Registro oficial de uniões da estação_\n`;
            mCasais += `━━━━━━━━━━━━━━━━━━━━\n\n`;

            let vis = new Set();
            let mntsCas = [];
            let contador = 0;

            for (const u of casaisDb) {
                // Limite de 10 casais para manter a scannability e evitar spam no WhatsApp
                if (contador >= 10) break;

                const userJid = u.userId.toString();
                const conjugeJid = u.marriedWith.toString();

                // Lógica para não repetir o casal (Se A com B já foi, pula B com A)
                if (!vis.has(userJid)) {
                    mCasais += `${contador + 1}º | 👩‍❤️‍👨 @${userJid.split('@')[0]}\n`;
                    mCasais += `╰┈ ✨ ❤️ ✨ @${conjugeJid.split('@')[0]}\n\n`;
                    
                    vis.add(userJid); 
                    vis.add(conjugeJid);
                    
                    mntsCas.push(userJid, conjugeJid);
                    contador++;
                }
            }

            mCasais += `━━━━━━━━━━━━━━━━━━━━\n❄️ *Total de casais registrados:* ${Math.floor(casaisDb.length / 2)}`;

            await client.sendMessage(chatId, mCasais, { 
                mentions: mntsCas, 
                sendSeen: false 
            });

        } catch (e) {
            console.error("❌ ERRO NO LISTA CASAIS:", e.message);
            await client.sendMessage(chatId, "⚠️ Erro ao acessar os arquivos do cartório.", { sendSeen: false });
        }
    }
};