const mongoose = require('mongoose');

module.exports = {
    name: 'manutencao',
    async execute(client, msg, { args, isFuncionarioAutorizado }) {
        try {
            // Permissão: só a equipe master (LISTA_ADMS) ou funcionária com o comando liberado (/liberaruso).
            // Antes qualquer admin de grupo, ou qualquer pessoa no privado do Bot, conseguia ligar a manutenção
            // de TODOS os grupos.
            const senderStr = String((msg.author || msg.from)._serialized || (msg.author || msg.from)).trim();
            const listaMasters = global.LISTA_ADMS || [];
            if (!listaMasters.includes(senderStr) && !isFuncionarioAutorizado) {
                return msg.reply("❌ *ACESSO NEGADO:* Apenas a equipe da Yukon pode alterar o modo de manutenção.");
            }

            const acao = args[0] ? args[0].toLowerCase() : '';
            if (acao !== 'on' && acao !== 'off') {
                return msg.reply("⚠️ Use: `/manutencao on` para ativar ou `/manutencao off` para desativar.");
            }

            const emManutencao = acao === 'on';

            const SystemConfig = mongoose.models.SystemConfig || mongoose.model('SystemConfig', new mongoose.Schema({
                chave: { type: String, unique: true },
                manutencao: Boolean
            }));

            // Salva no banco de dados[cite: 6]
            await SystemConfig.updateOne(
                { chave: 'status_sistema' },
                { $set: { manutencao: emManutencao } },
                { upsert: true }
            );

            // Atualiza a variável global para o index.js bloquear na hora
            global.modoManutencao = emManutencao;

            if (emManutencao) {
                return msg.reply("🛠️ *MODO DE MANUTENÇÃO ATIVADO!*\nA Yukon entrou em silêncio automático nas conversas e só voltará quando o comando `/manutencao off` for acionado.");
            } else {
                return msg.reply("✅ *MODO DE MANUTENÇÃO DESATIVADO!*\nA Yukon voltou a operar normalmente em todas as frentes.");
            }

        } catch (err) {
            console.error("❌ Erro no comando manutencao:", err); //[cite: 6]
            return msg.reply("❌ Erro ao alterar o modo de manutenção no banco de dados."); //[cite: 6]
        }
    }
};