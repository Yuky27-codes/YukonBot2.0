module.exports = {
    name: 'adotar',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const mencoes = msg.mentionedIds;
            const autorId = String(senderRaw).trim();
            const autorData = await User.findOne({ userId: autorId, groupId: chatId });

            if (!mencoes.length) return await msg.reply("❓ *COMO USAR:* `/adotar @tripulante`\nMencione quem o casal deseja adotar como filho(a).");
            
            if (!autorData || !autorData.marriedWith) {
                return await msg.reply("❌ *ERRO:* Apenas casais oficiais da Yukon podem fundar uma linhagem e adotar filhos.");
            }

            const alvoId = String(mencoes[0]._serialized || mencoes[0]).trim();
            const conjugeId = autorData.marriedWith;

            // Impedir auto-adoção ou adotar o próprio cônjuge
            if (alvoId === autorId || alvoId === conjugeId) {
                return await msg.reply("❌ *SISTEMA:* Você não pode adotar a si mesmo ou ao seu cônjuge como filho.");
            }

            // Evitar duplicata: Verifica se o filho já está na família
            const jaEhFilho = autorData.family.find(f => f.userId === alvoId);
            if (jaEhFilho) return await msg.reply("👶 Este tripulante já faz parte dos registros da sua família.");

            const novoFilho = { userId: alvoId, role: 'filho' };

            // ATUALIZAÇÃO SINCRONIZADA: Adiciona para os dois ao mesmo tempo
            await User.updateMany(
                { userId: { $in: [autorId, conjugeId] }, groupId: chatId },
                { $push: { family: novoFilho } }
            );

            const textoAdocao = `
🍼 *NOVO TRIPULANTE NA FAMÍLIA!*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
O pequeno(a) @${alvoId.split('@')[0]} foi adotado(a) com sucesso!

👨‍👩‍👦 *PAIS:* @${autorId.split('@')[0]} & @${conjugeId.split('@')[0]}
✨ *STATUS:* Registro civil atualizado nos arquivos da Yukon.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();

            await client.sendMessage(chatId, textoAdocao, { 
                mentions: [alvoId, autorId, conjugeId] 
            });

        } catch (e) {
            console.error("Erro no comando adotar:", e);
            await msg.reply("❌ Falha ao processar o registro de adoção.");
        }
    }
};