module.exports = {
    name: 'id_grupo',
    async execute(client, msg, { chatId }) {
        // Sem barreira de autorização aqui
        return msg.reply(`🆔 *ID DESTE GRUPO:* \n\n\`${chatId}\` \n\n_Copie e mande no PV do bot com o comando /vincular_`);
    }
};