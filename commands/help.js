module.exports = {
    name: 'help',
    async execute(client, msg, { chatId }) {
        try {
            const textoHelp = `🛠️ *YUKON BOT — SUPORTE* ❄️
Precisa de ajuda ou tem sugestões de novos comandos?

Entre em contato diretamente com o desenvolvedor da Yukon BOT.
👤 *Desenvolvedor:* yukyDev

💬 *Contato:* Discord
Sua ideia pode fazer parte das próximas atualizações!`;

            // Usamos o client.sendMessage para garantir estabilidade e evitar erros de replace
            await client.sendMessage(chatId, textoHelp, { sendSeen: false });

        } catch (err) {
            console.error("❌ Erro ao executar o comando help:", err);
        }
    }
};