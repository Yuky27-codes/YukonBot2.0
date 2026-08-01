const { Poll } = require('whatsapp-web.js');

module.exports = {
    name: 'enquete',
    async execute(client, msg, { chatId, User }) {
        try {
            // Garante que o comando seja usado em um grupo
            if (!chatId.endsWith('@g.us')) {
                return msg.reply("❌ Este comando só pode ser utilizado dentro de grupos.");
            }

            const authorId = (msg.author || msg.from).toString();
            const meuNumero = client.info.wid._serialized;
            const souEuDono = authorId === meuNumero;

            // Verifica se o usuário é admin interno no banco de dados (igual o comando promover faz)
            let temPermissao = souEuDono;
            if (!temPermissao && User) {
                const userData = await User.findOne({ userId: authorId, groupId: chatId });
                if (userData && userData.isBotAdmin) {
                    temPermissao = true;
                }
            }

            // Fallback de segurança extra: checa também se é admin nativo do WhatsApp caso o banco falhe
            if (!temPermissao) {
                try {
                    const chat = await msg.getChat();
                    const participant = chat.participants.find(p => p.id._serialized === authorId);
                    if (participant && (participant.isAdmin || participant.isSuperAdmin)) {
                        temPermissao = true;
                    }
                } catch (e) {
                    // Ignora erro do getChat se houver
                }
            }

            if (!temPermissao) {
                return msg.reply("❌ *ACESSO NEGADO:* Apenas administradores podem criar enquetes.");
            }

            // Pega o texto da mensagem removendo o prefixo e o comando "/enquete"
            const bodyWithoutCommand = msg.body.trim();
            const args = bodyWithoutCommand.split(' ').slice(1);
            const textoCompleto = args.join(" ");

            // Expressão regular para capturar a pergunta entre parênteses (...) e as opções após
            const match = textoCompleto.match(/\((.*?)\)\s*(.*)/);

            if (!match) {
                return msg.reply(`⚠️ *COMO USAR:*
Use o formato abaixo (com a pergunta entre parênteses e as opções separadas por vírgula):

\`/enquete (Qual o melhor jogo?) GTA V, Minecraft, Valorant, CS2\`

*Nota: Você pode colocar quantas opções quiser!*`);
            }

            const pergunta = match[1].trim();
            const rawOpcoes = match[2].trim();

            if (!pergunta || !rawOpcoes) {
                return msg.reply("❌ Você precisa definir a pergunta entre parênteses e pelo menos algumas opções separadas por vírgula.");
            }

            // Separa as opções pela vírgula e remove espaços extras
            const opcoes = rawOpcoes.split(',').map(op => op.trim()).filter(op => op.length > 0);

            if (opcoes.length < 2) {
                return msg.reply("❌ A enquete precisa ter pelo menos **2 opções** válidas.");
            }

            if (opcoes.length > 12) {
                return msg.reply("❌ O WhatsApp permite no máximo **12 opções** por enquete. Reduza um pouco as alternativas.");
            }

            // Cria a enquete utilizando a classe Poll oficial do whatsapp-web.js
            const poll = new Poll(pergunta, opcoes, { allowMultipleAnswers: false });
            await client.sendMessage(chatId, poll);

            // Apaga imediatamente a mensagem com o comando que o ADM enviou
            await msg.delete(true).catch(err => {
                console.log("⚠️ Não foi possível apagar a mensagem do comando:", err.message);
            });

        } catch (err) {
            console.error("❌ Erro ao criar enquete:", err);
            return msg.reply("❌ Ocorreu um erro ao tentar criar a enquete.");
        }
    }
};