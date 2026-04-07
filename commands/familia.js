module.exports = {
    name: 'familia',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const user = await User.findOne({ userId: senderRaw, groupId: chatId });
            if (!user) return;

            const conjugeId = user.marriedWith;
            
            // Usamos um Set para garantir que não existam IDs repetidos no array de menções
            const mencoesSet = new Set();
            mencoesSet.add(senderRaw);
            if (conjugeId) mencoesSet.add(conjugeId);

            // Filtros de categoria
            const filhos = user.family.filter(p => p.role.toLowerCase() === 'filho');
            const parentes = user.family.filter(p => p.role.toLowerCase() !== 'filho');

            // Construção do Texto
            let texto = `👨‍👩‍👧‍👦 *RELATÓRIO DE LINHAGEM — YUKON*\n`;
            texto += `━━━━━━━━━━━━━━━━━━━━━\n`;
            
            // Casal
            const autorLimpo = senderRaw.split('@')[0];
            const conjugeLimpo = conjugeId ? conjugeId.split('@')[0] : null;
            
            texto += `💍 *CASAL:* @${autorLimpo} & ${conjugeId ? `@${conjugeLimpo}` : "_Solteiro_"}\n\n`;
            
            // Filhos
            texto += `👶 *FILHOS [${filhos.length}]:*\n`;
            if (filhos.length === 0) {
                texto += `_Vazio_\n`;
            } else {
                filhos.forEach(f => {
                    const idLimpo = f.userId.split('@')[0];
                    texto += `• @${idLimpo}\n`;
                    mencoesSet.add(f.userId); // Adiciona o ID completo para a menção funcionar
                });
            }

            // Parentes
            texto += `\n🧬 *PARENTES REGISTRADOS:* \n`;
            if (parentes.length === 0) {
                texto += `_Vazio_\n`;
            } else {
                parentes.forEach(p => {
                    const idLimpo = p.userId.split('@')[0];
                    texto += `• @${idLimpo} (${p.role})\n`;
                    mencoesSet.add(p.userId); // Adiciona o ID completo para a menção funcionar
                });
            }
            
            texto += `\n━━━━━━━━━━━━━━━━━━━━━`;

            // Converte o Set de volta para Array
            const mencoesIds = Array.from(mencoesSet);

            // IMPORTANTE: Verifique se sua função global 'enviarMenuComFoto' 
            // repassa o quarto parâmetro (mencoesIds) para o client.sendMessage
            await global.enviarMenuComFoto({ from: chatId }, 'familia.jpg', texto, mencoesIds);

        } catch (e) {
            console.error("Erro no comando familia:", e);
            await msg.reply("❌ Erro ao acessar registros genealógicos.");
        }
    }
};