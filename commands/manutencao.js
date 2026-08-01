module.exports = {
    name: 'manutencao',
    async execute(client, msg, { args, chatId }) {
        // Garante que o comando seja executado estritamente no PV do Dono
        if (chatId.endsWith('@g.us')) {
            return msg.reply("❌ Por segurança, o comando de manutenção global deve ser usado apenas no meu *Privado*.");
        }

        const acao = args[0]?.toLowerCase();

        if (!acao || (acao !== 'on' && acao !== 'off')) {
            return msg.reply(`⚠️ *MODO DE MANUTENÇÃO GLOBAL*\n\nStatus atual: *${global.modoManutencao ? 'LIGADO (Travada 🔒)' : 'DESLIGADO (Normal 🟢)'}*\n\n*Como usar:*
- \`/manutencao on\` -> Trava a Yukon em todos os grupos (Modo Teste).
- \`/manutencao off\` -> Libera o bot para funcionamento normal.`);
        }

        if (!global.modoManutencao) global.modoManutencao = false;

        if (acao === 'on') {
            global.modoManutencao = true;
            return msg.reply("🔒 *Modo de Manutenção ATIVADO com sucesso!*\nA Yukon agora está travada e ignorando comandos externos em todos os grupos. Boa sessão de testes, Comandante! 🚀");
        } else {
            global.modoManutencao = false;
            return msg.reply("🟢 *Modo de Manutenção DESATIVADO!*\nA Yukon voltou a operar normalmente em todos os grupos. 🛰️");
        }
    }
};