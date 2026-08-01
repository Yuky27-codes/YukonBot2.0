const Partnership = require('../models/partnershipSchema');

module.exports = {
    name: 'parcerias',
    async execute(client, msg, { chatId, isGroup }) {
        if (!chatId.endsWith('@g.us')) return msg.reply("❌ Apenas em grupos.");

        try {
            const listaParcerias = await Partnership.find({ groupId: chatId });

            if (listaParcerias.length === 0) {
                return msg.reply("🤝 Este grupo ainda não possui parcerias cadastradas. Use `/parceria code` para começar!");
            }

            let texto = `🤝 *PAINEL DE PARCERIAS E HISTÓRICO* 📊\n\n`;

            listaParcerias.forEach((p, index) => {
                const dataCriacao = new Date(p.criadoEm).toLocaleDateString('pt-BR');
                texto += `${index + 1}. *Parceiro:* ${p.partnerName}\n`;
                texto += `   🎮 *Partidas Jogadas:* ${p.partidasJogadas}\n`;
                texto += `   📅 *Aliados Desde:* ${dataCriacao}\n`;
                texto += `   ──────────────────\n`;
            });

            return msg.reply(texto);
        } catch (err) {
            console.error("❌ Erro no /parcerias:", err);
            return msg.reply("⚠️ Erro ao carregar as parcerias.");
        }
    }
};