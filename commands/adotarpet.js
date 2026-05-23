module.exports = {
    name: 'adotarpet',
    async execute(client, msg, { chatId, senderRaw, args, Pet }) {
        try {
            const autorId = String(senderRaw).trim();

            const tiposValidos = ['cachorro', 'coelho', 'raposa', 'coruja', 'panda', 'gato', 'hamster', 'tartaruga', 'lobo', 'dragão'];
            const tipo = args[0]?.toLowerCase();
            const nome = args.slice(1).join(' ').trim();

            if (!tipo || !tiposValidos.includes(tipo)) {
                return await client.sendMessage(chatId, `🐾 *ADOÇÃO DE PETS — YUKON*\n\nEscolha um tipo válido:\n${tiposValidos.map(t => `• ${t}`).join('\n')}\n\n*Como usar:* /adotarpet [tipo] [nome]\n_Exemplo: /adotarpet gato Bolinha_`);
            }

            if (!nome) {
                return await client.sendMessage(chatId, "❌ Dê um nome ao seu pet!\n_Exemplo: /adotarpet gato Bolinha_");
            }

            if (nome.length > 20) {
                return await client.sendMessage(chatId, "❌ O nome do pet deve ter no máximo 20 caracteres.");
            }

            // Verifica pets ativos do usuário
            const petsAtivos = await Pet.find({ 
                ownerId: autorId, 
                groupId: chatId, 
                status: 'vivo' 
            });

            if (petsAtivos.length >= 2) {
                return await client.sendMessage(chatId, "🐾 Você já tem 2 pets ativos! Não é possível adotar mais.");
            }

            // Verifica punição por morte de pet
            const petMortoRecente = await Pet.findOne({
                ownerId: autorId,
                groupId: chatId,
                status: 'morto',
                diedAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
            });

            if (petMortoRecente) {
                const diasRestantes = Math.ceil((petMortoRecente.diedAt.getTime() + 14 * 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
                return await client.sendMessage(chatId, `😢 Você perdeu um pet recentemente.\nPrecisa aguardar *${diasRestantes} dia(s)* para adotar novamente.`);
            }

            // Cria o pet
            const novoPet = await Pet.create({
                ownerId: autorId,
                groupId: chatId,
                nome: nome,
                tipo: tipo,
                exp: 0,
                estagio: 1, // 1=criança, 2=adolescente, 3=adulto, 4=max
                status: 'vivo',
                ultimaRefeicao: new Date(),
                cooldowns: {
                    alimentar: null,
                    carinho: null,
                    brincar: null
                }
            });

            // Envia imagem do estágio 1
            const { MessageMedia } = require('whatsapp-web.js');
            const path = require('path');
            const fs = require('fs');
            const tipoSemAcento = tipo.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const imgPath = path.resolve(__dirname, '..', 'assets', `${tipoSemAcento}_1.jpg`);

            const texto = `🐾 *ADOÇÃO CONCLUÍDA — YUKON*\n━━━━━━━━━━━━━━━━━━━━━\n👤 Dono: @${autorId.split('@')[0]}\n🐾 Pet: *${nome}*\n🦊 Tipo: ${tipo}\n⭐ Estágio: Criança\n📊 EXP: 0\n━━━━━━━━━━━━━━━━━━━━━\n_Use /pet status para ver seu pet e /pet alimentar, /pet carinho e /pet brincar para interagir!_`;

            if (fs.existsSync(imgPath)) {
                const media = MessageMedia.fromFilePath(imgPath);
                await client.sendMessage(chatId, media, { caption: texto, mentions: [autorId] });
            } else {
                await client.sendMessage(chatId, texto, { mentions: [autorId] });
            }

        } catch (e) {
            console.error("❌ Erro no adotarpet:", e);
            await client.sendMessage(chatId, "⚠️ Erro ao processar adoção.");
        }
    }
};