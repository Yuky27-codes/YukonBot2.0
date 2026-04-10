// commands/delmodo.js
module.exports = {
    name: 'delmodo',
    description: 'Remove um modo de jogo da estação.',
    async execute(client, msg, { args, Modo, isGroupAdmins, chatId }) {
        if (!isGroupAdmins) {
            return await msg.reply("❌ Acesso Negado. Apenas Oficiais podem deletar diretrizes.");
        }

        const nomeModo = args.join(' ');
        if (!nomeModo) return await msg.reply("❓ Informe o nome do modo. Ex: */delmodo Survival*");

        try {
            const deletado = await Modo.findOneAndDelete({ 
                groupId: chatId, 
                nome: { $regex: new RegExp(`^${nomeModo}$`, 'i') } 
            });

            if (!deletado) return await msg.reply("⚠️ Modo não encontrado neste grupo.");

            await msg.reply(`🗑️ *DIRETRIZ REMOVIDA*\n\nO modo **${deletado.nome}** foi apagado dos registros da Yukon.`);
        } catch (e) {
            console.error(e);
            await msg.reply("❌ Erro ao deletar do banco de dados.");
        }
    }
};
