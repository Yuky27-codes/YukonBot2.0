module.exports = {
    name: 'enquete',
    async execute(client, msg, { args, chatId }) {
        try {
            // Garante que o comando seja usado em um grupo
            if (!chatId.endsWith('@g.us')) {
                return msg.reply("❌ Este comando só pode ser utilizado dentro de grupos.");
            }

            const chat = await msg.getChat();
            
            // Descobre o ID real de quem mandou a mensagem (funciona tanto para msg.author quanto msg.from em grupos)
            const authorId = msg.author || msg.from;

            // Busca o participante na lista do chat
            const participant = chat.participants.find(p => p.id._serialized === authorId);

            // Verifica se é admin ou superadmin
            const isAdmin = participant ? (participant.isAdmin || participant.isSuperAdmin) : false;

            // REGRA EXTRA DE SEGURANÇA: Se você for o dono do bot (o número conectado), libera sempre para testes
            const meuNumero = client.info.wid._serialized;
            const souEuDono = authorId === meuNumero;

            if (!isAdmin && !souEuDono) {
                return msg.reply("⚠️ Apenas administradores do grupo podem criar enquetes.");
            }

            // O corpo completo da mensagem após o comando /enquete
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

            // Cria a enquete nativa no WhatsApp
            await client.sendMessage(chatId, {
                poll: {
                    name: pergunta,
                    options: opcoes,
                    allowMultipleAnswers: false 
                }
            });

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