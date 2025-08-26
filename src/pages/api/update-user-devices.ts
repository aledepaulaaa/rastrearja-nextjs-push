// /pages/api/update-user-devices.ts (NOVO ARQUIVO)
import type { NextApiRequest, NextApiResponse } from 'next'
import { firestoreDb } from '@/lib/firebaseAdmin'
import { runCorsMiddleware } from '@/lib/cors'
import admin from 'firebase-admin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await runCorsMiddleware(req, res)

    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST'])
        return res.status(405).json({ error: `Método ${req.method} Não Permitido` })
    }

    const { email, deviceIds } = req.body

    // Validação básica
    if (!email || !Array.isArray(deviceIds)) {
        return res.status(400).json({ error: 'Email e um array de deviceIds são obrigatórios.' })
    }

    // Limpa e valida o email
    const emailLimpo = email.replace(/["']/g, '').trim().toLowerCase()
    if (!emailLimpo) {
        return res.status(400).json({ error: 'Email inválido.' })
    }

    try {
        const userDocRef = firestoreDb.collection('token-usuarios').doc(emailLimpo)

        // Usamos FieldValue.arrayUnion para adicionar os IDs ao array sem criar duplicatas.
        // Isso é mais seguro do que buscar, mesclar e salvar manualmente.
        await userDocRef.update({
            deviceIds: admin.firestore.FieldValue.arrayUnion(...deviceIds)
        })

        console.log(`Device IDs [${deviceIds.join(', ')}] associados ao usuário ${emailLimpo}.`)

        return res.status(200).json({ success: true, message: 'Dispositivos vinculados com sucesso.' })

    } catch (error: any) {
        // Se o documento não existir, o update() falhará. Podemos tratar isso se necessário,
        // mas o ideal é que o documento já exista por causa do registro do token.
        console.error(`Erro ao vincular dispositivos para ${emailLimpo}:`, error)
        return res.status(500).json({ error: 'Erro interno ao vincular dispositivos.' })
    }
}