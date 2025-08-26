// src/lib/firebaseAdmin.ts
import * as admin from 'firebase-admin';

// Garante que não inicializamos o app múltiplas vezes
if (!admin.apps.length) {
    try {
        const privateKey = process.env.FB_ADMIN_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error('A variável de ambiente FB_ADMIN_PRIVATE_KEY não está definida.');
        }
        // Não é necessário substituir \\n por \n manualmente aqui se estiver corretamente
        // formatado no .env.local com aspas e novas linhas literais.
        // Se você tiver problemas, descomente e ajuste a linha abaixo:
        // const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FB_ADMIN_PROJECT_ID,
                clientEmail: process.env.FB_ADMIN_CLIENT_EMAIL,
                // Use privateKey diretamente, ou formattedPrivateKey se precisar ajustar
                privateKey: privateKey,
            }),
        });
        console.log("Firebase Admin SDK inicializado com sucesso.");
    } catch (error: any) {
        console.error("!!!!!!!!!! FALHA AO INICIALIZAR FIREBASE ADMIN SDK !!!!!!!!!!");
        console.error("Verifique as variáveis de ambiente FB_ADMIN_* e o formato da chave privada no .env.local.");
        console.error("Erro:", error.message);
        // Lançar o erro pode impedir que a API funcione se a inicialização falhar
        // throw error; // Decida se quer travar a API ou apenas logar o erro
    }
}

const firestoreDb = admin.firestore();
const messaging = admin.messaging();

// Exporta as instâncias necessárias
export { firestoreDb, messaging, admin }; // Exporta admin se precisar de outras funcionalidades