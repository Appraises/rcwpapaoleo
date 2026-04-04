// server/utils/MessageVariation.js
// Provides randomized message fragments to avoid WhatsApp detection of repeated templates.
// Each function returns a randomly chosen variant of a given message element.

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Dispatch (roteiro) ───────────────────────────────────────────────

const dispatchGreetings = [
    (name) => `Olá, *${name}*! Segue o roteiro de hoje:`,
    (name) => `Bom dia, *${name}*! Aqui está o roteiro do dia:`,
    (name) => `E aí, *${name}*! Separei o roteiro de hoje pra você:`,
    (name) => `Fala, *${name}*! Seu roteiro de coleta está pronto:`,
    (name) => `Oi, *${name}*! Confira o roteiro de hoje:`,
    (name) => `Bom dia, *${name}*! Já tá pronto o roteiro:`,
    (name) => `Salve, *${name}*! Montei sua rota de hoje:`,
    (name) => `Fala, *${name}*! Já saiu o roteiro do dia:`,
    (name) => `Bom dia, *${name}*! Dá uma olhada na rota de hoje:`,
    (name) => `Oi, *${name}*! Tá aqui o roteiro programado pra hoje:`,
];

const dispatchHeaders = [
    (date) => `🛢️ *Roteiro de Coleta — ${date}*`,
    (date) => `📋 *Rota do Dia — ${date}*`,
    (date) => `🚛 *Coletas Programadas — ${date}*`,
    (date) => `♻️ *Roteiro ${date}*`,
    (date) => `📍 *Coletas de Hoje — ${date}*`,
    (date) => `🗺️ *Rota de Coleta — ${date}*`,
    (date) => `🛢️ *Coletas do Dia — ${date}*`,
    (date) => `📋 *Programação de Coleta — ${date}*`,
];

const dispatchDistanceLabels = [
    (km) => `📏 Distância total estimada: *${km} km*`,
    (km) => `🗺️ Percurso estimado: *${km} km*`,
    (km) => `📐 Trajeto total aprox.: *${km} km*`,
    (km) => `🛣️ Distância estimada da rota: *${km} km*`,
    (km) => `📏 Percurso total da rota: *${km} km*`,
    (km) => `🗺️ Km estimados hoje: *${km} km*`,
    (km) => `🛣️ Total do trajeto: aprox. *${km} km*`,
];

const dispatchGoogleLabels = [
    '🗺️ *Abrir rota no Google Maps:*',
    '🗺️ *Ver rota completa no Maps:*',
    '📍 *Google Maps — rota completa:*',
    '🗺️ *Navegar pelo Google Maps:*',
    '📍 *Seguir rota no Maps:*',
    '🗺️ *Rota pelo Google Maps:*',
];

const dispatchWazeLabels = [
    '🔵 *Abrir no Waze (1ª parada):*',
    '🔵 *Navegar pelo Waze:*',
    '🔵 *Waze — ir pra 1ª parada:*',
    '🔵 *Iniciar navegação no Waze:*',
    '🔵 *Waze — primeira parada:*',
    '🔵 *Ir pelo Waze:*',
];

const dispatchClosings = [
    'Bom trabalho! ♻️💚',
    'Boa coleta! 💪🛢️',
    'Manda ver! ♻️🚛',
    'Boa sorte na rota! 💚',
    'Vamos nessa! ♻️💪',
    'Bora pra cima! 🛢️💚',
    'Conta com a gente! ♻️',
    'Sucesso na rota! 💪💚',
    'Vai com tudo! 💚🛢️',
];

// ─── Completion (confirmação pro coletor) ─────────────────────────────

