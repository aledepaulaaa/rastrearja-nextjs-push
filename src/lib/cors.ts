import Cors from 'cors';
import type { NextApiRequest, NextApiResponse } from 'next';

// Configuração do CORS
const cors = Cors({
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    origin: '*', // Em produção, especifique os domínios permitidos
    credentials: true,
});

// Helper para executar o middleware
export function runCorsMiddleware(
    req: NextApiRequest,
    res: NextApiResponse
) {
    return new Promise((resolve, reject) => {
        cors(req, res, (result: any) => {
            if (result instanceof Error) {
                return reject(result);
            }
            return resolve(result);
        });
    });
}
