import { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Adicionar configuração de headers para CORS
  async headers() {
    return [
      {
        // Aplicar a todos os endpoints da API
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Credentials",
            value: "true"
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*"
          }, // Em produção, especifique os domínios permitidos
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,OPTIONS,PATCH,DELETE,POST"
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
          },
        ]
      }
    ];
  }
};

export default nextConfig;
