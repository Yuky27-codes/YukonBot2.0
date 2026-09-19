module.exports = {
    name: 'funcionario',
    async execute(client, msg, { args, isAdmin, chatId }) {
        // Só o dono pode usar
        if (!isAdmin || !global.LISTA_ADMS.includes(
            ((msg.author || msg.from)._serialized || String(msg.author || msg.from)).trim()
        )) {
            return msg.reply('❌ Apenas o *dono da Yukon* pode usar este comando.');
        }

        const id = args[0]?.trim();
        const nome = args.slice(1).join(' ').trim();

        if (!id || !nome) {
            return msg.reply(
                '⚠️ *USO:* `/funcionario [ID] [Nome]`\n\n' +
                '_Exemplo: `/funcionario 43830678139070@lid Anne`_\n\n' +
                '💡 Use `/funcionarios` para ver a lista atual.'
            );
        }

        const perms = global.lerPermissoesFuncionarios();

        const jaExistia = !!perms[id];
        perms[id] = {
            nome: nome,
            comandosLiberados: perms[id]?.comandosLiberados || []
        };

        global.salvarPermissoesFuncionarios(perms);

        return msg.reply(
            `${jaExistia ? '✏️ *FUNCIONÁRIA ATUALIZADA*' : '✅ *FUNCIONÁRIA CADASTRADA*'}\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 *Nome:* ${nome}\n` +
            `🆔 *ID:* \`${id}\`\n` +
            `🔑 *Comandos liberados:* ${perms[id].comandosLiberados.length > 0 ? perms[id].comandosLiberados.map(c => `/${c}`).join(', ') : '_Nenhum ainda_'}\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `_Use /liberaruso [ID] [comandos] para liberar acesso._`
        );
    }
};

