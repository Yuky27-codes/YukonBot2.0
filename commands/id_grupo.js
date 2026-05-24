module.exports = {
    name: 'id_grupo',
    async execute(client, msg, { chatId }) {
        // ✅ Liberado para todos — necessário para o cliente assinar
        // A barreira de licença do index.js é ignorada para este comando
        return msg.reply(`🆔 *ID DESTE GRUPO:*\n\n\`${chatId}\`\n\n_Copie e envie no PV do bot com o comando /vincular_`);
    }
};