const completionAllDone = [
    (name, count) => `✅ Perfeito, ${name}! Todas as ${count} coletas foram registradas como concluídas.\n\nBom descanso! 💚♻️`,
    (name, count) => `✅ Show, ${name}! As ${count} coletas do dia foram finalizadas com sucesso.\n\nDescanse bem! 🛢️💚`,
    (name, count) => `✅ Maravilha, ${name}! ${count} coletas concluídas — tudo registrado.\n\nAté amanhã! ♻️💪`,
    (name, count) => `✅ Boa, ${name}! Registrado: ${count} coleta(s) feita(s) hoje.\n\nValeu pelo trabalho! 💚🛢️`,
    (name, count) => `✅ Fechado, ${name}! Todas as ${count} coletas do dia anotadas.\n\nBom descanso! ♻️`,
    (name, count) => `✅ Mandou bem, ${name}! ${count} coleta(s) encerrada(s) com sucesso.\n\nDescansa que amanhã tem mais! 💪`,
    (name, count) => `✅ Beleza, ${name}! Tudo certo com as ${count} coletas do dia.\n\nValeu demais! 💚`,
    (name, count) => `✅ Top, ${name}! Finalizei ${count} coleta(s) no sistema.\n\nBom descanso! ♻️🛢️`,
];

const completionPartial = [
    (name, done, left) => `✅ Registrado, ${name}!\n\n• *${done}* coleta(s) concluída(s)\n• *${left}* coleta(s) ficaram para o próximo dia (com prioridade)\n\nBom descanso! 💚♻️`,
    (name, done, left) => `✅ Anotado, ${name}!\n\n• *${done}* concluída(s) ✔️\n• *${left}* voltaram pra fila de amanhã (prioridade alta)\n\nDescanse bem! 🛢️`,
    (name, done, left) => `✅ Tudo certo, ${name}!\n\n• *${done}* coleta(s) feita(s)\n• *${left}* reagendada(s) com prioridade pro próximo dia\n\nValeu! ♻️💪`,
    (name, done, left) => `✅ Ok, ${name}!\n\n• Concluídas: *${done}*\n• Para amanhã (prioridade): *${left}*\n\nBom descanso! 💚`,
    (name, done, left) => `✅ Fechado, ${name}!\n\n• *${done}* coleta(s) registrada(s) ✔️\n• *${left}* vai(vão) pra amanhã com prioridade\n\nDescanse bem! ♻️`,
    (name, done, left) => `✅ Beleza, ${name}!\n\n• Feitas hoje: *${done}*\n• Ficaram pendentes: *${left}* (prioridade amanhã)\n\nValeu pelo esforço! 💪💚`,
    (name, done, left) => `✅ Registrei tudo, ${name}!\n\n• *${done}* coleta(s) encerrada(s)\n• *${left}* ficou(aram) pra próxima rota, com prioridade\n\nBom descanso! 🛢️♻️`,
];

const completionLitersReport = [
    (name, count, liters, left) => `✅ Perfeito, ${name}! Registrado:\n\n• *${count}* coleta(s) — *${liters}L* no total${left > 0 ? `\n• *${left}* ficou(aram) para amanhã (prioridade)` : ''}\n\nBom descanso! 💚♻️`,
    (name, count, liters, left) => `✅ Show, ${name}! Anotei tudo:\n\n• *${count}* ponto(s) coletado(s) — total de *${liters}L*${left > 0 ? `\n• *${left}* voltou(aram) pra fila de amanhã` : ''}\n\nValeu pelo trabalho! 🛢️💚`,
    (name, count, liters, left) => `✅ Registrado, ${name}!\n\n• Coletas: *${count}*\n• Volume total: *${liters}L*${left > 0 ? `\n• Pendentes p/ amanhã: *${left}*` : ''}\n\nDescanse bem! ♻️💪`,
    (name, count, liters, left) => `✅ Boa, ${name}! Tudo certinho:\n\n• *${count}* parada(s) coletada(s) — *${liters}L* ao todo${left > 0 ? `\n• *${left}* ficou(aram) pra próxima rota` : ''}\n\nValeu demais! 💚`,
    (name, count, liters, left) => `✅ Fechado, ${name}! Já anotei:\n\n• *${count}* coleta(s) feita(s)\n• Total: *${liters}L*${left > 0 ? `\n• Pendência(s): *${left}* (prioridade amanhã)` : ''}\n\nBom descanso! ♻️🛢️`,
    (name, count, liters, left) => `✅ Beleza, ${name}! Registrei no sistema:\n\n• Pontos coletados: *${count}*\n• Litros totais: *${liters}L*${left > 0 ? `\n• Reagendados: *${left}*` : ''}\n\nDescanse! 💪💚`,
    (name, count, liters, left) => `✅ Top, ${name}! Tudo registrado:\n\n• *${count}* coleta(s) — *${liters}L* total${left > 0 ? `\n• *${left}* ponto(s) pendente(s) p/ amanhã` : ''}\n\nBom trabalho! 🛢️♻️`,
];

