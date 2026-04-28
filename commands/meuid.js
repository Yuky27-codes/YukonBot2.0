module.exports = {
    name: 'meuid',
    async execute(client, msg, { senderRaw }) {
        // Ele vai responder exatamente o que o bot "enxerga" como seu ID
        await msg.reply(`Seu ID atual é: \`${senderRaw}\``);
    }
};