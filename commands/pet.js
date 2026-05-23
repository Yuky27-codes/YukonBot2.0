const path = require('path');
const fs = require('fs');

const EXP_POR_ACAO = { alimentar: 15, carinho: 8, brincar: 12 };
const COOLDOWN_MS = {
    alimentar: 8 * 60 * 60 * 1000,  // 8h
    carinho:   4 * 60 * 60 * 1000,  // 4h
    brincar:   6 * 60 * 60 * 1000   // 6h
};
const ESTAGIOS = { 1: 'Criança', 2: 'Adolescente', 3: 'Adulto', 4: 'Lendário' };
const EXP_ESTAGIO = [100, 200, 350];

module.exports = {
    name: 'pet',
    async execute(client, msg, { chatId, senderRaw, args, Pet, MessageMedia }) {
        try {
            const autorId = String(senderRaw).trim();
            const acao = args[0]?.toLowerCase();
            const parametro = args.slice(1).join(' ').trim();

            // --- MENU ---
            if (!acao) {
                return await client.sendMessage(chatId, `🐾 *CENTRAL DE PETS — YUKON*\n\n🍗 */pet alimentar [nome]* — Alimenta seu pet (+15 EXP)\n💆 */pet carinho [nome]* — Faz carinho (+8 EXP)\n🎾 */pet brincar [nome]* — Brinca com ele (+12 EXP)\n📋 */pet status [nome]* — Vê a ficha do pet\n\n_Se tiver só 1 pet, não precisa colocar o nome._`);
            }

            // --- STATUS ---
            if (acao === 'status') {
                const pets = await Pet.find({ ownerId: autorId, groupId: chatId, status: 'vivo' });

                if (pets.length === 0) {
                    return await client.sendMessage(chatId, "🐾 Você não tem pets ativos!\nUse */adotarpet [tipo] [nome]* para adotar um.");
                }

                // Se especificou nome, mostra só aquele
                const listaPets = parametro
                    ? pets.filter(p => p.nome.toLowerCase() === parametro.toLowerCase())
                    : pets;

                if (listaPets.length === 0) {
                    return await client.sendMessage(chatId, `❌ Pet "${parametro}" não encontrado. Use */meupet* para ver seus pets.`);
                }

                for (const pet of listaPets) {
                    const estagioNome = ESTAGIOS[pet.estagio];
                    const expBase = [0, 100, 200][pet.estagio - 1] || 0;
                    const expProxima = EXP_ESTAGIO[pet.estagio - 1];

                    // Barra de EXP
                    let progresso = 10;
                    if (pet.estagio < 4) {
                        const expNoEstagio = pet.exp - expBase;
                        const expNecessaria = expProxima - expBase;
                        progresso = Math.min(Math.floor((expNoEstagio / expNecessaria) * 10), 10);
                    }
                    const barra = "▓".repeat(Math.max(0, progresso)) + "░".repeat(Math.max(0, 10 - progresso));

                    const agora = Date.now();
                    const formatarTempo = (date) => {
                        if (!date) return "✅ Disponível";
                        const ms = new Date(date).getTime() - agora;
                        if (ms <= 0) return "✅ Disponível";
                        const h = Math.floor(ms / (1000 * 60 * 60));
                        const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
                        return `⏳ ${h}h ${m}min`;
                    };

                    const horasSemComer = Math.floor((agora - new Date(pet.ultimaRefeicao).getTime()) / (1000 * 60 * 60));
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
🍗 Alimentar: ${formatarTempo(pet.cooldowns?.alimentar)}
💆 Carinho: ${formatarTempo(pet.cooldowns?.carinho)}
🎾 Brincar: ${formatarTempo(pet.cooldowns?.brincar)}
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
                return;
            }

            // --- INTERAÇÕES: alimentar, carinho, brincar ---
            const acoesValidas = ['alimentar', 'carinho', 'brincar'];
            if (!acoesValidas.includes(acao)) {
                return await client.sendMessage(chatId, "❓ Ação inválida! Use: *alimentar*, *carinho*, *brincar* ou *status*.");
            }

            // Busca pets vivos
            const pets = await Pet.find({ ownerId: autorId, groupId: chatId, status: 'vivo' });

            if (pets.length === 0) {
                return await client.sendMessage(chatId, "🐾 Você não tem pets ativos!\nUse */adotarpet [tipo] [nome]* para adotar um.");
            }

            // Seleciona o pet
            let pet;
            if (pets.length === 1) {
                pet = pets[0];
            } else {
                if (!parametro) {
                    const lista = pets.map(p => `• *${p.nome}* (${p.tipo})`).join('\n');
                    return await client.sendMessage(chatId, `🐾 Você tem 2 pets! Especifique o nome:\n${lista}\n\n_Exemplo: /pet ${acao} ${pets[0].nome}_`);
                }
                pet = pets.find(p => p.nome.toLowerCase() === parametro.toLowerCase());
                if (!pet) {
                    return await client.sendMessage(chatId, `❌ Pet "${parametro}" não encontrado.`);
                }
            }

            // Verifica cooldown
            const agora = Date.now();
            const cooldownExpira = pet.cooldowns?.[acao] ? new Date(pet.cooldowns[acao]).getTime() : 0;

            if (cooldownExpira > agora) {
                const restante = cooldownExpira - agora;
                const h = Math.floor(restante / (1000 * 60 * 60));
                const m = Math.floor((restante % (1000 * 60 * 60)) / (1000 * 60));
                return await client.sendMessage(chatId, `⏳ *${pet.nome}* ainda não está pronto!\nAguarde: *${h}h ${m}min*`);
            }

            // Calcula EXP e estágio
            const expGanho = EXP_POR_ACAO[acao];
            const novaExp = pet.exp + expGanho;
            let novoEstagio = pet.estagio;
            let subiu = false;

            if (novoEstagio < 4 && novaExp >= EXP_ESTAGIO[novoEstagio - 1]) {
                novoEstagio++;
                subiu = true;
            }

            // Atualiza banco
            const updates = {
                exp: novaExp,
                estagio: novoEstagio,
                [`cooldowns.${acao}`]: new Date(agora + COOLDOWN_MS[acao])
            };
            if (acao === 'alimentar') updates.ultimaRefeicao = new Date();

            await Pet.updateOne({ _id: pet._id }, { $set: updates });

            // Monta mensagem
            const textoAcao = {
                alimentar: `🍗 @${autorId.split('@')[0]} deu uma refeição deliciosa para *${pet.nome}*!`,
                carinho:   `💆 @${autorId.split('@')[0]} fez carinho em *${pet.nome}*!`,
                brincar:   `🎾 @${autorId.split('@')[0]} brincou com *${pet.nome}*!`
            };

            let texto = `${textoAcao[acao]}\n━━━━━━━━━━━━━━━━━━━━━\n✨ *+${expGanho} EXP* → Total: *${novaExp} EXP*`;

            if (subiu) {
                texto += `\n\n🎉 *EVOLUIU!* ${ESTAGIOS[novoEstagio - 1]} → *${ESTAGIOS[novoEstagio]}*!\nSeu pet cresceu! Veja a nova aparência abaixo. 👇`;
            }

            // Envia com imagem
            const tipoSemAcento = pet.tipo.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const imgPath = path.resolve(__dirname, '..', 'assets', `${tipoSemAcento}_${novoEstagio}.jpg`);

            if (fs.existsSync(imgPath)) {
                const media = MessageMedia.fromFilePath(imgPath);
                await client.sendMessage(chatId, media, { caption: texto, mentions: [autorId] });
            } else {
                await client.sendMessage(chatId, texto, { mentions: [autorId] });
            }

        } catch (e) {
            console.error("❌ Erro no /pet:", e);
            await client.sendMessage(chatId, "⚠️ Erro ao interagir com o pet.");
        }
    }
};