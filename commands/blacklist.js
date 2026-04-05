module.exports = {
    name: 'blacklist',
    async execute(client, msg, { chatId, isAdmin, User }) {
        // 1. Checagem de Segurança
        if (!isAdmin) return;

        try {
            // Busca otimizada usando .lean() para performance (objetos JS puros)
            const banidos = await User.find({ 
                groupId: chatId, 
                isBlacklisted: true 
            }).lean();

            // Caso a lista esteja vazia
            if (!banidos || banidos.length === 0) {
                return await client.sendMessage(chatId, "✅ A *Blacklist* deste setor está vazia. Nenhum tripulante banido permanentemente.", { sendSeen: false });
            }

            let listaMsg = `🚫 *REGISTRO DE EXCLUSÕES - YUKON* 🚫\n`;
            listaMsg += `_Tripulantes permanentemente bloqueados_\n`;
            listaMsg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            let mentions = [];

            banidos.forEach((u, index) => {
                if (u.userId) {
                    const jid = u.userId.toString();
                    const numero = jid.split('@')[0];
                    
                    listaMsg += `${index + 1}º | 💀 @${numero}\n`;
                    mentions.push(String(jid)); // Garantimos que seja string pura para o array de menções
                }
            });

            listaMsg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
            listaMsg += `💡 *Dica:* Use */unbanblack* @usuario para perdoar um tripulante.`;

            // 2. Envio da lista com as menções para que os números fiquem clicáveis
            await client.sendMessage(chatId, listaMsg, { 
                mentions, 
                sendSeen: false 
            });

        } catch (err) {
            console.error("❌ ERRO AO LISTAR BLACKLIST:", err.message);
            await client.sendMessage(chatId, "⚠️ Erro ao carregar os arquivos de exclusão do banco de dados.", { sendSeen: false });
        }
    }
};