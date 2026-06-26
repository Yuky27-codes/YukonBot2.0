module.exports = {
    name: 'banblack',
    async execute(client, msg, { args, chatId, isAdmin, iAmAdmin, chat, User }) {
        if (!isAdmin) return; 
        if (!iAmAdmin) {
            return await client.sendMessage(chatId, "❌ *SISTEMA:* Eu preciso ser Administrador para gerenciar a Blacklist.", { sendSeen: false });
        }

        try {
            let targets = new Set();
            let motivo = "Não especificado";

            // 1. IDENTIFICAÇÃO DOS ALVOS (Quote, Menções e Números Manuais)
            if (msg.hasQuotedMsg) {
                const quoted = await msg.getQuotedMessage();
                const quotedId = (quoted.author || quoted.from).toString();
                if (quotedId) targets.add(quotedId);
            }

            if (msg.mentionedIds && msg.mentionedIds.length > 0) {
                for (let mention of msg.mentionedIds) {
                    const mId = (mention._serialized || mention).toString();
                    if (mId) targets.add(mId);
                }
            }

            // Junta tudo que foi digitado para processar a busca manual
            const textoCompleto = args.join(' '); 

            // Remove as menções do texto (já que foram capturadas no msg.mentionedIds)
            // O formato nativo da menção vem como @1234567890
            const textoSemMencoes = textoCompleto.replace(/@\d+/g, '').trim();

            // 2. REGEX AVANÇADO: Captura um bloco de números no COMEÇO do texto
            // Aceita: +, números, espaços, hifens e vírgulas.
            const matchBlocoNumeros = textoSemMencoes.match(/^[\+\d\s\-,;]+/); 

            if (matchBlocoNumeros) {
                const blocoSujo = matchBlocoNumeros[0];
                
                // Separamos por vírgulas ou ponto-e-vírgula (Para o Admin inserir vários números formatados em massa)
                const partes = blocoSujo.split(/[,;]/);

                for (let parte of partes) {
                    const cleanNum = parte.replace(/\D/g, ''); // Limpa os espaços e símbolos
                    // Valida se o número tem um tamanho coerente (Evita números bugados gigantes)
                    if (cleanNum.length >= 8 && cleanNum.length <= 20) { 
                        targets.add(`${cleanNum}@c.us`);
                    }
                }

                // O motivo é tudo aquilo que sobrou depois do bloco numérico
                const restoTexto = textoSemMencoes.slice(blocoSujo.length).trim();
                if (restoTexto.length > 0) motivo = restoTexto;

            } else if (textoSemMencoes.length > 0) {
                // Se não houver números inseridos manualmente (ex: o adm só marcou a galera e digitou o motivo)
                motivo = textoSemMencoes;
            }

            const alvosArray = Array.from(targets);

            // Se nenhum alvo for detectado
            if (alvosArray.length === 0) {
                return await client.sendMessage(chatId, "❗ Marque, responda ou digite os números de quem deseja banir permanentemente seguido do motivo.\n\n💡 *Dica de Massa:* Para digitar vários números manualmente, separe-os por *vírgula*.\n*Ex:* `/banblack +55 11 9999-9999, 55 24 8888-8888 motivo`", { sendSeen: false });
            }

            // 3. REGISTRO NO BANCO DE DADOS (Loop de inserção para todos os alvos)
            const promessasBanco = alvosArray.map(targetStr => {
                return User.findOneAndUpdate(
                    { userId: targetStr, groupId: chatId },
                    { $set: { isBlacklisted: true, blacklistReason: motivo } },
                    { upsert: true }
                );
            });

            // Aguarda o banco salvar todos os invasores simultaneamente
            await Promise.all(promessasBanco);

            // 4. REMOVE DO GRUPO IMEDIATAMENTE (Passando a Array de uma vez)
            try {
                await chat.removeParticipants(alvosArray);
            } catch (err) {
                // Ignora erros caso algum usuário específico já tenha saído antes do bot expulsar
            }

            // 5. CONFIRMAÇÃO VISUAL PARA O GRUPO
            let listaAlvosFeedback = alvosArray.map(t => `• @${t.split('@')[0]}`).join('\n');

            const msgFeedback = `🚫 *PROTOCOLO DE EXCLUSÃO COLETIVA* 🚫
━━━━━━━━━━━━━━━━━━━━━
👥 *Alvos Interceptados:*
${listaAlvosFeedback}

💀 *Motivo Coletivo:* ${motivo}

⚠️ Registros adicionados ao banco de dados da Yukon Station. O retorno destes números está permanentemente bloqueado.
━━━━━━━━━━━━━━━━━━━━━`;

            await client.sendMessage(chatId, msgFeedback, {
                mentions: alvosArray, 
                sendSeen: false
            });

        } catch (e) {
            console.error("❌ ERRO NO BANBLACK:", e.message);
            await client.sendMessage(chatId, "⚠️ Erro crítico ao processar o banimento em massa.", { sendSeen: false });
        }
    }
};