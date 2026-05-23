module.exports = {
    name: 'encontro',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const mencoes = msg.mentionedIds;

            if (mencoes.length < 2) {
                return await client.sendMessage(chatId, "❓ *COMO USAR:* `/encontro @pessoa1 @pessoa2`\nMarque duas pessoas para simular o encontro!");
            }

            const pessoa1Id = String(mencoes[0]._serialized || mencoes[0]).trim();
            const pessoa2Id = String(mencoes[1]._serialized || mencoes[1]).trim();

            if (pessoa1Id === pessoa2Id) {
                return await client.sendMessage(chatId, "❓ Marque duas pessoas diferentes!");
            }

            // Locais possíveis
            const locais = [
                { nome: "Restaurante Romântico 🍷", clima: "Romântico" },
                { nome: "Parque ao Pôr do Sol 🌅", clima: "Romântico" },
                { nome: "Cinema 🎬", clima: "Amigável" },
                { nome: "Parque de Diversões 🎡", clima: "Divertido" },
                { nome: "Praia 🏖️", clima: "Descontraído" },
                { nome: "Café Charmoso ☕", clima: "Amigável" },
                { nome: "Show de Música 🎵", clima: "Animado" },
                { nome: "Museu 🏛️", clima: "Cultural" },
                { nome: "Jantar à Luz de Velas 🕯️", clima: "Romântico" },
                { nome: "Boliche 🎳", clima: "Divertido" },
                { nome: "Piquenique no Jardim 🧺", clima: "Romântico" },
                { nome: "Karaokê 🎤", clima: "Animado" },
                { nome: "Exposição de Arte 🎨", clima: "Cultural" },
                { nome: "Passeio de Barco 🚤", clima: "Aventureiro" },
                { nome: "Festival de Comida 🍜", clima: "Descontraído" },
            ];

            // Situações de fracasso
            const fracassos = [
                "Um ex apareceu do nada! 😱",
                "Alguém chegou 2 horas atrasado! ⏰",
                "A conta do restaurante veio errada! 💸",
                "Ficou preso no trânsito por 3 horas! 🚗",
                "O celular tocou na hora mais errada! 📱",
                "Derramou a bebida na roupa! 🥤",
                "Esqueceu a carteira em casa! 👛",
                "O carro quebrou no meio do caminho! 🚘",
                "Começou a chover torrencialmente! 🌧️",
                "Confundiu o endereço e foi ao lugar errado! 🗺️",
                "O restaurante estava fechado! 🚫",
                "Tropeçou na entrada do local! 🤕",
                "O pedido demorou 2 horas para chegar! ⏳",
                "Ligaram do trabalho no pior momento! 📞",
                "Um amigo intrometido apareceu! 🙋",
                "O filme que queriam assistir esgotou! 🎬",
                "O cachorro do vizinho destruiu tudo! 🐕",
                "A internet caiu bem na hora! 📡",
                "Começou a granizar do nada! ⛈️",
                "Encontrou um conhecido falante que não parou de falar! 🗣️",
            ];

            const local = locais[Math.floor(Math.random() * locais.length)];
            const fracasso = fracassos[Math.floor(Math.random() * fracassos.length)];

            // Compatibilidade usando seed igual ao /ship
            const hoje = new Date().toDateString();
            const seed = pessoa1Id + pessoa2Id + hoje;
            let base = 0;
            for (let i = 0; i < seed.length; i++) {
                base = (base + seed.charCodeAt(i)) % 101;
            }

            // Bônus de amizade
            const data1 = await User.findOne({ userId: pessoa1Id, groupId: chatId }).lean();
            const chave2 = pessoa2Id.replace(/\D/g, '');
            const bonusAmizade = (data1?.friends?.[chave2]) ? Math.floor(data1.friends[chave2] / 2) : 0;
            const compatibilidade = Math.min(base + bonusAmizade, 100);

            // Chance de fracasso (inverso da compatibilidade)
            const chanceFracasso = Math.max(5, 100 - compatibilidade);

            // Barra de compatibilidade
            const cheios = Math.round(compatibilidade / 10);
            const barra = "❤️".repeat(cheios) + "🖤".repeat(10 - cheios);

            // Veredito
            let veredito = "";
            if (compatibilidade >= 90) veredito = "💍 *ALMAS GÊMEAS!* Esse encontro vai mudar tudo!";
            else if (compatibilidade >= 70) veredito = "🔥 *ÓTIMA QUÍMICA!* Tem tudo para dar certo!";
            else if (compatibilidade >= 50) veredito = "💛 *BOA VIBE!* Vale a pena investir!";
            else if (compatibilidade >= 30) veredito = "🤔 *INDEFINIDO...* Precisa de mais tempo!";
            else veredito = "❄️ *CLIMA FRIO...* Vai ser difícil!";

            // Aconteceu o fracasso?
            const fracassou = Math.random() * 100 < chanceFracasso;

            const texto = `💘 *ENCONTRO YUKON*
━━━━━━━━━━━━━━━━━━━━━
@${pessoa1Id.split('@')[0]} encontrou @${pessoa2Id.split('@')[0]}

📍 *Local:* ${local.nome}
🌡️ *Clima:* ${local.clima}

💞 *Compatibilidade:* ${compatibilidade}%
[${barra}]

${veredito}

⚠️ *Chance de fracasso:* ${chanceFracasso}%
${fracassou ? `😬 *ACONTECEU:* ${fracasso}` : `✅ *Tudo correu bem! Nenhum imprevisto!* 🎉`}
━━━━━━━━━━━━━━━━━━━━━`;

            await client.sendMessage(chatId, texto, {
                mentions: [pessoa1Id, pessoa2Id]
            });

        } catch (e) {
            console.error("❌ Erro no /encontro:", e);
            await client.sendMessage(chatId, "⚠️ Erro ao simular o encontro.");
        }
    }
};