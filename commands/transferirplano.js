module.exports = {
    name: 'transferirplano',
    async execute(client, msg, { args, isAdmin }) {
        if (!isAdmin) return;

        if (msg.from.endsWith('@g.us')) {
            return client.sendMessage(msg.from, "❌ Use este comando apenas no meu *Privado*.");
        }

        const idAntigo = args[0];
        const idNovo = args[1];

        if (!idAntigo || !idNovo) {
            return client.sendMessage(msg.from, "⚠️ Use: `/transferirplano [ID_ANTIGO] [ID_NOVO]`\n\n_Pegue o ID antigo com */checkauth*._");
        }

        if (idAntigo === idNovo) {
            return client.sendMessage(msg.from, "⚠️ Os dois IDs são iguais, não há nada pra transferir.");
        }

        try {
            const mongoose = require('mongoose');
            const UserProfile = mongoose.model('UserProfile');

            const perfilAntigo = await UserProfile.findOne({ userId: idAntigo });
            if (!perfilAntigo) {
                return client.sendMessage(msg.from, `❌ Não encontrei nenhum perfil com o ID antigo \`${idAntigo}\`.`);
            }

            const perfilNovoExistente = await UserProfile.findOne({ userId: idNovo });
            if (perfilNovoExistente) {
                return client.sendMessage(msg.from, `⚠️ Já existe um perfil cadastrado com o ID novo \`${idNovo}\`.\n\nEsse comando não faz fusão automática de dois perfis, pra evitar sobrescrever dados de outra pessoa por engano. Me chame se for realmente a mesma pessoa e você quiser fundir os dois manualmente.`);
            }

            // 🔁 Troca só o "dono" do perfil — plano, validade e grupos vinculados continuam intactos
            const gruposAntes = [...(perfilAntigo.gruposVinculados || [])];
            const planoAntes = perfilAntigo.planoPreco;

            perfilAntigo.userId = idNovo;
            await perfilAntigo.save();

            const nomePlano = planoAntes === 10 ? 'Recruta' : planoAntes === 30 ? 'Astronauta' : 'Intergaláctico';

            return client.sendMessage(msg.from, `✅ *TRANSFERÊNCIA CONCLUÍDA*
━━━━━━━━━━━━━━━━━━━━━
🆔 *ID antigo:* \`${idAntigo}\`
🆔 *ID novo:* \`${idNovo}\`
📦 *Plano:* ${nomePlano}
📊 *Grupos vinculados:* ${gruposAntes.length}
━━━━━━━━━━━━━━━━━━━━━
_Nada foi apagado. O cliente já pode usar */meu_plano*, */vincular* e */desvincular* normalmente com o número novo._`);

        } catch (err) {
            console.error("❌ Erro no /transferirplano:", err);
            return client.sendMessage(msg.from, "⚠️ Erro ao transferir o plano.");
        }
    }
};