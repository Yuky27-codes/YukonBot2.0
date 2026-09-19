// Comandos que requerem permissão especial (sensíveis)
const COMANDOS_SENSIVEIS = [
    'auth','broadcast','checkauth', 'codigo', 'confirmarp', 'cupom','grupos', 'limpar',
    'promover', 'rebaixar','sairgrupo', 'setmidia','transferirplano',
];

module.exports = {
    name: 'liberaruso',
    async execute(client, msg, { args, isAdmin }) {
        // Só o dono pode usar — verifica que é literalmente o dono (LISTA_ADMS)
        const senderStr = ((msg.author || msg.from)._serialized || String(msg.author || msg.from)).trim();
        if (!isAdmin || !global.LISTA_ADMS.includes(senderStr)) {
            return msg.reply('❌ Apenas o *dono da Yukon* pode usar este comando.');
        }

        // /liberaruso [ID] cmd1 cmd2 ...
        const id = args[0]?.trim();
        const cmdsSolicitados = args.slice(1).map(c => c.toLowerCase().replace(/^\//, ''));

        if (!id || cmdsSolicitados.length === 0) {
            return msg.reply(
                '⚠️ *USO:* `/liberaruso [ID] [comando1] [comando2] ...`\n\n' +
                '_Exemplo: `/liberaruso 43830678139070@lid adv mute promover`_\n\n' +
                '💡 Use `/comandos` para ver a lista de comandos disponíveis.'
            );
        }

        const perms = global.lerPermissoesFuncionarios();

        if (!perms[id]) {
            return msg.reply(
                `❌ ID \`${id}\` não encontrado na lista de funcionárias.\n\n` +
                '_Use `/funcionario [ID] [Nome]` para cadastrar primeiro._'
            );
        }

        // Valida quais comandos solicitados existem na lista de sensíveis
        const validos = cmdsSolicitados.filter(c => COMANDOS_SENSIVEIS.includes(c));
        const invalidos = cmdsSolicitados.filter(c => !COMANDOS_SENSIVEIS.includes(c));

        if (validos.length === 0) {
            return msg.reply(
                `❌ Nenhum dos comandos informados é válido para liberação.\n\n` +
                `_Comandos inválidos: ${invalidos.map(c => `/${c}`).join(', ')}_\n\n` +
                '💡 Use `/comandos` para ver a lista de comandos sensíveis.'
            );
        }

        // Adiciona os válidos sem duplicar
        const jaLiberados = new Set(perms[id].comandosLiberados || []);
        const novos = validos.filter(c => !jaLiberados.has(c));
        const jaTinhaSidos = validos.filter(c => jaLiberados.has(c));

        novos.forEach(c => jaLiberados.add(c));
        perms[id].comandosLiberados = [...jaLiberados];

        global.salvarPermissoesFuncionarios(perms);

        let resposta = `✅ *ACESSO LIBERADO*\n━━━━━━━━━━━━━━━━━━━━━\n`;
        resposta += `👤 *Funcionária:* ${perms[id].nome} (\`${id}\`)\n\n`;

        if (novos.length > 0) {
            resposta += `🟢 *Liberados agora:* ${novos.map(c => `/${c}`).join(', ')}\n`;
        }
        if (jaTinhaSidos.length > 0) {
            resposta += `⚪ *Já tinham acesso:* ${jaTinhaSidos.map(c => `/${c}`).join(', ')}\n`;
        }
        if (invalidos.length > 0) {
            resposta += `🔴 *Ignorados (inválidos):* ${invalidos.map(c => `/${c}`).join(', ')}\n`;
        }

        resposta += `\n📋 *Total de comandos liberados:* ${perms[id].comandosLiberados.length}`;
        resposta += `\n🔑 *Todos:* ${perms[id].comandosLiberados.map(c => `/${c}`).join(', ')}`;

        return msg.reply(resposta);
    }
};

