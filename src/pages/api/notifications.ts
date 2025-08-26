//backend-firebase-nextjs/src/pages/api/notifications.ts
import { runCorsMiddleware } from '@/lib/cors'
import { firestoreDb } from '@/lib/firebaseAdmin'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await runCorsMiddleware(req, res)
    switch (req.method) {
        case 'GET': return checkUserToken(req, res)
        case 'POST': return registerToken(req, res)
        case 'DELETE': return deleteToken(req, res)
        default:
            res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
            return res.status(405).end(`Metódo ${req.method} Não Permitido`)
    }
}

async function checkUserToken(req: NextApiRequest, res: NextApiResponse) {
    const { email, deviceId } = req.query
    
    if (!email) return res.status(400).json({ error: 'Email é obrigatório' })
    const ref = firestoreDb.collection('token-usuarios').doc(email as string)
    const doc = await ref.get()
    if (!doc.exists) return res.status(200).json({ hasValidToken: false })
    const tokens = doc.data()?.fcmTokens || []
    if (deviceId) {
        const dev = tokens.find((t: any) => t.deviceId === deviceId)
        return res.status(200).json({ hasValidToken: !!dev, token: dev?.fcmToken })
    }
    return res.status(200).json({ hasValidToken: tokens.length > 0, token: tokens[0]?.fcmToken })
}

async function registerToken(req: NextApiRequest, res: NextApiResponse) {
    const { fcmToken, email, deviceId = 'default' } = req.body

    console.log("api/notifications - Corpo do request: ", req.body)

    function validarEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
    }

    if (!fcmToken || !email || !validarEmail(email)) return res.status(400).json({ error: 'Token e email são obrigatórios' })


    function limparEmail(email: string): string {
        // Remove aspas e espaços em branco
        return email.replace(/["']/g, '').trim().toLowerCase()
    }

    const emailLimpo = limparEmail(email)
    const ref = firestoreDb.collection('token-usuarios').doc(emailLimpo)
    const doc = await ref.get()
    let tokens = doc.exists ? doc.data()?.fcmTokens || [] : []

    // Se token já existe igual, retorna sem atualizar
    const existing = tokens.find((t: any) => t.deviceId === deviceId && t.fcmToken === fcmToken)
    if (existing) return res.status(200).json({ success: true })

    const now = new Date()
    if (doc.exists) {
        const idx = tokens.findIndex((t: any) => t.deviceId === deviceId)
        if (idx >= 0) tokens[idx] = { deviceId, fcmToken, createdAt: tokens[idx].createdAt, updatedAt: now }
        else tokens.push({ deviceId, fcmToken, createdAt: now })
        await ref.update({ fcmTokens: tokens })
    } else {
        await ref.set({ fcmTokens: [{ deviceId, fcmToken, createdAt: now }] })
    }

    return res.status(200).json({ success: true })
}

async function deleteToken(req: NextApiRequest, res: NextApiResponse) {
    const { email, deviceId, fcmToken } = req.body
    if (!email) return res.status(400).json({ error: 'Email é obrigatório' })

    const ref = firestoreDb.collection('token-usuarios').doc(email)
    const doc = await ref.get()
    if (!doc.exists) return res.status(200).json({ success: true })

    let tokens = doc.data()?.fcmTokens || []
    if (deviceId) tokens = tokens.filter((t: any) => t.deviceId !== deviceId)
    else if (fcmToken) tokens = tokens.filter((t: any) => t.fcmToken !== fcmToken)
    else return res.status(400).json({ error: 'Token ou deviceId necessário' })

    await ref.update({ fcmTokens: tokens })
    return res.status(200).json({ success: true })
}
