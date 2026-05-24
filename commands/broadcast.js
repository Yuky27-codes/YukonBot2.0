module.exports = {
    name: 'broadcast',
    async execute(client, msg, { isAdmin }) {
        try {
            // Só você pode usar (isAdmin verifica sua lista LISTA_ADMS)
            if (!isAdmin) return;

            // Só funciona no PV
            if (msg.from.endsWith('@g.us')) {
                return await msg.reply("❌ Use este comando apenas no meu *Privado*.");
            }

            // Pega o texto após o comando
            const corpo = msg.body.replace(/^\/broadcast\s*/i, '').trim();

            if (!corpo) {
                return await msg.reply(`❓ *COMO USAR:*\n/broadcast [mensagem]\n\n_A mensagem será enviada para todos os grupos que a Yukon está._\n\nExemplo:\n/broadcast 🛰️ *ATUALIZAÇÃO YUKON*\nNova versão disponível!`);
            }

            // Busca todos os grupos
            const chats = await client.getChats();
            const grupos = chats.filter(c => c.isGroup);

            if (grupos.length === 0) {
                return await msg.reply("⚠️ Nenhum grupo encontrado.");
            }

            // Confirmação antes de enviar
            await msg.reply(`📡 *BROADCAST YUKON*\n━━━━━━━━━━━━━━━━━━━━━\nEnviando para *${grupos.length} grupo(s)*...\n\n_Aguarde o relatório final._`);

            let enviados = 0;
            let falhas = 0;
            const falhasNomes = [];

            for (const grupo of grupos) {
                try {
                    await client.sendMessage(grupo.id._serialized, corpo);
                    enviados++;
                    // Pequena pausa para não sobrecarregar o WhatsApp
                    await new Promise(r => setTimeout(r, 1000));
                } catch (e) {
                    falhas++;
                    falhasNomes.push(grupo.name || grupo.id._serialized);
                    console.error(`❌ Falha ao enviar para ${grupo.name}:`, e.message);
                }
            }

            // Relatório final
            let relatorio = `✅ *BROADCAST CONCLUÍDO*\n━━━━━━━━━━━━━━━━━━━━━\n📤 *Enviados:* ${enviados}/${grupos.length}\n`;

            if (falhas > 0) {
                relatorio += `❌ *Falhas (${falhas}):*\n${falhasNomes.map(n => `• ${n}`).join('\n')}`;
            } else {
                relatorio += `🎉 Todos os grupos receberam a mensagem!`;
            }

            await msg.reply(relatorio);

        } catch (e) {
            console.error("❌ Erro no /broadcast:", e);
            await msg.reply("⚠️ Erro ao processar o broadcast.");
        }
    }
};