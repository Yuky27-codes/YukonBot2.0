module.exports = {
    name: 'pousar',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const autorId = String(senderRaw).trim();

            const planetas = [
                { nome: "Mercúrio ☿", sucesso: true, msgs: ["As temperaturas extremas testaram sua nave, mas você sobreviveu!", "O solo rochoso foi perfeito para pousar!"] },
                { nome: "Vênus 🌕", sucesso: false, msgs: ["A atmosfera tóxica danificou os motores!", "A pressão atmosférica esmagou parte da nave!"] },
                { nome: "Marte 🔴", sucesso: true, msgs: ["A superfície vermelha foi tranquila para pousar!", "Você encontrou um oásis escondido em Marte!"] },
                { nome: "Júpiter 🟠", sucesso: false, msgs: ["Os ventos de 600km/h destruíram sua nave!", "A gravidade enorme puxou sua nave para o núcleo!"] },
                { nome: "Saturno 💫", sucesso: true, msgs: ["Você pousou em uma das luas de Saturno com sucesso!", "Os anéis de Saturno guiaram seu caminho!"] },
                { nome: "Urano 🔵", sucesso: false, msgs: ["As tempestades de gelo danificaram os propulsores!", "O frio extremo congelou os sistemas da nave!"] },
                { nome: "Netuno 🌀", sucesso: true, msgs: ["A missão secreta em Netuno foi um sucesso!", "Você descobriu cristais raros que valem fortunas!"] },
                { nome: "Plutão ❄️", sucesso: true, msgs: ["O pouso tranquilo em Plutão rendeu bons recursos!", "Os habitantes simpáticos de Plutão pagaram bem!"] },
                { nome: "Europa 🧊", sucesso: true, msgs: ["O oceano subglacial de Europa estava cheio de recursos!", "A missão científica foi um sucesso!"] },
                { nome: "Io 🌋", sucesso: false, msgs: ["Os vulcões de Io explodiram bem na hora do pouso!", "A lava derreteu parte da nave!"] },
            ];

            // Cooldown de 24h igual a missão
            const user = await User.findOne({ userId: autorId, groupId: chatId });
            if (!user) return;

            const agora = new Date();
            const tempoEspera = 24 * 60 * 60 * 1000;

            if (user.lastPousar && (agora - new Date(user.lastPousar) < tempoEspera)) {
                const restante = tempoEspera - (agora - new Date(user.lastPousar));
                const horas = Math.floor(restante / (1000 * 60 * 60));
                const minutos = Math.floor((restante % (1000 * 60 * 60)) / (1000 * 60));
                return await client.sendMessage(chatId, `🚀 Sua nave ainda está em rota!\n\n⏳ Próximo pouso disponível em: *${horas}h ${minutos}min*`);
            }

            // Escolhe planeta aleatório
            const planeta = planetas[Math.floor(Math.random() * planetas.length)];
            const msgPlaneta = planeta.msgs[Math.floor(Math.random() * planeta.msgs.length)];

            // Valor aleatório
            const lucro = Math.floor(Math.random() * (800 - 200 + 1)) + 200;
            const perda = Math.floor(Math.random() * (400 - 100 + 1)) + 100;

            // Atualiza lastPousar
            await User.updateOne(
                { userId: autorId, groupId: chatId },
                { $set: { lastPousar: agora } }
            );

            if (planeta.sucesso) {
                await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { coins: lucro } });
                await client.sendMessage(chatId, `🚀 *MISSÃO DE POUSO — YUKON*
━━━━━━━━━━━━━━━━━━━━━
@${autorId.split('@')[0]} pousou em *${planeta.nome}*!

✅ *POUSO BEM-SUCEDIDO!*
${msgPlaneta}

💰 *Lucro:* +${lucro.toLocaleString('pt-BR')} YC
━━━━━━━━━━━━━━━━━━━━━
⏳ Próxima missão disponível em 24h!`, { mentions: [autorId] });
            } else {
                const perdaReal = Math.min(perda, user.coins);
                await User.updateOne({ userId: autorId, groupId: chatId }, { $inc: { coins: -perdaReal } });
                await client.sendMessage(chatId, `🚀 *MISSÃO DE POUSO — YUKON*
━━━━━━━━━━━━━━━━━━━━━
@${autorId.split('@')[0]} tentou pousar em *${planeta.nome}*!

❌ *NAVE DANIFICADA!*
${msgPlaneta}

💸 *Prejuízo:* -${perdaReal.toLocaleString('pt-BR')} YC
━━━━━━━━━━━━━━━━━━━━━
⏳ Próxima missão disponível em 24h!`, { mentions: [autorId] });
            }

        } catch (e) {
            console.error("❌ Erro no /pousar:", e);
            await client.sendMessage(chatId, "⚠️ Erro ao processar missão de pouso.");
        }
    }
};