module.exports = {
    name: 'duvida',
    async execute(client, msg, { args }) {
        const num = parseInt(args[0]);
        
        const respostas = {
            1: "🔄 *TROCA DE GRUPO:* Para manter a segurança e evitar abusos, a troca de grupos vinculados é feita apenas pelo suporte técnico. Chame o /admin para solicitar.",
            2: "🛰️ *BOT SAIU DO GRUPO:* Verifique se a assinatura expirou. Se ainda tiver dias, basta adicionar o bot de novo; ele reconhecerá o ID automaticamente.",
            3: "🎁 *INDICAÇÃO:* Use o comando /indicar para gerar seu link. Cada amigo que assinar através de você garante +10 dias extras na sua conta!",
            4: "🌌 *PLANO INTERGALÁCTICO:* É o nosso nível máximo. Permite até 3 grupos, suporte prioritário e acesso antecipado a novos jogos e funções.",
            5: "⏳ *PRAZO DE ATIVAÇÃO:* O Comandante Yukon analisa os comprovantes em até 15 minutos dentro do horário comercial (09h às 22h).",
            6: "🛠️ *BOT NÃO RESPONDE:* Verifique se o bot tem permissão de ADMINISTRADOR no grupo. Sem isso, ele não consegue ler as mensagens e executar comandos.",
            7: "📅 *RENOVAÇÃO:* Você pode renovar a qualquer momento. Basta gerar um novo /pix. Os 30 dias serão SOMADOS ao tempo que você já tem.",
            8: "🔄 *MIGRAÇÃO DE DIAS:* Se você tinha dias no sistema antigo, use o comando /vincular no PV. O bot detectará seus dias e solicitará a migração para o Comandante sem custo!",
            9: "🔥 *CUPOM DE DESCONTO:* Fique atento ao nosso grupo oficial e aos sorteios. Você também ganha cupons ao bater metas de indicação.",
            10: "⚠️ *ESQUECI A LEGENDA:* Não se preocupe. Reenvie a imagem do comprovante agora mesmo escrevendo apenas 'comprovante' na legenda da foto."
        };

        if (!respostas[num]) {
            return msg.reply("❌ *NÚMERO INVÁLIDO*\nEscolha uma dúvida de 1 a 10. Exemplo: `/duvida 8`.");
        }

        return msg.reply(`📖 *RESPOSTA DA DÚVIDA #${num}* \n\n${respostas[num]}`);
    }
};