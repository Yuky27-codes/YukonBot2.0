module.exports = {
    name: 'familia',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const user = await User.findOne({ userId: senderRaw, groupId: chatId });
            if (!user) return;

            const conjugeId = user.marriedWith;
            const mencoesIds = [senderRaw];
            if (conjugeId) mencoesIds.push(conjugeId);

            // Filtros
            const filhos = user.family.filter(p => p.role.toLowerCase() === 'filho');
            const parentes = user.family.filter(p => p.role.toLowerCase() !== 'filho');

            // Construção do Texto
            let texto = `👨‍👩‍👧‍👦 *RELATÓRIO DE LINHAGEM — YUKON*\n`;
            texto += `━━━━━━━━━━━━━━━━━━━━━\n`;
            texto += `💍 *CASAL:* @${senderRaw.split('@')[0]} & ${conjugeId ? `@${conjugeId.split('@')[0]}` : "_Solteiro_"}\n\n`;
            
            texto += `👶 *FILHOS [${filhos.length}]:*\n`;
            if (filhos.length === 0) {
                texto += `_Vazio_\n`;
            } else {
                filhos.forEach(f => {
                    texto += `• @${f.userId.split('@')[0]}\n`;
                    mencoesIds.push(f.userId);
                });
            }

            texto += `\n🧬 *PARENTES REGISTRADOS:* \n`;
            if (parentes.length === 0) {
                texto += `_Vazio_\n`;
            } else {
                parentes.forEach(p => {
                    texto += `• @${p.userId.split('@')[0]} (${p.role})\n`;
                    mencoesIds.push(p.userId);
                });
            }
            
            texto += `\n━━━━━━━━━━━━━━━━━━━━━`;

            // Envio com a foto e a lista de menções para "pintar" os nomes
            await global.enviarMenuComFoto({ from: chatId }, 'familia.jpg', texto, mencoesIds);

        } catch (e) {
            console.error(e);
            await msg.reply("❌ Erro ao acessar registros.");
        }
    }
};