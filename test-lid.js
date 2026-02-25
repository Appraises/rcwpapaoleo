const fs = require('fs');
async function test() {
    try {
        const res = await fetch('http://catoleo.com:8080/chat/findContacts/catoleozap', {
            method: 'POST',
            body: JSON.stringify({}),
            headers: {
                apikey: '1A44750E-6ABA-4B53-BA1A-BA16FBD68AB8',
                'Content-Type': 'application/json'
            }
        });
        const data = await res.json();
        const contact = data.find(c => c.id === "98659827978373@lid" || c.remoteJid === "98659827978373@lid" || JSON.stringify(c).includes("98659827978"));
        fs.writeFileSync('contact.json', JSON.stringify(contact, null, 2));
    } catch (e) {
        console.error("error:", e.message);
    }
}
test();
