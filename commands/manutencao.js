const mongoose = require('mongoose');

module.exports = {
    name: 'manutencao',
    async execute(client, msg, { args, chatId, User }) {
        try {
            const authorId = (msg.author || msg.from).toString();
            const meuNumero = client.info.wid._serialized;
            const souEuDono = authorId === meuNumero;

            let temPermissao = souEuDono;
            if (!temPermissao && User) {
                const userData = await User.findOne({ userId: authorId, groupId: chatId });
                if (userData && userData.isBotAdmin) temPermissao = true;
            }

            if (!temPermissao) {
                return msg.reply("❌ *ACESSO NEGADO:* Apenas administradores podem alterar o modo de manutenção.");
            }

            const acao = args[0] ? args[0].toLowerCase() : '';
            if (acao !== 'on' && acao !== 'off') {
                return msg.reply("⚠️ Use: `/manutencao on` para ativar ou `/manutencao off` para desativar.");
            }

            // Define se o modo de manutenção está ligado
            const emManutencao = acao === 'on';

            // Salva o estado global de manutenção no banco (vamos usar uma collection de Config geral)
            const SystemConfig = mongoose.model('SystemConfig', new mongoose.Schema({
                chave: { type: String, unique: true },
                manutencao: Boolean
            }));

            await SystemConfig.updateOne(
                { chave: 'status_sistema' },
                { $set: { manutencao: emManutencao } },
                { upsert: true }
            );

            if (emManutencao) {
                return msg.reply("🛠️ *MODO DE MANUTENÇÃO ATIVADO!*\nA Yukon entrou em silêncio automático nas conversas aleatórias e chats até que o comando `/manutencao off` seja acionado.");
            } else {
                return msg.reply("✅ *MODO DE MANUTENÇÃO DESATIVADO!*\nA Yukon voltou a operar normalmente em todas as frentes.");
            }

        } catch (err) {
            console.error("❌ Erro no comando manutencao:", err);
            return msg.reply("❌ Erro ao alterar o modo de manutenção no banco de dados.");
        }
    }
};