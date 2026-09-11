# WhatsApp Cloud API — ativação operacional

O Finance AI usa exclusivamente a WhatsApp Business Platform Cloud API oficial. O webhook público é `GET/POST /webhooks/whatsapp`; as rotas não usam JWT. O GET é autenticado pelo verify token configurado no painel da Meta e o POST exige `x-hub-signature-256`, calculado pela Meta sobre os bytes brutos com o App Secret.

## Configuração futura

Defina apenas no ambiente seguro do backend:

```dotenv
WHATSAPP_PROVIDER=meta
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_GRAPH_API_VERSION=v26.0
```

`WHATSAPP_WABA_ID` não é necessário nesta fase. Não use prefixo público de frontend para essas variáveis. Em desenvolvimento e testes, `WHATSAPP_PROVIDER=fake` mantém o projeto sem chamadas à Meta; em produção, a validação de inicialização exige o provider Meta e todas as credenciais.

## Painel Meta

1. Publique a API atrás de HTTPS válido e informe `https://<api>/webhooks/whatsapp` como callback.
2. Use no painel o mesmo `WHATSAPP_VERIFY_TOKEN` do backend.
3. Assine o campo `messages` do WhatsApp Business Account.
4. Gere um token de sistema com as permissões necessárias para mensageria e armazene-o somente no backend.
5. Confirme o Phone Number ID e mantenha a versão da Graph API revisada antes de cada upgrade.

O envio V1 usa `POST https://graph.facebook.com/{VERSION}/{PHONE_NUMBER_ID}/messages` e suporta apenas texto. Status de entrega são aceitos e ignorados com segurança; mídia recebida também é ignorada nesta fase.

## Limitação conhecida da V1

O processamento ainda ocorre de forma síncrona durante a requisição do webhook, sem Redis/fila. O `messageId` da Meta é persistido antes de vinculação ou processamento financeiro, impedindo repetição de `CREATE`, `CONFIRM` e consultas. Se o outbound falhar depois de uma operação financeira confirmada, a operação legítima não é revertida e o inbound fica `FAILED`; uma política durável de reenvio de respostas fica para uma fase futura.
