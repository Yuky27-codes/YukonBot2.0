module.exports = {
    name: 'addmodo',
    async execute(client, msg, { chatId, args, Modo, isGroupAdmins }) {
        if (!isGroupAdmins) return await msg.reply("❌ Apenas oficiais (ADMs) podem registrar novos modos de jogo.");

        const fullArgs = args.join(' ');
        if (!fullArgs.includes('|')) {
            return await msg.reply("❓ *COMO USAR:* `/addmodo Nome | Regras...`\nUse a barra `|` para separar o nome da descrição.");
        }

        const [nome, ...descricaoParts] = fullArgs.split('|');
        const descricao = descricaoParts.join('|').trim();

        try {
            await Modo.create({
                groupId: chatId,
                nome: nome.trim(),
                descricao: descricao,
                criadoPor: msg.author || msg.from
            });

            await msg.reply(`✅ *MODO REGISTRADO:* "${nome.trim()}" agora faz parte dos arquivos da estação!`);
        } catch (e) {
            await msg.reply("❌ Erro ao salvar o modo no banco de dados.");
        }
    }
};