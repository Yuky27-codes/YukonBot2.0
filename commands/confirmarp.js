const Evento = require('../models/eventSchema');

module.exports = {
    name: 'confirmarp',
    async execute(client, msg, { chatId, isAdmin }) {
        if (!chatId.endsWith('@g.us')) return msg.reply("❌ Comando exclusivo para grupos.");
        if (!isAdmin) return msg.reply("❌ Apenas administradores podem confirmar presença dos participantes.");

        try {
            const evento = await Evento.findOne({ groupId: chatId, status: { $in: ['criado', 'andamento'] } });
            if (!evento) return msg.reply("❌ Não há nenhum evento ativo para confirmar presença.");

            // Pega todos os @ mencionados na mensagem
            const mencionados = msg.mentionedIds || [];
            if (mencionados.length === 0) {
                return msg.reply("⚠️ Marque os tripulantes que confirmaram presença.\n_Exemplo: /confirmarp @fulano @ciclano @beltrano_");
            }

            const confirmadosAgora = [];
            const jaEstavamConfirmados = [];
            const foraDaLista = [];

            mencionados.forEach((m) => {
                const idStr = (m._serialized || m.toString()).trim();
                const participante = evento.participantes.find(p => p.userId === idStr);

                if (!participante) {
                    // Foi marcado, mas nunca usou /participar — não está na lista do evento
                    foraDaLista.push(idStr);
                    return;
                }

                if (participante.confirmado) {
                    jaEstavamConfirmados.push(idStr);
                    return;
                }

                participante.confirmado = true;
                confirmadosAgora.push(idStr);
            });

            // Só grava no banco se algo realmente mudou
            if (confirmadosAgora.length > 0) {
                await evento.save();
            }

            // Monta a resposta com um resumo do que aconteceu
            const todasMencoes = mencionados.map(m => (m._serialized || m.toString()).trim());
            let texto = '';

            if (confirmadosAgora.length > 0) {
                texto += `⭐ *PRESENÇA CONFIRMADA*\n${confirmadosAgora.map(id => `• @${id.split('@')[0]}`).join('\n')}\n\n`;
            }
            if (jaEstavamConfirmados.length > 0) {
                texto += `ℹ️ _Já estavam confirmados:_\n${jaEstavamConfirmados.map(id => `• @${id.split('@')[0]}`).join('\n')}\n\n`;
            }
            if (foraDaLista.length > 0) {
                texto += `⚠️ _Não estão na lista de participantes (não usaram /participar):_\n${foraDaLista.map(id => `• @${id.split('@')[0]}`).join('\n')}\n\n`;
            }

            if (!texto) {
                texto = "⚠️ Nenhuma alteração foi feita.";
            }

            return await client.sendMessage(chatId, texto.trim(), { mentions: todasMencoes });
        } catch (err) {
            console.error("❌ Erro no /confirmarp:", err);
            return msg.reply("⚠️ Erro ao confirmar presença.");
        }
    }
};