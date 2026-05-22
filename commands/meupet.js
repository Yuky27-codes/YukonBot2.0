module.exports = {
    name: 'meupet',
    async execute(client, msg, { chatId, senderRaw, Pet, MessageMedia }) {
        try {
            const autorId = String(senderRaw).trim();
            const path = require('path');
            const fs = require('fs');

            const pets = await Pet.find({ ownerId: autorId, groupId: chatId, status: 'vivo' });

            if (pets.length === 0) {
                return await client.sendMessage(chatId, "🐾 Você não tem pets ativos!\nUse */adotarpet [tipo] [nome]* para adotar um.");
            }

            for (const pet of pets) {
                const estagioNome = ['', 'Criança', 'Adolescente', 'Adulto', 'Lendário'][pet.estagio];
                const expNecessaria = [0, 100, 200, 350][pet.estagio - 1];
                const expProxima = [100, 200, 350, '---'][pet.estagio - 1];

                // Barra de EXP
                const progresso = expNecessaria > 0 
                    ? Math.min(Math.floor(((pet.exp - (pet.estagio === 1 ? 0 : pet.estagio === 2 ? 100 : 200)) / (expProxima - (pet.estagio === 1 ? 0 : pet.estagio === 2 ? 100 : 200))) * 10), 10)
                    : 10;
                const barra = "▓".repeat(Math.max(0, progresso)) + "░".repeat(Math.max(0, 10 - progresso));

                // Cooldowns restantes
                const agora = Date.now();
                const cooldownAlimentar = pet.cooldowns?.alimentar ? Math.max(0, pet.cooldowns.alimentar.getTime() - agora) : 0;
                const cooldownCarinho = pet.cooldowns?.carinho ? Math.max(0, pet.cooldowns.carinho.getTime() - agora) : 0;
                const cooldownBrincar = pet.cooldowns?.brincar ? Math.max(0, pet.cooldowns.brincar.getTime() - agora) : 0;

                const formatarTempo = (ms) => {
                    if (ms <= 0) return "✅ Disponível";
                    const h = Math.floor(ms / (1000 * 60 * 60));
                    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
                    return `⏳ ${h}h ${m}min`;
                };

                // Tempo sem comer
                const semComer = Date.now() - new Date(pet.ultimaRefeicao).getTime();
                const horasSemComer = Math.floor(semComer / (1000 * 60 * 60));
                const statusFome = horasSemComer >= 36 ? "😰 Com muita fome!" : horasSemComer >= 24 ? "😕 Com fome" : "😊 Satisfeito";

                const texto = `🐾 *${pet.nome.toUpperCase()} — FICHA DO PET*
━━━━━━━━━━━━━━━━━━━━━
🦊 *Tipo:* ${pet.tipo}
⭐ *Estágio:* ${estagioNome}
📊 *EXP:* ${pet.exp} [${barra}]
${pet.estagio < 4 ? `🎯 *Próximo estágio:* ${expProxima} EXP` : '👑 *Estágio máximo atingido!*'}

🍖 *Fome:* ${statusFome}
━━━━━━━━━━━━━━━━━━━━━
⏰ *COOLDOWNS:*
🍗 Alimentar: ${formatarTempo(cooldownAlimentar)}
💆 Carinho: ${formatarTempo(cooldownCarinho)}
🎾 Brincar: ${formatarTempo(cooldownBrincar)}
━━━━━━━━━━━━━━━━━━━━━`;

                const tipoSemAcento = pet.tipo.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const imgPath = path.resolve(__dirname, '..', 'assets', `${tipoSemAcento}_${pet.estagio}.jpg`);

                if (fs.existsSync(imgPath)) {
                    const media = MessageMedia.fromFilePath(imgPath);
                    await client.sendMessage(chatId, media, { caption: texto, mentions: [autorId] });
                } else {
                    await client.sendMessage(chatId, texto, { mentions: [autorId] });
                }
            }

        } catch (e) {
            console.error("❌ Erro no meupet:", e);
            await client.sendMessage(chatId, "⚠️ Erro ao buscar seus pets.");
        }
    }
};