// ─── Owner Report ─────────────────────────────────────────────────────

const ownerReportHeaders = [
    (date) => `📊 *Relatório de Coleta — ${date}*`,
    (date) => `📋 *Resumo do Dia — ${date}*`,
    (date) => `🛢️ *Resultado das Coletas — ${date}*`,
    (date) => `📊 *Fechamento do Dia — ${date}*`,
    (date) => `📋 *Relatório Diário — ${date}*`,
    (date) => `📊 *Balanço das Coletas — ${date}*`,
    (date) => `📋 *Coletas Finalizadas — ${date}*`,
];

const ownerCollectorLabels = [
    (name) => `Coletador: *${name}*`,
    (name) => `Responsável: *${name}*`,
    (name) => `Coletor do dia: *${name}*`,
    (name) => `Feito por: *${name}*`,
    (name) => `Motorista: *${name}*`,
    (name) => `Executado por: *${name}*`,
    (name) => `Equipe: *${name}*`,
];

const ownerCompletedLabels = [
    (count) => `✅ *Coletados (${count}):*`,
    (count) => `✅ *Concluídos (${count}):*`,
    (count) => `✅ *Finalizados (${count}):*`,
    (count) => `✅ *Coletas feitas (${count}):*`,
    (count) => `✅ *Recolhidos (${count}):*`,
    (count) => `✅ *Pontos atendidos (${count}):*`,
];

const ownerPendingLabels = [
    (count) => `⏳ *Não coletados — ficaram pro próximo dia (${count}):*`,
    (count) => `⏳ *Pendentes — reagendados com prioridade (${count}):*`,
    (count) => `⏳ *Ficaram pra amanhã (${count}):*`,
    (count) => `⏳ *Não finalizados — voltaram pra fila (${count}):*`,
    (count) => `⏳ *Adiados para próxima rota (${count}):*`,
    (count) => `⏳ *Sem coleta hoje — priorizados amanhã (${count}):*`,
];

const ownerAllDoneMessages = [
    '🎉 Todas as coletas do dia foram concluídas!',
    '🎉 Dia 100%! Tudo coletado com sucesso.',
    '🎉 Nenhuma pendência — rota concluída por completo!',
    '🎉 Excelente! Todas as paradas foram atendidas.',
    '🎉 Rota finalizada sem pendências!',
    '🎉 Dia perfeito! Tudo coletado.',
    '🎉 100% concluído — zero pendência hoje!',
];

const ownerPendingWarnings = [
    (count) => `⚠️ ${count} coleta(s) pendente(s) com prioridade para amanhã.`,
    (count) => `⚠️ ${count} ponto(s) ficaram sem coleta — terão prioridade amanhã.`,
    (count) => `⚠️ Atenção: ${count} coleta(s) reagendada(s) para o próximo dia.`,
    (count) => `⚠️ ${count} local(is) não coletado(s), já ficou com prioridade pra amanhã.`,
    (count) => `⚠️ ${count} ponto(s) não atendido(s) — já com prioridade na próxima rota.`,
    (count) => `⚠️ Ficaram ${count} coleta(s) pendente(s). Priorizadas para amanhã.`,
];

// ─── Unknown message reply ────────────────────────────────────────────

