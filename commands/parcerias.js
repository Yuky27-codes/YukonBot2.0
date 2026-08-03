const Partnership = require('../models/partnershipSchema');

module.exports = {
    name: 'parcerias',
    async execute(client, msg, { chatId }) {
        if (!chatId.endsWith('@g.us')) return msg.reply("❌ Apenas em grupos.");

        try {
            const listaParcerias = await Partnership.find({ groupId: chatId });

            if (listaParcerias.length === 0) {
                return msg.reply("🤝 Este grupo ainda não possui parcerias cadastradas. Use `/parceria code` ou `/parceria [nome]` para começar!");
            }

            let texto = `🤝 *PAINEL DE PARCERIAS E HISTÓRICO* 📊\n\n`;

            listaParcerias.forEach((p, index) => {
                const dataCriacao = new Date(p.criadoEm || Date.now()).toLocaleDateString('pt-BR');
                const statusSala = p.salaPAtiva ? `🔴 Aberta (${p.salaPAtiva})` : `🟢 Disponível`;
                
                texto += `${index + 1}. *Parceiro:* ${p.partnerName}\n`;
                texto += `   🎮 *Partidas Jogadas:* ${p.partidasJogadas || 0}\n`;
                texto += `   📌 *Status Sala:* ${statusSala}\n`;
                texto += `   📅 *Aliados Desde:* ${dataCriacao}\n`;
                texto += `   ──────────────────\n`;
            });

            texto += `\n💡 *Uso do Add Sala:* \`/addsalap [número] [código]\``;

            return msg.reply(texto);
        } catch (err) {
            console.error("❌ Erro no /parcerias:", err);
            return msg.reply("⚠️ Erro ao carregar as parcerias.");
        }
    }
};