// Configuração dos níveis de advertência
const NIVEIS = {
    1: { nome: 'Leve', emoji: '🟡', limite: 5 },
    2: { nome: 'Moderada', emoji: '🟠', limite: 3 },
    3: { nome: 'Pesada', emoji: '🔴', limite: 3 } // ao bater o limite, bane o membro
};

// Aceita o nível digitado como número ("1") ou por nome ("leve", "moderada", etc.)
function parseNivel(token) {
    const t = (token || '').toLowerCase().trim();
    if (t === '1' || t === 'leve') return 1;
    if (t === '2' || t === 'moderado' || t === 'moderada') return 2;
    if (t === '3' || t === 'pesado' || t === 'pesada') return 3;
    return null;
}

module.exports = {
    name: 'adv',
    async execute(client, msg, { args, chatId, senderRaw, isAdmin, User, iAmAdmin }) {
        try {
            // 1. Verificação de Permissão (Somente Admins do Bot/Projeto)
            if (!isAdmin) {
                return msg.reply("❌ Você não tem permissão para usar este comando de moderação.");
            }

            const chat = await msg.getChat();
            if (!chat.isGroup) return msg.reply("Este comando só pode ser usado em grupos.");

            // 2. Identificação do nível (primeiro argumento, obrigatório)
            const nivel = parseNivel(args[0]);
            if (!nivel) {
                return msg.reply(
                    "❗ Formato correto: */adv [nível] [@pessoa ou responda] [motivo]*\n\n" +
                    "📋 *Níveis disponíveis:*\n" +
                    "🟡 *1* ou *leve*\n" +
                    "🟠 *2* ou *moderada*\n" +
                    "🔴 *3* ou *pesada*\n\n" +
                    "_Exemplo: /adv 1 @fulano spam no grupo_"
                );
            }

            let targetAdv;
            let motivoArgs = args.slice(1); // tudo depois do nível, por padrão vira o motivo

            // 3. Identificação do Alvo (por Resposta ou Menção)
            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                targetAdv = (quoted.author || quoted.from)._serialized || (quoted.author || quoted.from).toString();
            } else if (msg.mentionedIds.length > 0) {
                targetAdv = msg.mentionedIds[0]._serialized || msg.mentionedIds[0].toString();
                // Se o alvo foi marcado com @, o texto da menção pode vir junto nos args
                // (ex: "1 @fulano spam no grupo") — filtramos isso pra não virar parte do motivo.
                motivoArgs = motivoArgs.filter(a => !a.startsWith('@'));
            }

            if (!targetAdv) {
                return msg.reply("❗ Marque ou responda a mensagem de quem você deseja dar advertência.");
            }

            const targetStr = String(targetAdv).trim();
            const autorId = String(senderRaw).trim();
            const motivo = motivoArgs.join(' ').trim() || 'Motivo não especificado';

            // 4. Busca o estado atual dos 3 níveis do usuário
            let userDb = await User.findOne({ userId: targetStr, groupId: chatId }).lean();
            const atual = {
                1: userDb?.advsNivel1 || 0,
                2: userDb?.advsNivel2 || 0,
                3: userDb?.advsNivel3 || 0
            };

            // 5. Aplica a advertência no nível escolhido
            atual[nivel]++;

            // 6. Cascata: se o nível bater o limite, converte pro próximo (e reconfere o próximo também)
            const conversoes = [];
            let banido = false;
            let nivelChecando = nivel;

            while (nivelChecando <= 3) {
                if (atual[nivelChecando] >= NIVEIS[nivelChecando].limite) {
                    if (nivelChecando === 3) {
                        banido = true;
                        atual[3] = 0; // reseta ao bater o limite, mesmo banindo
                        break;
                    } else {
                        atual[nivelChecando] = 0; // reseta o nível que bateu o limite
                        atual[nivelChecando + 1]++; // sobe uma advertência pro próximo nível
                        conversoes.push({ de: nivelChecando, para: nivelChecando + 1 });
                        nivelChecando++; // continua checando o novo nível (cascata)
                    }
                } else {
                    break;
                }
            }

            // 7. Grava no banco: contadores finais + histórico com o motivo e o nível aplicado
            await User.findOneAndUpdate(
                { userId: targetStr, groupId: chatId },
                {
                    $set: {
                        advsNivel1: atual[1],
                        advsNivel2: atual[2],
                        advsNivel3: atual[3]
                    },
                    $push: {
                        advHistory: {
                            motivo,
                            appliedBy: autorId,
                            date: new Date(),
                            nivel
                        }
                    }
                },
                { upsert: true }
            );

            // 8. Monta a mensagem de resposta
            const { emoji, nome } = NIVEIS[nivel];
            let texto = `${emoji} @${targetStr.split('@')[0]} recebeu uma advertência *${nome.toUpperCase()}*!\n📋 *Motivo:* ${motivo}`;

            conversoes.forEach(c => {
                texto += `\n\n🔺 *${NIVEIS[c.de].nome}* atingiu o limite (${NIVEIS[c.de].limite}/${NIVEIS[c.de].limite}) e foi convertida em *${NIVEIS[c.para].nome}*!`;
            });

            if (!banido) {
                texto += `\n\n📊 *Status atual:*\n🟡 Leve: ${atual[1]}/${NIVEIS[1].limite}\n🟠 Moderada: ${atual[2]}/${NIVEIS[2].limite}\n🔴 Pesada: ${atual[3]}/${NIVEIS[3].limite}`;
            }

            await client.sendMessage(chatId, texto, { mentions: [targetStr] });

            // 9. Se bateu o limite da Pesada, aplica a ejeção
            if (banido) {
                await client.sendMessage(
                    chatId,
                    `🚫 @${targetStr.split('@')[0]} atingiu o limite de advertências *Pesadas* e será ejetado da Yukon!\n📋 *Último motivo:* ${motivo}`,
                    { mentions: [targetStr] }
                );

                if (iAmAdmin) {
                    try {
                        await chat.removeParticipants([targetStr]);
                    } catch (e) {
                        await msg.reply("⚠️ Não consegui remover o usuário. Verifique se o bot ainda é admin.");
                    }
                } else {
                    await msg.reply("⚠️ O usuário atingiu o limite, mas não sou admin para removê-lo.");
                }
            }

        } catch (err) {
            console.error("❌ ERRO NO COMANDO ADV:", err);
            await msg.reply("⚠️ Erro ao processar a advertência.");
        }
    }
};