const unknownMessageReplies = [
    (name) => `Oi, ${name}! Não entendi a mensagem. Para informar as coletas do dia, envie a *quantidade de litros* de cada parada:\n\n1. (litros)\n2. (litros)\n3. (litros)\n\nExemplo: "1. 15\n2. 20\n3. 8"\n\nOu fale com o admin pelo sistema. 🛢️`,
    (name) => `Fala, ${name}! Não consegui entender. Pra registrar as coletas, mande os litros de cada ponto:\n\n1. (litros)\n2. (litros)\n\nExemplo: "1. 12\n2. 25"\n\nQualquer dúvida, fala com o responsável. ♻️`,
    (name) => `Oi ${name}! Não entendi essa mensagem. Você pode enviar os litros coletados de cada parada assim:\n\n1. 15\n2. 20\n3. 8\n\nAssim consigo registrar certinho! 🛢️`,
    (name) => `E aí, ${name}! Não captei o que quis dizer. Pra fechar o dia, mande a lista de litros:\n\n1. (litros)\n2. (litros)\n\nEx: "1. 10\n2. 30"\n\nSe precisar de ajuda, chama o admin! 💚`,
    (name) => `${name}, não entendi a mensagem. Pra registrar a coleta, preciso dos litros de cada parada:\n\n1. (litros)\n2. (litros)\n\nExemplo: "1. 20\n2. 15\n3. 10"\n\nQualquer coisa, fale com o responsável. ♻️`,
    (name) => `Oi, ${name}! Não consegui interpretar. Envia pra mim os litros de cada ponto assim:\n\n1. 15\n2. 20\n\nQue eu registro tudo certinho! 🛢️💚`,
    (name) => `Fala, ${name}! Essa mensagem não ficou clara pra mim. Pra fechar as coletas, me mande:\n\n1. (litros)\n2. (litros)\n3. (litros)\n\nExemplo: "1. 18\n2. 22"\n\nOu entre em contato com o admin. ♻️`,
];

const noDispatchReplies = [
    (name) => `Não encontrei solicitações despachadas pra hoje, ${name}. Pode ser que já tenham sido encerradas. 👍`,
    (name) => `Oi, ${name}! Parece que não tem coletas em aberto no momento. Talvez já foram fechadas. ✅`,
    (name) => `${name}, não achei nenhuma rota aberta pra hoje. Já pode ter sido encerrada! 👍`,
    (name) => `Fala, ${name}! Sem coletas pendentes no sistema agora. Se já encerrou, tá tudo certo! ✅`,
    (name) => `Oi, ${name}! Parece que já não tem nada pendente pra hoje. Qualquer coisa, fale com o admin. 👍`,
    (name) => `${name}, não tem nenhuma coleta em aberto no momento. Pode ser que já tenha sido finalizada. ✅`,
];

// ─── Churn / Recurrence (Lembra do cliente atrasado) ────────────────────

