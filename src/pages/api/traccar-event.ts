import type { NextApiRequest, NextApiResponse } from 'next'
import { firestoreDb } from '@/lib/firebaseAdmin'
import admin from 'firebase-admin'
import { runCorsMiddleware } from '@/lib/cors'

interface EventNotificationPayload {
    id: number
    attributes?: Record<string, any>
    deviceId: number
    name: string
    type: string
    eventTime: string
    positionId?: number
    geofenceId?: number
    maintenanceId?: number
}

interface TraccarEventRequest {
    email: string
    event: EventNotificationPayload
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await runCorsMiddleware(req, res)

    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST'])
        return res.status(405).json({ error: `Metódo ${req.method} Não Permitido` })
    }

    const { email, event } = req.body as TraccarEventRequest
    console.log({
        "Email: ": email,
        "Evento: ": event
    })

    // função para limpar o email antes de usa-lo para verificar no Firestore
    function limparEmail(email: string): string {
        return email?.replace(/"/g, '').trim().toLowerCase() || ''
    }


    // Validações básicas
    if (!email) {
        return res.status(400).json({ error: 'Email é obrigatório.' })
    }

    if (!event || !event.deviceId || !event.type) {
        return res.status(400).json({ error: 'Dados de evento inválidos.' })
    }


    try {
        // Obter tokens registrados
        const emailLimpo = limparEmail(email)
        const userDocRef = firestoreDb.collection('token-usuarios').doc(emailLimpo)
        const userDoc = await userDocRef.get()

        if (!userDoc.exists) {
            return res.status(404).json({ error: `Nenhum registro de token para ${email}.` })
        }

        const tokens: string[] = userDoc.data()?.fcmTokens?.map((t: any) => t.fcmToken) || []
        if (tokens.length === 0) {
            return res.status(404).json({ error: 'Nenhum token disponível para envio.' })
        }

        const makeNotification = (() => {
            const base = event.name || `Dispositivo ${event.deviceId}`
            switch (event.type) {
                case 'deviceOnline': return { title: 'Dispositivo Online', body: `${base} está online` }
                case 'deviceOffline': return { title: 'Dispositivo Offline', body: `${base} está offline` }
                case 'deviceMoving': return { title: 'Movimento Detectado', body: `${base} está se movendo` }
                case 'deviceStopped': return { title: 'Dispositivo Parado', body: `${base} está parado` }
                case 'ignitionOn': return { title: 'Ignição Ligada', body: `${base}: ignição ligada` }
                case 'ignitionOff': return { title: 'Ignição Desligada', body: `${base}: ignição desligada` }
                case 'geofenceEnter': return { title: 'Cerca Virtual', body: `${base} entrou em ${event.attributes?.geofenceName || ''}` }
                case 'geofenceExit': return { title: 'Cerca Virtual', body: `${base} saiu de ${event.attributes?.geofenceName || ''}` }
                case 'alarm': return { title: 'Alarme', body: `${base}: ${event.attributes?.alarm || 'Alarme ativado'}` }
                default: return { title: 'Notificação', body: `${base}: ${event.type}` }
            }
        })()
        // console.log("Payload da notificação criado: ", makeNotification)

        // Payload FCM
        const message: admin.messaging.MulticastMessage = {
            tokens,
            notification: makeNotification,
            data: {
                name: String(event.name),
                type: event.type,
                eventTime: event.eventTime,
            },
            android: {
                priority: 'high',
                notification: { channelId: 'high_importance_channel', clickAction: 'FLUTTER_NOTIFICATION_CLICK' }
            },
            apns: { payload: { aps: { sound: 'default', badge: 1 } }, headers: { 'apns-priority': '10' } },
            webpush: {
                fcmOptions: { link: `/device/${event.deviceId}` },
                notification: { icon: '/icon-192x192.png', badge: '/icon-64x64.png', vibrate: [200, 100, 200] }
            }
        }

        console.log("Mensagem FCM construída:", message)

        console.log("Enviando notificações FCM...")
        // Envio e tratamento de respostas
        const batch = admin.messaging().sendEachForMulticast(message)
        const response = await batch
        console.log("Resposta do envio FCM:", response)

        // Filtrar tokens inválidos
        const invalid: string[] = []
        response.responses.forEach((r, i) => {
            if (!r.success && ['messaging/invalid-registration-token', 'messaging/registration-token-not-registered'].includes(r.error?.code || '')) {
                invalid.push(tokens[i])
            }
        })
        if (invalid.length) {
            console.log("Tokens inválidos encontrados:", invalid)
            await userDocRef.update({
                fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalid.map(token => ({ fcmToken: token })))
            })
            console.log("Tokens inválidos removidos do Firestore.")
        }

        return res.status(200).json({
            success: true,
            sent: response.successCount,
            failed: response.failureCount,
            invalidRemoved: invalid.length,
            message: 'Notificações enviadas com sucesso.'
        })

    } catch (err: any) {
        console.error('[traccar-event] erro', err)
        return res.status(500).json({ error: 'Erro interno ao processar evento.' })
    }
}