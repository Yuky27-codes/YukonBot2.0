module.exports = {
    name: 'adotar',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const mencoes = msg.mentionedIds;
            const autorId = String(senderRaw).trim();
            const args = msg.body.trim().split(/\s+/).slice(1);
            const tipo = args[0]; // 1, 2 ou 3

            // --- MENU ---
            if (!mencoes.length && !tipo) {
                return await client.sendMessage(chatId, `❓ *COMO USAR:*
━━━━━━━━━━━━━━━━━━━━━
👩 */adotar 1 @filho* — Mãe solo
👨 */adotar 2 @filho* — Pai solo
👨‍👩‍👧 */adotar 3 @filho* — Casal (precisa estar casado)`);
            }

            if (!mencoes.length) {
                return await client.sendMessage(chatId, "❓ Mencione quem você quer adotar!\n_Exemplo: /adotar 1 @tripulante_");
            }

            if (!['1', '2', '3'].includes(tipo)) {
                return await client.sendMessage(chatId, `❓ *COMO USAR:*\n👩 */adotar 1 @filho* — Mãe solo\n👨 */adotar 2 @filho* — Pai solo\n👨‍👩‍👧 */adotar 3 @filho* — Casal`);
            }

            const autorData = await User.findOne({ userId: autorId, groupId: chatId });
            const alvoId = String(mencoes[0]._serialized || mencoes[0]).trim();

            if (alvoId === autorId) {
                return await client.sendMessage(chatId, "❌ Você não pode adotar a si mesmo!");
            }

            // Tipo 3 exige casamento
            if (tipo === '3') {
                if (!autorData?.marriedWith) {
                    return await client.sendMessage(chatId, "❌ *ERRO:* O */adotar 3* é para casais! Use */adotar 1* (mãe solo) ou */adotar 2* (pai solo) se não for casado(a).");
                }
                if (alvoId === autorData.marriedWith) {
                    return await client.sendMessage(chatId, "❌ Você não pode adotar seu próprio cônjuge.");
                }
            }

            // Limpa vínculos antigos do alvo automaticamente
            const familiaExistente = await User.findOne({
                groupId: chatId,
                userId: { $ne: alvoId },
                "family.userId": alvoId
            });

            let foiResetado = false;
            if (familiaExistente) {
                await User.updateMany(
                    { groupId: chatId, "family.userId": alvoId },
                    { $pull: { family: { userId: alvoId } } }
                );
                await User.updateOne(
                    { userId: alvoId, groupId: chatId },
                    { $set: { family: [] } }
                );
                foiResetado = true;
            }

            // Garante array
            const alvoData = await User.findOne({ userId: alvoId, groupId: chatId });
            if (alvoData && !Array.isArray(alvoData.family)) {
                await User.updateOne({ userId: alvoId, groupId: chatId }, { $set: { family: [] } });
            }

            let textoAdocao = "";
            let mencoes_msg = [alvoId, autorId];

            // --- MÃE SOLO ---
            if (tipo === '1') {
                await User.updateOne(
                    { userId: autorId, groupId: chatId },
                    { $push: { family: { userId: alvoId, role: 'filho' } } },
                    { upsert: true }
                );
                await User.updateOne(
                    { userId: alvoId, groupId: chatId },
                    { $set: { family: [{ userId: autorId, role: 'mãe' }] } },
                    { upsert: true }
                );

                textoAdocao = foiResetado
                    ? `🍼 *ADOÇÃO CONCLUÍDA — YUKON*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Os registros de @${alvoId.split('@')[0]} tinham vínculos antigos e foram limpos automaticamente.

👩 @${autorId.split('@')[0]} é oficialmente *Mãe Solo* de @${alvoId.split('@')[0]}!

💛 O amor de uma mãe não precisa de companhia para ser completo. Que essa família seja cheia de carinho e conquistas! 🌟
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                    : `🍼 *NOVA ADOÇÃO — MÃE SOLO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Uma nova família nasceu hoje na Yukon Station!

👩 @${autorId.split('@')[0]} é oficialmente *Mãe Solo* de @${alvoId.split('@')[0]}!

💛 O amor de uma mãe não precisa de companhia para ser completo. Que essa família seja cheia de carinho e conquistas! 🌟
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
            }

            // --- PAI SOLO ---
            else if (tipo === '2') {
                await User.updateOne(
                    { userId: autorId, groupId: chatId },
                    { $push: { family: { userId: alvoId, role: 'filho' } } },
                    { upsert: true }
                );
                await User.updateOne(
                    { userId: alvoId, groupId: chatId },
                    { $set: { family: [{ userId: autorId, role: 'pai' }] } },
                    { upsert: true }
                );

                textoAdocao = foiResetado
                    ? `🍼 *ADOÇÃO CONCLUÍDA — YUKON*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Os registros de @${alvoId.split('@')[0]} tinham vínculos antigos e foram limpos automaticamente.

👨 @${autorId.split('@')[0]} é oficialmente *Pai Solo* de @${alvoId.split('@')[0]}!

💪 Um pai presente vale por toda uma frota! Que essa jornada seja de muito amor e orgulho. 🚀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                    : `🍼 *NOVA ADOÇÃO — PAI SOLO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Uma nova família nasceu hoje na Yukon Station!

👨 @${autorId.split('@')[0]} é oficialmente *Pai Solo* de @${alvoId.split('@')[0]}!

💪 Um pai presente vale por toda uma frota! Que essa jornada seja de muito amor e orgulho. 🚀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
            }

            // --- CASAL ---
            else if (tipo === '3') {
                const conjugeId = autorData.marriedWith;
                mencoes_msg = [alvoId, autorId, conjugeId];

                await User.updateMany(
                    { userId: { $in: [autorId, conjugeId] }, groupId: chatId },
                    { $push: { family: { userId: alvoId, role: 'filho' } } }
                );
                await User.updateOne(
                    { userId: alvoId, groupId: chatId },
                    { $set: { family: [{ userId: autorId, role: 'pai/mãe' }, { userId: conjugeId, role: 'pai/mãe' }] } },
                    { upsert: true }
                );

                textoAdocao = foiResetado
                    ? `🍼 *ADOÇÃO CONCLUÍDA — YUKON*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Os registros de @${alvoId.split('@')[0]} tinham vínculos antigos e foram limpos automaticamente.

💛 Mas o amor de @${autorId.split('@')[0]} & @${conjugeId.split('@')[0]} foi mais forte que qualquer burocracia!

👨‍👩‍👧 @${alvoId.split('@')[0]} agora tem um novo lar e uma família que vai cuidar dele(a) com todo o carinho do universo! 🌌
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                    : `🍼 *NOVA ADOÇÃO — CASAL*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Uma nova vida começa hoje na Yukon Station!

👨‍👩‍👧 @${alvoId.split('@')[0]} agora faz parte da linhagem de @${autorId.split('@')[0]} & @${conjugeId.split('@')[0]}.

💛 Que essa família cresça com amor, carinho e muitas aventuras estelares juntos! 🚀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
            }

            await client.sendMessage(chatId, textoAdocao.trim(), { mentions: mencoes_msg });

            // --- VERIFICA SE PAI/MÃE SOLO ACABOU DE SE CASAR ---
            // Se o autor é pai/mãe solo e agora tem cônjuge, manda mensagem especial
            const autorAtualizado = await User.findOne({ userId: autorId, groupId: chatId });
            const temFilhos = autorAtualizado?.family?.some(f => f.role === 'filho');
            const temConjuge = autorAtualizado?.marriedWith;

            if (temFilhos && temConjuge && tipo !== '3') {
                const conjugeId = autorAtualizado.marriedWith;
                setTimeout(async () => {
                    await client.sendMessage(chatId, `💍 *A FAMÍLIA FICOU COMPLETA!*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@${conjugeId.split('@')[0]} chegou para completar essa família! 

👨‍👩‍👧 Uma nova pessoa entrou para cuidar e amar junto. Que essa união traga ainda mais alegria para o lar de @${autorId.split('@')[0]}! 🌟
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, { mentions: [autorId, conjugeId] });
                }, 1500);
            }

        } catch (e) {
            console.error("❌ Erro no /adotar:", e);
            await client.sendMessage(chatId, "❌ Erro ao processar adoção.");
        }
    }
};