const churnReminders = [
    (name) => `Olá, ${name}! ♻️ Tudo bem?\n\nNotamos que já faz um tempinho desde a sua última coleta de óleo conosco.\n\nLembra de avisar a gente quando a sua bombona estiver cheia para agendarmos a retirada! A equipe Cat Óleo agradece a sua parceria continuada. 🌱`,
    (name) => `Oi, ${name}! Tudo joia? 🛢️\n\nVimos que já passou da data da nossa última rota por aí.\n\nAssim que o seu óleo estiver pronto para retirada, manda uma mensagem aqui pra nós solicitando uma nova coleta, por favor! Faz toda a diferença. 💚`,
    (name) => `Bom dia, ${name}! 🌿 Passando pra lembrar da sua coleta de óleo!\n\nDe acordo com nossos registros, já faz um tempinho do último contato.\nQuando precisar desocupar seu espaço, só avisar que mandamos um coletor. Grande abraço! ♻️`,
    (name) => `Olá, ${name}! 💚\n\nSó passando pra fazer um check-in das suas coletas de óleo!\n\nSeu recipiente já está precisando ser esvaziado? Qualquer coisa é só pedir a retirada aqui pelo WhatsApp mesmo. Te esperamos! 🛢️`,
    (name) => `Oi, ${name}! ♻️ Como vai?\n\nEstamos batendo na porta pra relembrar a coleta de óleo usado! Nosso histórico mostra que já passou um pouquinho do prazo.\n\nQuando a bombona ou o balde estiver cheio, só chamar aqui que a gente agenda rapidinho. Valeu pela parceria! 🌱`,
    (name) => `Bom dia, ${name}! 🛢️\n\nPassando só pra dar aquele lembrete amigo: já tem um tempinho que não passamos por aí pra recolher o óleo!\n\nSe tiver acumulado, é só mandar uma mensagem que organizamos a coleta. Contamos com você! 💚`,
    (name) => `Olá, ${name}! 🌿\n\nTudo certo por aí? A gente viu que faz um tempo desde a última vez que passamos.\n\nSe o óleo já estiver precisando ser retirado, chama a gente aqui no WhatsApp! A Cat Óleo agradece sua colaboração sempre! ♻️`,
    (name) => `Oi, ${name}! 💚 Espero que esteja bem!\n\nEstamos acompanhando e percebemos que já faz um tempo da última coleta.\n\nSempre que seu tambor estiver cheio, pode contar com a gente pra retirar! Só manda mensagem aqui. Abraço! 🛢️`,
];

// ─── Dispatch Reminders (Para os clientes da rota do dia) ───────────────

const dispatchReminders = [
    (name) => `Olá, ${name}! ♻️\n\nNossa equipe de coleta acabou de iniciar a rota do dia e passaremos no seu estabelecimento em breve para recolher o óleo! Já pode ir deixando no jeito. Agradecemos! 💚`,
    (name) => `Bom dia, ${name}! 🛢️\n\nSó passando pra avisar que já estamos a caminho pra fazer a sua coleta de óleo de hoje. Daqui a pouquinho nosso coletador chega por aí! 🚛`,
    (name) => `Oi, ${name}! Tudo bem? 🌱\n\nNossa rota de hoje já começou e seu endereço tá na nossa lista de coletas! O coletor já está a caminho, então pode deixar tudo preparado. Obrigado! ♻️`,
    (name) => `Fala, ${name}! 🚚\n\nAvisando que logo mais a gente passa aí pra recolher o óleo, nossa equipe já tá na rua! Valeu pela parceria de sempre! 💚`,
    (name) => `Olá, ${name}! 🛢️\n\nInfomando que nossa equipe já saiu para as coletas de hoje e o seu ponto tá na rota! Deixa o óleo preparado que a gente chega logo. Obrigado! ♻️`,
    (name) => `Bom dia, ${name}! 💚\n\nPassando pra avisar que hoje tem coleta no seu endereço! Nosso coletador já tá se deslocando. Muito obrigado pela parceria! 🚛`,
    (name) => `Oi, ${name}! ♻️\n\nA rota de coleta de hoje já está em andamento e a gente vai passar aí em breve! Pode ir separando o óleo que a equipe já está a caminho. Valeu! 🌱`,
    (name) => `Olá, ${name}! 🚚\n\nHoje é dia de coleta e o seu estabelecimento está na programação! O coletor já saiu e deve chegar em breve. Obrigado por sempre contribuir! 💚`,
    (name) => `Bom dia, ${name}! 🌿\n\nAvisando que a coleta do dia já começou! Nosso time passa no seu local em breve pra retirar o óleo. Valeu demais! ♻️`,
];

// ─── Postponed (Adiado para amanhã) ─────────────────────────────────────

