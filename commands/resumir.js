module.exports = {
    name: 'resumir',
    async execute(client, msg, { chatId, groq }) {
        if (!msg.from.endsWith('@g.us')) return;

        try {
            await msg.react('📑');

            // ✅ CORRIGIDO: GroupMessage não vem do handler — buscado diretamente via mongoose
            const mongoose = require('mongoose');
            const GroupMessage = mongoose.models.GroupMessage || mongoose.model('GroupMessage');

            const msgsGravadas = await GroupMessage.find({ groupId: chatId })
                .sort({ timestamp: -1 })
                .limit(50)
                .lean();

            if (!msgsGravadas || msgsGravadas.length < 5) {
                await msg.react('⚠️');
                return await client.sendMessage(
                    chatId,
                    "🛰️ *SISTEMA:* Memória insuficiente (menos de 5 mensagens registradas) para gerar um resumo digno da Yukon.",
                    { sendSeen: false }
                );
            }

            const historico = msgsGravadas
                .reverse()
                .map(m => `${m.senderName}: ${m.body}`)
                .join('\n');

            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "Você é a YukonBot, uma assistente de bordo de uma estação espacial. Seu tom é engraçado, organizado, levemente sarcástico e usa termos espaciais. Resuma as conversas focando no que foi importante."
                    },
                    {
                        role: "user",
                        content: `Aqui está o log das últimas mensagens da tripulação. Faça um resumo executivo:\n\n${historico}`
                    }
                ],
                model: "llama-3.3-70b-versatile",
            });

            let respostaIA = completion.choices?.[0]?.message?.content;

            if (!respostaIA || typeof respostaIA !== 'string') {
                respostaIA = "❄️ Erro ao interpretar os dados da missão nos servidores da Groq.";
            }

            if (respostaIA.length > 3500) {
                respostaIA = respostaIA.slice(0, 3500) + "\n\n⚠️ *Aviso:* O resumo era tão longo que precisei ejetar uma parte.";
            }

            const relatorioFinal = `🛸 *RELATÓRIO DE MISSÃO: YUKON STATION* 🛸
━━━━━━━━━━━━━━━━━━━━━
${respostaIA}
━━━━━━━━━━━━━━━━━━━━━
❄️ *Yukon Intelligence Service*`;

            await client.sendMessage(chatId, relatorioFinal, { sendSeen: false });
            await msg.react('✅');

        } catch (err) {
            console.error("❌ ERRO NO RESUMO:", err.message);
            try { await msg.react('❌'); } catch {}
            await client.sendMessage(chatId, "⚠️ Falha crítica nos processadores neurais ao tentar resumir.", { sendSeen: false });
        }
    }
};