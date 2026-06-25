module.exports = {
    name: 'blacklist',
    async execute(client, msg, { chatId, isAdmin, User }) {
        if (!isAdmin) return;

        try {
            const banidos = await User.find({ 
                groupId: chatId, 
                isBlacklisted: true 
            }).lean();

            if (!banidos || banidos.length === 0) {
                return await client.sendMessage(chatId, "✅ A *Blacklist* deste setor está vazia.", { sendSeen: false });
            }

            let listaMsg = `🚫 *SISTEMA DE EXCLUSÕES CENTRAL - YUKON* 🚫\n`;
            listaMsg += `_Tripulantes impedidos de retornar_\n`;
            listaMsg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            let mentions = [];

            banidos.forEach((u, index) => {
                if (u.userId) {
                    const jid = u.userId.toString();
                    const numero = jid.split('@')[0];
                    const motivo = u.blacklistReason || "Sem motivo registrado";
                    
                    listaMsg += `${index + 1}º | 💀 @${numero}\n📝 *Motivo:* _${motivo}_\n\n`;
                    mentions.push(String(jid)); 
                }
            });

            listaMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
            listaMsg += `💡 *Dica:* Use */unbanblack [número]* para liberar o acesso.`;

            await client.sendMessage(chatId, listaMsg, { 
                mentions, 
                sendSeen: false 
            });

        } catch (err) {
            console.error("❌ ERRO AO LISTAR BLACKLIST:", err.message);
            await client.sendMessage(chatId, "⚠️ Erro ao carregar os arquivos de exclusão.", { sendSeen: false });
        }
    }
};