const postponedReminders = [
    (name) => `Olá, ${name}! ♻️\n\nPedimos desculpas, mas nosso coletador teve um imprevisto na rota e não conseguiu chegar até você hoje. Já colocamos a sua coleta como **prioridade máxima** para amanhã, ok? Agradecemos muito a compreensão! 💚`,
    (name) => `Oi, ${name}! 🚚\n\nInfelizmente nosso roteiro atrasou e não conseguimos passar por aí hoje. Mas não se preocupe, sua coleta está com **prioridade amanhã de manhã**. Desculpe o transtorno! 🌱`,
    (name) => `Fala, ${name}! Tudo bem?\n\nPassando pra avisar que não conseguiremos finalizar a rota de hoje até o seu endereço. Porém, a sua coleta foi transferida com exclusividade e **prioridade alta** pro roteiro de amanhã. Valeu pela parceria de sempre! 🛢️♻️`,
    (name) => `Boa tarde, ${name}! 💚\n\nTivemos um pequeno contratempo com as coletas de hoje e a sua acabou ficando pra amanhã. O coletor já tá avisado que você é prioridade da rota! Desculpe qualquer incômodo. 🚛`,
    (name) => `Olá, ${name}! 🌱\n\nInfelizmente hoje não conseguimos chegar até o seu ponto por conta de um imprevisto na rota. Sua coleta ficou como **prioridade número 1** pra amanhã! Pedimos desculpas e agradecemos a paciência. ♻️`,
    (name) => `Oi, ${name}! 🛢️\n\nSentimos muito, mas a rota de hoje não conseguiu cobrir o seu endereço. Já transferimos sua coleta com **prioridade máxima** pro dia seguinte. Desculpe pelo atraso! 💚`,
    (name) => `${name}, boa tarde! ♻️\n\nPassando pra pedir desculpas: nosso coletador não vai conseguir chegar até aí hoje. Mas pode ficar tranquilo(a), já garantimos que amanhã você será **o(a) primeiro(a)** na rota! Valeu pela compreensão. 🚛`,
    (name) => `Olá, ${name}! 💚\n\nInfelizmente tivemos um atraso nas coletas e a sua ficou pro próximo dia. Já deixamos sua coleta com **prioridade** na rota de amanhã! Pedimos desculpas pelo inconveniente. 🌿`,
];

// ─── Ad-Hoc Dispatch (Avisos durante o expediente) ────────────────────────
const adHocAlerts = [
    (address, note) => `🚨 *NOVA SOLICITAÇÃO DE COLETA*\n\n📍 ${address}\n\n${note ? `ℹ️ *Referência:* Se você ainda estiver perto do local da coleta #${note}, seria interessante passar por lá.\n\n` : ''}Se não estiver perto, decida entre deixar pra amanhã ou voltar lá depois!`,
    (address, note) => `🚨 *PEDIDO EXTRA NA ROTA*\n\n📍 ${address}\n\n${note ? `ℹ️ *Dica:* Fica perto da sua parada #${note}.\n\n` : ''}Caso não consiga encaixar hoje, sem problemas, deixamos pra amanhã!`,
    (address, note) => `🚨 *NOVO PONTO ADICIONADO*\n\n📍 ${address}\n\n${note ? `ℹ️ *Ponto original mais próximo:* Parada #${note}.\n\n` : ''}Passe lá se ainda der tempo na rota de hoje!`,
    (address, note) => `🚨 *COLETA EXTRA SOLICITADA*\n\n📍 ${address}\n\n${note ? `ℹ️ *Proximidade:* Fica perto da coleta #${note}.\n\n` : ''}Se der pra encaixar, ótimo! Se não, vai pra amanhã.`,
    (address, note) => `🚨 *PONTO NOVO NA ROTA*\n\n📍 ${address}\n\n${note ? `ℹ️ *Referência:* Próximo à parada #${note}.\n\n` : ''}Dá uma olhada se cabe na rota de hoje!`,
    (address, note) => `🚨 *SOLICITAÇÃO ADICIONAL*\n\n📍 ${address}\n\n${note ? `ℹ️ *Localização:* Perto do ponto #${note}.\n\n` : ''}Veja se consegue passar por lá. Se não, tranquilo, vai pra amanhã!`,
];

