# Rate limiting

O Finance AI usa limitadores de janela fixa em memória:

- login: 10 tentativas por 15 minutos por IP;
- cadastro: 5 tentativas por hora por IP;
- IA: 8 requisições por 5 minutos por usuário;
- IA: 12 requisições por 5 minutos por IP;
- IA: 60 requisições por minuto na instância.

Respostas bloqueadas usam HTTP 429 e `Retry-After`. As entradas expiradas são
removidas oportunisticamente e cada limiter aceita no máximo 10.000 identidades.
Ao atingir esse teto sem entradas expiradas, novas identidades são bloqueadas em
vez de aumentar o uso de memória.

## Proxy reverso

`TRUST_PROXY` é `0` por padrão, portanto o Express usa o endereço da conexão e
ignora `X-Forwarded-For`. Em produção, configure IPs/CIDRs conhecidos separados
por vírgula. Um número exato de saltos também é aceito, mas somente deve ser usado
quando a API não puder ser acessada contornando a cadeia fixa de proxies.
`TRUST_PROXY=true` é rejeitado para evitar confiança irrestrita em headers.

## Limitação conhecida

Os contadores existem por processo/instância. Uma implantação com múltiplas
instâncias precisa substituir o armazenamento em memória por um store
compartilhado, como Redis. A interface entre middleware e limiter mantém essa
troca localizada, mas nenhum store distribuído foi instalado nesta etapa.
