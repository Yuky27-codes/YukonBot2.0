module.exports = {
    name: 'grupos',
    async execute(client, msg, { isAdmin }) {
        if (!isAdmin) return;

        const chats = await client.getChats();
        const grupos = chats.filter(chat => chat.isGroup);

        let lista = "🛰️ *ESTAÇÕES CONECTADAS (GRUPOS)*\n━━━━━━━━━━━━━━━━━━━━━\n";
        
        grupos.forEach((g, index) => {
            lista += `${index + 1}. *Nome:* ${g.name}\n🆔 *ID:* \`${g.id._serialized}\`\n\n`;
        });

        await client.sendMessage(msg.from, lista);
    }
};