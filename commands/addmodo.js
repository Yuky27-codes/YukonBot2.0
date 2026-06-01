module.exports = {
    name: 'addmodo',
    async execute(client, msg, { chatId, args, Modo, isGroupAdmins }) {
        if (!isGroupAdmins) return await msg.reply("❌ Apenas oficiais (ADMs) podem registrar novos modos de jogo.");

        const corpoMensagem = msg.body;
        
        const textoSemComando = corpoMensagem.replace(/^\/\w+\s*/, '');

        if (!textoSemComando.includes('|')) {
            return await msg.reply("❓ *COMO USAR:* `/addmodo Nome | Regras...`\nUse a barra `|` para separar o nome da descrição.");
        }

        const partes = textoSemComando.split('|');
        const nome = partes[0].trim();
        const descricao = partes.slice(1).join('|').trim();

        if (!nome || !descricao) {
            return await msg.reply("⚠️ Nome ou Descrição estão vazios. Siga o formato: `Nome | Descrição`.");
        }

        try {
            await Modo.create({
                groupId: chatId,
                nome: nome,
                descricao: descricao, 
                criadoPor: msg.author || msg.from
            });

            await msg.reply(`✅ *MODO REGISTRADO:* "${nome}" agora faz parte dos arquivos da estação!\n\nUse */modo* para ver como ficou.`);
        } catch (e) {
            console.error("Erro ao salvar modo:", e);
            await msg.reply("❌ Erro ao salvar o modo no banco de dados.");
        }
    }
};