module.exports = {
    name: 'simbolo',
    async execute(client, msg, { chatId }) {
        try {
            // Agora o código está limpo e isolado
            await client.sendMessage(chatId, "㊐", { sendSeen: false });
        } catch (e) {
            console.error("Erro no comando simbolo:", e);
        }
    }
};