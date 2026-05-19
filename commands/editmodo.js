module.exports = {
    name: 'editmodo',
    description: 'Edita a descrição de um modo existente.',
    async execute(client, msg, { Modo, isGroupAdmins, chatId }) {
        if (!isGroupAdmins) {
            return await msg.reply("❌ Acesso Negado.");
        }

        // ✅ CORRIGIDO: usa msg.body em vez de args.join(' ') para preservar quebras de linha
        const corpoMensagem = msg.body;
        const textoSemComando = corpoMensagem.replace(/^\/\w+\s*/, '');

        if (!textoSemComando.includes('|')) {
            return await msg.reply("❓ Use: */editmodo Nome | Nova Descrição*");
        }

        const partes = textoSemComando.split('|');
        const nomeModo = partes[0].trim();
        const novaDesc = partes.slice(1).join('|').trim();

        if (!nomeModo || !novaDesc) {
            return await msg.reply("⚠️ Nome ou Descrição estão vazios. Siga o formato: `Nome | Nova Descrição`.");
        }

        try {
            const atualizado = await Modo.findOneAndUpdate(
                { groupId: chatId, nome: { $regex: new RegExp(`^${nomeModo}$`, 'i') } },
                { $set: { descricao: novaDesc } },
                { new: true }
            );

            if (!atualizado) return await msg.reply("⚠️ Modo não encontrado.");

            await msg.reply(`⚙️ *MODO ATUALIZADO*\n\n*${atualizado.nome}* agora tem uma nova diretriz:\n_${atualizado.descricao}_`);
        } catch (e) {
            console.error("❌ Erro no editmodo:", e);
            await msg.reply("❌ Erro ao atualizar.");
        }
    }
};