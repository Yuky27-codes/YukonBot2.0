module.exports = {
    name: 'duvida',
    async execute(client, msg, { args }) {
        const num = parseInt(args[0]);
        
        const respostas = {
            1: "🔄 *TROCA DE GRUPO:* A troca manual pelo bot não é permitida para evitar abusos. Chame o suporte técnico para realizar a alteração.",
            2: "🛰️ *BOT SAIU:* Se o bot foi removido por erro, basta adicioná-lo novamente. Se a licença expirou, ele sairá automaticamente.",
            3: "🎁 *INDICAÇÃO:* Cada amigo que assinar usando seu cupom (gerado no /indicar) te dá 10 dias extras grátis!",
            4: "🌌 *INTERGALÁCTICO:* É o nosso plano VIP. Você tem suporte direto com o dono, prioridade em novos jogos e limite de 3 grupos.",
            5: "⏳ *TEMPO DE ATIVAÇÃO:* O prazo médio é de 5 a 15 minutos em horário comercial (09h às 22h).",
            6: "🛠️ *COMANDOS NO GRUPO:* Verifique se o bot é ADM do grupo. Sem permissão de administrador, ele não consegue ler as mensagens.",
            7: "📅 *RENOVAÇÃO:* Basta usar o comando /pix e enviar o novo comprovante. O sistema somará os dias na sua conta atual.",
            8: "🚫 *LIMITE DE GRUPOS:* Não. Para adicionar mais grupos, você deve fazer o /upgrade para um plano superior.",
            9: "🔥 *DESCONTO:* Você ganha cupons participando de eventos no grupo oficial ou através do sistema de indicações.",
            10: "⚠️ *SEM LEGENDA:* Se esqueceu a legenda 'comprovante', envie a foto novamente com a legenda correta para o bot processar."
        };

        if (!respostas[num]) {
            return msg.reply("❌ Número inválido! Use de 1 a 10. Exemplo: `/duvida 5`.");
        }

        return msg.reply(`📖 *RESPOSTA DA DÚVIDA #${num}* \n\n${respostas[num]}`);
    }
};