// ─── Consolidated List (Relatório das 17h pro coletor) ──────────────────
const consolidatedListHeaders = [
    (date) => `📋 *Resumo Consolidado do Dia — ${date}*\n\nAqui está a lista completa de todas as coletas de hoje. Responda com os *litros coletados* de cada parada:\n\n1. (litros)\n2. (litros)\n...`,
    (date) => `📋 *Lista Final do Dia — ${date}*\n\nPra fechar o dia, mande os litros de cada ponto:\n\n1. (litros)\n2. (litros)\n...`,
    (date) => `📋 *Fechamento Diário — ${date}*\n\nEssa é a rota de hoje. Responda com os litros de cada parada assim:\n1. 15\n2. 20\n3. 8`,
    (date) => `📋 *Consolidado do Dia — ${date}*\n\nSegue a lista de hoje. Mande a quantidade de litros coletados em cada ponto:\n\n1. (litros)\n2. (litros)\n...`,
    (date) => `📋 *Relatório Final — ${date}*\n\nPra encerrar a rota, informe os litros de cada parada:\n\n1. (litros)\n2. (litros)\n\nExemplo: "1. 20\n2. 15"`,
    (date) => `📋 *Resumo de Coletas — ${date}*\n\nHora de fechar! Me mande os litros recolhidos de cada ponto:\n\n1. (litros)\n2. (litros)\n...`,
    (date) => `📋 *Coletas do Dia — ${date}*\n\nEnvie a quantidade de litros coletados por ponto pra registrar:\n\n1. (litros)\n2. (litros)\n3. (litros)`,
];

// ─── Collection Confirmation (resposta ao cliente que pede coleta) ────────
const collectionConfirmations = [
    (name) => `Olá, ${name}! ♻️\n\nSeu pedido de coleta foi registrado pelo nosso assistente virtual.\nNossos coletadores já foram avisados e o seu óleo será recolhido o mais breve possível!\n\nA equipe Cat Óleo agradece a sua colaboração.`,
    (name) => `Oi, ${name}! 🛢️\n\nRecebemos o seu pedido de coleta! Nossa equipe de campo já foi informada e passará por aí em breve para fazer a retirada do óleo.\n\nA Cat Óleo agradece pela parceria! 💚`,
    (name) => `Olá, ${name}! 💚\n\nSua solicitação de coleta foi registrada com sucesso! Os coletores já estão sabendo e em breve passarão no seu estabelecimento.\n\nObrigado por contribuir com a reciclagem! ♻️`,
    (name) => `Oi, ${name}! ♻️\n\nAnotado! Seu pedido de retirada de óleo já tá no sistema. Nossos motoristas já foram notificados e vão passar aí o quanto antes!\n\nA Cat Óleo agradece de coração a colaboração! 🌱`,
    (name) => `Olá, ${name}! 🌿\n\nPedido de coleta salvo! Nossa equipe já foi alertada e o seu óleo será buscado logo logo.\n\nAgradecemos muito a sua contribuição! 💚`,
    (name) => `Oi, ${name}! 🛢️\n\nSua solicitação de recolhimento foi cadastrada! Os coletadores já foram informados e vão passar por aí em breve.\n\nA equipe Cat Óleo é grata pela sua ajuda! ♻️`,
    (name) => `Olá, ${name}! 💚\n\nRecebemos e registramos o seu pedido de coleta. Nosso sistema automático já avisou a equipe de campo, e o seu óleo será coletado rapidinho!\n\nMuito obrigado pela parceria. ♻️`,
    (name) => `Oi, ${name}! 🌱\n\nPronto! Pedido de coleta registrado. O bot já notificou nossos coletores e eles passarão no seu endereço o mais breve possível.\n\nA Cat Óleo agradece a sua contribuição! 🛢️`,
    (name) => `Olá, ${name}! ♻️\n\nSeu pedido de retirada de óleo foi anotado pelo nosso assistente! A equipe de campo já está informada e logo logo recolhe por aí.\n\nAgradecemos a parceria! 💚`,
    (name) => `Oi, ${name}! 🌿\n\nColeta solicitada com sucesso! Nossos motoristas já foram alertados e vão buscar o seu óleo em breve.\n\nValeu por colaborar com o meio ambiente! 🛢️💚`,
];

