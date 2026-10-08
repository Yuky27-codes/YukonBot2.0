// Ações pedidas pelo painel do fundador (fila bot_commands), com a mesma lógica dos comandos do WhatsApp:
//   leave_group   = /sairgrupo [ID@g.us]
//   set_owner     = /dono [ID_do_dono] [ID_do_grupo]
//   transfer_plan = /transferirplano [ID_ANTIGO] [ID_NOVO]
// Cada função devolve um texto curto de resultado (gravado em bot_commands.resultado) ou lança erro com a explicação.

const mongoose = require('mongoose');

// Aceita ID completo (…@c.us / …@lid) ou só o número; com só o número, pergunta ao WhatsApp o formato certo
async function resolverContato(client, entrada) {
    const valor = String(entrada || '').trim();
    if (!valor) throw new Error('Informe o número ou o ID do contato');
    if (valor.includes('@')) return valor;
    const numero = valor.replace(/\D/g, '');
    if (numero.length < 10) throw new Error(`Número inválido: ${valor}`);
    const info = await client.getNumberId(numero);
    if (!info) throw new Error(`O número ${numero} não foi encontrado no WhatsApp`);
    return info._serialized;
}

function normalizarGrupo(entrada) {
    const valor = String(entrada || '').trim();
    const match = valor.match(/[\d-]+/);
    if (!match) throw new Error('ID do grupo inválido');
    return `${match[0]}@g.us`;
}

// /sairgrupo: a Yukon sai do grupo, a licença é bloqueada, os usuários do grupo são apagados e o grupo sai do perfil do cliente
async function sairDoGrupo(client, grupoEntrada) {
    const idGrupo = normalizarGrupo(grupoEntrada);
    const AuthorizedGroup = mongoose.model('AuthorizedGroup');
    const UserProfile = mongoose.model('UserProfile');
    const User = mongoose.model('User');

    let saiu = true;
    try {
        const chat = await client.getChatById(idGrupo);
        await chat.leave();
    } catch (e) {
        saiu = false;
        console.error('⚠️ [Painel/sairgrupo] Não conseguiu sair do grupo:', e.message);
    }
    await AuthorizedGroup.updateOne({ groupId: idGrupo }, { $set: { isAuthorized: false, expiresAt: new Date(0) } });
    const totalUsers = await User.countDocuments({ groupId: idGrupo });
    await User.deleteMany({ groupId: idGrupo });
    const dono = await UserProfile.findOne({ gruposVinculados: idGrupo });
    if (dono) await UserProfile.updateOne({ userId: dono.userId }, { $pull: { gruposVinculados: idGrupo } });

    return `${saiu ? 'Yukon saiu do grupo' : 'Não consegui sair (talvez já tivesse saído)'} · licença bloqueada · ${totalUsers} usuário(s) apagado(s)${dono ? ' · removido do perfil do cliente' : ''}`;
}

// /dono: define quem é o dono do grupo (quem pode gerar o /codigo) e dá BotAdmin a ele no grupo
async function definirDono(client, donoEntrada, grupoEntrada) {
    const grupoId = normalizarGrupo(grupoEntrada);
    const donoId = await resolverContato(client, donoEntrada);
    const AuthorizedGroup = mongoose.model('AuthorizedGroup');
    const User = mongoose.model('User');

    const auth = await AuthorizedGroup.findOneAndUpdate({ groupId: grupoId }, { $set: { authorizedBy: donoId } }, { returnDocument: 'after' });
    if (!auth) throw new Error(`O grupo ${grupoId} não está na base de licenças`);
    await User.updateOne({ userId: donoId, groupId: grupoId }, { $set: { isBotAdmin: true } }, { upsert: true });
    return `Dono do grupo agora é ${donoId.split('@')[0]} (BotAdmin atribuído)`;
}

// /transferirplano: o perfil do cliente (plano, validade, grupos) passa para o número novo; nada é apagado
async function transferirPlano(client, antigoEntrada, novoEntrada) {
    const UserProfile = mongoose.model('UserProfile');
    const antigo = String(antigoEntrada || '').trim();
    if (!antigo) throw new Error('Informe o número ou ID antigo');

    let perfil = antigo.includes('@')
        ? await UserProfile.findOne({ userId: antigo })
        : await UserProfile.findOne({ userId: new RegExp(`^${antigo.replace(/\D/g, '')}@`) });
    if (!perfil) throw new Error(`Nenhum perfil encontrado para ${antigo}`);

    const idNovo = await resolverContato(client, novoEntrada);
    if (idNovo === perfil.userId) throw new Error('Os dois números são iguais');
    if (await UserProfile.findOne({ userId: idNovo })) {
        throw new Error(`Já existe um perfil com o número novo (${idNovo.split('@')[0]}). Não faço fusão automática.`);
    }
    const grupos = (perfil.gruposVinculados || []).length;
    const idAntigo = perfil.userId;
    perfil.userId = idNovo;
    await perfil.save();
    return `Plano transferido de ${idAntigo.split('@')[0]} para ${idNovo.split('@')[0]} · ${grupos} grupo(s) vinculado(s) mantido(s)`;
}

module.exports = { sairDoGrupo, definirDono, transferirPlano };
