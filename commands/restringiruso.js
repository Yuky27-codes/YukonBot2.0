module.exports = {
    name: 'restringiruso',
    async execute(client, msg, { args, isAdmin }) {
        // Só o dono pode usar
        const senderStr = ((msg.author || msg.from)._serialized || String(msg.author || msg.from)).trim();
        if (!isAdmin || !global.LISTA_ADMS.includes(senderStr)) {
            return msg.reply('❌ Apenas o *dono da Yukon* pode usar este comando.');
        }

        // /restringiruso [ID] cmd1 cmd2 ...
        const id = args[0]?.trim();
        const cmdsParaRemover = args.slice(1).map(c => c.toLowerCase().replace(/^\//, ''));

        if (!id || cmdsParaRemover.length === 0) {
            return msg.reply(
                '⚠️ *USO:* `/restringiruso [ID] [comando1] [comando2] ...`\n\n' +
                '_Exemplo: `/restringiruso 43830678139070@lid adv mute`_\n\n' +
                '💡 Use `/funcionarios` para ver as permissões atuais de cada uma.'
            );
        }

        const perms = global.lerPermissoesFuncionarios();

        if (!perms[id]) {
            return msg.reply(
                `❌ ID \`${id}\` não encontrado na lista de funcionárias.\n\n` +
                '_Use `/funcionarios` para ver os IDs cadastrados._'
            );
        }

        const antigos = new Set(perms[id].comandosLiberados || []);
        const removidos = cmdsParaRemover.filter(c => antigos.has(c));
        const naoTinha = cmdsParaRemover.filter(c => !antigos.has(c));

        removidos.forEach(c => antigos.delete(c));
        perms[id].comandosLiberados = [...antigos];

        global.salvarPermissoesFuncionarios(perms);

        let resposta = `🔒 *ACESSO RESTRINGIDO*\n━━━━━━━━━━━━━━━━━━━━━\n`;
        resposta += `👤 *Funcionária:* ${perms[id].nome} (\`${id}\`)\n\n`;

        if (removidos.length > 0) {
            resposta += `🔴 *Removidos:* ${removidos.map(c => `/${c}`).join(', ')}\n`;
        }
        if (naoTinha.length > 0) {
            resposta += `⚪ *Não tinham acesso:* ${naoTinha.map(c => `/${c}`).join(', ')}\n`;
        }

        const restantes = perms[id].comandosLiberados;
        resposta += `\n📋 *Comandos restantes:* ${restantes.length > 0 ? restantes.map(c => `/${c}`).join(', ') : '_Nenhum_'}`;

        return msg.reply(resposta);
    }
};