// ─── Duplicate Collection (cliente que já tem pedido em aberto) ──────────
const duplicateCollectionReplies = [
    (name) => `Olá, ${name}! ♻️\n\nNós já recebemos o seu pedido de coleta recentemente e nossa equipe passará em breve para recolher o seu óleo.\n\nAgradecemos o aviso!`,
    (name) => `Oi, ${name}! 🛢️\n\nSeu pedido de coleta já estava registrado no nosso sistema! Fique tranquilo(a), nossos coletadores já estão programados pra passar aí. 💚`,
    (name) => `Olá, ${name}! 💚\n\nJá temos a sua solicitação de coleta registrada! A equipe de campo foi avisada e passará por aí assim que possível.\n\nObrigado por avisar novamente! ♻️`,
    (name) => `Oi, ${name}! 🌱\n\nRecebemos sua mensagem, mas a boa notícia é que seu pedido de coleta já está no sistema! O coletor vai passar no seu endereço em breve. Valeu! 🛢️`,
    (name) => `Olá, ${name}! ♻️\n\nSua coleta já tá na fila! Recebemos o pedido anteriormente e nossa equipe já foi notificada. Só aguardar que a gente passa aí!\n\nAgradecemos a parceria! 💚`,
    (name) => `Oi, ${name}! 🛢️\n\nTransmitimos o recado, mas o seu pedido de retirada já estava registrado! Pode ficar tranquilo que o coletor vai passar em breve.\n\nValeu! 🌿`,
    (name) => `Olá, ${name}! 💚\n\nNotamos que a sua coleta já havia sido solicitada recentemente. Não se preocupe, a equipe já está programada para recolher o seu óleo!\n\nObrigado pela atenção! ♻️`,
    (name) => `Oi, ${name}! ♻️\n\nPode ficar tranquilo(a)! Já tínhamos o seu pedido registrado e os coletadores já foram avisados. Logo mais passamos por aí!\n\nAgradecemos muito! 🛢️`,
];

// ─── Exports ──────────────────────────────────────────────────────────

module.exports = {
    pick,
    dispatch: {
        greeting: (name) => pick(dispatchGreetings)(name),
        header: (date) => pick(dispatchHeaders)(date),
        distance: (km) => pick(dispatchDistanceLabels)(km),
        googleLabel: () => pick(dispatchGoogleLabels),
        wazeLabel: () => pick(dispatchWazeLabels),
        closing: () => pick(dispatchClosings),
    },
    completion: {
        allDone: (name, count) => pick(completionAllDone)(name, count),
        partial: (name, done, left) => pick(completionPartial)(name, done, left),
        litersReport: (name, count, liters, left) => pick(completionLitersReport)(name, count, liters, left),
        unknownMessage: (name) => pick(unknownMessageReplies)(name),
        noDispatch: (name) => pick(noDispatchReplies)(name),
    },
    ownerReport: {
        header: (date) => pick(ownerReportHeaders)(date),
        collectorLabel: (name) => pick(ownerCollectorLabels)(name),
        completedLabel: (count) => pick(ownerCompletedLabels)(count),
        pendingLabel: (count) => pick(ownerPendingLabels)(count),
        allDone: () => pick(ownerAllDoneMessages),
        pendingWarning: (count) => pick(ownerPendingWarnings)(count),
    },
    churn: {
        reminder: (name) => pick(churnReminders)(name),
    },
    dispatchReminder: {
        notification: (name) => pick(dispatchReminders)(name),
    },
    postponed: {
        apology: (name) => pick(postponedReminders)(name),
    },
    adHoc: {
        alert: (address, note) => pick(adHocAlerts)(address, note),
    },
    consolidated: {
        header: (date) => pick(consolidatedListHeaders)(date),
    },
    collection: {
        confirmation: (name) => pick(collectionConfirmations)(name),
        duplicate: (name) => pick(duplicateCollectionReplies)(name),
    },
};
