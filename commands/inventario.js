module.exports = {
    name: 'inventario',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const user = await User.findOne({ userId: senderRaw, groupId: chatId });

            if (!user) {
                return await msg.reply("⚠️ *ERRO:* Você ainda não possui registros nos bancos de dados da Yukon.");
            }

            // Pega o inventário do usuário (se não existir, vira um array vazio)
            const inventario = user.inventory || [];

            let texto = `📦 *INVENTÁRIO DE TRIPULANTE* 👨‍🚀\n`;
            texto += `*USUÁRIO:* @${senderRaw.split('@')[0]}\n`;
            texto += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

            if (inventario.length === 0) {
                texto += `_Seu inventário está vazio no momento._\n`;
                texto += `> 🛒 Visite a loja para adquirir itens e cargos!\n`;
            } else {
                // Separar itens por categorias para ficar organizado
                const cargos = inventario.filter(i => i.type === 'cargo');
                const outros = inventario.filter(i => i.type !== 'cargo');

                if (cargos.length > 0) {
                    texto += `🎭 *CARGOS ADQUIRIDOS:*\n`;
                    cargos.forEach(c => {
                        texto += ` • ${c.name}\n`;
                    });
                    texto += `\n`;
                }

                if (outros.length > 0) {
                    texto += `🎒 *OUTROS ITENS:*\n`;
                    outros.forEach(item => {
                        texto += ` • ${item.name}\n`;
                    });
                }
            }

            texto += `\n━━━━━━━━━━━━━━━━━━━━━━━\n`;
            texto += `💰 *SALDO ATUAL:* ${user.coins || 0} Moedas\n`;
            texto += `🛰️ *YUKON PROTOCOL: SECURE-STORAGE*`;

            // Usando a sua função global de foto para manter o padrão visual
            await global.enviarMenuComFoto(msg, 'inventario.jpg', texto, [senderRaw]);

        } catch (e) {
            console.error("Erro no comando inventario:", e);
            await msg.reply("❌ Falha ao acessar seu compartimento de carga.");
        }
    }
};