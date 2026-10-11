const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

// توقيع المطور
const DEV_SIGNATURE = "تم بواسطة ꧁༒☬𝑫𝑰𝑮𝙸𝑻𝑨𝑳 𝑷𝑯𝑨𝑵𝑻𝑶𝑴☬༒꧂";

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.macOS("Chrome")
    });

    // طريقة الربط برقم الهاتف (Pairing Code)
    if (!sock.authState.creds.registered) {
        const phoneNumber = "201515143147
        setTimeout(async () => {
            let code = await sock.requestPairingCode(phoneNumber);
            console.log(`\n🔑 كود الاقتران الخاص بك هو: ${code}\n`);
        }, 3000);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log(`✅ تم اتصال البوت بنجاح! | ${DEV_SIGNATURE}`);
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // استقبال الأوامر
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        if (!text.startsWith('.')) return;

        const args = text.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        switch (command) {
            case 'أوامر':
            case 'help':
                await sock.sendMessage(sender, { text: `🔥 *قائمة الأوامر والتحكم* 🔥\n\n1. \`.بوم\` - طرد جميع أعضاء الجروب\n2. \`.زرف\` - تغيير اسم ووصف الجروب وطرد الكل\n3. \`.سبام [العدد] [النص]\` - إرسال رسائل متكررة\n4. \`.منشن_كل\` - منشن جماعي لكل الأعضاء\n5. \`.قصف [العدد]\` - سبام رسائل متتالية\n6. \`.تدمير_الاسم\` - تغيير اسم الجروب بشكل متكرر\n7. \`.قفل_الجروب\` - منع الكتابة للجميع\n8. \`.فتح_الجروب\` - السماح للكتابة للجميع\n9. \`.طرد [رقم/منشن]\` - طرد عضو محدد\n10. \`.اسم [الاسم الجديد]\` - تغيير اسم الجروب\n11. \`.وصف [الوصف الجديد]\` - تغيير وصف الجروب\n12. \`.تثبيت\` - تثبيت الرسالة المردود عليها\n13. \`.المطور\` - عرض بيانات المطور\n14. \`.مكتوب\` - رسالة ترحيبية\n15. \`.إنذار\` - إرسال تنبيه رسمي\n16. \`.حذف\` - حذف رسالة محددة\n\n${DEV_SIGNATURE}` }, { quoted: msg });
                break;

            // 1. أمر بوم
            case 'bوم':
            case 'بوم':
                try {
                    const metadata = await sock.groupMetadata(sender);
                    const members = metadata.participants.filter(p => !p.admin).map(p => p.id);
                    await sock.groupParticipantsUpdate(sender, members, "remove");
                    await sock.sendMessage(sender, { text: `💣 تم إخلاء المجموعة بالكامل!\n${DEV_SIGNATURE}` });
                } catch (e) {
                    await sock.sendMessage(sender, { text: `❌ تأكد أن البوت مشرف في المجموعة أولاً.\n${DEV_SIGNATURE}` });
                }
                break;

            // 2. أمر زرف
            case 'زرف':
                try {
                    await sock.groupUpdateSubject(sender, `⚡ تم الزرف ⚡`);
                    await sock.groupUpdateDescription(sender, `هذه المجموعة تحت السيطرة.\n${DEV_SIGNATURE}`);
                    const metadata = await sock.groupMetadata(sender);
                    const members = metadata.participants.filter(p => !p.admin).map(p => p.id);
                    await sock.groupParticipantsUpdate(sender, members, "remove");
                    await sock.sendMessage(sender, { text: `⚡ تم الزرف بنجاح!\n${DEV_SIGNATURE}` });
                } catch (e) {
                    await sock.sendMessage(sender, { text: `❌ فشل التنفيذ، يرجى التأكد من الصلاحيات.\n${DEV_SIGNATURE}` });
                }
                break;

            // 3. أمر السبام
            case 'سبام':
                const count = parseInt(args[0]) || 5;
                const spamText = args.slice(1).join(' ') || 'SPAM ATTACK ⚠️';
                for (let i = 0; i < Math.min(count, 20); i++) {
                    await sock.sendMessage(sender, { text: `${spamText}\n${DEV_SIGNATURE}` });
                }
                break;

            // 4. منشن جماعي
            case 'منشن_كل':
                const meta = await sock.groupMetadata(sender);
                const allMembers = meta.participants.map(p => p.id);
                let textMention = `📢 *منشن جماعي للكل:* \n`;
                for (let mem of allMembers) {
                    textMention += `@${mem.split('@')[0]} \n`;
                }
                textMention += `\n${DEV_SIGNATURE}`;
                await sock.sendMessage(sender, { text: textMention, mentions: allMembers });
                break;

            // 5. أمر القصف
            case 'قصف':
                const bombCount = parseInt(args[0]) || 10;
                for (let i = 1; i <= Math.min(bombCount, 20); i++) {
                    await sock.sendMessage(sender, { text: `💥 صاروخ رقم [ ${i} ]\n${DEV_SIGNATURE}` });
                }
                break;

            // 6. تدمير الاسم
            case 'تدمير_الاسم':
                for (let i = 0; i < 3; i++) {
                    await sock.groupUpdateSubject(sender, `مجموعة تحت السيطرة ${Math.floor(Math.random() * 1000)}`);
                }
                await sock.sendMessage(sender, { text: `تم تغيير الاسم عدة مرات.\n${DEV_SIGNATURE}` });
                break;

            // 7. قفل الجروب
            case 'قفل_الجروب':
                await sock.groupSettingUpdate(sender, 'announcement');
                await sock.sendMessage(sender, { text: `🔒 تم قفل الجروب (المشرفين فقط).\n${DEV_SIGNATURE}` });
                break;

            // 8. فتح الجروب
            case 'فتح_الجروب':
                await sock.groupSettingUpdate(sender, 'not_announcement');
                await sock.sendMessage(sender, { text: `🔓 تم فتح الجروب للجميع.\n${DEV_SIGNATURE}` });
                break;

            // 9. تثبيت رسالة
            case 'تثبيت':
                if (msg.message.extendedTextMessage && msg.message.extendedTextMessage.contextInfo) {
                    const pinnedMsgKey = {
                        remoteJid: sender,
                        id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                        participant: msg.message.extendedTextMessage.contextInfo.participant
                    };
                    try {
                        await sock.sendMessage(sender, { pin: pinnedMsgKey, type: 1, time: 86400 });
                        await sock.sendMessage(sender, { text: `📌 تم تثبيت الرسالة بنجاح!\n${DEV_SIGNATURE}` });
                    } catch (err) {
                        await sock.sendMessage(sender, { text: `❌ تأكد من صلاحيات المشرف لتثبيت الرسائل.\n${DEV_SIGNATURE}` });
                    }
                } else {
                    await sock.sendMessage(sender, { text: `⚠️ قم بالرد على الرسالة التي تريد تثبيتها بالأمر .تثبيت\n${DEV_SIGNATURE}` });
                }
                break;

            // 10. المطور
            case 'المطور':
                await sock.sendMessage(sender, { text: `👑 المالك والمطور الأساسي للبوت:\n${DEV_SIGNATURE}` });
                break;

            // 11. مكتوب
            case 'مكتوب':
                await sock.sendMessage(sender, { text: `✨ البوت يعمل بكامل صلاحياته.\n${DEV_SIGNATURE}` });
                break;

            // 12. إنذار
            case 'إنذار':
                await sock.sendMessage(sender, { text: `⚠️ تنبيه هام لجميع الأعضاء: الرجاء الالتزام بالقوانين.\n${DEV_SIGNATURE}` });
                break;

            // 13. حذف رسالة
            case 'حذف':
                if (msg.message.extendedTextMessage && msg.message.extendedTextMessage.contextInfo) {
                    const targetKey = {
                        remoteJid: sender,
                        id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                        participant: msg.message.extendedTextMessage.contextInfo.participant
                    };
                    try {
                        await sock.sendMessage(sender, { delete: targetKey });
                    } catch (err) {
                        await sock.sendMessage(sender, { text: `❌ يتطلب البوت صلاحية مشرف لحذف الرسائل.\n${DEV_SIGNATURE}` });
                    }
                }
                break;
        }
    });
}

startBot();
                                     
