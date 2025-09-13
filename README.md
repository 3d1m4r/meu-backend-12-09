# 🚀 Backend API - Confeitaria Lucrativa

Backend otimizado para deploy no **Render.com** que serve a aplicação frontend hospedada no **Netlify**.

## ⚡ Deploy Rápido no Render.com

1. **Criar Web Service no Render**
2. **Conectar repositório GitHub**
3. **Configurar Build & Start:**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. **Adicionar variáveis de ambiente:**
   ```
   NODE_ENV=production
   ABACATEPAY_API_KEY=sua_chave_aqui
   FRONTEND_URL=https://seu-app.netlify.app
   ```

## 📡 Endpoints

- `POST /api/checkout` - Gerar QR Code PIX
- `GET /api/payment/check/:pixId` - Verificar pagamento
- `GET /health` - Health check (para Render)

## 🔒 Segurança

- CORS configurado para Netlify
- Helmet para headers de segurança
- Validação Zod nos dados
- Rate limiting automático do Render