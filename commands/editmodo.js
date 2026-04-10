// commands/editmodo.js
module.exports = {
    name: 'editmodo',
    description: 'Edita a descrição de um modo existente.',
    async execute(client, msg, { args, Modo, isGroupAdmins, chatId }) {
        if (!isGroupAdmins) {
            return await msg.reply("❌ Acesso Negado.");
        }

        // Formato: /editmodo Nome | Nova Descrição
        const fullArgs = args.join(' ').split('|');
        if (fullArgs.length < 2) {
            return await msg.reply("❓ Use: */editmodo Nome | Nova Descrição*");
        }

        const nomeModo = fullArgs[0].trim();
        const novaDesc = fullArgs[1].trim();

        try {
            const atualizado = await Modo.findOneAndUpdate(
                { groupId: chatId, nome: { $regex: new RegExp(`^${nomeModo}$`, 'i') } },
                { $set: { descricao: novaDesc } },
                { new: true }
            );

            if (!atualizado) return await msg.reply("⚠️ Modo não encontrado.");

            await msg.reply(`⚙️ *MODO ATUALIZADO*\n\n**${atualizado.nome}** agora tem uma nova diretriz:\n_${atualizado.descricao}_`);
        } catch (e) {
            await msg.reply("❌ Erro ao atualizar.");
        }
    }
};