module.exports = {
    name: 'funcionarios',
    async execute(client, msg, { isAdmin }) {
        // Só o dono pode usar
        if (!isAdmin || !global.LISTA_ADMS.includes(
            ((msg.author || msg.from)._serialized || String(msg.author || msg.from)).trim()
        )) {
            return msg.reply('❌ Apenas o *dono da Yukon* pode usar este comando.');
        }

        const perms = global.lerPermissoesFuncionarios();
        const ids = Object.keys(perms);

        if (ids.length === 0) {
            return msg.reply(
                '📋 *FUNCIONÁRIAS*\n' +
                '━━━━━━━━━━━━━━━━━━━━━\n' +
                '_Nenhuma funcionária cadastrada ainda._\n\n' +
                '💡 Use `/funcionario [ID] [Nome]` para cadastrar.'
            );
        }

        let texto = '📋 *LISTA DE FUNCIONÁRIAS*\n━━━━━━━━━━━━━━━━━━━━━\n\n';

        ids.forEach((id, i) => {
            const f = perms[id];
            const emojis = ['👩‍💼', '👩‍💻', '👩‍🔧'];
            const emoji = emojis[i % emojis.length];
            const cmds = f.comandosLiberados && f.comandosLiberados.length > 0
                ? f.comandosLiberados.map(c => `/${c}`).join(', ')
                : '_Nenhum_';

            texto += `${emoji} *${f.nome || 'Sem nome'}*\n`;
            texto += `🆔 \`${id}\`\n`;
            texto += `🔑 *Comandos:* ${cmds}\n\n`;
        });

        texto += '━━━━━━━━━━━━━━━━━━━━━\n';
        texto += `📊 Total: *${ids.length} funcionária(s)*\n\n`;
        texto += '_Use /liberaruso [ID] [cmds] para liberar acesso._\n';
        texto += '_Use /restringiruso [ID] [cmds] para revogar acesso._';

        return msg.reply(texto);
    }
};

