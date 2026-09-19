const path = require('path');
const fs = require('fs');

module.exports = {
    name: 'abraçar',
    aliases: ['abracar', 'abraco', 'abraço'], 
    async execute(client, msg, { chatId, senderRaw, MessageMedia }) {
        try {
            const mencoes = msg.mentionedIds;
            const alvoRaw = mencoes.length > 0 ? (mencoes[0]._serialized || mencoes[0]) : null;

            if (!alvoRaw) return await client.sendMessage(chatId, "👤 *SISTEMA:* Mencione quem você quer abraçar!");
            
            const autorId = String(senderRaw).trim();
            const alvoId = String(alvoRaw).trim();

            const nomeAutor = autorId.split('@')[0];
            const nomeAlvo = alvoId.split('@')[0];

            const texto = `🫂 | @${nomeAutor} deu um abraço apertado em @${nomeAlvo}!`;
            
            const caminho = path.resolve(__dirname, '..', 'assets', 'abraco.mp4');

            if (fs.existsSync(caminho)) {
                const media = MessageMedia.fromFilePath(caminho);

                // 🔁 Retry: falhas do tipo "Evaluation failed: r" costumam ser
                // intermitentes no Puppeteer/WhatsApp Web — uma segunda tentativa
                // geralmente resolve. Só cai pro texto puro se as duas falharem.
                let enviado = false;
                for (let tentativa = 1; tentativa <= 2 && !enviado; tentativa++) {
                    try {
                        await client.sendMessage(chatId, media, {
                            caption: texto,
                            mentions: [autorId, alvoId],
                            sendVideoAsGif: true
                        });
                        enviado = true;
                    } catch (erroEnvio) {
                        console.error(`❌ [ABRACAR] Tentativa ${tentativa} falhou:`, erroEnvio?.message, erroEnvio?.stack || erroEnvio);
                        if (tentativa === 2) throw erroEnvio;
                        await new Promise(r => setTimeout(r, 1000)); // pequena pausa antes de tentar de novo
                    }
                }
            } else {
                console.error(`❌ Vídeo de abraço não encontrado em: ${caminho}`);
                await client.sendMessage(chatId, texto, { mentions: [autorId, alvoId] });
            }
        } catch (e) { 
            console.error("❌ ERRO NO ABRACAR:", e?.message, e?.stack || e); 
            try {
                await client.sendMessage(chatId, "⚠️ Não consegui enviar o abraço agora. Tente novamente em instantes.");
            } catch {}
        }
    }
};