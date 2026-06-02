module.exports = {
    name: 'statuscity',
    async execute(client, msg, { chatId }) {
        try {
            const inicio = Date.now();

            // Envia a mensagem e espera a confirmação
            const msgEnviada = await client.sendMessage(chatId, "📡 *Medindo velocidade da estação...*");

            const tempoMs = Date.now() - inicio;

            let bolinha, status, descricao;

            if (tempoMs < 500) {
                bolinha = "🟢";
                status = "100%";
                descricao = "Estação operando em plena capacidade!";
            } else if (tempoMs < 1000) {
                bolinha = "🟡";
                status = "75%";
                descricao = "Estação com leve instabilidade.";
            } else if (tempoMs < 2000) {
                bolinha = "🟠";
                status = "50%";
                descricao = "Estação com instabilidade moderada.";
            } else {
                bolinha = "🔴";
                status = "25%";
                descricao = "Estação sobrecarregada! Comandos podem demorar.";
            }

            // Edita a mensagem anterior com o resultado
            await client.sendMessage(chatId, `🛰️ *STATUS DA YUKON STATION*
━━━━━━━━━━━━━━━━━━━━━
${bolinha} *Velocidade:* ${status}
⚡ *Latência:* ${tempoMs}ms
📊 *Status:* ${descricao}

🔴 25% — Crítico
🟠 50% — Instável
🟡 75% — Normal
🟢 100% — Ótimo
━━━━━━━━━━━━━━━━━━━━━`);

        } catch (e) {
            console.error("❌ Erro no /statuscity:", e.message, e.stack);
            try {
                await client.sendMessage(chatId, "⚠️ Erro ao medir o status da estação.");
            } catch {}
        }
    }
};