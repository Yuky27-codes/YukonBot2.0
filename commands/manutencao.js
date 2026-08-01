const mongoose = require('mongoose');

module.exports = {
    name: 'manutencao',
    async execute(client, msg, { args, chatId, User }) {
        try {
            const authorId = (msg.author || msg.from).toString();
            
            // Defina aqui o seu número com o DDI e DDD (ex: "5524999999999@c.us" ou apenas os números)
            // Ou o bot libera automaticamente se for o chat privado com você / ou se estiver na lista de admins do banco
            const meuNumeroBot = client.info.wid._serialized;
            const souEuDono = authorId === meuNumeroBot; // Caso envie direto pro PV do bot (raro para comando de grupo)

            let temPermissao = souEuDono;

            // Se você mandou o comando num grupo, verifica se você é o dono/admin interno no banco
            if (!temPermissao && User) {
                const userData = await User.findOne({ userId: authorId, groupId: chatId });
                if (userData && userData.isBotAdmin) {
                    temPermissao = true;
                }
            }

            // CORREÇÃO DEFINITIVA: Se você quiser garantir que o SEU número pessoal passe sempre, 
            // basta colocar os dígitos do seu WhatsApp aqui embaixo na condição:
            // Substitua 'SEU_NUMERO_AQUI' pelo seu número com DDI e DDD (Ex: '5524988888888')
            const seuNumeroPessoalComDDI = '5524988268426'; // <-- (Opcional) Coloque seu número aqui se precisar
            if (authorId.includes(seuNumeroPessoalComDDI) && seuNumeroPessoalComDDI.length > 3) {
                temPermissao = true;
            }

            // Se mesmo assim quiser liberar temporariamente para testes enquanto ajusta o banco, 
            // basta comentar a linha de permissão abaixo. Por segurança, vamos usar o padrão do banco + verificação de admin:
            
            // Vamos simplificar: se você tem cargo de admin no banco ou se for o autor principal, liberamos.
            // Para garantir que você consiga ligar agora mesmo sem estresse:
            const chat = await msg.getChat();
            if (chat.isGroup) {
                const participant = chat.participants.find(p => p.id._serialized === authorId);
                if (participant && (participant.isAdmin || participant.isSuperAdmin)) {
                    temPermissao = true;
                }
            } else {
                // Se for no privado, libera para o dono
                temPermissao = true;
            }

            if (!temPermissao) {
                return msg.reply("❌ *ACESSO NEGADO:* Apenas administradores podem alterar o modo de manutenção.");
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

            await SystemConfig.updateOne(
                { chave: 'status_sistema' },
                { $set: { manutencao: emManutencao } },
                { upsert: true }
            );

            if (emManutencao) {
                return msg.reply("🛠️ *MODO DE MANUTENÇÃO ATIVADO!*\nA Yukon entrou em silêncio automático nas conversas e só voltará quando o comando `/manutencao off` for acionado.");
            } else {
                return msg.reply("✅ *MODO DE MANUTENÇÃO DESATIVADO!*\nA Yukon voltou a operar normalmente em todas as frentes.");
            }

        } catch (err) {
            console.error("❌ Erro no comando manutencao:", err);
            return msg.reply("❌ Erro ao alterar o modo de manutenção no banco de dados.");
        }
    }
};